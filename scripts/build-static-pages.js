#!/usr/bin/env node
/**
 * build-static-pages.js — Generate static index.html for services/ and codex/
 * Usage: node scripts/build-static-pages.js [services|codex|all]
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const SEO  = require('./seo-config');

const ROOT = path.join(__dirname, '..');

function extractPageInner(html, pageId) {
  const openTag = `<div class="page" id="page-${pageId}">`;
  const start   = html.indexOf(openTag);
  if (start === -1) throw new Error(`Could not find ${openTag}`);

  const commentClose = `<!-- /page-${pageId} -->`;
  const commentIdx   = html.indexOf(commentClose);
  if (commentIdx !== -1) {
    const endDiv = html.lastIndexOf('</div>', commentIdx);
    return html.slice(start + openTag.length, endDiv).trim();
  }

  const innerStart = start + openTag.length;
  const lastClose  = html.lastIndexOf('</div>');
  return html.slice(innerStart, lastClose).trim();
}

function parseCodexNodes() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'codex-data.mjs'), 'utf8');
  const nodes = [];
  const re = /'(\d+)':\s*\{[\s\S]*?name:\s*'([^']+)'[\s\S]*?body:\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    nodes.push({ id: m[1], name: m[2], body: m[3].replace(/\\'/g, "'") });
  }
  const order = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return order.map(function (id) {
    return nodes.find(function (n) { return n.id === id; });
  }).filter(Boolean);
}

function servicesJsonLd() {
  const reviews = SEO.FACEBOOK_REVIEWS.map(function (r) {
    return {
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody: r.text,
    };
  });

  return JSON.stringify({
    '@context': 'https://schema.org',
    // Product is required so Google Review Snippets accept nested reviews
    // (Service alone triggers "Invalid object type for field <parent_node>").
    '@type': ['Service', 'Product'],
    name: 'Numerology Readings — Simulation Source Code',
    url: SEO.SITE_ORIGIN + '/services/',
    description: 'Personalised numerology guidebook PDF, live consultation, TellTale Tarot, group membership, and original books by Kytholek.',
    provider: {
      '@type': 'Organization',
      name: 'Simulation Source Code',
      url: SEO.SITE_ORIGIN,
      sameAs: SEO.SOCIAL_PROFILES,
    },
    brand: {
      '@type': 'Brand',
      name: 'Simulation Source Code',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: SEO.FACEBOOK_RATING_VALUE,
      ratingCount: SEO.FACEBOOK_RATING_COUNT,
      bestRating: '5',
      worstRating: '1',
    },
    review: reviews,
    offers: [
      { '@type': 'Offer', name: 'Guidebook Report', price: '22', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Time Cycle', price: '17', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Personal Consultation', price: '88', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'TellTale Tarot Reading', price: '20', priceCurrency: 'USD' },
    ],
  }, null, 2);
}

function codexJsonLd() {
  const nodes = parseCodexNodes();
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'The Codex — Nine Frequencies · Simulation Source Code',
    url: SEO.SITE_ORIGIN + '/codex/',
    description: 'The nine-frequency consciousness matrix. The complete architecture of the Simulation Source Code framework — each number a stage in the evolution of energy from void to wisdom.',
    isPartOf: { '@type': 'WebSite', name: 'Simulation Source Code', url: SEO.SITE_ORIGIN },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Codex Frequencies',
      itemListElement: nodes.map(function (n, i) {
        return {
          '@type': 'ListItem',
          position: i + 1,
          name: n.id + ' — ' + n.name,
          description: n.body,
        };
      }),
    },
  }, null, 2);
}

function staticShell(opts) {
  const extraStyles = (opts.extraStyles || []).map(function (s) {
    return `  <link rel="stylesheet" href="${s}">`;
  }).join('\n');

  const extraScripts = (opts.extraScripts || []).map(function (s) {
    return `  <script defer src="${s}"></script>`;
  }).join('\n');

  const inlineStyle = opts.inlineStyle || '';

  const dataModule = opts.dataModule || '/js/codex-data.js';
  const coreScripts = [
    '<script src="/js/translations.js"></script>',
    '<script type="module" src="' + dataModule + '"></script>',
  ];
  if (opts.includeCalculator !== false) {
    coreScripts.push('<script defer src="/js/calculator.js?v=20260723-result-polish"></script>');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script>(function(){try{var t=localStorage.getItem('ssc-theme');if(t==='light')document.documentElement.dataset.theme='light';}catch(e){}})();</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <meta name="description" content="${opts.description}">
  <link rel="canonical" href="${opts.canonical}">
  <link rel="icon" type="image/svg+xml" href="/Images/infinity codex_logo_outline.svg">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Simulation Source Code">
  <meta property="og:title" content="${opts.ogTitle || opts.title}">
  <meta property="og:description" content="${opts.ogDescription || opts.description}">
  <meta property="og:url" content="${opts.canonical}">
  <meta property="og:image" content="${SEO.OG_IMAGE}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${opts.ogTitle || opts.title}">
  <meta name="twitter:description" content="${opts.ogDescription || opts.description}">
  <meta name="twitter:image" content="${SEO.OG_IMAGE}">
  <script type="application/ld+json">
${opts.jsonLd}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=Cormorant+SC:wght@300;400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="/css/style.css">
${extraStyles}
  <style>
    body { padding-top: 64px; }
    .page { display: block !important; opacity: 1 !important; }
${inlineStyle}
  </style>
</head>
<body>

<nav id="main-nav"></nav>

<main>
<!-- ${opts.marker}_START -->
<div class="page active" id="page-${opts.pageId}">
${opts.body}
</div>
<!-- ${opts.marker}_END -->
</main>

<footer class="footer" id="footer"></footer>

${coreScripts.join('\n')}
${extraScripts}
<script defer src="/js/app.js?v=20260723-codex-lazy2"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    (async function () {
      if (typeof loadNav === 'function') await loadNav();
      if (typeof loadFooter === 'function') await loadFooter();
      ${opts.bootScript || ''}
    })();
  });
</script>
</body>
</html>
`;
}

function buildServices() {
  const fragment = fs.readFileSync(path.join(ROOT, 'pages', 'services.html'), 'utf8');
  const body     = extractPageInner(fragment, 'services');
  const html     = staticShell({
    pageId: 'services',
    marker: 'SERVICES_BODY',
    title: 'Numerology Services · Guidebooks, Readings & Books · SSC',
    description: 'Shop guidebooks, live readings, TellTale Tarot, and original books by Kytholek — PDF reports, consultation, community, and more.',
    canonical: SEO.SITE_ORIGIN + '/services/',
    jsonLd: servicesJsonLd(),
    body: body,
    extraStyles: ['/css/brand-revamp.css', '/css/modal.css'],
    bootScript: "if (typeof initServicesPage === 'function') initServicesPage();\n    if (typeof applyLanguage === 'function') applyLanguage(getLang());",
  });

  const outDir = path.join(ROOT, 'services');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log('Wrote services/index.html');
}

function buildCodex() {
  const fragment = fs.readFileSync(path.join(ROOT, 'pages', 'codex.html'), 'utf8');
  const body     = extractPageInner(fragment, 'codex');

  const html = staticShell({
    pageId: 'codex',
    marker: 'CODEX_BODY',
    title: 'The Codex — Nine Frequencies · Simulation Source Code',
    description: 'The nine-frequency consciousness matrix. The complete architecture of the Simulation Source Code framework — each number a stage in the evolution of energy from void to wisdom.',
    canonical: SEO.SITE_ORIGIN + '/codex/',
    jsonLd: codexJsonLd(),
    body: body,
    extraStyles: ['/css/brand-revamp.css', '/css/calculator-codex.css', '/css/quest-theme.css'],
    extraScripts: [
      '/js/codex-spiral.js',
      '/js/codex-spiral-learn.js',
      '/js/codex-matrix.js',
      '/js/codex-learn.js',
    ],
    bootScript: "if (typeof initCodexPage === 'function') initCodexPage();\n    (function () {\n      var params = new URLSearchParams(window.location.search);\n      var vp = params.get('view');\n      var view = vp === 'spiral' ? 'spiral' : vp === 'journey' ? 'journey' : 'matrix';\n      if (typeof setCodexView === 'function') setCodexView(view, false);\n      else if (typeof window._initiateCodex === 'function') window._initiateCodex();\n    })();\n    if (typeof applyLanguage === 'function') applyLanguage(getLang());",
  });

  const outDir = path.join(ROOT, 'codex');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log('Wrote codex/index.html');
}

function blueprintJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Triune Trinity Blueprint · Numerology Star Chart · Simulation Source Code',
    url: SEO.SITE_ORIGIN + '/blueprint/',
    description: 'Explore the seven numerology frequencies grouped into three trinities — Lessons, Expression, and Purpose — with an interactive star chart journey.',
    isPartOf: { '@type': 'WebSite', name: 'Simulation Source Code', url: SEO.SITE_ORIGIN },
    mainEntity: {
      '@type': 'LearningResource',
      name: 'Triune Trinity Blueprint',
      learningResourceType: 'Interactive Resource',
      teaches: 'Numerology trinities: Lessons, Expression, and Purpose',
    },
  }, null, 2);
}

function buildBlueprint() {
  const fragment = fs.readFileSync(path.join(ROOT, 'pages', 'blueprint.html'), 'utf8');
  const body     = extractPageInner(fragment, 'blueprint');

  const html = staticShell({
    pageId: 'blueprint',
    marker: 'BLUEPRINT_BODY',
    title: 'Triune Trinity Blueprint · Numerology Star Chart · Simulation Source Code',
    description: 'Explore the seven numerology frequencies grouped into three trinities — Lessons, Expression, and Purpose — with an interactive star chart journey and links to full articles.',
    canonical: SEO.SITE_ORIGIN + '/blueprint/',
    jsonLd: blueprintJsonLd(),
    body: body,
    extraStyles: ['/css/brand-revamp.css', '/css/blueprint.css?v=20260723-softcta'],
    dataModule: '/js/blueprint-data.js',
    includeCalculator: false,
    extraScripts: [
      '/js/blueprint-star.js',
      '/js/blueprint-journey.js',
    ],
    bootScript: "if (typeof initBlueprintPage === 'function') initBlueprintPage();\n    if (typeof applyLanguage === 'function') applyLanguage(getLang());",
  });

  const outDir = path.join(ROOT, 'blueprint');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log('Wrote blueprint/index.html');
}

function main() {
  const target = process.argv[2] || 'all';
  if (target === 'services' || target === 'all') buildServices();
  if (target === 'codex' || target === 'all') buildCodex();
  if (target === 'blueprint' || target === 'all') buildBlueprint();
}

main();
