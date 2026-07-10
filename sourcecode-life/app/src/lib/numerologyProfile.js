/**
 * numerologyProfile.js
 *
 * Pure derivation functions — no state, no components.
 * Single source of truth for computed player profile data
 * used across StatsTab, InnateSkills, SkillTree, and profile charts.
 */
import { countNums0to9, countNums1to9, reduceLetterVal, reduceToSimple } from './numerology'
import { ELECTRIC_NUMS, MAGNETIC_NUMS, AETHER_NUMS, POLARITY_CONFIGS } from './data'

const LV = {
  A:1,  B:2,  C:3,  D:4,  E:5,  F:6,  G:7,  H:8,  I:9,
  J:1,  K:11, L:3,  M:4,  N:5,  O:6,  P:7,  Q:8,  R:9,
  S:1,  T:2,  U:3,  V:22, W:5,  X:6,  Y:7,  Z:8,
}

// ── Stage eligibility thresholds ──────────────────────────────────────────────
export const THRESHOLDS = {
  stage2: 5,   // digit count required for stage 2 to be tappable
  stage3: 9,  // digit count required for stage 3 to be tappable
}

// ── Core digit count ──────────────────────────────────────────────────────────
/**
 * Returns combined digit frequency map { 0–9: count }
 * from birthdate digits + reduced name letter values.
 */
export function getDigitCounts(playerData) {
  if (!playerData) return {}
  const { name, m, d, y } = playerData
  const bdDigits   = [...String(m), ...String(d), ...String(y)].map(Number)
  const bdCounts   = countNums0to9(bdDigits)
  const nameVals   = (name || '').toUpperCase().replace(/[^A-Z]/g, '').split('')
    .map(l => reduceLetterVal(LV[l] || 0)).filter(n => n > 0)
  const nameCounts = countNums1to9(nameVals)
  const combined   = {}
  for (let i = 0; i <= 9; i++) combined[i] = (bdCounts[i] || 0) + (nameCounts[i] || 0)
  return combined
}

// ── Stat values (1–9 only, for skill tree) ────────────────────────────────────
/**
 * Returns { "1": n, "2": n, ... "9": n } — innate digit counts from chart.
 * Skill-tree unlock gates use earned stat XP from questEngine.getXPState().statXP.
 */
export function getStatValues(playerData) {
  const counts = getDigitCounts(playerData)
  const stats = {}
  for (let i = 1; i <= 9; i++) stats[String(i)] = counts[i] || 0
  return stats
}

// ── Polarity mix ──────────────────────────────────────────────────────────────
/**
 * Returns { electric: %, magnetic: %, aether: % } — percentages summing to 100.
 * Includes LP/EX/CL root contributions (+1 per root).
 * This is the INNATE (birth-based) polarity — it never changes.
 */
export function getPolarityMix(playerData) {
  if (!playerData) return { electric: 33, magnetic: 33, aether: 34 }
  const { lp, ex, cl } = playerData
  const combined = getDigitCounts(playerData)

  const normalize = r => r > 9 ? (r === 11 ? 2 : r === 22 ? 4 : r === 33 ? 6 : r === 44 ? 8 : reduceToSimple(r)) : r
  ;[lp, ex, cl].forEach(obj => {
    const k = normalize(obj?.root)
    if (k >= 0 && k <= 9) combined[k] = (combined[k] || 0) + 1
  })

  const e     = [1,3,5,7].reduce((s,n) => s + (combined[n] || 0), 0)
  const mag   = [2,4,6,8].reduce((s,n) => s + (combined[n] || 0), 0)
  const aeth  = [0,9].reduce((s,n) => s + (combined[n] || 0), 0)
  const total = e + mag + aeth || 1
  const ePct = Math.round((e    / total) * 100)
  const mPct = Math.round((mag  / total) * 100)
  return {
    electric: ePct,
    magnetic: mPct,
    aether:   100 - ePct - mPct,
  }
}

// ── Active polarity (stat-XP driven) ─────────────────────────────────────────
/**
 * Returns { electric: %, magnetic: %, aether: % } based on current stat XP.
 * Percentages always sum to exactly 100.
 */
