/* ============================================================
   numerologyQuests.js — Numerology-driven daily quest generator

   Generates 4 personalized quests per day based on the user's
   numerology profile (dominant numbers, weaker numbers, cycle).
   Integrates with questEngine.js for XP awards.

   Events dispatched on window:
     'scl:gen_quests_updated' — { quests, completed? }

   Storage keys:
     scl_gen_quests    — today's generated quest set
     scl_quest_hist    — rolling action-category history
   ============================================================ */


import { earnCharXP, earnStatXP, getLQP, QuestEngine_markLQPObjective } from './questEngine.js'
import {
  applyQuestSkillReward,
  resolveSkillMeta,
  skillTreeNumber,
  SKILLTREE_LS_KEY,
} from './skillQuestBridge.js'
import { recordDailySnapshot, updateDailySummary } from './dataHistory.js'
import { getTieredObjectiveTexts, getCycleObjectives } from './objectives.js'
import { resolveBlueprintNode } from './questBlueprint.js'
import { calcPersonalDay, calcPersonalMonth, calcPersonalYear, reduceToSimple } from './numerology.js'
import { statState } from './achievements.js'
import { todayStr } from './numerology.js'
import { NUMBERS } from '../components/skilltree/SkillTree.jsx'

// ── Storage ───────────────────────────────────────────────────────────────────
const LS_GEN_QUESTS  = 'scl_gen_quests'
const LS_QUEST_HIST  = 'scl_quest_hist'
const LS_NOTIF_PREFS = 'scl_notif_prefs'

/** Returns the current notification prefs, with defaults applied. */
export function getNotifPrefs() {
  try {
    const raw = localStorage.getItem(LS_NOTIF_PREFS)
    const defaults = { dailyReminder: true, questOnMap: true, multiDayReminder: true }
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return { dailyReminder: true, questOnMap: true, multiDayReminder: true }
  }
}
const LS_OUTER_PROGRESS = 'scl_outer_progress'

// ── Action pools — number → category → action strings ────────────────────────
export const ACTION_POOLS = {
  1: { // Power / Will / Initiation
    initiate: [
      "Start a project you've been putting off",
      "Write the first draft of something new",
      "Take the first step on a goal today",
      "Set a clear intention for the week",
      "Begin one new habit from scratch",
    ],
    lead: [
      "Make a decision without second-guessing it",
      "Delegate one task you normally control",
      "Speak up first in a conversation today",
      "Take charge of a situation others are avoiding",
      "Set a clear direction and commit to it",
    ],
    assert: [
      "Communicate a boundary clearly and calmly",
      "Express your opinion directly to someone",
      "Say no to something that doesn't serve you",
      "Ask for exactly what you need",
      "Stand by a decision even under pressure",
    ],
  },

  2: { // Connection / Harmony / Sensitivity
    connect: [
      "Reach out to someone you haven't spoken to in a while",
      "Have a real, unguarded conversation",
      "Listen fully without offering advice",
      "Express appreciation to someone specific",
      "Make plans with a person who matters to you",
    ],
    harmonize: [
      "Resolve a minor tension before it grows",
      "Find common ground in a disagreement",
      "Create a calm, peaceful environment in your space",
      "Practice patience in a frustrating situation",
      "Compromise intentionally on something small",
    ],
    support: [
      "Help someone without being asked",
      "Check in on a friend or family member",
      "Offer your skills freely to someone who needs them",
      "Be a steady presence for someone going through difficulty",
      "Do something kind without expecting anything back",
    ],
  },

  3: { // Expression / Creativity / Joy
    create: [
      "Write 1 page of anything — fiction, thoughts, or plans",
      "Design or sketch something from your imagination",
      "Brainstorm 10 ideas on any topic",
      "Start a small creative project",
      "Express something you've been holding inside",
    ],
    communicate: [
      "Have a meaningful conversation with someone new",
      "Explain a concept you know well to someone else",
      "Record yourself speaking for 2 minutes",
      "Write a thoughtful message or letter",
      "Share a story from your own life",
    ],
    perform: [
      "Share something you created with at least one person",
      "Post content that reflects who you actually are",
      "Speak confidently in a group setting",
      "Teach or demonstrate a skill you have",
      "Do something expressive in public",
    ],
  },

  4: { // Structure / Foundation / Discipline
    organize: [
      "Declutter and organize one area of your space",
      "Create a schedule or plan for the week",
      "Review and sort your notes, files, or tasks",
      "Set up a system for a recurring task",
      "Make a checklist and complete everything on it",
    ],
    build: [
      "Work on a long-term project for at least 30 minutes",
      "Lay the groundwork for a future goal",
      "Establish or reinforce one daily routine",
      "Research and plan a decision that will matter later",
      "Finish something that has been left incomplete",
    ],
    discipline: [
      "Follow through on a commitment you made to yourself",
      "Do your most important task before anything optional",
      "Practice a skill with full intention for 20 minutes",
      "Keep a promise you made — no excuses",
      "Block distraction for a full focused hour",
    ],
  },

  5: { // Adaptability / Freedom / Change
    explore: [
      "Try something you have genuinely never done before",
      "Visit a new place, even just in your neighborhood",
      "Explore a topic you know nothing about",
      "Take a completely different approach to a familiar task",
      "Introduce one element of variety into your routine",
    ],
    adapt: [
      "Change your plan when something unexpected happens",
      "Reframe a setback as information, not failure",
      "Let go of a fixed expectation",
      "Embrace a change you've been quietly resisting",
      "Adjust your strategy mid-task based on feedback",
    ],
    learn: [
      "Spend 20 minutes learning a skill you don't have yet",
      "Read or listen to something outside your comfort zone",
      "Watch a tutorial on something completely unfamiliar",
      "Ask an expert something you've always wondered",
      "Learn one thing today that surprises you",
    ],
  },

  6: { // Responsibility / Care / Service
    nurture: [
      "Cook or prepare a nourishing meal for yourself or others",
      "Do something intentional for your physical wellbeing",
      "Care for a plant, pet, or living thing",
      "Create a moment of comfort in your environment",
      "Rest properly without guilt",
    ],
    serve: [
      "Help someone in a practical, tangible way",
      "Contribute time or effort to a cause",
      "Offer your expertise freely to someone who needs it",
      "Clean or improve a shared space",
      "Do a task that benefits others without recognition",
    ],
    beautify: [
      "Improve the look or feel of your workspace or home",
      "Create something with aesthetic intention",
      "Wear something that makes you feel good",
      "Bring beauty into an otherwise ordinary moment",
      "Arrange your environment with real care",
    ],
  },

  7: { // Introspection / Wisdom / Truth
    study: [
      "Read 20 pages of a nonfiction book",
      "Research a subject you're genuinely curious about",
      "Study something that challenges your current worldview",
      "Review your notes from past learning sessions",
      "Understand one concept so deeply you could teach it",
    ],
    reflect: [
      "Write in a journal for 10 uninterrupted minutes",
      "Sit in silence for 5 minutes with no phone",
      "Review your week — what worked, what didn't",
      "Ask yourself a hard question and answer it honestly",
      "Identify one belief you hold and examine where it came from",
    ],
    analyze: [
      "Break down a complex problem into its root parts",
      "Identify a pattern in your own behavior or results",
      "Evaluate a decision you made recently — what would you do differently?",
      "Research the root cause of a recurring challenge",
      "Map out a system or process you use and improve it",
    ],
  },

  8: { // Manifestation / Abundance / Authority
    achieve: [
      "Complete your highest-value task before anything else",
      "Hit one measurable target today",
      "Push through resistance on a key project",
      "Finish something significant that has real impact",
      "Accomplish something you'll still be proud of tomorrow",
    ],
    manage: [
      "Review your finances and identify one improvement",
      "Audit how you've spent your time this week",
      "Organize a project or shared effort clearly",
      "Set unambiguous expectations with someone",
      "Track a metric that actually matters to your goals",
    ],
    invest: [
      "Put serious time into a skill with long-term payoff",
      "Make a decision that builds future value, not comfort",
      "Save or invest even a small amount today",
      "Have a meaningful conversation with someone influential",
      "Learn something that increases your impact or leverage",
    ],
  },

  9: { // Completion / Impact / Contribution
    contribute: [
      "Do something that helps a complete stranger",
      "Give without expecting anything back",
      "Share useful knowledge with people beyond your circle",
      "Contribute meaningfully to a community or cause",
      "Support someone else's vision or project",
    ],
    complete: [
      "Finish something you started a long time ago",
      "Clear one item that's been on your list too long",
      "Bring closure to a lingering open loop",
      "End something that no longer serves you",
      "Follow through to the very end — no stopping short",
    ],
    release: [
      "Let go of a grudge or lingering resentment",
      "Declutter something you've been holding onto unnecessarily",
      "Forgive yourself for a past mistake — actually mean it",
      "Accept an outcome you cannot change",
      "Release your attachment to a specific result",
    ],
  },
}

