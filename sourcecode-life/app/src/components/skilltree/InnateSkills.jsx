import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import SkillTree from './SkillTree.jsx'
import CoachMark from '../ui/CoachMark'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { reduceToSimple } from '../../lib/numerology'
import { GIFTS, POLARITY_CONFIGS, FIRST_NAME_MEANINGS } from '../../lib/data'
import {
  getInnateSeeds, mergeWithSeeds, getPolarity, getFirstNameValue,
} from '../../lib/numerologyProfile'

// ── Constants ─────────────────────────────────────────────────────────────────
const SKILLTREE_KEY = 'scl_skilltree_progress_v2'

const DIGIT_SKILL_TREE = {
  1: {
    title: 'Initiation', coreStat: 'WILL', branch: 'ELECTRIC', subtitle: 'Action into motion',
    skills: [
      { name: 'INITIATIVE', desc: 'Start faster and reduce friction to begin.' },
      { name: 'LEADERSHIP', desc: 'Direct groups, set pace, and hold direction.' },
    ],
    branches: [
      { icon: '▶', label: 'START',    short: 'Open the cycle' },
      { icon: '△', label: 'COURAGE',  short: 'Act before certainty' },
      { icon: '✦', label: 'COMMAND',  short: 'Guide momentum' },
      { icon: '◈', label: 'DRIVE',    short: 'Keep movement alive' },
    ],
  },
  2: {
    title: 'Connection', coreStat: 'RESONANCE', branch: 'MAGNETIC', subtitle: 'Signal between people',
    skills: [
      { name: 'COMMUNICATION', desc: 'Clarify signal and reduce conflict noise.' },
      { name: 'NETWORKING',    desc: 'Expand useful alliances and social reach.' },
    ],
    branches: [
      { icon: '◌', label: 'LISTENING', short: 'Receive nuance' },
      { icon: '◍', label: 'HARMONY',   short: 'Balance tension' },
      { icon: '☍', label: 'BONDING',   short: 'Strengthen trust' },
      { icon: '◎', label: 'LINKING',   short: 'Connect the network' },
    ],
  },
  3: {
    title: 'Expression', coreStat: 'EXPRESSION', branch: 'ELECTRIC', subtitle: 'Externalized intelligence',
    skills: [
      { name: 'CREATIVITY',  desc: 'Generate more ideas and creative options.' },
      { name: 'EXPRESSION',  desc: 'Broadcast your signal with clarity and style.' },
    ],
    branches: [
      { icon: '✎', label: 'CREATIVITY',    short: 'Make ideas tangible' },
      { icon: '◔', label: 'COMMUNICATION', short: 'Transmit clearly' },
      { icon: '◉', label: 'PERFORMANCE',   short: 'Carry presence outward' },
      { icon: '✦', label: 'STORYTELLING',  short: 'Shape meaning into form' },
    ],
  },
  4: {
    title: 'Structure', coreStat: 'STABILITY', branch: 'MAGNETIC', subtitle: 'Form that can hold',
    skills: [
      { name: 'ORGANIZATION', desc: 'Create systems that stay intact under load.' },
      { name: 'FOCUS',        desc: 'Lock attention onto the essential.' },
    ],
    branches: [
      { icon: '□', label: 'SYSTEMS',   short: 'Build structure' },
      { icon: '▣', label: 'ORDER',     short: 'Reduce chaos' },
      { icon: '◫', label: 'ROUTINE',   short: 'Repeat with strength' },
      { icon: '◪', label: 'PRECISION', short: 'Tighten execution' },
    ],
  },
  5: {
    title: 'Adaptation', coreStat: 'MOTION', branch: 'ELECTRIC', subtitle: 'Freedom in movement',
    skills: [
      { name: 'ADAPTABILITY', desc: 'Pivot quickly as the field changes.' },
      { name: 'PROWESS',      desc: 'Perform well while conditions stay unstable.' },
    ],
    branches: [
      { icon: '↺', label: 'PIVOT', short: 'Shift without panic' },
      { icon: '⇄', label: 'RANGE', short: 'Move across lanes' },
      { icon: '⚡', label: 'SPEED', short: 'Keep the flow sharp' },
      { icon: '◧', label: 'RISK',  short: 'Advance into change' },
    ],
  },
  6: {
    title: 'Care', coreStat: 'SUPPORT', branch: 'MAGNETIC', subtitle: 'Hold what matters',
    skills: [
      { name: 'CARE',           desc: 'Maintain morale, protection, and emotional steadiness.' },
      { name: 'RESPONSIBILITY', desc: 'See commitments through to full completion.' },
    ],
    branches: [
      { icon: '♡', label: 'NURTURE',  short: 'Create safety' },
      { icon: '⌂', label: 'HOME',     short: 'Stabilize the field' },
      { icon: '❋', label: 'SERVICE',  short: 'Show up consistently' },
      { icon: '◡', label: 'REPAIR',   short: 'Restore cohesion' },
    ],
  },
  7: {
    title: 'Insight', coreStat: 'PERCEPTION', branch: 'ELECTRIC', subtitle: 'Depth before action',
    skills: [
      { name: 'KNOWLEDGE', desc: 'Acquire insight and understand hidden patterns.' },
      { name: 'FAITH',     desc: 'Stay aligned before proof is visible.' },
    ],
    branches: [
      { icon: '◐', label: 'STUDY',   short: 'Gather signal' },
      { icon: '◑', label: 'PATTERN', short: 'See what repeats' },
      { icon: '✧', label: 'TRUST',   short: 'Stay with the unseen' },
      { icon: '⌁', label: 'MYSTERY', short: 'Move with depth' },
    ],
  },
  8: {
    title: 'Mastery', coreStat: 'AUTHORITY', branch: 'MAGNETIC', subtitle: 'Power with discipline',
    skills: [
      { name: 'WISDOM',     desc: 'Choose leverage, timing, and proper force.' },
      { name: 'DISCIPLINE', desc: 'Execute to a high standard repeatedly.' },
    ],
    branches: [
      { icon: '▲', label: 'STRATEGY',  short: 'See the advantage' },
      { icon: '▴', label: 'CONTROL',   short: 'Hold the line' },
      { icon: '◬', label: 'EXECUTION', short: 'Convert plan to result' },
      { icon: '◇', label: 'SCALE',     short: 'Grow impact cleanly' },
    ],
  },
  9: {
    title: 'Completion', coreStat: 'TRANSMUTATION', branch: 'AETHER', subtitle: 'Endings into openings',
    skills: [
      { name: 'COMPASSION', desc: 'Hold the wide view with humanity.' },
      { name: 'RELEASE',    desc: 'Let go cleanly so the next cycle can begin.' },
    ],
    branches: [
      { icon: '◜', label: 'HEALING',    short: 'Soothe the field' },
      { icon: '◝', label: 'FORGIVENESS',short: 'Reduce karmic drag' },
      { icon: '◟', label: 'CLOSURE',    short: 'Finish the cycle' },
      { icon: '◞', label: 'LEGACY',     short: 'Leave what lasts' },
    ],
  },
}

