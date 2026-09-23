/**
 * LifeQuestObjectivesPanel — Inline expandable panel for Life Quest objectives.
 * Displays below the Life Quest Flow when a node is selected.
 * Pulls available objectives from the clicked category (Soul, Outer, Achieve, etc.)
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fmt, reduceToSimple } from '../../lib/numerology'
import {
  NUM_QUESTS, MASTER_QUESTS,
} from '../../lib/data'
import {
  getTieredObjectiveTexts,
} from '../../lib/objectives'

const TIER_LABELS = { 1: 'APPRENTICE', 2: 'ADEPT', 3: 'MASTER' }

const MASTERS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99])

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

export default function LifeQuestObjectivesPanel({
  selected,
  numMap,
  nodeMeta,
  lqp,
  onObjectiveClick,
  onClose,
}) {
  const [expandedTiers, setExpandedTiers] = useState({ 1: true, 2: false, 3: false })

  if (!selected) return null

  const selNum = numMap[selected]
  if (!selNum) return null

  const meta = nodeMeta[selected]
  const qData = getQuestData(selNum.root)
  const activeTier = getActiveTierFromLQP(selected, lqp)

  const toggleTier = (tier) => {
    setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))
  }

  // Build tiered objectives
  const tierObjectives = [1, 2, 3].map(tier => {
    const objs = getTieredObjectiveTexts(selNum.root, tier)
    const isActive = tier === activeTier
    const isPast = tier < activeTier
    const isLocked = tier > activeTier
    const lqpEntry = lqp?.[selected]
    const prog = lqpEntry?.[tier] || []
    const isExpanded = expandedTiers[tier]

    return {
      tier,
      objs,
      isActive,
      isPast,
      isLocked,
      prog,
      isExpanded,
      completed: prog.filter(Boolean).length,
      total: objs.length,
      icon: isPast ? '✓' : isActive ? '▶' : '◇',
      label: TIER_LABELS[tier],
    }
  })

  const handleObjectiveClick = (tier, objIdx, text, done) => {
    onObjectiveClick?.({
      questKey: selected,
      tier,
      objIdx,
      text,
      done,
      meta,
      num: fmt(selNum.root, selNum.compound),
    })
  }

  return (
    <motion.div
      className="life-quest-objectives-panel"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Panel Header */}
      <div className="lqop-header">
        <div className="lqop-header-content">
          <span className="lqop-icon">{meta.label}</span>
          <div className="lqop-meta">
            <h3 className="lqop-title">{meta.title}</h3>
            <p className="lqop-subtitle">{meta.sub}</p>
          </div>
        </div>
        <button
          className="lqop-close-btn"
          onClick={onClose}
          aria-label="Close objectives panel"
        >
          ✕
        </button>
      </div>

      {/* Quest Description */}
      {qData?.desc && (
        <div className="lqop-description">
          <p>{qData.desc}</p>
        </div>
      )}

      {/* Tiered Objectives */}
      <div className="lqop-tiers">
        {tierObjectives.map(({ tier, objs, isActive, isPast, isLocked, prog, isExpanded, completed, total, icon, label }) => (
          <div
            key={tier}
            className={`lqop-tier${isActive ? ' lqop-tier-active' : isPast ? ' lqop-tier-past' : ' lqop-tier-locked'}`}
          >
            {/* Tier Header (always visible) */}
              <button
                type="button"
                className="lqop-tier-header"
                onClick={() => !isLocked && toggleTier(tier)}
                disabled={isLocked}
                aria-expanded={isExpanded}
                aria-label={`${label} tier, ${completed} of ${total} complete${isLocked ? ', locked' : ''}`}
              >
              <div className="lqop-tier-header-left">
                <span className="lqop-tier-icon">{icon}</span>
                <span className="lqop-tier-label">{label}</span>
                {isActive && (
                  <span className="lqop-tier-badge lqop-tier-badge--current">CURRENT</span>
                )}
                {isPast && (
                  <span className="lqop-tier-badge lqop-tier-badge--done">COMPLETE</span>
                )}
              </div>
              <div className="lqop-tier-header-right">
                <span className="lqop-tier-progress">
                  {completed}/{total}
                </span>
                {!isLocked && (
                  <span className="lqop-tier-chevron">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                )}
                {isLocked && (
                  <span className="lqop-tier-lock">🔒</span>
                )}
              </div>
            </button>

            {/* Tier Content (expandable) */}
            <AnimatePresence>
              {isExpanded && !isLocked && (
                <motion.div
                  className="lqop-tier-content"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="lqop-objectives-grid">
                    {objs.map((o, i) => {
                      const isDone = !!prog[i]
                      return (
                        <button
                          type="button"
                          key={i}
                          className={`lqop-objective${isDone ? ' lqop-objective--done' : ''}`}
                          onClick={() => handleObjectiveClick(tier, i, o, isDone)}
                          title={o}
                          aria-label={`${isDone ? 'Complete' : 'Pending'} objective: ${o}`}
                        >
                          <div className="lqop-objective-icon" aria-hidden="true">
                            {isDone ? '✓' : '◈'}
                          </div>
                          <div className="lqop-objective-text">{o}</div>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Locked message */}
            {isLocked && (
              <div className="lqop-tier-locked-msg">
                Complete previous tier to unlock
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Affirmation */}
      {qData?.affirmation && (
        <div className="lqop-affirmation">
          <span className="lqop-affirmation-icon">✦</span>
          <p>{qData.affirmation}</p>
        </div>
      )}
    </motion.div>
  )
}