#!/usr/bin/env node
/**
 * build-sitemap.js — Generate sitemap.xml from core routes + blog posts
 * Usage: node scripts/build-sitemap.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const SEO  = require('./seo-config');

const ROOT     = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const OUT      = path.join(ROOT, 'sitemap.xml');

function isoDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function fileLastMod(filePath) {
  try {
    return isoDate(fs.statSync(filePath).mtime);
  } catch (e) {
    return isoDate();
  }
}

function loadPostDates() {
  const postsPath = path.join(ROOT, 'content', 'posts.json');
  const map = {};
  if (!fs.existsSync(postsPath)) return map;
  JSON.parse(fs.readFileSync(postsPath, 'utf8')).forEach(function (p) {
    map[p.slug] = p.date;
  });
  return map;
}

function blogUrls(postDates) {
  return fs.readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter(function (d) { return d.isDirectory(); })
    .map(function (d) {
      const slug = d.name;
      const html = path.join(BLOG_DIR, slug, 'index.html');
      const lastmod = postDates[slug] || fileLastMod(html);
      const priority = slug.includes('pillar') || slug.includes('trinity') ? '0.85' : '0.75';
      return { loc: SEO.SITE_ORIGIN + '/blog/' + slug + '/', lastmod: isoDate(lastmod), changefreq: 'monthly', priority: priority };
    })
    .sort(function (a, b) { return a.loc.localeCompare(b.loc); });
}

function urlEntry(u) {
  return `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
}

function main() {
  const postDates = loadPostDates();
  const today = isoDate();

  const core = SEO.CORE_ROUTES.map(function (r) {
    const filePath = r.path === '/'
      ? path.join(ROOT, 'index.html')
      : path.join(ROOT, r.path.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
    return {
      loc: SEO.SITE_ORIGIN + (r.path === '/' ? '/' : r.path),
      lastmod: fileLastMod(filePath),
      changefreq: r.changefreq,
      priority: r.priority,
    };
  });

  const blogs = blogUrls(postDates);
  const all   = core.concat(blogs);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(urlEntry).join('\n\n')}
</urlset>
`;

  fs.writeFileSync(OUT, xml, 'utf8');
  console.log('Wrote sitemap.xml (' + all.length + ' URLs)');
}

main();
