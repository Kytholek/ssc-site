/**
 * CoachMark — dismissible first-visit overlay hint
 */
import { useState, useEffect } from 'react'
import { isSpotlightTourComplete } from '../../lib/tourStorage'

export default function CoachMark({ storageKey, title, children, afterTour = false }) {
  const [tourReady, setTourReady] = useState(() => !afterTour || isSpotlightTourComplete())
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  useEffect(() => {
    if (!afterTour || tourReady) return
    const id = setInterval(() => {
      if (isSpotlightTourComplete()) setTourReady(true)
    }, 500)
    return () => clearInterval(id)
  }, [afterTour, tourReady])

  if (dismissed || !tourReady) return null

  function dismiss() {
    try { localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="coach-mark" role="note">
      <div className="coach-mark-header">
        <span className="coach-mark-title">{title}</span>
        <button type="button" className="coach-mark-dismiss" onClick={dismiss} aria-label="Dismiss tip">✕</button>
      </div>
      <div className="coach-mark-body">{children}</div>
    </div>
  )
}
