import { calcPersonalDay, calcPersonalMonth, reduceToSimple } from './numerology'
import {
  getDailySkillGlyph,
  getPersonalDayGlyphPool,
  getTieredObjectives,
} from './objectives'
import { getActiveTier, getLQP } from './questEngine'

const BLUEPRINT_NODES = ['lp', 'ex', 'cl', 'so', 'ou', 'ac', 'th']

export const BLUEPRINT_UNLOCK_LV = {
  so: 0,
  ou: 0,
  ac: 5,
  lp: 10,
  ex: 10,
  cl: 15,
  th: 20,
}

const TIER_LABELS = { 1: 'Apprentice', 2: 'Adept', 3: 'Master' }

function unlockedBlueprintKeys(playerData, freqLevel = 1) {
  if (!playerData) return []
  return BLUEPRINT_NODES.filter((key) => {
    const unlock = BLUEPRINT_UNLOCK_LV[key] ?? 0
    if (freqLevel < unlock) return false
    return !!playerData[key]
  })
}

/**
 * Find a blueprint node whose root matches the given frequency.
 * Returns null when no unlocked node shares that root.
 */
export function findBlueprintKeyByRoot(playerData, root, freqLevel = 1) {
  if (!playerData || root == null) return null
  const simple = reduceToSimple(root)
  for (const key of unlockedBlueprintKeys(playerData, freqLevel)) {
    if (reduceToSimple(playerData[key].root) === simple) return key
  }
  return null
}

/**
 * Pick blueprint node: personal day root → personal month root → cl (Life Calling).
 */
export function resolveBlueprintNode(playerData, pd, pm, freqLevel = 1) {
  if (!playerData) return 'cl'

  const simpleDay = reduceToSimple(pd.root)
  const simpleMonth = reduceToSimple(pm.root)
  const unlocked = unlockedBlueprintKeys(playerData, freqLevel)

  for (const key of unlocked) {
    if (reduceToSimple(playerData[key].root) === simpleDay) return key
  }
  for (const key of unlocked) {
    if (reduceToSimple(playerData[key].root) === simpleMonth) return key
  }
  if (unlocked.includes('cl')) return 'cl'
  return unlocked[0] || 'cl'
}

function pickFirstIncompleteObjective(questKey, tier, nodeRoot) {
  const lqp = getLQP()
  const progress = lqp?.[questKey]?.[tier] || []
  const objs = getTieredObjectives(nodeRoot, tier)
  for (let i = 0; i < objs.length; i++) {
    if (!progress[i]) {
      return { objIdx: i, text: objs[i].text, objective: objs[i] }
    }
  }
  const last = objs[objs.length - 1]
  return { objIdx: Math.max(0, objs.length - 1), text: last?.text || 'Live in alignment with today\'s frequency.', objective: last }
}

/**
 * Resolve daily blueprint: 2 personal-day glyphs + 1 skill glyph + hero LQP link.
 */
export function resolveDailyBlueprint(playerData, freqLevel = 1) {
  if (!playerData) return null

  const { m, d } = playerData
  const pd = calcPersonalDay(m, d)
  const pm = calcPersonalMonth(m, d)

  const questKey = resolveBlueprintNode(playerData, pd, pm, freqLevel)
  const tier = getActiveTier(questKey)
  const nodeRoot = playerData[questKey]?.root ?? pd.root

  const dayPool = getPersonalDayGlyphPool(pd.root)
  const dayGlyphs = dayPool.slice(0, 2).map((o) => ({
    id: o.id,
    text: o.text,
    duration: o.duration,
    icon: '★',
    slot: 'day',
  }))

  const skillGlyph = getDailySkillGlyph(pd.root)
    || (dayPool[2] ? {
      id: dayPool[2].id,
      text: dayPool[2].text,
      duration: dayPool[2].duration,
      icon: '◈',
      slot: 'skill',
      skillNumber: reduceToSimple(pd.root),
    } : null)

  const glyphs = []
  for (const g of dayGlyphs) glyphs.push(g)
  if (skillGlyph) glyphs.push(skillGlyph)
  while (glyphs.length < 3 && dayPool[glyphs.length]) {
    glyphs.push({
      id: dayPool[glyphs.length].id,
      text: dayPool[glyphs.length].text,
      duration: dayPool[glyphs.length].duration,
      icon: glyphs.length === 2 ? '◈' : '★',
      slot: glyphs.length === 2 ? 'skill' : 'day',
      skillNumber: glyphs.length === 2 ? reduceToSimple(pd.root) : undefined,
    })
  }

  const heroLink = pickFirstIncompleteObjective(questKey, tier, nodeRoot)
  const dayObjMeta = { questKey, tier, objIdx: heroLink.objIdx }
  const blueprintLabel = `${questKey.toUpperCase()} · ${TIER_LABELS[tier]} objective ${heroLink.objIdx + 1}`

  const dayRootMatch = reduceToSimple(nodeRoot) === reduceToSimple(pd.root)

  return {
    questKey,
    tier,
    objIdx: heroLink.objIdx,
    dayObj: heroLink.text,
    dayObjMeta,
    questRoot: nodeRoot,
    dayGlyphs,
    skillGlyph,
    glyphs,
    blueprintLabel,
    dayRootMatch,
    commitmentDays: null,
    pd,
    pm,
  }
}
