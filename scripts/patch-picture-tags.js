#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'pages/books.html',
  'books/index.html',
  'pages/about.html',
  'about/index.html',
  'pages/ssc.html',
];

const IMG_RE = /<img\s+([^>]*?)src="(\/Images\/[^"]+\.(?:png|jpe?g))"([^>]*?)\s*\/?>/gi;

for (const rel of FILES) {
  const fp = path.join(ROOT, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const next = html.replace(IMG_RE, (match, pre, src, post) => {
    if (/substack/i.test(src)) return match;
    const webp = src.replace(/\.(png|jpe?g)$/i, '.webp');
    let attrs = (pre + post).trim();
    if (!/loading=/i.test(attrs) && !/report-preview-img/.test(attrs)) {
      attrs += ' loading="lazy" decoding="async"';
    }
    return `<picture><source srcset="${webp}" type="image/webp"><img src="${src}" ${attrs}></picture>`;
  });
  if (next !== html) {
    fs.writeFileSync(fp, next);
    console.log('updated', rel);
  } else {
    console.log('unchanged', rel);
  }
}
