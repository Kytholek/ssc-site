/**
 * Achievements — data definitions + check logic (no DOM, no side effects).
 * All state in localStorage under 'scl_achievements'.
 */

import { getTierObjectiveCount, isTierListComplete } from './objectives'

export const LS_ACHIEVEMENTS = 'scl_achievements'
export const LS_DAILY_STREAK = 'scl_daily_streak'
export const LS_FOUNDER      = 'scl_founder'
export const LS_FIRST_SEEN   = 'scl_first_seen'

export const FOUNDER_CODES = [
  'SCL-FOUNDER-ALPHA',
  'SCL-FOUNDER-BETA',
  'SCL-FOUNDER-001',
  'SCL-FOUNDER-002',
  'SCL-FOUNDER-003',
  'SCL-FOUNDER-004',
  'SCL-FOUNDER-005',
]

export const TIER_COLORS = {
  bronze:   'var(--color-rpg-amber,  #fb923c)',
  silver:   'var(--color-rpg-muted,  #94a3b8)',
  gold:     'var(--color-rpg-gold,   #c9a84c)',
  platinum: 'var(--color-rpg-gold,   #e8c96b)',
}

/** SVG medal shapes — returns an SVG string */
export function medalSvg(shape, color, locked) {
  const c = locked ? 'rgba(255,255,255,0.15)' : (color || 'var(--color-rpg-gold)')
  const shapes = {
    circle:  `<circle cx="20" cy="20" r="16" fill="none" stroke="${c}" stroke-width="2"/><circle cx="20" cy="20" r="10" fill="${c}" opacity="0.25"/>`,
    shield:  `<path d="M20 4 L33 10 L33 22 Q33 30 20 36 Q7 30 7 22 L7 10 Z" fill="none" stroke="${c}" stroke-width="2"/><path d="M20 10 L27 14 L27 22 Q27 27 20 30 Q13 27 13 22 L13 14 Z" fill="${c}" opacity="0.2"/>`,
    star5:   `<polygon points="20,4 23.5,14.5 34,14.5 25.5,21 28.5,32 20,25.5 11.5,32 14.5,21 6,14.5 16.5,14.5" fill="none" stroke="${c}" stroke-width="2"/><polygon points="20,8 22.7,16.5 31.5,16.5 24.5,21.5 27,30 20,25 13,30 15.5,21.5 8.5,16.5 17.3,16.5" fill="${c}" opacity="0.25"/>`,
    diamond: `<polygon points="20,3 35,20 20,37 5,20" fill="none" stroke="${c}" stroke-width="2"/><polygon points="20,9 29,20 20,31 11,20" fill="${c}" opacity="0.2"/>`,
    sun:     `<circle cx="20" cy="20" r="8" fill="${c}" opacity="0.3"/><circle cx="20" cy="20" r="8" fill="none" stroke="${c}" stroke-width="2"/>${
      [0,45,90,135,180,225,270,315].map(a => {
        const r = a * Math.PI / 180
        return `<line x1="${(20+11*Math.cos(r)).toFixed(1)}" y1="${(20+11*Math.sin(r)).toFixed(1)}" x2="${(20+16*Math.cos(r)).toFixed(1)}" y2="${(20+16*Math.sin(r)).toFixed(1)}" stroke="${c}" stroke-width="2"/>`
      }).join('')}`,
    crown:   `<path d="M6,27 L6,17 L13,24 L20,9 L27,24 L34,17 L34,27 Z" fill="${c}" opacity="0.18" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
              <rect x="6" y="27" width="28" height="7" rx="1" fill="${c}" opacity="0.25" stroke="${c}" stroke-width="1.5"/>
              <circle cx="20" cy="9" r="2.5" fill="${c}"/>
              <circle cx="6" cy="17" r="1.8" fill="${c}" opacity="0.85"/>
              <circle cx="34" cy="17" r="1.8" fill="${c}" opacity="0.85"/>
              <circle cx="13" cy="30.5" r="1.5" fill="${c}"/>
              <circle cx="20" cy="30.5" r="1.5" fill="${c}"/>
              <circle cx="27" cy="30.5" r="1.5" fill="${c}"/>`,
  }
  return `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${shapes[shape] || shapes.circle}</svg>`
}

