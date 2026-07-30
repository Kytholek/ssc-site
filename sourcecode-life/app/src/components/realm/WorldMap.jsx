import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { acceptQuest as qeAcceptQuest, getCreatorTier, getAcceptedQuests } from '../../lib/questEngine'
import { createWorldQuest, fetchAllWorldQuests, fetchCreatorReputation } from '../auth/firestoreprofile'
import { formatDisplayName } from '../../lib/formatters'
import { useGameDispatch } from '../../state/GameContext'
import { ACTIONS } from '../../state/actions'
import { LS_MAP_QUESTS, QUEST_TYPES, SEEKER_TYPES, REWARD_NAMES, loadQuests, saveQuests } from './sidequestHelpers'

// Fix Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_ALLIES          = 'scl_allies'
const LS_ACCEPTED_QUESTS = 'scl_accepted_quests'

const QUEST_TYPES_WITH_COLORS = [
  { key: 'exploration', label: '🗺 EXPLORE', color: '#00e5cc' },
  { key: 'connection',  label: '⚔ CONNECT',  color: '#2ecc71' },
  { key: 'achievement', label: '▲ ACHIEVE',  color: '#f0c060' },
  { key: 'healing',     label: '✦ HEAL',     color: '#f472b6' },
  { key: 'creation',    label: '◈ CREATE',   color: '#a78bfa' },
  { key: 'reflection',  label: '◇ REFLECT',  color: '#fbbf24' },
]
const QUEST_TYPE_MAP = Object.fromEntries(QUEST_TYPES_WITH_COLORS.map(t => [t.key, t]))
const REWARD_LABELS  = {
  1:'Leadership · Willpower · New Beginnings',  2:'Partnership · Intuition · Balance',
  3:'Creativity · Joy · Communication',          4:'Discipline · Stability · Mastery',
  5:'Adventure · Change · Experience',           6:'Healing · Responsibility · Love',
  7:'Wisdom · Inner Work · Analysis',            8:'Abundance · Authority · Legacy',
  9:'Completion · Compassion · Transcendence',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadAllies()           { try { return JSON.parse(localStorage.getItem(LS_ALLIES)           || '[]') } catch { return [] } }
function loadAccepted()         { try { return JSON.parse(localStorage.getItem(LS_ACCEPTED_QUESTS) || '{}') } catch { return {} } }

function haversineMi(lat1, lng1, lat2, lng2) {
  const R    = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Map theme ─────────────────────────────────────────────────────────────────
const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

function makeCircleIcon(color, glow, size = 16) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,0.6);box-shadow:0 0 8px ${glow}"></div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2],
  })
}

