/**
 * Codex Spiral Learn — educational panel and matrix bridge
 */
(function () {
  'use strict';

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

  var container, panel, spokeEls, nodeEls;
  var selectedNum = null;

  function natureOf(root) {
    if (root === 9) return 'aetheric';
    if (root === 0) return 'voidc';
    return (Number(root) % 2 === 1) ? 'electric' : 'magnetic';
  }

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
    if (nodeEls) {
      nodeEls.forEach(function (el) {
        el.classList.toggle('is-selected', parseInt(el.getAttribute('data-num'), 10) === n);
        el.classList.remove('is-journey-highlight');
      });
    }
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

    bindNodeInteractions();

    spiralContainer._showSpiralNode = renderPanel;
    spiralContainer._showSpiralRingMilestone = showRingMilestone;
    window._showSpiralRingMilestone = showRingMilestone;

    renderPanel(0);
  }

  window.initCodexSpiralLearn = initCodexSpiralLearn;
  window.SPIRAL_RING_MILESTONES = [9, 19, 29, 39, 49, 59, 69, 79, 89, 99];
})();
