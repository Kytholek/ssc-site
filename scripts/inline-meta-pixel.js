/**
 * Replace external-only Meta Pixel includes with Meta's official inline
 * base code (so Events Manager / Pixel Helper can detect it), plus the
 * conversion bridge script.
 *
 * Run: node scripts/inline-meta-pixel.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const INLINE_SNIPPET = `<!-- Meta Pixel Code -->
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
<script src="/js/analytics.js"></script>`

const OLD_PATTERNS = [
  /(?:\s*<!-- Meta Pixel(?: Code)? -->\s*)?(?:\s*<link rel="preconnect" href="https:\/\/connect\.facebook\.net" crossorigin>\s*)?\s*<script src="\/js\/meta-pixel\.js"><\/script>\s*<noscript><img height="1" width="1" style="display:none"\s*src="https:\/\/www\.facebook\.com\/tr\?id=3127826867426600&ev=PageView&noscript=1"\s*\/><\/noscript>(?:\s*<!-- End Meta Pixel Code -->)?/g,
]

const TARGET_DIRS = [
  '',
  'calculator',
  'services',
  'thank-you',
  'about',
  'books',
  'blueprint',
  'codex',
  'consultation',
  'blog',
  '4-phase-alchemy',
  'sourcecode-life',
]

let updated = 0
let skipped = 0
let scanned = 0

function processFile(file) {
  scanned++
  let html = fs.readFileSync(file, 'utf8')
  if (!html.includes('3127826867426600') && !html.includes('meta-pixel.js')) {
    skipped++
    return
  }
  // Already has official inline init
  if (html.includes("fbq('init', '3127826867426600')") || html.includes('fbq("init", "3127826867426600")')) {
    // Ensure bridge script is present
    if (!html.includes('/js/meta-pixel.js')) {
      html = html.replace('<!-- End Meta Pixel Code -->', '<!-- End Meta Pixel Code -->\n<script src="/js/meta-pixel.js"></script>')
      fs.writeFileSync(file, html)
      updated++
      return
    }
    if (!html.includes('/js/analytics.js')) {
      html = html.replace('<script src="/js/meta-pixel.js"></script>', '<script src="/js/meta-pixel.js"></script>\n<script src="/js/analytics.js"></script>')
      fs.writeFileSync(file, html)
      updated++
      return
    }
    skipped++
    return
  }

  let next = html
  let replaced = false
  for (const re of OLD_PATTERNS) {
    const after = next.replace(re, `\n${INLINE_SNIPPET}\n`)
    if (after !== next) {
      next = after
      replaced = true
    }
  }

  if (!replaced) {
    // Fallback: inject before </head>
    if (html.includes('</head>')) {
      next = html.replace('</head>', `\n${INLINE_SNIPPET}\n</head>`)
      replaced = true
    }
  }

  if (replaced && next !== html) {
    fs.writeFileSync(file, next)
    updated++
  } else {
    skipped++
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      // Don't recurse into app build artifacts under sourcecode-life
      if (ent.name === 'app' || ent.name === 'node_modules' || ent.name === 'dist') continue
      walk(full)
    } else if (ent.name === 'index.html') {
      processFile(full)
    }
  }
}

for (const rel of TARGET_DIRS) {
  const dir = path.join(ROOT, rel)
  const index = path.join(dir, 'index.html')
  if (rel === '' || rel === 'calculator' || rel === 'services' || !fs.statSync(dir).isDirectory()) {
    if (fs.existsSync(index)) processFile(index)
    else walk(dir)
  } else {
    walk(dir)
  }
}

// Also update build.js template string if it still uses external-only include
const buildPath = path.join(ROOT, 'build.js')
if (fs.existsSync(buildPath)) {
  let build = fs.readFileSync(buildPath, 'utf8')
  const oldBuild = `  <!-- Meta Pixel -->
  <link rel="preconnect" href="https://connect.facebook.net" crossorigin>
  <script src="/js/meta-pixel.js"></script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=3127826867426600&ev=PageView&noscript=1"
  /></noscript>`
  if (build.includes(oldBuild)) {
    build = build.replace(oldBuild, INLINE_SNIPPET)
    fs.writeFileSync(buildPath, build)
    console.log('updated build.js template')
  } else if (build.includes('meta-pixel.js') && !build.includes("fbq('init'")) {
    // looser replace around meta pixel block in template
    build = build.replace(
      /  <!-- Meta Pixel -->[\s\S]*?<\/noscript>\n/,
      INLINE_SNIPPET + '\n'
    )
    fs.writeFileSync(buildPath, build)
    console.log('updated build.js template (loose)')
  }
}

console.log(JSON.stringify({ scanned, updated, skipped }, null, 2))
