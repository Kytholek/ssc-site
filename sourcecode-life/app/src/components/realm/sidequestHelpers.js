// sidequestHelpers.js — shared constants and utilities for side quest components

export const LS_MAP_QUESTS = 'scl_map_quests'

export const QUEST_TYPES = [
  { key: 'exploration', label: '🗺 EXPLORE', color: '#5ec8ff' },
  { key: 'connection',  label: '⚔ CONNECT',  color: '#00e5cc' },
  { key: 'achievement', label: '▲ ACHIEVE',  color: '#f0c060' },
  { key: 'healing',     label: '✦ HEAL',     color: '#7ee081' },
  { key: 'creation',    label: '◈ CREATE',   color: '#c9a0ff' },
  { key: 'reflection',  label: '◇ REFLECT',  color: '#90a8c8' },
]

export const SEEKER_TYPES = ['solo', 'partner', 'group']

export const REWARD_NAMES = {
  1:'INITIATION', 2:'UNION', 3:'EXPRESSION', 4:'FOUNDATION', 5:'FREEDOM',
  6:'HARMONY', 7:'TRUTH', 8:'POWER', 9:'MASTERY',
}

export function loadQuests() {
  try {
    return JSON.parse(localStorage.getItem(LS_MAP_QUESTS) || '[]')
  } catch {
    return []
  }
}

export function saveQuests(quests) {
  try {
    localStorage.setItem(LS_MAP_QUESTS, JSON.stringify(quests))
  } catch {
    /* quota exceeded */
  }
}
