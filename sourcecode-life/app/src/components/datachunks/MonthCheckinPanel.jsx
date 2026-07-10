import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function MonthCheckinPanel({
  open,
  monthTheme,
  monthRoot,
  objectives = [],
  color = 'var(--rose)',
  checkinCount = 0,
  tierDays = 7,
  streak = 0,
  onClose,
  onSubmit,
}) {
  const [text, setText] = useState('')
  const [objectiveIdx, setObjectiveIdx] = useState(0)
  const [error, setError] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    if (open) {
      setText('')
      setObjectiveIdx(0)
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
    if (trimmed.length < 20) {
      setError(`Minimum 20 characters (${trimmed.length}/20)`)
      return
    }
    const result = onSubmit(trimmed, objectiveIdx)
    if (result && result.ok === false) {
      setError(result.error)
      return
    }
    onClose()
  }

  return createPortal(
    <div
      className="quest-panel-overlay season-checkin-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="quest-panel season-checkin-panel"
        style={{ '--qp-color': color }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Month check-in"
      >
        <button
          className="quest-panel-close"
          onClick={onClose}
          aria-label="Close check-in panel"
        >
          ✕
        </button>

        <div className="quest-panel-header">
          <span className="quest-panel-num" style={{ color }} aria-hidden="true">
            {monthRoot || '◇'}
          </span>
          <div className="quest-panel-info">
            <span className="quest-panel-label" style={{ color }}>
              ◇ MONTH CHECK-IN
            </span>
            <span className="season-checkin-meta">
              Day {checkinCount + 1} of {tierDays} · streak {streak}/{tierDays}
            </span>
          </div>
        </div>

        <div className="quest-panel-text">
          <strong>{monthTheme || 'This Month'}</strong> — How has this energy shown up for you lately?
        </div>

        <div className="quest-panel-journal">
          {objectives.length > 0 && (
            <>
              <div className="quest-panel-prompt">
                Link to a month objective (optional):
              </div>
              <div className="season-checkin-objectives">
                {objectives.map((obj, idx) => (
                  <label
                    key={obj.id || idx}
                    className={`season-checkin-obj${objectiveIdx === idx ? ' season-checkin-obj--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="objective"
                      value={idx}
                      checked={objectiveIdx === idx}
                      onChange={() => setObjectiveIdx(idx)}
                    />
                    <span className="season-checkin-obj-num">{idx + 1}</span>
                    <span className="season-checkin-obj-text">{obj.text}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <textarea
            className="quest-panel-input"
            placeholder="What's alive in this month's theme for you right now?"
            value={text}
            onChange={(e) => { setText(e.target.value); setError('') }}
            rows={5}
            aria-label="Month check-in journal"
          />
          {error && <div className="quest-panel-error" role="alert">{error}</div>}

          <div className="quest-panel-foot">
            <span className="quest-panel-xp" style={{ color }}>+10 XP per check-in</span>
            <button className="quest-panel-submit" onClick={handleSubmit}>
              ▶ SUBMIT CHECK-IN
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
