/* ============================================================
   questEngine.js  â€”  Source Code: Life (React port)
   Pure logic layer â€” no DOM writes.
   DOM-rendering calls are replaced with custom events so React
   components can subscribe and re-render.

   Events dispatched on window:
     'scl:xp_updated'     â€” charXP / charLevel / freqXP / freqLevel / statXP changed
     'scl:daily_updated'  â€” daily quest completed / refreshed
     'scl:freqlog_updated'â€” freq quest completion logged
     'scl:sidequests_updated' â€” accepted / completed / removed a side quest
     'scl:level_up'       â€” { detail: { track:'CHARACTER'|'FREQUENCY', level } }
     'scl:xp_toast'       â€” { detail: { msg, color } }
   ============================================================ */
'use strict';

import { getTieredObjectiveTexts } from './objectives'
import { resolveDailyBlueprint } from './questBlueprint'
import { updateDailySummary, recordDailySnapshot } from './dataHistory'
import { ACTIONS } from '../state/actions'
import { todayStr, calcPersonalDay } from './numerology'
import {
  applyQuestSkillReward,
  sanitizeSkillTreeProgress,
} from './skillQuestBridge'

/* ── GameContext dispatch adapter ───────────────────────────── */
let _gameDispatch = null
export function setGameDispatch(fn) { _gameDispatch = fn }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   XP TABLE â€” cumulative XP required to REACH each level
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const LEVEL_XP_TABLE = (() => {
  const t = [0];
  const cost = l =>
    l <= 5  ? 80   :
    l <= 10 ? 150  :
    l <= 20 ? 300  :
    l <= 30 ? 500  :
    l <= 40 ? 800  :
    l <= 50 ? 1200 :
    l <= 60 ? 1800 :
    l <= 70 ? 2500 :
    l <= 80 ? 3500 :
    l <= 90 ? 5000 :
              7500;
  for (let i = 1; i <= 100; i++) t.push(t[i - 1] + cost(i));
  return t;
})();
export const MAX_LEVEL = 100;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   XP AWARDS
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const XP_AWARDS = {
  map_1: 10, map_2: 20,  map_3: 30,  map_4: 40,  map_5: 50,
  map_6: 60, map_7: 70,  map_8: 80,  map_9: 90,
  map_11: 110, map_22: 220, map_33: 330,

  daily:          5,
  personal_day:   10,
  personal_month: 40,
  personal_year:  120,
  pinnacle:       150,
  four_month:     60,
  life_path:      8,
  expression:     8,
  life_calling:   10,
  theme:          8,
  soul:           6,
  outer:          6,
  achievement:    6,
};

export const STAT_XP_PER_QUEST = { 1:1, 2:1, 3:1, 4:1, 5:1, 6:1, 7:1, 8:1, 9:1, 11:2, 22:2, 33:2 };

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STORAGE KEYS
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const LS_CHAR_XP   = 'scl_char_xp';
export const LS_CHAR_LVL  = 'scl_char_level';
export const LS_FREQ_XP   = 'scl_freq_xp';
export const LS_FREQ_LVL  = 'scl_freq_level';
export const LS_STAT_XP   = 'scl_stat_xp';
export const LS_DAILY_Q   = 'scl_daily_quest';
export const LS_REFLECTIONS = 'scl_reflections';
export const LS_30DAY     = 'scl_30day';
export const LS_FREQ_Q    = 'scl_freq_quests';
export const LS_PINNACLE_PROGRESS = 'scl_pinnacle_progress';
export const LS_ACCEPTED  = 'scl_accepted_quests';
export const LS_LQP       = 'scl_lqp';
export const LS_DAILY_GLYPHS = 'scl_daily_glyphs';
const LS_SKILL_PROGRESS   = 'scl_skilltree_progress_v2';
const LS_XP_BOOST         = 'scl_xp_boost_until';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RUNTIME STATE
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let _charXP = 0, _charLevel = 1;
let _freqXP = 0, _freqLevel = 1;
let _statXP = {};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   HELPERS
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function _quarterKey() {
  const n = new Date();
  const q = Math.floor(n.getMonth() / 3) + 1;
  return n.getFullYear() + '-Q' + q;
}
function _msUntilMidnight() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
}
function _dayOfYear() {
  const n = new Date();
  return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000);
}
function _weekOfYear() {
  const n = new Date();
  const jan1 = new Date(n.getFullYear(), 0, 1);
  return Math.floor((n - jan1) / (7 * 86400000));
}
export function pickObj(pool, seed) {
  if (!pool || !pool.length) return null;
  return pool[seed % pool.length];
}

