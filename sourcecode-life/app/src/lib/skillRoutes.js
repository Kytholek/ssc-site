/**
 * Skill tree specialization routes - Number -> Route -> Tier -> Quest
 * Progress v3 shape:
 *   { "3": { activeRoutes: ["art"], routes: { art: [t1,t2,t3], voice: [...], ... } } }
 */

import { SKILL_OBJECTIVES, getSkillTreeTierObjectives } from './objectives'

export const SKILLTREE_LS_KEY_V2 = 'scl_skilltree_progress_v2'
export const SKILLTREE_LS_KEY = 'scl_skilltree_progress_v3'

export const TIER_LABELS = {
  1: { key: 'initiate', label: 'Discovery' },
  2: { key: 'consistency', label: 'Development' },
  3: { key: 'mastery', label: 'Mastery' },
}

export const THRESHOLDS = { stage2: 5, stage3: 10 }

const TIER_KEYS = ['initiate', 'consistency', 'mastery']

function questsFromObjectives(numId, difficulty) {
  const tier = TIER_KEYS[difficulty - 1]
  if (tier) {
    const objs = getSkillTreeTierObjectives(Number(numId), tier)
    if (objs.length) return objs.map((o) => o.text)
  }
  const obj = SKILL_OBJECTIVES[Number(numId)]?.find((o) => o.difficulty === difficulty)
  return obj ? [obj.text] : ['(No objective defined)']
}

function stagesFromLegacy(numId, names) {
  return names.map((name, i) => ({
    stage: i + 1,
    name,
    quests: questsFromObjectives(numId, i + 1),
  }))
}

function stubRoute(id, name, thesis, numId, stageNames, { placeholder = false, classNoun = null } = {}) {
  const stages = stagesFromLegacy(numId, stageNames).map((s) => ({
    ...s,
    quests: placeholder
      ? [`${name} path - full quests coming. For now: ${s.quests[0] || 'Train this frequency through daily quests.'}`]
      : s.quests,
  }))
  return {
    id,
    name,
    classNoun: classNoun || name.split(/\s+/)[0],
    thesis,
    stages,
    placeholder: !!placeholder,
  }
}

