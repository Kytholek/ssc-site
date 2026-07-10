/**
 * TodayProgressChips — glyphs, streak, daily quest status for Home tab
 */
import { useState, useEffect } from 'react'
import { getCurrentStreak } from '../effects/StreakCalendar'
import { StreakBadge } from '../datachunks/dailyquests'

export default function TodayProgressChips({ glyphsDone = 0, glyphsTotal = 3, dailyComplete = false, className = '' }) {
  const [streak, setStreak] = useState(() => getCurrentStreak())

  useEffect(() => {
    const onUpdate = () => setStreak(getCurrentStreak())
    window.addEventListener('scl:streak_updated', onUpdate)
    window.addEventListener('scl:daily_glyphs_updated', onUpdate)
    return () => {
      window.removeEventListener('scl:streak_updated', onUpdate)
      window.removeEventListener('scl:daily_glyphs_updated', onUpdate)
    }
  }, [])

  return (
    <div className={`home-pulse-chips${className ? ` ${className}` : ''}`} role="group" aria-label="Today's progress">
      <span className={`home-pulse-chip${glyphsDone >= glyphsTotal ? ' home-pulse-chip--done' : ''}`}>
        <span aria-hidden="true">★</span>
        {glyphsDone}/{glyphsTotal} objectives
      </span>
      <StreakBadge streak={streak} compact />
      <span className={`home-pulse-chip${dailyComplete ? ' home-pulse-chip--done' : ' home-pulse-chip--muted'}`}>
        <span aria-hidden="true">{dailyComplete ? '✓' : '○'}</span>
        {dailyComplete ? 'Daily complete' : 'Daily pending'}
      </span>
    </div>
  )
}
