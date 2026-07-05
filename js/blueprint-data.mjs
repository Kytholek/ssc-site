/**
 * Triune Trinity Blueprint — frequency metadata, trinity groupings, blog links.
 * Used by /blueprint/ interactive star chart and journey.
 */

export const TRINITY_ARTICLES = {
  lessons: '/blog/trinity-of-lessons-numerology/',
  expression: '/blog/trinity-of-expression-numerology/',
  purpose: '/blog/trinity-of-purpose-numerology/',
};

export const TRINITIES = {
  lessons: {
    id: 'lessons',
    title: 'Trinity of Lessons',
    subtitle: 'Achievement · Theme · Life Path',
    accent: '#7ec8c8',
    accentDim: 'rgba(126,200,200,0.35)',
    triangle: 'lower',
    nodes: ['lifePath', 'achievement', 'theme'],
    intro: 'Your birth date encodes the external curriculum — the lessons the simulation keeps presenting. Theme sets the atmospheric note of your generation. Life Path is the core quest. Achievement is how you naturally move through that curriculum.',
    body: 'Together these three frequencies describe what you are here to learn through experience — not as punishment, but as the specific resistance that builds your capacity.',
  },
  expression: {
    id: 'expression',
    title: 'Trinity of Expression',
    subtitle: 'Soul · Outer Persona · Expression',
    accent: '#c898f0',
    accentDim: 'rgba(200,152,240,0.35)',
    triangle: 'upper',
    nodes: ['soul', 'outer', 'expression'],
    intro: 'Your full birth name encodes the internal circuit — the authentic frequency you are here to express. Soul Urge is the private inner world. Outer Persona is the social mask. Expression is what emerges when they fuse.',
    body: 'This trinity maps how your inner desire becomes visible signal — the difference between what you feel privately and what the world actually receives from you.',
  },
  purpose: {
    id: 'purpose',
    title: 'Trinity of Purpose',
    subtitle: 'Life Path · Expression · Life Calling',
    accent: '#e8c96b',
    accentDim: 'rgba(232,201,107,0.35)',
    triangle: 'purpose',
    nodes: ['lifePath', 'expression', 'calling'],
    intro: 'Purpose is where external curriculum and internal signal converge. Life Path is what life teaches you. Expression is what you are here to become. Life Calling is the specific directive that emerges when both circuits run together.',
    body: 'Life Calling sits at the centre of the star chart — the fusion point where your lessons and your authentic frequency produce a single mission.',
  },
};

