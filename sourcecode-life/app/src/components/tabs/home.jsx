/**
 * HomeTab
 *
 * Daily dashboard: character card, then Overview (reading and seasons) or Quests (journal).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useGameState } from '../../state/GameContext'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { loadAvatar } from '../../lib/avatarParts'
import {
  fetchUserAvatar,
  fetchUserEquipment,
  fetchCreatorReputation,
  fetchTakerReputation,
} from '../auth/firestoreprofile'
import { getDisplayName, setDisplayName } from '../../lib/storage'
import { formatDisplayName } from '../../lib/formatters'
import { CharacterCardPanel } from '../equipment/equipment.jsx'
import CharacterDossier from '../character/CharacterDossier'
import SeasonsSection from '../datachunks/Seasons'
import DailySection, { TodayReading } from '../datachunks/dailyquests'
import { useFloatingXP, useParticleBurst } from '../effects/FloatingXP'
import { useQuestRewardToast } from '../effects/QuestRewardToast'
import GettingStartedChecklist from '../ui/GettingStartedChecklist'
import {
  loadClassLoadout,
  getClassTitle,
  getFilledSlots,
} from '../../lib/classLoadout'

const HOME_SECTIONS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'journal', label: 'QUESTS' },
]

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

const CORE_LABELS = {
  lp: 'Life Path',
  ex: 'Expression',
  cl: 'Life Calling',
  so: 'Soul',
  ou: 'Outer',
  ac: 'Achievement',
  th: 'Theme',
}

function reduceUniversalDay(n) {
  const masters = new Set([11, 22, 33])
  while (n > 9 && !masters.has(n)) {
    n = String(n).split('').reduce((sum, digit) => sum + Number(digit), 0)
  }
  return n
}

function universalDayAlignment(playerData) {
  if (!playerData) return ''
  const now = new Date()
  const raw = now.getMonth() + 1 + now.getDate() + now.getFullYear()
  const ud = reduceUniversalDay(String(raw).split('').reduce((sum, digit) => sum + Number(digit), 0))
  const matches = Object.keys(CORE_LABELS).filter(key => playerData[key]?.root === ud).map(key => CORE_LABELS[key])
  return matches.length ? `Universal Day ${ud} aligns with your ${matches.join(' & ')}` : ''
}

const XP_HINTS = {
  freq: 'Personal frequency — grows from daily and life quests.',
  social: 'World-map / ally quests — grows from side quests on the map.',
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

function CharCard() {
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
  const [classLoadout, setClassLoadout] = useState(() => loadClassLoadout())
  const prevFreqLevel = useRef(xp.freqLevel)
  const prevCharLevel = useRef(xp.charLevel)

  const openCharacterCard = useCallback(() => setCardOpen(true), [])
  const openBlueprint = useCallback(() => {
    dispatch({ type: 'SET_TAB', payload: 'profile', section: 'blueprint' })
  }, [dispatch])
  const openSkills = useCallback(() => {
    dispatch({ type: 'SET_TAB', payload: 'profile', section: 'skills' })
  }, [dispatch])
  const openStats = useCallback(() => {
    dispatch({ type: 'SET_TAB', payload: 'profile', section: 'stats' })
  }, [dispatch])
  const openCurrent = useCallback(() => {
    dispatch({ type: 'SET_TAB', payload: 'quests', section: 'current' })
  }, [dispatch])

  useEffect(() => {
    const onLoadout = (e) => setClassLoadout(e.detail || loadClassLoadout())
    window.addEventListener('scl:class_loadout_updated', onLoadout)
    return () => window.removeEventListener('scl:class_loadout_updated', onLoadout)
  }, [])

  useEffect(() => {
    if (xp.freqLevel > prevFreqLevel.current) {
      setFreqPulsing(true)
      setTimeout(() => setFreqPulsing(false), 700)
      prevFreqLevel.current = xp.freqLevel
    }
  }, [xp.freqLevel])

  useEffect(() => {
    if (xp.charLevel > prevCharLevel.current) {
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
  const classTitle = getClassTitle(classLoadout)
  const hasClass = getFilledSlots(classLoadout).length > 0

  const makerEmpty = !ownRep || ownRep.ratingCount === 0
  const seekerEmpty = !takerRep || takerRep.ratingCount === 0
  const showCustomize = !avatarLoading && !avatarConfig

  return (
    <div className="char-card char-card--dossier char-card--entrance" data-tour="char-card">
      <span className="char-card-spine" aria-hidden="true" />
      <span className="char-card-grain" aria-hidden="true" />

      <CharacterDossier
        profile={{
          name: displayName,
          cl,
          lp: playerData.lp,
          ex: playerData.ex,
          classTitle: hasClass ? classTitle : '',
          avatarConfig,
          avatarLoading,
          isPremium: user?.isPremium,
          reputation: ownRep,
          takerReputation: takerRep,
        }}
        onPortraitClick={openCharacterCard}
        portraitLabel={showCustomize ? 'Customize avatar' : 'Open character card'}
        nameNode={(
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
        )}
        classNode={hasClass ? (
          <button
            type="button"
            className="char-card-class-title"
            onClick={openSkills}
            title="Open Skills to change class"
          >
            {classTitle}
          </button>
        ) : (
          <button
            type="button"
            className="char-card-class-empty"
            onClick={openSkills}
          >
            Choose a class in Skills
          </button>
        )}
      />

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

      {(makerEmpty && seekerEmpty) && (
        <button
          type="button"
          className="char-card-rep-empty-link"
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'map' })}
        >
          Maker · Seeker — build reputation in Realm
        </button>
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
        <button type="button" className="char-card-seal" onClick={openCurrent}>
          <span className="char-card-seal-glyph" aria-hidden="true">✦</span>
          <span className="char-card-seal-label">TIMELINE</span>
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
  const { playerData, tabSection } = useAppState()
  const dispatch = useAppDispatch()
  const { daily, completeDailyQuest } = useQuestEngine()
  const [section, setSection] = useState(() =>
    tabSection === 'journal' ? 'journal' : 'overview'
  )
  const [alignmentDismissed, setAlignmentDismissed] = useState(false)
  const alignment = universalDayAlignment(playerData)
  const [prevTabSection, setPrevTabSection] = useState(tabSection)

  if (tabSection !== prevTabSection) {
    setPrevTabSection(tabSection)
    if (tabSection === 'journal' || tabSection === 'overview') {
      setSection(tabSection)
    }
  }

  useEffect(() => {
    if (tabSection === 'journal' || tabSection === 'overview') {
      dispatch({ type: 'CLEAR_TAB_SECTION' })
    }
  }, [tabSection, dispatch])

  useEffect(() => {
    const handle = (e) => {
      const sub = e.detail?.sub
      if (e.detail?.main === 'home' && (sub === 'journal' || sub === 'overview')) {
        setSection(sub)
      }
    }
    window.addEventListener('scl:open-sub-tab', handle)
    return () => window.removeEventListener('scl:open-sub-tab', handle)
  }, [])

  return (
    <>
      <FloatingXPDisplay />
      <ParticleBurstDisplay />
      <QuestRewardToastDisplay />

      <div className="tab-panel-content home-dashboard">
        {alignment && !alignmentDismissed && (
          <div className="freq-spike-banner freq-spike-banner--home" role="status">
            <span className="freq-spike-icon" aria-hidden="true">⚡</span>
            <span className="freq-spike-text">{alignment}</span>
            <button type="button" className="freq-spike-close" onClick={() => setAlignmentDismissed(true)} aria-label="Dismiss frequency alert">✕</button>
          </div>
        )}
        <GettingStartedChecklist />
        <CharCard />

        <div className="home-insights">
          <div className="home-insights-head">
            <h2 className="home-section-heading">
              <span className="home-section-heading-line" aria-hidden="true" />
              <span className="home-section-heading-glyph" aria-hidden="true">◇</span>
              Daily Insights
              <span className="home-section-heading-glyph" aria-hidden="true">◇</span>
              <span className="home-section-heading-line" aria-hidden="true" />
            </h2>
          </div>
          <nav className="profile-navbar home-subnav" role="tablist" aria-label="Daily Insights">
              {HOME_SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={section === item.id}
                  className={`profile-navbar-btn${section === item.id ? ' active' : ''}`}
                  onClick={() => setSection(item.id)}
                >
                  {item.label}
                </button>
            ))}
          </nav>

        {section === 'overview' && (
          <section className="home-day-box" aria-label="Overview">
            {playerData && daily ? (
              <TodayReading
                playerData={playerData}
                daily={daily}
                completeDailyQuest={completeDailyQuest}
              />
            ) : (
              <div className="home-today-loading" aria-busy="true">
                <p className="home-today-loading-label">Loading today&apos;s reading…</p>
              </div>
            )}
            {playerData && (
              <SeasonsSection playerData={playerData} />
            )}
          </section>
        )}

        {section === 'journal' && (
          <section className="home-today-section home-today-section--journal" data-tour="today" aria-label="Today">
            {playerData && daily && (
              <DailySection
                playerData={playerData}
                daily={daily}
              />
            )}
          </section>
        )}
        </div>
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
