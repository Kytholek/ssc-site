/**
 * DailySection — Bound quest journal
 *
 * One book surface for today's alignment and daily quests.
 * Titles stay visible; the carve field expands on the entry being completed.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../context/AppContext'
import { useGameState } from '../../state/GameContext'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { XP_AWARDS } from '../../lib/questEngine'
import {
  generateDailyQuests, getGeneratedQuests, completeGeneratedQuest,
  getActiveMultiDayQuests,
  checkinMultiDayQuest,
  completeMultiDayQuest,
  getCycleInfo,
  QUEST_TYPE_META,
  getJournalPrompt,
  detectMultiDay,
  rerollGeneratedQuests, getRerollsRemaining, hasCompletedQuests,
  getDifficultyMeta,
  buildQuestUserProfile,
} from '../../lib/numerologyQuests'
import { todayStr } from '../../lib/numerology'
import { BLUEPRINT_UNLOCK_LV } from '../../lib/questBlueprint'
import { CYCLE_QUEST_COLORS, CYCLE_MEANINGS, ROOT } from '../../lib/data'
import { getCycleObjectives } from '../../lib/objectives'
import {
  calcPersonalDay, reduceToSimple,
} from '../../lib/numerology'
import { showFloatingXP, showParticleBurst } from '../effects/FloatingXP'
import StreakCalendar, { markDayCompleted, hasAnyStreakCompletion } from '../effects/StreakCalendar'
import DailyProgressRing from '../effects/DailyProgressRing'
import DailyCountdown from '../effects/DailyCountdown'
import {
  loadClassLoadout,
  getClassTitle,
  getLoadoutPathChips,
  getFilledSlots,
} from '../../lib/classLoadout'
import {
  evidenceForQuest,
  evidenceSummary,
  wordCount,
  loadQuestDraft,
  saveQuestDraft,
  clearQuestDraft,
  EVIDENCE,
} from '../../lib/questEvidence'

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

function firstOpenJournalId(quests) {
  const rank = { skill: 0, life: 1, cycle: 2 }
  const open = (quests || []).filter(q => q && !q.completed && !isMultiDayCommitted(q))
  open.sort((a, b) => (rank[journalSource(a).id] ?? 9) - (rank[journalSource(b).id] ?? 9))
  return open[0]?.id || null
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

function MultiDayPips({ totalDays, daysDone = 0 }) {
  const days = Math.max(0, Number(totalDays) || 0)
  if (!days) return null

  const done = Math.max(0, Math.min(days, Number(daysDone) || 0))
  // Cap raw pips so 30-day stays readable; denser weeks for longer runs
  const maxPips = days <= 7 ? days : days <= 14 ? days : 10
  const filledCount = Math.round((done / days) * maxPips)
  const pips = Array.from({ length: maxPips }, (_, i) => i)

  return (
    <span
      className="qj-entry-multiday"
      title={`${done}/${days} days · multi-day commitment`}
      aria-label={`${done} of ${days} days complete`}
    >
      <span className="qj-multiday-pips" aria-hidden="true">
        {pips.map(i => (
          <span
            key={i}
            className={`qj-multiday-pip${i < filledCount ? ' qj-multiday-pip--filled' : ''}`}
          />
        ))}
        {days > maxPips && <span className="qj-multiday-pip qj-multiday-pip--more" />}
      </span>
      <span className="qj-multiday-label">{done > 0 ? `${done}/${days}` : `${days}-DAY`}</span>
    </span>
  )
}

function isMultiDayCommitted(quest) {
  if (quest?.multiDay?.started) return true
  if (!quest?.id) return false
  try {
    const active = getActiveMultiDayQuests()
    return !!(active[quest.id] && !active[quest.id].completed)
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════
//  RULED ENTRY — title visible, carve expands in place
// ═══════════════════════════════════════════════════════════════

function SessionTimer({ minutes, questId, onReady }) {
  const total = Math.max(1, minutes) * 60
  const storageKey = `scl_session_${questId}`
  const [startedAt, setStartedAt] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      return raw ? Number(raw) : null
    } catch {
      return null
    }
  })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAt) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0
  const left = Math.max(0, total - elapsed)
  const ready = Boolean(startedAt) && left === 0

  useEffect(() => {
    if (ready) onReady()
  }, [ready, onReady])

  function start() {
    const stamp = Date.now()
    setStartedAt(stamp)
    try { sessionStorage.setItem(storageKey, String(stamp)) } catch { /* ignore */ }
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="qj-session">
      <div className="qj-session-clock" aria-live="polite">{mm}:{ss}</div>
      <p className="qj-session-note">
        {ready
          ? 'Session complete. Add a note if you want, then seal the quest.'
          : 'The clock keeps running if you leave this page.'}
      </p>
      {!startedAt && (
        <button type="button" className="qj-carve-submit" onClick={start}>
          ▶ START {minutes} MIN
        </button>
      )}
    </div>
  )
}

