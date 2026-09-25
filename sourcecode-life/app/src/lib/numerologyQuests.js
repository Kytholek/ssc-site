/* ============================================================
   numerologyQuests.js — Numerology-driven daily quest generator

   Generates 6 personalized journal quests per day (2 skill +
   2 life + 2 cycle) based on the user's numerology profile.
   Integrates with questEngine.js for XP awards.

   Events dispatched on window:
     'scl:gen_quests_updated' — { quests, completed? }

   Storage keys:
     scl_gen_quests    — today's generated quest set
     scl_quest_hist    — rolling action-category history
   ============================================================ */


import { earnFreqXP, earnStatXP, getLQP, getActiveTier, QuestEngine_markLQPObjective } from './questEngine.js'
import {
  applyQuestSkillReward,
  resolveSkillMeta,
  skillTreeNumber,
  statXPForDifficulty,
} from './skillQuestBridge.js'
import {
  NUMBERS,
  loadSkillTreeProgressV3,
  getPrimaryRouteId,
  getRouteStages,
  isRouteStageUnlocked,
  getRouteDef,
  resolveRouteStageQuests,
} from './skillRoutes.js'
import {
  loadClassLoadout,
  getFilledSlots,
  getEligibleSeals,
} from './classLoadout.js'
import { pickClassFlavoredObjective } from './classQuestFlavor.js'
import { recordDailySnapshot, updateDailySummary } from './dataHistory.js'
import { getTieredObjectiveTexts, getCycleObjectives } from './objectives.js'
import { resolveBlueprintNode, BLUEPRINT_UNLOCK_LV } from './questBlueprint.js'
import { calcPersonalDay, calcPersonalMonth, calcPersonalYear, reduceToSimple } from './numerology.js'
import { statState } from './achievements.js'
import { todayStr } from './numerology.js'

// ── Storage ───────────────────────────────────────────────────────────────────
const LS_GEN_QUESTS  = 'scl_gen_quests'
const LS_QUEST_HIST  = 'scl_quest_hist'
const LS_NOTIF_PREFS = 'scl_notif_prefs'

/** Returns the current notification prefs, with defaults applied. */
export function getNotifPrefs() {
  try {
    const raw = localStorage.getItem(LS_NOTIF_PREFS)
    const defaults = { dailyReminder: true, questOnMap: true, multiDayReminder: true }
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return { dailyReminder: true, questOnMap: true, multiDayReminder: true }
  }
}

// ── Quest type display metadata ───────────────────────────────────────────────
export const QUEST_TYPE_META = {
  primary:   { label: 'PRIMARY',    desc: 'Your core strength'      },
  growth:    { label: 'GROWTH',     desc: 'Expand a weak point'     },
  cycle:     { label: 'CYCLE',      desc: 'Current energy cycle'    },
  wildcard:  { label: 'WILDCARD',   desc: 'Unexpected path'         },
  objective: { label: 'LIFE QUEST', desc: 'Active tier objective'   },
}

// ── Number display info ───────────────────────────────────────────────────────
export const NUMBER_INFO = {
  1: { archetype: 'Power',          keywords: 'Will / Initiation'         },
  2: { archetype: 'Connection',     keywords: 'Harmony / Sensitivity'     },
  3: { archetype: 'Expression',     keywords: 'Creativity / Joy'          },
  4: { archetype: 'Structure',      keywords: 'Foundation / Discipline'   },
  5: { archetype: 'Adaptability',   keywords: 'Freedom / Change'          },
  6: { archetype: 'Responsibility', keywords: 'Care / Service'            },
  7: { archetype: 'Introspection',  keywords: 'Wisdom / Truth'            },
  8: { archetype: 'Manifestation',  keywords: 'Abundance / Authority'     },
  9: { archetype: 'Completion',     keywords: 'Impact / Contribution'     },
}

// ── Category → branch index mapping (exported for StatsTab) ─────────────────
export const CATEGORY_BRANCH_MAP = {
  1: ['initiate', 'lead', 'assert'],
  2: ['connect', 'harmonize', 'support'],
  3: ['create', 'communicate', 'perform'],
  4: ['organize', 'build', 'discipline'],
  5: ['explore', 'adapt', 'learn'],
  6: ['nurture', 'serve', 'beautify'],
  7: ['study', 'reflect', 'analyze'],
  8: ['achieve', 'manage', 'invest'],
  9: ['contribute', 'complete', 'release'],
}

// ── Cycle XP modifiers (applied in completeGeneratedQuest via applyCycleXpMod)
export const CYCLE_MODIFIERS = {
  1: { label: 'Initiation Cycle',     rule: 'Bonus XP for categories you have never completed before', bonus: 0.15 },
  2: { label: 'Partnership Cycle',    rule: 'Bonus XP for connecting, supporting, and harmonizing actions', bonus: 0.15 },
  3: { label: 'Expression Cycle',     rule: 'Bonus XP for creative, communicative, and performative actions', bonus: 0.15 },
  4: { label: 'Foundation Cycle',     rule: 'Bonus XP for repeating the same category — consistency is rewarded', bonus: 0.15 },
  5: { label: 'Freedom Cycle',        rule: 'Bonus XP for new category types; penalty for repeated ones', bonus: 0.15, penalty: 0.1 },
  6: { label: 'Responsibility Cycle', rule: 'Bonus XP for nurturing, serving, and supporting others', bonus: 0.15 },
  7: { label: 'Introspection Cycle',  rule: 'Bonus XP for deep study, reflection, and analysis', bonus: 0.15 },
  8: { label: 'Power Cycle',          rule: 'Bonus XP scales with difficulty — hard quests pay most', bonus: 0.2 },
  9: { label: 'Completion Cycle',     rule: 'Bonus XP for completing, contributing, and releasing', bonus: 0.15 },
}

