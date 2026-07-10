/**
 * OnboardingProgress — shared step indicator across onboarding screens
 */
const SCREEN_STEPS = {
  boot: 1,
  auth: 2,
  onboarding: 3,
  charCreate: 4,
  premiumReveal: 5,
  avatarCreate: 6,
  app: 6,
}

const TOTAL_STEPS = 6

export default function OnboardingProgress({ screen }) {
  const step = SCREEN_STEPS[screen] || 1
  const pct = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <div className="onboarding-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
      <div className="onboarding-progress-label">STEP {step} OF {TOTAL_STEPS}</div>
      <div className="onboarding-progress-track">
        <div className="onboarding-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
