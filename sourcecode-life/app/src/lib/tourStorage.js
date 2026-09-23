const TOUR_KEY = 'scl_spotlight_tour_v1'
const CHECKLIST_DONE_KEY = 'scl_checklist_done'

export function isSpotlightTourComplete() {
  try {
    return localStorage.getItem(TOUR_KEY) === 'done'
  } catch {
    return false
  }
}

export function markSpotlightTourComplete() {
  try {
    localStorage.setItem(TOUR_KEY, 'done')
  } catch { /* ignore */ }
}

export function loadChecklistDone() {
  try {
    const raw = localStorage.getItem(CHECKLIST_DONE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function markChecklistItem(id) {
  try {
    const next = { ...loadChecklistDone(), [id]: true }
    localStorage.setItem(CHECKLIST_DONE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('scl:checklist_updated', { detail: next }))
    return next
  } catch {
    return loadChecklistDone()
  }
}
