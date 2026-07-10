import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAppState } from '../../context/AppContext'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import {
  fetchUserEquipment, updateUserEquipment,
} from '../auth/firestoreprofile'
import { loadAvatar, AURA_COLORS } from '../../lib/avatarParts'
import { RPGCharacterCanvas } from '../charCreate/AvatarCreator.jsx'
import {
  ACHIEVEMENTS, TIER_COLORS, medalSvg,
  loadAchievements, isFounder,
} from '../../lib/achievements'
import { MedalsRow } from '../Achievements.jsx'

const HEADGEAR_ITEMS = ['Crown', 'Hood', 'Hat', 'Halo', 'Horns', 'Mask', 'Glasses', 'Antenna']
const HEADGEAR_MAP = {
  'Crown':   1,
  'Hood':    2,
  'Hat':     3,
  'Halo':    4,
  'Horns':   5,
  'Mask':    6,
  'Glasses': 7,
  'Antenna': 8,
}
const CC_SECTIONS = [
  { id: 'avatar', label: 'AVATAR' },
  { id: 'medals', label: 'MEDALS' },
  { id: 'gear',   label: 'GEAR'   },
]

const GEAR_SLOTS = [
  { id: 'weapon',    label: 'WEAPON',    icon: '⚔' },
  { id: 'head',      label: 'HEAD',      icon: '◈' },
  { id: 'armor',     label: 'ARMOR',     icon: '▲' },
  { id: 'boots',     label: 'BOOTS',     icon: '◇' },
  { id: 'offhand',   label: 'OFF-HAND',  icon: '✦' },
  { id: 'accessory', label: 'ACCESSORY', icon: '✚' },
]

