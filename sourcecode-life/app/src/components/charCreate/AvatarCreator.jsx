/**
 * AvatarCreator.jsx
 *
 * Full-screen old-school RPG avatar builder that appears after character creation.
 * Derives a default avatar from the player's numerology numbers, then lets
 * them customize head, hair, eyes, armor/body, legs, item, and head components.
 */
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import {
  HEAD_STYLES, HAIR_STYLES, EYE_STYLES, BODY_STYLES, LEG_STYLES,
  ACCESSORY_STYLES, HEADGEAR_STYLES, AURA_COLORS,
  SKIN_TONES, HAIR_COLORS, EYE_COLORS,
  deriveDefaultAvatar, saveAvatar,
} from '../../lib/avatarParts'
import OnboardingProgress from '../ui/OnboardingProgress'

const PREVIEW_SIZE = 320
const THUMB_SIZE = 54

export const OUTFIT = ['#365978', '#4d2f63', '#2e5b45', '#6b3a2d', '#4b5563', '#285a5f', '#6b4f32', '#5b3b7a', '#2f6e57']
export const LEGS = ['#1f2937', '#3f2a2a', '#1f3a2e', '#39322a', '#31283d', '#1f3a3d', '#1f1f1f', '#374151', '#463b21']
export const STEEL = ['#d1d5db', '#9ca3af', '#6b7280']

function ring(arr, idx) {
  if (!arr.length) return '#999'
  const i = ((idx % arr.length) + arr.length) % arr.length
  return arr[i]
}

