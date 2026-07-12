/**
 * ProfileTab (now rendered as the CONFIG tab)
 *
 * Navbar: BLUEPRINT / INSIGHTS / SETTINGS
 */
import { useState, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import SettingsTab from '../datachunks/SettingsTab'
import QuestCompletionChart from '../charts/QuestCompletionChart'
import InsightsSummary from '../charts/InsightsSummary'
import PolarityStatCard from '../charts/PolarityStatCard'
import LifeQuestRoadmap from '../charts/LifeQuestRoadmap'
import PremiumLockOverlay from '../ui/PremiumLockOverlay'

// ── Blueprint section ────────────────────────────────────────────────────────
import PurposeFlow from '../flow/PurposeFlow'
import IdentityFlow from '../flow/IdentityFlow'
import LessonsFlow from '../flow/LessonsFlow'

const BLUEPRINT_TABS = [
  { id: 'lessons',  label: '◇ LESSONS'  },
  { id: 'identity', label: '◈ IDENTITY' },
  { id: 'purpose',  label: '✦ PURPOSE'  },
]

function BlueprintSection() {
  const { playerData } = useAppState()
  const [subTab, setSubTab] = useState('lessons')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [subTab])

  return (
    <PremiumLockOverlay feature="Full Blueprint — complete shadow + integration readings">
      <div className="blueprint-section">
        <div className="blueprint-sub-tabs">
          {BLUEPRINT_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`blueprint-sub-tab${subTab === tab.id ? ' active' : ''}`}
              onClick={() => setSubTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {subTab === 'lessons'  && <LessonsFlow  playerData={playerData} />}
        {subTab === 'identity' && <IdentityFlow playerData={playerData} />}
        {subTab === 'purpose'  && <PurposeFlow  playerData={playerData} />}
      </div>
    </PremiumLockOverlay>
  )
}

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

// ── Config navbar ────────────────────────────────────────────────────────────
const CONFIG_SECTIONS = [
  { id: 'blueprint', label: '◈ BLUEPRINT' },
  { id: 'insights',  label: '◈ INSIGHTS'  },
  { id: 'settings',  label: '⚙ SETTINGS'  },
]

export default function ProfileTab() {
  const [section, setSection] = useState('blueprint')

  // Deep link to blueprint from other tabs
  useEffect(() => {
    if (window.location.hash === '#blueprint') {
      setSection('blueprint')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

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

  const isBlueprint = section === 'blueprint'
  return (
    <div className={`tab-panel-content${isBlueprint ? ' tab-panel-content--blueprint' : ''}`}>
      {/* Segmented control navbar */}
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

      {isBlueprint         && <BlueprintSection />}
      {section === 'insights'  && <InsightsSection />}
      {section === 'settings'  && <SettingsTab />}
    </div>
  )
}