const CYCLE_CATS = {
  2: new Set(['connect', 'harmonize', 'support']),
  3: new Set(['create', 'communicate', 'perform']),
  6: new Set(['nurture', 'serve', 'beautify', 'support']),
  7: new Set(['study', 'reflect', 'analyze']),
  9: new Set(['contribute', 'complete', 'release']),
}

/** Pick a category verb for a quest from its seal number. */
function categoryForQuest(number, questId = '') {
  const seal = skillTreeNumber(number) || Number(number) || 5
  const cats = CATEGORY_BRANCH_MAP[seal] || CATEGORY_BRANCH_MAP[5]
  if (!cats?.length) return 'explore'
  let hash = 0
  const s = String(questId || seal)
  for (let i = 0; i < s.length; i++) hash = (hash + s.charCodeAt(i) * (i + 1)) % 997
  return cats[hash % cats.length]
}

/**
 * Modest ±% XP from personal-year cycle. Capped to ±20%.
 * @returns {{ xp: number, mult: number, label: string, applied: boolean }}
 */
export function applyCycleXpMod(baseXP, cycleNumber, category, history = {}) {
  const mod = CYCLE_MODIFIERS[cycleNumber]
  if (!mod || !baseXP) {
    return { xp: baseXP, mult: 1, label: '', applied: false }
  }
  const completed = history.completedTypes || []
  const last = history.lastActions || []
  const lastCat = last[last.length - 1]
  let delta = 0

  switch (Number(cycleNumber)) {
    case 1:
      if (category && !completed.includes(category)) delta = mod.bonus
      break
    case 2:
    case 3:
    case 6:
    case 7:
    case 9:
      if (category && CYCLE_CATS[cycleNumber]?.has(category)) delta = mod.bonus
      break
    case 4:
      if (category && lastCat === category) delta = mod.bonus
      break
    case 5:
      if (category && !completed.includes(category)) delta = mod.bonus
      else if (category && completed.includes(category)) delta = -(mod.penalty || 0.1)
      break
    case 8: {
      // Difficulty scaling handled by caller passing category as difficulty hint via history.difficulty
      const diff = history.difficulty || 'easy'
      if (diff === 'hard') delta = mod.bonus
      else if (diff === 'medium') delta = (mod.bonus || 0.2) * 0.5
      break
    }
    default:
      break
  }

  delta = Math.max(-0.2, Math.min(0.2, delta))
  const mult = 1 + delta
  const xp = Math.max(1, Math.round(baseXP * mult))
  return {
    xp,
    mult,
    label: mod.label,
    applied: Math.abs(delta) > 0.001,
  }
}


// ── Stat XP helpers ───────────────────────────────────────────────────────────
// Use skillQuestBridge.statXPForDifficulty (1 / 2 / 4) — single source of truth.

function _updateCategoryAffinity(history, number, category) {
  if (!category || category === 'objective') return
  history.categoryCompletions = history.categoryCompletions || {}
  history.categoryCompletions[number] = history.categoryCompletions[number] || {}
  history.categoryCompletions[number][category] =
    (history.categoryCompletions[number][category] || 0) + 1
}

/** Returns updated streak count (days) for the given primary number. */
function _updateFocusStreak(history, number) {
  const today = todayStr()
  const fs = history.focusStreaks || { primaryNumber: null, days: 0, lastDate: '' }
  if (fs.lastDate === today) return fs.days // already counted today
  if (fs.primaryNumber === number && fs.lastDate === _yesterdayStr()) {
    fs.days = (fs.days || 0) + 1
  } else {
    fs.days = 1
    fs.primaryNumber = number
  }
  fs.lastDate = today
  history.focusStreaks = fs
  return fs.days
}

/** Awards the Daily Sweep bonus once all journal quests are complete. */
function _checkDailySweep(raw) {
  if (raw.sweepAwarded) return
  if (!raw.quests.every(q => q.completed)) return
  raw.sweepAwarded = true
  persistGenQuests(raw)
  earnFreqXP(25)
  const cn = raw.cycleNumber
  if (cn >= 1 && cn <= 9) {
    applyQuestSkillReward({ root: cn, questKind: 'cycle', difficulty: 'easy' }, earnStatXP, dispatch)
  }
  dispatch('scl:xp_toast', { msg: '◈ DAILY SWEEP · +25 FREQ XP', color: 'var(--teal)' })
}

// ── Generate today's 6 journal quests ─────────────────────────────────────────
/**
 * user = {
 *   dominantNumbers: number[]   — top frequency numbers from profile
 *   weakerNumbers:   number[]   — absent/low frequency numbers
 *   cycleNumber:     number     — current personal year/month cycle
 *   statXP?:         object     — { [1..9]: xp } from questEngine.getXPState()
 * }
 */
