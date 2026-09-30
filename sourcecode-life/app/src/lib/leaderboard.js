import { db } from './firebase'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'

export async function fetchLeaderboard() {
  try {
    const ranked = query(collection(db, 'players'), orderBy('simScore', 'desc'), limit(10))
    const snap = await getDocs(ranked)

    return snap.docs
      .map(d => {
        const data = d.data()
        return {
          uid: d.id,
          name: data.name || 'Unknown Seeker',
          cl: data.cl?.root || '?',
          lp: data.lp?.root || '?',
          ex: data.ex?.root || '?',
          isPremium: Array.isArray(data.entitlements)
            ? data.entitlements.some(e => e === 'premium_lifetime' || /^premium_\d+d:/.test(e))
            : !!data.isPremium,
          totalScore: Number(data.simScore) || 0,
        }
      })
      .filter(p => p.uid && p.uid !== 'system')
      .map((p, i) => ({ ...p, rank: i + 1 }))
  } catch (e) {
    console.error('[SCL] Failed to fetch leaderboard:', e)
    return []
  }
}
