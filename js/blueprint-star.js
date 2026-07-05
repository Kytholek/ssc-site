/**
 * Blueprint star chart — generic educational hexagram with clickable frequency nodes.
 */
(function () {
  'use strict';

  var W = 380, H = 420, cx = 190, cy = 210, r = 148;

  function toRad(a) { return a * Math.PI / 180; }
  function pt(a) {
    return {
      x: +(cx + r * Math.cos(toRad(a))).toFixed(2),
      y: +(cy + r * Math.sin(toRad(a))).toFixed(2),
    };
  }

  var POSITIONS = {
    soul: pt(150),
    expression: pt(-90),
    outer: pt(30),
    lifePath: pt(90),
    achievement: pt(-150),
    theme: pt(-30),
    calling: { x: cx, y: cy },
  };

  var COLORS = {
    soul: { s: '#7b4fa6', f: '#120b1a', t: '#a96ed4' },
    expression: { s: '#c9a84c', f: '#1a1408', t: '#e8c96b' },
    outer: { s: '#4a9494', f: '#081414', t: '#7ec8c8' },
    lifePath: { s: '#c9a84c', f: '#1a1408', t: '#e8c96b' },
    achievement: { s: '#7b4fa6', f: '#120b1a', t: '#a96ed4' },
    theme: { s: '#4a9494', f: '#081414', t: '#7ec8c8' },
    calling: { s: '#c9a84c', f: '#100e04', t: '#e8c96b' },
  };

  var LABEL_POS = {
    expression: 'above',
    lifePath: 'below',
  };

  var state = {
    wrap: null,
    svg: null,
    onSelect: null,
    activeId: null,
  };

  function ln(a, b, c, o, w) {
    return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y +
      '" stroke="' + c + '" stroke-width="' + w + '" opacity="' + o + '" stroke-linecap="round"/>';
  }

  function tri(a, b, c, fill, stroke, trinityClass) {
    return '<polygon points="' + a.x + ',' + a.y + ' ' + b.x + ',' + b.y + ' ' + c.x + ',' + c.y +
      '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2" stroke-linejoin="round"' +
      ' class="bp-tri ' + trinityClass + '"/>';
  }

  function edgeLine(a, b, c, o, w, edgeClass) {
    return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y +
      '" stroke="' + c + '" stroke-width="' + w + '" opacity="' + o + '" stroke-linecap="round"' +
      ' class="bp-edge ' + edgeClass + '"/>';
  }

  function nodeGroup(freqId, x, y, lbl, c, r2, pos) {
    var dy = pos === 'above' ? -(r2 + 14) : pos === 'below' ? r2 + 14 : y < cy ? -(r2 + 14) : r2 + 14;
    var meta = window.BLUEPRINT_FREQUENCIES && window.BLUEPRINT_FREQUENCIES[freqId];
    var title = meta ? meta.label + ' — ' + meta.role : lbl;
    return (
      '<g class="bp-node" data-freq="' + freqId + '" role="button" tabindex="0" aria-label="' + title + '">' +
      '<circle class="bp-node-hit" cx="' + x + '" cy="' + y + '" r="' + (r2 + 12) + '" fill="transparent"/>' +
      '<circle class="bp-node-glow" cx="' + x + '" cy="' + y + '" r="' + (r2 + 7) + '" fill="' + c.f + '" stroke="' + c.s + '" stroke-width="1" opacity="0.4"/>' +
      '<circle class="bp-node-core" cx="' + x + '" cy="' + y + '" r="' + r2 + '" fill="' + c.f + '" stroke="' + c.s + '" stroke-width="1.5"/>' +
      '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="14" fill="' + c.t + '" font-weight="700" pointer-events="none">?</text>' +
      '<text x="' + x + '" y="' + (y + dy) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="' + c.t + '" letter-spacing="0.12em" opacity="0.9" pointer-events="none">' + lbl.toUpperCase() + '</text>' +
      '</g>'
    );
  }

  function centerNode() {
    var c = COLORS.calling;
    return (
      '<g class="bp-node bp-node-calling" data-freq="calling" role="button" tabindex="0" aria-label="Life Calling — Your Mission">' +
      '<circle class="bp-node-hit" cx="' + cx + '" cy="' + cy + '" r="42" fill="transparent"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="38" fill="rgba(201,168,76,0.06)" stroke="' + c.s + '" stroke-width="1" opacity="0.5"/>' +
      '<circle class="bp-node-core" cx="' + cx + '" cy="' + cy + '" r="28" fill="' + c.f + '" stroke="' + c.s + '" stroke-width="1.5"/>' +
      '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="14" fill="#e8c96b" font-weight="700" pointer-events="none">?</text>' +
      '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.5" fill="' + c.s + '" letter-spacing="0.14em" opacity="0.85" pointer-events="none">LIFE CALLING</text>' +
      '</g>'
    );
  }

  function buildSvgHtml() {
    var soul = POSITIONS.soul;
    var expression = POSITIONS.expression;
    var outer = POSITIONS.outer;
    var lifePath = POSITIONS.lifePath;
    var achievement = POSITIONS.achievement;
    var theme = POSITIONS.theme;
    var gold = '#c9a84c';
    var purple = '#7b4fa6';

    var bg = '<circle cx="' + cx + '" cy="' + cy + '" r="175" fill="url(#bpBgG)" stroke="rgba(201,168,76,0.12)" stroke-width="1"/>';
    var spokes = [soul, expression, outer, lifePath, achievement, theme]
      .map(function (p) { return ln({ x: cx, y: cy }, p, gold, 0.18, 0.8); }).join('');

    return (
      '<svg class="bp-star-svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Triple Trinity Blueprint star chart">' +
      '<defs><radialGradient id="bpBgG" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#1a1620" stop-opacity="1"/><stop offset="100%" stop-color="#05040a" stop-opacity="1"/></radialGradient></defs>' +
      '<g class="bp-layer-bg">' + bg + '</g>' +
      '<g class="bp-layer-tri-upper">' + tri(soul, expression, outer, 'rgba(201,168,76,0.07)', gold, 'bp-tri-expression') + '</g>' +
      '<g class="bp-layer-tri-lower">' + tri(lifePath, achievement, theme, 'rgba(123,79,166,0.07)', purple, 'bp-tri-lessons') + '</g>' +
      '<g class="bp-layer-edges">' +
      edgeLine(soul, expression, gold, 0.55, 1.4, 'bp-edge-expression') +
      edgeLine(expression, outer, gold, 0.55, 1.4, 'bp-edge-expression') +
      edgeLine(outer, soul, gold, 0.55, 1.4, 'bp-edge-expression') +
      edgeLine(lifePath, achievement, purple, 0.55, 1.4, 'bp-edge-lessons') +
      edgeLine(achievement, theme, purple, 0.55, 1.4, 'bp-edge-lessons') +
      edgeLine(theme, lifePath, purple, 0.55, 1.4, 'bp-edge-lessons') +
      '</g>' +
      '<g class="bp-layer-spokes">' + spokes + '</g>' +
      '<g class="bp-layer-nodes">' +
      nodeGroup('soul', soul.x, soul.y, 'Soul', COLORS.soul, 22) +
      nodeGroup('theme', theme.x, theme.y, 'Theme', COLORS.theme, 22) +
      nodeGroup('outer', outer.x, outer.y, 'Outer', COLORS.outer, 22) +
      nodeGroup('lifePath', lifePath.x, lifePath.y, 'Life Path', COLORS.lifePath, 22, LABEL_POS.lifePath) +
      nodeGroup('achievement', achievement.x, achievement.y, 'Achievement', COLORS.achievement, 22) +
      nodeGroup('expression', expression.x, expression.y, 'Expression', COLORS.expression, 22, LABEL_POS.expression) +
      centerNode() +
      '</g>' +
      '</svg>'
    );
  }

  function setActiveNode(freqId) {
    if (!state.wrap) return;
    state.activeId = freqId || null;
    state.wrap.querySelectorAll('.bp-node').forEach(function (g) {
      g.classList.toggle('is-active', g.dataset.freq === freqId);
      g.classList.toggle('is-dimmed', !!freqId && g.dataset.freq !== freqId);
    });
    state.wrap.classList.toggle('bp-node-focus', !!freqId);
  }

  function highlightTrinity(trinityId, dimOthers) {
    if (!state.wrap) return;
    var trinity = window.getBlueprintTrinity && window.getBlueprintTrinity(trinityId);
    if (!trinity) return;
    var keep = trinity.nodes.concat(trinityId === 'purpose' ? ['calling'] : []);
    state.wrap.querySelectorAll('.bp-node').forEach(function (g) {
      var id = g.dataset.freq;
      var active = keep.indexOf(id) !== -1;
      g.classList.toggle('is-journey-active', active);
      g.classList.toggle('is-journey-dim', dimOthers && !active);
    });
    state.wrap.classList.add('bp-journey-active');
    state.wrap.dataset.bpTrinity = trinityId;

    var calling = state.wrap.querySelector('.bp-node-calling');
    if (calling) calling.classList.toggle('is-purpose-center', trinityId === 'purpose');
  }

  function resetHighlights() {
    if (!state.wrap) return;
    state.wrap.classList.remove('bp-journey-active', 'bp-node-focus');
    delete state.wrap.dataset.bpTrinity;
    state.wrap.querySelectorAll('.bp-node').forEach(function (g) {
      g.classList.remove('is-journey-active', 'is-journey-dim', 'is-active', 'is-dimmed', 'is-purpose-center');
    });
    state.activeId = null;
  }

  function bindNodes() {
    if (!state.wrap) return;
    state.wrap.querySelectorAll('.bp-node').forEach(function (g) {
      function select() {
        var id = g.dataset.freq;
        setActiveNode(id);
        if (typeof state.onSelect === 'function') state.onSelect(id);
      }
      g.addEventListener('click', select);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    });
  }

  function init(wrapEl, onSelect) {
    if (!wrapEl) return;
    state.wrap = wrapEl;
    state.onSelect = onSelect;
    wrapEl.innerHTML = buildSvgHtml();
    state.svg = wrapEl.querySelector('.bp-star-svg');
    bindNodes();
  }

  window.initBlueprintStar = init;
  window.highlightBlueprintTrinity = highlightTrinity;
  window.resetBlueprintHighlights = resetHighlights;
  window.setBlueprintActiveNode = setActiveNode;
})();
