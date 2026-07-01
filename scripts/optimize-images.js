#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '..', 'Images');
const MIN_BYTES = 60 * 1024;

function maxWidthFor(file) {
  const base = path.basename(file).toLowerCase();
  if (base === 'me.jpg') return 640;
  if (/realitylost|sscbook|forgetting|book|cover/.test(base)) return 560;
  if (/sample|report-preview|chart/.test(base)) return 1200;
  if (/codex|sigil|livingcodex|electromagnetic/.test(base)) return 1400;
  return 1200;
}

async function optimizeFile(file) {
  const fp = path.join(IMAGES_DIR, file);
  const stat = fs.statSync(fp);
  if (stat.size < MIN_BYTES) return null;

  const meta = await sharp(fp).metadata();
  const maxW = maxWidthFor(file);
  let pipeline = sharp(fp).rotate().resize(maxW, null, { withoutEnlargement: true });

  const ext = path.extname(file).toLowerCase();
  let outBuf;

  if (ext === '.jpg' || ext === '.jpeg') {
    outBuf = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } else if (ext === '.png') {
    outBuf = await pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  } else {
    return null;
  }

  const webpBuf = await sharp(outBuf).webp({ quality: 82 }).toBuffer();
  const webpPath = fp.replace(/\.(png|jpe?g)$/i, '.webp');
  const tmpPath = fp + '.tmp';

  fs.writeFileSync(tmpPath, outBuf);
  fs.renameSync(tmpPath, fp);
  fs.writeFileSync(webpPath, webpBuf);

  const outMeta = await sharp(outBuf).metadata();
  return {
    file,
    webp: path.basename(webpPath),
    width: outMeta.width,
    height: outMeta.height,
    bytes: outBuf.length,
    webpBytes: webpBuf.length,
    before: stat.size,
  };
}

async function main() {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => /\.(png|jpe?g)$/i.test(f));
  const results = [];

  for (const file of files) {
    try {
      const r = await optimizeFile(file);
      if (r) {
        results.push(r);
        console.log(
          `${file}: ${Math.round(r.before / 1024)}KB → ${Math.round(r.bytes / 1024)}KB (+ webp ${Math.round(r.webpBytes / 1024)}KB) @ ${r.width}x${r.height}`
        );
      }
    } catch (err) {
      console.warn(`[skip] ${file}: ${err.message}`);
    }
  }

  console.log(`\nOptimized ${results.length} image(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
