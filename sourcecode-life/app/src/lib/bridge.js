/**
 * bridge.js â€” Web Firebase bridge for Source Code: Life
 *
 * Implements window.NativeAuth, window.NativeMap, window.NativeAllies,
 * window.NativeLeaderboard, and window.NativeNotif using the Firebase v9
 * modular SDK, mirroring the Kotlin WebView bridge interface exactly so that
 * all existing window.NativeAuth.* call-sites work without modification.
 *
 * Import this module once at the app entry point (main.jsx) â€” it attaches
 * all five objects to window as a side effect.
 */

// ── Web detection flag: true in browser, undefined in Android WebView ───────
window.__SCL_WEB = true

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore'

import { auth, db } from './firebase'

// â”€â”€ Local storage helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LS_MAP_QUESTS = 'scl_map_quests'
const LS_GEO_PROMPT = 'scl_geo_prompt'
const LS_XP         = 'scl_xp'
const LS_FS_BLOCKED = 'scl_firestore_blocked'

function _save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* intentional */ } }
function _load(key)      { try { return JSON.parse(localStorage.getItem(key))   } catch { return null } }

let _firestoreBlocked = (() => {
  try { return localStorage.getItem(LS_FS_BLOCKED) === 'true' } catch { return false }
})()

function _markFirestoreBlocked(err) {
  _firestoreBlocked = true
  try { localStorage.setItem(LS_FS_BLOCKED, 'true') } catch { /* intentional */ }
  try { console.warn('[SCL] Firestore blocked by client; switching to local-only mode.', err?.message || err) } catch { /* intentional */ }
}

function _looksBlockedByClient(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  const code = String(err?.code || '').toLowerCase()
  return (
    msg.includes('err_blocked_by_client') ||
    msg.includes('blocked by client') ||
    msg.includes('failed to fetch') ||
    code.includes('network-request-failed') ||
    code.includes('unavailable')
  )
}

function _withFirestore(op, fallback) {
  if (_firestoreBlocked) {
    if (typeof fallback === 'function') return Promise.resolve(fallback())
    return Promise.resolve(null)
  }
  return Promise.resolve()
    .then(op)
    .catch(err => {
      if (_looksBlockedByClient(err)) {
        _markFirestoreBlocked(err)
        if (typeof fallback === 'function') return fallback(err)
        return null
      }
      throw err
    })
}

// â”€â”€ Friendly Firebase error messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _friendly(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':    return 'Incorrect email or password.'
    case 'auth/email-already-in-use':  return 'An account with that email already exists.'
    case 'auth/weak-password':         return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':         return 'Please enter a valid email address.'
    case 'auth/too-many-requests':     return 'Too many attempts. Please try again later.'
    case 'auth/network-request-failed': return 'Network error. Check your connection.'
    case 'auth/requires-recent-login': return 'Please sign in again before doing this.'
    default: return code || 'Something went wrong. Please try again.'
  }
}

