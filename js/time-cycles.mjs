/**
 * SSC Time Cycle math — ported from sourcecode-life/app/src/lib/numerology.js
 * Pure ESM, safe for Cloudflare Worker.
 */

const MASTERS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99]);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const CYCLE_MEANINGS = {
  pinnacle: {
    1:  { theme: 'Self-Reliance & Leadership', summary: 'Independence, courage, and a strong individual identity. Lead, pioneer, and stand alone without loneliness.', shadow: 'Isolation dressed as strength; starting alone when alliance would accelerate.' },
    2:  { theme: 'Cooperation & Sensitivity',  summary: 'Emotional intelligence, relational depth, and partnership. Strength in receptivity rather than force.', shadow: 'People-pleasing, delayed decisions, and waiting forever for permission.' },
    3:  { theme: 'Creative Expression',        summary: 'Authentic self-expression, communication, and joyful connection. Suppressing your voice is the only mistake.', shadow: 'Scattered creativity, performance without substance, or silencing the voice.' },
    4:  { theme: 'Discipline & Hard Work',     summary: 'Character through sustained effort. Unglamorous construction that becomes bedrock.', shadow: 'Rigidity, overwork as identity, and mistaking grind for progress.' },
    5:  { theme: 'Change & Versatility',       summary: 'Movement, change, and adaptability. Freedom earned through presence, not escape.', shadow: 'Restlessness as escape; novelty addiction; unfinished threads.' },
    6:  { theme: 'Service & Responsibility',   summary: 'Home, family, and community. Love with boundaries — give sustainably.', shadow: 'Martyrdom, over-caretaking, and resentment under the smile of service.' },
    7:  { theme: 'Spiritual Seeking',          summary: 'Introspection, study, and inner authority. Answers arrive through stillness.', shadow: 'Isolation as superiority; analysis without embodiment; distrust of the body.' },
    8:  { theme: 'Material Mastery',           summary: 'Achievement, authority, and proper use of power through self-discipline.', shadow: 'Control of others; status chasing; power without self-mastery.' },
    9:  { theme: 'Universal Service',          summary: 'Purpose beyond the personal. Release what is small; serve what is vast.', shadow: 'Premature endings; savior complex; refusing to close what is done.' },
    11: { theme: 'Master Illumination',        summary: 'Extraordinary insight and inspired influence — requires rigorous grounding.', shadow: 'Nervous scatter; ungrounded channeling; sensitivity without structure.' },
    22: { theme: 'Master Manifestation',       summary: 'Vision at generational scale. Enormous demand; lasting reward.', shadow: 'Overwhelm; grand plans with no weekly build; vision without discipline.' },
  },
  personalYear: {
    1:  { theme: 'New Beginnings',          summary: 'Initiation year — plant seeds deliberately; momentum lasts nine years.', shadow: 'False starts; initiating without aim; abandoning seeds before they root.' },
    2:  { theme: 'Connection & Patience',   summary: 'Relationship, cooperation, and waiting. Tend what was planted; do not force.', shadow: 'Passive waiting; codependence; stalling for perfect conditions.' },
    3:  { theme: 'Expression & Growth',     summary: 'Creative expansion and communication. Express boldly; say what you have held.', shadow: 'Talk without delivery; social distraction; creative scatter.' },
    4:  { theme: 'Foundation Building',     summary: 'Disciplined construction. Do not skip steps.', shadow: 'Burnout construction; perfectionism that never ships.' },
    5:  { theme: 'Change & Freedom',        summary: 'Movement and liberation. Welcome disruption; stay present.', shadow: 'Chaos tourism; quitting when friction appears.' },
    6:  { theme: 'Responsibility & Home',   summary: 'Deepen commitments. Show up fully for those in your field.', shadow: 'Over-commitment; neglecting self while serving everyone else.' },
    7:  { theme: 'Inner Work & Reflection', summary: 'Retreat, study, spiritual deepening. Answers arrive through stillness.', shadow: 'Withdrawal from necessary action; spiritual bypass of real decisions.' },
    8:  { theme: 'Power & Achievement',     summary: 'Harvest and material achievement. Step into authority; claim what you earned.', shadow: 'Force; ego wins; achievement without integrity.' },
    9:  { theme: 'Completion & Release',    summary: 'Endings and clearing. Complete what remains; do not start new cycles early.', shadow: 'Clinging to finished chapters; starting 1-energy too early.' },
    11: { theme: 'Illumination & Mastery',  summary: 'Heightened awareness and breakthroughs — ground daily.', shadow: 'Overwhelm of insight; no grounding practice.' },
    22: { theme: 'Master Building',         summary: 'Large-scale vision into form. Build with full intention.', shadow: 'Scale fantasy; refusing the boring middle of the build.' },
  },
  fourMonthCycle: {
    1:  { theme: 'Initiation',     summary: 'Begin something new. Momentum favours the one who goes first.', shadow: 'Too many starts; no single commitment.' },
    2:  { theme: 'Gestation',      summary: 'Patience and cooperation. Gathering phase, not launching.', shadow: 'Forcing launch before the form is ready.' },
    3:  { theme: 'Expression',     summary: 'Creative channel open. Express, communicate, socialise.', shadow: 'Noise without message; visibility without substance.' },
    4:  { theme: 'Consolidation',  summary: 'Disciplined follow-through. Clear backlog; build the system.', shadow: 'Busywork as avoidance of the real build.' },
    5:  { theme: 'Expansion',      summary: 'Movement and unexpected openings. Presence over planning.', shadow: 'Scattered pivots; no capture of opportunity.' },
    6:  { theme: 'Responsibility', summary: 'Home, relationships, commitments. Love is the work.', shadow: 'Duty without boundaries; resentment under care.' },
    7:  { theme: 'Reflection',     summary: 'Retreat and inquiry. Insight is worth the pause.', shadow: 'Endless research; no re-entry.' },
    8:  { theme: 'Achievement',    summary: 'Ambition and tangible results. Make significant moves.', shadow: 'Pushing for wins that cost integrity.' },
    9:  { theme: 'Completion',     summary: 'Finish, release, clear. Make room for what comes next.', shadow: 'Dragging dead projects into the next window.' },
    11: { theme: 'Master Illumination', summary: 'Heightened intuition; act on what you perceive.', shadow: 'Intuition without follow-through.' },
    22: { theme: 'Master Building',     summary: 'Large-scale building energy with unusual permanence.', shadow: 'Overbuilding without foundation checks.' },
  },
  personalMonth: {
    1:  { theme: 'Fresh Start',    summary: 'New intentions within the yearly flow. Notice what is stirring.', shadow: 'Impulse starts that fight the year’s larger aim.' },
    2:  { theme: 'Cooperation',    summary: 'Attunement and collaboration. Small gestures carry weight.', shadow: 'Deferring every choice to others.' },
    3:  { theme: 'Creativity',     summary: 'Expression comes easily. Create and share.', shadow: 'Scattered output; nothing finished this month.' },
    4:  { theme: 'Organisation',   summary: 'Back to plan, structure, and necessary work.', shadow: 'Tidying as a substitute for progress.' },
    5:  { theme: 'Movement',       summary: 'Plans shift; surprises arrive. Go with it.', shadow: 'Reactive pivots with no weekly anchor.' },
    6:  { theme: 'Nurturing',      summary: 'Relationships and care. Give and receive.', shadow: 'Over-giving until the month’s work disappears.' },
    7:  { theme: 'Introspection',  summary: 'Slow down and look inward. Clarity needs silence.', shadow: 'Disappearing from necessary conversations.' },
    8:  { theme: 'Manifestation',  summary: 'Achievement energy. Ask for more; deliver fully.', shadow: 'Forceful pushing; ignoring recovery.' },
    9:  { theme: 'Release',        summary: 'Close a chapter. Clearing creates space.', shadow: 'Holding clutter — physical, emotional, or project.' },
    11: { theme: 'Illuminated Channel', summary: 'Master month — intuition sharp; channel carefully.', shadow: 'Sensitivity without grounding.' },
    22: { theme: 'Master Vision',       summary: 'Think and build at scale. Engage your largest ideas.', shadow: 'Vision without a week’s worth of brickwork.' },
  },
};

