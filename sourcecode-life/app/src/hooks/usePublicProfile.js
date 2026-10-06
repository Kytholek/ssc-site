import { useEffect, useState } from 'react'
import { loadPublicProfile } from '../lib/publicProfile'

export function usePublicProfile(seed) {
  const uid = seed?.uid || ''
  const [loaded, setLoaded] = useState(null)

  useEffect(() => {
    if (!uid) return undefined
    let cancelled = false
    loadPublicProfile(uid, seed || {}).then((next) => {
      if (!cancelled) setLoaded({ uid, profile: next })
    })
    return () => { cancelled = true }
    // Reload when the seeker changes. The seed object is only the first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const fresh = loaded?.uid === uid ? loaded.profile : null
  const profile = { ...(seed || {}), ...(fresh || {}) }
  return { profile: { ...profile, avatarLoading: Boolean(uid) && !fresh }, loading: Boolean(uid) && !fresh }
}
