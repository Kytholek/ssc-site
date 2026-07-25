/**
 * Time Cycle product — Claude generation, PDF HTML, and email helpers.
 * Dispatched from netlify/functions/worker.js when product === 'time-cycle'.
 */

import { calcTimeCycles } from './time-cycles.mjs';

const TIME_CYCLE_SYSTEM = `You are Kytholek, author of Simulation Source Code. You write TIME CYCLE readings — clear, precise guidance for a person's current spiral timing.

VOICE — CLARITY FIRST:
Write in plain, complete sentences. Explain one idea at a time. Prefer "this year asks you to start three things carefully" over stacked jargon ("initiation charge / open gate / stacked spark").
Do NOT cram keywords, stage titles, and themes into the same sentence.
Banned patterns: "serve the stack", "frequency charge", "echoing across timescales", "Evolution stage X — Title." as filler, and lists of synonyms for the same idea.
Name a number once, say what it means in ordinary language, then give the action.

NUMBER MEANING (Evolution of Energy, worded for time):
1 start · 2 gather/wait · 3 speak/create · 4 build/structure · 5 change/move · 6 care/commit · 7 study/go inward · 8 achieve/own · 9 finish/release.
Use the supplied summaries as background. Translate into what this person should do in this window. Never paste the seed text verbatim.

SHADOW:
Each number has a constructive use and a shadow (unconstructed version). Challenges must name the shadow in plain language with a real-life example.

ALIGNMENTS:
When the same number appears in more than one layer, say so simply: "Your personal year and personal month are both 1 — this stretch is a double start." Repeat that fact where it matters; do not invent mystical language around it.

BULLET CONTRACTS:
- Maximize: ≥3 <li>. Start each with Work:, Relationships:, or Practice:. One concrete action per bullet (who/what/when when possible).
- Challenges: ≥2 <li>. Specific trap + what it looks like in daily life.
- No placeholders like "act in line with this theme."

CYCLE SECTION RECIPE:
1) What it Means — 3–5 clear sentences for this timescale only.
2) If aligned — one plain sentence naming the repeat.
3) If handoff data exists — one sentence: you left X, you are in Y, next is Z.
4) Maximize (≥3).
5) Challenges (≥2).`

function seedLine(label, root, meaning) {
  const evo = meaning.evolution
    ? ` Evolution: ${meaning.evolution.stage} — ${meaning.evolution.title}. ${meaning.evolution.summary}`
    : '';
  const shadow = meaning.shadow ? ` Shadow: ${meaning.shadow}` : '';
  return `- ${label}: ${root} — ${meaning.theme}. ${meaning.summary}${evo}${shadow}`;
}

function formatAlignments(alignments) {
  if (!alignments || !alignments.length) {
    return 'None. Still write Season Stack as how pinnacle, epoch, and year work together. Do not invent false alignments.';
  }
  return alignments.map((a) => {
    const layers = a.layers.map((l) => l.label).join(' and ');
    return `- Number ${a.number} repeats in: ${layers}
  Plain meaning: ${a.evolution.summary}
  REQUIRED: Say this clearly in Opening and Season Stack. In the 90-day plan, each month must advance this repeated ${a.number}.`;
  }).join('\n');
}

function formatPlanMonths(planMonths) {
  if (!planMonths || !planMonths.length) return 'n/a';
  return planMonths.map((pm, i) => {
    const tag = i === 0 ? 'CURRENT' : i === 1 ? 'MONTH +1' : 'MONTH +2';
    return `- [${tag}] ${pm.heading}
    Theme: ${pm.meaning.theme}. ${pm.meaning.summary}
    Meaning for time: ${pm.evolution.stage} — ${pm.evolution.summary}
    Shadow: ${pm.meaning.shadow || 'n/a'}`;
  }).join('\n');
}