export function getCreatorTier() {
  // Timed premium uses scl_premium_expires; lifetime uses scl_premium=1
  let isPremium = false
  try {
    if (localStorage.getItem('scl_premium') === '1') isPremium = true
    else {
      const exp = localStorage.getItem('scl_premium_expires')
      if (exp && new Date(exp) > new Date()) isPremium = true
    }
  } catch { /* intentional */ }
  if (isPremium) return 3
  const all = getAcceptedQuests()
  const completedCount = Object.values(all).filter(q => q.status === 'completed').length
  if (completedCount >= 5) return 2
  return 1
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STORAGE
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function getDailyGlyphsState(lpRoot) {
  const today = todayStr();
  let glyphsState = null;
  try {
    glyphsState = JSON.parse(localStorage.getItem(LS_DAILY_GLYPHS) || 'null');
  } catch { /* invalid JSON */ }
  if (glyphsState && glyphsState.date === today) {
    glyphsState.completed = glyphsState.completed || [false, false, false];
    glyphsState.journals = glyphsState.journals || ['', '', ''];
    glyphsState.glyphs = glyphsState.glyphs || [];
    _hydrateDailyGlyphs(glyphsState);
    return glyphsState;
  }
  // New day: generate fresh 3 glyphs
  glyphsState = {
    date: today,
    glyphs: [],
    completed: [false, false, false],
    journals: ['', '', ''],
  };
  _hydrateDailyGlyphs(glyphsState);
  try {
    localStorage.setItem(LS_DAILY_GLYPHS, JSON.stringify(glyphsState));
  } catch { /* ignore */ }
  return glyphsState;
}

function _hydrateDailyGlyphs(glyphsState) {
  if (!glyphsState || glyphsState.glyphs?.length >= 3) return glyphsState
  try {
    const playerData = window.__scl_playerData__
    if (!playerData) return glyphsState
    let freqLevel = 1
    try {
      const xpState = JSON.parse(localStorage.getItem('scl_xp') || '{}')
      freqLevel = xpState.freqLevel || 1
    } catch { /* intentional */ }
    const blueprint = resolveDailyBlueprint(playerData, freqLevel)
    if (blueprint?.glyphs?.length) {
      glyphsState.glyphs = blueprint.glyphs
      glyphsState.completed = [false, false, false].map((_, i) => !!glyphsState.completed?.[i])
      glyphsState.journals = ['', '', ''].map((_, i) => glyphsState.journals?.[i] || '')
    }
  } catch { /* intentional */ }
  return glyphsState
}

function _getPersonalDayRoot(fallback) {
  try {
    const pd = window.__scl_playerData__
    if (pd?.m && pd?.d) return calcPersonalDay(pd.m, pd.d).root
  } catch { /* intentional */ }
  return fallback
}

export function QuestEngine_completeDailyGlyph(lpRoot, idx, journal) {
  const trimmed = journal.trim();
  if (trimmed.length < 20) return { ok: false, error: `Min 20 chars (${trimmed.length}/20)` };
  const glyphsState = getDailyGlyphsState(lpRoot);
  if (glyphsState.completed[idx]) return { ok: false, error: 'Already completed' };
  glyphsState.completed[idx] = true;
  glyphsState.journals[idx] = trimmed;
  try {
    localStorage.setItem(LS_DAILY_GLYPHS, JSON.stringify(glyphsState));
  } catch { /* ignore */ }
  earnFreqXP(2);
  const dayRoot = _getPersonalDayRoot(lpRoot);
  applyQuestSkillReward({ root: dayRoot, questKind: 'glyph', difficulty: 'easy' }, earnStatXP, _dispatch);
  _dispatch('scl:daily_glyphs_updated', glyphsState);
  _dispatch('scl:xp_toast', { msg: '+2 FREQ XP · Glyph ✓', color: 'var(--teal)' });
  return { ok: true };
}

export function QuestEngine_isDailyGated() {
  try {
    const glyphsState = JSON.parse(localStorage.getItem(LS_DAILY_GLYPHS) || 'null');
    if (!glyphsState || glyphsState.date !== todayStr()) return false;
    return !glyphsState.completed.every(Boolean);
  } catch {
    return true; // Assume gated if LS error
  }
}

function _loadFromStorage() {

  try {
    _charXP = parseInt(localStorage.getItem(LS_CHAR_XP) || 0);
    _freqXP = parseInt(localStorage.getItem(LS_FREQ_XP) || 0);
    const raw = localStorage.getItem(LS_STAT_XP);
    _statXP = raw ? JSON.parse(raw) : {};
  } catch { /* intentional */ }
  _charLevel = _xpToLevel(_charXP);
  _freqLevel = _xpToLevel(_freqXP);
  for (let i = 0; i <= 9; i++) if (!_statXP[i]) _statXP[i] = 0;
}

function _saveToStorage() {
  try {
    localStorage.setItem(LS_CHAR_XP,  String(_charXP));
    localStorage.setItem(LS_CHAR_LVL, String(_charLevel));
    localStorage.setItem(LS_FREQ_XP,  String(_freqXP));
    localStorage.setItem(LS_FREQ_LVL, String(_freqLevel));
    localStorage.setItem(LS_STAT_XP,  JSON.stringify(_statXP));
    // Combined key for bridge.js / achievements.js compat
    const combined = { charXP: _charXP, charLevel: _charLevel, freqXP: _freqXP, freqLevel: _freqLevel, statXP: _statXP };
    localStorage.setItem('scl_xp', JSON.stringify(combined));
    // Also individual legacy keys used by achievements.js
    localStorage.setItem('scl_xp_level',   String(_charLevel));
    localStorage.setItem('scl_freq_level',  String(_freqLevel));
  } catch { /* intentional */ }
}

function _syncToFirestore() {
  window.NativeMap?.savePlayerXP?.(_charXP, _charLevel, _freqXP, _freqLevel, JSON.stringify(_statXP));
}

function _dispatch(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail: detail || null }));
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   LEVEL MATH
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function _xpToLevel(xp) {
  let l = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) { if (xp >= LEVEL_XP_TABLE[i]) l = i; else break; }
  return Math.min(l, MAX_LEVEL);
}
export function xpInLevel(xp, lvl)  { return xp - (lvl > 1 ? LEVEL_XP_TABLE[lvl] : 0); }
export function xpForNext(lvl)      { return lvl >= MAX_LEVEL ? 0 : LEVEL_XP_TABLE[lvl + 1] - (lvl > 1 ? LEVEL_XP_TABLE[lvl] : 0); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   XP BOOST
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function _getXpMultiplier() {
  try {
    const until = parseInt(localStorage.getItem(LS_XP_BOOST) || '0', 10);
    return (until && Date.now() < until) ? 2 : 1;
  } catch { return 1; }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   EARN XP
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function earnCharXP(amount) {
  if (_charLevel >= MAX_LEVEL) return;
  const mult    = _getXpMultiplier();
  const boosted = Math.round(amount * mult);
  if (_gameDispatch) {
    _gameDispatch({ type: ACTIONS.EARN_CHAR_XP, payload: { amount: boosted } });
    if (mult > 1) _gameDispatch({ type: ACTIONS.SET_TOAST, payload: { msg: '+' + boosted + ' CHAR XP ✦ 2× BOOST', color: 'var(--gold)' } });
    _syncToFirestore();
    return;
  }
  // fallback — no GameContext yet
  const prev = _charLevel;
  _charXP    = Math.min(_charXP + boosted, LEVEL_XP_TABLE[MAX_LEVEL]);
  _charLevel = _xpToLevel(_charXP);
  _saveToStorage();
  _syncToFirestore();
  _dispatch('scl:xp_updated', getXPState());
  if (mult > 1) _dispatch('scl:xp_toast', { msg: '+' + boosted + ' CHAR XP ✦ 2× BOOST', color: 'var(--gold)' });
  if (_charLevel > prev) {
    _dispatch('scl:level_up', { track: 'CHARACTER', level: _charLevel });
    _dispatch('scl:xp_toast', { msg: '▲ CHARACTER LEVEL ' + _charLevel, color: 'var(--gold)' });
  }
  try { if (typeof window.Achievements_check === 'function') window.Achievements_check(); } catch { /* intentional */ }
}

export function earnFreqXP(amount) {
  if (_freqLevel >= MAX_LEVEL) return;
  const mult    = _getXpMultiplier();
  const boosted = Math.round(amount * mult);
  if (_gameDispatch) {
    _gameDispatch({ type: ACTIONS.EARN_FREQ_XP, payload: { amount: boosted } });
    _gameDispatch({ type: ACTIONS.SET_TOAST, payload: { msg: '+' + boosted + ' FREQ XP' + (mult > 1 ? ' ✦ 2× BOOST' : ''), color: 'var(--teal)' } });
    _syncToFirestore();
    return;
  }
  // fallback — no GameContext yet
  const prev = _freqLevel;
  _freqXP    = Math.min(_freqXP + boosted, LEVEL_XP_TABLE[MAX_LEVEL]);
  _freqLevel = _xpToLevel(_freqXP);
  _saveToStorage();
  _syncToFirestore();
  _dispatch('scl:xp_updated', getXPState());
  _dispatch('scl:xp_toast', { msg: '+' + boosted + ' FREQ XP' + (mult > 1 ? ' ✦ 2× BOOST' : ''), color: 'var(--teal)' });
  if (_freqLevel > prev) {
    _dispatch('scl:level_up', { track: 'FREQUENCY', level: _freqLevel });
  }
  try { if (typeof window.Achievements_check === 'function') window.Achievements_check(); } catch { /* intentional */ }
}

export function earnStatXP(statNum, amount) {
  const n = parseInt(statNum);
  if (n < 0 || n > 9) return;
  if (_gameDispatch) {
    _gameDispatch({ type: ACTIONS.EARN_STAT_XP, payload: { statNum: n, amount } });
    _syncToFirestore();
    return;
  }
  // fallback — no GameContext yet
  _statXP[n] = (_statXP[n] || 0) + amount;
  _saveToStorage();
  _syncToFirestore();
  _dispatch('scl:xp_updated', getXPState());
}

function earnSocialXP(amount) {
  const gained = Math.max(1, parseInt(amount || 1, 10) || 1);
  try {
    const prev = parseInt(localStorage.getItem('scl_irl_completed') || '0', 10) || 0;
    localStorage.setItem('scl_irl_completed', String(prev + gained));
  } catch { /* intentional */ }
  _dispatch('scl:xp_toast', { msg: '+' + gained + ' SOCIAL XP', color: 'var(--teal)' });
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STAT STATE HELPERS  (used by StatsTab)
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function statLevel(base, xp) {
  if (base === 0) return Math.floor(xp / 5);
  const threshold = Math.max(base, 10);
  return Math.floor(xp / threshold);
}
export function statLevelProgress(base, xp) {
  const threshold = base > 0 ? Math.max(base, 10) : 5;
  return (xp % threshold) / threshold;
}
export function statState(base, xp) {
  if (base === 0) {
    if (xp <= 0) return 'absent';
    if (xp < 5)  return 'awakening';
    return              'void-master';
  }
  const threshold = Math.max(base, 10);
  if (xp <= 0)              return 'locked';
  if (xp < threshold)       return 'unlocking';
  if (xp < threshold * 2)   return 'unlocked';
  return                           'ascending';
}
export function statStateStyle(state, accent, dim) {
  switch (state) {
    case 'absent':      return { color: 'var(--text-dim)',  border: 'var(--border)',          badge: null };
    case 'awakening':   return { color: 'var(--rose)',      border: 'rgba(220,80,120,0.3)',   badge: 'â—ˆ' };
    case 'void-master': return { color: 'var(--gold)',      border: 'rgba(200,160,40,0.5)',   badge: 'âœ¦' };
    case 'locked':      return { color: 'var(--text-dim)',  border: 'var(--border)',          badge: null };
    case 'unlocking':   return { color: dim,                border: dim,                      badge: null };
    case 'unlocked':    return { color: accent,             border: dim,                      badge: 'â—ˆ' };
    case 'ascending':   return { color: 'var(--gold)',      border: 'rgba(200,160,40,0.5)',   badge: 'â–²' };
    default:            return { color: 'var(--text-dim)',  border: 'var(--border)',          badge: null };
  }
}
export function statTooltip(state, base, xp) {
  const level = statLevel(base, xp);
  const threshold = base > 0 ? Math.max(base, 10) : 5;
  const nextIn = threshold - (xp % threshold);
  switch (state) {
    case 'absent':      return 'No innate presence. Complete quests to develop this stat.';
    case 'awakening':   return `Awakening â€” ${xp} XP earned. ${nextIn} more to reach Level 1.`;
    case 'void-master': return `Void Master â€” Level ${level}. Developed ${xp} XP with no innate score.`;
    case 'locked':      return `Innate: ${base}. Earn ${threshold} XP to unlock. ${xp > 0 ? xp + ' earned so far.' : ''}`;
    case 'unlocking':   return `Unlocking â€” ${xp}/${threshold} XP. ${nextIn} more to reach Level 1.`;
    case 'unlocked':    return `Level ${level} â€” Innate embodied. ${nextIn} XP to Level ${level + 1}.`;
    case 'ascending':   return `Ascending â€” Level ${level}. ${nextIn} XP to Level ${level + 1}.`;
    default:            return '';
  }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STATE SNAPSHOT â€” safe to spread into React state
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function getXPState() {
  return {
    charXP: _charXP, charLevel: _charLevel,
    freqXP: _freqXP, freqLevel: _freqLevel,
    statXP: { ..._statXP },
  };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   INIT / RESET
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function QuestEngine_init() {
  sanitizeSkillTreeProgress();
  _loadFromStorage();
  // Auto-fix stale daily freq keys when XP is zero
  if (_freqXP === 0) {
    try {
      const log = getFreqLog();
      const today = todayStr();
      let fixed = false;
      Object.keys(log).forEach(k => { if (k.startsWith('dfreq_') && k.endsWith(today)) { delete log[k]; fixed = true; } });
      if (fixed) localStorage.setItem(LS_FREQ_Q, JSON.stringify(log));
    } catch { /* intentional */ }
  }
  _dispatch('scl:xp_updated', getXPState());
}

export function QuestEngine_reset() {
  _charXP = 0; _charLevel = 1;
  _freqXP = 0; _freqLevel = 1;
  _statXP = {};
  for (let i = 0; i <= 9; i++) _statXP[i] = 0;
  try {
    [LS_CHAR_XP, LS_CHAR_LVL, LS_FREQ_XP, LS_FREQ_LVL, LS_STAT_XP,
     LS_DAILY_Q, LS_DAILY_GLYPHS, LS_FREQ_Q, LS_PINNACLE_PROGRESS, LS_ACCEPTED, LS_LQP, 'scl_xp', 'scl_xp_level',
     'scl_freq_level',
     // Generated quests & journal (numerologyQuests.js)
     'scl_gen_quests', 'scl_quest_hist', 'scl_reflections',
     // 30-day / multi-day commitments
     LS_30DAY,
     'scl_multiday_quests',
     // Outer tier progress
     'scl_outer_progress',
     // Daily streak achievements
     'scl_daily_streak',
     // Skill tree progress
     'scl_skilltree_progress_v2',
     // Notification prefs (keep for now)
     // 'scl_notif_prefs',
    ].forEach(k => localStorage.removeItem(k));
  } catch { /* intentional */ }
  window.NativeMap?.savePlayerXP?.(0, 1, 0, 1, JSON.stringify(_statXP));
  window.NativeMap?.saveFreqLog?.('{}');
  _dispatch('scl:xp_updated', getXPState());
}

export function QuestEngine_resetTodayFreq() {
  try {
    const log = getFreqLog();
    const today = todayStr();
    let cleared = 0;
    Object.keys(log).forEach(k => {
      if (k.startsWith('dfreq_') && k.endsWith(today)) { delete log[k]; cleared++; }
    });
    const d = JSON.parse(localStorage.getItem(LS_DAILY_Q) || 'null');
    if (d && d.date === today && d.completed) {
      d.completed = false;
      localStorage.setItem(LS_DAILY_Q, JSON.stringify(d));
    }
    localStorage.setItem(LS_FREQ_Q, JSON.stringify(log));
    _dispatch('scl:daily_updated', getDailyQuestState());
    _dispatch('scl:freqlog_updated', { log });
    return cleared > 0 ? 'Today\'s quests reset. You can complete them again.' : 'No completed quests found for today.';
  } catch { return 'Error resetting quests.'; }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DAILY QUEST
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function getDailyQuestState() {
  const today = todayStr();
  let d = null;
  try { d = JSON.parse(localStorage.getItem(LS_DAILY_Q)); } catch { /* intentional */ }

  const playerData = window.__scl_playerData__
  let freqLevel = 1
  try {
    const xpState = JSON.parse(localStorage.getItem('scl_xp') || '{}')
    freqLevel = xpState.freqLevel || 1
  } catch { /* intentional */ }

  const needsRefresh = !d || d.date !== today || d.title
  const blueprint = playerData ? resolveDailyBlueprint(playerData, freqLevel) : null

  if (needsRefresh) {
    const prev = d && d.date === today ? d : null;
    d = {
      date: today,
      completed: prev?.completed || false,
      title: null,
      body: 'Live in alignment with today\'s personal frequency.',
      dayObj: blueprint?.dayObj || prev?.dayObj || null,
      dayObjMeta: blueprint?.dayObjMeta || prev?.dayObjMeta || null,
      questRoot: blueprint?.questRoot || prev?.questRoot || null,
      blueprintLabel: blueprint?.blueprintLabel || prev?.blueprintLabel || null,
      questKey: blueprint?.questKey || prev?.questKey || null,
      dayRootMatch: blueprint?.dayRootMatch ?? prev?.dayRootMatch ?? false,
    };
    try { localStorage.setItem(LS_DAILY_Q, JSON.stringify(d)); } catch { /* intentional */ }
  } else if (blueprint && !d.dayObjMeta && !d.completed) {
    d.dayObj = blueprint.dayObj
    d.dayObjMeta = blueprint.dayObjMeta
    d.questRoot = blueprint.questRoot
    d.blueprintLabel = blueprint.blueprintLabel
    d.questKey = blueprint.questKey
    d.dayRootMatch = blueprint.dayRootMatch
    try { localStorage.setItem(LS_DAILY_Q, JSON.stringify(d)); } catch { /* intentional */ }
  }

  const ms = _msUntilMidnight();
  return {
    ...d,
    xpAward: XP_AWARDS.daily,
    resetHours: Math.floor(ms / 3600000),
    resetMins:  Math.floor((ms % 3600000) / 60000),
  };
}

export function QuestEngine_completeDailyQuest(lpRoot) {
  // Check glyphs gating
  if (QuestEngine_isDailyGated()) {
    _dispatch('scl:xp_toast', { msg: 'Complete 3 glyphs first', color: 'var(--rose)' });
    return;
  }
  const today = todayStr();
  let d = null;
  try { d = JSON.parse(localStorage.getItem(LS_DAILY_Q)); } catch { /* intentional */ }
  if (!d || d.date !== today) {
    d = { date: today, completed: false, title: null, body: 'Live in alignment with today\'s personal frequency.', dayObj: null, dayObjMeta: null, questRoot: null };
  }
  if (d.completed) { _dispatch('scl:daily_updated', getDailyQuestState()); return; }

  d.completed = true;
  try { localStorage.setItem(LS_DAILY_Q, JSON.stringify(d)); } catch { /* intentional */ }

  const resonant = !!d.dayRootMatch;
  const dailyXP = Math.round(XP_AWARDS.daily * (resonant ? 2 : 1.5));

  // Mark life quest objective if linked
  try {
    if (d.dayObjMeta) {
      const { questKey, tier, objIdx } = d.dayObjMeta;
      QuestEngine_markLQPObjective(questKey, tier, objIdx);
    }
  } catch { /* intentional */ }

  const dayRoot = _getPersonalDayRoot(lpRoot);
  applyQuestSkillReward({ root: dayRoot, questKind: 'daily', difficulty: 'easy' }, earnStatXP, _dispatch);

  earnFreqXP(dailyXP);

  updateDailySummary({
    xpEarned: dailyXP,
    questsCompleted: 1,
    resonantCompletions: resonant ? 1 : 0,
  });
  try { recordDailySnapshot() } catch { /* intentional */ }

  // Achievements streak
  try {
    const { trackDailyStreak, checkAndAwardAchievements, buildAchievementData } = await_achievements_module();
    if (trackDailyStreak) trackDailyStreak({});
    if (checkAndAwardAchievements && buildAchievementData) checkAndAwardAchievements(buildAchievementData({}));
  } catch { /* intentional */ }

  _dispatch('scl:daily_updated', getDailyQuestState());
  _dispatch('scl:xp_toast', { msg: resonant ? 'Daily Complete · Blueprint ×2!' : 'Daily Complete · Glyph Bonus!', color: 'var(--gold)' });
}

/* Lazy-import achievements to avoid circular deps */
function await_achievements_module() {
  try { return window.__scl_achievements__ || {}; } catch { return {}; }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   FREQ LOG
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function getFreqLog() {
  try {
    let v = JSON.parse(localStorage.getItem(LS_FREQ_Q) || '{}');
    if (typeof v === 'string') v = JSON.parse(v);
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      localStorage.removeItem(LS_FREQ_Q);
      return {};
    }
    return v;
  } catch { return {}; }
}

export function isFreqDone(key) {
  const log = getFreqLog();
  if (!log[key]) return false;
  const n = new Date();
  if (key.startsWith('dfreq_'))     return key.endsWith(todayStr()) && !!log[key];
  if (key.startsWith('day_'))       return key === 'day_' + todayStr();
  if (key.startsWith('month_'))     return key === 'month_' + n.getFullYear() + '-' + (n.getMonth()+1) && !!log[key];
  if (key.startsWith('year_'))      return !!log[key];
  if (key.startsWith('fourmonth_')) return !!log[key];
  if (key.startsWith('pinnacle_'))  return !!log[key] && log[key] === _quarterKey();
  return !!log[key] && log[key] === _quarterKey();
}

export function QuestEngine_completeFreqQuest(key, xpAmount, rootNum, pinnacleChapterIndex, pinnacleRoot) {
  if (isFreqDone(key)) { _dispatch('scl:freqlog_updated', { log: getFreqLog() }); return; }

  const log = getFreqLog();
  const quarterKeys = ['lp','cl','ex','so','ou','ac','th'];
  const useQuarter  = quarterKeys.includes(key) || key.startsWith('pinnacle_');
  log[key] = useQuarter ? _quarterKey() : Date.now();
  try { localStorage.setItem(LS_FREQ_Q, JSON.stringify(log)); } catch { /* intentional */ }
  window.NativeMap?.saveFreqLog?.(JSON.stringify(log));

  earnFreqXP(parseInt(xpAmount));

  if (rootNum) {
    applyQuestSkillReward({ root: rootNum, questKind: 'cycle', difficulty: 'easy' }, earnStatXP, _dispatch);
  }

  // Auto-record pinnacle milestone when a fourMonthCycle quest completes
  if (key.startsWith('fourmonth_') && pinnacleChapterIndex != null && pinnacleRoot != null) {
    QuestEngine_recordPinnacleMilestone(pinnacleChapterIndex, pinnacleRoot);
  }

  _dispatch('scl:freqlog_updated', { log: getFreqLog(), key });
}

export function QuestEngine_submitReflection(key, xpAmount, rootNum, text) {
  if (!text || text.trim().length < 30) return { ok: false, error: `Please write at least 30 characters (${text ? text.trim().length : 0}/30 min)` };
  // Save reflection
  try {
    const store = JSON.parse(localStorage.getItem(LS_REFLECTIONS) || '{}');
    store[key] = { text: text.trim(), date: Date.now() };
    localStorage.setItem(LS_REFLECTIONS, JSON.stringify(store));
  } catch { /* intentional */ }
  QuestEngine_completeFreqQuest(key, xpAmount, rootNum);
  return { ok: true };
}

export function getPinnacleProgress(chapterIndex, root) {
  const required = root === 11 ? 2 : root === 22 ? 4 : root;
  let store = {};
  try {
    store = JSON.parse(localStorage.getItem(LS_PINNACLE_PROGRESS) || '{}');
  } catch { /* intentional */ }

  const existing = store[chapterIndex];
  if (existing) {
    return {
      root: existing.root,
      milestones: existing.milestones || [],
      required: existing.required || required,
      completed: (existing.milestones || []).length >= (existing.required || required),
      startedAt: existing.startedAt || null,
    };
  }

  return {
    root,
    milestones: [],
    required,
    completed: false,
    startedAt: null,
  };
}

export function QuestEngine_recordPinnacleMilestone(chapterIndex, root) {
  const required = root === 11 ? 2 : root === 22 ? 4 : root;
  const xpPerMilestone = Math.round(150 / required);

  let store = {};
  try {
    store = JSON.parse(localStorage.getItem(LS_PINNACLE_PROGRESS) || '{}');
  } catch { /* intentional */ }

  if (!store[chapterIndex]) {
    store[chapterIndex] = {
      root,
      milestones: [],
      required,
      startedAt: new Date().toISOString().split('T')[0],
    };
  }

  const chapter = store[chapterIndex];
  const alreadyComplete = chapter.milestones.length >= chapter.required;
  if (alreadyComplete) return;

  chapter.milestones.push(Date.now());

  try {
    localStorage.setItem(LS_PINNACLE_PROGRESS, JSON.stringify(store));
  } catch { /* intentional */ }

  earnFreqXP(xpPerMilestone);

  const statNum = root > 9 ? (root === 11 ? 2 : root === 22 ? 4 : 6) : root;
  earnStatXP(statNum, STAT_XP_PER_QUEST[root] || 1);

  const newCount = chapter.milestones.length;
  const isChapterComplete = newCount >= chapter.required;

  _dispatch('scl:pinnacle_milestone', {
    chapterIndex,
    root,
    count: newCount,
    required: chapter.required,
    complete: isChapterComplete,
  });

  if (isChapterComplete) {
    _dispatch('scl:xp_toast', {
      msg: `▲ PINNACLE ${chapterIndex} COMPLETE · +${xpPerMilestone} FREQ XP`,
      color: 'var(--gold)',
    });
  } else {
    _dispatch('scl:xp_toast', {
      msg: `◈ Pinnacle Milestone ${newCount}/${chapter.required} · +${xpPerMilestone} FREQ XP`,
      color: 'var(--gold)',
    });
  }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   LIFE QUEST PROGRESS (LQP)
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function getLQP() {
  try { return JSON.parse(localStorage.getItem(LS_LQP) || '{}'); } catch { return {}; }
}

function _saveLQP(lqp) {
  try { localStorage.setItem(LS_LQP, JSON.stringify(lqp)); } catch { /* intentional */ }
  const fl = getFreqLog();
  fl['__lqp__'] = JSON.stringify(lqp);
  window.NativeMap?.saveFreqLog?.(JSON.stringify(fl));
}

export function getActiveTier(questKey) {
  const lqp = getLQP();
  if (!lqp[questKey]) return 1;
  for (let t = 1; t <= 3; t++) {
    const prog = lqp[questKey][t] || [];
    const objs = _objsForQuestTier(questKey, t);
    if (!objs.length) return t;
    const allDone = objs.every((_, i) => !!prog[i]);
    if (!allDone) return t;
  }
  return 3;
}

function _objsForQuestTier(questKey, tier) {
  try {
    const pd = window.__scl_playerData__;
    if (!pd || !pd[questKey]) return [];
    const root = pd[questKey].root;
    return getTieredObjectiveTexts(root, tier);
  } catch { return []; }
}

function _markLQPObjective(questKey, tier, objIdx) {
  const lqp = getLQP();
  if (!lqp[questKey]) lqp[questKey] = {};
  if (!lqp[questKey][tier]) lqp[questKey][tier] = [];
  lqp[questKey][tier][objIdx] = true;
  _saveLQP(lqp);
  const objs    = _objsForQuestTier(questKey, tier);
  const allDone = objs.every((_, i) => !!lqp[questKey][tier][i]);
  if (allDone && tier < 3) { return { tierAdvanced: true, newTier: tier + 1 }; }
  try { if (typeof window.Achievements_check === 'function') window.Achievements_check(); } catch { /* intentional */ }
  return { tierAdvanced: false, newTier: tier };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   30-DAY CHALLENGE
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function get30Day(key) {
  try {
    const s = JSON.parse(localStorage.getItem(LS_30DAY) || '{}');
    return s[key] || null;
  } catch { return null; }
}
function _save30Day(key, state) {
  try {
    const s = JSON.parse(localStorage.getItem(LS_30DAY) || '{}');
    if (state === null) delete s[key];
    else s[key] = state;
    localStorage.setItem(LS_30DAY, JSON.stringify(s));
  } catch { /* intentional */ }
}

export function QuestEngine_start30Day(key) {
  if (get30Day(key)) return;
  _save30Day(key, { started: Date.now(), checkins: [], currentStreak: 0, maxStreak: 0 });
  _dispatch('scl:freqlog_updated', { log: getFreqLog() });
}

export function QuestEngine_checkin30Day(key) {
  const state = get30Day(key);
  if (!state) return;
  const today = todayStr();
  if (state.checkins.includes(today)) return;
  const prev = state.checkins[state.checkins.length - 1];
  let consecutive = false;
  if (prev) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yesterday = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    consecutive = prev === yesterday;
  }
  state.currentStreak = consecutive ? state.currentStreak + 1 : 1;
  state.maxStreak = Math.max(state.maxStreak, state.currentStreak);
  state.checkins.push(today);
  _save30Day(key, state);
  _dispatch('scl:freqlog_updated', { log: getFreqLog() });
}

export function QuestEngine_complete30Day(key, xp, rootNum) {
  const state  = get30Day(key);
  const mult   = state ? (1 + state.maxStreak / 30) : 1;
  const finalXp = Math.round(xp * mult);
  _save30Day(key, null);
  _dispatch('scl:xp_toast', { msg: `âš¡ ${mult.toFixed(1)}Ã— COMBO Â· +${finalXp} XP`, color: 'var(--gold)' });
  try {
    const prev30 = parseInt(localStorage.getItem('scl_30day_done') || '0') || 0;
    localStorage.setItem('scl_30day_done', prev30 + 1);
    if (typeof window.Achievements_check === 'function') window.Achievements_check();
  } catch { /* intentional */ }
  QuestEngine_completeFreqQuest(key, finalXp, rootNum);
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAP / SIDE QUESTS
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function getAcceptedQuests() {
  try { return JSON.parse(localStorage.getItem(LS_ACCEPTED) || '{}'); } catch { return {}; }
}

export function acceptQuest(questData) {
  const questId = questData.id || questData.questId || questData.docId;
  if (!questId) return { ok: false };
  try {
    const all = getAcceptedQuests();
    if (all[questId]?.status === 'active') return { ok: false, error: 'Already in your side quest log!' };

    const tier = getCreatorTier();
    const tierLimits = [0, 3, 5, Infinity];
    const limit = tierLimits[tier];
    const activeCount = Object.values(all).filter(q => q.status === 'active').length;

    if (activeCount >= limit) {
      return {
        ok: false,
        error: tier < 3
          ? '✦ Complete more quests or upgrade to hold more active quests.'
          : null
      };
    }

    all[questId] = { ...questData, questId, acceptedAt: Date.now(), status: 'active' };
    localStorage.setItem(LS_ACCEPTED, JSON.stringify(all));
    _dispatch('scl:sidequests_updated', { quests: all });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}

export function cancelSideQuest(questId) {
  try {
    const all = getAcceptedQuests();
    delete all[questId];
    localStorage.setItem(LS_ACCEPTED, JSON.stringify(all));
    _dispatch('scl:sidequests_updated', { quests: all });
  } catch { /* intentional */ }
}

export function completeSideQuest(questId) {
  try {
    const all = getAcceptedQuests();
    if (!all[questId]) return;
    all[questId].status      = 'completed';
    all[questId].completedAt = Date.now();
    localStorage.setItem(LS_ACCEPTED, JSON.stringify(all));

    const rn       = parseInt(all[questId].rewardNum || 1);
    const xpAmount = XP_AWARDS['map_' + rn] || XP_AWARDS.map_1;
    const socialXp = Math.max(1, rn || 1);
    const statXp   = Math.max(STAT_XP_PER_QUEST[rn] || 1, rn || 1);
    earnCharXP(xpAmount);
    earnSocialXP(socialXp);

    applyQuestSkillReward({
      root: rn,
      questKind: 'side',
      difficulty: 'easy',
      statXPAmount: statXp,
    }, earnStatXP, _dispatch);

    // IRL achievement tracking
    try {
      if (typeof window.Achievements_check === 'function') window.Achievements_check();
      window.NativeBridge?.saveAchievements?.();
    } catch { /* intentional */ }

    _dispatch('scl:sidequests_updated', { quests: getAcceptedQuests() });
  } catch (e) { console.error('completeSideQuest:', e); }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   FIRESTORE SYNC CALLBACK  (called by bridge.js loadPlayer)
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Matches the 6-arg signature from NativeQuest_onXPLoaded
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function QuestEngine_onXPLoaded(charXP, charLevel, freqXP, freqLevel, statXPJson, freqLogJson) {
  try {
    const rCX = parseInt(charXP  || 0), rCL = parseInt(charLevel || 1);
    const rFX = parseInt(freqXP  || 0), rFL = parseInt(freqLevel || 1);
    const rSX = JSON.parse(statXPJson || '{}');
    if (rCX > _charXP) { _charXP = rCX; _charLevel = rCL; }
    if (rFX > _freqXP) { _freqXP = rFX; _freqLevel = rFL; }
    for (let i = 0; i <= 9; i++) if ((rSX[i]||0) > (_statXP[i]||0)) _statXP[i] = rSX[i];
    _saveToStorage();

    // Merge freq quest log â€” only add remote keys not already local
    if (freqLogJson !== undefined && freqLogJson !== null) {
      try {
        const remote = JSON.parse(freqLogJson);
        const local  = getFreqLog();
        let changed = false;
        Object.keys(remote).forEach(k => {
          if (!(k in local)) { local[k] = remote[k]; changed = true; }
        });
        if (changed) localStorage.setItem(LS_FREQ_Q, JSON.stringify(local));
        _dispatch('scl:freqlog_updated', { log: local });
      } catch { /* intentional */ }
    }

    _dispatch('scl:xp_updated', getXPState());
  } catch (e) { console.error('QuestEngine_onXPLoaded:', e); }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   GLOBAL WINDOW BINDINGS  (for Header.jsx reset call etc.)
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* PUBLIC LQP MARKER — used by numerologyQuests.js */
export function QuestEngine_markLQPObjective(questKey, tier, objIdx, options = {}) {
  const result = _markLQPObjective(questKey, tier, objIdx);
  if (!options.skipSkillReward) {
    try {
      const pd = window.__scl_playerData__;
      const root = pd?.[questKey]?.root;
      if (root) {
        const diff = tier === 3 ? 'hard' : tier === 2 ? 'medium' : 'easy';
        applyQuestSkillReward({ root, tier, questKind: 'life', difficulty: diff }, earnStatXP, _dispatch);
      }
    } catch { /* intentional */ }
  }
  if (result.tierAdvanced) {
    _dispatch('scl:xp_toast', {
      msg:   '☆ ' + questKey.toUpperCase() + ' TIER ' + result.newTier + ' UNLOCKED',
      color: result.newTier === 3 ? 'var(--gold)' : 'var(--teal)',
    });
  }
  _dispatch('scl:freqlog_updated', { log: getFreqLog() });
  return result;
}

/** @deprecated Use applyQuestSkillReward from skillQuestBridge */
export function QuestEngine_markSkillProgress(root, lqpTier) {
  applyQuestSkillReward({
    root,
    tier: lqpTier,
    questKind: 'season',
    difficulty: 'medium',
  }, earnStatXP, _dispatch);
}

window.QuestEngine_reset        = QuestEngine_reset;
window.QuestEngine_resetTodayFreq = QuestEngine_resetTodayFreq;
window.QuestEngine_completeDailyQuest = QuestEngine_completeDailyQuest;
window.QuestEngine_completeFreqQuest  = QuestEngine_completeFreqQuest;
window.QuestEngine_start30Day   = QuestEngine_start30Day;
window.QuestEngine_checkin30Day = QuestEngine_checkin30Day;
window.QuestEngine_complete30Day = QuestEngine_complete30Day;
window.__scl_qe_onXPLoaded      = QuestEngine_onXPLoaded;

// Init on load
QuestEngine_init();
