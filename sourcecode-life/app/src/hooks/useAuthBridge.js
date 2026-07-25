/**
 * useAuthBridge
 *
 * Registers all NativeAuth_* global callbacks that Kotlin calls via
 * webView.evaluateJavascript(...). Each callback dispatches into AppContext
 * so React state drives the UI — no direct DOM manipulation.
 *
 * Depends on: computeAll (numerology.js), saveLocalUser/saveLocalPlayer (lib/storage.js)
 */
import { useEffect } from 'react'
import { useAppDispatch } from '../context/AppContext'
import { useGameDispatch } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { computeAll } from '../lib/numerology'
import {
  saveLocalUser,
  saveLocalPlayer,
} from '../lib/storage'
import { fetchUserProfile } from '../components/auth/firestoreprofile'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import {
  parseEntitlementExpiry,
  entitlementForPeriodEnd,
  daysUntilIso,
  fetchSclCheckoutSession,
  fetchSclSubscription,
} from '../lib/sclBilling'

// Helper: map Firebase error codes → human messages
function friendlyError(raw) {
  if (!raw) return 'Unknown error.'
  if (raw.includes('user-not-found'))           return 'No account found with that email.'
  if (raw.includes('wrong-password'))           return 'Incorrect password.'
  if (raw.includes('invalid-email'))            return 'Please enter a valid email address.'
  if (raw.includes('email-already-in-use'))     return 'An account already exists with that email.'
  if (raw.includes('weak-password'))            return 'Password must be at least 6 characters.'
  if (raw.includes('network-request-failed'))   return 'Network error. Check your connection.'
  if (raw.includes('too-many-requests'))        return 'Too many attempts. Please wait and try again.'
  if (raw.includes('INVALID_LOGIN_CREDENTIALS')) return 'Invalid email or password.'
  return raw
}

/**
 * Robustly parse DOB strings from Kotlin:
 *   M/D/YYYY, D/M/YYYY, YYYY-MM-DD, YYYY/M/D
 */
function parseDob(dob) {
  if (dob.includes('-')) {
    const [y, m, d] = dob.split('-').map(Number)
    return { m, d, y }
  }
  const parts = dob.split('/').map(Number)
  const [p0, p1, p2] = parts
  if (p2 > 31) {
    // p2 is a 4-digit year → M/D/YYYY or D/M/YYYY
    if (p0 > 12) return { d: p0, m: p1, y: p2 }
    return { m: p0, d: p1, y: p2 }
  }
  // p0 is year (YYYY/M/D)
  return { y: p0, m: p1, d: p2 }
}

function flushPendingPurchase() {
  try {
    const pendingProductId = sessionStorage.getItem('scl_pending_purchase')
    if (pendingProductId) {
      sessionStorage.removeItem('scl_pending_purchase')
      window.NativePurchase_onPurchaseResult?.(true, pendingProductId, '')
    }
  } catch { /* intentional */ }
}

async function syncSubscriptionRenewal(uid, profile, gameDispatch) {
  const subscriptionId = profile.stripeSubscriptionId
  if (!subscriptionId || !auth.currentUser) return profile

  let idToken
  try {
    idToken = await auth.currentUser.getIdToken()
  } catch {
    return profile
  }

  let sub
  try {
    sub = await fetchSclSubscription({ subscriptionId, idToken })
  } catch (e) {
    console.warn('[SCL] subscription sync failed:', e.message)
    return profile
  }

  const updates = {}
  if (typeof sub.cancelAtPeriodEnd === 'boolean'
      && sub.cancelAtPeriodEnd !== !!profile.subscriptionCancelAtPeriodEnd) {
    updates.subscriptionCancelAtPeriodEnd = sub.cancelAtPeriodEnd
  }

  const periodEndIso = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd * 1000).toISOString()
    : null
  const active = sub.status === 'active' || sub.status === 'trialing'

  if (active && periodEndIso) {
    const entitlements = Array.isArray(profile.entitlements) ? [...profile.entitlements] : []
    const timed = entitlements.find(e => /^premium_\d+d:/.test(e))
    const currentExpiry = timed ? parseEntitlementExpiry(timed) : null
    if (!currentExpiry || new Date(periodEndIso) > new Date(currentExpiry)) {
      const productId = profile.stripeProductId
        || (timed?.startsWith('premium_365d') ? 'premium_annual' : 'premium_monthly')
      const nextEntitlement = entitlementForPeriodEnd(productId, sub.currentPeriodEnd)
      const next = entitlements.filter(e => !/^premium_\d+d:/.test(e))
      next.push(nextEntitlement)
      updates.entitlements = next
      gameDispatch({
        type: ACTIONS.REDEEM_GIFT_CODE,
        payload: { daysGranted: daysUntilIso(periodEndIso) },
      })
    }
  }

  if (Object.keys(updates).length) {
    try {
      await updateDoc(doc(db, 'players', uid), updates)
      return { ...profile, ...updates }
    } catch (e) {
      console.warn('[SCL] failed to persist subscription sync:', e)
    }
  }
  return profile
}