/** Seal chrome + routes for each number 1-9 */
export const SKILL_TREE = {
  1: {
    id: '1', label: 'POWER', subtitle: 'Action / Initiative', icon: '\u25B2', color: '#FF4D00', glow: '#FF4D0066',
    routes: [
      stubRoute('leadership', 'Leadership', 'Presence -> Direction -> Leadership', '1',
        ['Presence', 'Direction', 'Leadership'], { classNoun: 'Leader' }),
      {
        id: 'entrepreneurship',
        name: 'Entrepreneurship',
        classNoun: 'Founder',
        thesis: 'Opportunity -> Execution -> Enterprise',
        stages: [
          {
            stage: 1, name: 'Opportunity',
            quests: [
              'Write down one problem you personally want solved this month.',
              'Talk to three people about that problem and note what they share.',
              'Sketch a one-page offer or product idea you could test in a week.',
            ],
          },
          {
            stage: 2, name: 'Execution',
            quests: [
              'Ship a minimum version to one real person and collect feedback.',
              'Price something and ask for payment or a clear yes/no.',
              'Run the same offer three times and refine based on results.',
            ],
          },
          {
            stage: 3, name: 'Enterprise',
            quests: [
              'Document a repeatable process so someone else could run it.',
              'Set a weekly revenue or impact target and track it for four weeks.',
              'Hand off or automate one part of the work you no longer need to do alone.',
            ],
          },
        ],
      },
      {
        id: 'physical',
        name: 'Physical Agency',
        classNoun: 'Athlete',
        thesis: 'Movement -> Strength -> Physical Mastery',
        stages: [
          {
            stage: 1, name: 'Movement',
            quests: [
              'Move your body for 20 minutes today with no phone.',
              'Take a walk outside and note how your energy shifts afterward.',
              'Stretch or mobilize for 10 minutes before bed three nights this week.',
            ],
          },
          {
            stage: 2, name: 'Strength',
            quests: [
              'Complete three strength sessions this week and log each one.',
              'Add progressive overload to one lift or movement for two weeks.',
              'Hit a personal best on a simple metric (reps, distance, or hold time).',
            ],
          },
          {
            stage: 3, name: 'Physical Mastery',
            quests: [
              'Follow a written training plan for four consecutive weeks.',
              'Recover deliberately: sleep, food, and rest days for one full cycle.',
              'Complete a physical challenge that once felt out of reach.',
            ],
          },
        ],
      },
    ],
  },
  2: {
    id: '2', label: 'SENSITIVITY', subtitle: 'Relationships / Connection', icon: '\u25CE', color: '#00C9FF', glow: '#00C9FF66',
    routes: [
      stubRoute('relationships', 'Relationships', 'Connection -> Intimacy -> Partnership', '2',
        ['Connection', 'Intimacy', 'Partnership'], { classNoun: 'Partner' }),
      {
        id: 'empathy',
        name: 'Empathy',
        classNoun: 'Empath',
        thesis: 'Awareness -> Understanding -> Compassion',
        stages: [
          {
            stage: 1, name: 'Awareness',
            quests: [
              'In one conversation, name the other person’s emotion out loud once.',
              'Sit with someone’s story without offering advice for five minutes.',
              'Journal how your body reacts when someone near you is upset.',
            ],
          },
          {
            stage: 2, name: 'Understanding',
            quests: [
              'Ask three clarifying questions before giving your opinion.',
              'Reflect back what you heard until the other person says “yes, that’s it.”',
              'Read or watch one piece that challenges your usual view of a conflict.',
            ],
          },
          {
            stage: 3, name: 'Compassion',
            quests: [
              'Offer concrete help once without being asked — then follow through.',
              'Repair a strained connection with an honest, kind check-in.',
              'Practice compassion toward yourself the same day you extend it to someone else.',
            ],
          },
        ],
      },
      {
        id: 'social',
        name: 'Social Intelligence',
        classNoun: 'Connector',
        thesis: 'Reading People -> Navigating Groups -> Social Mastery',
        stages: [
          {
            stage: 1, name: 'Reading People',
            quests: [
              'In a group, note who speaks most and who is left out — adjust once.',
              'Guess someone’s mood from tone and posture, then gently verify.',
              'Introduce two people who should know each other and stay for the open.',
            ],
          },
          {
            stage: 2, name: 'Navigating Groups',
            quests: [
              'Host or help run a small gathering of three or more people.',
              'Defuse one awkward moment with a light redirect or inclusive question.',
              'Leave a group conversation having made one person feel more included.',
            ],
          },
          {
            stage: 3, name: 'Social Mastery',
            quests: [
              'Facilitate a meeting or circle so every voice gets heard once.',
              'Build a recurring social ritual (weekly call, dinner, or hang) for a month.',
              'Mentor someone through a social situation they find hard.',
            ],
          },
        ],
      },
    ],
  },
  3: {
    id: '3', label: 'EXPRESSION', subtitle: 'Communication / Creativity', icon: '\u2726', color: '#FFB800', glow: '#FFB80066',
    routes: [
      {
        id: 'voice',
        name: 'Voice',
        classNoun: 'Orator',
        thesis: 'Speak -> Present -> Influence',
        stages: [
          { stage: 1, name: 'Find Your Voice', quests: ['Speak your opinion once without rehearsing.'] },
          { stage: 2, name: 'Command Attention', quests: ['Give a 3-5 minute talk to at least one other person.'] },
          { stage: 3, name: 'Move Others', quests: ['Deliver a presentation to an audience.'] },
        ],
      },
      {
        id: 'creation',
        name: 'Creation',
        classNoun: 'Maker',
        thesis: 'Create -> Develop Style -> Create Meaning',
        stages: [
          { stage: 1, name: 'Create Freely', quests: ['Make something without judging it.'] },
          { stage: 2, name: 'Develop Style', quests: ['Produce 10 pieces using a consistent aesthetic.'] },
          { stage: 3, name: 'Create Meaning', quests: ['Produce a finished body of work you are willing to share.'] },
        ],
      },
      {
        id: 'writing',
        name: 'Writing',
        classNoun: 'Scribe',
        thesis: 'Write -> Storytelling -> Publishing',
        stages: [
          { stage: 1, name: 'Write Honestly', quests: ['Write 500 words without editing.'] },
          { stage: 2, name: 'Develop Voice', quests: ['Publish 10 pieces (blog, journal, or social - your call).'] },
          { stage: 3, name: 'Move Through Words', quests: ['Complete an essay, story, or short book draft.'] },
        ],
      },
    ],
  },
  4: {
    id: '4', label: 'STRUCTURE', subtitle: 'Discipline / Systems', icon: '\u25A3', color: '#00FF94', glow: '#00FF9466',
    routes: [
      stubRoute('discipline', 'Discipline', 'Routine -> Consistency -> Self-Mastery', '4',
        ['Routine', 'Consistency', 'Self-Mastery'], { classNoun: 'Disciple' }),
      {
        id: 'organization',
        name: 'Organization',
        classNoun: 'Architect',
        thesis: 'Order -> Planning -> Optimization',
        stages: [
          {
            stage: 1, name: 'Order',
            quests: [
              'Clear one physical or digital space completely today.',
              'Write a single inbox-zero pass for email or messages.',
              'Label or group three messy piles so you can find them tomorrow.',
            ],
          },
          {
            stage: 2, name: 'Planning',
            quests: [
              'Plan tomorrow night before — three priorities only.',
              'Break one large project into dated milestones on a calendar.',
              'Do a weekly review: what worked, what slips, what to cut.',
            ],
          },
          {
            stage: 3, name: 'Optimization',
            quests: [
              'Remove one recurring friction from your week for good.',
              'Template a process you do often so it takes half the time.',
              'Keep a clean system for 30 days without a full reset.',
            ],
          },
        ],
      },
      {
        id: 'systems',
        name: 'Systems',
        classNoun: 'Engineer',
        thesis: 'Process -> Automation -> Architecture',
        stages: [
          {
            stage: 1, name: 'Process',
            quests: [
              'Write the steps of one recurring task as a checklist.',
              'Time one process end-to-end and note every handoff.',
              'Standardize how you start and end your workday.',
            ],
          },
          {
            stage: 2, name: 'Automation',
            quests: [
              'Automate or batch one repetitive chore this week.',
              'Build a simple tool, template, or script that saves ten minutes.',
              'Hand a process to someone else using only your written steps.',
            ],
          },
          {
            stage: 3, name: 'Architecture',
            quests: [
              'Map how three systems connect (work, home, money, or health).',
              'Redesign one bottleneck so it cannot silently fail.',
              'Maintain a living “how we operate” doc for a month.',
            ],
          },
        ],
      },
    ],
  },
  5: {
    id: '5', label: 'ADAPTABILITY', subtitle: 'Change / Exploration', icon: '\u25C8', color: '#FF61D8', glow: '#FF61D866',
    routes: [
      stubRoute('exploration', 'Exploration', 'Curiosity -> Experimentation -> Discovery', '5',
        ['Curiosity', 'Experimentation', 'Discovery'], { classNoun: 'Explorer' }),
      {
        id: 'adventure',
        name: 'Adventure',
        classNoun: 'Adventurer',
        thesis: 'Departure -> Challenge -> Expedition',
        stages: [
          {
            stage: 1, name: 'Departure',
            quests: [
              'Go somewhere you have never been within an hour of home.',
              'Say yes to one invitation you would normally decline.',
              'Pack light and take a half-day solo outing with no agenda.',
            ],
          },
          {
            stage: 2, name: 'Challenge',
            quests: [
              'Do one activity that scares you a little and finish it.',
              'Travel or explore overnight without over-planning every hour.',
              'Learn a physical skill outdoors (hike, climb, swim, bike) three times.',
            ],
          },
          {
            stage: 3, name: 'Expedition',
            quests: [
              'Plan and complete a multi-day trip or expedition of your own design.',
              'Document the journey so someone else could follow your path.',
              'Bring another person on an adventure you lead from start to finish.',
            ],
          },
        ],
      },
      {
        id: 'innovation',
        name: 'Innovation',
        classNoun: 'Innovator',
        thesis: 'Question -> Experiment -> Reinvent',
        stages: [
          {
            stage: 1, name: 'Question',
            quests: [
              'Write five “why do we still do it this way?” questions about your life or work.',
              'Interview someone who solved a problem you have not.',
              'Challenge one assumption you have held for years — in writing.',
            ],
          },
          {
            stage: 2, name: 'Experiment',
            quests: [
              'Run a one-week experiment with a clear success metric.',
              'Prototype a better way to do a daily task and try it for three days.',
              'Kill an idea quickly after a fair test — and note what you learned.',
            ],
          },
          {
            stage: 3, name: 'Reinvent',
            quests: [
              'Replace an old habit or system with your improved version for 30 days.',
              'Share the innovation with others and invite them to improve it.',
              'Ship a public change (post, product, process) that did not exist last month.',
            ],
          },
        ],
      },
    ],
  },
  6: {
    id: '6', label: 'RESPONSIBILITY', subtitle: 'Care / Reliability', icon: '\u2B21', color: '#7B61FF', glow: '#7B61FF66',
    routes: [
      stubRoute('care', 'Care', 'Support -> Nurture -> Stewardship', '6',
        ['Support', 'Nurture', 'Stewardship'], { classNoun: 'Caregiver' }),
      {
        id: 'family',
        name: 'Family',
        classNoun: 'Kinkeeper',
        thesis: 'Presence -> Commitment -> Foundation',
        stages: [
          {
            stage: 1, name: 'Presence',
            quests: [
              'Spend one uninterrupted hour with family or chosen family today.',
              'Call or visit someone you have been meaning to reconnect with.',
              'Put phones away for a shared meal and stay through the conversation.',
            ],
          },
          {
            stage: 2, name: 'Commitment',
            quests: [
              'Keep one family promise on time without reminders.',
              'Take on a recurring household or care responsibility for two weeks.',
              'Plan a shared event and own every logistic until it happens.',
            ],
          },
          {
            stage: 3, name: 'Foundation',
            quests: [
              'Create or update a family ritual that can outlast this month.',
              'Document something important (history, values, or logistics) for the group.',
              'Be the steady person someone leans on through a hard week.',
            ],
          },
        ],
      },
      {
        id: 'service',
        name: 'Service',
        classNoun: 'Server',
        thesis: 'Help -> Serve -> Lead Through Service',
        stages: [
          {
            stage: 1, name: 'Help',
            quests: [
              'Do one useful favor today without announcing it.',
              'Ask “what would help most?” and do that exact thing.',
              'Volunteer an hour to a cause or neighbor who needs hands.',
            ],
          },
          {
            stage: 2, name: 'Serve',
            quests: [
              'Commit to a recurring service slot for four weeks.',
              'Meet a need before it becomes a crisis for someone in your circle.',
              'Teach someone a skill that reduces their dependence on you later.',
            ],
          },
          {
            stage: 3, name: 'Lead Through Service',
            quests: [
              'Organize a service effort others can join — then step back from the spotlight.',
              'Build a system so help continues when you are not there.',
              'Mentor a new volunteer or helper through their first full cycle.',
            ],
          },
        ],
      },
    ],
  },
  7: {
    id: '7', label: 'AWARENESS', subtitle: 'Reflection / Insight', icon: '\u25C9', color: '#00E5FF', glow: '#00E5FF66',
    routes: [
      stubRoute('contemplation', 'Contemplation', 'Stillness -> Observation -> Insight', '7',
        ['Stillness', 'Observation', 'Insight'], { classNoun: 'Seer' }),
      {
        id: 'research',
        name: 'Research',
        classNoun: 'Scholar',
        thesis: 'Question -> Investigate -> Understand',
        stages: [
          {
            stage: 1, name: 'Question',
            quests: [
              'Write one precise research question you actually want answered.',
              'List three sources you trust and one you will challenge.',
              'Spend 30 minutes reading primary material, not summaries.',
            ],
          },
          {
            stage: 2, name: 'Investigate',
            quests: [
              'Collect notes from five sources into one organized brief.',
              'Talk to one person with lived experience on the topic.',
              'Test a claim with evidence instead of guessing.',
            ],
          },
          {
            stage: 3, name: 'Understand',
            quests: [
              'Write a one-page synthesis with your own conclusion.',
              'Explain the topic clearly to someone who knows less than you.',
              'Update a decision in your life based on what you learned.',
            ],
          },
        ],
      },
      {
        id: 'consciousness',
        name: 'Consciousness',
        classNoun: 'Mystic',
        thesis: 'Self-Observation -> Pattern Recognition -> Integration',
        stages: [
          {
            stage: 1, name: 'Self-Observation',
            quests: [
              'Pause three times today and name what you feel without fixing it.',
              'Journal one trigger and what happened in your body.',
              'Sit in silence for ten minutes with no media.',
            ],
          },
          {
            stage: 2, name: 'Pattern Recognition',
            quests: [
              'Track a recurring mood or habit for seven days.',
              'Name the story you tell yourself when stressed — write it down.',
              'Notice one projection: where you see your fear in someone else.',
            ],
          },
          {
            stage: 3, name: 'Integration',
            quests: [
              'Choose a new response to an old trigger and practice it three times.',
              'Share an insight with a trusted person and ask for reflection.',
              'Live one week aligned with a value you named in your notes.',
            ],
          },
        ],
      },
    ],
  },
  8: {
    id: '8', label: 'MASTERY', subtitle: 'Results / Performance', icon: '\u25C6', color: '#FF9500', glow: '#FF950066',
    routes: [
      stubRoute('achievement', 'Achievement', 'Goal -> Performance -> Excellence', '8',
        ['Goal', 'Performance', 'Excellence'], { classNoun: 'Achiever' }),
      {
        id: 'wealth',
        name: 'Wealth',
        classNoun: 'Magnate',
        thesis: 'Value -> Resource -> Wealth Creation',
        stages: [
          {
            stage: 1, name: 'Value',
            quests: [
              'Write what value you create for others in one clear sentence.',
              'Track every dollar in and out for seven days.',
              'Identify one underpriced skill you already have.',
            ],
          },
          {
            stage: 2, name: 'Resource',
            quests: [
              'Build or update a simple budget and stick to it for two weeks.',
              'Negotiate or ask for one better rate, raise, or deal.',
              'Create a small surplus and park it intentionally.',
            ],
          },
          {
            stage: 3, name: 'Wealth Creation',
            quests: [
              'Launch or grow one income stream with a weekly review habit.',
              'Invest time or money where compound returns are real.',
              'Teach someone else one money habit that changed your results.',
            ],
          },
        ],
      },
      {
        id: 'command',
        name: 'Leadership',
        classNoun: 'Commander',
        thesis: 'Authority -> Responsibility -> Command',
        stages: [
          {
            stage: 1, name: 'Authority',
            quests: [
              'Make one clear decision for a group and own the outcome.',
              'Set a standard out loud and keep it yourself first.',
              'Give feedback that is direct, kind, and specific once today.',
            ],
          },
          {
            stage: 2, name: 'Responsibility',
            quests: [
              'Own a miss publicly and present the fix.',
              'Delegate a task with a deadline and check in once — then trust.',
              'Protect someone’s focus by removing a blocker this week.',
            ],
          },
          {
            stage: 3, name: 'Command',
            quests: [
              'Lead a project from brief to delivery with a visible scoreboard.',
              'Develop one person under you until they can run a piece alone.',
              'Hold a hard line when it matters, then repair the relationship.',
            ],
          },
        ],
      },
    ],
  },
  9: {
    id: '9', label: 'IMPACT', subtitle: 'Completion / Contribution', icon: '\u273A', color: '#FF2D55', glow: '#FF2D5566',
    routes: [
      stubRoute('contribution', 'Contribution', 'Give -> Serve -> Legacy', '9',
        ['Give', 'Serve', 'Legacy'], { classNoun: 'Giver' }),
      {
        id: 'teaching',
        name: 'Teaching',
        classNoun: 'Mentor',
        thesis: 'Learn -> Teach -> Mentor',
        stages: [
          {
            stage: 1, name: 'Learn',
            quests: [
              'Master one concept well enough to explain it without notes.',
              'Take notes as if you will teach them tomorrow.',
              'Ask a beginner what confuses them most about your topic.',
            ],
          },
          {
            stage: 2, name: 'Teach',
            quests: [
              'Teach one person a skill in a 20-minute session.',
              'Write or record a short lesson someone else can follow alone.',
              'Run the same lesson twice and improve it from feedback.',
            ],
          },
          {
            stage: 3, name: 'Mentor',
            quests: [
              'Mentor someone across multiple sessions until they hit a goal.',
              'Build a simple curriculum or checklist for future learners.',
              'Hand the teaching role to your mentee for one session.',
            ],
          },
        ],
      },
      {
        id: 'creation',
        name: 'Creation',
        classNoun: 'Artisan',
        thesis: 'Build -> Share -> Leave Something Behind',
        stages: [
          {
            stage: 1, name: 'Build',
            quests: [
              'Start a durable project that will still matter in a year.',
              'Ship a first rough version this week — imperfect is fine.',
              'Spend focused hours building without announcing it first.',
            ],
          },
          {
            stage: 2, name: 'Share',
            quests: [
              'Show the work to three people and take notes on their reactions.',
              'Publish or gift a finished piece into the world.',
              'Invite collaboration on the next version.',
            ],
          },
          {
            stage: 3, name: 'Leave Something Behind',
            quests: [
              'Finish a body of work you are willing to put your name on.',
              'Document how it was made so others can continue it.',
              'Pass ownership or stewardship to someone who will keep it alive.',
            ],
          },
        ],
      },
    ],
  },
}

