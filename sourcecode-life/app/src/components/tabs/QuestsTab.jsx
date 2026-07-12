/**
 * QuestsTab — Quest Hub with Life/Current flow integration
 *
 * Architecture:
 *   Hub = navigation layer (summaries + quick actions)
 *   Sections keep visual hierarchy
 *   Flow cards are expandable summaries
 */
import { useState, useEffect, useMemo } from 'react'
import { useAppState } from '../../context/AppContext'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import LifeQuestFlow from '../flow/LifeQuestFlow'
import LifeQuestObjectivesPanel from '../flow/LifeQuestObjectivesPanel'
import TimeFlow from '../flow/TimeFlow'
import QuestJournals from '../datachunks/QuestJournals'
import ObjectiveGlyph from '../quests/ObjectiveGlyph'
import QuestDetailModal from '../quests/QuestDetailModal'
import FlowDetailPanel from '../flow/FlowDetailPanel'
import CoachMark from '../ui/CoachMark'
import { saveFocusQuest } from '../../lib/focusQuests'
import { buildObjectiveGlyphs, getLifeMissionTotals } from '../../lib/questHub'
import { getGeneratedQuests, getActiveMultiDayQuests, ensureDailyQuests } from '../../lib/numerologyQuests'

import {
  NUM_QUESTS, MASTER_QUESTS, MAIN_QUEST_DATA, CALLING,
  CYCLE_MEANINGS, CYCLE_QUEST_COLORS,
  MONTH_NAMES,
} from '../../lib/data'
import {
  PLACEMENT_OBJECTIVES,
  getTieredObjectiveTexts,
  getTierObjectiveCount,
} from '../../lib/objectives'

const TIER_LABELS = { 1: 'APPRENTICE', 2: 'ADEPT', 3: 'MASTER' }
import { fmt, reduceToSimple } from '../../lib/numerology'

const MASTERS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99])

const SECTIONS = [
  { id: 'life',     label: '✦ LIFE',     subtitle: 'Your 7 frequency quests' },
  { id: 'current',  label: '◈ CURRENT',  subtitle: 'Time cycles & seasons' },
  { id: 'journals', label: '◇ JOURNALS', subtitle: 'Quest reflections' },
]

function cv(token) { return `var(${token})` }

function getQuestData(root) {
  if (MASTERS.has(root) && MASTER_QUESTS[root]) return MASTER_QUESTS[root]
  const simple = reduceToSimple(root)
  return NUM_QUESTS[simple] || NUM_QUESTS[9]
}

function getActiveTierFromLQP(questKey, lqp) {
  if (!lqp || !lqp[questKey]) return 1
  for (let t = 1; t <= 3; t++) {
    const prog = lqp[questKey][t] || []
    if (!prog.length) return t
    const allDone = prog.every(Boolean)
    if (!allDone) return t
  }
  return 3
}

// ─── Sub-components ──────────────────────────────────────────────

