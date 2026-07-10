import { CALLING } from './data'
import { fmt, todayStr } from './numerology'
import { getTieredObjectiveTexts, getTierObjectiveCount } from './objectives'
import { QuestEngine_isDailyGated } from './questEngine'
import { getGeneratedQuests } from './numerologyQuests'

function asArray(value) {
  if (Array.isArray(value)) return value
  return []
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return {}
}

function countCompleted(quests = []) {
  return asArray(quests).filter(q => q?.completed).length
}

function getUncheckedMultiDayFromMap(multiDayMap) {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

  return Object.values(asObject(multiDayMap)).filter((quest) => {
    if (!quest || quest.completed) return false
    const checkins = asArray(quest.multiDay?.checkins)
    return !checkins.includes(todayKey)
  })
}

function buildQuestHubData({
  playerData,
  daily,
  lqp,
  sideQuests,
  generatedState,
  multiDayMap,
}) {
  const cl = playerData?.cl || null
  const mainCalling = cl ? (CALLING?.[cl.root] || CALLING?.[9] || null) : null
  const lqpTier = (() => {
    if (!cl || !lqp || !lqp.cl) return 1
    for (let t = 1; t <= 3; t++) {
      const prog = asArray(lqp.cl[t])
      if (!prog.length) return t
      if (!prog.every(Boolean)) return t
    }
    return 3
  })()

  const generatedQuests = asArray(generatedState?.quests)
  const generatedActive = generatedQuests.filter(q => !q.completed)
  const generatedDone = countCompleted(generatedQuests)

  const multiDayQuests = Object.values(asObject(multiDayMap))
  const activeMultiDay = multiDayQuests.filter(q => !q.completed)
  const uncheckedMultiDay = getUncheckedMultiDayFromMap(multiDayMap)

  const acceptedSideQuests = Object.values(asObject(sideQuests))
  const activeSide = acceptedSideQuests.filter(q => q?.status === 'active')
  const completedSide = acceptedSideQuests.filter(q => q?.status === 'completed')

  const needsAttention = []
  if (daily && !daily.completed) {
    needsAttention.push({
      tone: 'gold',
      badge: 'Daily',
      status: 'Ready',
      title: daily.dayObj || 'Daily alignment ready',
      copy: 'Your personal-day quest is still open and ready to complete.',
      progressLabel: 'Core daily',
      progressValue: 0,
      progressMax: 1,
      metaItems: [
        { label: 'Type', value: 'Daily' },
        { label: 'Action', value: 'Complete on Home' },
      ],
      actionLabel: 'Open Home',
    })
  }

  uncheckedMultiDay.forEach((quest) => {
    const done = quest.multiDay?.checkins?.length || 0
    const total = quest.multiDay?.totalDays || 1
    needsAttention.push({
      tone: 'teal',
      badge: 'Check-In',
      status: 'Due',
      title: quest.title || 'Multi-day quest',
      copy: 'This commitment needs today’s check-in to keep its momentum alive.',
      progressLabel: `${done}/${total} days logged`,
      progressValue: done,
      progressMax: total,
      metaItems: [
        { label: 'Type', value: 'Multi-day' },
        { label: 'Streak', value: String(quest.multiDay?.streak || 0) },
      ],
      actionLabel: 'Open Home',
    })
  })

  if (!needsAttention.length) {
    needsAttention.push({
      tone: 'calm',
      badge: 'Clear',
      status: 'Stable',
      title: 'No urgent quest actions',
      copy: 'Your immediate quest queue is clear. This is a good time to continue a longer arc.',
      metaItems: [
        { label: 'Daily', value: daily?.completed ? 'Complete' : 'Open' },
        { label: 'Check-ins', value: 'None due' },
      ],
    })
  }

  const continueItems = []
  if (activeMultiDay.length) {
    continueItems.push({
      tone: 'teal',
      badge: 'Long Arc',
      status: `${activeMultiDay.length} active`,
      title: activeMultiDay.length === 1 ? activeMultiDay[0].title : `${activeMultiDay.length} multi-day quests in progress`,
      copy: 'These are your longer commitments. They need steady attention more than urgency.',
      progressLabel: 'Check-ins due today',
      progressValue: uncheckedMultiDay.length,
      progressMax: Math.max(activeMultiDay.length, 1),
      metaItems: [
        { label: 'Active', value: String(activeMultiDay.length) },
        { label: 'Due today', value: String(uncheckedMultiDay.length) },
      ],
      actionLabel: 'Open Home',
    })
  }

  if (generatedActive.length) {
    continueItems.push({
      tone: 'gold',
      badge: 'Daily Runes',
      status: `${generatedActive.length} open`,
      title: generatedActive.length === 1 ? generatedActive[0].title : `${generatedActive.length} generated quests still active`,
      copy: 'Your current rune pool still has unfinished opportunities available today.',
      progressLabel: 'Completed today',
      progressValue: generatedDone,
      progressMax: Math.max(generatedQuests.length, 1),
      metaItems: [
        { label: 'Open', value: String(generatedActive.length) },
        { label: 'Ignited', value: String(generatedDone) },
      ],
      actionLabel: 'Open Home',
    })
  }

  if (activeSide.length) {
    continueItems.push({
      tone: 'rose',
      badge: 'Side Quest',
      status: `${activeSide.length} active`,
      title: activeSide.length === 1 ? (activeSide[0].title || activeSide[0].questTitle || 'Accepted side quest') : `${activeSide.length} accepted side quests`,
      copy: 'Your world-layer quests are active and waiting in the current quest view.',
      progressLabel: 'Accepted vs completed',
      progressValue: activeSide.length,
      progressMax: Math.max(activeSide.length + completedSide.length, 1),
      metaItems: [
        { label: 'Active', value: String(activeSide.length) },
        { label: 'Completed', value: String(completedSide.length) },
      ],
      actionLabel: 'Open Current',
    })
  }

  if (!continueItems.length) {
    continueItems.push({
      tone: 'calm',
      badge: 'Open Space',
      status: 'Idle',
      title: 'No quests currently in progress',
      copy: 'You can pick up new momentum from Home, Life, or Journals whenever you are ready.',
      metaItems: [
        { label: 'Generated', value: String(generatedActive.length) },
        { label: 'Side', value: String(activeSide.length) },
      ],
    })
  }

  const mainQuest = cl && mainCalling ? {
    tone: 'main',
    badge: 'Main Quest',
    status: `Tier ${lqpTier}`,
    title: mainCalling.name,
    copy: mainCalling.essence,
    progressLabel: 'Current tier',
    progressValue: lqpTier,
    progressMax: 3,
    metaItems: [
      { label: 'Calling', value: fmt(cl.root, cl.compound) },
      { label: 'Arc', value: 'Life' },
    ],
    actionLabel: 'Open Life',
  } : null

  const dailyPulse = [
    {
      tone: 'daily',
      badge: 'Today',
      status: daily?.completed ? 'Complete' : 'Active',
      title: daily?.dayObj || 'Daily alignment',
      copy: daily?.completed
        ? 'Your core daily quest is done. You can still continue generated and long-form quests.'
        : 'Your core daily quest is active and ready for completion.',
      progressLabel: 'Generated quests completed',
      progressValue: generatedDone,
      progressMax: Math.max(generatedQuests.length, 1),
      metaItems: [
        { label: 'Daily', value: daily?.completed ? 'Done' : 'Open' },
        { label: 'Runes', value: `${generatedDone}/${generatedQuests.length}` },
      ],
      actionLabel: 'Open Home',
    },
    {
      tone: 'journal',
      badge: 'Reflect',
      status: 'History',
      title: 'Quest Journals',
      copy: 'Review completed reflections and patterns when you want context, continuity, or momentum.',
      metaItems: [
        { label: 'Best for', value: 'Review' },
        { label: 'Layer', value: 'Journal' },
      ],
      actionLabel: 'Open Journals',
    },
  ]

  return { needsAttention, continueItems, mainQuest, dailyPulse }
}

