/**
 * Skill tree specialization routes - Number -> Route -> Tier -> Quest
 * Progress v3 shape:
 *   { "3": { activeRoutes: ["art"], routes: { art: [t1,t2,t3], voice: [...], ... } } }
 */

import { SKILL_OBJECTIVES, getSkillTreeTierObjectives } from './objectives'

export const SKILLTREE_LS_KEY_V2 = 'scl_skilltree_progress_v2'
export const SKILLTREE_LS_KEY = 'scl_skilltree_progress_v3'

export const TIER_LABELS = {
  1: { key: 'initiate', label: 'Discovery' },
  2: { key: 'consistency', label: 'Development' },
  3: { key: 'mastery', label: 'Mastery' },
}

export const THRESHOLDS = { stage2: 5, stage3: 10 }

const TIER_KEYS = ['initiate', 'consistency', 'mastery']

function questsFromObjectives(numId, difficulty) {
  const tier = TIER_KEYS[difficulty - 1]
  if (tier) {
    const objs = getSkillTreeTierObjectives(Number(numId), tier)
    if (objs.length) return objs.map((o) => o.text)
  }
  const obj = SKILL_OBJECTIVES[Number(numId)]?.find((o) => o.difficulty === difficulty)
  return obj ? [obj.text] : ['(No objective defined)']
}

function stagesFromLegacy(numId, names) {
  return names.map((name, i) => ({
    stage: i + 1,
    name,
    quests: questsFromObjectives(numId, i + 1),
  }))
}

function stubRoute(id, name, thesis, numId, stageNames, { placeholder = false, classNoun = null } = {}) {
  const stages = stagesFromLegacy(numId, stageNames).map((s) => ({
    ...s,
    quests: placeholder
      ? [`${name} path - full quests coming. For now: ${s.quests[0] || 'Train this frequency through daily quests.'}`]
      : s.quests,
  }))
  return {
    id,
    name,
    classNoun: classNoun || name.split(/\s+/)[0],
    thesis,
    stages,
    placeholder: !!placeholder,
  }
}

