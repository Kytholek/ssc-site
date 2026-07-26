/**
 * Build chat knowledge index from blog markdown + site core facts.
 * Output: js/chat-knowledge.mjs (imported by Worker chat route)
 *
 * Usage: node scripts/build-chat-knowledge.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const OUT_FILE = path.join(ROOT, 'js', 'chat-knowledge.mjs');

const SKIP_FILES = new Set(['README.md', 'sample-new-post.md', 'posts.json']);
const CHUNK_TARGET = 1100;
const CHUNK_MAX = 1400;

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, '');
  const meta = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[m[1]] = val;
  }
  return { meta, body };
}

function stripMarkdown(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text, target = CHUNK_TARGET, max = CHUNK_MAX) {
  const clean = stripMarkdown(text);
  if (!clean) return [];
  if (clean.length <= max) return [clean];

  const paras = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';

  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = '';
  };

  for (const para of paras) {
    if (para.length > max) {
      flush();
      for (let i = 0; i < para.length; i += target) {
        chunks.push(para.slice(i, i + max).trim());
      }
      continue;
    }
    if (!buf) {
      buf = para;
      continue;
    }
    if (buf.length + 2 + para.length <= max) {
      buf += '\n\n' + para;
    } else {
      flush();
      buf = para;
    }
  }
  flush();
  return chunks;
}

function buildCoreChunks() {
  return [
    {
      id: 'core-site',
      title: 'Simulation Source Code — Site Overview',
      url: 'https://simulationsourcecode.com/',
      core: true,
      text: [
        'Simulation Source Code (SSC) is a numerology framework that decodes seven frequencies from birth date and full birth name:',
        'Life Path, Expression, Life Calling, Soul Urge (Soul), Outer Persona, Achievement, and Theme.',
        'The Codex is a 3×3 consciousness matrix (Mind/Body/Spirit × Witness/Actor/Sage) mapping frequencies 1–9.',
        'Free tool: Numerology Calculator at /calculator/ — enter birth date and full birth name for a free blueprint snapshot.',
        'Blog: deep dives on Life Path, Expression, Soul Urge, and system articles at /blog/.',
        'About: created by Kytholek — https://simulationsourcecode.com/about/',
      ].join(' '),
    },
    {
      id: 'core-services',
      title: 'Services & Products',
      url: 'https://simulationsourcecode.com/services/',
      core: true,
      text: [
        'Guidebook Report — $22 USD one-time. Instant PDF decoding all seven frequencies, repeating patterns, Life Calling, and a personal map. Sample at /sample-guidebook.html. Delivered to email within minutes. Digital product; sales final; contact for delivery issues.',
        'Time Cycle — $17 USD one-time. Instant PDF: 3-month / ~90-day forecast, month-by-month plan, current pinnacle & year timing, challenges to watch.',
        'Personal Consultation — $88 per live video session. Full 7-frequency reading live, compounds in real time, Q&A, session recording. Book via Setmore: https://ssc.setmore.com/services/7f96af84-b31f-427a-92c0-11ea42128eef',
        'Source Decoder membership — community learning (free* with some paid options): weekly group calls, member chat, deep dives. See Services page for current status.',
        'Do not invent other prices. Point visitors to /services/ for purchase and booking.',
      ].join(' '),
    },
    {
      id: 'core-faq',
      title: 'Frequently Asked Questions',
      url: 'https://simulationsourcecode.com/',
      core: true,
      text: [
        'What is a Life Path number? Calculated from full date of birth. Core theme and curriculum of life — lessons designed to learn and embody.',
        'What is numerology? Study of symbolic meaning of numbers. SSC uses the Pythagorean system for seven frequencies from birth date and full birth name.',
        'What is the Life Calling number? Fusion of Life Path and Expression — what you learn FROM the world blended with what you express INTO the world; your Life Quest.',
        'How is Expression calculated? From full birth name (Pythagorean letter values). Natural talents and authentic frequency to express.',
        'Master numbers in SSC: 11, 22, 33, 44 (and higher pairs). Not reduced; 11 operates from 2, 22 from 4, 33 from 6, 44 from 8, etc.',
      ].join(' '),
    },
    {
      id: 'core-codex',
      title: 'Codex Node Summary',
      url: 'https://simulationsourcecode.com/codex/',
      core: true,
      text: [
        '1 The Initiator — spark, self-direction, original force (Mind/Mind).',
        '2 Duality — bridge, balance, relational awareness (Mind/Body).',
        '3 Mind / expression — thought given voice (Mind/Spirit).',
        '4 Structure — discipline, foundations (Body/Mind).',
        '5 Vessel for Experience — freedom through presence (Body/Body).',
        '6 The World — integration, service, love in action (Body/Spirit).',
        '7 Knowledge — inner knowing, quest for truth (Spirit/Mind).',
        '8 Self-Empowerment — earned authority, manifestation (Spirit/Body).',
        '9 Singularity — completion, universal service (Spirit/Spirit).',
        '0 Void — pure awareness beyond the matrix.',
        'Full Codex exploration: /codex/',
      ].join(' '),
    },
  ];
}

function buildBlogChunks() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md') && !SKIP_FILES.has(f));
  const chunks = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || file.replace(/\.md$/, '');
    const title = meta.title || slug;
    const url = `https://simulationsourcecode.com/blog/${slug}/`;
    const excerpt = meta.excerpt || meta.description || '';
    const parts = chunkText(body);
    if (!parts.length && excerpt) parts.push(stripMarkdown(excerpt));

    parts.forEach((text, i) => {
      const prefix = excerpt && i === 0 ? `${stripMarkdown(excerpt)}\n\n` : '';
      chunks.push({
        id: `blog-${slug}-${i}`,
        // Keep base title only — numeric "(part N)" suffixes break frequency retrieval
        title,
        slug,
        url,
        core: false,
        text: (prefix + text).slice(0, CHUNK_MAX + 200),
      });
    });
  }
  return chunks;
}

function main() {
  const core = buildCoreChunks();
  const blog = buildBlogChunks();
  const all = [...core, ...blog];

  const payload = {
    generatedAt: new Date().toISOString(),
    coreCount: core.length,
    chunkCount: all.length,
    chunks: all,
  };

  const src = `/**
 * AUTO-GENERATED by scripts/build-chat-knowledge.js — do not edit by hand.
 * Generated: ${payload.generatedAt}
 * Chunks: ${payload.chunkCount} (${payload.coreCount} core)
 */
export const CHAT_KNOWLEDGE_META = ${JSON.stringify({
    generatedAt: payload.generatedAt,
    coreCount: payload.coreCount,
    chunkCount: payload.chunkCount,
  }, null, 2)};

export const CHAT_KNOWLEDGE_CHUNKS = ${JSON.stringify(all, null, 2)};
`;

  fs.writeFileSync(OUT_FILE, src, 'utf8');
  console.log(`Wrote ${OUT_FILE} (${all.length} chunks, ${core.length} core, ${blog.length} from blog)`);
}

main();
