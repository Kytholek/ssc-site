import { calcPersonalDay, calcPersonalYear, calcPersonalMonth, calcFourMonthCycle, reduceToSimple } from './numerology'
import { getCycleObjectives, getCommitmentObjective, TIER_COMMITMENT_DAYS } from './objectives'
import { resolveBlueprintNode } from './questBlueprint'
import {
  QuestEngine_completeFreqQuest,
  QuestEngine_markLQPObjective,
  getActiveTier,
  XP_AWARDS,
  earnStatXP,
} from './questEngine'
import { applyQuestSkillReward } from './skillQuestBridge'
import { beginMultiDayQuest, checkinMultiDayQuest, getActiveMultiDayQuests } from './numerologyQuests'

const MONTH_STATE_VERSION = 2

function getMonthStateKey(lpRoot, yearKey, monthNum) {
  return `scl_month_season_${lpRoot}_${yearKey}_${monthNum}`
}

function getSeasonMultiDayId(lpRoot, yearKey, monthNum) {
  return `season-month-${lpRoot}-${yearKey}-${monthNum}`
}

function getYearStateKey(lpRoot, yearKey) {
  return `scl_year_season_${lpRoot}_${yearKey}`
}

function getFourMonthStateKey(lpRoot, yearKey, cycleNum) {
  return `scl_fourmonth_season_${lpRoot}_${yearKey}_${cycleNum}`
}

function getTierDays(tier) {
  return TIER_COMMITMENT_DAYS[tier] || 7
}

function buildSeasonMultiDayQuest(state, lpRoot, yearKey, monthNum, lockedObj) {
  const id = getSeasonMultiDayId(lpRoot, yearKey, monthNum)
  const tierDays = lockedObj.commitmentDays || getTierDays(lockedObj.tierAtLock || 1)
  return {
    id,
    title: lockedObj.text,
    number: lockedObj.nodeRoot || 1,
    source: 'season',
    type: 'cycle',
    difficulty: lockedObj.tierAtLock === 3 ? 'hard' : lockedObj.tierAtLock === 2 ? 'medium' : 'easy',
    rewardXP: XP_AWARDS.personal_month,
    category: 'objective',
    completed: false,
    lqpMeta: {
      questKey: lockedObj.questKey,
      tier: lockedObj.tierAtLock,
      objIdx: lockedObj.objIdx ?? 2,
    },
    multiDay: {
      totalDays: tierDays,
      started: true,
    },
  }
}

function ensureSeasonMultiDayTracking(state, lpRoot, yearKey, monthNum) {
  if (!state.lockedObj || state.multiDayStarted) return
  const quest = buildSeasonMultiDayQuest(state, lpRoot, yearKey, monthNum, state.lockedObj)
  const map = getActiveMultiDayQuests()
  if (!map[quest.id]) {
    beginMultiDayQuest(quest)
  }
  state.multiDayStarted = true
  state.multiDayId = quest.id
  state.tierDays = quest.multiDay.totalDays
}

export function getMonthSeasonState(lpRoot, m, d, freqLevel = 1, playerData = null) {
  const pm = calcPersonalMonth(m, d)
  const py = calcPersonalYear(m, d)
  const pd = calcPersonalDay(m, d)
  const yearKey = py.cycleStartYear
  const monthNum = pm.monthNum
  const profile = playerData || window.__scl_playerData__

  const key = getMonthStateKey(lpRoot, yearKey, monthNum)
  let state = null
  try {
    state = JSON.parse(localStorage.getItem(key))
  } catch {}

  if (!state) {
    state = initMonthState(monthNum, yearKey)
  }

  if (!state.version || state.version < MONTH_STATE_VERSION) {
    state.version = MONTH_STATE_VERSION
    delete state.lockedObj
    state.multiDayStarted = false
    state.multiDayId = null
    state.tierDays = null
  }

  const questKey = profile ? resolveBlueprintNode(profile, pd, pm, freqLevel) : 'cl'
  const lqpTier = getActiveTier(questKey) || 1
  const nodeRoot = profile?.[questKey]?.root ?? pm.root

  const objs = getCycleObjectives('personalMonth', pm.root, freqLevel, lqpTier)
  state.objectives = objs.map(o => ({ id: o.id, text: o.text, duration: o.duration }))

  if (!state.lockedObj) {
    const commitment = getCommitmentObjective(nodeRoot, lqpTier)
    if (commitment) {
      state.lockedObj = {
        id: commitment.id,
        text: commitment.text,
        duration: commitment.duration,
        tierAtLock: lqpTier,
        objIdx: commitment.objIdx,
        commitmentDays: commitment.commitmentDays,
        questKey,
        nodeRoot,
      }
      state.tierDays = commitment.commitmentDays
      ensureSeasonMultiDayTracking(state, lpRoot, yearKey, monthNum)
      localStorage.setItem(key, JSON.stringify(state))
    }
  } else if (!state.multiDayStarted) {
    ensureSeasonMultiDayTracking(state, lpRoot, yearKey, monthNum)
    localStorage.setItem(key, JSON.stringify(state))
  }

  if (!state.tierDays) {
    state.tierDays = state.lockedObj?.commitmentDays || getTierDays(lqpTier)
  }

  return state
}

