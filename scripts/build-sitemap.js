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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Strict W3C date (YYYY-MM-DD). Never emit weekday strings like "Fri Jul 03". */
function isoDate(d) {
  const today = todayIso();

  function fromYmd(y, mo, da) {
    if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(da)) return null;
    if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
    const dt = new Date(Date.UTC(y, mo - 1, da));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== da) return null;
    const s = dt.toISOString().slice(0, 10);
    return s > today ? today : s;
  }

  if (d == null || d === '') return today;

  if (d instanceof Date) {
    if (isNaN(d.getTime())) return today;
    return fromYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) || today;
  }

  const s = String(d).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return fromYmd(+m[1], +m[2], +m[3]) || today;

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return fromYmd(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate()) || today;
  }

  return today;
}

function assertIsoDate(value, context) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid sitemap lastmod for ' + context + ': ' + JSON.stringify(value));
  }
}

function fileLastMod(filePath) {
  try {
    return isoDate(fs.statSync(filePath).mtime);
  } catch (e) {
    return isoDate();
  }
}

function routeFilePath(routePath) {
  if (routePath === '/') return path.join(ROOT, 'index.html');
  if (routePath.endsWith('.html')) return path.join(ROOT, routePath.replace(/^\//, ''));
  return path.join(ROOT, routePath.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
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
      const lastmod = isoDate(postDates[slug] || fileLastMod(html));
      assertIsoDate(lastmod, '/blog/' + slug + '/');
      const priority = slug.includes('pillar') || slug.includes('trinity') ? '0.85' : '0.75';
      return { loc: SEO.SITE_ORIGIN + '/blog/' + slug + '/', lastmod: lastmod, changefreq: 'monthly', priority: priority };
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

  const core = SEO.CORE_ROUTES.map(function (r) {
    const lastmod = fileLastMod(routeFilePath(r.path));
    assertIsoDate(lastmod, r.path);
    return {
      loc: SEO.SITE_ORIGIN + (r.path === '/' ? '/' : r.path),
      lastmod: lastmod,
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
