/**
 * StatsTab — gift cards + polarity mix + frequency chart
 */
import { useState } from 'react'
import { GiftCards } from '../skilltree/InnateSkills.jsx'
import { reduceToSimple } from '../../lib/numerology.js'
import { getDigitCounts, getPolarity, getPolarityMix } from '../../lib/numerologyProfile.js'
import {
  STAT_NAMES, POLARITY_COLORS, POLARITY_CONFIGS,
} from '../../lib/data.js'

// ── Compute chart data from playerData ───────────────────────────────────────
function buildChartData(playerData) {
  const { lp, ex, cl } = playerData
  const combined  = getDigitCounts(playerData)
  const maxTot    = Math.max(...Object.values(combined), 1)
  const normalize = r => r > 9 ? (r === 11 ? 2 : r === 22 ? 4 : r === 33 ? 6 : r === 44 ? 8 : reduceToSimple(r)) : r
  const primaryLabels = {}
  ;[['cl', cl], ['lp', lp], ['ex', ex]].forEach(([tag, obj]) => {
    if (!obj?.root) return
    const k = normalize(obj.root)
    if (!primaryLabels[k]) primaryLabels[k] = tag.toUpperCase()
    else primaryLabels[k] += '/' + tag.toUpperCase()
  })
  const statMeta = playerData.stats || {}
  return { combined, maxTot, primaryLabels, statMeta }
}

// ── Single stat row ───────────────────────────────────────────────────────────
function StatRow({ i, combined, maxTot, primaryLabels, statMeta }) {
  const base = combined[i]  || 0
  const pol = getPolarity(i)
  const { accent } = POLARITY_COLORS[pol]
  const fillPct = Math.round((base / maxTot) * 100)
  const statName = STAT_NAMES[i] || ''
  const primLabel = primaryLabels[i] || ''
  const isEmpty = base === 0
  const meta = statMeta?.[i] || {}
  const LE = meta.LE ?? null
  const ascended = LE !== null && base > LE

  return (
    <div className={`stat-chart-row${isEmpty ? ' stat-row-empty' : ''}${primLabel ? ' stat-row-primary' : ''}${ascended ? ' stat-row-ascended' : ''}`}>
      <div className="stat-col-num" style={{ color: accent }}>{i}</div>
      <div className="stat-col-name">
        <div className="stat-name-text">
          {statName}
          {primLabel && <span className="stat-primary-pip" style={{ color: accent }}>{primLabel}</span>}
          {ascended && <span className="stat-ascended-badge" title="Ascended" style={{ color: '#ffd700', marginLeft: 8 }}>★</span>}
        </div>
        <div className="stat-fill-bar">
          <div className="stat-fill-inner" style={{ width: `${fillPct}%`, background: accent }} />
        </div>
      </div>
      <div className="stat-col-box stat-col-total" style={{ color: base > 0 ? accent : undefined }}>
        {base || '—'}
      </div>
    </div>
  )
}

// ── Polarity group block ──────────────────────────────────────────────────────
function PolarityGroup({ polarity, nums, chartData }) {
  const cfg = POLARITY_CONFIGS[polarity]
  return (
    <div className="stat-polarity-group">
      <div className="stat-group-header" style={{ color: cfg.color }}>
        <span className="stat-group-icon">{cfg.icon}</span>
        <span>{cfg.label}</span>
      </div>
      {nums.map(i => (
          <StatRow key={i} i={i} combined={chartData.combined} maxTot={chartData.maxTot} primaryLabels={chartData.primaryLabels} statMeta={chartData.statMeta} />
      ))}
    </div>
  )
}

// ── Polarity mix bars ─────────────────────────────────────────────────────────
function PolarityMixBars({ playerData }) {
  const [open, setOpen] = useState(false)
  const mix     = getPolarityMix(playerData)
  const poles   = ['electric', 'magnetic', 'aether']
  const dominant = poles.reduce((a, b) => mix[a] >= mix[b] ? a : b)
  const cfg     = POLARITY_CONFIGS[dominant]

  return (
    <div className="polarity-mix-section">
      {/* Header — matches Innate Gifts style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 14, padding: '0 2px' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.4)', lineHeight: 1 }}>{cfg.icon}</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#c9a84c', textShadow: '0 0 12px rgba(201,168,76,0.3)' }}>
            POLARITY MIX
          </span>
          <span style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>
            ELECTRIC · MAGNETIC · AETHER
          </span>
        </div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.25), transparent)' }} />
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', padding: '4px 0',
          cursor: 'pointer', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.12em', color: cfg.color }}>
            {cfg.label} DOMINANT
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{open ? '▲' : '▼'}</span>
        </div>
        <div style={{ width: '60%', height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', gap: 1 }}>
          {poles.map(key => (
            <div key={key} style={{
              width: `${mix[key]}%`, height: '100%',
              background: POLARITY_CONFIGS[key].color,
              transition: 'width 0.4s ease',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {poles.map(key => {
            const c = POLARITY_CONFIGS[key]
            return (
              <span key={key} style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: c.color }}>
                {c.icon} {mix[key]}%
              </span>
            )
          })}
        </div>
      </button>

      {open && (
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 6,
          border: `1px solid ${cfg.color}44`, background: `${cfg.color}0d`,
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            {cfg.desc}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Frequency Chart section ───────────────────────────────────────────────────
function FrequencyChart({ playerData }) {
  const chartData = buildChartData(playerData)
  return (
    <div className="frequency-chart">
      <div className="stat-chart-header">
        <div className="stat-col-num" />
        <div className="stat-col-name" />
      </div>
      <PolarityGroup polarity="electric" nums={[1,3,5,7]} chartData={chartData} />
      <PolarityGroup polarity="magnetic" nums={[2,4,6,8]} chartData={chartData} />
      <PolarityGroup polarity="aether"   nums={[0,9]}     chartData={chartData} />
      <p className="stat-chart-legend">Ascended = stat exceeds pre-ascension limit</p>
    </div>
  )
}

// ── StatsTab root ─────────────────────────────────────────────────────────────
export default function StatsTab({ playerData }) {
  return (
    <>
      {playerData && <GiftCards playerData={playerData} />}
      {playerData && <PolarityMixBars playerData={playerData} />}
      {playerData && <FrequencyChart playerData={playerData} />}
      {!playerData && (
        <div className="tab-placeholder"><p className="tab-placeholder-text">No character data found.</p></div>
      )}
    </>
  )
}
