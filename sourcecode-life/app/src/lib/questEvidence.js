/**
 * Quest evidence — how a quest is allowed to complete.
 * journal is the default so older quests keep the 30-character carve.
 * Rewards still go through completeGeneratedQuest / completeSideQuest.
 */

export const EVIDENCE = {
  JOURNAL: 'journal',
  PIECE: 'piece',
  LOCATION: 'location',
  SESSION: 'session',
  HONOR: 'honor',
}

export const JOURNAL_MIN_CHARS = 30
export const DEFAULT_LOCATION_RADIUS_M = 150
export const DEFAULT_PIECE_WORDS = 300
export const DEFAULT_SESSION_MINUTES = 20
const LS_WRITING = 'scl_writing_pieces'

export function wordCount(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

const DRAFT_PREFIX = 'scl_quest_draft_'

export function loadQuestDraft(questId) {
  if (!questId) return ''
  try { return localStorage.getItem(DRAFT_PREFIX + questId) || '' } catch { return '' }
}

export function saveQuestDraft(questId, text) {
  if (!questId) return
  try {
    const value = text || ''
    if (!value) localStorage.removeItem(DRAFT_PREFIX + questId)
    else localStorage.setItem(DRAFT_PREFIX + questId, value)
  } catch { /* ignore */ }
}

export function clearQuestDraft(questId) {
  if (!questId) return
  try { localStorage.removeItem(DRAFT_PREFIX + questId) } catch { /* ignore */ }
}

export function evidenceForSkillQuest({ routeId, questText } = {}) {
  const text = questText || ''
  if (routeId === 'writing') {
    const words = text.match(/(\d+)\s+words?/i)
    let wordTarget = DEFAULT_PIECE_WORDS
    if (words) wordTarget = Math.max(40, parseInt(words[1], 10))
    else if (!/\b(write|publish|draft|journal|essay|story)\b/i.test(text)) wordTarget = 80
    return { kind: EVIDENCE.PIECE, wordTarget }
  }

  if (routeId === 'physical') {
    const mins = text.match(/(\d+)\s+(?:straight\s+)?minutes?/i)
    const minutes = mins ? Math.max(1, parseInt(mins[1], 10)) : DEFAULT_SESSION_MINUTES
    return { kind: EVIDENCE.SESSION, minutes }
  }

  const words = text.match(/(\d+)\s+words?/i)
  if (words) return { kind: EVIDENCE.PIECE, wordTarget: Math.max(40, parseInt(words[1], 10)) }

  const mins = text.match(/(\d+)\s+(?:straight\s+)?minutes?/i)
  if (mins && /\b(walk|train|stretch|move|workout|session)\b/i.test(text)) {
    return { kind: EVIDENCE.SESSION, minutes: Math.max(1, parseInt(mins[1], 10)) }
  }

  return { kind: EVIDENCE.JOURNAL, minChars: JOURNAL_MIN_CHARS }
}

/** New map markers. Existing markers without this field stay honor-system. */
export function evidenceForMapType(type, radiusM = DEFAULT_LOCATION_RADIUS_M) {
  if (type === 'exploration') {
    return { kind: EVIDENCE.LOCATION, radiusM: radiusM || DEFAULT_LOCATION_RADIUS_M }
  }
  if (type === 'reflection') return { kind: EVIDENCE.JOURNAL, minChars: JOURNAL_MIN_CHARS }
  if (type === 'creation') return { kind: EVIDENCE.PIECE, wordTarget: 100 }
  return { kind: EVIDENCE.HONOR }
}

export function evidenceForQuest(quest) {
  if (quest?.evidence?.kind) return quest.evidence
  if (quest?.source === 'skill' || quest?.type === 'skilltree') {
    return evidenceForSkillQuest({
      routeId: quest.routeId,
      questText: quest.title,
      stage: quest.stage,
    })
  }
  return { kind: EVIDENCE.JOURNAL, minChars: JOURNAL_MIN_CHARS }
}

export function evidenceSummary(evidence) {
  if (!evidence?.kind || evidence.kind === EVIDENCE.HONOR) return 'Mark complete'
  if (evidence.kind === EVIDENCE.LOCATION) return `Check in within ${evidence.radiusM || DEFAULT_LOCATION_RADIUS_M} m`
  if (evidence.kind === EVIDENCE.JOURNAL) return `Note of ${evidence.minChars || JOURNAL_MIN_CHARS}+ characters`
  if (evidence.kind === EVIDENCE.PIECE) return `${evidence.wordTarget || DEFAULT_PIECE_WORDS} words`
  if (evidence.kind === EVIDENCE.SESSION) return `${evidence.minutes || DEFAULT_SESSION_MINUTES}-minute session`
  return 'Mark complete'
}

/**
 * @returns {{ ok: boolean, error?: string, text?: string }}
 */
export function validateQuestEvidence(evidence, payload = {}) {
  const kind = evidence?.kind || EVIDENCE.JOURNAL
  const text = (payload.text || '').trim()

  if (kind === EVIDENCE.HONOR) return { ok: true, text }

  if (kind === EVIDENCE.JOURNAL) {
    const min = evidence.minChars || JOURNAL_MIN_CHARS
    if (text.length < min) {
      return { ok: false, error: `Write at least ${min} characters (${text.length}/${min})` }
    }
    return { ok: true, text }
  }

  if (kind === EVIDENCE.PIECE) {
    const target = evidence.wordTarget || DEFAULT_PIECE_WORDS
    const words = wordCount(text)
    if (words < target) {
      return { ok: false, error: `Need ${target} words (${words}/${target})` }
    }
    return { ok: true, text }
  }

  if (kind === EVIDENCE.SESSION) {
    if (!payload.sessionComplete) {
      return { ok: false, error: 'Finish the session timer first' }
    }
    return { ok: true, text }
  }

  if (kind === EVIDENCE.LOCATION) {
    if (!payload.verified) {
      return { ok: false, error: 'Check in at the quest location' }
    }
    return { ok: true, text }
  }

  return { ok: true, text }
}

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function readDevicePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available on this device'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    )
  })
}

export function saveWritingPiece({ questId, title, text, routeId }) {
  try {
    const store = JSON.parse(localStorage.getItem(LS_WRITING) || '[]')
    const entry = {
      id: questId,
      title: title || 'Writing piece',
      text: (text || '').trim(),
      words: wordCount(text),
      routeId: routeId || 'writing',
      savedAt: Date.now(),
    }
    const next = [entry, ...store.filter((p) => p && p.id !== questId)].slice(0, 40)
    localStorage.setItem(LS_WRITING, JSON.stringify(next))
    return entry
  } catch {
    return null
  }
}

export function loadWritingPieces() {
  try {
    const store = JSON.parse(localStorage.getItem(LS_WRITING) || '[]')
    return Array.isArray(store) ? store : []
  } catch {
    return []
  }
}
