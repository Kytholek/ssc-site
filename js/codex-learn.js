/**
 * Codex Learn — interactive learning layer for the Codex page.
 *  · Guided Journey mode (Void → Circuit → Alternator → Singularity → Presence)
 *  · Keyboard navigation, node-card prev/next, ?node= deep links, tap hint
 */
(function () {
  'use strict';

  var SVG_NS  = 'http://www.w3.org/2000/svg';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Node centres in the 460×500 matrix viewBox */
  var NODE_XY = {
    '0': [76, 96],   '1': [150, 130], '2': [310, 130], '3': [230, 60],
    '4': [80, 250],  '5': [380, 250], '6': [230, 440], '7': [150, 370],
    '8': [310, 370], '9': [230, 250]
  };
  var FLOW_ORDER = ['1', '2', '4', '8', '7', '5', '3', '6', '9', '0'];

  var COLOR = { electric: '#fbbf24', magnetic: '#67e8f9', aetheric: '#c084fc', voidc: '#C0C0E0' };
  function natureOf(num) {
    if (num === '9') return 'aetheric';
    if (num === '0') return 'voidc';
    return (Number(num) % 2 === 1) ? 'electric' : 'magnetic';
  }
  function colorOf(num) { return COLOR[natureOf(num)]; }

  function sumDigits(n) {
    var s = 0, str = String(n);
    for (var i = 0; i < str.length; i++) s += Number(str[i]);
    return s;
  }
  function digitalRoot(n) {
    while (n > 9) n = sumDigits(n);
    return n;
  }

  /* ══════════════════════════════════════════════════════════
     DOUBLING PULSE — used by Journey chapters 2–4
  ═══════════════════════════════════════════════════════════ */
  var trace = { running: false, timers: [], raf: null, seed: null };
  var _page, _svg, _pulse;

  function clearTimers() {
    trace.timers.forEach(clearTimeout);
    trace.timers = [];
    if (trace.raf) { cancelAnimationFrame(trace.raf); trace.raf = null; }
  }
  function later(fn, ms) { trace.timers.push(setTimeout(fn, ms)); }

  function ensurePulse() {
    if (_pulse && _pulse.parentNode) return _pulse;
    _pulse = document.createElementNS(SVG_NS, 'circle');
    _pulse.setAttribute('class', 'cdx-trace-pulse');
    _pulse.setAttribute('r', '7');
    _pulse.setAttribute('fill', COLOR.electric);
    _pulse.setAttribute('filter', 'url(#cdxfield-glow-soft)');
    _pulse.setAttribute('opacity', '0');
    _svg.appendChild(_pulse);
    return _pulse;
  }

  function setPulse(x, y, color, visible) {
    var p = ensurePulse();
    p.setAttribute('cx', x);
    p.setAttribute('cy', y);
    if (color) p.setAttribute('fill', color);
    p.setAttribute('opacity', visible ? '0.95' : '0');
  }

  function flashNode(num, ms) {
    var g = _page.querySelector('.cdxfield-node-group[data-num="' + num + '"]');
    if (!g) return;
    g.classList.add('cdx-trace-flash');
    later(function () { g.classList.remove('cdx-trace-flash'); }, ms || 620);
  }

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* Straight-line pulse travel between two nodes */
  function movePulseLine(from, to, dur, color, onDone) {
    if (REDUCED) { setPulse(to[0], to[1], color, true); onDone(); return; }
    var t0 = null;
    function frame(ts) {
      if (!trace.running) return;
      if (t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur);
      var e = easeInOut(t);
      setPulse(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, color, true);
      if (t < 1) trace.raf = requestAnimationFrame(frame);
      else onDone();
    }
    trace.raf = requestAnimationFrame(frame);
  }

  /* Pulse travel along one of the Tesla infinity paths (3 → 9 → 6) */
  function movePulsePath(pathEl, reverse, dur, color, onDone) {
    var len = 0;
    try { len = pathEl.getTotalLength(); } catch (e) { len = 0; }
    if (REDUCED || !len) {
      var end = reverse ? pathEl.getPointAtLength(0) : pathEl.getPointAtLength(len);
      setPulse(end.x, end.y, color, true);
      onDone();
      return;
    }
    var t0 = null;
    function frame(ts) {
      if (!trace.running) return;
      if (t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur);
      var e = easeInOut(t);
      var pt = pathEl.getPointAtLength(len * (reverse ? 1 - e : e));
      setPulse(pt.x, pt.y, color, true);
      if (t < 1) trace.raf = requestAnimationFrame(frame);
      else onDone();
    }
    trace.raf = requestAnimationFrame(frame);
  }

  function stopTrace() {
    trace.running = false;
    trace.seed = null;
    clearTimers();
    if (_pulse) _pulse.setAttribute('opacity', '0');
    if (_page) {
      _page.querySelectorAll('.cdxfield-node-group.cdx-trace-flash').forEach(function (g) {
        g.classList.remove('cdx-trace-flash');
      });
    }
  }

  function runSeed(seed) {
    if (!_page || !_svg) return;
    stopTrace();
    seed = String(digitalRoot(Number(seed) || 1));
    trace.running = true;
    trace.seed = seed;

    var isAlt  = (seed === '3' || seed === '6');
    var isNine = (seed === '9');

    var value = Number(seed);
    var root  = value;
    setPulse(NODE_XY[seed][0], NODE_XY[seed][1], colorOf(seed), true);
    flashNode(seed);

    var totalSteps = isNine ? 6 : isAlt ? 8 : 12;
    var stepIdx = 0;

    var infRight = _svg.querySelector('.cdxfield-tesla-inf-flow-right');
    var infLeft  = _svg.querySelector('.cdxfield-tesla-inf-flow-left');

    function nextStep() {
      if (!trace.running) return;
      if (stepIdx >= totalSteps) {
        later(function () {
          if (_pulse) _pulse.setAttribute('opacity', '0');
          trace.running = false;
        }, 900);
        return;
      }
      stepIdx++;
      value = value * 2;
      var prevRoot = String(root);
      root = digitalRoot(value);
      var nextRoot = String(root);
      var color = colorOf(nextRoot);

      function arrive() {
        if (!trace.running) return;
        flashNode(nextRoot);
        later(nextStep, REDUCED ? 620 : 320);
      }

      if (isNine) {
        if (!REDUCED) {
          var p = ensurePulse();
          p.setAttribute('r', '11');
          later(function () { p.setAttribute('r', '7'); }, 300);
        }
        later(arrive, REDUCED ? 0 : 360);
      } else if (isAlt && infRight && infLeft) {
        if (prevRoot === '3') movePulsePath(infRight, false, 1150, color, arrive);
        else movePulsePath(infLeft, true, 1150, color, arrive);
      } else {
        movePulseLine(NODE_XY[prevRoot], NODE_XY[nextRoot], 750, color, arrive);
      }
    }

    later(nextStep, REDUCED ? 620 : 700);
  }
  window._cdxStopTrace = stopTrace;

  /* ══════════════════════════════════════════════════════════
     JOURNEY MODE — the transformation of consciousness
  ═══════════════════════════════════════════════════════════ */
  var CHAPTERS = [
    {
      eyebrow: 'Chapter 1 of 5 \u00b7 The Void',
      title: '0 \u2014 Awareness Before Thought',
      body: 'Before the first number, there is the Void \u2014 the ring that holds the whole matrix. It is not a thing inside the pattern; it is the <strong>awareness the pattern appears in</strong>. The presence of the one watching \u2014 beyond the world, beyond thought. Every cycle begins here and returns here.',
      keep: ['.cdxfield-void-group', '.cdxfield-node-group[data-num="0"]'],
      onEnter: function () { stopTrace(); }
    },
    {
      eyebrow: 'Chapter 2 of 5 \u00b7 The Circuit of Matter',
      title: '1 \u00b7 2 \u00b7 4 \u00b7 8 \u00b7 7 \u00b7 5 \u2014 The Doubling Loop',
      body: 'Take any of these numbers and keep doubling: the digits always reduce back into the same six-step loop \u2014 <strong>1 \u2192 2 \u2192 4 \u2192 8 \u2192 7 \u2192 5 \u2192 1</strong>. This is the closed electromagnetic circuit of manifestation: energy becoming matter, cycling without end. Watch the current run \u2014 it never touches 3, 6 or 9.',
      keep: ['.cdxfield-double-path', '.cdxfield-node-group[data-num="1"]', '.cdxfield-node-group[data-num="2"]', '.cdxfield-node-group[data-num="4"]', '.cdxfield-node-group[data-num="8"]', '.cdxfield-node-group[data-num="7"]', '.cdxfield-node-group[data-num="5"]'],
      onEnter: function () { runSeed('1'); }
    },
    {
      eyebrow: 'Chapter 3 of 5 \u00b7 The Alternator',
      title: '3 \u2194 6 \u2014 Mind and Its Reflection',
      body: '<strong>3 is Mind</strong> \u2014 the realm of thought, where forms first arise. <strong>6 is the World</strong> \u2014 the reflection of those thoughts made visible. Double 3 and it becomes 6; double 6 and it returns to 3. They trade places forever: an <strong>alternating electromagnetic charge</strong>, thought pouring into world and world dissolving back into thought.',
      keep: ['.cdxfield-tesla-inf', '.cdxfield-polar-top', '.cdxfield-polar-bot', '.cdxfield-node-group[data-num="3"]', '.cdxfield-node-group[data-num="6"]'],
      onEnter: function () { runSeed('3'); }
    },
    {
      eyebrow: 'Chapter 4 of 5 \u00b7 The Singularity',
      title: '9 \u2014 The Still Centre',
      body: 'Double 9 and it is still 9. Add anything to 9 and the digits return unchanged. It is the <strong>central singularity all of this flows through and out from</strong> \u2014 the axis the alternator swings around, the portal between the circuit of matter and the Void. It moves nothing, and everything moves around it.',
      keep: ['.cdxfield-node-group[data-num="9"]'],
      onEnter: function () {
        runSeed('9');
        var g = _page.querySelector('.cdxfield-node-group[data-num="9"]');
        if (g) g.classList.add('is-active');
      },
      onExit: function () {
        var g = _page.querySelector('.cdxfield-node-group[data-num="9"]');
        if (g) g.classList.remove('is-active');
      }
    },
    {
      eyebrow: 'Chapter 5 of 5 \u00b7 Return to Presence',
      title: 'The One Watching the Pattern',
      body: 'Mind (3) reflects into World (6). Matter cycles (1\u00b72\u00b74\u00b78\u00b77\u00b75). Everything turns around the Singularity (9), inside the Void (0). You are not any single node \u2014 you are <strong>the awareness in which the whole pattern turns</strong>. See where your own numbers sit inside it: <a href="/#calculator" onclick="if(typeof showPage===\'function\'){event.preventDefault();showPage(\'calculator\');}">calculate your blueprint</a>.',
      keep: null,
      onEnter: function () { stopTrace(); }
    }
  ];

  var journey = { active: false, idx: 0, pendingStart: 0 };

  function svgTopLayers() {
    var out = [];
    var kids = _svg ? _svg.children : [];
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.tagName && el.tagName.toLowerCase() === 'defs') continue;
      if (el.classList && el.classList.contains('cdx-trace-pulse')) continue;
      out.push(el);
    }
    return out;
  }

  function applyChapterDim(keepSelectors) {
    var layers = svgTopLayers();
    var keep = [];
    if (keepSelectors) {
      keepSelectors.forEach(function (sel) {
        _svg.querySelectorAll(sel).forEach(function (el) {
          /* climb to the top-level layer that contains the match */
          var top = el;
          while (top.parentNode && top.parentNode !== _svg) top = top.parentNode;
          if (keep.indexOf(top) === -1) keep.push(top);
          if (keep.indexOf(el) === -1) keep.push(el);
        });
      });
    }
    layers.forEach(function (el) {
      el.style.transition = 'opacity .6s ease';
      if (!keepSelectors) { el.style.opacity = ''; return; }
      el.style.opacity = keep.indexOf(el) !== -1 ? '' : '0.08';
    });
  }

  function scrollMatrixIntoView() {
    var wrap = _page && _page.querySelector('#codex-spirit-wrap');
    if (!wrap) return;
    var rect = wrap.getBoundingClientRect();
    /* Keep the matrix visible while reading the chapter — align it under the fixed nav.
       scrollIntoView handles the site's body scroll container; offset via CSS scroll-margin-top. */
    if (rect.top < 60 || rect.top > 200) {
      wrap.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' });
    }
  }

  function renderChapter() {
    var ch = CHAPTERS[journey.idx];
    if (!ch) return;
    var eyebrow = document.getElementById('cdx-journey-eyebrow');
    var title   = document.getElementById('cdx-journey-title');
    var body    = document.getElementById('cdx-journey-body');
    var back    = document.getElementById('cdx-journey-back');
    var next    = document.getElementById('cdx-journey-next');
    var dots    = document.getElementById('cdx-journey-dots');
    if (eyebrow) eyebrow.textContent = ch.eyebrow;
    if (title)   title.textContent   = ch.title;
    if (body)    body.innerHTML      = ch.body;
    if (back)    back.disabled       = journey.idx === 0;
    if (next)    next.innerHTML      = journey.idx === CHAPTERS.length - 1 ? 'Finish \u2726' : 'Next \u203a';
    if (dots) {
      dots.innerHTML = '';
      CHAPTERS.forEach(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'cdx-journey-dot' + (i === journey.idx ? ' is-current' : '');
        d.setAttribute('aria-label', 'Go to chapter ' + (i + 1));
        d.addEventListener('click', function () { goChapter(i); });
        dots.appendChild(d);
      });
    }
    _page.setAttribute('data-journey-ch', String(journey.idx + 1));
    applyChapterDim(ch.keep);
    scrollMatrixIntoView();
    /* Construct-animation timers can fire late (throttled tabs) and overwrite the
       dim with opacity 1 — re-assert the chapter dim after they have all settled. */
    clearTimeout(journey._dimTimer);
    journey._dimTimer = setTimeout(function () {
      if (journey.active && CHAPTERS[journey.idx] === ch) applyChapterDim(ch.keep);
    }, 900);
    if (typeof ch.onEnter === 'function') ch.onEnter();
  }

  function goChapter(i) {
    if (!journey.active) return;
    var prev = CHAPTERS[journey.idx];
    if (prev && typeof prev.onExit === 'function') prev.onExit();
    stopTrace();
    journey.idx = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    renderChapter();
  }

  function startJourney(page) {
    if (!page) page = document.getElementById('page-codex');
    if (!page) return;
    initCodexLearn(page);
    if (journey.active) { goChapter(0); return; }

    /* let the construct animation play briefly, then complete it instantly so its
       staged timers cannot overwrite the journey's per-chapter dimming */
    var wrap = page.querySelector('#codex-spirit-wrap');
    var waited = 0;
    var token = ++journey.pendingStart;
    (function waitReady() {
      if (token !== journey.pendingStart) return; /* cancelled by exit or view switch */
      if (wrap && wrap.classList.contains('cdx-matrix-building') && waited < 1200) {
        waited += 200;
        setTimeout(waitReady, 200);
        return;
      }
      if (wrap && typeof wrap._finishMatrixConstruct === 'function') wrap._finishMatrixConstruct();
      journey.active = true;
      journey.idx = 0;
      page.classList.add('cdx-journey-active');
      if (typeof window.hudReset === 'function') window.hudReset();
      page.querySelectorAll('.node.pinned').forEach(function (n) { n.classList.remove('pinned'); });
      var panel = document.getElementById('cdx-journey-panel');
      if (panel) panel.hidden = false;
      renderChapter(); /* also scrolls the matrix into view */
    })();
  }

  function exitJourney() {
    journey.pendingStart++; /* cancel any start still waiting on the construct */
    if (!journey.active) return;
    var ch = CHAPTERS[journey.idx];
    if (ch && typeof ch.onExit === 'function') ch.onExit();
    journey.active = false;
    stopTrace();
    _page.classList.remove('cdx-journey-active');
    _page.removeAttribute('data-journey-ch');
    applyChapterDim(null);
    var panel = document.getElementById('cdx-journey-panel');
    if (panel) panel.hidden = true;
  }
  window._startCodexJourney = startJourney;
  window._exitCodexJourney  = exitJourney;

  /* ══════════════════════════════════════════════════════════
     KEYBOARD NAV + NODE-CARD PREV/NEXT
  ═══════════════════════════════════════════════════════════ */
  function pinNode(num) {
    var hit = _page && _page.querySelector('.codex-hit-node[data-num="' + num + '"]');
    if (!hit || typeof window.hudShow !== 'function') return;
    _page.querySelectorAll('.node.pinned').forEach(function (n) { n.classList.remove('pinned'); });
    hit.classList.add('pinned');
    window.hudShow(hit);
    hit.focus && hit.focus({ preventScroll: true });
  }
  window.pinCodexNode = pinNode;

  function currentPinnedNum() {
    var pinned = _page && _page.querySelector('.node.pinned');
    return pinned ? pinned.dataset.num : null;
  }

  function stepNode(dir) {
    var cur = currentPinnedNum();
    var idx = cur ? FLOW_ORDER.indexOf(cur) : -1;
    var next = FLOW_ORDER[(idx + dir + FLOW_ORDER.length) % FLOW_ORDER.length];
    pinNode(next);
  }
  window._cdxStepNode = stepNode;

  function anyModalOpen() {
    return !!document.querySelector('#modal-666.open, #modal-369.open, #modal-alternator.open, .pattern-modal-backdrop.open');
  }

  function bindKeyboard() {
    if (document.documentElement.dataset.cdxLearnKeys === '1') return;
    document.documentElement.dataset.cdxLearnKeys = '1';
    /* Capture phase: run before app.js's Escape handler closes modals */
    document.addEventListener('keydown', function (e) {
      var page = document.getElementById('page-codex');
      if (!page || !page.classList.contains('active')) return;
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        if (anyModalOpen()) return; /* app.js closes modals */
        if (journey.active) { exitJourney(); return; }
        page.querySelectorAll('.node.pinned').forEach(function (n) { n.classList.remove('pinned'); });
        if (typeof window.hudReset === 'function') window.hudReset();
        stopTrace();
        return;
      }
      if (anyModalOpen()) return;
      if (e.key >= '0' && e.key <= '9') { pinNode(e.key); return; }
      /* Arrows only cycle once a node is pinned — otherwise leave scrolling alone */
      if (!currentPinnedNum()) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); stepNode(1); return; }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); stepNode(-1); return; }
    }, true);
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function initCodexLearn(page) {
    if (!page) page = document.getElementById('page-codex');
    if (!page || page.dataset.cdxLearnInit === '1') return;
    page.dataset.cdxLearnInit = '1';

    _page    = page;
    _svg     = page.querySelector('.codex-spirit-svg');

    /* Journey */
    var launch = document.getElementById('cdx-journey-launch');
    if (launch) launch.addEventListener('click', function () {
      if (typeof window.setCodexView === 'function') window.setCodexView('journey', true);
      else startJourney(page);
    });
    var jBack = document.getElementById('cdx-journey-back');
    var jNext = document.getElementById('cdx-journey-next');
    var jExit = document.getElementById('cdx-journey-exit');
    if (jBack) jBack.addEventListener('click', function () { goChapter(journey.idx - 1); });
    if (jNext) jNext.addEventListener('click', function () {
      if (journey.idx >= CHAPTERS.length - 1) exitJourney();
      else goChapter(journey.idx + 1);
    });
    if (jExit) jExit.addEventListener('click', exitJourney);

    /* Accessibility on hit nodes */
    var names = window.CODEX_NODES || {};
    page.querySelectorAll('.codex-hit-node').forEach(function (hit) {
      var num = hit.dataset.num;
      hit.setAttribute('tabindex', '0');
      hit.setAttribute('role', 'button');
      var meta = names[num];
      hit.setAttribute('aria-label', 'Node ' + num + (meta && meta.name ? ' \u2014 ' + meta.name : ''));
      hit.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit.click(); }
      });
    });

    /* Node-card prev/next (node-card gets moved to <body> by initCodexPage) */
    var prevBtn = document.getElementById('nc-prev');
    var nextBtn = document.getElementById('nc-next');
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); stepNode(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); stepNode(1); });

    /* Stop traces when leaving the matrix (tab switch or page hide) */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopTrace();
    });

    bindKeyboard();

    /* Deep link: /codex/?node=3 pins a node after the construct settles */
    try {
      var params = new URLSearchParams(window.location.search);
      var dn = params.get('node');
      var onCodex = /codex/.test(window.location.pathname) || params.get('page') === 'codex';
      if (dn && NODE_XY[dn] && onCodex) {
        setTimeout(function () { pinNode(dn); }, 1800);
      }
    } catch (e) { /* URLSearchParams unavailable — skip deep link */ }

    /* First-visit tap hint on touch devices */
    try {
      var hint = document.getElementById('cdx-tap-hint');
      var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (hint && coarse && !localStorage.getItem('cdxTapHintSeen')) {
        setTimeout(function () { hint.classList.add('show'); }, 2200);
        var dismiss = function () {
          hint.classList.remove('show');
          try { localStorage.setItem('cdxTapHintSeen', '1'); } catch (e2) {}
        };
        page.querySelectorAll('.codex-hit-node').forEach(function (hit) {
          hit.addEventListener('click', dismiss, { once: true });
        });
        setTimeout(dismiss, 12000);
      }
    } catch (e) { /* localStorage unavailable — skip hint */ }
  }
  window.initCodexLearn = initCodexLearn;
})();