const N9_MEANINGS = {
  1:  { theme: '9-Yr Cycle 1 (0–9) — The Awakening',    summary: 'Foundational epoch. Character shaped; earliest patterns established.', shadow: 'Mistaking childhood imprints for permanent destiny.' },
  2:  { theme: '9-Yr Cycle 2 (9–18) — The Learning',    summary: 'School of life. Peer bonds, paths, and emotional intelligence develop.', shadow: 'Borrowing identity from peers; refusing the lesson.' },
  3:  { theme: '9-Yr Cycle 3 (18–27) — The Expression', summary: 'Break free and experiment. Careers, relationships, and philosophies tested.', shadow: 'Endless experiment with no commitment to a craft.' },
  4:  { theme: '9-Yr Cycle 4 (27–36) — The Builder',    summary: 'Lay the great structures. Decisions here echo for decades.', shadow: 'Building the wrong structure on speed and fear.' },
  5:  { theme: '9-Yr Cycle 5 (36–45) — The Liberator',  summary: 'Midlife shift. Old structures questioned; authentic living becomes non-negotiable.', shadow: 'Burning structures that still serve; chaos as false liberation.' },
  6:  { theme: '9-Yr Cycle 6 (45–54) — The Nurturer',   summary: 'Contribution beyond self. Mentoring and giving back define this epoch.', shadow: 'Over-responsibility for others’ growth.' },
  7:  { theme: '9-Yr Cycle 7 (54–63) — The Sage',       summary: 'Inward journey. Experience crystallises into wisdom.', shadow: 'Withdrawal that withholds needed wisdom from the world.' },
  8:  { theme: '9-Yr Cycle 8 (63–72) — The Authority',  summary: 'Harvest of a lifetime. Authority and legacy reach fullest expression.', shadow: 'Clinging to authority; refusing succession.' },
  9:  { theme: '9-Yr Cycle 9 (72–81) — The Elder',      summary: 'Rounding-off. Wisdom becomes compassion.', shadow: 'Bitterness; unfinished forgiveness.' },
  10: { theme: '9-Yr Cycle 10 (81–90) — The Transcendent', summary: 'Beyond cycles — pure presence. Every moment complete.', shadow: 'Disengagement mistaken for transcendence.' },
};