/** Array form for seal grid (stable order 1-9) */
export const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => SKILL_TREE[n])

export function getNumberDef(numId) {
  return SKILL_TREE[String(numId)] || SKILL_TREE[Number(numId)] || null
}

export function getRouteDef(numId, routeId) {
  return getNumberDef(numId)?.routes?.find((r) => r.id === routeId) || null
}

export function primaryRouteId(numId) {
  return getNumberDef(numId)?.routes?.[0]?.id || 'core'
}

export function emptyRouteProgress(numId) {
  const def = getNumberDef(numId)
  const routes = {}
  ;(def?.routes || []).forEach((r) => { routes[r.id] = [false, false, false] })
  return { activeRoutes: [], routes }
}

export function isV3Entry(entry) {
  return entry && typeof entry === 'object' && !Array.isArray(entry) && entry.routes && typeof entry.routes === 'object'
}

export function isV2Progress(prog) {
  if (!prog || typeof prog !== 'object') return false
  return Object.keys(prog).some((k) => Array.isArray(prog[k]))
}

/** Migrate flat [t1,t2,t3] or mixed map -> v3 */
export function migrateProgressToV3(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (let i = 1; i <= 9; i++) {
    const key = String(i)
    const entry = src[key] ?? src[i]
    if (isV3Entry(entry)) {
      const base = emptyRouteProgress(key)
      out[key] = {
        activeRoutes: Array.isArray(entry.activeRoutes) ? [...entry.activeRoutes] : [],
        routes: { ...base.routes, ...(entry.routes || {}) },
      }
      Object.keys(base.routes).forEach((rid) => {
        if (!Array.isArray(out[key].routes[rid])) out[key].routes[rid] = [false, false, false]
        while (out[key].routes[rid].length < 3) out[key].routes[rid].push(false)
      })
      continue
    }
    const arr = Array.isArray(entry) ? [...entry] : [false, false, false]
    while (arr.length < 3) arr.push(false)
    const rid = primaryRouteId(key)
    const node = emptyRouteProgress(key)
    node.routes[rid] = arr.slice(0, 3)
    if (arr.some(Boolean)) node.activeRoutes = [rid]
    out[key] = node
  }
  return out
}

