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

/** Authored dual-class blends keyed by sorted "num:routeId|num:routeId" */
export const CLASS_BLEND_TABLE = {
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
}

function emptyLoadout() {
  return {
    slots: [null, null],
    titleOverride: null,
    updatedAt: 0,
    userChosen: false,
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
  return `${nounA}\u2013${nounB}`
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
  next.slots[slotIndex] = null
  next.userChosen = true
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