// ── Quest type display metadata ───────────────────────────────────────────────
export const QUEST_TYPE_META = {
  primary:   { label: 'PRIMARY',    desc: 'Your core strength'      },
  growth:    { label: 'GROWTH',     desc: 'Expand a weak point'     },
  cycle:     { label: 'CYCLE',      desc: 'Current energy cycle'    },
  wildcard:  { label: 'WILDCARD',   desc: 'Unexpected path'         },
  objective: { label: 'LIFE QUEST', desc: 'Active tier objective'   },
}

// ── Number display info ───────────────────────────────────────────────────────
export const NUMBER_INFO = {
  1: { archetype: 'Power',          keywords: 'Will / Initiation'         },
  2: { archetype: 'Connection',     keywords: 'Harmony / Sensitivity'     },
  3: { archetype: 'Expression',     keywords: 'Creativity / Joy'          },
  4: { archetype: 'Structure',      keywords: 'Foundation / Discipline'   },
  5: { archetype: 'Adaptability',   keywords: 'Freedom / Change'          },
  6: { archetype: 'Responsibility', keywords: 'Care / Service'            },
  7: { archetype: 'Introspection',  keywords: 'Wisdom / Truth'            },
  8: { archetype: 'Manifestation',  keywords: 'Abundance / Authority'     },
  9: { archetype: 'Completion',     keywords: 'Impact / Contribution'     },
}

// ── Category → branch index mapping (exported for StatsTab) ─────────────────
// Index 0-2 match ACTION_POOLS category order; index 3 is the synergy branch
// (powered by total completions across all 3 categories for that number).
export const CATEGORY_BRANCH_MAP = {
  1: ['initiate', 'lead', 'assert'],
  2: ['connect', 'harmonize', 'support'],
  3: ['create', 'communicate', 'perform'],
  4: ['organize', 'build', 'discipline'],
  5: ['explore', 'adapt', 'learn'],
  6: ['nurture', 'serve', 'beautify'],
  7: ['study', 'reflect', 'analyze'],
  8: ['achieve', 'manage', 'invest'],
  9: ['contribute', 'complete', 'release'],
}

// ── Advanced action pools — unlocked when statXP[number] ≥ 15 ─────────────────
// Deeper, more demanding versions of the base actions. Same category structure.
export const ADVANCED_ACTION_POOLS = {
  1: {
    initiate: [
      "Begin the thing you've been avoiding for weeks — today, before anything else",
      "Start a project with zero preparation — trust your instinct to find the way",
      "Take a first step so uncomfortable that your comfort zone is clearly behind you",
      "Initiate a difficult conversation you've been postponing for too long",
      "Begin something with the clear intention of finishing it before next week",
    ],
    lead: [
      "Make a decision that affects others without seeking consensus first",
      "Step into a vacuum of leadership that no one else has filled",
      "Call out a direction clearly, even if you're uncertain of the outcome",
      "Own a mistake publicly and redirect without explanation or defensiveness",
      "Hold a position under sustained pushback without caving or over-explaining",
    ],
    assert: [
      "Hold a boundary that someone will test — and hold it again when they do",
      "Say exactly what you mean with no softening, no hedging, no apology",
      "Disagree openly with someone whose approval you normally seek",
      "Stand by a decision you made, even when pressured to reconsider",
      "Ask for what you want directly, once, without qualifiers",
    ],
  },
  2: {
    connect: [
      "Have a conversation where you ask nothing about yourself",
      "Reach out to someone you've been avoiding — and genuinely mean it",
      "Tell someone specifically and precisely why they matter to you",
      "Sit with someone in difficulty without offering a single solution",
      "Reconnect with a relationship that has gone quiet without explanation",
    ],
    harmonize: [
      "Repair something you damaged with your words or absence — today",
      "Stay regulated in a conversation that normally dysregulates you",
      "Find the truth in someone's opposing perspective before responding",
      "Create peace in a situation where you have every right to escalate",
      "Hold space for someone's process without rushing them toward resolution",
    ],
    support: [
      "Give support in the exact form someone needs, not the form you prefer to give",
      "Show up for someone without being asked and without expecting acknowledgment",
      "Offer something of real personal cost — time, attention, skill — freely",
      "Be present with someone through an uncomfortable emotion without fixing it",
      "Advocate for someone who isn't in the room",
    ],
  },
  3: {
    create: [
      "Produce something complete in one sitting — no revisions, no second sessions",
      "Create something specifically for one person and give it to them",
      "Make something without a plan — let the form emerge as you work",
      "Finish something creative you abandoned and left incomplete",
      "Create in a medium you've never used with the goal of finishing today",
    ],
    communicate: [
      "Say the thing you've been unable to say — clearly, without softening",
      "Write a message that requires real courage to send, and then send it",
      "Tell a story from your own life that reveals something genuinely true",
      "Explain something complex to someone unfamiliar until they actually understand it",
      "Have a conversation where you make yourself genuinely vulnerable",
    ],
    perform: [
      "Share your work publicly knowing some people will reject it",
      "Speak about your own ideas or creative work with confidence and specificity",
      "Perform or present something that required real effort to create",
      "Teach a room — make them feel something, not just understand something",
      "Share a perspective publicly that you normally keep entirely to yourself",
    ],
  },
  4: {
    organize: [
      "Build a system you've been putting off — one that will still work in six months",
      "Eliminate one source of recurring disorder in your environment permanently",
      "Create a structure so clear that someone else could maintain it without you",
      "Review and redesign a process you've let run inefficiently for too long",
      "Build the organizing layer for a goal you've had but never structured",
    ],
    build: [
      "Put 90 uninterrupted minutes into something you're building long-term",
      "Lay a foundation that your future self will genuinely thank you for",
      "Revisit a project you shelved and honestly assess whether it deserves to be built",
      "Do one thing that makes tomorrow's work structurally easier",
      "Build something that requires patience — and choose patience over shortcuts",
    ],
    discipline: [
      "Do the hard thing first without negotiating with yourself",
      "Hold a standard you've been letting slip — fully, not approximately",
      "Follow through on a commitment you made to yourself even though no one would know",
      "Do the work at your most resistant moment — prove the commitment is unconditional",
      "Complete something to a higher standard than was required",
    ],
  },
  5: {
    explore: [
      "Do something genuinely unfamiliar that produces discomfort — and stay with it",
      "Visit or engage with a world entirely unlike your own",
      "Take a route, method, or approach you've never considered before",
      "Enter a conversation, event, or space you don't belong in — and stay curious",
      "Explore a question you've been avoiding because the answer might change something",
    ],
    adapt: [
      "When the plan breaks, improvise — and document what you discover in the process",
      "Change direction mid-stride when new information makes the old plan wrong",
      "Accept a significant shift in circumstance without attempting to control the outcome",
      "Adapt to someone else's pace, style, or preference without resentment",
      "Find opportunity in a constraint you've been treating as an obstacle",
    ],
    learn: [
      "Learn something that genuinely challenges your existing assumptions",
      "Go beyond surface understanding — find the mechanism, not just the fact",
      "Learn from someone whose worldview differs significantly from yours — take notes",
      "Apply something you learned immediately, before you forget what not-knowing felt like",
      "Follow a learning thread until it surprises you",
    ],
  },
  6: {
    nurture: [
      "Give proper rest or recovery to something that has been depleted",
      "Care for your body in a way that's about love, not obligation",
      "Create a space where someone else can fully relax and recover",
      "Attend to something you've been neglecting because it wasn't urgent",
      "Make one person feel genuinely safe — not just comfortable",
    ],
    serve: [
      "Contribute something significant without any recognition or record",
      "Give your full skill to someone who cannot repay you",
      "Serve a cause that benefits people you'll never meet",
      "Do something for a shared space, community, or group without being asked",
      "Solve a problem for someone before they know they have it",
    ],
    beautify: [
      "Create beauty in a space that has been overlooked or neglected",
      "Bring something to its best possible form — not functional, genuinely beautiful",
      "Elevate an ordinary moment with intention and real care",
      "Create something aesthetic that has no purpose other than to be what it is",
      "Make one interaction more beautiful than it needed to be",
    ],
  },
  7: {
    study: [
      "Study something until the questions become more interesting than the answers",
      "Go deep enough into a subject to disagree with something you were taught",
      "Read primary sources — not summaries, the original material",
      "Study the history of an idea you currently take for granted",
      "Sit with a concept until your mental model of it changes",
    ],
    reflect: [
      "Write about a pattern in yourself that you've been reluctant to name",
      "Ask yourself what you're avoiding — and write about it honestly",
      "Examine a belief that guides your behavior and trace it to its origin",
      "Sit with an unresolved question long enough to sense an answer coming",
      "Reflect on a past decision without judgment — see only information",
    ],
    analyze: [
      "Find the root cause of something you've been treating as a symptom",
      "Map the assumptions behind a decision you're about to make",
      "Identify the pattern you keep returning to — and name what's actually driving it",
      "Analyze an outcome from multiple angles before drawing any conclusion",
      "Break a belief into its component assumptions and examine each one honestly",
    ],
  },
  8: {
    achieve: [
      "Complete something significant that requires sustained effort and no shortcuts",
      "Accomplish the thing that would most advance a major goal — nothing else first",
      "Produce a result measurably better than your previous best",
      "Finish something with excellence, not just completion",
      "Do the work that only you can do, at the level that proves you can do it",
    ],
    manage: [
      "Take full ownership of a result — no disclaimers, no shared credit for the shortfall",
      "Audit one system that has been underperforming and redesign it today",
      "Make a resource decision that optimizes for long-term leverage",
      "Set a standard clearly, then hold it consistently in the same interaction",
      "Close a feedback loop you've been leaving open",
    ],
    invest: [
      "Make a decision that costs you something real now for substantial future return",
      "Invest time in a relationship or skill that will compound over years",
      "Put energy into what most expands your capability, not your comfort",
      "Have a conversation about future opportunity that takes real courage",
      "Make a commitment that closes off easier options in order to unlock better ones",
    ],
  },
  9: {
    contribute: [
      "Give something of real value to the world, not just to your circle",
      "Leave a situation, person, or place measurably better than you found it",
      "Contribute to something larger than your current life in a way that will outlast today",
      "Give in a way that costs you something — not the surplus, the real thing",
      "Do something for humanity in the abstract — not for people you know",
    ],
    complete: [
      "Finish something that has resisted completion — go until it's truly done",
      "Close a chapter you've been pretending isn't still open",
      "Bring something to its proper ending, even if that ending is loss",
      "Complete a commitment you made to someone and explicitly acknowledge it",
      "Finish something in a way that honors what it was, not just checks it off",
    ],
    release: [
      "Release something you've been holding — a story, resentment, or attachment — fully",
      "Let go of a vision for how something should be and accept how it actually is",
      "Forgive something specific. Completely. Do not hedge.",
      "Give up control of an outcome that is no longer yours to hold",
      "Release the version of yourself that still needs to prove something",
    ],
  },
}

