/**
 * GettingStartedChecklist — collapsible first-time user guide on Home tab
 */
import { useState, useEffect } from 'react'
import { useAppDispatch } from '../../context/AppContext'
import { isSpotlightTourComplete } from '../../lib/tourStorage'

const LS_KEY = 'scl_getting_started_dismissed'
const LS_COLLAPSED = 'scl_getting_started_collapsed'

const ITEMS = [
  { id: 'quest', label: 'Complete today\'s quest', tab: 'quests', sub: 'hub' },
  { id: 'life', label: 'Explore Life Quest', tab: 'quests', sub: 'life' },
  { id: 'decode', label: 'View your Blueprint', tab: 'config', sub: 'blueprint' },
]

export default function GettingStartedChecklist() {
  const dispatch = useAppDispatch()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === '1' } catch { return false }
  })
  const [done, setDone] = useState(() => {
    try {
      const raw = localStorage.getItem('scl_checklist_done')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })
  const doneCount = ITEMS.filter((i) => done[i.id]).length
  const [expanded, setExpanded] = useState(() => {
    try {
      if (localStorage.getItem(LS_COLLAPSED) === '1') return false
      const raw = localStorage.getItem('scl_checklist_done')
      const parsed = raw ? JSON.parse(raw) : {}
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
    dispatch({ type: 'SET_TAB', payload: item.tab })
    if (item.sub) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('scl:open-sub-tab', {
          detail: { main: item.tab, sub: item.sub },
        }))
      }, 50)
    }
    const next = { ...done, [item.id]: true }
    setDone(next)
    try { localStorage.setItem('scl_checklist_done', JSON.stringify(next)) } catch { /* ignore */ }
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
