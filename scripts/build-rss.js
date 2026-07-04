#!/usr/bin/env node
/**
 * build-rss.js — Generate feed.xml from content/posts.json
 * Usage: node scripts/build-rss.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const SEO  = require('./seo-config');

const ROOT  = path.join(__dirname, '..');
const OUT   = path.join(ROOT, 'feed.xml');
const POSTS = path.join(ROOT, 'content', 'posts.json');

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toRfc822(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toUTCString();
}

function main() {
  if (!fs.existsSync(POSTS)) {
    console.error('content/posts.json not found');
    process.exit(1);
  }

  const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'))
    .slice()
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
    .slice(0, 30);

  const items = posts.map(function (p) {
    const link = SEO.SITE_ORIGIN + '/blog/' + p.slug + '/';
    const desc = p.excerpt || p.description || '';
    return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${toRfc822(p.date || '2026-01-01')}</pubDate>
      <description>${escapeXml(desc)}</description>
    </item>`;
  }).join('\n');

  const lastBuild = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Simulation Source Code Blog</title>
    <link>${SEO.SITE_ORIGIN}/blog/</link>
    <description>Deep dives into numerology as source code — Life Path, Expression, the Codex, and the philosophy of the simulation you are living in.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SEO.SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

  fs.writeFileSync(OUT, xml, 'utf8');
  console.log('Wrote feed.xml (' + posts.length + ' items)');
}

main();