// ── Cycle XP modifiers ────────────────────────────────────────────────────────
// Each cycle number changes which quest behaviors earn bonus XP.
const CYCLE_MODIFIERS = {
  1: {
    label: 'Initiation Cycle',
    rule:  'Bonus XP for categories you have never completed before',
    effect(quest, history) {
      if (!history.completedTypes.includes(quest.category))
        quest.rewardXP = Math.round(quest.rewardXP * 1.3)
    },
  },
  2: {
    label: 'Partnership Cycle',
    rule:  'Bonus XP for connecting, supporting, and harmonizing actions',
    effect(quest) {
      if (['connect', 'harmonize', 'support', 'serve', 'nurture'].includes(quest.category))
        quest.rewardXP = Math.round(quest.rewardXP * 1.25)
    },
  },
  3: {
    label: 'Expression Cycle',
    rule:  'Bonus XP for creative, communicative, and performative actions',
    effect(quest) {
      if (['create', 'communicate', 'perform', 'beautify'].includes(quest.category))
        quest.rewardXP = Math.round(quest.rewardXP * 1.3)
    },
  },
  4: {
    label: 'Foundation Cycle',
    rule:  'Bonus XP for repeating the same category — consistency is rewarded',
    effect(quest, history) {
      const recentCount = history.lastActions.slice(-5).filter(a => a === quest.category).length
      if (recentCount >= 2) {
        quest.rewardXP = Math.round(quest.rewardXP * 1.3)
        quest.isRepeated = true
      }
    },
  },
  5: {
    label: 'Freedom Cycle',
    rule:  'Bonus XP for new category types; penalty for repeated ones',
    effect(quest, history) {
      if (!history.lastActions.includes(quest.category)) {
        quest.rewardXP = Math.round(quest.rewardXP * 1.3)
        quest.isNew = true
      } else if (history.lastActions.slice(-3).every(a => a === quest.category)) {
        quest.rewardXP = Math.round(quest.rewardXP * 0.7)
        quest.isRepeated = true
      }
    },
  },
  6: {
    label: 'Responsibility Cycle',
    rule:  'Bonus XP for nurturing, serving, and supporting others',
    effect(quest) {
      if (['nurture', 'serve', 'support', 'beautify', 'connect'].includes(quest.category))
        quest.rewardXP = Math.round(quest.rewardXP * 1.25)
    },
  },
  7: {
    label: 'Introspection Cycle',
    rule:  'Bonus XP for deep study, reflection, and analysis',
    effect(quest) {
      if (['study', 'reflect', 'analyze'].includes(quest.category))
        quest.rewardXP = Math.round(quest.rewardXP * 1.35)
    },
  },
  8: {
    label: 'Power Cycle',
    rule:  'Bonus XP scales with difficulty — hard quests pay most',
    effect(quest) {
      if (quest.difficulty === 'hard')   quest.rewardXP = Math.round(quest.rewardXP * 1.4)
      if (quest.difficulty === 'medium') quest.rewardXP = Math.round(quest.rewardXP * 1.15)
    },
  },
  9: {
    label: 'Completion Cycle',
    rule:  'Bonus XP for completing, contributing, and releasing',
    effect(quest) {
      if (['complete', 'release', 'contribute'].includes(quest.category))
        quest.rewardXP = Math.round(quest.rewardXP * 1.3)
    },
  },
}