export function loadSkillTreeProgressV3() {
  try {
    const v3 = localStorage.getItem(SKILLTREE_LS_KEY)
    if (v3) return migrateProgressToV3(JSON.parse(v3))
    const v2 = localStorage.getItem(SKILLTREE_LS_KEY_V2)
    if (v2) {
      const migrated = migrateProgressToV3(JSON.parse(v2))
      saveSkillTreeProgressV3(migrated)
      return migrated
    }
  } catch { /* ignore */ }
  return migrateProgressToV3({})
}

export function saveSkillTreeProgressV3(progress) {
  try {
    localStorage.setItem(SKILLTREE_LS_KEY, JSON.stringify(progress))
  } catch { /* ignore */ }
}

/** True when progress has no filled pips and no active routes. */
export function isSkillProgressEmpty(progress) {
  const p = progress || {}
  const keys = Object.keys(p)
  if (!keys.length) return true
  return keys.every((k) => {
    const node = p[k]
    if (!node || typeof node !== 'object') return true
    const active = Array.isArray(node.activeRoutes) ? node.activeRoutes : []
    if (active.length) return false
    const routes = node.routes || {}
    return !Object.values(routes).some((arr) => Array.isArray(arr) && arr.some(Boolean))
  })
}

/** Union of two v3 progress trees — never lose filled pips. */
export function mergeSkillProgressV3(local, remote) {
  const a = migrateProgressToV3(local || {})
  const b = migrateProgressToV3(remote || {})
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const out = {}
  for (const key of keys) {
    const la = a[key] || emptyRouteProgress(key)
    const rb = b[key] || emptyRouteProgress(key)
    const routeIds = new Set([
      ...Object.keys(la.routes || {}),
      ...Object.keys(rb.routes || {}),
      ...(Array.isArray(la.activeRoutes) ? la.activeRoutes : []),
      ...(Array.isArray(rb.activeRoutes) ? rb.activeRoutes : []),
    ])
    const routes = {}
    for (const rid of routeIds) {
      const ls = getRouteStages(la, key, rid)
      const rs = getRouteStages(rb, key, rid)
      routes[rid] = [0, 1, 2].map((i) => !!(ls[i] || rs[i]))
    }
    const activeRoutes = [
      ...new Set([
        ...(Array.isArray(la.activeRoutes) ? la.activeRoutes : []),
        ...(Array.isArray(rb.activeRoutes) ? rb.activeRoutes : []),
      ]),
    ]
    out[key] = { activeRoutes, routes }
  }
  return out
}

