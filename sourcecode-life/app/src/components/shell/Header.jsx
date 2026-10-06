/**
 * Header — sticky top bar with menu and frequency spike banner
 */
import { useState, useEffect, useRef } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useGameDispatch } from '../../state/GameContext'
import { ACTIONS } from '../../state/actions'
import { clearLocalSession } from '../../lib/storage'

export default function Header({ onTabChange, hidden = false }) {
  const { playerData } = useAppState()
  const dispatch = useAppDispatch()
  const gameDispatch = useGameDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef(null)
  const menuBtnRef = useRef(null)

  const savedAlias = (() => { try { return localStorage.getItem('scl_char_alias') || '' } catch { return '' } })()
  const displayName = (savedAlias || playerData?.name || '').toUpperCase()
  const m = playerData?.m, d = playerData?.d, y = playerData?.y
  const dobText = (m && d && y)
    ? String(m).padStart(2, '0') + ' / ' + String(d).padStart(2, '0') + ' / ' + y
    : ''

  useEffect(() => {
    if (!menuOpen) return undefined

    function handlePointerDown(e) {
      const root = menuWrapRef.current
      if (root && !root.contains(e.target)) setMenuOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuBtnRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  function handleSignOut() {
    setMenuOpen(false)
    clearLocalSession()
    if (typeof window.NativeAuth !== 'undefined') window.NativeAuth.signOut()
    dispatch({ type: 'SIGN_OUT' })
  }

  function handleResetChar() {
    if (!confirm('Reset your character? All progress, XP, levels, and quest completions will be cleared.')) return
    setMenuOpen(false)
    if (typeof window.QuestEngine_reset === 'function') window.QuestEngine_reset()
    gameDispatch({ type: ACTIONS.RESET_CHAR })
    dispatch({ type: 'RESET_CHAR' })
  }

  if (hidden) return null

  return (
    <div className="app-header-wrap">
      <header className="app-header">
        <div className="app-header-identity">
          <div className="app-header-name rpg-glow-gold">{displayName || 'SET NAME'}</div>
          {dobText && <div className="app-header-dob">{dobText}</div>}
        </div>

        <div className="app-header-menu-wrap" ref={menuWrapRef}>
          <button
            ref={menuBtnRef}
            type="button"
            className="app-header-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            ☰
          </button>

          {menuOpen && (
            <div className="app-header-menu" role="menu">
              <button type="button" className="app-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); onTabChange && onTabChange('config', 'settings') }}>⚙ Settings</button>
              <a href="https://simulationsourcecode.com" target="_blank" rel="noopener noreferrer" className="app-menu-item" role="menuitem">← Back to Site</a>
              <button type="button" className="app-menu-item" role="menuitem" onClick={handleResetChar}>↺ Reset Character</button>
              <button type="button" className="app-menu-item app-menu-item-danger" role="menuitem" onClick={handleSignOut}>⏏ Sign Out</button>
            </div>
          )}
        </div>
      </header>
    </div>
  )
}
