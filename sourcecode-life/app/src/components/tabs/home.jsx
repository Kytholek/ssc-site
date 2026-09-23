/**
 * HomeTab
 *
 * Daily dashboard: dossier CharCard, quest journal TODAY, Seasons cycles.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useGameState } from '../../state/GameContext'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { fmt } from '../../lib/numerology'
import { CALLING } from '../../lib/data'
import { loadAvatar, AURA_COLORS } from '../../lib/avatarParts'
import {
  fetchUserAvatar,
  fetchUserEquipment,
  fetchCreatorReputation,
  fetchTakerReputation,
} from '../auth/firestoreprofile'
import { getDisplayName, setDisplayName } from '../../lib/storage'
import { formatDisplayName } from '../../lib/formatters'
import { CharacterCardPanel } from '../equipment/equipment.jsx'
import { RPGCharacterCanvas } from '../charCreate/AvatarCreator.jsx'
import SeasonsSection from '../datachunks/Seasons'
import DailySection from '../datachunks/dailyquests'
import { useFloatingXP, useParticleBurst } from '../effects/FloatingXP'
import { useQuestRewardToast } from '../effects/QuestRewardToast'
import { MedalsRow } from '../Achievements.jsx'
import PremiumBadge from '../ui/PremiumBadge'
import GettingStartedChecklist from '../ui/GettingStartedChecklist'
import TodayProgressChips from '../ui/TodayProgressChips'

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

const XP_HINTS = {
  freq: 'Personal frequency — grows from daily and life quests.',
  social: 'World-map / ally quests — grows from side quests on the map.',
}

function AvatarPreview({ config }) {
  const auraColor = AURA_COLORS[config.aura]?.color || 'transparent'
  const bg = auraColor !== 'transparent' ? auraColor : '#0a1520'
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '10px' }}>
      <RPGCharacterCanvas config={config} size={80} auraColor={auraColor} />
    </div>
  )
}

function DisplayNameModal({ open, draft, onDraftChange, onClose, onSave }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select?.()
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSave = () => {
    const t = draft.trim()
    if (!t) return
    onSave(t)
    onClose()
  }

  return createPortal(
    <div
      className="home-name-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="home-name-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-name-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="home-name-modal-title" className="home-name-modal-title">
          Display name
        </h2>
        <p className="home-name-modal-sub">
          Shown on your public character card. You can change it anytime.
        </p>
        <label htmlFor="home-name-input" className="home-name-modal-label">
          Name
        </label>
        <input
          id="home-name-input"
          ref={inputRef}
          type="text"
          className="home-name-modal-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          maxLength={48}
          autoComplete="nickname"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
        />
        <div className="home-name-modal-actions">
          <button type="button" className="home-name-modal-btn home-name-modal-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="home-name-modal-btn home-name-modal-btn--primary"
            onClick={handleSave}
            disabled={!draft.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function CharCard({ dailyProgress }) {
  const dispatch = useAppDispatch()
  const { playerData, currentUser } = useAppState()
  const { user } = useGameState()
  const { xp, charBarPct, freqBarPct } = useQuestEngine()
  const [avatarConfig, setAvatarConfig] = useState(null)
  const [avatarLoading, setAvatarLoading] = useState(true)
  const [cardOpen, setCardOpen] = useState(false)
  const [nameEditOpen, setNameEditOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [freqPulsing, setFreqPulsing] = useState(false)
  const [charPulsing, setCharPulsing] = useState(false)
  const [ownRep, setOwnRep] = useState(null)
  const [takerRep, setTakerRep] = useState(null)
  const prevFreqLevel = useRef(xp.freqLevel)
  const prevCharLevel = useRef(xp.charLevel)

  const openCharacterCard = useCallback(() => setCardOpen(true), [])
  const openBlueprint = useCallback(() => {
    dispatch({ type: 'SET_TAB', payload: 'profile', section: 'blueprint' })
  }, [dispatch])
  const openStats = useCallback(() => {
    dispatch({ type: 'SET_TAB', payload: 'profile', section: 'stats' })
  }, [dispatch])

  useEffect(() => {
    if (xp.freqLevel > prevFreqLevel.current) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot animation flag */
      setFreqPulsing(true)
      setTimeout(() => setFreqPulsing(false), 700)
      prevFreqLevel.current = xp.freqLevel
    }
  }, [xp.freqLevel])

  useEffect(() => {
    if (xp.charLevel > prevCharLevel.current) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot animation flag */
      setCharPulsing(true)
      setTimeout(() => setCharPulsing(false), 700)
      prevCharLevel.current = xp.charLevel
    }
  }, [xp.charLevel])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset skeleton when user/profile changes */
    setAvatarLoading(true)

    const loadWithGear = (baseConfig) => {
      if (!currentUser?.uid) { setAvatarConfig(baseConfig || null); setAvatarLoading(false); return }
      fetchUserEquipment(currentUser.uid)
        .then((eq) => {
          const cfg = baseConfig || loadAvatar() || {}
          if (eq?.head && HEADGEAR_MAP[eq.head]) {
            cfg.headgear = HEADGEAR_MAP[eq.head]
          }
          setAvatarConfig(cfg)
        })
        .catch(() => setAvatarConfig(baseConfig || null))
        .finally(() => setAvatarLoading(false))
    }

    if (currentUser?.uid) {
      fetchUserAvatar(currentUser.uid)
        .then((firestoreAvatar) => loadWithGear(firestoreAvatar || loadAvatar()))
        .catch(() => loadWithGear(loadAvatar()))
    } else {
      loadWithGear(loadAvatar())
    }
  }, [currentUser, playerData])

  useEffect(() => {
    if (!currentUser?.uid) return undefined
    let cancelled = false
    fetchCreatorReputation(currentUser.uid).then((rep) => { if (!cancelled) setOwnRep(rep) })
    fetchTakerReputation(currentUser.uid).then((rep) => { if (!cancelled) setTakerRep(rep) })
    return () => { cancelled = true }
  }, [currentUser?.uid])

  if (!playerData) {
    return (
      <div className="char-card char-card--loading">
        <div className="char-card-skeleton">
          <div className="char-card-skeleton-avatar" />
          <div className="char-card-skeleton-lines">
            <div className="char-card-skeleton-line char-card-skeleton-line--wide" />
            <div className="char-card-skeleton-line char-card-skeleton-line--narrow" />
          </div>
        </div>
        <div className="char-card-skeleton-bars">
          <div className="char-card-skeleton-bar" />
          <div className="char-card-skeleton-bar" />
        </div>
      </div>
    )
  }

  const { cl, name } = playerData
  const displayName = getDisplayName() || name || ''
  const displayNameUpper = formatDisplayName(displayName).toUpperCase()
  const callingName = (CALLING[cl.root]?.name || 'Unknown').toUpperCase()
  const callingTitle = CALLING[cl.root]?.essence || CALLING[cl.root]?.summary || 'Life calling'

  const makerEmpty = !ownRep || ownRep.ratingCount === 0
  const seekerEmpty = !takerRep || takerRep.ratingCount === 0
  const makerAvg = !makerEmpty ? (ownRep.totalRating / ownRep.ratingCount).toFixed(1) : null
  const makerTotal = !makerEmpty ? (ownRep.completions + ownRep.noShows) : 0
  const makerPct = makerTotal > 0
    ? Math.round(ownRep.completions / makerTotal * 100)
    : null
  const showCustomize = !avatarLoading && !avatarConfig

  return (
    <div className="char-card char-card--dossier char-card--entrance" data-tour="char-card">
      <span className="char-card-spine" aria-hidden="true" />
      <span className="char-card-grain" aria-hidden="true" />

      <div className="char-card-identity">
        <button
          type="button"
          className="char-card-portrait char-card-portrait--opens-card"
          onClick={openCharacterCard}
          aria-label={showCustomize ? 'Customize avatar' : 'Open character card'}
        >
          {avatarLoading ? (
            <span className="char-card-portrait-skeleton" aria-hidden="true" />
          ) : avatarConfig ? (
            <AvatarPreview config={avatarConfig} />
          ) : (
            <span className="char-card-portrait-placeholder">
              <span className="char-card-portrait-placeholder-icon" aria-hidden="true">+</span>
              <span className="char-card-portrait-placeholder-label">Customize</span>
            </span>
          )}
          <span className="char-card-portrait-shimmer" />
        </button>

        <div className="char-card-id-text">
          <div className="char-card-calling-archetype" title={callingTitle}>
            <div className="char-card-calling-archetype-name">{callingName}</div>
          </div>

          <div className="char-card-name-row">
            <button
              type="button"
              className="char-card-name char-card-name--editable"
              id="char-display-name"
              onClick={() => {
                setNameDraft(displayName)
                setNameEditOpen(true)
              }}
              aria-label="Edit display name"
              title="Tap to edit name"
            >
              {displayNameUpper || 'SET NAME'}
            </button>
            {user?.isPremium && <PremiumBadge size="sm" />}
            <span
              className="char-card-calling"
              title={callingTitle}
              aria-label={callingTitle}
            >
              <span className="char-card-calling-num">{fmt(cl.root, cl.compound)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="char-card-rep-section" aria-label="Maker and seeker reputation">
        <div className={`char-card-rep${makerEmpty ? ' char-card-rep--empty' : ''}`}>
          <span className="char-card-rep-label">MAKER</span>
          {!makerEmpty ? (
            <div className="char-card-rep-body">
              <span className="char-card-rep-stars">⭐ {makerAvg}</span>
              <span className="char-card-rep-sub">{makerPct}% · {ownRep.ratingCount} quests</span>
            </div>
          ) : (
            <span className="char-card-rep-none">No ratings yet</span>
          )}
        </div>
        <div className={`char-card-rep${seekerEmpty ? ' char-card-rep--empty' : ''}`}>
          <span className="char-card-rep-label">SEEKER</span>
          {!seekerEmpty ? (
            <div className="char-card-rep-body">
              <span className="char-card-rep-stars">⭐ {(takerRep.totalRating / takerRep.ratingCount).toFixed(1)}</span>
              <span className="char-card-rep-sub">{takerRep.ratingCount} rated</span>
            </div>
          ) : (
            <span className="char-card-rep-none">No ratings yet</span>
          )}
        </div>
      </div>

      <div className="char-card-meta char-card-meta--medals" aria-label="Earned medals">
        <MedalsRow />
      </div>

      <div className="char-card-xp-mirror" aria-label="Experience">
        <div className="char-card-xp-side char-card-xp-side--freq" title={XP_HINTS.freq}>
          <div className="char-card-xp-side-head">
            <span className="char-card-xp-side-label">FREQ</span>
            <span className="char-card-xp-side-lv">LV {xp.freqLevel}</span>
          </div>
          <div className="char-card-xp-track char-card-xp-track--freq">
            <div
              className={`quest-xp-fill quest-xp-fill--freq quest-xp-fill--shimmer${freqPulsing ? ' quest-xp-fill--pulsing-freq' : ''}`}
              style={{ width: `${freqBarPct}%` }}
            />
          </div>
          <span className="char-card-xp-side-pct">{freqBarPct}%</span>
        </div>

        <span className="char-card-xp-divider" aria-hidden="true" />

        <div className="char-card-xp-side char-card-xp-side--social" title={XP_HINTS.social}>
          <div className="char-card-xp-side-head">
            <span className="char-card-xp-side-label">SOCIAL</span>
            <span className="char-card-xp-side-lv">LV {xp.charLevel}</span>
          </div>
          <div className="char-card-xp-track char-card-xp-track--social">
            <div
              className={`quest-xp-fill quest-xp-fill--char quest-xp-fill--shimmer${charPulsing ? ' quest-xp-fill--pulsing-char' : ''}`}
              style={{ width: `${charBarPct}%` }}
            />
          </div>
          <span className="char-card-xp-side-pct">{charBarPct}%</span>
        </div>
      </div>

      {dailyProgress && (
        <TodayProgressChips
          className="char-card-daily-pulse"
          glyphsDone={dailyProgress.glyphsDone}
          glyphsTotal={dailyProgress.glyphsTotal}
          dailyComplete={dailyProgress.dailyComplete}
        />
      )}

      <nav className="char-card-rail" aria-label="Character shortcuts">
        <button type="button" className="char-card-seal" onClick={openBlueprint}>
          <span className="char-card-seal-glyph" aria-hidden="true">◈</span>
          <span className="char-card-seal-label">BLUEPRINT</span>
        </button>
        <button type="button" className="char-card-seal" onClick={openStats}>
          <span className="char-card-seal-glyph" aria-hidden="true">◇</span>
          <span className="char-card-seal-label">STATS</span>
        </button>
        <button type="button" className="char-card-seal" onClick={openCharacterCard}>
          <span className="char-card-seal-glyph" aria-hidden="true">✦</span>
          <span className="char-card-seal-label">EQUIPMENT</span>
        </button>
      </nav>

      <DisplayNameModal
        open={nameEditOpen}
        draft={nameDraft}
        onDraftChange={setNameDraft}
        onClose={() => setNameEditOpen(false)}
        onSave={(next) => setDisplayName(next)}
      />

      <CharacterCardPanel open={cardOpen} onClose={() => setCardOpen(false)} />
    </div>
  )
}

