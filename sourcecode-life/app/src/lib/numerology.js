/**
 * SOURCE CODE: LIFE — numerology.js (ES Module)
 * Pure numerology engine. Zero DOM dependencies.
 * Converted from the original global script to named ES exports.
 */

const LV = {
  A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, I:9,
  J:1, K:11,L:3, M:4, N:5, O:6, P:7, Q:8, R:9,
  S:1, T:2, U:3, V:22,W:5, X:6, Y:7, Z:8
}

const VOWELS  = new Set(['A','E','I','O','U','Y'])
const MASTERS = new Set([11,22,33,44,55,66,77,88,99])

/** Reduce n to single digit, preserving master numbers */
export function reduce(n) {
  while (n > 9 && !MASTERS.has(n))
    n = String(n).split('').reduce((a, d) => a + +d, 0)
  return n
}

/** Display: "22/4" when compound ≠ root, else just "7" */
export function fmt(root, compound) {
  if (!compound || compound === root) return String(root)
  return compound + '/' + root
}

/** Reduce to 1–9 without preserving masters (for chart counting) */
export function reduceToSimple(n) {
  let r = n
  while (r > 9) r = String(r).split('').reduce((a, d) => a + +d, 0)
  return r
}

/** Reduce letter master values (K=11, V=22) to simple digit for charts */
export function reduceLetterVal(n) {
  if (n === 11) return 2
  if (n === 22) return 4
  return reduceToSimple(n)
}

export function calcLifePath(m, d, y) {
  const total = [m, d, ...String(y).split('').map(Number)].reduce((a, b) => a + b, 0)
  return { root: reduce(total), compound: total }
}

export function calcNameNumbers(name) {
  const names = name.trim().split(/\s+/)
  let expressionSum = 0, soulSum = 0, outerSum = 0
  names.forEach(n => {
    const L = n.toUpperCase().replace(/[^A-Z]/g, '').split('')
    const vs = L.filter(l =>  VOWELS.has(l)).reduce((a, l) => a + (LV[l] || 0), 0)
    const cs = L.filter(l => !VOWELS.has(l)).reduce((a, l) => a + (LV[l] || 0), 0)
    const es = L.reduce((a, l) => a + (LV[l] || 0), 0)
    expressionSum += reduce(es)
    soulSum       += vs
    outerSum      += cs
  })
  return {
    soul:  { root: reduce(soulSum),       compound: soulSum       },
    outer: { root: reduce(outerSum),      compound: outerSum      },
    expr:  { root: reduce(expressionSum), compound: expressionSum }
  }
}

export function calcAchievement(m, d) {
  const t = m + d
  return { root: reduce(t), compound: t }
}

export function calcTheme(y) {
  const t = String(y).split('').reduce((a, d) => a + +d, 0)
  return { root: reduce(t), compound: t }
}

/**
 * Full calculation — returns all 7 frequencies plus raw inputs.
 * @returns {{ lp, ex, cl, so, ou, ac, th, name, m, d, y }}
 */
export function computeAll(m, d, y, name) {
  const lp = calcLifePath(m, d, y)
  const nn = calcNameNumbers(name)
  const ac = calcAchievement(m, d)
  const th = calcTheme(y)
  const clCompound = parseInt(String(nn.expr.root) + String(lp.root))
  const cl = { root: reduce(clCompound), compound: clCompound }
  return { lp, ex: nn.expr, cl, so: nn.soul, ou: nn.outer, ac, th, name, m, d, y }
}

/** Count occurrences of digits 1–9 in an array of numbers */
export function countNums1to9(arr) {
  const counts = {}
  for (let i = 1; i <= 9; i++) counts[i] = 0
  arr.forEach(n => {
    let r = n
    while (r > 9) r = String(r).split('').reduce((a, d) => a + +d, 0)
    if (r >= 1 && r <= 9) counts[r]++
  })
  return counts
}

/** Count digits 0–9 from an array of single digits (e.g. birthdate digits) */
export function countNums0to9(arr) {
  const counts = {}
  for (let i = 0; i <= 9; i++) counts[i] = 0
  arr.forEach(n => { if (n >= 0 && n <= 9) counts[n]++ })
  return counts
}

