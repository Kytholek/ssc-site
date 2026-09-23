import {
  LEVEL_XP_TABLE,
  MAX_LEVEL,
  LS_CHAR_XP,
  LS_CHAR_LVL,
  LS_FREQ_XP,
  LS_FREQ_LVL,
  LS_STAT_XP,
  getXPState,
  getDailyQuestState,
  getFreqLog,
  getAcceptedQuests,
  getLQP,
} from '../lib/questEngine'
import { ACTIONS } from './actions'

/* ── helpers ─────────────────────────────────────────────────── */
function xpToLevel(xp) {
  let l = 1
  for (let i = 1; i <= MAX_LEVEL; i++) {
    if (xp >= LEVEL_XP_TABLE[i]) l = i
    else break
  }
  return Math.min(l, MAX_LEVEL)
}

function capXP(xp) {
  return Math.min(xp, LEVEL_XP_TABLE[MAX_LEVEL])
}

function saveCharXP(xp, level) {
  localStorage.setItem(LS_CHAR_XP,  String(xp))
  localStorage.setItem(LS_CHAR_LVL, String(level))
  // combined key read by getXPState
  const combined = JSON.parse(localStorage.getItem('scl_xp') || '{}')
  localStorage.setItem('scl_xp', JSON.stringify({ ...combined, charXP: xp, charLevel: level }))
}

function saveFreqXP(xp, level) {
  localStorage.setItem(LS_FREQ_XP,  String(xp))
  localStorage.setItem(LS_FREQ_LVL, String(level))
  const combined = JSON.parse(localStorage.getItem('scl_xp') || '{}')
  localStorage.setItem('scl_xp', JSON.stringify({ ...combined, freqXP: xp, freqLevel: level }))
}

function saveStatXP(statXP) {
  localStorage.setItem(LS_STAT_XP, JSON.stringify(statXP))
}