export function buildTimeCyclePrompt(userData, cycles) {
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const name = userData.fullName || userData.name || 'Seeker';
  const firstName = name.split(' ')[0];
  const dob = `${months[userData.birthMonth]} ${userData.birthDay}, ${userData.birthYear}`;
  const s = cycles.meaningSeeds;
  const cp = cycles.currentPinnacle;
  const alignments = cycles.alignments || [];
  const adj = cycles.adjacent || {};
  const anchor = cycles.anchor || {};

  const pinnacleMap = s.pinnacles.map(p =>
    `  P${p.index}: ${p.root} (${p.startAge}–${p.endAge === null ? 'onward' : p.endAge})${p.isCurrent ? ' ← CURRENT' : ''}
    Theme: ${p.meaning.theme}. ${p.meaning.summary}
    Evolution: ${p.evolution.stage} — ${p.evolution.title}. ${p.evolution.summary}
    Shadow: ${p.meaning.shadow || 'n/a'}`
  ).join('\n');

  const prevM = adj.personalMonth?.previous;
  const nextM = adj.personalMonth?.next;
  const prevF = adj.fourMonth?.previous;
  const nextF = adj.fourMonth?.next;
  const planMonths = cycles.planMonths || [];
  const planMonthHeadings = planMonths.map((pm) => pm.heading);

  return `Write a COMPLETE TIME CYCLE READING for the following person.

PERSONAL DATA:
- Full birth name: ${name}
- Date of birth: ${dob}
- Current age (as of ${cycles.asOf}): ${cycles.age}
- Life Path: ${cycles.lifePathCompound}/${cycles.lifePathRoot} (mention once in Opening: this season's timing serves that path)
- Days into personal year: ~${anchor.daysSinceBd ?? '?'} (last birthday ${anchor.lastBirthday || 'n/a'}; personal month ${anchor.monthNum ?? cycles.personalMonth.monthNum} of 12)

ALIGNMENTS (repeating numbers — say plainly):
${formatAlignments(alignments)}

COMPUTED CYCLES (do not alter these numbers):
${seedLine('Current Pinnacle', cp.root, s.currentPinnacle)}
  Ages ${cp.startAge}–${cp.endAge === null ? 'onward' : cp.endAge}
Pinnacle map:
${pinnacleMap}
${seedLine('9-Year Epoch', `Cycle ${cycles.n9.index}`, s.n9)}
  Age band ${cycles.n9.ageBandStart}–${cycles.n9.ageBandEnd}; ~${cycles.n9.yearsRemainingInBand} years remaining
${seedLine('Personal Year', cycles.personalYear.root, s.personalYear)}
  Cycle start year: ${cycles.personalYear.cycleStartYear}
${seedLine('4-Month Window', cycles.fourMonth.root, s.fourMonth)}
  Window ${cycles.fourMonth.cycleNum} of 3 · ${cycles.fourMonth.startMonthName}–${cycles.fourMonth.endMonthName}
  Handoff: left ${prevF ? `${prevF.root} (${prevF.startMonthName}–${prevF.endMonthName})` : 'n/a'} → now ${cycles.fourMonth.root} → next ${nextF ? `${nextF.root} (${nextF.startMonthName}–${nextF.endMonthName})` : 'n/a'}
${seedLine('Personal Month', cycles.personalMonth.root, s.personalMonth)}
  Month ${cycles.personalMonth.monthNum} of the personal year
  Handoff: left ${prevM ? prevM.root : 'n/a'} → now ${cycles.personalMonth.root} → next ${nextM ? nextM.root : 'n/a'}

90-DAY MONTH SEQUENCE (use these exact dates and numbers — do not invent different months):
${formatPlanMonths(planMonths)}

STRUCTURE — write ALL sections in EXACTLY this order:

1. Opening — address ${firstName}. 4–6 clear sentences. Where they are (pinnacle + year). Life Path ${cycles.lifePathCompound}/${cycles.lifePathRoot} once. If a number repeats, say which layers share it in plain English.

2. <h2 id="season-stack">Season Stack</h2>
   One coherent explanation (2–4 short paragraphs) of how Pinnacle ${cp.root}, 9-Year Cycle ${cycles.n9.index}, and Personal Year ${cycles.personalYear.root} work together right now. Then one bold season objective sentence ${firstName} can follow. No keyword lists.

3. <h2 id="current-pinnacle">Current Pinnacle — ${cp.root}</h2>
   <h3>What ${cp.root} Means in This Chapter</h3>
   <h3>Maximize This Chapter</h3>
   <h3>Challenges to Watch</h3>

4. <h2 id="pinnacle-map">Your Pinnacle Map</h2>
   For each of the four pinnacles: ages, what that chapter is for (2 sentences), and the main trap. Mark the current one.

5. <h2 id="nine-year">9-Year Epoch — Cycle ${cycles.n9.index}</h2>
   <h3>What Cycle ${cycles.n9.index} Means in This Epoch</h3>
   <h3>Maximize This Epoch</h3>
   <h3>Challenges to Watch</h3>

6. <h2 id="personal-year">Personal Year — ${cycles.personalYear.root}</h2>
   <h3>What ${cycles.personalYear.root} Means This Year</h3>
   <h3>Maximize This Year</h3>
   <h3>Challenges to Watch</h3>

7. <h2 id="four-month">4-Month Window — ${cycles.fourMonth.root}</h2>
   Name ${cycles.fourMonth.startMonthName}–${cycles.fourMonth.endMonthName} and the handoff.
   <h3>What ${cycles.fourMonth.root} Means in This Window</h3>
   <h3>Maximize This Window</h3>
   <h3>Challenges to Watch</h3>

8. <h2 id="personal-month">Personal Month — ${cycles.personalMonth.root}</h2>
   Include handoff.
   <h3>What ${cycles.personalMonth.root} Means This Month</h3>
   <h3>Maximize This Month</h3>
   <h3>Challenges to Watch</h3>

9. <h2 id="operating-plan">90-Day Operating Plan</h2>
   THIS IS THE MOST IMPORTANT SECTION. Go MONTH BY MONTH using the 90-DAY MONTH SEQUENCE above.
   Write exactly three month subsections with these h3 titles (copy dates/numbers exactly):
${planMonthHeadings.map((h, i) => `   <h3>${h}</h3>${i === 0 ? ' — current month' : ''}`).join('\n')}
   For EACH month include, in order:
   - One short paragraph (2–4 sentences): what this personal-month number asks for, and how it connects to Pinnacle ${cp.root} and Year ${cycles.personalYear.root}.
   - <p><strong>Focus:</strong> …</p> — one line primary focus for that month.
   - <p><strong>Do this:</strong></p> then a <ul> with exactly 4 concrete actions (specific enough to calendar).
   - <p><strong>Watch for:</strong> …</p> — one shadow trap for that month's number.
   - <p><strong>Done looks like:</strong> …</p> — one measurable finish-line for the month.
   After the three months, add:
   <h3>Weekly Rhythm</h3>
   One recurring weekly practice (bullet list of 3–5 check steps) that ties the three months together.
   If a number repeats across year/month, the first month of the plan must open that theme; later months must continue or stabilize it — not restart randomly.

10. <h2 id="quest-directive">Quest Directive</h2>
    Two short paragraphs max: (1) the single aim for the next 90 days, (2) the one habit or excuse to refuse. Do not restate the whole plan.

FORMAT: HTML only — <h2>, <h3>, <p>, <ul><li>. No markdown. No preamble. Start with the Opening.
IMPORTANT: Include the exact id attributes on h2 tags as shown. Use the exact h3 titles for the three plan months.
LENGTH: 2400–3000 words. The 90-Day Operating Plan alone should be substantial (roughly 700–1000 words). Complete all 10 sections.
DEPTH: Clear explanations + precise actions. Precision beats poetry.`;
}

