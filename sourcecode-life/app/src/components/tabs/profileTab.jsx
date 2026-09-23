/**
 * ProfileTab (now rendered as the CONFIG tab)
 *
 * Navbar: INSIGHTS / SETTINGS
 */
import { useState, useEffect } from 'react'
import SettingsTab from '../datachunks/SettingsTab'
import QuestCompletionChart from '../charts/QuestCompletionChart'
import InsightsSummary from '../charts/InsightsSummary'
import PolarityStatCard from '../charts/PolarityStatCard'
import LifeQuestRoadmap from '../charts/LifeQuestRoadmap'
import PremiumLockOverlay from '../ui/PremiumLockOverlay'
import CharacterGuidebookCta from '../ui/CharacterGuidebookCta'

function InsightsSection() {
  return (
    <PremiumLockOverlay feature="Insights & Charts — XP trends, polarity balance, and roadmap">
      <div className="insights-section">
        <InsightsSummary />
        <PolarityStatCard />
        <QuestCompletionChart range={30} />
        <LifeQuestRoadmap />
      </div>
    </PremiumLockOverlay>
  )
}

const CONFIG_SECTIONS = [
  { id: 'insights', label: '◈ INSIGHTS' },
  { id: 'settings', label: '⚙ SETTINGS' },
]

export default function ProfileTab() {
  const [section, setSection] = useState('insights')

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

      <div className="char-guidebook-cta-wrap">
        <CharacterGuidebookCta />
      </div>

      {section === 'insights' && <InsightsSection />}
      {section === 'settings' && <SettingsTab />}
    </div>
  )
}
