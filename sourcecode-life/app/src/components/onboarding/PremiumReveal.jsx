import { useAppState, useAppDispatch } from '../../context/AppContext'
import NumerologyRain from '../effects/NumerologyRain'
import OnboardingProgress from '../ui/OnboardingProgress'

const FEATURES = [
  { glyph: '📜', title: 'Full Blueprint', desc: 'Complete shadow + integration reading for every number in your chart' },
  { glyph: '🌀', title: 'Spiral of Time', desc: 'Visual map of the cyclical seasons in your life; monthly, yearly, 9-year cycles and pinnacles' },
  { glyph: '📊', title: 'Insights & Analytics', desc: 'Stat growth manager, polarity balance charts, and your Life Quest roadmap' },
  { glyph: '⚔', title: 'Ally Badge', desc: 'A ✦ emblem on your name — visible to allies in the Realm' },
  { glyph: '☁', title: 'Cloud Gear Sync', desc: 'Your character equipment synced across devices when gear launches' },
  { glyph: '🎁', title: 'Premium Gift Codes', desc: 'Earn gift tokens by completing quests and share 3–7 day premium with allies' },
]

const FREE_VS_PREMIUM = [
  { feature: 'Daily quests & XP', free: true, premium: true },
  { feature: 'Life Quest objectives', free: true, premium: true },
  { feature: 'Stats & skill tree', free: true, premium: true },
  { feature: 'Full blueprint decode', free: false, premium: true },
  { feature: 'Time Spiral & insights', free: false, premium: true },
  { feature: 'Ally badge in Realm', free: false, premium: true },
]

export default function PremiumReveal({ onComplete }) {
  const dispatch = useAppDispatch()
  const { playerData } = useAppState()

  function handleUnlock() {
    dispatch({ type: 'OPEN_PREMIUM_MODAL' })
  }

  function handleNavigate() {
    if (onComplete) {
      onComplete()
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'avatarCreate' })
    }
  }

  const lpRoot = playerData?.lp?.root ?? '—'
  const clRoot = playerData?.cl?.root ?? '—'
  const exRoot = playerData?.ex?.root ?? '—'

  return (
    <div className="pr-overlay">
      <NumerologyRain />
      <div className="pr-content">
        <OnboardingProgress screen="premiumReveal" />
        <div className="pr-card">
          <div className="pr-header">
            <div className="pr-header-icon" aria-hidden="true">✦</div>
            <h2 className="pr-header-title">YOUR BLUEPRINT IS READY</h2>
            <div className="pr-numbers-row">
              <div className="pr-number-pill">Life Path · {lpRoot}</div>
              <div className="pr-number-pill">Calling · {clRoot}</div>
              <div className="pr-number-pill">Expression · {exRoot}</div>
            </div>
          </div>

          <p className="pr-subtext">
            The free tier gives you your core quest engine.<br />
            Premium unlocks the full decode.
          </p>

          <div className="pr-comparison">
            <div className="pr-comparison-header">
              <span>Feature</span><span>Free</span><span>Premium</span>
            </div>
            {FREE_VS_PREMIUM.map(row => (
              <div key={row.feature} className="pr-comparison-row">
                <span>{row.feature}</span>
                <span>{row.free ? '✓' : '—'}</span>
                <span>{row.premium ? '✓' : '—'}</span>
              </div>
            ))}
          </div>

          <div className="pr-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="pr-feature">
                <span className="pr-feature-glyph" aria-hidden="true">{f.glyph}</span>
                <div>
                  <div className="pr-feature-title">{f.title}</div>
                  <div className="pr-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="pr-cta pr-cta--primary" onClick={handleUnlock}>
            UNLOCK PREMIUM ✦
          </button>
          <button type="button" className="pr-cta pr-cta--ghost" onClick={handleNavigate}>
            CONTINUE WITH FREE →
          </button>
        </div>
      </div>
    </div>
  )
}
