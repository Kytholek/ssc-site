/**
 * Seasons — Personal Month and Year cycles with tier-based commitments (7/14/30 days)
 */
import { useState, useEffect, useRef } from 'react'
import { calcPersonalYear, calcPersonalMonth, calcPinnacles, getCycleAnchor } from '../../lib/numerology'
import { getCycleObjectives, PINNACLE_MONTH_LENS } from '../../lib/objectives'
import { CYCLE_MEANINGS, CYCLE_QUEST_COLORS } from '../../lib/data'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { getPinnacleProgress } from '../../lib/questEngine'
import {
  getMonthSeasonState, addMonthCheckin, completeMonthSeason,
  getYearSeasonState, completeYearSeason,
} from '../../lib/seasonEngine'
import { getActiveMultiDayQuests } from '../../lib/numerologyQuests'
import { showFloatingXP, showParticleBurst } from '../effects/FloatingXP'
import MonthCheckinPanel from './MonthCheckinPanel'
import YearJournalPanel from './YearJournalPanel'

// ═══════════════════════════════════════════════════════════════
//  PINNACLE CREST — contextual chapter banner
// ═══════════════════════════════════════════════════════════════

function SeasonsPinnacleCrest({
  currentPinn,
  pinnacleIndex,
  pinnacleData,
  pinnacleColor,
  pm,
  pinnacleProgress,
  monthLens,
}) {
  const milestoneCount = pinnacleProgress?.milestones?.length || 0
  const milestoneRequired = pinnacleProgress?.required || 1
  const milestonePct = Math.min(100, (milestoneCount / milestoneRequired) * 100)

  return (
    <div
      className="seasons-pinnacle-crest"
      style={{ '--pinnacle-color': pinnacleColor }}
      aria-label={`Pinnacle chapter ${pinnacleIndex}: ${pinnacleData.theme}`}
    >
      <span className="seasons-pinnacle-crest-corner seasons-pinnacle-crest-corner--tl" aria-hidden="true" />
      <span className="seasons-pinnacle-crest-corner seasons-pinnacle-crest-corner--tr" aria-hidden="true" />
      <span className="seasons-pinnacle-crest-corner seasons-pinnacle-crest-corner--bl" aria-hidden="true" />
      <span className="seasons-pinnacle-crest-corner seasons-pinnacle-crest-corner--br" aria-hidden="true" />

      <div className="seasons-pinnacle-crest-header">
        <div className="seasons-pinnacle-crest-title">
          <span className="seasons-pinnacle-crest-num">{currentPinn.root}</span>
          <div className="seasons-pinnacle-crest-info">
            <span className="seasons-pinnacle-crest-theme">▲ {pinnacleData.theme}</span>
            <span className="seasons-pinnacle-crest-chapter">Chapter {pinnacleIndex} of 4</span>
          </div>
        </div>
        <div className="seasons-pinnacle-crest-ages">
          Ages {currentPinn.startAge}–{currentPinn.endAge || '∞'}
        </div>
      </div>

      {pinnacleData.summary && (
        <p className="seasons-pinnacle-crest-summary">{pinnacleData.summary}</p>
      )}

      <div className="seasons-pinnacle-milestones">
        <div className="seasons-pinnacle-milestones-label">
          Chapter milestones · {milestoneCount}/{milestoneRequired}
        </div>
        <div className="seasons-pinnacle-milestones-track">
          <div
            className="seasons-pinnacle-milestones-fill"
            style={{ width: `${milestonePct}%` }}
          />
        </div>
      </div>

      {monthLens && (
        <p className="seasons-pinnacle-lens">{monthLens}</p>
      )}
    </div>
  )
}