function applyEntitlementsToState(entitlements, gameDispatch) {
  let isLifetime = false
  let timedEntry
  try {
    isLifetime = entitlements.includes('premium_lifetime')
    timedEntry = entitlements.find(e => /^premium_\d+d:/.test(e))
  } catch (e) {
    console.error('❌ Error processing entitlements:', e)
  }
  if (isLifetime) {
    gameDispatch({ type: ACTIONS.IS_PREMIUM })
  } else if (timedEntry) {
    const expiry = parseEntitlementExpiry(timedEntry)
    if (expiry && new Date(expiry) > new Date()) {
      gameDispatch({
        type: ACTIONS.REDEEM_GIFT_CODE,
        payload: { daysGranted: daysUntilIso(expiry) },
      })
    }
  }
}

export function useAuthBridge() {
  const dispatch = useAppDispatch()
  const gameDispatch = useGameDispatch()

  useEffect(() => {
    // ── NativeAuth.login() result ────────────────────────────────────────────
    window.NativeAuth_onLoginResult = (success, uid, errorMsg) => {
      dispatch({ type: 'SET_AUTH_LOADING', payload: { field: 'loginLoading', value: false } })
      if (success) {
        dispatch({ type: 'SET_USER', payload: { uid } })
        if (typeof window.NativeAuth !== 'undefined') window.NativeAuth.loadPlayer()
      } else {
        dispatch({
          type: 'AUTH_ERROR',
          payload: { field: 'loginError', message: '⚠ ' + friendlyError(errorMsg) },
        })
      }
    }

    // ── NativeAuth.register() result ─────────────────────────────────────────
    window.NativeAuth_onRegisterResult = (success, uid, errorMsg) => {
      dispatch({ type: 'SET_AUTH_LOADING', payload: { field: 'regLoading', value: false } })
      if (success) {
        dispatch({ type: 'SET_USER', payload: { uid } })
        const isNewUser = sessionStorage.getItem('scl_new_user') === '1'
        dispatch({ type: 'SET_SCREEN', payload: isNewUser ? 'onboarding' : 'charCreate' })
      } else {
        dispatch({
          type: 'AUTH_ERROR',
          payload: { field: 'regError', message: '⚠ ' + friendlyError(errorMsg) },
        })
      }
    }

    // ── NativeAuth.savePlayer() result ──────────────────────────────────────
    window.NativeAuth_onSavePlayerResult = (success, errorMsg) => {
      if (window._saveTimeout) { clearTimeout(window._saveTimeout); window._saveTimeout = null }
      dispatch({ type: 'SET_AUTH_LOADING', payload: { field: 'charLoading', value: false } })
      if (success) {
        // playerData is stored in pending state from handleCharCreate
        const pending = window._pendingPlayerData
        if (pending) {
          saveLocalPlayer(pending)
          dispatch({ type: 'SET_PLAYER', payload: pending })
          window._pendingPlayerData = null
          window._newCharacterCreated = true
        }
        // Handle pending ally invite
        const refUid = window._pendingInviterUid
        if (refUid) {
          window._pendingInviterUid = null
          if (typeof window.NativeAllies !== 'undefined') window.NativeAllies.sendRequest(refUid)
        }
        if (typeof window.NativeAuth !== 'undefined') window.NativeAuth.loadPlayer()
      } else {
        dispatch({
          type: 'AUTH_ERROR',
          payload: { field: 'charError', message: '⚠ ' + (errorMsg || 'Failed to save. Check your connection.') },
        })
      }
    }

    // ── NativeAuth.loadPlayer() result ──────────────────────────────────────
    window.NativeAuth_onLoadPlayerResult = async (found, uid, name, dob, email) => {
      window._currentUid = uid || window._currentUid
      if (uid) {
        try { localStorage.setItem('scl_uid', uid) } catch { /* intentional */ }
      }

      if (found && name && dob) {
        const { m, d, y } = parseDob(dob)
        const user       = { uid, email }
        const playerData = computeAll(m, d, y, name)
        saveLocalUser(email)
        saveLocalPlayer(playerData)

        // Restore premium from Firestore entitlements (+ subscription renewal sync)
        let profile = await fetchUserProfile(uid)
        profile = await syncSubscriptionRenewal(uid, profile, gameDispatch)
        const entitlements = Array.isArray(profile.entitlements) ? profile.entitlements : []
        applyEntitlementsToState(entitlements, gameDispatch)

        // Pending ally request (returning user via invite link)
        try {
          const pendingUid = localStorage.getItem('scl_pending_inviter')
          if (pendingUid && pendingUid !== uid && typeof window.NativeAllies !== 'undefined') {
            localStorage.removeItem('scl_pending_inviter')
            window._pendingInviterUid = null
            window.NativeAllies.sendRequest(pendingUid)
          }
        } catch { /* intentional */ }
        if (window._newCharacterCreated) {
          window._newCharacterCreated = false
          dispatch({ type: 'CHAR_CREATED', payload: { user, playerData } })
        } else {
          dispatch({ type: 'LAUNCH_APP', payload: { user, playerData } })
        }

        flushPendingPurchase()
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'charCreate' })
        // Profile incomplete but uid known — still apply queued Stripe purchase
        flushPendingPurchase()
      }
    }

    // ── NativeAuth.checkSession() result ────────────────────────────────────
    window.NativeAuth_onSessionResult = (loggedIn, uid) => {
      if (loggedIn) {
        dispatch({ type: 'SET_SCREEN', payload: 'restoring' })
        dispatch({ type: 'SET_USER', payload: { uid } })
        if (typeof window.NativeAuth !== 'undefined') window.NativeAuth.loadPlayer()
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'auth' })
      }
    }

    // ── NativeAuth.deleteAccount() result ───────────────────────────────────
    window.NativeAuth_onDeleteResult = (success, errorMsg) => {
      if (success) {
        try {
          ['scl_user','scl_player','scl_avatar',
           'scl_notif_enabled','scl_notif_hour','scl_notif_minute',
           'scl_theme', 'scl_uid'].forEach(k => localStorage.removeItem(k))
        } catch { /* intentional */ }
        window._currentUid = null
        if (typeof window.NativeNotif !== 'undefined' && window.NativeNotif.cancelDaily) {
          window.NativeNotif.cancelDaily()
        }
        dispatch({ type: 'SIGN_OUT' })
      } else {
        dispatch({
          type: 'AUTH_ERROR',
          payload: { field: 'deleteError', message: '⚠ ' + (errorMsg || 'Deletion failed. Check your password and try again.') },
        })
      }
    }

    // ── NativeAuth.sendPasswordReset() result ───────────────────────────────
    window.NativeAuth_onPasswordResetResult = (success, errorMsg) => {
      dispatch({ type: 'SET_AUTH_LOADING', payload: { field: 'forgotLoading', value: false } })
      if (success) {
        dispatch({ type: 'AUTH_SUCCESS', payload: { field: 'forgotSuccess', message: '✓ Reset link sent — check your inbox (and spam folder).' } })
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: { field: 'forgotError', message: '⚠ ' + friendlyError(errorMsg || '') } })
      }
    }

    // ── NativeAuth.changePassword() result ──────────────────────────────────
    window.NativeAuth_onChangePasswordResult = (success, errorMsg) => {
      if (success) {
        dispatch({ type: 'AUTH_SUCCESS', payload: { field: 'cpSuccess', message: '✓ Password updated successfully.' } })
      } else {
        dispatch({
          type: 'AUTH_ERROR',
          payload: { field: 'cpError', message: '⚠ ' + friendlyError(errorMsg || '') },
        })
      }
    }

    // ── Invite banner ───────────────────────────────────────────────────────
    window.NativeAuth_onInviteDetected = (inviterUid) => {
      if (!inviterUid) return
      window._pendingInviterUid = inviterUid
      if (typeof window.NativeAllies !== 'undefined') {
        window.NativeAllies.getPlayerName(inviterUid)
      } else {
        dispatch({ type: 'SET_INVITE_BANNER', payload: 'An ally' })
      }
    }
    window.NativeAllies_onPlayerName = (name) => {
      dispatch({ type: 'SET_INVITE_BANNER', payload: name || 'An ally' })
    }

    // ── NativeQuest.onXPLoaded — delegate to questEngine (cloud merge) ─────────
    window.NativeQuest_onXPLoaded = (charXP, charLevel, freqXP, freqLevel, statXPJson, freqLogJson) => {
      window.__scl_qe_onXPLoaded?.(charXP, charLevel, freqXP, freqLevel, statXPJson, freqLogJson)
    }

    // ── NativePurchase.startPurchase() result (Google Play + Stripe) ──────────
    window.NativePurchase_onPurchaseResult = async (success, productId, errorMsg) => {
      if (!success) {
        window.dispatchEvent(new CustomEvent('scl:purchase_error', { detail: errorMsg }))
        return
      }

      if (!productId) {
        window.dispatchEvent(new CustomEvent('scl:purchase_error', {
          detail: 'Purchase succeeded but product was missing. Contact support.',
        }))
        gameDispatch({
          type: ACTIONS.SET_TOAST,
          payload: { msg: '⚠ Purchase could not be applied — missing product. Contact support.', color: 'var(--red)' },
        })
        return
      }

      let uid = window._currentUid
      if (!uid) {
        try { uid = localStorage.getItem('scl_uid') || '' } catch { uid = '' }
      }
      if (!uid) {
        try { sessionStorage.setItem('scl_pending_purchase', productId) } catch { /* intentional */ }
        return
      }
      window._currentUid = uid

      let sessionId = null
      try { sessionId = sessionStorage.getItem('scl_pending_session') || null } catch { /* intentional */ }

      let entitlement
      let stripeFields = {}
      let periodEndIso = null

      if (sessionId) {
        try {
          const session = await fetchSclCheckoutSession(sessionId)
          if (session.productId && session.productId !== productId) {
            productId = session.productId
          }
          if (session.currentPeriodEnd) {
            entitlement = entitlementForPeriodEnd(productId, session.currentPeriodEnd)
            periodEndIso = new Date(session.currentPeriodEnd * 1000).toISOString()
          }
          stripeFields = {
            stripeCustomerId: session.customerId || null,
            stripeSubscriptionId: session.subscriptionId || null,
            stripeProductId: productId,
            subscriptionCancelAtPeriodEnd: !!session.cancelAtPeriodEnd,
          }
        } catch (e) {
          console.warn('[SCL] checkout session sync failed, falling back to local grant:', e.message)
        }
      }

      if (!entitlement) {
        if (productId === 'premium_lifetime') {
          entitlement = 'premium_lifetime'
        } else if (productId === 'premium_annual') {
          const expiry = new Date()
          expiry.setFullYear(expiry.getFullYear() + 1)
          entitlement = `premium_365d:${expiry.toISOString()}`
          periodEndIso = expiry.toISOString()
        } else if (productId === 'premium_monthly') {
          const expiry = new Date()
          expiry.setDate(expiry.getDate() + 30)
          entitlement = `premium_30d:${expiry.toISOString()}`
          periodEndIso = expiry.toISOString()
        } else {
          window.dispatchEvent(new CustomEvent('scl:purchase_error', {
            detail: 'Unknown premium product. Contact support.',
          }))
          return
        }
      }

      try {
        const profile = await fetchUserProfile(uid)
        const entitlements = Array.isArray(profile.entitlements) ? [...profile.entitlements] : []
        const next = entitlements.filter(e => {
          if (entitlement === 'premium_lifetime') return e !== 'premium_lifetime'
          return !/^premium_\d+d:/.test(e)
        })
        next.push(entitlement)
        const profileRef = doc(db, 'players', uid)
        await updateDoc(profileRef, {
          entitlements: next,
          ...stripeFields,
        })
      } catch (e) {
        console.error('[SCL] Failed to write entitlement to players/{uid}:', e)
        try { sessionStorage.setItem('scl_pending_purchase', productId) } catch { /* intentional */ }
        window.dispatchEvent(new CustomEvent('scl:purchase_error', {
          detail: 'Could not save premium. Reopen the app to retry.',
        }))
        gameDispatch({
          type: ACTIONS.SET_TOAST,
          payload: { msg: '⚠ Could not save premium. Reopen the app to retry.', color: 'var(--red)' },
        })
        return
      }

      if (productId === 'premium_lifetime') {
        gameDispatch({ type: ACTIONS.IS_PREMIUM })
      } else {
        const days = periodEndIso
          ? daysUntilIso(periodEndIso)
          : (productId === 'premium_annual' ? 365 : 30)
        gameDispatch({ type: ACTIONS.REDEEM_GIFT_CODE, payload: { daysGranted: days } })
      }

      try {
        sessionStorage.removeItem('scl_pending_purchase')
        sessionStorage.removeItem('scl_pending_session')
      } catch { /* intentional */ }
      dispatch({ type: 'CLOSE_PREMIUM_MODAL' })
      gameDispatch({
        type: ACTIONS.SET_TOAST,
        payload: { msg: '✦ Premium unlocked! Explore Stats → Spiral and Decode → Blueprint.', color: 'var(--gold)' },
      })
    }

    return () => {
      // Clean up globals on unmount (defensive)
      const bridgeFns = [
        'NativeAuth_onLoginResult', 'NativeAuth_onRegisterResult',
        'NativeAuth_onSavePlayerResult', 'NativeAuth_onLoadPlayerResult',
        'NativeAuth_onSessionResult', 'NativeAuth_onDeleteResult',
        'NativeAuth_onPasswordResetResult', 'NativeAuth_onChangePasswordResult',
        'NativeAuth_onInviteDetected', 'NativeAllies_onPlayerName',
        'NativeQuest_onXPLoaded', 'NativePurchase_onPurchaseResult',
      ]
      bridgeFns.forEach(fn => { delete window[fn] })
    }
  }, [dispatch, gameDispatch])
}
