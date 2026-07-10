import { createContext, useContext, useReducer } from 'react'
import { AVATAR_KEY, AVATAR_OWNER_KEY, avatarOwnerSignature } from '../lib/avatarParts'

// ── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  /** Authenticated user: { uid, email } or null */
  currentUser: null,
  /** Computed numerology object from computeAll() or null */
  playerData: null,
  /** Which top-level overlay is shown: 'boot' | 'auth' | 'charCreate' | 'avatarCreate' | 'app' */
  screen: 'boot',
  /** Active main tab: 'home' | 'quests' | 'map' | 'profile' | 'config' */
  activeTab: 'home',
  /** Auth form errors: { loginError, regError, charError, forgotError, forgotSuccess, cpError, cpSuccess, deleteError } */
  authErrors: {},
  /** Auth loading spinners: { loginLoading, regLoading, charLoading, forgotLoading } */
  authLoading: {},
  /** Invite banner inviter name or null */
  inviteBannerName: null,
  /** Show premium paywall modal */
  showPremiumModal: false,
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload }

    case 'SET_USER':
      return { ...state, currentUser: action.payload }

    case 'SET_PLAYER':
      return { ...state, playerData: action.payload }

    case 'SET_TAB':
      return { ...state, activeTab: action.payload }

    case 'LOGIN': {
      const { uid, email } = action.payload
      return { ...state, currentUser: { uid, email } }
    }

    case 'CHAR_CREATED': {
      // New characters always go through premiumReveal first, then avatarCreate
      return {
        ...state,
        currentUser: action.payload.user,
        playerData:  action.payload.playerData,
        screen:      'premiumReveal',
      }
    }

    case 'LAUNCH_APP':
      return {
        ...state,
        currentUser: action.payload.user,
        playerData:  action.payload.playerData,
        screen:      'app',
        activeTab:   'home',
      }

    case 'SIGN_OUT':
      return { ...initialState, screen: 'auth' }

    case 'RESET_CHAR':
      try {
        localStorage.removeItem(AVATAR_KEY)
        localStorage.removeItem(AVATAR_OWNER_KEY)
      } catch { /* noop */ }
      return { ...state, playerData: null, screen: 'charCreate' }

    case 'AUTH_SUCCESS': {
      const { field, message } = action.payload
      return { ...state, authErrors: { ...state.authErrors, [field]: message } }
    }

    case 'CLEAR_AUTH_ERRORS':
      return { ...state, authErrors: {}, authLoading: {} }

    case 'SET_AUTH_LOADING': {
      const { field, value } = action.payload
      return { ...state, authLoading: { ...state.authLoading, [field]: value } }
    }

    case 'AUTH_ERROR': {
      // AUTH_ERROR automatically clears the matching loading field
      const { field, message } = action.payload
      const loadKey = field.replace('Error', 'Loading').replace('Success', 'Loading')
      return {
        ...state,
        authErrors:  { ...state.authErrors,  [field]:   message },
        authLoading: { ...state.authLoading, [loadKey]: false   },
      }
    }

    // keep old AUTH_ERROR case name working — handled above, remove duplicate below

    case 'SET_INVITE_BANNER':
      return { ...state, inviteBannerName: action.payload }

    case 'DISMISS_INVITE_BANNER':
      return { ...state, inviteBannerName: null }

    case 'OPEN_PREMIUM_MODAL':
      return { ...state, showPremiumModal: true }

    case 'CLOSE_PREMIUM_MODAL':
      return { ...state, showPremiumModal: false }

    default:
      return state
  }
}

// ── Context + Provider ────────────────────────────────────────────────────────
const AppStateContext   = createContext(null)
const AppDispatchContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

export function useAppState()    { return useContext(AppStateContext) }
export function useAppDispatch() { return useContext(AppDispatchContext) }
