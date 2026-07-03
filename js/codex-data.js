/**
 * Shared Codex data — placement grid, node metadata, root reduction.
 * Used by calculator results and the Codex page (via app.js).
 */
(function () {
  var CODEX_PLACEMENT = {
    1: 'Mind / Mind',
    2: 'Mind / Body',
    3: 'Mind / Spirit',
    4: 'Body / Mind',
    5: 'Body / Body',
    6: 'Body / Spirit',
    7: 'Spirit / Mind',
    8: 'Spirit / Body',
    9: 'Spirit / Spirit'
  };

  var CODEX_NODES = {
    '1': {
      name: 'The Initiator',
      position: 'Mind Axis · Upper Left',
      essence: 'Electric · Original Force',
      body: 'The spark that begins every cycle. Bold self-direction, pioneer instinct, original creative force.',
      links: [
        { href: '/blog/life-path-1-numerology/', label: 'Life Path' },
        { href: '/blog/expression-1-numerology/', label: 'Expression' }
      ]
    },
    '2': {
      name: 'Duality',
      position: 'Body Axis · Upper Right',
      essence: 'Magnetic · Bridge & Balance',
      body: 'The consciousness that unifies opposites. The magnitism that brings things together Diplomacy, relational awareness, the art of genuine union. The bridge between the polarities of the world.',
      links: [
        { href: '/blog/life-path-2-numerology/', label: 'Life Path' },
        { href: '/blog/expression-2-numerology/', label: 'Expression' }
      ]
    },
    '3': {
      name: 'The Mind — Realm of Thought',
      position: 'Spirit Gate · Upper Pole',
      essence: 'Electric · Thought & Expression',
      body: 'The realm of thought, where forms first arise before the world can see them. Creative force finding its voice. Double 3 and it becomes 6 — every thought seeks its reflection in the world. One pole of the Alternator.',
      links: [
        { href: '/blog/life-path-3-numerology/', label: 'Life Path' },
        { href: '/blog/expression-3-numerology/', label: 'Expression' }
      ]
    },
    '4': {
      name: 'Structure',
      position: 'Mind Axis · Left Meridian',
      essence: 'Magnetic · Structure & Stability',
      body: 'The consciousness that manifests. Discipline, order, patient building of foundations that outlast their maker. The structuring of Imaginative Spirit into the physicality of the world.',
      links: [
        { href: '/blog/life-path-4-numerology/', label: 'Life Path' },
        { href: '/blog/expression-4-numerology/', label: 'Expression' }
      ]
    },
    '5': {
      name: 'Vessal for Experience',
      position: 'Body Axis · Right Meridian',
      essence: 'Electric · Freedom Through Presence',
      body: 'The explorer on the body meridian. Every path of transformation passes through 5. Freedom through full presence, not escape.',
      links: [
        { href: '/blog/life-path-5-numerology/', label: 'Life Path' },
        { href: '/blog/expression-5-numerology/', label: 'Expression' }
      ]
    },
    '6': {
      name: 'The World — Reflection of Thought',
      position: 'Spirit Gate · Lower Pole',
      essence: 'Magnetic · Integration & Service',
      body: 'The reflection of thought in the world — mind made visible through action, love and responsibility. Nothing completes until it reaches 6. Double 6 and it returns to 3: the world turns back into thought. The other pole of the Alternator.',
      links: [
        { href: '/blog/life-path-6-numerology/', label: 'Life Path' },
        { href: '/blog/expression-6-numerology/', label: 'Expression' }
      ]
    },
    '7': {
      name: 'Knowledge',
      position: 'Mind Axis · Lower Left',
      essence: 'Electric · Wisdom & Inner Knowing',
      body: 'The questioner of all appearances. Truth through direct experience, the sacred quest beneath the noise of the world. The seeking of knowledge, and ultimate knowledge is knowledge of self.',
      links: [
        { href: '/blog/life-path-7-numerology/', label: 'Life Path' },
        { href: '/blog/expression-7-numerology/', label: 'Expression' }
      ]
    },
    '8': {
      name: 'Self-Empowerment',
      position: 'Body Axis · Lower Right',
      essence: 'Magnetic · Authority & Manifestation',
      body: 'True power is self-mastery. Authority earned, not assumed. Manifestation through disciplined alignment of will and integrity.',
      links: [
        { href: '/blog/life-path-8-numerology/', label: 'Life Path' },
        { href: '/blog/expression-8-numerology/', label: 'Expression' }
      ]
    },
    '9': {
      name: 'The Singularity',
      position: 'Aetheric Centre · Still Point',
      essence: 'Aetheric · Completion & Universal Service',
      body: 'The central singularity all of it flows through and out from. Double 9 and it remains 9 — unmoved while everything cycles around it. Completion, release, universal compassion: the portal back to the Void.',
      links: [
        { href: '/blog/life-path-9-numerology/', label: 'Life Path' },
        { href: '/blog/expression-9-numerology/', label: 'Expression' }
      ]
    },
    '0': {
      name: 'The Void — Pure Awareness',
      position: 'Ring of Void · Beyond the Matrix',
      essence: 'Aetheric · Presence Before Thought',
      body: 'The awareness in which mind (3), the world (6) and even the singularity (9) appear. Not a number but the field that holds them — the presence of the one watching, beyond world and thought. The womb of creation every cycle returns to.',
      links: [
        { href: '/blog/five-lenses-of-self-ego-mind-soul-spirit-void/', label: 'The Void Lens' },
        { href: '/blog/evolution-of-energy-0-through-9/', label: '0 → 9 Evolution' }
      ]
    }
  };

  /** Grid position for master numbers uses reduced base (11→2, etc.). */
  function getCodexRoot(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return 0;
    if (n === 11) return 2;
    if (n === 22) return 4;
    if (n === 33) return 6;
    if (n === 44) return 8;
    while (n > 9) {
      n = String(n).split('').reduce(function (a, d) { return a + parseInt(d, 10); }, 0);
    }
    return n;
  }

  function getCodexPlacement(n) {
    return CODEX_PLACEMENT[getCodexRoot(n)] || '';
  }

  function getCodexNodeMeta(n) {
    var root = getCodexRoot(n);
    var meta = CODEX_NODES[String(root)] || {};
    return {
      root: root,
      display: n,
      placement: getCodexPlacement(n),
      name: meta.name || '',
      essence: meta.essence || '',
      position: meta.position || ''
    };
  }

  window.CODEX_PLACEMENT = CODEX_PLACEMENT;
  window.CODEX_NODES = CODEX_NODES;
  window.getCodexRoot = getCodexRoot;
  window.getCodexPlacement = getCodexPlacement;
  window.getCodexNodeMeta = getCodexNodeMeta;
})();
