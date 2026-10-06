import { useState, useEffect } from 'react'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import { useGameState } from '../../state/GameContext'
import { submitQuestRating, fetchPendingTakerRatings, submitTakerRating, deletePendingTakerRating } from '../auth/firestoreprofile'
import { formatDisplayName } from '../../lib/formatters'
import { QUEST_TYPES } from './sidequestHelpers'
import {
  evidenceSummary,
  wordCount,
  readDevicePosition,
  haversineMeters,
  EVIDENCE,
} from '../../lib/questEvidence'

const SQ_SEEKER_LABEL = { solo: '◈ SOLO', partner: '⚔ PARTNER', group: '✦ GROUP' }
const QUEST_COLORS = Object.fromEntries(QUEST_TYPES.map(t => [t.key, t.color]))

function SideQuestCard({ quest, confirming, onComplete, onProgress, onAskAbandon, onAbandon, onKeep }) {
  const evidence = quest.evidence?.kind ? quest.evidence : { kind: EVIDENCE.HONOR }
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : []
  const checked = new Set(quest.checkedObjectives || [])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const qid = quest.questId || quest.id || ''
  const rn = quest.rewardNum || ''
  const xpAmt = rn ? 10 * parseInt(rn, 10) : 10
  const statTarget = rn ? parseInt(rn, 10) : 1
  const questColor = QUEST_COLORS[quest.type] || '#00e5cc'
  const words = wordCount(text)
  const needsNote = evidence.kind === EVIDENCE.JOURNAL || evidence.kind === EVIDENCE.PIECE

  function toggle(index) {
    const next = new Set(checked)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    onProgress(qid, { checkedObjectives: [...next].sort((a, b) => a - b) })
  }

  async function finish() {
    setError('')
    if (objectives.length && checked.size < objectives.length) {
      setError('Check off each objective first')
      return
    }
    let verified = !!quest.locationVerifiedAt
    if (evidence.kind === EVIDENCE.LOCATION) {
      if (quest.lat == null || quest.lng == null) {
        setError('This quest has no place to check in.')
        return
      }
      setBusy(true)
      try {
        const pos = await readDevicePosition()
        const meters = haversineMeters(pos.lat, pos.lng, Number(quest.lat), Number(quest.lng))
        const radius = evidence.radiusM || 150
        if (meters > radius) {
          setError(`You're ${Math.round(meters)} m away. Get within ${radius} m.`)
          setBusy(false)
          return
        }
        verified = true
      } catch {
        setError('Allow location to check in at this quest.')
        setBusy(false)
        return
      }
    }
    const result = onComplete(qid, {
      text,
      checkedObjectives: [...checked],
      verified,
    })
    setBusy(false)
    if (result && result.ok === false) setError(result.error || 'Could not complete')
  }

  const actionLabel = evidence.kind === EVIDENCE.LOCATION
    ? (busy ? 'LOCATING…' : '▶ CHECK IN')
    : evidence.kind === EVIDENCE.PIECE
      ? '▶ SAVE PIECE'
      : evidence.kind === EVIDENCE.JOURNAL
        ? '▶ SAVE NOTE'
        : '▶ COMPLETE'

  return (
    <div className="rm-sq-card" style={{ '--quest-color': questColor }}>
      {quest.type && <div className="rm-sq-card-type">{quest.type.toUpperCase()}</div>}
      <div className="rm-sq-card-title">{quest.name || 'Unnamed Quest'}</div>
      {quest.description && <div className="rm-sq-description">{quest.description}</div>}
      <div className="rm-sq-evidence">{evidenceSummary(evidence)}</div>
      {objectives.length > 0 && (
        <ul className="rm-sq-objectives-list">
          {objectives.map((o, i) => (
            <li key={`${qid}-${i}`} className="rm-sq-objective">
              <label className="rm-sq-check">
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={() => toggle(i)}
                />
                <span>{o}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {needsNote && (
        <div className="rm-sq-proof">
          <textarea
            className="rm-sq-note"
            rows={evidence.kind === EVIDENCE.PIECE ? 6 : 3}
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            placeholder={evidence.kind === EVIDENCE.PIECE ? 'Write the piece…' : 'Short note for this quest…'}
            aria-label={evidence.kind === EVIDENCE.PIECE ? 'Writing piece' : 'Quest note'}
          />
          <div className="rm-sq-count">
            {evidence.kind === EVIDENCE.PIECE
              ? `${words}/${evidence.wordTarget || 100} words`
              : `${text.trim().length}/${evidence.minChars || 30}`}
          </div>
        </div>
      )}
      {quest.seekerType && <div className="rm-sq-seeker" style={{ color: questColor }}>{SQ_SEEKER_LABEL[quest.seekerType] || quest.seekerType}</div>}
      <div className="rm-sq-xp-info">+{xpAmt} SOCIAL · STAT {statTarget}</div>
      {error && <div className="rm-sq-error" role="alert">{error}</div>}
      <div className="rm-sq-actions">
        <button type="button" className="rm-sq-complete-btn" style={{ '--quest-color': questColor }} onClick={finish} disabled={busy}>
          {actionLabel}
        </button>
        {confirming ? (
          <div className="side-quest-abandon-confirm">
            <span>Abandon?</span>
            <button type="button" className="rm-sq-abandon-btn" onClick={() => onAbandon(quest)}>YES</button>
            <button type="button" className="rm-sq-abandon-btn" onClick={onKeep}>NO</button>
          </div>
        ) : (
          <button type="button" className="rm-sq-abandon-btn" onClick={() => onAskAbandon(qid)}>✕ ABANDON</button>
        )}
      </div>
    </div>
  )
}

export default function SideQuestsView({ onOpenWorldMap }) {
  const { sideQuests, completeSideQuest, cancelSideQuest, updateSideQuestProgress } = useQuestEngine()
  const { user } = useGameState()
  const [pendingRatings, setPendingRatings] = useState([])
  const [pendingStars, setPendingStars] = useState({})
  const [confirmAbandon, setConfirmAbandon] = useState(null)

  useEffect(() => {
    if (user?.uid) {
      fetchPendingTakerRatings(user.uid).then(setPendingRatings)
    }
  }, [user?.uid])

  const active    = Object.values(sideQuests).filter(q => q.status === 'active')
  const completed = Object.values(sideQuests).filter(q => q.status === 'completed')

  function handleCancel(quest) {
    const qid = quest.questId || quest.id
    if (quest?.uid && !localStorage.getItem('scl_rated_' + qid)) {
      submitQuestRating(quest.uid, 0, false)
      localStorage.setItem('scl_rated_' + qid, '1')
    }
    cancelSideQuest(qid)
    setConfirmAbandon(null)
  }

  if (!active.length && !completed.length) {
    return (
      <div className="rm-sq-empty-state rm-side-empty">
        <div style={{ fontSize: 22, marginBottom: 10 }}>⚔</div>
        <strong>No active side quests.</strong>
        <p className="rm-side-empty-copy">
          Open the World Map, tap a quest marker, then press ▶ ACCEPT QUEST to begin.
        </p>
        {typeof onOpenWorldMap === 'function' && (
          <button type="button" className="rm-side-empty-cta" onClick={onOpenWorldMap}>
            ▶ OPEN WORLD MAP
          </button>
        )}
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
                    type="button"
                    className={`star-btn${(pendingStars[pr.id] || 0) >= n ? ' filled' : ''}`}
                    onClick={() => setPendingStars(s => ({ ...s, [pr.id]: n }))}>★</button>
                ))}
              </div>
              <button
                type="button"
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
        const qid = q.questId || q.id || ''
        return (
          <SideQuestCard
            key={qid}
            quest={q}
            confirming={confirmAbandon === qid}
            onComplete={completeSideQuest}
            onProgress={updateSideQuestProgress}
            onAskAbandon={setConfirmAbandon}
            onAbandon={handleCancel}
            onKeep={() => setConfirmAbandon(null)}
          />
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
                  <button type="button" className="rm-sq-abandon-btn" onClick={() => cancelSideQuest(qid)}>✕ CLEAR</button>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
