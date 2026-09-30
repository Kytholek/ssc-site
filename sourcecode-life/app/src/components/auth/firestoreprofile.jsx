// firestoreprofile.jsx
// Centralized Firestore sync for all user profile data (quests, levels, stats, etc)
import { db } from '../../lib/firebase'
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc, limit } from 'firebase/firestore'

// Path: /players/{characterId}
const getProfileDocRef = (characterId) => doc(db, 'players', characterId)

// Fetch the entire user profile document
export async function fetchUserProfile(characterId) {
  try {
    const ref = getProfileDocRef(characterId)
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : {}
  } catch {
    return {}
  }
}

// Save (merge) the entire user profile document
export async function saveUserProfile(characterId, profileData) {
  const ref = getProfileDocRef(characterId)
  await setDoc(ref, profileData, { merge: true })
}

// Update specific fields in the user profile document
export async function updateUserProfileFields(characterId, fields) {
  const ref = getProfileDocRef(characterId)
  await updateDoc(ref, fields)
}

// Example: update quests
export async function updateUserQuests(characterId, quests) {
  await updateUserProfileFields(characterId, { quests })
}

// Example: update levels
export async function updateUserLevels(characterId, { freqLevel, charLevel }) {
  await updateUserProfileFields(characterId, { freqLevel, charLevel })
}

// Example: update stats
export async function updateUserStats(characterId, stats) {
  await updateUserProfileFields(characterId, { stats })
}

// Avatar helpers
export async function updateUserAvatar(characterId, avatar) {
  await updateUserProfileFields(characterId, { avatar })
}

// Medals helpers
export async function updateUserMedals(characterId, medals) {
  await updateUserProfileFields(characterId, { medals })
}

// Equipment helpers
export async function updateUserEquipment(characterId, equipment) {
  await updateUserProfileFields(characterId, { equipment })
}

// Entitlements helpers
export async function addUserEntitlement(characterId, entitlement) {
  const profile = await fetchUserProfile(characterId)
  const entitlements = profile.entitlements || []
  if (!entitlements.includes(entitlement)) {
    entitlements.push(entitlement)
    await updateUserProfileFields(characterId, { entitlements })
  }
}

export async function removeUserEntitlement(characterId, entitlement) {
  const profile = await fetchUserProfile(characterId)
  const entitlements = (profile.entitlements || []).filter(e => e !== entitlement)
  await updateUserProfileFields(characterId, { entitlements })
}

export async function hasEntitlement(characterId, entitlement) {
  const profile = await fetchUserProfile(characterId)
  const entitlements = profile.entitlements || []
  return entitlements.includes(entitlement)
}

// Fetch specific fields (optional helpers)
export async function fetchUserAvatar(characterId) {
  const profile = await fetchUserProfile(characterId)
  return profile.avatar || null
}

export async function fetchUserMedals(characterId) {
  const profile = await fetchUserProfile(characterId)
  return profile.medals || []
}

export async function fetchUserEquipment(characterId) {
  const profile = await fetchUserProfile(characterId)
  return profile.equipment || null
}

// World map quests (player-generated quests on map - shared across all players)
export async function createWorldQuest(questData) {
  try {
    const creatorReputation = questData.uid
      ? await fetchCreatorReputation(questData.uid)
      : null
    const payload = {
      ...questData,
      ...(creatorReputation ? { creatorReputation } : {}),
      createdAt: new Date(),
    }
    const questsRef = collection(db, 'worldQuests')
    const docRef = await addDoc(questsRef, payload)
    return { id: docRef.id, ...payload }
  } catch (error) {
    console.error('Error creating world quest:', error)
    return null
  }
}

export async function fetchAllWorldQuests(maxCount = 40) {
  try {
    const questsRef = collection(db, 'worldQuests')
    const snapshot = await getDocs(query(questsRef, limit(maxCount)))
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error fetching world quests:', error)
    return []
  }
}

export async function fetchPlayerWorldQuests(playerUid) {
  try {
    const questsRef = collection(db, 'worldQuests')
    const q = query(questsRef, where('uid', '==', playerUid))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error fetching player quests:', error)
    return []
  }
}

// Reputation system (quest creator ratings)
export async function fetchCreatorReputation(uid) {
  try {
    const profile = await fetchUserProfile(uid)
    return profile.reputation ?? { totalRating: 0, ratingCount: 0, completions: 0, noShows: 0 }
  } catch {
    return null
  }
}

export async function submitQuestRating(creatorUid, starRating, completed) {
  try {
    const ref = getProfileDocRef(creatorUid)
    const profile = await fetchUserProfile(creatorUid)
    const rep = profile.reputation || { totalRating: 0, ratingCount: 0, completions: 0, noShows: 0 }

    const updated = {
      ...rep,
      completions: rep.completions + (completed ? 1 : 0),
      noShows: rep.noShows + (completed ? 0 : 1),
    }

    if (starRating > 0) {
      updated.totalRating = rep.totalRating + starRating
      updated.ratingCount = rep.ratingCount + 1
    }

    await setDoc(ref, { reputation: updated }, { merge: true })
  } catch (e) {
    console.error('[SCL] Failed to submit rating:', e)
  }
}

// Taker reputation (seekers rating by quest makers)
export async function fetchTakerReputation(uid) {
  try {
    const profile = await fetchUserProfile(uid)
    return profile.takerReputation || null
  } catch {
    return null
  }
}

export async function submitTakerRating(takerUid, starRating) {
  try {
    const ref = getProfileDocRef(takerUid)
    const profile = await fetchUserProfile(takerUid)
    const takerRep = profile.takerReputation || { totalRating: 0, ratingCount: 0 }

    const updated = {
      ...takerRep,
      totalRating: takerRep.totalRating + starRating,
      ratingCount: takerRep.ratingCount + 1,
    }

    await setDoc(ref, { takerReputation: updated }, { merge: true })
  } catch (e) {
    console.error('[SCL] Failed to submit taker rating:', e)
  }
}

// Pending taker ratings (sub-collection on creator's profile)
export async function writePendingTakerRating(creatorUid, { takerUid, takerName, questId, questName }) {
  try {
    const ref = collection(db, 'players', creatorUid, 'pendingTakerRatings')
    await addDoc(ref, {
      takerUid,
      takerName: takerName || 'Seeker',
      questId,
      questName: questName || 'Quest',
      completedAt: Date.now(),
    })
  } catch (e) {
    console.error('[SCL] Failed to write pending taker rating:', e)
  }
}

export async function fetchPendingTakerRatings(creatorUid) {
  try {
    const ref = collection(db, 'players', creatorUid, 'pendingTakerRatings')
    const snap = await getDocs(ref)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

export async function deletePendingTakerRating(creatorUid, docId) {
  try {
    await deleteDoc(doc(db, 'players', creatorUid, 'pendingTakerRatings', docId))
  } catch (e) {
    console.error('[SCL] Failed to delete pending taker rating:', e)
  }
}