// ── Outer Quest Tiers — tied to outer frequency (1-9) ─────────────────────────
// Each outer number has 3 tiers of increasing difficulty focused on how others perceive you
export const OUTER_QUEST_TIERS = {
  1: [ // Seen as leader / initiator
    {
      tier: 1, difficulty: 'easy',
      title: 'Step Forward',
      desc: 'Be seen as someone who takes initiative in small, practical moments.',
      objectives: [
        'Volunteer to start a task no one has claimed yet',
        'Speak first in one meeting or group chat',
        'Make one clear decision and communicate it simply',
      ],
      archetype: 'Initiator',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Set Direction',
      desc: 'Be seen as someone who provides direction when things are unclear.',
      objectives: [
        'Suggest a clear next-step plan for a shared task',
        'Coordinate two people around a deadline',
        'Take ownership of a stalled decision and move it forward',
      ],
      archetype: 'Directional Leader',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Reliable Lead',
      desc: 'Be seen as a dependable leader through consistent follow-through.',
      objectives: [
        'Run a recurring check-in for one week',
        'Lead a small effort from start to completion',
        'Be the person others ask first when work needs direction',
      ],
      archetype: 'Trusted Leader',
    },
  ],

  2: [ // Seen as cooperative / diplomatic
    {
      tier: 1, difficulty: 'easy',
      title: 'Find Common Ground',
      desc: 'Be seen as someone who listens and reduces tension.',
      objectives: [
        'Reflect back someone\'s viewpoint before giving yours',
        'Name one point of agreement in a disagreement',
        'Support a teammate without taking over',
      ],
      archetype: 'Peacemaker',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Bridge Builder',
      desc: 'Be seen as someone who helps people work together.',
      objectives: [
        'Facilitate a short conversation between two people with friction',
        'Connect two people who can help each other',
        'Summarize both sides fairly in a conflict',
      ],
      archetype: 'Diplomat',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Trusted Connector',
      desc: 'Be seen as a steady connector people rely on in tense moments.',
      objectives: [
        'Help resolve an issue that has been open for days',
        'Create a shared agreement everyone can commit to',
        'Be asked to mediate because people trust your fairness',
      ],
      archetype: 'Trusted Diplomat',
    },
  ],

  3: [ // Seen as expressive / engaging
    {
      tier: 1, difficulty: 'easy',
      title: 'Share Your Voice',
      desc: 'Be seen as expressive and engaging in everyday interactions.',
      objectives: [
        'Share one original idea in conversation or chat',
        'Post or present a small piece of your work',
        'Tell a short story that keeps people engaged',
      ],
      archetype: 'Expressive Communicator',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Clear Communicator',
      desc: 'Be seen as someone who can make ideas easy to understand.',
      objectives: [
        'Explain a complex topic simply to one person',
        'Lead a short discussion and keep it focused',
        'Turn scattered input into a clear summary',
      ],
      archetype: 'Social Communicator',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Positive Presence',
      desc: 'Be seen as someone whose expression improves group energy consistently.',
      objectives: [
        'Host or lead a short creative or brainstorming session',
        'Help a group communicate more effectively this week',
        'Be recognized as someone who brings clarity and energy',
      ],
      archetype: 'Recognized Voice',
    },
  ],

  4: [ // Seen as organized / dependable
    {
      tier: 1, difficulty: 'easy',
      title: 'Get It In Order',
      desc: 'Be seen as someone who brings order and reliability.',
      objectives: [
        'Organize one shared space, file, or workflow',
        'Finish one task completely before switching',
        'Send a clear status update before being asked',
      ],
      archetype: 'Organizer',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Build Structure',
      desc: 'Be seen as someone who creates useful systems people can trust.',
      objectives: [
        'Create a checklist or process others can use',
        'Improve a recurring routine so it runs smoother',
        'Help a group plan with realistic timelines',
      ],
      archetype: 'System Builder',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Trusted Operator',
      desc: 'Be seen as the person who keeps things stable under pressure.',
      objectives: [
        'Own a process for one full week with no missed handoffs',
        'Fix a recurring operational pain point',
        'Be the go-to person for keeping work organized',
      ],
      archetype: 'Dependable Anchor',
    },
  ],

  5: [ // Seen as adaptable / dynamic
    {
      tier: 1, difficulty: 'easy',
      title: 'Try Something New',
      desc: 'Be seen as adaptable and open to change.',
      objectives: [
        'Try a new method for a familiar task',
        'Say yes to one healthy, unexpected opportunity',
        'Introduce one small improvement to routine',
      ],
      archetype: 'Adaptable Explorer',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Catalyst Move',
      desc: 'Be seen as someone who helps others embrace useful change.',
      objectives: [
        'Help someone try a new approach that reduces stress',
        'Refresh a stale workflow with one practical change',
        'Model calm flexibility when plans shift unexpectedly',
      ],
      archetype: 'Change Catalyst',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Adaptive Leader',
      desc: 'Be seen as steady and resourceful during uncertainty.',
      objectives: [
        'Guide a team through an unexpected change smoothly',
        'Help others reframe a setback into a workable plan',
        'Be recognized for keeping momentum through change',
      ],
      archetype: 'Adaptive Guide',
    },
  ],

  6: [ // Seen as caring / responsible
    {
      tier: 1, difficulty: 'easy',
      title: 'Show Care',
      desc: 'Be seen as warm, supportive, and responsible toward others.',
      objectives: [
        'Check in thoughtfully with someone who seems stressed',
        'Help someone with one practical task',
        'Offer support without expecting anything back',
      ],
      archetype: 'Supportive Presence',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Steady Support',
      desc: 'Be seen as someone people can count on emotionally and practically.',
      objectives: [
        'Follow up with someone you helped earlier',
        'Create a calm, respectful environment in a tense moment',
        'Support two people without overextending yourself',
      ],
      archetype: 'Reliable Caretaker',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Trusted Care Anchor',
      desc: 'Be seen as someone who sustains care through consistency and boundaries.',
      objectives: [
        'Maintain a support routine for one full week',
        'Help a group improve how they care for each other',
        'Be recognized as both caring and dependable',
      ],
      archetype: 'Community Care Anchor',
    },
  ],

  7: [ // Seen as thoughtful / insightful
    {
      tier: 1, difficulty: 'easy',
      title: 'Think It Through',
      desc: 'Be seen as reflective and thoughtful in how you respond.',
      objectives: [
        'Pause before reacting and ask one clarifying question',
        'Research a topic before sharing an opinion',
        'Write down one insight from today\'s events',
      ],
      archetype: 'Reflective Thinker',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Insight Translator',
      desc: 'Be seen as someone who turns complexity into useful understanding.',
      objectives: [
        'Explain a confusing issue in plain language',
        'Offer a balanced perspective that helps someone decide',
        'Help someone separate facts from assumptions',
      ],
      archetype: 'Practical Insight',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Trusted Advisor',
      desc: 'Be seen as a grounded source of perspective over time.',
      objectives: [
        'Give guidance that someone uses and reports back on',
        'Create a short reflection framework others can use',
        'Be asked for input because your thinking is consistently clear',
      ],
      archetype: 'Trusted Advisor',
    },
  ],

  8: [ // Seen as competent / authoritative
    {
      tier: 1, difficulty: 'easy',
      title: 'Own Results',
      desc: 'Be seen as competent, decisive, and accountable.',
      objectives: [
        'Take ownership of one visible outcome',
        'Set a practical target and hit it today',
        'Communicate progress with confidence and accuracy',
      ],
      archetype: 'Accountable Performer',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Resource Manager',
      desc: 'Be seen as someone who manages resources and priorities effectively.',
      objectives: [
        'Prioritize competing tasks and justify your order',
        'Help others by allocating time or support fairly',
        'Make a decision that improves results for the group',
      ],
      archetype: 'Practical Authority',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Trusted Decision Maker',
      desc: 'Be seen as fair, strong, and reliable when stakes are higher.',
      objectives: [
        'Lead a high-impact decision with transparent reasoning',
        'Balance people needs and performance needs in one call',
        'Be recognized as fair and effective under pressure',
      ],
      archetype: 'Respected Authority',
    },
  ],

  9: [ // Seen as compassionate / big-picture
    {
      tier: 1, difficulty: 'easy',
      title: 'Contribute',
      desc: 'Be seen as generous and aware of the bigger picture.',
      objectives: [
        'Do one concrete action that helps a group, not just yourself',
        'Share useful knowledge or resources with no payoff expected',
        'Offer encouragement to someone who is struggling',
      ],
      archetype: 'Compassionate Contributor',
    },
    {
      tier: 2, difficulty: 'medium',
      title: 'Guide and Uplift',
      desc: 'Be seen as someone who helps others grow with patience and perspective.',
      objectives: [
        'Mentor someone through one practical next step',
        'Help resolve tension by focusing on shared humanity',
        'Offer perspective that helps someone move forward',
      ],
      archetype: 'Community Mentor',
    },
    {
      tier: 3, difficulty: 'hard',
      title: 'Steady Humanitarian',
      desc: 'Be seen as consistently compassionate, practical, and service-oriented.',
      objectives: [
        'Sustain one service habit for a full week',
        'Help coordinate support for multiple people',
        'Be recognized for putting people first without burning out',
      ],
      archetype: 'Grounded Humanitarian',
    },
  ],
}

// ── Base XP per difficulty ────────────────────────────────────────────────────
// Difficulty has REAL impact on rewards:
//   easy   = 0.75x base, medium = 1.0x base, hard = 1.5x base
const BASE_XP = { easy: 50, medium: 100, hard: 160 }
const DIFFICULTY_MULTIPLIER = { easy: 0.75, medium: 1.0, hard: 1.5 }
const DIFF_META = {
  easy:   { label: 'EASY',   icon: '●',   color: '#4ade80', shortColor: 'var(--sage)' },
  medium: { label: 'MEDIUM', icon: '●●',  color: '#fbbf24', shortColor: 'var(--gold)' },
  hard:   { label: 'HARD',   icon: '●●●', color: '#f87171', shortColor: 'var(--rose)' },
}

// ── Re-roll configuration ─────────────────────────────────────────────────────
const LS_REROLL_COUNT = 'scl_reroll_count'
const LS_REROLL_DATE  = 'scl_reroll_date'
const MAX_REROLLS_PER_DAY = 2