function makeQuestMarkerWithReputation(color, glow, reputation, isOwn) {
  const size = 18
  const ratingCount = reputation?.ratingCount || 0
  const totalRating = reputation?.totalRating || 0
  const avgRating = ratingCount > 0
    ? (totalRating / ratingCount).toFixed(1)
    : null

  let badgeHtml = ''
  if (avgRating) {
    badgeHtml = `<div class="rm-marker-badge">⭐ ${avgRating}</div>`
  } else if (reputation && ratingCount === 0) {
    badgeHtml = `<div class="rm-marker-badge rm-marker-badge--new">◈ NEW</div>`
  }

  const iconSize = badgeHtml ? size + 24 : size

  return L.divIcon({
    className: 'rm-marker-icon',
    html: `<div class="rm-marker-wrapper" style="position:relative;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;">
      <div class="rm-marker-circle" style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,0.6);box-shadow:0 0 8px ${glow}"></div>
      ${badgeHtml}
    </div>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  })
}

const MINE_ICON  = makeCircleIcon('#d4a843', '#d4a84388', 18)
const ALLY_ICON  = makeCircleIcon('#00e5cc', '#00e5cc88', 16)
const PLACE_ICON = makeCircleIcon('#d4a843', '#d4a84388', 18)

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) })
  return null
}
function FlyToLocation({ coords }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 13, { duration: 1.4 }) }, [coords, map])
  return null
}
/** Recalculate Leaflet size after flex/tab layout settles. */
function InvalidateSizeOnMount() {
  const map = useMap()
  useEffect(() => {
    const run = () => map.invalidateSize()
    const raf = requestAnimationFrame(run)
    const t = setTimeout(run, 100)
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(run)
      : null
    const el = map.getContainer()
    if (ro && el) ro.observe(el.parentElement || el)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      ro?.disconnect()
    }
  }, [map])
  return null
}

// ── Quest Popup ───────────────────────────────────────────────────────────────
function QuestPopup({ quest, myUid, onAccept }) {
  const [rep, setRep] = useState(null)
  const isOwn      = quest.uid === myUid
  const color      = isOwn ? '#d4a843' : '#00e5cc'
  const typeLabel  = (QUEST_TYPE_MAP[quest.type] || QUEST_TYPES_WITH_COLORS[0]).label
  const isAccepted = !!loadAccepted()[quest.id]
  const seekerIcon = { solo: '◈ SOLO', partner: '⚔ PARTNER', group: '✦ GROUP' }

  useEffect(() => {
    if (quest.uid && quest.uid !== myUid) {
      fetchCreatorReputation(quest.uid).then(r => {
        const rep = r || { totalRating: 0, ratingCount: 0, completions: 0, noShows: 0 }
        setRep(rep)
      })
    } else {
      // Own quest or no uid - show empty reputation
      setRep({ totalRating: 0, ratingCount: 0, completions: 0, noShows: 0 })
    }
  }, [quest.uid, myUid])

  const avgRating = rep && rep.ratingCount > 0
    ? (rep.totalRating / rep.ratingCount).toFixed(1)
    : null
  const completionPct = rep && (rep.completions + rep.noShows) > 0
    ? Math.round(rep.completions / (rep.completions + rep.noShows) * 100)
    : null

  return (
    <div className="rm-popup">
      <div className="rm-popup-type" style={{ color }}>{typeLabel}</div>
      {quest.seekerType && <span className="rm-popup-seeker" style={{ color }}>{seekerIcon[quest.seekerType] || quest.seekerType}</span>}
      <div className="rm-popup-name">{quest.name}</div>
      {quest.description && <div className="rm-popup-desc">{quest.description}</div>}
      {quest.rewardNum && <div className="rm-popup-reward">✦ {quest.rewardNum} · {REWARD_NAMES[quest.rewardNum] || ''}</div>}
      {quest.creatorSig && (
        <div className="rm-popup-sig">
          {[['CL', quest.creatorSig.cl, '#00e5cc'], ['LP', quest.creatorSig.lp, '#d4a843'],
            ['EX', quest.creatorSig.ex, '#a070ff'], ['TH', quest.creatorSig.th, '#90a8c8']]
            .filter(([, v]) => v)
            .map(([k, v, c]) => (
              <span key={k} className="rm-sig-chip" style={{ color: c }}>
                <span>{v}</span><span className="rm-sig-key">{k}</span>
              </span>
            ))}
        </div>
      )}
      {quest.playerName && <div className="rm-popup-creator">— {formatDisplayName(quest.playerName)}</div>}
      {rep && (
        <div className="rm-popup-rep">
          <div className="rm-popup-stars">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`rm-popup-star${avgRating && Math.ceil(parseFloat(avgRating)) >= n ? ' filled' : ''}`}>★</span>
            ))}
          </div>
          {rep.ratingCount > 0 ? (
            <div className="rm-popup-rep-text">
              <span>{avgRating} · {rep.ratingCount} quests</span>
              {completionPct !== null && <span>✔ {completionPct}%</span>}
            </div>
          ) : (
            <span className="rm-popup-rep-empty">◈ New Creator</span>
          )}
        </div>
      )}
      <button
        className={`rm-popup-btn${isAccepted ? ' rm-popup-btn--accepted' : ''}`}
        style={{ borderColor: isAccepted ? 'rgba(201,168,76,0.4)' : color + '88', color: isAccepted ? '#c9a84c' : color }}
        onClick={() => !isAccepted && onAccept(quest.id)}
        disabled={isAccepted}
      >
        {isAccepted ? '✓ ALREADY IN LOG' : '▶ ACCEPT QUEST'}
      </button>
    </div>
  )
}

// ── Create Quest Form ─────────────────────────────────────────────────────────
function CreateQuestForm({ latlng, playerData, creatorTier, onSave, onCancel }) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')
  const [type, setType]   = useState('exploration')
  const [seeker, setSeeker] = useState('solo')
  const [reward, setReward] = useState(1)
  const [objs, setObjs]   = useState(['', '', ''])
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Quest name is required.'); return }
    const q = {
      lat: latlng.lat, lng: latlng.lng,
      name: name.trim(), description: desc.trim(),
      type, seekerType: seeker, rewardNum: reward,
      objectives: objs.map(o => o.trim()).filter(Boolean),
      uid: playerData?.uid || playerData?.name || 'me',
      playerName: playerData?.name || '',
      creatorSig: playerData ? {
        cl: playerData.cl?.root, lp: playerData.lp?.root,
        ex: playerData.ex?.root, th: playerData.th?.root,
      } : undefined,
      creatorTier,
      maxAttendees: creatorTier >= 3 ? 50 : 10,
      visibility: creatorTier >= 3 ? 'featured' : 'local',
    }

    // Save to Firestore (shared across all players)
    const saved = await createWorldQuest(q)
    if (saved) {
      onSave(saved)
    } else {
      setError('Failed to save quest. Please try again.')
    }
  }

  const typeColor = (QUEST_TYPE_MAP[type] || QUEST_TYPES_WITH_COLORS[0]).color

  return (
    <div className="rm-cq-form">
      <div className="rm-cq-title" style={{ color: typeColor }}>◈ NEW QUEST MARKER</div>
      <label className="rm-cq-label">QUEST TYPE</label>
      <div className="rm-cq-type-grid">
        {QUEST_TYPES.map(t => (
          <button key={t.key} className={`rm-cq-type-btn${type === t.key ? ' active' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>
      <label className="rm-cq-label">QUEST NAME <span className="rm-cq-count">{name.length}/60</span></label>
      <input className="rm-cq-input" maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Name your quest…" />
      <label className="rm-cq-label">DESCRIPTION <span className="rm-cq-count">{desc.length}/200</span></label>
      <textarea className="rm-cq-textarea" maxLength={200} rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is this quest about?" />
      <label className="rm-cq-label">OBJECTIVES</label>
      {objs.map((o, i) => (
        <input key={i} className="rm-cq-input rm-cq-obj" maxLength={120} value={o}
          onChange={e => setObjs(objs.map((v, j) => j === i ? e.target.value : v))}
          placeholder={`Objective ${i + 1}`} />
      ))}
      <label className="rm-cq-label">SEEKER TYPE</label>
      <div className="rm-cq-seeker-row">
        {SEEKER_TYPES.map(s => (
          <button key={s} className={`rm-cq-seeker-btn${seeker === s ? ' active' : ''}`} onClick={() => setSeeker(s)}>{s.toUpperCase()}</button>
        ))}
      </div>
      <label className="rm-cq-label">REWARD FREQUENCY</label>
      <div className="rm-cq-reward-grid">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className={`rm-cq-reward-btn${reward === n ? ' active' : ''}`} onClick={() => setReward(n)}>{n}</button>
        ))}
      </div>
      <div className="rm-cq-reward-label">{REWARD_LABELS[reward]}</div>
      {error && <div className="rm-cq-error">{error}</div>}
      <div className="rm-cq-actions">
        <button className="rm-cq-cancel" onClick={onCancel}>CANCEL</button>
        <button className="rm-cq-submit" onClick={handleSave}>PLACE QUEST</button>
      </div>
    </div>
  )
}