export function getActivePolarity(statXP = {}) {
  const entries = Object.entries(statXP)
  if (!entries.length) return null

  const byPolarity = { electric: 0, magnetic: 0, aether: 0 }

  entries.forEach(([num, xp]) => {
    const n = parseInt(num, 10)
    if (n === 0 || n === 9) byPolarity.aether += xp
    else if ([1, 3, 5, 7].includes(n)) byPolarity.electric += xp
    else if ([2, 4, 6, 8].includes(n)) byPolarity.magnetic += xp
  })

  const total = byPolarity.electric + byPolarity.magnetic + byPolarity.aether || 1
  const ePct = Math.round((byPolarity.electric / total) * 100)
  const mPct = Math.round((byPolarity.magnetic / total) * 100)
  return {
    electric: ePct,
    magnetic: mPct,
    aether:   100 - ePct - mPct,
  }
}

// ── Stat distribution ─────────────────────────────────────────────────────────
/**
 * Returns sorted stat entries for charting: [{ num, xp, polarity, color }]
 */
export function getStatDistribution(statXP = {}) {
  const POLARITY_MAP = {
    0: 'aether', 1: 'electric', 2: 'magnetic', 3: 'electric',
    4: 'magnetic', 5: 'electric', 6: 'magnetic', 7: 'electric',
    8: 'magnetic', 9: 'aether',
  }
  const COLOR_MAP = {
    electric: '#f97316',
    magnetic: '#3b82f6',
    aether: '#a78bfa',
  }

  return Object.entries(statXP)
    .map(([num, xp]) => ({
      num: parseInt(num, 10),
      xp,
      polarity: POLARITY_MAP[parseInt(num, 10)] || 'aether',
      color: COLOR_MAP[POLARITY_MAP[parseInt(num, 10)] || 'aether'],
    }))
    .filter(s => s.xp > 0)
    .sort((a, b) => b.xp - a.xp)
}

// ── Innate seeds ──────────────────────────────────────────────────────────────
/**
 * Returns { "n": [stage0, stage1, stage2] } for skill tree nodes seeded by
 * birth gifts (day, soul, outer). Multiple hits on the same root unlock deeper stages.
 */
export function getInnateSeeds(playerData) {
  if (!playerData) return {}
  const nums = [
    reduceToSimple(playerData.d),
    reduceToSimple(playerData.so?.root),
    reduceToSimple(playerData.ou?.root),
  ].filter(n => n >= 1 && n <= 9)

  const counts = {}
  nums.forEach(n => { counts[n] = (counts[n] || 0) + 1 })

  const seeds = {}
  for (const [key, count] of Object.entries(counts)) {
    seeds[String(key)] = [true, count >= 2, count >= 3]
  }
  return seeds
}

// ── Merge helper ──────────────────────────────────────────────────────────────
/**
 * Merges saved progress with innate seeds.
 * Seeds only add true values — never remove manually earned stages.
 */
export function mergeWithSeeds(saved, seeds) {
  const merged = { ...saved }
  for (const [key, seedStages] of Object.entries(seeds)) {
    const current = merged[key] || [false, false, false]
    merged[key] = current.map((v, i) => v || seedStages[i])
  }
  return merged
}

// ── First name frequency ──────────────────────────────────────────────────────
/**
 * Reduces a first name to its numerological root.
 * Returns { compound: rawSum, root: reducedRoot }
 */
export function getFirstNameValue(firstName) {
  if (!firstName) return { compound: 0, root: 0 }
  const letters = firstName.toUpperCase().replace(/[^A-Z]/g, '').split('')
  const raw = letters.reduce((sum, l) => sum + (LV[l] || 0), 0)
  const root = reduceToSimple(raw)
  return { compound: raw, root }
}

// ── Polarity helper ───────────────────────────────────────────────────────────
export function getPolarity(n) {
  if (AETHER_NUMS.has(n))   return 'aether'
  if (ELECTRIC_NUMS.has(n)) return 'electric'
  if (MAGNETIC_NUMS.has(n)) return 'magnetic'
  return 'aether'
}
