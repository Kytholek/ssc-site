#!/usr/bin/env node
/**
 * build.js — Zero-dependency Markdown-to-HTML blog post generator
 * Usage: node build.js
 * Reads:  content/*.md
 * Writes: blog/{slug}/index.html  (only if .md is newer than existing HTML)
 *         content/posts.json      (metadata index for all generated posts)
 *         blog/index.html         (injects cards between GENERATED markers)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// â”€â”€â”€ Paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROOT         = __dirname;
const CONTENT_DIR  = path.join(ROOT, 'content');
const BLOG_DIR     = path.join(ROOT, 'blog');
const BLOG_INDEX   = path.join(BLOG_DIR, 'index.html');
const POSTS_JSON   = path.join(CONTENT_DIR, 'posts.json');
const SITE_ORIGIN  = 'https://simulationsourcecode.com';

// Hand-authored layouts — never overwrite from markdown unless --force.
const CUSTOM_HTML_SLUGS = new Set([
  'five-lenses-of-self-ego-mind-soul-spirit-void',
  'evolution-of-energy-0-through-9',
  '3-6-9-pattern-tesla-numerology',
  'infinity-loop-cycles-recursion-numerology',
  'pillar-numerology-source-code',
  'trinity-of-purpose-numerology',
  'trinity-of-expression-numerology',
  'trinity-of-lessons-numerology',
  'path-of-transformation-1-4-7-2-5-8-3-6-9',
  'decoding-matrix',
  'how-to-calculate-life-path-number',
  'life-path-number-explained',
  'simulation-theory-numerology-source-code',
]);

// â”€â”€â”€ Frontmatter Parser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parseFrontmatter(raw) {
  const fm = {};
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: fm, body: raw };

  const metaBlock = match[1];
  const body      = match[2];

  let currentKey = null;
  for (const line of metaBlock.split(/\r?\n/)) {
    // List item: "  - value"
    if (/^\s{2,}- /.test(line)) {
      if (currentKey) {
        if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
        fm[currentKey].push(line.replace(/^\s+- /, '').trim());
      }
      continue;
    }
    // Key: value
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kv) {
      currentKey    = kv[1];
      fm[currentKey] = kv[2].trim();
    }
  }

  return { meta: fm, body };
}

// â”€â”€â”€ Markdown ? HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function mdToHtml(md) {
  const lines  = md.split(/\r?\n/);
  const output = [];
  let   inList = false;
  let   inBlockquote = false;

  // Inline transforms
  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`(.+?)`/g,       '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  function closeList() {
    if (inList) { output.push('</ul>'); inList = false; }
  }
  function closeBlockquote() {
    if (inBlockquote) { output.push('</blockquote>'); inBlockquote = false; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blank line
    if (/^\s*$/.test(line)) {
      closeList();
      closeBlockquote();
      continue;
    }

    // Headings
    if (/^#### /.test(line)) { closeList(); closeBlockquote(); output.push(`<h4>${inline(line.slice(5))}</h4>`); continue; }
    if (/^### /.test(line))  { closeList(); closeBlockquote(); output.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (/^## /.test(line))   { closeList(); closeBlockquote(); output.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^# /.test(line))    { closeList(); closeBlockquote(); output.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }

    // Blockquote
    if (/^> /.test(line)) {
      closeList();
      if (!inBlockquote) { output.push('<blockquote>'); inBlockquote = true; }
      output.push(`<p>${inline(line.slice(2))}</p>`);
      continue;
    }

    // Unordered list
    if (/^- /.test(line)) {
      closeBlockquote();
      if (!inList) { output.push('<ul>'); inList = true; }
      output.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    // Paragraph
    closeList();
    closeBlockquote();
    output.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  closeBlockquote();
  return output.join('\n');
}

// â”€â”€â”€ Related Posts HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CHROME_CATS = new Set([
  'Philosophy', 'Numerology', 'The System', 'Practice', 'The Numbers',
  'Life Paths', 'Expressions', 'Soul Urge', 'Insights',
]);
const DATE_CHROME_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}(\s+[—–\-→]\s+\d+\s+min read)?$/i;
const CTA_CHROME_RE  = /^(⬡\s*)?(Get Your Full Blueprint( — \$?22)?|Calculate Your Full Blueprint)(\s*⬡)?$/i;
const LP_LABEL = {
  '1': 'The Initiator', '2': 'The Bridge', '3': 'The Creator',
  '4': 'The Foundation', '5': 'The Change Agent', '6': 'The Responsibility',
  '7': 'The Seeker', '8': 'The Powerhouse', '9': 'The Completor',
  '11': 'The Illuminated Bridge', '22': 'The Master Builder',
  '33': 'The Master Teacher', '44': 'The Master Pragmatist',
};
const EX_LABEL = {
  '1': 'The Independent Voice', '2': 'The Bridge Builder',
  '3': 'The Creative Communicator', '4': 'The Architect',
  '5': 'The Freedom Seeker', '6': 'The Nurturer',
  '7': 'The Inner Truth Holder', '8': 'The Manifestor',
  '9': 'The Humanitarian', '11': 'The Illuminated Bridge',
  '22': 'The Master Architect', '33': 'The Master Transmitter',
};
const SU_LABEL = {
  '1': "The Pioneer's Desire", '2': "The Heart's Desire for Union",
  '3': "The Heart's Desire to Create", '4': "The Heart's Desire to Build",
  '5': "The Heart's Desire for Freedom", '6': "The Heart's Desire to Love",
  '7': 'The Inner Mystic', '8': "The Heart's Desire for Power",
  '9': "The Heart's Desire to Serve", '11': 'The Illuminated Heart',
  '22': "The Master Builder's Heart", '33': "The Master Teacher's Heart",
};

function parseNumberSlug(slug) {
  const m = String(slug || '').match(/^(life-path|expression|soul-urge)-(\d+)-numerology$/);
  return m ? { kind: m[1], n: m[2] } : null;
}

function normTitle(s) {
  return String(s || '').trim().toLowerCase().replace(/[.:]+$/, '').replace(/\s+explained$/, '');
}

function isCssDumpLine(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  if (t === '}' || t === '{') return true;
  if (/^\/(\*|—|--|\s)/.test(t)) return true;
  if (/^(from|to)\s*\{/i.test(t)) return true;
  if (/^(\d+%|0%)/.test(t) && t.includes('{')) return true;
  return /@keyframes|offset-distance|stroke-dashoffset|\.codex-flow/.test(t);
}

function stripBodyChrome(body, meta) {
  const title = (meta && meta.title) || '';
  const lines = String(body || '').split(/\r?\n/);
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  while (i < lines.length) {
    const s = lines[i].trim();
    if (s === '‹ Back to Blog' || s === '← Back to Blog' || s === 'Back to Blog') { i++; continue; }
    if (CHROME_CATS.has(s)) { i++; continue; }
    if (DATE_CHROME_RE.test(s)) { i++; continue; }
    if (CTA_CHROME_RE.test(s)) { i++; continue; }
    if (title && (s === title || normTitle(s) === normTitle(title))) { i++; continue; }
    if (isCssDumpLine(s)) { i++; continue; }
    break;
  }
  let end = lines.length;
  while (end > i && !lines[end - 1].trim()) end--;
  const ctaPara = String((meta && meta.cta) || '').trim();
  while (end > i) {
    const last = lines[end - 1].trim();
    if (CTA_CHROME_RE.test(last) || (ctaPara && last === ctaPara)) {
      end--;
      while (end > i && !lines[end - 1].trim()) end--;
      continue;
    }
    break;
  }
  return lines.slice(i, end).join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function numberFaqItems(kind, n, title) {
  if (kind === 'life-path') {
    const label = LP_LABEL[n] || title || ('Life Path ' + n);
    return [
      { q: `What is Life Path ${n} in numerology?`, a: `Life Path ${n} (${label}) is the external curriculum encoded in your full date of birth. It describes the repeating lesson the simulation keeps delivering through circumstances, relationships, and challenges.` },
      { q: 'How is the Life Path number calculated?', a: 'Sum every digit in your full date of birth — month, day, and year — and reduce to a single digit or master number (11, 22, 33, 44).' },
      { q: `What is the shadow of Life Path ${n}?`, a: `The same frequency that produces the gift of ${String(label).toLowerCase()} also produces its distortion when it runs on autopilot. SSC readings include both gift and shadow so you can recognise which side of the number you are living.` },
    ];
  }
  if (kind === 'expression') {
    const label = EX_LABEL[n] || title || ('Expression ' + n);
    return [
      { q: `What is Expression number ${n}?`, a: `Expression ${n} (${label}) is calculated from the full birth name. It is the internal circuit — how you are wired to process reality and express yourself.` },
      { q: 'How is the Expression number calculated?', a: 'Each letter of the full birth-certificate name is assigned its Pythagorean value. Those values are summed and reduced to a single digit or master number.' },
      { q: `How does Expression ${n} relate to Life Path?`, a: 'Life Path is the external curriculum. Expression is the hardware you run it on. Their sum is the Life Calling. Tension between them is information, not a malfunction.' },
    ];
  }
  const label = SU_LABEL[n] || title || ('Soul Urge ' + n);
  return [
    { q: `What is Soul Urge number ${n}?`, a: `Soul Urge ${n} (${label}) is calculated from the vowels only of the birth name. It is the private drive — what you actually crave beneath social conditioning.` },
    { q: 'How is the Soul Urge calculated?', a: 'Take the vowels only of the full birth-certificate name, assign Pythagorean values, sum, and reduce to a single digit or master number.' },
    { q: `What happens when Soul Urge ${n} is suppressed?`, a: 'Suppressing the Soul Urge creates chronic low-level friction. The inner hunger still runs; it just misfires through the nearest available channel.' },
  ];
}

function categoryFaqItems(meta) {
  const cat = meta.category || 'system';
  if (cat === 'philosophy') {
    return [
      { q: 'What is Simulation Source Code?', a: 'Simulation Source Code reads the numbers in your birth date and name as parameters of a holographic experience — not as personality labels, but as the architecture of the simulation you are running.' },
      { q: 'How does numerology relate to simulation theory?', a: 'If reality is computational, numbers are structure, not symbols. Birth date is a timestamp. The birth name carries a frequency. Together they describe the parameters of this instantiation.' },
      { q: 'Where should I start?', a: 'Run the free calculator for all seven frequencies, then read the matching Life Path, Expression, and Soul Urge articles. The Guidebook writes the full compound story.' },
    ];
  }
  return [
    { q: 'What are the seven frequencies in SSC?', a: 'Life Path, Expression, Soul Urge, Life Calling, Achievement, Theme, and Outer Self. Each is calculated from a different slice of your birth date or name and measures a different layer of the simulation.' },
    { q: 'How do I calculate my numbers?', a: 'The free calculator generates all seven from your full birth-certificate name and date of birth. The Guidebook then writes the compound story behind each number.' },
    { q: 'What is the Codex?', a: 'The Codex is the 3×3 map of consciousness SSC is built on — nine positions that describe how energy moves from perception through embodiment into contribution.' },
  ];
}

function parseFaqFrontmatter(meta) {
  const raw = meta.faq;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(entry => {
    const idx = String(entry).indexOf('|');
    if (idx === -1) return null;
    const q = String(entry).slice(0, idx).trim();
    const a = String(entry).slice(idx + 1).trim();
    return (q && a) ? { q, a } : null;
  }).filter(Boolean);
}

function resolveFaqItems(meta) {
  const fromFm = parseFaqFrontmatter(meta);
  if (fromFm.length) return fromFm.slice(0, 4);
  const parsed = parseNumberSlug(meta.slug);
  if (parsed) return numberFaqItems(parsed.kind, parsed.n, meta.title);
  return categoryFaqItems(meta);
}

function buildFaqJsonLd(items) {
  if (!items || !items.length) return '';
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
  return `  <script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n  </script>\n`;
}

function buildFaqHtml(slug, items) {
  if (!items || !items.length) return '';
  const fid = String(slug || 'post').replace(/\//g, '-') + '-faq-title';
  const rows = items.map(it => `  <details>
    <summary>${escapeHtml(it.q)}</summary>
    <p>${escapeHtml(it.a)}</p>
  </details>`).join('\n');
  return `
<section class="post-faq" aria-labelledby="${fid}">
  <h2 id="${fid}">Frequently Asked Questions</h2>
${rows}
</section>`;
}

function numberRelated(kind, n) {
  if (kind === 'life-path') {
    if (n === '44') {
      return [
        '/blog/life-path-8-numerology/|Life Path 8: The Powerhouse|Read More',
        '/blog/expression-8-numerology/|Expression 8: The Manifestor|Read More',
        '/blog/life-path-number-explained/|Life Path Number Meaning Explained|Read More',
      ];
    }
    return [
      `/blog/expression-${n}-numerology/|Expression ${n}: ${EX_LABEL[n] || ''}|Read More`,
      `/blog/soul-urge-${n}-numerology/|Soul Urge ${n}: ${SU_LABEL[n] || ''}|Read More`,
      '/blog/life-path-number-explained/|Life Path Number Meaning Explained|Read More',
    ];
  }
  if (kind === 'expression') {
    return [
      `/blog/life-path-${n}-numerology/|Life Path ${n}: ${LP_LABEL[n] || ''}|Read More`,
      `/blog/soul-urge-${n}-numerology/|Soul Urge ${n}: ${SU_LABEL[n] || ''}|Read More`,
      '/blog/trinity-of-expression-numerology/|The Trinity of Expression|Read More',
    ];
  }
  return [
    `/blog/expression-${n}-numerology/|Expression ${n}: ${EX_LABEL[n] || ''}|Read More`,
    `/blog/life-path-${n}-numerology/|Life Path ${n}: ${LP_LABEL[n] || ''}|Read More`,
    '/blog/trinity-of-expression-numerology/|The Trinity of Expression|Read More',
  ];
}

function resolveRelated(meta) {
  const fromFm = Array.isArray(meta.related) ? meta.related : [];
  const cleaned = fromFm.filter(entry => {
    const href = String(entry).split('|')[0] || '';
    return href && !/\/calculator\/?$/.test(href);
  });
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  const parsed = parseNumberSlug(meta.slug);
  if (parsed) return numberRelated(parsed.kind, parsed.n);
  return cleaned.slice(0, 3);
}

function buildRelatedPostsHtml(related) {
  if (!related || !related.length) return '';
  const cards = related.map(entry => {
    const [href, title, linkText] = String(entry).split('|');
    return `    <a href="${href}" class="related-post-card">
      <div class="related-post-title">${title}</div>
      <span class="related-post-link">${linkText || 'Read More'}</span>
    </a>`;
  }).join('\n');

  return `
<div class="related-posts">
  <div class="related-posts-title">Related Articles</div>
  <div class="related-posts-grid">
${cards}
  </div>
</div>`;
}

// â”€â”€â”€ Full Post HTML Template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildPostHtml(meta, bodyHtml, relatedHtml, faqHtml, faqJsonLd) {
  const slug        = meta.slug;
  const title       = meta.title       || '';
  const description = meta.description || meta.excerpt || '';
  const date        = meta.date        || '2026-01-01';
  const glyph    = meta.glyph   || '✦';
  const eyebrow     = meta.eyebrow     || '';
  const ctaText     = meta.cta         || 'The complete blueprint — including your Expression, Soul Urge, Life Calling, and the compound story behind each number — is what the Full Blueprint Reading reveals.';
  const breadcrumbName = meta['breadcrumb-name'] || title;
  const canonicalUrl   = `${SITE_ORIGIN}/blog/${slug}/`;
  const ogPath         = meta['og-image'] || '/Images/ssc-og.png';
  const ogImage        = /^https?:\/\//i.test(ogPath) ? ogPath : `${SITE_ORIGIN}${ogPath.startsWith('/') ? '' : '/'}${ogPath}`;
  const fontUrl = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=Cormorant+SC:wght@300;400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script>(function(){try{var t=localStorage.getItem('ssc-theme');if(t==='light')document.documentElement.dataset.theme='light';}catch(e){}})();</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Simulation Source Code</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${meta.keywords || 'numerology, simulation source code, SSC numerology'}">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="icon" type="image/svg+xml" href="/Images/infinity codex_logo_outline.svg">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="Simulation Source Code">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">

  <!-- Article Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "${description}",
    "image": "${ogImage}",
    "url": "${canonicalUrl}",
    "datePublished": "${date}",
    "dateModified": "${date}",
    "author": {
      "@type": "Person",
      "name": "Kytholek",
      "url": "${SITE_ORIGIN}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Simulation Source Code",
      "url": "${SITE_ORIGIN}",
      "logo": {
        "@type": "ImageObject",
        "url": "${SITE_ORIGIN}/Images/Codex Sigil.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${canonicalUrl}"
    }
  }
  </script>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preload" as="style" href="${fontUrl}" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link href="${fontUrl}" rel="stylesheet"></noscript>
  <link rel="stylesheet" href="/css/style.css?v=20260915-audit">
  <link rel="stylesheet" href="/css/brand-revamp.css?v=20260915-audit">
  <link rel="stylesheet" href="/css/blog-post.css?v=20260921-cta">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

  <!-- BreadcrumbList Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Home","item":"${SITE_ORIGIN}/"},
      {"@type":"ListItem","position":2,"name":"Blog","item":"${SITE_ORIGIN}/blog/"},
      {"@type":"ListItem","position":3,"name":"${breadcrumbName}","item":"${canonicalUrl}"}
    ]
  }
  </script>
${faqJsonLd || ''}
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '3127826867426600');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=3127826867426600&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
<script src="/js/meta-pixel.js"></script>
<script src="/js/analytics.js"></script>
</head>
<body class="post-page">

<!-- NAV -->
<nav id="main-nav"></nav>

<!-- CONTENT -->
<div class="post-wrap">

  <!-- Breadcrumb -->
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span>&#8250;</span>
    <a href="/blog/">Blog</a>
    <span>&#8250;</span>
    <span>${breadcrumbName}</span>
  </nav>

  <!-- Hero -->
  <div class="post-hero">
    ${glyph ? `<span class="post-hero-glyph">${glyph}</span>` : ''}
    ${eyebrow ? `<div class="post-hero-eyebrow">${eyebrow}</div>` : ''}
    <h1>${title}</h1>
    <div class="post-hero-meta">By Kytholek &nbsp;&#183;&nbsp; Simulation Source Code</div>
  </div>

  <!-- Body -->
  <div class="post-body">

${bodyHtml}

    <div class="post-cta-block">
      <p>${ctaText}</p>
      <div class="post-cta-actions">
        <a href="/services/#guidebook">&#11042;&nbsp;Get Your Full Blueprint — $22&nbsp;&#11042;</a>
        <a class="post-cta-secondary" href="/calculator/">Free calculator</a>
      </div>
    </div>
${faqHtml || ''}
${relatedHtml}

  </div>

</div>

<!-- FOOTER -->
<footer id="main-footer"></footer>
<script src="/js/translations.js?v=20260915-audit"></script>
<script src="/js/app.js?v=20260915-audit"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof loadNav === 'function') loadNav();
    if (typeof loadFooter === 'function') loadFooter();
  });
</script>

</body>
</html>
`;
}

// â”€â”€â”€ Blog Index Card HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildCardHtml(meta) {
  const slug     = meta.slug;
  const title    = meta.title   || '';
  const excerpt  = meta.excerpt || '';
  const glyph    = meta.glyph   || '✦';
  const category = meta.category || 'system';
  const date     = meta.date     ? formatMonthYear(meta.date) : '';

  // Category label ? display text
  const CAT_LABELS = {
    'life-path':   'Life Paths',
    'expression':  'Expressions',
    'soul-urge':   'Soul Urge',
    'system':      'The System',
    'philosophy':  'Philosophy',
    'trinity':     'Trinity Series',
  };
  const catLabel = CAT_LABELS[category] || category;

  return `      <a href="/blog/${slug}/" class="blog-idx-card" data-cat="${category}">
        <div class="blog-idx-card-thumb sys">${glyph}</div>
        <div class="blog-idx-card-body">
          <div class="blog-idx-card-tags"><span class="blog-idx-tag gold">${catLabel}</span><span class="blog-idx-date">${date}</span></div>
          <div class="blog-idx-card-title">${title}</div>
          <p class="blog-idx-card-excerpt">${excerpt}</p>
          <span class="blog-idx-read">Read Article →</span>
        </div>
      </a>`;
}

function formatMonthYear(dateStr) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// â”€â”€â”€ Blog Index Updater â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const START_MARKER = '<!-- GENERATED_POSTS_START -->';
const END_MARKER   = '<!-- GENERATED_POSTS_END -->';

function updateBlogIndex(posts) {
  if (!fs.existsSync(BLOG_INDEX)) {
    console.warn('[build] blog/index.html not found ? skipping index update');
    return;
  }

  let html = fs.readFileSync(BLOG_INDEX, 'utf8');

  const startIdx = html.indexOf(START_MARKER);
  const endIdx   = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    console.warn('[build] Markers not found in blog/index.html ? skipping index update');
    console.warn('        Add <!-- GENERATED_POSTS_START --> and <!-- GENERATED_POSTS_END --> to blog/index.html');
    return;
  }

  // Sort by date descending; skip slugs already curated elsewhere on the index
  const rest = html.slice(0, startIdx) + html.slice(endIdx);
  const sorted = [...posts]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .filter(function (p) { return rest.indexOf('/blog/' + p.slug + '/') === -1; });
  const cards  = sorted.map(buildCardHtml).join('\n');

  const before = html.slice(0, startIdx + START_MARKER.length);
  const after  = html.slice(endIdx);

  let updated = before + '\n' + cards + '\n      ' + after;

  // Show/hide generated section based on whether there are posts
  updated = updated.replace(
    /(<div class="blog-idx-section" id="section-generated") style="display:none"/,
    '$1'
  );

  fs.writeFileSync(BLOG_INDEX, updated, 'utf8');
  console.log(`[build] blog/index.html updated with ${posts.length} generated post(s)`);
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('[build] content/ directory not found. Create it and add .md files.');
    process.exit(1);
  }

  const mdFiles = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'sample-new-post.md');

  if (!mdFiles.length) {
    console.log('[build] No .md files found in content/. Nothing to do.');
    return;
  }

  const allMeta = [];
  let   built   = 0;
  let   skipped = 0;

  for (const file of mdFiles) {
    const srcPath = path.join(CONTENT_DIR, file);
    const raw     = fs.readFileSync(srcPath, 'utf8');
    const { meta, body } = parseFrontmatter(raw);

    // Allow content files to be kept in-repo but excluded from generation.
    if (String(meta.draft || '').toLowerCase() === 'true') {
      skipped++;
      continue;
    }

    if (!meta.slug) {
      console.warn(`[build] ${file}: missing 'slug' in frontmatter ? skipping`);
      continue;
    }

    const outDir  = path.join(BLOG_DIR, meta.slug);
    const outFile = path.join(outDir, 'index.html');

    // Skip if HTML is newer than .md (unless --force flag)
    const force = process.argv.includes('--force');
    if (!force && CUSTOM_HTML_SLUGS.has(meta.slug) && fs.existsSync(outFile)) {
      skipped++;
      allMeta.push(meta);
      continue;
    }
    if (!force && fs.existsSync(outFile)) {
      const srcMtime = fs.statSync(srcPath).mtimeMs;
      const outMtime = fs.statSync(outFile).mtimeMs;
      if (outMtime >= srcMtime) {
        skipped++;
        allMeta.push(meta);
        continue;
      }
    }

    const bodyHtml    = mdToHtml(stripBodyChrome(body, meta));
    const faqItems    = resolveFaqItems(meta);
    const faqHtml     = buildFaqHtml(meta.slug, faqItems);
    const faqJsonLd   = buildFaqJsonLd(faqItems);
    const relatedHtml = buildRelatedPostsHtml(resolveRelated(meta));
    const html        = buildPostHtml(meta, bodyHtml, relatedHtml, faqHtml, faqJsonLd);

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, html, 'utf8');
    console.log(`[build] Generated: blog/${meta.slug}/index.html`);
    built++;
    allMeta.push(meta);
  }

  // Write posts.json
  fs.writeFileSync(POSTS_JSON, JSON.stringify(allMeta, null, 2), 'utf8');
  console.log(`[build] content/posts.json updated (${allMeta.length} posts)`);

  // Update blog/index.html
  if (allMeta.length) updateBlogIndex(allMeta);

  console.log(`[build] Done ? ${built} built, ${skipped} unchanged`);
}

main();