function _shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateDailyQuests(user) {
  const today       = todayStr()
  const cycleNumber = user?.cycleNumber || 5
  const statValues  = user?.statValues  || {}
  const seeds       = user?.seeds       || {}
  const lifeNodes   = user?.lifeNodes   || []
  const cycleRoots  = user?.cycleRoots  || {}
  const freqLevel   = user?.freqLevel || 1

  // ── Class loadout ──────────────────────────────────────────────────────────
  let skillProgress = {}
  try {
    skillProgress = loadSkillTreeProgressV3()
  } catch {
    skillProgress = {}
  }

  const loadout = loadClassLoadout()
  const filledSlots = getFilledSlots(loadout)
  const loadoutEmpty = filledSlots.length === 0

  const pushRouteQuests = (pool, numberObj, route, numProgress, { priority = 0 } = {}) => {
    if (!route) return
    route.stages.forEach((stageObj, stageIdx) => {
      if (!isRouteStageUnlocked(numberObj.id, route.id, stageIdx, numProgress, statValues, seeds)) return
      const stages = getRouteStages(numProgress, numberObj.id, route.id)
      if (stages[stageIdx]) return // already done — skip for daily focus
      const isNextTier = stages.findIndex((d) => !d) === stageIdx
      const questTexts = resolveRouteStageQuests(
        numberObj.id,
        route.id,
        stageIdx,
        stageObj.quests,
      )
      questTexts.forEach((questText, questIdx) => {
        pool.push({
          number:      Number(numberObj.id),
          numberLabel: numberObj.label,
          stage:       stageObj.stage,
          stageName:   stageObj.name,
          routeId:     route.id,
          routeName:   route.name,
          classNoun:   route.classNoun || route.name,
          questText,
          questIdx,
          stageIdx,
          priority:    priority + (isNextTier ? 10 : 0),
        })
      })
    })
  }

  // ── 2 CLASS / SKILL quests from loadout (or blueprint Discovery) ───────────
  const skillPool = []

  if (filledSlots.length) {
    filledSlots.forEach((slot, slotIdx) => {
      const numberObj = NUMBERS.find((n) => Number(n.id) === slot.number)
      if (!numberObj) return
      const numProgress = skillProgress[numberObj.id] || { activeRoutes: [], routes: {} }
      const route = numberObj.routes?.find((r) => r.id === slot.routeId)
      pushRouteQuests(skillPool, numberObj, route, numProgress, { priority: 20 - slotIdx })
    })
  } else {
    // Discovery: prefer seals with activeRoutes[0], then primary route
    const pdLike = user?.lifeNodes?.length
      ? Object.fromEntries(user.lifeNodes.map((n) => [n.key, { root: n.root }]))
      : null
    const eligible = pdLike ? getEligibleSeals(pdLike, freqLevel) : new Set()
    const withActive = []
    const withoutActive = []
    NUMBERS.forEach((numberObj) => {
      if (eligible.size && !eligible.has(Number(numberObj.id))) return
      const numProgress = skillProgress[numberObj.id] || { activeRoutes: [], routes: {} }
      const hasActive = Array.isArray(numProgress.activeRoutes) && numProgress.activeRoutes.length > 0
      const routeId = getPrimaryRouteId(numProgress, numberObj.id)
      const route = numberObj.routes?.find((r) => r.id === routeId) || numberObj.routes?.[0]
      const entry = { numberObj, route, numProgress, hasActive }
      if (hasActive) withActive.push(entry)
      else withoutActive.push(entry)
    })
    ;[...withActive, ...withoutActive].forEach(({ numberObj, route, numProgress }) => {
      pushRouteQuests(skillPool, numberObj, route, numProgress, {
        priority: (skillProgress[numberObj.id]?.activeRoutes || []).length ? 5 : 0,
      })
    })
  }

  // Prefer high-priority (next unfinished tier on loadout), then shuffle within band
  skillPool.sort((a, b) => b.priority - a.priority)
  const topPri = skillPool[0]?.priority ?? 0
  const high = skillPool.filter((q) => q.priority >= topPri - 5)
  const low = skillPool.filter((q) => q.priority < topPri - 5)
  const skillPicked = [..._shuffle(high), ..._shuffle(low)].slice(0, 2)

  const skillQuests = skillPicked.map(q => {
    const id = `skill-${q.number}-${q.routeId}-${q.stage}-${q.questIdx}-${today}`
    return {
    id,
    title:       q.questText,
    number:      q.number,
    numberLabel: q.numberLabel,
    stage:       q.stage,
    stageIdx:    q.stageIdx,
    stageName:   q.stageName,
    routeId:     q.routeId,
    routeName:   q.routeName,
    classNoun:   q.classNoun,
    category:    categoryForQuest(q.number, id),
    discovery:   loadoutEmpty,
    source:      'skill',
    type:        'skilltree',
    difficulty:  q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard',
    rewardXP:    (() => { const base = q.stage === 1 ? 5 : q.stage === 2 ? 10 : 20; const diff = q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard'; return Math.round(base * (DIFFICULTY_MULTIPLIER[diff] || 1.0)) })(),
    skillMeta:   {
      ...resolveSkillMeta({ root: q.number, stageIdx: q.stageIdx, questKind: 'skill' }),
      preferredRouteId: q.routeId,
    },
    completed:   false,
    isNew:       true,
    isRepeated:  false,
  }
  })

  // ── 2 LIFE / BLUEPRINT quests — prefer loadout seal roots ──────────────────
  const lqp = getLQP()
  const lifePool = []
  const unlockedLifeNodes = (lifeNodes || []).filter((node) => {
    const unlock = BLUEPRINT_UNLOCK_LV[node.key] ?? 0
    return freqLevel >= unlock
  })
  for (const node of unlockedLifeNodes) {
    const tier     = activeTierFor(node.key)
    const objs     = getTieredObjectiveTexts(node.root, tier)
    const progress = lqp?.[node.key]?.[tier] || []
    objs.forEach((text, i) => {
      if (!progress[i]) lifePool.push({ questKey: node.key, root: node.root, tier, objIdx: i, text })
    })
  }

  const loadoutSealSet = new Set(filledSlots.map((s) => s.number))
  const lifePreferred = loadoutSealSet.size
    ? lifePool.filter((c) => loadoutSealSet.has(skillTreeNumber(c.root)))
    : []
  const lifeOther = loadoutSealSet.size
    ? lifePool.filter((c) => !loadoutSealSet.has(skillTreeNumber(c.root)))
    : lifePool
  const lifePicked = [
    ..._shuffle(lifePreferred),
    ..._shuffle(lifeOther),
  ].slice(0, 2)

  const multiDayStarts = []
  const lifeQuests = lifePicked.map(c => {
    const diff = c.tier === 3 ? 'hard' : c.tier === 2 ? 'medium' : 'easy'
    const seal = skillTreeNumber(c.root)
    const equippedRoute = filledSlots.find((s) => s.number === seal)
    const routeDef = equippedRoute ? getRouteDef(equippedRoute.number, equippedRoute.routeId) : null
    const id = `life-${c.questKey}-${c.tier}-${c.objIdx}-${today}`
    const flavoredTitle = pickClassFlavoredObjective(c.text, {
      classNoun: routeDef?.classNoun,
      kind: 'life',
      seed: (c.objIdx + 1) * (seal || 1) + (cycleNumber || 0),
    })
    const quest = {
      id,
      title:     flavoredTitle,
      number:    c.root,
      source:    'life',
      type:      'objective',
      difficulty: diff,
      category:  categoryForQuest(c.root, id),
      rewardXP:  Math.round(BASE_XP[diff] * (DIFFICULTY_MULTIPLIER[diff] || 1.0)),
      routeId:   equippedRoute?.routeId || null,
      routeName: routeDef?.name || null,
      classNoun: routeDef?.classNoun || routeDef?.name || null,
      classFlavored: !!(equippedRoute && flavoredTitle !== c.text),
      skillMeta: {
        ...resolveSkillMeta({ root: c.root, tier: c.tier, questKind: 'life' }),
        preferredRouteId: equippedRoute?.routeId || null,
      },
      completed: false,
      isNew:     false,
      isRepeated:false,
      lqpMeta:   { questKey: c.questKey, tier: c.tier, objIdx: c.objIdx },
      supportsClass: !!equippedRoute,
    }
    const multi = detectMultiDay(c.text)
    if (multi) {
      quest.multiDay = { totalDays: multi.totalDays }
      multiDayStarts.push(quest)
    }
    return quest
  })

  // ── 2 CURRENT quests (personal year + personal month cycle objectives) ────
  const blueprintKey = user?.blueprintKey || 'cl'
  const monthLqpTier = activeTierFor(blueprintKey)

  const cyclePool = []
  const cycleTypes = [
    { type: 'personalYear',  root: cycleRoots.personalYear  },
    { type: 'personalMonth', root: cycleRoots.personalMonth },
    { type: 'personalDay',   root: cycleRoots.personalDay   },
  ]
  for (const { type, root } of cycleTypes) {
    if (!root) continue
    const objs = getCycleObjectives(type, root, 1, type === 'personalMonth' ? monthLqpTier : null)
    objs.forEach((o, i) => cyclePool.push({ type, root, text: o.text, idx: i }))
  }

  const cyclePicked = _shuffle(cyclePool).slice(0, 2)
  const cycleQuests = cyclePicked.map(c => {
    const seal = skillTreeNumber(c.root)
    const equippedRoute = filledSlots.find((s) => s.number === seal)
    const routeDef = equippedRoute ? getRouteDef(equippedRoute.number, equippedRoute.routeId) : null
    const id = `current-${c.type}-${c.root}-${c.idx}-${today}`
    const flavoredTitle = pickClassFlavoredObjective(c.text, {
      classNoun: routeDef?.classNoun,
      kind: 'current',
      seed: (c.idx + 3) * (seal || 1) + (cycleNumber || 0) * 2,
    })
    return {
      id,
      title:       flavoredTitle,
      number:      c.root,
      cycleType:   c.type,
      source:      'current',
      type:        'cycle',
      difficulty:  'easy',
      category:    categoryForQuest(c.root, id),
      rewardXP:    Math.round(BASE_XP.easy * (DIFFICULTY_MULTIPLIER['easy'] || 1.0)),
      routeId:     equippedRoute?.routeId || null,
      routeName:   routeDef?.name || null,
      classNoun:   routeDef?.classNoun || routeDef?.name || null,
      classFlavored: !!(equippedRoute && flavoredTitle !== c.text),
      skillMeta:   {
        ...resolveSkillMeta({ root: c.root, questKind: 'cycle' }),
        preferredRouteId: equippedRoute?.routeId || null,
      },
      supportsClass: !!equippedRoute,
      completed:   false,
      isNew:       false,
      isRepeated:  false,
    }
  })

  const quests = [...skillQuests, ...lifeQuests, ...cycleQuests]

  // Fallback: if pools were small and we got fewer than 6, fill from remaining skill quests
  if (quests.length < 6) {
    const remainingSkill = _shuffle(skillPool).filter(
      sq => !skillPicked.some(sp =>
        sp.questText === sq.questText && sp.routeId === sq.routeId && sp.number === sq.number
      )
    )
    const needed = 6 - quests.length
    const fillers = remainingSkill.slice(0, needed).map(q => {
      const id = `skill-${q.number}-${q.routeId}-${q.stage}-${q.questIdx}-${today}`
      return {
      id,
      title:       q.questText,
      number:      q.number,
      numberLabel: q.numberLabel,
      stage:       q.stage,
      stageIdx:    q.stageIdx,
      stageName:   q.stageName,
      routeId:     q.routeId,
      routeName:   q.routeName,
      classNoun:   q.classNoun,
      category:    categoryForQuest(q.number, id),
      discovery:   loadoutEmpty,
      source:      'skill',
      type:        'skilltree',
      difficulty:  q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard',
      rewardXP:    (() => { const base = q.stage === 1 ? 5 : q.stage === 2 ? 10 : 20; const diff = q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard'; return Math.round(base * (DIFFICULTY_MULTIPLIER[diff] || 1.0)) })(),
      completed:   false,
      isNew:       true,
      isRepeated:  false,
      skillMeta:   {
        ...resolveSkillMeta({ root: q.number, stageIdx: q.stageIdx, questKind: 'skill' }),
        preferredRouteId: q.routeId,
      },
    }
    })
    quests.push(...fillers)
  }

  const record = {
    date: today,
    quests,
    cycleLabel: CYCLE_MODIFIERS?.[cycleNumber]?.label || '',
    cycleNumber,
    loadoutEmpty,
  }
  persistGenQuests(record)
  dispatch('scl:gen_quests_updated', { quests })

  multiDayStarts.forEach((quest) => {
    try { beginMultiDayQuest(quest) } catch { /* intentional */ }
  })

  return quests
}

// ── Read today's quests ───────────────────────────────────────────────────────
/**
 * Returns the stored quest array for today, or null if none generated yet.
 */

function persistGenQuests(raw) {
  try { localStorage.setItem(LS_GEN_QUESTS, JSON.stringify(raw)) } catch { /* intentional */ }
  try { window.NativeAuth?.saveGenQuests?.(JSON.stringify(raw)) } catch { /* intentional */ }
}

/** Merge remote gen quests over local — never empty over non-empty same-day set. */
export function hydrateGenQuestsFromCloud(cb) {
  const apply = (remoteRaw) => {
    try {
      const remote = typeof remoteRaw === 'string' ? JSON.parse(remoteRaw || '{}') : (remoteRaw || {})
      const local = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || 'null')
      const today = todayStr()
      const remoteOk = remote && remote.date === today && Array.isArray(remote.quests) && remote.quests.length
      const localOk = local && local.date === today && Array.isArray(local.quests) && local.quests.length
      if (!remoteOk && localOk) {
        try { window.NativeAuth?.saveGenQuests?.(JSON.stringify(local)) } catch { /* intentional */ }
        cb?.(local)
        return
      }
      if (remoteOk) {
        const rDone = remote.quests.filter(q => q.completed).length
        const lDone = localOk ? local.quests.filter(q => q.completed).length : 0
        const chosen = (localOk && lDone > rDone) ? local : remote
        persistGenQuests(chosen)
        cb?.(chosen)
        return
      }
      cb?.(localOk ? local : null)
    } catch { cb?.(null) }
  }
  if (window.NativeAuth?.loadGenQuests) {
    window.NativeAuth.loadGenQuests((json) => apply(json))
  } else {
    apply('{}')
  }
}

export function getGeneratedQuests() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || 'null')
    if (raw && raw.date === todayStr()) {
      const quests = (raw.quests || []).map(q => {
        if (q?.multiDay?.totalDays) return q
        const multiDay = detectMultiDay(q?.title || '')
        return multiDay ? { ...q, multiDay } : q
      })
      return { quests, cycleLabel: raw.cycleLabel || '', cycleNumber: raw.cycleNumber || null }
    }
  } catch {}
  return null
}

