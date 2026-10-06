/**
 * SimulationMatrix — the full-screen realm experience.
 * Entered from the portal in MapTab.
 * HUB tab: Side Quests (default) + World Map + Digital Map
 * SOCIAL tab: Ranks + Allies + Chat
 * Quest creation lives on the World Map (Make Quest tab removed).
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
import CharacterDossier from '../character/CharacterDossier'
import { usePublicProfile } from '../../hooks/usePublicProfile'

function AllyDossier({ seed, actions, onOpen }) {
  const { profile } = usePublicProfile(seed)
  return (
    <CharacterDossier
      shell
      compact
      profile={profile}
      actions={actions}
      onClick={onOpen ? () => onOpen(profile) : undefined}
    />
  )
}

// ── SOCIAL: Allies ─────────────────────────────────────────────────────────────
function AlliesView({ playerData, onSelectPlayer }) {
  const uid = playerData?.uid || (() => { try { return localStorage.getItem('scl_uid') } catch { return null } })()
  const inviteLink = uid ? `${window.location.origin}${window.location.pathname}?ref=${uid}` : window.location.href
  const [copied, setCopied] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestIndex, setSuggestIndex] = useState(0)
  const [showRemove, setShowRemove] = useState(null)
  const { allies, pendingRequests, searchResult, searchLoading, sendStatus, loadingAllies, emailSuggestions, suggesting, answeredFor, suggestEmails, searchByEmail, sendRequest, respondRequest, removeAlly, clearSearch } = useAlliesBridge()
  const color = '#00e5cc'

  useEffect(() => {
    const q = searchEmail.trim()
    if (q.length < 2) return undefined
    const id = setTimeout(() => suggestEmails(q), 280)
    return () => clearTimeout(id)
  }, [searchEmail, suggestEmails])

  const suggestPending = searchEmail.trim().length >= 2
    && (suggesting || answeredFor !== searchEmail.trim().toLowerCase())

  const activeSuggest = emailSuggestions.length
    ? Math.min(suggestIndex, emailSuggestions.length - 1)
    : -1

  function pickSuggestion(row) {
    setSearchEmail(row.email)
    setSuggestOpen(false)
    searchByEmail(row.email)
  }

  function onSearchKeyDown(e) {
    if (!suggestOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggestIndex(i => Math.min(i + 1, Math.max(emailSuggestions.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggestIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setSuggestOpen(false)
    } else if (e.key === 'Enter' && emailSuggestions[activeSuggest]) {
      e.preventDefault()
      pickSuggestion(emailSuggestions[activeSuggest])
    }
  }

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
          <p className="rm-invite-hint">Share this link. When a seeker follows it and finishes their character, you'll get an ally request.</p>
        </div>
      </div>
      <div className="rm-panel">
        <div className="rm-panel-label" style={{ color }}>◇ FIND SEEKER</div>
        <div className="rm-panel-body">
          <form className="rm-search-row" onSubmit={e => { e.preventDefault(); setSuggestOpen(false); searchByEmail(searchEmail) }}>
            <div className="rm-search-field">
              <input
                className="rm-search-input"
                type="email"
                placeholder="ally@email.com"
                value={searchEmail}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestOpen}
                aria-controls="rm-email-suggest"
                aria-autocomplete="list"
                onChange={e => {
                  const next = e.target.value
                  setSearchEmail(next)
                  setSuggestIndex(0)
                  setSuggestOpen(next.trim().length >= 2)
                  clearSearch()
                }}
                onFocus={() => { if (searchEmail.trim().length >= 2) setSuggestOpen(true) }}
                onBlur={() => { setTimeout(() => setSuggestOpen(false), 160) }}
                onKeyDown={onSearchKeyDown}
              />
              {suggestOpen && (
                <ul id="rm-email-suggest" className="rm-email-suggest" role="listbox">
                  {suggestPending && emailSuggestions.length === 0 && (
                    <li className="rm-email-suggest-status">Searching emails…</li>
                  )}
                  {!suggestPending && emailSuggestions.length === 0 && (
                    <li className="rm-email-suggest-status">No matching emails</li>
                  )}
                  {emailSuggestions.map((row, i) => (
                    <li key={row.uid}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === activeSuggest}
                        className={`rm-email-suggest-opt${i === activeSuggest ? ' active' : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => pickSuggestion(row)}
                      >
                        <span className="rm-email-suggest-email">{row.email}</span>
                        {row.name && <span className="rm-email-suggest-name">{formatDisplayName(row.name)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="rm-search-btn" type="submit" disabled={searchLoading} style={{ color, borderColor: color+'55' }}>
              {searchLoading ? '…' : 'FIND'}
            </button>
          </form>
          {searchResult === false && <div className="rm-search-empty">No seeker found.</div>}
          {searchResult?.uid && (
            <AllyDossier
              seed={searchResult}
              actions={(
                <>
                  {sendStatus === 'sent' ? <div className="rm-send-ok">✓ Request sent!</div> : sendStatus && sendStatus !== 'sending' ? <div className="rm-send-err">{sendStatus}</div> : null}
                  {sendStatus !== 'sent' && (
                    <button className="rm-send-btn" disabled={sendStatus === 'sending'} style={{ color, borderColor: color + '55' }} onClick={() => sendRequest(searchResult.uid)}>
                      {sendStatus === 'sending' ? '…SENDING' : '⚔ SEND ALLY REQUEST'}
                    </button>
                  )}
                </>
              )}
            />
          )}
        </div>
      </div>
      {pendingRequests.length > 0 && (
        <div className="rm-panel">
          <div className="rm-panel-label" style={{ color: '#f0c060' }}>⏳ PENDING ({pendingRequests.length})</div>
          <div className="rm-panel-body">
            {pendingRequests.map(r => (
              <AllyDossier
                key={r.uid}
                seed={r}
                actions={(
                  <div className="rm-ally-actions">
                    <button className="rm-ally-accept" style={{ color }} onClick={() => respondRequest(r.uid, true)}>✓ ACCEPT</button>
                    <button className="rm-ally-decline" onClick={() => respondRequest(r.uid, false)}>✕ DECLINE</button>
                  </div>
                )}
              />
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
            <AllyDossier
              key={a.uid}
              seed={a}
              onOpen={onSelectPlayer}
              actions={showRemove === a.uid ? (
                <div className="rm-remove-confirm">
                  <span>Remove?</span>
                  <button type="button" onClick={() => { removeAlly(a.uid); setShowRemove(null) }}>YES</button>
                  <button type="button" onClick={() => setShowRemove(null)}>NO</button>
                </div>
              ) : (
                <button type="button" className="rm-ally-remove" onClick={() => setShowRemove(a.uid)}>REMOVE</button>
              )}
            />
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
              {leaderboard.slice(0, 10).map((p) => (
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
        <div className="rm-panel-label">⚡ ALLY CHAT · SOON</div>
        <div className="rm-panel-body rm-empty" style={{ fontSize: 12, padding: '24px 16px', textAlign: 'center' }}>
          <p>Ally chat is not live yet. Use Allies to invite and connect for now.</p>
          <button type="button" className="rm-chat-allies-link" onClick={onGoToAllies}>
            Find allies in the Allies tab →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SimulationMatrix shell ────────────────────────────────────────────────────
export default function SimulationMatrix({ onExit, inline = false }) {
  const { playerData } = useAppState()
  const [mainTab, setMainTab]   = useState('hub')
  const [hubSub, setHubSub]     = useState('side')
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
    <div className={`simulation-matrix${inline ? ' simulation-matrix--inline' : ''}`}>
      {showRealmCoach && (
        <div className="realm-coach-mark" role="note">
          <p><strong>Realm</strong> — HUB has maps &amp; side quests; SOCIAL has allies &amp; ranks. Tap <strong>Exit Realm</strong> below to return.</p>
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
        {mainTab === 'hub' && hubSub === 'world' && (
          <WorldMapView
            playerData={playerData}
            onOpenSideQuests={() => setHubSub('side')}
          />
        )}
        {mainTab === 'hub' && hubSub === 'side' && (
          <SideQuestsView onOpenWorldMap={() => setHubSub('world')} />
        )}
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
