/**
 * Inject Facebook domain verification meta into the home page only.
 * Meta checks the site root (https://simulationsourcecode.com/).
 * Run: node scripts/inject-fb-domain-verify.js
 */
const fs = require('fs')
const path = require('path')

const home = path.join(__dirname, '..', 'index.html')
const META = '<meta name="facebook-domain-verification" content="ubal88lsvyihqhj3drpcr5z4slvo14" />'

let html = fs.readFileSync(home, 'utf8')
if (html.includes('facebook-domain-verification')) {
  console.log('already present on index.html')
  process.exit(0)
}
html = html.replace(
  /<meta charset="UTF-8">/i,
  `<meta charset="UTF-8">\n  ${META}`
)
fs.writeFileSync(home, html)
console.log('added to index.html')