/** All achievement definitions */
export const ACHIEVEMENTS = [
  // ── Existing achievements unchanged ──

  // ── Founder ────────────────────────────────────────────────────────────────
  { id: 'founder',      group: 'Founder',
    tier: 'platinum', medal: 'crown', color: '#e8c96b',
    title: 'FOUNDER', desc: 'Early investor — helped bring the Simulation to life.',
    check: () => { try { return localStorage.getItem(LS_FOUNDER) === 'true' } catch { return false } } },

  // ── Daily Streak ────────────────────────────────────────────────────────────
  { id: 'streak_7',    group: 'Daily Streak',
    tier: 'bronze', medal: 'circle', color: 'var(--color-rpg-amber)',
    title: '7-DAY STREAK', desc: 'Complete the daily quest 7 days in a row',
    check: d => d.maxDailyStreak >= 7,
    progress: d => ({ val: Math.min(d.maxDailyStreak, 7),  max: 7  }) },
  { id: 'streak_14',   group: 'Daily Streak',
    tier: 'silver', medal: 'circle', color: 'var(--color-rpg-teal)',
    title: '14-DAY STREAK', desc: 'Complete the daily quest 14 days in a row',
    check: d => d.maxDailyStreak >= 14,
    progress: d => ({ val: Math.min(d.maxDailyStreak, 14), max: 14 }) },
  { id: 'streak_30',   group: 'Daily Streak',
    tier: 'gold', medal: 'sun', color: 'var(--color-rpg-gold)',
    title: '30-DAY STREAK', desc: 'Complete the daily quest 30 days in a row',
    check: d => d.maxDailyStreak >= 30,
    progress: d => ({ val: Math.min(d.maxDailyStreak, 30), max: 30 }) },

  // ── Character Level ─────────────────────────────────────────────────────────
  { id: 'char_8',      group: 'Character Level',
    tier: 'bronze', medal: 'shield', color: 'var(--color-rpg-amber)',
    title: 'CHAR LVL 8',  desc: 'Reach Character Level 8',
    check: d => d.charLevel >= 8,
    progress: d => ({ val: Math.min(d.charLevel, 8),  max: 8  }) },
  { id: 'char_17',     group: 'Character Level',
    tier: 'silver', medal: 'shield', color: 'var(--color-rpg-teal)',
    title: 'CHAR LVL 17', desc: 'Reach Character Level 17',
    check: d => d.charLevel >= 17,
    progress: d => ({ val: Math.min(d.charLevel, 17), max: 17 }) },
  { id: 'char_26',     group: 'Character Level',
    tier: 'gold', medal: 'shield', color: 'var(--color-rpg-gold)',
    title: 'CHAR LVL 26', desc: 'Reach Character Level 26',
    check: d => d.charLevel >= 26,
    progress: d => ({ val: Math.min(d.charLevel, 26), max: 26 }) },

  // ── Frequency Level ─────────────────────────────────────────────────────────
  { id: 'freq_8',      group: 'Frequency Level',
    tier: 'bronze', medal: 'circle', color: 'var(--color-rpg-amber)',
    title: 'FREQ LVL 8',  desc: 'Reach Frequency Level 8',
    check: d => d.freqLevel >= 8,
    progress: d => ({ val: Math.min(d.freqLevel, 8),  max: 8  }) },
  { id: 'freq_17',     group: 'Frequency Level',
    tier: 'silver', medal: 'circle', color: 'var(--color-rpg-teal)',
    title: 'FREQ LVL 17', desc: 'Reach Frequency Level 17',
    check: d => d.freqLevel >= 17,
    progress: d => ({ val: Math.min(d.freqLevel, 17), max: 17 }) },
  { id: 'freq_26',     group: 'Frequency Level',
    tier: 'gold', medal: 'circle', color: 'var(--color-rpg-gold)',
    title: 'FREQ LVL 26', desc: 'Reach Frequency Level 26',
    check: d => d.freqLevel >= 26,
    progress: d => ({ val: Math.min(d.freqLevel, 26), max: 26 }) },

  // ── Social ──────────────────────────────────────────────────────────────────
  { id: 'irl_first',   group: 'Social',
    tier: 'bronze', medal: 'circle', color: 'var(--color-rpg-teal)',
    title: 'I LIVE!', desc: 'Complete your first IRL quest',
    check: d => d.irlCompleted >= 1,
    progress: d => ({ val: Math.min(d.irlCompleted, 1), max: 1 }) },
  { id: 'quest_create_1', group: 'Social',
    tier: 'bronze', medal: 'star5', color: 'var(--color-rpg-purple)',
    title: 'NOT YOUR NORMAL NPC', desc: 'Create your first quest marker',
    check: d => d.questsCreated >= 1,
    progress: d => ({ val: Math.min(d.questsCreated, 1), max: 1 }) },
  { id: 'social_10',   group: 'Social',
    tier: 'silver', medal: 'shield', color: 'var(--color-rpg-teal)',
    title: 'SOCIALITE', desc: 'Reach Social Level 10 by completing IRL quests',
    check: d => d.socialLevel >= 10,
    progress: d => ({ val: Math.min(d.socialLevel, 10), max: 10 }) },
  { id: 'ally_invite_1', group: 'Social',
    tier: 'gold', medal: 'sun', color: 'var(--color-rpg-gold)',
    title: 'SIGNAL BOOST', desc: 'Have your first friend join via your shared invite link',
    check: d => d.inviteAllies >= 1,
    progress: d => ({ val: Math.min(d.inviteAllies, 1), max: 1 }) },

  // ── 30-Day Challenges ───────────────────────────────────────────────────────
  { id: 'thirty_first', group: '30-Day Challenges',
    tier: 'silver', medal: 'shield', color: 'var(--color-rpg-purple)',
    title: 'COMMITTED AF', desc: 'Complete your first 30-day challenge',
    check: d => d.thirtyDayDone >= 1,
    progress: d => ({ val: Math.min(d.thirtyDayDone, 1), max: 1 }) },
  { id: 'thirty_five',  group: '30-Day Challenges',
    tier: 'gold', medal: 'diamond', color: 'var(--color-rpg-gold)',
    title: 'I LIVE FOR THIS', desc: 'Complete 5 thirty-day challenges',
    check: d => d.thirtyDayDone >= 5,
    progress: d => ({ val: Math.min(d.thirtyDayDone, 5), max: 5 }) },

  // ── Life Mastery ────────────────────────────────────────────────────────────
  { id: 'tier_lp', group: 'Life Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-gold)',
    title: 'LP MASTERED', desc: 'Complete all 3 tiers of the Life Path quest',
    check: d => d.tiersDone.includes('lp'),
    progress: d => ({ val: d.tierProgress['lp'] || 0, max: 3 }) },
  { id: 'tier_cl', group: 'Life Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-teal)',
    title: 'CL MASTERED', desc: 'Complete all 3 tiers of the Life Calling quest',
    check: d => d.tiersDone.includes('cl'),
    progress: d => ({ val: d.tierProgress['cl'] || 0, max: 3 }) },
  { id: 'tier_ex', group: 'Life Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-purple)',
    title: 'EX MASTERED', desc: 'Complete all 3 tiers of the Expression quest',
    check: d => d.tiersDone.includes('ex'),
    progress: d => ({ val: d.tierProgress['ex'] || 0, max: 3 }) },
  { id: 'tier_so', group: 'Life Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-rose)',
    title: 'SO MASTERED', desc: 'Complete all 3 tiers of the Soul quest',
    check: d => d.tiersDone.includes('so'),
    progress: d => ({ val: d.tierProgress['so'] || 0, max: 3 }) },
  { id: 'tier_ou', group: 'Life Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-purple)',
    title: 'OU MASTERED', desc: 'Complete all 3 tiers of the Outer quest',
    check: d => d.tiersDone.includes('ou'),
    progress: d => ({ val: d.tierProgress['ou'] || 0, max: 3 }) },
  { id: 'tier_ac', group: 'Life Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-amber)',
    title: 'AC MASTERED', desc: 'Complete all 3 tiers of the Achievement quest',
    check: d => d.tiersDone.includes('ac'),
    progress: d => ({ val: d.tierProgress['ac'] || 0, max: 3 }) },
  { id: 'tier_th', group: 'Life Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-muted)',
    title: 'TH MASTERED', desc: 'Complete all 3 tiers of the Theme quest',
    check: d => d.tiersDone.includes('th'),
    progress: d => ({ val: d.tierProgress['th'] || 0, max: 3 }) },

  // ── Grand Mastery ───────────────────────────────────────────────────────────
  { id: 'all_tiers', group: 'Grand Mastery',
    tier: 'platinum', medal: 'diamond', color: 'var(--color-rpg-gold)',
    title: 'FULLY REALIZED', desc: 'Complete all tiers for all 7 life frequency quests',
    check: d => ['lp','cl','ex','so','ou','ac','th'].every(k => d.tiersDone.includes(k)),
    progress: d => ({ val: ['lp','cl','ex','so','ou','ac','th'].filter(k => d.tiersDone.includes(k)).length, max: 7 }) },
{ id: 'one_year', group: 'Grand Mastery',
    tier: 'platinum', medal: 'crown', color: '#e8c96b',
    title: 'ONE FULL ORBIT', desc: 'You have been on the journey for one full year.',
    check: d => d.daysOnApp >= 365,
    progress: d => ({ val: Math.min(d.daysOnApp, 365), max: 365 }) },

  // ── NEW: Focus Mastery ──────────────────────────────────────────────────────
{ id: 'focus_3', group: 'Focus Mastery',
    tier: 'bronze', medal: 'flame', color: 'var(--color-rpg-amber)',
    title: '3-DAY FOCUS', desc: 'Complete primary quest 3 days straight',
    check: d => d.focusStreakMax >= 3,
    progress: d => ({ val: Math.min(d.focusStreakMax || 0, 3), max: 3 }) },
  { id: 'focus_7', group: 'Focus Mastery',
    tier: 'silver', medal: 'flame3', color: 'var(--color-rpg-teal)',
    title: '7-DAY FOCUS', desc: 'Primary focus streak of 7 days',
    check: d => d.focusStreakMax >= 7,
    progress: d => ({ val: Math.min(d.focusStreakMax || 0, 7), max: 7 }) },
  { id: 'focus_14', group: 'Focus Mastery',
    tier: 'gold', medal: 'inferno', color: 'var(--color-rpg-gold)',
    title: 'PRIMARY MASTER', desc: '14-day primary focus streak',
    check: d => d.focusStreakMax >= 14,
    progress: d => ({ val: Math.min(d.focusStreakMax || 0, 14), max: 14 }) },

  // ── NEW: Multi-Day Mastery ──────────────────────────────────────────────────
{ id: 'multiday_7', group: 'Multi-Day Mastery',
    tier: 'bronze', medal: 'chain7', color: 'var(--color-rpg-amber)',
    title: 'CLEAN 7', desc: 'Multi-day quest with 7-day maxStreak',
    check: d => d.multiDayMaxStreak >= 7,
    progress: d => ({ val: Math.min(d.multiDayMaxStreak || 0, 7), max: 7 }) },
  { id: 'multiday_21', group: 'Multi-Day Mastery',
    tier: 'silver', medal: 'chain21', color: 'var(--color-rpg-teal)',
    title: '21-DAY GRIND', desc: 'Multi-day maxStreak ≥21',
    check: d => d.multiDayMaxStreak >= 21,
    progress: d => ({ val: Math.min(d.multiDayMaxStreak || 0, 21), max: 21 }) },
  { id: 'multiday_30', group: 'Multi-Day Mastery',
    tier: 'gold', medal: 'eternal_chain', color: 'var(--color-rpg-gold)',
    title: 'PERFECT 30', desc: '30-day with perfect maxStreak=30',
    check: d => d.multiDayMaxStreak >= 30,
    progress: d => ({ val: Math.min(d.multiDayMaxStreak || 0, 30), max: 30 }) },

  // ── NEW: Cycle Mastery ───────────────────────────────────────────────────────
{ id: 'cycle_sweep1', group: 'Cycle Mastery',
    tier: 'bronze', medal: 'wheel', color: 'var(--color-rpg-teal)',
    title: 'CYCLE SWEEPER', desc: 'Daily sweep in any cycle',
    check: d => Object.values(d.cycleSweeps || {}).some(Boolean),
    progress: d => ({ val: Object.values(d.cycleSweeps || {}).filter(Boolean).length, max: 1 }) },
  { id: 'cycle_full', group: 'Cycle Mastery',
    tier: 'silver', medal: 'wheel_half', color: 'var(--color-rpg-purple)',
    title: 'FULL CYCLE', desc: 'Sweep in a bonus-heavy cycle 1-9',
    check: d => Object.values(d.cycleSweeps || {}).filter(Boolean).length >= 3,
    progress: d => ({ val: Object.values(d.cycleSweeps || {}).filter(Boolean).length, max: 3 }) },
  { id: 'cycle_all', group: 'Cycle Mastery',
    tier: 'gold', medal: 'wheel_complete', color: 'var(--color-rpg-gold)',
    title: 'ALL CYCLES', desc: 'Sweep every cycle 1-9',
    check: d => (d.cycleSweeps || {}).length === 9 && Object.values(d.cycleSweeps || {}).every(Boolean),
    progress: d => ({ val: Object.values(d.cycleSweeps || {}).filter(Boolean).length, max: 9 }) },

  // ── NEW: Augmentation ────────────────────────────────────────────────────────
  { id: 'stat_advanced1', group: 'Augmentation',
    tier: 'bronze', medal: 'circle', color: 'var(--color-rpg-amber)',
    title: 'ADVANCED ACCESS', desc: 'Unlock advanced actions (statXP ≥15)',
    check: d => d.statAdvancedCount >= 1,
    progress: d => ({ val: d.statAdvancedCount || 0, max: 1 }) },
  { id: 'stat_ascending3', group: 'Augmentation',
    tier: 'silver', medal: 'shield', color: 'var(--color-rpg-teal)',
    title: 'ASCENDING PATH', desc: '3 stats at "ascending"',
    check: d => d.statAscendingCount >= 3,
    progress: d => ({ val: d.statAscendingCount || 0, max: 3 }) },
  { id: 'stat_full', group: 'Augmentation',
    tier: 'gold', medal: 'diamond', color: 'var(--color-rpg-gold)',
    title: 'FULL AUGMENT', desc: 'All 9 stats "ascending"',
    check: d => d.statAscendingCount >= 9,
    progress: d => ({ val: d.statAscendingCount || 0, max: 9 }) },

  // ── NEW: Tier Climber (Life Mastery ext) ────────────────────────────────────
  { id: 'lqp_triple', group: 'Life Mastery',
    tier: 'platinum', medal: 'star5', color: 'var(--color-rpg-gold)',
    title: 'TRIPLE CROWN', desc: 'Tier 3 on ≥3 LQP quests',
    check: d => d.lqpTier3Count >= 3,
    progress: d => ({ val: d.lqpTier3Count || 0, max: 3 }) },

  // ── NEW: Augmented Sweep (Daily Mastery) ────────────────────────────────────
  { id: 'sweep_hard', group: 'Daily Mastery',
    tier: 'bronze', medal: 'circle', color: 'var(--color-rpg-purple)',
    title: 'HARD MODE SWEEP', desc: 'Sweep with all "hard" quests',
    check: d => d.augSweepHard >= 1, progress: d => ({ val: d.augSweepHard || 0, max: 1 }) },
  { id: 'sweep_streak5', group: 'Daily Mastery',
    tier: 'silver', medal: 'star5', color: 'var(--color-rpg-teal)',
    title: 'STREAKED SWEEP', desc: 'Sweep during ≥5 focus streak',
    check: d => d.augSweepStreak >= 5, progress: d => ({ val: d.augSweepStreak || 0, max: 5 }) },
]