// ── Life Quest summaries (one card per node) ──────────────────────────────────
const LIFE_NODE_META = {
  so: { label: 'SOUL',    title: 'Soul Quest',        unlockLv: 0  },
  ou: { label: 'OUTER',   title: 'Outer Quest',       unlockLv: 0  },
  ex: { label: 'EXPR',    title: 'Expression Quest',  unlockLv: 10 },
  cl: { label: 'CALLING', title: 'Life Calling',      unlockLv: 15 },
  lp: { label: 'PATH',    title: 'Life Path Quest',   unlockLv: 10 },
  ac: { label: 'ACHIEVE', title: 'Achievement Quest', unlockLv: 5  },
  th: { label: 'THEME',   title: 'Theme Quest',       unlockLv: 20 },
}

const TIER_LABELS = { 1: 'Apprentice', 2: 'Adept', 3: 'Master' }

function countLifeMissionProgress(lqp, playerData) {
  const nodes = ['so', 'ou', 'ac', 'lp', 'ex', 'cl', 'th']
  let completed = 0
  let total = 0
  for (const key of nodes) {
    const root = playerData?.[key]?.root ?? 1
    for (let tier = 1; tier <= 3; tier++) {
      const tierCount = getTierObjectiveCount(root, tier) || 3
      total += tierCount
      const prog = lqp?.[key]?.[tier] || []
      for (let i = 0; i < tierCount; i++) {
        if (prog[i]) completed++
      }
    }
  }
  return { completed, total }
}

