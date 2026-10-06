import 'leaflet/dist/leaflet.css'
import { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { acceptQuest as qeAcceptQuest, completeSideQuest as qeCompleteSideQuest, getCreatorTier, getAcceptedQuests } from '../../lib/questEngine'
import { createWorldQuest, updateWorldQuest, fetchAllWorldQuests, fetchCreatorReputation } from '../auth/firestoreprofile'
import { formatDisplayName } from '../../lib/formatters'
import { useGameDispatch } from '../../state/GameContext'
import { ACTIONS } from '../../state/actions'
import { LS_MAP_QUESTS, QUEST_TYPES, SEEKER_TYPES, REWARD_NAMES, loadQuests, saveQuests, searchMapPlaces } from './sidequestHelpers'
import { evidenceForMapType, evidenceSummary, readDevicePosition, haversineMeters, EVIDENCE } from '../../lib/questEvidence'

// Fix Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const LS_ACCEPTED_QUESTS = 'scl_accepted_quests'

const QUEST_TYPE_MAP = Object.fromEntries(QUEST_TYPES.map(t => [t.key, t]))
const REWARD_LABELS  = {
  1:'Leadership · Willpower · New Beginnings',  2:'Partnership · Intuition · Balance',
  3:'Creativity · Joy · Communication',          4:'Discipline · Stability · Mastery',
  5:'Adventure · Change · Experience',           6:'Healing · Responsibility · Love',
  7:'Wisdom · Inner Work · Analysis',            8:'Abundance · Authority · Legacy',
  9:'Completion · Compassion · Transcendence',
}

function loadAccepted()         { try { return JSON.parse(localStorage.getItem(LS_ACCEPTED_QUESTS) || '{}') } catch { return {} } }

function haversineMi(lat1, lng1, lat2, lng2) {
  const R    = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const CARTO_KEY = 'cb1_3jdj_1_55d91f33e6530529aecedc44'
const TILE_ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
const LIGHT_THEMES = ['unicorn']
const MAP_TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key=' + CARTO_KEY,
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=' + CARTO_KEY,
}

function readMapTone() {
  const theme = document.documentElement.getAttribute('data-theme') || 'fantasy'
  return LIGHT_THEMES.includes(theme) ? 'light' : 'dark'
}

function CartoBasemapTiles() {
  const map = useMap()
  const [tone, setTone] = useState(readMapTone)

  useEffect(() => {
    const sync = () => setTone(readMapTone())
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const layer = L.tileLayer(MAP_TILES[tone], {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: TILE_ATTRIB,
    })
    layer.addTo(map)
    const wrap = map.getContainer()
    if (wrap) wrap.style.background = tone === 'light' ? '#d4e0ea' : '#04121e'
    return () => {
      map.removeLayer(layer)
    }
  }, [map, tone])
  return null
}

function makeCircleIcon(color, glow, size = 16, shape = 'circle') {
  const radius = shape === 'diamond' ? '2px' : '50%'
  const transform = shape === 'diamond' ? 'transform:rotate(45deg);' : ''
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:${radius};background:${color};border:2px solid rgba(0,0,0,0.65);box-shadow:0 0 8px ${glow};${transform}"></div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2],
  })
}

