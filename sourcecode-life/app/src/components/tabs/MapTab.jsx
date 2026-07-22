/**
 * MapTab — Portal to the Simulation Matrix realm.
 *
 * The matrix rain canvas lives both on the portal background and as a
 * full-screen transition overlay that fires on ENTRY and EXIT.
 * The portal color scheme adapts to the active app theme.
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SimulationMatrix from '../realm/SimulationMatrix'

// ── Theme config ──────────────────────────────────────────────────────────────
const PORTAL_RAIN = {
  scifi:   { primary: [0,229,180],   accent: [240,192,96]  },
  diablo:  { primary: [220,30,30],   accent: [255,110,20]  },
  fantasy: { primary: [100,180,255], accent: [240,210,120] },
  unicorn: null,
}

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'scifi'
}

// ── Shared rain loop ──────────────────────────────────────────────────────────
function useMatrixRain(canvasRef, { speed = 0.5, fontSize = 13, theme = 'scifi' } = {}) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setSize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas)

    const CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const FS = fontSize
    const colors = PORTAL_RAIN[theme]
    let drops = Array.from({ length: Math.floor(canvas.width / FS) }, () => Math.random() * -60)
    let frame = 0

    function tick() {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const c = Math.floor(canvas.width / FS)
      if (drops.length !== c) drops = Array.from({ length: c }, () => Math.random() * -60)
      ctx.font = `${FS}px "Share Tech Mono",monospace`
      frame++
      for (let i = 0; i < drops.length; i++) {
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)]
        const a  = Math.random() > 0.05 ? 0.7 : 1
        let color
        if (!colors) {
          const hue = (i * 37 + frame * 1.5) % 360
          color = `hsla(${hue},100%,72%,${a})`
        } else {
          const [r, g, b] = Math.random() > 0.96 ? colors.accent : colors.primary
          color = `rgba(${r},${g},${b},${a})`
        }
        ctx.fillStyle = color
        ctx.fillText(ch, i * FS, drops[i] * FS)
        if (drops[i] * FS > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i] += speed
      }
    }
    const id = setInterval(tick, 40)
    return () => { clearInterval(id); ro.disconnect() }
  }, [canvasRef, speed, fontSize, theme])
}

// ── Full-screen transition overlay (pure CSS, no canvas) ───────────────────────
function MatrixOverlay({ direction, theme }) {
  return (
    <div className={`matrix-overlay matrix-overlay--${direction}`} />
  )
}

// ── Portal background rain ────────────────────────────────────────────────────
function PortalRain({ canvasRef, theme }) {
  useMatrixRain(canvasRef, { speed: 0.5, fontSize: 13, theme })
  return null
}

// ── MapTab ────────────────────────────────────────────────────────────────────
export default function MapTab() {
  const [phase, setPhase] = useState('portal')
  const [transitionDir, setTransitionDir] = useState(null)
  const [theme] = useState(() => getTheme())
  const canvasRef = useRef(null)

  // Drive all phase transitions through transitionDir so timers are
  // cancelled on unmount or if the user quickly re-taps.
  useEffect(() => {
    if (!transitionDir) return
    const nextPhase = transitionDir === 'in' ? 'realm' : 'portal'
    // Switch the underlying content at peak opacity (500ms)
    // then fade the overlay out. Total overlay life: 1200ms.
    const t1 = setTimeout(() => setPhase(nextPhase), 500)
    const t2 = setTimeout(() => setTransitionDir(null), 1250)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [transitionDir])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('scl-realm-open', phase === 'realm')
    return () => document.body.classList.remove('scl-realm-open')
  }, [phase])

  function handleEnter() {
    if (transitionDir) return
    setTransitionDir('in')
  }
  function handleExit() {
    if (transitionDir) return
    setTransitionDir('out')
  }

  const overlayLayer =
    typeof document !== 'undefined' && transitionDir
      ? createPortal(<MatrixOverlay direction={transitionDir} theme={theme} />, document.body)
      : null

  return (
    <>
      {/* Portal screen */}
      {(phase === 'portal' || phase === 'entering') && (
        <div className="portal-screen" data-portal-theme={theme}>
          <canvas ref={canvasRef} className="portal-canvas" />
          <PortalRain canvasRef={canvasRef} theme={theme} />
          <div className="portal-glow-bg" />
          <div className="portal-vignette" />
          <div className="portal-scanline" />

          <div className="portal-layout">
            <div className="portal-hint">A SEPARATE DIMENSION OF EXPERIENCE</div>

            <button
              className="portal-center portal-enter-btn"
              onClick={handleEnter}
              disabled={!!transitionDir}
            >
              <div className="portal-void" />
              <div className="portal-ripple portal-ripple--1" />
              <div className="portal-ripple portal-ripple--2" />
              <div className="portal-ripple portal-ripple--3" />
              <div className="portal-ring portal-ring--outer" />
              <div className="portal-ring portal-ring--mid" />
              <div className="portal-ring portal-ring--inner" />
              <div className="portal-content">
                <div className="portal-title">SIMULATION MATRIX</div>
                <div className="portal-divider" />
                <div className="portal-sub">ENTER REALM</div>
              </div>
            </button>
          </div>

          <div className="portal-corner portal-corner--tl" />
          <div className="portal-corner portal-corner--tr" />
          <div className="portal-corner portal-corner--bl" />
          <div className="portal-corner portal-corner--br" />
          <div className="portal-footer">MAP · SOCIAL · QUESTS · LEADERBOARD</div>
        </div>
      )}

      {phase === 'realm' && (
        <SimulationMatrix onExit={handleExit} inline />
      )}

      {overlayLayer}
    </>
  )
}
