/**
 * ProfileTab (rendered as the SETTINGS tab)
 *
 * Navbar: INSIGHTS / SETTINGS
 */
import { useState, useEffect } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useGameState } from '../../state/GameContext'
import SettingsTab from '../datachunks/SettingsTab'
import QuestCompletionChart from '../charts/QuestCompletionChart'
import InsightsSummary from '../charts/InsightsSummary'
import PolarityStatCard from '../charts/PolarityStatCard'
import LifeQuestRoadmap from '../charts/LifeQuestRoadmap'
import PremiumLockOverlay from '../ui/PremiumLockOverlay'
import CharacterGuidebookCta from '../ui/CharacterGuidebookCta'

function InsightsSection() {
  const { user } = useGameState()
  return (
    <>
      {!user?.isPremium && <InsightsSummary readingOnly />}
      <PremiumLockOverlay feature="Insights & Charts — how your strongest stat sits against your Life Path, and the life-quest roadmap">
        <div className="insights-section">
          <InsightsSummary />
          <PolarityStatCard />
          <QuestCompletionChart range={30} />
          <LifeQuestRoadmap />
        </div>
      </PremiumLockOverlay>
    </>
  )
}

const CONFIG_SECTIONS = [
  { id: 'insights', label: '◈ INSIGHTS' },
  { id: 'settings', label: '⚙ SETTINGS' },
]

export default function ProfileTab() {
  const { tabSection } = useAppState()
  const { user } = useGameState()
  const dispatch = useAppDispatch()
  const [section, setSection] = useState('insights')
  const [prevTabSection, setPrevTabSection] = useState(tabSection)

  if (tabSection !== prevTabSection) {
    setPrevTabSection(tabSection)
    if (CONFIG_SECTIONS.some(s => s.id === tabSection)) {
      setSection(tabSection)
    }
  }

  useEffect(() => {
    if (CONFIG_SECTIONS.some(s => s.id === tabSection)) {
      dispatch({ type: 'CLEAR_TAB_SECTION' })
    }
  }, [tabSection, dispatch])

  useEffect(() => {
    function handleOpenSubTab(e) {
      const { main, sub } = e.detail || {}
      if (main !== 'config') return
      if (CONFIG_SECTIONS.some(s => s.id === sub)) setSection(sub)
    }

    window.addEventListener('scl:open-sub-tab', handleOpenSubTab)
    return () => window.removeEventListener('scl:open-sub-tab', handleOpenSubTab)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [section])

  return (
    <div className="tab-panel-content">
      <div className="profile-navbar" role="tablist">
        {CONFIG_SECTIONS.map(s => (
          <button
            key={s.id}
            role="tab"
            aria-selected={section === s.id}
            className={`profile-navbar-btn${section === s.id ? ' active' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'insights' && user?.isPremium && (
        <div className="char-guidebook-cta-wrap">
          <CharacterGuidebookCta keep />
        </div>
      )}

      {section === 'insights' && <InsightsSection />}
      {section === 'settings' && <SettingsTab />}
    </div>
  )
}