/** Primary = first active route, else first route on the number */
export function getPrimaryRouteId(numProgress, numId) {
  const active = numProgress?.activeRoutes
  if (Array.isArray(active) && active.length) return active[0]
  return primaryRouteId(numId)
}

export function getRouteStages(numProgress, numId, routeId) {
  const rid = routeId || getPrimaryRouteId(numProgress, numId)
  const arr = numProgress?.routes?.[rid]
  if (Array.isArray(arr)) {
    const copy = [...arr]
    while (copy.length < 3) copy.push(false)
    return copy.slice(0, 3)
  }
  return [false, false, false]
}

export function stagesDoneOnRoute(numProgress, numId, routeId) {
  return getRouteStages(numProgress, numId, routeId).filter(Boolean).length
}

/** Seal pips prefer equipped class route when provided, else primary active. */
export function getSealProgress(numProgress, numId, preferredRouteId = null) {
  const rid = preferredRouteId || getPrimaryRouteId(numProgress, numId)
  return getRouteStages(numProgress, numId, rid)
}

export function canStartRoute(numProgress, numId, routeId) {
  const active = numProgress?.activeRoutes || []
  if (active.includes(routeId)) return { ok: true, reason: 'active' }
  if (active.length === 0) return { ok: true, reason: 'first' }
  const hasT1 = active.some((rid) => getRouteStages(numProgress, numId, rid)[0] === true)
  if (!hasT1) {
    return { ok: false, reason: 'Complete Discovery (T1) on your current route before starting another.' }
  }
  return { ok: true, reason: 'unlocked' }
}

