/**
 * SimulationMatrix — the full-screen realm experience.
 * Entered from the portal in MapTab.
 * HUB tab: Digital Map (quest world) + World Map + Make Quest
 * SOCIAL tab: Ranks + Allies + Chat
 */
import { useState, useCallback, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import Header from '../shell/Header'
import RealmTabBar from '../shell/realmtabBar'
import { useAlliesBridge } from '../../hooks/useAlliesBridge'
import DigitalMapView from './DigitalMap'
import WorldMapView from './WorldMap'
import SideQuestsView from './SideQuestsView'
import PlayerProfileModal from './PlayerProfileModal'
import { fetchLeaderboard } from '../../lib/leaderboard'
import { formatDisplayName } from '../../lib/formatters'
import PremiumBadge from '../ui/PremiumBadge'

// ── SOCIAL: Allies ─────────────────────────────────────────────────────────────
function AlliesView({ playerData, onSelectPlayer }) {
  const uid = playerData?.uid || (() => { try { return localStorage.getItem('scl_uid') } catch { return null } })()
  const inviteLink = uid ? `${window.location.origin}${window.location.pathname}?ref=${uid}` : window.location.href
  const [copied, setCopied] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [showRemove, setShowRemove] = useState(null)
  const { allies, pendingRequests, searchResult, searchLoading, sendStatus, loadingAllies, searchByEmail, sendRequest, respondRequest, removeAlly, clearSearch } = useAlliesBridge()
  const color = '#00e5cc'

  function copyLink() {
    navigator.clipboard?.writeText(inviteLink)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2400) })
      .catch(() => { setCopied(false); alert('Copy failed — select and copy the link manually.') })
  }

  return (
    <div className="rm-allies-view">
      <div className="rm-panel">
        <div className="rm-panel-label" style={{ color }}>◈ INVITE AN ALLY</div>
        <div className="rm-panel-body">
          <div className="rm-invite-url">{inviteLink}</div>
          <div className="rm-invite-copy-wrap">
            <button className="rm-invite-copy" style={{ color, borderColor: color + '44' }} onClick={copyLink}>
              {copied ? '✓ COPIED' : 'COPY LINK'}
            </button>
          </div>
          <p className="rm-invite-hint">Share this link. When a seeker follows it and logs in, you'll be linked as allies.</p>
        </div>
      </div>
      <div className="rm-panel">
        <div className="rm-panel-label" style={{ color }}>◇ FIND SEEKER</div>
        <div className="rm-panel-body">
          <form className="rm-search-row" onSubmit={e => { e.preventDefault(); searchByEmail(searchEmail) }}>
            <input className="rm-search-input" type="email" placeholder="ally@email.com" value={searchEmail}
              onChange={e => { setSearchEmail(e.target.value); clearSearch() }} />
            <button className="rm-search-btn" type="submit" disabled={searchLoading} style={{ color, borderColor: color+'55' }}>
              {searchLoading ? '…' : 'FIND'}
            </button>
          </form>
          {searchResult === false && <div className="rm-search-empty">No seeker found.</div>}
          {searchResult?.uid && (
            <div className="rm-found-card">
              <div className="rm-found-name">{formatDisplayName(searchResult.name) || 'Unknown Seeker'}</div>
              <div className="rm-found-nums" style={{ color }}>
                {searchResult.cl && <span>CL {searchResult.cl}</span>}
                {searchResult.lp && <span>LP {searchResult.lp}</span>}
              </div>
              {sendStatus === 'sent' ? <div className="rm-send-ok">✓ Request sent!</div> : sendStatus && sendStatus !== 'sending' ? <div className="rm-send-err">{sendStatus}</div> : null}
              {sendStatus !== 'sent' && <button className="rm-send-btn" disabled={sendStatus === 'sending'} style={{ color, borderColor: color+'55' }} onClick={() => sendRequest(searchResult.uid)}>{sendStatus === 'sending' ? '…SENDING' : '⚔ SEND ALLY REQUEST'}</button>}
            </div>
          )}
        </div>
      </div>
      {pendingRequests.length > 0 && (
        <div className="rm-panel">
          <div className="rm-panel-label" style={{ color: '#f0c060' }}>⏳ PENDING ({pendingRequests.length})</div>
          <div className="rm-panel-body">
            {pendingRequests.map(r => (
              <div key={r.uid} className="rm-ally-card">
                <div className="rm-ally-name">{formatDisplayName(r.name) || 'Unknown'}</div>
                <div className="rm-ally-actions">
                  <button className="rm-ally-accept" style={{ color }} onClick={() => respondRequest(r.uid, true)}>✓ ACCEPT</button>
                  <button className="rm-ally-decline" onClick={() => respondRequest(r.uid, false)}>✕ DECLINE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="rm-panel">
        <div className="rm-panel-label">YOUR ALLIES {allies.length > 0 && <span>({allies.length})</span>}</div>
        <div className="rm-panel-body">
          {loadingAllies && <div className="rm-empty">Loading…</div>}
          {!loadingAllies && allies.length === 0 && <div className="rm-empty">No allies yet.</div>}
          {allies.map(a => (
            <div key={a.uid} className="rm-ally-card" onClick={() => onSelectPlayer(a)} style={{ cursor: 'pointer' }}>
              <div className="rm-ally-top">
                <div className="rm-ally-name">
                  {formatDisplayName(a.name) || 'Unknown'}
                  {a.isPremium && <PremiumBadge size="sm" />}
                </div>
                {showRemove !== a.uid
                  ? <button className="rm-ally-remove" onClick={() => setShowRemove(a.uid)}>✕</button>
                  : <div className="rm-remove-confirm">
                      <span>Remove?</span>
                      <button onClick={() => { removeAlly(a.uid); setShowRemove(null) }}>YES</button>
                      <button onClick={() => setShowRemove(null)}>NO</button>
                    </div>
                }
              </div>
              <div className="rm-ally-nums" style={{ color }}>
                {a.cl && <span>CL {a.cl}</span>}
                {a.lp && <span>LP {a.lp}</span>}
                {a.ex && <span>EX {a.ex}</span>}
              </div>
              {a.reputation && a.reputation.ratingCount > 0 && (
                <div className="rm-ally-rep">
                  ⭐ {(a.reputation.totalRating / a.reputation.ratingCount).toFixed(1)}
                  <span className="rm-ally-rep-count"> ({a.reputation.ratingCount})</span>
                </div>
              )}
              {a.takerReputation && a.takerReputation.ratingCount > 0 && (
                <div className="rm-ally-rep rm-ally-rep--taker">
                  ⭐ {(a.takerReputation.totalRating / a.takerReputation.ratingCount).toFixed(1)} seeker
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── SOCIAL: Leaderboard ──────────────────────────────────────────────────────
function LeaderboardView({ playerData, onSelectPlayer }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const color = '#f0c060'
  const name  = playerData?.name || 'SEEKER'

  useEffect(() => {
    const loadLB = async () => {
      setLoading(true)
      const data = await fetchLeaderboard()
      setLeaderboard(data)
      setLoading(false)
    }
    loadLB()
  }, [])

  const playerRank = leaderboard.find(p => p.uid === playerData?.uid)

  return (
    <div className="rm-ranks-view">
      <div className="rm-panel">
        <div className="rm-panel-label" style={{ color }}>◈ YOUR STANDING</div>
        <div className="rm-panel-body">
          <div className="rm-rank-player-name">{name.toUpperCase()}</div>
          {playerRank ? (
            <>
              <div className="rm-rank-nums" style={{ color }}>
                <span>#{playerRank.rank}</span>
              </div>
              <div className="rm-rank-nums" style={{ color: '#aaa', fontSize: 11 }}>
                {playerData?.cl && <span>CL {playerData.cl.root}</span>}
                {playerData?.lp && <span>  LP {playerData.lp.root}</span>}
                {playerData?.ex && <span>  EX {playerData.ex.root}</span>}
              </div>
              <div className="rm-rank-score" style={{ color: '#999', fontSize: 10, marginTop: 6 }}>
                Score: {playerRank.totalScore}
              </div>
            </>
          ) : !loading ? (
            <div style={{ fontSize: 11, color: '#8f9db3', marginTop: 8 }}>Not ranked yet — complete quests to climb the leaderboard.</div>
          ) : null}
        </div>
      </div>
      <div className="rm-panel">
        <div className="rm-panel-label">◈ TOP PLAYERS</div>
        <div className="rm-panel-body">
          {loading ? (
            <div className="rm-empty" style={{ fontSize: 12, padding: '16px 0' }}>Loading leaderboard…</div>
          ) : leaderboard.length === 0 ? (
            <div className="rm-empty" style={{ fontSize: 12, padding: '16px 0' }}>No ranked players yet.</div>
          ) : (
            <div className="rm-leaderboard-rows">
              {leaderboard.slice(0, 10).map((p, i) => (
                <div
                  key={p.uid}
                  className="rm-leaderboard-row"
                  onClick={() => onSelectPlayer(p)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="rm-lb-rank">#{p.rank}</div>
                  <div className="rm-lb-name">{formatDisplayName(p.name) || 'Unknown'}</div>
                  <div className="rm-lb-score">{p.totalScore}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SOCIAL: Chat (coming soon) ─────────────────────────────────────────────
function ChatView({ onGoToAllies }) {
  return (
    <div className="rm-chat-view">
      <div className="rm-panel" style={{ margin: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <div className="rm-panel-label">⚡ ALLY CHAT</div>
        <div className="rm-panel-body rm-empty" style={{ fontSize: 12, padding: '24px 16px', textAlign: 'center' }}>
          <p>Coming soon — chat with your confirmed allies.</p>
          <button type="button" className="rm-chat-allies-link" onClick={onGoToAllies}>
            Find allies in the Allies tab →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SimulationMatrix shell ────────────────────────────────────────────────────
export default function SimulationMatrix({ onExit }) {
  const { playerData } = useAppState()
  const [mainTab, setMainTab]   = useState('hub')
  const [hubSub, setHubSub]     = useState('digital')
  const [socialSub, setSocialSub] = useState('leaderboard')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showRealmCoach, setShowRealmCoach] = useState(() => {
    try { return localStorage.getItem('scl_realm_coach_seen') !== '1' } catch { return true }
  })

  function dismissRealmCoach() {
    try { localStorage.setItem('scl_realm_coach_seen', '1') } catch { /* ignore */ }
    setShowRealmCoach(false)
  }

  const handleTabChange = useCallback((tab) => {
    // Any main-app tab triggers exit from the realm
    if (tab === 'home' || tab === 'quests' || tab === 'map' || tab === 'profile' || tab === 'config') {
      onExit()
    } else {
      setMainTab(tab)
    }
  }, [onExit])

  return (
    <div className="simulation-matrix">
      {showRealmCoach && (
        <div className="realm-coach-mark" role="note">
          <p><strong>Simulation Matrix</strong> — HUB has maps & quests; SOCIAL has allies & ranks. Tap <strong>Exit to Map</strong> below to return.</p>
          <button type="button" onClick={dismissRealmCoach} aria-label="Dismiss">✕</button>
        </div>
      )}
      <Header onTabChange={handleTabChange} hidden />
      <RealmTabBar
        mainTab={mainTab} setMainTab={setMainTab}
        hubSub={hubSub} setHubSub={setHubSub}
        socialSub={socialSub} setSocialSub={setSocialSub}
        onExit={onExit}
      />

      {/* Content area */}
      <div className="sm-content">
        {mainTab === 'hub' && hubSub === 'digital' && <DigitalMapView playerData={playerData} />}
        {mainTab === 'hub' && hubSub === 'world' && <WorldMapView playerData={playerData} />}
        {mainTab === 'hub' && hubSub === 'side' && <SideQuestsView />}
        {mainTab === 'social' && socialSub === 'allies' && <AlliesView playerData={playerData} onSelectPlayer={setSelectedPlayer} />}
        {mainTab === 'social' && socialSub === 'leaderboard' && <LeaderboardView playerData={playerData} onSelectPlayer={setSelectedPlayer} />}
        {mainTab === 'social' && socialSub === 'chat' && (
          <ChatView onGoToAllies={() => { setMainTab('social'); setSocialSub('allies') }} />
        )}
      </div>

      {selectedPlayer && <PlayerProfileModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  )
}
