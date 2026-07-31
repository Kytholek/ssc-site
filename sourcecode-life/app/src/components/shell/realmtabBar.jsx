/**
 * RealmTabBar — reusable tab bar for SimulationMatrix shell.
 *
 * Props:
 *   mainTab       – current main tab ("hub" | "social")
 *   setMainTab    – setter for main tab
 *   hubSub        – current hub sub-tab
 *   setHubSub     – setter for hub sub-tab
 *   socialSub     – current social sub-tab
 *   setSocialSub  – setter for social sub-tab
 *   onExit        – called when the center ◈ button is pressed
 */
export default function RealmTabBar({
  mainTab, setMainTab,
  hubSub, setHubSub,
  socialSub, setSocialSub,
  onExit,
}) {
  return (
    <>
      {/* ── Sub-tabs (top) ─────────────────────────────────── */}
      {mainTab === 'hub' && (
        <div className="sm-sub-toggle" role="tablist" aria-label="Hub sub-tabs">
          {['world', 'side', 'digital'].map(key => (
            <button
              key={key}
              className={`sm-sub-btn${hubSub === key ? ' active' : ''}`}
              role="tab"
              aria-selected={hubSub === key}
              tabIndex={hubSub === key ? 0 : -1}
              onClick={() => setHubSub(key)}
            >
              {{ world: 'World Map', side: 'Side Quests', digital: 'Digital Map' }[key]}
            </button>
          ))}
        </div>
      )}

      {mainTab === 'social' && (
        <div className="sm-sub-toggle" role="tablist" aria-label="Social sub-tabs">
          {['allies', 'leaderboard', 'chat'].map(key => (
            <button
              key={key}
              className={`sm-sub-btn${socialSub === key ? ' active' : ''}`}
              role="tab"
              aria-selected={socialSub === key}
              tabIndex={socialSub === key ? 0 : -1}
              onClick={() => setSocialSub(key)}
            >
              {{ allies: 'Allies', leaderboard: 'Leaderboard', chat: 'Chat' }[key]}
            </button>
          ))}
        </div>
      )}

      {/* ── Main tab bar (bottom) ──────────────────────────── */}
      <nav
        className="sm-tab-bar"
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000, paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main tab bar"
      >
        <button
          className={`sm-tab-btn${mainTab === 'hub' ? ' active' : ''}`}
          aria-current={mainTab === 'hub' ? 'page' : undefined}
          onClick={() => setMainTab('hub')}
        >
          <span className="sm-tab-icon" aria-hidden>🗺</span> HUB
        </button>
        <button
          className="sm-tab-btn center-btn"
          aria-label="Exit to Map"
          onClick={onExit}
        >
          <span className="sm-tab-icon" aria-hidden>◈</span>
          <span className="sm-tab-exit-label">Exit to Map</span>
        </button>
        <button
          className={`sm-tab-btn${mainTab === 'social' ? ' active' : ''}`}
          aria-current={mainTab === 'social' ? 'page' : undefined}
          onClick={() => setMainTab('social')}
        >
          <span className="sm-tab-icon" aria-hidden>⚔</span> SOCIAL
        </button>
      </nav>
    </>
  )
}