export function startRoute(progress, numId, routeId) {
  const key = String(numId)
  const next = { ...progress }
  const node = { ...(next[key] || emptyRouteProgress(key)) }
  const routes = { ...node.routes }
  if (!Array.isArray(routes[routeId])) routes[routeId] = [false, false, false]
  const active = Array.isArray(node.activeRoutes) ? [...node.activeRoutes] : []
  const gate = canStartRoute(node, key, routeId)
  if (!gate.ok) return { progress, error: gate.reason }
  if (!active.includes(routeId)) active.push(routeId)
  next[key] = { activeRoutes: active, routes }
  return { progress: next, error: null }
}

export function isRouteStageUnlocked(numId, routeId, stageIdx, numProgress, statValues = {}, seeds = {}) {
  if (stageIdx === 0) return true
  const stages = getRouteStages(numProgress, numId, routeId)
  if (!stages[stageIdx - 1]) return false
  const innate = seeds?.[numId] || seeds?.[String(numId)] || [false, false, false]
  if (innate[stageIdx]) return true
  const statVal = statValues?.[numId] || statValues?.[String(numId)] || 0
  const threshold = stageIdx === 1 ? THRESHOLDS.stage2 : THRESHOLDS.stage3
  return statVal >= threshold
}

/** Apply innate seeds onto primary route (and ensure route exists) */
export function mergeSeedsV3(progress, seeds) {
  const next = migrateProgressToV3(progress)
  for (const [key, seedStages] of Object.entries(seeds || {})) {
    const node = next[key] || emptyRouteProgress(key)
    const rid = getPrimaryRouteId(node, key)
    if (!node.activeRoutes.includes(rid) && seedStages?.some(Boolean)) {
      node.activeRoutes = [rid, ...node.activeRoutes.filter((r) => r !== rid)]
    }
    const cur = getRouteStages(node, key, rid)
    node.routes = {
      ...node.routes,
      [rid]: cur.map((v, i) => v || !!seedStages[i]),
    }
    next[key] = node
  }
  return next
}

