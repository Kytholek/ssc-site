/**
 * useQuestEngine — React hook for XP state + quest actions.
 * Reads from GameContext instead of window events.
 * Public API is identical to the previous version.
 */
import { useEffect, useCallback, useMemo } from 'react'
import { useGameState, useGameDispatch } from '../state/GameContext'
import { getCharBarPct, getFreqBarPct } from '../state/selectors'
import { ACTIONS } from '../state/actions'
import {
  getDailyQuestState, getFreqLog, getLQP, getAcceptedQuests, get30Day,
  getDailyGlyphsState, QuestEngine_completeDailyGlyph,
  MAX_LEVEL,
  QuestEngine_completeDailyQuest,
  QuestEngine_completeFreqQuest,
  QuestEngine_submitReflection,
  QuestEngine_start30Day, QuestEngine_checkin30Day, QuestEngine_complete30Day,
  acceptQuest, cancelSideQuest, completeSideQuest, updateSideQuestProgress,
  isFreqDone,
} from '../lib/questEngine.js'
import {
  getActiveMultiDayQuests,
  checkinMultiDayQuest,
  completeMultiDayQuest,
  completeGeneratedQuest as _completeGeneratedQuest,
} from '../lib/numerologyQuests'

export function useQuestEngine() {
  const state    = useGameState()
  const dispatch = useGameDispatch()

  // Auto-clear toast after 2.2 s
  useEffect(() => {
    if (!state.ui.toast) return
    const id = setTimeout(() => dispatch({ type: ACTIONS.CLEAR_TOAST }), 2200)
    return () => clearTimeout(id)
  }, [state.ui.toast, dispatch])

  // Auto-clear levelUp after 3.6 s
  useEffect(() => {
    if (!state.ui.levelUp) return
    const id = setTimeout(() => dispatch({ type: ACTIONS.CLEAR_LEVEL_UP }), 3600)
    return () => clearTimeout(id)
  }, [state.ui.levelUp, dispatch])

  // Derived XP bar percentages (via selectors)
  const charBarPct = getCharBarPct(state)
  const freqBarPct = getFreqBarPct(state)

  // ── Actions ────────────────────────────────────────────────
  const completeDailyQuest = useCallback((lpRoot) => {
    QuestEngine_completeDailyQuest(lpRoot)
    dispatch({ type: ACTIONS.REFRESH_DAILY, payload: getDailyQuestState() })
    dispatch({ type: ACTIONS.REFRESH_LQP,   payload: getLQP() })
  }, [dispatch])

  const completeFreqQuest = useCallback((key, xpAmt, rootNum) => {
    QuestEngine_completeFreqQuest(key, xpAmt, rootNum)
    dispatch({ type: ACTIONS.REFRESH_FREQ_LOG, payload: getFreqLog() })
    dispatch({ type: ACTIONS.REFRESH_LQP,      payload: getLQP() })
  }, [dispatch])

  const submitReflection = useCallback((key, xpAmt, rootNum, text) => {
    QuestEngine_submitReflection(key, xpAmt, rootNum, text)
    dispatch({ type: ACTIONS.REFRESH_FREQ_LOG, payload: getFreqLog() })
  }, [dispatch])

  const start30Day = useCallback((key) => {
    QuestEngine_start30Day(key)
    dispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
  }, [dispatch])

  const checkin30Day = useCallback((key) => {
    QuestEngine_checkin30Day(key)
    dispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
  }, [dispatch])

  const complete30Day = useCallback((key, xp, rootNum) => {
    QuestEngine_complete30Day(key, xp, rootNum)
    dispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
  }, [dispatch])

  const acceptQuestCb = useCallback((quest) => {
    const result = acceptQuest(quest)
    if (!result.ok && result.error) {
      dispatch({ type: ACTIONS.SET_TOAST, payload: { msg: result.error, color: 'gold' } })
      return
    }
    dispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
  }, [dispatch])

  const cancelSideQuestCb = useCallback((id) => {
    cancelSideQuest(id)
    dispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
  }, [dispatch])

  const completeSideQuestCb = useCallback((id, proof) => {
    const result = completeSideQuest(id, proof)
    if (!result?.ok) return result || { ok: false, error: 'Could not complete quest' }
    const updated = getAcceptedQuests()
    dispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: updated })

    // Award gift token every 10th completed quest
    const completedCount = Object.values(updated).filter(q => q.status === 'completed').length
    if (completedCount > 0 && completedCount % 10 === 0) {
      const tokens = parseInt(localStorage.getItem('scl_gift_tokens') || '0') + 1
      localStorage.setItem('scl_gift_tokens', String(tokens))
      dispatch({ type: ACTIONS.SET_TOAST, payload: {
        msg: '🎁 Quest milestone! You earned a Premium Gift Token.',
        color: 'gold'
      }})
    }
    return result
  }, [dispatch])

  const updateSideQuestProgressCb = useCallback((id, patch) => {
    const result = updateSideQuestProgress(id, patch)
    dispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
    return result
  }, [dispatch])

  const checkinMultiDayCb = useCallback((questId) => {
    return checkinMultiDayQuest(questId)
  }, [])

  const completeMultiDayCb = useCallback((questId, text) => {
    return completeMultiDayQuest(questId, text)
  }, [])

  const completeGeneratedQuestCb = useCallback((questId, text) => {
    return _completeGeneratedQuest(questId, text)
  }, [])

  const multiDayMap = useMemo(() => getActiveMultiDayQuests(), [state.quests.sideQuests])

  return {
    // State — matches old API shape
    xp: {
      charXP:    state.user.charXP,
      charLevel: state.user.charLevel,
      freqXP:    state.user.freqXP,
      freqLevel: state.user.freqLevel,
      statXP:    state.user.statXP,
      maxLevel:  MAX_LEVEL,
    },
    daily:      state.quests.daily,
    freqLog:    state.quests.freqLog,
    sideQuests: state.quests.sideQuests,
    lqp:        state.quests.lqp,
    toast:      state.ui.toast,
    levelUp:    state.ui.levelUp,
    charBarPct,
    freqBarPct,
    getDailyGlyphsState,
    completeDailyGlyph: QuestEngine_completeDailyGlyph,

    // Helpers
    isFreqDone,
    get30Day,

    // Actions
    completeDailyQuest,
    completeFreqQuest,
    submitReflection,
    start30Day,
    checkin30Day,
    complete30Day,
    acceptQuest:       acceptQuestCb,
    cancelSideQuest:   cancelSideQuestCb,
    completeSideQuest: completeSideQuestCb,
    updateSideQuestProgress: updateSideQuestProgressCb,
    checkinMultiDay:   checkinMultiDayCb,
    completeMultiDay:  completeMultiDayCb,
    completeGeneratedQuest: completeGeneratedQuestCb,
    multiDayMap,
  }
}
