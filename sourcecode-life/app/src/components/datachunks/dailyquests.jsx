/**
 * DailySection — Flowchart Layout
 *
 * Square nodes in a grid with connecting lines.
 * Clicking a node opens a side panel for info & journal.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { XP_AWARDS, QuestEngine_isDailyGated } from '../../lib/questEngine'
import {
  getActiveMultiDayQuests, getUncheckedMultiDayQuests,

} from '../../lib/numerologyQuests'
import { CYCLE_QUEST_COLORS, CYCLE_MEANINGS } from '../../lib/data'
import { getCycleObjectives } from '../../lib/objectives'
import { resolveDailyBlueprint } from '../../lib/questBlueprint'
import {
  calcPersonalDay, reduceToSimple, todayStr,
} from '../../lib/numerology'
import { getPersonalDayGlyphs } from '../../lib/objectives'
import { useQuestEngine as useQE } from '../../hooks/useQuestEngine'
import { showFloatingXP, showParticleBurst } from '../effects/FloatingXP'
import { showQuestRewardToast } from '../effects/QuestRewardToast'
import { markDayCompleted } from '../effects/StreakCalendar'
import DailyCountdown from '../effects/DailyCountdown'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import FlowDetailPanel from '../flow/FlowDetailPanel'


// ─── Constants ───────────────────────────────────────────────────
const GQ_COLORS = {
  primary:   { color: 'var(--teal)',  dim: 'rgba(0,229,180,0.15)',   icon: '◈' },
  growth:    { color: 'var(--gold)',  dim: 'rgba(200,160,40,0.15)',  icon: '◇' },
  cycle:     { color: 'var(--rose)',  dim: 'rgba(220,80,120,0.15)',  icon: '↺' },
  wildcard:  { color: 'var(--sage)',  dim: 'rgba(120,180,100,0.15)', icon: '✦' },
  objective: { color: 'var(--gold)',  dim: 'rgba(200,160,40,0.12)',  icon: '★' },
}

// ─── Helpers ─────────────────────────────────────────────────────
function getCycleObjs(type, root, freqLevel = 1) {
  const objs = getCycleObjectives(type, root, freqLevel)
  if (objs.length) return objs.map(o => o.text)
  return [
    'Stay present to the energy of this cycle.',
    'Act in alignment with the theme of this period.',
    'Reflect on what this cycle is asking you to release or begin.',
  ]
}

function buildUserProfile(player, statXP = {}) {
  const { lp, ex, cl, so, ou, ac, th, m, d } = player
  const coreRoots = [lp.root, ex.root, cl.root, so.root, ou.root, ac.root, th.root]
    .map(r => reduceToSimple(r))
    .filter(r => r >= 1 && r <= 9)
  const counts = {}
  for (let i = 1; i <= 9; i++) counts[i] = 0
  coreRoots.forEach(n => counts[n]++)
  const sorted = [1,2,3,4,5,6,7,8,9].sort((a, b) => counts[b] - counts[a])
  return {
    dominantNumbers: sorted.filter(n => counts[n] >= 2).length
      ? sorted.filter(n => counts[n] >= 2) : sorted.slice(0, 2),
    weakerNumbers: sorted.filter(n => counts[n] === 0).length
      ? sorted.filter(n => counts[n] === 0) : sorted.slice(-2),
    outerNumber: reduceToSimple(ou.root),
    statXP,
    dayRoot: reduceToSimple(calcPersonalDay(m, d).root),
    bpRoots: [lp.root, ex.root, cl.root, so.root, ou.root, ac.root, th.root]
      .map(r => reduceToSimple(r))
      .filter((v, i, a) => a.indexOf(v) === i),
    lifeNodes: [
      { key: 'lp', root: lp.root },
      { key: 'ex', root: ex.root },
      { key: 'cl', root: cl.root },
      { key: 'so', root: so.root },
      { key: 'ou', root: ou.root },
      { key: 'ac', root: ac.root },
      { key: 'th', root: th.root },
    ],
  }
}

// ═══════════════════════════════════════════════════════════════
//  SIDE PANEL — Detail & Journal
// ═══════════════════════════════════════════════════════════════

function QuestSidePanel({ quest, onClose, onComplete }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const panelRef = useFocusTrap({ open: true, onClose })
  const clr = GQ_COLORS[quest.type] || GQ_COLORS.primary
  const meta = QUEST_TYPE_META[quest.type] || {}
  const diffMeta = getDifficultyMeta(quest.difficulty)
  const prompt = getJournalPrompt(quest.number, quest.type, quest.id)

  function handleSubmit() {
    const trimmed = (text || '').trim()
    if (trimmed.length < 30) {
      setError(`Need 30 chars (${trimmed.length}/30)`)
      return
    }

    // Capture values BEFORE completion mutates state
    const xpAmount = quest.rewardXP
    const isResonant = quest.isResonant
    const questColor = clr.color

    // Get position for floating XP
    const rect = panelRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + 100 : window.innerHeight / 2

    const result = onComplete(quest.id, trimmed)

    // completeGeneratedQuest returns undefined on success, { ok: false, error } on failure
    if (result && result.ok === false) {
      setError(result.error)
      return
    }

    try {
      // Trigger visual feedback
      showFloatingXP({ xp: xpAmount, color: questColor, x, y })
      showParticleBurst({ color: questColor, x, y, count: 16 })

      // Mark streak history
      markDayCompleted(isResonant)
      window.dispatchEvent(new CustomEvent('scl:streak_updated'))
    } catch (e) {
      console.warn('Visual feedback error:', e)
    }

    onClose() // Close panel to show sparks
  }

  return (
    <div
      className="quest-panel-overlay"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${quest.title} — Quest Details`}
      aria-describedby="quest-panel-prompt-text"
    >
      <div className="quest-panel" style={{ '--qp-color': clr.color }}>
        <button
          className="quest-panel-close"
          onClick={onClose}
          aria-label="Close quest panel"
        >
          ✕
        </button>

        {/* Header */}
        <div className="quest-panel-header">
          <span className="quest-panel-num" style={{ color: clr.color }} aria-hidden="true">
            {quest.number}
          </span>
          <div className="quest-panel-info">
            <span className="quest-panel-label" style={{ color: clr.color }}>
              {quest.type === 'objective' ? '★ ' : ''}{meta.label}
            </span>
            {/* Real difficulty badge with color */}
            <span
              className="quest-panel-diff quest-difficulty-badge"
              style={{ color: diffMeta.color, borderColor: `${diffMeta.color}44` }}
              aria-label={`Difficulty: ${diffMeta.label}`}
            >
              {diffMeta.icon} {diffMeta.label}
            </span>
          </div>
        </div>

        {/* Quest Text */}
        <div className="quest-panel-text">{quest.title}</div>

        {/* Blueprint Match Indicator */}
        {quest.isResonant && quest.matchesBlueprint && (
          <div
            className="bp-match-indicator"
            style={{ color: clr.color, borderColor: clr.color }}
            role="status"
            aria-label="Blueprint match bonus: double stat XP"
          >
            ⚡ BP MATCH · ×2 XP
          </div>
        )}

        {/* Journal Section */}
        {!quest.completed && (
          <div className="quest-panel-journal">
            <div className="quest-panel-prompt" id="quest-panel-prompt-text">{prompt}</div>
            <textarea
              className="quest-panel-input"
              placeholder="Carve your reflection..."
              value={text}
              onChange={e => { setText(e.target.value); setError('') }}
              rows={4}
              aria-label="Journal reflection text"
              aria-required="true"
              aria-describedby="quest-panel-error"
            />
            {error && (
              <div className="quest-panel-error" id="quest-panel-error" role="alert">
                {error}
              </div>
            )}
            <div className="quest-panel-foot">
              {/* XP preview with difficulty indicator */}
              <span className="quest-panel-xp" style={{ color: diffMeta.color }}>
                +{quest.rewardXP} XP
              </span>
              <button className="quest-panel-submit" onClick={handleSubmit}>
                ▶ CARVE & COMPLETE
              </button>
            </div>
          </div>
        )}

        {/* Completed State */}
        {quest.completed && (
          <div
            className="quest-panel-done"
            style={{ color: clr.color }}
            role="status"
            aria-label={`Quest completed. Earned ${quest.rewardXP} XP.`}
          >
            ✦ IGNITED · +{quest.rewardXP} XP EARNED
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  RUNE NODE — Square Grid Item
// ═══════════════════════════════════════════════════════════════

function RuneNode({ quest, isActive, onClick, onJustCompleted }) {
  const clr = GQ_COLORS[quest.type] || GQ_COLORS.primary
  const meta = QUEST_TYPE_META[quest.type] || {}
  const diffMeta = getDifficultyMeta(quest.difficulty)
  const [justIgnited, setJustIgnited] = useState(false)

  function handleClick() {
    if (quest.completed && !justIgnited) {
      onClick()
      return
    }
    onClick()
  }

  if (quest.completed) {
    return (
      <button
        type="button"
        className={`rune-node rune-node--done${justIgnited ? ' rune-node--igniting' : ''}`}
        style={{ '--node-color': clr.color }}
        onClick={handleClick}
        aria-label={`Quest ${quest.number} completed — ${meta?.label || 'quest'}`}
      >
        <div className="rune-node-done-fill" aria-hidden="true" />
        <div className="rune-node-type-icon" style={{ color: clr.color }} aria-hidden="true">{clr.icon}</div>
        <div className="rune-node-num" style={{ color: clr.color }} aria-hidden="true">✦</div>
        <div className="rune-node-label" style={{ color: clr.color }}>IGNITED</div>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`rune-node${quest.isResonant ? ' rune-node--resonant' : ''}${isActive ? ' rune-node--active' : ''} quest-state-transition`}
      style={{ '--node-color': clr.color }}
      onClick={handleClick}
      aria-label={`Quest ${quest.number}${quest.isResonant ? ', resonant' : ''} — ${meta?.label || 'quest'}`}
    >
      {quest.isResonant && <div className="rune-node-pulse" style={{ background: clr.color }} aria-hidden="true" />}
      <div className="rune-node-type-icon" style={{ color: clr.color }} aria-hidden="true">{clr.icon}</div>
      <div className="rune-node-num" style={{ color: clr.color }}>{quest.number}</div>
      <div className="rune-node-label" style={{ color: clr.color }}>{meta?.label || 'QUEST'}</div>
      {quest.isResonant && <div className="rune-node-tag" style={{ color: clr.color }} aria-hidden="true">⚡</div>}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
//  GLYPH JOURNAL PANEL — Journal prompt modal for each glyph
// ═══════════════════════════════════════════════════════════════

// Journal prompts for daily objectives
const GLYPH_JOURNAL_PROMPTS = [
  'How does this objective show up in your life right now? What is it asking you to practice, release, or embody? Write honestly — this is for your eyes only.',
  'What resistance or ease do you feel when you read this? Where in your life is this theme currently active? Explore the texture of it.',
  'If you fully embraced this objective today, what would change? What is one concrete action you could take? What is stopping you?',
]

function GlyphJournalPanel({ open, glyph, index, color, onClose, onComplete }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const panelRef = useFocusTrap({ open: open && !!glyph, onClose })
  const prevOpenRef = useRef(false)

  // Reset form when panel opens (using ref to detect transition)
  if (open && !prevOpenRef.current) {
    setText('')
    setError('')
  }
  prevOpenRef.current = open

  if (!open || !glyph) return null

  const prompt = GLYPH_JOURNAL_PROMPTS[index] || GLYPH_JOURNAL_PROMPTS[0]

  function handleSubmit() {
    const trimmed = text.trim()
    if (trimmed.length < 20) {
      setError(`Minimum 20 characters (${trimmed.length}/20)`)
      return
    }

    const result = onComplete(index, trimmed)
    if (result && result.ok === false) {
      setError(result.error)
      return
    }

    onClose()
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="quest-panel-overlay"
        onClick={onClose}
        role="presentation"
        style={{ '--qp-color': color }}
      >
        {/* Panel */}
        <div
          ref={panelRef}
          className="quest-panel"
          style={{ '--qp-color': color }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Glyph ${index + 1} — Journal Reflection`}
        >
          <button
            className="quest-panel-close"
            onClick={onClose}
            aria-label="Close journal panel"
          >
            ✕
          </button>

          {/* Header */}
          <div className="quest-panel-header">
            <span className="quest-panel-num" style={{ color }}>
              {index + 1}
            </span>
            <div className="quest-panel-info">
              <span className="quest-panel-label" style={{ color }}>
                ★ GLYPH OBJECTIVE
              </span>
            </div>
          </div>

          {/* Objective Text */}
          <div className="quest-panel-text">{glyph.text}</div>

          {/* Journal Section */}
          <div className="quest-panel-journal">
            <div className="quest-panel-prompt">{prompt}</div>
            <textarea
              className="quest-panel-input"
              placeholder="Carve your reflection..."
              value={text}
              onChange={(e) => { setText(e.target.value); setError('') }}
              rows={5}
              aria-label="Journal reflection text"
              aria-required="true"
            />
            {error && (
              <div className="quest-panel-error" role="alert">
                {error}
              </div>
            )}
            <div className="quest-panel-foot">
              <span className="quest-panel-xp" style={{ color }}>
                +2 FREQ XP · +1 STAT XP
              </span>
              <button className="quest-panel-submit" onClick={handleSubmit}>
                ▶ CARVE & COMPLETE
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════
//  DAY OBJECTIVES PANEL — 3 Personal Day Objectives as Glyphs
// ═══════════════════════════════════════════════════════════════

const DHR_COLOR_HEX = {
  'var(--teal)':   '#00e5cc',
  'var(--gold)':   '#c9a84c',
  'var(--rose)':   '#f472b6',
  'var(--sage)':   '#4ade80',
  'var(--purple)': '#a78bfa',
}

const DAY_RUNE_MARKS = ['I', 'II', 'III']

function DayObjectiveGlyph({ index, glyph, colorVar, onClick, completed }) {
  const colorHex = DHR_COLOR_HEX[colorVar] || '#c9a84c'
  const isSkill = glyph?.slot === 'skill'
  const mark = completed ? '✦' : (isSkill ? '◈' : DAY_RUNE_MARKS[index] || String(index + 1))
  const label = completed ? 'SEALED' : (isSkill ? 'SKILL' : 'DAY')

  return (
    <button
      type="button"
      className={`day-obj-rune quest-state-transition${completed ? ' day-obj-rune--done' : ''}${isSkill ? ' day-obj-rune--skill' : ''}`}
      style={{ '--node-color': colorHex }}
      onClick={onClick}
      aria-label={`${isSkill ? 'Skill' : 'Day'} objective ${index + 1}${completed ? ' — sealed' : ''}`}
    >
      <span className="day-obj-rune-corner day-obj-rune-corner--tl" aria-hidden="true" />
      <span className="day-obj-rune-corner day-obj-rune-corner--tr" aria-hidden="true" />
      <span className="day-obj-rune-corner day-obj-rune-corner--bl" aria-hidden="true" />
      <span className="day-obj-rune-corner day-obj-rune-corner--br" aria-hidden="true" />
      <span className="day-obj-rune-mark" aria-hidden="true">{mark}</span>
      <span className="day-obj-rune-label">{label}</span>
    </button>
  )
}

function DayObjectivesPanel({ objectives, completed, colorVar, pd, onOpenObjective }) {
  if (!objectives || objectives.length === 0) return null

  const allCompleted = completed && completed.every(Boolean)

  return (
    <div className="gq-panel gq-panel--day-objs rune-panel-enter">
      <div className="rune-connector rune-connector--day-objs" />

      {/* Header */}
      <div className="gq-panel-header">
        <span className="gq-panel-title">
          ◈ DAY {pd.root} OBJECTIVES
        </span>
      </div>

      <div className="rune-grid rune-grid--day-objs">
        {objectives.map((obj, i) => (
          <DayObjectiveGlyph
            key={i}
            index={i}
            glyph={obj}
            colorVar={colorVar}
            completed={completed?.[i]}
            onClick={() => onOpenObjective(obj, i)}
          />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  DAILY HERO QUEST BOX — Diablo 2-style square glyph
// ═══════════════════════════════════════════════════════════════

function DailyHeroQuestBox({
  color,
  dayRoot,
  subtitle,
  icon = '◈',
  state = 'active',
  isFocusMatch = false,
  isSelected = false,
  onClick,
}) {
  const isSealed = state === 'sealed'
  const isIgniting = state === 'igniting'

  return (
    <button
      type="button"
      className={[
        'daily-hero-quest-box',
        isSealed && 'daily-hero-quest-box--sealed',
        isIgniting && 'daily-hero-quest-box--igniting',
        isFocusMatch && !isSealed && 'daily-hero-quest-box--resonant',
        isSelected && !isSealed && 'daily-hero-quest-box--selected',
      ].filter(Boolean).join(' ')}
      style={{ '--dq-color': color }}
      onClick={onClick}
      disabled={isSealed || isIgniting}
      aria-label={
        isSealed
          ? `Daily quest sealed — Personal Day ${dayRoot}`
          : `Daily quest — Personal Day ${dayRoot}. Tap to view.`
      }
    >
      <span className="daily-hero-quest-box-frame" aria-hidden="true" />
      <span className="daily-hero-quest-box-corner daily-hero-quest-box-corner--tl" aria-hidden="true" />
      <span className="daily-hero-quest-box-corner daily-hero-quest-box-corner--tr" aria-hidden="true" />
      <span className="daily-hero-quest-box-corner daily-hero-quest-box-corner--bl" aria-hidden="true" />
      <span className="daily-hero-quest-box-corner daily-hero-quest-box-corner--br" aria-hidden="true" />
      <span className="daily-hero-quest-box-glow" aria-hidden="true" />

      <span className="daily-hero-quest-box-icon" aria-hidden="true">
        {isSealed ? '✦' : icon}
      </span>
      <span className="daily-hero-quest-box-num" aria-hidden="true">
        {isSealed ? '✓' : dayRoot}
      </span>
      <span className="daily-hero-quest-box-label">
        {isSealed ? 'SEALED' : subtitle}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
//  DAILY QUEST HERO CARD
// ═══════════════════════════════════════════════════════════════

function DailyQuestCard({ daily, colorVar, meaning, pd, glyphsCompleted=true, isGated=false, bpRoots=[], onComplete, lpRoot, freqLevel=1 }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [igniting, setIgniting] = useState(false)
  const nodeRef = useRef(null)
  const { completeDailyQuest: eqComplete } = useQuestEngine()
  const doComplete = onComplete || eqComplete

  const dayRoot = reduceToSimple(pd.root)
  const isFocusMatch = daily?.dayRootMatch ?? !!(bpRoots?.filter(r => r === dayRoot).length)
  const panelColorHex = DHR_COLOR_HEX[colorVar] || '#00e5cc'

  function handleComplete() {
    const rect = nodeRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

    // T=0ms: doComplete, close panel, ignition begins
    doComplete(lpRoot)
    setPanelOpen(false)
    setIgniting(true)

    try {
      // Burst immediately
      showParticleBurst({ color: colorVar, x, y, count: 28 })

      // T=350ms: XP pop + toast breakdown
      setTimeout(() => {
        showFloatingXP({ xp: XP_AWARDS.daily, color: colorVar, x, y })
        showQuestRewardToast({
          questNumber: dayRoot,
          questTitle: meaning.theme || 'Daily Alignment',
          charXP: XP_AWARDS.daily,
          statXP: 5,
          isResonant: isFocusMatch,
          difficulty: 'medium',
          statNum: dayRoot,
        })
      }, 350)

      // T=750ms: ignition ends, done state enters
      setTimeout(() => {
        setIgniting(false)
        setJustCompleted(true)
        markDayCompleted(isFocusMatch)
        window.dispatchEvent(new CustomEvent('scl:streak_updated'))
      }, 750)

      // T=3750ms: reset
      setTimeout(() => setJustCompleted(false), 3750)
    } catch (e) {
      console.warn('Visual feedback error:', e)
      setIgniting(false)
    }
  }

  if (justCompleted || daily.completed) {
    return (
      <div className="daily-hero-rune-wrap">
        <DailyHeroQuestBox
          color={panelColorHex}
          dayRoot={dayRoot}
          subtitle={`DAY ${pd.dayNum}`}
          icon={CYCLE_QUEST_COLORS.personalDay?.icon || '◈'}
          state="sealed"
        />
      </div>
    )
  }

  return (
    <div className="daily-hero-rune-wrap">
      {igniting && <div className="daily-complete-flash" style={{ '--dq-color': colorVar }} />}
      <div ref={nodeRef} className="daily-hero-node">
        <DailyHeroQuestBox
          color={panelColorHex}
          dayRoot={dayRoot}
          subtitle={`DAY ${pd.dayNum}`}
          icon={CYCLE_QUEST_COLORS.personalDay?.icon || '◈'}
          state={igniting ? 'igniting' : 'active'}
          isFocusMatch={isFocusMatch}
          isSelected={panelOpen}
          onClick={() => setPanelOpen(true)}
        />
        {isFocusMatch && !igniting && (
          <div className="daily-hero-node-tag" style={{ color: colorVar }}>⚡</div>
        )}
      </div>

      <FlowDetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        color={panelColorHex}
        title={meaning.theme || 'Daily Alignment'}
        subtitle={`Personal Day ${dayRoot} · Cycle ${pd.dayNum}`}
        icon={CYCLE_QUEST_COLORS.personalDay?.icon || '◈'}
      >
        <div className="dhr-panel-focus">
          <span className="dhr-panel-focus-num">{dayRoot}</span>
          <div>
            <span className="dhr-panel-focus-label">TODAY'S FOCUS</span>
            {isFocusMatch && (
              <span className="dhr-panel-focus-match">⚡ BLUEPRINT MATCH · ×2 XP</span>
            )}
          </div>
        </div>

        {(meaning.summary || daily.body) && (
          <div className="dhr-panel-summary">{meaning.summary || daily.body}</div>
        )}

        {daily.blueprintLabel && (
          <div className="dhr-panel-blueprint" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: colorVar, opacity: 0.75, marginBottom: 12 }}>
            ◈ {daily.blueprintLabel}
          </div>
        )}

        {daily.dayObj && (
          <div className="dhr-panel-hero-obj" style={{ fontFamily: "'Crimson Text', serif", fontSize: '14px', lineHeight: 1.5, marginBottom: 12, color: 'var(--text-mid)' }}>
            {daily.dayObj}
          </div>
        )}

        <div className="dhr-panel-section-label">◈ OBJECTIVES</div>
        <ul className="dhr-panel-obj-list">
          {getCycleObjs('personalDay', pd.root, freqLevel).map((o, i) => <li key={i}>{o}</li>)}
        </ul>

        {daily.dayObj && (
          <div className="dhr-panel-life-obj">
            <span>★ </span><span>{daily.dayObj}</span>
          </div>
        )}

        <button
          className="dhr-panel-complete-btn"
          style={{ '--dq-btn-color': colorVar }}
          onClick={handleComplete}
          disabled={isGated}
          title={isGated ? 'Complete all 3 daily glyph objectives first' : ''}
        >
          {isGated ? '◉ COMPLETE 3 GLYPHS FIRST' : glyphsCompleted ? '▶ COMPLETE DAILY QUEST' : '◉ COMPLETE 3 GLYPHS FIRST'}
        </button>
      </FlowDetailPanel>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  REMINDER BANNER
// ═══════════════════════════════════════════════════════════════

function ReminderBanner() {
  const unchecked = getUncheckedMultiDayQuests()
  if (!unchecked.length) return null
  return (
    <div className="gq-reminder">
      <span>◉</span>
      <span>
        {unchecked.length === 1
          ? `Active commitment — check in today`
          : `${unchecked.length} commitments — check in to keep streaks`
        }
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  END-OF-DAY SUMMARY NOTIFICATION
// ═══════════════════════════════════════════════════════════════

function DailySummaryCard({ summary, onDismiss }) {
  return (
    <div className="daily-summary">
      <button className="daily-summary-close" onClick={onDismiss}>✕</button>
      <div className="daily-summary-title">◈ QUEST RECAP</div>
      <div className="daily-summary-stats">
        <div className="daily-summary-row">
          <span className="daily-summary-label">Quests</span>
          <span className="daily-summary-value">{summary.questsCompleted} completed</span>
        </div>
        <div className="daily-summary-row">
          <span className="daily-summary-label">XP Earned</span>
          <span className="daily-summary-value" style={{ color: 'var(--teal)' }}>+{summary.xpEarned} XP</span>
        </div>
        {summary.resonantCompletions > 0 && (
          <div className="daily-summary-row">
            <span className="daily-summary-label">⚡ Resonant</span>
            <span className="daily-summary-value" style={{ color: 'var(--gold)' }}>{summary.resonantCompletions}</span>
          </div>
        )}
        {summary.pipsFilled > 0 && (
          <div className="daily-summary-row">
            <span className="daily-summary-label">Pips Filled</span>
            <span className="daily-summary-value">{summary.pipsFilled}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  STREAK BADGE
// ═══════════════════════════════════════════════════════════════

function StreakTooltip({ lines, onClose }) {
  return createPortal(
    <div className="streak-tooltip" role="tooltip" onClick={e => { e.stopPropagation(); onClose() }}>
      {lines.map((l, i) =>
        l === '' ? <div key={i} className="streak-tooltip-divider" /> :
        <div key={i} className="streak-tooltip-line">{l}</div>
      )}
      <div className="streak-tooltip-hint">tap to close</div>
    </div>,
    document.body
  )
}

export function StreakBadge({ streak, compact = false }) {
  const [tipVisible, setTipVisible] = useState(false)
  const isChain   = streak >= 3
  const hasStreak = streak > 0
  const tipLines  = [
    streak === 0
      ? 'Complete quests daily to build your streak.'
      : `${streak} day${streak > 1 ? 's' : ''} in a row — keep going!`,
    '',
    '3+ days → Resonance Chain (+50% XP bonus)',
    '7+ days → Frequency Amplifier (×2 on rare quests)',
    '30 days  → Ascendant Mark (permanent title)',
  ]

  if (compact) {
    return (
      <>
        <button
          type="button"
          className={`home-pulse-chip home-pulse-chip--streak${isChain ? ' home-pulse-chip--chain' : ''}${!hasStreak ? ' home-pulse-chip--muted' : ''}`}
          onClick={() => setTipVisible((v) => !v)}
          aria-label={hasStreak ? `${streak} day streak` : 'No streak yet'}
        >
          <span aria-hidden="true">{isChain ? '🔥' : hasStreak ? '⚡' : '◇'}</span>
          {hasStreak ? `${streak}d streak` : 'No streak'}
        </button>
        {tipVisible && <StreakTooltip lines={tipLines} onClose={() => setTipVisible(false)} />}
      </>
    )
  }

  return (
    <div
      className={`streak-badge${isChain ? ' streak-badge--chain' : ''}${!hasStreak ? ' streak-badge--empty' : ''}`}
      onPointerDown={() => setTipVisible(v => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTipVisible(v => !v) } }}
    >
      <span className="streak-badge-icon">{isChain ? '🔥' : hasStreak ? '⚡' : '◇'}</span>
      {hasStreak && <span className="streak-badge-count">{streak}</span>}
      <span className="streak-badge-label">{isChain ? 'CHAIN' : hasStreak ? 'STREAK' : 'NO STREAK'}</span>
      {isChain && <span className="streak-badge-bonus">+50% XP</span>}
      {tipVisible && <StreakTooltip lines={tipLines} onClose={() => setTipVisible(false)} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════

export default function DailySection({ playerData, daily, completeDailyQuest, lpRoot }) {
  const qe = useQE()
  const { xp, completeDailyGlyph, getDailyGlyphsState } = qe
  const [glyphsState, setGlyphsState] = useState(null)
  const [journalModal, setJournalModal] = useState({ open: false, glyphIdx: -1 })

  // Build profile for bpRoots (simple, no memo needed)
  const profile = playerData ? buildUserProfile(playerData, xp || {}) : null
  const bpRoots = profile?.bpRoots || []

  if (!playerData) return null
  const { m, d } = playerData
  const [summary, setSummary] = useState(null)
  const [selectedObjective, setSelectedObjective] = useState(null)

    // Load/populate glyphs
  useEffect(() => {
    if (!lpRoot || !playerData) return
    const state = getDailyGlyphsState(lpRoot)
    // Always refresh glyph content from blueprint (2 day + 1 skill); repair if < 3.
    const blueprint = resolveDailyBlueprint(playerData, xp?.freqLevel ?? 1)
    if (blueprint?.glyphs?.length) {
      state.glyphs = blueprint.glyphs
      state.completed = [false, false, false].map((_, i) => !!state.completed?.[i])
      state.journals = ['', '', ''].map((_, i) => state.journals?.[i] || '')
    }
    try {
      localStorage.setItem('scl_daily_glyphs', JSON.stringify(state))
    } catch {}
    setGlyphsState(state)
  }, [lpRoot, playerData, xp?.freqLevel])

  // Listen for engine updates
  useEffect(() => {
    const handleGlyphsUpdate = (e) => {
      if (e.detail && lpRoot) {
        setGlyphsState(getDailyGlyphsState(lpRoot))
      }
    }
    window.addEventListener('scl:daily_glyphs_updated', handleGlyphsUpdate)
    return () => window.removeEventListener('scl:daily_glyphs_updated', handleGlyphsUpdate)
  }, [lpRoot])



  const pd = calcPersonalDay(m, d)
  const cfg = CYCLE_QUEST_COLORS.personalDay
  const meaning = CYCLE_MEANINGS.personalDay?.[pd.root] || {}
  const colorVar = `var(${cfg.color})`
  const blueprintGlyphs = useMemo(
    () => resolveDailyBlueprint(playerData, xp?.freqLevel ?? 1)?.glyphs || [],
    [playerData, xp?.freqLevel]
  )
  const panelColorHex = DHR_COLOR_HEX[colorVar] || '#00e5cc'

  const handleOpenObjective = useCallback((text, index) => {
    setSelectedObjective({ text, index })
  }, [])

  const handleGlyphClick = useCallback((glyph, index) => {
    if (glyphsState?.completed?.[index]) {
      // View-only if done
      handleOpenObjective(glyph.text, index)
    } else {
      // Open journal
      setJournalModal({ open: true, glyphIdx: index })
    }
  }, [glyphsState, handleOpenObjective])

  const handleJournalSubmit = useCallback((index, journal) => {
    if (!lpRoot || glyphsState?.completed?.[index]) return { ok: false, error: 'Already completed' }
    const result = completeDailyGlyph(lpRoot, index, journal)
    if (result.ok !== false) {
      setJournalModal({ open: false, glyphIdx: -1 })
      // Refetch state
      const newState = getDailyGlyphsState(lpRoot)
      setGlyphsState(newState)
    }
    return result
  }, [lpRoot, glyphsState, completeDailyGlyph])

  return (
    <div className="daily-section">
      {summary && <DailySummaryCard summary={summary} onDismiss={() => setSummary(null)} />}

      {/* Countdown Timer */}
      <DailyCountdown />

      {/* Hero */}
      <DailyQuestCard
        daily={daily}
        colorVar={colorVar}
        meaning={meaning}
        pd={pd}
        glyphsCompleted={glyphsState?.completed?.every(Boolean) || false}
        isGated={!glyphsState || QuestEngine_isDailyGated(lpRoot)}
        bpRoots={bpRoots}
        onComplete={completeDailyQuest}
        lpRoot={lpRoot}
        freqLevel={xp?.freqLevel ?? 1}
      />

      <ReminderBanner />

      {/* Day Objectives — 2 personal day + 1 skill glyph */}
      <DayObjectivesPanel
        objectives={
          glyphsState?.glyphs?.length >= 3 ? glyphsState.glyphs : blueprintGlyphs
        }
        completed={glyphsState?.completed}
        colorVar={colorVar}
        pd={pd}
        onOpenObjective={handleGlyphClick}
      />

      {/* Glyph Journal Modal */}
      <GlyphJournalPanel
        open={journalModal.open}
        glyph={glyphsState?.glyphs?.[journalModal.glyphIdx]}
        index={journalModal.glyphIdx}
        color={DHR_COLOR_HEX[colorVar] || '#00e5cc'}
        onClose={() => setJournalModal({ open: false, glyphIdx: -1 })}
        onComplete={handleJournalSubmit}
      />

      {/* Objective Detail Panel */}
      {selectedObjective && (
        <FlowDetailPanel
          open={!!selectedObjective}
          onClose={() => setSelectedObjective(null)}
          color={panelColorHex}
          title={`Objective ${selectedObjective.index + 1}`}
          subtitle={`Personal Day ${pd.root}`}
          icon="✦"
        >
          <div style={{ padding: '16px', color: 'var(--text-mid)', fontFamily: "'Crimson Text', serif", fontSize: '14px', lineHeight: '1.6' }}>
            <p>{selectedObjective.text}</p>
            <p style={{ marginTop: '12px', fontStyle: 'italic', color: 'var(--text-dim)' }}>
              Complete this objective as part of your daily practice.
            </p>
          </div>
        </FlowDetailPanel>
      )}
    </div>
  )
}