/** Seal chrome + routes for each number 1-9 */
export const SKILL_TREE = {
  1: {
    id: '1', label: 'POWER', subtitle: 'Action / Initiative', icon: '\u25B2', color: '#FF4D00', glow: '#FF4D0066',
    routes: [
      stubRoute('leadership', 'Leadership', 'Presence -> Direction -> Leadership', '1',
        ['Presence', 'Direction', 'Leadership'], { classNoun: 'Leader' }),
      stubRoute('entrepreneurship', 'Entrepreneurship', 'Opportunity -> Execution -> Enterprise', '1',
        ['Opportunity', 'Execution', 'Enterprise'], { placeholder: true, classNoun: 'Founder' }),
      stubRoute('physical', 'Physical Agency', 'Movement -> Strength -> Physical Mastery', '1',
        ['Movement', 'Strength', 'Physical Mastery'], { placeholder: true, classNoun: 'Athlete' }),
    ],
  },
  2: {
    id: '2', label: 'SENSITIVITY', subtitle: 'Relationships / Connection', icon: '\u25CE', color: '#00C9FF', glow: '#00C9FF66',
    routes: [
      stubRoute('relationships', 'Relationships', 'Connection -> Intimacy -> Partnership', '2',
        ['Connection', 'Intimacy', 'Partnership'], { classNoun: 'Partner' }),
      stubRoute('empathy', 'Empathy', 'Awareness -> Understanding -> Compassion', '2',
        ['Awareness', 'Understanding', 'Compassion'], { placeholder: true, classNoun: 'Empath' }),
      stubRoute('social', 'Social Intelligence', 'Reading People -> Navigating Groups -> Social Mastery', '2',
        ['Reading People', 'Navigating Groups', 'Social Mastery'], { placeholder: true, classNoun: 'Connector' }),
    ],
  },
  3: {
    id: '3', label: 'EXPRESSION', subtitle: 'Communication / Creativity', icon: '\u2726', color: '#FFB800', glow: '#FFB80066',
    routes: [
      {
        id: 'voice',
        name: 'Voice',
        classNoun: 'Orator',
        thesis: 'Speak -> Present -> Influence',
        stages: [
          { stage: 1, name: 'Find Your Voice', quests: ['Speak your opinion once without rehearsing.'] },
          { stage: 2, name: 'Command Attention', quests: ['Give a 3-5 minute talk to at least one other person.'] },
          { stage: 3, name: 'Move Others', quests: ['Deliver a presentation to an audience.'] },
        ],
      },
      {
        id: 'creation',
        name: 'Creation',
        classNoun: 'Maker',
        thesis: 'Create -> Develop Style -> Create Meaning',
        stages: [
          { stage: 1, name: 'Create Freely', quests: ['Make something without judging it.'] },
          { stage: 2, name: 'Develop Style', quests: ['Produce 10 pieces using a consistent aesthetic.'] },
          { stage: 3, name: 'Create Meaning', quests: ['Produce a finished body of work you are willing to share.'] },
        ],
      },
      {
        id: 'writing',
        name: 'Writing',
        classNoun: 'Scribe',
        thesis: 'Write -> Storytelling -> Publishing',
        stages: [
          { stage: 1, name: 'Write Honestly', quests: ['Write 500 words without editing.'] },
          { stage: 2, name: 'Develop Voice', quests: ['Publish 10 pieces (blog, journal, or social - your call).'] },
          { stage: 3, name: 'Move Through Words', quests: ['Complete an essay, story, or short book draft.'] },
        ],
      },
    ],
  },
  4: {
    id: '4', label: 'STRUCTURE', subtitle: 'Discipline / Systems', icon: '\u25A3', color: '#00FF94', glow: '#00FF9466',
    routes: [
      stubRoute('discipline', 'Discipline', 'Routine -> Consistency -> Self-Mastery', '4',
        ['Routine', 'Consistency', 'Self-Mastery'], { classNoun: 'Disciple' }),
      stubRoute('organization', 'Organization', 'Order -> Planning -> Optimization', '4',
        ['Order', 'Planning', 'Optimization'], { placeholder: true, classNoun: 'Architect' }),
      stubRoute('systems', 'Systems', 'Process -> Automation -> Architecture', '4',
        ['Process', 'Automation', 'Architecture'], { placeholder: true, classNoun: 'Engineer' }),
    ],
  },
  5: {
    id: '5', label: 'ADAPTABILITY', subtitle: 'Change / Exploration', icon: '\u25C8', color: '#FF61D8', glow: '#FF61D866',
    routes: [
      stubRoute('exploration', 'Exploration', 'Curiosity -> Experimentation -> Discovery', '5',
        ['Curiosity', 'Experimentation', 'Discovery'], { classNoun: 'Explorer' }),
      stubRoute('adventure', 'Adventure', 'Departure -> Challenge -> Expedition', '5',
        ['Departure', 'Challenge', 'Expedition'], { placeholder: true, classNoun: 'Adventurer' }),
      stubRoute('innovation', 'Innovation', 'Question -> Experiment -> Reinvent', '5',
        ['Question', 'Experiment', 'Reinvent'], { placeholder: true, classNoun: 'Innovator' }),
    ],
  },
  6: {
    id: '6', label: 'RESPONSIBILITY', subtitle: 'Care / Reliability', icon: '\u2B21', color: '#7B61FF', glow: '#7B61FF66',
    routes: [
      stubRoute('care', 'Care', 'Support -> Nurture -> Stewardship', '6',
        ['Support', 'Nurture', 'Stewardship'], { classNoun: 'Caregiver' }),
      stubRoute('family', 'Family', 'Presence -> Commitment -> Foundation', '6',
        ['Presence', 'Commitment', 'Foundation'], { placeholder: true, classNoun: 'Kinkeeper' }),
      stubRoute('service', 'Service', 'Help -> Serve -> Lead Through Service', '6',
        ['Help', 'Serve', 'Lead Through Service'], { placeholder: true, classNoun: 'Server' }),
    ],
  },
  7: {
    id: '7', label: 'AWARENESS', subtitle: 'Reflection / Insight', icon: '\u25C9', color: '#00E5FF', glow: '#00E5FF66',
    routes: [
      stubRoute('contemplation', 'Contemplation', 'Stillness -> Observation -> Insight', '7',
        ['Stillness', 'Observation', 'Insight'], { classNoun: 'Seer' }),
      stubRoute('research', 'Research', 'Question -> Investigate -> Understand', '7',
        ['Question', 'Investigate', 'Understand'], { placeholder: true, classNoun: 'Scholar' }),
      stubRoute('consciousness', 'Consciousness', 'Self-Observation -> Pattern Recognition -> Integration', '7',
        ['Self-Observation', 'Pattern Recognition', 'Integration'], { placeholder: true, classNoun: 'Mystic' }),
    ],
  },
  8: {
    id: '8', label: 'MASTERY', subtitle: 'Results / Performance', icon: '\u25C6', color: '#FF9500', glow: '#FF950066',
    routes: [
      stubRoute('achievement', 'Achievement', 'Goal -> Performance -> Excellence', '8',
        ['Goal', 'Performance', 'Excellence'], { classNoun: 'Achiever' }),
      stubRoute('wealth', 'Wealth', 'Value -> Resource -> Wealth Creation', '8',
        ['Value', 'Resource', 'Wealth Creation'], { placeholder: true, classNoun: 'Magnate' }),
      stubRoute('command', 'Leadership', 'Authority -> Responsibility -> Command', '8',
        ['Authority', 'Responsibility', 'Command'], { placeholder: true, classNoun: 'Commander' }),
    ],
  },
  9: {
    id: '9', label: 'IMPACT', subtitle: 'Completion / Contribution', icon: '\u273A', color: '#FF2D55', glow: '#FF2D5566',
    routes: [
      stubRoute('contribution', 'Contribution', 'Give -> Serve -> Legacy', '9',
        ['Give', 'Serve', 'Legacy'], { classNoun: 'Giver' }),
      stubRoute('teaching', 'Teaching', 'Learn -> Teach -> Mentor', '9',
        ['Learn', 'Teach', 'Mentor'], { placeholder: true, classNoun: 'Mentor' }),
      stubRoute('creation', 'Creation', 'Build -> Share -> Leave Something Behind', '9',
        ['Build', 'Share', 'Leave Something Behind'], { placeholder: true, classNoun: 'Artisan' }),
    ],
  },
}

