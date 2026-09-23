/**
 * QuestsTab — Life / Current / Journals
 */
import { useState, useEffect } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import LifeQuestFlow from '../flow/LifeQuestFlow'
import LifeQuestObjectivesPanel from '../flow/LifeQuestObjectivesPanel'
import TimeFlow from '../flow/TimeFlow'
import QuestJournals from '../datachunks/QuestJournals'
import CoachMark from '../ui/CoachMark'
import { ensureDailyQuests } from '../../lib/numerologyQuests'
import { NUM_QUESTS, MASTER_QUESTS } from '../../lib/data'
import { reduceToSimple } from '../../lib/numerology'

const MASTERS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99])

const SECTIONS = [
  { id: 'life',     label: '✦ LIFE',     subtitle: 'Your 7 frequency quests' },
  { id: 'current',  label: '◈ CURRENT',  subtitle: 'Time cycles & seasons' },
  { id: 'journals', label: '◇ JOURNALS', subtitle: 'Quest reflections' },
]

function getQuestData(root) {
  if (MASTERS.has(root) && MASTER_QUESTS[root]) return MASTER_QUESTS[root]
  const simple = reduceToSimple(root)
  return NUM_QUESTS[simple] || NUM_QUESTS[9]
}

const LIFE_NODE_META = {
  so: { label: 'SOUL',    title: 'SOUL QUEST',        sub: 'Your Inner Desire',   unlockLv: 0  },
  ou: { label: 'OUTER',   title: 'OUTER QUEST',       sub: 'Your Public Persona', unlockLv: 0  },
  ac: { label: 'ACHIEVE', title: 'ACHIEVEMENT QUEST', sub: 'How You Accomplish',  unlockLv: 5  },
  lp: { label: 'PATH',    title: 'LIFE PATH QUEST',   sub: 'What You Learn',      unlockLv: 10 },
  ex: { label: 'EXPR',    title: 'EXPRESSION QUEST',  sub: 'What You Carry',      unlockLv: 10 },
  cl: { label: 'CALLING', title: 'LIFE CALLING',      sub: 'Your Main Quest',     unlockLv: 15 },
  th: { label: 'THEME',   title: 'THEME QUEST',       sub: 'Your Life Curriculum', unlockLv: 20 },
}

function getQuestDescription(questKey) {
  const descriptions = {
    so: 'Soul Quest — Your inner desire and what your soul genuinely craves',
    ou: 'Outer Quest — How you present yourself to the world',
    ac: 'Achievement Quest — How you accomplish and build mastery',
    lp: 'Life Path Quest — What you are here to learn',
    ex: 'Expression Quest — What you carry and communicate',
    cl: 'Life Calling — Your main quest and primary mission',
    th: 'Theme Quest — Your life curriculum',
  }
  return descriptions[questKey] || 'Quest objective'
}

function LifeSection({ playerData, lqp, freqLevel }) {
  const { lp, ex, cl, so, ou, ac, th } = playerData
  const numMap = { so, ou, ac, lp, ex, cl, th }
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  function renderInlinePanel(selected, { onClose, onObjectiveClick } = {}) {
    if (!selected) return null
    if (!numMap[selected]) return null

    return (
      <LifeQuestObjectivesPanel
        selected={selected}
        numMap={numMap}
        nodeMeta={LIFE_NODE_META}
        lqp={lqp}
        onObjectiveClick={onObjectiveClick}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="lqt-section">
      <CoachMark storageKey="scl_coach_life_quest" title="Life Quest" afterTour>
        Tap a node to see your growth path. Open any objective for details.
      </CoachMark>
      <LifeQuestFlow
        numMap={numMap}
        freqLevel={freqLevel}
        nodeMeta={LIFE_NODE_META}
        getQuestData={getQuestData}
        lqp={lqp}
        onLocked={showToast}
        renderPanel={renderInlinePanel}
        getQuestDescription={getQuestDescription}
      />
      {toast && (
        <div className="lqt-toast lqt-toast--visible" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  )
}

export default function QuestsTab() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const player = state.playerData
  const { tabSection } = state
  const [section, setSection] = useState(() =>
    SECTIONS.some((s) => s.id === tabSection) ? tabSection : 'life'
  )
  const [prevTabSection, setPrevTabSection] = useState(tabSection)
  const { lqp, sideQuests, xp } = useQuestEngine()
  const freqLevel = xp?.freqLevel ?? 1

  if (tabSection !== prevTabSection) {
    setPrevTabSection(tabSection)
    if (SECTIONS.some((s) => s.id === tabSection)) {
      setSection(tabSection)
    }
  }

  useEffect(() => {
    if (SECTIONS.some((s) => s.id === tabSection)) {
      dispatch({ type: 'CLEAR_TAB_SECTION' })
    }
  }, [tabSection, dispatch])

  useEffect(() => {
    if (player) ensureDailyQuests(player)
  }, [player])

  useEffect(() => { window.scrollTo(0, 0) }, [section])

  if (!player) return (
    <div className="tab-panel-content">
      <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Loading character data…</p>
    </div>
  )

  return (
    <div className="tab-panel-content tab-panel-content--quests">
      <div className="profile-navbar" role="tablist" aria-label="Quest sections">
        {SECTIONS.map(s => (
          <button key={s.id} type="button" role="tab" aria-selected={section === s.id}
            className={`profile-navbar-btn${section === s.id ? ' active' : ''}`}
            onClick={() => setSection(s.id)}>
            <span className="profile-navbar-btn-label">{s.label}</span>
            {section === s.id && <span className="profile-navbar-btn-sub">{s.subtitle}</span>}
          </button>
        ))}
      </div>

      <div className="quest-section-body">
        {section === 'life'     && <LifeSection playerData={player} lqp={lqp} freqLevel={freqLevel} />}
        {section === 'current'  && <TimeFlow playerData={player} sideQuests={sideQuests} />}
        {section === 'journals' && <QuestJournals />}
      </div>
    </div>
  )
}