// ── Journal prompts ───────────────────────────────────────────────────────────
export const JOURNAL_PROMPTS = {
  1: [
    'What did you begin today, and what resistance came up as you started?',
    'What did you initiate? What were you tempted to wait for instead?',
    'What did taking the lead feel like? Where did you hold back?',
  ],
  2: [
    'What did you notice in the exchange today? What were you tempted to avoid saying?',
    'How did you show up for someone else — and how did you show up for yourself?',
    'What needed harmony today, and how did you meet it?',
  ],
  3: [
    'What came out of you that surprised you? What did you still hold back?',
    'What did you express, and what did it feel like to let it out?',
    'What was it like to share — to put something of yours into the world?',
  ],
  4: [
    'What structure did you build or hold today? Where did discipline slip?',
    'What did showing up feel like — the moment before, and the moment after?',
    'What does consistency actually mean for you right now?',
  ],
  5: [
    'What shifted in you when you chose the unfamiliar path?',
    'What were you tempted to avoid? What did meeting it reveal?',
    'What changed in your perspective today?',
  ],
  6: [
    'What did giving feel like today — natural, forced, easy, or hard?',
    'Where did you care for something beyond yourself? What arose in you?',
    'What does real service feel like, versus performance?',
  ],
  7: [
    'What did you discover in the quiet today? What surfaced when you stopped filling the space?',
    'What did you understand today that you didn\'t understand before?',
    'What truth are you sitting with right now?',
  ],
  8: [
    'What did full ownership feel like? Where did you step forward, where did you retreat?',
    'What result did you create, and what did it actually take?',
    'What does your authority feel like from the inside?',
  ],
  9: [
    'What did you release? What still wants to cling on?',
    'What became complete today? What did completion feel like?',
    'What did you give that had nothing to do with receiving?',
  ],
  objective: [
    'What shifted in you as a result of this? Be specific.',
    'What did this require of you that you didn\'t expect?',
    'What would you tell someone just beginning this tier?',
  ],
}