/** Array form for seal grid (stable order 1-9) */
export const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => SKILL_TREE[n])

export function getNumberDef(numId) {
  return SKILL_TREE[String(numId)] || SKILL_TREE[Number(numId)] || null
}

export function getRouteDef(numId, routeId) {
  return getNumberDef(numId)?.routes?.find((r) => r.id === routeId) || null
}

export function primaryRouteId(numId) {
  return getNumberDef(numId)?.routes?.[0]?.id || 'core'
}

export function emptyRouteProgress(numId) {
  const def = getNumberDef(numId)
  const routes = {}
  ;(def?.routes || []).forEach((r) => { routes[r.id] = [false, false, false] })
  return { activeRoutes: [], routes }
}

export function isV3Entry(entry) {
  return entry && typeof entry === 'object' && !Array.isArray(entry) && entry.routes && typeof entry.routes === 'object'
}

export function isV2Progress(prog) {
  if (!prog || typeof prog !== 'object') return false
  return Object.keys(prog).some((k) => Array.isArray(prog[k]))
}

/** Migrate flat [t1,t2,t3] or mixed map -> v3 */
export function migrateProgressToV3(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (let i = 1; i <= 9; i++) {
    const key = String(i)
    const entry = src[key] ?? src[i]
    if (isV3Entry(entry)) {
      const base = emptyRouteProgress(key)
      out[key] = {
        activeRoutes: Array.isArray(entry.activeRoutes) ? [...entry.activeRoutes] : [],
        routes: { ...base.routes, ...(entry.routes || {}) },
      }
      Object.keys(base.routes).forEach((rid) => {
        if (!Array.isArray(out[key].routes[rid])) out[key].routes[rid] = [false, false, false]
        while (out[key].routes[rid].length < 3) out[key].routes[rid].push(false)
      })
      continue
    }
    const arr = Array.isArray(entry) ? [...entry] : [false, false, false]
    while (arr.length < 3) arr.push(false)
    const rid = primaryRouteId(key)
    const node = emptyRouteProgress(key)
    node.routes[rid] = arr.slice(0, 3)
    if (arr.some(Boolean)) node.activeRoutes = [rid]
    out[key] = node
  }
  return out
}

