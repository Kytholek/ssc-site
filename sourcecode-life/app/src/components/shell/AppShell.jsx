/**
 * AppShell — authenticated app wrapper with header, tabs, and navigation
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import Header from './Header'
import TabBar from './TabBar'
import Toast from '../ui/Toast'
import PremiumModal from '../ui/PremiumModal'
import SpotlightTour from '../onboarding/SpotlightTour'
import HomeTab   from '../tabs/home'
import QuestsTab from '../tabs/QuestsTab'
import MapTab    from '../tabs/MapTab'
import SkillsTab from '../tabs/SkillsTab'
import Profile   from '../tabs/profileTab'

const TABS = ['home', 'quests', 'map', 'profile', 'config']

const TAB_TITLES = {
  home: 'Home',
  quests: 'Quests',
  map: 'Map',
  profile: 'Stats',
  config: 'Decode',
}

export default function AppShell() {
  const { activeTab, showPremiumModal } = useAppState()
  const dispatch = useAppDispatch()
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const mainRef = useRef(null)
  const [tabAnnouncement, setTabAnnouncement] = useState('')

  const resetTabScroll = useCallback(() => {
    const mainEl = mainRef.current
    if (mainEl) {
      mainEl.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    requestAnimationFrame(() => {
      if (mainEl) mainEl.scrollTop = 0
      window.scrollTo(0, 0)
    })
  }, [])

  useEffect(() => {
    resetTabScroll()
    const label = TAB_TITLES[activeTab] || activeTab
    document.title = `${label} — Source Code: Life`
    setTabAnnouncement(`Now viewing ${label}`)
  }, [activeTab, resetTabScroll])

  useEffect(() => {
    window.Native_onOpenTab = (tab, subTab) => {
      const valid = new Set(TABS)
      if (valid.has(tab)) {
        dispatch({ type: 'SET_TAB', payload: tab })
        setTimeout(() => {
          if (subTab) {
            window.dispatchEvent(new CustomEvent('scl:open-sub-tab', {
              detail: { main: tab, sub: subTab },
            }))
          }
        }, 50)
      }
    }
    return () => { delete window.Native_onOpenTab }
  }, [dispatch])

  const switchToTab = useCallback((tab) => {
    dispatch({ type: 'SET_TAB', payload: tab })
  }, [dispatch])

  function handleTouchStart(e) {
    if (activeTab === 'map') return
    if (e.target.closest('.map-container-wrap')) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (activeTab === 'map') return
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const idx = TABS.indexOf(activeTab)
    if (dx < 0 && idx < TABS.length - 1) switchToTab(TABS[idx + 1])
    if (dx > 0 && idx > 0) switchToTab(TABS[idx - 1])
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{tabAnnouncement}</div>

      <Header onTabChange={switchToTab} />

      <main
        id="main-content"
        ref={mainRef}
        className="app-main"
        role="main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <TabPanel key={activeTab}>
          {activeTab === 'home'     && <HomeTab    />}
          {activeTab === 'quests'   && <QuestsTab  />}
          {activeTab === 'map'      && <MapTab     />}
          {activeTab === 'profile'  && <SkillsTab  />}
          {activeTab === 'config'   && <Profile    />}
        </TabPanel>
      </main>

      <TabBar onTabChange={switchToTab} />
      <SpotlightTour activeTab={activeTab} onTabChange={switchToTab} />
      <Toast />
      <PremiumModal open={showPremiumModal} onClose={() => dispatch({ type: 'CLOSE_PREMIUM_MODAL' })} />
    </div>
  )
}

function TabPanel({ children }) {
  return (
    <div className="sm-tab-panel">{children}</div>
  )
}
