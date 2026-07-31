import { useState, useEffect, useMemo } from 'react'
import { buildAvatarPixels, loadAvatar } from '../../lib/avatarParts'
import { acceptQuest as qeAcceptQuest, getDailyQuestState, getAcceptedQuests } from '../../lib/questEngine'
import { getGeneratedQuests, ensureDailyQuests } from '../../lib/numerologyQuests'
import { fetchAllWorldQuests } from '../auth/firestoreprofile'
import { formatDisplayName } from '../../lib/formatters'
import { useAppDispatch } from '../../context/AppContext'
import { useGameDispatch } from '../../state/GameContext'
import { ACTIONS } from '../../state/actions'
import { QUEST_TYPES, loadQuests, saveQuests } from './sidequestHelpers'

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_ALLIES          = 'scl_allies'
const LS_ACCEPTED_QUESTS = 'scl_accepted_quests'

const QUEST_TYPE_MAP = Object.fromEntries(QUEST_TYPES.map(t => [t.key, t]))

/** Map life-quest node keys → overworld regions */
const LIFE_KEY_REGION = {
  lp: 'forge',
  ac: 'forge',
  ex: 'loom',
  cl: 'wilds',
  so: 'sanctum',
  ou: 'guildhall',
  th: 'oracle',
}

const SOURCE_REGION = {
  skill: 'forge',
  skilltree: 'forge',
  life: 'sanctum',
  objective: 'sanctum',
  cycle: 'oracle',
  current: 'oracle',
  daily: 'wilds',
}

const SOURCE_TO_TYPE = {
  skill: 'achievement',
  skilltree: 'achievement',
  life: 'healing',
  objective: 'healing',
  current: 'reflection',
  cycle: 'reflection',
  daily: 'exploration',
}

function getNodeColor(questTypes) {
  if (!questTypes || questTypes.length === 0) return '#00e5cc'
  const type = QUEST_TYPE_MAP[questTypes[0]]
  return type?.color || '#00e5cc'
}

