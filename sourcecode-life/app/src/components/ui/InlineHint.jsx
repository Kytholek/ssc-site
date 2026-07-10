/**
 * InlineHint — tap-to-open tooltip popover (replaces alert() for XP hints)
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function InlineHint({ label, text }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="quest-xp-hint-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
      >
        ?
      </button>
      {open && createPortal(
        <div
          className="inline-hint-tooltip"
          role="tooltip"
          onClick={() => setOpen(false)}
        >
          <p className="inline-hint-tooltip-text">{text}</p>
          <div className="inline-hint-tooltip-hint">tap to close</div>
        </div>,
        document.body
      )}
    </>
  )
}