// â”€â”€ NativeAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.NativeAuth = {

  checkSession() {
    const unsub = onAuthStateChanged(auth, user => {
      unsub()
      if (user) {
        setTimeout(() => window.NativeAuth_onSessionResult?.(true, user.uid), 0)
      } else {
        setTimeout(() => window.NativeAuth_onSessionResult?.(false, ''), 0)
      }
    })
  },

  login(email, password) {
    signInWithEmailAndPassword(auth, email.trim(), password)
      .then(r  => window.NativeAuth_onLoginResult?.(true, r.user.uid, ''))
      .catch(e => window.NativeAuth_onLoginResult?.(false, '', _friendly(e.code)))
  },

  register(email, password) {
    const norm = email.trim().toLowerCase()
    createUserWithEmailAndPassword(auth, norm, password)
      .then(r => {
        const uid = r.user.uid
        _withFirestore(
          () => setDoc(doc(db, 'players', uid), { email: norm, created: Date.now() }, { merge: true }),
          () => null
        ).catch(() => {})
        window.NativeAuth_onRegisterResult?.(true, uid, '')
      })
      .catch(e => window.NativeAuth_onRegisterResult?.(false, '', _friendly(e.code)))
  },

  sendPasswordReset(email) {
    sendPasswordResetEmail(auth, email.trim())
      .then(() => window.NativeAuth_onPasswordResetResult?.(true, ''))
      .catch(e  => window.NativeAuth_onPasswordResetResult?.(false, _friendly(e.code)))
  },

  changePassword(current, newPw) {
    const user = auth.currentUser
    if (!user || !user.email) { window.NativeAuth_onChangePasswordResult?.(false, 'Not signed in.'); return }
    const credential = EmailAuthProvider.credential(user.email, current)
    reauthenticateWithCredential(user, credential)
      .then(() => updatePassword(user, newPw))
      .then(() => window.NativeAuth_onChangePasswordResult?.(true, ''))
      .catch(e  => window.NativeAuth_onChangePasswordResult?.(false, _friendly(e.code)))
  },

  savePlayer(name, dob, lp, cl, ex) {
    const user = auth.currentUser
    if (!user) { window.NativeAuth_onSavePlayerResult?.(false, 'Not signed in.'); return }
    const email = (user.email || '').trim().toLowerCase()
    const parts = (dob || '').split('/')
    const dobM  = parseInt(parts[0], 10) || 0
    const dobD  = parseInt(parts[1], 10) || 0
    const dobY  = parseInt(parts[2], 10) || 0
    _withFirestore(
      () => setDoc(doc(db, 'players', user.uid),
        { name, dob, dobM, dobD, dobY, lp, cl, ex, email, updated: Date.now() },
        { merge: true }
      ),
      () => {
        _save('scl_player', { name, m: dobM, d: dobD, y: dobY, lifePath: lp, soulUrge: '', expression: ex })
      }
    )
      .then(() => window.NativeAuth_onSavePlayerResult?.(true, ''))
      .catch(e  => window.NativeAuth_onSavePlayerResult?.(false, e.message || 'Save failed.'))
  },

  loadPlayer() {
    const user = auth.currentUser
    if (!user) { window.NativeAuth_onLoadPlayerResult?.(false, '', '', '', ''); return }
    const uid       = user.uid
    const authEmail = (user.email || '').trim().toLowerCase()
    _withFirestore(
      () => getDoc(doc(db, 'players', uid)),
      () => {
        const localPlayer = _load('scl_player')
        if (localPlayer?.name && localPlayer?.m && localPlayer?.d && localPlayer?.y) {
          const dobStr = `${localPlayer.m}/${localPlayer.d}/${localPlayer.y}`
          window.NativeAuth_onLoadPlayerResult?.(true, uid, localPlayer.name, dobStr, authEmail)
        } else {
          window.NativeAuth_onLoadPlayerResult?.(false, uid, '', '', authEmail)
        }
        return null
      }
    )
      .then(snap => {
        if (!snap) return
        if (snap.exists()) {
          const d = snap.data()
          let dobStr = d.dob || ''
          if (d.dobM && d.dobD && d.dobY) dobStr = d.dobM + '/' + d.dobD + '/' + d.dobY
          window.NativeAuth_onLoadPlayerResult?.(true, uid, d.name || '', dobStr, authEmail)
          // Restore XP
          const charXP    = d.charXP    || 0
          const charLevel = d.charLevel || 1
          const freqXP    = d.freqXP    || 0
          const freqLevel = d.freqLevel || 1
          const statXP    = d.statXP    || '{}'
          const freqLog   = (typeof d.freqLog === 'object' && d.freqLog !== null) ? d.freqLog : {}
          window.NativeQuest_onXPLoaded?.(charXP, charLevel, freqXP, freqLevel,
            JSON.stringify(statXP), JSON.stringify(freqLog))
          // Restore progress keys to localStorage
          try {
            if (d.achievements)  localStorage.setItem('scl_achievements',  typeof d.achievements === 'string'  ? d.achievements  : JSON.stringify(d.achievements))
            if (d.founder === true) localStorage.setItem('scl_founder', 'true')
            if (d.dailyStreak)   localStorage.setItem('scl_daily_streak', typeof d.dailyStreak === 'string'   ? d.dailyStreak   : JSON.stringify(d.dailyStreak))
            if (d.lqp)           localStorage.setItem('scl_lqp',          typeof d.lqp === 'string'           ? d.lqp           : JSON.stringify(d.lqp))
            if (d.irlCompleted)  localStorage.setItem('scl_irl_completed',  String(d.irlCompleted))
            if (d.questsCreated) localStorage.setItem('scl_quests_created', String(d.questsCreated))
            if (d.inviteAllies)  localStorage.setItem('scl_invite_allies',  String(d.inviteAllies))
            if (d.thirtyDayDone) localStorage.setItem('scl_30day_done',     String(d.thirtyDayDone))
            if (d.realmQuests)   localStorage.setItem('scl_realm_quests',   typeof d.realmQuests === 'string'  ? d.realmQuests   : JSON.stringify(d.realmQuests))
            if (Array.isArray(d.quests) && d.quests.length) {
              const local    = _load(LS_MAP_QUESTS) || []
              const localIds = new Set(local.map(q => q.id))
              _save(LS_MAP_QUESTS, [...local, ...d.quests.filter(q => !localIds.has(q.id))])
            }
          } catch { /* intentional */ }
        } else {
          window.NativeAuth_onLoadPlayerResult?.(false, uid, '', '', authEmail)
        }
      })
      .catch(() => window.NativeAuth_onLoadPlayerResult?.(false, '', '', '', ''))
  },

  signOut() {
    signOut(auth).catch(() => {})
  },

  deleteAccount(password) {
    const user = auth.currentUser
    if (!user || !user.email) { window.NativeAuth_onDeleteResult?.(false, 'Not signed in.'); return }
    const uid        = user.uid
    const credential = EmailAuthProvider.credential(user.email, password)
    reauthenticateWithCredential(user, credential)
      .then(() => {
        const subs = ['confirmed', 'received', 'sent']
        return Promise.all(subs.map(sub =>
          getDocs(collection(db, 'allies', uid, sub)).then(snap => {
            if (snap.empty) return
            const batch = writeBatch(db)
            snap.docs.forEach(d => batch.delete(d.ref))
            return batch.commit()
          })
        ))
      })
      .then(() => deleteDoc(doc(db, 'players', uid)))
      .then(() => deleteUser(auth.currentUser))
      .then(() => window.NativeAuth_onDeleteResult?.(true, ''))
      .catch(e => window.NativeAuth_onDeleteResult?.(false, _friendly(e.code)))
  },

  reloadApp() {
    window.location.reload()
  },
}

