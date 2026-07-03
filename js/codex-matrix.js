/**
 * Consciousness Matrix — center-out construction animation
 */
function initCodexMatrix(wrap) {
  if (!wrap || wrap.dataset.matrixInit === '1') return;

  var svg = wrap.querySelector('.codex-spirit-svg');
  var flash = wrap.querySelector('.cdx-matrix-bang-flash');
  var hitLayer = wrap.querySelector('.codex-hit-layer');
  if (!svg) return;
  wrap.dataset.matrixInit = '1';

  var CX = 230;
  var CY = 250;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var constructTimer = null;
  var pendingTimers = [];

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    pendingTimers.push(id);
    return id;
  }

  function clearPendingTimers() {
    pendingTimers.forEach(clearTimeout);
    pendingTimers = [];
  }

  var layers = {
    voidRing: svg.querySelector('.cdxfield-void-group'),
    halo: svg.querySelector('.cdxfield-field-halo'),
    polarTop: svg.querySelector('.cdxfield-polar-top'),
    polarBot: svg.querySelector('.cdxfield-polar-bot'),
    torus: svg.querySelector('.cdxfield-torus-group'),
    loops: svg.querySelector('.cdxfield-field-loops'),
    waist: svg.querySelector('.cdxfield-waist-belt'),
    struct: svg.querySelector('.cdxfield-struct-line'),
    magPath: svg.querySelector('.cdxfield-mag-path'),
    elecPath: svg.querySelector('.cdxfield-elec-path'),
    doublePath: svg.querySelector('.cdxfield-double-path'),
    teslaInf: svg.querySelector('.cdxfield-tesla-inf'),
    center: svg.querySelector('.cdxfield-node-aetheric')
  };

  var outerNodes = Array.from(svg.querySelectorAll('.cdxfield-node-group:not(.cdxfield-node-aetheric)'));
  outerNodes.sort(function(a, b) {
    var ac = a.querySelector('circle');
    var bc = b.querySelector('circle');
    var ax = parseFloat(ac && ac.getAttribute('cx')) || 0;
    var ay = parseFloat(ac && ac.getAttribute('cy')) || 0;
    var bx = parseFloat(bc && bc.getAttribute('cx')) || 0;
    var by = parseFloat(bc && bc.getAttribute('cy')) || 0;
    return Math.hypot(ax - CX, ay - CY) - Math.hypot(bx - CX, by - CY);
  });

  var hitNodes = Array.from(wrap.querySelectorAll('.codex-hit-node'));
  hitNodes.sort(function(a, b) {
    var ax = parseFloat(a.style.left) || 50;
    var ay = parseFloat(a.style.top) || 50;
    var bx = parseFloat(b.style.left) || 50;
    var by = parseFloat(b.style.top) || 50;
    return Math.hypot(ax - 50, ay - 50) - Math.hypot(bx - 50, by - 50);
  });

  var matrixView = wrap.closest('.cdx-view-matrix');
  var extras = matrixView ? matrixView.querySelectorAll('.cdx-matrix-extra') : [];

  function centerTransform(scale, opacity) {
    return 'translate(' + CX + ' ' + CY + ') scale(' + scale + ') translate(' + (-CX) + ' ' + (-CY) + ')';
  }

  function setGroupState(el, scale, opacity) {
    if (!el) return;
    el.style.opacity = String(opacity);
    el.style.transform = centerTransform(scale, opacity);
    el.style.transformOrigin = '';
    el.style.transition = '';
  }

  function prepPath(path) {
    if (!path) return 0;
    var len = 0;
    try { len = path.getTotalLength(); } catch (e) { len = 400; }
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = String(len);
    path.style.opacity = '1';
    path.style.transition = '';
    return len;
  }

  function resetVisual() {
    if (constructTimer) {
      clearTimeout(constructTimer);
      constructTimer = null;
    }
    clearPendingTimers();
    wrap.classList.remove('cdx-matrix-building');
    if (flash) flash.classList.remove('is-active');

    setGroupState(layers.center, 0, 0);
    [layers.voidRing, layers.halo, layers.polarTop, layers.polarBot, layers.torus, layers.loops, layers.waist, layers.struct].forEach(function(el) {
      setGroupState(el, 0, 0);
    });
    prepPath(layers.magPath);
    prepPath(layers.elecPath);
    prepPath(layers.doublePath);
    setGroupState(layers.teslaInf, 0, 0);
    outerNodes.forEach(function(el) { setGroupState(el, 0, 0); });
    hitNodes.forEach(function(el) {
      el.style.opacity = '0';
      el.style.transition = '';
    });
    extras.forEach(function(el) { el.style.opacity = '0'; });
  }

  function revealGroup(el, delay, duration, scale) {
    if (!el) return;
    later(function() {
      el.style.transition = 'opacity ' + duration + 'ms cubic-bezier(.22,1,.36,1), transform ' + duration + 'ms cubic-bezier(.22,1,.36,1)';
      el.style.opacity = '1';
      el.style.transform = centerTransform(scale || 1, 1);
      later(function() {
        el.style.transition = '';
        el.style.transform = '';
      }, duration + 40);
    }, delay);
  }

  function drawPath(path, delay, duration, solidAfter) {
    if (!path) return;
    var len = prepPath(path);
    later(function() {
      path.style.transition = 'stroke-dashoffset ' + duration + 'ms cubic-bezier(.22,1,.36,1)';
      path.style.strokeDashoffset = '0';
      if (solidAfter) {
        later(function() {
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
          path.style.transition = '';
        }, duration + 40);
      }
    }, delay);
  }

  /* Instantly complete the construct: cancel staged timers and show the final state.
     Used by Journey mode so late timers can't overwrite its per-chapter dimming. */
  function finishConstruct() {
    if (constructTimer) {
      clearTimeout(constructTimer);
      constructTimer = null;
    }
    clearPendingTimers();
    wrap.classList.remove('cdx-matrix-building');
    if (flash) flash.classList.remove('is-active');
    [layers.center, layers.voidRing, layers.halo, layers.polarTop, layers.polarBot, layers.torus, layers.loops, layers.waist, layers.struct, layers.teslaInf]
      .forEach(function(el) {
        if (!el) return;
        el.style.transition = '';
        el.style.transform = '';
        el.style.opacity = '1';
      });
    [layers.magPath, layers.elecPath].forEach(function(path) {
      if (!path) return;
      path.style.transition = '';
      path.style.strokeDashoffset = '0';
      path.style.opacity = '1';
    });
    if (layers.doublePath) {
      layers.doublePath.style.transition = '';
      layers.doublePath.style.strokeDasharray = '';
      layers.doublePath.style.strokeDashoffset = '';
      layers.doublePath.style.opacity = '1';
    }
    outerNodes.forEach(function(el) {
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '1';
    });
    hitNodes.forEach(function(el) {
      el.style.transition = '';
      el.style.opacity = '1';
    });
    extras.forEach(function(el) {
      el.style.transition = '';
      el.style.opacity = '1';
    });
  }

  function playConstruct() {
    resetVisual();
    if (reducedMotion) {
      [layers.center, layers.voidRing, layers.halo, layers.polarTop, layers.polarBot, layers.torus, layers.loops, layers.waist, layers.struct]
        .forEach(function(el) { setGroupState(el, 1, 1); });
      if (layers.magPath) layers.magPath.style.strokeDashoffset = '0';
      if (layers.elecPath) layers.elecPath.style.strokeDashoffset = '0';
      if (layers.doublePath) {
        layers.doublePath.style.strokeDasharray = '';
        layers.doublePath.style.strokeDashoffset = '0';
        layers.doublePath.style.opacity = '1';
      }
      setGroupState(layers.teslaInf, 1, 1);
      outerNodes.forEach(function(el) { setGroupState(el, 1, 1); });
      hitNodes.forEach(function(el) { el.style.opacity = '1'; });
      extras.forEach(function(el) { el.style.opacity = '1'; });
      return;
    }

    wrap.classList.add('cdx-matrix-building');

    if (flash) {
      flash.classList.remove('is-active');
      void flash.offsetWidth;
      flash.classList.add('is-active');
    }

    revealGroup(layers.center, 80, 520, 1);
    revealGroup(layers.struct, 280, 600, 1);
    revealGroup(layers.waist, 420, 700, 1);
    revealGroup(layers.loops, 520, 750, 1);
    revealGroup(layers.torus, 600, 700, 1);
    drawPath(layers.magPath, 680, 900);
    drawPath(layers.elecPath, 760, 900);
    drawPath(layers.doublePath, 840, 850, true);
    revealGroup(layers.teslaInf, 900, 700, 1);
    revealGroup(layers.halo, 820, 800, 1);
    revealGroup(layers.polarTop, 900, 650, 1);
    revealGroup(layers.polarBot, 960, 650, 1);
    revealGroup(layers.voidRing, 1000, 900, 1);

    outerNodes.forEach(function(el, i) {
      revealGroup(el, 900 + i * 90, 480, 1);
    });

    hitNodes.forEach(function(el, i) {
      later(function() {
        el.style.transition = 'opacity .4s ease';
        el.style.opacity = '1';
      }, 1000 + i * 85);
    });

    extras.forEach(function(el, i) {
      later(function() {
        el.style.transition = 'opacity .55s ease';
        el.style.opacity = '1';
      }, 1700 + i * 100);
    });

    constructTimer = setTimeout(function() {
      wrap.classList.remove('cdx-matrix-building');
      constructTimer = null;
    }, 2400);
  }

  wrap._playMatrixConstruct = playConstruct;
  wrap._resetMatrixVisual = resetVisual;
  wrap._finishMatrixConstruct = finishConstruct;
}

function triggerCodexMatrixConstruct(page) {
  var wrap = page && page.querySelector('#codex-spirit-wrap');
  if (!wrap) return;
  if (typeof initCodexMatrix === 'function') initCodexMatrix(wrap);
  if (typeof wrap._playMatrixConstruct === 'function') wrap._playMatrixConstruct();
}

window.initCodexMatrix = initCodexMatrix;
window.triggerCodexMatrixConstruct = triggerCodexMatrixConstruct;
