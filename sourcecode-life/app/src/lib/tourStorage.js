const TOUR_KEY = 'scl_spotlight_tour_v1'

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