// â”€â”€ NativeMap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.NativeMap = {

  getMapsApiKey() {
    setTimeout(() => window.NativeMap_onApiKey?.('LEAFLET_MODE'), 0)
  },

  checkPermissionState() {
    if (!navigator.geolocation) { setTimeout(() => window.NativeLocation_onPermissionState?.('denied'), 0); return }
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(r => window.NativeLocation_onPermissionState?.(r.state === 'granted' ? 'granted' : r.state === 'denied' ? 'denied' : 'not_asked'))
        .catch(() => window.NativeLocation_onPermissionState?.('not_asked'))
    } else {
      setTimeout(() => window.NativeLocation_onPermissionState?.('not_asked'), 0)
    }
  },

  requestLocation() {
    if (!navigator.geolocation) { setTimeout(() => window.NativeLocation_onLocationResult?.(false, 0, 0), 0); return }
    navigator.geolocation.getCurrentPosition(
      pos  => window.NativeLocation_onLocationResult?.(true, pos.coords.latitude, pos.coords.longitude),
      ()   => window.NativeLocation_onLocationResult?.(false, 0, 0),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  },

  getPromptEnabled() {
    const enabled = localStorage.getItem(LS_GEO_PROMPT) !== 'false'
    setTimeout(() => window.NativeLocation_onPromptSetting?.(enabled), 0)
  },

  setPromptEnabled(enabled) {
    localStorage.setItem(LS_GEO_PROMPT, enabled ? 'true' : 'false')
    setTimeout(() => window.NativeLocation_onPromptSetting?.(enabled), 0)
  },

  searchLocations(queryStr) {
    if (!queryStr || queryStr.trim().length < 3) return
    fetch('https://nominatim.openstreetmap.org/search?q=' +
      encodeURIComponent(queryStr.trim()) + '&format=json&limit=5&accept-language=en',
      { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => window.NativeMap_onLocationSearchResults?.(JSON.stringify(data)))
      .catch(() => window.NativeMap_onLocationSearchResults?.('[]'))
  },

  /** Save a new map quest to localStorage + Firestore */
  saveQuest(questJson) {
    try {
      const q  = JSON.parse(questJson)
      const qs = _load(LS_MAP_QUESTS) || []
      q.id  = 'WQ_' + Date.now()
      q.uid = auth.currentUser ? auth.currentUser.uid : 'WEB_USER'
      q.ts  = Date.now()
      qs.push(q)
      _save(LS_MAP_QUESTS, qs)
      const user = auth.currentUser
      if (user) {
        _withFirestore(
          () => setDoc(doc(db, 'players', user.uid), { quests: qs, questsUpdated: Date.now() }, { merge: true }),
          () => null
        ).catch(() => {})
        // increment questsCreated counter
        try {
          const cur = parseInt(localStorage.getItem('scl_quests_created') || '0', 10) || 0
          localStorage.setItem('scl_quests_created', String(cur + 1))
        } catch { /* intentional */ }
      }
      setTimeout(() => window.NativeMap_onQuestSaved?.(true, q.id), 0)
    } catch {
      setTimeout(() => window.NativeMap_onQuestSaved?.(false, ''), 0)
    }
  },

  loadQuestMarkers() {
    const qs = _load(LS_MAP_QUESTS) || []
    setTimeout(() => window.NativeMap_onQuestsLoaded?.(JSON.stringify(qs)), 0)
  },

  loadMyQuests() {
    const uid = auth.currentUser ? auth.currentUser.uid : 'WEB_USER'
    const qs  = (_load(LS_MAP_QUESTS) || []).filter(q => q.uid === uid)
    setTimeout(() => window.NativeMap_onMyQuestsLoaded?.(JSON.stringify(qs)), 0)
  },

  deleteQuest(questId) {
    const qs = (_load(LS_MAP_QUESTS) || []).filter(q => q.id !== questId)
    _save(LS_MAP_QUESTS, qs)
    const user = auth.currentUser
    if (user) {
      _withFirestore(
        () => setDoc(doc(db, 'players', user.uid), { quests: qs, questsUpdated: Date.now() }, { merge: true }),
        () => null
      ).catch(() => {})
    }
    setTimeout(() => window.NativeMap_onQuestDeleted?.(true, questId), 0)
  },

  /** Sync XP levels to Firestore + localStorage. Call after XP changes. */
  savePlayerXP(charXP, charLevel, freqXP, freqLevel, statXPJson) {
    try {
      const existing = _load(LS_XP) || {}
      _save(LS_XP, { ...existing, charXP, charLevel, freqXP, freqLevel, statXP: JSON.parse(statXPJson || '{}') })
    } catch { /* intentional */ }
    const user = auth.currentUser
    if (!user) return
    const streak    = parseInt(localStorage.getItem('scl_daily_streak') || '0', 10)
    const realmRaw  = localStorage.getItem('scl_realm_quests')
    const realmDone = realmRaw ? Object.values(JSON.parse(realmRaw)).filter(Boolean).length : 0
    const freqRaw   = localStorage.getItem('scl_freq_quests')
    const freqDone  = freqRaw  ? Object.values(JSON.parse(freqRaw )).filter(Boolean).length : 0
    const simScore  = charLevel + freqLevel + realmDone + streak + Math.floor(freqDone / 5)
    _withFirestore(
      () => setDoc(doc(db, 'players', user.uid),
        { charXP, charLevel, freqXP, freqLevel, statXP: statXPJson, simScore, updated: Date.now() },
        { merge: true }
      ),
      () => null
    ).catch(() => {})
  },

  /** Sync frequency journal log to Firestore. */
  saveFreqLog(freqLogJson) {
    const user = auth.currentUser
    if (!user) return
    try {
      _withFirestore(
        () => setDoc(doc(db, 'players', user.uid),
          { freqLog: JSON.parse(freqLogJson || '{}'), freqLogUpdated: Date.now() },
          { merge: true }
        ),
        () => null
      ).catch(() => {})
    } catch { /* intentional */ }
  },

  /** Sync achievements + all progress keys to Firestore. */
  saveAchievements() {
    const user = auth.currentUser
    if (!user) return
    try {
      const achievements  = localStorage.getItem('scl_achievements')  || '{}'
      const founder       = localStorage.getItem('scl_founder') === 'true'
      const dailyStreak   = localStorage.getItem('scl_daily_streak')  || '{}'
      const lqp           = localStorage.getItem('scl_lqp')           || '{}'
      const irlCompleted  = parseInt(localStorage.getItem('scl_irl_completed')  || '0') || 0
      const questsCreated = parseInt(localStorage.getItem('scl_quests_created') || '0') || 0
      const inviteAllies  = parseInt(localStorage.getItem('scl_invite_allies')  || '0') || 0
      const thirtyDayDone = parseInt(localStorage.getItem('scl_30day_done')     || '0') || 0
      const realmQuests   = localStorage.getItem('scl_realm_quests') || '{}'
      _withFirestore(
        () => setDoc(doc(db, 'players', user.uid),
          { achievements, founder, dailyStreak, lqp,
            irlCompleted, questsCreated, inviteAllies, thirtyDayDone, realmQuests,
            achievementsUpdated: Date.now() },
          { merge: true }
        ),
        () => null
      ).catch(() => {})
    } catch { /* intentional */ }
  },
}

// â”€â”€ NativeAllies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.NativeAllies = {

  /** Search by email, return profile to UI via NativeAllies_onSearchResult */
  searchByEmail(email) {
    getDocs(query(
      collection(db, 'players'),
      where('email', '==', email.trim().toLowerCase()),
      limit(1)
    ))
      .then(snap => {
        if (snap.empty) { window.NativeAllies_onSearchResult?.(false, '', '', '', '', ''); return }
        const d   = snap.docs[0].data()
        const uid = snap.docs[0].id
        window.NativeAllies_onSearchResult?.(true, uid, d.name || '', d.lp || '?', d.cl || '?', d.ex || '?')
      })
      .catch(() => window.NativeAllies_onSearchResult?.(false, '', '', '', '', ''))
  },

  sendRequest(targetUid) {
    const user = auth.currentUser
    if (!user) { window.NativeAllies_onRequestSent?.(false, 'Not signed in.'); return }
    const myUid = user.uid
    if (myUid === targetUid) { window.NativeAllies_onRequestSent?.(false, 'Cannot add yourself.'); return }
    // Check for existing outgoing request
    getDocs(query(collection(db, 'ally_requests'),
      where('from', '==', myUid), where('to', '==', targetUid), where('status', '==', 'pending'), limit(1)))
      .then(snap => {
        if (!snap.empty) { window.NativeAllies_onRequestSent?.(false, 'Request already sent.'); return }
        // Check if they already sent one to us â†’ auto-accept both
        return getDocs(query(collection(db, 'ally_requests'),
          where('from', '==', targetUid), where('to', '==', myUid), where('status', '==', 'pending'), limit(1)))
          .then(revSnap => {
            if (!revSnap.empty) {
              return updateDoc(revSnap.docs[0].ref, { status: 'accepted' })
                .then(() => _linkAllies(myUid, targetUid))
                .then(() => window.NativeAllies_onRequestSent?.(true, ''))
            }
            return getDoc(doc(db, 'players', myUid)).then(mySnap => {
              const me = mySnap.exists() ? mySnap.data() : {}
              return addDoc(collection(db, 'ally_requests'), {
                from: myUid, to: targetUid,
                fromName: me.name || '', fromLp: me.lp || '?', fromCl: me.cl || '?', fromEx: me.ex || '?',
                status: 'pending', ts: Date.now(),
              }).then(() => window.NativeAllies_onRequestSent?.(true, ''))
            })
          })
      })
      .catch(e => window.NativeAllies_onRequestSent?.(false, e.message || 'Could not send request.'))
  },

  respondRequest(senderUid, accept) {
    const user = auth.currentUser
    if (!user) { window.NativeAllies_onRequestResponded?.(senderUid, false); return }
    const myUid = user.uid
    getDocs(query(collection(db, 'ally_requests'),
      where('from', '==', senderUid), where('to', '==', myUid), where('status', '==', 'pending'), limit(1)))
      .then(snap => {
        if (snap.empty) { window.NativeAllies_onRequestResponded?.(senderUid, false); return }
        const ref = snap.docs[0].ref
        if (!accept) {
          return updateDoc(ref, { status: 'declined' })
            .then(() => window.NativeAllies_onRequestResponded?.(senderUid, false))
        }
        return updateDoc(ref, { status: 'accepted' })
          .then(() => _linkAllies(myUid, senderUid))
          .then(() => window.NativeAllies_onRequestResponded?.(senderUid, true))
      })
      .catch(() => window.NativeAllies_onRequestResponded?.(senderUid, false))
  },

  loadAllies() {
    const user = auth.currentUser
    if (!user) { window.NativeAllies_onAlliesLoaded?.('[]'); return }
    getDocs(collection(db, 'players', user.uid, 'allies'))
      .then(snap => {
        const allies = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
        window.NativeAllies_onAlliesLoaded?.(JSON.stringify(allies))
      })
      .catch(() => window.NativeAllies_onAlliesLoaded?.('[]'))
  },

  loadPendingRequests() {
    const user = auth.currentUser
    if (!user) { window.NativeAllies_onRequestsLoaded?.('[]'); return }
    getDocs(query(collection(db, 'ally_requests'),
      where('to', '==', user.uid), where('status', '==', 'pending'), orderBy('ts', 'desc')))
      .then(snap => {
        const reqs = snap.docs.map(d => {
          const r = d.data()
          return { uid: r.from, name: r.fromName || '', lp: r.fromLp || '?', cl: r.fromCl || '?', ex: r.fromEx || '?' }
        })
        window.NativeAllies_onRequestsLoaded?.(JSON.stringify(reqs))
      })
      .catch(() => window.NativeAllies_onRequestsLoaded?.('[]'))
  },

  removeAlly(uid) {
    const user = auth.currentUser
    if (!user) { window.NativeAllies_onAllyRemoved?.(uid); return }
    const myUid = user.uid
    Promise.all([
      deleteDoc(doc(db, 'players', myUid, 'allies', uid)),
      deleteDoc(doc(db, 'players', uid,   'allies', myUid)),
    ])
      .then(() => window.NativeAllies_onAllyRemoved?.(uid))
      .catch(() => window.NativeAllies_onAllyRemoved?.(uid))
  },

  shareLink(link, message) {
    if (navigator.share) {
      navigator.share({ title: 'Source Code: Life', text: message, url: link }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(message + '\n' + link).catch(() => {})
    }
  },

  getPlayerName(uid) {
    getDoc(doc(db, 'players', uid))
      .then(snap => window.NativeAllies_onPlayerName?.(snap.exists() ? (snap.data().name || 'An ally') : 'An ally'))
      .catch(() => window.NativeAllies_onPlayerName?.('An ally'))
  },

  startQuestNotifListener() {},
  stopQuestNotifListener()  {},
  getQuestNotifMode()       { return 'off' },
}

// â”€â”€ NativeLeaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.NativeLeaderboard = {
  fetchTop3(cb) {
    getDocs(query(collection(db, 'players'), orderBy('simScore', 'desc'), limit(3)))
      .then(snap => {
        const rows = snap.docs.map(d => ({
          name:  d.data().name  || 'PLAYER',
          score: d.data().simScore || 0,
          uid:   d.id,
        }))
        cb(null, rows)
      })
      .catch(e => cb(e, []))
  },
}

