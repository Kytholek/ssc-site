/**
 * SCL Stripe billing helpers — Worker-backed subscription checkout / cancel / sync.
 */

export const SCL_API_BASE = 'https://simulationsourcecode.com'

export function parseEntitlementExpiry(timedEntry) {
  if (!timedEntry || typeof timedEntry !== 'string') return null
  const i = timedEntry.indexOf(':')
  if (i < 0) return null
  return timedEntry.slice(i + 1)
}

export function entitlementForPeriodEnd(productId, periodEndUnix) {
  const expiryIso = new Date(periodEndUnix * 1000).toISOString()
  if (productId === 'premium_annual') return `premium_365d:${expiryIso}`
  if (productId === 'premium_monthly') return `premium_30d:${expiryIso}`
  if (productId === 'premium_lifetime') return 'premium_lifetime'
  // Fallback: treat as monthly-shaped timed grant
  return `premium_30d:${expiryIso}`
}

export function daysUntilIso(iso) {
  const ms = new Date(iso) - new Date()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

async function parseJson(res) {
  let data = null
  try { data = await res.json() } catch { data = null }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export async function createSclCheckout({ productId, idToken, successUrl, cancelUrl }) {
  const res = await fetch(`${SCL_API_BASE}/api/scl/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, idToken, successUrl, cancelUrl }),
  })
  return parseJson(res)
}

export async function fetchSclCheckoutSession(sessionId) {
  const res = await fetch(
    `${SCL_API_BASE}/api/scl/session?session_id=${encodeURIComponent(sessionId)}`
  )
  return parseJson(res)
}

export async function fetchSclSubscription({ subscriptionId, idToken }) {
  const res = await fetch(
    `${SCL_API_BASE}/api/scl/subscription?subscription_id=${encodeURIComponent(subscriptionId)}&idToken=${encodeURIComponent(idToken)}`
  )
  return parseJson(res)
}

export async function cancelSclSubscription({ subscriptionId, idToken }) {
  const res = await fetch(`${SCL_API_BASE}/api/scl/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId, idToken }),
  })
  return parseJson(res)
}
