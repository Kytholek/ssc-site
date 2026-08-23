/**
 * SSC — Cloudflare Worker
 * Flow: POST /api/session → queue → Anthropic → PDFShift → Resend
 *       (paid: Stripe checkout → webhook → queue)
 *       (free:  POST /api/session → queue directly)
 *       GET /api/checkout-session, /api/google-reviews, /api/site-config
 *       POST /api/chat — site assistant (site + blog grounded, single-turn)
 */

import { buildCodexFootprintSvg, buildCodexPromptBlock } from '../../js/codex-footprint.mjs';
import { processTimeCycleReading } from '../../js/time-cycle-reading.mjs';
import {
  CHAT_MAX_MESSAGE_CHARS,
  CHAT_MODEL,
  CHAT_SYSTEM_PROMPT,
  OFFTOPIC_REPLY,
  buildBirthDateNumbersReply,
  buildChatUserPrompt,
  isObviousOffTopic,
  resolveDateFrequenciesFromMessage,
  retrieveChatContext,
  sanitizeChatMessage,
  wantsPersonalNumbers,
} from '../../js/chat-assistant.mjs';

const PRODUCT_CONFIG = {
  guidebook: {
    id: 'guidebook',
    priceCents: 2200,
    stripeName: 'SSC Guidebook Report',
    stripeDescription: 'Your complete personalised frequency guidebook — all 7 frequencies decoded, shadow work, and Life Calling directive. Delivered as a PDF.',
    successProduct: 'guidebook',
    fulfillProducts: ['guidebook'],
  },
  'time-cycle': {
    id: 'time-cycle',
    priceCents: 1700,
    stripeName: 'SSC Time Cycle Report',
    stripeDescription: 'Your 3-month spiral forecast — month-by-month plan plus current pinnacle, year, and season timing with actions to maximize each period. Delivered as a PDF.',
    successProduct: 'time-cycle',
    fulfillProducts: ['time-cycle'],
  },
  bundle: {
    id: 'bundle',
    priceCents: 2900,
    stripeName: 'SSC Blueprint Bundle',
    stripeDescription: 'Guidebook Report + Time Cycle — both PDFs. Save $10 vs buying separately ($39). Delivered to your email within minutes.',
    successProduct: 'bundle',
    fulfillProducts: ['guidebook', 'time-cycle'],
  },
};

function resolveProduct(raw) {
  const key = String(raw || 'guidebook').trim().toLowerCase();
  if (key === 'guidebook-bundle' || key === 'blueprint-bundle') {
    return PRODUCT_CONFIG.bundle;
  }
  return PRODUCT_CONFIG[key] || PRODUCT_CONFIG.guidebook;
}

let googleReviewsCache = { data: null, expires: 0 };

const ALLOWED_ORIGINS = [
  'https://simulationsourcecode.com',
  'https://www.simulationsourcecode.com',
  'https://portal.simulationsourcecode.com',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8377',
  'http://localhost:8377',
];

const CHAT_RATE_LIMIT = 20;
const CHAT_RATE_WINDOW_MS = 10 * 60 * 1000;

const SCL_PRODUCT_PRICE_ENV = {
  premium_monthly: 'STRIPE_PRICE_SCL_MONTHLY',
  premium_annual:  'STRIPE_PRICE_SCL_ANNUAL',
};