/**
 * Evolution of Energy (0→9) worded for TIME CYCLES — stage of the energy journey,
 * not Life Path curriculum. Use these when summarizing what a cycle number means.
 */
const EVOLUTION_TIMING = {
  1: {
    stage: 'Initiation',
    title: 'The Spark Opens',
    summary: 'In time, 1 is the open gate — a window where energy wants to start, not finish. Cycles carrying 1 favour first moves, clean beginnings, and unfocused charge that needs a clear aim.',
  },
  2: {
    stage: 'Condensation',
    title: 'Form Through Relationship',
    summary: 'In time, 2 is the gathering phase — matter and people come together. Cycles carrying 2 favour patience, partnership, listening, and letting the next form coalesce before forcing launch.',
  },
  3: {
    stage: 'Expression',
    title: 'Play Through the Vessel',
    summary: 'In time, 3 is the voice waking up — energy tests itself in the world. Cycles carrying 3 favour communication, creative output, social flowering, and saying what has been held.',
  },
  4: {
    stage: 'Structure',
    title: 'Organised Containment',
    summary: 'In time, 4 builds the walls that make growth efficient. Cycles carrying 4 favour foundations, systems, disciplined work, and containing chaos so the next stage can hold.',
  },
  5: {
    stage: 'Exploration',
    title: 'Release Beyond the Walls',
    summary: 'In time, 5 leaves the nursery of structure to discover individuality through movement. Cycles carrying 5 favour change, new horizons, sensory aliveness, and freedom earned by staying present — not by escaping.',
  },
  6: {
    stage: 'Integration',
    title: 'Care Becomes Responsibility',
    summary: 'In time, 6 asks energy to mature into stewardship. Cycles carrying 6 favour home, commitments, nurturing what matters, and love with boundaries so service stays sustainable.',
  },
  7: {
    stage: 'Inner Knowing',
    title: 'Retreat Into Truth',
    summary: 'In time, 7 pulls the current inward. Cycles carrying 7 favour study, solitude, spiritual depth, and trusting the inner oracle over outer noise before the next outward push.',
  },
  8: {
    stage: 'Authority',
    title: 'Power Made Visible',
    summary: 'In time, 8 harvests what was built and owned. Cycles carrying 8 favour tangible achievement, earned authority, material moves, and self-mastery rather than control of others.',
  },
  9: {
    stage: 'Completion',
    title: 'Dispersal Before the Void',
    summary: 'In time, 9 closes the loop — energy completes and releases. Cycles carrying 9 favour endings, clearing, impersonal service, and finishing so a new 1 can open cleanly.',
  },
  11: {
    stage: 'Master Illumination',
    title: 'Amplified Bridge',
    summary: 'In time, 11 is a master octave of relational and intuitive charge. Cycles carrying 11 intensify insight and sensitivity — ground daily or the current scatters.',
  },
  22: {
    stage: 'Master Building',
    title: 'Amplified Structure',
    summary: 'In time, 22 is a master octave of foundation at scale. Cycles carrying 22 ask for large, lasting builds — vision with discipline, or overwhelm.',
  },
};