// ── World Map ─────────────────────────────────────────────────────────────────
export default function WorldMapView({ playerData }) {
  const gameDispatch = useGameDispatch()
  const creatorTier = getCreatorTier()
  const [quests, setQuests]         = useState(() => loadQuests())
  const [allies]                    = useState(() => loadAllies())
  const [questReps, setQuestReps]   = useState({})
  const [userCoords, setUserCoords] = useState(null)
  const [flyTo, setFlyTo]           = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError]     = useState('')
  const [placingMode, setPlacingMode] = useState(false)
  const [pendingLL, setPendingLL]   = useState(null)
  const [showCreate, setShowCreate] = useState(null)
  const myUid = playerData?.uid || playerData?.name || 'me'

  // Refresh side quests in GameContext when they change
  useEffect(() => {
    gameDispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
  }, [])

  // Load quests from Firestore on mount
  useEffect(() => {
    const loadFirestoreQuests = async () => {
      const firestoreQuests = await fetchAllWorldQuests()
      if (firestoreQuests.length > 0) {
        setQuests(firestoreQuests)
        saveQuests(firestoreQuests)

        // Fetch reputations for all quest creators
        const reps = {}
        for (const q of firestoreQuests) {
          if (q.uid && q.uid !== myUid && !reps[q.uid]) {
            reps[q.uid] = await fetchCreatorReputation(q.uid)
          }
        }
        setQuestReps(reps)
      }
    }
    loadFirestoreQuests()
  }, [myUid])

  function requestLocation() {
    if (!navigator.geolocation) { setLocError('Geolocation not supported.'); return }
    setLocLoading(true); setLocError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = [pos.coords.latitude, pos.coords.longitude]
        setUserCoords(c); setFlyTo(c); setLocLoading(false)
      },
      err => {
        const m = { 1: 'Permission denied.', 2: 'Position unavailable.', 3: 'Timed out.' }
        setLocError(m[err.code] || 'Location error.'); setLocLoading(false)
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    )
  }

  function handleMapClick(latlng) {
    if (!placingMode) return
    setPendingLL(latlng); setShowCreate(latlng); setPlacingMode(false)
  }

  function handleAccept(questId) {
    const q = quests.find(q => q.id === questId) || { id: questId }
    const result = qeAcceptQuest(q)
    if (result.ok) {
      setQuests([...loadQuests()])
      gameDispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
    }
  }

  const nearby = userCoords
    ? quests
        .filter(q => q.lat && q.lng)
        .map(q => ({ ...q, _dist: haversineMi(userCoords[0], userCoords[1], q.lat, q.lng) }))
        .filter(q => q._dist <= 30)
        .sort((a, b) => a._dist - b._dist)
    : []

  return (
    <div className="rm-digital-view rm-world-map-view">
      <div className="rm-map-controls">
        {userCoords
          ? <span className="rm-loc-active">◎ LOCATION ACTIVE</span>
          : <button className="rm-loc-btn" onClick={requestLocation} disabled={locLoading}>
              {locLoading ? '◎ LOCATING…' : '◎ USE MY LOCATION'}
            </button>
        }
        {locError && <span className="rm-loc-error">{locError}</span>}
        <button
          className={`rm-place-btn${placingMode ? ' rm-place-btn--active' : ''}${creatorTier < 2 ? ' rm-place-btn--locked' : ''}`}
          onClick={() => {
            if (placingMode) {
              gameDispatch({ type: ACTIONS.SET_TOAST, payload: {
                msg: '✕ Quest placement cancelled',
                color: 'gray'
              }})
              setPlacingMode(false)
              setPendingLL(null)
              return
            }
            if (creatorTier < 2) {
              gameDispatch({ type: ACTIONS.SET_TOAST, payload: {
                msg: '⚔ Accept & complete 5 side quests to unlock Creator Tier 2',
                color: 'gold'
              }})
              return
            }
            const msg = creatorTier >= 3
              ? '◈ Premium: Place quests with higher limits & featured visibility'
              : '◈ Tier 2: Tap the map to place your quest'
            gameDispatch({ type: ACTIONS.SET_TOAST, payload: { msg, color: 'teal' } })
            setPlacingMode(true)
          }}
        >
          {placingMode ? '✕ CANCEL' : `${creatorTier < 2 ? '🔒 ' : '+ '}PLACE QUEST`}
        </button>
      </div>
      {placingMode && <div className="rm-placing-hint">◈ Tap the map to place your quest</div>}

      <div className="rm-map-wrap">
        <MapContainer center={userCoords || [20, 0]} zoom={userCoords ? 13 : 3} className="rm-leaflet" zoomControl>
          <TileLayer url={DARK_TILE} attribution={TILE_ATTRIB} maxZoom={19} />
          <InvalidateSizeOnMount />
          <MapClickHandler onMapClick={handleMapClick} />
          {flyTo && <FlyToLocation coords={flyTo} />}
          {userCoords && (
            <Marker position={userCoords} icon={MINE_ICON}>
              <Popup><div className="rm-popup"><div className="rm-popup-name">You are here</div></div></Popup>
            </Marker>
          )}
          {quests.filter(q => q.lat && q.lng).map(q => {
            let icon = MINE_ICON
            if (q.uid !== myUid) {
              const rep = questReps[q.uid]
              icon = makeQuestMarkerWithReputation('#00e5cc', '#00e5cc88', rep, false)
            }
            return (
              <Marker key={q.id} position={[q.lat, q.lng]} icon={icon}>
                <Popup maxWidth={280}><QuestPopup quest={q} myUid={myUid} onAccept={handleAccept} /></Popup>
              </Marker>
            )
          })}
          {allies.filter(a => a.lat && a.lng).map((a, i) => (
            <Marker key={i} position={[a.lat, a.lng]} icon={ALLY_ICON}>
              <Popup maxWidth={240}>
                <div className="rm-popup">
                  <div className="rm-popup-type" style={{ color: '#00e5cc' }}>⚔ ALLY</div>
                  <div className="rm-popup-name">{a.name || 'Unknown Seeker'}</div>
                </div>
              </Popup>
            </Marker>
          ))}
          {pendingLL && <Marker position={[pendingLL.lat, pendingLL.lng]} icon={PLACE_ICON} />}
        </MapContainer>
      </div>

      {showCreate && (
        <CreateQuestForm
          latlng={showCreate}
          playerData={playerData}
          creatorTier={creatorTier}
          onSave={q => {
            const updated = [...loadQuests(), q]
            saveQuests(updated)
            setQuests(updated)
            setShowCreate(null)
            setPendingLL(null)
          }}
          onCancel={() => { setShowCreate(null); setPendingLL(null) }}
        />
      )}

      {nearby.length > 0 && (
        <div className="rm-nearby">
          <div className="rm-nearby-title">◈ NEARBY QUESTS — WITHIN 30 MI</div>
          {nearby.map(q => {
            const questColor = (QUEST_TYPE_MAP[q.type] || QUEST_TYPES_WITH_COLORS[0]).color
            return (
              <div key={q.id} className="rm-nearby-card" style={{ '--quest-color': questColor }}>
                <div className="rm-nearby-header">
                  <span className="rm-nearby-name">{q.name}</span>
                  <span className="rm-nearby-dist">{q._dist < 1 ? '<1 mi' : Math.round(q._dist) + ' mi'}</span>
                </div>
                {q.rewardNum && <div className="rm-nearby-reward">✦ {q.rewardNum} · {REWARD_NAMES[q.rewardNum]}</div>}
                <button
                  className={`rm-nearby-accept${loadAccepted()[q.id] ? ' accepted' : ''}`}
                  onClick={() => !loadAccepted()[q.id] && handleAccept(q.id)}
                  disabled={!!loadAccepted()[q.id]}
                >
                  {loadAccepted()[q.id] ? '✓ IN YOUR LOG' : '▶ ACCEPT QUEST'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
