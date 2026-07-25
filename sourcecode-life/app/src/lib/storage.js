/**
 * localStorage helpers — thin wrappers that swallow storage errors
 * (Safari private mode, quota exceeded, etc.)
 */

export const LS_USER   = 'scl_user'
export const LS_PLAYER = 'scl_player'

export function saveLocalUser(email) {
  try { localStorage.setItem(LS_USER, JSON.stringify({ email })) } catch { /* intentional */ }
}

export function saveLocalPlayer(data) {
  try {
    localStorage.setItem(LS_PLAYER, JSON.stringify({
      name:       data.name,
      m:          data.m,
      d:          data.d,
      y:          data.y,
      lifePath:   data.lp ? data.lp.root   : undefined,
      soulUrge:   data.so ? data.so.root   : undefined,
      expression: data.ex ? data.ex.root   : undefined,
    }))
  } catch { /* intentional */ }
}

export function loadLocalSaved() {
  try {
    const u = localStorage.getItem(LS_USER)
    const p = localStorage.getItem(LS_PLAYER)
    if (u && p) {
      const uo = JSON.parse(u)
      const po = JSON.parse(p)
      return { user: uo, partialPlayer: po }
    }
  } catch { /* intentional */ }
  return null
}

export const LS_CHAR_ALIAS = 'scl_char_alias'

export function getCharAlias() {
  try { return localStorage.getItem(LS_CHAR_ALIAS) || null } catch { return null }
}

export function setCharAlias(alias) {
  try { localStorage.setItem(LS_CHAR_ALIAS, alias || '') } catch {}
}

export const LS_DISPLAY_NAME = 'scl_display_name'

export function getDisplayName() {
  try { return localStorage.getItem(LS_DISPLAY_NAME) || null } catch { return null }
}

export function setDisplayName(name) {
  try { localStorage.setItem(LS_DISPLAY_NAME, name.trim() || '') } catch {}
}

export function clearLocalSession() {
  const keys = [
    LS_USER, LS_PLAYER, LS_CHAR_ALIAS,
    'scl_avatar', 'scl_notif_enabled', 'scl_notif_hour',
    'scl_notif_minute', 'scl_theme', 'scl_uid',
  ]
  keys.forEach(k => { try { localStorage.removeItem(k) } catch { /* intentional */ } })
  try { window._currentUid = null } catch { /* intentional */ }
}