/** Read stored earned achievements */
export function loadAchievements() {
  try { return JSON.parse(localStorage.getItem(LS_ACHIEVEMENTS) || '{}') } catch { return {} }
}

/** Save achievements store + sync to cloud */
export function saveAchievements(store) {
  try { localStorage.setItem(LS_ACHIEVEMENTS, JSON.stringify(store)) } catch { /* quota */ }
  try { window.NativeMap?.saveAchievements?.() } catch { /* bridge not ready */ }
}

/** Build runtime data snapshot for check() calls */
export function loadQuestHistory() {
  try {
    const raw = localStorage.getItem('scl_quest_hist')
    return raw ? JSON.parse(raw) : { lastActions: [], completedTypes: [], focusStreaks: { days: 0 } }
  } catch { return { lastActions: [], completedTypes: [], focusStreaks: { days: 0 } } }
}

export function loadMultiDayQuests() {
  try {
    return JSON.parse(localStorage.getItem('scl_multiday_quests') || '{}')
  } catch { return {} }
}

export function statState(base, xp) {
  const threshold = base > 0 ? Math.max(base, 10) : 5
  if (base === 0) {
    if (xp <= 0) return 'absent'
    if (xp < 5) return 'awakening'
    return 'void-master'
  }
  if (xp <= 0) return 'locked'
  if (xp < threshold) return 'unlocking'
  if (xp < threshold * 2) return 'unlocked'
  return 'ascending'
}