function evolutionFor(root) {
  return EVOLUTION_TIMING[root]
    || EVOLUTION_TIMING[reduceToSimple(root)]
    || { stage: `Frequency ${root}`, title: `Number ${root}`, summary: '' };
}

/**
 * Find repeating cycle numbers across layers (e.g. Pinnacle 5 + 9-Year Cycle 5).
 * N9 index 1–9 is treated as a comparable frequency; cycle 10 is skipped for alignment.
 */
export function findCycleAlignments({ currentPinnacle, n9, personalYear, fourMonth, personalMonth, pinnacles }) {
  const layers = [
    { key: 'currentPinnacle', label: 'Current Pinnacle', root: currentPinnacle.root },
    { key: 'personalYear', label: 'Personal Year', root: personalYear.root },
    { key: 'fourMonth', label: '4-Month Window', root: fourMonth.root },
    { key: 'personalMonth', label: 'Personal Month', root: personalMonth.root },
  ];
  if (n9.index >= 1 && n9.index <= 9) {
    layers.splice(1, 0, { key: 'n9', label: '9-Year Epoch', root: n9.index });
  }
  // Note prior pinnacle roots that match current (stacked chapters)
  (pinnacles || []).forEach((p) => {
    if (!p.isCurrent && p.root === currentPinnacle.root) {
      layers.push({ key: `pinnacleP${p.index}`, label: `Pinnacle ${p.index}`, root: p.root });
    }
  });

  const byRoot = new Map();
  for (const layer of layers) {
    const r = layer.root;
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(layer);
  }

  const alignments = [];
  for (const [number, matched] of byRoot.entries()) {
    if (matched.length < 2) continue;
    // Dedupe labels
    const seen = new Set();
    const unique = matched.filter((l) => {
      if (seen.has(l.label)) return false;
      seen.add(l.label);
      return true;
    });
    if (unique.length < 2) continue;
    alignments.push({
      number,
      layers: unique,
      evolution: evolutionFor(number),
      emphasis: unique.map((l) => l.label).join(' + '),
    });
  }
  // Strongest first (more layers)
  alignments.sort((a, b) => b.layers.length - a.layers.length);
  return alignments;
}

export function reduce(n) {
  let v = Number(n) || 0;
  while (v > 9 && !MASTERS.has(v)) {
    v = String(v).split('').reduce((a, d) => a + (+d), 0);
  }
  return v;
}

export function reduceToSimple(n) {
  let r = Number(n) || 0;
  while (r > 9) r = String(r).split('').reduce((a, d) => a + (+d), 0);
  return r;
}

export function calcLifePath(m, d, y) {
  const total = [m, d, ...String(y).split('').map(Number)].reduce((a, b) => a + b, 0);
  return { root: reduce(total), compound: total };
}

export function getCycleAnchor(m, d, asOf = new Date()) {
  const thisYear = asOf.getFullYear();
  const bdThisYear = new Date(thisYear, m - 1, d);
  const cycleStartYear = asOf >= bdThisYear ? thisYear : thisYear - 1;
  const lastBirthday = new Date(cycleStartYear, m - 1, d);
  const daysSinceBd = Math.floor((asOf - lastBirthday) / 86400000);
  return { cycleStartYear, lastBirthday, daysSinceBd };
}

export function calcPersonalYear(m, d, asOf = new Date()) {
  const { cycleStartYear } = getCycleAnchor(m, d, asOf);
  return { root: reduce(m + d + cycleStartYear), cycleStartYear };
}

export function calcPinnacles(m, d, y, lp) {
  const lps = reduceToSimple(lp.root);
  const p1 = { root: reduce(m + d),            startAge: 0,             endAge: 36 - lps, index: 1 };
  const p2 = { root: reduce(d + y),             startAge: p1.endAge + 1, endAge: p1.endAge + 9, index: 2 };
  const p3 = { root: reduce(p1.root + p2.root), startAge: p2.endAge + 1, endAge: p2.endAge + 9, index: 3 };
  const p4 = { root: reduce(m + y),             startAge: p3.endAge + 1, endAge: null, index: 4 };
  return [p1, p2, p3, p4];
}