export function loadSkillTreeProgressV3() {
  try {
    const v3 = localStorage.getItem(SKILLTREE_LS_KEY)
    if (v3) return migrateProgressToV3(JSON.parse(v3))
    const v2 = localStorage.getItem(SKILLTREE_LS_KEY_V2)
    if (v2) {
      const migrated = migrateProgressToV3(JSON.parse(v2))
      saveSkillTreeProgressV3(migrated)
      return migrated
    }
  } catch { /* ignore */ }
  return migrateProgressToV3({})
}

export function saveSkillTreeProgressV3(progress) {
  try {
    localStorage.setItem(SKILLTREE_LS_KEY, JSON.stringify(progress))
  } catch { /* ignore */ }
}

/** Primary = first active route, else first route on the number */
export function getPrimaryRouteId(numProgress, numId) {
  const active = numProgress?.activeRoutes
  if (Array.isArray(active) && active.length) return active[0]
  return primaryRouteId(numId)
}

export function getRouteStages(numProgress, numId, routeId) {
  const rid = routeId || getPrimaryRouteId(numProgress, numId)
  const arr = numProgress?.routes?.[rid]
  if (Array.isArray(arr)) {
    const copy = [...arr]
    while (copy.length < 3) copy.push(false)
    return copy.slice(0, 3)
  }
  return [false, false, false]
}

export function stagesDoneOnRoute(numProgress, numId, routeId) {
  return getRouteStages(numProgress, numId, routeId).filter(Boolean).length
}

/** Seal pips use primary active route */
export function getSealProgress(numProgress, numId) {
  const rid = getPrimaryRouteId(numProgress, numId)
  return getRouteStages(numProgress, numId, rid)
}

export function canStartRoute(numProgress, numId, routeId) {
  const active = numProgress?.activeRoutes || []
  if (active.includes(routeId)) return { ok: true, reason: 'active' }
  if (active.length === 0) return { ok: true, reason: 'first' }
  const hasT1 = active.some((rid) => getRouteStages(numProgress, numId, rid)[0] === true)
  if (!hasT1) {
    return { ok: false, reason: 'Complete Discovery (T1) on your current route before starting another.' }
  }
  return { ok: true, reason: 'unlocked' }
}

export function startRoute(progress, numId, routeId) {
  const key = String(numId)
  const next = { ...progress }
  const node = { ...(next[key] || emptyRouteProgress(key)) }
  const routes = { ...node.routes }
  if (!Array.isArray(routes[routeId])) routes[routeId] = [false, false, false]
  const active = Array.isArray(node.activeRoutes) ? [...node.activeRoutes] : []
  const gate = canStartRoute(node, key, routeId)
  if (!gate.ok) return { progress, error: gate.reason }
  if (!active.includes(routeId)) active.push(routeId)
  next[key] = { activeRoutes: active, routes }
  return { progress: next, error: null }
}

export function isRouteStageUnlocked(numId, routeId, stageIdx, numProgress, statValues = {}, seeds = {}) {
  if (stageIdx === 0) return true
  const stages = getRouteStages(numProgress, numId, routeId)
  if (!stages[stageIdx - 1]) return false
  const innate = seeds?.[numId] || seeds?.[String(numId)] || [false, false, false]
  if (innate[stageIdx]) return true
  const statVal = statValues?.[numId] || statValues?.[String(numId)] || 0
  const threshold = stageIdx === 1 ? THRESHOLDS.stage2 : THRESHOLDS.stage3
  return statVal >= threshold
}

