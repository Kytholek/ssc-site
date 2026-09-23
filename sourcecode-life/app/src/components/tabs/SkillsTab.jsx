/**
 * SkillsTab (rendered as the PROFILE tab)
 *
 * Sub-tabs: STATS | SKILLS | BLUEPRINT | SPIRAL
 */
import { useState, useEffect } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import InnateSkills from '../skilltree/InnateSkills.jsx'
import StatsTab from '../datachunks/StatsTab'
import NumerologySpiral from '../spirals/NumerologySpiral'
import PremiumLockOverlay from '../ui/PremiumLockOverlay'
import PurposeFlow from '../flow/PurposeFlow'
import IdentityFlow from '../flow/IdentityFlow'
import LessonsFlow from '../flow/LessonsFlow'

const PROFILE_TABS = [
  { id: 'stats',     label: '◈ STATS'     },
  { id: 'skills',    label: '◇ SKILLS'    },
  { id: 'blueprint', label: '◈ BLUEPRINT' },
  { id: 'spiral',    label: '◎ SPIRAL'    },
]

const BLUEPRINT_TABS = [
  { id: 'lessons',  label: '◇ LESSONS',  thesis: 'What this life is here to learn and leave.' },
  { id: 'identity', label: '◈ IDENTITY', thesis: 'The frequencies that shape how you move through the world.' },
  { id: 'purpose',  label: '✦ PURPOSE',  thesis: 'The road, the signal, and the call.' },
]

function BlueprintSection() {
  const { playerData } = useAppState()
  const [subTab, setSubTab] = useState('lessons')
  const activeTab = BLUEPRINT_TABS.find((t) => t.id === subTab) || BLUEPRINT_TABS[0]

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
        <p className="blueprint-thesis">{activeTab.thesis}</p>
        <div className="blueprint-stage-body">
          {subTab === 'lessons'  && <LessonsFlow  playerData={playerData} />}
          {subTab === 'identity' && <IdentityFlow playerData={playerData} />}
          {subTab === 'purpose'  && <PurposeFlow  playerData={playerData} />}
        </div>
      </div>
    </PremiumLockOverlay>
  )
}

export default function SkillsTab() {
  const { playerData, tabSection } = useAppState()
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState(() =>
    PROFILE_TABS.some((t) => t.id === tabSection) ? tabSection : 'stats'
  )
  const [prevTabSection, setPrevTabSection] = useState(tabSection)

  if (tabSection !== prevTabSection) {
    setPrevTabSection(tabSection)
    if (PROFILE_TABS.some(t => t.id === tabSection)) {
      setTab(tabSection)
    }
  }

  useEffect(() => {
    if (PROFILE_TABS.some(t => t.id === tabSection)) {
      dispatch({ type: 'CLEAR_TAB_SECTION' })
    }
  }, [tabSection, dispatch])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  // Listen for sub-tab deep links (legacy custom events)
  useEffect(() => {
    const handleSubTab = (e) => {
      if (e.detail.main === 'profile' && PROFILE_TABS.some(t => t.id === e.detail.sub)) {
        setTab(e.detail.sub)
      }
    }
    window.addEventListener('scl:open-sub-tab', handleSubTab)
    return () => window.removeEventListener('scl:open-sub-tab', handleSubTab)
  }, [])

  // Deep link from hash (#blueprint)
  useEffect(() => {
    if (window.location.hash === '#blueprint') {
      setTab('blueprint')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  if (!playerData) {
    return (
      <div className="tab-placeholder">
        <p className="tab-placeholder-text">No character data found.</p>
      </div>
    )
  }

  const isBlueprint = tab === 'blueprint'
  const isSpiral = tab === 'spiral'

  return (
    <div className={`tab-panel-content${isBlueprint ? ' tab-panel-content--blueprint' : ''}${isSpiral ? ' tab-panel-content--spiral' : ''}`}>
      <div className="profile-navbar" role="tablist">
        {PROFILE_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`profile-navbar-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats'     && <StatsTab playerData={playerData} />}
      {tab === 'skills'    && <InnateSkills playerData={playerData} />}
      {isBlueprint         && <div className="blueprint-panel-slot"><BlueprintSection /></div>}
      {isSpiral && (
        <div className="spiral-panel-slot">
          <PremiumLockOverlay feature="Numerology Spiral — Time Spiral visualization">
            <NumerologySpiral />
          </PremiumLockOverlay>
        </div>
      )}
    </div>
  )
}