export async function generateTimeCycleReading(userData, cycles, env) {
  const prompt = buildTimeCyclePrompt(userData, cycles);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      stream: true,
      system: TIME_CYCLE_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let buffer = '';
  let stopReason = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const evt = JSON.parse(data);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          text += evt.delta.text;
        }
        if (evt.type === 'message_delta' && evt.delta?.stop_reason) {
          stopReason = evt.delta.stop_reason;
        }
      } catch (_) { /* ignore partial JSON */ }
    }
  }

  if (stopReason && stopReason !== 'end_turn' && stopReason !== 'stop_sequence') {
    console.error(`Time Cycle generation stopped early (stop_reason=${stopReason})`);
  }
  if (!text) throw new Error('No content returned from Anthropic (time-cycle)');

  return text;
}

export function buildTimeCyclePdfHtml({ name, cycles, readingBody }) {
  const firstName = (name || 'Seeker').split(' ')[0];
  const cp = cycles.currentPinnacle;
  const py = cycles.personalYear;
  const fm = cycles.fourMonth;
  const pm = cycles.personalMonth;
  const alignments = cycles.alignments || [];

  const body = String(readingBody || '')
    .replace(/```html/gi, '')
    .replace(/```/g, '')
    .trim();

  const alignHtml = alignments.length
    ? alignments.map((a) => {
        const layers = a.layers.map((l) => l.label).join(' · ');
        return `<div class="align-box"><div class="label">Aligned · ${a.number} · ${a.evolution.stage}</div><p><strong>${a.number}</strong> repeats across ${layers}. ${a.evolution.title}: this frequency is stacked — reinforce it in every layer below.</p></div>`;
      }).join('')
    : '';

  const toc = `<nav class="toc" aria-label="Report contents">
    <div class="toc-label">Contents</div>
    <ol>
      <li><a href="#season-stack">Season Stack</a></li>
      <li><a href="#current-pinnacle">Current Pinnacle — ${cp.root}</a></li>
      <li><a href="#pinnacle-map">Pinnacle Map</a></li>
      <li><a href="#nine-year">9-Year Epoch — ${cycles.n9.index}</a></li>
      <li><a href="#personal-year">Personal Year — ${py.root}</a></li>
      <li><a href="#four-month">4-Month Window — ${fm.root}</a></li>
      <li><a href="#personal-month">Personal Month — ${pm.root}</a></li>
      <li><a href="#operating-plan">90-Day Plan (month by month)</a></li>
      <li><a href="#quest-directive">Quest Directive</a></li>
    </ol>
  </nav>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Cormorant+SC:wght@300;400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05040a;color:#e8dfc8;font-family:"EB Garamond",Georgia,serif;font-size:16px;line-height:1.75}
.page{width:100%;min-height:297mm;padding:56px 64px 72px;page-break-after:always;position:relative;background:#05040a}
.page:last-child{page-break-after:auto}
.eyebrow{font-family:Cinzel,serif;font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:#4a9494;margin-bottom:10px}
.title{font-family:"Cormorant SC",serif;font-weight:300;font-size:36px;color:#e8c96b;letter-spacing:.04em;margin-bottom:8px}
.sub{font-size:17px;color:#9b9080;margin-bottom:28px}
.divider{height:1px;background:linear-gradient(90deg,rgba(74,148,148,.45),transparent);margin:0 0 28px}
.strip{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px}
.badge{display:inline-block;background:rgba(74,148,148,.12);border:1px solid rgba(126,200,200,.28);border-radius:4px;padding:6px 12px;font-family:Cinzel,serif;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#7ec8c8}
.badge strong{color:#e8c96b;font-weight:600}
.align-box{margin:0 0 20px;padding:14px 16px;border-left:2px solid rgba(232,201,107,.55);background:rgba(232,201,107,.06)}
.align-box .label{font-family:Cinzel,serif;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#e8c96b;margin-bottom:6px}
.align-box p{font-size:15px;color:#cbbfaa;margin:0;line-height:1.55}
.toc{margin:0 0 28px;padding:16px 18px;border:1px solid rgba(126,200,200,.18);background:rgba(74,148,148,.06)}
.toc-label{font-family:Cinzel,serif;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#7ec8c8;margin-bottom:10px}
.toc ol{margin:0;padding-left:18px;color:#cbbfaa}
.toc li{margin-bottom:4px;font-size:14px}
.toc a{color:#e8c96b;text-decoration:none}
.content h2{font-family:"Cormorant SC",serif;font-weight:300;font-size:26px;color:#e8c96b;margin:36px 0 14px;letter-spacing:.03em;page-break-after:avoid;page-break-before:always}
.content h2:first-of-type{page-break-before:auto}
.content h3{font-family:Cinzel,serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7ec8c8;margin:22px 0 10px;page-break-after:avoid}
.content p{margin:0 0 14px;color:#cbbfaa}
.content ul{margin:0 0 16px 18px;color:#cbbfaa}
.content li{margin-bottom:6px}
.footer{position:absolute;bottom:28px;left:64px;right:64px;display:flex;justify-content:space-between;border-top:1px solid rgba(201,168,76,.08);padding-top:10px;font-family:Cinzel,serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}
@media print{body{background:#05040a!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.content h2{page-break-before:always}.content h2:first-of-type{page-break-before:auto}}
</style>
</head>
<body>
<div class="page">
  <div class="eyebrow">Simulation Source Code</div>
  <div class="title">Time Cycle</div>
  <div class="sub">${firstName} — your spiral timing map for this season</div>
  <div class="divider"></div>
  <div class="strip">
    <span class="badge">Age <strong>${cycles.age}</strong></span>
    <span class="badge">Life Path <strong>${cycles.lifePathCompound}/${cycles.lifePathRoot}</strong></span>
    <span class="badge">Pinnacle <strong>${cp.root}</strong></span>
    <span class="badge">9-Year <strong>${cycles.n9.index}</strong></span>
    <span class="badge">Year <strong>${py.root}</strong></span>
    <span class="badge">4-Mo <strong>${fm.root}</strong> · ${fm.startMonthName}–${fm.endMonthName}</span>
    <span class="badge">Month <strong>${pm.root}</strong></span>
  </div>
  ${alignHtml}
  ${toc}
  <div class="content">${body}</div>
  <div class="footer"><span>Time Cycle Report</span><span>simulationsourcecode.com</span></div>
</div>
</body>
</html>`;
}

