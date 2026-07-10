import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function YearJournalPanel({ open, yearTheme, monthsCompleted, onClose, onSubmit }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    if (open) {
      setText('')
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (trimmed.length < 60) {
      setError(`Minimum 60 characters (${trimmed.length}/60)`)
      return
    }
    const result = onSubmit(trimmed)
    if (result && result.ok === false) {
      setError(result.error)
      return
    }
    onClose()
  }

  return createPortal(
    <div
      className="quest-panel-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="quest-panel"
        style={{ '--qp-color': 'var(--teal)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Year Journal"
      >
        <button
          className="quest-panel-close"
          onClick={onClose}
          aria-label="Close year journal"
        >
          ✕
        </button>

        <div className="quest-panel-header">
          <span className="quest-panel-label" style={{ color: 'var(--teal)' }}>
            ◎ YEAR JOURNAL
          </span>
        </div>

        <div className="quest-panel-text">
          {yearTheme}: A Year in Reflection
        </div>

        <div className="quest-panel-journal">
          <div className="quest-panel-prompt">
            You've completed {monthsCompleted.length} seasons. Now, reflect on the arc:
            <br />
            What did this year ask you to become? What did you release, and what did you build?
          </div>

          <textarea
            className="quest-panel-input"
            placeholder="Write freely. This is your record of transformation..."
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            rows={6}
          />
          {error && <div className="quest-panel-error" role="alert">{error}</div>}

          <div className="quest-panel-foot">
            <button className="quest-panel-submit" onClick={handleSubmit}>
              ▶ COMPLETE YEAR
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