export function buildAchievementData(playerData) {
  // Existing code unchanged...
  let daysOnApp = 0
  try {
    let firstSeen = localStorage.getItem(LS_FIRST_SEEN)
    if (!firstSeen) {
      firstSeen = new Date().toISOString()
      localStorage.setItem(LS_FIRST_SEEN, firstSeen)
    }
    daysOnApp = Math.floor((Date.now() - new Date(firstSeen).getTime()) / 86_400_000)
  } catch { /* ignore */ }
  let maxDailyStreak = 0
  try {
    const s = JSON.parse(localStorage.getItem(LS_DAILY_STREAK) || '{}')
    maxDailyStreak = s.max || 0
  } catch { /* ignore */ }

  const charLevel = parseInt(localStorage.getItem('scl_char_level') || localStorage.getItem('scl_xp_level') || '1') || 1
  const freqLevel = parseInt(localStorage.getItem('scl_freq_level') || '1') || 1

  const tiersDone = []
  const tierProgress = {}
  let lqpTier3Count = 0
  try {
    const lqp = JSON.parse(localStorage.getItem('scl_lqp') || '{}')
    if (playerData) {
      ;['lp','cl','ex','so','ou','ac','th'].forEach(qKey => {
        if (!playerData[qKey]) return
        let tiersComplete = 0
        for (let t = 1; t <= 3; t++) {
          const prog = (lqp[qKey] && lqp[qKey][t]) ? lqp[qKey][t] : []
          const count = getTierObjectiveCount(playerData[qKey].root, t)
          tiersComplete = t - 1
          if (isTierListComplete(prog, count)) tiersComplete = t
          else break
        }
        tierProgress[qKey] = tiersComplete
        if (tiersComplete >= 3) {
          tiersDone.push(qKey)
          lqpTier3Count++
        }
      })
    }
  } catch { /* ignore */ }

  // NEW: Numerology data
  let focusStreakMax = 0
  let multiDayMaxStreak = 0
  let statAscendingCount = 0
  let statAdvancedCount = 0
  let cycleSweeps = {}
  let augSweepHard = 0
  let augSweepStreak = 0
  try {
    const history = loadQuestHistory()
    focusStreakMax = history.focusStreaks?.days || 0

    const multiDays = loadMultiDayQuests()
    multiDayMaxStreak = Object.values(multiDays).reduce((max, q) => Math.max(max, q.multiDay?.maxStreak || 0), 0)

    // Stat states (questEngine.statState)
    const statXP = JSON.parse(localStorage.getItem('scl_stat_xp') || '{}')
    ;[1,2,3,4,5,6,7,8,9].forEach(n => {
      const base = playerData?.baseStats?.[n] || 0
      const xp = statXP[n] || 0
      if (xp >= 15) statAdvancedCount++
      if (statState(base, xp) === 'ascending') statAscendingCount++
    })

    // Cycle sweeps (heuristic: recent LS_GEN_QUESTS)
    for (let i = 0; i < 10; i++) { // last 10 days
      // Pseudo-scan recent; simplified to if any sweepAwarded exists
      try {
        const raw = JSON.parse(localStorage.getItem('scl_gen_quests') || '{}')
        if (raw.sweepAwarded) {
          const cn = raw.cycleNumber || 1
          cycleSweeps[cn] = true
        }
      } catch {
        // ignore parsing errors
      }
    }
  } catch {
    // ignore any errors in achievement data collection
  }

  const irlCompleted  = parseInt(localStorage.getItem('scl_irl_completed')  || '0') || 0
  const questsCreated = parseInt(localStorage.getItem('scl_quests_created') || '0') || 0
  const socialLevel   = irlCompleted
  const inviteAllies  = parseInt(localStorage.getItem('scl_invite_allies')  || '0') || 0
  const thirtyDayDone = parseInt(localStorage.getItem('scl_30day_done')     || '0') || 0

  return {
    maxDailyStreak, charLevel, freqLevel,
    tiersDone, tierProgress, lqpTier3Count,
    irlCompleted, questsCreated, socialLevel, inviteAllies, thirtyDayDone,
    daysOnApp,
    // NEW
    focusStreakMax, multiDayMaxStreak, statAscendingCount, statAdvancedCount,
    cycleSweeps, augSweepHard, augSweepStreak,
  }
}