export function buildTimeCycleEmailHtml(name, email, cycles, env = {}) {
  const firstName = (name || 'Seeker').split(' ')[0];
  const reviewUrl = env.GOOGLE_REVIEW_URL
    || 'https://g.page/r/CX_placeholder/review';
  const cp = cycles.currentPinnacle.root;
  const py = cycles.personalYear.root;
  const fm = cycles.fourMonth.root;
  const pm = cycles.personalMonth.root;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#05040a;font-family:Georgia,serif;color:#e8dfc8">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#05040a"><tr><td align="center" style="padding:40px 16px">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <div style="text-align:center;font-size:28px;color:#c9a84c;margin-bottom:16px">&#10022;</div>
  <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:#4a9494;text-align:center;margin-bottom:10px">Simulation Source Code</div>
  <div style="font-size:26px;color:#e8c96b;text-align:center;margin-bottom:8px">Your Time Cycle is Ready</div>
  <div style="font-size:15px;color:#9b9080;text-align:center;margin-bottom:28px">${firstName} — your spiral timing PDF is attached</div>
  <p style="font-size:16px;line-height:1.8;color:#9b9080;margin-bottom:20px">Your <strong style="color:#e8dfc8">Time Cycle Report</strong> maps your current pinnacle, 9-year epoch, personal year, 4-month window, and personal month — with concrete actions to maximize each period and challenges to watch.</p>
  <div style="text-align:center;margin:24px 0">
    <span style="display:inline-block;margin:3px;padding:4px 10px;border:1px solid rgba(126,200,200,.25);border-radius:4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7ec8c8">Pinnacle · ${cp}</span>
    <span style="display:inline-block;margin:3px;padding:4px 10px;border:1px solid rgba(126,200,200,.25);border-radius:4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7ec8c8">9-Year · ${cycles.n9.index}</span>
    <span style="display:inline-block;margin:3px;padding:4px 10px;border:1px solid rgba(126,200,200,.25);border-radius:4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7ec8c8">Year · ${py}</span>
    <span style="display:inline-block;margin:3px;padding:4px 10px;border:1px solid rgba(126,200,200,.25);border-radius:4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7ec8c8">4-Mo · ${fm}</span>
    <span style="display:inline-block;margin:3px;padding:4px 10px;border:1px solid rgba(126,200,200,.25);border-radius:4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7ec8c8">Month · ${pm}</span>
  </div>
  <p style="font-size:16px;line-height:1.8;color:#9b9080;margin-bottom:20px">Found this helpful? <a href="${reviewUrl}" style="color:#e8c96b">Leave a review on Google</a>.</p>
  <div style="font-family:Arial,sans-serif;font-size:10px;color:#5c5448;text-align:center;letter-spacing:.12em;text-transform:uppercase;line-height:1.8;margin-top:28px">Simulation Source Code · <a href="https://simulationsourcecode.com" style="color:#7a6330;text-decoration:none">simulationsourcecode.com</a><br>Generated for ${email}</div>
</div>
</td></tr></table>
</body></html>`;
}

/**
 * Full Time Cycle pipeline after queue dequeue.
 * @param {object} userData
 * @param {object} env
 * @param {{ convertToPDF: Function, arrayBufferToBase64: Function, formatResendFrom: Function, formatResendReplyTo: Function, getGoogleReviewUrl?: Function }} deps
 */
export async function processTimeCycleReading(userData, env, deps) {
  const name = userData.fullName || userData.name || 'Seeker';
  console.log(`[time-cycle 1/4] Computing cycles for ${userData.email}`);

  const cycles = calcTimeCycles({
    month: userData.birthMonth,
    day: userData.birthDay,
    year: userData.birthYear,
  });
  console.log('[time-cycle 1/4] Cycles:', JSON.stringify({
    age: cycles.age,
    pinnacle: cycles.currentPinnacle.root,
    n9: cycles.n9.index,
    year: cycles.personalYear.root,
    fourMonth: cycles.fourMonth.root,
    month: cycles.personalMonth.root,
  }));

  console.log('[time-cycle 2/4] Calling Anthropic…');
  const readingBody = await generateTimeCycleReading(userData, cycles, env);
  console.log('[time-cycle 2/4] Reading length:', readingBody.length);

  const pdfHtml = buildTimeCyclePdfHtml({ name, cycles, readingBody });

  console.log('[time-cycle 3/4] Calling PDFShift…');
  const pdfBuffer = await deps.convertToPDF(pdfHtml, env);
  console.log('[time-cycle 3/4] PDF size:', pdfBuffer.byteLength);

  const pdfBase64 = deps.arrayBufferToBase64(pdfBuffer);
  const reviewEnv = {
    GOOGLE_REVIEW_URL: deps.getGoogleReviewUrl ? deps.getGoogleReviewUrl(env) : undefined,
  };

  console.log('[time-cycle 4/4] Sending email via Resend…');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: deps.formatResendFrom(env.FROM_EMAIL),
      to: [userData.email],
      reply_to: deps.formatResendReplyTo(env.REPLY_TO_EMAIL, env.FROM_EMAIL),
      subject: `\u2746 Your Time Cycle \u2014 ${name.split(' ')[0]}`,
      html: buildTimeCycleEmailHtml(name, userData.email, cycles, reviewEnv),
      attachments: [{
        filename: `SSC-Time-Cycle-${name.replace(/\s+/g, '-')}.pdf`,
        content: pdfBase64,
        content_type: 'application/pdf',
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend error ${response.status}: ${err}`);
  }

  console.log(`[time-cycle 4/4] Email sent to ${userData.email}`);
  return await response.json();
}