function SeasonCardCorners() {
  return (
    <>
      <span className="seasons-card-corner seasons-card-corner--tl" aria-hidden="true" />
      <span className="seasons-card-corner seasons-card-corner--tr" aria-hidden="true" />
      <span className="seasons-card-corner seasons-card-corner--bl" aria-hidden="true" />
      <span className="seasons-card-corner seasons-card-corner--br" aria-hidden="true" />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MONTH SEASON CARD
// ═══════════════════════════════════════════════════════════════

function MonthSeasonCard({ playerData, lpRoot, m, d, monthLens }) {
  const [monthState, setMonthState] = useState(null)
  const [checkinPanelOpen, setCheckinPanelOpen] = useState(false)
  const nodeRef = useRef(null)
  const { xp } = useQuestEngine()
  const freqLevel = xp?.freqLevel ?? 1

  const pm = calcPersonalMonth(m, d)
  const meaning = CYCLE_MEANINGS.personalMonth?.[pm.root] || {}
  const cfg = CYCLE_QUEST_COLORS.personalMonth || {}
  const colorVar = `var(${cfg.color})`

  useEffect(() => {
    const state = getMonthSeasonState(lpRoot, m, d, freqLevel, playerData)
    setMonthState(state)
  }, [lpRoot, m, d, freqLevel, playerData])

  if (!monthState) return null

  const tierDays = monthState.tierDays || 7
  const checkinCount = monthState.checkins.length
  const today = new Date().toISOString().split('T')[0]
  const checkedInToday = monthState.checkins.some(c => c.date === today)
  const multiDay = monthState.multiDayId ? getActiveMultiDayQuests()[monthState.multiDayId] : null
  const streak = multiDay?.multiDay?.streak || checkinCount
  const daysActive = monthState.startDate
    ? Math.floor((new Date() - new Date(monthState.startDate)) / 86400000)
    : 0
  const canCheckin = !monthState.completed && !checkedInToday && checkinCount < tierDays
  const canComplete = checkinCount >= tierDays && streak >= tierDays
  const tierName = ['APPRENTICE', 'ADEPT', 'MASTER'][monthState.lockedObj?.tierAtLock - 1] || 'APPRENTICE'
  const panelColor = cfg.hex || colorVar

  const handleCheckinSubmit = (journal, objectiveIdx) => {
    const result = addMonthCheckin(lpRoot, m, d, journal, objectiveIdx)
    if (result.ok) {
      setCheckinPanelOpen(false)
      const newState = getMonthSeasonState(lpRoot, m, d)
      setMonthState(newState)
      return { ok: true }
    }
    return result
  }

  const handleMonthComplete = () => {
    const rect = nodeRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

    const result = completeMonthSeason(lpRoot, m, d)
    if (result.ok) {
      try {
        showFloatingXP({ xp: 40, color: colorVar, x, y })
        showParticleBurst({ color: colorVar, x, y, count: 20 })
      } catch (e) {
        console.warn('Visual feedback error:', e)
      }
      const newState = getMonthSeasonState(lpRoot, m, d)
      setMonthState(newState)
    }
  }

  return (
    <>
      <div className="seasons-card seasons-card--month" ref={nodeRef} style={{ '--season-color': colorVar }}>
        <SeasonCardCorners />
        <div className="seasons-card-header">
          <div className="seasons-card-icon" style={{ color: colorVar }}>◇</div>
          <div className="seasons-card-title">
            <div className="seasons-card-num">{pm.root}</div>
            <div className="seasons-card-type-label">MONTH</div>
            <span className="seasons-card-theme">{meaning.theme || 'Personal Month'}</span>
          </div>
        </div>

        <div className="seasons-card-body">
          {monthLens && (
            <p className="seasons-month-lens">{monthLens}</p>
          )}

          {monthState.lockedObj && (
            <div className="seasons-locked-obj">
              <div className="seasons-locked-obj-tier">
                {tierName} MISSION
              </div>
              <div className="seasons-locked-obj-text">{monthState.lockedObj.text}</div>
            </div>
          )}

          <div className="seasons-checkins">
            <div className="seasons-checkins-header">
              <span className="seasons-checkins-label">{tierDays}-day commitment</span>
              <span className="seasons-checkins-tier">{tierName}</span>
            </div>

            <div className="seasons-checkins-track" aria-hidden="true">
              <div
                className="seasons-checkins-track-fill"
                style={{ width: `${Math.min(100, (checkinCount / tierDays) * 100)}%` }}
              />
            </div>

            <div className="seasons-checkins-pips">
              {Array.from({ length: tierDays }, (_, i) => {
                const isDone = i < checkinCount
                const isCurrent = i === checkinCount && canCheckin
                return (
                  <div
                    key={i}
                    className={`seasons-pip${isDone ? ' seasons-pip--done' : ''}${isCurrent ? ' seasons-pip--current' : ''}${!isDone && !isCurrent ? ' seasons-pip--pending' : ''}`}
                  >
                    <span className="seasons-pip-mark">{isDone ? '✦' : String(i + 1)}</span>
                  </div>
                )
              })}
            </div>

            <div className="seasons-checkins-stats">
              <span>{checkinCount}/{tierDays} sealed</span>
              <span>streak {streak}/{tierDays}</span>
              <span>{daysActive}d active</span>
            </div>

            {monthState.completed ? (
              <div className="seasons-completed-badge">✦ MONTH COMPLETE</div>
            ) : checkedInToday ? (
              <div className="seasons-checkin-status seasons-checkin-status--done">
                ✦ Checked in today — return tomorrow
              </div>
            ) : canCheckin ? (
              <button
                type="button"
                className="seasons-checkin-btn"
                onClick={() => setCheckinPanelOpen(true)}
                style={{ '--season-color': colorVar }}
              >
                ▶ CHECK IN TODAY
              </button>
            ) : checkinCount >= tierDays ? (
              <div className="seasons-checkin-status seasons-checkin-status--warn">
                ⏱ Need {tierDays} consecutive days — streak {streak}/{tierDays}
              </div>
            ) : null}
          </div>

          {canComplete && !monthState.completed && (
            <button
              className="seasons-complete-btn"
              onClick={handleMonthComplete}
              style={{ '--season-color': colorVar }}
            >
              ▶ COMPLETE MONTH
            </button>
          )}

          {!canComplete && checkinCount >= tierDays && streak < tierDays && (
            <div className="seasons-unlock-banner">
              ⏱ All slots filled — keep your streak consecutive to seal the month
            </div>
          )}
        </div>
      </div>

      <MonthCheckinPanel
        open={checkinPanelOpen}
        monthTheme={meaning.theme}
        monthRoot={pm.root}
        objectives={monthState.objectives}
        color={panelColor}
        checkinCount={checkinCount}
        tierDays={tierDays}
        streak={streak}
        onClose={() => setCheckinPanelOpen(false)}
        onSubmit={handleCheckinSubmit}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
//  YEAR SEASON CARD
// ═══════════════════════════════════════════════════════════════

function YearSeasonCard({ playerData, lpRoot, m, d }) {
  const [yearState, setYearState] = useState(null)
  const [yearJournalOpen, setYearJournalOpen] = useState(false)
  const nodeRef = useRef(null)
  const { xp } = useQuestEngine()
  const freqLevel = xp?.freqLevel ?? 1

  const py = calcPersonalYear(m, d)
  const pm = calcPersonalMonth(m, d)
  const { cycleStartYear, daysSinceBd } = getCycleAnchor(m, d)
  const meaning = CYCLE_MEANINGS.personalYear?.[py.root] || {}
  const cfg = CYCLE_QUEST_COLORS.personalYear || {}
  const colorVar = `var(${cfg.color})`
  const yearObjectives = getCycleObjectives('personalYear', py.root, freqLevel)

  useEffect(() => {
    const state = getYearSeasonState(lpRoot, m, d)
    setYearState(state)
  }, [lpRoot, m, d])

  if (!yearState) return null

  const monthState = getMonthSeasonState(lpRoot, m, d, freqLevel, playerData)
  const monthsSealed = yearState.monthsCompleted.length
  const currentMonthComplete = monthState?.completed
  const canUnlockJournal = monthsSealed >= 6
  const isComplete = yearState.journalDone
  const journalRemaining = Math.max(0, 6 - monthsSealed)
  const cycleEndYear = cycleStartYear + 1

  let nextStep = null
  if (isComplete) {
    nextStep = { tone: 'done', text: 'Year journal sealed — this personal year arc is complete.' }
  } else if (!currentMonthComplete) {
    nextStep = {
      tone: 'action',
      text: `Seal Month ${pm.monthNum} beside this card — daily check-ins complete the season.`,
    }
  } else if (!canUnlockJournal) {
    nextStep = {
      tone: 'progress',
      text: `${journalRemaining} more sealed month${journalRemaining === 1 ? '' : 's'} unlock the year journal.`,
    }
  } else {
    nextStep = {
      tone: 'action',
      text: 'Six seasons sealed — write your year journal to complete the arc.',
    }
  }

  const handleYearComplete = (journal) => {
    const result = completeYearSeason(lpRoot, m, d, journal)
    if (result.ok) {
      const rect = nodeRef.current?.getBoundingClientRect()
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

      try {
        showFloatingXP({ xp: 120, color: colorVar, x, y })
        showParticleBurst({ color: colorVar, x, y, count: 32 })
      } catch (e) {
        console.warn('Visual feedback error:', e)
      }

      setYearJournalOpen(false)
      const newState = getYearSeasonState(lpRoot, m, d)
      setYearState(newState)
    }
    return result
  }

  const objectivesList = yearObjectives.length > 0 && (
    <div className="seasons-objectives-list seasons-objectives-list--year">
      {yearObjectives.map((obj, i) => (
        <div key={obj.id || i} className="seasons-objective-item">
          <span className="seasons-objective-num">{i + 1}</span>
          <span className="seasons-objective-text">{obj.text}</span>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="seasons-card seasons-card--year" ref={nodeRef} style={{ '--season-color': colorVar }}>
        <SeasonCardCorners />
        <div className="seasons-card-header">
          <div className="seasons-card-icon" style={{ color: colorVar }}>◎</div>
          <div className="seasons-card-title">
            <div className="seasons-card-num">{py.root}</div>
            <div className="seasons-card-type-label">YEAR</div>
            <span className="seasons-card-theme">{meaning.theme || 'Personal Year'}</span>
          </div>
        </div>

        <div className="seasons-card-body">
          <div className="seasons-year-meta">
            <span>{cycleStartYear}–{cycleEndYear}</span>
            <span>Month {pm.monthNum} of 12</span>
            <span>Day {daysSinceBd + 1}</span>
          </div>

          {meaning.summary && (
            <p className="seasons-year-summary">{meaning.summary}</p>
          )}

          {yearObjectives.length > 0 && (
            <details className="seasons-year-objectives-toggle">
              <summary className="seasons-year-objectives-summary">
                ◈ YEAR OBJECTIVES ({yearObjectives.length})
              </summary>
              {objectivesList}
            </details>
          )}

          <div className="seasons-year-objectives-desktop">
            {yearObjectives.length > 0 && (
              <>
                <div className="seasons-year-section-label">◈ YEAR OBJECTIVES</div>
                {objectivesList}
              </>
            )}
          </div>

          <div className="seasons-year-months">
            <div className="seasons-year-section-label">
              SEASON MAP · {monthsSealed}/12 sealed
            </div>
            <div className="seasons-year-months-grid">
              {Array.from({ length: 12 }, (_, i) => {
                const monthNum = i + 1
                const isSealed = yearState.monthsCompleted.includes(monthNum)
                const isCurrent = monthNum === pm.monthNum
                return (
                  <div
                    key={monthNum}
                    className={`seasons-year-month${isSealed ? ' seasons-year-month--sealed' : ''}${isCurrent ? ' seasons-year-month--current' : ''}${!isSealed && !isCurrent ? ' seasons-year-month--pending' : ''}`}
                    title={`Month ${monthNum}${isSealed ? ' — sealed' : isCurrent ? ' — current' : ''}`}
                  >
                    <span className="seasons-year-month-num">{monthNum}</span>
                    {isSealed && <span className="seasons-year-month-mark" aria-hidden="true">✦</span>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="seasons-progress-bar">
            <div
              className="seasons-progress-fill"
              style={{ width: `${(monthsSealed / 12) * 100}%` }}
            />
          </div>

          <div className={`seasons-year-next seasons-year-next--${nextStep.tone}`}>
            {nextStep.tone === 'action' && '→ '}
            {nextStep.tone === 'done' && '✦ '}
            {nextStep.tone === 'progress' && '◉ '}
            {nextStep.text}
          </div>

          {canUnlockJournal && !isComplete && (
            <button
              className="seasons-year-journal-btn"
              onClick={() => setYearJournalOpen(true)}
              style={{ '--season-color': colorVar }}
            >
              ▶ WRITE YEAR JOURNAL
            </button>
          )}

          {isComplete && (
            <div className="seasons-completed-badge seasons-completed-badge--year">
              ✦ YEAR COMPLETE
            </div>
          )}
        </div>
      </div>

      <YearJournalPanel
        open={yearJournalOpen}
        yearTheme={meaning.theme}
        monthsCompleted={yearState.monthsCompleted}
        onClose={() => setYearJournalOpen(false)}
        onSubmit={handleYearComplete}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SEASONS SECTION — Main export
// ═══════════════════════════════════════════════════════════════

export default function SeasonsSection({ playerData, lpRoot }) {
  if (!playerData) return null
  const { m, d, y, lp } = playerData

  const py = calcPersonalYear(m, d)
  const pm = calcPersonalMonth(m, d)
  const pinnacles = calcPinnacles(m, d, y, lp)
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) {
    age--
  }
  const currentPinn = pinnacles.find((p) => {
    return age >= p.startAge && (!p.endAge || age <= p.endAge)
  }) || pinnacles[pinnacles.length - 1]
  const pinnIndex = currentPinn ? pinnacles.indexOf(currentPinn) + 1 : 1
  const pinnacleColor = currentPinn ? CYCLE_QUEST_COLORS.pinnacle?.hex || '#c9a84c' : '#666'
  const pinnacleData = currentPinn ? CYCLE_MEANINGS.pinnacle?.[currentPinn.root] : null
  const pinnacleProgress = currentPinn ? getPinnacleProgress(pinnIndex, currentPinn.root) : null
  const monthLens = PINNACLE_MONTH_LENS[pm.root] || null
  const yearColor = CYCLE_QUEST_COLORS.personalYear?.hex || '#00e5cc'
  const monthColor = CYCLE_QUEST_COLORS.personalMonth?.hex || '#f472b6'

  return (
    <section className="seasons-section home-section-shell" aria-labelledby="seasons-heading">
      <div className="seasons-header">
        <h2 id="seasons-heading" className="home-section-heading seasons-heading">
          <span className="seasons-heading-line home-section-heading-line" aria-hidden="true" />
          <span className="seasons-heading-glyph home-section-heading-glyph" aria-hidden="true">◇</span>
          SEASONS
          <span className="seasons-heading-glyph home-section-heading-glyph" aria-hidden="true">◇</span>
          <span className="seasons-heading-line home-section-heading-line" aria-hidden="true" />
        </h2>
        <div className="home-pulse-chips seasons-header-chips">
          <span className="home-pulse-chip" style={{ '--chip-accent': yearColor }}>
            ◎ PY {py.root}
          </span>
          <span className="home-pulse-chip" style={{ '--chip-accent': monthColor }}>
            ◇ Month {pm.monthNum}/12
          </span>
          {currentPinn && (
            <span className="home-pulse-chip" style={{ '--chip-accent': pinnacleColor }}>
              ▲ Ch.{pinnIndex}
            </span>
          )}
        </div>
      </div>

      <div className="seasons-stack" style={{ '--pinnacle-color': pinnacleColor }}>
        {pinnacleData && currentPinn && pinnacleProgress && (
          <>
            <SeasonsPinnacleCrest
              currentPinn={currentPinn}
              pinnacleIndex={pinnIndex}
              pinnacleData={pinnacleData}
              pinnacleColor={pinnacleColor}
              pm={pm}
              pinnacleProgress={pinnacleProgress}
              monthLens={monthLens}
            />
            <div className="seasons-stack-connector" aria-hidden="true" />
          </>
        )}

        <div className="seasons-cards-container">
          <YearSeasonCard playerData={playerData} lpRoot={lpRoot} m={m} d={d} />
          <MonthSeasonCard
            playerData={playerData}
            lpRoot={lpRoot}
            m={m}
            d={d}
            monthLens={monthLens}
          />
        </div>
      </div>
    </section>
  )
}