function makeQuestMarkerWithReputation(color, glow, reputation, shape = 'circle') {
  const size = shape === 'diamond' ? 18 : 16
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
  const radius = shape === 'diamond' ? '2px' : '50%'
  const transform = shape === 'diamond' ? 'transform:rotate(45deg);' : ''

  return L.divIcon({
    className: 'rm-marker-icon',
    html: `<div class="rm-marker-wrapper" style="position:relative;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;">
      <div class="rm-marker-circle" style="width:${size}px;height:${size}px;border-radius:${radius};background:${color};border:2px solid rgba(0,0,0,0.65);box-shadow:0 0 8px ${glow};${transform}"></div>
      ${badgeHtml}
    </div>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  })
}

const YOU_ICON   = makeCircleIcon('#f5e6a3', '#f5e6a388', 14, 'circle')
const OWN_QUEST_ICON = makeCircleIcon('#d4a843', '#d4a843aa', 18, 'diamond')
const PLACE_ICON = makeCircleIcon('#ffd76a', '#ffd76a88', 18, 'diamond')

function questIcon(quest, myUid, reputation) {
  if (quest.uid === myUid) return OWN_QUEST_ICON
  const tint = QUEST_TYPE_MAP[quest.type]?.color || '#00e5cc'
  if (reputation) return makeQuestMarkerWithReputation(tint, tint + '88', reputation, 'circle')
  return makeCircleIcon(tint, tint + '88', 16, 'circle')
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) })
  return null
}
function FlyToLocation({ coords }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 13, { duration: 1.4 }) }, [coords, map])
  return null
}
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

function QuestPopup({ quest, myUid, onAccept, onEdit, onCheckedIn }) {
  const [rep, setRep] = useState(null)
  const [checkError, setCheckError] = useState('')
  const [checking, setChecking] = useState(false)
  const [justDone, setJustDone] = useState(false)
  const isOwn      = quest.uid === myUid
  const color      = isOwn ? '#d4a843' : (QUEST_TYPE_MAP[quest.type]?.color || '#00e5cc')
  const typeLabel  = (QUEST_TYPE_MAP[quest.type] || QUEST_TYPES[0]).label
  const accepted   = getAcceptedQuests()[quest.id]
  const isDone     = justDone || accepted?.status === 'completed'
  const inLog      = !!accepted && !isDone
  const evidence   = accepted
    ? (accepted.evidence?.kind ? accepted.evidence : null)
    : (quest.evidence?.kind ? quest.evidence : null)
  const placeLat   = Number(accepted?.lat ?? quest.lat)
  const placeLng   = Number(accepted?.lng ?? quest.lng)
  const canCheckIn = inLog
    && evidence?.kind === EVIDENCE.LOCATION
    && Number.isFinite(placeLat)
    && Number.isFinite(placeLng)
  const seekerIcon = { solo: '◈ SOLO', partner: '⚔ PARTNER', group: '✦ GROUP' }

  async function handleCheckIn() {
    setCheckError('')
    setChecking(true)
    try {
      const pos = await readDevicePosition()
      const meters = haversineMeters(pos.lat, pos.lng, placeLat, placeLng)
      const radius = evidence.radiusM || 150
      if (meters > radius) {
        setCheckError(`You're ${Math.round(meters)} m away. Get within ${radius} m.`)
        setChecking(false)
        return
      }
      const result = qeCompleteSideQuest(quest.id, {
        verified: true,
        checkedObjectives: accepted?.checkedObjectives || [],
      })
      setChecking(false)
      if (result && result.ok === false) {
        setCheckError(result.error || 'Could not check in')
        return
      }
      setJustDone(true)
      onCheckedIn?.()
    } catch {
      setChecking(false)
      setCheckError('Allow location to check in at this quest.')
    }
  }

  useEffect(() => {
    if (quest.uid && quest.uid !== myUid) {
      fetchCreatorReputation(quest.uid).then(r => {
        setRep(r || { totalRating: 0, ratingCount: 0, completions: 0, noShows: 0 })
      })
    } else {
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
      {rep && !isOwn && (
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
      {isOwn ? (
        <div className="rm-popup-own">
          <div>YOUR QUEST</div>
          {typeof onEdit === 'function' && (
            <button type="button" className="rm-popup-btn" onClick={() => onEdit(quest)}>
              EDIT QUEST
            </button>
          )}
        </div>
      ) : (
        <>
          {canCheckIn ? (
            <button
              type="button"
              className="rm-popup-btn"
              style={{ borderColor: color + '88', color }}
              onClick={handleCheckIn}
              disabled={checking}
            >
              {checking ? 'LOCATING…' : '▶ CHECK IN'}
            </button>
          ) : (
            <button
              type="button"
              className={`rm-popup-btn${inLog || isDone ? ' rm-popup-btn--accepted' : ''}`}
              style={{ borderColor: (inLog || isDone) ? 'rgba(201,168,76,0.4)' : color + '88', color: (inLog || isDone) ? '#c9a84c' : color }}
              onClick={() => !inLog && !isDone && onAccept(quest.id)}
              disabled={inLog || isDone}
            >
              {isDone ? '✓ COMPLETE' : inLog ? '✓ ALREADY IN LOG' : '▶ ACCEPT QUEST'}
            </button>
          )}
          {checkError && <div className="rm-popup-error" role="alert">{checkError}</div>}
        </>
      )}
    </div>
  )
}

const RADIUS_OPTIONS = [50, 150, 400]

function rewardChoiceLabel(n) {
  const raw = REWARD_NAMES[n] || ''
  const name = raw ? raw.charAt(0) + raw.slice(1).toLowerCase() : String(n)
  return `${n} · ${name}`
}

function CreateQuestForm({ latlng, playerData, creatorTier, initial, onSave, onPickPlace, onCancel }) {
  const editing = Boolean(initial?.id)
  const defaultReward = (() => {
    const lp = Number(playerData?.lp?.root)
    return lp >= 1 && lp <= 9 ? lp : 1
  })()
  const [name, setName] = useState(initial?.name || '')
  const [desc, setDesc] = useState(initial?.description || '')
  const [type, setType] = useState(initial?.type || 'exploration')
  const [seeker, setSeeker] = useState(initial?.seekerType || 'solo')
  const [reward, setReward] = useState(() => {
    const n = Number(initial?.rewardNum)
    return n >= 1 && n <= 9 ? n : defaultReward
  })
  const [radius, setRadius] = useState(initial?.evidence?.radiusM || initial?.radiusM || 150)
  const [objs, setObjs] = useState(() => (
    Array.isArray(initial?.objectives) ? initial.objectives.map(o => String(o || '')).filter(Boolean).slice(0, 3) : []
  ))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [placeQuery, setPlaceQuery] = useState('')
  const [chosenPlace, setChosenPlace] = useState('')
  const [places, setPlaces] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [movingPin, setMovingPin] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const evidence = evidenceForMapType(type, radius)
  const objectives = objs.map(o => o.trim()).filter(Boolean)
  const typeMeta = QUEST_TYPE_MAP[type] || QUEST_TYPES[0]

  useEffect(() => {
    const q = placeQuery.trim()
    if (q.length < 3) return undefined
    let cancelled = false
    const id = setTimeout(async () => {
      setSearching(true)
      try {
        const rows = await searchMapPlaces(q)
        if (!cancelled) setPlaces(rows)
      } catch {
        if (!cancelled) setPlaces([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [placeQuery])

  async function useHere() {
    setLocating(true)
    setError('')
    try {
      const pos = await readDevicePosition()
      onPickPlace?.(pos)
      setChosenPlace('Current location')
      setPlaceQuery('')
      setPlaces([])
      setMovingPin(false)
    } catch {
      setError('Location unavailable. Allow location, or search for a place.')
    } finally {
      setLocating(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Quest name is required.'); return }
    if (!Number.isFinite(latlng?.lat) || !Number.isFinite(latlng?.lng)) {
      setError('Pick a place or use your location before placing.')
      return
    }
    setSaving(true)
    setError('')
    const q = {
      ...(editing ? initial : {}),
      lat: latlng.lat,
      lng: latlng.lng,
      name: name.trim(),
      description: desc.trim(),
      type,
      seekerType: seeker,
      rewardNum: reward,
      objectives,
      radiusM: evidence.kind === 'location' ? radius : null,
      evidence,
      uid: initial?.uid || playerData?.uid || playerData?.name || 'me',
      playerName: initial?.playerName || playerData?.name || '',
      creatorSig: initial?.creatorSig || (playerData ? {
        cl: playerData.cl?.root, lp: playerData.lp?.root,
        ex: playerData.ex?.root, th: playerData.th?.root,
      } : undefined),
      creatorTier: initial?.creatorTier || creatorTier,
      maxAttendees: (initial?.creatorTier || creatorTier) >= 3 ? 50 : 10,
      visibility: (initial?.creatorTier || creatorTier) >= 3 ? 'featured' : 'local',
    }

    const saved = editing
      ? await updateWorldQuest(initial.id, q)
      : await createWorldQuest(q)
    setSaving(false)
    if (saved) onSave(saved)
    else setError(editing ? 'Failed to update quest. Please try again.' : 'Failed to save quest. Please try again.')
  }

  const seekerLabel = { solo: '◈ SOLO', partner: '⚔ PARTNER', group: '✦ GROUP' }[seeker] || seeker

  return (
    <div className="rm-cq-sheet" role="dialog" aria-label={editing ? 'Edit quest marker' : 'New quest marker'}>
      <div className="rm-cq-sheet-handle" aria-hidden="true" />
      <div className="rm-cq-form rm-cq-form--sheet">
        <div className="rm-cq-header">
          <div className="rm-cq-title">{editing ? '◈ EDIT QUEST' : '◈ NEW QUEST MARKER'}</div>
          <button type="button" className="rm-cq-close" onClick={onCancel} aria-label="Cancel">✕</button>
        </div>

        <div className="rm-cq-preview-dock">
          <div className="rm-cq-preview-kicker">SEEKER PREVIEW</div>
          <div className="rm-popup rm-cq-preview-card" style={{ '--quest-color': typeMeta.color }}>
            <div className="rm-popup-type" style={{ color: typeMeta.color }}>{typeMeta.label}</div>
            <span className="rm-popup-seeker" style={{ color: typeMeta.color }}>{seekerLabel}</span>
            <div className="rm-popup-name">{name.trim() || 'Quest name'}</div>
            {desc.trim() && <div className="rm-popup-desc">{desc.trim()}</div>}
            <div className="rm-popup-reward">✦ {reward} · {REWARD_NAMES[reward] || ''}</div>
            <div className="rm-cq-preview-rule">{evidenceSummary(evidence)}</div>
            {objectives.length > 0 && (
              <ul className="rm-cq-preview-objs">
                {objectives.map((o) => <li key={o}>{o}</li>)}
              </ul>
            )}
          </div>
        </div>

        <div className="rm-cq-fields">
        <label className="rm-cq-label" htmlFor="rm-cq-name">QUEST NAME <span className="rm-cq-count">{name.length}/60</span></label>
        <input ref={nameRef} id="rm-cq-name" className="rm-cq-input" maxLength={60} value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="Name your quest…" />

        <label className="rm-cq-label">QUEST TYPE</label>
        <div className="rm-cq-type-grid">
          {QUEST_TYPES.map(t => (
            <button key={t.key} type="button" className={`rm-cq-type-btn${type === t.key ? ' active' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
          ))}
        </div>
        {type === 'exploration' && (
          <div className="rm-cq-radius" role="group" aria-label="Check-in radius">
            {RADIUS_OPTIONS.map(n => (
              <button key={n} type="button" className={`rm-cq-seeker-btn${radius === n ? ' active' : ''}`} onClick={() => setRadius(n)}>
                {n} M
              </button>
            ))}
          </div>
        )}

        <label className="rm-cq-label" htmlFor="rm-cq-desc">DESCRIPTION <span className="rm-cq-optional">optional</span> <span className="rm-cq-count">{desc.length}/400</span></label>
        <textarea
          id="rm-cq-desc"
          className="rm-cq-input rm-cq-textarea"
          maxLength={400}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="What should a seeker do here?"
          rows={3}
        />

        <div className="rm-cq-pair">
          <div className="rm-cq-pair-seeker">
            <label className="rm-cq-label">SEEKER</label>
            <div className="rm-cq-seeker-row">
              {SEEKER_TYPES.map(s => (
                <button key={s} type="button" className={`rm-cq-seeker-btn${seeker === s ? ' active' : ''}`} onClick={() => setSeeker(s)}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="rm-cq-pair-reward">
            <label className="rm-cq-label" htmlFor="rm-cq-reward">REWARD FREQUENCY</label>
            <select
              id="rm-cq-reward"
              className="rm-cq-select"
              value={reward}
              onChange={e => setReward(Number(e.target.value))}
            >
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <option key={n} value={n}>{rewardChoiceLabel(n)}</option>
              ))}
            </select>
            <div className="rm-cq-reward-label">{REWARD_LABELS[reward]}</div>
          </div>
        </div>

        <label className="rm-cq-label">OBJECTIVES <span className="rm-cq-optional">optional</span></label>
        {objs.map((o, i) => (
          <div key={i} className="rm-cq-obj-row">
            <input
              className="rm-cq-input rm-cq-obj"
              maxLength={120}
              value={o}
              onChange={e => setObjs(objs.map((v, j) => j === i ? e.target.value : v))}
              placeholder={`Objective ${i + 1}`}
              aria-label={`Objective ${i + 1}`}
            />
            <button
              type="button"
              className="rm-cq-obj-remove"
              onClick={() => setObjs(objs.filter((_, j) => j !== i))}
              aria-label={`Remove objective ${i + 1}`}
            >✕</button>
          </div>
        ))}
        {objs.length < 3 && (
          <button type="button" className="rm-cq-add" onClick={() => setObjs([...objs, ''])}>
            + ADD OBJECTIVE
          </button>
        )}

        <label className="rm-cq-label">PLACE</label>
        <p className="rm-cq-pin-status">
          {Number.isFinite(latlng?.lat) && Number.isFinite(latlng?.lng)
            ? (chosenPlace || 'Pinned on the map')
            : 'Choose a place before placing'}
        </p>
        <button
          type="button"
          className={`rm-cq-add${movingPin ? ' active' : ''}`}
          aria-expanded={movingPin}
          onClick={() => setMovingPin(open => !open)}
        >
          {movingPin ? 'HIDE PIN SEARCH' : 'MOVE PIN'}
        </button>
        {movingPin && (
          <>
            <div className="rm-cq-place-row">
              <input
                className="rm-cq-input"
                value={placeQuery}
                onChange={e => { setPlaceQuery(e.target.value); setChosenPlace('') }}
                placeholder="Search to move the pin…"
                aria-label="Search for a place"
              />
              <button type="button" className="rm-cq-loc" onClick={useHere} disabled={locating}>
                {locating ? '…' : '◎ HERE'}
              </button>
            </div>
            {placeQuery.trim().length >= 3 && searching && <div className="rm-cq-search-status">Searching…</div>}
            {placeQuery.trim().length >= 3 && places.length > 0 && (
              <ul className="rm-cq-places">
                {places.map((place) => (
                  <li key={`${place.lat},${place.lng}`}>
                    <button
                      type="button"
                      className="rm-cq-place"
                      onClick={() => {
                        onPickPlace?.(place)
                        setChosenPlace(place.label)
                        setPlaceQuery('')
                        setPlaces([])
                        setMovingPin(false)
                      }}
                    >
                      {place.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        </div>

        {error && <div className="rm-cq-error">{error}</div>}
        <div className="rm-cq-actions">
          <button type="button" className="rm-cq-cancel" onClick={onCancel}>CANCEL</button>
          <button type="button" className="rm-cq-save rm-cq-submit" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'SAVING…' : editing ? 'SAVE CHANGES' : 'PLACE QUEST'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorldMapView({ playerData, onOpenSideQuests }) {
  const gameDispatch = useGameDispatch()
  const creatorTier = getCreatorTier()
  const [quests, setQuests]         = useState(() => loadQuests())
  const [questReps, setQuestReps]   = useState({})
  const [userCoords, setUserCoords] = useState(null)
  const [flyTo, setFlyTo]           = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError]     = useState('')
  const [placingMode, setPlacingMode] = useState(false)
  const [pendingLL, setPendingLL]   = useState(null)
  const [showCreate, setShowCreate] = useState(null)
  const [toast, setToast]           = useState(null)
  const myUid = playerData?.uid || playerData?.name || 'me'

  useEffect(() => {
    gameDispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const loadFirestoreQuests = async () => {
      const firestoreQuests = await fetchAllWorldQuests()
      if (firestoreQuests.length > 0) {
        setQuests(firestoreQuests)
        saveQuests(firestoreQuests)

        const reps = {}
        const missing = []
        for (const q of firestoreQuests) {
          if (!q.uid || q.uid === myUid || reps[q.uid] || missing.includes(q.uid)) continue
          if (q.creatorReputation) reps[q.uid] = q.creatorReputation
          else missing.push(q.uid)
        }
        await Promise.all(missing.map(async (uid) => {
          reps[uid] = await fetchCreatorReputation(uid)
        }))
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

  function handleEdit(quest) {
    if (!quest?.lat || !quest?.lng) return
    setPendingLL({ lat: quest.lat, lng: quest.lng })
    setShowCreate({ lat: quest.lat, lng: quest.lng, edit: quest })
    setPlacingMode(false)
    setFlyTo([quest.lat, quest.lng])
  }

  function handleCheckedIn() {
    gameDispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
    setToast({
      msg: 'Checked in',
      actionLabel: 'VIEW SIDE QUESTS',
      onAction: onOpenSideQuests,
    })
  }

  function handleAccept(questId) {
    const q = quests.find(item => item.id === questId)
    if (!q || q.uid === myUid) return
    const result = qeAcceptQuest(q)
    if (result.ok) {
      setQuests([...loadQuests()])
      gameDispatch({ type: ACTIONS.REFRESH_SIDE_QUESTS, payload: getAcceptedQuests() })
      setToast({
        msg: 'Quest accepted',
        actionLabel: 'VIEW SIDE QUESTS',
        onAction: onOpenSideQuests,
      })
    }
  }

  const nearby = userCoords
    ? quests
        .filter(q => q.lat && q.lng && q.uid !== myUid)
        .map(q => ({ ...q, _dist: haversineMi(userCoords[0], userCoords[1], q.lat, q.lng) }))
        .filter(q => q._dist <= 30)
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 5)
    : []

  const showColdStart = !userCoords && !locLoading && quests.length === 0 && !showCreate

  return (
    <div className="rm-digital-view rm-world-view rm-world-map-view">
      <div className="rm-map-controls">
        {userCoords
          ? <span className="rm-loc-active">◎ LOCATION ACTIVE</span>
          : <button type="button" className="rm-loc-btn" onClick={requestLocation} disabled={locLoading}>
              {locLoading ? '◎ LOCATING…' : '◎ USE MY LOCATION'}
            </button>
        }
        {locError && <span className="rm-loc-error">{locError}</span>}
        <button
          type="button"
          className={`rm-place-btn${placingMode ? ' rm-place-btn--active active' : ''}${creatorTier < 2 ? ' rm-place-btn--locked' : ''}`}
          onClick={() => {
            if (placingMode) {
              gameDispatch({ type: ACTIONS.SET_TOAST, payload: {
                msg: '✕ Quest placement cancelled',
                color: 'gray'
              }})
              setPlacingMode(false)
              setPendingLL(null)
              setShowCreate(null)
              return
            }
            if (creatorTier < 2) {
              gameDispatch({ type: ACTIONS.SET_TOAST, payload: {
                msg: '⚔ Accept & complete 5 side quests to unlock Creator Tier 2',
                color: 'gold'
              }})
              return
            }
            setPlacingMode(true)
          }}
        >
          {placingMode ? '✕ CANCEL' : `${creatorTier < 2 ? '🔒 ' : '+ '}PLACE QUEST`}
        </button>
      </div>
      {placingMode && <div className="rm-placing-hint">◈ Tap the map to place your quest</div>}

      <div className={`rm-map-wrap${showCreate ? ' rm-map-wrap--sheet' : ''}`}>
        <MapContainer center={userCoords || [20, 0]} zoom={userCoords ? 13 : 3} className="rm-leaflet" zoomControl>
          <CartoBasemapTiles />
          <InvalidateSizeOnMount />
          <MapClickHandler onMapClick={handleMapClick} />
          {flyTo && <FlyToLocation coords={flyTo} />}
          {userCoords && (
            <Marker position={userCoords} icon={YOU_ICON}>
              <Popup><div className="rm-popup"><div className="rm-popup-name">You are here</div></div></Popup>
            </Marker>
          )}
          {quests.filter(q => q.lat && q.lng).map(q => (
            <Marker key={q.id} position={[q.lat, q.lng]} icon={questIcon(q, myUid, questReps[q.uid])}>
              <Popup maxWidth={280}><QuestPopup quest={q} myUid={myUid} onAccept={handleAccept} onEdit={handleEdit} onCheckedIn={handleCheckedIn} /></Popup>
            </Marker>
          ))}
          {pendingLL && <Marker position={[pendingLL.lat, pendingLL.lng]} icon={PLACE_ICON} />}
        </MapContainer>

        {showColdStart && (
          <div className="rm-map-coldstart">
            <div className="rm-map-coldstart-title">FIND YOUR GROUND</div>
            <p className="rm-map-coldstart-copy">Use your location, then tap the map to place a quest.</p>
            <button type="button" className="rm-loc-btn rm-map-coldstart-btn" onClick={requestLocation} disabled={locLoading}>
              {locLoading ? '◎ LOCATING…' : '◎ USE MY LOCATION'}
            </button>
            {creatorTier >= 2 && (
              <button
                type="button"
                className="rm-place-btn rm-map-coldstart-place"
                onClick={() => setPlacingMode(true)}
              >
                + PLACE WITHOUT LOCATION
              </button>
            )}
          </div>
        )}

        {showCreate && (
          <CreateQuestForm
            key={showCreate.edit?.id || 'new-marker'}
            latlng={showCreate}
            initial={showCreate.edit}
            playerData={playerData}
            creatorTier={creatorTier}
            onPickPlace={(pos) => {
              setPendingLL(pos)
              setShowCreate(prev => prev ? { ...prev, lat: pos.lat, lng: pos.lng } : pos)
              setFlyTo([pos.lat, pos.lng])
            }}
            onSave={q => {
              const current = loadQuests()
              const idx = current.findIndex(item => item.id === q.id)
              const updated = idx >= 0
                ? current.map(item => item.id === q.id ? q : item)
                : [...current, q]
              saveQuests(updated)
              setQuests(updated)
              setShowCreate(null)
              setPendingLL(null)
              setToast({
                msg: showCreate.edit ? 'Quest updated' : 'Quest placed on the map',
                actionLabel: 'VIEW SIDE QUESTS',
                onAction: onOpenSideQuests,
              })
            }}
            onCancel={() => { setShowCreate(null); setPendingLL(null) }}
          />
        )}
      </div>

      {toast && (
        <div className="rm-map-toast" role="status">
          <span>{toast.msg}</span>
          {typeof toast.onAction === 'function' && (
            <button type="button" className="rm-map-toast-action" onClick={() => { toast.onAction(); setToast(null) }}>
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}

      {nearby.length > 0 && (
        <div className="rm-nearby">
          <div className="rm-nearby-title rm-nearby-label">◈ NEARBY — WITHIN 30 MI</div>
          {nearby.map(q => {
            const questColor = (QUEST_TYPE_MAP[q.type] || QUEST_TYPES[0]).color
            return (
              <div key={q.id} className="rm-nearby-card" style={{ '--quest-color': questColor }}>
                <div className="rm-nearby-header">
                  <span className="rm-nearby-name">{q.name}</span>
                  <span className="rm-nearby-dist">{q._dist < 1 ? '<1 mi' : Math.round(q._dist) + ' mi'}</span>
                </div>
                {q.rewardNum && <div className="rm-nearby-reward">✦ {q.rewardNum} · {REWARD_NAMES[q.rewardNum]}</div>}
                <button
                  type="button"
                  className={`rm-nearby-accept${loadAccepted()[q.id] ? ' accepted' : ''}`}
                  onClick={() => !loadAccepted()[q.id] && handleAccept(q.id)}
                  disabled={!!loadAccepted()[q.id]}
                >
                  {loadAccepted()[q.id] ? '✓ IN YOUR LOG' : '▶ ACCEPT'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
