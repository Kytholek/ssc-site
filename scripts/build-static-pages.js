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

function servicesFaqJsonLd() {
  function q(name, text) {
    return {
      '@type': 'Question',
      name: name,
      acceptedAnswer: { '@type': 'Answer', text: text },
    };
  }
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      q('How long does delivery take?', 'The Guidebook Report, Time Cycle, and Blueprint Bundle are emailed within minutes of payment. Personal Consultations are booked on the calendar — you pick a 1-hour slot. TellTale Tarot is scheduled by WhatsApp message.'),
      q('What information do I need to provide?', 'Your full date of birth (day, month, year) and the full name on your birth certificate. Both are required to calculate all seven frequencies accurately.'),
      q('What does the Guidebook Report cover?', 'All seven encoded frequencies: Life Path, Theme, Achievement, Soul Urge, Outer Expression, Expression, and Life Calling. Each is calculated, its compound story explored, and the full reading interpreted in writing — including how the numbers relate to each other.'),
      q('How long is a Personal Consultation?', 'One hour on video, $55. You choose the time on the booking calendar. The session is a live 7-frequency reading with Q&A, and a recording is shared afterward.'),
      q('How do I book a TellTale Tarot reading?', 'It is a live reading, $20. Send a WhatsApp message to schedule a time. The spread is read with you — themes, timing, and next steps in the session.'),
      q('What is Source Decoder?', 'A community for learning the system — $11/month. Weekly group calls, member chat, and deep dives into frequencies and compounds.'),
      q('Is this a refundable purchase?', 'Guidebook, Time Cycle, and Blueprint Bundle are digital products delivered instantly, so those sales are final. If a PDF does not arrive, contact us and we will resolve it promptly. Live bookings are scheduled separately.'),
      q('How is this different from other numerology readings?', 'SSC uses a proprietary seven-frequency architecture built on the Codex — a 3×3 grid mapping consciousness through number. This is not a translation of traditional numerology. It is an original system designed to read the structural code beneath your life experience.'),
    ],
  }, null, 2);
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
    description: 'Shop guidebooks, Time Cycle, Personal Consultations, TellTale Tarot, and original books by Kytholek — PDF reports and live sessions.',
    image: SEO.SERVICES_OG_IMAGE,
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
    offers: SEO.getServiceProductOffers(),
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

  const ogImage = opts.ogImage || SEO.OG_IMAGE;
  const ogImageWidth = opts.ogImageWidth || SEO.OG_IMAGE_WIDTH;
  const ogImageHeight = opts.ogImageHeight || SEO.OG_IMAGE_HEIGHT;

  const inlineStyle = opts.inlineStyle || '';

  const dataModule = opts.dataModule || '/js/codex-data.js?v=20260915-vessel';
  const coreScripts = [
    '<script src="/js/translations.js?v=20260920-sitewide"></script>',
    '<script type="module" src="' + dataModule + '"></script>',
  ];
  if (opts.includeCalculator !== false) {
    coreScripts.push('<script defer src="/js/calculator.js?v=20260920-calc"></script>');
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
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="${ogImageWidth}">
  <meta property="og:image:height" content="${ogImageHeight}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${opts.ogTitle || opts.title}">
  <meta name="twitter:description" content="${opts.ogDescription || opts.description}">
  <meta name="twitter:image" content="${ogImage}">
  <script type="application/ld+json">
${opts.jsonLd}
  </script>
${opts.extraJsonLd ? `  <script type="application/ld+json">\n${opts.extraJsonLd}\n  </script>` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=Cormorant+SC:wght@300;400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="/css/style.css?v=20260920-sitewide">
  <link rel="stylesheet" href="/css/calculator-codex.css?v=20260920-calc">
${extraStyles}
  <style>
    body { padding-top: 64px; }
    .page { display: block !important; opacity: 1 !important; }
${inlineStyle}
  </style>
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
<body>

<nav id="main-nav"></nav>

<main id="main-content">
<!-- ${opts.marker}_START -->
<div class="page active" id="page-${opts.pageId}">
${opts.body}
</div>
<!-- ${opts.marker}_END -->
</main>

<footer class="footer" id="footer"></footer>

${coreScripts.join('\n')}
${extraScripts}
<script defer src="/js/app.js?v=20260920-sitewide"></script>
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
    description: 'Shop guidebooks, Time Cycle, Personal Consultations, TellTale Tarot, and original books by Kytholek — PDF reports and live sessions.',
    canonical: SEO.SITE_ORIGIN + '/services/',
    ogImage: SEO.SERVICES_OG_IMAGE,
    jsonLd: servicesJsonLd(),
    extraJsonLd: servicesFaqJsonLd(),
    body: body,
    extraStyles: ['/css/brand-revamp.css?v=20260915-audit', '/css/modal.css'],
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
    extraStyles: ['/css/brand-revamp.css?v=20260915-audit', '/css/quest-theme.css?v=20260915-codex-read'],
    extraScripts: [
      '/js/codex-spiral.js?v=20260918-void2',
      '/js/codex-spiral-learn.js?v=20260918-below',
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
    extraStyles: ['/css/brand-revamp.css?v=20260915-audit', '/css/blueprint.css?v=20260723-softcta'],
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

function calculatorFaqJsonLd() {
  function q(name, text) {
    return {
      '@type': 'Question',
      name: name,
      acceptedAnswer: { '@type': 'Answer', text: text },
    };
  }
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      q('What is a Life Path number?', 'Your Life Path number is calculated from your full date of birth. It represents the core theme and curriculum of your life — the lessons the simulation has designed for you to learn and embody.'),
      q('What is numerology?', 'Numerology is the study of the symbolic meaning of numbers and their relationship to events, personality, and life patterns. Simulation Source Code uses the Pythagorean system to calculate seven distinct frequencies from your birth date and full birth name.'),
      q('What is the Life Calling number?', 'The Life Calling is the fusion of your Life Path and Expression numbers. It represents the specific directive that emerges when your external curriculum and internal frequency are combined — your unique mission.'),
      q('How is the Expression number calculated?', 'The Expression number is calculated from your full birth name using the Pythagorean system, where each letter is assigned a numerical value. It represents your natural talents and the authentic frequency you are here to express.'),
      q('What are master numbers in numerology?', 'Master numbers in the Simulation Source Code system are 11, 22, 33, and 44. These numbers are not reduced to a single digit and carry amplified potential and challenge.'),
    ],
  }, null, 2);
}

function calculatorJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SSC Numerology Calculator',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    url: SEO.SITE_ORIGIN + '/calculator/',
    description: 'Free numerology calculator for your Life Path number and six more frequencies. Enter your birth date and full name to calculate Life Path, Expression, Life Calling, Soul Urge, Outer Self, Achievement, and Theme. The $22 Guidebook is the written integration after the free decode.',
    image: SEO.SITE_ORIGIN + '/Images/calculator-og.png',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Simulation Source Code', url: SEO.SITE_ORIGIN },
  }, null, 2);
}

function buildCalculator() {
  const fragment = fs.readFileSync(path.join(ROOT, 'pages', 'calculator.html'), 'utf8');
  const body     = extractPageInner(fragment, 'calculator');
  const html     = staticShell({
    pageId: 'calculator',
    marker: 'CALCULATOR_BODY',
    title: 'Free Numerology Calculator · Life Path & Seven Frequencies · SSC',
    description: 'Free numerology calculator for Life Path and six more frequencies — then keep the $22 written Guidebook. Expression, Life Calling, Soul Urge, Outer Self, Achievement, and Theme from birth date and name.',
    canonical: SEO.SITE_ORIGIN + '/calculator/',
    ogImage: SEO.SITE_ORIGIN + '/Images/calculator-og.png',
    jsonLd: calculatorJsonLd(),
    extraJsonLd: calculatorFaqJsonLd(),
    body: body,
    extraStyles: ['/css/brand-revamp.css?v=20260920-sitewide', '/css/modal.css'],
    bootScript: "if (typeof applyLanguage === 'function') applyLanguage(getLang());",
  });

  const outDir = path.join(ROOT, 'calculator');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log('Wrote calculator/index.html');
}

function main() {
  const target = process.argv[2] || 'all';
  if (target === 'services' || target === 'all') buildServices();
  if (target === 'codex' || target === 'all') buildCodex();
  if (target === 'blueprint' || target === 'all') buildBlueprint();
  if (target === 'calculator' || target === 'all') buildCalculator();
}

main();
