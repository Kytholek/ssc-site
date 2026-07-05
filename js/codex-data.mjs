/**
 * Shared Codex data — placement grid, node metadata, root reduction.
 * Used by calculator, Codex page, and guidebook worker.
 */

export const CODEX_PLACEMENT = {
  1: 'Mind / Mind',
  2: 'Mind / Body',
  3: 'Mind / Spirit',
  4: 'Body / Mind',
  5: 'Body / Body',
  6: 'Body / Spirit',
  7: 'Spirit / Mind',
  8: 'Spirit / Body',
  9: 'Spirit / Spirit',
};

export const CODEX_NODES = {
  '1': {
    name: 'The Initiator',
    position: 'Mind Axis · Upper Left',
    essence: 'Electric · Original Force',
    body: 'The spark that begins every cycle. Bold self-direction, pioneer instinct, original creative force.',
  },
  '2': {
    name: 'Duality',
    position: 'Body Axis · Upper Right',
    essence: 'Magnetic · Bridge & Balance',
    body: 'The consciousness that unifies opposites. Diplomacy, relational awareness, the art of genuine union.',
  },
  '3': {
    name: 'The Mind — Realm of Thought',
    position: 'Spirit Gate · Upper Pole',
    essence: 'Electric · Thought & Expression',
    body: 'The realm of thought, where forms first arise before the world can see them.',
  },
  '4': {
    name: 'Structure',
    position: 'Mind Axis · Left Meridian',
    essence: 'Magnetic · Structure & Stability',
    body: 'The consciousness that manifests. Discipline, order, patient building of foundations that outlast their maker.',
  },
  '5': {
    name: 'Vessal for Experience',
    position: 'Body Axis · Right Meridian',
    essence: 'Electric · Freedom Through Presence',
    body: 'The explorer on the body meridian. Every path of transformation passes through 5.',
  },
  '6': {
    name: 'The World — Reflection of Thought',
    position: 'Spirit Gate · Lower Pole',
    essence: 'Magnetic · Integration & Service',
    body: 'The reflection of thought in the world — mind made visible through action, love and responsibility.',
  },
  '7': {
    name: 'Knowledge',
    position: 'Mind Axis · Lower Left',
    essence: 'Electric · Wisdom & Inner Knowing',
    body: 'The questioner of all appearances. Truth through direct experience, the sacred quest beneath the noise of the world.',
  },
  '8': {
    name: 'Self-Empowerment',
    position: 'Body Axis · Lower Right',
    essence: 'Magnetic · Authority & Manifestation',
    body: 'True power is self-mastery. Authority earned, not assumed.',
  },
  '9': {
    name: 'The Singularity',
    position: 'Aetheric Centre · Still Point',
    essence: 'Aetheric · Completion & Universal Service',
    body: 'The central singularity all of it flows through and out from.',
  },
  '0': {
    name: 'The Void — Pure Awareness',
    position: 'Ring of Void · Beyond the Matrix',
    essence: 'Aetheric · Presence Before Thought',
    body: 'The awareness in which mind, the world and even the singularity appear.',
  },
};

/** Grid position for master numbers uses reduced base (11→2, etc.). */
export function getCodexRoot(n) {
  n = parseInt(n, 10);
  if (isNaN(n)) return 0;
  if (n === 11) return 2;
  if (n === 22) return 4;
  if (n === 33) return 6;
  if (n === 44) return 8;
  while (n > 9) {
    n = String(n).split('').reduce((a, d) => a + parseInt(d, 10), 0);
  }
  return n;
}

export function getCodexPlacement(n) {
  return CODEX_PLACEMENT[getCodexRoot(n)] || '';
}

export function getCodexNodeMeta(n) {
  const root = getCodexRoot(n);
  const meta = CODEX_NODES[String(root)] || {};
  return {
    root,
    display: n,
    placement: getCodexPlacement(n),
    name: meta.name || '',
    essence: meta.essence || '',
    position: meta.position || '',
    body: meta.body || '',
    links: meta.links || [],
  };
}

export function getSpiralRing(n) {
  n = parseInt(n, 10);
  if (isNaN(n) || n === 0) return 0;
  if (n <= 9) return 1;
  return Math.floor(n / 10) + 1;
}

export function getSpiralTurn(n) {
  n = parseInt(n, 10);
  if (isNaN(n) || n <= 0) return -1;
  return Math.floor((n - 1) / 9);
}

export function getSpiralSpoke(n) {
  n = parseInt(n, 10);
  if (n === 0) return -1;
  return getCodexRoot(n) - 1;
}

export const SPIRAL_MAX = 99;
