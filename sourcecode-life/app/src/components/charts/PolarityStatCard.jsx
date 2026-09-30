/**
 * PolarityStatCard — Combined polarity donut + stat bars + deviation analysis
 */
import { useState, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import { getPolarityMix, getActivePolarity, getStatDistribution } from '../../lib/numerologyProfile'
import { STAT_NAMES } from '../../lib/data'

const SIZE = 120
const OUTER_R = 48
const INNER_R = 34
const CENTER = SIZE / 2
const OUTER_CIRC = 2 * Math.PI * OUTER_R
const INNER_CIRC = 2 * Math.PI * INNER_R

const POLES = ['electric', 'magnetic', 'aether']
const POLE_META = {
  electric: { icon: '⚡', color: '#f97316', label: 'ELECTRIC', nums: [1, 3, 5, 7], desc: 'Action, expression, change, discovery' },
  magnetic: { icon: '◎', color: '#3b82f6', label: 'MAGNETIC', nums: [2, 4, 6, 8], desc: 'Harmony, structure, responsibility, service' },
  aether:   { icon: '◇', color: '#a78bfa', label: 'AETHER',   nums: [0, 9],     desc: 'Spirit, completion, wisdom, transcendence' },
}

export default function PolarityStatCard() {
  const { playerData } = useAppState()
  const [showInfo, setShowInfo] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const onUpdated = () => setTick(t => t + 1)
    window.addEventListener('scl:xp_updated', onUpdated)
    window.addEventListener('scl:gen_quests_updated', onUpdated)
    return () => {
      window.removeEventListener('scl:xp_updated', onUpdated)
      window.removeEventListener('scl:gen_quests_updated', onUpdated)
    }
  }, [])

  if (!playerData) return null

  const innate = getPolarityMix(playerData)
  const statXP = (() => { try { return JSON.parse(localStorage.getItem('scl_stat_xp') || '{}') } catch { return {} } })()
  const active = getActivePolarity(statXP)
  const dist = getStatDistribution(statXP)
  const hasData = active !== null && dist.length > 0

  // Calculate deviation: active% - innate% for each polarity
  const deviations = hasData
    ? POLES.map(key => ({ key, innate: innate[key], active: active[key], dev: active[key] - innate[key], meta: POLE_META[key] }))
    : []

  // Find the most negative deviation (biggest untapped potential)
  let recommendation = null
  let allBalanced = false
  if (hasData && deviations.length) {
    const mostNeg = deviations.reduce((a, b) => a.dev < b.dev ? a : b)
    const maxAbsDev = Math.max(...deviations.map(d => Math.abs(d.dev)))
    if (maxAbsDev <= 10) {
      allBalanced = true
    } else {
      const numsInPolarity = mostNeg.meta.nums
      const untrainedNums = numsInPolarity.filter(n => (statXP[n] || 0) === 0)
      const lowNums = numsInPolarity.filter(n => (statXP[n] || 0) > 0 && (statXP[n] || 0) < 10)
      recommendation = { ...mostNeg, untrainedNums, lowNums, statXP }
    }
  }

  return (
    <div className="data-chart polarity-stat-card">
      <div className="data-chart-title">
        <span className="data-chart-info-btn" onClick={() => setShowInfo(!showInfo)} role="button" tabIndex={0} aria-label="Chart info">ⓘ</span>
        POLARITY & STATS
      </div>
      {showInfo && <div className="data-chart-tooltip">Outer ring = innate polarity from birth. Inner ring = active polarity from stat XP. Deviation shows how far you are from your natural potential.</div>}

      <div className="psc-grid">
        {/* Left: Dual ring */}
        <div className="psc-ring-section">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="data-chart-svg">
            {/* Outer — Innate */}
            {(() => {
              let offset = 0
              return POLES.map(key => {
                const pct = innate[key] / 100
                const dash = pct * OUTER_CIRC
                const off = -offset * OUTER_CIRC
                offset += pct
                return (
                  <circle key={`innate-${key}`} cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke={POLE_META[key].color} strokeWidth={8} strokeDasharray={`${dash} ${OUTER_CIRC - dash}`} strokeDashoffset={off} transform={`rotate(-90 ${CENTER} ${CENTER})`} opacity={0.25} />
                )
              })
            })()}
            {/* Inner — Active */}
            {hasData ? (() => {
              let offset = 0
              return POLES.map(key => {
                const pct = active[key] / 100
                const dash = pct * INNER_CIRC
                const off = -offset * INNER_CIRC
                offset += pct
                return (
                  <circle key={`active-${key}`} cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke={POLE_META[key].color} strokeWidth={12} strokeDasharray={`${dash} ${INNER_CIRC - dash}`} strokeDashoffset={off} transform={`rotate(-90 ${CENTER} ${CENTER})`} style={{ filter: `drop-shadow(0 0 4px ${POLE_META[key].color}66)`, transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }} />
                )
              })
            })() : null}
            {/* Center */}
            {hasData ? (() => {
              const dominant = POLES.reduce((a, b) => active[a] >= active[b] ? a : b)
              const meta = POLE_META[dominant]
              return (
                <>
                  <text x={CENTER} y={CENTER - 4} textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize={9} fill={meta.color} fontWeight="700">{meta.icon}</text>
                  <text x={CENTER} y={CENTER + 8} textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize={6} fill="var(--text-dim)" letterSpacing="0.06em">{meta.label.slice(0, 6)}</text>
                </>
              )
            })() : (
              <text x={CENTER} y={CENTER} textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize={7} fill="var(--text-dim)">NO DATA</text>
            )}
          </svg>
          {/* Polarity breakdown */}
          <div className="psc-polarity-legend">
            {POLES.map(key => {
              const meta = POLE_META[key]
              return (
                <div key={key} className="psc-pole-row">
                  <span className="psc-pole-icon" style={{ color: meta.color }}>{meta.icon}</span>
                  <span className="psc-pole-label">{meta.label.slice(0, 4)}</span>
                  <span className="psc-pole-pct">{innate[key]}%{hasData ? ` / ${active[key]}%` : ''}</span>
                </div>
              )
            })}
          </div>
          {hasData && <div className="psc-legend-note">Innate / Active</div>}
        </div>

        {/* Right: Stat distribution bars */}
        <div className="psc-bars-section">
          {hasData ? (
            <>
              <div className="psc-bars-header">STAT XP</div>
              <div className="psc-bars">
                {dist.map(stat => {
                  const maxXP = dist[0]?.xp || 1
                  const pct = Math.round((stat.xp / maxXP) * 100)
                  return (
                    <div key={stat.num} className="psc-stat-row">
                      <span className="psc-stat-num" style={{ color: stat.color }}>{stat.num}</span>
                      <div className="psc-stat-bar"><div className="psc-stat-fill" style={{ width: `${pct}%`, background: stat.color }} /></div>
                      <span className="psc-stat-val" style={{ color: stat.color }}>{stat.xp}</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="psc-bars-empty">Complete quests to see your stat distribution</div>
          )}
        </div>
      </div>

      {/* Deviation analysis */}
      {deviations.length > 0 && (
        <div className="psc-deviation-panel">
          <div className="psc-dev-title">POLARITY ANALYSIS</div>
          {deviations.map(d => {
            const sign = d.dev > 0 ? '+' : ''
            const severity = d.dev < -30 ? 'crit' : d.dev < -10 ? 'warn' : 'ok'
            return (
              <div key={d.key} className={`psc-dev-row psc-dev-row--${severity}`}>
                <span className="psc-dev-icon" style={{ color: d.meta.color }}>{d.meta.icon}</span>
                <span className="psc-dev-label">{d.meta.label.slice(0, 4)}</span>
                <div className="psc-dev-bars">
                  <div className="psc-dev-bar-bg"><div className="psc-dev-bar-fill" style={{ width: `${d.innate}%`, background: `${d.meta.color}33` }} /></div>
                  <div className="psc-dev-bar-bg"><div className="psc-dev-bar-fill" style={{ width: `${d.active}%`, background: d.meta.color, transition: 'width 0.6s ease' }} /></div>
                </div>
                <span className="psc-dev-pcts">{d.innate}% → {d.active}%</span>
                <span className={`psc-dev-delta psc-dev-delta--${severity}`}>[{sign}{d.dev}%]</span>
              </div>
            )
          })}
          <div className="psc-dev-legend">
            <span className="psc-dev-legend-item"><span className="psc-dev-legend-swatch" style={{ background: 'color-mix(in srgb, var(--text) 28%, transparent)' }} />Innate</span>
            <span className="psc-dev-legend-item"><span className="psc-dev-legend-swatch" style={{ background: 'color-mix(in srgb, var(--text) 62%, transparent)' }} />Active</span>
          </div>
        </div>
      )}

      {/* Recommendation or balanced message */}
      {recommendation && (
        <div className="psc-recommendation">
          <span className="psc-rec-icon">⚠</span>
          <div className="psc-rec-body">
            <div className="psc-rec-title">{recommendation.meta.label} STATS UNDERDEVELOPED</div>
            <div className="psc-rec-text">
              Innate potential at {recommendation.innate}% with {recommendation.active}% active development ({recommendation.dev > 0 ? '+' : ''}{recommendation.dev}% delta).
              {recommendation.untrainedNums.length > 0 ? ` Numbers ${recommendation.untrainedNums.join(', ')} have no XP — start here.` : recommendation.lowNums.length > 0 ? ` Numbers ${recommendation.lowNums.join(', ')} are below threshold.` : ` All numbers in this polarity have some XP. Continue building.`}
              {' '}{recommendation.meta.desc}.
            </div>
          </div>
        </div>
      )}
      {allBalanced && (
        <div className="psc-recommendation psc-recommendation--balanced">
          <span className="psc-rec-icon" style={{ color: 'var(--teal)' }}>✦</span>
          <div className="psc-rec-body">
            <div className="psc-rec-title" style={{ color: 'var(--teal)' }}>POLARITY PROFILE BALANCED</div>
            <div className="psc-rec-text">All polarities within ±10% of innate potential. Development is aligned with natural tendencies.</div>
          </div>
        </div>
      )}
    </div>
  )
}
