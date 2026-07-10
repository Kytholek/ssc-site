import { useState } from 'react'
import { useAppDispatch } from '../../context/AppContext'
import NumerologyRain from '../effects/NumerologyRain'
import OnboardingProgress from '../ui/OnboardingProgress'

function WelcomeScreen({ onNext }) {
  return (
    <div className="ob-screen ob-screen--enter">
      <div className="ob-icon">◈</div>
      <h2 className="ob-title">WELCOME, SEEKER</h2>
      <p className="ob-body">
        Your name and birth date are a code.<br />
        We decode them into quests, cycles, and a blueprint<br />
        that evolves as you play.
      </p>
      <button className="ob-cta" onClick={onNext}>
        SEE YOUR BLUEPRINT →
      </button>
    </div>
  )
}

function PermissionsScreen({ onNext }) {
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  function handleContinue() {
    if (locationEnabled && window.Native_requestLocation) {
      window.Native_requestLocation()
    }
    if (notificationsEnabled && window.Native_requestNotifications) {
      window.Native_requestNotifications()
    }
    onNext()
  }

  return (
    <div className="ob-screen ob-screen--enter">
      <div className="ob-icon">◎</div>
      <h2 className="ob-title">A FEW QUICK THINGS</h2>

      <div className="ob-perms-container">
        <div className="ob-perm-row">
          <div className="ob-perm-icon">📍</div>
          <div className="ob-perm-text">
            <div className="ob-perm-label">LOCATION</div>
            <div className="ob-perm-desc">For your World Quest Map — nearby missions. Only active when the map is open.</div>
          </div>
          <button
            className={`ob-toggle ${locationEnabled ? 'ob-toggle--on' : ''}`}
            onClick={() => setLocationEnabled(!locationEnabled)}
            type="button"
            aria-pressed={locationEnabled}
            aria-label={`Location permission${locationEnabled ? ' enabled' : ' disabled'} — will request on continue`}
          />
        </div>

        <div className="ob-perm-row">
          <div className="ob-perm-icon">🔔</div>
          <div className="ob-perm-text">
            <div className="ob-perm-label">NOTIFICATIONS</div>
            <div className="ob-perm-desc">Daily cycle alerts and quest window reminders.</div>
          </div>
          <button
            className={`ob-toggle ${notificationsEnabled ? 'ob-toggle--on' : ''}`}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            type="button"
            aria-pressed={notificationsEnabled}
            aria-label={`Notifications${notificationsEnabled ? ' enabled' : ' disabled'} — will request on continue`}
          />
        </div>
      </div>

      <button className="ob-cta" onClick={handleContinue}>
        LET'S GO →
      </button>
    </div>
  )
}

export default function OnboardingFlow({ onComplete }) {
  const dispatch = useAppDispatch()
  const [step, setStep] = useState(0)

  function handleWelcomeNext() {
    setStep(1)
  }

  function handlePermissionsNext() {
    sessionStorage.removeItem('scl_new_user')
    if (onComplete) {
      onComplete()
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'charCreate' })
    }
  }

  return (
    <div className="ob-overlay">
      <NumerologyRain />
      <div className="ob-content">
        <OnboardingProgress screen="onboarding" />
        <div className="ob-step-dots">
          <div className={`ob-dot ${step === 0 ? 'ob-dot--active' : ''}`} />
          <div className={`ob-dot ${step === 1 ? 'ob-dot--active' : ''}`} />
        </div>

        <div className="ob-card-wrapper">
          {step === 0 && <WelcomeScreen onNext={handleWelcomeNext} />}
          {step === 1 && <PermissionsScreen onNext={handlePermissionsNext} />}
        </div>
      </div>
    </div>
  )
}
