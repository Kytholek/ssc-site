/**
 * Theme helper — applies a data-theme attribute to <html>
 * and persists the choice to localStorage.
 * Mirrors the setTheme() logic from the original app.js.
 */
const LS_THEME = 'scl_theme'
const VALID_THEMES = ['scifi', 'fantasy', 'unicorn', 'diablo']

export function setTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return
  document.documentElement.setAttribute('data-theme', theme)
  if (document.body) document.body.setAttribute('data-theme', theme)
  try { localStorage.setItem(LS_THEME, theme) } catch { /* intentional */ }
}

export function loadSavedTheme() {
  try {
    const saved = localStorage.getItem(LS_THEME)
    if (VALID_THEMES.includes(saved)) setTheme(saved)
  } catch { /* intentional */ }
}
