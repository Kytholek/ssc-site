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
    body: 'Your identity, calling, XP bars, and shortcuts live here. Tap the portrait to open equipment.',
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
    body: 'Life arcs, Current cycles, and Journals — your longer quests and season check-ins live here.',
    placement: 'above',
  },
  {
    id: 'tab-decode',
    tab: 'home',
    target: '[data-tour="tab-decode"]',
    title: 'Decode',
    body: 'Settings and insights. Open STATS from Home seals for Blueprint and character numbers.',
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
    body: 'Innate gifts, skill tree, and spiral progression — how your character grows over time.',
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