function getGoogleReviewUrl(env) {
  const placeId = env.GOOGLE_PLACE_ID;
  if (!placeId) return 'https://simulationsourcecode.com/services/';
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

function corsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : 'https://simulationsourcecode.com';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

/** Resend requires `email@domain.com` or `Name <email@domain.com>` — not double-wrapped. */
function formatResendFrom(fromEnv, displayName = 'Simulation Source Code') {
  const fallback = 'readings@simulationsourcecode.com';
  const raw = String(fromEnv || fallback).trim().replace(/^["']|["']$/g, '');
  if (/^[^<]+\s+<[^>@]+@[^>]+>$/.test(raw)) return raw;
  const emailOnly = raw.match(/^<?([^<>\s]+@[^<>\s]+)>?$/);
  if (emailOnly) return `${displayName} <${emailOnly[1]}>`;
  return `${displayName} <${fallback}>`;
}

function formatResendReplyTo(replyEnv, fromEnv) {
  const raw = String(replyEnv || fromEnv || 'readings@simulationsourcecode.com')
    .trim()
    .replace(/^["']|["']$/g, '');
  const wrapped = raw.match(/<([^>]+)>/);
  if (wrapped) return wrapped[1].trim();
  if (/^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(raw)) return raw;
  return 'readings@simulationsourcecode.com';
}

function buildUserDataFromBody({ email, name, month, day, year, full_name }) {
  return {
    name:       name || 'Seeker',
    email,
    birthMonth: parseInt(month, 10),
    birthDay:   parseInt(day, 10),
    birthYear:  parseInt(year, 10),
    fullName:   full_name || name,
  };
}

function validateUserData(userData) {
  if (!userData.email) return 'Email required';
  if (!userData.birthMonth || !userData.birthDay || !userData.birthYear) {
    return 'Birth date and name required';
  }
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function isReadingHeading(line) {
  return /^(Your Simulation Source Code Calculator Reading|Core Results|Trinity of .+|What This Means For You)$/.test(line)
    || /^(Life Path|Expression|Life Calling|Soul|Outer|Achievement|Theme) \d/.test(line);
}

function formatEmailLine(line) {
  return escapeHtml(line).replace(
    /^(Reading for|Birth Date|Life Path|Expression|Life Calling):/,
    '<strong>$1:</strong>'
  );
}

function plainTextToEmailHtml(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map(paragraph => {
      const lines = paragraph.split('\n').map(line => line.trim()).filter(Boolean);
      if (!lines.length) return '';

      if (lines.length === 1 && isReadingHeading(lines[0])) {
        return `<p><strong>${escapeHtml(lines[0])}</strong></p>`;
      }

      if (isReadingHeading(lines[0])) {
        return `<p><strong>${escapeHtml(lines[0])}</strong><br>${lines.slice(1).map(formatEmailLine).join('<br>')}</p>`;
      }

      return `<p>${lines.map(formatEmailLine).join('<br>')}</p>`;
    })
    .join('');
}

function buildCalculatorEmailCtaHtml() {
  return `
    <div style="margin-top:28px;padding:22px 20px;border:1px solid rgba(201,168,76,0.35);border-radius:10px;background:#141125;text-align:center;color:#e8dfc8;">
      <p style="margin:0 0 10px;color:#fff3cf;"><strong>Want the full map?</strong></p>
      <p style="margin:0 0 18px;color:#e8dfc8;">Go deeper with Guidebook Reports, Time Cycles, and live readings — all on the Services page.</p>
      <p style="margin:0;text-align:center;">
        <a href="https://simulationsourcecode.com/services/" style="display:inline-block;margin:0 6px 8px;padding:12px 18px;border:1px solid rgba(201,168,76,0.55);border-radius:6px;color:#fff3cf;font-weight:bold;text-decoration:none;">Explore Services</a>
      </p>
    </div>
  `;
}

// Shared email collector — origins: calculator | webapp | guidebook | time-cycle | signup
// Sheet Apps Script syncs contacts to Brevo (ORIGIN attribute = these values)
const EMAIL_SHEET_URL =
  'https://script.google.com/macros/s/AKfycby4as7NPJliyQDm-5lpJM1RjtgVMNMuudlYqfAKeSJj1drKi54yi3HVU3dREWL8lpsLVg/exec';

const EMAIL_ORIGINS = new Set(['calculator', 'webapp', 'guidebook', 'time-cycle', 'bundle', 'signup']);

async function logEmailToSheet(payload) {
  try {
    // text/plain avoids Apps Script JSON preflight quirks; body is still JSON
    const res = await fetch(EMAIL_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    if (!res.ok) {
      console.error('sheets-log HTTP', res.status, await res.text().catch(() => ''));
    } else {
      console.log('sheets-log ok', payload.origin || payload.source, payload.email);
    }
  } catch (err) {
    console.error('sheets-log error:', err);
  }
}

/** Log a services purchase to Sheet → Brevo with contact + blueprint fields. */
async function logPurchaseToSheet(userData, extras = {}) {
  const email = String(userData?.email || '').trim().toLowerCase();
  if (!email) return;

  const product = resolveProduct(userData.product).id;
  const origin = EMAIL_ORIGINS.has(product) ? product : 'guidebook';

  const fullName = String(userData.fullName || userData.name || '').trim();
  const firstName =
    String(extras.firstName || extras.first_name || '').trim()
    || (fullName ? fullName.split(/\s+/)[0] : '');

  const birthMonth = parseInt(userData.birthMonth ?? userData.month, 10);
  const birthDay = parseInt(userData.birthDay ?? userData.day, 10);
  const birthYear = parseInt(userData.birthYear ?? userData.year, 10);
  const birthDate =
    birthMonth && birthDay && birthYear
      ? `${birthMonth}/${birthDay}/${birthYear}`
      : String(extras.birthDate || extras.birth_date || '');

  let lifePath = extras.lifePath ?? extras.life_path ?? '';
  let expression = extras.expression ?? '';
  let lifeCalling = extras.lifeCalling ?? extras.life_calling ?? extras.destiny ?? '';

  if (fullName && birthMonth && birthDay && birthYear && (!lifePath || !expression || !lifeCalling)) {
    try {
      const freq = calculateFrequencies(fullName, birthMonth, birthDay, birthYear);
      lifePath = lifePath || freq.lifePath;
      expression = expression || freq.expression;
      lifeCalling = lifeCalling || freq.destiny;
    } catch (err) {
      console.error('purchase frequency calc error:', err);
    }
  }

  // Match calculator /submit-email field names so Apps Script + Brevo map the same way
  await logEmailToSheet({
    email,
    source: origin,
    origin,
    product,
    firstName,
    first_name: firstName,
    name: fullName,
    full_name: fullName,
    birthDate,
    birth_date: birthDate,
    lifePath: lifePath === '' || lifePath == null ? '' : String(lifePath),
    life_path: lifePath === '' || lifePath == null ? '' : String(lifePath),
    expression: expression === '' || expression == null ? '' : String(expression),
    lifeCalling: lifeCalling === '' || lifeCalling == null ? '' : String(lifeCalling),
    life_calling: lifeCalling === '' || lifeCalling == null ? '' : String(lifeCalling),
    destiny: lifeCalling === '' || lifeCalling == null ? '' : String(lifeCalling),
  });
}

async function logPurchaseEmail(email) {
  await logPurchaseToSheet({ email, product: 'guidebook' });
}

async function enqueueReading(userData, env) {
  if (!env.READINGS_QUEUE) {
    throw new Error('READINGS_QUEUE binding missing — redeploy wrangler.jsonc with queues.producers');
  }
  await env.READINGS_QUEUE.send(userData);
  console.log('Queued reading', userData.product || 'guidebook', 'for', userData.email);
}

/** Queue one job per fulfill product (bundle → guidebook + time-cycle). */
async function enqueueFulfillment(userData, env) {
  const product = resolveProduct(userData.product);
  const fulfillProducts = product.fulfillProducts || [product.id];
  for (const pid of fulfillProducts) {
    await enqueueReading({ ...userData, product: pid }, env);
  }
}

export default {

  // ── Queue consumer — up to 15 min, no wall-clock pressure ──────────────
  async queue(batch, env) {
    console.log(`Queue batch received: ${batch.messages.length} message(s)`);
    for (const message of batch.messages) {
      try {
        console.log('Queue message body:', JSON.stringify(message.body));
        await processReading(message.body, env);
        message.ack();
        console.log('Queue message acked for', message.body?.email);
      } catch (err) {
        console.error('Queue consumer error — will retry:', err?.message || err, err?.stack);
        message.retry();
      }
    }
  },

  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('origin') || '';

    // ── CORS preflight ──────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      // Ensure preflight succeeds for the checkout endpoints.
      // Some edge cases/mismatches can otherwise return 405/"Method not allowed".
      if (
        url.pathname === '/api/session'
        || url.pathname === '/api/chat'
        || url.pathname === '/submit-email'
      ) {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── app subdomain → redirect to live portal ────────────────────────
    if (url.hostname === 'app.simulationsourcecode.com') {
      const appPath = url.pathname === '/' ? '/' : url.pathname;
      return Response.redirect('https://portal.simulationsourcecode.com' + appPath + url.search, 301);
    }

    // ── Route dispatch ──────────────────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/api/session') {
      return handleCreateCheckout(request, env, origin);
    }

    if (request.method === 'GET' && url.pathname === '/api/checkout-session') {
      return handleGetCheckoutSession(request, env, origin);
    }

    if (request.method === 'POST' && url.pathname === '/api/meta-capi') {
      return handleMetaCapi(request, env, origin);
    }

    if (request.method === 'POST' && url.pathname === '/api/scl/checkout') {
      return handleSclCheckout(request, env, origin);
    }

    if (request.method === 'GET' && url.pathname === '/api/scl/session') {
      return handleSclSession(request, env, origin);
    }

    if (request.method === 'GET' && url.pathname === '/api/scl/subscription') {
      return handleSclSubscription(request, env, origin);
    }

    if (request.method === 'POST' && url.pathname === '/api/scl/cancel') {
      return handleSclCancel(request, env, origin);
    }

    if (request.method === 'GET' && url.pathname === '/api/google-reviews') {
      return handleGoogleReviews(request, env, origin);
    }

    if (request.method === 'GET' && url.pathname === '/api/site-config') {
      return handleSiteConfig(request, env, origin);
    }


    if (request.method === 'POST' && url.pathname === '/submit-email') {
      return handleSubmitEmail(request, env, origin);
    }

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      return handleChat(request, env, origin);
    }

    if (url.pathname !== '/webhook/stripe') {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // ── Read raw body (needed for Stripe signature verification) ─────────
    const rawBody = await request.text();

    // ── Verify Stripe signature ─────────────────────────────────────────
    const signature = request.headers.get('stripe-signature');
    let stripeEvent;

    try {
      stripeEvent = await verifyStripeSignature(
        rawBody, signature, env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Stripe signature verification failed:', err.message);
      return new Response(`Webhook signature error: ${err.message}`, { status: 400 });
    }

    // SCL subscription events — client syncs entitlements; acknowledge without guidebook flow
    if (
      stripeEvent.type === 'invoice.paid' ||
      stripeEvent.type === 'customer.subscription.updated' ||
      stripeEvent.type === 'customer.subscription.deleted'
    ) {
      const obj = stripeEvent.data.object;
      const isScl = obj?.metadata?.source === 'scl'
        || obj?.metadata?.firebaseUid
        || obj?.lines?.data?.some?.(li => li.metadata?.source === 'scl');
      console.log('Stripe SCL-related event:', stripeEvent.type, isScl ? '(scl)' : '(non-scl/unknown)');
      return new Response('OK', { status: 200 });
    }

    if (stripeEvent.type !== 'checkout.session.completed') {
      console.log('Stripe webhook ignored event type:', stripeEvent.type);
      return new Response('Event type ignored', { status: 200 });
    }

    const session = stripeEvent.data.object;
    console.log('Stripe checkout.session.completed:', session.id);

    if (session.metadata?.source === 'scl' || session.metadata?.product?.startsWith?.('premium_')) {
      console.log('SCL checkout completed — client applies entitlement:', session.id);
      return new Response('OK', { status: 200 });
    }

    const product = resolveProduct(session.metadata?.product).id;
    const userData = {
      name:        session.metadata?.name         || session.customer_details?.name || 'Seeker',
      email:       session.customer_email         || session.metadata?.email        || session.customer_details?.email,
      birthMonth:  parseInt(session.metadata?.birth_month || session.metadata?.month, 10),
      birthDay:    parseInt(session.metadata?.birth_day   || session.metadata?.day, 10),
      birthYear:   parseInt(session.metadata?.birth_year  || session.metadata?.year, 10),
      fullName:    session.metadata?.full_name    || session.metadata?.name,
      product,
    };

    console.log('Webhook userData:', JSON.stringify({
      sessionId: session.id,
      product: userData.product,
      email: userData.email,
      name: userData.name,
      birthMonth: userData.birthMonth,
      birthDay: userData.birthDay,
      birthYear: userData.birthYear,
    }));

    if (!userData.email) {
      console.error('No customer email on session:', session.id, {
        customer_email: session.customer_email,
        metadata_email: session.metadata?.email,
        customer_details_email: session.customer_details?.email,
      });
      return new Response('Missing customer email', { status: 400 });
    }

    if (!userData.birthMonth || !userData.birthDay || !userData.birthYear) {
      console.error('Missing birth date metadata on session:', session.id, session.metadata);
      return new Response('Missing birth date metadata', { status: 400 });
    }

    if (!env.READINGS_QUEUE) {
      console.error('READINGS_QUEUE binding missing — redeploy wrangler.jsonc with queues.producers');
      return new Response('Queue not configured', { status: 500 });
    }

    // Log purchase to Google Sheet → Brevo (origin = product)
    await logPurchaseToSheet(userData, {
      lifePath: session.metadata?.life_path,
      expression: session.metadata?.expression,
      lifeCalling: session.metadata?.life_calling,
    });

    try {
      await enqueueFulfillment(userData, env);
      console.log('Queued fulfillment for', userData.email, 'product:', userData.product);
    } catch (err) {
      console.error('READINGS_QUEUE.send failed:', err);
      return new Response(`Queue error: ${err.message}`, { status: 500 });
    }

    return new Response('OK', { status: 200 });
  }
};


// ════════════════════════════════════════════════════════════
//  SSC SYSTEM PROMPT
// ════════════════════════════════════════════════════════════

const SSC_SYSTEM_PROMPT = `You are Kytholek, the author of Simulation Source Code — a consciousness framework that reads life as a holographic simulation, decoding the Source Code embedded in a person's birth date and full birth name.

VOICE AND TONE:
Write like a knowledgeable guide having a direct conversation — not a mystic performing a ritual. Grounded first, elevated when it earns it. If a sentence sounds like it belongs on a crystal shop wall, rewrite it. No theatrical language. No "this is not an accident", "the universe has spoken", "it is written in the stars." Say what the number means and what it asks of the person, plainly. Be specific. Vague is useless. Do NOT pad.

FRAMEWORK CORE CONCEPTS:
- Life is a Holographic Simulation. The birth date is the External Circuit — what the simulation presents as lessons and curriculum. The name is the Internal Circuit — the authentic frequency encoded within for expression.
- The Theme (birth year) is atmospheric — the generational note the simulation is written in. Less personal, more like the key the music plays in.
- The Life Path is the QUEST of the external curriculum — and the LIFE LESSON NUMBER. It encodes the repeating pattern the simulation keeps presenting until that frequency is constructed. Every reading MUST name that pattern explicitly for their specific Life Path number (compound and root), with concrete real-life examples of how it shows up again and again. Blend in the influence of the theme when writing the life path section — show how the atmospheric frequency colors the quest. Also blend in the achievement as the style in which they are meant to accomplish the life path curriculum — show how the achievement colors the way they move through the quest.
- The Achievement number is the operational style — how they naturally accomplish things. blend it with the theme and life path when writing the achievement section — show how it colors the way they accomplish within the broader curriculum.
- The Soul Urge (vowels) is the private inner world — desires, motivations, yearnings beneath the surface. give it its own section, separate from Outer Persona, and write it as the inner compass that guides
- The Outer Persona (consonants) is the social mask — how the world first reads you before they know you. give it its own section, separate from Soul Urge, and write it as the first impression you make on others, the vibe you give off before they know you.
- The Expression is the INTERNAL FREQUENCY — the authentic signal beneath social conditioning. What you are here to express and become. blend the soul and outer description in when writing the expression — show how the inner desire and social mask fuse to produce the authentic signal.
- The Life Calling is the fusion of Life Path and Expression — the specific directive that emerges when external curriculum and internal frequency are run together. try to blend all of the above into a cohesive narrative here — the story of how the quest (life path) is meant to be accomplished (achievement) in the unique style of the person, while also expressing their authentic frequency (expression) in a way that serves the larger simulation. This is the ultimate synthesis of all the components.
- Numbers carry both positive and shadow expressions. The shadow is not a flaw — it is the unconstructed version of the same energy.
- You are translating their numerical data to offer life direction — the specific frequency they are here to embody, the challenges to embrace, the patterns to watch for. The more specific and concrete you can be in describing how these energies show up in real life, the better. Avoid vague spiritual platitudes. Always give practical examples of how the energy shows up in real life, both positively and in shadow form.

MASTER NUMBER RULES:
The ONLY valid master numbers are 11, 22, 33, 44, 55, 66 ,77, 88, 99. Nothing else. 13, 14, 19, 21, 28 etc. are NOT master numbers.
- Master numbers do not reduce but always carry their root as a foundation. 11 operates from 2, 22 from 4, 33 from 6, 44 from 8.
- Always acknowledge the root, then explain what the master number adds or amplifies.
- If compound AND root are both master numbers (e.g. raw=11, root=11), note plainly there is no reduction — the frequency is undiluted.

COMPOUND NUMBER MEANINGS (use these when interpreting each frequency):
10 — Renewed Initiation: The cycle of 1 returning through the amplifying zero. Leadership reborn at a higher turn of the spiral.
11 — The Illuminated Bridge: Double 1 amplified into a channel. Carries 2's relational sensitivity as root but amplified. Where 2 connects, 11 bridges worlds.
12 — Creative Partnership: 1 initiating through 2's relational awareness. Original expression that requires others to be fully realised.
13 — Structured Creation: 1 through 3's creativity, reducing to 4. Raw creative force that must be built into something lasting.
14 — Freedom Through Foundation: 1 and 4 reducing to 5. Freedom earned only after the foundations hold.
15 — Embodied Will: 1 and 5 reducing to 6. Personal will tested through direct contact with life.
16 — Wisdom From Collapse: 1 and 6 reducing to 7. Inner truth emerges through dissolution of what was falsely constructed.
17 — Illuminated Will: 1 and 7 reducing to 8. Authority born from insight rather than ambition.
18 — Power Accountable: 1 and 8 reducing to 9. Raw force that must ultimately serve something beyond itself.
19 — The Solar Return: 1 and 9 reducing to 1. A complete cycle. The end becomes the seed of the next.
20 — Receptive Gateway: 2 and 0 reducing to 2. Deep sensitivity amplified by the zero's expansive quality.
21 — Expressed Connection: 2 and 1 reducing to 3. Connection that generates new expression. Harmony that finds its voice.
22 — The Master Builder: Double 2 at master scale, operating from 4's foundation. Structures built to serve collective evolution.
23 — Communicative Harmony: 2 and 3 reducing to 5. The natural diplomat and storyteller.
24 — Nurturing Structure: 2 and 4 reducing to 6. Building systems that care for others.
25 — Embodied Understanding: 2 and 5 reducing to 7. Wisdom earned through relationship and immersion.
26 — Responsible Vision: 2 and 6 reducing to 8. Authority built by being the one who shows up.
27 — Compassionate Wisdom: 2 and 7 reducing to 9. Wisdom in service of others.
28 — Power Through Relationship: 2 and 8 reducing to 1. Influence built through genuine partnership.
29 — Completing the Connection: 2 and 9 reducing to 11. Relationships that serve a larger purpose.
30 — Pure Expression: 3 and 0 reducing to 3. Creative force in its most undiluted form.
31 — Initiated Creation: 3 and 1 reducing to 4. Original ideas that demand to be built.
32 — Harmonious Expression: 3 and 2 reducing to 5. Expression that bridges people.
33 — The Master Teacher: Double 3 at master scale, operating from 6's foundation. Expression in unconditional service.
34 — Structured Expression: 3 and 4 reducing to 7. Craft that deepens through sustained inner work.
35 — Embodied Expression: 3 and 5 reducing to 8. Power earned through the friction of expression meeting reality.
36 — Expressive Service: 3 and 6 reducing to 9. Creativity in service of collective wellbeing.
37 — Wise Expression: 3 and 7 reducing to 1. Expression rooted in genuine self-knowledge.
38 — Powerful Expression: 3 and 8 reducing to 11. Creative force that becomes a channel for something larger.
39 — Universal Expression: 3 and 9 reducing to 3. Expression meant to serve beyond the self.
40 — Foundational Gateway: 4 and 0 reducing to 4. Discipline at its most essential.
41 — Initiated Structure: 4 and 1 reducing to 5. Building that moves. Structure that enables rather than constrains.
42 — Relational Foundation: 4 and 2 reducing to 6. Building systems that serve relationships.
43 — Creative Foundation: 4 and 3 reducing to 7. Building that communicates. Systems that carry meaning.
44 — The Master Organiser: Double 4 at master scale, operating from 8's foundation. Organised power built to endure.
45 — Experienced Foundation: 4 and 5 reducing to 9. Foundations built from what has actually worked.
46 — Caring Structure: 4 and 6 reducing to 1. Building new systems of care.
47 — Wise Foundation: 4 and 7 reducing to 11. Mastery emerging from deep inner alignment.
48 — Masterful Foundation: 4 and 8 reducing to 3. Discipline meeting authority, expressed through creative force.
49 — Completing Structure: 4 and 9 reducing to 4. Structures built, completing their purpose, then released gracefully.
50 — Pure Experience: 5 and 0 reducing to 5. Presence at its most essential.
51 — Initiated Experience: 5 and 1 reducing to 6. Moving first into direct contact with life.
52 — Connected Experience: 5 and 2 reducing to 7. Understanding developed through relationship and direct encounter.
53 — Expressive Experience: 5 and 3 reducing to 8. Lived experience that finds its voice and builds authority.
54 — Structured Experience: 5 and 4 reducing to 9. Freedom found within structure.
55 — The Master Liberator: Double 5 at master scale, operating from 1's initiation. Freedom as a demonstration.
56 — Integrating Experience: 5 and 6 reducing to 11. Presence that serves. Direct contact that becomes a channel.
57 — Seeking Experience: 5 and 7 reducing to 3. The seeker who lives it before teaching it.
58 — Powerful Experience: 5 and 8 reducing to 4. Power built through direct engagement with life.
59 — Universal Experience: 5 and 9 reducing to 5. The one who has lived fully and releases what is complete.

SSC LANGUAGE TO USE NATURALLY: simulation, holographic blueprint, external circuit, internal circuit, encoded frequency, NPC conditioning, authentic signal, embodiment, integration, the Game, source code.
Do NOT use: "you are a natural leader", "you have a gift for", "the universe supports you", "this is not an accident".

CODEX MATRIX (Purpose Triangle):
- The Codex is a 3×3 consciousness matrix. Rows: Mind, Body, Spirit. Columns: Witness, Actor, Sage. Each number 1–9 maps to a fixed node position.
- Grid placement uses the reduced root. Master numbers reduce for placement only: 11→2, 22→4, 33→6, 44→8.
- The Purpose Triangle highlights three nodes: Life Path (external curriculum), Expression (internal authentic signal), Life Calling (where LP and Expression converge — concatenate their roots, then reduce).
- When two frequencies share a node, interpret the fusion of those roles on one matrix position. When all three differ, describe how energy moves between the three positions.
- The Codex Footprint section covers matrix placement only — node names, planes, and spatial relationship. Do NOT re-explain full number meanings there; those belong in the Life Path, Expression, and Life Calling sections later.
- Keep Codex language grounded and practical. No mystical padding.`;


// ════════════════════════════════════════════════════════════
//  FREQUENCY CALCULATOR
// ════════════════════════════════════════════════════════════

function reduceToSingle(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33 && n !== 44) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0);
  }
  return n;
}

const LETTER_VALUES = {
  A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, I:9,
  J:1, K:11,L:3, M:4, N:5, O:6, P:7, Q:8, R:9,
  S:1, T:2, U:3, V:22,W:5, X:6, Y:7, Z:8
};
const VOWELS = new Set(['A','E','I','O','U','Y']);

function letterValue(c) { return LETTER_VALUES[c.toUpperCase()] || 0; }

function calculateFrequencies(name, month, day, year) {
  const chars = name.toUpperCase().replace(/[^A-Z]/g, '').split('');

  const rawLifePath = [...String(month), ...String(day), ...String(year)]
    .reduce((a, c) => a + Number(c), 0);
  const lifePath = reduceToSingle(rawLifePath);

  const rawAchievement = month + day;
  const achievement    = reduceToSingle(rawAchievement);

  const rawTheme = String(year).split('').reduce((a, d) => a + Number(d), 0);
  const theme    = reduceToSingle(rawTheme);

  const rawExpression = name.trim().split(/\s+/).reduce((total, word) => {
    const wordSum = word.toUpperCase().replace(/[^A-Z]/g, '').split('')
      .reduce((a, c) => a + letterValue(c), 0);
    return total + reduceToSingle(wordSum);
  }, 0);
  const expression = reduceToSingle(rawExpression);

  const rawSoul = chars.filter(c => VOWELS.has(c)).reduce((a, c) => a + letterValue(c), 0);
  const soul    = reduceToSingle(rawSoul);

  const rawPersona = chars.filter(c => !VOWELS.has(c)).reduce((a, c) => a + letterValue(c), 0);
  const persona    = reduceToSingle(rawPersona);

  // Life Calling: concatenate Expression root + Life Path root, then reduce (matches calculator)
  const rawDestiny = parseInt(String(expression) + String(lifePath), 10);
  const destiny    = reduceToSingle(rawDestiny);

  return {
    lifePath, rawLifePath,
    achievement, rawAchievement,
    theme, rawTheme,
    expression, rawExpression,
    soul, rawSoul,
    persona, rawPersona,
    destiny, rawDestiny,
  };
}


// ════════════════════════════════════════════════════════════
//  BACKGROUND PROCESSING CHAIN
// ════════════════════════════════════════════════════════════

async function processReading(userData, env) {
  const product = resolveProduct(userData.product).id;
  console.log(`[1/4] Processing ${product} for ${userData.email}`);

  if (product === 'bundle') {
    await processReading({ ...userData, product: 'guidebook' }, env);
    await processReading({ ...userData, product: 'time-cycle' }, env);
    return;
  }

  if (product === 'time-cycle') {
    await processTimeCycleReading(userData, env, {
      convertToPDF,
      arrayBufferToBase64,
      formatResendFrom,
      formatResendReplyTo,
      getGoogleReviewUrl,
    });
    return;
  }

  const name = userData.fullName || userData.name;
  const frequencies = calculateFrequencies(
    name, userData.birthMonth, userData.birthDay, userData.birthYear
  );
  console.log('[1/4] Frequencies:', JSON.stringify(frequencies));

  console.log('[2/4] Calling Anthropic…');
  const guidebookBody = await generateReading(userData, frequencies, env);
  console.log('[2/4] Anthropic reading generated, length:', guidebookBody.length);

  const pdfHtml = buildPdfHtml({
    name, frequencies, guidebookBody,
    month: userData.birthMonth,
    day:   userData.birthDay,
    year:  userData.birthYear,
  });

  console.log('[3/4] Calling PDFShift…');
  const pdfBuffer = await convertToPDF(pdfHtml, env);
  console.log('[3/4] PDF generated, size:', pdfBuffer.byteLength);

  console.log('[4/4] Sending email via Resend…');
  await sendEmail(userData, name, frequencies, pdfBuffer, env);
  console.log(`[4/4] Email sent to ${userData.email}`);
}


// ════════════════════════════════════════════════════════════
//  STEP 1 — ANTHROPIC: GENERATE GUIDEBOOK BODY
// ════════════════════════════════════════════════════════════

async function generateReading(userData, frequencies, env) {
  const months = ['','January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const name      = userData.fullName || userData.name;
  const firstName = name.split(' ')[0];
  const dob       = `${months[userData.birthMonth]} ${userData.birthDay}, ${userData.birthYear}`;

  const prompt = `You are writing a COMPLETE HOLOGRAPHIC BLUEPRINT READING for the following person.

PERSONAL DATA:
- Full birth name: ${name}
- Date of birth: ${dob}

THEIR COMPOUND FREQUENCIES:
- Theme (birth year):                    ${frequencies.rawTheme}/${frequencies.theme}
- Life Path (full DOB):                  ${frequencies.rawLifePath}/${frequencies.lifePath}
- Achievement (month + day):             ${frequencies.rawAchievement}/${frequencies.achievement}
- Soul Urge (vowels):                    ${frequencies.rawSoul}/${frequencies.soul}
- Outer Persona (consonants):            ${frequencies.rawPersona}/${frequencies.persona}
- Expression (full name):                ${frequencies.rawExpression}/${frequencies.expression}
- Life Calling (Expression + Life Path): ${frequencies.rawDestiny}/${frequencies.destiny}

${buildCodexPromptBlock(frequencies)}

STRUCTURE — write ALL sections in EXACTLY this order, each with its own <h2> heading:

1. Opening — address ${firstName} directly. 2-3 sentences only. State what their blueprint encodes.

2. <h2 id="codex-footprint">Your Codex Footprint</h2>
   One short intro paragraph explaining what the Codex map shows.
   Then 2–3 paragraphs interpreting THIS person's three highlighted nodes
   (Life Path node, Expression node, Life Calling node) and how they
   relate spatially in the consciousness matrix. Reference node names
   and planes/columns. Do NOT re-explain the whole Codex system.
   Do NOT duplicate the Life Path / Expression / Life Calling sections
   that come later — this section is matrix placement only.

3. <h2>The External Circuit</h2>
   Then each as <h3> with the EXACT id attributes shown:
   - <h3 id="theme">Theme ${frequencies.rawTheme}/${frequencies.theme}</h3> — atmospheric frequency of birth year. Include both positive and shadow expressions.
   - <h3 id="lifepath">Life Path ${frequencies.rawLifePath}/${frequencies.lifePath}</h3> — the external curriculum and LIFE LESSON NUMBER. Write about the positive quest AND the shadow—what happens when this energy is unconstructed. Blend in the Theme (${frequencies.rawTheme}/${frequencies.theme}) to show how the atmospheric frequency colors the quest.
   - <h3 id="achievement">Achievement ${frequencies.rawAchievement}/${frequencies.achievement}</h3> — operational style. How they naturally accomplish things. Include both the constructive way and the shadow avoidance pattern.

   Immediately after Achievement, add this REQUIRED section:
   <h3 id="repeating-pattern">The Pattern That Keeps Returning</h3>
   REQUIRED — do not skip. This section is tied specifically to Life Path ${frequencies.rawLifePath}/${frequencies.lifePath} (their life lesson number).
   First sentence: NAME the repeating pattern in plain language (what keeps showing up in their life until this lesson is constructed).
   Then 1–2 short paragraphs: concrete real-life examples of how this Life Path ${frequencies.lifePath} pattern repeats (relationships, work, decisions, identity), what the unconstructed/shadow loop looks like, and what changes when the lesson of ${frequencies.rawLifePath}/${frequencies.lifePath} is lived constructively.
   Every claim must stay anchored to this Life Path number. No vague spiritual filler.

   After that, add:
   <h3 id="external-quest">External Circuit Quest Objective</h3>
   ONE powerful paragraph that synthesizes all three (Theme + Life Path + Achievement) and echoes the named repeating pattern. Frame it as the specific quest the simulation presents.

4. <h2>The Internal Circuit</h2>
   Then each as <h3> with the EXACT id attributes shown:
   - <h3 id="soul">Soul Urge ${frequencies.rawSoul}/${frequencies.soul}</h3> — private inner world, inner compass. Desires and yearnings. Include shadow (repression, self-abandonment).
   - <h3 id="persona">Outer Persona ${frequencies.rawPersona}/${frequencies.persona}</h3> — social mask, how others read them first. First impression vibe. Include shadow (projecting instead of being authentic).
   - <h3 id="expression">Expression ${frequencies.rawExpression}/${frequencies.expression}</h3> — WRITE THIS AS THE BLEND of Soul (${frequencies.rawSoul}/${frequencies.soul}) and Outer Persona (${frequencies.rawPersona}/${frequencies.persona}) fusing together. Show how they combine to produce the authentic signal. Include shadow (performing a masked persona rather than expressing authentically).

   After these three, add:
   <h3 id="internal-quest">Internal Circuit Quest Objective</h3>
   ONE powerful paragraph that synthesizes all three (Soul + Outer Persona + Expression). Frame it as the specific signal they are here to express.

5. <h2 id="calling">The Life Calling — ${frequencies.rawDestiny}/${frequencies.destiny}</h2>
   The fusion of Life Path and Expression. The specific directive that emerges when external curriculum meets internal signal. Compound story, root essence, practical meaning. After that, one paragraph blending the Life Path life-lesson number (and its named repeating pattern), Achievement, birth day, and Theme into one variable of the Life Calling. The second paragraph is how Soul and Outer blend into the Expression and its influence on the Life Calling.

6. <h2>Action Guide: Your Quest Objectives</h2>
   Two subsections:

   <h3>External Mission</h3>
   Restate and expand the External Circuit Quest Objective. One paragraph explaining the outer work, the challenges to embrace, and how to interrupt the named Life Path repeating pattern when it shows up again.

   <h3>Internal Mission</h3>
   Restate and expand the Internal Circuit Quest Objective. One paragraph explaining the inner work, the authentic frequency to cultivate, the mask patterns to dissolve.

7. <h2>Quest Directive</h2>
   One powerful paragraph. Direct and personal. What ${firstName}'s simulation is asking them to master. Synthesize external mission, internal mission, and the Life Calling into ONE unified directive.

FORMAT: HTML only — <h2>, <h3>, <p>, <ul><li>. No markdown. No preamble. Start directly with the Opening. have proper margins at the end of each page seperation to not cut off text.
IMPORTANT: Include the exact id attributes on h3 and h2 tags as shown above — they are used for navigation.
LENGTH: 1600-2000 words. Complete all 7 sections. Do not cut sections short.
DEPTH: Go deep. Explain not just what each frequency means but HOW they apply to ${firstName}. Use the shadow side to show what they are learning to transcend.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      // NOTE: raised from 3333 → 8000. The prompt asks for 1600-2000 words across
      // 7 HTML-wrapped sections (~2,800-3,600+ tokens of prose alone, before markup
      // overhead). At 3333 max_tokens the response was getting cut off before the
      // Action Guide / Quest Directive sections were generated, which is why those
      // sections were missing downstream. 8000 gives comfortable headroom.
      max_tokens: 8000,
      stream:     true,
      system:     SSC_SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: prompt }],
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  // Stream to avoid 524 timeout on long generations
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let text       = '';
  let buffer     = '';
  let stopReason = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const evt = JSON.parse(raw);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          text += evt.delta.text;
        }
        if (evt.type === 'message_delta' && evt.delta?.stop_reason) {
          stopReason = evt.delta.stop_reason;
        }
      } catch { /* ignore malformed SSE lines */ }
    }
  }

  if (!text) throw new Error('No content returned from Anthropic');

  // Loud signal if generation was truncated by the token cap rather than
  // finishing naturally — this is what silently caused missing sections before.
  if (stopReason && stopReason !== 'end_turn' && stopReason !== 'stop_sequence') {
    console.error(`Anthropic generation stopped early (stop_reason=${stopReason}) — response may be missing trailing sections. Consider raising max_tokens further.`);
  }

  return text;
}


// ════════════════════════════════════════════════════════════
//  STEP 2 — PDFSHIFT: CONVERT HTML TO PDF
// ════════════════════════════════════════════════════════════

async function convertToPDF(html, env) {
  const credentials = btoa(`api:${env.PDFSHIFT_API_KEY}`);

  const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      source:    html,
      landscape: false,
      use_print: false,
      format:    'A4',
      // Kept at 0 intentionally: pages are full-bleed dark-themed backgrounds.
      // A real PDFShift page margin would leave blank/white edges around the
      // dark theme. Text-to-edge spacing is instead controlled via CSS padding
      // on each page container (see .content-pg, .action-pg, .ref-pg, .howto
      // below) — those have been widened for more generous, consistent spacing.
      margin:    { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PDFShift error ${response.status}: ${err}`);
  }

  return await response.arrayBuffer();
}


// ════════════════════════════════════════════════════════════
//  STEP 3 — RESEND: EMAIL PDF TO CUSTOMER
// ════════════════════════════════════════════════════════════

async function sendEmail(userData, name, frequencies, pdfBuffer, env) {
  const pdfBase64 = arrayBufferToBase64(pdfBuffer);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:     formatResendFrom(env.FROM_EMAIL),
      to:       [userData.email],
      reply_to: formatResendReplyTo(env.REPLY_TO_EMAIL, env.FROM_EMAIL),
      subject:  `\u2746 Your Holographic Blueprint \u2014 ${name.split(' ')[0]}`,
      html:     buildNotificationEmail(name, userData.email, frequencies, env),
      attachments: [{
        filename:     `SSC-Blueprint-${name.replace(/\s+/g, '-')}.pdf`,
        content:      pdfBase64,
        content_type: 'application/pdf',
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend error ${response.status}: ${err}`);
  }

  return await response.json();
}


// ════════════════════════════════════════════════════════════
//  PDF TEMPLATE — POSITIVE/SHADOW REFERENCE
// ════════════════════════════════════════════════════════════

const NUM_REF = {
  1:  ['Initiation, bold action, independence',       'Procrastination, aggression, ego'],
  2:  ['Connection, diplomacy, receptivity',          'Isolation, over-dependence, indecision'],
  3:  ['Creative expression, communication, joy',     'Scattered energy, performing for approval'],
  4:  ['Structure, discipline, grounded building',    'Chaos, rigidity, avoiding responsibility'],
  5:  ['Presence, adaptability, embodied freedom',    'Escape, avoidance, surface-level living'],
  6:  ['Nurturing, care, integration',                'Martyrdom, enabling, self-neglect'],
  7:  ['Depth, inner truth, wisdom',                  'Isolation, analysis paralysis, distrust'],
  8:  ['Self-mastery, authority, manifestation',      'Control, collapse, chasing power'],
  9:  ['Completion, service, universal vision',       'Ego inflation, inability to release'],
  11: ['Illumination, bridging, inspired insight',    'Oversensitivity, avoidance of grounding'],
  22: ['Master building, visionary pragmatism',       'Overwhelm, grandiosity, escapism'],
  33: ['Compassionate teaching, healing service',     'Martyrdom, heartlessness'],
  44: ['Legacy building, organised power',            'Self-destruction, addiction to control'],
};
function getRef(n) { return NUM_REF[n] || ['See full reading', 'See full reading']; }


// ════════════════════════════════════════════════════════════
//  PDF TEMPLATE — STAR CHART SVG
// ════════════════════════════════════════════════════════════

function buildStarChart(numbers) {
  const W=380, H=420, cx=190, cy=210, r=148;
  const toRad = a => a * Math.PI / 180;
  const pt = a => ({ x: +(cx + r * Math.cos(toRad(a))).toFixed(2), y: +(cy + r * Math.sin(toRad(a))).toFixed(2) });

  const soul=pt(150), expression=pt(-90), outer=pt(30),
        lifePath=pt(90), achievement=pt(-150), theme=pt(-30);

  const gold='#c9a84c', purple='#7b4fa6', teal='#4a9494';
  const C = {
    soul:        { s:purple, f:'#120b1a', t:'#a96ed4' },
    expression:  { s:gold,   f:'#1a1408', t:'#e8c96b' },
    outer:       { s:teal,   f:'#081414', t:'#7ec8c8' },
    lifePath:    { s:gold,   f:'#1a1408', t:'#e8c96b' },
    achievement: { s:purple, f:'#120b1a', t:'#a96ed4' },
    theme:       { s:teal,   f:'#081414', t:'#7ec8c8' },
  };

  const ln = (a,b,c,o,w) =>
    `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${c}" stroke-width="${w}" opacity="${o}" stroke-linecap="round"/>`;
  const tri = (a,b,c,f,s) =>
    `<polygon points="${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}" fill="${f}" stroke="${s}" stroke-width="1.2" stroke-linejoin="round"/>`;

  const nd = (x,y,n,lbl,c,r2,pos='auto') => {
    const dy = pos==='above' ? -(r2+14) : pos==='below' ? r2+14 : y<cy ? -(r2+14) : r2+14;
    const fs = n>9 ? 13 : 16;
    return `<g><circle cx="${x}" cy="${y}" r="${r2+7}" fill="${c.f}" stroke="${c.s}" stroke-width="1" opacity="0.4"/><circle cx="${x}" cy="${y}" r="${r2}" fill="${c.f}" stroke="${c.s}" stroke-width="1.5"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="${fs}" fill="${c.t}" font-weight="700">${n}</text><text x="${x}" y="${y+dy}" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="${c.t}" letter-spacing="0.12em" opacity="0.9">${lbl.toUpperCase()}</text></g>`;
  };

  const cn = n => {
    const fs = n>9 ? 13 : 16;
    return `<g><circle cx="${cx}" cy="${cy}" r="38" fill="rgba(201,168,76,0.06)" stroke="${gold}" stroke-width="1" opacity="0.5"/><circle cx="${cx}" cy="${cy}" r="28" fill="#100e04" stroke="${gold}" stroke-width="1.5"/><text x="${cx}" y="${cy-4}" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="${fs}" fill="#e8c96b" font-weight="700">${n}</text><text x="${cx}" y="${cy+16}" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.5" fill="${gold}" letter-spacing="0.14em" opacity="0.85">LIFE CALLING</text></g>`;
  };

  const bg = `<circle cx="${cx}" cy="${cy}" r="175" fill="url(#bgG)" stroke="rgba(201,168,76,0.12)" stroke-width="1"/>`;
  const spokes = [soul,expression,outer,lifePath,achievement,theme]
    .map(p => ln({x:cx,y:cy},p,gold,0.18,0.8)).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bgG" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#1a1620" stop-opacity="1"/><stop offset="100%" stop-color="#05040a" stop-opacity="1"/></radialGradient></defs>${bg}${tri(soul,expression,outer,'rgba(201,168,76,0.07)',gold)}${tri(lifePath,achievement,theme,'rgba(123,79,166,0.07)',purple)}${ln(soul,expression,gold,0.55,1.4)}${ln(expression,outer,gold,0.55,1.4)}${ln(outer,soul,gold,0.55,1.4)}${ln(lifePath,achievement,purple,0.55,1.4)}${ln(achievement,theme,purple,0.55,1.4)}${ln(theme,lifePath,purple,0.55,1.4)}${spokes}${nd(soul.x,soul.y,numbers[3],'Soul',C.soul,22)}${nd(theme.x,theme.y,numbers[6],'Theme',C.theme,22)}${nd(outer.x,outer.y,numbers[4],'Outer',C.outer,22)}${nd(lifePath.x,lifePath.y,numbers[0],'Life Path',C.lifePath,22,'below')}${nd(achievement.x,achievement.y,numbers[5],'Achievement',C.achievement,22)}${nd(expression.x,expression.y,numbers[1],'Expression',C.expression,22,'above')}${cn(numbers[2])}</svg>`;
}


// ════════════════════════════════════════════════════════════
//  PDF TEMPLATE — FULL HTML DOCUMENT
// ════════════════════════════════════════════════════════════

function buildPdfHtml({ name, month, day, year, frequencies, guidebookBody }) {
  const months = ['','January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const dob = `${months[month]} ${day}, ${year}`;

  const starChart = buildStarChart([
    frequencies.lifePath, frequencies.expression, frequencies.destiny,
    frequencies.soul, frequencies.persona, frequencies.achievement, frequencies.theme
  ]);

  const codexMap = buildCodexFootprintSvg(frequencies);
  const codexSectionMatch = guidebookBody.match(/<h2[^>]*id="codex-footprint"[^>]*>[\s\S]*?(?=<h2|$)/i);
  const codexNarrativeHtml = codexSectionMatch
    ? codexSectionMatch[0].replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, '').trim()
    : '';
  const mainBody = guidebookBody
    .replace(/<h2[^>]*id="codex-footprint"[^>]*>[\s\S]*?(?=<h2|$)/i, '')
    .replace(/<h2[^>]*>[^<]*Quest[^<]*<\/h2>[\s\S]*$/i, '')
    .trim();

  const [lp_pos,lp_shad]     = getRef(frequencies.lifePath);
  const [exp_pos,exp_shad]   = getRef(frequencies.expression);
  const [dst_pos,dst_shad]   = getRef(frequencies.destiny);
  const [soul_pos,soul_shad] = getRef(frequencies.soul);
  const [per_pos,per_shad]   = getRef(frequencies.persona);
  const [ach_pos,ach_shad]   = getRef(frequencies.achievement);
  const [thm_pos,thm_shad]   = getRef(frequencies.theme);

  const SIGIL = `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sg1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#4a9494" stop-opacity="0.3"/><stop offset="50%" stop-color="#c9a84c" stop-opacity="0.15"/><stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/></radialGradient></defs><circle cx="80" cy="80" r="72" fill="none" stroke="#c9a84c" stroke-width="0.7" opacity="0.35"/><circle cx="80" cy="80" r="66" fill="none" stroke="#c9a84c" stroke-width="0.3" opacity="0.12" stroke-dasharray="3 6"/><circle cx="80" cy="80" r="36" fill="url(#sg1)"/><line x1="80" y1="14" x2="80" y2="146" stroke="#4a9494" stroke-width="1" opacity="0.4"/><line x1="14" y1="80" x2="146" y2="80" stroke="#4a9494" stroke-width="1" opacity="0.4"/><line x1="29" y1="29" x2="131" y2="131" stroke="#c9a84c" stroke-width="0.6" opacity="0.18"/><line x1="131" y1="29" x2="29" y2="131" stroke="#c9a84c" stroke-width="0.6" opacity="0.18"/><circle cx="80" cy="16" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="144" cy="80" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="80" cy="144" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="16" cy="80" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="80" cy="16" r="2.5" fill="#7ec8c8" opacity="0.85"/><circle cx="144" cy="80" r="2.5" fill="#7ec8c8" opacity="0.85"/><circle cx="80" cy="144" r="2.5" fill="#7ec8c8" opacity="0.85"/><circle cx="16" cy="80" r="2.5" fill="#7ec8c8" opacity="0.85"/><circle cx="31" cy="31" r="6" fill="#03020a" stroke="#c9a84c" stroke-width="0.8" opacity="0.6"/><circle cx="129" cy="31" r="6" fill="#03020a" stroke="#c9a84c" stroke-width="0.8" opacity="0.6"/><circle cx="31" cy="129" r="6" fill="#03020a" stroke="#c9a84c" stroke-width="0.8" opacity="0.6"/><circle cx="129" cy="129" r="6" fill="#03020a" stroke="#c9a84c" stroke-width="0.8" opacity="0.6"/><circle cx="80" cy="80" r="18" fill="#03020a" stroke="#c9a84c" stroke-width="1.5"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Cormorant+SC:wght@300;400&family=EB+Garamond:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#05040a;color:#e8dfc8;font-family:"EB Garamond",Georgia,serif;font-size:18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ── COVER ── */
.cover{width:100%;min-height:297mm;background:#05040a;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 48px;position:relative;page-break-after:always}
.c-ey{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.5em;text-transform:uppercase;color:#4a9494;margin-bottom:40px}
.c-sig{width:150px;height:150px;margin:0 auto 44px;filter:drop-shadow(0 0 20px rgba(201,168,76,0.35))}
.c-sig svg{width:100%;height:100%}
.c-rl{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:#7a6330;margin-bottom:6px}
.c-rt{font-family:"Cormorant SC",serif;font-weight:300;font-size:16px;color:#9b9080;letter-spacing:.1em;margin-bottom:40px}
.c-div{display:flex;align-items:center;gap:16px;width:100%;max-width:400px;margin:0 auto 36px}
.c-dl{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent)}
.c-dg{width:7px;height:7px;background:#7a6330;transform:rotate(45deg);flex-shrink:0}
.c-nm{font-family:"Cormorant SC",serif;font-weight:300;font-size:44px;color:#e8c96b;letter-spacing:.06em;line-height:1.1;margin-bottom:8px}
.c-db{font-family:"Cinzel",serif;font-size:10px;letter-spacing:.35em;text-transform:uppercase;color:#7a6330;margin-bottom:48px}
.c-fqs{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:520px;margin:0 auto}
.c-bgt{background:rgba(13,11,24,0.95);border:1px solid rgba(201,168,76,0.18);border-radius:5px;padding:10px 16px;text-align:center;min-width:88px;text-decoration:none;display:block}
.c-bgt-n{font-family:"Cormorant SC",serif;font-size:22px;color:#c9a84c;display:block;line-height:1}
.c-bgt-l{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#7ec8c8;display:block;margin-top:4px}
.c-nav-hint{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:rgba(201,168,76,0.3);margin-top:16px}
.c-ft{position:absolute;bottom:28px;left:0;right:0;text-align:center;font-family:"Cinzel",serif;font-size:7px;letter-spacing:.25em;text-transform:uppercase;color:#5c5448}

/* ── STAR CHART ── */
.chart-pg{width:100%;min-height:297mm;background:#05040a;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 48px;page-break-after:always;position:relative}
.chart-ey{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.45em;text-transform:uppercase;color:#7a6330;margin-bottom:10px}
.chart-ti{font-family:"Cormorant SC",serif;font-weight:300;font-size:28px;color:#e8c96b;letter-spacing:.05em;margin-bottom:32px}
.chart-wr{width:360px;height:400px;margin:0 auto}
.chart-pf{position:absolute;bottom:24px;left:52px;right:52px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(201,168,76,0.07);padding-top:10px}
.chart-pf span{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}

/* ── CODEX FOOTPRINT ── */
.codex-pg{width:100%;min-height:297mm;background:#05040a;display:flex;flex-direction:column;align-items:center;padding:48px 48px 80px;page-break-after:always;position:relative}
.codex-ey{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.45em;text-transform:uppercase;color:#7a6330;margin-bottom:10px;text-align:center}
.codex-ti{font-family:"Cormorant SC",serif;font-weight:300;font-size:28px;color:#e8c96b;letter-spacing:.05em;margin-bottom:8px;text-align:center}
.codex-map-wrap{width:320px;margin:24px auto 16px}
.codex-map-wrap svg{width:100%;height:auto;display:block}
.codex-legend{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-bottom:20px}
.codex-legend-item{font-family:"Cinzel",serif;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#9b9080;display:inline-flex;align-items:center;gap:6px}
.codex-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.codex-caption{font-size:15px;line-height:1.75;color:#9b9080;text-align:center;max-width:480px;margin:0 auto 28px;font-style:italic}
.codex-body{font-size:17px;line-height:2;color:#9b9080;max-width:520px;margin:0 auto;width:100%}
.codex-body p{margin-bottom:14px}
.codex-body strong{color:#e8dfc8}
.codex-pf{position:absolute;bottom:24px;left:52px;right:52px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(201,168,76,0.07);padding-top:10px}
.codex-pf span{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}

/* ── HOW TO READ ── */
.howto{width:100%;background:#05040a;padding:64px 96px 96px;page-break-after:always;position:relative;min-height:297mm}
.howto-ey{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.45em;text-transform:uppercase;color:#4a9494;margin-bottom:10px}
.howto-ti{font-family:"Cormorant SC",serif;font-weight:300;font-size:30px;color:#e8c96b;letter-spacing:.05em;margin-bottom:8px}
.howto-dv{height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.3),transparent);margin-bottom:28px}
.howto-in{font-size:17px;line-height:1.85;color:#9b9080;margin-bottom:32px;font-style:italic}
.howto-gr{display:grid;grid-template-columns:1fr;gap:20px;margin-bottom:32px}
.howto-cd{background:rgba(13,11,24,0.8);border:1px solid rgba(201,168,76,0.1);border-radius:6px;padding:20px 24px}
.howto-cl{font-family:"Cinzel",serif;font-size:8px;letter-spacing:.3em;text-transform:uppercase;color:#7ec8c8;margin-bottom:6px}
.howto-ct{font-family:"Cormorant SC",serif;font-size:20px;color:#e8c96b;margin-bottom:8px;letter-spacing:.03em}
.howto-cb{font-size:16px;line-height:1.8;color:#9b9080}
.howto-nt{background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.12);border-left:3px solid rgba(201,168,76,0.4);border-radius:4px;padding:18px 22px;margin-bottom:24px}
.howto-nt p{font-size:16px;line-height:1.8;color:#9b9080}
.howto-nt strong{color:#e8c96b}
.howto-pf{position:absolute;bottom:24px;left:96px;right:96px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(201,168,76,0.07);padding-top:10px}
.howto-pf span{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}

/* ── MAIN CONTENT ── */
.content-pg{width:100%;background:#05040a;padding:64px 96px 96px;page-break-after:always;position:relative;min-height:297mm}
.pg-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:36px;padding-bottom:14px;border-bottom:1px solid rgba(201,168,76,0.1)}
.pg-hd span{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.35em;text-transform:uppercase;color:#5c5448}
.sb h2{font-family:"Cormorant SC",serif;font-weight:300;font-size:28px;color:#e8c96b;letter-spacing:.04em;margin:36px 0 10px;padding-bottom:8px;border-bottom:1px solid rgba(201,168,76,0.1);page-break-before:always;break-before:page;page-break-after:avoid;break-after:avoid}
.sb h2:first-child{page-break-before:avoid;break-before:avoid}
.sb h3{font-family:"Cinzel",serif;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#7ec8c8;margin:24px 0 8px;page-break-after:avoid;break-after:avoid}
.sb p{font-size:17px;line-height:2;color:#9b9080;margin-bottom:14px;page-break-inside:avoid;break-inside:avoid;orphans:3;widows:3}
.sb strong{color:#e8dfc8}
.sb em{color:#c9a84c;font-style:italic}
.sb ul{list-style:none;padding:0;margin:0 0 16px}
.sb ul li{font-size:16px;line-height:1.85;color:#9b9080;padding:6px 0 6px 20px;border-bottom:1px solid rgba(201,168,76,0.05);position:relative}
.sb ul li::before{content:"\\25C8";position:absolute;left:0;top:8px;font-size:7px;color:#4a9494}
.pg-ft{position:absolute;bottom:24px;left:96px;right:96px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(201,168,76,0.07);padding-top:10px}
.pg-ft span{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}

/* ── REFERENCE TABLE ── */
.ref-pg{width:100%;background:#05040a;padding:64px 96px 96px;page-break-before:always;position:relative;min-height:297mm}
.ref-ey{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.45em;text-transform:uppercase;color:#7a6330;margin-bottom:10px}
.ref-ti{font-family:"Cormorant SC",serif;font-weight:300;font-size:30px;color:#e8c96b;letter-spacing:.05em;margin-bottom:6px}
.ref-dv{height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.3),transparent);margin-bottom:28px}
.ref-tb{width:100%;border-collapse:collapse;margin-bottom:32px}
.ref-tb th{font-family:"Cinzel",serif;font-size:8px;letter-spacing:.3em;text-transform:uppercase;color:#7a6330;text-align:left;padding:10px 14px;border-bottom:1px solid rgba(201,168,76,0.2)}
.ref-tb td{font-size:15px;color:#9b9080;padding:11px 14px;border-bottom:1px solid rgba(201,168,76,0.06);vertical-align:top;line-height:1.65}
.ref-fl{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.15em;text-transform:uppercase;color:#7ec8c8;display:block;margin-bottom:3px}
.ref-cp{font-family:"Cormorant SC",serif;font-size:19px;color:#c9a84c}
.ref-pos{color:#7ec8c8}
.ref-shd{color:#a04070}
.ref-pf{position:absolute;bottom:24px;left:96px;right:96px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(201,168,76,0.07);padding-top:10px}
.ref-pf span{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}

/* ── ACTION GUIDE ── */
.action-pg{width:100%;background:#05040a;padding:110px 110px 160px;page-break-before:always;position:relative;min-height:297mm}
.action-ey{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.45em;text-transform:uppercase;color:#7a6330;margin-bottom:10px}
.action-ti{font-family:"Cormorant SC",serif;font-weight:300;font-size:30px;color:#e8c96b;letter-spacing:.05em;margin-bottom:6px}
.action-dv{height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.3),transparent);margin-bottom:28px}
.action-sec{margin-bottom:40px}
.action-h3{font-family:"Cinzel",serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#7ec8c8;margin-bottom:14px;border-bottom:1px solid rgba(201,168,76,0.15);padding-bottom:10px}
.action-bd{font-size:15px;color:#9b9080;line-height:1.8;margin-bottom:16px}
.action-pf{position:absolute;bottom:24px;left:110px;right:110px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(201,168,76,0.07);padding-top:10px}
.action-pf span{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}

/* ── QUEST DIRECTIVE ── */
.quest-pg{width:100%;min-height:297mm;background:#05040a;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 90px 150px}
.q-ey{font-family:"Cinzel",serif;font-size:9px;letter-spacing:.5em;text-transform:uppercase;color:#7a6330;margin-bottom:28px}
.q-ti{font-family:"Cormorant SC",serif;font-weight:300;font-size:36px;color:#e8c96b;letter-spacing:.05em;margin-bottom:32px}
.q-dv{width:100px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent);margin:0 auto 32px}
.q-tx{font-size:18px;line-height:2;color:#9b9080;max-width:560px;font-style:italic}
.q-tx strong{color:#e8dfc8;font-style:normal}
.q-br{margin-top:56px;display:flex;flex-direction:column;align-items:center;gap:12px}
.q-bs{width:44px;height:44px;opacity:0.45}
.q-bn{font-family:"Cormorant SC",serif;font-size:14px;color:#c9a84c;letter-spacing:.06em}
.q-bu{font-family:"Cinzel",serif;font-size:8px;letter-spacing:.3em;text-transform:uppercase;color:#5c5448}
.q-sc{display:flex;gap:20px;margin-top:8px}
.q-sc a{font-family:"Cinzel",serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448;text-decoration:none}

@media print{body{background:#05040a !important}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="c-ey">&#10022; &nbsp; Holographic Blueprint Reading &nbsp; &#10022;</div>
  <div class="c-sig">${SIGIL}</div>
  <div class="c-rl">Simulation Source Code</div>
  <div class="c-rt">Complete Frequency Guidebook</div>
  <div class="c-div"><span class="c-dl"></span><span class="c-dg"></span><span class="c-dl"></span></div>
  <div class="c-nm">${name}</div>
  <div class="c-db">${dob}</div>
  <div class="c-fqs">
    <a href="#theme" class="c-bgt"><span class="c-bgt-n">${frequencies.rawTheme}/${frequencies.theme}</span><span class="c-bgt-l">Theme</span></a>
    <a href="#lifepath" class="c-bgt"><span class="c-bgt-n">${frequencies.rawLifePath}/${frequencies.lifePath}</span><span class="c-bgt-l">Life Path</span></a>
    <a href="#achievement" class="c-bgt"><span class="c-bgt-n">${frequencies.rawAchievement}/${frequencies.achievement}</span><span class="c-bgt-l">Achievement</span></a>
    <a href="#expression" class="c-bgt"><span class="c-bgt-n">${frequencies.rawExpression}/${frequencies.expression}</span><span class="c-bgt-l">Expression</span></a>
    <a href="#soul" class="c-bgt"><span class="c-bgt-n">${frequencies.rawSoul}/${frequencies.soul}</span><span class="c-bgt-l">Soul</span></a>
    <a href="#persona" class="c-bgt"><span class="c-bgt-n">${frequencies.rawPersona}/${frequencies.persona}</span><span class="c-bgt-l">Persona</span></a>
    <a href="#calling" class="c-bgt"><span class="c-bgt-n">${frequencies.rawDestiny}/${frequencies.destiny}</span><span class="c-bgt-l">Life Calling</span></a>
  </div>
  <div class="c-nav-hint">&#8599; tap any frequency to jump to its section</div>
  <div class="c-ft">simulationsourcecode.com &nbsp;&#183;&nbsp; &#10022; &nbsp;&#183;&nbsp; Generated exclusively for ${name}</div>
</div>

<!-- STAR CHART -->
<div class="chart-pg">
  <div class="chart-ey">Your Frequency Map</div>
  <div class="chart-ti">The Seven Frequencies</div>
  <div class="chart-wr">${starChart}</div>
  <div class="chart-pf"><span>Simulation Source Code</span><span>${name}</span></div>
</div>

<!-- CODEX FOOTPRINT -->
<div class="codex-pg">
  <div class="codex-ey">Purpose Triangle</div>
  <div class="codex-ti">Your Codex Footprint</div>
  <div class="codex-map-wrap">${codexMap.svg}</div>
  <div class="codex-legend">${codexMap.legend}</div>
  <p class="codex-caption">${codexMap.narrative}</p>
  ${codexNarrativeHtml ? `<div class="codex-body">${codexNarrativeHtml}</div>` : ''}
  <div class="codex-pf"><span>Simulation Source Code</span><span>${name}</span></div>
</div>

<!-- HOW TO READ -->
<div class="howto">
  <div class="howto-ey">Before You Begin</div>
  <div class="howto-ti">How to Read This Blueprint</div>
  <div class="howto-dv"></div>
  <p class="howto-in">This is not a personality profile. It is a map of the frequencies encoded in your birth date and full name &#8212; the two circuits through which your simulation runs. Read it as direction, not description.</p>
  <div class="howto-gr">
    <div class="howto-cd">
      <div class="howto-cl">Birth Date</div>
      <div class="howto-ct">The External Circuit</div>
      <div class="howto-cb">Your birth date encodes the curriculum the simulation has designed for you &#8212; the themes, resistances, and lessons life will keep presenting. Theme sets the atmospheric note. Life Path is the core curriculum. Achievement is how you are wired to move through it.</div>
    </div>
    <div class="howto-cd">
      <div class="howto-cl">Full Birth Name</div>
      <div class="howto-ct">The Internal Circuit</div>
      <div class="howto-cb">Your name encodes the frequency you are here to express. Soul is the inner world. Outer Persona is the social mask. Expression is what emerges when they fuse. This is the authentic signal beneath conditioning &#8212; your inner dominion.</div>
    </div>
    <div class="howto-cd">
      <div class="howto-cl">The Numbers</div>
      <div class="howto-ct">Positive &amp; Shadow</div>
      <div class="howto-cb">Every frequency has both a positive and shadow expression. The shadow is not a flaw &#8212; it is the unconstructed version of the same energy. The work is not to eliminate the shadow, but to understand it so it stops running on autopilot.</div>
    </div>
    <div class="howto-cd">
      <div class="howto-cl">The Fusion</div>
      <div class="howto-ct">The Life Calling</div>
      <div class="howto-cb">The Life Calling is the fusion of your Life Path and Expression. It is not a career suggestion &#8212; it is the specific directive that emerges when your external curriculum and internal frequency are run together.</div>
    </div>
  </div>
  <div class="howto-nt">
    <p><strong>On compound numbers:</strong> Every frequency is shown as compound/root (e.g. 35/8). The compound number tells the story of how the energy arrived. The root is the core operating frequency. The compound is the experience; the root is the essence. Both matter.</p>
  </div>
  <div class="howto-pf"><span>Simulation Source Code</span><span>simulationsourcecode.com</span></div>
</div>

<!-- MAIN CONTENT -->
<div class="content-pg">
  <div class="pg-hd"><span>Simulation Source Code</span><span>${name}</span></div>
  <div class="sb">${mainBody}</div>
  <div class="pg-ft"><span>Holographic Blueprint Reading</span><span>simulationsourcecode.com</span></div>
</div>

<!-- REFERENCE TABLE -->
<div class="ref-pg">
  <div class="ref-ey">Quick Reference</div>
  <div class="ref-ti">Your Frequency Map at a Glance</div>
  <div class="ref-dv"></div>
  <table class="ref-tb">
    <thead><tr><th>Frequency</th><th>Compound / Root</th><th>Positive</th><th>Shadow</th></tr></thead>
    <tbody>
      <tr><td><span class="ref-fl">External &#183; Atmospheric</span>Theme</td><td><span class="ref-cp">${frequencies.rawTheme}/${frequencies.theme}</span></td><td class="ref-pos">${thm_pos}</td><td class="ref-shd">${thm_shad}</td></tr>
      <tr><td><span class="ref-fl">External &#183; Curriculum</span>Life Path</td><td><span class="ref-cp">${frequencies.rawLifePath}/${frequencies.lifePath}</span></td><td class="ref-pos">${lp_pos}</td><td class="ref-shd">${lp_shad}</td></tr>
      <tr><td><span class="ref-fl">External &#183; Operational</span>Achievement</td><td><span class="ref-cp">${frequencies.rawAchievement}/${frequencies.achievement}</span></td><td class="ref-pos">${ach_pos}</td><td class="ref-shd">${ach_shad}</td></tr>
      <tr><td><span class="ref-fl">Internal &#183; Inner World</span>Soul Urge</td><td><span class="ref-cp">${frequencies.rawSoul}/${frequencies.soul}</span></td><td class="ref-pos">${soul_pos}</td><td class="ref-shd">${soul_shad}</td></tr>
      <tr><td><span class="ref-fl">Internal &#183; Social Mask</span>Outer Persona</td><td><span class="ref-cp">${frequencies.rawPersona}/${frequencies.persona}</span></td><td class="ref-pos">${per_pos}</td><td class="ref-shd">${per_shad}</td></tr>
      <tr><td><span class="ref-fl">Internal &#183; Authentic Signal</span>Expression</td><td><span class="ref-cp">${frequencies.rawExpression}/${frequencies.expression}</span></td><td class="ref-pos">${exp_pos}</td><td class="ref-shd">${exp_shad}</td></tr>
      <tr><td><span class="ref-fl">The Directive</span>Life Calling</td><td><span class="ref-cp">${frequencies.rawDestiny}/${frequencies.destiny}</span></td><td class="ref-pos">${dst_pos}</td><td class="ref-shd">${dst_shad}</td></tr>
    </tbody>
  </table>
  <div class="ref-pf"><span>Simulation Source Code</span><span>${name} &nbsp;&#183;&nbsp; ${dob}</span></div>
</div>

<!-- ACTION GUIDE -->
  <div class="action-pg">
  <div class="action-ey">&#10022; &nbsp; Your Path Forward &nbsp; &#10022;</div>
  <div class="action-ti">Action Guide</div>
  <div class="action-dv"></div>

      ${
        (() => {
          const escapeForRegex = (s) => String(s).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

          const stripH3Artifacts = (html) =>
            String(html || '').replace(/<\/?h3[^>]*>/gi, '').trim();

          // 1) Grab the whole Action Guide chunk from the <h2>Action Guide ...</h2> up to next <h2>
          const getActionGuideChunk = () => {
            const re = new RegExp(
              `<h2[^>]*>\\s*${escapeForRegex('Action Guide')}[\\s\\S]*?<\\/h2>([\\s\\S]*?)(?=<h2|$)`,
              'i'
            );
            return guidebookBody.match(re)?.[1] || '';
          };

          const rawActionChunk = getActionGuideChunk();

          // 2) From inside that chunk, capture the FIRST <p> inside each <h3>...</h3> block
          const extractFirstPInsideH3 = ({ h3Text }) => {
            const re = new RegExp(
              `<h3[^>]*>\\s*${escapeForRegex(h3Text)}\\s*<\\/h3>[\\s\\S]*?<p[^>]*>([\\s\\S]*?)<\\/p>`,
              'i'
            );
            return rawActionChunk.match(re)?.[1]?.trim() || '';
          };

          let extHtml = stripH3Artifacts(extractFirstPInsideH3({ h3Text: 'External Mission' }));
          let intHtml = stripH3Artifacts(extractFirstPInsideH3({ h3Text: 'Internal Mission' }));

          // If extraction fails, fall back to rendering the whole chunk so nothing is missing.
          if (!extHtml && !intHtml) {
            if (!rawActionChunk) return '';
            return `<div class="sb">${rawActionChunk}</div>`;
          }

          // If only one side failed, weaken fallback to "first <p> after the h3"
          if (!extHtml) {
            const weak = rawActionChunk.match(
              /<h3[^>]*>\s*External Mission\s*<\/h3>([\s\S]*?)(?=<h3|<h2|$)/i
            )?.[1];
            extHtml =
              stripH3Artifacts(weak?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]) || '';
          }
          if (!intHtml) {
            const weak = rawActionChunk.match(
              /<h3[^>]*>\s*Internal Mission\s*<\/h3>([\s\S]*?)(?=<h3|<h2|$)/i
            )?.[1];
            intHtml =
              stripH3Artifacts(weak?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]) || '';
          }

          // Return in the exact wrapper your CSS expects
          return `
            <div class="action-sec">
              <div class="action-h3">External Mission</div>
              <p class="action-bd">${extHtml}</p>
            </div>
            <div class="action-sec">
              <div class="action-h3">Internal Mission</div>
              <p class="action-bd">${intHtml}</p>
            </div>
          `;
        })()
      }

  <div class="action-pf"><span>Simulation Source Code</span><span>${name} &nbsp;&#183;&nbsp; ${dob}</span></div>
</div>

<!-- QUEST DIRECTIVE -->
<div class="quest-pg">
  <div class="q-ey">&#10022; &nbsp; Final Transmission &nbsp; &#10022;</div>
  <div class="q-ti">Quest Directive</div>
  <div class="q-dv"></div>
  <div class="q-tx">${
    (() => {
      // FIX: previously built a regex from directiveH2Re.source, which already
      // contained its own <h2>...</h2> wrapper, then wrapped THAT inside another
      // <h2>...</h2> template — requiring two nested <h2> tags that never exist
      // in the real HTML, so this could never match. It also double-escaped
      // backslashes via .replace(/\\/g,'\\\\'), turning \s into a literal
      // "\s" search. Fixed to match directly, the same way the Action Guide
      // chunk extraction above does.
      const m = guidebookBody.match(
        /<h2[^>]*>\s*Quest Directive\s*<\/h2>([\s\S]*?)(?=<h2|$)/i
      );
      const chunk = m?.[1] || '';

      const p = chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
      return String(p).replace(/<[^>]+>/g, '').trim();
    })()
  }</div>
  <div class="q-br">
    <svg class="q-bs" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sg2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#4a9494" stop-opacity="0.3"/><stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/></radialGradient></defs><circle cx="80" cy="80" r="72" fill="none" stroke="#c9a84c" stroke-width="0.7" opacity="0.35"/><circle cx="80" cy="80" r="36" fill="url(#sg2)"/><line x1="80" y1="14" x2="80" y2="146" stroke="#4a9494" stroke-width="1" opacity="0.4"/><line x1="14" y1="80" x2="146" y2="80" stroke="#4a9494" stroke-width="1" opacity="0.4"/><circle cx="80" cy="16" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="144" cy="80" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="80" cy="144" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="16" cy="80" r="8" fill="#03020a" stroke="#4a9494" stroke-width="1"/><circle cx="80" cy="80" r="18" fill="#03020a" stroke="#c9a84c" stroke-width="1.5"/></svg>
    <div class="q-bn">Simulation Source Code</div>
    <div class="q-bu">simulationsourcecode.com</div>
    <div class="q-sc">
      <a href="https://www.instagram.com/kytholek">Instagram</a>
      <a href="https://www.youtube.com/@kytholek">YouTube</a>
      <a href="https://substack.com/@kyelthomas">Substack</a>
      <a href="https://www.tiktok.com/@kytholek">TikTok</a>
    </div>
  </div>
</div>

</body>
</html>`;
}


// ════════════════════════════════════════════════════════════
//  EMAIL NOTIFICATION TEMPLATE
// ════════════════════════════════════════════════════════════

function buildNotificationEmail(name, email, frequencies, env = {}) {
  const firstName = name.split(' ')[0];
  const reviewUrl = getGoogleReviewUrl(env);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{margin:0;padding:0;background-color:#05040a;font-family:Georgia,serif;color:#e8dfc8}.wrap{max-width:560px;margin:0 auto;padding:48px 32px}.sigil{text-align:center;font-size:32px;color:#c9a84c;margin-bottom:24px}.eyebrow{font-family:Arial,sans-serif;font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:#4a9494;text-align:center;margin-bottom:12px}.title{font-size:26px;color:#e8c96b;font-weight:normal;text-align:center;margin-bottom:8px}.sub{font-size:14px;color:#9b9080;font-style:italic;text-align:center;margin-bottom:36px}.divider{height:1px;background:rgba(201,168,76,0.15);margin:32px 0}.body{font-size:16px;line-height:1.8;color:#9b9080;margin-bottom:20px}.body strong{color:#e8dfc8}.body a{color:#e8c96b}.freqs{background:rgba(13,11,24,0.9);border:1px solid rgba(201,168,76,0.15);border-radius:8px;padding:20px;margin:28px 0;text-align:center}.badge{display:inline-block;background:rgba(74,148,148,0.12);border:1px solid rgba(126,200,200,0.25);border-radius:4px;padding:4px 10px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#7ec8c8;margin:3px}.ft{font-family:Arial,sans-serif;font-size:10px;color:#5c5448;text-align:center;letter-spacing:.15em;text-transform:uppercase;line-height:1.8}.ft a{color:#7a6330;text-decoration:none}</style></head><body><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#05040a;"><tr><td align="center" style="padding:40px 16px;"><div class="wrap"><div class="sigil">&#10022;</div><div class="eyebrow">Simulation Source Code</div><div class="title">Your Blueprint is Ready</div><div class="sub">${firstName} &mdash; your complete frequency guidebook is attached</div><div class="divider"></div><p class="body">Your <strong>Holographic Blueprint Reading</strong> is attached as a PDF. Open it to access your complete analysis: both positive and shadow expressions of each frequency, quest objectives for each circuit, an action guide mapping your internal and external missions, and your final quest directive.</p><div class="freqs"><span class="badge">Theme &middot; ${frequencies.rawTheme}/${frequencies.theme}</span><span class="badge">Life Path &middot; ${frequencies.rawLifePath}/${frequencies.lifePath}</span><span class="badge">Achievement &middot; ${frequencies.rawAchievement}/${frequencies.achievement}</span><span class="badge">Expression &middot; ${frequencies.rawExpression}/${frequencies.expression}</span><span class="badge">Soul &middot; ${frequencies.rawSoul}/${frequencies.soul}</span><span class="badge">Persona &middot; ${frequencies.rawPersona}/${frequencies.persona}</span><span class="badge">Life Calling &middot; ${frequencies.rawDestiny}/${frequencies.destiny}</span></div><div class="divider"></div><p class="body">Found this helpful? <a href="${reviewUrl}">Leave a review on Google</a> &mdash; it helps others find their blueprint.</p><div class="divider"></div><div class="ft">Simulation Source Code &nbsp;&middot;&nbsp; <a href="https://simulationsourcecode.com">simulationsourcecode.com</a><br>Generated exclusively for ${email}</div></div></td></tr></table></body></html>`;
}


// ════════════════════════════════════════════════════════════
//  STRIPE SIGNATURE VERIFICATION
// ════════════════════════════════════════════════════════════

async function verifyStripeSignature(payload, signature, secret) {
  if (!signature) throw new Error('Missing stripe-signature header');

  const parts = Object.fromEntries(
    signature.split(',').map(part => {
      const [key, ...val] = part.split('=');
      return [key, val.join('=')];
    })
  );

  const timestamp = parts['t'];
  const v1        = parts['v1'];

  if (!timestamp || !v1) throw new Error('Invalid stripe-signature format');

  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > tolerance) {
    throw new Error('Stripe webhook timestamp too old');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const encoder       = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC', key, encoder.encode(signedPayload)
  );

  const expectedSig = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (!timingSafeEqual(expectedSig, v1)) {
    throw new Error('Stripe signature mismatch');
  }

  return JSON.parse(payload);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}


// ════════════════════════════════════════════════════════════
//  UTILITY
// ════════════════════════════════════════════════════════════

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary  = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}


// ════════════════════════════════════════════════════════════
//  CREATE CHECKOUT — POST /api/session
// ════════════════════════════════════════════════════════════

async function handleCreateCheckout(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  const { email, name, month, day, year,
          life_path, expression, life_calling,
          soul, outer, achievement, theme, product: productRaw } = body;
  const product = resolveProduct(productRaw);

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email required' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  if (product.priceCents === 0) {
    const userData = {
      ...buildUserDataFromBody({ email, name, month, day, year }),
      product: product.id,
    };
    const validationError = validateUserData(userData);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }
    try {
      await logPurchaseToSheet(userData, {
        lifePath: life_path,
        expression,
        lifeCalling: life_calling,
      });
      await enqueueFulfillment(userData, env);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('free reading queue error:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }
  }

  const stripeKey = env.STRIPE_SECRET || env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('STRIPE_SECRET / STRIPE_SECRET_KEY not set in Worker environment');
    return new Response(JSON.stringify({
      error: 'Stripe is not configured on the server. Set STRIPE_SECRET in Cloudflare Worker settings.',
    }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  try {
    const params = new URLSearchParams({
      'payment_method_types[0]':                        'card',
      'mode':                                           'payment',
      'customer_email':                                 email,
      'line_items[0][price_data][currency]':            'usd',
      'line_items[0][price_data][unit_amount]':         String(product.priceCents),
      'line_items[0][price_data][product_data][name]':  product.stripeName,
      'line_items[0][price_data][product_data][description]': product.stripeDescription,
      'line_items[0][quantity]':                        '1',
      'metadata[email]':                                email        || '',
      'metadata[name]':                                 name         || '',
      'metadata[birth_month]':                          String(month || ''),
      'metadata[birth_day]':                            String(day   || ''),
      'metadata[birth_year]':                           String(year  || ''),
      'metadata[life_path]':                            String(life_path    || ''),
      'metadata[expression]':                           String(expression   || ''),
      'metadata[life_calling]':                         String(life_calling || ''),
      'metadata[soul]':                                 String(soul         || ''),
      'metadata[outer]':                                String(outer        || ''),
      'metadata[achievement]':                          String(achievement  || ''),
      'metadata[theme]':                                String(theme        || ''),
      'metadata[product]':                              product.id,
      'success_url':                                    `https://simulationsourcecode.com/thank-you/?session_id={CHECKOUT_SESSION_ID}&product=${product.successProduct}`,
      'cancel_url':                                     'https://simulationsourcecode.com/calculator/?payment=cancelled',
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe error:', session.error?.message);
      return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
}


// ════════════════════════════════════════════════════════════
//  SITE CHAT — POST /api/chat (single-turn, site+blog grounded)
// ════════════════════════════════════════════════════════════

function chatClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
  );
}

async function checkChatRateLimit(request) {
  const ip = chatClientIp(request);
  const key = new Request(`https://ssc-chat-rate.local/${encodeURIComponent(ip)}`);
  try {
    const cache = caches.default;
    const hit = await cache.match(key);
    let count = 0;
    let resetAt = Date.now() + CHAT_RATE_WINDOW_MS;
    if (hit) {
      const data = await hit.json();
      count = Number(data.count) || 0;
      resetAt = Number(data.resetAt) || resetAt;
      if (Date.now() > resetAt) {
        count = 0;
        resetAt = Date.now() + CHAT_RATE_WINDOW_MS;
      }
    }
    if (count >= CHAT_RATE_LIMIT) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) };
    }
    const body = JSON.stringify({ count: count + 1, resetAt });
    const ttl = Math.max(60, Math.ceil((resetAt - Date.now()) / 1000));
    await cache.put(
      key,
      new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ttl}`,
        },
      })
    );
    return { ok: true };
  } catch (err) {
    console.error('chat rate-limit error (allowing):', err?.message || err);
    return { ok: true };
  }
}

async function handleChat(request, env, origin) {
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 415,
      headers,
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) {
    return new Response(JSON.stringify({ error: 'Request too large' }), {
      status: 413,
      headers,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  // Single-turn only — ignore any history arrays clients might send
  const message = sanitizeChatMessage(body?.message);
  const page = String(body?.page || '').slice(0, 200);

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message required' }), { status: 400, headers });
  }
  if (message.length > CHAT_MAX_MESSAGE_CHARS) {
    return new Response(JSON.stringify({ error: 'Message too long' }), { status: 400, headers });
  }

  const rate = await checkChatRateLimit(request);
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again shortly.' }), {
      status: 429,
      headers: { ...headers, 'Retry-After': String(rate.retryAfter || 60) },
    });
  }

  if (isObviousOffTopic(message)) {
    return new Response(JSON.stringify({ reply: OFFTOPIC_REPLY }), { status: 200, headers });
  }

  // Deterministic SSC math for birth-date numbers — do not let the model invent digits.
  const dateFreqs = resolveDateFrequenciesFromMessage(message);
  if (dateFreqs && wantsPersonalNumbers(message)) {
    return new Response(
      JSON.stringify({ reply: buildBirthDateNumbersReply(dateFreqs) }),
      { status: 200, headers }
    );
  }

  if (!env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing for /api/chat');
    return new Response(JSON.stringify({ error: 'Chat unavailable' }), { status: 503, headers });
  }

  const chunks = retrieveChatContext(message);
  const userPrompt = buildChatUserPrompt(message, page, chunks, dateFreqs);

  try {
    const antRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: 220,
        system: CHAT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const antJson = await antRes.json();
    if (!antRes.ok) {
      console.error('chat anthropic error:', antJson?.error?.message || antRes.status);
      return new Response(JSON.stringify({ error: 'Chat temporarily unavailable' }), {
        status: 502,
        headers,
      });
    }

    const reply = (antJson.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!reply) {
      return new Response(JSON.stringify({ error: 'Empty reply' }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ reply }), { status: 200, headers });
  } catch (err) {
    console.error('handleChat error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Chat temporarily unavailable' }), {
      status: 500,
      headers,
    });
  }
}


// ════════════════════════════════════════════════════════════
//  SUBMIT EMAIL — POST /submit-email
// ════════════════════════════════════════════════════════════

async function handleSubmitEmail(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  const email = String(body.email || '').trim();
  const requestedSource = String(body.source || body.origin || 'signup').trim().toLowerCase();
  const source = EMAIL_ORIGINS.has(requestedSource) ? requestedSource : 'signup';

  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Email required' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  let sheetPayload = { email, source, origin: source };
  let calculatorEmailData = null;

  if (source === 'calculator') {
    const userData = buildUserDataFromBody({
      email,
      name: body.name,
      full_name: body.full_name,
      month: body.month,
      day: body.day,
      year: body.year,
    });
    const validationError = validateUserData(userData);
    if (validationError || !userData.fullName) {
      return new Response(JSON.stringify({ error: validationError || 'Full birth name required' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const frequencies = calculateFrequencies(
      userData.fullName,
      userData.birthMonth,
      userData.birthDay,
      userData.birthYear
    );

    const birthDate = `${userData.birthMonth}/${userData.birthDay}/${userData.birthYear}`;
    const firstName = userData.fullName.trim().split(/\s+/)[0] || userData.fullName;
    const lifePath = body.life_path ?? body.lifePath ?? frequencies.lifePath;
    const expression = body.expression ?? frequencies.expression;
    const lifeCalling = body.life_calling ?? body.lifeCalling ?? body.destiny ?? frequencies.destiny;

    sheetPayload = {
      email,
      source,
      origin: source,
      firstName,
      first_name: firstName,
      name: userData.fullName,
      full_name: userData.fullName,
      birthDate,
      birth_date: birthDate,
      lifePath,
      life_path: lifePath,
      expression,
      lifeCalling,
      life_calling: lifeCalling,
      destiny: lifeCalling,
    };
    calculatorEmailData = {
      firstName,
      name: userData.fullName,
      birthDate,
      lifePath,
      expression,
      lifeCalling,
      readingText: body.reading_text || body.readingText || '',
    };
  }

  // Log email to Google Sheet (calculator / webapp / signup)
  await logEmailToSheet(sheetPayload);

  // Webapp waitlist: sheet only — no autoresponder
  if (source !== 'webapp') {
    try {
      const subject = source === 'calculator'
        ? 'Your Free Numerology Blueprint — Simulation Source Code'
        : 'Your Free Life Path Intro — Simulation Source Code';
      const calculatorReadingHtml = plainTextToEmailHtml(calculatorEmailData?.readingText);
      const html = source === 'calculator'
        ? `<p>Thanks for decoding your blueprint. Here is your free calculator reading:</p>
           ${calculatorReadingHtml || `<p><strong>Reading for:</strong> ${escapeHtml(calculatorEmailData?.name)}<br><strong>Birth Date:</strong> ${escapeHtml(calculatorEmailData?.birthDate)}<br><strong>Life Path:</strong> ${escapeHtml(calculatorEmailData?.lifePath)}<br><strong>Expression:</strong> ${escapeHtml(calculatorEmailData?.expression)}<br><strong>Life Calling:</strong> ${escapeHtml(calculatorEmailData?.lifeCalling)}</p>`}
           ${buildCalculatorEmailCtaHtml()}
           <p>— Kytholek</p>`
        : `<p>Thanks for connecting. Your free Life Path intro is on its way.</p><p>— Kytholek</p>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    formatResendFrom(env.FROM_EMAIL),
          to:      [email],
          subject,
          html,
        }),
      });
    } catch (err) {
      console.error('submit-email error:', err);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}


// ════════════════════════════════════════════════════════════
//  CHECKOUT SESSION — GET /api/checkout-session
// ════════════════════════════════════════════════════════════

async function handleGetCheckoutSession(request, env, origin) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'session_id required' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  const stripeKey = env.STRIPE_SECRET || env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: session.error?.message || 'Session not found' }), {
        status: stripeRes.status === 404 ? 404 : 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      session_id: session.id,
      email:      session.customer_email || session.customer_details?.email || session.metadata?.email || '',
      product:    session.metadata?.product || 'guidebook',
      amount_total: session.amount_total || 0,
      currency:     String(session.currency || 'usd').toUpperCase(),
    }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('checkout-session error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
}


// ════════════════════════════════════════════════════════════
//  SITE CONFIG — GET /api/site-config
// ════════════════════════════════════════════════════════════

function handleSiteConfig(request, env, origin) {
  const placeId = env.GOOGLE_PLACE_ID || '';
  return new Response(JSON.stringify({
    ga4MeasurementId: env.GA4_MEASUREMENT_ID || '',
    googlePlaceId:   placeId,
    googleReviewUrl: getGoogleReviewUrl(env),
    googleMapsUrl:   env.GOOGLE_MAPS_URL || (placeId
      ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`
      : ''),
  }), {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type':  'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
//  META CONVERSIONS API — POST /api/meta-capi
// ═══════════════════════════════════════════════════════════════════════════════

async function sha256Hex(value) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  String(cookieHeader || '').split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index === -1) return;
    cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  });
  return cookies;
}

async function handleMetaCapi(request, env, origin) {
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  const accessToken = env.META_CAPI_ACCESS_TOKEN || env.META_ACCESS_TOKEN || '';
  const pixelId = env.META_PIXEL_ID || '3127826867426600';

  if (!accessToken) {
    return new Response(JSON.stringify({ skipped: true, reason: 'META_CAPI_ACCESS_TOKEN not configured' }), {
      status: 200,
      headers,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const eventName = String(body.event_name || 'Purchase');
  const eventId = String(body.event_id || '').trim();
  if (!eventId) {
    return new Response(JSON.stringify({ error: 'event_id required' }), { status: 400, headers });
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const userData = {
    client_ip_address: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '',
    client_user_agent: request.headers.get('user-agent') || '',
    fbp: cookies._fbp || '',
    fbc: cookies._fbc || '',
  };

  const email = String(body.email || '').trim().toLowerCase();
  if (isValidEmail(email)) {
    userData.em = await sha256Hex(email);
  }

  Object.keys(userData).forEach(key => {
    if (!userData[key]) delete userData[key];
  });

  const customData = {
    currency: String(body.currency || 'USD').toUpperCase(),
    value: Number(body.value || 0),
    content_name: String(body.product || 'guidebook'),
    content_type: 'product',
    contents: [{
      id: String(body.product || 'guidebook'),
      quantity: 1,
      item_price: Number(body.value || 0),
    }],
  };

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: String(body.event_source_url || request.url),
      user_data: userData,
      custom_data: customData,
    }],
  };

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await metaRes.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: metaRes.ok ? 200 : 502,
      headers,
    });
  } catch (err) {
    console.error('meta-capi error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}


// ════════════════════════════════════════════════════════════
//  GOOGLE REVIEWS — GET /api/google-reviews
// ════════════════════════════════════════════════════════════

async function handleGoogleReviews(request, env, origin) {
  const jsonHeaders = {
    ...corsHeaders(origin),
    'Content-Type':  'application/json',
    'Cache-Control': 'public, max-age=86400',
  };

  const placeId = env.GOOGLE_PLACE_ID;
  const apiKey  = env.GOOGLE_PLACES_API_KEY;

  if (!placeId || !apiKey) {
    return new Response(JSON.stringify({ configured: false }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const now = Date.now();
  if (googleReviewsCache.data && googleReviewsCache.expires > now) {
    return new Response(JSON.stringify(googleReviewsCache.data), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  try {
    const fields = 'rating,user_ratings_total,reviews,url';
    const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${encodeURIComponent(apiKey)}`;
    const apiRes = await fetch(apiUrl);
    const data   = await apiRes.json();

    if (data.status !== 'OK' || !data.result) {
      console.error('Places API error:', data.status, data.error_message);
      return new Response(JSON.stringify({
        configured: true,
        error:      data.error_message || data.status || 'Places API error',
      }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const result = data.result;
    const payload = {
      configured:  true,
      rating:      result.rating || 0,
      total:       result.user_ratings_total || 0,
      reviewUrl:   getGoogleReviewUrl(env),
      mapsUrl:     result.url || env.GOOGLE_MAPS_URL || '',
      attribution: 'Reviews from Google',
      reviews:     (result.reviews || []).slice(0, 3).map(review => ({
        author:          review.author_name,
        rating:          review.rating,
        text:            review.text,
        relativeTime:    review.relative_time_description,
        profilePhotoUrl: review.profile_photo_url || '',
      })),
    };

    googleReviewsCache = { data: payload, expires: now + 24 * 60 * 60 * 1000 };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error('google-reviews error:', err);
    return new Response(JSON.stringify({ configured: true, error: err.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}

// ════════════════════════════════════════════════════════════
//  SCL PREMIUM BILLING (subscription checkout / cancel / sync)
//  Appended into worker.js — keep as reference fragment if needed.
// ════════════════════════════════════════════════════════════

async function verifyFirebaseIdToken(idToken, env) {
  const apiKey = env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY not configured');
  if (!idToken) throw new Error('idToken required');

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Invalid Firebase token');
  }
  const user = data.users && data.users[0];
  if (!user?.localId) throw new Error('Invalid Firebase token');
  return { uid: user.localId, email: user.email || '' };
}

function stripeAuthHeaders(stripeKey) {
  return {
    Authorization: `Bearer ${stripeKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

async function stripeGet(path, stripeKey) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  const data = await res.json();
  return { res, data };
}

async function stripePost(path, stripeKey, params) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: stripeAuthHeaders(stripeKey),
    body: params.toString(),
  });
  const data = await res.json();
  return { res, data };
}

function resolveSclPriceId(productId, env) {
  const envKey = SCL_PRODUCT_PRICE_ENV[productId];
  if (!envKey) return null;
  return env[envKey] || null;
}

async function handleSclCheckout(request, env, origin) {
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { productId, idToken, successUrl, cancelUrl } = body || {};
  if (!productId || !idToken || !successUrl || !cancelUrl) {
    return new Response(JSON.stringify({ error: 'productId, idToken, successUrl, and cancelUrl required' }), {
      status: 400,
      headers,
    });
  }

  const priceId = resolveSclPriceId(productId, env);
  if (!priceId) {
    return new Response(JSON.stringify({
      error: `Stripe price not configured for ${productId}. Set ${SCL_PRODUCT_PRICE_ENV[productId] || 'price env'}.`,
    }), { status: 500, headers });
  }

  const stripeKey = env.STRIPE_SECRET || env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured' }), { status: 500, headers });
  }

  let uid;
  let email;
  try {
    ({ uid, email } = await verifyFirebaseIdToken(idToken, env));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 401, headers });
  }

  try {
    const params = new URLSearchParams({
      mode: 'subscription',
      'payment_method_types[0]': 'card',
      client_reference_id: uid,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'metadata[source]': 'scl',
      'metadata[product]': productId,
      'metadata[firebaseUid]': uid,
      'subscription_data[metadata][source]': 'scl',
      'subscription_data[metadata][product]': productId,
      'subscription_data[metadata][firebaseUid]': uid,
    });
    if (email) params.set('customer_email', email);

    const { res, data } = await stripePost('/checkout/sessions', stripeKey, params);
    if (!res.ok) {
      console.error('SCL checkout error:', data.error?.message);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({ url: data.url, sessionId: data.id }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('SCL checkout exception:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

async function handleSclSession(request, env, origin) {
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers });
  }

  const stripeKey = env.STRIPE_SECRET || env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured' }), { status: 500, headers });
  }

  try {
    const { res, data: session } = await stripeGet(
      `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
      stripeKey
    );
    if (!res.ok) {
      return new Response(JSON.stringify({ error: session.error?.message || 'Session not found' }), {
        status: res.status === 404 ? 404 : 500,
        headers,
      });
    }

    if (session.metadata?.source !== 'scl' && !String(session.metadata?.product || '').startsWith('premium_')) {
      return new Response(JSON.stringify({ error: 'Not an SCL checkout session' }), { status: 400, headers });
    }

    let subscription = session.subscription;
    if (typeof subscription === 'string') {
      const subRes = await stripeGet(`/subscriptions/${encodeURIComponent(subscription)}`, stripeKey);
      subscription = subRes.data;
    }

    return new Response(JSON.stringify({
      sessionId: session.id,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
      subscriptionId: typeof subscription === 'string'
        ? subscription
        : (subscription?.id || (typeof session.subscription === 'string' ? session.subscription : null)),
      productId: session.metadata?.product || null,
      status: subscription?.status || session.status || null,
      cancelAtPeriodEnd: !!subscription?.cancel_at_period_end,
      currentPeriodEnd: subscription?.current_period_end || null,
    }), { status: 200, headers });
  } catch (err) {
    console.error('SCL session error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

async function handleSclSubscription(request, env, origin) {
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get('subscription_id');
  const idToken = url.searchParams.get('idToken');
  if (!subscriptionId || !idToken) {
    return new Response(JSON.stringify({ error: 'subscription_id and idToken required' }), {
      status: 400,
      headers,
    });
  }

  const stripeKey = env.STRIPE_SECRET || env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured' }), { status: 500, headers });
  }

  let uid;
  try {
    ({ uid } = await verifyFirebaseIdToken(idToken, env));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 401, headers });
  }

  try {
    const { res, data: sub } = await stripeGet(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      stripeKey
    );
    if (!res.ok) {
      return new Response(JSON.stringify({ error: sub.error?.message || 'Subscription not found' }), {
        status: res.status === 404 ? 404 : 500,
        headers,
      });
    }

    if (sub.metadata?.firebaseUid && sub.metadata.firebaseUid !== uid) {
      return new Response(JSON.stringify({ error: 'Subscription does not belong to this user' }), {
        status: 403,
        headers,
      });
    }

    return new Response(JSON.stringify({
      subscriptionId: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      currentPeriodEnd: sub.current_period_end || null,
      productId: sub.metadata?.product || null,
    }), { status: 200, headers });
  } catch (err) {
    console.error('SCL subscription error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

async function handleSclCancel(request, env, origin) {
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { subscriptionId, idToken } = body || {};
  if (!subscriptionId || !idToken) {
    return new Response(JSON.stringify({ error: 'subscriptionId and idToken required' }), {
      status: 400,
      headers,
    });
  }

  const stripeKey = env.STRIPE_SECRET || env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured' }), { status: 500, headers });
  }

  let uid;
  try {
    ({ uid } = await verifyFirebaseIdToken(idToken, env));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 401, headers });
  }

  try {
    const { res: getRes, data: sub } = await stripeGet(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      stripeKey
    );
    if (!getRes.ok) {
      return new Response(JSON.stringify({ error: sub.error?.message || 'Subscription not found' }), {
        status: getRes.status === 404 ? 404 : 500,
        headers,
      });
    }

    if (sub.metadata?.firebaseUid && sub.metadata.firebaseUid !== uid) {
      return new Response(JSON.stringify({ error: 'Subscription does not belong to this user' }), {
        status: 403,
        headers,
      });
    }

    if (sub.cancel_at_period_end) {
      return new Response(JSON.stringify({
        subscriptionId: sub.id,
        status: sub.status,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: sub.current_period_end || null,
      }), { status: 200, headers });
    }

    const params = new URLSearchParams({ cancel_at_period_end: 'true' });
    const { res, data } = await stripePost(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      stripeKey,
      params
    );
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Cancel failed' }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({
      subscriptionId: data.id,
      status: data.status,
      cancelAtPeriodEnd: !!data.cancel_at_period_end,
      currentPeriodEnd: data.current_period_end || null,
    }), { status: 200, headers });
  } catch (err) {
    console.error('SCL cancel error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
