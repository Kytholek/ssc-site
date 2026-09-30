/**
 * QuestCompletionChart — Bar chart showing daily quest completions
 */
import { useState, useEffect } from 'react'
import { getQuestCompletionTrend } from '../../lib/dataHistory'

const DAYS_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function QuestCompletionChart({ range = 30 }) {
  const [data, setData] = useState(() => getQuestCompletionTrend(range))
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setData(getQuestCompletionTrend(range))
    }, 5000)
    return () => clearInterval(interval)
  }, [range])

  if (!data.length) {
    return (
      <div className="data-chart">
        <div className="data-chart-title">
          <span className="data-chart-info-btn" onClick={() => setShowInfo(!showInfo)} role="button" tabIndex={0} aria-label="Chart info">ⓘ</span>
          QUEST COMPLETIONS
        </div>
        {showInfo && <div className="data-chart-tooltip">Shows daily quest completions over the past 30 days. Gold highlights indicate resonant quest completions.</div>}
        <div className="data-chart-empty">
          <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.5 }}>◈</div>
          Complete quests to start tracking your progress
        </div>
      </div>
    )
  }

  const maxVal = Math.max(...data.map(d => d.completed), 1)
  const chartW = 300
  const chartH = 120
  const barW = Math.max(2, (chartW - data.length * 2) / data.length)
  const padTop = 10
  const padBottom = 20

  return (
    <div className="data-chart">
      <div className="data-chart-title">
        <span className="data-chart-info-btn" onClick={() => setShowInfo(!showInfo)} role="button" tabIndex={0} aria-label="Chart info">ⓘ</span>
        {range <= 7 ? 'WEEKLY' : 'MONTHLY'} QUEST COMPLETIONS
      </div>
      {showInfo && <div className="data-chart-tooltip">Shows daily quest completions over the past {range} days. Gold highlights indicate resonant quest completions.</div>}
      <svg viewBox={`0 0 ${chartW} ${chartH + padTop + padBottom}`} className="data-chart-svg">
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1={0} y1={padTop + chartH * (1 - pct)} x2={chartW} y2={padTop + chartH * (1 - pct)} stroke="currentColor" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const barH = (d.completed / maxVal) * chartH
          const x = i * (barW + 2)
          const y = padTop + chartH - barH
          const isToday = i === data.length - 1
          const isResonant = d.resonant > 0
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} rx={1} fill={isToday ? 'var(--teal)' : isResonant ? 'color-mix(in srgb, var(--gold) 60%, transparent)' : 'color-mix(in srgb, var(--teal) 40%, transparent)'} opacity={isToday ? 1 : 0.8} />
              {d.resonant > 0 && <rect x={x} y={y + barH * 0.3} width={barW} height={barH * 0.7} rx={1} fill="color-mix(in srgb, var(--gold) 30%, transparent)" />}
              {data.length <= 14 && i % Math.ceil(data.length / 7) === 0 && (
                <text x={x + barW / 2} y={padTop + chartH + 14} textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize={7} fill="var(--text-dim)">{DAYS_LABELS[new Date(d.date + 'T00:00:00').getDay()]}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="data-chart-legend">
        <span className="data-chart-legend-item"><span className="data-chart-legend-dot" style={{ background: 'color-mix(in srgb, var(--teal) 40%, transparent)' }} />Completed</span>
        <span className="data-chart-legend-item"><span className="data-chart-legend-dot" style={{ background: 'color-mix(in srgb, var(--gold) 30%, transparent)' }} />Resonant</span>
      </div>
    </div>
  )
}
