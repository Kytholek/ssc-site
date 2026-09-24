/**
 * FlowProgressNode — unified quest node (circle or square).
 * Blueprint size (90px) with optional progress arc/bar, pips, and lock states.
 */
import { Handle, Position } from 'reactflow'
import {
  FLOW_NODE_SIZE,
  FLOW_PROGRESS_VIEW,
  FLOW_PROGRESS_RADIUS,
  flowProgressDash,
  flowColorVars,
} from './flowNodeConstants'

const DEFAULT_HANDLES = [
  { type: 'target', position: Position.Top, id: 't-in' },
  { type: 'source', position: Position.Bottom, id: 'b-out' },
]

/**
 * @param {'circle' | 'square'} [props.shape]
 */
export default function FlowProgressNode({
  color = '#c9a84c',
  icon = '✦',
  displayNum = '',
  label = '',
  subtitle = '',
  isSelected = false,
  isMaster = false,
  locked = false,
  unlockLv = 0,
  progressPct = 0,
  stagesDone = 0,
  pipStates = null,
  innateGlow = false,
  fullyAligned = false,
  showProgressArc = true,
  showPips = true,
  showBadge = true,
  size = FLOW_NODE_SIZE,
  shape = 'circle',
  onClick,
  withHandles = false,
  handles = DEFAULT_HANDLES,
  ariaLabel,
  ariaPressed,
  className = '',
}) {
  const cssVars = flowColorVars(color)
  const isSquare = shape === 'square'
  const isActive = isSelected && !locked
  const baseState = locked
    ? 'locked'
    : isActive
      ? 'active'
      : innateGlow
        ? 'innate'
        : 'default'

  const pips = pipStates || [0, 1, 2].map((i) => ({
    done: i < stagesDone,
    eligible: i === stagesDone,
    innate: false,
  }))

  const pct = Math.max(0, Math.min(100, progressPct || 0))
  const showArc = showProgressArc && !locked && pct > 0 && !isSquare
  const showBar = showProgressArc && !locked && pct > 0 && isSquare

  return (
    <div
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
      className={[
        'flow-node-interactive',
        isActive ? 'flow-node-interactive--static-select' : '',
        isSquare ? 'flow-node-interactive--square' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{ ...cssVars, width: size, height: size, position: 'relative' }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || undefined}
      aria-pressed={ariaPressed != null ? ariaPressed : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      {withHandles && handles.map((h) => (
        <Handle
          key={h.id || `${h.type}-${h.position}`}
          type={h.type}
          position={h.position}
          id={h.id}
          style={{ opacity: 0, pointerEvents: 'none', ...(h.style || {}) }}
        />
      ))}

      {fullyAligned && <div className="flow-node-glow--complete" />}
      {!fullyAligned && isActive && <div className="flow-node-glow--active-static" aria-hidden="true" />}
      {!fullyAligned && !isActive && !locked && stagesDone > 0 && <div className="flow-node-glow--partial" />}
      {innateGlow && !fullyAligned && !isActive && stagesDone === 0 && <div className="flow-node-glow--innate" />}

      <div className={`flow-node-base flow-node-base--${baseState}`}>
        {isActive && !isSquare && <div className="flow-node-ring-static" aria-hidden="true" />}
        {isActive && isSquare && <div className="flow-node-frame-static" aria-hidden="true" />}
        {!isSquare && <div className="flow-node-ring-outer" />}

        {showArc && (
          <svg className="flow-node-progress" viewBox={`0 0 ${FLOW_PROGRESS_VIEW} ${FLOW_PROGRESS_VIEW}`}>
            <circle
              cx={FLOW_PROGRESS_VIEW / 2}
              cy={FLOW_PROGRESS_VIEW / 2}
              r={FLOW_PROGRESS_RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeDasharray={flowProgressDash(progressPct)}
              strokeLinecap="round"
              transform={`rotate(-90 ${FLOW_PROGRESS_VIEW / 2} ${FLOW_PROGRESS_VIEW / 2})`}
              opacity="0.7"
            />
          </svg>
        )}

        {showBar && (
          <div className="flow-node-bar-track" aria-hidden="true">
            <div className="flow-node-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}

        {locked && (
          <div className="flow-node-lock-overlay">
            <span className="flow-node-icon">🔒</span>
          </div>
        )}

        <span className="flow-node-icon">{locked ? '' : icon}</span>

        {!locked && label && <span className="flow-node-label">{label}</span>}
        {!locked && subtitle && <span className="flow-node-subtitle">{subtitle}</span>}
        {!locked && displayNum && !label && (
          <span className="flow-node-number">{displayNum}</span>
        )}

        {locked && displayNum && (
          <span className="flow-node-number flow-node-number--locked">{displayNum}</span>
        )}

        {showPips && !locked && (
          <div className="flow-node-pips">
            {pips.map((pip, i) => (
              <div
                key={i}
                className={`flow-node-pip${pip.done ? ' flow-node-pip--done' : ''}${pip.eligible && !pip.done ? ' flow-node-pip--eligible' : ''}${pip.innate ? ' flow-node-pip--innate' : ''}`}
              />
            ))}
          </div>
        )}

        {showBadge && !locked && displayNum && label && !isMaster && (
          <div className="flow-node-badge">{displayNum}</div>
        )}

        {isMaster && !locked && (
          <div className="flow-node-master">MASTER</div>
        )}

        {locked && unlockLv > 0 && (
          <div className="flow-node-lock-badge">LV {unlockLv}</div>
        )}
      </div>
    </div>
  )
}