/** Star-chart order: [lifePath, expression, calling, soul, outer, achievement, theme] */
export const FREQUENCIES = {
  lifePath: {
    id: 'lifePath',
    chartIndex: 0,
    label: 'Life Path',
    role: 'What You Learn',
    circuit: 'External',
    trinities: ['lessons', 'purpose'],
    essence: 'The external curriculum encoded in your full birth date.',
    summary: 'Life Path is the quest the simulation presents — the flavor of resistance, challenge, and growth you are learning to embody through immersion.',
    trinityLink: { href: TRINITY_ARTICLES.lessons, label: 'Read the Trinity of Lessons' },
    exploreLink: { href: '/blog/life-path-number-explained/', label: 'Explore Life Path' },
    extraLinks: [{ href: TRINITY_ARTICLES.purpose, label: 'Trinity of Purpose' }],
  },
  expression: {
    id: 'expression',
    chartIndex: 1,
    label: 'Expression',
    role: 'What You Carry',
    circuit: 'Internal',
    trinities: ['expression', 'purpose'],
    essence: 'The authentic signal encoded in your full birth name.',
    summary: 'Expression is your internal frequency — what you are here to express and become when social conditioning falls away.',
    trinityLink: { href: TRINITY_ARTICLES.expression, label: 'Read the Trinity of Expression' },
    exploreLink: { href: '/blog/expression-1-numerology/', label: 'Explore Expression numbers' },
    extraLinks: [{ href: TRINITY_ARTICLES.purpose, label: 'Trinity of Purpose' }],
  },
  calling: {
    id: 'calling',
    chartIndex: 2,
    label: 'Life Calling',
    role: 'Your Mission',
    circuit: 'Fusion',
    trinities: ['purpose'],
    essence: 'Where Life Path and Expression converge.',
    summary: 'Life Calling is the specific directive that emerges when external curriculum meets internal frequency — not a career label, but a fusion directive.',
    trinityLink: { href: TRINITY_ARTICLES.purpose, label: 'Read the Trinity of Purpose' },
    exploreLink: { href: '/blog/how-to-read-numerology-blueprint/', label: 'How to read your blueprint' },
    extraLinks: [],
  },
  soul: {
    id: 'soul',
    chartIndex: 3,
    label: 'Soul Urge',
    role: 'Your Inner Desire',
    circuit: 'Internal',
    trinities: ['expression'],
    essence: 'The private inner world — vowels of the birth name.',
    summary: 'Soul Urge is your inner compass — desires, yearnings, and motivations beneath the surface, before persona or performance.',
    trinityLink: { href: TRINITY_ARTICLES.expression, label: 'Read the Trinity of Expression' },
    exploreLink: { href: '/blog/soul-urge-1-numerology/', label: 'Explore Soul Urge numbers' },
    extraLinks: [],
  },
  outer: {
    id: 'outer',
    chartIndex: 4,
    label: 'Outer Persona',
    role: 'Your Public Persona',
    circuit: 'Internal',
    trinities: ['expression'],
    essence: 'The social mask — consonants of the birth name.',
    summary: 'Outer Persona is how the world first reads you — the vibe you give off before people know you deeply.',
    trinityLink: { href: TRINITY_ARTICLES.expression, label: 'Read the Trinity of Expression' },
    exploreLink: { href: TRINITY_ARTICLES.expression, label: 'Soul, Outer & Expression' },
    extraLinks: [],
  },
  achievement: {
    id: 'achievement',
    chartIndex: 5,
    label: 'Achievement',
    role: 'How You Accomplish',
    circuit: 'External',
    trinities: ['lessons'],
    essence: 'Month + day — your operational style.',
    summary: 'Achievement is how you naturally accomplish things — the style in which you move through the external curriculum.',
    trinityLink: { href: TRINITY_ARTICLES.lessons, label: 'Read the Trinity of Lessons' },
    exploreLink: { href: '/blog/how-to-read-numerology-blueprint/', label: 'How to read your blueprint' },
    extraLinks: [],
  },
  theme: {
    id: 'theme',
    chartIndex: 6,
    label: 'Theme',
    role: 'Your Life Curriculum',
    circuit: 'External',
    trinities: ['lessons'],
    essence: 'Birth year — the atmospheric frequency of your generation.',
    summary: 'Theme is less personal than Life Path — the generational note the simulation is written in, coloring how your lessons arrive.',
    trinityLink: { href: TRINITY_ARTICLES.lessons, label: 'Read the Trinity of Lessons' },
    exploreLink: { href: '/blog/theme-number-birth-year-numerology/', label: 'Explore Theme numbers' },
    extraLinks: [],
  },
};

export const JOURNEY_CHAPTERS = [
  { id: 'lessons', trinityId: 'lessons', step: 1 },
  { id: 'expression', trinityId: 'expression', step: 2 },
  { id: 'purpose', trinityId: 'purpose', step: 3 },
];

export const FAQ_ITEMS = [
  {
    q: 'What is the Triune Trinity Blueprint?',
    a: 'The SSC blueprint reads seven frequencies from your birth date and full name, grouped into three trinities: Lessons (external curriculum), Expression (internal signal), and Purpose (where they converge).',
  },
  {
    q: 'What is the Trinity of Purpose?',
    a: 'Life Path, Expression, and Life Calling form the Purpose trinity. Life Calling sits at the centre of the star chart — the fusion of what life teaches you and what you are here to express.',
  },
  {
    q: 'What is the Trinity of Lessons?',
    a: 'Achievement, Theme, and Life Path describe the external circuit — how the simulation presents curriculum through your birth date.',
  },
  {
    q: 'What is the Trinity of Expression?',
    a: 'Soul Urge, Outer Persona, and Expression map the internal circuit — how your private desire and social mask fuse into authentic signal.',
  },
];

export function getFrequency(id) {
  return FREQUENCIES[id] || null;
}

export function getTrinity(id) {
  return TRINITIES[id] || null;
}

export function getFrequencyLinks(freq) {
  if (!freq) return [];
  const links = [freq.trinityLink, freq.exploreLink];
  if (freq.extraLinks) links.push(...freq.extraLinks);
  return links.filter(Boolean);
}