export function RPGCharacterCanvas({ config, size = PREVIEW_SIZE, auraColor, className }) {
  const skin    = ring(SKIN_TONES,  config.skinTone  || 0)
  const hair    = ring(HAIR_COLORS, config.hairColor  || 0)
  const eye     = ring(EYE_COLORS,  config.eyeColor   || 0)
  const outfit  = ring(OUTFIT,      config.bodyStyle  || 0)
  const legCol  = ring(LEGS,        config.legStyle   || 0)
  const steelA  = ring(STEEL, (config.bodyStyle || 0) % STEEL.length)
  const steelB  = ring(STEEL, ((config.bodyStyle || 0) + 1) % STEEL.length)

  const headVariant = (config.headStyle || 0) % 5
  const hairVariant = (config.hairStyle || 0) % 5
  const eyesVariant = (config.eyeStyle  || 0) % 5
  const bodyVariant = (config.bodyStyle || 0) % 5
  const itemVariant = (config.accessory || 0) % 9
  const headgearIdx = (config.headgear || 0) % 9
  const hasCatEars  = !!config.catEars
  const isFemale    = config.gender === 'female'

  const head =
    headVariant === 0 ? <ellipse cx="60" cy="55" rx="16" ry="18" fill={skin} /> :
    headVariant === 1 ? <rect x="44" y="38" width="32" height="35" rx="8" fill={skin} /> :
    headVariant === 2 ? <ellipse cx="60" cy="55" rx="14" ry="20" fill={skin} /> :
    headVariant === 3 ? <path d="M45 43 L60 35 L75 43 L72 69 L48 69 Z" fill={skin} /> :
    <path d="M44 47 Q60 30 76 47 L72 70 Q60 76 48 70 Z" fill={skin} />

  // Female hair extends past shoulders; male stays tight
  const hairBack =
    hairVariant === 0 ? (
      isFemale
        ? <path d="M43 50 Q60 28 77 50 L78 82 Q60 90 42 82 Z" fill={hair} />
        : <path d="M43 50 Q60 28 77 50 L77 66 Q60 74 43 66 Z" fill={hair} />
    ) :
    hairVariant === 1 ? (
      isFemale
        ? <path d="M42 48 Q60 26 78 48 L80 96 Q60 104 40 96 Z" fill={hair} />
        : <path d="M42 48 Q60 26 78 48 L78 74 L42 74 Z" fill={hair} />
    ) :
    hairVariant === 2 ? (
      isFemale
        ? <path d="M44 46 Q60 30 76 46 L76 84 Q60 90 44 84 Z" fill={hair} />
        : <path d="M45 45 L60 33 L75 45 L72 68 L48 68 Z" fill={hair} />
    ) :
    hairVariant === 3 ? (
      isFemale
        ? <path d="M44 47 Q60 24 76 47 L76 80 Q60 86 44 80 Z" fill={hair} />
        : <path d="M44 47 Q60 24 76 47 L73 63 L47 63 Z" fill={hair} />
    ) : (
      isFemale
        ? <path d="M43 48 Q60 26 77 48 L80 100 Q60 110 40 100 Z" fill={hair} />
        : <path d="M46 46 Q60 32 74 46 L72 70 Q60 77 48 70 Z" fill={hair} />
    )

  const eyes =
    eyesVariant === 0 ? <><circle cx="54" cy="56" r="1.8" fill={eye} /><circle cx="66" cy="56" r="1.8" fill={eye} /></> :
    eyesVariant === 1 ? <><ellipse cx="54" cy="56" rx="2.6" ry="1.6" fill={eye} /><ellipse cx="66" cy="56" rx="2.6" ry="1.6" fill={eye} /></> :
    eyesVariant === 2 ? <><line x1="51" y1="56" x2="57" y2="56" stroke={eye} strokeWidth="1.6" /><line x1="63" y1="56" x2="69" y2="56" stroke={eye} strokeWidth="1.6" /></> :
    eyesVariant === 3 ? <><circle cx="54" cy="56" r="1.4" fill="#f0c060" /><circle cx="66" cy="56" r="1.4" fill="#f0c060" /></> :
    <><circle cx="54" cy="56" r="1.6" fill="#111" /><circle cx="66" cy="56" r="1.6" fill="#111" /></>

  // Female = waist curve; male = blocky trapezoid
  const femaleBase = <path d="M48 82 Q60 78 72 82 L76 116 Q60 122 44 116 Z" fill={outfit} />
  const maleBase   = <path d="M46 82 L74 82 L78 116 L42 116 Z" fill={outfit} />

  const body =
    bodyVariant === 0 ? (isFemale ? femaleBase : maleBase) :
    bodyVariant === 1 ? <>
      {isFemale ? femaleBase : maleBase}
      <path d="M50 86 L70 86 L73 110 L47 110 Z" fill={steelA} />
      <line x1="60" y1="86" x2="60" y2="110" stroke={steelB} strokeWidth="2" />
    </> :
    bodyVariant === 2 ? (
      isFemale
        ? <path d="M46 82 Q60 76 74 82 L82 120 Q60 126 38 120 Z" fill={outfit} />
        : <path d="M48 82 L72 82 L80 120 L40 120 Z" fill={outfit} />
    ) :
    bodyVariant === 3 ? <>
      {isFemale ? femaleBase : maleBase}
      <path d="M42 84 L35 112 L42 114 Z" fill="#2f3f53" />
      <path d="M78 84 L85 112 L78 114 Z" fill="#2f3f53" />
    </> :
    <>
      {isFemale
        ? <path d="M48 82 Q60 78 72 82 L76 116 Q60 122 44 116 Z" fill="#1f2937" />
        : <path d="M46 82 L74 82 L78 116 L42 116 Z" fill="#1f2937" />}
      <circle cx="55" cy="96" r="2" fill="#00e5cc" />
      <circle cx="65" cy="96" r="2" fill="#00e5cc" />
    </>

  // Subtle chest detail for female (skip on cyber armor)
  const chestDetail = isFemale && bodyVariant !== 4 ? (
    <>
      <ellipse cx="54" cy="96" rx="3" ry="2" fill="rgba(0,0,0,0.15)" />
      <ellipse cx="66" cy="96" rx="3" ry="2" fill="rgba(0,0,0,0.15)" />
    </>
  ) : null

  // Female = softer, lower curve; male = flatter
  const mouth = isFemale
    ? <path d="M56 66 Q60 69 64 66" fill="none" stroke="#7c3f2b" strokeWidth="1"   strokeLinecap="round" />
    : <path d="M56 64 Q60 66 64 64" fill="none" stroke="#7c3f2b" strokeWidth="1.2" strokeLinecap="round" />

  // Headgear — rendered on TOP of head
  const headgear =
    headgearIdx === 0 ? null :
    headgearIdx === 1 ? (
      // Crown
      <>
        <rect x="47" y="22" width="4" height="14" rx="1" fill="#f0c060" />
        <rect x="55" y="18" width="4" height="18" rx="1" fill="#f0c060" />
        <rect x="63" y="22" width="4" height="14" rx="1" fill="#f0c060" />
        <rect x="71" y="18" width="4" height="18" rx="1" fill="#f0c060" />
        <rect x="47" y="33" width="28" height="4" rx="1" fill="#f0c060" />
        <circle cx="57" cy="17" r="2" fill="#ef4444" />
        <circle cx="73" cy="17" r="2" fill="#3b82f6" />
        <circle cx="65" cy="21" r="1.5" fill="#06b6d4" />
      </>
    ) :
    headgearIdx === 2 ? (
      // Hood
      <>
        <path d="M40 40 Q60 22 80 40 L82 60 Q60 68 38 60 Z" fill="#2a2a2a" />
        <rect x="42" y="60" width="36" height="4" rx="1" fill="#2a2a2a" />
      </>
    ) :
    headgearIdx === 3 ? (
      // Hat
      <>
        <path d="M50 38 Q60 26 70 38" fill="none" stroke="#8b5e34" strokeWidth="6" />
        <ellipse cx="60" cy="40" rx="16" ry="3" fill="#8b5e34" />
        <path d="M54 26 Q60 20 66 26" fill="#8b5e34" />
      </>
    ) :
    headgearIdx === 4 ? (
      // Halo
      <>
        <ellipse cx="60" cy="28" rx="16" ry="4" fill="none" stroke="#f0c060" strokeWidth="2" opacity="0.8" />
      </>
    ) :
    headgearIdx === 5 ? (
      // Horns
      <>
        <path d="M46 42 L42 26 L50 40 Z" fill="#c0392b" />
        <path d="M74 42 L78 26 L70 40 Z" fill="#c0392b" />
      </>
    ) :
    headgearIdx === 6 ? (
      // Mask
      <>
        <path d="M46 52 L74 52 L72 62 L48 62 Z" fill="#00e5cc" opacity="0.7" rx="2" />
        <line x1="54" y1="56" x2="66" y2="56" stroke="#064e3b" strokeWidth="1.5" />
      </>
    ) :
    headgearIdx === 7 ? (
      // Glasses
      <>
        <circle cx="53" cy="56" r="5" fill="none" stroke="#888" strokeWidth="1.2" />
        <circle cx="67" cy="56" r="5" fill="none" stroke="#888" strokeWidth="1.2" />
        <line x1="58" y1="56" x2="62" y2="56" stroke="#555" strokeWidth="1.2" />
      </>
    ) : (
      // Antenna
      <>
        <line x1="60" y1="36" x2="60" y2="22" stroke="#00e5cc" strokeWidth="1.5" />
        <circle cx="60" cy="20" r="3" fill="#f0c060" />
      </>
    )

  const legs = (
    <>
      <rect x="48" y="116" width="10" height="26" rx="3" fill={legCol} />
      <rect x="62" y="116" width="10" height="26" rx="3" fill={legCol} />
      <rect x="46" y="141" width="14" height="6" rx="2" fill="#1f1f1f" />
      <rect x="60" y="141" width="14" height="6" rx="2" fill="#1f1f1f" />
    </>
  )

  const item =
    itemVariant === 0 ? null :
    itemVariant === 1 ? <><rect x="84" y="90" width="3" height="38" fill="#a16207" /><path d="M86 88 L96 94 L92 98 L86 94 Z" fill="#d1d5db" /></> :
    itemVariant === 2 ? <><ellipse cx="92" cy="104" rx="10" ry="14" fill="#6b7280" /><ellipse cx="92" cy="104" rx="7" ry="10" fill="#374151" /></> :
    itemVariant === 3 ? <><rect x="85" y="84" width="3" height="44" fill="#8b5e34" /><circle cx="86.5" cy="82" r="4" fill="#7c3aed" /></> :
    itemVariant === 4 ? <><rect x="83" y="92" width="10" height="14" rx="2" fill="#5b3b2a" /><line x1="88" y1="92" x2="88" y2="106" stroke="#d6b37a" strokeWidth="1" /></> :
    itemVariant === 5 ? <><rect x="86" y="97" width="2" height="25" fill="#7c4f27" /><path d="M87 96 L92 101 L87 104 Z" fill="#d1d5db" /></> :
    itemVariant === 6 ? <><path d="M80 92 Q90 80 98 92" fill="none" stroke="#8b5e34" strokeWidth="3" /><line x1="80" y1="92" x2="98" y2="92" stroke="#d1d5db" strokeWidth="1" /></> :
    itemVariant === 7 ? <><rect x="84" y="100" width="4" height="22" fill="#6b4a2b" /><circle cx="86" cy="98" r="4" fill="#f59e0b" opacity="0.85" /></> :
    <><circle cx="90" cy="92" r="6" fill="#22d3ee" opacity="0.8" /><rect x="88.5" y="98" width="3" height="20" fill="#334155" /></>

  return (
    <svg
      className={className}
      viewBox="0 0 120 160"
      width={size}
      height={size * 1.33}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      {auraColor && auraColor !== 'transparent' && (
        <circle cx="60" cy="80" r="58" fill={auraColor} />
      )}

      <ellipse cx="60" cy="148" rx="28" ry="6" fill="rgba(0,0,0,0.25)" />
      {legs}
      {body}
      {chestDetail}
      <rect x="56" y="76" width="8" height="6" rx="2" fill={skin} />

      {hasCatEars && (
        <>
          <path d="M48 41 L52 28 L56 42 Z" fill={hair} />
          <path d="M64 42 L68 28 L72 41 Z" fill={hair} />
          <path d="M50 40 L52 33 L54 40 Z" fill="#fbcfe8" opacity="0.8" />
          <path d="M66 40 L68 33 L70 40 Z" fill="#fbcfe8" opacity="0.8" />
        </>
      )}

      {hairBack}
      {head}
      {eyes}
      {mouth}
      {headgear}
      {item}
    </svg>
  )
}

