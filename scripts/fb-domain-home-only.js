const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const TAG = 'facebook-domain-verification'
const META = '<meta name="facebook-domain-verification" content="ubal88lsvyihqhj3drpcr5z4slvo14" />'
const LINE = /\n?[ \t]*<meta name="facebook-domain-verification" content="ubal88lsvyihqhj3drpcr5z4slvo14" \/>\n?/g

const removeFrom = [
  'calculator/index.html',
  'services/index.html',
  'checkout/index.html',
  'thank-you/index.html',
  'about/index.html',
  'books/index.html',
  'blueprint/index.html',
  'codex/index.html',
  'consultation/index.html',
  'blog/index.html',
  '4-phase-alchemy/index.html',
  'sourcecode-life/index.html',
  'build.js',
]

for (const f of removeFrom) {
  const full = path.join(ROOT, f)
  if (!fs.existsSync(full)) continue
  let html = fs.readFileSync(full, 'utf8')
  if (!html.includes(TAG)) continue
  fs.writeFileSync(full, html.replace(LINE, '\n'))
  console.log('removed', f)
}

const home = path.join(ROOT, 'index.html')
let h = fs.readFileSync(home, 'utf8')
if (!h.includes(TAG)) {
  h = h.replace(/<meta charset="UTF-8">/i, `<meta charset="UTF-8">\n  ${META}`)
  fs.writeFileSync(home, h)
  console.log('added to index.html')
} else {
  console.log('kept index.html')
}