/**
 * Fill a pip on a preferred route, else primary active route.
 * Refuses fills when the stage is locked (stat/seed gate).
 * @param {object} progress
 * @param {number|string} number
 * @param {number} stageIdx
 * @param {string|null} [preferredRouteId]
 * @param {object} [statValues]
 * @param {object} [seeds]
 */
export function fillSkillPipV3(progress, number, stageIdx, preferredRouteId = null, statValues = {}, seeds = {}) {
  const key = String(number)
  let next = migrateProgressToV3(progress)
  let node = next[key] || emptyRouteProgress(key)
  let rid = preferredRouteId && getRouteDef(key, preferredRouteId)
    ? preferredRouteId
    : getPrimaryRouteId(node, key)

  if (!isRouteStageUnlocked(key, rid, stageIdx, node, statValues, seeds)) {
    return { progress: next, filled: false }
  }

  if (!node.activeRoutes.includes(rid)) {
    const started = startRoute(next, key, rid)
    if (started.error) {
      // Fall back to primary if preferred can't start
      rid = getPrimaryRouteId(node, key)
      if (!node.activeRoutes.length) {
        const fallback = startRoute(next, key, rid)
        if (fallback.error) return { progress: next, filled: false }
        next = fallback.progress
        node = next[key]
        rid = getPrimaryRouteId(node, key)
      }
    } else {
      next = started.progress
      node = next[key]
    }
  }
  if (!isRouteStageUnlocked(key, rid, stageIdx, node, statValues, seeds)) {
    return { progress: next, filled: false }
  }
  const arr = getRouteStages(node, key, rid)
  if (stageIdx > 0 && !arr[stageIdx - 1]) return { progress: next, filled: false }
  if (arr[stageIdx]) return { progress: next, filled: false }
  arr[stageIdx] = true
  next[key] = {
    ...node,
    routes: { ...node.routes, [rid]: arr },
  }
  return { progress: next, filled: true, routeId: rid }
}