// ── Thumbnail for part picker ─────────────────────────────────────────────────
function PartThumb({ previewConfig, selected, onClick, label, auraColor }) {
  return (
    <button
      className={`av-part-btn${selected ? ' av-part-btn--selected' : ''}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <RPGCharacterCanvas
        config={previewConfig}
        size={THUMB_SIZE}
        auraColor={auraColor}
      />
      <span className="av-part-label">{label}</span>
    </button>
  )
}

// ── Swatch button for colors ──────────────────────────────────────────────────
function Swatch({ color, selected, onClick, label }) {
  return (
    <button
      className={`av-swatch${selected ? ' av-swatch--selected' : ''}`}
      style={{ background: color }}
      onClick={onClick}
      title={label}
      type="button"
    />
  )
}

// ── Category helpers ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'gender',    label: 'GENDER' },
  { id: 'head',      label: 'FACE'   },
  { id: 'headgear',  label: 'HEAD'   },
  { id: 'hair',      label: 'HAIR'   },
  { id: 'eyes',      label: 'EYES'   },
  { id: 'body',      label: 'BODY'   },
  { id: 'legs',      label: 'LEGS'   },
  { id: 'accessory', label: 'ITEM'   },
  { id: 'aura',      label: 'AURA'   },
]

// Life Path → archetype subtitle text
const LP_ARCHETYPE_LABELS = {
  1:'The Initiator', 2:'The Mediator', 3:'The Creator', 4:'The Builder',
  5:'The Voyager', 6:'The Nurturer', 7:'The Seeker', 8:'The Sovereign', 9:'The Sage',
  11:'The Visionary', 22:'The Master Builder', 33:'The Master Healer',
}

// Life Path → archetype item bias (maps LP root to item variant indices 1–8)
const LP_ARCHETYPE_ITEMS = {
  1: [1, 2],  // Leadership  → sword, shield
  2: [7, 0],  // Partnership → orb, none
  3: [3, 8],  // Creativity  → staff, wand
  4: [4, 0],  // Foundation  → tome, none
  5: [5, 6],  // Freedom     → dagger, bow
  6: [7, 3],  // Harmony     → orb, staff
  7: [3, 7],  // Wisdom      → staff, orb
  8: [1, 2],  // Power       → sword, shield
  9: [7, 8],  // Mastery     → orb, wand
  11:[8, 7],  // Visionary   → wand, orb
  22:[4, 1],  // Builder     → tome, sword
  33:[8, 7],  // Master      → wand, orb
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AvatarCreator() {
  const { playerData, currentUser } = useAppState()
  const dispatch = useAppDispatch()

  // initialise config from playerData numbers
  const [config, setConfig] = useState(() => ({
    ...deriveDefaultAvatar(playerData),
    gender: 'male',
  }))
  const [activeCategory, setActiveCategory] = useState('head')
  const [panelOpen, setPanelOpen] = useState(true)

  const update = useCallback((key, val) =>
    setConfig(prev => ({ ...prev, [key]: val })), [])

  const auraColor     = AURA_COLORS[config.aura]?.color || 'transparent'

  // Randomise all parts — preserve gender, bias item by Life Path archetype
  const randomise = () => {
    const lp = playerData?.lp?.root || 1
    const archetypeItems = LP_ARCHETYPE_ITEMS[lp]
    const accessory = archetypeItems
      ? archetypeItems[Math.floor(Math.random() * archetypeItems.length)]
      : Math.floor(Math.random() * ACCESSORY_STYLES.length)
    setConfig(prev => ({
      headStyle: Math.floor(Math.random() * HEAD_STYLES.length),
      hairStyle: Math.floor(Math.random() * HAIR_STYLES.length),
      hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
      eyeStyle:  Math.floor(Math.random() * EYE_STYLES.length),
      eyeColor:  Math.floor(Math.random() * EYE_COLORS.length),
      bodyStyle: Math.floor(Math.random() * BODY_STYLES.length),
      legStyle:  Math.floor(Math.random() * LEG_STYLES.length),
      headgear:  Math.random() > 0.7 ? Math.floor(Math.random() * HEADGEAR_STYLES.length) : 0,
      aura:      Math.floor(Math.random() * AURA_COLORS.length),
      skinTone:  Math.floor(Math.random() * SKIN_TONES.length),
      catEars:   Math.random() > 0.5,
      gender:    prev.gender,
      accessory,
    }))
  }

  const handleEnter = () => {
    saveAvatar(config, playerData)
    dispatch({ type: 'LAUNCH_APP', payload: { user: currentUser || {}, playerData } })
  }

  // ── Part panel for current category ──────────────────────────────────────
  const renderPanel = () => {
    switch (activeCategory) {

      case 'gender':
        return (
          <>
            <div className="av-section-title">Gender</div>
            <div className="av-parts-grid">
              <PartThumb
                label="Male"
                selected={config.gender === 'male'}
                previewConfig={{ ...config, gender: 'male' }}
                auraColor={auraColor}
                onClick={() => update('gender', 'male')}
              />
              <PartThumb
                label="Female"
                selected={config.gender === 'female'}
                previewConfig={{ ...config, gender: 'female' }}
                auraColor={auraColor}
                onClick={() => update('gender', 'female')}
              />
            </div>
          </>
        )

      case 'head':
        return (
          <>
            <div className="av-section-title">Face Shape</div>
            <div className="av-parts-grid">
              {HEAD_STYLES.map((part, i) => (
                <PartThumb
                  key={part.id}
                  label={part.label}
                  selected={config.headStyle === i}
                  previewConfig={{ ...config, headStyle: i }}
                  auraColor={auraColor}
                  onClick={() => update('headStyle', i)}
                />
              ))}
            </div>
            <div className="av-section-title">Skin Tone</div>
            <div className="av-swatches">
              {SKIN_TONES.map((col, i) => (
                <Swatch
                  key={col}
                  color={col}
                  selected={config.skinTone === i}
                  onClick={() => update('skinTone', i)}
                  label={`Tone ${i + 1}`}
                />
              ))}
            </div>
          </>
        )

      case 'headgear':
        return (
          <>
            <div className="av-section-title">Head Gear</div>
            <div className="av-parts-grid">
              {HEADGEAR_STYLES.map((hg, i) => (
                <PartThumb
                  key={hg.id}
                  label={hg.label}
                  selected={(config.headgear || 0) === i}
                  previewConfig={{ ...config, headgear: i }}
                  auraColor={auraColor}
                  onClick={() => update('headgear', i)}
                />
              ))}
            </div>
          </>
        )

      case 'hair':
        return (
          <>
            <div className="av-section-title">Hair Style</div>
            <div className="av-parts-grid">
              {HAIR_STYLES.map((part, i) => (
                <PartThumb
                  key={part.id}
                  label={part.label}
                  selected={config.hairStyle === i}
                  previewConfig={{ ...config, hairStyle: i }}
                  auraColor={auraColor}
                  onClick={() => update('hairStyle', i)}
                />
              ))}
            </div>
            <div className="av-section-title">Hair Color</div>
            <div className="av-swatches">
              {HAIR_COLORS.map((col, i) => (
                <Swatch
                  key={col}
                  color={col}
                  selected={config.hairColor === i}
                  onClick={() => update('hairColor', i)}
                  label={`Color ${i + 1}`}
                />
              ))}
            </div>
          </>
        )

      case 'eyes':
        return (
          <>
            <div className="av-section-title">Eye Style</div>
            <div className="av-parts-grid">
              {EYE_STYLES.map((part, i) => (
                <PartThumb
                  key={part.id}
                  label={part.label}
                  selected={config.eyeStyle === i}
                  previewConfig={{ ...config, eyeStyle: i }}
                  auraColor={auraColor}
                  onClick={() => update('eyeStyle', i)}
                />
              ))}
            </div>
            <div className="av-section-title">Eye Color</div>
            <div className="av-swatches">
              {EYE_COLORS.map((col, i) => (
                <Swatch
                  key={col}
                  color={col}
                  selected={config.eyeColor === i}
                  onClick={() => update('eyeColor', i)}
                  label={`Color ${i + 1}`}
                />
              ))}
            </div>
          </>
        )

      case 'body':
        return (
          <>
            <div className="av-section-title">Body / Armor</div>
            <div className="av-parts-grid">
              {BODY_STYLES.map((part, i) => (
                <PartThumb
                  key={part.id}
                  label={part.label}
                  selected={config.bodyStyle === i}
                  previewConfig={{ ...config, bodyStyle: i }}
                  auraColor={auraColor}
                  onClick={() => update('bodyStyle', i)}
                />
              ))}
            </div>
          </>
        )

      case 'legs':
        return (
          <>
            <div className="av-section-title">Legs</div>
            <div className="av-parts-grid">
              {LEG_STYLES.map((part, i) => (
                <PartThumb
                  key={part.id}
                  label={part.label}
                  selected={config.legStyle === i}
                  previewConfig={{ ...config, legStyle: i }}
                  auraColor={auraColor}
                  onClick={() => update('legStyle', i)}
                />
              ))}
            </div>
          </>
        )

      case 'accessory':
        return (
          <>
            <div className="av-section-title">Items</div>
            <div className="av-parts-grid">
              {ACCESSORY_STYLES.map((part, i) => (
                <PartThumb
                  key={part.id}
                  label={part.label}
                  selected={config.accessory === i}
                  previewConfig={{ ...config, accessory: i }}
                  auraColor={auraColor}
                  onClick={() => update('accessory', i)}
                />
              ))}
            </div>
          </>
        )

      case 'aura':
        return (
          <>
            <div className="av-section-title">Aura Color</div>
            <div className="av-parts-grid">
              {AURA_COLORS.map((au, i) => (
                <button
                  key={au.id}
                  type="button"
                  className={`av-aura-btn${config.aura === i ? ' av-aura-btn--selected' : ''}`}
                  onClick={() => update('aura', i)}
                >
                  <span
                    className="av-aura-swatch"
                    style={{ background: au.color !== 'transparent' ? au.color : '#111', border: '2px solid #333' }}
                  />
                  <span>{au.label}</span>
                </button>
              ))}
            </div>
          </>
        )

      default: return null
    }
  }

  return (
    <div className="av-overlay">
      {/* atmospheric energy layer */}
      <div className="av-energy-layer" aria-hidden />

      <div className="av-header">
        <OnboardingProgress screen="avatarCreate" />
        <h2 className="av-title rpg-glow-teal">DESIGN YOUR AVATAR</h2>
        <p className="av-sub">Your image — seeded from your blueprint.</p>
      </div>

      <div className="av-layout">
        {/* ── Left: live preview ───────────────────────────────────────── */}
        <div className="av-preview-col">
          {/* pedestal wrapper */}
          <div className="av-pedestal">
            <div className="av-pedestal-glow" />
            <div className="av-pedestal-ring" />
            <div className="av-preview-frame" style={{ background: auraColor }}>
              <RPGCharacterCanvas
                config={config}
                size={PREVIEW_SIZE}
                auraColor={auraColor}
                className="av-preview-canvas"
              />
            </div>
          </div>

          {/* character identity panel */}
          {playerData?.name && (
            <div className="av-identity">
              <div className="av-identity-name rpg-glow-gold">{playerData.name}</div>
              {playerData?.lp?.root && (
                <div className="av-identity-lp">Life Path {playerData.lp.root}</div>
              )}
              {playerData?.lp?.root && LP_ARCHETYPE_LABELS[playerData.lp.root] && (
                <div className="av-identity-subtitle">"{LP_ARCHETYPE_LABELS[playerData.lp.root]}"</div>
              )}
            </div>
          )}

          <div className="av-preview-actions">
            <button className="av-btn av-btn--randomize" type="button" onClick={randomise}>
              🎲 RANDOMISE
            </button>
          </div>
        </div>

        {/* ── Right: part selector (desktop) / slide-up panel (mobile) ── */}
        <div className="av-editor-col av-editor-col--desktop">
          <div className="av-category-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`av-cat-tab${activeCategory === cat.id ? ' av-cat-tab--active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="av-panel" key={activeCategory}>
            {renderPanel()}
          </div>
        </div>
      </div>

      <div className="av-footer">
        <button className="av-btn av-btn--confirm" type="button" onClick={handleEnter}>
          ▶ ENTER THE SIMULATION
        </button>
      </div>

      {/* ── Mobile slide-up panel ────────────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            className="av-mobile-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) setPanelOpen(false)
            }}
          >
            {/* Drag handle */}
            <div className="av-panel-handle" onClick={() => setPanelOpen(false)} />

            {/* Toggle button when panel is collapsed */}
            {!panelOpen && (
              <button
                className="av-panel-toggle-btn"
                type="button"
                onClick={() => setPanelOpen(true)}
              >
                🎨 CUSTOMIZE
              </button>
            )}

            {/* Category tabs */}
            <div className="av-category-tabs av-category-tabs--mobile">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`av-cat-tab${activeCategory === cat.id ? ' av-cat-tab--active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="av-panel av-panel--mobile"
            >
              {renderPanel()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