// ── LargeAvatar (smooth vector) ───────────────────────────────────────────────
function LargeAvatar({ config }) {
  const auraColor = AURA_COLORS[config.aura]?.color || 'transparent'
  const bg = auraColor !== 'transparent' ? auraColor : '#0a1520'
  return (
    <div style={{
      width: '120px', height: '200px', margin: '0 auto',
      borderRadius: '8px', overflow: 'hidden', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <RPGCharacterCanvas config={config} size={120} auraColor={auraColor} />
    </div>
  )
}

// ── GearTab ───────────────────────────────────────────────────────────────────
export function GearTab() {
  const { currentUser } = useAppState()
  const [equipment, setEquipment] = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!currentUser?.uid) { setLoading(false); return }
    fetchUserEquipment(currentUser.uid)
      .then(eq  => { setEquipment(eq || {}); setLoading(false) })
      .catch(()  => { setEquipment({});       setLoading(false) })
  }, [currentUser])

  if (loading) return (
    <div style={{ color: '#5a5a7a', textAlign: 'center', padding: '24px 0', fontSize: 12 }}>
      Loading gear…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontSize: 10,
        letterSpacing: '0.15em', color: '#c9a84c', marginBottom: 4,
      }}>
        EQUIPPED GEAR
      </div>

      {GEAR_SLOTS.map(slot => {
        const item = equipment?.[slot.id]
        const isHead = slot.id === 'head'

        return (
          <div key={slot.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 6,
            border: `1px solid ${item ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
            background: item ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.02)',
          }}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center', color: item ? '#c9a84c' : '#444' }}>
              {slot.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: '#888', marginBottom: 2 }}>
                {slot.label}
              </div>
              {isHead && currentUser?.uid ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  <button
                    style={{
                      padding: '4px 8px', borderRadius: 4, fontSize: 10,
                      border: !item ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)',
                      background: !item ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                      color: !item ? '#c9a84c' : '#555',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const next = { ...equipment, head: undefined }
                      setEquipment(next)
                      if (currentUser?.uid) updateUserEquipment(currentUser.uid, next)
                    }}
                  >
                    None
                  </button>
                  {HEADGEAR_ITEMS.map(hg => (
                    <button
                      key={hg}
                      style={{
                        padding: '4px 8px', borderRadius: 4, fontSize: 10,
                        border: item === hg ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)',
                        background: item === hg ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                        color: item === hg ? '#c9a84c' : '#555',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const next = { ...equipment, head: hg }
                        setEquipment(next)
                        if (currentUser?.uid) updateUserEquipment(currentUser.uid, next)
                      }}
                    >
                      {hg}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: item ? '#e8e8e8' : '#3a3a5a', fontStyle: item ? 'normal' : 'italic' }}>
                  {item || '— EMPTY —'}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {!currentUser?.uid && (
        <div style={{ color: '#5a5a7a', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
          Sign in to sync gear across devices.
        </div>
      )}
    </div>
  )
}

// ── CharacterCardPanel ────────────────────────────────────────────────────────
export function CharacterCardPanel({ open, onClose }) {
  const [tab, setTab]  = useState('avatar')
  const { currentUser } = useAppState()
  const [equipment, setEquipment] = useState(null)
  const panelRef = useFocusTrap({ open, onClose })

  // Load avatar config and merge with equipment headgear
  const avatarConfig = useMemo(() => {
    const config = loadAvatar() || {}
    if (equipment?.head && HEADGEAR_MAP[equipment.head]) {
      config.headgear = HEADGEAR_MAP[equipment.head]
    }
    return config
  }, [equipment])

  // Load equipment from Firestore
  useEffect(() => {
    if (!currentUser?.uid) return
    fetchUserEquipment(currentUser.uid).then(eq => setEquipment(eq || {})).catch(() => setEquipment(null))
  }, [currentUser, open])

  if (!open) return null

  return createPortal(
    <>
      <style>{`@keyframes cc-slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div className="char-card-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Character card">

        {/* Header */}
        <div className="char-card-panel-header">
          <span className="char-card-panel-title">
            CHARACTER CARD
          </span>
          <button
            onClick={onClose}
            className="char-card-panel-close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Sub-tab toggle */}
        <div className="char-card-panel-tabs">
          {CC_SECTIONS.map(({ id, label }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} className={`char-card-panel-tab${active ? ' active' : ''}`}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="char-card-panel-content">

          {tab === 'avatar' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {avatarConfig
                ? <LargeAvatar config={avatarConfig} />
                : <div style={{ color: '#5a5a7a', fontStyle: 'italic' }}>No avatar configured</div>
              }
              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.15em', color: '#c9a84c', marginBottom: 10 }}>
                  EARNED MEDALS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, minHeight: 36 }}>
                  <MedalsRow />
                </div>
              </div>
            </div>
          )}

          {tab === 'medals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const store   = loadAchievements()
                const founder = isFounder()
                const allAch  = ACHIEVEMENTS
                  .filter(a => a.id !== 'founder')
                  .sort((a, b) => (!!store[b.id] - !!store[a.id]))
                const rows    = []

                rows.push(
                  <div key="founder" style={{
                    padding: 12, borderRadius: 8,
                    border:     `1px solid rgba(232,201,107,${founder ? 0.3 : 0.1})`,
                    background: founder ? 'rgba(232,201,107,0.08)' : 'rgba(255,255,255,0.02)',
                    opacity: founder ? 1 : 0.4, display: 'flex', gap: 12, alignItems: 'center',
                  }}>
                    <div style={{ flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: medalSvg('crown', '#e8c96b', !founder) }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: '#e8c96b' }}>FOUNDER</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Early Investor</div>
                    </div>
                  </div>
                )

                allAch.forEach(a => {
                  const isEarned = !!store[a.id]
                  const color    = isEarned ? (TIER_COLORS[a.tier] || a.color) : 'rgba(255,255,255,0.18)'
                  rows.push(
                    <div key={a.id} style={{
                      padding: 12, borderRadius: 8,
                      border:     `1px solid ${color}33`,
                      background: isEarned ? `${color}08` : 'rgba(255,255,255,0.02)',
                      opacity: isEarned ? 1 : 0.55, display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}>
                      <div style={{ flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: medalSvg(a.medal, isEarned ? color : null, !isEarned) }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: isEarned ? color : '#888' }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.4 }}>{a.desc}</div>
                        <div style={{ fontSize: 9, letterSpacing: '0.1em', color, marginTop: 6, fontFamily: "'Cinzel', serif", fontWeight: 600 }}>{a.tier}</div>
                      </div>
                    </div>
                  )
                })
                return rows
              })()}
            </div>
          )}

          {tab === 'gear' && <GearTab />}
        </div>
      </div>

      <div className="char-card-panel-backdrop" onClick={onClose} />
    </>,
    document.body
  )
}

// ── Equipment (default — Firestore-backed slot manager) ───────────────────────
export default function Equipment() {
  const { currentUser } = useAppState()
  const [equipment, setEquipment] = useState(null)
  const [status, setStatus]       = useState('')

  useEffect(() => {
    if (!currentUser?.uid) return
    fetchUserEquipment(currentUser.uid).then(eq => setEquipment(eq || {}))
  }, [currentUser])

  const handleEquip = (slot, item) => {
    const next = { ...equipment, [slot]: item }
    setEquipment(next)
    if (currentUser?.uid) {
      updateUserEquipment(currentUser.uid, next)
        .then(()  => setStatus('Saved!'))
        .catch(() => setStatus('Save failed'))
    }
  }

  if (!equipment) return <div>Loading equipment…</div>

  return (
    <div>
      <h2>Equipment</h2>
      <pre>{JSON.stringify(equipment, null, 2)}</pre>
      <button onClick={() => handleEquip('head',   'Seeker Hood')}>Equip Seeker Hood</button>
      <button onClick={() => handleEquip('weapon', 'Pulse Blade')}>Equip Pulse Blade</button>
      <div>{status}</div>
    </div>
  )
}