export function getJournalPrompt(number, type, questId) {
  const pool = type === 'objective'
    ? JOURNAL_PROMPTS.objective
    : (JOURNAL_PROMPTS[number] || JOURNAL_PROMPTS[1])
  const idx = questId ? questId.charCodeAt(0) % pool.length : 0
  return pool[idx]
}

// ── Multi-day detection ───────────────────────────────────────────────────────
export function detectMultiDay(text) {
  const m = text.match(/(\d+)\s+consecutive\s+days?/i) || text.match(/(\d+)\s+days\b/i)
  return m ? { totalDays: parseInt(m[1]) } : null
}

// ── Reflection storage ────────────────────────────────────────────────────────
export function saveGenReflection(questId, text, meta) {
  try {
    const store = JSON.parse(localStorage.getItem('scl_reflections') || '{}')
    store['gen_' + questId] = {
      text: text.trim(),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      questTitle: meta.title || '',
      number:     meta.number || null,
      archetype:  NUMBER_INFO[meta.number]?.archetype || '',
      questType:  meta.type || '',
      tier:       meta.lqpMeta?.tier  || null,
      questKey:   meta.lqpMeta?.questKey || null,
      completedAt: Date.now(),
    }
    localStorage.setItem('scl_reflections', JSON.stringify(store))
  } catch {}
}

