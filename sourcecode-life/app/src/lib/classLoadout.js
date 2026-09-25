/**
 * RPG class loadout — max 2 equipped specialization routes from blueprint seals.
 * Storage: scl_class_loadout_v1 + Firestore players/{uid}.classLoadout
 */

import {
  getNumberDef,
  getRouteDef,
  loadSkillTreeProgressV3,
  saveSkillTreeProgressV3,
  startRoute,
  migrateProgressToV3,
} from './skillRoutes'
import { markChecklistItem } from './tourStorage'

export const CLASS_LOADOUT_LS_KEY = 'scl_class_loadout_v1'
export const MAX_LOADOUT_SLOTS = 2
export const RESPEC_COOLDOWN_MS = 24 * 60 * 60 * 1000

const BLUEPRINT_NODES = ['lp', 'ex', 'cl', 'so', 'ou', 'ac', 'th']

/** Master numbers → skill-tree seal (mirrors skillQuestBridge.skillTreeNumber) */
function mapSealRoot(root) {
  const n = Number(root)
  if (n === 11) return 2
  if (n === 22) return 4
  if (n === 33) return 6
  if (n === 44) return 8
  return (n >= 1 && n <= 9) ? n : null
}

/** Seal archetype keys for composeBlendTitle templates */
const SEAL_ARCH = {
  1: 'action',
  2: 'bond',
  3: 'voice',
  4: 'craft',
  5: 'motion',
  6: 'care',
  7: 'sight',
  8: 'power',
  9: 'gift',
}

/** Authored dual-class blends keyed by sorted "num:routeId|num:routeId" */
export const CLASS_BLEND_TABLE = {
  // Existing signatures
  '3:voice|7:contemplation': 'Orator–Seer',
  '3:creation|7:contemplation': 'Maker–Seer',
  '3:writing|7:contemplation': 'Scribe–Seer',
  '1:leadership|3:voice': 'Leader–Orator',
  '1:leadership|8:achievement': 'Leader–Achiever',
  '3:voice|8:achievement': 'Orator–Achiever',
  '4:discipline|8:achievement': 'Disciple–Achiever',
  '2:relationships|6:care': 'Partner–Caregiver',
  '5:exploration|7:research': 'Explorer–Scholar',
  '3:writing|9:teaching': 'Scribe–Mentor',
  '7:contemplation|9:contribution': 'Seer–Giver',
  // Seal 1 pairings
  '1:leadership|2:relationships': 'Leader–Partner',
  '1:leadership|4:discipline': 'Leader–Disciple',
  '1:leadership|5:exploration': 'Leader–Explorer',
  '1:leadership|6:care': 'Leader–Caregiver',
  '1:leadership|7:contemplation': 'Leader–Seer',
  '1:leadership|9:contribution': 'Leader–Giver',
  '1:entrepreneurship|3:creation': 'Founder–Maker',
  '1:entrepreneurship|4:systems': 'Founder–Engineer',
  '1:entrepreneurship|8:wealth': 'Founder–Magnate',
  '1:entrepreneurship|5:innovation': 'Founder–Innovator',
  '1:physical|5:adventure': 'Athlete–Adventurer',
  '1:physical|4:discipline': 'Athlete–Disciple',
  '1:physical|8:achievement': 'Athlete–Achiever',
  // Seal 2
  '2:relationships|3:voice': 'Partner–Orator',
  '2:relationships|7:contemplation': 'Partner–Seer',
  '2:relationships|9:teaching': 'Partner–Mentor',
  '2:empathy|6:care': 'Empath–Caregiver',
  '2:empathy|7:contemplation': 'Empath–Seer',
  '2:empathy|9:contribution': 'Empath–Giver',
  '2:social|3:voice': 'Connector–Orator',
  '2:social|5:exploration': 'Connector–Explorer',
  '2:social|9:teaching': 'Connector–Mentor',
  // Seal 3
  '3:voice|4:discipline': 'Orator–Disciple',
  '3:voice|6:care': 'Orator–Caregiver',
  '3:voice|9:teaching': 'Orator–Mentor',
  '3:creation|4:organization': 'Maker–Architect',
  '3:creation|5:innovation': 'Maker–Innovator',
  '3:creation|9:creation': 'Maker–Artisan',
  '3:writing|4:organization': 'Scribe–Architect',
  '3:writing|7:research': 'Scribe–Scholar',
  '3:writing|8:command': 'Scribe–Commander',
  // Seal 4
  '4:discipline|6:care': 'Disciple–Caregiver',
  '4:discipline|7:research': 'Disciple–Scholar',
  '4:organization|8:achievement': 'Architect–Achiever',
  '4:organization|9:contribution': 'Architect–Giver',
  '4:systems|5:innovation': 'Engineer–Innovator',
  '4:systems|7:research': 'Engineer–Scholar',
  '4:systems|8:wealth': 'Engineer–Magnate',
  // Seal 5
  '5:exploration|6:service': 'Explorer–Server',
  '5:exploration|8:achievement': 'Explorer–Achiever',
  '5:exploration|9:contribution': 'Explorer–Giver',
  '5:adventure|8:command': 'Adventurer–Commander',
  '5:adventure|9:contribution': 'Adventurer–Giver',
  '5:innovation|7:research': 'Innovator–Scholar',
  '5:innovation|8:wealth': 'Innovator–Magnate',
  // Seal 6
  '6:care|7:contemplation': 'Caregiver–Seer',
  '6:care|8:achievement': 'Caregiver–Achiever',
  '6:care|9:teaching': 'Caregiver–Mentor',
  '2:relationships|6:family': 'Partner–Kinkeeper',
  '6:family|9:contribution': 'Kinkeeper–Giver',
  '6:service|8:command': 'Server–Commander',
  '6:service|9:contribution': 'Server–Giver',
  // Seal 7
  '7:contemplation|8:achievement': 'Seer–Achiever',
  '7:research|8:wealth': 'Scholar–Magnate',
  '7:research|9:teaching': 'Scholar–Mentor',
  '7:consciousness|9:contribution': 'Mystic–Giver',
  '3:voice|7:consciousness': 'Orator–Mystic',
  // Seal 8–9
  '8:achievement|9:contribution': 'Achiever–Giver',
  '8:achievement|9:teaching': 'Achiever–Mentor',
  '8:wealth|9:contribution': 'Magnate–Giver',
  '8:command|9:teaching': 'Commander–Mentor',
  '3:voice|8:command': 'Orator–Commander',
}

