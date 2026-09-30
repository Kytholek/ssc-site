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
  const fade = (suffix) => (String(color).startsWith('#') ? `${color}${suffix}` : color)
  return {
    '--flow-color': color,
    '--flow-color-dim': fade('33'),
    '--flow-color-muted': fade('55'),
    '--flow-color-glow': fade('66'),
    '--flow-color-glow-dim': fade('33'),
    '--flow-color-faded': fade('18'),
    '--flow-pip-color': color,
  }
}

const THEME_COLOR_FALLBACK = {
  '--teal': '#00e5b4',
  '--gold': '#c9a84c',
  '--amber': '#ff9500',
  '--rose': '#dc5078',
  '--purple': '#7b61ff',
  '--sage': '#78b464',
  '--silver': '#c0c0c0',
}

/** Read the active theme token so quest nodes follow fantasy, sci-fi, diablo, and unicorn. */
export function resolveThemeColor(token, fallback) {
  if (!token) return fallback || '#c9a84c'
  const raw = String(token).trim()
  if (raw.startsWith('#')) return raw
  const name = raw.startsWith('--') ? raw : `--${raw}`
  const fb = fallback || THEME_COLOR_FALLBACK[name] || '#c9a84c'
  if (typeof document === 'undefined') return fb
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fb
}
