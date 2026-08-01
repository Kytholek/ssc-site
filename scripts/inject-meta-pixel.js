/**
 * One-shot: inject Meta Pixel snippet into blog HTML that lacks it.
 * Run: node scripts/inject-meta-pixel.js
 */
const fs = require('fs')
const path = require('path')

const SNIPPET = `
  <!-- Meta Pixel -->
  <link rel="preconnect" href="https://connect.facebook.net" crossorigin>
  <script src="/js/meta-pixel.js"></script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=3127826867426600&ev=PageView&noscript=1"
  /></noscript>
`

const blogDir = path.join(__dirname, '..', 'blog')
let updated = 0
let skipped = 0
let scanned = 0

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(full)
      continue
    }
    if (ent.name !== 'index.html') continue
    scanned++
    let html = fs.readFileSync(full, 'utf8')
    if (html.includes('meta-pixel.js') || html.includes('3127826867426600')) {
      skipped++
      continue
    }
    if (!html.includes('</head>')) {
      skipped++
      continue
    }
    html = html.replace('</head>', `${SNIPPET}</head>`)
    fs.writeFileSync(full, html)
    updated++
  }
}

walk(blogDir)
console.log(JSON.stringify({ scanned, updated, skipped }, null, 2))