export function calcPersonalMonth(m, d, asOf = new Date()) {
  const { lastBirthday } = getCycleAnchor(m, d, asOf);
  let monthsElapsed = (asOf.getFullYear() - lastBirthday.getFullYear()) * 12
                    + (asOf.getMonth() - lastBirthday.getMonth());
  if (asOf.getDate() < lastBirthday.getDate()) monthsElapsed--;
  monthsElapsed = Math.max(0, monthsElapsed);
  const monthNum = (monthsElapsed % 12) + 1;
  const py = calcPersonalYear(m, d, asOf).root;
  return { root: reduce(py + monthNum), monthNum };
}

export function calcFourMonthCycle(m, d, asOf = new Date()) {
  const { monthNum } = calcPersonalMonth(m, d, asOf);
  const { lastBirthday } = getCycleAnchor(m, d, asOf);
  const cycleNum = Math.ceil(monthNum / 4);
  const py = calcPersonalYear(m, d, asOf).root;
  const root = reduce(py + cycleNum - 1);
  const startMonthIdx = (lastBirthday.getMonth() + (cycleNum - 1) * 4) % 12;
  const endMonthIdx = (lastBirthday.getMonth() + cycleNum * 4 - 1) % 12;
  return { root, cycleNum, startMonthIdx, endMonthIdx };
}

function calcAge(m, d, y, asOf = new Date()) {
  let age = asOf.getFullYear() - y;
  const hadBirthday = asOf.getMonth() > (m - 1)
    || (asOf.getMonth() === (m - 1) && asOf.getDate() >= d);
  if (!hadBirthday) age--;
  return Math.max(0, age);
}

function meaningFor(map, root) {
  return map[root] || map[reduceToSimple(root)] || { theme: `Frequency ${root}`, summary: '', shadow: '' };
}

function enrichFourMonth(fm) {
  return {
    ...fm,
    startMonthName: MONTH_NAMES[fm.startMonthIdx],
    endMonthName: MONTH_NAMES[fm.endMonthIdx],
    meaning: meaningFor(CYCLE_MEANINGS.fourMonthCycle, fm.root),
    evolution: evolutionFor(fm.root),
  };
}

function enrichPersonalMonth(pm) {
  return {
    ...pm,
    meaning: meaningFor(CYCLE_MEANINGS.personalMonth, pm.root),
    evolution: evolutionFor(pm.root),
  };
}

/** Shift asOf by calendar months (approx) for adjacent personal-month windows. */
function shiftAsOfMonths(asOf, deltaMonths) {
  const dt = new Date(asOf.getTime());
  dt.setMonth(dt.getMonth() + deltaMonths);
  return dt;
}