/* ── reducer ─────────────────────────────────────────────────── */
export function gameReducer(state, action) {
  switch (action.type) {

    /* ── XP ─────────────────────────────────────────────────── */
    case ACTIONS.EARN_CHAR_XP: {
      const { amount } = action.payload
      const newXP      = capXP(state.user.charXP + amount)
      const prevLevel  = state.user.charLevel
      const newLevel   = xpToLevel(newXP)
      saveCharXP(newXP, newLevel)
      return {
        ...state,
        user: { ...state.user, charXP: newXP, charLevel: newLevel },
        ui: {
          ...state.ui,
          levelUp: newLevel > prevLevel
            ? { track: 'CHARACTER', level: newLevel }
            : state.ui.levelUp,
        },
      }
    }

    case ACTIONS.EARN_FREQ_XP: {
      const { amount } = action.payload
      const newXP      = capXP(state.user.freqXP + amount)
      const prevLevel  = state.user.freqLevel
      const newLevel   = xpToLevel(newXP)
      saveFreqXP(newXP, newLevel)
      return {
        ...state,
        user: { ...state.user, freqXP: newXP, freqLevel: newLevel },
        ui: {
          ...state.ui,
          levelUp: newLevel > prevLevel
            ? { track: 'FREQUENCY', level: newLevel }
            : state.ui.levelUp,
        },
      }
    }

    case ACTIONS.EARN_STAT_XP: {
      const { statNum, amount } = action.payload
      const newStatXP = {
        ...state.user.statXP,
        [statNum]: (state.user.statXP[statNum] ?? 0) + amount,
      }
      saveStatXP(newStatXP)
      return { ...state, user: { ...state.user, statXP: newStatXP } }
    }

    /* ── Batch reward ───────────────────────────────────────── */
    case ACTIONS.APPLY_REWARDS: {
      const { charXP: cAmt = 0, freqXP: fAmt = 0, statXP: sMap = {}, lqpMeta } = action.payload
      let user = { ...state.user }
      let ui   = { ...state.ui }

      if (cAmt) {
        const newXP    = capXP(user.charXP + cAmt)
        const prevLvl  = user.charLevel
        const newLvl   = xpToLevel(newXP)
        saveCharXP(newXP, newLvl)
        user = { ...user, charXP: newXP, charLevel: newLvl }
        if (newLvl > prevLvl) ui = { ...ui, levelUp: { track: 'CHARACTER', level: newLvl } }
      }

      if (fAmt) {
        const newXP    = capXP(user.freqXP + fAmt)
        const prevLvl  = user.freqLevel
        const newLvl   = xpToLevel(newXP)
        saveFreqXP(newXP, newLvl)
        user = { ...user, freqXP: newXP, freqLevel: newLvl }
        if (newLvl > prevLvl) ui = { ...ui, levelUp: { track: 'FREQUENCY', level: newLvl } }
      }

      if (Object.keys(sMap).length) {
        const newStatXP = { ...user.statXP }
        for (const [k, v] of Object.entries(sMap)) {
          newStatXP[k] = (newStatXP[k] ?? 0) + v
        }
        saveStatXP(newStatXP)
        user = { ...user, statXP: newStatXP }
      }

      // lqpMeta handled by questEngine (Firestore + localStorage) before dispatching
      // we just surface it in state if the reducer needs it later
      const quests = lqpMeta
        ? { ...state.quests, lqp: { ...state.quests.lqp, ...lqpMeta } }
        : state.quests

      return { ...state, user, quests, ui }
    }

    /* ── Quest list refreshes ───────────────────────────────── */
    case ACTIONS.REFRESH_DAILY:
      return { ...state, quests: { ...state.quests, daily: action.payload } }

    case ACTIONS.REFRESH_FREQ_LOG:
      return { ...state, quests: { ...state.quests, freqLog: action.payload } }

    case ACTIONS.REFRESH_SIDE_QUESTS:
      return { ...state, quests: { ...state.quests, sideQuests: action.payload } }

    case ACTIONS.REFRESH_LQP:
      return { ...state, quests: { ...state.quests, lqp: action.payload } }

    /* ── UI ─────────────────────────────────────────────────── */
    case ACTIONS.SET_TOAST:
      return { ...state, ui: { ...state.ui, toast: action.payload } }

    case ACTIONS.CLEAR_TOAST:
      return { ...state, ui: { ...state.ui, toast: null } }

    case ACTIONS.SET_LEVEL_UP:
      return { ...state, ui: { ...state.ui, levelUp: action.payload } }

    case ACTIONS.CLEAR_LEVEL_UP:
      return { ...state, ui: { ...state.ui, levelUp: null } }

    /* ── Premium ────────────────────────────────────────────── */
    case ACTIONS.IS_PREMIUM:
      localStorage.setItem('scl_premium', '1')
      localStorage.removeItem('scl_premium_expires')
      return { ...state, user: { ...state.user, isPremium: true, premiumExpires: null } }

    case ACTIONS.REDEEM_GIFT_CODE: {
      const { daysGranted } = action.payload
      if (!daysGranted) {
        localStorage.setItem('scl_premium', '1')
        localStorage.removeItem('scl_premium_expires')
        return { ...state, user: { ...state.user, isPremium: true, premiumExpires: null } }
      }
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + daysGranted)
      const iso = expiry.toISOString()
      localStorage.setItem('scl_premium_expires', iso)
      return { ...state, user: { ...state.user, isPremium: true, premiumExpires: iso } }
    }

    /* ── Firestore sync ─────────────────────────────────────── */
    case ACTIONS.SYNC_FROM_FIRESTORE: {
      const { charXP, charLevel, freqXP, freqLevel, statXP, freqLog, lqp, sideQuests } = action.payload
      return {
        ...state,
        user: {
          ...state.user,
          charXP:    charXP    ?? state.user.charXP,
          charLevel: charLevel ?? state.user.charLevel,
          freqXP:    freqXP    ?? state.user.freqXP,
          freqLevel: freqLevel ?? state.user.freqLevel,
          statXP:    statXP    ?? state.user.statXP,
        },
        quests: {
          ...state.quests,
          freqLog:    freqLog    ?? state.quests.freqLog,
          lqp:        lqp        ?? state.quests.lqp,
          sideQuests: sideQuests ?? state.quests.sideQuests,
        },
      }
    }

    /* ── Full character reset ───────────────────────────────── */
    case ACTIONS.RESET_CHAR: {
      const freshXP = getXPState()
      return {
        user: {
          charXP:    freshXP.charXP,
          charLevel: freshXP.charLevel,
          freqXP:    freshXP.freqXP,
          freqLevel: freshXP.freqLevel,
          statXP:    freshXP.statXP,
        },
        quests: {
          daily:      getDailyQuestState(),
          freqLog:    getFreqLog(),
          sideQuests: getAcceptedQuests(),
          lqp:        getLQP(),
        },
        ui: { toast: null, levelUp: null },
      }
    }

    default:
      return state
  }
}
