/**
 * GettingStartedChecklist — collapsible first-time user guide on Home tab.
 * Items complete from real signals (daily quest done, Life Quests visited, Blueprint opened).
 */
import { useState, useEffect } from 'react'
import { useAppDispatch } from '../../context/AppContext'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import {
  isSpotlightTourComplete,
  loadChecklistDone,
  markChecklistItem,
} from '../../lib/tourStorage'

const LS_KEY = 'scl_getting_started_dismissed'
const LS_COLLAPSED = 'scl_getting_started_collapsed'

const ITEMS = [
  { id: 'quest', label: "Complete today's quest", tab: 'home' },
  { id: 'life', label: 'Explore Life Quest', tab: 'quests', section: 'life' },
  { id: 'blueprint', label: 'View your Blueprint', tab: 'profile', section: 'blueprint' },
]

export default function GettingStartedChecklist() {
  const dispatch = useAppDispatch()
  const { daily } = useQuestEngine()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === '1' } catch { return false }
  })
  const [done, setDone] = useState(() => loadChecklistDone())
  const doneCount = ITEMS.filter((i) => done[i.id]).length
  const [expanded, setExpanded] = useState(() => {
    try {
      if (localStorage.getItem(LS_COLLAPSED) === '1') return false
      const parsed = loadChecklistDone()
      return !ITEMS.some((i) => parsed[i.id])
    } catch { return true }
  })

  useEffect(() => {
    if (doneCount > 0 && expanded) {
      try { localStorage.setItem(LS_COLLAPSED, '1') } catch { /* ignore */ }
      setExpanded(false)
    }
  }, [doneCount, expanded])

  const [tourDone, setTourDone] = useState(() => isSpotlightTourComplete())

  useEffect(() => {
    if (tourDone) return
    const id = setInterval(() => {
      if (isSpotlightTourComplete()) setTourDone(true)
    }, 500)
    return () => clearInterval(id)
  }, [tourDone])

  // Sync when other tabs mark checklist items
  useEffect(() => {
    const onUpdate = (e) => setDone(e.detail || loadChecklistDone())
    window.addEventListener('scl:checklist_updated', onUpdate)
    return () => window.removeEventListener('scl:checklist_updated', onUpdate)
  }, [])

  // Real signal: today's personal-day quest completed
  useEffect(() => {
    if (!daily?.completed || done.quest) return
    setDone(markChecklistItem('quest'))
  }, [daily?.completed, done.quest])

  if (dismissed || !tourDone) return null

  function dismiss() {
    try { localStorage.setItem(LS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    try {
      localStorage.setItem(LS_COLLAPSED, next ? '0' : '1')
    } catch { /* ignore */ }
  }

  function navigate(item) {
    if (item.section) {
      dispatch({ type: 'SET_TAB', payload: item.tab, section: item.section })
    } else {
      dispatch({ type: 'SET_TAB', payload: item.tab })
    }
    // Do not mark complete on navigate — wait for real signals
  }

  const allDone = ITEMS.every((i) => done[i.id])

  return (
    <div className="home-onboarding getting-started-checklist" role="region" aria-label="Getting started">
      <div className="getting-started-header">
        <button
          type="button"
          className="getting-started-toggle"
          onClick={toggleExpanded}
          aria-expanded={expanded}
        >
          <span className="getting-started-title">GETTING STARTED</span>
          <span className="getting-started-progress">{doneCount}/{ITEMS.length} complete</span>
          <span className="getting-started-chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </button>
        <button type="button" className="getting-started-dismiss" onClick={dismiss} aria-label="Dismiss checklist">✕</button>
      </div>
      {expanded && (
        <>
          <ul className="getting-started-list">
            {ITEMS.map((item) => (
              <li key={item.id} className={`getting-started-item${done[item.id] ? ' getting-started-item--done' : ''}`}>
                <button type="button" className="getting-started-link" onClick={() => navigate(item)}>
                  <span className="getting-started-check" aria-hidden="true">{done[item.id] ? '✓' : '○'}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          {allDone && (
            <p className="getting-started-complete" role="status">You're all set — keep questing!</p>
          )}
        </>
      )}
    </div>
  )
}
