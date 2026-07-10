/**
 * QuestRewardToast — Animated toast showing detailed XP breakdown on quest completion
 */
import { useState, useEffect } from 'react'

const DIFF_COLORS = {
  easy: '#4ade80',
  medium: '#fbbf24',
  hard: '#f87171',
}

const DIFF_LABELS = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
}

const STAT_NAMES = {
  1: 'Initiation', 2: 'Cooperation', 3: 'Expression',
  4: 'Foundation', 5: 'Freedom', 6: 'Responsibility',
  7: 'Introspection', 8: 'Power', 9: 'Completion',
}

let _toastId = 0
const _listeners = []

export function showQuestRewardToast(details) {
  const id = ++_toastId
  _listeners.forEach(fn => fn({ id, ...details }))
}

export function useQuestRewardToast() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    function handle(payload) {
      setToast(payload)
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }

    // Listen to the quest reward event
    function onEvent(e) {
      handle(e.detail)
    }
    window.addEventListener('scl:quest_reward', onEvent)

    // Also register as a direct listener
    _listeners.push(handle)

    return () => {
      window.removeEventListener('scl:quest_reward', onEvent)
      const idx = _listeners.indexOf(handle)
      if (idx >= 0) _listeners.splice(idx, 1)
    }
  }, [])

  if (!toast) return null

  const diffColor = DIFF_COLORS[toast.difficulty] || '#c9a84c'
  const diffLabel = DIFF_LABELS[toast.difficulty] || ''
  const statName = STAT_NAMES[toast.statNum] || `Stat ${toast.statNum}`

  return (
    <div className="quest-reward-toast quest-reward-toast--enter">
      <button
        className="quest-reward-toast-close"
        onClick={() => setToast(null)}
      >
        ✕
      </button>

      {/* Quest title */}
      <div className="quest-reward-toast-title">
        <span className="quest-reward-num" style={{ color: diffColor }}>
          {toast.questNumber}
        </span>
        <span className="quest-reward-text">{toast.questTitle}</span>
      </div>

      {/* Difficulty badge */}
      <div className="quest-reward-diff" style={{ color: diffColor }}>
        {diffLabel}
      </div>

      {/* XP Breakdown */}
      <div className="quest-reward-breakdown">
        {/* Character XP */}
        <div className="quest-reward-row">
          <span className="quest-reward-label">
            <span className="quest-reward-icon" style={{ color: '#c9a84c' }}>⚔</span>
            Character XP
          </span>
          <span className="quest-reward-value" style={{ color: '#c9a84c' }}>
            +{toast.charXP}
          </span>
        </div>

        {/* Stat XP */}
        <div className="quest-reward-row">
          <span className="quest-reward-label">
            <span className="quest-reward-icon" style={{ color: '#00e5cc' }}>
              {toast.statNum}
            </span>
            {statName}
          </span>
          <span className="quest-reward-value" style={{ color: '#00e5cc' }}>
            +{toast.statXP}
          </span>
        </div>

        {toast.skillPipFilled && toast.skillStageName && (
          <div className="quest-reward-row quest-reward-row--bonus">
            <span className="quest-reward-label">
              <span className="quest-reward-icon" style={{ color: '#c9a84c' }}>◈</span>
              Skill Stage
            </span>
            <span className="quest-reward-value" style={{ color: '#c9a84c' }}>
              {toast.skillStageName} ✓
            </span>
          </div>
        )}

        {/* Resonance bonus */}
        {toast.isResonant && (
          <div className="quest-reward-row quest-reward-row--bonus">
            <span className="quest-reward-label">
              <span className="quest-reward-icon" style={{ color: '#ffd700' }}>⚡</span>
              Resonance Bonus
            </span>
            <span className="quest-reward-value" style={{ color: '#ffd700' }}>
              ×2 STAT XP
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="quest-reward-total">
        TOTAL: {toast.charXP + toast.statXP} XP
      </div>
    </div>
  )
}
