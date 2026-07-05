/**
 * Blueprint page — trinity highlight tabs + node pop-up cards.
 */
(function () {
  'use strict';

  var selectedTrinity = null;
  var page, card, legendBtns;

  function showNodeCard(freqId) {
    var freq = window.getBlueprintFrequency && window.getBlueprintFrequency(freqId);
    if (!freq || !card) return;
    var labelEl = document.getElementById('bp-nc-label');
    var roleEl = document.getElementById('bp-nc-role');
    var essenceEl = document.getElementById('bp-nc-essence');
    var bodyEl = document.getElementById('bp-nc-body');
    var actionsEl = document.getElementById('bp-nc-actions');
    if (labelEl) labelEl.textContent = freq.label;
    if (roleEl) roleEl.textContent = freq.role + ' · ' + freq.circuit;
    if (essenceEl) essenceEl.textContent = freq.essence;
    if (bodyEl) bodyEl.textContent = freq.summary;
    if (actionsEl) {
      actionsEl.innerHTML = '';
      var links = window.getBlueprintFrequencyLinks ? window.getBlueprintFrequencyLinks(freq) : [];
      links.forEach(function (link, i) {
        var a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;
        a.className = 'bp-nc-btn' + (i === 0 ? ' bp-nc-btn-primary' : '');
        actionsEl.appendChild(a);
      });
    }
    card.classList.add('visible');
    card.setAttribute('aria-hidden', 'false');
    if (typeof window.setBlueprintActiveNode === 'function') window.setBlueprintActiveNode(freqId);
  }

  function hideNodeCard() {
    if (!card) return;
    card.classList.remove('visible');
    card.setAttribute('aria-hidden', 'true');
    if (typeof window.setBlueprintActiveNode === 'function') window.setBlueprintActiveNode(null);
  }

  function updateLegendState() {
    if (!legendBtns) return;
    legendBtns.forEach(function (btn) {
      var active = btn.dataset.trinity === selectedTrinity;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function selectTrinity(trinityId) {
    if (!trinityId || ['lessons', 'expression', 'purpose'].indexOf(trinityId) === -1) return;
    selectedTrinity = trinityId;
    if (typeof window.highlightBlueprintTrinity === 'function') {
      window.highlightBlueprintTrinity(trinityId, true);
    }
    if (page) page.dataset.bpTrinity = trinityId;
    updateLegendState();
    updateUrl();
  }

  function clearTrinity() {
    selectedTrinity = null;
    if (page) delete page.dataset.bpTrinity;
    if (typeof window.resetBlueprintHighlights === 'function') window.resetBlueprintHighlights();
    updateLegendState();
    history.replaceState({}, '', '/blueprint/');
  }

  function updateUrl() {
    if (!selectedTrinity) return;
    history.replaceState({ blueprintTrinity: selectedTrinity }, '', '/blueprint/?trinity=' + encodeURIComponent(selectedTrinity));
  }

  function initBlueprintPage() {
    page = document.getElementById('page-blueprint');
    card = document.getElementById('bp-node-card');
    legendBtns = document.querySelectorAll('.bp-legend-btn[data-trinity]');
    if (!page) return;

    var wrap = document.getElementById('bp-chart-wrap');
    if (wrap && typeof window.initBlueprintStar === 'function') {
      window.initBlueprintStar(wrap, showNodeCard);
    }

    legendBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.trinity;
        if (selectedTrinity === id) clearTrinity();
        else selectTrinity(id);
      });
    });

    var closeBtn = document.getElementById('bp-nc-close');
    if (closeBtn) closeBtn.addEventListener('click', hideNodeCard);

    document.addEventListener('click', function (e) {
      if (!card || !card.classList.contains('visible')) return;
      if (card.contains(e.target)) return;
      if (e.target.closest && e.target.closest('.bp-node')) return;
      hideNodeCard();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && card && card.classList.contains('visible')) hideNodeCard();
    });

    var params = new URLSearchParams(window.location.search);
    var trinity = params.get('trinity');
    if (trinity && ['lessons', 'expression', 'purpose'].indexOf(trinity) !== -1) {
      selectTrinity(trinity);
    }
  }

  window.initBlueprintPage = initBlueprintPage;
})();
