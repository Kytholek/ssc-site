import { useGameState, useGameDispatch } from '../../state/GameContext'
import { ACTIONS } from '../../state/actions'

export default function Toast() {
  const { ui } = useGameState()
  const gameDispatch = useGameDispatch()
  if (!ui?.toast) return null

  const { msg, color } = ui.toast

  function dismiss() {
    gameDispatch({ type: ACTIONS.CLEAR_TOAST })
  }

  return (
    <div
      className="toast-display toast-display--interactive"
      style={{ color: color || 'var(--teal)' }}
      role="status"
      aria-live="polite"
    >
      <span>{msg}</span>
      <button
        type="button"
        className="toast-dismiss-btn"
        onClick={dismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  )
}
