/**
 * SkillsTab (rendered as the PROFILE tab)
 *
 * Sub-tabs: STATS | SKILLS | SPIRAL
 */
import { useState, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import InnateSkills from '../skilltree/InnateSkills.jsx'
import StatsTab from '../datachunks/StatsTab'
import NumerologySpiral from '../spirals/NumerologySpiral'
import PremiumLockOverlay from '../ui/PremiumLockOverlay'

const PROFILE_TABS = [
  { id: 'stats',  label: '◈ STATS'  },
  { id: 'skills', label: '◇ SKILLS' },
  { id: 'spiral', label: '◎ SPIRAL' },
]

export default function SkillsTab() {
  const { playerData } = useAppState()
  const [tab, setTab] = useState('stats')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  // Listen for sub-tab deep links
  useEffect(() => {
    const handleSubTab = (e) => {
      if (e.detail.main === 'profile' && PROFILE_TABS.some(t => t.id === e.detail.sub)) {
        setTab(e.detail.sub)
      }
    }
    window.addEventListener('scl:open-sub-tab', handleSubTab)
    return () => window.removeEventListener('scl:open-sub-tab', handleSubTab)
  }, [])

  if (!playerData) {
    return (
      <div className="tab-placeholder">
        <p className="tab-placeholder-text">No character data found.</p>
      </div>
    )
  }

  return (
    <div className="tab-panel-content">
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

      {tab === 'skills' && <InnateSkills playerData={playerData} />}
      {tab === 'stats'  && <StatsTab playerData={playerData} />}
      {tab === 'spiral' && (
        <PremiumLockOverlay feature="Numerology Spiral — Time Spiral visualization">
          <NumerologySpiral playerData={playerData} />
        </PremiumLockOverlay>
      )}
    </div>
  )
}
