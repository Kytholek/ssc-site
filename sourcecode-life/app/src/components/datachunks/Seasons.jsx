/**
 * Seasons — Home energy rundown for current pinnacle / year / month.
 * Quest check-ins and commitments live under Quests → Current (TimeFlow).
 */
import { calcPersonalYear, calcPersonalMonth, calcPinnacles } from '../../lib/numerology'
import { PINNACLE_MONTH_LENS } from '../../lib/objectives'
import { CYCLE_MEANINGS, CYCLE_QUEST_COLORS } from '../../lib/data'

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
    </article>
  )
}

export default function SeasonsSection({ playerData }) {
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

  return (
    <section className="seasons-section seasons-section--energy home-section-shell" aria-labelledby="seasons-heading">
      <div className="seasons-header">
        <h2 id="seasons-heading" className="home-section-heading seasons-heading">
          <span className="seasons-heading-line home-section-heading-line" aria-hidden="true" />
          <span className="seasons-heading-glyph home-section-heading-glyph" aria-hidden="true">◇</span>
          SEASONS
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
        />
      </div>
    </section>
  )
}
