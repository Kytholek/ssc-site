/**
 * Codex Spiral Learn — educational panel, journey, matrix bridge
 */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var RING_META = {
    0: { label: 'The Void', lesson: 'Awareness before number — the field every cycle returns to.' },
    1: { label: 'Pure Archetypes', lesson: 'Single-digit frequencies — the raw curriculum of the matrix.' },
    2: { label: 'First Compounds · 10s', lesson: 'Two digits partner — complexity enters, but each number still reduces to an archetype on the same spoke.' },
    3: { label: 'Deep Compounds · 20s', lesson: 'Maturation — the fractal repeats at greater depth.' },
    4: { label: 'Compounds · 30s', lesson: 'The pattern deepens; matrix position stays coherent across the octave.' },
    5: { label: 'Compounds · 40s', lesson: 'Structural mastery compounds — building frequencies at a wider octave.' },
    6: { label: 'Compounds · 50s', lesson: 'Aliveness and freedom amplified — experience at scale.' },
    7: { label: 'Compounds · 60s', lesson: 'Love and integration carried outward — care as compound frequency.' },
    8: { label: 'Compounds · 70s', lesson: 'Inner knowing expressed through deeper layers of the spiral.' },
    9: { label: 'Compounds · 80s', lesson: 'Material power and authority at compound depth.' },
    10: { label: 'Full Cycle · 90s', lesson: 'Double digits at maximum depth before return to zero — universal service completes the arc.' }
  };

  var NATURE_COLOR = {
    electric: '#fbbf24',
    magnetic: '#67e8f9',
    aetheric: '#c084fc',
    voidc: '#C0C0E0'
  };

  function natureOf(root) {
    if (root === 9) return 'aetheric';
    if (root === 0) return 'voidc';
    return (Number(root) % 2 === 1) ? 'electric' : 'magnetic';
  }

  var SPIRAL_CHAPTERS = [
    {
      eyebrow: 'Chapter 1 of 7 · The Void',
      title: '0 — Awareness Before Thought',
      body: 'Every spiral begins at the centre. <strong>0</strong> is not a step on the path — it is the awareness in which the path appears. In the Consciousness Matrix, the Void ring holds the whole field.',
      playFrom: 0, playTo: 0, highlight: [0]
    },
    {
      eyebrow: 'Chapter 2 of 7 · Pure Archetypes',
      title: 'Ring 1 — Frequencies 1 through 9',
      body: 'The first outward ring holds the <strong>nine archetypes</strong>. Play traces <strong>0→99</strong> in order — each cycle of nine steps completes a root turn before the spiral steps outward. All numbers that reduce to 2 share the same ray: 2, 11, 20, 29…',
      playFrom: 0, playTo: 9, highlight: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    {
      eyebrow: 'Chapter 3 of 7 · First Complexity',
      title: 'Ring 2 — Compounds 10 through 19',
      body: '<strong>11</strong> sits on the <strong>root-2 ray</strong> with <strong>2</strong>, <strong>20</strong>, <strong>29</strong> — different ring, same matrix node. Watch how compounds spiral outward while digital reduction keeps each ray coherent.',
      playFrom: 9, playTo: 19, highlight: [10, 11, 19]
    },
    {
      eyebrow: 'Chapter 4 of 7 · Deepening',
      title: 'Rings 3–4 — Compounds 20 through 39',
      body: '<strong>23</strong> reduces to <strong>5</strong> — explorer energy at a deeper octave. The fractal repeats: same spoke, same matrix node, greater compound weight.',
      playFrom: 19, playTo: 39, highlight: [20, 23, 33, 39]
    },
    {
      eyebrow: 'Chapter 5 of 7 · Mid Cycle',
      title: 'Rings 5–6 — Compounds 40 through 59',
      body: 'Structure and aliveness compound outward. <strong>44</strong> is a master builder frequency; <strong>55</strong> carries double freedom. Every decade adds depth without breaking the matrix map.',
      playFrom: 39, playTo: 59, highlight: [44, 50, 55, 59]
    },
    {
      eyebrow: 'Chapter 6 of 7 · Inner Mastery',
      title: 'Rings 7–8 — Compounds 60 through 79',
      body: 'Love, wisdom, and power at compound scale. <strong>77</strong> doubles the seeker; <strong>88</strong> doubles material mastery — each still reduces to a single matrix node.',
      playFrom: 59, playTo: 79, highlight: [66, 77, 88]
    },
    {
      eyebrow: 'Chapter 7 of 7 · Full Cycle',
      title: 'Rings 9–10 — Completion 80 through 99',
      body: 'The outer arc completes 0→99. <strong>99</strong> is universal service at maximum compound depth. <a href="/calculator/">Calculate your blueprint</a> to see which positions you inhabit in both views.',
      playFrom: 79, playTo: 99, highlight: [90, 99]
    }
  ];

  var MILESTONE_COPY = {
    9: 'Ring 1 complete — nine pure archetypes mapped.',
    19: 'Ring 2 complete — first compound decade integrated.',
    29: 'Ring 3 complete — the 20s octave integrated.',
    39: 'Ring 4 complete — first full compound cycle through 39.',
    49: 'Ring 5 complete — structural compounds through the 40s.',
    59: 'Ring 6 complete — aliveness compounds through the 50s.',
    69: 'Ring 7 complete — love compounds through the 60s.',
    79: 'Ring 8 complete — wisdom compounds through the 70s.',
    89: 'Ring 9 complete — power compounds through the 80s.',
    99: 'Full spiral — 0 through 99. Every point reduces to the matrix.'
  };

  var journey = { active: false, idx: 0 };
  var container, panel, journeyPanel, spokeEls, nodeEls;
  var selectedNum = null;

  function rootOf(n) {
    if (typeof window.getCodexRoot === 'function') return window.getCodexRoot(n);
    var x = parseInt(n, 10);
    while (x > 9) {
      x = String(x).split('').reduce(function (a, d) { return a + parseInt(d, 10); }, 0);
    }
    return x;
  }

  function ringOf(n) {
    return typeof window.getSpiralRing === 'function' ? window.getSpiralRing(n) : 0;
  }

  function spokeOf(n) {
    return typeof window.getSpiralSpoke === 'function' ? window.getSpiralSpoke(n) : -1;
  }

  function nodeCopy(n) {
    n = parseInt(n, 10);
    var compounds = window.COMPOUND_DESC || {};
    if (n >= 10 && compounds[n]) return compounds[n];
    var root = rootOf(n);
    var meta = (window.CODEX_NODES || {})[String(root)] || {};
    if (n >= 10) {
      return (meta.body || '') + ' At this octave the ' + root + ' frequency carries compound weight — same matrix node, deeper expression.';
    }
    if (n === 0) {
      return (window.CODEX_NODES || {})['0'] ? window.CODEX_NODES['0'].body : 'Pure awareness before number.';
    }
    return meta.body || '';
  }

  function matrixMini(root) {
    var positions = {
      '1': [0, 0], '2': [0, 1], '3': [0, 2],
      '4': [1, 0], '5': [1, 1], '6': [1, 2],
      '7': [2, 0], '8': [2, 1], '9': [2, 2]
    };
    var r = String(root);
    if (r === '0') {
      return '<div class="cdx-spiral-matrix-mini cdx-spiral-matrix-mini--void"><span>0 · Void</span></div>';
    }
    var pos = positions[r];
    if (!pos) return '';
    var cells = [];
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        var active = pos[0] === row && pos[1] === col;
        cells.push('<div class="cdx-spiral-matrix-cell' + (active ? ' is-active' : '') + '">' + (active ? r : '') + '</div>');
      }
    }
    return '<div class="cdx-spiral-matrix-mini">' + cells.join('') + '</div>';
  }

  function highlightSpoke(n) {
    if (!spokeEls || !spokeEls.length) return;
    var slot = spokeOf(n);
    var root = rootOf(n);
    spokeEls.forEach(function (line, i) {
      line.classList.toggle('is-active-spoke', n !== 0 && i === slot);
    });
    if (container) {
      container.querySelectorAll('.cdx-spiral-root-ray').forEach(function (path) {
        path.classList.toggle('is-active-spoke', n !== 0 && parseInt(path.getAttribute('data-root'), 10) === root);
      });
    }
  }

  function highlightNodes(nums) {
    if (!nodeEls) return;
    nodeEls.forEach(function (el) {
      var num = parseInt(el.getAttribute('data-num'), 10);
      el.classList.toggle('is-selected', selectedNum === num);
      el.classList.toggle('is-journey-highlight', nums && nums.indexOf(num) !== -1);
    });
  }

  function sameSpokeNums(n) {
    n = parseInt(n, 10);
    var root = rootOf(n);
    var max = window.SPIRAL_MAX || 99;
    var out = [];
    for (var i = 1; i <= max; i++) {
      if (i !== n && rootOf(i) === root) out.push(i);
    }
    return out;
  }

  function renderPanel(n) {
    if (!panel) return;
    selectedNum = n;
    n = parseInt(n, 10);
    var root = rootOf(n);
    var ring = ringOf(n);
    var meta = (window.CODEX_NODES || {})[String(root)] || {};
    var ringMeta = RING_META[ring] || {};
    var placement = typeof window.getCodexPlacement === 'function' ? window.getCodexPlacement(root) : '';
    var links = (meta.links || []).map(function (l) {
      return '<a href="' + l.href + '">' + l.label + '</a>';
    }).join(' · ');

    panel.innerHTML =
      '<div class="cdx-spiral-learn-num" style="color:' + (NATURE_COLOR[natureOf(root)] || '#F5C842') + '">' + n + '</div>' +
      '<div class="cdx-spiral-learn-ring">' + ringMeta.label + '</div>' +
      '<div class="cdx-spiral-learn-root">Reduces to <strong>' + root + '</strong> · ' + (meta.name || 'Matrix node') + '</div>' +
      (placement ? '<div class="cdx-spiral-learn-placement">' + placement + ' · ' + (meta.essence || '') + '</div>' : '') +
      matrixMini(root) +
      '<p class="cdx-spiral-learn-body">' + nodeCopy(n) + '</p>' +
      '<p class="cdx-spiral-learn-lesson"><em>' + ringMeta.lesson + '</em></p>' +
      (n > 0 && spokeOf(n) >= 0 ? '<p class="cdx-spiral-learn-spoke">Same root ray as ' + sameSpokeNums(n).join(', ') + ' — all reduce to matrix node ' + root + '.</p>' : '') +
      '<div class="cdx-spiral-learn-actions">' +
        (root !== undefined ? '<button type="button" class="cdx-spiral-btn" id="cdx-spiral-matrix-bridge">See in Matrix</button>' : '') +
        (links ? '<span class="cdx-spiral-learn-links">' + links + '</span>' : '') +
      '</div>' +
      '<p class="cdx-spiral-learn-more"><a href="/blog/evolution-of-energy-0-through-9/">Evolution of Energy</a> · <a href="/blog/codex-architecture-consciousness-matrix/">Codex Architecture</a></p>';

    var bridge = document.getElementById('cdx-spiral-matrix-bridge');
    if (bridge) {
      bridge.addEventListener('click', function () { bridgeToMatrix(root); });
    }

    highlightSpoke(n);
    highlightNodes(null);
    var sel = nodeEls && nodeEls.find(function (el) { return parseInt(el.getAttribute('data-num'), 10) === n; });
    if (sel) sel.classList.add('is-selected');
  }

  function showRingMilestone(n) {
    if (!panel) return;
    var copy = MILESTONE_COPY[n];
    if (!copy) return;
    panel.innerHTML =
      '<div class="cdx-spiral-learn-milestone">' +
        '<div class="cdx-spiral-learn-ring">Milestone · ' + n + '</div>' +
        '<p class="cdx-spiral-learn-body">' + copy + '</p>' +
        '<button type="button" class="cdx-spiral-btn" id="cdx-spiral-resume">Continue &#9654;</button>' +
      '</div>';
    var btn = document.getElementById('cdx-spiral-resume');
    if (btn) {
      btn.addEventListener('click', function () {
        if (container && typeof container._resumePlayback === 'function') container._resumePlayback();
      });
    }
  }

  function bridgeToMatrix(rootNum) {
    if (typeof window.setCodexView === 'function') window.setCodexView('matrix', false);
    setTimeout(function () {
      if (typeof window.pinCodexNode === 'function') window.pinCodexNode(String(rootNum));
    }, 120);
  }

  function renderJourneyChapter(idx) {
    if (!journeyPanel) return;
    var ch = SPIRAL_CHAPTERS[idx];
    if (!ch) return;
    journeyPanel.hidden = false;
    journeyPanel.innerHTML =
      '<div class="cdx-spiral-journey-eyebrow">' + ch.eyebrow + '</div>' +
      '<h3 class="cdx-spiral-journey-title">' + ch.title + '</h3>' +
      '<div class="cdx-spiral-journey-body">' + ch.body + '</div>' +
      '<div class="cdx-spiral-journey-nav">' +
        '<button type="button" class="cdx-spiral-btn" id="cdx-spiral-journey-back"' + (idx === 0 ? ' disabled' : '') + '>&#8249; Back</button>' +
        '<button type="button" class="cdx-spiral-btn" id="cdx-spiral-journey-next">' + (idx >= SPIRAL_CHAPTERS.length - 1 ? 'Finish' : 'Next &#8250;') + '</button>' +
        '<button type="button" class="cdx-spiral-btn cdx-spiral-journey-exit" id="cdx-spiral-journey-exit">Exit</button>' +
      '</div>';

    document.getElementById('cdx-spiral-journey-back').addEventListener('click', function () {
      if (idx > 0) goChapter(idx - 1);
    });
    document.getElementById('cdx-spiral-journey-next').addEventListener('click', function () {
      if (idx >= SPIRAL_CHAPTERS.length - 1) exitJourney();
      else goChapter(idx + 1);
    });
    document.getElementById('cdx-spiral-journey-exit').addEventListener('click', exitJourney);

    highlightNodes(ch.highlight);
    if (ch.playFrom !== undefined && container && typeof container._playRange === 'function') {
      container._playRange(ch.playFrom, ch.playTo, { bigBang: idx === 0, milestones: false });
    }
    if (ch.highlight && ch.highlight.length) renderPanel(ch.highlight[0]);
  }

  function goChapter(idx) {
    journey.idx = idx;
    renderJourneyChapter(idx);
  }

  function startJourney() {
    journey.active = true;
    window._spiralJourneyActive = true;
    var page = document.getElementById('page-codex');
    if (page) page.classList.add('cdx-spiral-journey-active');
    var launch = document.getElementById('cdx-spiral-journey-launch');
    if (launch) launch.hidden = true;
    goChapter(0);
  }

  function exitJourney() {
    journey.active = false;
    window._spiralJourneyActive = false;
    var page = document.getElementById('page-codex');
    if (page) page.classList.remove('cdx-spiral-journey-active');
    if (journeyPanel) journeyPanel.hidden = true;
    var launch = document.getElementById('cdx-spiral-journey-launch');
    if (launch) launch.hidden = false;
    highlightNodes(null);
    if (container && typeof container._stopSpiral === 'function') container._stopSpiral();
    if (container && typeof container._resetSpiral === 'function') container._resetSpiral();
    else if (container && typeof container._showAll === 'function') container._showAll();
    renderPanel(0);
  }

  function onDocKeydown(e) {
    if (!journey.active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      exitJourney();
    } else if (e.key === 'ArrowRight' && journey.idx < SPIRAL_CHAPTERS.length - 1) {
      e.preventDefault();
      goChapter(journey.idx + 1);
    } else if (e.key === 'ArrowLeft' && journey.idx > 0) {
      e.preventDefault();
      goChapter(journey.idx - 1);
    }
  }

  function bindNodeInteractions() {
    if (!nodeEls) return;
    nodeEls.forEach(function (el) {
      var num = el.getAttribute('data-num');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Spiral number ' + num);
      el.style.cursor = 'pointer';
      el.addEventListener('click', function () { renderPanel(num); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          renderPanel(num);
        }
      });
    });
  }

  function initCodexSpiralLearn(spiralContainer, opts) {
    if (!spiralContainer || spiralContainer.dataset.learnInit === '1') return;
    spiralContainer.dataset.learnInit = '1';
    container = spiralContainer;
    nodeEls = opts.nodeEls || [];
    spokeEls = opts.spokeEls || [];

    panel = document.getElementById('cdx-spiral-learn-panel');
    journeyPanel = document.getElementById('cdx-spiral-journey-panel');

    bindNodeInteractions();

    var launch = document.getElementById('cdx-spiral-journey-launch');
    if (launch) {
      launch.addEventListener('click', startJourney);
    }

    document.addEventListener('keydown', onDocKeydown);

    spiralContainer._showSpiralNode = renderPanel;
    spiralContainer._showSpiralRingMilestone = showRingMilestone;
    spiralContainer._runSpiralChapter = goChapter;

    window._showSpiralRingMilestone = showRingMilestone;
    window._spiralJourneyActive = false;
    window._exitSpiralJourney = exitJourney;

    renderPanel(0);
  }

  window.initCodexSpiralLearn = initCodexSpiralLearn;
  window.SPIRAL_RING_MILESTONES = [9, 19, 29, 39, 49, 59, 69, 79, 89, 99];
})();