export function getLifeMissionTotals(lqp, playerData) {
  return countLifeMissionProgress(lqp, playerData)
}

/**
 * Build summary cards for all 7 Life quest nodes.
 */
function buildLifeQuestData({ playerData, lqp, freqLevel }) {
  if (!playerData) return []
  const { so, ou, ex, cl, lp, ac, th } = playerData
  const nodeMap = { so, ou, ex, cl, lp, ac, th }
  const cards = []

  for (const [key, numObj] of Object.entries(nodeMap)) {
    if (!numObj) continue
    const meta = LIFE_NODE_META[key]
    if (!meta) continue

    const lqpEntry = lqp?.[key]
    const activeTier = getActiveTier(lqpEntry)
    const totalObjectives = getTierObjectiveCount(numObj.root, activeTier) || 3
    const tierProgress = lqpEntry?.[activeTier]?.filter(Boolean).length || 0
    const locked = freqLevel < meta.unlockLv

    cards.push({
      id: `life-${key}`,
      type: 'life',
      category: locked ? 'locked' : activeTier < 3 ? 'in_progress' : 'main',
      nodeKey: key,
      title: meta.title,
      subtitle: locked ? `Unlocks at Freq LV ${meta.unlockLv}` : `Tier ${activeTier}: ${TIER_LABELS[activeTier]}`,
      progressLabel: locked ? 'Locked' : `${tierProgress}/${totalObjectives} objectives`,
      progressValue: locked ? 0 : tierProgress,
      progressMax: locked ? 1 : totalObjectives,
      urgency: locked ? 0 : activeTier === 1 ? 2 : 1,
      metaItems: [
        { label: 'Number', value: fmt(numObj.root, numObj.compound) },
        { label: 'Tier', value: locked ? '—' : `${activeTier}/3` },
      ],
      actionLabel: 'View Flow',
    })
  }

  return cards
}

// ── Current (Cycle) Quest summaries ──────────────────────────────────────────
/**
 * Build summary cards for active cycle quests (Year, 4-Month, Month, Day).
 */
function buildCurrentQuestData({ playerData, multiDayMap }) {
  if (!playerData) return []
  const cards = []

  // Active multi-day quests from the Current tab
  if (multiDayMap) {
    Object.values(multiDayMap).forEach(quest => {
      if (!quest || quest.completed) return
      const totalDays = quest.multiDay?.totalDays || 1
      const checkins = quest.multiDay?.checkins?.length || 0

      cards.push({
        id: `current-${quest.id}`,
        type: 'current',
        category: 'in_progress',
        title: quest.title || 'Cycle Quest',
        subtitle: `${checkins}/${totalDays} days checked in`,
        progressLabel: 'Progress',
        progressValue: checkins,
        progressMax: totalDays,
        urgency: checkins >= totalDays ? 3 : 2,
        metaItems: [
          { label: 'Type', value: 'Cycle' },
          { label: 'Streak', value: String(quest.multiDay?.streak || 0) },
        ],
        actionLabel: 'View Flow',
      })
    })
  }

  return cards
}

function getActiveTier(lqpEntry) {
  if (!lqpEntry) return 1
  for (let t = 1; t <= 3; t++) {
    const prog = lqpEntry[t] || []
    if (!prog.length) return t
    if (!prog.every(Boolean)) return t
  }
  return 3
}

// ── Objective Glyphs (individual objectives from all sources) ─────────────────
const LIFE_ICONS = { so: '💎', ou: '🎭', ex: '🔧', cl: '⭐', lp: '🛤️', ac: '🏆', th: '📜' }

/**
 * Build a flat array of objective-level glyph data from all quest sources.
 * Each glyph is a small actionable square in the Hub.
 */
