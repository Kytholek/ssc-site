/**
 * QuestDetailModal — Bottom-sheet modal showing full quest details.
 * Displays objectives, progress, rewards, and provides Start/Complete/Check-In actions.
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { useGameState } from '../../state/GameContext'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { completeGeneratedQuest } from '../../lib/numerologyQuests'
import { saveFocusQuest } from '../../lib/focusQuests'
import { todayStr } from '../../lib/numerology'
import { submitQuestRating, writePendingTakerRating } from '../auth/firestoreprofile'
import { getDisplayName } from '../../lib/storage'
import { formatDisplayName } from '../../lib/formatters'

export default function QuestDetailModal({ quest, questType, multiDayMap, generatedState, daily, lqp, onClose, onNavigate }) {
  const { completeDailyQuest, checkinMultiDay, completeMultiDay, completeSideQuest } = useQuestEngine()
  const { user } = useGameState()

  const [journalText, setJournalText] = useState('')
  const [showJournal, setShowJournal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [showRating, setShowRating] = useState(false)
  const [starRating, setStarRating] = useState(0)
  const panelRef = useFocusTrap({ open: !!quest, onClose })

  if (!quest) return null

  try {
    return renderModal()
  } catch (err) {
    console.error('[QuestDetailModal] Render error:', err)
    return null
  }

  // ── Render ────────────────────────────────────────────────

  function renderModal() {
    // Safe title
    const displayTitle = quest.title || quest.text || 'Quest'

    // Type detection
    const isMultiDay = questType === 'multi'
    const isDaily = questType === 'daily'
    const isGenerated = questType === 'generated'
    const isSide = questType === 'side'
    const isSkill = questType === 'skill'
    const isLife = questType === 'life'
    const isHub = !isLife && !isDaily && !isMultiDay && !isGenerated && !isSide && !isSkill

    // Look up actual multi-day quest data
    let actualMultiDayQuest = null
    if (isMultiDay) {
      actualMultiDayQuest = quest._multiQuest || null
      if (!actualMultiDayQuest && multiDayMap && typeof multiDayMap === 'object') {
        const values = Object.values(multiDayMap)
        actualMultiDayQuest = values.find(q => q?.id === quest.id)
          || values.find(q => q?.title === quest.text)
          || null
      }
    }
    const hasMultiDayData = !!actualMultiDayQuest

    // Look up actual generated quest data
    let actualGeneratedQuest = null
    if (isDaily || isGenerated || isSkill) {
      actualGeneratedQuest = quest._genQuest || null
      if (!actualGeneratedQuest && generatedState && typeof generatedState === 'object') {
        const quests = Array.isArray(generatedState.quests) ? generatedState.quests : []
        actualGeneratedQuest = quests.find(q => q?.id === quest.id?.replace(/^gen-/, ''))
          || quests.find(q => q?.id === quest.id)
          || quests.find(q => q?.title === quest.text)
          || null
      }
    }
    const hasGeneratedData = !!actualGeneratedQuest

    // Side quest data
    const hasSideData = isSide && quest._sideQuest
    const actualSideQuest = isSide ? quest._sideQuest : null

    // Skill quest data
    const hasSkillData = isSkill && quest._skillQuest
    const actualSkillQuest = isSkill ? quest._skillQuest : null

    // Multi-day progress
    const totalDays = hasMultiDayData ? (actualMultiDayQuest.multiDay?.totalDays || 0) : 0
    const checkins = hasMultiDayData ? (actualMultiDayQuest.multiDay?.checkins?.length || 0) : 0
    const progressPct = totalDays > 0 ? Math.round((checkins / totalDays) * 100) : 0
    const streak = hasMultiDayData ? (actualMultiDayQuest.multiDay?.streak || 0) : 0
    const maxStreak = hasMultiDayData ? (actualMultiDayQuest.multiDay?.maxStreak || 0) : 0
    const checkedInToday = hasMultiDayData && actualMultiDayQuest.multiDay?.checkins?.includes(todayStr())
    const isQuestComplete = hasMultiDayData
      ? actualMultiDayQuest.completed || checkins >= totalDays
      : quest.done || false

    // Generated quest state
    const isGeneratedComplete = hasGeneratedData ? !!actualGeneratedQuest.completed : (quest.done || false)
    const generatedRewardXP = hasGeneratedData ? (actualGeneratedQuest.rewardXP || 0) : 0
    const hasLQPLink = hasGeneratedData && !!actualGeneratedQuest.lqpMeta

    // Life quest objective info
    let lifeQuestInfo = null
    if (isLife) {
      lifeQuestInfo = buildLifeQuestInfo(quest, lqp)
    }

    // Objectives
    const objectives = Array.isArray(quest.objectives)
      ? quest.objectives
      : quest.text ? [quest.text] : []

    // Action handlers
    function handleCheckin() {
      try {
        if (hasMultiDayData && actualMultiDayQuest.id && !checkedInToday) {
          checkinMultiDay(actualMultiDayQuest.id)
          onClose?.()
        }
      } catch (err) {
        console.error('[QuestDetailModal] Check-in error:', err)
      }
    }

    function handleStartCompleteGenerated() {
      setPendingAction('complete-generated')
      setShowJournal(true)
    }

    function handleCompleteMultiDay() {
      setPendingAction('complete-multi')
      setShowJournal(true)
    }

    function handleJournalSubmit() {
      if (journalText.trim().length < 30) return
      try {
        if (pendingAction === 'complete-generated' && actualGeneratedQuest) {
          const result = completeGeneratedQuest(actualGeneratedQuest.id, journalText.trim())
          if (result?.ok) onClose?.()
        } else if (pendingAction === 'complete-multi' && actualMultiDayQuest) {
          const result = completeMultiDay(actualMultiDayQuest.id, journalText.trim())
          if (result?.ok) onClose?.()
        }
      } catch (err) {
        console.error('[QuestDetailModal] Journal submit error:', err)
      }
      setShowJournal(false)
      setJournalText('')
      setPendingAction(null)
    }

    function handleNavigate() {
      if (!onNavigate) return
      if (isLife && quest.nodeKey) {
        onNavigate('life', quest.nodeKey)
      } else if (isDaily) {
        onNavigate('home')
      } else if (hasMultiDayData) {
        onNavigate('home')
      } else if (hasGeneratedData) {
        onNavigate('home')
      } else if (quest.actionLabel) {
        if (quest.actionLabel.includes('Home')) onNavigate('home')
        else if (quest.actionLabel.includes('Life')) onNavigate('life')
        else if (quest.actionLabel.includes('Current')) onNavigate('current')
        else if (quest.actionLabel.includes('Journal')) onNavigate('journals')
      }
    }

    function handleClose(e) {
      e?.stopPropagation()
      onClose?.()
    }

    const toneColor = getToneColor(quest.tone)

    return createPortal(
      <>
        {/* ── Backdrop ── */}
        <div
          className="quest-detail-backdrop"
          onClick={handleClose}
        />

        {/* ── Panel ── */}
        <div
          ref={panelRef}
          className="quest-detail-modal quest-detail-modal--visible"
          style={{ '--quest-detail-color': toneColor }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Quest details: ${displayTitle}`}
        >
          {/* Header */}
          <div className="quest-detail-header">
            <div className="quest-detail-header-row">
              <div className="quest-detail-badges">
                {quest.badge && (
                  <span className={`quest-detail-badge quest-detail-badge--${quest.tone || 'gold'}`}>
                    {quest.badge}
                  </span>
                )}
                {quest.status && (
                  <span className="quest-detail-status">{quest.status}</span>
                )}
                {quest.done && (
                  <span className="quest-detail-status quest-detail-status--done">✓ Done</span>
                )}
              </div>
              <button className="quest-detail-close" onClick={handleClose} aria-label="Close">✕</button>
            </div>
            <h3 className="quest-detail-title">{displayTitle}</h3>
            {quest.copy && <p className="quest-detail-copy">{quest.copy}</p>}
            {quest.source && !quest.badge && (
              <p className="quest-detail-copy" style={{ marginTop: '0.25rem', opacity: 0.6 }}>
                Source: {quest.source}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="quest-detail-body">
            {/* Multi-day progress */}
            {hasMultiDayData && totalDays > 0 && (
              <div className="quest-detail-progress">
                <div className="quest-detail-progress-label">
                  <span>{checkins}/{totalDays} days</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="quest-detail-progress-track">
                  <div className="quest-detail-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* Multi-day streak stats */}
            {hasMultiDayData && (streak > 0 || maxStreak > 0) && (
              <div className="quest-detail-stats">
                {streak > 0 && (
                  <div className="quest-detail-stat">
                    <span className="quest-detail-stat-value">{streak}</span>
                    <span className="quest-detail-stat-label">Current streak</span>
                  </div>
                )}
                {maxStreak > 0 && (
                  <div className="quest-detail-stat">
                    <span className="quest-detail-stat-value">{maxStreak}</span>
                    <span className="quest-detail-stat-label">Best streak</span>
                  </div>
                )}
              </div>
            )}

            {/* Life quest tier info */}
            {lifeQuestInfo && (
              <div className="quest-detail-lqp-info">
                <div className="quest-detail-lqp-tier">
                  <span className="quest-detail-lqp-tier-label">Tier</span>
                  <span className="quest-detail-lqp-tier-value">{lifeQuestInfo.tierName}</span>
                </div>
                <div className="quest-detail-lqp-progress">
                  <span>{lifeQuestInfo.completed}/{lifeQuestInfo.total} objectives</span>
                </div>
                <div className="quest-detail-progress-track">
                  <div className="quest-detail-progress-fill" style={{ width: `${lifeQuestInfo.pct}%` }} />
                </div>
              </div>
            )}

            {/* Side quest info */}
            {hasSideData && actualSideQuest && (
              <div className="quest-detail-gen-meta">
                {actualSideQuest.description && (
                  <p className="quest-detail-copy">{actualSideQuest.description}</p>
                )}
                {actualSideQuest.rewardXP && (
                  <div className="quest-detail-gen-tag">✦ {actualSideQuest.rewardXP} XP</div>
                )}
                {actualSideQuest.daysRemaining !== undefined && (
                  <div className="quest-detail-gen-tag">⏱ {actualSideQuest.daysRemaining} days remaining</div>
                )}
              </div>
            )}

            {/* Skill quest info */}
            {hasSkillData && actualSkillQuest && (
              <div className="quest-detail-gen-meta">
                <div className="quest-detail-gen-tag">Number: {actualSkillQuest.numberLabel}</div>
                <div className="quest-detail-gen-tag">Stage: {actualSkillQuest.stage} — {actualSkillQuest.stageName}</div>
              </div>
            )}
            {/* Generated quest metadata */}
            {hasGeneratedData && (
              <div className="quest-detail-gen-meta">
                {actualGeneratedQuest.type && typeof actualGeneratedQuest.type === 'string' && (
                  <div className="quest-detail-gen-tag">Type: {actualGeneratedQuest.type}</div>
                )}
                {actualGeneratedQuest.category && typeof actualGeneratedQuest.category === 'string' && (
                  <div className="quest-detail-gen-tag">Category: {actualGeneratedQuest.category}</div>
                )}
                {actualGeneratedQuest.difficulty && typeof actualGeneratedQuest.difficulty === 'number' && (
                  <div className="quest-detail-gen-tag">Difficulty: {actualGeneratedQuest.difficulty}/5</div>
                )}
                {hasLQPLink && actualGeneratedQuest.lqpMeta?.questKey && (
                  <div className="quest-detail-gen-tag quest-detail-gen-tag--lqp">
                    ◎ Links to {String(actualGeneratedQuest.lqpMeta.questKey).toUpperCase()} Tier {actualGeneratedQuest.lqpMeta.tier}
                  </div>
                )}
              </div>
            )}

            {/* Objectives */}
            {objectives.length > 0 && (
              <div className="quest-detail-section">
                <h4 className="quest-detail-section-title">
                  {objectives.length === 1 ? 'Objective' : 'Objectives'}
                </h4>
                <div className="quest-detail-objectives">
                  {objectives.map((obj, idx) => {
                    const objDone = isMultiDay
                      ? idx < checkins
                      : isLife
                        ? lifeQuestInfo?.objectiveStates?.[idx] || false
                        : quest.done || false
                    return (
                      <div key={idx} className={`quest-detail-objective${objDone ? ' quest-detail-objective--done' : ''}`}>
                        <span className="quest-detail-obj-number">{objDone ? '✓' : idx + 1}</span>
                        <span className="quest-detail-obj-text">{obj}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Meta Info */}
            {quest.metaItems && quest.metaItems.length > 0 && (
              <div className="quest-detail-section">
                <h4 className="quest-detail-section-title">Details</h4>
                <div className="quest-detail-meta-grid">
                  {quest.metaItems.map((item, idx) => (
                    <div key={idx} className="quest-detail-meta-item">
                      <span className="quest-detail-meta-label">{item.label}</span>
                      <span className="quest-detail-meta-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="quest-detail-footer">
            {/* Multi-day: Check In */}
            {hasMultiDayData && !isQuestComplete && !checkedInToday && (
              <button className="quest-detail-action-btn quest-detail-action-btn--checkin" onClick={handleCheckin}>
                ◈ Check In Today
              </button>
            )}
            {hasMultiDayData && checkedInToday && !isQuestComplete && (
              <span className="quest-detail-footer-note">✓ Already checked in today</span>
            )}

            {/* Multi-day: Complete */}
            {hasMultiDayData && checkins >= totalDays && !isQuestComplete && (
              <button className="quest-detail-action-btn quest-detail-action-btn--complete" onClick={handleCompleteMultiDay}>
                ✦ Complete Quest ({actualMultiDayQuest.rewardXP || 0} XP)
              </button>
            )}

            {/* Generated/Daily: Complete */}
            {hasGeneratedData && !isGeneratedComplete && (
              <button className="quest-detail-action-btn quest-detail-action-btn--complete" onClick={handleStartCompleteGenerated}>
                ✦ Complete & Earn {generatedRewardXP} XP
              </button>
            )}
            {hasGeneratedData && isGeneratedComplete && (
              <span className="quest-detail-footer-note">✓ Completed today</span>
            )}

            {/* Life quest: navigate */}
            {isLife && (
              <button className="quest-detail-action-btn quest-detail-action-btn--navigate" onClick={handleNavigate}>
                ◎ View in Life Quest Flow
              </button>
            )}

            {/* Hub cards: navigate */}
            {isHub && quest.actionLabel && (
              <button className="quest-detail-action-btn quest-detail-action-btn--navigate" onClick={handleNavigate}>
                {getNavigateLabel(quest.actionLabel)}
              </button>
            )}

            {/* Side quest: complete */}
            {hasSideData && (
              <button
                className="quest-detail-action-btn quest-detail-action-btn--complete"
                onClick={() => {
                  if (actualSideQuest?.id) {
                    completeSideQuest?.(actualSideQuest.id)
                    const creatorUid = actualSideQuest.uid
                    const alreadyRated = localStorage.getItem('scl_rated_' + actualSideQuest.id)
                    if (creatorUid && creatorUid !== user?.uid && !alreadyRated) {
                      setShowRating(true)
                    } else {
                      onClose?.()
                    }
                  }
                }}
              >
                ✦ Complete & Earn {actualSideQuest?.rewardXP || 30} XP
              </button>
            )}

            {/* Skill quest: complete */}
            {hasSkillData && actualSkillQuest && (
              <button
                className="quest-detail-action-btn quest-detail-action-btn--complete"
                onClick={handleStartCompleteGenerated}
              >
                ✦ Complete & Earn {actualGeneratedQuest?.rewardXP || 25} XP
              </button>
            )}

            {/* Pin to Focus — always available */}
            <button
              className="quest-detail-action-btn quest-detail-action-btn--pin"
              onClick={() => {
                // Map questType to the format FocusStrip expects
                const focusType = questType === 'life' ? 'main'
                  : questType === 'multi' ? 'multiday'
                  : questType === 'daily' ? 'daily'
                  : questType === 'side' ? 'side'
                  : questType === 'skill' ? 'skill'
                  : 'generated'

                saveFocusQuest({
                  id: quest.id || `${questType}-${quest.nodeKey || ''}`,
                  type: focusType,
                  title: quest.title || quest.text || 'Quest',
                  subtitle: quest.source || '',
                  questId: quest._multiQuest?.id || quest._genQuest?.id || quest._sideQuest?.id || quest.id,
                  ...(quest._skillQuest ? {
                    number: quest._skillQuest.number,
                    stage: quest._skillQuest.stage,
                    stageName: quest._skillQuest.stageName,
                    questText: quest._skillQuest.questText,
                  } : {}),
                  ...(quest._genQuest ? { generatedId: quest._genQuest.id } : {}),
                })
                onClose?.()
              }}
            >
              ◎ Pin to Focus
            </button>
          </div>
        </div>

        {/* ── Journal Overlay ── */}
        {showJournal && (
          <>
            <div
              className="quest-detail-journal-backdrop"
              onClick={() => { setShowJournal(false); setPendingAction(null); }}
            />
            <div className="quest-detail-journal-card" onClick={e => e.stopPropagation()}>
              <h3 className="quest-detail-journal-title">Complete Quest</h3>
              <p className="quest-detail-journal-sub">
                Reflect on your progress. Write at least 30 characters to earn your reward.
              </p>
              <textarea
                className="quest-detail-journal-textarea"
                placeholder="What did you learn? What changed?"
                value={journalText}
                onChange={e => setJournalText(e.target.value)}
                rows={6}
              />
              <div className="quest-detail-journal-foot">
                <span className={`quest-detail-journal-count ${journalText.trim().length < 30 ? 'quest-detail-journal-count--short' : ''}`}>
                  {journalText.trim().length}/30
                </span>
                <div className="quest-detail-journal-btns">
                  <button
                    className="quest-detail-journal-btn quest-detail-journal-btn--cancel"
                    onClick={() => { setShowJournal(false); setPendingAction(null); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="quest-detail-journal-btn quest-detail-journal-btn--submit"
                    disabled={journalText.trim().length < 30}
                    onClick={handleJournalSubmit}
                  >
                    ✦ Submit & Earn XP
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Rating Overlay ── */}
        {showRating && actualSideQuest && (
          <>
            <div
              className="quest-detail-journal-backdrop"
              onClick={() => setShowRating(false)}
            />
            <div className="quest-detail-journal-card" onClick={e => e.stopPropagation()}>
              <div className="quest-detail-rating-title">
                Rate {formatDisplayName(actualSideQuest.playerName) || 'this creator'}'s quest
              </div>
              <div className="quest-detail-rating-stars">
                {[1,2,3,4,5].map(n => (
                  <button key={n} className={`star-btn${starRating >= n ? ' filled' : ''}`}
                    onClick={() => setStarRating(n)}>★</button>
                ))}
              </div>
              <button className="quest-detail-action-btn quest-detail-action-btn--complete"
                disabled={starRating === 0}
                onClick={async () => {
                  await submitQuestRating(actualSideQuest.uid, starRating, true)
                  await writePendingTakerRating(actualSideQuest.uid, {
                    takerUid: user?.uid,
                    takerName: getDisplayName() || user?.displayName || 'Seeker',
                    questId: actualSideQuest.id,
                    questName: actualSideQuest.name || 'Quest',
                  })
                  localStorage.setItem('scl_rated_' + actualSideQuest.id, '1')
                  onClose?.()
                }}>SUBMIT RATING</button>
              <button className="quest-detail-rating-skip" onClick={() => onClose?.()}>SKIP</button>
            </div>
          </>
        )}
      </>,
      document.body
    )
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLifeQuestInfo(quest, lqp) {
  if (!quest || !quest.nodeKey || !lqp) return null
  try {
    const entry = lqp[quest.nodeKey]
    if (!entry) return null

    for (let t = 1; t <= 3; t++) {
      const prog = entry[t] || []
      if (prog.length === 0) {
        return {
          questKey: quest.nodeKey, tier: t, tierName: TIER_NAMES[t],
          completed: 0, total: getTierObjectiveCount(quest.nodeKey, t),
          pct: 0, objectiveStates: [],
        }
      }
      const completed = prog.filter(Boolean).length
      const total = prog.length
      if (completed < total) {
        return {
          questKey: quest.nodeKey, tier: t, tierName: TIER_NAMES[t],
          completed, total, pct: Math.round((completed / total) * 100),
          objectiveStates: [...prog],
        }
      }
    }
    const tier3 = entry[3] || []
    return {
      questKey: quest.nodeKey, tier: 3, tierName: TIER_NAMES[3],
      completed: tier3.filter(Boolean).length, total: tier3.length,
      pct: tier3.length > 0 ? Math.round((tier3.filter(Boolean).length / tier3.length) * 100) : 100,
      objectiveStates: [...tier3],
    }
  } catch {
    return null
  }
}

const TIER_NAMES = { 1: 'APPRENTICE', 2: 'ADEPT', 3: 'MASTER' }

function getTierObjectiveCount(questKey, tier) {
  const COUNTS = {
    so: { 1: 3, 2: 4, 3: 5 }, ou: { 1: 3, 2: 4, 3: 5 },
    ac: { 1: 3, 2: 4, 3: 5 }, lp: { 1: 3, 2: 4, 3: 5 },
    ex: { 1: 3, 2: 4, 3: 5 }, cl: { 1: 4, 2: 5, 3: 6 },
    th: { 1: 3, 2: 4, 3: 5 },
  }
  return COUNTS[questKey]?.[tier] || 4
}

const TONE_COLORS = {
  gold: '#f0b429', teal: '#2dd4bf', rose: '#fb7185',
  main: '#a78bfa', daily: '#fbbf24', journal: '#60a5fa', calm: '#94a3b8',
}

function getToneColor(tone) {
  return TONE_COLORS[tone] || TONE_COLORS.gold
}


function getNavigateLabel(action) {
  switch (action) {
    case 'Open Home': return '◈ Go to Home'
    case 'Open Life': return '◎ View Life Quest'
    case 'Open Current': return '◈ View Current Quests'
    case 'Open Journals': return '◇ Open Journals'
    default: return '◎ View Details'
  }
}