export function countCompletedTiers(progress) {
  const p = migrateProgressToV3(progress)
  let n = 0
  for (let i = 1; i <= 9; i++) {
    const node = p[String(i)]
    Object.values(node?.routes || {}).forEach((arr) => {
      if (Array.isArray(arr)) n += arr.filter(Boolean).length
    })
  }
  return n
}

export function countTotalTiers() {
  return 9 * 3
}

/**
 * Progress against routes the player has actually started.
 * If nothing is active yet, denominator is primary-path capacity (9x3).
 */
export function getTrainingProgress(progress) {
  const p = migrateProgressToV3(progress)
  let done = 0
  let total = 0
  let anyActive = false
  for (let i = 1; i <= 9; i++) {
    const key = String(i)
    const node = p[key] || emptyRouteProgress(key)
    const active = Array.isArray(node.activeRoutes) ? node.activeRoutes : []
    if (!active.length) continue
    anyActive = true
    total += active.length * 3
    active.forEach((rid) => {
      done += getRouteStages(node, key, rid).filter(Boolean).length
    })
  }
  if (!anyActive) return { done: 0, total: 9 * 3 }
  return { done, total: Math.max(total, 1) }
}

/** First incomplete unlockable tier on a route, or null */
export function getNextTierAction(numId, routeId, numProgress, statValues = {}, seeds = {}) {
  if (!routeId) return null
  const active = (numProgress?.activeRoutes || []).includes(routeId)
  if (!active) return null
  for (let si = 0; si < 3; si++) {
    const stages = getRouteStages(numProgress, numId, routeId)
    if (stages[si]) continue
    if (isRouteStageUnlocked(numId, routeId, si, numProgress, statValues, seeds)) {
      return { routeId, stageIdx: si }
    }
    break
  }
  return null
}
