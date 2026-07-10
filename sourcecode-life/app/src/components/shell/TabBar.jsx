/**
 * TabBar — Home / Quests / [Portal Map] / Stats / Decode
 */
import { useAppState } from '../../context/AppContext'

const SIDE_LEFT = [
  { id: 'home',   icon: '◈', label: 'HOME',   tourId: null },
  { id: 'quests', icon: '⚔', label: 'QUESTS', tourId: 'tab-quests' },
]

const MAP_TAB = { id: 'map', label: 'MAP', tourId: 'tab-map' }

const SIDE_RIGHT = [
  { id: 'profile', icon: '◇', label: 'STATS',  tourId: 'tab-stats' },
  { id: 'config',  icon: '⚙', label: 'DECODE', tourId: 'tab-decode' },
]

function SideTab({ tab, activeTab, onTabChange }) {
  const isActive = activeTab === tab.id
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      aria-label={tab.label}
      className={`tab-btn tab-btn--side${isActive ? ' active' : ''}`}
      data-tour={tab.tourId || undefined}
      onClick={() => onTabChange(tab.id)}
    >
      <span className="tab-btn-icon" aria-hidden="true">{tab.icon}</span>
      <span className="tab-btn-label">{tab.label}</span>
    </button>
  )
}

export default function TabBar({ onTabChange }) {
  const { activeTab } = useAppState()
  const mapActive = activeTab === MAP_TAB.id

  return (
    <nav className="tab-bar tab-bar--portal" aria-label="Main navigation">
      <div className="tab-bar-side tab-bar-side--left">
        {SIDE_LEFT.map(tab => (
          <SideTab key={tab.id} tab={tab} activeTab={activeTab} onTabChange={onTabChange} />
        ))}
      </div>

      <div className={`tab-bar-portal-slot${mapActive ? ' active' : ''}`}>
        <button
          type="button"
          aria-current={mapActive ? 'page' : undefined}
          aria-label={`${MAP_TAB.label} — enter map portal`}
          className={`tab-portal-btn${mapActive ? ' active' : ''}`}
          data-tour={MAP_TAB.tourId}
          onClick={() => onTabChange(MAP_TAB.id)}
        >
          <span className="tab-portal-ring tab-portal-ring--outer" aria-hidden="true" />
          <span className="tab-portal-ring tab-portal-ring--inner" aria-hidden="true" />
          <span className="tab-portal-ripple" aria-hidden="true" />
          <span className="tab-portal-glyph" aria-hidden="true">◎</span>
        </button>
      </div>

      <div className="tab-bar-side tab-bar-side--right">
        {SIDE_RIGHT.map(tab => (
          <SideTab key={tab.id} tab={tab} activeTab={activeTab} onTabChange={onTabChange} />
        ))}
      </div>
    </nav>
  )
}
