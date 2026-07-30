/**
 * Build a Services deep-link that prefills the Character Guidebook checkout
 * with the player's name, DOB, and email.
 */
import { SCL_API_BASE } from './sclBilling'

/**
 * @param {{ name?: string, m?: number, d?: number, y?: number }} playerData
 * @param {string} [email]
 * @returns {string}
 */
export function buildCharacterGuidebookUrl(playerData, email = '') {
  const qs = new URLSearchParams({
    product: 'guidebook',
    source: 'scl',
  })
  if (playerData?.name) qs.set('name', playerData.name)
  if (playerData?.m != null) qs.set('month', String(playerData.m))
  if (playerData?.d != null) qs.set('day', String(playerData.d))
  if (playerData?.y != null) qs.set('year', String(playerData.y))
  if (email) qs.set('email', email)

  return `${SCL_API_BASE}/services/?${qs.toString()}#guidebook`
}