// ── Complete a single-day quest ───────────────────────────────────────────────
/**
 * Requires journalText (≥ 30 chars).
 * Returns { ok, xpAwarded?, error? }
 */
export function completeGeneratedQuest(questId, journalText) {
  const trimmed = (journalText || '').trim()
  if (trimmed.length < 30) {
    return { ok: false, error: `Write at least 30 characters (${trimmed.length}/30)` }
  }
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || 'null')
    if (!raw || raw.date !== todayStr()) return { ok: false, error: 'No active quests for today' }

    const quest = raw.quests.find(q => q.id === questId)
    if (!quest)          return { ok: false, error: 'Quest not found' }
    if (quest.completed) return { ok: false, error: 'Already completed' }

    if (quest.multiDay) {
      const active = getActiveMultiDayQuests()
      if (active[questId]) {
        return { ok: false, error: 'Multi-day commitment — use daily check-ins to progress' }
      }
      const beginResult = beginMultiDayQuest(quest)
      if (beginResult.ok) {
        saveGenReflection(questId, trimmed, quest)
        dispatch('scl:gen_quests_updated', { quests: raw.quests })
        return { ok: true, multiDayStarted: true }
      }
      return beginResult
    }

    quest.completed   = true
    quest.completedAt = Date.now()
    persistGenQuests(raw)

    // Load history once for all tracking below
    const history = loadQuestHistory()
    if (!quest.category) quest.category = categoryForQuest(quest.number, quest.id)

    const cycleMod = applyCycleXpMod(
      quest.rewardXP,
      raw.cycleNumber,
      quest.category,
      { ...history, difficulty: quest.difficulty },
    )
    const freqAward = cycleMod.xp
    earnFreqXP(freqAward)

    // ── Difficulty-scaled stat XP ──────────────────────────────────────────────
    let statXPAmount = statXPForDifficulty(quest.difficulty)

    // ── Focus streak bonus (skill / life / cycle focus; disabled in Cycle 5) ──
    const isFocusType = quest.type === 'skilltree'
      || quest.type === 'objective'
      || quest.source === 'skill'
      || quest.source === 'life'
    if (isFocusType && raw.cycleNumber !== 5) {
      const streak = _updateFocusStreak(history, quest.number)
      if (streak >= 3) {
        statXPAmount = Math.round(statXPAmount * 1.25)
        dispatch('scl:xp_toast', { msg: `◉ FOCUS STREAK ${streak}d · ×1.25 STAT XP`, color: 'var(--teal)' })
      }
    }

    const skillResult = applyQuestSkillReward({
      skillMeta: quest.skillMeta || resolveSkillMeta({
        root: quest.number,
        tier: quest.lqpMeta?.tier || (quest.stageIdx != null ? quest.stageIdx + 1 : 1),
        questKind: quest.type === 'skilltree' ? 'skill' : quest.source === 'life' ? 'life' : 'cycle',
        stageIdx: quest.stageIdx,
      }),
      difficulty: quest.difficulty,
      statXPAmount,
    }, earnStatXP, dispatch)

    if (quest.lqpMeta) {
      const { questKey, tier, objIdx } = quest.lqpMeta
      QuestEngine_markLQPObjective(questKey, tier, objIdx, { skipSkillReward: true })
    }

    // ── History + category affinity update ────────────────────────────────────
    if (quest.category !== 'objective') {
      history.lastActions    = [...history.lastActions, quest.category].slice(-20)
      history.completedTypes = [...new Set([...history.completedTypes, quest.category])]
      _updateCategoryAffinity(history, quest.number, quest.category)
    }

    saveHistory(history)

    // ── Daily Sweep bonus (all journal quests complete) ───────────────────────
    _checkDailySweep(raw)

    // Trigger achievements check after quest & sweep
    try {
      if (typeof window.checkAndAwardAchievements === 'function') {
        window.checkAndAwardAchievements({})
      }
    } catch {}

    saveGenReflection(questId, trimmed, quest)
    dispatch('scl:gen_quests_updated', { quests: raw.quests, completed: questId })

    updateDailySummary({
      xpEarned: freqAward,
      questsCompleted: 1,
    })
    try { recordDailySnapshot() } catch {}

    // ── Detailed reward summary toast ──────────────────────────────────────
    try {
      dispatch('scl:quest_reward', {
        freqXP: freqAward,
        statXP: statXPAmount,
        statNum: skillResult.meta?.number || skillTreeNumber(quest.number) || quest.number,
        difficulty: quest.difficulty,
        questTitle: quest.title,
        questNumber: quest.number,
        skillPipFilled: skillResult.pipFilled,
        skillStageName: skillResult.pipFilled ? ['Initiate', 'Consistency', 'Mastery'][skillResult.meta?.stageIdx] : null,
        cycleLabel: cycleMod.applied ? cycleMod.label : null,
        cycleMult: cycleMod.applied ? cycleMod.mult : null,
      })
      if (cycleMod.applied) {
        const pct = Math.round((cycleMod.mult - 1) * 100)
        const sign = pct >= 0 ? '+' : ''
        dispatch('scl:xp_toast', {
          msg: `${cycleMod.label} · ${sign}${pct}% XP`,
          color: pct >= 0 ? 'var(--gold)' : 'var(--rose)',
        })
      }
    } catch { /* intentional */ }

    return { ok: true, xpAwarded: freqAward, cycleMod }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// ── Expose for achievements
