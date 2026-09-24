/**
 * DailySection — Bound quest journal
 *
 * One book surface for today's alignment and daily quests.
 * Titles stay visible; the carve field expands on the entry being completed.
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { XP_AWARDS } from '../../lib/questEngine'
import {
  generateDailyQuests, getGeneratedQuests, completeGeneratedQuest,
  getUncheckedMultiDayQuests,
  QUEST_TYPE_META,
  getJournalPrompt,
  detectMultiDay,
  rerollGeneratedQuests, getRerollsRemaining, hasCompletedQuests,
  getDifficultyMeta,
  buildQuestUserProfile,
} from '../../lib/numerologyQuests'
import { CYCLE_QUEST_COLORS, CYCLE_MEANINGS } from '../../lib/data'
import { getCycleObjectives } from '../../lib/objectives'
import {
  calcPersonalDay, reduceToSimple,
} from '../../lib/numerology'
import { showFloatingXP, showParticleBurst } from '../effects/FloatingXP'
import { markDayCompleted } from '../effects/StreakCalendar'
import DailyProgressRing from '../effects/DailyProgressRing'
import DailyCountdown from '../effects/DailyCountdown'
import StreakCalendar from '../effects/StreakCalendar'
import {
  loadClassLoadout,
  getClassTitle,
  getLoadoutPathChips,
  getFilledSlots,
} from '../../lib/classLoadout'
import { useAppDispatch } from '../../context/AppContext'

function getResonanceChain() {
  try {
    const raw = JSON.parse(localStorage.getItem('scl_resonance_chain') || 'null')
    if (!raw) return 0
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    const parts = raw.lastDate.split('-').map(Number)
    const last = new Date(parts[0], parts[1] - 1, parts[2])
    const diff = Math.floor((today - last) / 86400000)
    return (diff <= 1 && raw.lastDate === todayStr) || diff === 1 ? raw.streak : diff === 0 ? raw.streak : 0
  } catch { return 0 }
}

const GQ_COLORS = {
  primary:   { color: 'var(--teal)',  dim: 'rgba(0,229,180,0.15)',   icon: '◈' },
  growth:    { color: 'var(--gold)',  dim: 'rgba(200,160,40,0.15)',  icon: '◇' },
  cycle:     { color: 'var(--rose)',  dim: 'rgba(220,80,120,0.15)',  icon: '↺' },
  wildcard:  { color: 'var(--sage)',  dim: 'rgba(120,180,100,0.15)', icon: '✦' },
  objective: { color: 'var(--gold)',  dim: 'rgba(200,160,40,0.12)',  icon: '★' },
}

function getCycleObjs(type, root) {
  const objs = getCycleObjectives(type, root)
  if (objs.length) return objs.map(o => o.text)
  return [
    'Stay present to the energy of this cycle.',
    'Act in alignment with the theme of this period.',
    'Reflect on what this cycle is asking you to release or begin.',
  ]
}

const JOURNAL_SOURCES = [
  { id: 'skill', label: 'CLASS', icon: '◈', color: 'var(--teal)' },
  { id: 'life',  label: 'LIFE', icon: '★', color: 'var(--gold)' },
  { id: 'cycle', label: 'CURRENT', icon: '↺', color: 'var(--rose)' },
]

function journalSource(quest) {
  if (quest.source === 'skill' || quest.type === 'skilltree') return JOURNAL_SOURCES[0]
  if (quest.source === 'life' || quest.type === 'objective') return JOURNAL_SOURCES[1]
  if (quest.source === 'current' || quest.type === 'cycle') return JOURNAL_SOURCES[2]
  const clr = GQ_COLORS[quest.type] || GQ_COLORS.wildcard
  const meta = QUEST_TYPE_META[quest.type]
  return {
    id: quest.type || 'other',
    label: meta?.label || 'QUEST',
    icon: clr.icon,
    color: clr.color,
  }
}

function isKnownSource(source) {
  return JOURNAL_SOURCES.some(s => s.id === source.id)
}

function formatJournalDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function questMultiDay(quest) {
  if (quest?.multiDay?.totalDays) return quest.multiDay
  return detectMultiDay(quest?.title || '')
}

function MultiDayPips({ totalDays }) {
  const days = Math.max(0, Number(totalDays) || 0)
  if (!days) return null

  // Cap raw pips so 30-day stays readable; denser weeks for longer runs
  const maxPips = days <= 7 ? days : days <= 14 ? days : 10
  const pips = Array.from({ length: maxPips }, (_, i) => i)

  return (
    <span
      className="qj-entry-multiday"
      title={`${days}-day multi-day commitment`}
      aria-label={`${days}-day multi-day quest`}
    >
      <span className="qj-multiday-pips" aria-hidden="true">
        {pips.map(i => (
          <span key={i} className="qj-multiday-pip" />
        ))}
        {days > maxPips && <span className="qj-multiday-pip qj-multiday-pip--more" />}
      </span>
      <span className="qj-multiday-label">{days}-DAY</span>
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
//  RULED ENTRY — title visible, carve expands in place
// ═══════════════════════════════════════════════════════════════

function JournalQuestRow({ quest, source, expanded, onToggle, onComplete }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const rowRef = useRef(null)
  const inputRef = useRef(null)
  const diffMeta = getDifficultyMeta(quest.difficulty)
  const prompt = getJournalPrompt(quest.number, quest.type, quest.id)
  const count = (text || '').trim().length
  const multiDay = questMultiDay(quest)
  const multiDays = multiDay?.totalDays || 0

  useEffect(() => {
    if (!expanded) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [expanded])

  function handleSubmit() {
    const trimmed = (text || '').trim()
    if (trimmed.length < 30) {
      setError(`Need 30 chars (${trimmed.length}/30)`)
      return
    }

    const xpAmount = quest.rewardXP
    const isResonant = quest.isResonant
    const questColor = source.color
    const rect = rowRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + 40 : window.innerHeight / 2

    const result = onComplete(quest.id, trimmed)
    if (result && result.ok === false) {
      setError(result.error)
      return
    }

    try {
      showFloatingXP({ xp: xpAmount, color: questColor, x, y })
      showParticleBurst({ color: questColor, x, y, count: 16 })
      markDayCompleted(isResonant)
      window.dispatchEvent(new CustomEvent('scl:streak_updated'))
    } catch (e) {
      console.warn('Visual feedback error:', e)
    }
  }

  if (quest.completed) {
    return (
      <div
        className={`qj-entry qj-entry--done${multiDays ? ' qj-entry--multiday' : ''}`}
        style={{ '--qj-ink': source.color }}
      >
        <span className="qj-entry-margin" aria-hidden="true">
          <span className="qj-entry-seal">✦</span>
        </span>
        <div className="qj-entry-body">
          <span className="qj-entry-title">{quest.title}</span>
          <span className="qj-entry-done-meta">
            {multiDays > 0 && <MultiDayPips totalDays={multiDays} />}
            <span className="qj-entry-stamp">IGNITED</span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      className={`qj-entry${expanded ? ' qj-entry--open' : ''}${quest.isResonant ? ' qj-entry--resonant' : ''}${multiDays ? ' qj-entry--multiday' : ''}`}
      style={{ '--qj-ink': source.color }}
    >
      <button
        type="button"
        className="qj-entry-trigger"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className={`qj-entry-margin${expanded ? ' qj-entry-margin--pulse' : ''}`} aria-hidden="true">
          <span className="qj-entry-seal">{source.icon}</span>
          {quest.number != null && <span className="qj-entry-folio">{quest.number}</span>}
        </span>
        <span className="qj-entry-body">
          <span className="qj-entry-title">{quest.title}</span>
          {(quest.routeName || quest.stageName) && (
            <span className="qj-entry-route">
              {quest.discovery ? 'Discovery' : (quest.routeName || 'Path')}
              {quest.stageName ? ` · ${quest.stageName}` : ''}
            </span>
          )}
          {quest.supportsClass && !quest.routeName && (
            <span className="qj-entry-route">Supports class path</span>
          )}
          <span className="qj-entry-meta">
            {multiDays > 0 && <MultiDayPips totalDays={multiDays} />}
            <span className="qj-entry-diff" style={{ color: diffMeta.color }}>
              {diffMeta.icon} {diffMeta.label}
            </span>
            <span className="qj-entry-xp">+{quest.rewardXP} XP</span>
            {quest.isResonant && quest.matchesBlueprint && (
              <span className="qj-entry-bp">×2</span>
            )}
          </span>
        </span>
        <span className="qj-entry-mark" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="qj-carve">
          {multiDays > 0 && (
            <p className="qj-carve-multiday-note">
              Multi-day commitment · {multiDays} consecutive days
            </p>
          )}
          <p className="qj-carve-prompt" id={`qj-prompt-${quest.id}`}>{prompt}</p>
          <textarea
            ref={inputRef}
            className="qj-carve-input"
            placeholder="Write down your experience..."
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            rows={4}
            aria-label="Journal reflection text"
            aria-required="true"
            aria-describedby={error ? `qj-error-${quest.id}` : `qj-prompt-${quest.id}`}
            onKeyDown={e => { if (e.key === 'Escape') onToggle() }}
          />
          <div className="qj-carve-foot">
            <span className={`qj-carve-count${count >= 30 ? ' qj-carve-count--ready' : ''}`}>
              {count}/30
            </span>
            <span className="qj-carve-xp" style={{ color: diffMeta.color }}>+{quest.rewardXP} XP</span>
            <button type="button" className="qj-carve-submit" onClick={handleSubmit}>
              ▶ CARVE & COMPLETE
            </button>
          </div>
          {error && (
            <div className="qj-carve-error" id={`qj-error-${quest.id}`} role="alert">{error}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  CHAPTERS — Skill / Life / Cycle
// ═══════════════════════════════════════════════════════════════

function QuestChapters({
  genQuests,
  onComplete,
  expandedId,
  onExpand,
  alignmentSlot,
}) {
  const dispatch = useAppDispatch()
  const [loadout, setLoadout] = useState(() => loadClassLoadout())

  useEffect(() => {
    const onL = (e) => setLoadout(e.detail || loadClassLoadout())
    window.addEventListener('scl:class_loadout_updated', onL)
    return () => window.removeEventListener('scl:class_loadout_updated', onL)
  }, [])

  if (!genQuests && !alignmentSlot) return null

  const active = (genQuests || []).filter(q => !q.completed)
  const done = (genQuests || []).filter(q => q.completed)
  const filled = getFilledSlots(loadout)
  const loadoutEmpty = filled.length === 0
  const classTitle = getClassTitle(loadout)
  const pathChips = getLoadoutPathChips(loadout)

  const grouped = new Map()
  const extras = []
  for (const quest of [...active, ...done]) {
    const source = journalSource(quest)
    if (isKnownSource(source)) {
      if (!grouped.has(source.id)) grouped.set(source.id, [])
      grouped.get(source.id).push(quest)
    } else {
      extras.push({ quest, source })
    }
  }

  function openSkills() {
    dispatch({ type: 'SET_TAB', payload: 'profile', section: 'skills' })
  }

  function renderRow(quest, source) {
    return (
      <JournalQuestRow
        key={quest.id}
        quest={quest}
        source={source}
        expanded={expandedId === quest.id}
        onToggle={() => onExpand(quest.id)}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className="qj-chapters">
      {alignmentSlot && (
        <section className="qj-chapter qj-chapter--alignment" aria-labelledby="qj-chapter-alignment">
          <h3 id="qj-chapter-alignment" className="qj-chapter-label" style={{ color: 'var(--rose)' }}>
            <span aria-hidden="true">◎</span>
            <span>ALIGNMENT</span>
          </h3>
          <div className="qj-chapter-entries">
            {alignmentSlot}
          </div>
        </section>
      )}

      {JOURNAL_SOURCES.map(source => {
        const quests = grouped.get(source.id) || []
        const isClass = source.id === 'skill'

        // Empty loadout: CLASS chapter shows CTA instead of (or above) discovery rows
        if (isClass && loadoutEmpty) {
          return (
            <section key={source.id} className="qj-chapter" aria-labelledby={`qj-chapter-${source.id}`}>
              <h3 id={`qj-chapter-${source.id}`} className="qj-chapter-label" style={{ color: source.color }}>
                <span aria-hidden="true">{source.icon}</span>
                <span>{source.label}</span>
              </h3>
              <button type="button" className="qj-class-cta" onClick={openSkills}>
                <span className="qj-class-cta-kicker">UNSPECIALIZED</span>
                <span className="qj-class-cta-title">Equip your class paths in Skills</span>
                <span className="qj-class-cta-sub">Daily training focuses on up to two equipped routes</span>
              </button>
              {quests.length > 0 && (
                <div className="qj-chapter-entries">
                  <p className="qj-discovery-note">Discovery training until you equip:</p>
                  {quests.map(quest => renderRow(quest, source))}
                </div>
              )}
            </section>
          )
        }

        if (!quests.length && !isClass) return null
        if (!quests.length) return null

        return (
          <section key={source.id} className="qj-chapter" aria-labelledby={`qj-chapter-${source.id}`}>
            <h3 id={`qj-chapter-${source.id}`} className="qj-chapter-label" style={{ color: source.color }}>
              <span aria-hidden="true">{source.icon}</span>
              <span>{source.label}</span>
              {isClass && (
                <span className="qj-chapter-class-meta">{classTitle}</span>
              )}
            </h3>
            {isClass && pathChips.length > 0 && (
              <div className="qj-chapter-chips" aria-label="Class loadout">
                {pathChips.map((chip) => (
                  <span
                    key={`${chip.number}-${chip.routeId}`}
                    className="qj-chapter-chip"
                    style={{ '--chip-color': chip.color }}
                  >
                    {chip.sealLabel} · {chip.routeName}
                  </span>
                ))}
              </div>
            )}
            <div className="qj-chapter-entries">
              {quests.map(quest => renderRow(quest, source))}
            </div>
          </section>
        )
      })}

      {extras.length > 0 && (
        <section className="qj-chapter" aria-label="Other quests">
          <div className="qj-chapter-entries">
            {extras.map(({ quest, source }) => renderRow(quest, source))}
          </div>
        </section>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  ALIGNMENT PAGE
// ═══════════════════════════════════════════════════════════════

function DailyQuestCard({ daily, colorVar, meaning, pd, onComplete, lpRoot, classSupportNote }) {
  const [justCompleted, setJustCompleted] = useState(false)
  const cardRef = useRef(null)
  const { completeDailyQuest: eqComplete } = useQuestEngine()
  const doComplete = onComplete || eqComplete

  const dayRoot = reduceToSimple(pd.root)
  const isFocusMatch = !!(daily?.dayRootMatch)
  const awardedXP = daily?.xpAward
    ?? Math.round(XP_AWARDS.daily * (isFocusMatch ? 2 : 1.5))
  const theme = meaning.theme || 'Daily Alignment'
  const summary = meaning.summary || daily.body
  const objectives = getCycleObjs('personalDay', pd.root)
  const icon = CYCLE_QUEST_COLORS.personalDay?.icon || '◈'

  function handleComplete() {
    const rect = cardRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

    doComplete(lpRoot)
    setJustCompleted(true)

    try {
      showFloatingXP({ xp: awardedXP, color: colorVar, x, y })
      showParticleBurst({ color: colorVar, x, y, count: 14 })
      markDayCompleted(isFocusMatch)
      window.dispatchEvent(new CustomEvent('scl:streak_updated'))
      if (classSupportNote) {
        window.dispatchEvent(new CustomEvent('scl:xp_toast', {
          detail: { msg: classSupportNote, color: 'var(--gold)' },
        }))
      }
    } catch (e) {
      console.warn('Visual feedback error:', e)
    }

    setTimeout(() => setJustCompleted(false), 3000)
  }

  if (justCompleted || daily.completed) {
    return (
      <div className="qj-align qj-align--done" style={{ '--align-color': colorVar }} role="status">
        <span className="qj-align-margin" aria-hidden="true">
          <span className="qj-align-seal">✓</span>
        </span>
        <div className="qj-align-body">
          <span className="qj-align-kicker">ALIGNMENT</span>
          <span className="qj-align-theme">{theme}</span>
        </div>
        <span className="qj-align-stamp">COMPLETE</span>
      </div>
    )
  }

  return (
    <article ref={cardRef} className="qj-align" style={{ '--align-color': colorVar }}>
      <div className="qj-align-head">
        <span className="qj-align-margin" aria-hidden="true">
          <span className="qj-align-seal">{icon}</span>
          <span className="qj-align-folio">{dayRoot}</span>
          <span className="qj-align-day">DAY {pd.dayNum}</span>
        </span>
        <div className="qj-align-copy">
          <span className="qj-align-kicker">ALIGNMENT</span>
          <h3 className="qj-align-theme">{theme}</h3>
          {isFocusMatch && (
            <span className="qj-align-match">BLUEPRINT MATCH · ×2 XP</span>
          )}
          {classSupportNote && (
            <span className="qj-align-class-note">{classSupportNote}</span>
          )}
        </div>
      </div>

      {summary && <p className="qj-align-summary">{summary}</p>}

      <div className="qj-align-section">OBJECTIVES</div>
      <ul className="qj-align-objs">
        {objectives.map((o, i) => <li key={i}>{o}</li>)}
      </ul>

      {daily.dayObj && (
        <div className="qj-align-life">
          <span aria-hidden="true">★ </span><span>{daily.dayObj}</span>
        </div>
      )}

      <button type="button" className="qj-align-complete" onClick={handleComplete}>
        ▶ COMPLETE DAILY QUEST
      </button>
    </article>
  )
}

function ReminderBanner() {
  const unchecked = getUncheckedMultiDayQuests()
  if (!unchecked.length) return null
  return (
    <div className="gq-reminder">
      <span>◉</span>
      <span>
        {unchecked.length === 1
          ? 'Active commitment — check in today'
          : `${unchecked.length} commitments — check in to keep streaks`
        }
      </span>
    </div>
  )
}

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
  const isChain = streak >= 3
  const hasStreak = streak > 0
  const tipLines = [
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
//  BOUND JOURNAL ROOT
// ═══════════════════════════════════════════════════════════════

export default function DailySection({ playerData, daily, completeDailyQuest }) {
  const { xp } = useQuestEngine()
  const [genState, setGenState] = useState(() => getGeneratedQuests())
  const [expandedId, setExpandedId] = useState(null)
  const [rerollError, setRerollError] = useState(null)
  const chainStreak = getResonanceChain()
  const profileReady = Boolean(playerData)
  const rerollsRemaining = getRerollsRemaining()
  const anyCompleted = hasCompletedQuests()

  useEffect(() => {
    const onUpdate = () => setGenState(getGeneratedQuests())
    window.addEventListener('scl:gen_quests_updated', onUpdate)
    return () => window.removeEventListener('scl:gen_quests_updated', onUpdate)
  }, [])

  useEffect(() => {
    if (!profileReady || !playerData) return
    if (!getGeneratedQuests()) generateDailyQuests(buildQuestUserProfile(playerData, xp?.statXP))
  }, [profileReady, playerData, xp?.statXP])

  const daySealForToast = playerData
    ? reduceToSimple(calcPersonalDay(playerData.m, playerData.d).root)
    : null
  const classSupportToast = (() => {
    if (!daySealForToast) return null
    const loadoutNow = loadClassLoadout()
    const title = getClassTitle(loadoutNow)
    return getFilledSlots(loadoutNow).some((s) => s.number === daySealForToast)
      ? `Today supports your ${title} path`
      : null
  })()

  useEffect(() => {
    if (!classSupportToast || daily?.completed) return
    const key = `scl_class_toast_${new Date().toISOString().slice(0, 10)}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('scl:xp_toast', {
      detail: { msg: classSupportToast, color: 'var(--gold)' },
    }))
  }, [classSupportToast, daily?.completed])

  if (!playerData) return null
  const { m, d } = playerData

  const genQuests = genState?.quests ?? null
  const genCompleted = genQuests ? genQuests.filter(q => q.completed).length : 0
  const genTotal = genQuests ? genQuests.length : 0
  const dailyCompleted = daily?.completed ? 1 : 0
  const totalCompleted = dailyCompleted + genCompleted
  const totalQuests = 1 + genTotal
  const allDone = totalQuests > 0 && totalCompleted >= totalQuests
  const openCount = (daily?.completed ? 0 : 1) + (genTotal - genCompleted)

  const pd = calcPersonalDay(m, d)
  const cfg = CYCLE_QUEST_COLORS.personalDay
  const meaning = CYCLE_MEANINGS.personalDay?.[pd.root] || {}
  const colorVar = `var(${cfg.color})`
  const plateMeta = allDone
    ? `${totalCompleted}/${totalQuests} complete`
    : `${openCount} open · ${totalCompleted}/${totalQuests} done`

  const daySeal = reduceToSimple(pd.root)
  const loadoutNow = loadClassLoadout()
  const classTitleNow = getClassTitle(loadoutNow)
  const classSupportNote = getFilledSlots(loadoutNow).some((s) => s.number === daySeal)
    ? `Today supports your ${classTitleNow} path`
    : null

  function handleCompleteGen(questId, text) {
    return completeGeneratedQuest(questId, text)
  }

  function handleExpand(questId) {
    setExpandedId(current => (current === questId ? null : questId))
  }

  function handleReroll() {
    setRerollError(null)
    const result = rerollGeneratedQuests(buildQuestUserProfile(playerData, xp?.statXP))
    if (!result.ok) setRerollError(result.error)
  }

  return (
    <div className="daily-section">
      <div className="qj-book" aria-label="Quest journal">
        <span className="qj-book-spine" aria-hidden="true" />
        <span className="qj-book-corner qj-book-corner--tl" aria-hidden="true" />
        <span className="qj-book-corner qj-book-corner--tr" aria-hidden="true" />
        <span className="qj-book-corner qj-book-corner--bl" aria-hidden="true" />
        <span className="qj-book-corner qj-book-corner--br" aria-hidden="true" />
        <span className="qj-book-grain" aria-hidden="true" />

        <header className="qj-plate">
          <div className="qj-plate-copy">
            <h2 className="qj-plate-title">QUEST JOURNAL</h2>
            <p className="qj-plate-date">{formatJournalDate()}</p>
            <p className="qj-plate-meta">{plateMeta}</p>
          </div>
          <div className="qj-plate-actions">
            <button
              type="button"
              className={`qj-plate-reroll${rerollsRemaining <= 0 || anyCompleted ? ' qj-plate-reroll--disabled' : ''}`}
              onClick={handleReroll}
              disabled={rerollsRemaining <= 0 || anyCompleted || !genQuests}
              title={
                anyCompleted
                  ? 'Complete quests before re-rolling'
                  : rerollsRemaining <= 0
                    ? 'Daily re-roll limit reached'
                    : `Re-roll quests (${rerollsRemaining} remaining)`
              }
            >
              ↻ RE-ROLL{rerollsRemaining > 0 ? ` (${rerollsRemaining})` : ''}
            </button>
          </div>
        </header>

        {rerollError && <div className="qj-reroll-error">{rerollError}</div>}

        <div className="qj-status">
          <div className="daily-progress-row">
            <DailyProgressRing completed={totalCompleted} total={totalQuests} />
            <StreakBadge streak={chainStreak} />
          </div>
          <div className="qj-status-cue">
            <span
              className={`qj-daily-state${allDone ? ' qj-daily-state--complete' : ''}`}
              aria-label={allDone ? 'Daily set complete' : 'Daily set in progress'}
            >
              {allDone ? 'COMPLETE' : 'IN PROGRESS'}
            </span>
            <DailyCountdown />
          </div>
        </div>

        <div className="qj-pages">
          <ReminderBanner />

          <QuestChapters
            genQuests={genQuests}
            onComplete={handleCompleteGen}
            expandedId={expandedId}
            onExpand={handleExpand}
            alignmentSlot={(
              <DailyQuestCard
                daily={daily}
                colorVar={colorVar}
                meaning={meaning}
                pd={pd}
                onComplete={completeDailyQuest}
                lpRoot={playerData.lp?.root}
                classSupportNote={classSupportNote}
              />
            )}
          />
        </div>
      </div>

      <StreakCalendar />
    </div>
  )
}