// â”€â”€ NativeNotif â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.NativeNotif = {
  scheduleDaily(hour, minute, title, body) {
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') new Notification(title, { body })
      })
    }
  },
  cancelDaily() {},
  sendNow(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  },
}

// â”€â”€ Internal: link two players as mutual allies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _isPremiumFromEntitlements(entitlements) {
  if (!Array.isArray(entitlements)) return false
  if (entitlements.includes('premium_lifetime')) return true
  const timed = entitlements.find(e => /^premium_\d+d:/.test(e))
  if (!timed) return false
  const i = timed.indexOf(':')
  if (i < 0) return false
  return new Date(timed.slice(i + 1)) > new Date()
}

function _linkAllies(uidA, uidB) {
  return Promise.all([
    getDoc(doc(db, 'players', uidB)).then(snap => {
      const d = snap.exists() ? snap.data() : {}
      const rep = d.reputation || null
      const takerRep = d.takerReputation || null
      return setDoc(doc(db, 'players', uidA, 'allies', uidB),
        { name: d.name || '', lp: d.lp || '?', cl: d.cl || '?', ex: d.ex || '?', ts: Date.now(), isPremium: _isPremiumFromEntitlements(d.entitlements), reputation: rep, takerReputation: takerRep },
        { merge: true }
      )
    }),
    getDoc(doc(db, 'players', uidA)).then(snap => {
      const d = snap.exists() ? snap.data() : {}
      const rep = d.reputation || null
      const takerRep = d.takerReputation || null
      return setDoc(doc(db, 'players', uidB, 'allies', uidA),
        { name: d.name || '', lp: d.lp || '?', cl: d.cl || '?', ex: d.ex || '?', ts: Date.now(), isPremium: _isPremiumFromEntitlements(d.entitlements), reputation: rep, takerReputation: takerRep },
        { merge: true }
      )
    }),
  ])
}

// ── NativePurchase (dev stub — Android uses Kotlin @JavascriptInterface) ───
window.NativePurchase = {
  startPurchase(productId) {
    console.log('[SCL/dev] NativePurchase.startPurchase:', productId)
    setTimeout(() => {
      window.NativePurchase_onPurchaseResult?.(true, productId, '')
    }, 1500)
  },
}
