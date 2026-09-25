/**
 * Client notification scheduler — polls while the portal tab is open.
 * Fires at most once per day per reminder type using localStorage markers.
 */

import { getNotifPrefs, getUncheckedMultiDayQuests } from './numerologyQuests'
import { todayStr } from './numerology'

const LS_FIRED = 'scl_notif_fired_v1'
const DEFAULT_DAILY_HOUR = 9
const DEFAULT_DAILY_MINUTE = 0
const TICK_MS = 60 * 1000

function loadFired() {
  try {
    return JSON.parse(localStorage.getItem(LS_FIRED) || '{}') || {}
  } catch {
    return {}
  }
}

function saveFired(map) {
  try { localStorage.setItem(LS_FIRED, JSON.stringify(map)) } catch { /* quota */ }
}

function send(title, body) {
  try {
    if (window.NativeNotif?.sendNow) {
      window.NativeNotif.sendNow(title, body)
      return
    }
  } catch { /* fall through */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    }
  } catch { /* intentional */ }
}

function permissionOk() {
  try {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  } catch {
    return false
  }
}

function pastDailyWindow(now, hour, minute) {
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= hour * 60 + minute
}

/**
 * Evaluate reminders once. Safe to call frequently.
 */
export function tickNotifScheduler({
  dailyHour = DEFAULT_DAILY_HOUR,
  dailyMinute = DEFAULT_DAILY_MINUTE,
} = {}) {
  if (!permissionOk()) return { fired: [] }

  const prefs = getNotifPrefs()
  const today = todayStr()
  const fired = loadFired()
  const now = new Date()
  const out = []

  if (prefs.dailyReminder && fired.daily !== today && pastDailyWindow(now, dailyHour, dailyMinute)) {
    send('Quest Journal ready', 'Your daily Alignment and class quests are waiting.')
    fired.daily = today
    out.push('daily')
  }

  if (prefs.multiDayReminder && fired.multiDay !== today && pastDailyWindow(now, dailyHour, dailyMinute)) {
    const unchecked = getUncheckedMultiDayQuests()
    if (unchecked.length) {
      const n = unchecked.length
      send(
        'Commitment check-in',
        n === 1
          ? 'You have an active multi-day commitment waiting for today’s check-in.'
          : `${n} commitments need a check-in to keep your streak.`,
      )
      fired.multiDay = today
      out.push('multiDay')
    }
  }

  if (out.length) saveFired(fired)
  return { fired: out }
}

let _timer = null
let _started = false

/** Start background polling (idempotent). */
export function startNotifScheduler() {
  if (_started || typeof window === 'undefined') return () => {}
  _started = true

  const run = () => {
    try { tickNotifScheduler() } catch { /* intentional */ }
  }

  // Delay first tick so auth/hydration can settle
  const boot = setTimeout(run, 8000)
  _timer = setInterval(run, TICK_MS)

  const onVis = () => {
    if (document.visibilityState === 'visible') run()
  }
  document.addEventListener('visibilitychange', onVis)

  const onPrefs = () => run()
  window.addEventListener('scl:notif_prefs_updated', onPrefs)

  return () => {
    _started = false
    clearTimeout(boot)
    if (_timer) clearInterval(_timer)
    _timer = null
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('scl:notif_prefs_updated', onPrefs)
  }
}
