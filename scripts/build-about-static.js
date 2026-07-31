#!/usr/bin/env node
/**
 * build-about-static.js — Sync pages/about.html into about/index.html
 * Usage: node scripts/build-about-static.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const FRAGMENT   = path.join(ROOT, 'pages', 'about.html');
const OUTPUT     = path.join(ROOT, 'about', 'index.html');

const MARKER_START = '<!-- ABOUT_BODY_START -->';
const MARKER_END   = '<!-- ABOUT_BODY_END -->';

function extractAboutBody(html) {
  const match = html.match(/<div class="page" id="page-about">([\s\S]*)<\/div><!-- \/page-about -->/);
  if (!match) {
    throw new Error('Could not find page-about wrapper in pages/about.html');
  }
  return match[1].trim();
}

function buildShell(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script>(function(){try{var t=localStorage.getItem('ssc-theme');if(t==='light')document.documentElement.dataset.theme='light';}catch(e){}})();</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Simulation Source Code · Numerology Framework</title>
  <meta name="description" content="Simulation Source Code is a numerology framework built on Pythagorean principles, simulation theory, and consciousness research — offering practical, grounded readings of your seven encoded frequencies.">
  <link rel="canonical" href="https://simulationsourcecode.com/about/">
  <link rel="icon" type="image/svg+xml" href="/Images/infinity codex_logo_outline.svg">
  <meta property="og:type" content="website">
  <meta property="og:title" content="About Simulation Source Code">
  <meta property="og:description" content="A decade studying the numbers. Building a system that actually tells you something.">
  <meta property="og:url" content="https://simulationsourcecode.com/about/">
  <meta property="og:image" content="https://simulationsourcecode.com/Images/ssc-og.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Simulation Source Code",
    "url": "https://simulationsourcecode.com/about/",
    "description": "Simulation Source Code is a numerology framework built on Pythagorean principles, simulation theory, and consciousness research.",
    "mainEntity": {
      "@type": "Person",
      "name": "Kytholek",
      "url": "https://simulationsourcecode.com/about/",
      "jobTitle": "Numerologist & Author",
      "description": "Creator of the Simulation Source Code framework — a seven-frequency numerology system decoded from birth date and full birth name.",
      "sameAs": [
        "https://www.instagram.com/kytholek",
        "https://www.youtube.com/@kytholek",
        "https://substack.com/@kyelthomas",
        "https://www.tiktok.com/@kytholek",
        "https://www.facebook.com/kytholek/reviews"
      ],
      "worksFor": {
        "@type": "Organization",
        "name": "Simulation Source Code",
        "url": "https://simulationsourcecode.com"
      }
    }
  }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=Cormorant+SC:wght@300;400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="/css/style.css?v=20260731-logo-only">
  <link rel="stylesheet" href="/css/brand-revamp.css?v=20260731-logo-only">
  <link rel="stylesheet" href="/css/quest-theme.css?v=20260731-logo-only">
  <style>
    body { padding-top: 64px; }
    .page { display: block !important; opacity: 1 !important; }
    .about-hero-photo, .about-hero-photo img.about-photo { animation: none !important; transform: none !important; }
  </style>
</head>
<body>

<nav id="main-nav"></nav>

<main>
${MARKER_START}
${body}
${MARKER_END}
</main>

<footer class="footer" id="footer"></footer>

<script src="/js/translations.js?v=20260731-es-fix"></script>
<script src="/js/app.js?v=20260731-es-fix"></script>
<script>
  (async function () {
    if (typeof loadNav === 'function') await loadNav();
    if (typeof loadFooter === 'function') await loadFooter();
    if (typeof applyLanguage === 'function') applyLanguage(getLang());
  })();
</script>
</body>
</html>
`;
}

function main() {
  const fragment = fs.readFileSync(FRAGMENT, 'utf8');
  const body     = extractAboutBody(fragment);
  const html     = buildShell(body);

  fs.writeFileSync(OUTPUT, html, 'utf8');
  console.log('Wrote about/index.html from pages/about.html');
}

main();
