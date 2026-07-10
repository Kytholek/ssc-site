/**
 * CharCreateOverlay
 *
 * Character creation form: full birth name, DOB (month/day/year), theme picker.
 * Calls computeAll() locally, then saves via NativeAuth.savePlayer() if available.
 * Falls back to local launch for tester email or browser (no native bridge).
 */
import { useState } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { computeAll } from '../../lib/numerology'
import { saveLocalPlayer } from '../../lib/storage'
import { setTheme } from '../../lib/theme'
import OnboardingProgress from '../ui/OnboardingProgress'

const TESTER_EMAIL = 'tester@sourcecode.life'
const SAVE_TIMEOUT_MS = 15000

function isValidDate(m, d, y) {
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

const THEMES = [
  { id: 'scifi',    label: '◈ SCI-FI' },
  { id: 'fantasy',  label: '⚔ FANTASY' },
  { id: 'unicorn',  label: '✦ UNICORN' },
  { id: 'diablo',   label: '⛧ DIABLO' },
]

/** Formats a numerology number as "root" or "compound/root" for the Kotlin payload */
function fmt(root, compound) {
  return compound ? `${compound}/${root}` : String(root)
}

export default function CharCreateOverlay() {
  const dispatch = useAppDispatch()
  const { currentUser, authErrors } = useAppState()

  const [name,   setName]   = useState('')
  const [month,  setMonth]  = useState('')
  const [day,    setDay]    = useState('')
  const [year,   setYear]   = useState('')
  const [theme,  setThemeId] = useState('fantasy')
  const [loading, setLoading] = useState(false)

  function selectTheme(id) {
    setThemeId(id)
    setTheme(id)
  }

  function handleSubmit(e) {
    e.preventDefault()
    dispatch({ type: 'CLEAR_AUTH_ERRORS' })
    const err = (msg) => dispatch({ type: 'AUTH_ERROR', payload: { field: 'charError', message: msg } })

    const m = parseInt(month, 10)
    const d = parseInt(day,   10)
    const y = parseInt(year,  10)

    if (!name.trim())                   return err('⚠ Please enter your full birth name.')
    if (!m || m < 1 || m > 12)          return err('⚠ Enter a valid month (1–12).')
    if (!d || d < 1 || d > 31)          return err('⚠ Enter a valid day (1–31).')
    if (!y || y < 1900 || y > 2099)     return err('⚠ Enter a valid year (1900–2099).')
    if (!isValidDate(m, d, y))          return err('⚠ That date doesn\'t exist. Check month and day.')

    let playerData
    try {
      playerData = computeAll(m, d, y, name.trim())
    } catch (ex) {
      console.error('computeAll error:', ex)
      return err('⚠ Error calculating frequencies. Please check your inputs.')
    }

    const isTester = currentUser && currentUser.email === TESTER_EMAIL
    const hasNative = typeof window.NativeAuth !== 'undefined'

    if (isTester || !hasNative) {
      // Browser / tester path — go to premium reveal (new flow)
      saveLocalPlayer(playerData)
      dispatch({ type: 'CHAR_CREATED', payload: { user: currentUser || {}, playerData } })
      dispatch({ type: 'SET_SCREEN', payload: 'premiumReveal' })
      return
    }

    // Native path — save to Firestore via Kotlin bridge
    setLoading(true)
    window._pendingPlayerData = playerData

    // Safety-net timeout: if NativeAuth_onSavePlayerResult never fires
    window._saveTimeout = setTimeout(() => {
      window._saveTimeout = null
      setLoading(false)
      err('⚠ Save timed out. Check your connection and try again.')
    }, SAVE_TIMEOUT_MS)

    const lpFmt = fmt(playerData.lp.root, playerData.lp.compound)
    const clFmt = fmt(playerData.cl.root, playerData.cl.compound)
    const exFmt = fmt(playerData.ex.root, playerData.ex.compound)
    window.NativeAuth.savePlayer(name.trim(), m + '/' + d + '/' + y, lpFmt, clFmt, exFmt)
  }

  return (
    <div className="char-create-overlay">
      <div className="char-create-card">
        <OnboardingProgress screen="charCreate" />
        <h2 className="char-create-title rpg-glow-gold">CREATE YOUR CHARACTER</h2>
        <p className="char-create-sub">Your birth data decodes your core frequencies.</p>

        <form className="char-create-form flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Name */}
          <label className="auth-label">
            Full Birth Name
            <input
              type="text"
              placeholder="As it appears on your birth certificate"
              value={name}
              onChange={e => setName(e.target.value)}
              className="auth-input mt-1"
              autoComplete="name"
              required
            />
          </label>

          {/* DOB row */}
          <div className="dob-row grid grid-cols-3 gap-3">
            <label className="auth-label">
              Month
              <input
                type="number"
                placeholder="MM"
                value={month}
                min={1}
                max={12}
                onChange={e => setMonth(e.target.value)}
                className="auth-input mt-1"
                required
              />
            </label>
            <label className="auth-label">
              Day
              <input
                type="number"
                placeholder="DD"
                value={day}
                min={1}
                max={31}
                onChange={e => setDay(e.target.value)}
                className="auth-input mt-1"
                required
              />
            </label>
            <label className="auth-label">
              Year
              <input
                type="number"
                placeholder="YYYY"
                value={year}
                min={1900}
                max={2099}
                onChange={e => setYear(e.target.value)}
                className="auth-input mt-1"
                required
              />
            </label>
          </div>

          {/* Theme picker */}
          <div className="theme-picker flex flex-col gap-2">
            <p className="auth-label">Choose Your Theme</p>
            <div className="theme-picker-row flex gap-2 flex-wrap">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                  onClick={() => selectTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {authErrors.charError && <p className="auth-error">{authErrors.charError}</p>}
          {loading && <p className="auth-loading">Saving character…</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            BEGIN YOUR JOURNEY
          </button>
        </form>
      </div>
    </div>
  )
}