const REALM_REGIONS = [
  { id: 'guildhall', title: 'Guildhall',     icon: '⚔', x: '18%', y: '26%', desc: 'Allies, invites, and social quests gather here.',          questTypes: ['connection']  },
  { id: 'wilds',     title: 'Starwilds',     icon: '✦', x: '50%', y: '14%', desc: 'Exploration threads and wandering encounters.',             questTypes: ['exploration'] },
  { id: 'forge',     title: 'Iron Forge',    icon: '▲', x: '80%', y: '28%', desc: 'Achievement quests, skill trials, and mastery work.',       questTypes: ['achievement'] },
  { id: 'sanctum',   title: 'Heart Sanctum', icon: '✚', x: '82%', y: '70%', desc: 'Healing arcs and unfinished life-quest objectives.',        questTypes: ['healing']    },
  { id: 'loom',      title: 'Story Loom',    icon: '◈', x: '50%', y: '82%', desc: 'Creation paths, expression, and story threads.',            questTypes: ['creation']   },
  { id: 'oracle',    title: 'Mirror Oracle', icon: '◇', x: '18%', y: '70%', desc: 'Reflection, cycle quests, and today’s frequency signal.',   questTypes: ['reflection'] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadAllies()   { try { return JSON.parse(localStorage.getItem(LS_ALLIES)           || '[]') } catch { return [] } }
function loadAccepted() { try { return JSON.parse(localStorage.getItem(LS_ACCEPTED_QUESTS) || '{}') } catch { return {} } }

function hashIndex(seed, modulo) {
  const str = String(seed || 'seed')
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return modulo ? hash % modulo : 0
}

function regionForWorldQuest(quest) {
  const direct = REALM_REGIONS.find(r => r.questTypes.includes(quest.type))
  if (direct) return direct.id
  return REALM_REGIONS[hashIndex(quest.id || quest.name, REALM_REGIONS.length)].id
}

function regionForAlly(ally, index) {
  return REALM_REGIONS[hashIndex(ally?.uid || ally?.name || index, REALM_REGIONS.length)].id
}

function regionForPersonalQuest(quest) {
  if (quest.lqpMeta?.questKey && LIFE_KEY_REGION[quest.lqpMeta.questKey]) {
    return LIFE_KEY_REGION[quest.lqpMeta.questKey]
  }
  return SOURCE_REGION[quest.source] || SOURCE_REGION[quest.type] || 'oracle'
}

/** Unfinished generated dailies + personal-day quest as overworld “sanctum drops”. */
function buildPersonalDrops(playerData) {
  if (!playerData) return []
  ensureDailyQuests(playerData)
  const gen = getGeneratedQuests()
  const drops = []

  for (const q of (gen?.quests || []).filter(q => !q.completed)) {
    const type = SOURCE_TO_TYPE[q.source] || SOURCE_TO_TYPE[q.type] || 'reflection'
    drops.push({
      id: q.id,
      name: q.title,
      description: [
        q.numberLabel,
        q.stageName,
        q.source === 'life' ? `Tier ${q.lqpMeta?.tier || 1}` : null,
        q.source === 'current' || q.source === 'cycle' ? (q.cycleType || 'cycle') : null,
      ].filter(Boolean).join(' · ') || 'Today’s thread',
      type,
      regionId: regionForPersonalQuest(q),
      origin: 'personal',
      source: q.source || q.type,
      rewardNum: q.rewardXP ? `+${q.rewardXP}` : null,
      playerName: 'You',
      uid: playerData?.uid || 'me',
    })
  }

  const daily = getDailyQuestState()
  if (daily && !daily.completed) {
    drops.push({
      id: `daily-freq-${daily.date}`,
      name: daily.dayObj || daily.body || 'Live today’s personal frequency',
      description: daily.blueprintLabel || 'Personal Day alignment',
      type: 'reflection',
      regionId: 'oracle',
      origin: 'personal',
      source: 'daily',
      rewardNum: daily.xpAward ? `+${daily.xpAward}` : null,
      playerName: 'You',
      uid: playerData?.uid || 'me',
    })
  }

  return drops
}

// ── Avatar Sigil ──────────────────────────────────────────────────────────────
function AvatarSigil({ playerData }) {
  const [avatarConfig] = useState(() => loadAvatar())
  const pixels  = avatarConfig ? buildAvatarPixels(avatarConfig) : []
  const initials = (playerData?.name || 'SEEKER').slice(0, 2).toUpperCase()

  return (
    <div className="rm-hero-sigil">
      {pixels.length > 0
        ? (
            <svg viewBox="-1 -3 18 30" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ imageRendering: 'pixelated', display: 'block' }}>
              {pixels.map((pixel, i) => (
                <rect key={i} x={pixel.x} y={pixel.y} width={0.95} height={0.95} fill={pixel.c} />
              ))}
            </svg>
          )
        : <span className="rm-hero-initials">{initials}</span>}
    </div>
  )
}