/**
 * Deterministic readable dual title when CLASS_BLEND_TABLE has no entry.
 * Templates key off seal archetypes; nouns stay the classNouns.
 */
export function composeBlendTitle(nounA, nounB, sealA, sealB) {
  const a = String(nounA || 'Path')
  const b = String(nounB || 'Path')
  const sa = Number(sealA) || 0
  const sb = Number(sealB) || 0
  let first = a
  let second = b
  let archLo = SEAL_ARCH[sa] || 'path'
  let archHi = SEAL_ARCH[sb] || 'path'
  if (sa > sb || (sa === sb && a.localeCompare(b) > 0)) {
    first = b
    second = a
    archLo = SEAL_ARCH[sb] || 'path'
    archHi = SEAL_ARCH[sa] || 'path'
  }
  const pair = [archLo, archHi].sort().join('|')
  switch (pair) {
    case 'bond|care':
      return `${first} Heart`
    case 'sight|voice':
      return `${first} Vision`
    case 'action|power':
      return `${first} Force`
    case 'craft|power':
      return `${first} Forge`
    case 'gift|sight':
      return `${first} Wisdom`
    case 'motion|sight':
      return `${first} Scout`
    case 'action|gift':
      return `${first} Legacy`
    case 'care|gift':
      return `${first} Grace`
    case 'power|voice':
      return `${first} Voice`
    default:
      if (archLo === archHi) return `${first} & ${second}`
      return `${first}\u2013${second}`
  }
}

function emptyLoadout() {
  return {
    slots: [null, null],
    titleOverride: null,
    updatedAt: 0,
    userChosen: false,
    lastRespecAt: 0,
  }
}

function slotKey(slot) {
  if (!slot?.number || !slot?.routeId) return null
  return `${Number(slot.number)}:${slot.routeId}`
}

function normalizeLoadout(raw) {
  const base = emptyLoadout()
  if (!raw || typeof raw !== 'object') return base
  const slots = Array.isArray(raw.slots) ? [...raw.slots] : [null, null]
  while (slots.length < MAX_LOADOUT_SLOTS) slots.push(null)
  const cleaned = slots.slice(0, MAX_LOADOUT_SLOTS).map((s) => {
    if (!s || typeof s !== 'object') return null
    const number = Number(s.number)
    const routeId = String(s.routeId || '')
    if (!number || !routeId || !getRouteDef(number, routeId)) return null
    return { number, routeId }
  })
  return {
    slots: cleaned,
    titleOverride: typeof raw.titleOverride === 'string' ? raw.titleOverride : null,
    updatedAt: Number(raw.updatedAt) || 0,
    userChosen: !!raw.userChosen,
    lastRespecAt: Number(raw.lastRespecAt) || 0,
  }
}

