/**
 * First-join class test.
 * Questions are chosen from the seeker's chart. Each answer points at one
 * route on that seal. Life Path counts double, Calling counts one and a half.
 */

import { getNumberDef, getRouteDef } from './skillRoutes'

export const APTITUDE_LS_KEY = 'scl_class_aptitude_v1'

/** Mirrors classLoadout mapSealRoot. */
function mapSealRoot(root) {
  const n = Number(root)
  if (n === 11) return 2
  if (n === 22) return 4
  if (n === 33) return 6
  if (n === 44) return 8
  return (n >= 1 && n <= 9) ? n : null
}

const CHART = [
  { key: 'lp', role: 'Life Path', weight: 2 },
  { key: 'cl', role: 'Life Calling', weight: 1.5 },
  { key: 'ex', role: 'Expression', weight: 1 },
  { key: 'so', role: 'Soul', weight: 1 },
  { key: 'ou', role: 'Outer', weight: 1 },
  { key: 'ac', role: 'Achievement', weight: 1 },
  { key: 'th', role: 'Theme', weight: 1 },
]

const QUESTION_BANK = {
  1: [
    {
      prompt: 'A group is stuck. What do you do?',
      choices: [
        { routeId: 'leadership', label: 'Name the next step and own it' },
        { routeId: 'entrepreneurship', label: 'Sketch something small you could try this week' },
        { routeId: 'physical', label: 'Get people moving, even if it is only a walk' },
      ],
    },
    {
      prompt: 'A free Saturday morning is best used to…',
      choices: [
        { routeId: 'leadership', label: 'Show up early and set the tone' },
        { routeId: 'entrepreneurship', label: 'Talk to someone about a problem you want solved' },
        { routeId: 'physical', label: 'Train your body' },
      ],
    },
  ],
  2: [
    {
      prompt: 'Someone you care about goes quiet. You…',
      choices: [
        { routeId: 'relationships', label: 'Spend time with them and say one true thing' },
        { routeId: 'empathy', label: 'Name what they seem to feel, then wait' },
        { routeId: 'social', label: 'Read the room and bring the right person in' },
      ],
    },
    {
      prompt: 'You feel closest to people when you…',
      choices: [
        { routeId: 'relationships', label: 'Make a plan together and keep your half' },
        { routeId: 'empathy', label: 'Understand them before you advise' },
        { routeId: 'social', label: 'Introduce them to someone who fits' },
      ],
    },
  ],
  3: [
    {
      prompt: 'You have something to say. You…',
      choices: [
        { routeId: 'voice', label: 'Say it out loud to a real person' },
        { routeId: 'creation', label: 'Make something that carries it' },
        { routeId: 'writing', label: 'Write it until the sentence is true' },
      ],
    },
    {
      prompt: 'People remember you for…',
      choices: [
        { routeId: 'voice', label: 'How you hold a room' },
        { routeId: 'creation', label: 'What you made' },
        { routeId: 'writing', label: 'What you wrote' },
      ],
    },
  ],
  4: [
    {
      prompt: 'A messy week needs…',
      choices: [
        { routeId: 'discipline', label: 'The same practice, done anyway' },
        { routeId: 'organization', label: 'A page with steps, owners, and dates' },
        { routeId: 'systems', label: 'A process that runs without you chasing it' },
      ],
    },
    {
      prompt: 'You trust progress when…',
      choices: [
        { routeId: 'discipline', label: 'You showed up on the days you did not feel like it' },
        { routeId: 'organization', label: 'Everything has a place and a plan' },
        { routeId: 'systems', label: 'The work continues if you step away' },
      ],
    },
  ],
  5: [
    {
      prompt: 'The usual way stops working. You…',
      choices: [
        { routeId: 'exploration', label: 'Follow a question you normally skip' },
        { routeId: 'adventure', label: 'Go somewhere you have never been' },
        { routeId: 'innovation', label: 'Throw out the old method and test a new one' },
      ],
    },
    {
      prompt: 'A good month includes…',
      choices: [
        { routeId: 'exploration', label: 'One curiosity you actually followed' },
        { routeId: 'adventure', label: 'A trip or challenge you led' },
        { routeId: 'innovation', label: 'An old habit you replaced' },
      ],
    },
  ],
  6: [
    {
      prompt: 'Someone near you is struggling. You…',
      choices: [
        { routeId: 'care', label: 'Do a practical thing for them today' },
        { routeId: 'family', label: 'Show up for the people who are your home' },
        { routeId: 'service', label: 'Help without announcing it' },
      ],
    },
    {
      prompt: 'Responsibility feels right when you…',
      choices: [
        { routeId: 'care', label: 'Keep caring even when you are tired' },
        { routeId: 'family', label: 'Keep a promise to your people' },
        { routeId: 'service', label: 'Build help that continues without applause' },
      ],
    },
  ],
  7: [
    {
      prompt: 'You need an answer. You…',
      choices: [
        { routeId: 'contemplation', label: 'Sit quietly until the next step is clear' },
        { routeId: 'research', label: 'Go to a source and test the claim' },
        { routeId: 'consciousness', label: 'Watch your own pattern before you act' },
      ],
    },
    {
      prompt: 'Insight arrives when you…',
      choices: [
        { routeId: 'contemplation', label: 'Stop the input and notice' },
        { routeId: 'research', label: 'Explain what you learned in your own words' },
        { routeId: 'consciousness', label: 'Choose a new response to an old trigger' },
      ],
    },
  ],
  8: [
    {
      prompt: 'You measure a good week by…',
      choices: [
        { routeId: 'achievement', label: 'A goal you wrote down and hit' },
        { routeId: 'wealth', label: 'Money you tracked and a surplus you kept' },
        { routeId: 'command', label: 'A standard you held and a person you developed' },
      ],
    },
    {
      prompt: 'Pressure shows up. You…',
      choices: [
        { routeId: 'achievement', label: 'Raise the bar and keep the scoreboard' },
        { routeId: 'wealth', label: 'Ask for a better rate and protect the surplus' },
        { routeId: 'command', label: 'Make the call and own the outcome' },
      ],
    },
  ],
  9: [
    {
      prompt: 'The work that matters…',
      choices: [
        { routeId: 'contribution', label: 'Is given with nothing required back' },
        { routeId: 'teaching', label: 'Is something you can hand to a learner' },
        { routeId: 'creation', label: 'Will still exist in a year with your name on it' },
      ],
    },
    {
      prompt: 'You are done when…',
      choices: [
        { routeId: 'contribution', label: 'Others can continue the gift without you' },
        { routeId: 'teaching', label: 'Someone you taught can teach it' },
        { routeId: 'creation', label: 'The piece is finished and passed on' },
      ],
    },
  ],
}