function JournalQuestRow({ quest, source, expanded, onToggle, onComplete }) {
  const evidence = evidenceForQuest(quest)
  const [text, setText] = useState(() => loadQuestDraft(quest.id))
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const rowRef = useRef(null)
  const inputRef = useRef(null)
  const diffMeta = getDifficultyMeta(quest.difficulty)
  const prompt = getJournalPrompt(quest.number, quest.type, quest.id)
  const count = (text || '').trim().length
  const words = wordCount(text)
  const multiDay = questMultiDay(quest)
  const multiDays = multiDay?.totalDays || 0
  const isPiece = evidence.kind === EVIDENCE.PIECE
  const isSession = evidence.kind === EVIDENCE.SESSION
  const wordTarget = evidence.wordTarget || 300
  const minChars = evidence.minChars || 30
  const markSessionReady = useCallback(() => setSessionReady(true), [])

  useEffect(() => {
    if (!expanded || isSession) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [expanded, isSession])

  function handleSubmit() {
    const trimmed = (text || '').trim()
    if (!isSession && !isPiece && trimmed.length < minChars) {
      setError(`Need ${minChars} chars (${trimmed.length}/${minChars})`)
      return
    }
    if (isPiece && words < wordTarget) {
      setError(`Need ${wordTarget} words (${words}/${wordTarget})`)
      return
    }
    if (isSession && !sessionReady) {
      setError('Finish the session timer first')
      return
    }

    const result = onComplete(quest.id, trimmed, {
      sessionComplete: isSession && sessionReady,
    })
    if (result && result.ok === false) {
      setError(result.error)
      return
    }
    clearQuestDraft(quest.id)

    const questColor = source.color
    const rect = rowRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + 40 : window.innerHeight / 2

    // Multi-day carve starts a commitment — no full XP / complete FX
    if (result?.multiDayStarted) {
      try {
        showParticleBurst({ color: questColor, x, y, count: 8 })
        window.dispatchEvent(new CustomEvent('scl:xp_toast', {
          detail: { msg: 'Moved to Active Commitments', color: questColor },
        }))
      } catch (e) {
        console.warn('Commitment start feedback error:', e)
      }
      setText('')
      setError('')
      if (expanded) onToggle()
      return
    }

    const xpAmount = (result && result.xpAwarded != null) ? result.xpAwarded : quest.rewardXP
    const isResonant = quest.isResonant

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

  const pathContext = (() => {
    if (quest.discovery) return 'Discovery training'
    const parts = []
    if (quest.classNoun) parts.push(quest.classNoun)
    else if (quest.routeName) parts.push(quest.routeName)
    if (quest.routeName && quest.classNoun) parts.push(quest.routeName)
    if (quest.stageName) parts.push(quest.stageName)
    if (parts.length) return parts.join(' · ')
    if (quest.supportsClass) return 'Supports class path'
    return null
  })()

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
          {pathContext && (
            <span className="qj-entry-route">{pathContext}</span>
          )}
          <span className="qj-entry-meta">
            {multiDays > 0 && <MultiDayPips totalDays={multiDays} />}
            <span className="qj-entry-diff" style={{ color: diffMeta.color }}>
              {diffMeta.icon} {diffMeta.label}
            </span>
            <span className="qj-entry-evidence">{evidenceSummary(evidence)}</span>
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
              Starts a {multiDays}-day commitment · check in daily for XP · full reward on finish
            </p>
          )}
          {isSession ? (
            <SessionTimer minutes={evidence.minutes || 20} questId={quest.id} onReady={markSessionReady} />
          ) : (
            <p className="qj-carve-prompt" id={`qj-prompt-${quest.id}`}>
              {isPiece ? `Write the piece. ${wordTarget} words seals it.` : prompt}
            </p>
          )}
          {(!isSession || sessionReady) && (
            <textarea
              ref={inputRef}
              className="qj-carve-input"
              placeholder={isPiece
                ? 'Draft the piece here...'
                : isSession
                  ? 'Optional note about the session...'
                  : quest.source === 'life' || quest.type === 'objective'
                    ? 'What you did, when, and what changed...'
                    : 'Write down your experience...'}
              value={text}
              onChange={e => {
                const next = e.target.value
                setText(next)
                saveQuestDraft(quest.id, next)
                setError('')
              }}
              rows={isPiece ? 8 : 4}
              aria-label={isPiece ? 'Writing piece' : isSession ? 'Session note' : 'Journal reflection text'}
              aria-required={!isSession}
              aria-describedby={error ? `qj-error-${quest.id}` : `qj-prompt-${quest.id}`}
              onKeyDown={e => { if (e.key === 'Escape') onToggle() }}
            />
          )}
          <div className="qj-carve-foot">
            {isPiece ? (
              <span className={`qj-carve-count${words >= wordTarget ? ' qj-carve-count--ready' : ''}`}>
                {words}/{wordTarget} words
              </span>
            ) : isSession ? (
              <span className={`qj-carve-count${sessionReady ? ' qj-carve-count--ready' : ''}`}>
                {sessionReady ? 'READY' : `${evidence.minutes || 20} MIN`}
              </span>
            ) : (
              <span className={`qj-carve-count${count >= minChars ? ' qj-carve-count--ready' : ''}`}>
                {count}/{minChars}
              </span>
            )}
            {multiDays > 0 ? (
              <span className="qj-carve-xp">XP on finish</span>
            ) : (
              <span className="qj-carve-xp" style={{ color: diffMeta.color }}>+{quest.rewardXP} XP</span>
            )}
            <button type="button" className="qj-carve-submit" onClick={handleSubmit}>
              {multiDays > 0
                ? `▶ BEGIN ${multiDays}-DAY`
                : isPiece
                  ? '▶ SAVE PIECE'
                  : isSession
                    ? '▶ COMPLETE SESSION'
                    : '▶ CARVE & COMPLETE'}
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
}) {
  const dispatch = useAppDispatch()
  const [loadout, setLoadout] = useState(() => loadClassLoadout())

  useEffect(() => {
    const onL = (e) => setLoadout(e.detail || loadClassLoadout())
    window.addEventListener('scl:class_loadout_updated', onL)
    return () => window.removeEventListener('scl:class_loadout_updated', onL)
  }, [])

  if (!genQuests) return null

  // Started multi-days live in Active Commitments — hide from chapter rows
  const active = (genQuests || []).filter(q => !q.completed && !isMultiDayCommitted(q))
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
      {JOURNAL_SOURCES.map(source => {
        const quests = grouped.get(source.id) || []
        const isClass = source.id === 'skill'

        // Empty loadout: CLASS chapter shows CTA instead of (or above) discovery rows
        if (isClass && loadoutEmpty) {
          return (
            <section key={source.id} className="qj-chapter" aria-labelledby={`qj-chapter-${source.id}`}>
              <header className="qj-chapter-head">
                <h3 id={`qj-chapter-${source.id}`} className="qj-chapter-label" style={{ color: source.color }}>
                  <span aria-hidden="true">{source.icon}</span>
                  <span>{source.label}</span>
                </h3>
              </header>
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
            <header className="qj-chapter-head">
              <h3 id={`qj-chapter-${source.id}`} className="qj-chapter-label" style={{ color: source.color }}>
                <span aria-hidden="true">{source.icon}</span>
                <span>{source.label}</span>
              </h3>
              {isClass && classTitle && (
                <p className="qj-chapter-class-meta">{classTitle}</p>
              )}
            </header>
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

function PersonalDayReading({ pd, meaning, part = 'all' }) {
  const dispatch = useAppDispatch()
  const { user } = useGameState()
  const dayRoot = reduceToSimple(pd.root)
  const rootData = ROOT[pd.root] || ROOT[dayRoot] || {}
  const watch = meaning.summary || ''
  const isPremium = !!user?.isPremium
  const showGlance = part !== 'depth'
  const showDepth = part !== 'glance'
  const hasDepth = isPremium
    ? !!(rootData.shadow || rootData.integration)
    : true
  if (part === 'depth' && !hasDepth) return null

  return (
    <section
      className={`daily-premium-reading${part === 'depth' ? ' daily-premium-reading--depth' : ''}`}
      aria-label={part === 'depth' ? 'Shadow and integration' : "Today's reading"}
    >
      {showGlance && (
        <>
          <div className="daily-premium-reading-kicker">TODAY’S READING · DAY {pd.root}</div>
          <h3 className="daily-premium-reading-theme">{meaning.theme || 'Personal day'}</h3>
          {watch && <p className="daily-premium-reading-watch">{watch}</p>}
        </>
      )}
      {showDepth && (isPremium ? (
        <>
          {rootData.shadow && (
            <div className="daily-premium-reading-block">
              <div className="daily-premium-reading-label">SHADOW</div>
              <p>{rootData.shadow}</p>
            </div>
          )}
          {rootData.integration && (
            <div className="daily-premium-reading-block">
              <div className="daily-premium-reading-label">INTEGRATION</div>
              <p>{rootData.integration}</p>
            </div>
          )}
        </>
      ) : (
        <div className="daily-premium-reading-lock">
          <p>Shadow and integration for this number are part of Premium.</p>
          <button
            type="button"
            className="premium-lock-btn"
            onClick={() => dispatch({ type: 'OPEN_PREMIUM_MODAL' })}
          >
            UNLOCK · $4.99/MO
          </button>
        </div>
      ))}
    </section>
  )
}

function DailyQuestCard({ daily, colorVar, pd, onComplete, lpRoot, classSupportNote }) {
  const [justCompleted, setJustCompleted] = useState(false)
  const cardRef = useRef(null)
  const dispatch = useAppDispatch()
  const { user } = useGameState()
  const { completeDailyQuest: eqComplete } = useQuestEngine()
  const doComplete = onComplete || eqComplete

  const dayRoot = reduceToSimple(pd.root)
  const isFocusMatch = !!(daily?.dayRootMatch)
  const awardedXP = daily?.xpAward
    ?? Math.round(XP_AWARDS.daily * (isFocusMatch ? 2 : 1.5))
  const objectives = getCycleObjs('personalDay', pd.root)
  const icon = CYCLE_QUEST_COLORS.personalDay?.icon || '◈'

  function handleComplete() {
    const rect = cardRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

    const firstDaily = !hasAnyStreakCompletion()
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
      if (firstDaily && !user?.isPremium) {
        let seen = false
        try { seen = localStorage.getItem('scl_premium_pitch_seen') === '1' } catch { /* ignore */ }
        if (!seen) {
          try { localStorage.setItem('scl_premium_pitch_seen', '1') } catch { /* ignore */ }
          dispatch({ type: 'OPEN_PREMIUM_PITCH' })
        }
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
          <span className="qj-align-kicker">{`BLUEPRINT DAILY · ${pd.root}`}</span>
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
          <span className="qj-align-folio">{pd.root}</span>
        </span>
        <div className="qj-align-copy">
          <span className="qj-align-kicker">BLUEPRINT DAILY</span>
          {isFocusMatch && (
            <span className="qj-align-match">BLUEPRINT MATCH · ×2 XP</span>
          )}
          {classSupportNote && (
            <span className="qj-align-class-note">{classSupportNote}</span>
          )}
        </div>
      </div>

      <div className="qj-align-section">OBJECTIVES</div>
      <ul className="qj-align-objs">
        {objectives.map((o, i) => <li key={i}>{o}</li>)}
      </ul>

      {daily.dayObj && reduceToSimple(daily.questRoot) === dayRoot && (
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

export function TodayReading({ playerData, daily, completeDailyQuest }) {
  if (!playerData || !daily) return null
  const pd = calcPersonalDay(playerData.m, playerData.d)
  const meaning = CYCLE_MEANINGS.personalDay?.[pd.root] || {}
  const colorVar = `var(${CYCLE_QUEST_COLORS.personalDay?.color || '--gold'})`
  const daySeal = reduceToSimple(pd.root)
  const loadoutNow = loadClassLoadout()
  const classSupportNote = getFilledSlots(loadoutNow).some((s) => s.number === daySeal)
    ? `Today supports your ${getClassTitle(loadoutNow)} path`
    : null

  return (
    <div className="home-day-reading">
      <PersonalDayReading pd={pd} meaning={meaning} part="glance" />
      <DailyQuestCard
        daily={daily}
        colorVar={colorVar}
        pd={pd}
        onComplete={completeDailyQuest}
        lpRoot={playerData.lp?.root}
        classSupportNote={classSupportNote}
      />
      <PersonalDayReading pd={pd} meaning={meaning} part="depth" />
    </div>
  )
}

function ActiveCommitmentsStrip({ refreshKey }) {
  const [completeId, setCompleteId] = useState(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [, bump] = useState(0)
  const stripRef = useRef(null)

  useEffect(() => {
    const onUpdate = () => bump((n) => n + 1)
    window.addEventListener('scl:gen_quests_updated', onUpdate)
    return () => window.removeEventListener('scl:gen_quests_updated', onUpdate)
  }, [])

  const active = Object.values(getActiveMultiDayQuests()).filter((q) => !q.completed)
  const today = todayStr()

  if (!active.length) return null

  function refresh() {
    bump((n) => n + 1)
    window.dispatchEvent(new CustomEvent('scl:gen_quests_updated', { detail: {} }))
  }

  function handleCheckin(questId) {
    const res = checkinMultiDayQuest(questId)
    if (!res.ok) {
      setError(res.error || 'Check-in failed')
      return
    }
    setError('')

    const xpAmount = res.xpAwarded != null ? res.xpAwarded : 10
    const rect = stripRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + 36 : window.innerHeight / 2

    try {
      showFloatingXP({ xp: xpAmount, color: 'var(--rose, #ff2d55)', x, y })
      if (res.missedDay) {
        window.dispatchEvent(new CustomEvent('scl:xp_toast', {
          detail: {
            msg: `Streak reset · +${xpAmount} XP · day checked in`,
            color: 'var(--rose, #ff2d55)',
          },
        }))
      } else {
        window.dispatchEvent(new CustomEvent('scl:xp_toast', {
          detail: {
            msg: `+${xpAmount} XP · streak ${res.streak || 1}`,
            color: 'var(--teal, #00c9ff)',
          },
        }))
      }
    } catch (e) {
      console.warn('Check-in feedback error:', e)
    }

    if (res.isComplete) setCompleteId(questId)
    refresh()
  }

  function handleComplete(questId) {
    const res = completeMultiDayQuest(questId, text)
    if (!res.ok) {
      setError(res.error || 'Complete failed')
      return
    }
    setText('')
    setCompleteId(null)
    setError('')
    refresh()
  }

  return (
    <section ref={stripRef} className="qj-commitments" aria-label="Active commitments" data-refresh={refreshKey}>
      <h3 className="qj-commitments-label">
        <span aria-hidden="true">◉</span>
        <span>Active Commitments</span>
      </h3>
      <ul className="qj-commitments-list">
        {active.map((q) => {
          const daysDone = q.multiDay?.checkins?.length || 0
          const total = q.multiDay?.totalDays || 0
          const checkedToday = (q.multiDay?.checkins || []).includes(today)
          const canComplete = daysDone >= total && total > 0
          const needsCheckin = !checkedToday && daysDone < total
          const isEditing = completeId === q.id
          return (
            <li key={q.id} className="qj-commitment">
              <div className="qj-commitment-main">
                <span className="qj-commitment-title">{q.title}</span>
                <span className="qj-commitment-meta">
                  <MultiDayPips totalDays={total} daysDone={daysDone} />
                  <span>streak {q.multiDay?.streak || 0}</span>
                </span>
              </div>
              <div className="qj-commitment-actions">
                {needsCheckin && (
                  <button type="button" className="qj-commitment-btn" onClick={() => handleCheckin(q.id)}>
                    Check in
                  </button>
                )}
                {checkedToday && !canComplete && (
                  <span className="qj-commitment-done-today">Checked in</span>
                )}
                {(canComplete || isEditing) && (
                  <button
                    type="button"
                    className="qj-commitment-btn qj-commitment-btn--complete"
                    onClick={() => setCompleteId(isEditing ? null : q.id)}
                  >
                    {isEditing ? 'Cancel' : 'Complete'}
                  </button>
                )}
              </div>
              {isEditing && (
                <div className="qj-commitment-carve">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reflect on this commitment (30+ chars)…"
                    rows={3}
                    aria-label="Commitment reflection"
                  />
                  <button type="button" className="qj-commitment-btn" onClick={() => handleComplete(q.id)}>
                    Finish commitment
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="qj-commitment-error" role="status">{error}</p>}
    </section>
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

export default function DailySection({ playerData, daily }) {
  const { xp } = useQuestEngine()
  const [genState, setGenState] = useState(() => getGeneratedQuests())
  const autoOpenId = firstOpenJournalId(genState?.quests)
  const [manualId, setManualId] = useState(null)
  const [choseRow, setChoseRow] = useState(false)
  const expandedId = choseRow ? manualId : autoOpenId
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
    const existing = getGeneratedQuests()
    const dayRoot = reduceToSimple(calcPersonalDay(playerData.m, playerData.d).root)
    const quests = existing?.quests || []
    const hasDayQuest = quests.some(
      (q) => q.cycleType === 'personalDay' && reduceToSimple(q.number) === dayRoot,
    )
    const freqLevel = xp?.freqLevel || 1
    const lockedLife = quests.some((q) => {
      const key = q.lqpMeta?.questKey
      if (q.source !== 'life' || !key) return false
      return freqLevel < (BLUEPRINT_UNLOCK_LV[key] ?? 0)
    })
    const dayClassEquipped = getFilledSlots(loadClassLoadout()).some(
      (s) => reduceToSimple(s.number) === dayRoot,
    )
    const hasDaySkill = quests.some(
      (q) => (q.source === 'skill' || q.type === 'skilltree') && reduceToSimple(q.number) === dayRoot,
    )
    const anyDone = quests.some((q) => q.completed)
    if (!existing || (!anyDone && (!hasDayQuest || lockedLife || (dayClassEquipped && !hasDaySkill)))) {
      generateDailyQuests(buildQuestUserProfile(playerData, xp?.statXP))
    }
  }, [profileReady, playerData, xp?.statXP, xp?.freqLevel])

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

  const genQuests = genState?.quests ?? null
  const genCompleted = genQuests ? genQuests.filter(q => q.completed).length : 0
  const genCommitted = genQuests
    ? genQuests.filter(q => !q.completed && isMultiDayCommitted(q)).length
    : 0
  const genTotal = genQuests ? genQuests.length : 0
  const dailyCompleted = daily?.completed ? 1 : 0
  const totalCompleted = dailyCompleted + genCompleted
  const totalQuests = 1 + genTotal
  const allDone = totalQuests > 0 && totalCompleted >= totalQuests
  // Open = carveable journal rows (exclude commitments already moved to the strip)
  const openCount = (daily?.completed ? 0 : 1) + (genTotal - genCompleted - genCommitted)

  const plateMeta = (() => {
    const base = allDone
      ? `${totalCompleted}/${totalQuests} complete`
      : `${openCount} open · ${totalCompleted}/${totalQuests} done`
    const cycleInfo = getCycleInfo(genState?.cycleNumber)
    if (cycleInfo?.label) return `${base} · ${cycleInfo.label}`
    if (genState?.cycleLabel) return `${base} · ${genState.cycleLabel}`
    return base
  })()

  function handleCompleteGen(questId, text, options) {
    return completeGeneratedQuest(questId, text, options)
  }

  function handleExpand(questId) {
    const openNow = choseRow ? manualId : autoOpenId
    setChoseRow(true)
    setManualId(openNow === questId ? null : questId)
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
            <p className="qj-plate-role">Class, life, and cycle work</p>
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
          <ActiveCommitmentsStrip refreshKey={genCompleted} />

          <QuestChapters
            genQuests={genQuests}
            onComplete={handleCompleteGen}
            expandedId={expandedId}
            onExpand={handleExpand}
          />
        </div>
      </div>

      <StreakCalendar />
    </div>
  )
}