export function loadClassLoadout() {
  try {
    const raw = localStorage.getItem(CLASS_LOADOUT_LS_KEY)
    if (raw) return normalizeLoadout(JSON.parse(raw))
  } catch { /* ignore */ }
  return emptyLoadout()
}

export function saveClassLoadout(loadout) {
  const next = normalizeLoadout({ ...loadout, updatedAt: Date.now() })
  try {
    localStorage.setItem(CLASS_LOADOUT_LS_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
  try {
    window.NativeAuth?.saveClassLoadout?.(JSON.stringify(next))
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('scl:class_loadout_updated', { detail: next }))
  return next
}

/**
 * Unique seal roots from the player's full blueprint chart.
 * Freq unlock gates do NOT apply here — class pick uses every destiny number on the chart.
 */
export function getEligibleSeals(playerData, _freqLevel = 1) {
  const seals = new Set()
  if (!playerData) return seals
  for (const key of BLUEPRINT_NODES) {
    const node = playerData[key]
    if (!node?.root && node?.root !== 0) continue
    const mapped = mapSealRoot(node.root)
    if (mapped) seals.add(mapped)
  }
  return seals
}

export function isSealEligible(number, playerData, freqLevel = 1) {
  return getEligibleSeals(playerData, freqLevel).has(Number(number))
}

export function getFilledSlots(loadout = loadClassLoadout()) {
  return (loadout.slots || []).filter(Boolean)
}

export function getEquippedRouteId(number, loadout = loadClassLoadout()) {
  const n = Number(number)
  const hit = getFilledSlots(loadout).find((s) => s.number === n)
  return hit?.routeId || null
}

export function isRouteEquipped(number, routeId, loadout = loadClassLoadout()) {
  return getFilledSlots(loadout).some(
    (s) => s.number === Number(number) && s.routeId === routeId,
  )
}

export function findLoadoutSlotIndex(number, routeId, loadout = loadClassLoadout()) {
  return (loadout.slots || []).findIndex(
    (s) => s && s.number === Number(number) && s.routeId === routeId,
  )
}

export function getClassNoun(number, routeId) {
  const route = getRouteDef(number, routeId)
  return route?.classNoun || route?.name || 'Path'
}

export function getBlendTitle(slotA, slotB) {
  const a = slotKey(slotA)
  const b = slotKey(slotB)
  if (!a || !b) return null
  const key = [a, b].sort().join('|')
  if (CLASS_BLEND_TABLE[key]) return CLASS_BLEND_TABLE[key]
  const nounA = getClassNoun(slotA.number, slotA.routeId)
  const nounB = getClassNoun(slotB.number, slotB.routeId)
  return composeBlendTitle(nounA, nounB, slotA.number, slotB.number)
}

export function getClassTitle(loadout = loadClassLoadout()) {
  if (loadout.titleOverride) return loadout.titleOverride
  const filled = getFilledSlots(loadout)
  if (!filled.length) return 'Unspecialized'
  if (filled.length === 1) return getClassNoun(filled[0].number, filled[0].routeId)
  return getBlendTitle(filled[0], filled[1]) || 'Unspecialized'
}

export function getLoadoutPathChips(loadout = loadClassLoadout()) {
  return getFilledSlots(loadout).map((s) => {
    const num = getNumberDef(s.number)
    const route = getRouteDef(s.number, s.routeId)
    return {
      number: s.number,
      routeId: s.routeId,
      sealLabel: num?.label || String(s.number),
      routeName: route?.name || s.routeId,
      classNoun: route?.classNoun || route?.name,
      color: num?.color || '#c9a84c',
      icon: num?.icon || '\u2726',
    }
  })
}

export function getRespecCooldownRemaining(loadout = loadClassLoadout()) {
  const last = Number(loadout.lastRespecAt) || 0
  if (!last) return 0
  return Math.max(0, RESPEC_COOLDOWN_MS - (Date.now() - last))
}

/**
 * Equip a route into the loadout.
 * @returns {{ ok: boolean, loadout: object, progress?: object, error?: string, needsReplace?: boolean }}
 */
export function equipRoute(number, routeId, {
  playerData = null,
  freqLevel = 1,
  replaceSlotIndex = null,
  loadout = null,
  progress = null,
} = {}) {
  const n = Number(number)
  if (!getRouteDef(n, routeId)) {
    return { ok: false, loadout: loadClassLoadout(), error: 'Unknown path.' }
  }
  if (playerData && !isSealEligible(n, playerData, freqLevel)) {
    return { ok: false, loadout: loadClassLoadout(), error: 'Not in your blueprint.' }
  }

  let nextLoadout = normalizeLoadout(loadout || loadClassLoadout())
  const existingIdx = findLoadoutSlotIndex(n, routeId, nextLoadout)
  if (existingIdx >= 0) {
    return { ok: true, loadout: nextLoadout, already: true }
  }

  // v1: one route per seal in loadout
  const sameSealIdx = nextLoadout.slots.findIndex((s) => s && s.number === n)
  if (sameSealIdx >= 0 && replaceSlotIndex == null) {
    // Replacing same seal's path automatically
    nextLoadout.slots[sameSealIdx] = { number: n, routeId }
  } else {
    const emptyIdx = nextLoadout.slots.findIndex((s) => !s)
    if (emptyIdx >= 0 && replaceSlotIndex == null) {
      nextLoadout.slots[emptyIdx] = { number: n, routeId }
    } else if (replaceSlotIndex != null && replaceSlotIndex >= 0 && replaceSlotIndex < MAX_LOADOUT_SLOTS) {
      nextLoadout.slots[replaceSlotIndex] = { number: n, routeId }
    } else if (emptyIdx < 0) {
      return {
        ok: false,
        loadout: nextLoadout,
        needsReplace: true,
        error: 'Class loadout full — choose a slot to replace.',
      }
    }
  }

  // Ensure route is started in skill progress
  let prog = migrateProgressToV3(progress || loadSkillTreeProgressV3())
  const started = startRoute(prog, n, routeId)
  if (!started.error) {
    prog = started.progress
    saveSkillTreeProgressV3(prog)
    window.dispatchEvent(new CustomEvent('scl:skilltree_updated', { detail: prog }))
  }

  nextLoadout.userChosen = true
  nextLoadout = saveClassLoadout(nextLoadout)
  try { markChecklistItem('class') } catch { /* ignore */ }
  return { ok: true, loadout: nextLoadout, progress: prog }
}

export function unequipSlot(slotIndex, loadout = null) {
  const next = normalizeLoadout(loadout || loadClassLoadout())
  if (slotIndex < 0 || slotIndex >= MAX_LOADOUT_SLOTS) {
    return { ok: false, loadout: next, error: 'Invalid slot.' }
  }
  if (!next.slots[slotIndex]) {
    return { ok: true, loadout: next, already: true }
  }
  const remaining = getRespecCooldownRemaining(next)
  if (remaining > 0) {
    const hoursLeft = Math.max(1, Math.ceil(remaining / (60 * 60 * 1000)))
    return {
      ok: false,
      loadout: next,
      cooldown: true,
      error: `Respec cooldown — ${hoursLeft}h remaining`,
    }
  }
  next.slots[slotIndex] = null
  next.userChosen = true
  next.lastRespecAt = Date.now()
  return { ok: true, loadout: saveClassLoadout(next) }
}

/**
 * One-shot: clear auto-seeded loadouts so the player picks class paths themselves.
 * Does not wipe route progress. Keeps loadouts the player explicitly equipped.
 * @deprecated name kept for call-site compatibility — no longer auto-fills slots.
 */
export function migrateLoadoutFromProgress(_playerData = null, _freqLevel = 1, _progress = null) {
  return clearAutoSeededLoadout()
}

/** Clear loadout slots that were never explicitly chosen by the player. */
export function clearAutoSeededLoadout() {
  const existing = loadClassLoadout()
  if (existing.userChosen) return existing
  if (!getFilledSlots(existing).length) {
    // Persist empty + mark so we don't keep re-checking forever
    if (!existing.updatedAt) {
      return saveClassLoadout({ ...emptyLoadout(), userChosen: false, updatedAt: Date.now() })
    }
    return existing
  }
  // Auto-picked (migration / soft seed) — reset so they choose from all chart numbers
  return saveClassLoadout({
    slots: [null, null],
    titleOverride: null,
    userChosen: false,
    lastRespecAt: existing.lastRespecAt || 0,
  })
}

export function describeSlot(slot) {
  if (!slot) return null
  const num = getNumberDef(slot.number)
  const route = getRouteDef(slot.number, slot.routeId)
  return {
    ...slot,
    sealLabel: num?.label,
    routeName: route?.name,
    classNoun: route?.classNoun,
    color: num?.color,
  }
}