// ── Helpers ───────────────────────────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}


function dispatch(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail: detail || null }))
}

// ── History ───────────────────────────────────────────────────────────────────
function defaultHistory() {
  return {
    lastActions: [],
    completedTypes: [],
    categoryCompletions: {},
    focusStreaks: { primaryNumber: null, days: 0, lastDate: '' },
  }
}

export function loadQuestHistory() {
  try {
    const raw = localStorage.getItem(LS_QUEST_HIST)
    return raw ? JSON.parse(raw) : defaultHistory()
  } catch { return defaultHistory() }
}

function saveHistory(history) {
  try { localStorage.setItem(LS_QUEST_HIST, JSON.stringify(history)) } catch {}
}

// ── Outer quest progression ───────────────────────────────────────────────────
function defaultOuterProgress() {
  return {
    // map of frequency number -> completion count
    completionsByNumber: {},
  }
}

function loadOuterProgress() {
  try {
    const raw = localStorage.getItem(LS_OUTER_PROGRESS)
    if (!raw) return defaultOuterProgress()
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? { completionsByNumber: parsed.completionsByNumber || {} }
      : defaultOuterProgress()
  } catch {
    return defaultOuterProgress()
  }
}

function saveOuterProgress(progress) {
  try { localStorage.setItem(LS_OUTER_PROGRESS, JSON.stringify(progress)) } catch {}
}

/**
 * Tier thresholds by completed outer quests for a given frequency:
 * 1-3 completions => tier 1
 * 4-8 completions => tier 2
 * 9+ completions  => tier 3
 */
export function getOuterTierForNumber(outerNumber) {
  const progress = loadOuterProgress()
  const completed = progress.completionsByNumber?.[outerNumber] || 0
  if (completed >= 9) return 3
  if (completed >= 4) return 2
  return 1
}

export function getOuterTierProgress(outerNumber) {
  const progress = loadOuterProgress()
  const completed = progress.completionsByNumber?.[outerNumber] || 0
  const tier = getOuterTierForNumber(outerNumber)
  const nextAt = tier === 1 ? 4 : tier === 2 ? 9 : null
  const remaining = nextAt ? Math.max(0, nextAt - completed) : 0
  return { tier, completed, nextAt, remaining }
}

// ── Stat XP helpers ───────────────────────────────────────────────────────────
function _statXPForDifficulty(difficulty) {
  return { easy: 1, medium: 2, hard: 4 }[difficulty] || 1
}

function _updateCategoryAffinity(history, number, category) {
  if (!category || category === 'objective') return
  history.categoryCompletions = history.categoryCompletions || {}
  history.categoryCompletions[number] = history.categoryCompletions[number] || {}
  history.categoryCompletions[number][category] =
    (history.categoryCompletions[number][category] || 0) + 1
}

/** Returns updated streak count (days) for the given primary number. */
function _updateFocusStreak(history, number) {
  const today = todayStr()
  const fs = history.focusStreaks || { primaryNumber: null, days: 0, lastDate: '' }
  if (fs.lastDate === today) return fs.days // already counted today
  if (fs.primaryNumber === number && fs.lastDate === _yesterdayStr()) {
    fs.days = (fs.days || 0) + 1
  } else {
    fs.days = 1
    fs.primaryNumber = number
  }
  fs.lastDate = today
  history.focusStreaks = fs
  return fs.days
}

/** Awards the Daily Sweep bonus once all 4 quests are complete. */
function _checkDailySweep(raw) {
  if (raw.sweepAwarded) return
  if (!raw.quests.every(q => q.completed)) return
  raw.sweepAwarded = true
  try { localStorage.setItem(LS_GEN_QUESTS, JSON.stringify(raw)) } catch { /* intentional */ }
  earnCharXP(25)
  const cn = raw.cycleNumber
  if (cn >= 1 && cn <= 9) {
    applyQuestSkillReward({ root: cn, questKind: 'cycle', difficulty: 'easy' }, earnStatXP, dispatch)
  }
  dispatch('scl:xp_toast', { msg: '◈ DAILY SWEEP · +25 XP', color: 'var(--teal)' })
}

/** Generate an outer quest based on the outer frequency number.
 *  Outer quests are about how others perceive you.
 *  Returns a single quest from the appropriate tier for the outer number.
 */
export function generateOuterQuest(outerNumber, tierOverride = null) {
  if (!outerNumber || outerNumber < 1 || outerNumber > 9) return null
  const tiers = OUTER_QUEST_TIERS[outerNumber]
  if (!tiers) return null
  
  // Automatic progression by completion history, unless explicitly overridden.
  const autoTier = getOuterTierForNumber(outerNumber)
  const tier = tierOverride ? Math.max(1, Math.min(3, tierOverride)) : autoTier
  const questTemplate = tiers[tier - 1]
  if (!questTemplate) return null
  
  // Pick a random objective from the tier
  const objective = pick(questTemplate.objectives)
  
  return {
    id: uid(),
    title: questTemplate.title,
    desc: questTemplate.desc,
    objective,
    tier: questTemplate.tier,
    difficulty: questTemplate.difficulty,
    archetype: questTemplate.archetype,
    outerNumber,
    type: 'outer',
    baseXP: BASE_XP[questTemplate.difficulty] * 1.5, // Outer quests worth more
    rewardXP: BASE_XP[questTemplate.difficulty] * 1.5,
    isOuter: true,
    completed: false,
  }
}

// ── Life quest tier objective ─────────────────────────────────────────────────
// Returns the active tier number for a quest node given the stored LQP state.
function activeTierFor(questKey, lqp) {
  if (!lqp || !lqp[questKey]) return 1
  for (let t = 1; t <= 3; t++) {
    const prog = lqp[questKey][t] || []
    if (!prog.length || !prog.every(Boolean)) return t
  }
  return 3
}

// ── Generate today's 4 quests ─────────────────────────────────────────────────
/**
 * user = {
 *   dominantNumbers: number[]   — top frequency numbers from profile
 *   weakerNumbers:   number[]   — absent/low frequency numbers
 *   cycleNumber:     number     — current personal year/month cycle
 *   statXP?:         object     — { [1..9]: xp } from questEngine.getXPState()
 * }
 */
// Stage unlock thresholds — must match SkillTree.jsx THRESHOLDS
const SKILL_STAGE_THRESHOLDS = { stage2: 5, stage3: 10 }

function isSkillStageUnlocked(numberId, stageIdx, skillProgress, statValues, seeds) {
  if (stageIdx === 0) return true
  const prevDone = skillProgress[numberId]?.[stageIdx - 1] === true
  if (!prevDone) return false
  const innate  = seeds?.[numberId] || [false, false, false]
  if (innate[stageIdx]) return true
  const statVal = statValues?.[String(numberId)] || 0
  return statVal >= (stageIdx === 1 ? SKILL_STAGE_THRESHOLDS.stage2 : SKILL_STAGE_THRESHOLDS.stage3)
}

