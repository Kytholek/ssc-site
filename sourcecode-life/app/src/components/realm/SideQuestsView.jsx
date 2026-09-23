import { useState, useEffect } from 'react'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { useGameState } from '../../state/GameContext'
import { submitQuestRating, fetchPendingTakerRatings, submitTakerRating, deletePendingTakerRating } from '../auth/firestoreprofile'
import { formatDisplayName } from '../../lib/formatters'
import { QUEST_TYPES } from './sidequestHelpers'

const SQ_SEEKER_LABEL = { solo: '◈ SOLO', partner: '⚔ PARTNER', group: '✦ GROUP' }
const QUEST_COLORS = Object.fromEntries(QUEST_TYPES.map(t => [t.key, t.color]))

export default function SideQuestsView() {
  const { sideQuests, completeSideQuest, cancelSideQuest } = useQuestEngine()
  const { user } = useGameState()
  const [pendingRatings, setPendingRatings] = useState([])
  const [pendingStars, setPendingStars] = useState({})

  useEffect(() => {
    if (user?.uid) {
      fetchPendingTakerRatings(user.uid).then(setPendingRatings)
    }
  }, [user?.uid])

  const active    = Object.values(sideQuests).filter(q => q.status === 'active')
  const completed = Object.values(sideQuests).filter(q => q.status === 'completed')

  function handleComplete(qid) { completeSideQuest(qid) }
  function handleCancel(quest) {
    const qid = quest.questId || quest.id
    if (quest?.uid && !localStorage.getItem('scl_rated_' + qid)) {
      submitQuestRating(quest.uid, 0, false)
      localStorage.setItem('scl_rated_' + qid, '1')
    }
    cancelSideQuest(qid)
  }

  if (!active.length && !completed.length) {
    return (
      <div className="rm-sq-empty-state">
        <div style={{ fontSize: 22, marginBottom: 10 }}>⚔</div>
        <strong>No active side quests.</strong><br />
        Go to <em>World Map</em>, tap a quest marker on the map,<br />
        then press ▶ ACCEPT QUEST to begin.
      </div>
    )
  }

  return (
    <div className="rm-side-list">
      {pendingRatings.length > 0 && (
        <div className="rm-sq-rate-seekers">
          <div className="rm-sq-section-label" style={{ color: '#c9a84c' }}>
            ⭐ RATE SEEKERS ({pendingRatings.length})
          </div>
          {pendingRatings.map(pr => (
            <div key={pr.id} className="rm-sq-pending-card">
              <div className="rm-sq-pending-name">{formatDisplayName(pr.takerName)}</div>
              <div className="rm-sq-pending-quest">{pr.questName}</div>
              <div className="quest-detail-rating-stars">
                {[1,2,3,4,5].map(n => (
                  <button key={n}
                    className={`star-btn${(pendingStars[pr.id] || 0) >= n ? ' filled' : ''}`}
                    onClick={() => setPendingStars(s => ({ ...s, [pr.id]: n }))}>★</button>
                ))}
              </div>
              <button
                className="rm-sq-rate-submit-btn"
                disabled={!pendingStars[pr.id]}
                onClick={async () => {
                  await submitTakerRating(pr.takerUid, pendingStars[pr.id])
                  await deletePendingTakerRating(user.uid, pr.id)
                  setPendingRatings(rs => rs.filter(r => r.id !== pr.id))
                }}
              >SUBMIT</button>
            </div>
          ))}
        </div>
      )}
      {active.map(q => {
        const qid        = q.questId || q.id || ''
        const rn         = q.rewardNum || ''
        const xpAmt      = rn ? 10 * parseInt(rn) : 10
        const statTarget = rn ? parseInt(rn) : 1
        const questColor = QUEST_COLORS[q.type] || '#00e5cc'
        return (
          <div key={qid} className="rm-sq-card" style={{ '--quest-color': questColor }}>
            {q.type && <div className="rm-sq-card-type">{q.type.toUpperCase()}</div>}
            <div className="rm-sq-card-title">{q.name || 'Unnamed Quest'}</div>
            {q.description && <div className="rm-sq-description">{q.description}</div>}
            {q.objectives?.length > 0 && (
              <ul className="rm-sq-objectives-list">
                {q.objectives.map((o, i) => <li key={i} className="rm-sq-objective">{o}</li>)}
              </ul>
            )}
            {q.seekerType && <div className="rm-sq-seeker" style={{ color: questColor }}>{SQ_SEEKER_LABEL[q.seekerType] || q.seekerType}</div>}
            <div className="rm-sq-xp-info">+{xpAmt} SOCIAL XP · STAT {statTarget}</div>
            <div className="rm-sq-actions">
              <button className="rm-sq-complete-btn" style={{ '--quest-color': questColor }} onClick={() => handleComplete(qid)}>▶ COMPLETE</button>
              <button className="rm-sq-abandon-btn" onClick={() => handleCancel(q)}>✕ ABANDON</button>
            </div>
          </div>
        )
      })}
      {completed.length > 0 && (
        <>
          <div className="rm-sq-section-label">◈ COMPLETED</div>
          {completed.map(q => {
            const qid = q.questId || q.id || ''
            const questColor = QUEST_COLORS[q.type] || '#00e5cc'
            return (
              <div key={qid} className="rm-sq-card rm-sq-card--completed" style={{ '--quest-color': questColor }}>
                <div className="rm-sq-card-title" style={{ textDecoration: 'line-through' }}>{q.name || 'Quest'}</div>
                <div className="rm-sq-completed-badge">✓ COMPLETE</div>
                <div className="rm-sq-actions">
                  <button className="rm-sq-abandon-btn" onClick={() => cancelSideQuest(qid)}>✕ CLEAR</button>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
