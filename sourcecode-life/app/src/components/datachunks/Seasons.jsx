/**
 * Seasons — Home energy rundown for current pinnacle / year / month.
 * Month check-ins use the live seasonEngine path (same as Quests → Current).
 */
import { useMemo, useState } from 'react'
import { useAppDispatch } from '../../context/AppContext'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { calcPersonalYear, calcPersonalMonth, calcPinnacles, todayStr } from '../../lib/numerology'
import { PINNACLE_MONTH_LENS } from '../../lib/objectives'
import { CYCLE_MEANINGS, CYCLE_QUEST_COLORS } from '../../lib/data'
import { addMonthCheckin, getMonthSeasonState } from '../../lib/seasonEngine'
import { getActiveMultiDayQuests } from '../../lib/numerologyQuests'
import MonthCheckinPanel from './MonthCheckinPanel'

function EnergyRow({
  glyph,
  label,
  number,
  theme,
  summary,
  meta,
  lens,
  color,
  accent,
  children,
}) {
  return (
    <article
      className={`seasons-energy-row${accent ? ' seasons-energy-row--accent' : ''}`}
      style={{ '--season-color': color }}
      aria-label={`${label}: ${theme || number}`}
    >
      <div className="seasons-energy-head">
        <span className="seasons-energy-glyph" aria-hidden="true">{glyph}</span>
        <div className="seasons-energy-id">
          <span className="seasons-energy-num">{number}</span>
          <span className="seasons-energy-label">{label}</span>
        </div>
        {meta && <span className="seasons-energy-meta">{meta}</span>}
      </div>
      {theme && <h3 className="seasons-energy-theme">{theme}</h3>}
      {summary && <p className="seasons-energy-summary">{summary}</p>}
      {lens && <p className="seasons-energy-lens">{lens}</p>}
      {children}
    </article>
  )
}

export default function SeasonsSection({ playerData }) {
  const dispatch = useAppDispatch()
  const { xp } = useQuestEngine()
  const freqLevel = xp?.freqLevel || 1
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [seasonTick, setSeasonTick] = useState(0)

  const { m, d, y, lp } = playerData || {}

  const monthSeasonState = useMemo(() => {
    seasonTick
    if (!lp?.root || !m || !d) return null
    return getMonthSeasonState(lp.root, m, d, freqLevel, playerData)
  }, [lp?.root, m, d, freqLevel, seasonTick, playerData])

  if (!playerData) return null

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
  const pinnacleColor = `var(${CYCLE_QUEST_COLORS.pinnacle?.color || '--gold'})`
  const pinnacleData = currentPinn ? CYCLE_MEANINGS.pinnacle?.[currentPinn.root] : null
  const yearMeaning = CYCLE_MEANINGS.personalYear?.[py.root] || {}
  const monthMeaning = CYCLE_MEANINGS.personalMonth?.[pm.root] || {}
  const yearColor = `var(${CYCLE_QUEST_COLORS.personalYear?.color || '--teal'})`
  const monthColor = `var(${CYCLE_QUEST_COLORS.personalMonth?.color || '--rose'})`
  const monthLens = PINNACLE_MONTH_LENS[pm.root] || null

  const pinnMeta = currentPinn
    ? `Ch. ${pinnIndex} · Ages ${currentPinn.startAge}–${currentPinn.endAge || '∞'}`
    : null

  const tierDays = monthSeasonState?.tierDays || 7
  const checkinCount = monthSeasonState?.checkins?.length || 0
  const today = todayStr()
  const checkedInToday = monthSeasonState?.checkins?.some((c) => c.date === today)
  const multiDay = monthSeasonState?.multiDayId
    ? getActiveMultiDayQuests()[monthSeasonState.multiDayId]
    : null
  const streak = multiDay?.multiDay?.streak || checkinCount
  const canCheckin = !!monthSeasonState
    && !monthSeasonState.completed
    && !checkedInToday
    && checkinCount < tierDays

  const handleCheckinSubmit = (journal, objectiveIdx) => {
    const result = addMonthCheckin(lp.root, m, d, journal, objectiveIdx)
    if (result.ok) {
      setCheckinOpen(false)
      setSeasonTick((t) => t + 1)
      return { ok: true }
    }
    return result
  }

  return (
    <section className="seasons-section seasons-section--energy home-section-shell" aria-labelledby="seasons-heading">
      <div className="seasons-header">
        <h2 id="seasons-heading" className="home-section-heading seasons-heading">
          <span className="seasons-heading-line home-section-heading-line" aria-hidden="true" />
          <span className="seasons-heading-glyph home-section-heading-glyph" aria-hidden="true">◇</span>
          CURRENT TIME CYCLE
          <span className="seasons-heading-glyph home-section-heading-glyph" aria-hidden="true">◇</span>
          <span className="seasons-heading-line home-section-heading-line" aria-hidden="true" />
        </h2>
      </div>

      <div className="seasons-energy" style={{ '--pinnacle-color': pinnacleColor }}>
        {pinnacleData && currentPinn && (
          <EnergyRow
            glyph="▲"
            label="PINNACLE"
            number={currentPinn.root}
            theme={pinnacleData.theme}
            summary={pinnacleData.summary}
            meta={pinnMeta}
            color={pinnacleColor}
            accent
          />
        )}

        <EnergyRow
          glyph="◎"
          label="YEAR"
          number={py.root}
          theme={yearMeaning.theme}
          summary={yearMeaning.summary}
          color={yearColor}
        />

        <EnergyRow
          glyph="◇"
          label="MONTH"
          number={pm.root}
          theme={monthMeaning.theme}
          summary={monthMeaning.summary}
          lens={monthLens}
          color={monthColor}
        >
          {monthSeasonState && (
            <div className="seasons-energy-month-actions">
              <div className="seasons-checkins-stats seasons-checkins-stats--inline">
                <span>{checkinCount}/{tierDays} sealed</span>
                <span>streak {streak}/{tierDays}</span>
              </div>
              {canCheckin && (
                <button
                  type="button"
                  className="seasons-checkin-btn seasons-checkin-btn--compact"
                  onClick={() => setCheckinOpen(true)}
                  style={{ '--season-color': monthColor }}
                >
                  ▶ CHECK IN TODAY
                </button>
              )}
              {checkedInToday && !monthSeasonState.completed && (
                <div className="seasons-checkin-status seasons-checkin-status--done">
                  ✦ Checked in today
                </div>
              )}
              {monthSeasonState.completed && (
                <div className="seasons-checkin-status">✦ MONTH COMPLETE</div>
              )}
            </div>
          )}
        </EnergyRow>

        <button
          type="button"
          className="seasons-energy-cta"
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'quests', section: 'current' })}
        >
          Open full Current cycles →
        </button>
      </div>

      <MonthCheckinPanel
        open={checkinOpen}
        monthTheme={monthMeaning.theme || 'This Month'}
        monthRoot={pm.root}
        objectives={monthSeasonState?.objectives || []}
        color={CYCLE_QUEST_COLORS.personalMonth?.hex || 'var(--rose)'}
        checkinCount={checkinCount}
        tierDays={tierDays}
        streak={streak}
        onClose={() => setCheckinOpen(false)}
        onSubmit={handleCheckinSubmit}
      />
    </section>
  )
}
