/**
 * NumerologySpiral — interactive life-path Time Spiral (Profile → SPIRAL).
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { calcPinnacles, calcFourMonthCycle, calcPersonalYear, reduceToSimple, dateAtAge } from '../../lib/numerology'
import { CYCLE_MEANINGS } from '../../lib/data'

const MAX_AGE = 90, MIN_ZOOM = 0.35, MAX_ZOOM = 4.0

function cycleHue(colors, root) {
  const key = reduceToSimple(root) || 1
  return colors.py[key - 1] !== undefined ? colors.py[key - 1] : 30
}

function n9Band(age) {
  const index = Math.min(Math.max(1, Math.floor(age / 9) + 1), 10)
  return { index, start: (index - 1) * 9, end: index === 10 ? 90 : index * 9 }
}

function pinnacleAtAge(pins, age) {
  return pins.find((p, i) => (
    i < 3 ? age >= p.startAge && age <= p.endAge : age >= p.startAge
  )) || pins[3]
}

const N9 = {
  1:  { theme: '9-Yr Cycle 1 (0-9) - The Awakening', summary: 'The foundational epoch. Character shaped, core beliefs form, earliest soul patterns established.' },
  2:  { theme: '9-Yr Cycle 2 (9-18) - The Learning', summary: 'School of life. Peer bonds, academic paths, emotional intelligence develop rapidly.' },
  3:  { theme: '9-Yr Cycle 3 (18-27) - The Expression', summary: 'Break free and experiment. Careers, relationships, philosophies tested.' },
  4:  { theme: '9-Yr Cycle 4 (27-36) - The Builder', summary: 'Lay the great structures of your life. Decisions here echo for decades.' },
  5:  { theme: '9-Yr Cycle 5 (36-45) - The Liberator', summary: 'Midlife shift. Old structures questioned. Authentic living becomes non-negotiable.' },
  6:  { theme: '9-Yr Cycle 6 (45-54) - The Nurturer', summary: 'Contribution beyond self. Mentoring and giving back define this epoch.' },
  7:  { theme: '9-Yr Cycle 7 (54-63) - The Sage', summary: 'The great inward journey. Experience crystallises into wisdom.' },
  8:  { theme: '9-Yr Cycle 8 (63-72) - The Authority', summary: 'Harvest of a lifetime\'s work. Authority and legacy reach fullest expression.' },
  9:  { theme: '9-Yr Cycle 9 (72-81) - The Elder', summary: 'The great rounding-off. Wisdom becomes compassion.' },
  10: { theme: '9-Yr Cycle 10 (81-90) - The Transcendent', summary: 'Beyond cycles - a state of pure presence. Every moment complete.' },
}

function ageToSpiral(age, zoom, cx, cy, radius) {
  const t = (age / MAX_AGE) * 7 * 2 * Math.PI
  const r = (age / MAX_AGE) * radius * zoom
  return { x: cx + r * Math.cos(t - Math.PI / 2), y: cy + r * Math.sin(t - Math.PI / 2), r, t }
}

const THEMES = {
  scifi:   { py: [0,30,60,120,180,210,270,300,340], fm: '#00c8ff', n9: '#1D9E75', pin: '#f472b6', spine: 'rgba(0,200,255,0.25)', spineGlow: 'rgba(0,200,255,0.12)', tick: '#5DCAA5' },
  fantasy: { py: [0,30,60,120,180,210,270,300,340], fm: '#c9a84c', n9: '#1D9E75', pin: '#f472b6', spine: 'rgba(201,168,76,0.25)', spineGlow: 'rgba(201,168,76,0.12)', tick: '#e6c55d' },
  diablo:  { py: [0,15,30,0,345,330,315,300,285],  fm: '#c81c06', n9: '#D4537E', pin: '#ff6600', spine: 'rgba(200,28,6,0.25)',  spineGlow: 'rgba(200,28,6,0.12)',  tick: '#e65040' },
  unicorn: { py: [270,285,300,315,330,345,0,15,30], fm: '#a78bfa', n9: '#f472b6', pin: '#7c3aed', spine: 'rgba(167,139,250,0.25)', spineGlow: 'rgba(167,139,250,0.12)', tick: '#c4b5fd' },
}

export default function NumerologySpiral() {
  const { playerData } = useAppState()
  const dispatch = useAppDispatch()
  const canvasRef = useRef(null)
  const bgRef = useRef(null)
  const wrapRef = useRef(null)
  const [pinnedAge, setPinnedAge] = useState(null)
  const [hoverAge, setHoverAge] = useState(null)
  const [scrubberVal, setScrubberVal] = useState(null)
  const scrubberValRef = useRef(null)
  const scrubbingRef = useRef(false)

  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const zoomTargetRef = useRef(1)
  const dragRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const starsRef = useRef([])
  const particlesRef = useRef([])
  const animFrameRef = useRef(0)
  const bgTRef = useRef(0)
  const drawStartRef = useRef(Date.now())
  const pinchRef = useRef(null)
  const lastTapRef = useRef(0)
  const tapStartRef = useRef({ x: 0, y: 0 })
  const animStateRef = useRef(false)
  const nowFracRef = useRef(0)
  const pinnaclesRef = useRef([])
  const colorsRef = useRef(THEMES.scifi)
  const sizeRef = useRef({ W: 640, H: 600, radius: 250 })
  const pinnedAgeRef = useRef(null)
  const hoverAgeRef = useRef(null)
  const pauseAnimRef = useRef(false)
  const canvasSizeDrawnRef = useRef({ W: 0, H: 0 })

  pinnedAgeRef.current = pinnedAge
  hoverAgeRef.current = hoverAge
  pauseAnimRef.current = pinnedAge !== null

  const m = playerData?.m
  const d = playerData?.d
  const y = playerData?.y
  const hasBirth = !!(m && d && y)
  const lp = playerData?.lp?.root || 9
  const theme = playerData?.theme || 'scifi'
  const colors = THEMES[theme] || THEMES.scifi
  colorsRef.current = colors

  const nowFrac = useMemo(() => {
    if (!hasBirth) return 0
    const bd = new Date(y, m - 1, d), now = new Date()
    let age = now.getFullYear() - bd.getFullYear()
    const md = now.getMonth() - bd.getMonth()
    if (md < 0 || (md === 0 && now.getDate() < bd.getDate())) age--
    const last = new Date(now.getFullYear() - (md < 0 || (md === 0 && now.getDate() < bd.getDate()) ? 1 : 0), m - 1, d)
    const next = new Date(last.getFullYear() + 1, m - 1, d)
    return Math.max(0, age + (now - last) / (next - last))
  }, [hasBirth, m, d, y])
  nowFracRef.current = nowFrac

  const pinnacles = useMemo(
    () => (hasBirth ? calcPinnacles(m, d, y, { root: lp }) : []),
    [hasBirth, m, d, y, lp]
  )
  pinnaclesRef.current = pinnacles

  const yearCycles = useMemo(() => {
    if (!hasBirth) return []
    const years = []
    for (let yr = 0; yr < MAX_AGE; yr++) {
      const py = calcPersonalYear(m, d, dateAtAge(m, d, y, yr + 0.5)).root
      const segs = [0, 1, 2].map((seg) =>
        calcFourMonthCycle(m, d, dateAtAge(m, d, y, yr + (seg + 0.5) / 3))
      )
      years.push({ py, segs })
    }
    return years
  }, [hasBirth, m, d, y])
  const yearCyclesRef = useRef(yearCycles)
  yearCyclesRef.current = yearCycles

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !hasBirth) return
    const updateH = () => {
      const W = wrap.clientWidth || 640
      const H = Math.max(320, wrap.clientHeight || 600)
      sizeRef.current = { W, H, radius: Math.min(W, H) * 0.46 }
    }
    const ro = new ResizeObserver(() => updateH())
    ro.observe(wrap)
    updateH()
    return () => ro.disconnect()
  }, [hasBirth])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) pauseAnimRef.current = true
      else pauseAnimRef.current = pinnedAgeRef.current !== null
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (!hasBirth) return
    zoomTargetRef.current = 1.35
    const t = setTimeout(() => { zoomTargetRef.current = 1 }, 900)
    return () => clearTimeout(t)
  }, [hasBirth])

  useEffect(() => {
    if (!hasBirth) return
    const canvas = canvasRef.current
    const bg = bgRef.current
    const wrap = wrapRef.current
    if (!canvas || !bg || !wrap) return

    starsRef.current = []
    particlesRef.current = []
    for (let i = 0; i < 200; i++) starsRef.current.push({
      x: Math.random() * 1200, y: Math.random() * 900,
      r: Math.random() * 1.4 + 0.2, a: Math.random() * 0.6 + 0.3,
      tw: Math.random() * Math.PI * 2, sp: 0.01 + Math.random() * 0.02
    })
    for (let i = 0; i < 55; i++) {
      const isThemed = i < 20
      particlesRef.current.push({
        age: Math.random() * MAX_AGE, speed: 0.002 + Math.random() * 0.004,
        size: 0.8 + Math.random() * 1.2, alpha: 0.2 + Math.random() * 0.3,
        color: isThemed ? 'theme' : 'white'
      })
    }
    drawStartRef.current = Date.now()

    function ensureCanvasSize(c, W, H) {
      if (c.width !== W || c.height !== H) {
        c.width = W
        c.height = H
      }
    }

    function spiralOrigin(W, H) {
      return { cx: W / 2 + panRef.current.x, cy: H / 2 + panRef.current.y }
    }

    function ageAtPoint(sx, sy, hitNow, hitMax, W, H, radius) {
      const { cx, cy } = spiralOrigin(W, H)
      const z = zoomRef.current
      const nowAge = nowFracRef.current
      const np = ageToSpiral(nowAge, z, cx, cy, radius)
      const nowDist = Math.hypot(np.x - sx, np.y - sy)
      // Only snap to NOW when the pointer is on the marker itself
      if (nowAge >= 0 && nowAge <= MAX_AGE && nowDist < hitNow) return nowAge

      let best = null, bestD = 99999
      for (let a = 0; a <= MAX_AGE; a += 0.25) {
        const p = ageToSpiral(a, z, cx, cy, radius)
        const dist = Math.hypot(p.x - sx, p.y - sy)
        if (dist < bestD) { bestD = dist; best = a }
      }
      return bestD < hitMax ? best : null
    }

    function drawBg(W, H, animateBg) {
      if (!bg || !bg.getContext) return
      if (animateBg) bgTRef.current += 0.012
      ensureCanvasSize(bg, W, H)
      const ctx = bg.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7)
      grad.addColorStop(0, '#0d0a1e'); grad.addColorStop(0.5, '#080616'); grad.addColorStop(1, '#030210')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
      const nebBase = [
        { bx: W * 0.2, by: H * 0.3, r: W * 0.3, c: 'rgba(80,40,160,0.12)' },
        { bx: W * 0.75, by: H * 0.6, r: W * 0.25, c: 'rgba(20,80,180,0.10)' },
        { bx: W * 0.15, by: H * 0.8, r: W * 0.22, c: 'rgba(200,120,40,0.08)' },
      ]
      for (let i = 0; i < nebBase.length; i++) {
        const b = nebBase[i]
        const drift = animateBg ? Math.sin(bgTRef.current * 0.01 + i) * 15 : 0
        const b_x = b.bx + drift
        const g = ctx.createRadialGradient(b_x, b.by, 0, b_x, b.by, b.r)
        g.addColorStop(0, b.c); g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b_x, b.by, b.r, 0, 2 * Math.PI); ctx.fill()
      }
      const stars = starsRef.current
      if (!stars) return
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]
        if (!s) continue
        const tw = animateBg ? Math.sin(bgTRef.current * s.sp + s.tw) * 0.3 + 0.7 : 0.85
        ctx.beginPath(); ctx.arc(s.x % W, s.y % H, s.r, 0, 2 * Math.PI)
        ctx.fillStyle = `rgba(255,255,255,${s.a * tw})`; ctx.fill()
      }
    }

    function draw(W, H, radius, animateParts) {
      if (!canvas || !canvas.getContext) return
      const zDiff = zoomTargetRef.current - zoomRef.current
      if (Math.abs(zDiff) > 0.001) zoomRef.current += zDiff * 0.12
      const z = zoomRef.current
      const elapsed = (Date.now() - drawStartRef.current) / 1800
      const prog = Math.min(elapsed, 1)

      ensureCanvasSize(canvas, W, H)
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      const { cx, cy } = spiralOrigin(W, H)

      function drawBand(as, ae, color, innerF, outerF) {
        const steps = Math.max(4, Math.ceil((ae - as) * 30))
        const out = [], inn = []
        for (let i = 0; i <= steps; i++) {
          const a = as + i * (ae - as) / steps; if (a > MAX_AGE) break
          const p = ageToSpiral(a, z, cx, cy, radius)
          out.push({ x: cx + p.r * outerF * Math.cos(p.t - Math.PI / 2), y: cy + p.r * outerF * Math.sin(p.t - Math.PI / 2) })
          inn.push({ x: cx + p.r * innerF * Math.cos(p.t - Math.PI / 2), y: cy + p.r * innerF * Math.sin(p.t - Math.PI / 2) })
        }
        if (out.length < 2) return
        ctx.beginPath(); ctx.moveTo(out[0].x, out[0].y)
        out.forEach(p => ctx.lineTo(p.x, p.y))
        inn.slice().reverse().forEach(p => ctx.lineTo(p.x, p.y))
        ctx.closePath(); ctx.fillStyle = color; ctx.fill()
      }

      const c = colorsRef.current
      for (let n = 0; n * 9 < MAX_AGE; n++) {
        const visEnd = Math.min(n * 9 + 9, MAX_AGE) * prog
        const visStart = n * 9
        if (visStart >= visEnd) continue
        drawBand(visStart, visEnd, n % 2 === 0 ? 'rgba(29,158,117,0.20)' : 'rgba(29,158,117,0.08)', 1.08, 1.18)
      }
      const pins = pinnaclesRef.current || []
      const pColors = ['rgba(212,83,126,0.25)', 'rgba(212,83,126,0.12)', 'rgba(212,83,126,0.25)', 'rgba(212,83,126,0.12)']
      for (let i = 0; i < pColors.length; i++) {
        const p = pins[i]; if (!p) continue
        const s = Math.max(0, p.startAge), e = Math.min(p.endAge || 99, MAX_AGE)
        if (s >= e || s >= MAX_AGE * prog) continue
        drawBand(s, Math.min(e, MAX_AGE * prog), pColors[i], 1.19, 1.3)
      }
      const cycles = yearCyclesRef.current || []
      for (let yr = 0; yr < MAX_AGE * prog; yr++) {
        const py2 = cycles[yr] ? cycles[yr].py : calcPersonalYear(m, d, dateAtAge(m, d, y, yr + 0.5)).root
        const hue = cycleHue(c, py2)
        drawBand(yr, Math.min(yr + 1, MAX_AGE * prog), `hsla(${hue},75%,55%,0.18)`, 0.88, 1.0)
      }
      for (let yr = 0; yr < MAX_AGE * prog; yr++) {
        const segs = cycles[yr] && cycles[yr].segs
        for (let seg = 0; seg < 3; seg++) {
          const fmc = segs
            ? segs[seg]
            : calcFourMonthCycle(m, d, dateAtAge(m, d, y, yr + (seg + 0.5) / 3))
          const hue = cycleHue(c, fmc.root)
          drawBand(yr + seg / 3, Math.min(yr + (seg + 1) / 3, MAX_AGE * prog), `hsla(${hue},70%,55%,0.15)`, 0.74, 0.87)
        }
      }

      const drawSpine = () => {
        ctx.beginPath(); ctx.moveTo(cx, cy)
        for (let a = 0; a <= MAX_AGE * prog; a += 0.5) { const p = ageToSpiral(a, z, cx, cy, radius); ctx.lineTo(p.x, p.y) }
      }
      ctx.strokeStyle = c.spineGlow; ctx.lineWidth = 10; ctx.globalAlpha = 0.06; drawSpine(); ctx.stroke()
      ctx.strokeStyle = c.spine; ctx.lineWidth = 4; ctx.globalAlpha = 0.3; drawSpine(); ctx.stroke()
      ctx.strokeStyle = c.spine; ctx.lineWidth = 1.5; ctx.globalAlpha = 1; drawSpine(); ctx.stroke()
      const spineEnd = ageToSpiral(MAX_AGE * prog, z, cx, cy, radius)
      ctx.beginPath(); ctx.arc(spineEnd.x, spineEnd.y, 5 + Math.sin(Date.now() * 0.004) * 1.5, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.6 * prog) + ')'; ctx.fill()
      ctx.globalAlpha = 1

      const parts = particlesRef.current
      if (parts) {
        for (let i = 0; i < parts.length; i++) {
          const pt = parts[i]
          if (animateParts) {
            pt.age += pt.speed
            if (pt.age > MAX_AGE) { pt.age = 0; pt.alpha = 0.2 + Math.random() * 0.3 }
          }
          if (pt.age > MAX_AGE * prog) continue
          const pp = ageToSpiral(pt.age, z, cx, cy, radius)
          const sizeOsc = pt.size * (0.7 + 0.3 * Math.sin(Date.now() * 0.002 + i))
          if (pt.color === 'theme') {
            ctx.shadowBlur = 6; ctx.shadowColor = c.fm
            ctx.beginPath(); ctx.arc(pp.x, pp.y, sizeOsc, 0, 2 * Math.PI)
            const hexMatch = c.fm.match(/^#([0-9a-f]{6})$/i)
            const rgb = hexMatch ? parseInt(hexMatch[1], 16) : 0xffffff
            const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255
            ctx.fillStyle = `rgba(${r},${g},${b},${pt.alpha * prog})`; ctx.fill()
            ctx.shadowBlur = 0
          } else {
            ctx.beginPath(); ctx.arc(pp.x, pp.y, sizeOsc, 0, 2 * Math.PI)
            ctx.fillStyle = `rgba(255,255,255,${pt.alpha * prog})`; ctx.fill()
          }
        }
      }

      for (let a = 0; a <= MAX_AGE * prog; a += 9) {
        const p = ageToSpiral(a, z, cx, cy, radius)
        ctx.shadowBlur = 10; ctx.shadowColor = c.n9
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI); ctx.fillStyle = c.n9; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 2 * Math.PI); ctx.strokeStyle = c.n9; ctx.globalAlpha = 0.4; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1
        ctx.shadowBlur = 0
        const ang = p.t - Math.PI / 2
        ctx.fillStyle = c.tick; ctx.font = '500 11px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a, cx + p.r * 1.22 * Math.cos(ang), cy + p.r * 1.22 * Math.sin(ang))
      }
      for (let a = 1; a < MAX_AGE * prog; a++) {
        if (a % 9 === 0) continue
        const p = ageToSpiral(a, z, cx, cy, radius)
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill()
      }

      const ha = hoverAgeRef.current
      const pin = pinnedAgeRef.current
      if (ha !== null && ha !== pin && ha < MAX_AGE * prog) {
        const hp = ageToSpiral(ha, z, cx, cy, radius)
        ctx.beginPath(); ctx.arc(hp.x, hp.y, 10, 0, 2 * Math.PI)
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = '600 10px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(Math.floor(ha), hp.x, hp.y - 16)
      }

      if (pin !== null && pin < MAX_AGE * prog) {
        const pp = ageToSpiral(pin, z, cx, cy, radius)
        const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7
        ctx.beginPath(); ctx.arc(pp.x, pp.y, 12, 0, 2 * Math.PI); ctx.strokeStyle = `rgba(212,83,126,${pulse})`; ctx.lineWidth = 2; ctx.stroke()
        ctx.beginPath(); ctx.arc(pp.x, pp.y, 5, 0, 2 * Math.PI); ctx.fillStyle = '#D4537E'; ctx.fill()
      }

      // Stronger YOU ARE HERE
      const nf = nowFracRef.current
      if (nf < MAX_AGE * prog) {
        const nowP = ageToSpiral(nf, z, cx, cy, radius)
        const t = Date.now()
        const pulse = Math.sin(t * 0.003) * 0.2 + 0.8
        ctx.shadowBlur = 28 + pulse * 14; ctx.shadowColor = '#EF9F27'
        const sonarRings = [
          { r: 16, phase: 0 },
          { r: 26, phase: 2.1 },
          { r: 38, phase: 4.2 },
        ]
        for (const ring of sonarRings) {
          const alpha = Math.sin(t * 0.003 + ring.phase) * 0.4 + 0.5
          ctx.beginPath(); ctx.arc(nowP.x, nowP.y, ring.r, 0, 2 * Math.PI)
          ctx.strokeStyle = `rgba(239,159,39,${alpha})`; ctx.lineWidth = 2; ctx.stroke()
        }
        const halo = ctx.createRadialGradient(nowP.x, nowP.y, 0, nowP.x, nowP.y, 22)
        halo.addColorStop(0, 'rgba(239,159,39,0.35)')
        halo.addColorStop(1, 'rgba(239,159,39,0)')
        ctx.beginPath(); ctx.arc(nowP.x, nowP.y, 22, 0, 2 * Math.PI); ctx.fillStyle = halo; ctx.fill()
        const grad = ctx.createRadialGradient(nowP.x, nowP.y, 0, nowP.x, nowP.y, 10)
        grad.addColorStop(0, '#fff')
        grad.addColorStop(0.35, '#FFD580')
        grad.addColorStop(1, '#EF9F27')
        ctx.beginPath(); ctx.arc(nowP.x, nowP.y, 10, 0, 2 * Math.PI); ctx.fillStyle = grad; ctx.fill()
        ctx.beginPath(); ctx.arc(nowP.x, nowP.y, 3.5, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#EF9F27'
        ctx.font = '700 11px Cinzel, serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.globalAlpha = 0.95
        ctx.fillText('NOW', nowP.x, nowP.y - 20)
        ctx.font = '600 10px sans-serif'
        ctx.fillStyle = 'rgba(255,213,128,0.9)'
        ctx.fillText(String(Math.floor(nf)), nowP.x, nowP.y - 32)
        ctx.globalAlpha = 1
      }

      const glowR = 14 + Math.sin(Date.now() * 0.002) * 4
      ctx.shadowBlur = 20; ctx.shadowColor = c.spineGlow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      cg.addColorStop(0, 'rgba(255,255,255,0.9)')
      cg.addColorStop(0.4, c.spine)
      cg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, 2 * Math.PI); ctx.fillStyle = cg; ctx.fill()
      ctx.shadowBlur = 0
      canvasSizeDrawnRef.current = { W, H }
    }

    animStateRef.current = true
    function animate() {
      if (!animStateRef.current) return
      const { W, H, radius } = sizeRef.current
      if (!canvas || !bg || W < 100 || H < 100) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }
      const paused = pauseAnimRef.current || document.hidden
      // Always redraw spiral (zoom easing / pin); pause only ambient motion when hidden/popup
      drawBg(W, H, !paused)
      draw(W, H, radius, !paused)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animate()

    let dragDist = 0
    let clickPos = { x: 0, y: 0 }
    let canvasGesture = false

    canvas.onmousedown = (e) => {
      if (scrubbingRef.current) return
      canvasGesture = true
      dragRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      dragDist = 0
      clickPos = { x: e.clientX, y: e.clientY }
    }
    window.onmousemove = (e) => {
      if (scrubbingRef.current) return
      const { W, H, radius } = sizeRef.current
      if (!dragRef.current) {
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left, my = e.clientY - rect.top
        if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) {
          setHoverAge(null)
          return
        }
        // Ignore hover while pointer is over the scrubber chrome
        const scrubber = wrap.querySelector('.spiral-ctrl-scrubber')
        if (scrubber) {
          const sr = scrubber.getBoundingClientRect()
          if (e.clientX >= sr.left && e.clientX <= sr.right && e.clientY >= sr.top && e.clientY <= sr.bottom) return
        }
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height
        setHoverAge(ageAtPoint(mx * scaleX, my * scaleY, 14, 48, W, H, radius))
        return
      }
      const dx = e.clientX - dragStartRef.current.x, dy = e.clientY - dragStartRef.current.y
      dragDist += Math.abs(dx) + Math.abs(dy)
      panRef.current.x += dx; panRef.current.y += dy
      dragStartRef.current = { x: e.clientX, y: e.clientY }
    }
    window.onmouseup = (e) => {
      const wasCanvas = canvasGesture
      canvasGesture = false
      dragRef.current = false
      if (scrubbingRef.current || !wasCanvas) return
      const { W, H, radius } = sizeRef.current
      clickPos = { x: e.clientX, y: e.clientY }
      if (dragDist < 15) {
        const rect = canvas.getBoundingClientRect()
        const mx = clickPos.x - rect.left, my = clickPos.y - rect.top
        if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) return
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height
        const age = ageAtPoint(mx * scaleX, my * scaleY, 16, 56, W, H, radius)
        if (age != null) setPinnedAge(age)
      }
    }
    canvas.onwheel = (e) => { e.preventDefault(); zoomTargetRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomTargetRef.current * (e.deltaY < 0 ? 1.08 : 0.93))) }
    canvas.onmouseleave = () => { if (!scrubbingRef.current) setHoverAge(null) }

    canvas.ontouchstart = (e) => {
      if (scrubbingRef.current) return
      e.preventDefault()
      canvasGesture = true
      if (e.touches.length === 2) {
        const t = e.touches
        pinchRef.current = { dist: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY), zoom: zoomTargetRef.current }
      } else if (e.touches.length === 1) {
        const now = Date.now()
        if (now - lastTapRef.current < 300) { panRef.current = { x: 0, y: 0 }; zoomTargetRef.current = 1 }
        lastTapRef.current = now
        dragRef.current = true
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        tapStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    canvas.ontouchmove = (e) => {
      if (scrubbingRef.current) return
      e.preventDefault()
      if (e.touches.length === 2 && pinchRef.current) {
        const t = e.touches
        const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
        zoomTargetRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.zoom * (dist / pinchRef.current.dist)))
      } else if (dragRef.current && e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragStartRef.current.x, dy = e.touches[0].clientY - dragStartRef.current.y
        panRef.current.x += dx; panRef.current.y += dy
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    canvas.ontouchend = (e) => {
      if (scrubbingRef.current) return
      const { W, H, radius } = sizeRef.current
      if (e.touches.length < 2) pinchRef.current = null
      if (e.touches.length === 0) {
        const wasCanvas = canvasGesture
        canvasGesture = false
        dragRef.current = false
        if (!wasCanvas) return
        const touch0 = e.changedTouches[0]
        const dx = touch0 ? Math.abs(touch0.clientX - tapStartRef.current.x) : 999
        const dy = touch0 ? Math.abs(touch0.clientY - tapStartRef.current.y) : 999
        if (e.changedTouches.length === 1 && dx < 12 && dy < 12) {
          const touch = e.changedTouches[0]
          const rect = canvas.getBoundingClientRect()
          const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height
          const mx = touch.clientX - rect.left, my = touch.clientY - rect.top
          const age = ageAtPoint(mx * scaleX, my * scaleY, 18, 60, W, H, radius)
          if (age != null) setPinnedAge(age)
        }
      }
    }

    return () => {
      animStateRef.current = false
      cancelAnimationFrame(animFrameRef.current)
      window.onmousemove = null; window.onmouseup = null
      canvas.onmousedown = null; canvas.onwheel = null; canvas.onmouseleave = null
      canvas.ontouchstart = null; canvas.ontouchmove = null; canvas.ontouchend = null
    }
  }, [hasBirth, m, d, y])

  if (!hasBirth) {
    return <div className="spiral-empty">Birth date not available</div>
  }

  const currentPY = calcPersonalYear(m, d).root
  const livePin = pinnacleAtAge(pinnacles, nowFrac)
  const displayAge = scrubberVal !== null ? scrubberVal : nowFrac
  const isScrubbingNow = scrubberVal === null || Math.abs(scrubberVal - nowFrac) < 0.75

  const popupDateStr = pinnedAge !== null
    ? (() => {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const approx = new Date(new Date(y, m - 1, d).getTime() + pinnedAge * 365.25 * 24 * 3600 * 1000)
        return `${months[approx.getMonth()]} ${approx.getFullYear()}`
      })()
    : ''

  function handleReset() {
    panRef.current = { x: 0, y: 0 }
    zoomTargetRef.current = 1
    setPinnedAge(null)
    setScrubberVal(null)
    drawStartRef.current = Date.now()
  }

  function openCurrent() {
    setPinnedAge(null)
    dispatch({ type: 'SET_TAB', payload: 'quests', section: 'current' })
  }

  return (
    <div className="spiral-wrap">
      <p className="spiral-thesis">Your life&apos;s cycles from birth to 90 — tap an age to read it.</p>

      <div className="spiral-canvas-wrap" ref={wrapRef}>
        <canvas ref={bgRef} className="spiral-canvas spiral-canvas--bg" />
        <canvas ref={canvasRef} className="spiral-canvas spiral-canvas--fg" />

        <div className="spiral-ctrl-legend">
          <span className="spiral-leg-item"><i style={{ background: '#EF9F27' }} /> Personal Year</span>
          <span className="spiral-leg-item"><i style={{ background: colors.fm }} /> 4-Month</span>
          <span className="spiral-leg-item"><i style={{ background: colors.n9 }} /> 9-Year epoch</span>
          <span className="spiral-leg-item"><i style={{ background: colors.pin }} /> Pinnacle</span>
        </div>

        <div className="spiral-ctrl-info">
          <span className="spiral-info-label">LP</span><span className="spiral-info-value">{lp}</span>
          <span className="spiral-info-label">Age</span><span className="spiral-info-value">{Math.floor(nowFrac)}</span>
          <span className="spiral-info-label">Year</span><span className="spiral-info-value">{currentPY}</span>
          <span className="spiral-info-label">Pin</span>
          <span className="spiral-info-value">
            {livePin.root} · {livePin.endAge == null ? `${livePin.startAge}+` : `${livePin.startAge}–${livePin.endAge}`}
          </span>
          <button type="button" className="spiral-reset" onClick={handleReset} aria-label="Reset view">Reset</button>
        </div>

        {pinnedAge === null && (
          <p className="spiral-idle-hint" aria-hidden="true">
            Drag the age scrubber or tap the spiral.
          </p>
        )}

        <div className="spiral-ctrl-scrubber">
          <div className="spiral-scrubber-meta">
            <span className="spiral-scrubber-now-label">{isScrubbingNow ? 'Now' : 'Age'}</span>
            <span className="spiral-scrubber-val">{Math.floor(displayAge)}</span>
          </div>
          <span className="spiral-scrubber-label">0</span>
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            aria-label="Age scrubber"
            value={Math.round(displayAge)}
            onPointerDown={() => { scrubbingRef.current = true }}
            onChange={e => {
              const v = parseFloat(e.target.value)
              scrubberValRef.current = v
              setScrubberVal(v)
              setHoverAge(v)
            }}
            onPointerUp={e => {
              e.stopPropagation()
              const raw = scrubberValRef.current ?? parseFloat(e.currentTarget.value)
              const v = Number.isFinite(raw) ? Math.round(raw) : null
              scrubbingRef.current = false
              if (v != null) {
                scrubberValRef.current = v
                setScrubberVal(v)
                setPinnedAge(v)
                setHoverAge(null)
              }
            }}
            onPointerCancel={() => { scrubbingRef.current = false }}
            onKeyUp={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                const raw = scrubberValRef.current ?? parseFloat(e.currentTarget.value)
                const v = Number.isFinite(raw) ? Math.round(raw) : null
                if (v != null) setPinnedAge(v)
              }
            }}
          />
          <span className="spiral-scrubber-label">90</span>
        </div>
      </div>

      {pinnedAge !== null && createPortal(
        <>
          <div className="spiral-popup-bg" onClick={() => setPinnedAge(null)} />
          <div className="spiral-popup spiral-popup--reading" role="dialog" aria-modal="true" aria-label={`Age ${Math.floor(pinnedAge)} reading`} onClick={e => e.stopPropagation()}>
            <div className="spiral-popup-head">
              <div className="spiral-popup-hero">
                <div className="spiral-popup-age">{Math.floor(pinnedAge)}</div>
                <div>
                  <div className="spiral-popup-title">Age {Math.floor(pinnedAge)}</div>
                  <div className="spiral-popup-date">{popupDateStr}</div>
                </div>
              </div>
              <div className="spiral-popup-actions">
                <button
                  type="button"
                  className="spiral-popup-action"
                  onClick={() => {
                    panRef.current = { x: 0, y: 0 }
                    zoomTargetRef.current = 1
                    setPinnedAge(nowFrac)
                    setScrubberVal(null)
                  }}
                >
                  Now
                </button>
                <button type="button" className="spiral-popup-close" onClick={() => setPinnedAge(null)} aria-label="Close">✕</button>
              </div>
            </div>
            <CyclePopup age={pinnedAge} m={m} d={d} y={y} lp={lp} />
            <button type="button" className="spiral-popup-cta" onClick={openCurrent}>
              Open in Current
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

function CyclePopup({ age, m, d, y, lp }) {
  const asOf = dateAtAge(m, d, y, age)
  const py = calcPersonalYear(m, d, asOf).root
  const fmc = calcFourMonthCycle(m, d, asOf)
  const n9 = n9Band(age)
  const pins = calcPinnacles(m, d, y, { root: typeof lp === 'number' ? lp : lp?.root || 9 })
  const pin = pinnacleAtAge(pins, age)
  const pinRange = pin.endAge == null ? `Age ${pin.startAge}+` : `Ages ${pin.startAge}–${pin.endAge}`

  const pyMeaning = (CYCLE_MEANINGS.personalYear && CYCLE_MEANINGS.personalYear[py]) || {}
  const fmcMeaning = (CYCLE_MEANINGS.fourMonthCycle && CYCLE_MEANINGS.fourMonthCycle[fmc.root]) || {}
  const pinMeaning = (CYCLE_MEANINGS.pinnacle && CYCLE_MEANINGS.pinnacle[pin?.root]) || {}
  const n9Meaning = N9[n9.index] || {}

  // Personal Year → 4-Month → Pinnacle → 9-Year epoch
  const sections = [
    { color: '#EF9F27', label: `Personal Year ${py}`, meaning: pyMeaning },
    { color: '#3B8BD4', label: `4-Month · Segment ${fmc.cycleNum} · Root ${fmc.root}`, meaning: fmcMeaning },
    { color: '#D4537E', label: `Pinnacle ${pin?.root} (${pinRange})`, meaning: pinMeaning },
    { color: '#1D9E75', label: `9-Year Epoch ${n9.index} · Ages ${n9.start}–${n9.end}`, meaning: n9Meaning },
  ]

  return (
    <div className="spiral-popup-body">
      {sections.map((s, i) => {
        if (!s.meaning || !s.meaning.theme) return null
        return (
          <div key={i} className="spiral-popup-section spiral-popup-section--reading">
            <div className="spiral-popup-section-label" style={{ color: s.color }}>{s.label}</div>
            <div className="spiral-popup-section-title">{s.meaning.theme}</div>
            {s.meaning.summary && <div className="spiral-popup-section-desc">{s.meaning.summary}</div>}
          </div>
        )
      })}
    </div>
  )
}
