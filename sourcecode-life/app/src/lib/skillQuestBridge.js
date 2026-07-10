/**
 * skillQuestBridge — unified skill rewards for all quest completions.
 * Every quest credits Stat XP + skill-tree pips for its numerological root (1–9).
 */

export const SKILLTREE_LS_KEY = 'scl_skilltree_progress_v2'

const STAGE_LABELS = ['Initiate', 'Consistency', 'Mastery']

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

/** Returns true if a new pip was filled. */
export function updateSkillTreeProgress(skillMeta) {
  if (!skillMeta) return false
  const { number, stageIdx } = skillMeta
  if (!number || stageIdx == null) return false

  try {
    const raw = localStorage.getItem(SKILLTREE_LS_KEY)
    const prog = raw ? JSON.parse(raw) : {}
    const key = String(number)
    const arr = Array.isArray(prog[key]) ? [...prog[key]] : [false, false, false]
    while (arr.length < 3) arr.push(false)

    if (stageIdx > 0 && !arr[stageIdx - 1]) return false
    if (arr[stageIdx]) return false

    arr[stageIdx] = true
    prog[key] = arr
    localStorage.setItem(SKILLTREE_LS_KEY, JSON.stringify(prog))
    window.dispatchEvent(new CustomEvent('scl:skilltree_updated', { detail: prog }))
    return true
  } catch {
    return false
  }
}

/** Remove legacy sk{N}_{tier} keys that corrupt boolean-array progress. */
export function sanitizeSkillTreeProgress() {
  try {
    const raw = localStorage.getItem(SKILLTREE_LS_KEY)
    if (!raw) return
    const prog = JSON.parse(raw)
    let changed = false
    Object.keys(prog).forEach((k) => {
      if (k.startsWith('sk') || (!Array.isArray(prog[k]) && typeof prog[k] === 'object')) {
        delete prog[k]
        changed = true
      }
    })
    if (changed) {
      localStorage.setItem(SKILLTREE_LS_KEY, JSON.stringify(prog))
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
