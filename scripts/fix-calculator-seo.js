#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'calculator', 'index.html');
let h = fs.readFileSync(p, 'utf8');
h = h.replace(/,\s*"aggregateRating":\s*\{[\s\S]*?"worstRating":\s*"1"\s*\}/, '');
h = h.replace(/simulationsourcecode\.com\/ssc-og\.png/g, 'simulationsourcecode.com/Images/ssc-og.png');
h = h.replace(/\?/g, function (match, offset, str) {
  const before = str.slice(Math.max(0, offset - 30), offset);
  const after = str.slice(offset + 1, offset + 31);
  if (/Calculator $/.test(before) || /Frequencies $/.test(before) || /Source Code $/.test(before)) return ' · ';
  if (/name $/.test(before) || /Theme, and $/.test(before)) return ' — ';
  if (/FAQPage $/.test(before) || /Person $/.test(before) || /Service $/.test(before)) return ' — ';
  if (/fonts $/.test(before) || /scripts $/.test(before) || /styles $/.test(before)) return ' — ';
  if (/Theme $/.test(before) && / the lessons/.test(after)) return ' — ';
  if (/combined $/.test(before)) return ' — ';
  if (/frequencies $/.test(before)) return ' — ';
  if (/framework $/.test(before)) return ' — ';
  if (/Readings $/.test(before)) return ' — ';
  if (/guidebook $/.test(before)) return ' — ';
  return match;
});
if (!h.includes('facebook.com/kytholek/reviews')) {
  h = h.replace(
    '"https://www.tiktok.com/@kytholek"\n    ]',
    '"https://www.tiktok.com/@kytholek",\n      "https://www.facebook.com/kytholek/reviews"\n    ]'
  );
}
fs.writeFileSync(p, h, 'utf8');
console.log('Fixed calculator/index.html');