function initMonthState(monthNum, yearKey) {
  return {
    version: MONTH_STATE_VERSION,
    monthNum,
    yearKey,
    monthKey: `${yearKey}-${monthNum}`,
    objectives: [],
    checkins: [],
    completed: false,
    completedAt: null,
    startDate: new Date().toISOString().split('T')[0],
    multiDayStarted: false,
    multiDayId: null,
    tierDays: null,
  }
}

export function getMonthTierDays(lpRoot, m, d, freqLevel = 1) {
  const state = getMonthSeasonState(lpRoot, m, d, freqLevel)
  return state.tierDays || getTierDays(state.lockedObj?.tierAtLock || 1)
}

export function addMonthCheckin(lpRoot, m, d, journal, objectiveIdx) {
  const pm = calcPersonalMonth(m, d)
  const py = calcPersonalYear(m, d)
  const yearKey = py.cycleStartYear
  const monthNum = pm.monthNum

  const state = getMonthSeasonState(lpRoot, m, d)
  const today = new Date().toISOString().split('T')[0]
  const tierDays = state.tierDays || getTierDays(state.lockedObj?.tierAtLock || 1)

  if (state.checkins.some(c => c.date === today)) {
    return { ok: false, error: 'Already checked in today', checkinCount: state.checkins.length, daysActive: null, canComplete: false, tierDays }
  }

  if (state.checkins.length >= tierDays) {
    return { ok: false, error: `Max ${tierDays} check-ins reached`, checkinCount: state.checkins.length, daysActive: null, canComplete: false, tierDays }
  }

  state.checkins.push({ date: today, journal, objectiveIdx: objectiveIdx ?? null })

  if (state.multiDayId) {
    checkinMultiDayQuest(state.multiDayId)
  }

  const key = getMonthStateKey(lpRoot, yearKey, monthNum)
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}

  const daysActive = getDaysActive(state.startDate, today)
  const multiDay = state.multiDayId ? getActiveMultiDayQuests()[state.multiDayId] : null
  const streak = multiDay?.multiDay?.streak || state.checkins.length
  const canComplete = state.checkins.length >= tierDays && streak >= tierDays

  return { ok: true, checkinCount: state.checkins.length, daysActive, canComplete, tierDays, streak }
}

function getDaysActive(startDateStr, endDateStr) {
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  return Math.floor((end - start) / 86400000)
}