function formatDateLabel(dt) {
  return `${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/**
 * Personal-month window with calendar bounds (birthday-based months).
 * offsetMonths: 0 = current personal month, 1 = next, etc.
 */
function personalMonthPlanEntry(m, d, asOf, offsetMonths = 0) {
  const shifted = shiftAsOfMonths(asOf, offsetMonths);
  const pm = enrichPersonalMonth(calcPersonalMonth(m, d, shifted));
  const { lastBirthday } = getCycleAnchor(m, d, shifted);
  const start = new Date(lastBirthday.getFullYear(), lastBirthday.getMonth(), lastBirthday.getDate());
  start.setMonth(start.getMonth() + (pm.monthNum - 1));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return {
    ...pm,
    offset: offsetMonths,
    isCurrent: offsetMonths === 0,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    startLabel: formatDateLabel(start),
    endLabel: formatDateLabel(end),
    heading: `Month ${pm.monthNum} · ${pm.root} · ${formatDateLabel(start)} – ${formatDateLabel(end)}`,
  };
}

/**
 * Full Time Cycle snapshot for guidebook-style generation.
 * @param {{ month:number, day:number, year:number, asOf?: Date }}
 */
export function calcTimeCycles({ month, day, year, asOf = new Date() }) {
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  const lp = calcLifePath(m, d, y);
  const age = calcAge(m, d, y, asOf);
  const anchorRaw = getCycleAnchor(m, d, asOf);
  const personalMonth = calcPersonalMonth(m, d, asOf);
  const anchor = {
    cycleStartYear: anchorRaw.cycleStartYear,
    lastBirthday: anchorRaw.lastBirthday.toISOString().slice(0, 10),
    daysSinceBd: anchorRaw.daysSinceBd,
    monthNum: personalMonth.monthNum,
  };

  const pinnacles = calcPinnacles(m, d, y, lp);
  const currentPinnacle = pinnacles.find(p =>
    age >= p.startAge && (p.endAge === null || age <= p.endAge)
  ) || pinnacles[pinnacles.length - 1];
  const n9Index = Math.min(Math.floor(age / 9) + 1, 10);
  const personalYear = calcPersonalYear(m, d, asOf);
  const fourMonth = calcFourMonthCycle(m, d, asOf);

  // Adjacent windows for handoff copy (prev / next)
  const prevMonth = enrichPersonalMonth(calcPersonalMonth(m, d, shiftAsOfMonths(asOf, -1)));
  const nextMonth = enrichPersonalMonth(calcPersonalMonth(m, d, shiftAsOfMonths(asOf, 1)));
  // Jump ~4 months to land in neighboring 4-month windows
  const prevFour = enrichFourMonth(calcFourMonthCycle(m, d, shiftAsOfMonths(asOf, -4)));
  const nextFour = enrichFourMonth(calcFourMonthCycle(m, d, shiftAsOfMonths(asOf, 4)));

  const pinnaclesWithMeta = pinnacles.map(p => ({
    ...p,
    meaning: meaningFor(CYCLE_MEANINGS.pinnacle, p.root),
    evolution: evolutionFor(p.root),
    isCurrent: p.index === currentPinnacle.index,
  }));

  const ageBandStart = (n9Index - 1) * 9;
  const ageBandEnd = n9Index === 10 ? 90 : n9Index * 9;
  const yearsRemainingInBand = Math.max(0, ageBandEnd - age);

  const n9 = {
    index: n9Index,
    ageBandStart,
    ageBandEnd,
    yearsRemainingInBand,
    ...N9_MEANINGS[n9Index],
    evolution: n9Index <= 9 ? evolutionFor(n9Index) : {
      stage: 'Transcendence',
      title: 'Beyond the Nine',
      summary: 'In time, epoch 10 sits past the 1–9 loop — presence without a new developmental charge. Emphasize completion and stillness rather than a twin root.',
      shadow: 'Disengagement mistaken for transcendence.',
    },
  };

  const fourMonthEnriched = enrichFourMonth(fourMonth);
  const personalMonthEnriched = enrichPersonalMonth(personalMonth);

  const meaningSeeds = {
    currentPinnacle: {
      ...meaningFor(CYCLE_MEANINGS.pinnacle, currentPinnacle.root),
      evolution: evolutionFor(currentPinnacle.root),
    },
    pinnacles: pinnaclesWithMeta,
    n9,
    personalYear: {
      ...meaningFor(CYCLE_MEANINGS.personalYear, personalYear.root),
      evolution: evolutionFor(personalYear.root),
    },
    fourMonth: {
      ...fourMonthEnriched.meaning,
      evolution: fourMonthEnriched.evolution,
    },
    personalMonth: {
      ...personalMonthEnriched.meaning,
      evolution: personalMonthEnriched.evolution,
    },
  };

  const alignments = findCycleAlignments({
    currentPinnacle,
    n9,
    personalYear,
    fourMonth,
    personalMonth,
    pinnacles: pinnaclesWithMeta,
  });

  const adjacent = {
    personalMonth: { previous: prevMonth, next: nextMonth },
    fourMonth: { previous: prevFour, next: nextFour },
  };

  // Next 90 days ≈ current personal month + next two (birthday-based windows)
  const planMonths = [0, 1, 2].map((offset) => personalMonthPlanEntry(m, d, asOf, offset));

  return {
    asOf: asOf.toISOString().slice(0, 10),
    age,
    lifePathRoot: lp.root,
    lifePathCompound: lp.compound,
    anchor,
    pinnacles: pinnaclesWithMeta,
    currentPinnacle,
    n9,
    personalYear,
    fourMonth: fourMonthEnriched,
    personalMonth: personalMonthEnriched,
    adjacent,
    planMonths,
    meaningSeeds,
    alignments,
  };
}

export { CYCLE_MEANINGS, N9_MEANINGS, MONTH_NAMES, EVOLUTION_TIMING };