function TieredObjectives({ root, questKey, lqp, onObjectiveClick }) {
  const activeTier = getActiveTierFromLQP(questKey, lqp)
  
  // Get objectives for all tiers
  const tierObjectives = [1, 2, 3].map(tier => {
    const objs = getTieredObjectiveTexts(root, tier)
    const isActive = tier === activeTier
    const isPast = tier < activeTier
    const lqpEntry = lqp?.[questKey]
    const prog = lqpEntry?.[tier] || []
    
    return {
      tier,
      objs,
      isActive,
      isPast,
      prog,
      icon: isPast ? '✓ ' : isActive ? '▶ ' : '◇ ',
      label: TIER_LABELS[tier]
    }
  })
  
  return (
    <div className="life-tiers">
      {tierObjectives.map(({ tier, objs, isActive, isPast, prog, icon, label }) => (
        <div key={tier} className={`life-tier${isActive ? ' life-tier-active' : isPast ? ' life-tier-past' : ' life-tier-locked'}`}>
          <div className="life-tier-label">
            {icon}{label}
            {isActive && <span className="life-tier-tag">CURRENT</span>}
            {isPast && <span className="life-tier-tag life-tier-tag-done">COMPLETE</span>}
          </div>
          {!isActive && !isPast ? (
            <div className="life-tier-locked-msg">
              Complete previous tier to unlock
            </div>
          ) : (
            <div className="life-tier-glyph-grid">
              {objs.map((o, i) => {
                const isDone = !!prog[i]
                const isLocked = !isActive
                return (
                  <div
                    key={i}
                    className={`life-tier-glyph${isDone ? ' life-tier-glyph--done' : ''}${isLocked ? ' life-tier-glyph--locked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onObjectiveClick?.({ questKey, tier, objIdx: i, text: o, done: isDone })
                    }}
                    title={o}
                  >
                    <div className="life-tier-glyph-icon">
                      {isDone ? '✓' : isLocked ? '🔒' : '◈'}
                    </div>
                    <div className="life-tier-glyph-text">{o}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function QuestCard({ num, color, colorDim, title, typeLabel, sub, archetype, desc, objectives, affirmation, isMaster, tiered, questKey, lqp, defaultOpen = false, onObjectiveClick }) {
  const [open, setOpen] = useState(defaultOpen)
  const colorVar = cv(color)
  const dimVar = cv(colorDim)
  const root = num.includes('/') ? parseInt(num.split('/')[1]) : parseInt(num)
  return (
    <div className="quest-tile" style={{ '--q-color': colorVar, '--q-dim': dimVar }}>
      <button className="quest-tile-trigger" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="quest-tile-accent" style={{ background: colorVar }} />
        <div className="quest-tile-num" style={{ color: colorVar }}>{num}</div>
        <div className="quest-tile-meta">
          <div className="quest-tile-title" style={{ color: colorVar }}>
            {title}{isMaster && <span className="quest-tile-master">M</span>}
          </div>
          <div className="quest-tile-type">{typeLabel}</div>
          {sub && <div className="quest-tile-sub">{sub}</div>}
        </div>
        <div className="quest-tile-chevron">{open ? '▾' : '▸'}</div>
      </button>
      {open && (
        <div className="quest-tile-body">
          {archetype && <div className="quest-tile-archetype" style={{ color: colorVar }}>{archetype}</div>}
          {desc && <p className="quest-tile-desc">{desc}</p>}
          {tiered ? (
            <TieredObjectives root={root} questKey={questKey} lqp={lqp} onObjectiveClick={onObjectiveClick} />
          ) : (
            objectives && objectives.length > 0 && (
              <div className="quest-tile-objs-styled">
                {objectives.map((o, i) => (
                  <div
                    key={i}
                    className="quest-objective-item quest-objective-item--clickable"
                    style={{ borderColor: colorVar + '44', background: 'transparent' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onObjectiveClick?.({ questKey, tier: 1, objIdx: i, text: o, done: false })
                    }}
                  >
                    <div className="quest-obj-check" style={{ borderColor: colorVar, color: colorVar }}>{i + 1}</div>
                    <div className="quest-obj-text">{o}</div>
                  </div>
                ))}
              </div>
            )
          )}
          {affirmation && <div className="quest-tile-affirmation" style={{ borderColor: dimVar }}>{affirmation}</div>}
        </div>
      )}
    </div>
  )
}

function MainQuestBanner({ cl, lqp }) {
  const [open, setOpen] = useState(true)
  const isMaster = MASTERS.has(cl.root)
  const qData = getQuestData(cl.root)
  const calData = CALLING[cl.root] || CALLING[9]
  const mqData = MAIN_QUEST_DATA[cl.root] || MAIN_QUEST_DATA[9]
  const colorVar = cv(qData.color)
  const activeTier = getActiveTierFromLQP('cl', lqp)

  return (
    <div className="main-quest-card">
      <div className="mq-banner" style={{ borderColor: colorVar }}>
        <div className="mq-banner-label">★ MAIN QUEST — LIFE CALLING</div>
        <div className="mq-banner-badge" style={{ color: colorVar }}>
          {isMaster ? 'MASTER NUMBER' : 'PRIMARY MISSION'}
        </div>
      </div>
      <div className="mq-body">
        <div className="mq-top">
          <div className="mq-number" style={{ color: colorVar }}>{fmt(cl.root, cl.compound)}</div>
          <div className="mq-info">
            <div className="mq-title" style={{ color: colorVar }}>{calData?.name?.toUpperCase()}</div>
            <div className="mq-essence">{calData?.essence}</div>
          </div>
        </div>
        {mqData?.missionLine && (
          <div className="mq-mission" style={{ borderColor: cv(qData.colorDim) }}>{mqData.missionLine}</div>
        )}
        <button className="mq-expand-btn" onClick={() => setOpen(o => !o)} style={{ color: colorVar }}>
          {open ? '▾ HIDE OBJECTIVES' : '▸ SHOW OBJECTIVES'}
        </button>
        {open && (
          <>
            <div className="mq-tier-label" style={{ color: colorVar }}>▶ TIER {activeTier}: {TIER_LABELS[activeTier]} OBJECTIVES</div>
            <TieredObjectives root={cl.root} questKey="cl" lqp={lqp} />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Hub Sections ──────────────────────────────────────────────

function QuestHubSection({ title, subtitle, children }) {
  return (
    <section className="quest-hub-section">
      <div className="quest-hub-section-head">
        <h3 className="quest-hub-section-title">{title}</h3>
        {subtitle && <div className="quest-hub-section-sub">{subtitle}</div>}
      </div>
      <div className="quest-hub-section-body">{children}</div>
    </section>
  )
}

// ─── Life Quest Expandable Component ─────────────────────────────

function LifeQuestExpandable({ node, onObjectiveClick, lqp }) {
  const [expanded, setExpanded] = useState(false)
  
  // Get active objectives for this quest using TIERED_PROGRESSION
  const activeObjectives = useMemo(() => {
    if (!node.numObj?.root) return []
    
    const activeTier = node.activeTier || 1
    const tierProgress = lqp?.[node.key]?.[activeTier] || []
    
    // Use getTieredObjectiveTexts to get the objectives for this tier
    const tierObjTexts = getTieredObjectiveTexts(node.numObj.root, activeTier)
    
    // Map to objects with completion status
    const objectives = tierObjTexts.map((text, index) => ({
      id: `${node.key}-t${activeTier}-o${index}`,
      text: text,
      done: tierProgress[index] || false,
      duration: 'quest'
    }))
    
    // Return ALL objectives (both done and pending) so user can see progress
    return objectives
  }, [node, lqp])

  const pendingCount = activeObjectives.filter(o => !o.done).length

  const handleItemClick = () => {
    setExpanded(!expanded)
  }

  const handleObjectiveClick = (objective) => {
    onObjectiveClick?.({
      questKey: node.key,
      tier: node.activeTier,
      objIdx: objective.id.split('-o')[1],
      text: objective.text,
      done: objective.done
    })
  }

  return (
    <div
      className={`quest-hub-life-item${node.locked ? ' quest-hub-life-item--locked' : ''}${node.isComplete ? ' quest-hub-life-item--complete' : ''}${expanded ? ' quest-hub-life-item--expanded' : ''}`}
      style={{ '--life-color': LIFE_NODE_COLORS[node.key] }}
    >
      {/* Main item header */}
      <div className="quest-hub-life-item-header" onClick={handleItemClick}>
        <div className="quest-hub-life-item-icon">
          {LIFE_NODE_ICONS[node.key]}
        </div>
        <div className="quest-hub-life-item-info">
          <div className="quest-hub-life-item-name">{node.meta.label}</div>
          <div className="quest-hub-life-item-tier">
            {node.locked
              ? `Unlocks at Freq LV ${node.meta.unlockLv}`
              : node.isComplete
                ? '✦ Complete'
                : `${TIER_NAMES[node.activeTier]} — ${node.tierDone}/${node.tierTotal}`}
          </div>
        </div>
        {!node.locked && (
          <div className="quest-hub-life-item-bar">
            <div className="quest-hub-life-item-bar-track">
              <div
                className="quest-hub-life-item-bar-fill"
                style={{ width: `${node.pct}%` }}
              />
            </div>
            <span className="quest-hub-life-item-bar-pct">{node.pct}%</span>
          </div>
        )}
        {!node.locked && (
          <div className="quest-hub-life-item-expand-btn">
            {expanded ? '▼' : '▶'}
          </div>
        )}
      </div>

      {/* Expandable objectives section */}
      {expanded && !node.locked && (
        <div className="quest-hub-life-item-objectives">
          <div className="quest-hub-life-item-objectives-header">
            <span className="quest-hub-life-item-objectives-count">
              {pendingCount > 0 ? `${pendingCount} pending` : 'All complete'}
            </span>
            <span className="quest-hub-life-item-objectives-tier">
              {TIER_NAMES[node.activeTier]}
            </span>
          </div>
          <div className="quest-hub-life-item-objectives-list">
            {activeObjectives.length > 0 ? (
              activeObjectives.map((objective, index) => (
                <div
                  key={objective.id}
                  className={`quest-hub-life-item-objective${objective.done ? ' quest-hub-life-item-objective--done' : ''}`}
                  onClick={() => handleObjectiveClick(objective)}
                >
                  <div className="quest-hub-life-item-objective-check">
                    {objective.done ? '✓' : index + 1}
                  </div>
                  <div className="quest-hub-life-item-objective-text">
                    {objective.text}
                  </div>
                </div>
              ))
            ) : (
              <div className="quest-hub-life-item-objectives-empty">
                No objectives defined for this tier.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Quest Hub ─────────────────────────────────────────────────

const TIER_NAMES = { 1: 'APPRENTICE', 2: 'ADEPT', 3: 'MASTER' }

function QuestHub({ playerData, daily, lqp, generatedState, multiDayMap, freqLevel, sideQuests, onNavigate }) {
  const { xp } = useQuestEngine()
  const actualFreqLevel = xp?.freqLevel ?? freqLevel ?? 1

  // Modal state
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [selectedQuestType, setSelectedQuestType] = useState(null)
  const [selectedObjective, setSelectedObjective] = useState(null)
  const [showAllGlyphs, setShowAllGlyphs] = useState(false)

  function openQuestDetail(quest, type = 'hub') {
    setSelectedQuest(quest)
    setSelectedQuestType(type)
  }

  function closeQuestDetail() {
    setSelectedQuest(null)
    setSelectedQuestType(null)
  }

  function handleNavigate(section) {
    closeQuestDetail()
    onNavigate?.(section)
  }

  // ── Objective Glyphs (actionable grid) — ALL sources ──
  const allGlyphs = useMemo(() =>
    buildObjectiveGlyphs({ playerData, lqp, freqLevel: actualFreqLevel, multiDayMap, daily, generatedState, sideQuests }),
    [playerData, lqp, actualFreqLevel, multiDayMap, daily, generatedState, sideQuests]
  )

  const activeGlyphs = allGlyphs.filter(g => !g.done && !g.locked)
  const doneGlyphs = allGlyphs.filter(g => g.done)

  // ── Life Quest progress ──
  const lifeQuestProgress = useMemo(() => {
    if (!playerData) return []
    const nodes = Object.entries(LIFE_NODE_META).map(([key, meta]) => {
      const locked = freqLevel < meta.unlockLv
      const lqpEntry = lqp?.[key]
      const numObj = playerData[key]
      let activeTier = 1, tierDone = 0, tierTotal = 0
      if (!locked && lqpEntry) {
        for (let t = 1; t <= 3; t++) {
          const prog = lqpEntry[t] || []
          if (prog.length === 0) { activeTier = t; tierTotal = getTierCount(key, t, playerData); break }
          const done = prog.filter(Boolean).length
          if (done < prog.length) { activeTier = t; tierDone = done; tierTotal = prog.length; break }
          if (t === 3) { activeTier = 3; tierDone = done; tierTotal = prog.length }
        }
      }
      return {
        key, meta, numObj, locked, activeTier,
        pct: tierTotal > 0 ? Math.round((tierDone / tierTotal) * 100) : 0,
        tierDone, tierTotal,
        isComplete: !locked && activeTier === 3 && tierDone >= tierTotal,
      }
    })
    return nodes
  }, [playerData, lqp, freqLevel])

  const lifeMission = useMemo(
    () => getLifeMissionTotals(lqp, playerData),
    [lqp, playerData],
  )

  return (
    <div className="quest-hub">
      {/* ── Life Mission ledger ── */}
      <section className="quest-hub-section quest-hub-section--mission">
        <div className="quest-hub-section-head">
          <h3 className="quest-hub-section-title">◈ Life Mission</h3>
          <span className="quest-hub-mission-total">
            {lifeMission.completed} / {lifeMission.total} objectives
          </span>
        </div>
        <div className="quest-hub-mission-bar">
          <div
            className="quest-hub-mission-fill"
            style={{ width: `${lifeMission.total ? Math.round((lifeMission.completed / lifeMission.total) * 100) : 0}%` }}
          />
        </div>
      </section>

      {/* ── Life Quest Progress ── */}
      {lifeQuestProgress.length > 0 && (
        <section className="quest-hub-section quest-hub-section--life-progress">
          <div className="quest-hub-section-head">
            <h3 className="quest-hub-section-title">◈ Life Quest Progression</h3>
            <button
              className="quest-hub-life-btn"
              onClick={() => onNavigate?.('life')}
            >
              ◎ View Life Quest
            </button>
          </div>
          <div className="quest-hub-life-grid">
            {lifeQuestProgress.map(node => (
              <LifeQuestExpandable
                key={node.key}
                node={node}
                lqp={lqp}
                onObjectiveClick={(obj) => {
                  setSelectedObjective(obj)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Objective Glyph Grid ── */}
      {activeGlyphs.length > 0 && (
        <QuestHubSection
          title="Active Objectives"
          subtitle={`${activeGlyphs.length} ready · ${doneGlyphs.length} done`}
        >
          <div className="obj-glyph-grid">
            {(showAllGlyphs ? activeGlyphs : activeGlyphs.slice(0, 20)).map(glyph => (
              <ObjectiveGlyph key={glyph.id} objective={glyph} onClick={() => openQuestDetail(glyph, glyph.type)} />
            ))}
          </div>
          {activeGlyphs.length > 20 && (
            <button type="button" className="quest-hub-show-all-btn" onClick={() => setShowAllGlyphs(v => !v)}>
              {showAllGlyphs ? 'Show fewer' : `Show all ${activeGlyphs.length} objectives`}
            </button>
          )}
        </QuestHubSection>
      )}

      {/* ── Completed ── */}
      {doneGlyphs.length > 0 && (
        <QuestHubSection title="Completed" subtitle={`${doneGlyphs.length} objectives done`}>
          <div className="obj-glyph-grid obj-glyph-grid--done">
            {doneGlyphs.slice(0, 12).map(glyph => (
              <ObjectiveGlyph key={glyph.id} objective={glyph} onClick={() => openQuestDetail(glyph, glyph.type)} />
            ))}
          </div>
        </QuestHubSection>
      )}

      {/* ── Fallback when no glyphs ── */}
      {activeGlyphs.length === 0 && doneGlyphs.length === 0 && (
        <div className="quest-hub-empty">
          <span className="quest-hub-empty-icon" aria-hidden="true">◎</span>
          <p className="quest-hub-empty-text">No active objectives yet.</p>
          <button type="button" className="quest-hub-empty-cta" onClick={() => onNavigate?.('life')}>
            Go to Life Quest →
          </button>
        </div>
      )}

      {/* ── Quest Detail Modal ── */}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          questType={selectedQuestType}
          multiDayMap={multiDayMap}
          generatedState={generatedState}
          daily={daily}
          lqp={lqp}
          onNavigate={handleNavigate}
          onClose={closeQuestDetail}
        />
      )}

      {/* ── Life Quest Objective Detail ── */}
      {selectedObjective && (
        <FlowDetailPanel
          open={!!selectedObjective}
          onClose={() => setSelectedObjective(null)}
          color={getPanelColorForQuestKey(selectedObjective.questKey)}
          title={LIFE_NODE_META[selectedObjective.questKey]?.label || 'Quest Objective'}
          subtitle={`${TIER_LABELS[selectedObjective.tier]} · Objective ${Number(selectedObjective.objIdx) + 1}`}
          icon={getIconForQuestKey(selectedObjective.questKey)}
        >
          <div className="objective-detail-panel">
            <div className={`objective-detail-status objective-detail-status--${selectedObjective.done ? 'done' : 'pending'}`}>
              {selectedObjective.done ? '✓ Complete' : 'In Progress'}
            </div>
            <div className="objective-detail-text">{selectedObjective.text}</div>
            <div className="objective-detail-actions">
              <button
                className="objective-detail-btn objective-detail-btn--pin"
                onClick={() => {
                  saveFocusQuest({
                    id: `objective-${selectedObjective.questKey}-t${selectedObjective.tier}-o${selectedObjective.objIdx}`,
                    type: 'objective',
                    title: selectedObjective.text,
                    subtitle: `${LIFE_NODE_META[selectedObjective.questKey]?.label || selectedObjective.questKey} · ${TIER_LABELS[selectedObjective.tier]}`,
                    sourceLabel: LIFE_NODE_META[selectedObjective.questKey]?.label,
                    questKey: selectedObjective.questKey,
                    tier: selectedObjective.tier,
                    objIdx: selectedObjective.objIdx,
                  })
                  setSelectedObjective(null)
                }}
              >
                ◎ Pin to Focus
              </button>
            </div>
            <div className="objective-detail-context">
              <div className="objective-detail-context-label">Quest Context</div>
              <div className="objective-detail-context-value">
                {getQuestDescription(selectedObjective.questKey)}
              </div>
            </div>
          </div>
        </FlowDetailPanel>
      )}
    </div>
  )
}

// ─── Section: Life (Skill Tree) ──────────────────────────────────

const LIFE_NODE_META = {
  so: { label: 'SOUL',    title: 'SOUL QUEST',        sub: 'Your Inner Desire',   unlockLv: 0  },
  ou: { label: 'OUTER',   title: 'OUTER QUEST',       sub: 'Your Public Persona', unlockLv: 0  },
  ac: { label: 'ACHIEVE', title: 'ACHIEVEMENT QUEST', sub: 'How You Accomplish',  unlockLv: 5  },
  lp: { label: 'PATH',    title: 'LIFE PATH QUEST',   sub: 'What You Learn',      unlockLv: 10 },
  ex: { label: 'EXPR',    title: 'EXPRESSION QUEST',  sub: 'What You Carry',      unlockLv: 10 },
  cl: { label: 'CALLING', title: 'LIFE CALLING',      sub: 'Your Main Quest',     unlockLv: 15 },
  th: { label: 'THEME',   title: 'THEME QUEST',       sub: 'Your Life Curriculum', unlockLv: 20 },
}

const LIFE_NODE_COLORS = {
  so: '#00e5b4', ou: '#c9a84c', ac: '#ff9500',
  lp: '#7b61ff', ex: '#dc5078', cl: '#c9a84c', th: '#78b464',
}

const LIFE_NODE_ICONS = {
  so: '💎', ou: '🎭', ac: '🏆', lp: '🛤️', ex: '🔧', cl: '⭐', th: '📜',
}

function getPanelColorForQuestKey(key) {
  return LIFE_NODE_COLORS[key] || '#c9a84c'
}

function getIconForQuestKey(key) {
  return LIFE_NODE_ICONS[key] || '✦'
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

function getTierCount(questKey, tier, playerData) {
  const root = playerData?.[questKey]?.root ?? 1
  return getTierObjectiveCount(root, tier) || 3
}

function LifeSection({ playerData, lqp, freqLevel }) {
  const { lp, ex, cl, so, ou, ac, th } = playerData
  const numMap = { so, ou, ac, lp, ex, cl, th }
  const [toast, setToast] = useState(null)
  const [selectedObjective, setSelectedObjective] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  function handleObjectiveClick(obj) {
    setSelectedObjective(obj)
  }

  // Inline panel for objectives - displays below the flow
  function renderInlinePanel(selected) {
    if (!selected) return null
    const selNum = numMap[selected]
    if (!selNum) return null

    return (
      <LifeQuestObjectivesPanel
        selected={selected}
        numMap={numMap}
        nodeMeta={LIFE_NODE_META}
        lqp={lqp}
        onObjectiveClick={handleObjectiveClick}
        onClose={() => {}}
      />
    )
  }

  return (
    <div className="lqt-section">
      <CoachMark storageKey="scl_coach_life_quest" title="Life Quest" afterTour>
        Tap a node to see your growth path. Click any objective to pin it to your Focus quest.
      </CoachMark>
      <div className="lqt-hint">Tap a node to reveal your path direction for growth. Click any objective to pin it to focus.</div>
      <LifeQuestFlow
        numMap={numMap}
        freqLevel={freqLevel}
        nodeMeta={LIFE_NODE_META}
        getQuestData={getQuestData}
        lqp={lqp}
        onLocked={showToast}
        renderPanel={renderInlinePanel}
      />
      {toast && <div className="lqt-toast lqt-toast--visible">{toast}</div>}

      {/* Objective Detail Panel - for individual objective details */}
      {selectedObjective && (
        <FlowDetailPanel
          open={!!selectedObjective}
          onClose={() => setSelectedObjective(null)}
          color={getPanelColorForQuestKey(selectedObjective.questKey)}
          title={LIFE_NODE_META[selectedObjective.questKey]?.label || 'Quest Objective'}
          subtitle={`${TIER_LABELS[selectedObjective.tier]} · Objective ${selectedObjective.objIdx + 1}`}
          icon={getIconForQuestKey(selectedObjective.questKey)}
        >
          <div className="objective-detail-panel">
            <div className={`objective-detail-status objective-detail-status--${selectedObjective.done ? 'done' : 'pending'}`}>
              {selectedObjective.done ? '✓ Complete' : 'In Progress'}
            </div>
            <div className="objective-detail-text">{selectedObjective.text}</div>
            <div className="objective-detail-actions">
              <button
                className="objective-detail-btn objective-detail-btn--pin"
                onClick={() => {
                  saveFocusQuest({
                    id: `objective-${selectedObjective.questKey}-t${selectedObjective.tier}-o${selectedObjective.objIdx}`,
                    type: 'objective',
                    title: selectedObjective.text,
                    subtitle: `${LIFE_NODE_META[selectedObjective.questKey]?.label || selectedObjective.questKey} · ${TIER_LABELS[selectedObjective.tier]}`,
                    sourceLabel: LIFE_NODE_META[selectedObjective.questKey]?.label,
                    questKey: selectedObjective.questKey,
                    tier: selectedObjective.tier,
                    objIdx: selectedObjective.objIdx,
                  })
                  setSelectedObjective(null)
                }}
              >
                ◎ Pin to Focus
              </button>
            </div>
            <div className="objective-detail-context">
              <div className="objective-detail-context-label">Quest Context</div>
              <div className="objective-detail-context-value">
                {getQuestDescription(selectedObjective.questKey)}
              </div>
            </div>
          </div>
        </FlowDetailPanel>
      )}
    </div>
  )
}

// ─── Root component ──────────────────────────────────────────────

export default function QuestsTab() {
  const state    = useAppState()
  const player   = state.playerData
  const [section, setSection] = useState('life')
  const { lqp, sideQuests, xp } = useQuestEngine()
  const freqLevel = xp?.freqLevel ?? 1

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
    <div className="tab-panel-content">
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