/** Evaluate all achievements and persist any newly earned ones.
 *  Returns array of newly earned achievement objects. */
export function checkAndAwardAchievements(playerData) {
  const d      = buildAchievementData(playerData)
  const store  = loadAchievements()
  const newlyEarned = []
  ACHIEVEMENTS.forEach(a => {
    const earned = a.id === 'founder'
      ? a.check()
      : (typeof a.check === 'function' ? a.check(d) : false)
    if (!store[a.id] && earned) {
      store[a.id] = { earned: Date.now() }
      newlyEarned.push(a)
    }
  })
  if (newlyEarned.length) saveAchievements(store)
  return newlyEarned
}

/** Track a daily quest completion — updates streak then checks achievements. */
export function trackDailyStreak(playerData) {
  try {
    const today = (() => {
      const n = new Date()
      return `${n.getFullYear()}-${n.getMonth()+1}-${n.getDate()}`
    })()
    let streak = {}
    try { streak = JSON.parse(localStorage.getItem(LS_DAILY_STREAK) || '{}') } catch { /* ignore */ }
    if (streak.lastDate === today) return checkAndAwardAchievements(playerData)
    const y = new Date(); y.setDate(y.getDate() - 1)
    const yesterday = `${y.getFullYear()}-${y.getMonth()+1}-${y.getDate()}`
    streak.current  = streak.lastDate === yesterday ? (streak.current || 0) + 1 : 1
    streak.max      = Math.max(streak.max || 0, streak.current)
    streak.lastDate = today
    localStorage.setItem(LS_DAILY_STREAK, JSON.stringify(streak))
  } catch { /* ignore */ }
  return checkAndAwardAchievements(playerData)
}