function _shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateDailyQuests(user) {
  const today       = todayStr()
  const cycleNumber = user?.cycleNumber || 5
  const statValues  = user?.statValues  || {}
  const seeds       = user?.seeds       || {}
  const lifeNodes   = user?.lifeNodes   || []
  const cycleRoots  = user?.cycleRoots  || {}

  // ── 2 SKILL quests (unlocked stages only) ────────────────────────────────
  let skillProgress = {}
  try {
    const raw = localStorage.getItem(SKILLTREE_LS_KEY)
    if (raw) skillProgress = JSON.parse(raw)
  } catch {}

  const skillPool = []
  NUMBERS.forEach(numberObj => {
    numberObj.stages.forEach((stageObj, stageIdx) => {
      if (!isSkillStageUnlocked(numberObj.id, stageIdx, skillProgress, statValues, seeds)) return
      stageObj.quests.forEach((questText, questIdx) => {
        skillPool.push({
          number:      Number(numberObj.id),
          numberLabel: numberObj.label,
          stage:       stageObj.stage,
          stageName:   stageObj.name,
          questText,
          questIdx,
          stageIdx,
        })
      })
    })
  })

  const skillPicked = _shuffle(skillPool).slice(0, 2)
  const skillQuests = skillPicked.map(q => ({
    id:          `skill-${q.number}-${q.stage}-${q.questIdx}-${today}`,
    title:       q.questText,
    number:      q.number,
    numberLabel: q.numberLabel,
    stage:       q.stage,
    stageIdx:    q.stageIdx,
    stageName:   q.stageName,
    source:      'skill',
    type:        'skilltree',
    difficulty:  q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard',
    rewardXP:    (() => { const base = q.stage === 1 ? 5 : q.stage === 2 ? 10 : 20; const diff = q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard'; return Math.round(base * (DIFFICULTY_MULTIPLIER[diff] || 1.0)) })(),
    skillMeta:   resolveSkillMeta({ root: q.number, stageIdx: q.stageIdx, questKind: 'skill' }),
    completed:   false,
    isNew:       true,
    isRepeated:  false,
  }))

  // ── 2 LIFE quests (active tier objectives from life quest nodes) ──────────
  const lqp = getLQP()
  const lifePool = []
  for (const node of lifeNodes) {
    const tier     = activeTierFor(node.key, lqp)
    const objs     = getTieredObjectiveTexts(node.root, tier)
    const progress = lqp?.[node.key]?.[tier] || []
    objs.forEach((text, i) => {
      if (!progress[i]) lifePool.push({ questKey: node.key, root: node.root, tier, objIdx: i, text })
    })
  }

  const lifePicked = _shuffle(lifePool).slice(0, 2)
  const multiDayStarts = []
  const lifeQuests = lifePicked.map(c => {
    const diff = c.tier === 3 ? 'hard' : c.tier === 2 ? 'medium' : 'easy'
    const quest = {
      id:        `life-${c.questKey}-${c.tier}-${c.objIdx}-${today}`,
      title:     c.text,
      number:    c.root,
      source:    'life',
      type:      'objective',
      difficulty: diff,
      rewardXP:  Math.round(BASE_XP[diff] * (DIFFICULTY_MULTIPLIER[diff] || 1.0)),
      skillMeta: resolveSkillMeta({ root: c.root, tier: c.tier, questKind: 'life' }),
      completed: false,
      isNew:     false,
      isRepeated:false,
      lqpMeta:   { questKey: c.questKey, tier: c.tier, objIdx: c.objIdx },
    }
    const multi = detectMultiDay(c.text)
    if (multi) {
      quest.multiDay = { totalDays: multi.totalDays }
      multiDayStarts.push(quest)
    }
    return quest
  })

  // ── 2 CURRENT quests (personal year + personal month cycle objectives) ────
  const blueprintKey = user?.blueprintKey || 'cl'
  const monthLqpTier = activeTierFor(blueprintKey, lqp)

  const cyclePool = []
  const cycleTypes = [
    { type: 'personalYear',  root: cycleRoots.personalYear  },
    { type: 'personalMonth', root: cycleRoots.personalMonth },
    { type: 'personalDay',   root: cycleRoots.personalDay   },
  ]
  for (const { type, root } of cycleTypes) {
    if (!root) continue
    const objs = getCycleObjectives(type, root, 1, type === 'personalMonth' ? monthLqpTier : null)
    objs.forEach((o, i) => cyclePool.push({ type, root, text: o.text, idx: i }))
  }

  const cyclePicked = _shuffle(cyclePool).slice(0, 2)
  const cycleQuests = cyclePicked.map(c => ({
    id:          `current-${c.type}-${c.root}-${c.idx}-${today}`,
    title:       c.text,
    number:      c.root,
    cycleType:   c.type,
    source:      'current',
    type:        'cycle',
    difficulty:  'easy',
    rewardXP:    Math.round(BASE_XP.easy * (DIFFICULTY_MULTIPLIER['easy'] || 1.0)),
    skillMeta:   resolveSkillMeta({ root: c.root, questKind: 'cycle' }),
    completed:   false,
    isNew:       false,
    isRepeated:  false,
  }))

  const quests = [...skillQuests, ...lifeQuests, ...cycleQuests]

  // Fallback: if pools were small and we got fewer than 6, fill from remaining skill quests
  if (quests.length < 6) {
    const remainingSkill = _shuffle(skillPool).filter(
      sq => !skillPicked.some(sp => sp.questText === sq.questText)
    )
    const needed = 6 - quests.length
    const fillers = remainingSkill.slice(0, needed).map(q => ({
      id:          `skill-${q.number}-${q.stage}-${q.questIdx}-${today}`,
      title:       q.questText,
      number:      q.number,
      numberLabel: q.numberLabel,
      stage:       q.stage,
      stageIdx:    q.stageIdx,
      stageName:   q.stageName,
      source:      'skill',
      type:        'skilltree',
      difficulty:  q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard',
      rewardXP:    (() => { const base = q.stage === 1 ? 5 : q.stage === 2 ? 10 : 20; const diff = q.stage === 1 ? 'easy' : q.stage === 2 ? 'medium' : 'hard'; return Math.round(base * (DIFFICULTY_MULTIPLIER[diff] || 1.0)) })(),
      completed:   false,
      isNew:       true,
      isRepeated:  false,
      skillMeta:   resolveSkillMeta({ root: q.number, stageIdx: q.stageIdx, questKind: 'skill' }),
    }))
    quests.push(...fillers)
  }

  const record = { date: today, quests, cycleLabel: CYCLE_MODIFIERS?.[cycleNumber]?.label || '', cycleNumber }
  try { localStorage.setItem(LS_GEN_QUESTS, JSON.stringify(record)) } catch {}
  dispatch('scl:gen_quests_updated', { quests })

  multiDayStarts.forEach((quest) => {
    try { beginMultiDayQuest(quest) } catch { /* intentional */ }
  })

  return quests
}

// ── Read today's quests ───────────────────────────────────────────────────────
/**
 * Returns the stored quest array for today, or null if none generated yet.
 */
export function getGeneratedQuests() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || 'null')
    if (raw && raw.date === todayStr()) return { quests: raw.quests || [], cycleLabel: raw.cycleLabel || '' }
  } catch {}
  return null
}

// ── Journal prompts ───────────────────────────────────────────────────────────
export const JOURNAL_PROMPTS = {
  1: [
    'What did you begin today, and what resistance came up as you started?',
    'What did you initiate? What were you tempted to wait for instead?',
    'What did taking the lead feel like? Where did you hold back?',
  ],
  2: [
    'What did you notice in the exchange today? What were you tempted to avoid saying?',
    'How did you show up for someone else — and how did you show up for yourself?',
    'What needed harmony today, and how did you meet it?',
  ],
  3: [
    'What came out of you that surprised you? What did you still hold back?',
    'What did you express, and what did it feel like to let it out?',
    'What was it like to share — to put something of yours into the world?',
  ],
  4: [
    'What structure did you build or hold today? Where did discipline slip?',
    'What did showing up feel like — the moment before, and the moment after?',
    'What does consistency actually mean for you right now?',
  ],
  5: [
    'What shifted in you when you chose the unfamiliar path?',
    'What were you tempted to avoid? What did meeting it reveal?',
    'What changed in your perspective today?',
  ],
  6: [
    'What did giving feel like today — natural, forced, easy, or hard?',
    'Where did you care for something beyond yourself? What arose in you?',
    'What does real service feel like, versus performance?',
  ],
  7: [
    'What did you discover in the quiet today? What surfaced when you stopped filling the space?',
    'What did you understand today that you didn\'t understand before?',
    'What truth are you sitting with right now?',
  ],
  8: [
    'What did full ownership feel like? Where did you step forward, where did you retreat?',
    'What result did you create, and what did it actually take?',
    'What does your authority feel like from the inside?',
  ],
  9: [
    'What did you release? What still wants to cling on?',
    'What became complete today? What did completion feel like?',
    'What did you give that had nothing to do with receiving?',
  ],
  objective: [
    'What shifted in you as a result of this? Be specific.',
    'What did this require of you that you didn\'t expect?',
    'What would you tell someone just beginning this tier?',
  ],
}

export function getJournalPrompt(number, type, questId) {
  const pool = type === 'objective'
    ? JOURNAL_PROMPTS.objective
    : (JOURNAL_PROMPTS[number] || JOURNAL_PROMPTS[1])
  const idx = questId ? questId.charCodeAt(0) % pool.length : 0
  return pool[idx]
}

// ── Multi-day detection ───────────────────────────────────────────────────────
export function detectMultiDay(text) {
  const m = text.match(/(\d+)\s+consecutive\s+days?/i) || text.match(/(\d+)\s+days\b/i)
  return m ? { totalDays: parseInt(m[1]) } : null
}

