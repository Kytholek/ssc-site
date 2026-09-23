import { db } from './firebase'
import { collection, getDocs } from 'firebase/firestore'
import { fetchCreatorReputation, fetchTakerReputation } from '../components/auth/firestoreprofile'

export async function fetchLeaderboard() {
  try {
    const ref = collection(db, 'players')
    const snap = await getDocs(ref)

    const players = snap.docs
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
          reputation: data.reputation,
          takerReputation: data.takerReputation,
        }
      })
      .filter(p => p.uid && p.uid !== 'system')

    // Score: (creator quests made + completed) * 10 + (seeker ratings count)
    // This weights creators heavily since making/completing quests is the primary activity
    const scored = players.map(p => {
      const creatorScore = (p.reputation?.ratingCount || 0) * 10
      const seekerScore = p.takerReputation?.ratingCount || 0
      const totalScore = creatorScore + seekerScore

      return {
        ...p,
        creatorScore,
        seekerScore,
        totalScore,
      }
    })

    // Sort by totalScore descending, then by name for tiebreaker
    scored.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      return (a.name || '').localeCompare(b.name || '')
    })

    // Add rank
    return scored.map((p, i) => ({ ...p, rank: i + 1 }))
  } catch (e) {
    console.error('[SCL] Failed to fetch leaderboard:', e)
    return []
  }
}
