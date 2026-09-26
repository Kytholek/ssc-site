/**
 * Client notification scheduler — polls while the portal tab is open.
 * Fires at most once per day per reminder type using localStorage markers.
 */

import { getNotifPrefs, getUncheckedMultiDayQuests } from './numerologyQuests'
import { calcPersonalDay, todayStr } from './numerology'
import { CYCLE_MEANINGS } from './data'

const LS_FIRED = 'scl_notif_fired_v1'
const LS_BIRTH = 'scl_birth_md'
const DEFAULT_DAILY_HOUR = 9
const DEFAULT_DAILY_MINUTE = 0
const TICK_MS = 60 * 1000
const BODY_MAX = 160

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

function cacheBirthMd(m, d) {
  if (m == null || d == null) return
  try { localStorage.setItem(LS_BIRTH, JSON.stringify({ m: Number(m), d: Number(d) })) } catch { /* quota */ }
}

function resolveBirthMd() {
  try {
    const pd = typeof window !== 'undefined' ? window.__scl_playerData__ : null
    if (pd?.m != null && pd?.d != null) {
      cacheBirthMd(pd.m, pd.d)
      return { m: Number(pd.m), d: Number(pd.d) }
    }
  } catch { /* intentional */ }
  try {
    const raw = JSON.parse(localStorage.getItem(LS_BIRTH) || 'null')
    if (raw?.m != null && raw?.d != null) return { m: Number(raw.m), d: Number(raw.d) }
  } catch { /* intentional */ }
  return null
}

function clipBody(text) {
  const s = String(text || '').trim()
  if (s.length <= BODY_MAX) return s
  return `${s.slice(0, BODY_MAX - 1).trimEnd()}…`
}

/** Build title/body from today's personal-day energy. */
export function buildDailyEnergyNotification(asOf = new Date()) {
  const birth = resolveBirthMd()
  if (!birth) {
    return {
      title: 'Quest Journal ready',
      body: 'Your daily Alignment and class quests are waiting.',
    }
  }

  const pd = calcPersonalDay(birth.m, birth.d, asOf)
  const meaning = CYCLE_MEANINGS.personalDay?.[pd.root] || {}
  const theme = meaning.theme || 'Daily Alignment'
  const summary = meaning.summary
    || `Personal day ${pd.root} — open your Quest Journal for today's alignment.`

  return {
    title: `Day ${pd.root} · ${theme}`,
    body: clipBody(summary),
    root: pd.root,
    theme,
  }
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

  // Keep birth date cached whenever player data is available
  try {
    const pd = window.__scl_playerData__
    if (pd?.m != null && pd?.d != null) cacheBirthMd(pd.m, pd.d)
  } catch { /* intentional */ }

  if (prefs.dailyReminder && fired.daily !== today && pastDailyWindow(now, dailyHour, dailyMinute)) {
    const energy = buildDailyEnergyNotification(now)
    send(energy.title, energy.body)
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
