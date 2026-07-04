/**
 * Numerical Spiral (0–99) — Codex view
 * Sequence 0→99 winds outward; each number sits on its root ray at a spiral layer.
 */
function initCodexSpiral(container) {
  if (!container || container.dataset.initialized === '1') return;

  var svg      = container.querySelector('.cdx-spiral-svg');
  var bangG    = container.querySelector('.cdx-spiral-bang-layer');
  var spokeG   = container.querySelector('.cdx-spiral-spokes');
  var ringG    = container.querySelector('.cdx-spiral-rings');
  var ringLabelG = container.querySelector('.cdx-spiral-ring-labels');
  var nodeG    = container.querySelector('.cdx-spiral-nodes');
  var ap       = container.querySelector('.cdx-spiral-arc');
  var flashEl  = container.querySelector('.cdx-spiral-bang-flash');
  var btnPlay  = container.querySelector('[data-spiral-action="play"]');
  var btnReset = container.querySelector('[data-spiral-action="reset"]');

  if (!svg || !spokeG || !ringG || !nodeG || !ap || !btnPlay || !btnReset) return;

  var MAX_N = window.SPIRAL_MAX || 99;
  var CX = 420;
  var CY = 420;
  var RING_INNER = 64;
  var MAX_TURN = Math.floor((MAX_N - 1) / 9);
  var MAX_RADIUS = 378;
  var RING_STEP = (MAX_RADIUS - RING_INNER) / Math.max(1, MAX_TURN);
  var RADII = [0];
  for (var ri = 0; ri <= MAX_TURN; ri++) {
    RADII[ri] = RING_INNER + ri * RING_STEP;
  }
  var SPOKE_LEN = RADII[MAX_TURN] + 10;
  var NS = 'http://www.w3.org/2000/svg';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MILESTONES = window.SPIRAL_RING_MILESTONES || [9, 19, 29, 39, 49, 59, 69, 79, 89, 99];
  var RING_LABELS = [
    '1–9', '10–18', '19–27', '28–36', '37–45',
    '46–54', '55–63', '64–72', '73–81', '82–90', '91–99'
  ];
  var SPOKE_COUNT = 9;
  var SPOKE_DEG = 360 / SPOKE_COUNT;
  var ringR = [18, 15, 14, 13, 12, 11, 10, 10, 9, 9, 8, 8];
  var ringFS = [13, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7, 6];

  function spiralRoot(n) {
    if (typeof window.getCodexRoot === 'function') return window.getCodexRoot(n);
    var x = n;
    while (x > 9) {
      x = String(x).split('').reduce(function (a, d) { return a + parseInt(d, 10); }, 0);
    }
    return x;
  }

  function slotAngle(slot) { return (-90 + slot * SPOKE_DEG) * Math.PI / 180; }

  function spiralTurn(n) {
    if (typeof window.getSpiralTurn === 'function') return window.getSpiralTurn(n);
    if (n <= 0) return -1;
    return Math.floor((n - 1) / 9);
  }

  function nodePos(n) {
    if (n === 0) return { x: 0, y: 0, ring: 0, turn: -1, root: 0, a: 0, rad: 0 };
    var root = spiralRoot(n);
    var turn = spiralTurn(n);
    var rad = RADII[turn];
    var a = slotAngle(root - 1);
    return {
      x: Math.cos(a) * rad,
      y: Math.sin(a) * rad,
      ring: turn + 1,
      turn: turn,
      root: root,
      a: a,
      rad: rad
    };
  }

  var pts = [];
  for (var n = 0; n <= MAX_N; n++) {
    var p = nodePos(n);
    pts.push({ x: p.x, y: p.y, ring: p.ring, label: String(n), n: n, root: p.root, turn: p.turn, a: p.a, rad: p.rad });
  }

  function extrapolate(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function buildEnergyPath(coords) {
    if (coords.length < 2) return '';
    var world = coords.map(function(p) { return { x: CX + p.x, y: CY + p.y, ring: p.ring, n: p.n }; });
    var lead = extrapolate(world[0], world[1], -0.42);
    var tail = extrapolate(world[world.length - 2], world[world.length - 1], 1.28);
    var extended = [lead].concat(world, [tail]);
    var tension = 0.72;
    var d = 'M ' + world[0].x.toFixed(1) + ' ' + world[0].y.toFixed(1);

    for (var i = 1; i < world.length; i++) {
      var p0 = extended[i - 1];
      var p1 = world[i - 1];
      var p2 = world[i];
      var p3 = extended[i + 2] || tail;
      var seg = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      var outBias = p2.ring > p1.ring ? 0.16 : 0.08;
      var c1x = (p2.x - p0.x);
      var c1y = (p2.y - p0.y);
      var c2x = (p3.x - p1.x);
      var c2y = (p3.y - p1.y);
      var radial1 = { x: p1.x - CX, y: p1.y - CY };
      var radial2 = { x: p2.x - CX, y: p2.y - CY };
      var rlen1 = Math.hypot(radial1.x, radial1.y) || 1;
      var rlen2 = Math.hypot(radial2.x, radial2.y) || 1;
      var cp1 = {
        x: p1.x + c1x * tension / 6 + (radial1.x / rlen1) * seg * outBias,
        y: p1.y + c1y * tension / 6 + (radial1.y / rlen1) * seg * outBias
      };
      var cp2 = {
        x: p2.x - c2x * tension / 6 + (radial2.x / rlen2) * seg * outBias * 0.45,
        y: p2.y - c2y * tension / 6 + (radial2.y / rlen2) * seg * outBias * 0.45
      };
      d += ' C ' + cp1.x.toFixed(1) + ' ' + cp1.y.toFixed(1) + ',' +
            cp2.x.toFixed(1) + ' ' + cp2.y.toFixed(1) + ',' +
            p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }

  RADII.forEach(function (r, i) {
    if (i === 0) return;
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', CX);
    c.setAttribute('cy', CY);
    c.setAttribute('r', r);
    c.setAttribute('stroke-width', '0.5');
    c.classList.add('cdx-spiral-ring-guide');
    ringG.appendChild(c);

    var labelIdx = i - 1;
    if (ringLabelG && (labelIdx === 0 || labelIdx % 2 === 1 || labelIdx === RING_LABELS.length - 1)) {
      var lbl = document.createElementNS(NS, 'text');
      lbl.setAttribute('x', CX + r + 4);
      lbl.setAttribute('y', CY);
      lbl.setAttribute('class', 'cdx-spiral-ring-label');
      lbl.textContent = RING_LABELS[labelIdx] || '';
      ringLabelG.appendChild(lbl);
    }
  });

  var spokeEls = [];
  for (var s = 0; s < SPOKE_COUNT; s++) {
    var rootNum = s + 1;
    var rootPts = pts.filter(function (p) { return p.root === rootNum; });
    if (!rootPts.length) continue;
    rootPts.sort(function (a, b) { return a.n - b.n; });
    var outer = rootPts[rootPts.length - 1];
    var a = slotAngle(s);
    var x2 = CX + Math.cos(a) * (outer.rad + 6);
    var y2 = CY + Math.sin(a) * (outer.rad + 6);
    var line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', CX);
    line.setAttribute('y1', CY);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke-width', '0.5');
    line.setAttribute('data-spoke', String(rootNum));
    line.setAttribute('data-root', String(rootNum));
    line.classList.add('cdx-spiral-spoke');
    spokeG.appendChild(line);
    spokeEls.push(line);

    var rootPath = document.createElementNS(NS, 'path');
    var pd = rootPts.map(function (p, idx) {
      var wx = CX + p.x;
      var wy = CY + p.y;
      return (idx === 0 ? 'M' : 'L') + ' ' + wx.toFixed(1) + ' ' + wy.toFixed(1);
    }).join(' ');
    rootPath.setAttribute('d', pd);
    rootPath.setAttribute('fill', 'none');
    rootPath.setAttribute('stroke-width', '0.35');
    rootPath.setAttribute('data-root', String(rootNum));
    rootPath.classList.add('cdx-spiral-root-ray');
    spokeG.appendChild(rootPath);
  }

  ap.setAttribute('d', buildEnergyPath(pts));

  var halo = document.createElementNS(NS, 'circle');
  halo.setAttribute('cx', CX);
  halo.setAttribute('cy', CY);
  halo.setAttribute('r', SPOKE_LEN + 6);
  halo.setAttribute('fill', 'url(#cdx-spiral-field-halo)');
  halo.setAttribute('pointer-events', 'none');
  ringG.appendChild(halo);

  function ringColorClass(ring) {
    if (ring === 0) return 'r0';
    return 'r' + (((ring - 1) % 4) + 1);
  }

  var nodeEls = [];

  pts.forEach(function(p) {
    var wx = CX + p.x;
    var wy = CY + p.y;
    var ring = p.ring || 0;
    var rc = ringColorClass(ring);
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'cdx-spiral-node');
    g.setAttribute('data-num', String(p.n));
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', wx);
    c.setAttribute('cy', wy);
    c.setAttribute('r', ringR[ring] || 7);
    c.setAttribute('stroke-width', ring <= 1 ? '1.5' : '1.2');
    c.classList.add('cdx-spiral-node-' + rc + 'c');
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', wx);
    t.setAttribute('y', wy);
    t.setAttribute('font-size', ringFS[ring] || 6);
    t.classList.add('cdx-spiral-node-label');
    t.classList.add('cdx-spiral-node-' + rc + 't');
    t.textContent = p.label;
    g.appendChild(c);
    g.appendChild(t);
    nodeG.appendChild(g);
    nodeEls.push(g);
  });

  var totalLen = 0;
  try { totalLen = ap.getTotalLength(); } catch (e) { totalLen = 9000; }

  ap.style.strokeDasharray = totalLen;
  ap.style.strokeDashoffset = '0';
  nodeEls.forEach(function(el) { el.style.opacity = '1'; });

  var raf = null;
  var particleRaf = null;
  var t0 = null;
  var running = false;
  var paused = false;
  var resumeCallback = null;
  var pauseProgress = null;
  var playOpts = {
    fromIdx: 0,
    toIdx: MAX_N,
    useMilestones: false,
    bigBang: true
  };
  var DUR_FULL = 14000;

  function segmentDuration(fromIdx, toIdx) {
    var span = Math.max(1, toIdx - fromIdx + 1);
    return DUR_FULL * (span / pts.length);
  }

  function pathOffsetForIndex(idx) {
    return (idx / Math.max(1, pts.length - 1)) * totalLen;
  }

  function applyFrame(fromIdx, toIdx, progress) {
    var span = Math.max(0, toIdx - fromIdx);
    var visibleIdx = Math.min(toIdx, Math.round(fromIdx + progress * span));
    var drawn = pathOffsetForIndex(fromIdx + progress * span);
    ap.style.strokeDashoffset = (totalLen - drawn).toFixed(1);
    nodeEls.forEach(function(el, i) {
      if (i < fromIdx) {
        el.style.opacity = '0';
        el.style.transition = 'none';
        return;
      }
      if (i <= visibleIdx) {
        el.style.transition = 'opacity 0.35s ease';
        el.style.opacity = '1';
      } else {
        el.style.transition = 'none';
        el.style.opacity = '0';
      }
    });
    return visibleIdx;
  }

  function showAll() {
    ap.style.strokeDashoffset = '0';
    nodeEls.forEach(function(el) {
      el.style.opacity = '1';
      el.style.transition = 'none';
    });
  }

  function hideAll() {
    ap.style.strokeDashoffset = String(totalLen);
    nodeEls.forEach(function(el) {
      el.style.opacity = '0';
      el.style.transition = 'none';
    });
  }

  function resetVisual() {
    ap.style.strokeDashoffset = String(totalLen);
    nodeEls.forEach(function(el, i) {
      el.style.transition = 'none';
      el.style.opacity = i === 0 ? '1' : '0';
    });
    if (bangG) bangG.innerHTML = '';
    if (flashEl) flashEl.classList.remove('is-active');
  }

  function ease(x) {
    return x < 0.5
      ? 4 * x * x * x
      : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function checkMilestone(visibleIdx) {
    if (!playOpts.useMilestones || reducedMotion || paused) return false;
    var n = pts[visibleIdx] ? pts[visibleIdx].n : visibleIdx;
    if (MILESTONES.indexOf(n) === -1) return false;
    if (visibleIdx < playOpts.fromIdx || visibleIdx > playOpts.toIdx) return false;
    if (visibleIdx === playOpts.fromIdx) return false;
    return true;
  }

  function tick(ts) {
    if (paused) return;
    if (!t0) t0 = ts;
    var fromIdx = playOpts.fromIdx;
    var toIdx = playOpts.toIdx;
    var dur = segmentDuration(fromIdx, toIdx);
    var raw = Math.min((ts - t0) / dur, 1);
    var e = ease(raw);
    var visibleIdx = applyFrame(fromIdx, toIdx, e);

    if (checkMilestone(visibleIdx) && raw < 1) {
      paused = true;
      running = false;
      pauseProgress = raw;
      btnPlay.textContent = '\u25B6 Play';
      var milestone = pts[visibleIdx].n;
      if (typeof container._showSpiralRingMilestone === 'function') {
        container._showSpiralRingMilestone(milestone);
      }
      if (typeof container._showSpiralNode === 'function') {
        container._showSpiralNode(milestone);
      }
      resumeCallback = function () {
        paused = false;
        running = true;
        btnPlay.textContent = '\u25A0 Stop';
        t0 = performance.now() - (pauseProgress || 0) * dur;
        pauseProgress = null;
        raf = requestAnimationFrame(tick);
      };
      return;
    }

    if (raw < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      applyFrame(fromIdx, toIdx, 1);
      running = false;
      btnPlay.textContent = '\u25B6 Play';
      if (playOpts.onComplete) playOpts.onComplete();
    }
  }

  function pulseRings() {
    ringG.querySelectorAll('circle').forEach(function(c, i) {
      c.style.transition = 'opacity .5s ease, stroke-width .5s ease';
      c.style.opacity = '0.45';
      c.style.strokeWidth = '1.4';
      setTimeout(function() {
        c.style.opacity = '';
        c.style.strokeWidth = '';
      }, 420 + i * 60);
    });
  }

  function playBigBang() {
    if (reducedMotion) return;

    if (flashEl) {
      flashEl.classList.remove('is-active');
      void flashEl.offsetWidth;
      flashEl.classList.add('is-active');
    }

    if (bangG) {
      bangG.innerHTML = '';
      var core = document.createElementNS(NS, 'circle');
      core.setAttribute('cx', CX);
      core.setAttribute('cy', CY);
      core.setAttribute('r', 22);
      core.classList.add('cdx-spiral-bang-core');
      bangG.appendChild(core);
      requestAnimationFrame(function() { core.classList.add('is-active'); });

      [0, 1, 2].forEach(function(i) {
        var shock = document.createElementNS(NS, 'circle');
        shock.setAttribute('cx', CX);
        shock.setAttribute('cy', CY);
        shock.setAttribute('r', 24 + i * 14);
        shock.classList.add('cdx-spiral-bang-shock');
        shock.style.animationDelay = (i * 0.1) + 's';
        bangG.appendChild(shock);
        requestAnimationFrame(function() { shock.classList.add('is-active'); });
      });

      var particles = [];
      for (var i = 0; i < 28; i++) {
        var p = document.createElementNS(NS, 'circle');
        p.setAttribute('cx', CX);
        p.setAttribute('cy', CY);
        p.setAttribute('r', 1 + Math.random() * 2);
        p.setAttribute('fill', i % 3 === 0 ? '#F5C842' : (i % 3 === 1 ? '#AFA9EC' : '#fffef0'));
        bangG.appendChild(p);
        particles.push({
          el: p,
          angle: (i / 28) * Math.PI * 2 + Math.random() * 0.4,
          speed: 2.2 + Math.random() * 3.5,
          life: 0,
          maxLife: 28 + Math.random() * 18
        });
      }

      if (particleRaf) cancelAnimationFrame(particleRaf);
      function particleTick() {
        var alive = false;
        particles.forEach(function(pt) {
          pt.life += 1;
          if (pt.life > pt.maxLife) {
            pt.el.setAttribute('opacity', '0');
            return;
          }
          alive = true;
          var dist = pt.speed * pt.life;
          pt.el.setAttribute('cx', (CX + Math.cos(pt.angle) * dist).toFixed(1));
          pt.el.setAttribute('cy', (CY + Math.sin(pt.angle) * dist).toFixed(1));
          pt.el.setAttribute('opacity', ((1 - pt.life / pt.maxLife) * 0.95).toFixed(2));
        });
        if (alive) particleRaf = requestAnimationFrame(particleTick);
      }
      particleRaf = requestAnimationFrame(particleTick);
    }

    pulseRings();
  }

  container._playBigBang = playBigBang;

  function stopPlayback() {
    cancelAnimationFrame(raf);
    if (particleRaf) cancelAnimationFrame(particleRaf);
    running = false;
    paused = false;
    resumeCallback = null;
    pauseProgress = null;
    btnPlay.textContent = '\u25B6 Play';
  }

  function startPlaybackRange(fromIdx, toIdx, opts) {
    opts = opts || {};
    if (running && !opts.force) return;
    stopPlayback();

    playOpts.fromIdx = fromIdx;
    playOpts.toIdx = toIdx;
    playOpts.useMilestones = opts.milestones === true && !window._spiralJourneyActive;
    playOpts.bigBang = opts.bigBang !== false;
    playOpts.onComplete = opts.onComplete || null;

    if (reducedMotion) {
      showAll();
      if (typeof container._showSpiralNode === 'function') {
        container._showSpiralNode(pts[toIdx].n);
      }
      if (playOpts.onComplete) playOpts.onComplete();
      return;
    }

    if (fromIdx === 0 && playOpts.bigBang) {
      hideAll();
    } else {
      applyFrame(fromIdx, fromIdx, 0);
    }

    t0 = null;
    running = true;
    paused = false;
    btnPlay.textContent = '\u25A0 Stop';

    if (fromIdx === 0 && playOpts.bigBang) {
      playBigBang();
      setTimeout(function() {
        if (!running) return;
        raf = requestAnimationFrame(tick);
      }, 420);
    } else {
      raf = requestAnimationFrame(tick);
    }
  }

  function startPlayback() {
    startPlaybackRange(0, MAX_N, { bigBang: true, milestones: false });
  }

  container._playSpiral = startPlayback;
  container._stopSpiral = stopPlayback;
  container._playRange = startPlaybackRange;
  container._showAll = showAll;
  container._resetSpiral = resetVisual;
  container._resumePlayback = function () {
    if (resumeCallback) resumeCallback();
  };

  btnPlay.addEventListener('click', function() {
    if (running) {
      stopPlayback();
      return;
    }
    startPlayback();
  });

  btnReset.addEventListener('click', function() {
    stopPlayback();
    resetVisual();
    if (typeof container._showSpiralNode === 'function') container._showSpiralNode(0);
  });

  container.dataset.initialized = '1';

  if (typeof initCodexSpiralLearn === 'function') {
    initCodexSpiralLearn(container, { nodeEls: nodeEls, spokeEls: spokeEls });
  }
}

function triggerCodexSpiralAutoPlay(page) {
  if (window._spiralJourneyActive) return;
  var root = page && page.querySelector('.cdx-spiral-root');
  if (!root || typeof root._playSpiral !== 'function') return;
  root._playSpiral();
}

window.initCodexSpiral = initCodexSpiral;
window.triggerCodexSpiralAutoPlay = triggerCodexSpiralAutoPlay;
window.triggerCodexSpiralBang = triggerCodexSpiralAutoPlay;