// ── Digital Map ───────────────────────────────────────────────────────────────
export default function DigitalMapView({ playerData }) {
  const appDispatch  = useAppDispatch()
  const gameDispatch = useGameDispatch()
  const [quests, setQuests] = useState(() => loadQuests())
  const [personalDrops, setPersonalDrops] = useState(() => buildPersonalDrops(playerData))
  const [allies] = useState(() => loadAllies())
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState('guildhall')
  const myUid = playerData?.uid || playerData?.name || 'me'

  // Shared world-quest feed (same pool as World Map)
  useEffect(() => {
    let cancelled = false
    async function syncWorldQuests() {
      setLoading(true)
      try {
        const firestoreQuests = await fetchAllWorldQuests()
        if (cancelled) return
        if (firestoreQuests.length > 0) {
          setQuests(firestoreQuests)
          saveQuests(firestoreQuests)
        } else {
          setQuests(loadQuests())
        }
      } catch {
        if (!cancelled) setQuests(loadQuests())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    syncWorldQuests()
    return () => { cancelled = true }
  }, [])

  // Refresh personal sanctum drops when player data / daily state changes
  useEffect(() => {
    setPersonalDrops(buildPersonalDrops(playerData))
  }, [playerData])

  useEffect(() => {
    function refreshPersonal() {
      setPersonalDrops(buildPersonalDrops(playerData))
    }
    window.addEventListener('scl:gen_quests_updated', refreshPersonal)
    window.addEventListener('scl:daily_updated', refreshPersonal)
    return () => {
      window.removeEventListener('scl:gen_quests_updated', refreshPersonal)
      window.removeEventListener('scl:daily_updated', refreshPersonal)
    }
  }, [playerData])

  const questsByRegion = useMemo(() => {
    const acc = REALM_REGIONS.reduce((a, r) => { a[r.id] = []; return a }, {})
    quests.forEach(quest => {
      acc[regionForWorldQuest(quest)].push({ ...quest, origin: 'world' })
    })
    personalDrops.forEach(drop => {
      acc[drop.regionId]?.push(drop)
    })
    return acc
  }, [quests, personalDrops])

  // Prefer a region that has content on first paint after sync
  useEffect(() => {
    if (loading) return
    const currentCount = (questsByRegion[selectedRegion] || []).length
    if (currentCount > 0) return
    const withQuests = REALM_REGIONS.find(r => (questsByRegion[r.id] || []).length > 0)
    if (withQuests) setSelectedRegion(withQuests.id)
  }, [loading, questsByRegion, selectedRegion])

  const alliesByRegion = useMemo(() => {
    const acc = REALM_REGIONS.reduce((a, r) => { a[r.id] = []; return a }, {})
    allies.forEach((ally, i) => { acc[regionForAlly(ally, i)].push(ally) })
    return acc
  }, [allies])

  function handleAccept(questId) {
    const quest = quests.find(q => q.id === questId) || { id: questId }
    const result = qeAcceptQuest(quest)
    if (result?.ok !== false) {
      setQuests([...loadQuests()])
      gameDispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
    }
  }

  function openQuestsTab() {
    appDispatch({ type: 'SET_TAB', payload: 'quests' })
  }

  const activeRegion   = REALM_REGIONS.find(r => r.id === selectedRegion) || REALM_REGIONS[0]
  const regionQuests   = questsByRegion[activeRegion.id] || []
  const regionAllies   = alliesByRegion[activeRegion.id] || []
  const acceptedQuests = loadAccepted()
  const worldCount     = quests.length
  const personalCount  = personalDrops.length

  return (
    <div className="rm-digital-view rm-realm-view">
      <div className="rm-realm-banner rm-realm-banner--digital">
        <div className="rm-realm-banner-text">
          <div className="rm-realm-kicker">OVERWORLD</div>
          <div className="rm-realm-title">Digital Realm</div>
          <div className="rm-realm-copy">
            World beacons and today’s unfinished threads — same missions, mythic map.
          </div>
        </div>
        <div className="rm-realm-counts">
          <div className="rm-realm-count-pill">WORLD {worldCount}</div>
          <div className="rm-realm-count-pill">TODAY {personalCount}</div>
          <div className="rm-realm-count-pill">ALLIES {allies.length}</div>
        </div>
      </div>

      {loading && (
        <div className="rm-digital-sync">◎ Syncing beacons…</div>
      )}

      <div className="rm-realm-stage-wrap rm-realm-stage-wrap--digital">
        <div className="rm-digital-stage">
          <div className="rm-realm-aura rm-realm-aura-1" />
          <div className="rm-realm-aura rm-realm-aura-2" />
          <div className="rm-realm-path rm-realm-path-1" />
          <div className="rm-realm-path rm-realm-path-2" />
          <div className="rm-realm-path rm-realm-path-3" />

          {REALM_REGIONS.map(region => {
            const nodeColor = getNodeColor(region.questTypes)
            const hasQuests = (questsByRegion[region.id] || []).length > 0
            return (
              <button
                key={region.id}
                type="button"
                className={`rm-region-node${selectedRegion === region.id ? ' rm-region-node--selected' : ''}${hasQuests ? ' has-quests' : ''}`}
                style={{ left: region.x, top: region.y, '--node-color': nodeColor }}
                onClick={() => setSelectedRegion(region.id)}
              >
                <span className="rm-region-node-icon">{region.icon}</span>
                <span className="rm-region-node-label">{region.title}</span>
                {hasQuests && (
                  <span className="rm-region-node-count">{(questsByRegion[region.id] || []).length}</span>
                )}
              </button>
            )
          })}

          <div className="rm-realm-hero">
            <div className="rm-realm-hero-ring" />
            <AvatarSigil playerData={playerData} />
            <div className="rm-realm-hero-name">{formatDisplayName(playerData?.name || 'Seeker').toUpperCase()}</div>
            <div className="rm-realm-hero-stats">
              {playerData?.cl && <span>CL {playerData.cl.root}</span>}
              {playerData?.lp && <span>LP {playerData.lp.root}</span>}
              {playerData?.ex && <span>EX {playerData.ex.root}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Quests first (full width), Future Gate de-emphasized below */}
      <div className="rm-digital-stack">
        <div
          key={activeRegion.id}
          className="rm-panel rm-region-panel rm-region-panel--primary"
          style={{ '--node-color': getNodeColor(activeRegion.questTypes) }}
        >
          <div className="rm-region-panel-title">{activeRegion.icon} {activeRegion.title.toUpperCase()}</div>
          <div className="rm-panel-body">
            <div className="rm-realm-panel-copy">{activeRegion.desc}</div>

            {regionQuests.length === 0 && (
              <div className="rm-empty">
                Empty for now. World beacons and today’s threads land here.
              </div>
            )}

            <div className="rm-region-quest-list" key={`list-${activeRegion.id}`}>
              {regionQuests.map((quest, i) => {
                const isPersonal = quest.origin === 'personal'
                const typeLabel = (QUEST_TYPE_MAP[quest.type] || QUEST_TYPES[0]).label
                return (
                  <div
                    key={quest.id}
                    className={`rm-quest-card${isPersonal ? ' rm-quest-card--personal' : ''}`}
                    style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                  >
                    <div className="rm-realm-quest-top">
                      <div>
                        <div className="rm-realm-quest-type">
                          {isPersonal
                            ? `✦ ${(quest.source || 'today').toUpperCase()} DROP`
                            : typeLabel}
                        </div>
                        <div className="rm-realm-quest-name">{quest.name}</div>
                      </div>
                      {quest.rewardNum && <div className="rm-realm-quest-reward">{quest.rewardNum}</div>}
                    </div>
                    {quest.description && <div className="rm-realm-quest-desc">{quest.description}</div>}
                    <div className="rm-realm-quest-meta">
                      <span>{formatDisplayName(quest.playerName) || 'Unknown Seeker'}</span>
                      <span>
                        {isPersonal
                          ? 'YOUR THREAD'
                          : quest.uid === myUid ? 'YOUR BEACON' : 'WORLD QUEST'}
                      </span>
                    </div>
                    {isPersonal ? (
                      <button type="button" className="rm-nearby-accept" onClick={openQuestsTab}>
                        ▶ OPEN IN QUESTS
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`rm-nearby-accept${acceptedQuests[quest.id] ? ' accepted' : ''}`}
                        onClick={() => !acceptedQuests[quest.id] && handleAccept(quest.id)}
                        disabled={!!acceptedQuests[quest.id]}
                      >
                        {acceptedQuests[quest.id] ? '✓ IN YOUR LOG' : '▶ ACCEPT QUEST'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {regionAllies.length > 0 && (
              <div className="rm-realm-ally-row">
                {regionAllies.map((ally, i) => (
                  <div key={ally.uid || ally.name || i} className="rm-realm-ally-chip">⚔ {formatDisplayName(ally.name) || 'Unknown Seeker'}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rm-panel rm-realm-panel rm-realm-gate-strip">
          <div className="rm-realm-gate-card rm-realm-gate-card--compact">
            <div className="rm-realm-gate-title">2D Portal — Soon</div>
            <div className="rm-realm-gate-copy">
              Future 2D realm will use your avatar, stats, and build.
            </div>
            <button type="button" className="rm-realm-gate-btn" disabled>ENTER SOON</button>
          </div>
        </div>
      </div>
    </div>
  )
}
