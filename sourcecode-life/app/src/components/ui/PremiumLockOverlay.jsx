import { useAppDispatch } from '../../context/AppContext'
import { useGameState } from '../../state/GameContext'

export default function PremiumLockOverlay({ feature, children }) {
  const dispatch = useAppDispatch()
  const { user } = useGameState()

  if (user.isPremium) return children || null

  function handleUnlock() {
    dispatch({ type: 'OPEN_PREMIUM_MODAL' })
  }

  return (
    <div className="premium-lock-wrapper">
      {children && (
        <div className="premium-lock-preview" aria-hidden="true">
          {children}
        </div>
      )}
      <div className="premium-lock-overlay" role="dialog" aria-label="Premium feature locked">
        <div className="premium-lock-content">
          <div className="premium-lock-icon" aria-hidden="true">✦</div>
          <h3 className="premium-lock-title">PREMIUM FEATURE</h3>
          <p className="premium-lock-feature">{feature}</p>
          <button type="button" className="premium-lock-btn" onClick={handleUnlock}>
            UNLOCK PREMIUM
          </button>
          <p className="premium-lock-free-note">Free tier includes quests, stats, and daily objectives.</p>
        </div>
      </div>
    </div>
  )
}
