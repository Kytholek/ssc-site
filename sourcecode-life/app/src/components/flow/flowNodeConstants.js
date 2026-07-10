/** Canonical flow node size — matches Decode/Blueprint flows. */
export const FLOW_NODE_SIZE = 90
export const FLOW_NODE_HALF = FLOW_NODE_SIZE / 2

/** SVG progress arc geometry scaled to FLOW_NODE_SIZE. */
export const FLOW_PROGRESS_VIEW = FLOW_NODE_SIZE
export const FLOW_PROGRESS_RADIUS = 41
export const FLOW_PROGRESS_CIRCUMFERENCE = 2 * Math.PI * FLOW_PROGRESS_RADIUS

export function flowProgressDash(progressPct) {
  const pct = Math.max(0, Math.min(100, progressPct || 0))
  return `${(pct / 100) * FLOW_PROGRESS_CIRCUMFERENCE} ${FLOW_PROGRESS_CIRCUMFERENCE}`
}

export function flowColorVars(hex) {
  const color = hex || '#c9a84c'
  return {
    '--flow-color': color,
    '--flow-color-dim': `${color}33`,
    '--flow-color-muted': `${color}55`,
    '--flow-color-glow': `${color}66`,
    '--flow-color-glow-dim': `${color}33`,
    '--flow-color-faded': `${color}18`,
    '--flow-pip-color': color,
  }
}