const MASTER_ROOT_MAP = { 11:2, 22:4, 33:6, 44:8, 55:1, 66:3, 77:5, 88:7, 99:9 }

const MASTER_ENHANCED_SKILLS = {
  11: { name: 'INTUITIVE CONNECTION',       desc: 'Enhanced root-2 resonance: perceive hidden emotional links instantly.' },
  22: { name: 'ARCHITECT NETWORK',          desc: 'Enhanced root-4 structure: design durable systems at scale.' },
  33: { name: 'HEARTFIELD HARMONY',         desc: 'Enhanced root-6 care: convert tension into cooperative energy.' },
  44: { name: 'FOCUS FORTRESS',             desc: 'Enhanced root-8 discipline: hold precision under extreme pressure.' },
  55: { name: 'SOVEREIGN INITIATION',       desc: 'Enhanced root-1 leadership: trigger coordinated starts across teams.' },
  66: { name: 'CREATIVE RESPONSIBILITY',    desc: 'Enhanced root-3 expression: ship creative work with accountability.' },
  77: { name: 'ADAPTIVE FAITH',             desc: 'Enhanced root-5 adaptability: stay aligned while conditions mutate.' },
  88: { name: 'WISE COMMAND',               desc: 'Enhanced root-7 knowledge: apply insight with strategic authority.' },
  99: { name: 'COMPASSIONATE TRANSCENDENCE',desc: 'Enhanced root-9 release: resolve cycles without karmic residue.' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDefaultSkillTreeProgress() {
  const init = {}
  for (let i = 1; i <= 9; i++) init[i] = [false, false, false]
  return init
}

function loadSkillTreeProgressLocal() {
  try {
    const raw = localStorage.getItem(SKILLTREE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return getDefaultSkillTreeProgress()
}

function saveSkillTreeProgressLocal(progress) {
  try { localStorage.setItem(SKILLTREE_KEY, JSON.stringify(progress)) } catch { /* ignore */ }
}

// ── Gift sidebar ──────────────────────────────────────────────────────────────
function GiftSidebar({ gift, cfg, label, n, onClose }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700)
  const panelRef = useFocusTrap({ open: true, onClose })
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Lock body scroll while the sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 9998,
        }}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        animate={{ y: 0, x: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
        style={{
          position: 'fixed',
          top:    isMobile ? 'auto' : 0,
          bottom: 0, right: 0,
          left:   isMobile ? 0 : 'auto',
          width:  isMobile ? '100%' : 340,
          height: isMobile ? '88vh' : '100vh',
          zIndex: 9999,
          background: 'linear-gradient(180deg, #0d0d20 0%, #0a0a18 100%)',
          borderLeft:   isMobile ? 'none' : `1px solid ${cfg.color}44`,
          borderTop:    isMobile ? `3px solid ${cfg.color}` : 'none',
          borderRadius: isMobile ? '20px 20px 0 0' : 0,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
          boxShadow: isMobile
            ? `0 -8px 40px rgba(0,0,0,0.6)`
            : `-8px 0 40px rgba(0,0,0,0.5)`,
        }} role="dialog" aria-modal="true" aria-label={`${gift.word} gift details`}>

        {/* Drag handle (mobile) */}
        {isMobile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </motion.div>
        )}

        {/* Close row */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
          style={{
            display: 'flex', justifyContent: 'flex-end',
            padding: isMobile ? '4px 16px 0' : '14px 16px 0',
            flexShrink: 0,
          }}
        >
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 4, color: 'rgba(255,255,255,0.5)', fontSize: 16,
            cursor: 'pointer', padding: '2px 8px', lineHeight: 1,
          }}>✕</button>
        </motion.div>

        {/* Hero glyph + title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.3 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '20px 24px 18px', flexShrink: 0,
            borderBottom: `1px solid ${cfg.color}22`,
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.18, type: 'spring', stiffness: 200 }}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `radial-gradient(circle, ${cfg.color}22 0%, transparent 70%)`,
              border: `1px solid ${cfg.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 14,
            }}
          >
            {gift.glyph}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700,
              color: cfg.color, letterSpacing: '0.15em', textAlign: 'center',
            }}
          >
            {gift.word}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
            style={{
              marginTop: 6, fontSize: 9, letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.3)', textAlign: 'center',
            }}
          >
            {label} GIFT · {cfg.label} · {n}
          </motion.div>
          {/* accent line */}
          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.35, duration: 0.4 }}
            style={{
              marginTop: 16, width: 48, height: 2, borderRadius: 1,
              background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
              transformOrigin: 'center',
            }}
          />
        </motion.div>

        {/* Body */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32, duration: 0.3 }}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}
        >
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.75,
          }}>
            {gift.desc}
          </div>
        </motion.div>
      </motion.div>
    </>,
    document.body
  )
}

