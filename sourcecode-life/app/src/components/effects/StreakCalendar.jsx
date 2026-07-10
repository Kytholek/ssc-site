/**
 * StreakCalendar — Visual calendar showing recent quest completion history
 */
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'scl_streak_history'

/**
 * Get or initialize the streak history (last 14 days)
 * Each entry: { date: 'YYYY-MM-DD', completed: bool, resonant: bool }
 */
function getStreakHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveStreakHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ensureHistory(history) {
  const today = formatDate(new Date())
  if (!history.length || history[history.length - 1].date !== today) {
    const newHistory = [...history]
    // Add today if missing
    newHistory.push({ date: today, completed: false, resonant: false })
    // Keep only last 14 entries
    return newHistory.slice(-14)
  }
  return history
}

/** Count consecutive completed days ending today (or yesterday if today not yet done). */
export function getCurrentStreak() {
  const history = ensureHistory(getStreakHistory())
  if (!history.length) return 0

  let streak = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].completed) {
      streak++
    } else if (i < history.length - 1) {
      break
    }
  }
  return streak
}

export function markDayCompleted(resonant = false) {
  const history = ensureHistory(getStreakHistory())
  const today = formatDate(new Date())
  const entry = history.find(h => h.date === today)
  if (entry) {
    entry.completed = true
    if (resonant) entry.resonant = true
  } else {
    history.push({ date: today, completed: true, resonant })
  }
  saveStreakHistory(history.slice(-14))
}

export default function StreakCalendar() {
  const [history, setHistory] = useState(() => ensureHistory(getStreakHistory()))

  useEffect(() => {
    function onUpdate() {
      setHistory(ensureHistory(getStreakHistory()))
    }
    window.addEventListener('scl:streak_updated', onUpdate)
    return () => window.removeEventListener('scl:streak_updated', onUpdate)
  }, [])

  const today = formatDate(new Date())
  const hasCompletions = history.some(h => h.completed)
  if (!hasCompletions) return null

  return (
    <div className="streak-calendar">
      <div className="streak-calendar-header">
        <span className="streak-calendar-title">◈ QUEST HISTORY</span>
      </div>
      <div className="streak-calendar-grid">
        {history.map(entry => {
          const isToday = entry.date === today
          const cls = [
            'streak-calendar-day',
            entry.completed ? (entry.resonant ? 'streak-calendar-day--resonant' : 'streak-calendar-day--filled') : '',
            isToday ? 'streak-calendar-day--today' : '',
          ].filter(Boolean).join(' ')
          const dayNum = new Date(entry.date + 'T00:00:00').getDate()
          return (
            <div key={entry.date} className={cls} title={entry.date}>
              {dayNum}
            </div>
          )
        })}
      </div>
    </div>
  )
}