window.loadQuestHistory = loadQuestHistory
window.loadMultiDayQuests = getActiveMultiDayQuests
window.Achievements_statState = statState  // for achievements.js

// ── Multi-day quest persistence ───────────────────────────────────────────────
const LS_MULTIDAY = 'scl_multiday_quests'

export function getActiveMultiDayQuests() {
  try { return JSON.parse(localStorage.getItem(LS_MULTIDAY) || '{}') } catch { return {} }
}

function _saveMultiDay(map) {
  try { localStorage.setItem(LS_MULTIDAY, JSON.stringify(map)) } catch { /* intentional */ }
}

function _yesterdayStr() {
  const n = new Date()
  const y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1)
  return y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate()
}

/** Begin tracking a multi-day quest. Moves it from the daily slot into persistent storage. */
export function beginMultiDayQuest(quest) {
  if (!quest.multiDay) return { ok: false, error: 'Not a multi-day quest' }
  const map = getActiveMultiDayQuests()
  if (map[quest.id]) return { ok: false, error: 'Already tracking' }

  const today = todayStr()
  map[quest.id] = {
    ...quest,
    multiDay: { ...quest.multiDay, startDate: today, checkins: [today], streak: 1, maxStreak: 1 },
    completed: false,
  }
  _saveMultiDay(map)

  // Mark the daily slot quest as started so it no longer shows a BEGIN button
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || 'null')
    if (raw) {
      const q = raw.quests.find(x => x.id === quest.id)
      if (q) {
        if (!q.multiDay) q.multiDay = { totalDays: quest.multiDay?.totalDays || 0 }
        q.multiDay.started = true
        persistGenQuests(raw)
      }
    }
  } catch (e) { console.error('[beginMultiDay] Error:', e) }

  // Request notification permission if multi-day reminders are enabled (best-effort)
  try {
    if (getNotifPrefs().multiDayReminder && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch { /* intentional */ }

  dispatch('scl:gen_quests_updated', {})
  return { ok: true }
}

/** Record today's check-in. Returns progress info. */
export function checkinMultiDayQuest(questId) {
  const map = getActiveMultiDayQuests()
  const quest = map[questId]
  if (!quest)          return { ok: false, error: 'Quest not found' }
  if (quest.completed) return { ok: false, error: 'Already completed' }

  const today     = todayStr()
  const checkins  = quest.multiDay.checkins || []
  if (checkins.includes(today)) return { ok: false, error: 'Already checked in today' }

  const isConsecutive = checkins.includes(_yesterdayStr())
  const newStreak     = isConsecutive ? quest.multiDay.streak + 1 : 1
  const newMax        = Math.max(quest.multiDay.maxStreak, newStreak)
  const missedDay     = !isConsecutive && checkins.length > 0

  quest.multiDay.checkins  = [...checkins, today]
  quest.multiDay.streak    = newStreak
  quest.multiDay.maxStreak = newMax

  const daysLeft  = quest.multiDay.totalDays - quest.multiDay.checkins.length
  const isComplete = daysLeft <= 0

  earnFreqXP(10) // small daily check-in reward

  _saveMultiDay(map)
  dispatch('scl:gen_quests_updated', {})
  return { ok: true, daysLeft, streak: newStreak, isComplete, missedDay }
}

/** Complete a multi-day quest with journal reflection. Awards streak-scaled XP. */
export function completeMultiDayQuest(questId, journalText) {
  const trimmed = (journalText || '').trim()
  if (trimmed.length < 30) {
    return { ok: false, error: `Write at least 30 characters (${trimmed.length}/30)` }
  }

  const map   = getActiveMultiDayQuests()
  const quest = map[questId]
  if (!quest)          return { ok: false, error: 'Quest not found' }
  if (quest.completed) return { ok: false, error: 'Already completed' }

  const { totalDays, maxStreak } = quest.multiDay
  const mult    = 1 + (maxStreak / totalDays)
  const finalXP = Math.round(quest.rewardXP * mult)

  quest.completed   = true
  quest.completedAt = Date.now()
  _saveMultiDay(map)

  earnFreqXP(finalXP)

  // ── Streak-scaled stat XP: base by difficulty + 1 per 7 clean days ──
  const baseStatXP  = statXPForDifficulty(quest.difficulty)
  const streakBonus = Math.floor(maxStreak / 7)
  const finalStatXP = baseStatXP + streakBonus

  applyQuestSkillReward({
    skillMeta: quest.skillMeta || resolveSkillMeta({ root: quest.number, tier: 3, questKind: 'multi' }),
    difficulty: quest.difficulty,
    statXPAmount: finalStatXP,
  }, earnStatXP, dispatch)

  if (quest.lqpMeta) {
    QuestEngine_markLQPObjective(quest.lqpMeta.questKey, quest.lqpMeta.tier, quest.lqpMeta.objIdx, { skipSkillReward: true })
  }

  if (quest.category !== 'objective') {
    const history = loadQuestHistory()
    history.lastActions    = [...history.lastActions, quest.category].slice(-20)
    history.completedTypes = [...new Set([...history.completedTypes, quest.category])]
    _updateCategoryAffinity(history, quest.number, quest.category)
    saveHistory(history)
  }

  saveGenReflection(questId + '_complete', trimmed, quest)
  dispatch('scl:xp_toast', { msg: `⚡ ${mult.toFixed(1)}× STREAK · +${finalXP} XP`, color: 'var(--gold)' })
  dispatch('scl:gen_quests_updated', {})

  updateDailySummary({
    xpEarned: finalXP,
    questsCompleted: 1,
  })
  try { recordDailySnapshot() } catch {}

  return { ok: true, xpAwarded: finalXP, multiplier: mult }
}

// ── Reminder banner helper ────────────────────────────────────────────────────
/** Returns any active multi-day quests that haven't been checked in today. */
export function getUncheckedMultiDayQuests() {
  const map   = getActiveMultiDayQuests()
  const today = todayStr()
  return Object.values(map).filter(q => !q.completed && !q.multiDay.checkins.includes(today))
}

// ── Cycle metadata helper ─────────────────────────────────────────────────────
export function getCycleInfo(cycleNumber) {
  const mod = CYCLE_MODIFIERS[cycleNumber]
  return mod ? { label: mod.label, rule: mod.rule } : null
}

// ── Re-roll system ────────────────────────────────────────────────────────────

/** Returns how many re-rolls have been used today */
export function getRerollCount() {
  try {
    const date = localStorage.getItem(LS_REROLL_DATE)
    if (date !== todayStr()) return 0
    return parseInt(localStorage.getItem(LS_REROLL_COUNT) || '0', 10)
  } catch { return 0 }
}

/** Returns remaining re-rolls available today */
export function getRerollsRemaining() {
  return Math.max(0, MAX_REROLLS_PER_DAY - getRerollCount())
}

/** Check if any generated quests are already completed */
export function hasCompletedQuests() {
  const gen = getGeneratedQuests()
  if (!gen || !gen.quests) return false
  return gen.quests.some(q => q.completed)
}

/**
 * Re-roll uncompleted quests with new ones.
 * Completed quests are preserved and cannot be re-rolled.
 */
export function rerollGeneratedQuests(userOrPlayerData) {
  const gen = getGeneratedQuests()
  if (!gen || !gen.quests) return { ok: false, error: 'No quests to re-roll' }

  if (hasCompletedQuests()) {
    return { ok: false, error: 'Cannot re-roll after completing quests' }
  }

  const remaining = getRerollsRemaining()
  if (remaining <= 0) {
    return { ok: false, error: `Re-roll limit reached (${MAX_REROLLS_PER_DAY}/day)` }
  }

  // Always normalize to buildQuestUserProfile so lifeNodes + cycleRoots exist
  let user = userOrPlayerData
  if (userOrPlayerData && !userOrPlayerData.lifeNodes) {
    user = buildQuestUserProfile(userOrPlayerData)
  }
  if (!user) return { ok: false, error: 'No player profile for re-roll' }

  try {
    localStorage.setItem(LS_REROLL_DATE, todayStr())
    localStorage.setItem(LS_REROLL_COUNT, String(getRerollCount() + 1))
  } catch {}

  const completed = gen.quests.filter(q => q.completed)
  const newQuests = generateDailyQuests(user)
  if (!newQuests) return { ok: false, error: 'Failed to generate new quests' }

  const finalQuests = [...completed, ...newQuests]

  const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || '{}')
  raw.quests = finalQuests
  raw.rerolled = true
  persistGenQuests(raw)

  dispatch('scl:gen_quests_updated', { quests: finalQuests })

  return { ok: true, quests: finalQuests, remaining: getRerollsRemaining() }
}

