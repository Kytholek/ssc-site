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

/** One coined role for every legal pair of paths. Key is sorted num:routeId|num:routeId. */
export const CLASS_BLEND_TABLE = {
  '1:entrepreneurship|2:empathy': 'Counsel',
  '1:entrepreneurship|2:relationships': 'Matchmaker',
  '1:entrepreneurship|2:social': 'Promoter',
  '1:entrepreneurship|3:creation': 'Producer',
  '1:entrepreneurship|3:voice': 'Showrunner',
  '1:entrepreneurship|3:writing': 'Publisher',
  '1:entrepreneurship|4:discipline': 'Foreman',
  '1:entrepreneurship|4:organization': 'Builder',
  '1:entrepreneurship|4:systems': 'Foundry',
  '1:entrepreneurship|5:adventure': 'Outrider',
  '1:entrepreneurship|5:exploration': 'Prospector',
  '1:entrepreneurship|5:innovation': 'Catalyst',
  '1:entrepreneurship|6:care': 'Provider',
  '1:entrepreneurship|6:family': 'Housewright',
  '1:entrepreneurship|6:service': 'Contractor',
  '1:entrepreneurship|7:consciousness': 'Futurist',
  '1:entrepreneurship|7:contemplation': 'Visionary',
  '1:entrepreneurship|7:research': 'Analyst',
  '1:entrepreneurship|8:achievement': 'Tycoon',
  '1:entrepreneurship|8:command': 'Executive',
  '1:entrepreneurship|8:wealth': 'Venturer',
  '1:entrepreneurship|9:contribution': 'Philanthropist',
  '1:entrepreneurship|9:creation': 'Impresario',
  '1:entrepreneurship|9:teaching': 'Dean',
  '1:leadership|2:empathy': 'Anchor',
  '1:leadership|2:relationships': 'Consort',
  '1:leadership|2:social': 'Standard',
  '1:leadership|3:creation': 'Director',
  '1:leadership|3:voice': 'Tribune',
  '1:leadership|3:writing': 'Author',
  '1:leadership|4:discipline': 'Warden',
  '1:leadership|4:organization': 'Marshal',
  '1:leadership|4:systems': 'Regulator',
  '1:leadership|5:adventure': 'Vanguard',
  '1:leadership|5:exploration': 'Pioneer',
  '1:leadership|5:innovation': 'Trailblazer',
  '1:leadership|6:care': 'Guardian',
  '1:leadership|6:family': 'Householder',
  '1:leadership|6:service': 'Steward',
  '1:leadership|7:consciousness': 'Oracle',
  '1:leadership|7:contemplation': 'Sage',
  '1:leadership|7:research': 'Strategist',
  '1:leadership|8:achievement': 'Sovereign',
  '1:leadership|8:command': 'General',
  '1:leadership|8:wealth': 'Dynast',
  '1:leadership|9:contribution': 'Legacy',
  '1:leadership|9:creation': 'Principal',
  '1:leadership|9:teaching': 'Provost',
  '1:physical|2:empathy': 'Soother',
  '1:physical|2:relationships': 'Teammate',
  '1:physical|2:social': 'Playmaker',
  '1:physical|3:creation': 'Shaper',
  '1:physical|3:voice': 'Coach',
  '1:physical|3:writing': 'Biographer',
  '1:physical|4:discipline': 'Driller',
  '1:physical|4:organization': 'Trainer',
  '1:physical|4:systems': 'Mechanic',
  '1:physical|5:adventure': 'Wanderer',
  '1:physical|5:exploration': 'Ranger',
  '1:physical|5:innovation': 'Tinkerer',
  '1:physical|6:care': 'Medic',
  '1:physical|6:family': 'Protector',
  '1:physical|6:service': 'Sentinel',
  '1:physical|7:consciousness': 'Adept',
  '1:physical|7:contemplation': 'Monk',
  '1:physical|7:research': 'Observer',
  '1:physical|8:achievement': 'Victor',
  '1:physical|8:command': 'Captain',
  '1:physical|8:wealth': 'Earner',
  '1:physical|9:contribution': 'Rescuer',
  '1:physical|9:creation': 'Artificer',
  '1:physical|9:teaching': 'Tutor',
  '2:empathy|3:creation': 'Attuner',
  '2:empathy|3:voice': 'Listener',
  '2:empathy|3:writing': 'Diarist',
  '2:empathy|4:discipline': 'Steadyheart',
  '2:empathy|4:organization': 'Orderly',
  '2:empathy|4:systems': 'Harmonist',
  '2:empathy|5:adventure': 'Kindred',
  '2:empathy|5:exploration': 'Witness',
  '2:empathy|5:innovation': 'Kindler',
  '2:empathy|6:care': 'Nurse',
  '2:empathy|6:family': 'Nurturer',
  '2:empathy|6:service': 'Samaritan',
  '2:empathy|7:consciousness': 'Medium',
  '2:empathy|7:contemplation': 'Confessor',
  '2:empathy|7:research': 'Interpreter',
  '2:empathy|8:achievement': 'Supporter',
  '2:empathy|8:command': 'Adjutant',
  '2:empathy|8:wealth': 'Donor',
  '2:empathy|9:contribution': 'Altruist',
  '2:empathy|9:creation': 'Healer',
  '2:empathy|9:teaching': 'Counselor',
  '2:relationships|3:creation': 'Muse',
  '2:relationships|3:voice': 'Charmer',
  '2:relationships|3:writing': 'Correspondent',
  '2:relationships|4:discipline': 'Oathmate',
  '2:relationships|4:organization': 'Hearthmate',
  '2:relationships|4:systems': 'Mediator',
  '2:relationships|5:adventure': 'Comrade',
  '2:relationships|5:exploration': 'Companion',
  '2:relationships|5:innovation': 'Spark',
  '2:relationships|6:care': 'Beloved',
  '2:relationships|6:family': 'Lifemate',
  '2:relationships|6:service': 'Attendant',
  '2:relationships|7:consciousness': 'Twinflame',
  '2:relationships|7:contemplation': 'Soulmate',
  '2:relationships|7:research': 'Bondreader',
  '2:relationships|8:achievement': 'Ally',
  '2:relationships|8:command': 'Lieutenant',
  '2:relationships|8:wealth': 'Benefactor',
  '2:relationships|9:contribution': 'Devotee',
  '2:relationships|9:creation': 'Collaborator',
  '2:relationships|9:teaching': 'Guide',
  '2:social|3:creation': 'Curator',
  '2:social|3:voice': 'Host',
  '2:social|3:writing': 'Columnist',
  '2:social|4:discipline': 'Stalwart',
  '2:social|4:organization': 'Convener',
  '2:social|4:systems': 'Networker',
  '2:social|5:adventure': 'Rover',
  '2:social|5:exploration': 'Scout',
  '2:social|5:innovation': 'Mixer',
  '2:social|6:care': 'Keeper',
  '2:social|6:family': 'Kinfolk',
  '2:social|6:service': 'Usher',
  '2:social|7:consciousness': 'Channel',
  '2:social|7:contemplation': 'Confidant',
  '2:social|7:research': 'Profiler',
  '2:social|8:achievement': 'Champion',
  '2:social|8:command': 'Envoy',
  '2:social|8:wealth': 'Patron',
  '2:social|9:contribution': 'Humanitarian',
  '2:social|9:creation': 'Exhibitor',
  '2:social|9:teaching': 'Docent',
  '3:creation|4:discipline': 'Crafter',
  '3:creation|4:organization': 'Designer',
  '3:creation|4:systems': 'Fabricator',
  '3:creation|5:adventure': 'Experimenter',
  '3:creation|5:exploration': 'Voyager',
  '3:creation|5:innovation': 'Inventor',
  '3:creation|6:care': 'Mender',
  '3:creation|6:family': 'Heirloom',
  '3:creation|6:service': 'Fixer',
  '3:creation|7:consciousness': 'Luminary',
  '3:creation|7:contemplation': 'Dreamer',
  '3:creation|7:research': 'Prototyper',
  '3:creation|8:achievement': 'Virtuoso',
  '3:creation|8:command': 'Maestro',
  '3:creation|8:wealth': 'Collector',
  '3:creation|9:contribution': 'Offering',
  '3:creation|9:creation': 'Atelier',
  '3:creation|9:teaching': 'Demonstrator',
  '3:voice|4:discipline': 'Rhetor',
  '3:voice|4:organization': 'Editor',
  '3:voice|4:systems': 'Broadcaster',
  '3:voice|5:adventure': 'Bard',
  '3:voice|5:exploration': 'Storyteller',
  '3:voice|5:innovation': 'Improviser',
  '3:voice|6:care': 'Comforter',
  '3:voice|6:family': 'Storykeeper',
  '3:voice|6:service': 'Crier',
  '3:voice|7:consciousness': 'Illuminator',
  '3:voice|7:contemplation': 'Prophet',
  '3:voice|7:research': 'Lecturer',
  '3:voice|8:achievement': 'Laureate',
  '3:voice|8:command': 'Herald',
  '3:voice|8:wealth': 'Auctioneer',
  '3:voice|9:contribution': 'Advocate',
  '3:voice|9:creation': 'Performer',
  '3:voice|9:teaching': 'Professor',
  '3:writing|4:discipline': 'Copyist',
  '3:writing|4:organization': 'Draftsman',
  '3:writing|4:systems': 'Codifier',
  '3:writing|5:adventure': 'Dispatch',
  '3:writing|5:exploration': 'Journalist',
  '3:writing|5:innovation': 'Wordsmith',
  '3:writing|6:care': 'Epistler',
  '3:writing|6:family': 'Genealogist',
  '3:writing|6:service': 'Clerk',
  '3:writing|7:consciousness': 'Diviner',
  '3:writing|7:contemplation': 'Poet',
  '3:writing|7:research': 'Chronicler',
  '3:writing|8:achievement': 'Essayist',
  '3:writing|8:command': 'Proclaimer',
  '3:writing|8:wealth': 'Penman',
  '3:writing|9:contribution': 'Testament',
  '3:writing|9:creation': 'Calligrapher',
  '3:writing|9:teaching': 'Pedagogue',
  '4:discipline|5:adventure': 'Endurer',
  '4:discipline|5:exploration': 'Pathfinder',
  '4:discipline|5:innovation': 'Iterator',
  '4:discipline|6:care': 'Vigil',
  '4:discipline|6:family': 'Ritualist',
  '4:discipline|6:service': 'Servant',
  '4:discipline|7:consciousness': 'Acolyte',
  '4:discipline|7:contemplation': 'Ascetic',
  '4:discipline|7:research': 'Student',
  '4:discipline|8:achievement': 'Exemplar',
  '4:discipline|8:command': 'Drillmaster',
  '4:discipline|8:wealth': 'Accountant',
  '4:discipline|9:contribution': 'Vowkeeper',
  '4:discipline|9:creation': 'Apprentice',
  '4:discipline|9:teaching': 'Preceptor',
  '4:organization|5:adventure': 'Quartermaster',
  '4:organization|5:exploration': 'Cartographer',
  '4:organization|5:innovation': 'Blueprinter',
  '4:organization|6:care': 'Housekeeper',
  '4:organization|6:family': 'Kinarch',
  '4:organization|6:service': 'Logistician',
  '4:organization|7:consciousness': 'Taxonomist',
  '4:organization|7:contemplation': 'Archivist',
  '4:organization|7:research': 'Librarian',
  '4:organization|8:achievement': 'Finisher',
  '4:organization|8:command': 'Chief',
  '4:organization|8:wealth': 'Treasurer',
  '4:organization|9:contribution': 'Almoner',
  '4:organization|9:creation': 'Workshop',
  '4:organization|9:teaching': 'Curriculum',
  '4:systems|5:adventure': 'Rigger',
  '4:systems|5:exploration': 'Surveyor',
  '4:systems|5:innovation': 'Machinist',
  '4:systems|6:care': 'Protocol',
  '4:systems|6:family': 'Lineage',
  '4:systems|6:service': 'Dispatcher',
  '4:systems|7:consciousness': 'Modeler',
  '4:systems|7:contemplation': 'Theorist',
  '4:systems|7:research': 'Scientist',
  '4:systems|8:achievement': 'Optimizer',
  '4:systems|8:command': 'Controller',
  '4:systems|8:wealth': 'Banker',
  '4:systems|9:contribution': 'Framework',
  '4:systems|9:creation': 'Blueprint',
  '4:systems|9:teaching': 'Syllabus',
  '5:adventure|6:care': 'Hero',
  '5:adventure|6:family': 'Returner',
  '5:adventure|6:service': 'Errant',
  '5:adventure|7:consciousness': 'Awakener',
  '5:adventure|7:contemplation': 'Quester',
  '5:adventure|7:research': 'Prover',
  '5:adventure|8:achievement': 'Daredevil',
  '5:adventure|8:command': 'Chieftain',
  '5:adventure|8:wealth': 'Fortune',
  '5:adventure|9:contribution': 'Valiant',
  '5:adventure|9:creation': 'Troubadour',
  '5:adventure|9:teaching': 'Raconteur',
  '5:exploration|6:care': 'Escort',
  '5:exploration|6:family': 'Homeseeker',
  '5:exploration|6:service': 'Courier',
  '5:exploration|7:consciousness': 'Seeker',
  '5:exploration|7:contemplation': 'Pilgrim',
  '5:exploration|7:research': 'Field Scholar',
  '5:exploration|8:achievement': 'Discoverer',
  '5:exploration|8:command': 'Expedition',
  '5:exploration|8:wealth': 'Trader',
  '5:exploration|9:contribution': 'Bearer',
  '5:exploration|9:creation': 'Mapmaker',
  '5:exploration|9:teaching': 'Lorekeeper',
  '5:innovation|6:care': 'Remedy',
  '5:innovation|6:family': 'Hearthwright',
  '5:innovation|6:service': 'Reformer',
  '5:innovation|7:consciousness': 'Imagineer',
  '5:innovation|7:contemplation': 'Ideator',
  '5:innovation|7:research': 'Tester',
  '5:innovation|8:achievement': 'Breakthrough',
  '5:innovation|8:command': 'Disruptor',
  '5:innovation|8:wealth': 'Speculator',
  '5:innovation|9:contribution': 'Boonsmith',
  '5:innovation|9:creation': 'Prototype',
  '5:innovation|9:teaching': 'Explainer',
  '6:care|7:consciousness': 'Tender',
  '6:care|7:contemplation': 'Chaplain',
  '6:care|7:research': 'Diagnostician',
  '6:care|8:achievement': 'Matron',
  '6:care|8:command': 'Charge',
  '6:care|8:wealth': 'Endower',
  '6:care|9:contribution': 'Mercy',
  '6:care|9:creation': 'Quiltmaker',
  '6:care|9:teaching': 'Shepherd',
  '6:family|7:consciousness': 'Ancestor',
  '6:family|7:contemplation': 'Elder',
  '6:family|7:research': 'Annalist',
  '6:family|8:achievement': 'Heir',
  '6:family|8:command': 'Housechief',
  '6:family|8:wealth': 'Estate',
  '6:family|9:contribution': 'Bloodline',
  '6:family|9:creation': 'Keepsake',
  '6:family|9:teaching': 'Griot',
  '6:service|7:consciousness': 'Minister',
  '6:service|7:contemplation': 'Novice',
  '6:service|7:research': 'Registrar',
  '6:service|8:achievement': 'Yeoman',
  '6:service|8:command': 'Aide',
  '6:service|8:wealth': 'Retainer',
  '6:service|9:contribution': 'Volunteer',
  '6:service|9:creation': 'Restorer',
  '6:service|9:teaching': 'Instructor',
  '7:consciousness|8:achievement': 'Enlightened',
  '7:consciousness|8:command': 'Hierophant',
  '7:consciousness|8:wealth': 'Augur',
  '7:consciousness|9:contribution': 'Benediction',
  '7:consciousness|9:creation': 'Icon',
  '7:consciousness|9:teaching': 'Revealer',
  '7:contemplation|8:achievement': 'Philosopher',
  '7:contemplation|8:command': 'Vizier',
  '7:contemplation|8:wealth': 'Hermit',
  '7:contemplation|9:contribution': 'Blessing',
  '7:contemplation|9:creation': 'Imagist',
  '7:contemplation|9:teaching': 'Guru',
  '7:research|8:achievement': 'Expert',
  '7:research|8:command': 'Advisor',
  '7:research|8:wealth': 'Appraiser',
  '7:research|9:contribution': 'Recorder',
  '7:research|9:creation': 'Documentarian',
  '7:research|9:teaching': 'Don',
  '8:achievement|9:contribution': 'Honoree',
  '8:achievement|9:creation': 'Masterwork',
  '8:achievement|9:teaching': 'Master',
  '8:command|9:contribution': 'Edict',
  '8:command|9:creation': 'Banner',
  '8:command|9:teaching': 'Prefect',
  '8:wealth|9:contribution': 'Grantor',
  '8:wealth|9:creation': 'Maecenas',
  '8:wealth|9:teaching': 'Sponsor',
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

/**
 * Premium: set or clear a custom class title.
 * @returns {{ ok: boolean, loadout: object, error?: string }}
 */
export function setClassTitleOverride(title, loadout = null) {
  const next = normalizeLoadout(loadout || loadClassLoadout())
  const trimmed = typeof title === 'string' ? title.trim() : ''
  if (!trimmed) {
    next.titleOverride = null
    return { ok: true, loadout: saveClassLoadout(next) }
  }
  if (trimmed.length < 2) {
    return { ok: false, loadout: next, error: 'Title needs at least 2 characters.' }
  }
  if (trimmed.length > 32) {
    return { ok: false, loadout: next, error: 'Title max 32 characters.' }
  }
  next.titleOverride = trimmed
  next.userChosen = true
  return { ok: true, loadout: saveClassLoadout(next) }
}

export function clearClassTitleOverride(loadout = null) {
  return setClassTitleOverride('', loadout)
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

  // Ensure route is started in skill progress before the loadout points at it.
  let prog = migrateProgressToV3(progress || loadSkillTreeProgressV3())
  const started = startRoute(prog, n, routeId)
  if (started.error) {
    return { ok: false, loadout: loadClassLoadout(), error: started.error }
  }
  prog = started.progress

  const changesFilledSlot = sameSealIdx >= 0 || replaceSlotIndex != null
  if (changesFilledSlot) {
    const remaining = getRespecCooldownRemaining(nextLoadout)
    if (remaining > 0) {
      const hoursLeft = Math.max(1, Math.ceil(remaining / (60 * 60 * 1000)))
      return {
        ok: false,
        loadout: loadClassLoadout(),
        cooldown: true,
        error: `Respec cooldown — ${hoursLeft}h remaining`,
      }
    }
    nextLoadout.lastRespecAt = Date.now()
  }

  saveSkillTreeProgressV3(prog)
  window.dispatchEvent(new CustomEvent('scl:skilltree_updated', { detail: prog }))

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
