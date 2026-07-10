/**
 * dataHistory — Time-series tracking for XP, quest completions, and stats.
 *
 * Stores daily snapshots in localStorage under `scl_data_history`.
 * Keeps the last 90 days of data for charting.
 *
 * Each entry:
 * {
 *   date: "2026-4-9",
 *   charXP: 1200,
 *   charLevel: 5,
 *   freqXP: 800,
 *   freqLevel: 4,
 *   statXP: { "1": 10, "2": 5, ... },
 *   questsCompleted: 4,
 *   resonantQuests: 2,
 *   dailyXP: 150,        // XP earned that specific day
 *   lqpProgress: { ... } // snapshot of life quest progress
 * }
 */

import { todayStr } from './numerology'

const LS_KEY = 'scl_data_history'
const MAX_DAYS = 90

function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  try {
    // Keep only the last MAX_DAYS entries
    const trimmed = history.slice(-MAX_DAYS)
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed))
  } catch {}
}

/**
 * Update today's scl_daily_summary ledger (written on quest completions).
 */
export function updateDailySummary(delta = {}) {
  const today = todayStr()
  let summary = {}
  try {
    summary = JSON.parse(localStorage.getItem('scl_daily_summary') || '{}')
  } catch {}

  if (summary.date !== today) {
    summary = { date: today, xpEarned: 0, questsCompleted: 0, resonantCompletions: 0 }
  }

  if (delta.xpEarned) summary.xpEarned = (summary.xpEarned || 0) + delta.xpEarned
  if (delta.questsCompleted) summary.questsCompleted = (summary.questsCompleted || 0) + delta.questsCompleted
  if (delta.resonantCompletions) summary.resonantCompletions = (summary.resonantCompletions || 0) + delta.resonantCompletions

  try {
    localStorage.setItem('scl_daily_summary', JSON.stringify(summary))
  } catch {}
}

/**
 * Record today's snapshot. Called when a quest completes or on app mount.
 * Merges with existing entry if one already exists for today.
 */
export function recordDailySnapshot(overrides = {}) {
  const history = loadHistory()
  const today = todayStr()
  const existingIdx = history.findIndex(h => h.date === today)

  // Get current XP state from questEngine
  let charXP = 0, charLevel = 1, freqXP = 0, freqLevel = 1
  let statXP = {}
  try {
    const xpState = JSON.parse(localStorage.getItem('scl_xp') || '{}')
    charXP = xpState.charXP || 0
    charLevel = xpState.charLevel || 1
    freqXP = xpState.freqXP || 0
    freqLevel = xpState.freqLevel || 1
    statXP = xpState.statXP || {}
  } catch {}

  // Get daily summary
  let dailyXP = 0, questsCompleted = 0, resonantQuests = 0
  try {
    const summary = JSON.parse(localStorage.getItem('scl_daily_summary') || '{}')
    if (summary.date && summary.date === today) {
      dailyXP = summary.xpEarned || 0
      questsCompleted = summary.questsCompleted || 0
      resonantQuests = summary.resonantCompletions || 0
    }
  } catch {}

  // Get LQP
  let lqpProgress = {}
  try {
    lqpProgress = JSON.parse(localStorage.getItem('scl_lqp') || '{}')
  } catch {}

  const snapshot = {
    date: today,
    charXP,
    charLevel,
    freqXP,
    freqLevel,
    statXP,
    questsCompleted,
    resonantQuests,
    dailyXP,
    lqpProgress,
    ...overrides,
  }

  if (existingIdx >= 0) {
    history[existingIdx] = { ...history[existingIdx], ...snapshot }
  } else {
    history.push(snapshot)
  }

  saveHistory(history)
}

/** Get last N days of history (default 30) */
export function getDailyHistory(days = 30) {
  const history = loadHistory()
  return history.slice(-days)
}

/** Get XP trend for a specific stat number */
export function getStatXPTrend(statNum, days = 30) {
  const history = getDailyHistory(days)
  return history.map(h => ({
    date: h.date,
    xp: h.statXP?.[String(statNum)] || 0,
  }))
}

/** Get total XP trend over time */
export function getTotalXPTrend(days = 30) {
  const history = getDailyHistory(days)
  return history.map(h => ({
    date: h.date,
    charXP: h.charXP || 0,
    freqXP: h.freqXP || 0,
    dailyXP: h.dailyXP || 0,
  }))
}

/** Get quest completion trend */
export function getQuestCompletionTrend(days = 30) {
  const history = getDailyHistory(days)
  return history.map(h => ({
    date: h.date,
    completed: h.questsCompleted || 0,
    resonant: h.resonantQuests || 0,
  }))
}

/** Get LQP progress history */
export function getLQPProgress(days = 30) {
  const history = getDailyHistory(days)
  return history.filter(h => h.lqpProgress && Object.keys(h.lqpProgress).length > 0)
}