/** Get difficulty metadata for UI display */
export function getDifficultyMeta(difficulty) {
  return DIFF_META[difficulty] || DIFF_META.medium
}

/** Calculate actual XP for a quest given its difficulty and base XP */
export function calcQuestXP(baseXP, difficulty) {
  const mult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0
  return Math.round(baseXP * mult)
}

/** Build user profile for generateDailyQuests from playerData. */
export function buildQuestUserProfile(playerData, statXP = {}) {
  if (!playerData) return null
  const { lp, ex, cl, so, ou, ac, th, m, d } = playerData
  const coreRoots = [lp.root, ex.root, cl.root, so.root, ou.root, ac.root, th.root]
    .map(r => reduceToSimple(r))
    .filter(r => r >= 1 && r <= 9)
  const counts = {}
  for (let i = 1; i <= 9; i++) counts[i] = 0
  coreRoots.forEach(n => counts[n]++)
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => counts[b] - counts[a])
  const pd = calcPersonalDay(m, d)
  const pm = calcPersonalMonth(m, d)
  const py = calcPersonalYear(m, d)

  let freqLevel = 1
  try {
    const xpState = JSON.parse(localStorage.getItem('scl_xp') || '{}')
    freqLevel = xpState.freqLevel || 1
  } catch {}

  return {
    dominantNumbers: sorted.filter(n => counts[n] >= 2).length
      ? sorted.filter(n => counts[n] >= 2) : sorted.slice(0, 2),
    weakerNumbers: sorted.filter(n => counts[n] === 0).length
      ? sorted.filter(n => counts[n] === 0) : sorted.slice(-2),
    outerNumber: reduceToSimple(ou.root),
    statXP,
    statValues: statXP,
    dayRoot: reduceToSimple(pd.root),
    cycleNumber: reduceToSimple(py.root),
    cycleRoots: {
      personalDay: pd.root,
      personalMonth: pm.root,
      personalYear: py.root,
    },
    bpRoots: coreRoots.filter((v, i, a) => a.indexOf(v) === i),
    lifeNodes: [
      { key: 'lp', root: lp.root },
      { key: 'ex', root: ex.root },
      { key: 'cl', root: cl.root },
      { key: 'so', root: so.root },
      { key: 'ou', root: ou.root },
      { key: 'ac', root: ac.root },
      { key: 'th', root: th.root },
    ],
    freqLevel,
    blueprintKey: resolveBlueprintNode(playerData, pd, pm, freqLevel),
  }
}

/** Generate today's quests if not already present. */
export function ensureDailyQuests(playerData) {
  if (!playerData) return null
  const existing = getGeneratedQuests()
  if (existing?.quests?.length) return existing.quests
  const user = buildQuestUserProfile(playerData)
  return generateDailyQuests(user)
}