/** Redeem a founder code. Returns { ok, message }. */
export function redeemFounderCode(code) {
  const clean = (code || '').trim().toUpperCase()
  try {
    if (localStorage.getItem(LS_FOUNDER) === 'true') return { ok: true, message: '✦ FOUNDER STATUS ALREADY ACTIVE' }
  } catch { /* ignore */ }
  if (!FOUNDER_CODES.includes(clean)) return { ok: false, message: '⚠ INVALID CODE' }
  try { localStorage.setItem(LS_FOUNDER, 'true') } catch { /* ignore */ }

  // Grant crown headgear to avatar
  try {
    const avatarKey = 'scl_avatar_config'
    const avatarConfig = JSON.parse(localStorage.getItem(avatarKey) || '{}')
    if (avatarConfig && typeof avatarConfig === 'object') {
      avatarConfig.headgear = 1 // Crown
      localStorage.setItem(avatarKey, JSON.stringify(avatarConfig))
    }
  } catch { /* noop */ }

  // Also equip crown in equipment (for logged-in users)
  try {
    if (typeof window.updateUserEquipment === 'function' && window.currentUser?.uid) {
      window.updateUserEquipment(window.currentUser.uid, { head: 'Crown' })
    }
  } catch { /* noop */ }

  return { ok: true, message: '✦ FOUNDER STATUS UNLOCKED!' }
}

export function isFounder() {
  try { return localStorage.getItem(LS_FOUNDER) === 'true' } catch { return false }
}
