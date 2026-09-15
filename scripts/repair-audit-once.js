'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');

function walkHtml(dir, acc) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, acc);
    else if (ent.name === 'index.html') acc.push(p);
  });
  return acc;
}

function fixEncoding(text) {
  return text
    .replace(/\/blog\/decoding-the-matrix-simulation-source-code\//g, '/blog/decoding-matrix/')
    .replace(/Read Article \?/g, 'Read Article →')
    .replace(/Read Deep Dive \?/g, 'Read Deep Dive →')
    .replace(/3\?3/g, '3×3')
    .replace(/33 matrix/g, '3×3 matrix')
    .replace(/ \? /g, ' — ')
    .replace(/sys">\?<\/div>/g, 'sys">✦</div>');
}

function patchPostScripts(html) {
  if (html.indexOf('/js/translations.js') !== -1) {
    return html
      .replace(/src="\/js\/app\.js(?:\?v=[^"]*)?"/g, 'src="/js/app.js?v=20260915-audit"')
      .replace(/href="\/css\/style\.css(?:\?v=[^"]*)?"/g, 'href="/css/style.css?v=20260915-audit"')
      .replace(/href="\/css\/brand-revamp\.css(?:\?v=[^"]*)?"/g, 'href="/css/brand-revamp.css?v=20260915-audit"')
      .replace(/href="\/css\/blog-post\.css(?:\?v=[^"]*)?"/g, 'href="/css/blog-post.css?v=20260915-audit"');
  }
  return html
    .replace(
      '<script src="/js/app.js"></script>',
      '<script src="/js/translations.js?v=20260915-audit"></script>\n<script src="/js/app.js?v=20260915-audit"></script>'
    )
    .replace(
      '<script src="/js/app.js?v=20260801-checkout-pixel"></script>',
      '<script src="/js/translations.js?v=20260915-audit"></script>\n<script src="/js/app.js?v=20260915-audit"></script>'
    )
    .replace(/src="\/js\/app\.js(?:\?v=[^"]*)?"/g, 'src="/js/app.js?v=20260915-audit"')
    .replace(/href="\/css\/style\.css(?:\?v=[^"]*)?"/g, 'href="/css/style.css?v=20260915-audit"')
    .replace(/href="\/css\/brand-revamp\.css(?:\?v=[^"]*)?"/g, 'href="/css/brand-revamp.css?v=20260915-audit"')
    .replace(/href="\/css\/blog-post\.css(?:\?v=[^"]*)?"/g, 'href="/css/blog-post.css?v=20260915-audit"');
}

const files = walkHtml(BLOG, []);
let n = 0;
files.forEach(function (file) {
  const raw = fs.readFileSync(file, 'utf8');
  let next = fixEncoding(raw);
  next = patchPostScripts(next);
  if (next !== raw) {
    fs.writeFileSync(file, next, 'utf8');
    n++;
  }
});
console.log('Patched', n, 'blog HTML files of', files.length);

const matrixRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Decoding the Matrix · Simulation Source Code</title>
  <link rel="canonical" href="https://simulationsourcecode.com/blog/decoding-matrix/">
  <meta http-equiv="refresh" content="0;url=/blog/decoding-matrix/">
  <script>location.replace('/blog/decoding-matrix/');</script>
</head>
<body>
  <p>This article now lives at <a href="/blog/decoding-matrix/">Decoding the Matrix</a>.</p>
</body>
</html>
`;
fs.writeFileSync(path.join(BLOG, 'decoding-the-matrix-simulation-source-code', 'index.html'), matrixRedirect, 'utf8');
console.log('Wrote matrix redirect');
