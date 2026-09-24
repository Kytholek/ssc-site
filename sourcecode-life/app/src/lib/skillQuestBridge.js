/**
 * skillQuestBridge — unified skill rewards for all quest completions.
 * Every quest credits Stat XP + skill-tree pips for its numerological root (1–9).
 */

import {
  SKILLTREE_LS_KEY,
  SKILLTREE_LS_KEY_V2,
  loadSkillTreeProgressV3,
  saveSkillTreeProgressV3,
  fillSkillPipV3,
  migrateProgressToV3,
  TIER_LABELS,
} from './skillRoutes'
import { getEquippedRouteId } from './classLoadout'

export { SKILLTREE_LS_KEY }

function _readStatValues() {
  try {
    const fromCombined = JSON.parse(localStorage.getItem('scl_xp') || '{}')
    if (fromCombined?.statXP && typeof fromCombined.statXP === 'object') {
      const sv = {}
      for (let i = 1; i <= 9; i++) sv[String(i)] = fromCombined.statXP[i] || fromCombined.statXP[String(i)] || 0
      return sv
    }
  } catch { /* ignore */ }
  try {
    const raw = JSON.parse(localStorage.getItem('scl_stat_xp') || '{}')
    const sv = {}
    for (let i = 1; i <= 9; i++) sv[String(i)] = raw[i] || raw[String(i)] || 0
    return sv
  } catch {
    return {}
  }
}

function _readSeeds() {
  try {
    return window.__scl_innate_seeds__ || {}
  } catch {
    return {}
  }
}

const STAGE_LABELS = [
  TIER_LABELS[1].label,
  TIER_LABELS[2].label,
  TIER_LABELS[3].label,
]

const NUMBER_LABELS = {
  1: 'POWER', 2: 'SENSITIVITY', 3: 'EXPRESSION', 4: 'STRUCTURE',
  5: 'ADAPTABILITY', 6: 'RESPONSIBILITY', 7: 'AWARENESS', 8: 'MASTERY', 9: 'IMPACT',
}

/** Reduce master numbers to skill tree range 1-9 */
export function skillTreeNumber(root) {
  const n = Number(root)
  if (n === 11) return 2
  if (n === 22) return 4
  if (n === 33) return 6
  if (n === 44) return 8
  return (n >= 1 && n <= 9) ? n : null
}

export function statXPForDifficulty(difficulty) {
  return { easy: 1, medium: 2, hard: 4 }[difficulty] || 1
}

/**
 * Tier-mapped stage resolution.
 * @param {object} params
 * @param {number} params.root — numerological root
 * @param {number} [params.tier=1] — 1=Apprentice, 2=Adept, 3=Master
 * @param {string} [params.questKind] — daily|glyph|cycle|side|life|skill|multi|season
 * @param {number} [params.stageIdx] — explicit override (skill-tree quests)
 */
export function resolveSkillMeta({ root, tier = 1, questKind = 'cycle', stageIdx = null }) {
  const number = skillTreeNumber(root)
  if (!number) return null

  if (stageIdx != null) {
    return { number, stageIdx: Math.max(0, Math.min(2, stageIdx)) }
  }

  const kind = questKind || 'cycle'
  let idx = 0

  if (kind === 'life' || kind === 'season' || kind === 'multi') {
    idx = Math.min(2, Math.max(0, tier - 1))
  } else if (kind === 'skill') {
    idx = Math.min(2, Math.max(0, tier - 1))
  } else {
    // daily, glyph, cycle, side
    idx = 0
  }

  return { number, stageIdx: idx }
}

/** Returns true if a new pip was filled (equipped loadout route, else primary). */
export function updateSkillTreeProgress(skillMeta) {
  if (!skillMeta) return false
  const { number, stageIdx } = skillMeta
  if (!number || stageIdx == null) return false

  try {
    const preferred = skillMeta.preferredRouteId
      || getEquippedRouteId(number)
      || null
    const prog = loadSkillTreeProgressV3()
    const statValues = skillMeta.statValues || _readStatValues()
    const seeds = skillMeta.seeds || _readSeeds()
    const { progress, filled } = fillSkillPipV3(prog, number, stageIdx, preferred, statValues, seeds)
    if (!filled) return false
    saveSkillTreeProgressV3(progress)
    try {
      window.NativeAuth?.saveSkillTreeProgress?.(JSON.stringify(progress))
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('scl:skilltree_updated', { detail: progress }))
    return true
  } catch {
    return false
  }
}

/** Remove legacy sk{N}_{tier} keys; preserve v3 route objects. */
export function sanitizeSkillTreeProgress() {
  try {
    // Prefer v3; fall back to migrating v2
    let raw = localStorage.getItem(SKILLTREE_LS_KEY)
    let key = SKILLTREE_LS_KEY
    if (!raw) {
      raw = localStorage.getItem(SKILLTREE_LS_KEY_V2)
      key = SKILLTREE_LS_KEY_V2
    }
    if (!raw) return
    const prog = JSON.parse(raw)
    let changed = false
    Object.keys(prog).forEach((k) => {
      if (k.startsWith('sk')) {
        delete prog[k]
        changed = true
      }
    })
    if (changed || key === SKILLTREE_LS_KEY_V2) {
      const migrated = migrateProgressToV3(prog)
      saveSkillTreeProgressV3(migrated)
    }
  } catch { /* ignore */ }
}

/**
 * Apply unified skill + stat XP reward.
 * @param {object} params
 * @param {Function} earnStatXP — questEngine.earnStatXP
 * @param {Function} [dispatch] — optional event dispatcher
 */
export function applyQuestSkillReward(params, earnStatXP, dispatch = null) {
  const {
    root,
    tier = 1,
    questKind = 'cycle',
    difficulty = 'easy',
    stageIdx = null,
    statXPAmount = null,
    skipStatXP = false,
    skillMeta = null,
  } = params || {}

  const meta = skillMeta || resolveSkillMeta({ root, tier, questKind, stageIdx })
  if (!meta) return { ok: false, meta: null, pipFilled: false, statAmount: 0 }

  const statAmount = statXPAmount != null ? statXPAmount : statXPForDifficulty(difficulty)

  if (!skipStatXP && typeof earnStatXP === 'function') {
    earnStatXP(meta.number, statAmount)
  }

  const pipFilled = updateSkillTreeProgress(meta)

  if (pipFilled && typeof dispatch === 'function') {
    const label = NUMBER_LABELS[meta.number] || `Stat ${meta.number}`
    const stageName = STAGE_LABELS[meta.stageIdx] || 'Stage'
    dispatch('scl:skill_pip_filled', {
      number: meta.number,
      stageIdx: meta.stageIdx,
      label,
      stageName,
    })
    dispatch('scl:xp_toast', {
      msg: `◈ ${label} · ${stageName} ✓`,
      color: 'var(--teal)',
    })
  }

  return { ok: true, meta, pipFilled, statAmount }
}