export default function HomeTab() {
  const { playerData } = useAppState()
  const { daily, completeDailyQuest, getDailyGlyphsState } = useQuestEngine()
  const [glyphTick, setGlyphTick] = useState(0)

  useEffect(() => {
    const onGlyphs = () => setGlyphTick((n) => n + 1)
    window.addEventListener('scl:daily_glyphs_updated', onGlyphs)
    return () => window.removeEventListener('scl:daily_glyphs_updated', onGlyphs)
  }, [])

  const dailyProgress = useMemo(() => {
    if (!playerData) return null
    const glyphsState = getDailyGlyphsState(playerData.lp.root)
    const glyphsDone = glyphsState?.completed?.filter(Boolean).length ?? 0
    return {
      glyphsDone,
      glyphsTotal: 3,
      dailyComplete: Boolean(daily?.completed),
    }
  }, [playerData, daily?.completed, getDailyGlyphsState, glyphTick])

  return (
    <>
      <FloatingXPDisplay />
      <ParticleBurstDisplay />
      <QuestRewardToastDisplay />

      <div className="tab-panel-content home-dashboard">
        <GettingStartedChecklist />
        <CharCard dailyProgress={dailyProgress} />

        {playerData && daily && (
          <section className="home-today-section home-today-section--journal" data-tour="today" aria-label="Today">
            <DailySection
              playerData={playerData}
              daily={daily}
              completeDailyQuest={completeDailyQuest}
            />
          </section>
        )}

        {playerData && (
          <SeasonsSection playerData={playerData} lpRoot={playerData.lp.root} />
        )}
      </div>
    </>
  )
}

function FloatingXPDisplay() {
  const el = useFloatingXP()
  return el
}

function ParticleBurstDisplay() {
  const el = useParticleBurst()
  return el
}

function QuestRewardToastDisplay() {
  const el = useQuestRewardToast()
  return el
}
