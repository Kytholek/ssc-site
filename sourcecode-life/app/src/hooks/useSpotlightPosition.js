import { useState, useEffect, useCallback } from 'react'

const PADDING = 8
const MAX_RETRIES = 3

function measureTarget(selector) {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null

  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null

  return {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
    bottom: rect.bottom + PADDING,
    right: rect.right + PADDING,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  }
}

/**
 * Tracks spotlight hole position for a target selector.
 * Retries measurement when target is not yet in DOM.
 */
export function useSpotlightPosition(targetSelector, activeTab, stepTab, enabled) {
  const [rect, setRect] = useState(null)
  const [missing, setMissing] = useState(false)

  const update = useCallback(() => {
    if (!enabled) {
      setRect(null)
      setMissing(false)
      return
    }

    if (!targetSelector) {
      setRect(null)
      setMissing(false)
      return
    }

    const r = measureTarget(targetSelector)
    if (r) {
      setRect(r)
      setMissing(false)
    } else {
      setRect(null)
      setMissing(true)
    }
  }, [targetSelector, enabled])

  useEffect(() => {
    if (!enabled) return

    let retries = 0
    let rafId = 0

    const tryMeasure = () => {
      update()
      const el = targetSelector ? document.querySelector(targetSelector) : null
      if (!el && targetSelector && retries < MAX_RETRIES) {
        retries++
        rafId = requestAnimationFrame(tryMeasure)
      } else if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        rafId = requestAnimationFrame(update)
      }
    }

    if (stepTab && activeTab !== stepTab) {
      setRect(null)
      return
    }

    rafId = requestAnimationFrame(tryMeasure)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [targetSelector, activeTab, stepTab, enabled, update])

  return { rect, missing, remeasure: update }
}

/**
 * Compute tooltip position from hole rect and placement hint.
 */
export function getTooltipStyle(rect, placement, viewport = { w: window.innerWidth, h: window.innerHeight }) {
  if (!rect || placement === 'center') {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 'min(360px, calc(100vw - 32px))',
    }
  }

  const tooltipMaxW = Math.min(360, viewport.w - 32)
  const margin = 16
  const nearBottom = rect.bottom > viewport.h - 180

  if (placement === 'above' || nearBottom) {
    const bottom = viewport.h - rect.top + margin
    return {
      position: 'fixed',
      bottom: `${bottom}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: `${tooltipMaxW}px`,
    }
  }

  return {
    position: 'fixed',
    top: `${rect.bottom + margin}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: `${tooltipMaxW}px`,
  }
}
