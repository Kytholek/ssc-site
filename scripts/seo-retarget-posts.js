#!/usr/bin/env node
/**
 * One-shot SEO retarget: update frontmatter title/description/keywords/related
 * on high-intent markdown posts, then rebuild with build.js --force.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

const LIFE_PATH = {
  1:  { name: 'Initiator',   desc: 'Life Path 1 meaning in numerology — the Initiator. Compound story, shadow patterns, and how to work with a 1 Life Path.' },
  2:  { name: 'Bridge',      desc: 'Life Path 2 meaning in numerology — the Bridge. Connection without self-loss, 11/2 master dual vibration, and integration.' },
  3:  { name: 'Creator',     desc: 'Life Path 3 meaning in numerology — the Creator. Authentic expression, compound breakdown, shadow, and integration practice.' },
  4:  { name: 'Builder',     desc: 'Life Path 4 meaning in numerology — the Builder. Stable foundations, 22/4 master builder, compound story, and shadow work.' },
  5:  { name: 'Explorer',    desc: 'Life Path 5 meaning in numerology — the Explorer. Change, freedom, and how presence becomes true stability.' },
  6:  { name: 'Nurturer',    desc: 'Life Path 6 meaning in numerology — the Nurturer. Care without identity fusion, compound story, and shadow patterns.' },
  7:  { name: 'Seeker',      desc: 'Life Path 7 meaning in numerology — the Seeker. Truth-seeking curriculum, compound numbers, and shadow of withdrawal.' },
  8:  { name: 'Powerhouse',  desc: 'Life Path 8 meaning in numerology — the Powerhouse. Power dynamics, 44/8 master current, and self-governance first.' },
  9:  { name: 'Completor',   desc: 'Life Path 9 meaning in numerology — the Completor. Completion drive, compound story, and shadow of unfinished cycles.' },
  11: { name: 'Illuminated Bridge', desc: 'Life Path 11 meaning — master number of illuminated bridging. Dual 11/2 vibration, shadow, and integration.' },
  22: { name: 'Master Builder', desc: 'Life Path 22 meaning — the Master Builder. Civilisational-scale building, dual vibration, shadow, and integration.' },
  33: { name: 'Master Teacher', desc: 'Life Path 33 meaning — the Master Teacher. Dual 33/6 vibration, misidentification traps, shadow, and integration.' },
  44: { name: 'Master Manifestor', desc: 'Life Path 44 meaning — the Master Manifestor. Systems of power at scale, calculation notes, shadow, and integration.' },
};

const EXPRESSION = {
  1: { name: 'Independent Voice', desc: 'Expression number 1 meaning in numerology — the Independent Voice. Destiny number shadow, compounds, and embodiment.' },
  7: { name: 'Inner Truth Holder', desc: 'Expression number 7 meaning in numerology — the Inner Truth Holder. Destiny number depth, shadow, and compounds.' },
};

function setField(block, key, value) {
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  if (re.test(block)) return block.replace(re, `${key}: ${value}`);
  return block.replace(/^---\r?\n/, `---\n${key}: ${value}\n`);
}

function setRelated(block, lines) {
  // Remove existing related list (meta block only — no closing ---)
  let out = block.replace(/\nrelated:\n(?:\s+- .+\n?)*/m, '\n').replace(/\s+$/, '');
  out += `\nrelated:\n${lines.map(l => `  - ${l}`).join('\n')}`;
  return out;
}

function patchFile(file, mutator) {
  const full = path.join(CONTENT, file);
  if (!fs.existsSync(full)) {
    console.warn('skip missing', file);
    return;
  }
  const raw = fs.readFileSync(full, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    console.warn('no frontmatter', file);
    return;
  }
  let meta = m[1];
  const body = m[2];
  meta = mutator(meta);
  fs.writeFileSync(full, `---\n${meta}\n---\n${body}`, 'utf8');
  console.log('updated', file);
}

for (const [n, info] of Object.entries(LIFE_PATH)) {
  const file = `life-path-${n}-numerology.md`;
  const nums = Object.keys(LIFE_PATH).map(Number).sort((a, b) => a - b);
  const i = nums.indexOf(Number(n));
  const prev = nums[(i - 1 + nums.length) % nums.length];
  const next = nums[(i + 1) % nums.length];
  const related = [
    `/blog/life-path-number-explained/|Life Path Number Meaning Explained|Read Guide`,
    `/blog/life-path-${prev}-numerology/|Life Path ${prev} Meaning|Read Deep Dive`,
    `/blog/life-path-${next}-numerology/|Life Path ${next} Meaning|Read Deep Dive`,
    `/calculator/|Free Numerology Calculator|Calculate`,
  ];
  patchFile(file, (meta) => {
    let b = meta;
    b = setField(b, 'title', `Life Path ${n} Meaning — The ${info.name}`);
    b = setField(b, 'description', info.desc);
    b = setField(b, 'keywords', `life path ${n} meaning, life path ${n} numerology, life path number ${n}, numerology life path ${n}`);
    b = setField(b, 'breadcrumb-name', `Life Path ${n} Meaning`);
    b = setRelated(b, related);
    return b;
  });
}

for (const [n, info] of Object.entries(EXPRESSION)) {
  const file = `expression-${n}-numerology.md`;
  const related = [
    `/blog/life-path-number-explained/|Life Path Number Meaning|Read Guide`,
    `/blog/how-to-read-numerology-blueprint/|How to Read Your Blueprint|Read Guide`,
    `/calculator/|Free Numerology Calculator|Calculate`,
  ];
  patchFile(file, (meta) => {
    let b = meta;
    b = setField(b, 'title', `Expression Number ${n} Meaning — ${info.name}`);
    b = setField(b, 'description', info.desc);
    b = setField(b, 'keywords', `expression number ${n} meaning, expression ${n} numerology, destiny number ${n}, numerology expression number`);
    b = setRelated(b, related);
    return b;
  });
}

patchFile('how-to-read-numerology-blueprint.md', (meta) => {
  let b = meta;
  b = setField(b, 'title', 'How to Read a Numerology Blueprint — 7 Numbers');
  b = setField(b, 'description', 'How to read a full numerology blueprint: Life Path, Expression, Soul Urge, Life Calling, Achievement, Theme, and Outer Self — in order.');
  b = setField(b, 'keywords', 'how to read numerology blueprint, numerology reading guide, life path expression soul urge, seven frequencies');
  b = setRelated(b, [
    '/blog/life-path-number-explained/|Life Path Number Meaning Explained|Read Guide',
    '/blog/how-to-calculate-life-path-number/|How to Calculate Life Path Number|Read Guide',
    '/calculator/|Free Numerology Calculator|Calculate',
  ]);
  return b;
});

const build = spawnSync(process.execPath, [path.join(ROOT, 'build.js'), '--force'], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(build.status || 0);
