/**
 * useAlliesBridge
 *
 * Registers all NativeAllies_on* global callbacks (called by bridge.js) and
 * exposes ally state + action helpers to any component that imports this hook.
 *
 * NOTE: NativeAllies_onPlayerName is registered in useAuthBridge (invite banner).
 */
import { useState, useEffect, useCallback, useRef } from 'react'

export function useAlliesBridge() {
  const [allies,           setAllies]       = useState([])
  const [pendingRequests,  setPending]      = useState([])
  // null = not yet searched, false = search returned no result, {uid,name,...} = found
  const [searchResult,     setSearchResult] = useState(null)
  const [searchLoading,    setSearchLoading] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState([])
  const [suggesting,       setSuggesting]   = useState(false)
  const [answeredFor,      setAnsweredFor]  = useState('')
  const askedPrefix = useRef('')
  const [sendStatus,       setSendStatus]   = useState('') // '' | 'sending' | 'sent' | error string
  const [loadingAllies,    setLoadingAllies] = useState(false)

  useEffect(() => {
    // â”€â”€ Callbacks from bridge.js â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    window.NativeAllies_onSearchResult = (found, uid, name, lp, cl, ex) => {
      setSearchLoading(false)
      setSearchResult(found ? { uid, name, lp, cl, ex } : false)
    }

    window.NativeAllies_onEmailSuggestions = (json) => {
      setSuggesting(false)
      setAnsweredFor(askedPrefix.current)
      try { setEmailSuggestions(JSON.parse(json)) } catch { setEmailSuggestions([]) }
    }

    window.NativeAllies_onRequestSent = (success, error) => {
      setSendStatus(success ? 'sent' : (error || 'Failed to send request.'))
    }

    window.NativeAllies_onRequestResponded = (senderUid) => {
      // Remove from pending regardless of accept/decline â€” UI already reflects button tapped
      setPending(p => p.filter(r => r.uid !== senderUid))
    }

    window.NativeAllies_onAlliesLoaded = (json) => {
      setLoadingAllies(false)
      try { setAllies(JSON.parse(json)) } catch { /* intentional */ }
    }

    window.NativeAllies_onRequestsLoaded = (json) => {
      try { setPending(JSON.parse(json)) } catch { /* intentional */ }
    }

    window.NativeAllies_onAllyRemoved = (uid) => {
      setAllies(a => a.filter(x => x.uid !== uid))
    }

    let loadTimer
    if (window.NativeAllies) {
      loadTimer = setTimeout(() => {
        setLoadingAllies(true)
        window.NativeAllies.loadAllies()
        window.NativeAllies.loadPendingRequests()
      }, 0)
    }

    return () => {
      if (loadTimer) clearTimeout(loadTimer)
      delete window.NativeAllies_onSearchResult
      delete window.NativeAllies_onEmailSuggestions
      delete window.NativeAllies_onRequestSent
      delete window.NativeAllies_onRequestResponded
      delete window.NativeAllies_onAlliesLoaded
      delete window.NativeAllies_onRequestsLoaded
      delete window.NativeAllies_onAllyRemoved
    }
  }, [])

  const suggestEmails = useCallback((prefix) => {
    const q = String(prefix || '').trim()
    if (q.length < 2) {
      askedPrefix.current = ''
      setEmailSuggestions([])
      setSuggesting(false)
      setAnsweredFor('')
      return
    }
    askedPrefix.current = q.toLowerCase()
    setEmailSuggestions([])
    setSuggesting(true)
    window.NativeAllies?.suggestByEmail(q)
  }, [])

  const searchByEmail = useCallback((email) => {
    if (!email.trim()) return
    setSearchLoading(true)
    setSearchResult(null)
    setSendStatus('')
    window.NativeAllies?.searchByEmail(email.trim())
  }, [])

  const sendRequest = useCallback((uid) => {
    setSendStatus('sending')
    window.NativeAllies?.sendRequest(uid)
  }, [])

  const respondRequest = useCallback((uid, accept) => {
    window.NativeAllies?.respondRequest(uid, accept)
    if (accept) {
      // Optimistically add to allies list while we wait for re-load
      setPending(p => {
        const req = p.find(r => r.uid === uid)
        if (req) setAllies(a => [...a, req])
        return p.filter(r => r.uid !== uid)
      })
    }
  }, [])

  const removeAlly = useCallback((uid) => {
    window.NativeAllies?.removeAlly(uid)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchResult(null)
    setSendStatus('')
  }, [])

  return {
    allies, pendingRequests, searchResult, searchLoading, sendStatus, loadingAllies,
    emailSuggestions, suggesting, answeredFor, suggestEmails,
    searchByEmail, sendRequest, respondRequest, removeAlly, clearSearch, setSendStatus,
  }
}