/** Apply innate seeds onto primary route (and ensure route exists) */
export function mergeSeedsV3(progress, seeds) {
  const next = migrateProgressToV3(progress)
  for (const [key, seedStages] of Object.entries(seeds || {})) {
    const node = next[key] || emptyRouteProgress(key)
    const rid = getPrimaryRouteId(node, key)
    if (!node.activeRoutes.includes(rid) && seedStages?.some(Boolean)) {
      node.activeRoutes = [rid, ...node.activeRoutes.filter((r) => r !== rid)]
    }
    const cur = getRouteStages(node, key, rid)
    node.routes = {
      ...node.routes,
      [rid]: cur.map((v, i) => v || !!seedStages[i]),
    }
    next[key] = node
  }
  return next
}

/**
 * Fill a pip on a preferred route, else primary active route.
 * @param {object} progress
 * @param {number|string} number
 * @param {number} stageIdx
 * @param {string|null} [preferredRouteId]
 */
export function fillSkillPipV3(progress, number, stageIdx, preferredRouteId = null) {
  const key = String(number)
  let next = migrateProgressToV3(progress)
  let node = next[key] || emptyRouteProgress(key)
  let rid = preferredRouteId && getRouteDef(key, preferredRouteId)
    ? preferredRouteId
    : getPrimaryRouteId(node, key)
  if (!node.activeRoutes.includes(rid)) {
    const started = startRoute(next, key, rid)
    if (started.error) {
      // Fall back to primary if preferred can't start
      rid = getPrimaryRouteId(node, key)
      if (!node.activeRoutes.length) {
        const fallback = startRoute(next, key, rid)
        if (fallback.error) return { progress: next, filled: false }
        next = fallback.progress
        node = next[key]
        rid = getPrimaryRouteId(node, key)
      }
    } else {
      next = started.progress
      node = next[key]
    }
  }
  const arr = getRouteStages(node, key, rid)
  if (stageIdx > 0 && !arr[stageIdx - 1]) return { progress: next, filled: false }
  if (arr[stageIdx]) return { progress: next, filled: false }
  arr[stageIdx] = true
  next[key] = {
    ...node,
    routes: { ...node.routes, [rid]: arr },
  }
  return { progress: next, filled: true, routeId: rid }
}

export function countCompletedTiers(progress) {
  const p = migrateProgressToV3(progress)
  let n = 0
  for (let i = 1; i <= 9; i++) {
    const node = p[String(i)]
    Object.values(node?.routes || {}).forEach((arr) => {
      if (Array.isArray(arr)) n += arr.filter(Boolean).length
    })
  }
  return n
}

export function countTotalTiers() {
  return 9 * 3
}

/**
 * Progress against routes the player has actually started.
 * If nothing is active yet, denominator is primary-path capacity (9x3).
 */
export function getTrainingProgress(progress) {
  const p = migrateProgressToV3(progress)
  let done = 0
  let total = 0
  let anyActive = false
  for (let i = 1; i <= 9; i++) {
    const key = String(i)
    const node = p[key] || emptyRouteProgress(key)
    const active = Array.isArray(node.activeRoutes) ? node.activeRoutes : []
    if (!active.length) continue
    anyActive = true
    total += active.length * 3
    active.forEach((rid) => {
      done += getRouteStages(node, key, rid).filter(Boolean).length
    })
  }
  if (!anyActive) return { done: 0, total: 9 * 3 }
  return { done, total: Math.max(total, 1) }
}

/** First incomplete unlockable tier on a route, or null */
export function getNextTierAction(numId, routeId, numProgress, statValues = {}, seeds = {}) {
  if (!routeId) return null
  const active = (numProgress?.activeRoutes || []).includes(routeId)
  if (!active) return null
  for (let si = 0; si < 3; si++) {
    const stages = getRouteStages(numProgress, numId, routeId)
    if (stages[si]) continue
    if (isRouteStageUnlocked(numId, routeId, si, numProgress, statValues, seeds)) {
      return { routeId, stageIdx: si }
    }
    break
  }
  return null
}