export function completeMonthSeason(lpRoot, m, d) {
  const pm = calcPersonalMonth(m, d)
  const py = calcPersonalYear(m, d)
  const yearKey = py.cycleStartYear
  const monthNum = pm.monthNum

  const state = getMonthSeasonState(lpRoot, m, d)
  const today = new Date().toISOString().split('T')[0]
  const tierDays = state.tierDays || getTierDays(state.lockedObj?.tierAtLock || 1)

  if (state.checkins.length < tierDays) {
    return { ok: false, error: `Need ${tierDays} check-ins first (${state.checkins.length}/${tierDays})` }
  }

  const multiDay = state.multiDayId ? getActiveMultiDayQuests()[state.multiDayId] : null
  const streak = multiDay?.multiDay?.streak || state.checkins.length
  if (streak < tierDays) {
    return { ok: false, error: `Need ${tierDays}-day consecutive streak (${streak}/${tierDays})` }
  }

  state.completed = true
  state.completedAt = new Date().toISOString()

  const key = getMonthStateKey(lpRoot, yearKey, monthNum)
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}

  const yearState = getYearSeasonState(lpRoot, m, d)
  if (!yearState.monthsCompleted.includes(monthNum)) {
    yearState.monthsCompleted.push(monthNum)
    const ykey = getYearStateKey(lpRoot, yearKey)
    try {
      localStorage.setItem(ykey, JSON.stringify(yearState))
    } catch {}
  }

  const root = reduceToSimple(pm.root)
  QuestEngine_completeFreqQuest(`month_${yearKey}_${monthNum}`, XP_AWARDS.personal_month, root)

  if (state.lockedObj) {
    const { tierAtLock, objIdx, questKey } = state.lockedObj
    const lqpKey = questKey || 'cl'

    QuestEngine_markLQPObjective(lqpKey, tierAtLock, objIdx ?? 2)
    applyQuestSkillReward({
      root: pm.root,
      tier: tierAtLock,
      questKind: 'season',
      difficulty: 'medium',
    }, earnStatXP, (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail: detail || null })))
  }

  return { ok: true }
}

export function getFourMonthSeasonState(lpRoot, m, d, freqLevel = 1) {
  const fmc = calcFourMonthCycle(m, d)
  const py = calcPersonalYear(m, d)
  const yearKey = py.cycleStartYear
  const key = getFourMonthStateKey(lpRoot, yearKey, fmc.cycleNum)

  let state = null
  try {
    state = JSON.parse(localStorage.getItem(key))
  } catch {}

  if (!state) {
    state = {
      cycleNum: fmc.cycleNum,
      yearKey,
      objectives: [],
      completed: false,
      completedAt: null,
      startDate: new Date().toISOString().split('T')[0],
    }
  }

  const objs = getCycleObjectives('fourMonthCycle', fmc.root, freqLevel)
  state.objectives = objs.map(o => ({ id: o.id, text: o.text, duration: o.duration }))

  return state
}

export function completeFourMonthSeason(lpRoot, m, d, pinnacleChapterIndex, pinnacleRoot) {
  const fmc = calcFourMonthCycle(m, d)
  const py = calcPersonalYear(m, d)
  const yearKey = py.cycleStartYear

  const state = getFourMonthSeasonState(lpRoot, m, d)
  if (state.completed) {
    return { ok: false, error: 'Already completed' }
  }

  state.completed = true
  state.completedAt = new Date().toISOString()

  const key = getFourMonthStateKey(lpRoot, yearKey, fmc.cycleNum)
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}

  const fmcKey = `fourmonth_${yearKey}_${fmc.cycleNum}`
  const root = reduceToSimple(fmc.root)

  QuestEngine_completeFreqQuest(fmcKey, XP_AWARDS.four_month, root, pinnacleChapterIndex, pinnacleRoot)

  return { ok: true }
}

export function getYearSeasonState(lpRoot, m, d) {
  const py = calcPersonalYear(m, d)
  const yearKey = py.cycleStartYear

  const key = getYearStateKey(lpRoot, yearKey)
  let state = null
  try {
    state = JSON.parse(localStorage.getItem(key))
  } catch {}

  if (!state) {
    state = {
      yearKey,
      monthsCompleted: [],
      journalDone: false,
      completedAt: null,
    }
  }

  return state
}

export function completeYearSeason(lpRoot, m, d, journal) {
  const py = calcPersonalYear(m, d)
  const yearKey = py.cycleStartYear

  const state = getYearSeasonState(lpRoot, m, d)

  if (state.monthsCompleted.length < 6) {
    return { ok: false, error: `Need 6 months (${state.monthsCompleted.length} complete)` }
  }

  if (state.journalDone) {
    return { ok: false, error: 'Year journal already completed' }
  }

  state.journalDone = true
  state.completedAt = new Date().toISOString()

  const key = getYearStateKey(lpRoot, yearKey)
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}

  const root = reduceToSimple(py.root)
  QuestEngine_completeFreqQuest(`year_${yearKey}`, XP_AWARDS.personal_year, root)

  return { ok: true }
}