export function loadAptitudeRecord() {
  try {
    const raw = JSON.parse(localStorage.getItem(APTITUDE_LS_KEY) || 'null')
    if (raw && (raw.status === 'done' || raw.status === 'skipped')) return raw
  } catch { /* ignore */ }
  return null
}

export function aptitudeSettled() {
  return !!loadAptitudeRecord()
}

export function saveAptitudeRecord(record) {
  try {
    localStorage.setItem(APTITUDE_LS_KEY, JSON.stringify({
      ...record,
      at: Date.now(),
    }))
  } catch { /* ignore */ }
}

function describePick(number, routeId) {
  const seal = getNumberDef(number)
  const route = getRouteDef(number, routeId)
  return {
    number: Number(number),
    routeId,
    sealLabel: seal?.label || String(number),
    routeName: route?.name || 'Path',
    classNoun: route?.classNoun || route?.name || 'Path',
  }
}

/** Questions for this chart. Duplicate seals are skipped. */
export function buildAptitudeQuestions(playerData) {
  if (!playerData) return []
  const seen = new Set()
  const questions = []
  for (const node of CHART) {
    const seal = mapSealRoot(playerData[node.key]?.root)
    if (!seal || seen.has(seal)) continue
    seen.add(seal)
    const bank = QUESTION_BANK[seal] || []
    bank.forEach((q, i) => {
      questions.push({
        id: `${node.key}-${seal}-${i}`,
        number: seal,
        role: node.role,
        weight: node.weight,
        prompt: q.prompt,
        choices: q.choices,
      })
    })
  }
  return questions
}

/**
 * @param {ReturnType<typeof buildAptitudeQuestions>} questions
 * @param {number[]} choiceIndexes
 */
export function scoreAptitude(questions, choiceIndexes) {
  const totals = new Map()
  const hits = new Map()
  questions.forEach((q, i) => {
    const choice = q.choices[choiceIndexes[i]]
    if (!choice) return
    const key = `${q.number}:${choice.routeId}`
    totals.set(key, (totals.get(key) || 0) + q.weight)
    const list = hits.get(key) || []
    list.push({ role: q.role, label: choice.label, weight: q.weight })
    hits.set(key, list)
  })
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
  if (!ranked.length) return null

  const [winKey] = ranked[0]
  const [winNumber, winRoute] = winKey.split(':')
  const winner = describePick(winNumber, winRoute)
  const winHits = hits.get(winKey) || []
  const lead = [...winHits].sort((a, b) => b.weight - a.weight)[0]
  const listed = winHits.map((h) => h.label).join('; ')
  const reason = lead
    ? `Your ${lead.role} is ${winner.sealLabel}. Your answers: ${listed}. That is ${winner.routeName}.`
    : `${winner.sealLabel} points to ${winner.routeName}.`

  let runnerUp = null
  if (ranked[1]) {
    const [nextKey] = ranked[1]
    const [nextNumber, nextRoute] = nextKey.split(':')
    const next = describePick(nextNumber, nextRoute)
    if (next.number !== winner.number || next.routeId !== winner.routeId) runnerUp = next
  }

  return { ...winner, reason, runnerUp }
}
