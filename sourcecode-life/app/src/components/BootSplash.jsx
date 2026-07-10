/**
 * BootSplash
 *
 * Animated terminal boot sequence.
 * Each line appears with a delay, then fades out and calls onComplete().
 * onComplete triggers NativeAuth.checkSession() or offline fallback in App.jsx.
 */
import { useEffect, useState, useRef } from 'react'
import OnboardingProgress from './ui/OnboardingProgress'

const BOOT_LINES = [
  'INITIALIZING SIMULATION ENGINE...',
  'LOADING NUMEROLOGY MATRIX...',
  'DECODING FREQUENCY SIGNATURE...',
  'CALIBRATING QUEST ENGINE...',
  'READY.',
]

const LINE_DELAY_MS = 220
const LAST_LINE_DELAY_MS = 300  // extra pause before fade
const FADE_OUT_MS = 500
const SVG_DURATION_MS = 1200  // time for SVG to fully animate

export default function BootSplash({ onComplete, restoring = false }) {
  const [visibleLines, setVisibleLines] = useState([])
  const [fadingOut, setFadingOut] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const indexRef = useRef(0)

  const canSkip = (() => {
    try { return localStorage.getItem('scl_boot_seen') === '1' } catch { return false }
  })()

  function finishBoot() {
    try { localStorage.setItem('scl_boot_seen', '1') } catch { /* ignore */ }
    onComplete()
  }

  function handleSkip() {
    setSkipped(true)
    setFadingOut(true)
    setTimeout(finishBoot, 200)
  }

  useEffect(() => {
    if (restoring || skipped) return
    function nextLine() {
      const i = indexRef.current
      if (i >= BOOT_LINES.length) {
        // All lines shown — begin fade-out
        setFadingOut(true)
        setTimeout(finishBoot, FADE_OUT_MS)
        return
      }
      setVisibleLines(prev => [...prev, BOOT_LINES[i]])
      indexRef.current = i + 1
      const isLast = indexRef.current === BOOT_LINES.length
      setTimeout(nextLine, isLast ? LAST_LINE_DELAY_MS + SVG_DURATION_MS : LINE_DELAY_MS)
    }

    const timer = setTimeout(nextLine, 300) // initial delay before first line
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoring, skipped])

  if (restoring) {
    return (
      <div className="boot-splash" aria-live="polite" aria-label="Restoring your character">
        <div className="boot-content">
          <div className="boot-lines" role="status">
            <div className="boot-line">&gt; RESTORING YOUR CHARACTER…</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`boot-splash${fadingOut ? ' boot-fade-out' : ''}`}
      aria-live="polite"
      aria-label="Loading…"
    >
      <div className="boot-content">
        <OnboardingProgress screen="boot" />
        <div className="boot-lines" role="log">
        {visibleLines.map((line, idx) => (
          <div key={idx} className="boot-line">&gt; {line}</div>
        ))}
      </div>
      {canSkip && !fadingOut && (
        <button type="button" className="boot-skip-btn" onClick={handleSkip}>Skip</button>
      )}
      <svg className="hp-codex-svg" viewBox="0 0 300 310" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <line className="hp-codex-line" x1="150" y1="40" x2="90" y2="100" style={{ animationDelay: '1.6s' }} />
        <line className="hp-codex-line" x1="150" y1="40" x2="210" y2="100" style={{ animationDelay: '1.7s' }} />
        <line className="hp-codex-line" x1="90" y1="100" x2="150" y2="160" style={{ animationDelay: '1.8s' }} />
        <line className="hp-codex-line" x1="210" y1="100" x2="150" y2="160" style={{ animationDelay: '1.8s' }} />
        <line className="hp-codex-line" x1="150" y1="160" x2="50" y2="160" style={{ animationDelay: '1.9s' }} />
        <line className="hp-codex-line" x1="150" y1="160" x2="250" y2="160" style={{ animationDelay: '1.9s' }} />
        <line className="hp-codex-line" x1="150" y1="160" x2="90" y2="220" style={{ animationDelay: '2s' }} />
        <line className="hp-codex-line" x1="150" y1="160" x2="210" y2="220" style={{ animationDelay: '2s' }} />
        <line className="hp-codex-line" x1="90" y1="220" x2="150" y2="270" style={{ animationDelay: '2.1s' }} />
        <line className="hp-codex-line" x1="210" y1="220" x2="150" y2="270" style={{ animationDelay: '2.1s' }} />

        <g fontSize="15" textAnchor="middle" dominantBaseline="middle">
          <g className="hp-codex-node" style={{ animationDelay: '2.2s', transformOrigin: '150px 40px' }}>
            <circle cx="150" cy="40" r="16" />
            <text x="150" y="40">2</text>
          </g>
          <g className="hp-codex-node" style={{ animationDelay: '2.3s', transformOrigin: '90px 100px' }}>
            <circle cx="90" cy="100" r="16" />
            <text x="90" y="100">1</text>
          </g>
          <g className="hp-codex-node" style={{ animationDelay: '2.3s', transformOrigin: '210px 100px' }}>
            <circle cx="210" cy="100" r="16" />
            <text x="210" y="100">3</text>
          </g>
          <g className="hp-codex-node" style={{ animationDelay: '2.4s', transformOrigin: '50px 160px' }}>
            <circle cx="50" cy="160" r="16" />
            <text x="50" y="160">4</text>
          </g>
          <g className="hp-codex-node hp-codex-node--center" style={{ animationDelay: '2.4s', transformOrigin: '150px 160px' }}>
            <circle cx="150" cy="160" r="18" />
            <text x="150" y="160">5</text>
          </g>
          <g className="hp-codex-node" style={{ animationDelay: '2.4s', transformOrigin: '250px 160px' }}>
            <circle cx="250" cy="160" r="16" />
            <text x="250" y="160">6</text>
          </g>
          <g className="hp-codex-node" style={{ animationDelay: '2.5s', transformOrigin: '90px 220px' }}>
            <circle cx="90" cy="220" r="16" />
            <text x="90" y="220">7</text>
          </g>
          <g className="hp-codex-node" style={{ animationDelay: '2.5s', transformOrigin: '210px 220px' }}>
            <circle cx="210" cy="220" r="16" />
            <text x="210" y="220">9</text>
          </g>
          <g className="hp-codex-node" style={{ animationDelay: '2.6s', transformOrigin: '150px 270px' }}>
            <circle cx="150" cy="270" r="16" />
            <text x="150" y="270">8</text>
          </g>
        </g>
      </svg>
      </div>
    </div>
  )
}