// ── GiftCards ─────────────────────────────────────────────────────────────────
export function GiftCards({ playerData }) {
  const { d, so, ou } = playerData
  const [active, setActive] = useState(null)

  const fnData = getFirstNameValue((playerData.name || '').trim().split(/\s+/)[0] || '')

  const cards = [
    { key: 'day',   number: d,        type: 'day',   label: 'DAY'   },
    { key: 'soul',  number: so?.root,  type: 'soul',  label: 'SOUL'  },
    { key: 'outer', number: ou?.root,  type: 'outer', label: 'OUTER' },
    { key: 'fn',    number: fnData.root, type: 'fn',  label: 'NAME'  },
  ]

  const activeCard = active ? cards.find(c => c.key === active) : null
  const activeN    = activeCard ? (activeCard.type === 'fn' ? activeCard.number : reduceToSimple(activeCard.number)) : null

  // Build sidebar gift object — fn uses FIRST_NAME_MEANINGS, others use GIFTS
  const activeGift = (() => {
    if (!activeCard || activeN == null) return null
    if (activeCard.type === 'fn') {
      const m = FIRST_NAME_MEANINGS[activeN]
      if (!m) return null
      const keyword = m.title.replace(/^The\s+/i, '').replace(/\s+Name$/i, '').toUpperCase()
      return { glyph: '✦', word: keyword, desc: m.text }
    }
    return GIFTS[activeN]?.[activeCard.type] || null
  })()
  const activeCfg = activeN ? POLARITY_CONFIGS[getPolarity(activeN)] : null

  return (
    <>
      <div className="innate-gifts-wrap" style={{ marginBottom: 16, marginTop: 8 }}>

        {/* Section header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14, padding: '0 2px',
        }}>
          <div className="innate-gifts-divider innate-gifts-divider--left" style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25))' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span className="innate-gifts-glyph" style={{ fontSize: 11, color: 'rgba(201,168,76,0.4)', lineHeight: 1 }}>✦</span>
            <span className="innate-gifts-title" style={{
              fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.22em', color: '#c9a84c',
              textShadow: '0 0 12px rgba(201,168,76,0.3)',
            }}>
              INNATE GIFTS
            </span>
            <span className="innate-gifts-subtitle" style={{
              fontSize: 8, letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.2)',
            }}>
              DAY · SOUL · OUTER · NAME
            </span>
          </div>
          <div className="innate-gifts-divider innate-gifts-divider--right" style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.25), transparent)' }} />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {cards.map(c => {
            const n = c.type === 'fn' ? c.number : reduceToSimple(c.number)
            let glyph, word
            if (c.type === 'fn') {
              const m = FIRST_NAME_MEANINGS[n]
              if (!m) return null
              glyph = '✦'
              word  = m.title.replace(/^The\s+/i, '').replace(/\s+Name$/i, '').toUpperCase()
            } else {
              const gift = GIFTS[n]?.[c.type]
              if (!gift) return null
              glyph = gift.glyph
              word  = gift.word
            }
            const cfg      = POLARITY_CONFIGS[getPolarity(n)]
            const isActive = active === c.key
            return (
              <button
                key={c.key}
                className={`innate-gift-card${isActive ? ' active' : ''}`}
                onClick={() => setActive(isActive ? null : c.key)}
                style={{
                  flex: 1, minWidth: 0,
                  background: isActive ? `${cfg.color}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? cfg.color + '55' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8, padding: '10px 8px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                <span className="innate-gift-glyph" style={{ fontSize: 18, lineHeight: 1 }}>{glyph}</span>
                <span className="innate-gift-word" style={{
                  fontFamily: "'Cinzel', serif", fontSize: 8,
                  letterSpacing: '0.12em', color: cfg.color, fontWeight: 700,
                }}>{word}</span>
                <span className="innate-gift-label" style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                  {c.label} · {n}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {activeGift && activeCfg && (
        <AnimatePresence>
          <GiftSidebar
            gift={activeGift}
            cfg={activeCfg}
            label={activeCard.label}
            n={activeN}
            onClose={() => setActive(null)}
          />
        </AnimatePresence>
      )}
    </>
  )
}

// ── Skill tree wrapper ────────────────────────────────────────────────────────
function SkillTreeSection({ playerData }) {
  const { xp } = useQuestEngine()
  const seeds      = getInnateSeeds(playerData)
  const statValues = useMemo(() => {
    const sv = {}
    const raw = xp?.statXP || {}
    for (let i = 1; i <= 9; i++) sv[String(i)] = raw[i] || 0
    return sv
  }, [xp?.statXP])
  const [completed, setCompleted] = useState(() =>
    mergeWithSeeds(loadSkillTreeProgressLocal(), seeds)
  )
  const [activeNode, setActiveNode] = useState(null)
  const didLoadRemote = useRef(false)

  useEffect(() => {
    if (window.NativeAuth?.loadSkillTreeProgress) {
      window.NativeAuth.loadSkillTreeProgress((progressJson) => {
        try {
          const progress = JSON.parse(progressJson)
          if (progress && typeof progress === 'object') {
            setCompleted(mergeWithSeeds(progress, seeds))
            didLoadRemote.current = true
          }
        } catch { /* ignore */ }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    saveSkillTreeProgressLocal(completed)
    if (didLoadRemote.current && window.NativeAuth?.saveSkillTreeProgress) {
      window.NativeAuth.saveSkillTreeProgress(JSON.stringify(completed))
    }
  }, [completed])

  // Sync when a daily skill quest completes outside this component
  useEffect(() => {
    const onUpdate = (e) => {
      if (e.detail && typeof e.detail === 'object') {
        setCompleted(prev => mergeWithSeeds({ ...prev, ...e.detail }, seeds))
      }
    }
    window.addEventListener('scl:skilltree_updated', onUpdate)
    return () => window.removeEventListener('scl:skilltree_updated', onUpdate)
  }, [seeds]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <SkillTree
        completed={completed}
        activeNode={activeNode}
        setActiveNode={setActiveNode}
        seeds={seeds}
        statValues={statValues}
        digitSkillTree={DIGIT_SKILL_TREE}
        masterRootMap={MASTER_ROOT_MAP}
        masterEnhancedSkills={MASTER_ENHANCED_SKILLS}
      />
    </div>
  )
}

// ── Default export ────────────────────────────────────────────────────────────
export default function InnateSkills({ playerData }) {
  return (
    <div>
      <CoachMark storageKey="scl_coach_skill_tree" title="Skill Tree" afterTour>
        Tap a node to see objectives. Locked nodes show unlock requirements when you hover or tap.
      </CoachMark>
      <SkillTreeSection playerData={playerData} />
    </div>
  )
}
