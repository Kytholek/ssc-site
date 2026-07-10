/**
 * Spotlight tour step definitions.
 * target: CSS selector for [data-tour="..."], null for centered modal steps.
 */
export const TOUR_STEPS = [
  {
    id: 'welcome',
    tab: 'home',
    target: null,
    title: 'Welcome to Source Code: Life',
    body: 'Your blueprint is live. This short tour shows you where to play, quest, and decode your frequencies each day.',
    placement: 'center',
  },
  {
    id: 'char-card',
    tab: 'home',
    target: '[data-tour="char-card"]',
    title: 'Your Character Card',
    body: 'Your identity, XP bars, and daily progress live here. Tap the portrait to open your full character card.',
    placement: 'below',
  },
  {
    id: 'today',
    tab: 'home',
    target: '[data-tour="today"]',
    title: 'Today\'s Quests',
    body: 'Complete three daily objectives, then finish your personal-day quest. This is your core daily loop.',
    placement: 'above',
  },
  {
    id: 'tab-quests',
    tab: 'home',
    target: '[data-tour="tab-quests"]',
    title: 'Quests',
    body: 'Side quests, Life Quest arcs, and the Quest Hub — where commitments and multi-day challenges live.',
    placement: 'above',
  },
  {
    id: 'tab-decode',
    tab: 'home',
    target: '[data-tour="tab-decode"]',
    title: 'Decode',
    body: 'Your numerology blueprint: Life Path, Expression, Soul, and the frequencies that shape your quests.',
    placement: 'above',
  },
  {
    id: 'tab-map',
    tab: 'home',
    target: '[data-tour="tab-map"]',
    title: 'Map',
    body: 'Realm missions near you. Complete quests as Maker or Seeker to build reputation with allies.',
    placement: 'above',
  },
  {
    id: 'tab-stats',
    tab: 'home',
    target: '[data-tour="tab-stats"]',
    title: 'Stats',
    body: 'Skill tree, spiral progression, and innate gifts — how your character grows over time.',
    placement: 'above',
  },
  {
    id: 'finish',
    tab: 'home',
    target: null,
    title: 'You\'re Ready',
    body: 'Start with today\'s quest on Home. Complete objectives daily to build streaks and level your frequencies.',
    placement: 'center',
  },
]

export const TOUR_STEP_COUNT = TOUR_STEPS.length
