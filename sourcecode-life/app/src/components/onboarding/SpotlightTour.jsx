/**
 * SpotlightTour — first-launch guided walkthrough with dim overlay and UI highlights.
 */
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { TOUR_STEPS, TOUR_STEP_COUNT } from '../../lib/tourSteps'
import { isSpotlightTourComplete, markSpotlightTourComplete } from '../../lib/tourStorage'
import { useSpotlightPosition, getTooltipStyle } from '../../hooks/useSpotlightPosition'
import { useFocusTrap } from '../../hooks/useFocusTrap'

function DimPanels({ rect }) {
  if (!rect) return <div className="spotlight-tour-dim spotlight-tour-dim--full" aria-hidden="true" />

  const { top, left, width, height } = rect
  const bottom = top + height
  const right = left + width
  const vw = window.innerWidth
  const vh = window.innerHeight

  return (
    <>
      <div className="spotlight-tour-dim" style={{ top: 0, left: 0, right: 0, height: Math.max(0, top) }} aria-hidden="true" />
      <div className="spotlight-tour-dim" style={{ top: bottom, left: 0, right: 0, bottom: 0 }} aria-hidden="true" />
      <div className="spotlight-tour-dim" style={{ top, left: 0, width: Math.max(0, left), height }} aria-hidden="true" />
      <div className="spotlight-tour-dim" style={{ top, left: right, right: 0, height }} aria-hidden="true" />
    </>
  )
}

function SpotlightRing({ rect }) {
  if (!rect) return null
  return (
    <div
      className="spotlight-tour-ring"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden="true"
    />
  )
}

function TourTooltip({
  step,
  stepIndex,
  onBack,
  onNext,
  onSkip,
  isFirst,
  isLast,
  tooltipStyle,
  tooltipRef,
}) {
  return (
    <div
      ref={tooltipRef}
      className={`spotlight-tour-tooltip${step.placement === 'center' ? ' spotlight-tour-tooltip--center' : ''}`}
      style={tooltipStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-tour-title"
      aria-describedby="spotlight-tour-body"
    >
      <div className="spotlight-tour-step-label">
        STEP {stepIndex + 1} OF {TOUR_STEP_COUNT}
      </div>
      <h2 id="spotlight-tour-title" className="spotlight-tour-title">{step.title}</h2>
      <p id="spotlight-tour-body" className="spotlight-tour-body">{step.body}</p>

      <div className="spotlight-tour-dots" aria-hidden="true">
        {TOUR_STEPS.map((s, i) => (
          <span key={s.id} className={`spotlight-tour-dot${i === stepIndex ? ' spotlight-tour-dot--active' : ''}`} />
        ))}
      </div>

      <div className="spotlight-tour-footer">
        <button type="button" className="spotlight-tour-skip" onClick={onSkip}>
          Skip tour
        </button>
        <div className="spotlight-tour-nav">
          {!isFirst && (
            <button type="button" className="spotlight-tour-btn spotlight-tour-btn--ghost" onClick={onBack}>
              Back
            </button>
          )}
          <button type="button" className="spotlight-tour-btn spotlight-tour-btn--primary" onClick={onNext}>
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SpotlightTour({ activeTab, onTabChange }) {
  const [active, setActive] = useState(() => !isSpotlightTourComplete())
  const [stepIndex, setStepIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  const step = TOUR_STEPS[stepIndex]
  const isCentered = !step?.target
  const { rect, missing } = useSpotlightPosition(
    step?.target,
    activeTab,
    step?.tab,
    active && !isCentered
  )

  const finish = useCallback(() => {
    markSpotlightTourComplete()
    setActive(false)
  }, [])

  const tooltipRef = useFocusTrap({
    open: active,
    onClose: finish,
  })

  useEffect(() => {
    if (!active || !step) return
    if (step.tab && activeTab !== step.tab) {
      onTabChange(step.tab)
    }
  }, [active, step, activeTab, onTabChange])

  useEffect(() => {
    if (!active || !step) return
    setAnnouncement(`Tour step ${stepIndex + 1} of ${TOUR_STEP_COUNT}: ${step.title}`)
  }, [active, step, stepIndex])

  useEffect(() => {
    if (!active || !missing || !step?.target) return
    const t = setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, TOUR_STEP_COUNT - 1))
    }, 400)
    return () => clearTimeout(t)
  }, [active, missing, step?.target])

  if (!active || !step) return null

  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOUR_STEP_COUNT - 1
  const tooltipStyle = getTooltipStyle(isCentered ? null : rect, step.placement)

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function handleNext() {
    if (isLast) {
      finish()
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  return createPortal(
    <div className="spotlight-tour-root" aria-hidden={false}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      <DimPanels rect={isCentered ? null : rect} />
      <SpotlightRing rect={isCentered ? null : rect} />
      <TourTooltip
        step={step}
        stepIndex={stepIndex}
        onBack={handleBack}
        onNext={handleNext}
        onSkip={finish}
        isFirst={isFirst}
        isLast={isLast}
        tooltipStyle={tooltipStyle}
        tooltipRef={tooltipRef}
      />
    </div>,
    document.body
  )
}
