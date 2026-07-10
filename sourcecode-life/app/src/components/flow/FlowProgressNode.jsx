/**
 * FlowProgressNode — unified circular quest node for the whole app.
 * Blueprint size (90px) with optional progress arc, pips, and lock states.
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
 * @param {object} props
 * @param {string} props.color — hex color
 * @param {string} [props.icon]
 * @param {string} [props.displayNum] — center or badge number
 * @param {string} [props.label] — short label inside node
 * @param {string} [props.subtitle] — subtitle inside node
 * @param {boolean} [props.isSelected]
 * @param {boolean} [props.isMaster]
 * @param {boolean} [props.locked]
 * @param {number} [props.unlockLv]
 * @param {number} [props.progressPct] — 0-100 for arc
 * @param {number} [props.stagesDone] — completed pip count
 * @param {Array<boolean>} [props.pipStates] — explicit pip done/eligible
 * @param {boolean} [props.innateGlow]
 * @param {boolean} [props.fullyAligned]
 * @param {boolean} [props.showProgressArc]
 * @param {boolean} [props.showPips]
 * @param {boolean} [props.showBadge]
 * @param {number} [props.size] — override size (e.g. skill tree zoom)
 * @param {Function} [props.onClick]
 * @param {boolean} [props.withHandles]
 * @param {Array} [props.handles]
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
  onClick,
  withHandles = false,
  handles = DEFAULT_HANDLES,
}) {
  const cssVars = flowColorVars(color)
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

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onMouseDown={(e) => e.stopPropagation()}
      className="flow-node-interactive"
      style={{ ...cssVars, width: size, height: size, position: 'relative' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
    >
      {withHandles && handles.map((h) => (
        <Handle key={h.id || `${h.type}-${h.position}`} type={h.type} position={h.position} id={h.id} style={{ opacity: 0 }} />
      ))}

      {fullyAligned && <div className="flow-node-glow--complete" />}
      {!fullyAligned && isActive && <div className="flow-node-glow--complete" />}
      {!fullyAligned && !isActive && !locked && stagesDone > 0 && <div className="flow-node-glow--partial" />}
      {innateGlow && !fullyAligned && !isActive && stagesDone === 0 && <div className="flow-node-glow--innate" />}

      <div className={`flow-node-base flow-node-base--${baseState}`}>
        {isActive && <div className="flow-node-ring-spin" />}
        <div className="flow-node-ring-outer" />

        {showProgressArc && !locked && progressPct > 0 && (
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

        {showBadge && !locked && displayNum && label && (
          <div className="flow-node-badge">{displayNum}</div>
        )}

        {isMaster && <div className="flow-node-badge">MASTER</div>}

        {locked && unlockLv > 0 && (
          <div className="flow-node-lock-badge">LV {unlockLv}</div>
        )}
      </div>
    </div>
  )
}
