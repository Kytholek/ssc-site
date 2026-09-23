/**
 * DailyProgressRing — SVG ring showing X/N quests completed today
 */

const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STROKE_WIDTH = 4

export default function DailyProgressRing({ completed, total = 5, label }) {
  const pct = Math.min(completed / total, 1)
  const offset = CIRCUMFERENCE * (1 - pct)

  return (
    <div className="daily-progress-ring">
      <svg width={52} height={52} viewBox="0 0 52 52">
        {/* Background ring */}
        <circle
          cx={26}
          cy={26}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress ring */}
        <circle
          cx={26}
          cy={26}
          r={RADIUS}
          fill="none"
          stroke="var(--teal)"
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
            filter: 'drop-shadow(0 0 4px rgba(0,229,204,0.4))',
          }}
        />
        {/* Center text */}
        <text
          x={26}
          y={26}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Share Tech Mono', monospace"
          fontSize="14"
          fontWeight="700"
          fill="var(--teal)"
        >
          {completed}/{total}
        </text>
      </svg>
      <div className="daily-progress-ring-text">
        {label || 'DAILY PROGRESS'}
      </div>
    </div>
  )
}
