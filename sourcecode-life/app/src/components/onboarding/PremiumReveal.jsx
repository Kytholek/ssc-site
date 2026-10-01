import { useAppState, useAppDispatch } from '../../context/AppContext'
import NumerologyRain from '../effects/NumerologyRain'
import OnboardingProgress from '../ui/OnboardingProgress'

const FEATURES = [
  { glyph: '✦', title: 'Today’s Reading', desc: 'Shadow and integration for your personal-day number, on the journal you open every day' },
  { glyph: '📜', title: 'Full Blueprint', desc: 'Life Path stays free. Premium opens Lessons, Identity, and Purpose — shadow and integration for every number' },
  { glyph: '🌀', title: 'Spiral of Time', desc: 'Visual map of the cyclical seasons in your life; monthly, yearly, 9-year cycles and pinnacles' },
  { glyph: '📊', title: 'Insights', desc: 'How your strongest stat sits against your Life Path, plus the life-quest roadmap' },
  { glyph: '✎', title: 'Class Title', desc: 'Rename the class title on your skill loadout' },
  { glyph: '⚔', title: 'Ally Badge', desc: 'A ✦ emblem on your name — visible to allies in the Realm' },
]

const FREE_VS_PREMIUM = [
  { feature: 'Daily quests & XP', free: true, premium: true },
  { feature: 'Life Path reading', free: true, premium: true },
  { feature: 'Today’s shadow reading', free: false, premium: true },
  { feature: 'Full blueprint & Time Spiral', free: false, premium: true },
  { feature: 'Insights & class rename', free: false, premium: true },
]

export default function PremiumReveal({ onComplete, inApp = false }) {
  const dispatch = useAppDispatch()
  const { playerData } = useAppState()

  function handleUnlock() {
    dispatch({ type: 'OPEN_PREMIUM_MODAL' })
    if (inApp && onComplete) onComplete()
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
        {!inApp && <OnboardingProgress screen="premiumReveal" />}
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
            {inApp
              ? <>You finished a day. The free tier keeps the quest engine and your Life Path.<br />Premium is the shadow reading for today’s number, and the rest of the chart.</>
              : <>The free tier keeps the quest engine and your Life Path.<br />Premium is the shadow reading for today’s number, and the rest of the chart.</>}
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
            UNLOCK PREMIUM · $4.99/MO
          </button>
          <button type="button" className="pr-cta pr-cta--ghost" onClick={handleNavigate}>
            {inApp ? 'KEEP PLAYING FREE →' : 'CONTINUE WITH FREE →'}
          </button>
        </div>
      </div>
    </div>
  )
}
