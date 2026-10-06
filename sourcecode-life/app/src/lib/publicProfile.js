/**
 * Public seeker snapshot for ally cards and invite banners.
 * Frequencies are stored as "7/16" strings or { root, compound } objects.
 */
import { fmt } from './numerology'
import { getClassTitle, getFilledSlots } from './classLoadout'
import { fetchUserProfile } from '../components/auth/firestoreprofile'

export function parseFreq(value) {
  if (value && typeof value === 'object') {
    const root = Number(value.root)
    if (Number.isFinite(root)) {
      const compound = value.compound
      const label = compound != null && compound !== '' ? fmt(root, compound) : String(root)
      return { root, label }
    }
  }
  const text = String(value ?? '').trim()
  if (!text || text === '?' || text === '[object Object]') return { root: null, label: '?' }
  const root = Number(text.split('/')[0])
  return { root: Number.isFinite(root) ? root : null, label: text }
}

export function classTitleFromLoadout(loadout) {
  if (!loadout || typeof loadout !== 'object') return ''
  try {
    if (!getFilledSlots(loadout).length) return ''
    const title = getClassTitle(loadout)
    return title && title !== 'Unspecialized' ? title : ''
  } catch {
    return ''
  }
}

function isPremiumFromEntitlements(entitlements) {
  if (!Array.isArray(entitlements)) return false
  if (entitlements.includes('premium_lifetime')) return true
  const timed = entitlements.find(e => /^premium_\d+d:/.test(e))
  if (!timed) return false
  const i = timed.indexOf(':')
  if (i < 0) return false
  return new Date(timed.slice(i + 1)) > new Date()
}

export function profileFromPlayerDoc(uid, data = {}, snapshot = {}) {
  const docData = data || {}
  return {
    uid: uid || snapshot.uid || '',
    name: docData.name || snapshot.name || '',
    lp: docData.lp ?? snapshot.lp ?? '?',
    cl: docData.cl ?? snapshot.cl ?? '?',
    ex: docData.ex ?? snapshot.ex ?? '?',
    avatarConfig: docData.avatar || snapshot.avatarConfig || null,
    classTitle: classTitleFromLoadout(docData.classLoadout) || snapshot.classTitle || '',
    isPremium: snapshot.isPremium === true || isPremiumFromEntitlements(docData.entitlements),
    reputation: docData.reputation || snapshot.reputation || null,
    takerReputation: docData.takerReputation || snapshot.takerReputation || null,
  }
}

export async function loadPublicProfile(uid, snapshot = {}) {
  if (!uid) return profileFromPlayerDoc('', {}, snapshot)
  try {
    const data = await fetchUserProfile(uid)
    return profileFromPlayerDoc(uid, data, snapshot)
  } catch {
    return profileFromPlayerDoc(uid, {}, snapshot)
  }
}