// ── Reflection storage ────────────────────────────────────────────────────────
export function saveGenReflection(questId, text, meta) {
  try {
    const store = JSON.parse(localStorage.getItem('scl_reflections') || '{}')
    store['gen_' + questId] = {
      text: text.trim(),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      questTitle: meta.title || '',
      number:     meta.number || null,
      archetype:  NUMBER_INFO[meta.number]?.archetype || '',
      questType:  meta.type || '',
      tier:       meta.lqpMeta?.tier  || null,
      questKey:   meta.lqpMeta?.questKey || null,
      completedAt: Date.now(),
    }
    localStorage.setItem('scl_reflections', JSON.stringify(store))
  } catch {}
}

// ── Complete a single-day quest ───────────────────────────────────────────────
/**
 * Requires journalText (≥ 30 chars).
 * Returns { ok, xpAwarded?, error? }
 */
export function completeGeneratedQuest(questId, journalText) {
  const trimmed = (journalText || '').trim()
  if (trimmed.length < 30) {
    return { ok: false, error: `Write at least 30 characters (${trimmed.length}/30)` }
  }
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || 'null')
    if (!raw || raw.date !== todayStr()) return { ok: false, error: 'No active quests for today' }

    const quest = raw.quests.find(q => q.id === questId)
    if (!quest)          return { ok: false, error: 'Quest not found' }
    if (quest.completed) return { ok: false, error: 'Already completed' }

    if (quest.multiDay) {
      const active = getActiveMultiDayQuests()
      if (active[questId]) {
        return { ok: false, error: 'Multi-day commitment — use daily check-ins to progress' }
      }
      const beginResult = beginMultiDayQuest(quest)
      if (beginResult.ok) {
        saveGenReflection(questId, trimmed, quest)
        dispatch('scl:gen_quests_updated', { quests: raw.quests })
        return { ok: true, multiDayStarted: true }
      }
      return beginResult
    }

    quest.completed   = true
    quest.completedAt = Date.now()
    localStorage.setItem(LS_GEN_QUESTS, JSON.stringify(raw))

    earnCharXP(quest.rewardXP)

    // Load history once for all tracking below
    const history = loadQuestHistory()

    // ── Difficulty-scaled stat XP ──────────────────────────────────────────────
    let statXPAmount = _statXPForDifficulty(quest.difficulty)

    // ── Focus streak bonus (primary quests only; disabled in Cycle 5 Freedom) ──
    if (quest.type === 'primary' && raw.cycleNumber !== 5) {
      const streak = _updateFocusStreak(history, quest.number)
      if (streak >= 3) {
        statXPAmount = Math.round(statXPAmount * 1.5)
        dispatch('scl:xp_toast', { msg: `◉ FOCUS STREAK ${streak}d · ×1.5 STAT XP`, color: 'var(--teal)' })
      }
    }

    const skillResult = applyQuestSkillReward({
      skillMeta: quest.skillMeta || resolveSkillMeta({
        root: quest.number,
        tier: quest.lqpMeta?.tier || (quest.stageIdx != null ? quest.stageIdx + 1 : 1),
        questKind: quest.type === 'skilltree' ? 'skill' : quest.source === 'life' ? 'life' : 'cycle',
        stageIdx: quest.stageIdx,
      }),
      difficulty: quest.difficulty,
      statXPAmount,
    }, earnStatXP, dispatch)

    if (quest.lqpMeta) {
      const { questKey, tier, objIdx } = quest.lqpMeta
      QuestEngine_markLQPObjective(questKey, tier, objIdx, { skipSkillReward: true })
    }

    // ── History + category affinity update ────────────────────────────────────
    if (quest.category !== 'objective') {
      history.lastActions    = [...history.lastActions, quest.category].slice(-20)
      history.completedTypes = [...new Set([...history.completedTypes, quest.category])]
      _updateCategoryAffinity(history, quest.number, quest.category)
    }

    // ── Outer progression update ─────────────────────────────────────────────
    if (quest.type === 'outer' && quest.outerNumber >= 1 && quest.outerNumber <= 9) {
      const outerProgress = loadOuterProgress()
      outerProgress.completionsByNumber[quest.outerNumber] =
        (outerProgress.completionsByNumber[quest.outerNumber] || 0) + 1
      saveOuterProgress(outerProgress)
    }

    saveHistory(history)

    // ── Daily Sweep bonus (all 4 complete) ────────────────────────────────────
    _checkDailySweep(raw)

    // Trigger achievements check after quest & sweep
    try {
      if (typeof window.checkAndAwardAchievements === 'function') {
        window.checkAndAwardAchievements({})
      }
    } catch {}

    saveGenReflection(questId, trimmed, quest)
    dispatch('scl:gen_quests_updated', { quests: raw.quests, completed: questId })

    updateDailySummary({
      xpEarned: quest.rewardXP,
      questsCompleted: 1,
    })
    try { recordDailySnapshot() } catch {}

    // ── Detailed reward summary toast ──────────────────────────────────────
    try {
      dispatch('scl:quest_reward', {
        charXP: quest.rewardXP,
        statXP: statXPAmount,
        statNum: skillResult.meta?.number || skillTreeNumber(quest.number) || quest.number,
        difficulty: quest.difficulty,
        questTitle: quest.title,
        questNumber: quest.number,
        skillPipFilled: skillResult.pipFilled,
        skillStageName: skillResult.pipFilled ? ['Initiate', 'Consistency', 'Mastery'][skillResult.meta?.stageIdx] : null,
      })
    } catch {}

    return { ok: true, xpAwarded: quest.rewardXP }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// ── Expose for achievements
window.loadQuestHistory = loadQuestHistory
window.loadMultiDayQuests = getActiveMultiDayQuests
window.Achievements_statState = statState  // for achievements.js

// ── Multi-day quest persistence ───────────────────────────────────────────────
const LS_MULTIDAY = 'scl_multiday_quests'

export function getActiveMultiDayQuests() {
  try { return JSON.parse(localStorage.getItem(LS_MULTIDAY) || '{}') } catch { return {} }
}

function _saveMultiDay(map) {
  try { localStorage.setItem(LS_MULTIDAY, JSON.stringify(map)) } catch { /* intentional */ }
}

function _yesterdayStr() {
  const n = new Date()
  const y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1)
  return y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate()
}