export function buildObjectiveGlyphs({ playerData, lqp, freqLevel, multiDayMap, daily, generatedState, sideQuests, skillProgress, statValues, seeds }) {
  if (!playerData) return []
  const glyphs = []

  // ── Hero daily quest glyph ──
  if (daily) {
    glyphs.push({
      id: 'daily-hero',
      type: 'daily-hero',
      icon: daily.completed ? '✓' : '✦',
      source: 'TODAY',
      text: daily.dayObj || daily.blueprintLabel || 'Daily alignment',
      blueprintLabel: daily.blueprintLabel || null,
      done: !!daily.completed,
      locked: !daily.completed && QuestEngine_isDailyGated(),
      _urgency: daily.completed ? 0 : 4,
    })
  }

  // ── Life quest objectives (current tier only) ──
  const { so, ou, ex, cl, lp, ac, th } = playerData
  const lifeNodes = [
    { key: 'so', numObj: so, unlockLv: 0 },
    { key: 'ou', numObj: ou, unlockLv: 0 },
    { key: 'ac', numObj: ac, unlockLv: 5 },
    { key: 'lp', numObj: lp, unlockLv: 10 },
    { key: 'ex', numObj: ex, unlockLv: 10 },
    { key: 'cl', numObj: cl, unlockLv: 15 },
    { key: 'th', numObj: th, unlockLv: 20 },
  ]

  for (const node of lifeNodes) {
    if (!node.numObj) continue
    const locked = freqLevel < node.unlockLv
    const lqpEntry = lqp?.[node.key]
    const activeTier = getActiveTier(lqpEntry)
    const objectives = getTieredObjectiveTexts(node.numObj.root, activeTier)

    objectives.forEach((text, i) => {
      const isDone = !!lqpEntry?.[activeTier]?.[i]
      glyphs.push({
        id: `life-${node.key}-t${activeTier}-o${i}`,
        type: 'life',
        icon: LIFE_ICONS[node.key] || '✦',
        source: LIFE_NODE_META[node.key]?.label || node.key,
        text,
        nodeKey: node.key,
        tier: activeTier,
        objIdx: i,
        done: isDone,
        locked,
        _urgency: isDone ? 0 : locked ? 0 : 3,
      })
    })
  }

  // ── Multi-day quest check-ins ──
  if (multiDayMap) {
    const today = todayStr()
    Object.values(multiDayMap).forEach(quest => {
      if (!quest || quest.completed) return
      const checkins = quest.multiDay?.checkins || []
      const totalDays = quest.multiDay?.totalDays || 1
      const checkedInToday = checkins.includes(today)

      glyphs.push({
        id: quest.id,
        type: 'multi',
        icon: '◈',
        source: `${checkins.length}/${totalDays}d`,
        text: quest.title || 'Multi-day check-in',
        title: quest.title || 'Multi-day check-in',
        done: checkedInToday,
        locked: false,
        _urgency: checkedInToday ? 1 : 3,
        _multiQuest: quest,
      })
    })
  }

  // ── All generated quests (daily + skill + custom) — skip multi-day commitments already tracking ──
  if (generatedState?.quests) {
    generatedState.quests.filter(q => !q.completed && !q.multiDay?.started).forEach(quest => {
      glyphs.push({
        id: `gen-${quest.id}`,
        type: quest.type === 'daily' ? 'daily' : 'generated',
        icon: '⚡',
        source: quest.type?.toUpperCase() || 'QUEST',
        text: quest.title?.substring(0, 50) || 'Generated quest',
        done: false,
        locked: false,
        _urgency: 2,
        _genQuest: quest,
      })
    })
  }

  // ── Side quests (active) ──
  if (sideQuests) {
    Object.values(sideQuests).forEach(quest => {
      if (!quest || quest.status !== 'active') return
      glyphs.push({
        id: `side-${quest.id}`,
        type: 'side',
        icon: '◇',
        source: 'SIDE',
        text: (quest.title || 'Side quest').substring(0, 50),
        done: false,
        locked: false,
        _urgency: 2,
        _sideQuest: quest,
      })
    })
  }

  // Sort: un-locked & incomplete first, then by urgency
  glyphs.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.locked !== b.locked) return a.locked ? 1 : -1
    return (b._urgency || 0) - (a._urgency || 0)
  })

  return glyphs
}

function getQuestRoot(nodeKey, playerData) {
  const map = { so: 'so', ou: 'ou', ex: 'ex', cl: 'cl', lp: 'lp', ac: 'ac', th: 'th' }
  const numObj = playerData?.[map[nodeKey]]
  if (!numObj) return 1
  return numObj.root
}