/** Returns { cycleStartYear, lastBirthday, daysSinceBd } */
export function getCycleAnchor(m, d) {
  const now        = new Date()
  const thisYear   = now.getFullYear()
  const bdThisYear = new Date(thisYear, m - 1, d)
  const cycleStartYear = now >= bdThisYear ? thisYear : thisYear - 1
  const lastBirthday   = new Date(cycleStartYear, m - 1, d)
  const daysSinceBd    = Math.floor((now - lastBirthday) / 86400000)
  return { cycleStartYear, lastBirthday, daysSinceBd }
}

/** Returns { root, cycleStartYear } */
export function calcPersonalYear(m, d) {
  const { cycleStartYear } = getCycleAnchor(m, d)
  return { root: reduce(m + d + cycleStartYear), cycleStartYear }
}

/** Returns [p1,p2,p3,p4] each { root, startAge, endAge } */
export function calcPinnacles(m, d, y, lp) {
  const lps = reduceToSimple(lp.root)
  const p1 = { root: reduce(m + d),            startAge: 0,             endAge: 36 - lps }
  const p2 = { root: reduce(d + y),             startAge: p1.endAge + 1, endAge: p1.endAge + 9 }
  const p3 = { root: reduce(p1.root + p2.root), startAge: p2.endAge + 1, endAge: p2.endAge + 9 }
  const p4 = { root: reduce(m + y),             startAge: p3.endAge + 1, endAge: null }
  return [p1, p2, p3, p4]
}

/** Returns { root, monthNum } */
export function calcPersonalMonth(m, d) {
  const { lastBirthday } = getCycleAnchor(m, d)
  const now = new Date()
  let monthsElapsed = (now.getFullYear() - lastBirthday.getFullYear()) * 12
                    + (now.getMonth()    - lastBirthday.getMonth())
  if (now.getDate() < lastBirthday.getDate()) monthsElapsed--
  monthsElapsed = Math.max(0, monthsElapsed)
  const monthNum = (monthsElapsed % 12) + 1
  const py = calcPersonalYear(m, d).root
  return { root: reduce(py + monthNum), monthNum }
}

/** Returns { root, dayNum, monthRoot } — Personal Day = reduce(Personal Month + cycle day) */
export function calcPersonalDay(m, d) {
  const { lastBirthday } = getCycleAnchor(m, d)
  const now = new Date()
  let monthsElapsed = (now.getFullYear() - lastBirthday.getFullYear()) * 12
                    + (now.getMonth()    - lastBirthday.getMonth())
  if (now.getDate() < lastBirthday.getDate()) monthsElapsed--
  monthsElapsed = Math.max(0, monthsElapsed)
  const pmStartYear  = lastBirthday.getFullYear() + Math.floor((lastBirthday.getMonth() + monthsElapsed) / 12)
  const pmStartMonth = (lastBirthday.getMonth() + monthsElapsed) % 12
  const pmStart      = new Date(pmStartYear, pmStartMonth, lastBirthday.getDate())
  const dayNum       = Math.floor((now - pmStart) / 86400000) + 1
  const monthRoot    = calcPersonalMonth(m, d).root
  return { root: reduce(monthRoot + dayNum), dayNum, monthRoot }
}

/** Returns { root, cycleNum, startMonthIdx, endMonthIdx } */
export function calcFourMonthCycle(m, d) {
  const { monthNum } = calcPersonalMonth(m, d)
  const { lastBirthday } = getCycleAnchor(m, d)
  const cycleNum      = Math.ceil(monthNum / 4)
  const py            = calcPersonalYear(m, d).root
  const root          = reduce(py + cycleNum - 1)
  const startMonthIdx = (lastBirthday.getMonth() + (cycleNum - 1) * 4) % 12
  const endMonthIdx   = (lastBirthday.getMonth() + cycleNum * 4 - 1) % 12
  return { root, cycleNum, startMonthIdx, endMonthIdx }
}

/** Resolve a compound number to its two constituent digits.
 *  Returns { twoDigit, digitA, digitB }
 */
export function resolveCompoundDigits(root, compound) {
  let c = compound || root
  while (String(c).length > 2) {
    c = String(c).split('').reduce((a, d) => a + +d, 0)
  }
  const s = String(c).padStart(2, '0')
  return { twoDigit: c, digitA: parseInt(s[0], 10), digitB: parseInt(s[1], 10) }
}

export function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
}
