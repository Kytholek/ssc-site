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
    body: 'Your blueprint is live. This short tour shows where to play, quest, and grow your frequencies each day.',
    placement: 'center',
  },
  {
    id: 'char-card',
    tab: 'home',
    target: '[data-tour="char-card"]',
    title: 'Your Character Card',
    body: 'Your name, calling, class paths, XP, and shortcuts live here. Equip up to two class paths under Character → Skills — tap the portrait for equipment.',
    placement: 'below',
  },
  {
    id: 'today',
    tab: 'home',
    target: '[data-tour="today"]',
    title: "Today's Quest Journal",
    body: 'Your daily loop lives here — finish the personal-day quest and any open journal entries to build streaks.',
    placement: 'above',
  },
  {
    id: 'tab-quests',
    tab: 'home',
    target: '[data-tour="tab-quests"]',
    title: 'Quests',
    body: 'Life arcs, Current cycles, and Journals — longer quests and season check-ins live here.',
    placement: 'above',
  },
  {
    id: 'tab-map',
    tab: 'home',
    target: '[data-tour="tab-map"]',
    title: 'Realm',
    body: 'World and digital maps, side quests, and allies. Enter the portal to explore the realm.',
    placement: 'above',
  },
  {
    id: 'tab-stats',
    tab: 'home',
    target: '[data-tour="tab-stats"]',
    title: 'Character',
    body: 'Gifts, skill tree, Blueprint, and spiral progression — how your character grows over time.',
    placement: 'above',
  },
  {
    id: 'tab-config',
    tab: 'home',
    target: '[data-tour="tab-config"]',
    title: 'Settings',
    body: 'Account, theme, and insights. Blueprint and skills live under Character.',
    placement: 'above',
  },
  {
    id: 'finish',
    tab: 'home',
    target: null,
    title: "You're Ready",
    body: "Start with today's quest on Home. The Getting Started checklist will guide you — including equipping your class paths under Character → Skills.",
    placement: 'center',
  },
]

export const TOUR_STEP_COUNT = TOUR_STEPS.length