/** Begin tracking a multi-day quest. Moves it from the daily slot into persistent storage. */
export function beginMultiDayQuest(quest) {
  if (!quest.multiDay) return { ok: false, error: 'Not a multi-day quest' }
  const map = getActiveMultiDayQuests()
  if (map[quest.id]) return { ok: false, error: 'Already tracking' }

  const today = todayStr()
  map[quest.id] = {
    ...quest,
    multiDay: { ...quest.multiDay, startDate: today, checkins: [today], streak: 1, maxStreak: 1 },
    completed: false,
  }
  _saveMultiDay(map)

  // Mark the daily slot quest as started so it no longer shows a BEGIN button
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || 'null')
    if (raw) {
      const q = raw.quests.find(x => x.id === quest.id)
      if (q) {
        if (!q.multiDay) q.multiDay = { totalDays: quest.multiDay?.totalDays || 0 }
        q.multiDay.started = true
        localStorage.setItem(LS_GEN_QUESTS, JSON.stringify(raw))
      }
    }
  } catch (e) { console.error('[beginMultiDay] Error:', e) }

  // Request notification permission if multi-day reminders are enabled (best-effort)
  try {
    if (getNotifPrefs().multiDayReminder && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch { /* intentional */ }

  dispatch('scl:gen_quests_updated', {})
  return { ok: true }
}

/** Record today's check-in. Returns progress info. */
export function checkinMultiDayQuest(questId) {
  const map = getActiveMultiDayQuests()
  const quest = map[questId]
  if (!quest)          return { ok: false, error: 'Quest not found' }
  if (quest.completed) return { ok: false, error: 'Already completed' }

  const today     = todayStr()
  const checkins  = quest.multiDay.checkins || []
  if (checkins.includes(today)) return { ok: false, error: 'Already checked in today' }

  const isConsecutive = checkins.includes(_yesterdayStr())
  const newStreak     = isConsecutive ? quest.multiDay.streak + 1 : 1
  const newMax        = Math.max(quest.multiDay.maxStreak, newStreak)
  const missedDay     = !isConsecutive && checkins.length > 0

  quest.multiDay.checkins  = [...checkins, today]
  quest.multiDay.streak    = newStreak
  quest.multiDay.maxStreak = newMax

  const daysLeft  = quest.multiDay.totalDays - quest.multiDay.checkins.length
  const isComplete = daysLeft <= 0

  earnCharXP(10) // small daily check-in reward

  _saveMultiDay(map)
  dispatch('scl:gen_quests_updated', {})
  return { ok: true, daysLeft, streak: newStreak, isComplete, missedDay }
}

/** Complete a multi-day quest with journal reflection. Awards streak-scaled XP. */
export function completeMultiDayQuest(questId, journalText) {
  const trimmed = (journalText || '').trim()
  if (trimmed.length < 30) {
    return { ok: false, error: `Write at least 30 characters (${trimmed.length}/30)` }
  }

  const map   = getActiveMultiDayQuests()
  const quest = map[questId]
  if (!quest)          return { ok: false, error: 'Quest not found' }
  if (quest.completed) return { ok: false, error: 'Already completed' }

  const { totalDays, maxStreak } = quest.multiDay
  const mult    = 1 + (maxStreak / totalDays)
  const finalXP = Math.round(quest.rewardXP * mult)

  quest.completed   = true
  quest.completedAt = Date.now()
  _saveMultiDay(map)

  earnCharXP(finalXP)

  // ── Streak-scaled stat XP: base by difficulty + 1 per 7 clean days + 1 multi-day bonus ──
  const baseStatXP  = _statXPForDifficulty(quest.difficulty)
  const streakBonus = Math.floor(maxStreak / 7)
  const finalStatXP = baseStatXP + streakBonus + 1

  applyQuestSkillReward({
    skillMeta: quest.skillMeta || resolveSkillMeta({ root: quest.number, tier: 3, questKind: 'multi' }),
    difficulty: quest.difficulty,
    statXPAmount: finalStatXP,
  }, earnStatXP, dispatch)

  if (quest.lqpMeta) {
    QuestEngine_markLQPObjective(quest.lqpMeta.questKey, quest.lqpMeta.tier, quest.lqpMeta.objIdx, { skipSkillReward: true })
  }

  if (quest.category !== 'objective') {
    const history = loadQuestHistory()
    history.lastActions    = [...history.lastActions, quest.category].slice(-20)
    history.completedTypes = [...new Set([...history.completedTypes, quest.category])]
    _updateCategoryAffinity(history, quest.number, quest.category)
    saveHistory(history)
  }

  saveGenReflection(questId + '_complete', trimmed, quest)
  dispatch('scl:xp_toast', { msg: `⚡ ${mult.toFixed(1)}× STREAK · +${finalXP} XP`, color: 'var(--gold)' })
  dispatch('scl:gen_quests_updated', {})

  updateDailySummary({
    xpEarned: finalXP,
    questsCompleted: 1,
  })
  try { recordDailySnapshot() } catch {}

  return { ok: true, xpAwarded: finalXP, multiplier: mult }
}

// ── Reminder banner helper ────────────────────────────────────────────────────
/** Returns any active multi-day quests that haven't been checked in today. */
export function getUncheckedMultiDayQuests() {
  const map   = getActiveMultiDayQuests()
  const today = todayStr()
  return Object.values(map).filter(q => !q.completed && !q.multiDay.checkins.includes(today))
}

// ── Cycle metadata helper ─────────────────────────────────────────────────────
export function getCycleInfo(cycleNumber) {
  const mod = CYCLE_MODIFIERS[cycleNumber]
  return mod ? { label: mod.label, rule: mod.rule } : null
}

// ── Re-roll system ────────────────────────────────────────────────────────────

/** Returns how many re-rolls have been used today */
export function getRerollCount() {
  try {
    const date = localStorage.getItem(LS_REROLL_DATE)
    if (date !== todayStr()) return 0
    return parseInt(localStorage.getItem(LS_REROLL_COUNT) || '0', 10)
  } catch { return 0 }
}

/** Returns remaining re-rolls available today */
export function getRerollsRemaining() {
  return Math.max(0, MAX_REROLLS_PER_DAY - getRerollCount())
}

/** Check if any generated quests are already completed */
export function hasCompletedQuests() {
  const gen = getGeneratedQuests()
  if (!gen || !gen.quests) return false
  return gen.quests.some(q => q.completed)
}

/**
 * Re-roll uncompleted quests with new ones.
 * Completed quests are preserved and cannot be re-rolled.
 */
export function rerollGeneratedQuests(user) {
  const gen = getGeneratedQuests()
  if (!gen || !gen.quests) return { ok: false, error: 'No quests to re-roll' }

  if (hasCompletedQuests()) {
    return { ok: false, error: 'Cannot re-roll after completing quests' }
  }

  const remaining = getRerollsRemaining()
  if (remaining <= 0) {
    return { ok: false, error: `Re-roll limit reached (${MAX_REROLLS_PER_DAY}/day)` }
  }

  try {
    localStorage.setItem(LS_REROLL_DATE, todayStr())
    localStorage.setItem(LS_REROLL_COUNT, String(getRerollCount() + 1))
  } catch {}

  const completed = gen.quests.filter(q => q.completed)
  const newQuests = generateDailyQuests(user)
  if (!newQuests) return { ok: false, error: 'Failed to generate new quests' }

  const finalQuests = [...completed, ...newQuests]

  const raw = JSON.parse(localStorage.getItem(LS_GEN_QUESTS) || '{}')
  raw.quests = finalQuests
  raw.rerolled = true
  try { localStorage.setItem(LS_GEN_QUESTS, JSON.stringify(raw)) } catch {}

  dispatch('scl:gen_quests_updated', { quests: finalQuests })

  return { ok: true, quests: finalQuests, remaining: getRerollsRemaining() }
}

/** Get difficulty metadata for UI display */
export function getDifficultyMeta(difficulty) {
  return DIFF_META[difficulty] || DIFF_META.medium
}

/** Calculate actual XP for a quest given its difficulty and base XP */
export function calcQuestXP(baseXP, difficulty) {
  const mult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0
  return Math.round(baseXP * mult)
}

/** Build user profile for generateDailyQuests from playerData. */
export function buildQuestUserProfile(playerData, statXP = {}) {
  if (!playerData) return null
  const { lp, ex, cl, so, ou, ac, th, m, d } = playerData
  const coreRoots = [lp.root, ex.root, cl.root, so.root, ou.root, ac.root, th.root]
    .map(r => reduceToSimple(r))
    .filter(r => r >= 1 && r <= 9)
  const counts = {}
  for (let i = 1; i <= 9; i++) counts[i] = 0
  coreRoots.forEach(n => counts[n]++)
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => counts[b] - counts[a])
  const pd = calcPersonalDay(m, d)
  const pm = calcPersonalMonth(m, d)
  const py = calcPersonalYear(m, d)

  let freqLevel = 1
  try {
    const xpState = JSON.parse(localStorage.getItem('scl_xp') || '{}')
    freqLevel = xpState.freqLevel || 1
  } catch {}

  return {
    dominantNumbers: sorted.filter(n => counts[n] >= 2).length
      ? sorted.filter(n => counts[n] >= 2) : sorted.slice(0, 2),
    weakerNumbers: sorted.filter(n => counts[n] === 0).length
      ? sorted.filter(n => counts[n] === 0) : sorted.slice(-2),
    outerNumber: reduceToSimple(ou.root),
    statXP,
    statValues: statXP,
    dayRoot: reduceToSimple(pd.root),
    cycleNumber: reduceToSimple(py.root),
    cycleRoots: {
      personalDay: pd.root,
      personalMonth: pm.root,
      personalYear: py.root,
    },
    bpRoots: coreRoots.filter((v, i, a) => a.indexOf(v) === i),
    lifeNodes: [
      { key: 'lp', root: lp.root },
      { key: 'ex', root: ex.root },
      { key: 'cl', root: cl.root },
      { key: 'so', root: so.root },
      { key: 'ou', root: ou.root },
      { key: 'ac', root: ac.root },
      { key: 'th', root: th.root },
    ],
    freqLevel,
    blueprintKey: resolveBlueprintNode(playerData, pd, pm, freqLevel),
  }
}

/** Generate today's quests if not already present. */
export function ensureDailyQuests(playerData) {
  if (!playerData) return null
  const existing = getGeneratedQuests()
  if (existing?.quests?.length) return existing.quests
  const user = buildQuestUserProfile(playerData)
  return generateDailyQuests(user)
}
