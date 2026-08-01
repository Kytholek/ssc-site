/**
 * Meta Pixel event bridge — Simulation Source Code
 *
 * The official Meta Pixel base code (fbq init + PageView) must be inlined
 * in each page <head> so Meta's verification tools can detect it.
 * This file only maps sscTrackEvent → Facebook standard events and SPA PageViews.
 */
(function () {
  if (window.__sscMetaPixelBridgeReady) return;
  window.__sscMetaPixelBridgeReady = true;

  var PRODUCT_VALUE = {
    guidebook: 22,
    'time-cycle': 17,
    timecycle: 17,
    bundle: 29,
    consultation: 88,
  };

  function track(eventName, params) {
    if (typeof window.fbq !== 'function') return;
    try {
      window.fbq('track', eventName, params || {});
    } catch (e) {}
  }

  function trackCustom(eventName, params) {
    if (typeof window.fbq !== 'function') return;
    try {
      window.fbq('trackCustom', eventName, params || {});
    } catch (e) {}
  }

  function moneyParams(product, extra) {
    var out = Object.assign({ content_name: product || 'guidebook' }, extra || {});
    var value = PRODUCT_VALUE[product];
    if (value != null) {
      out.value = value;
      out.currency = 'USD';
      out.contents = [{ id: product, quantity: 1, item_price: value }];
      out.content_type = 'product';
    }
    return out;
  }

  function bridgeEvent(eventName, payload) {
    if (!eventName) return;
    payload = payload || {};
    var product = payload.product || 'guidebook';

    if (
      eventName === 'calculator_decode_success' ||
      eventName === 'calculator_lead_submit_success'
    ) {
      track('Lead', {
        content_name: 'numerology_calculator',
        content_category: 'calculator',
        status: eventName,
      });
      return;
    }

    if (
      eventName === 'guidebook_checkout_start' ||
      eventName === 'timecycle_checkout_start' ||
      eventName === 'bundle_checkout_start'
    ) {
      if (eventName === 'timecycle_checkout_start') product = payload.product || 'time-cycle';
      if (eventName === 'bundle_checkout_start') product = payload.product || 'bundle';
      if (eventName === 'guidebook_checkout_start') product = payload.product || 'guidebook';
      track('InitiateCheckout', moneyParams(product, { content_category: 'checkout' }));
      return;
    }

    if (
      eventName === 'guidebook_purchase_thank_you' ||
      eventName === 'timecycle_purchase_thank_you' ||
      eventName === 'bundle_purchase_thank_you' ||
      eventName === 'consultation_purchase_thank_you' ||
      eventName === 'membership_purchase_thank_you'
    ) {
      if (eventName === 'timecycle_purchase_thank_you') product = payload.product || 'time-cycle';
      else if (eventName === 'bundle_purchase_thank_you') product = payload.product || 'bundle';
      else if (eventName === 'consultation_purchase_thank_you') product = payload.product || 'consultation';
      else if (eventName === 'membership_purchase_thank_you') product = payload.product || 'membership';
      else product = payload.product || 'guidebook';
      track('Purchase', moneyParams(product, { content_category: 'purchase' }));
      return;
    }

    if (eventName === 'guidebook_upsell_view') {
      track('ViewContent', moneyParams('guidebook', { content_category: 'upsell' }));
      return;
    }

    if (eventName === 'guidebook_sample_click') {
      trackCustom('GuidebookSampleClick', { content_name: 'guidebook' });
      return;
    }

    trackCustom(eventName, payload);
  }

  window.sscMetaPixel = {
    id: '3127826867426600',
    track: track,
    trackCustom: trackCustom,
    pageView: function () {
      track('PageView');
    },
    bridgeEvent: bridgeEvent,
  };

  var prevTrack = window.sscTrackEvent;
  window.sscTrackEvent = function (eventName, payload) {
    try {
      bridgeEvent(eventName, payload);
    } catch (e) {}
    if (typeof prevTrack === 'function') {
      prevTrack(eventName, payload);
      return;
    }
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push(Object.assign({ event: eventName }, payload || {}));
    }
  };
})();
