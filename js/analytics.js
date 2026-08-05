/**
 * GA4 event bridge — Simulation Source Code
 *
 * Reads the GA4 measurement ID from:
 *   1. window.SSC_GA4_MEASUREMENT_ID
 *   2. <meta name="ssc-ga4-measurement-id" content="G-XXXXXXXX">
 *   3. /api/site-config → ga4MeasurementId
 */
(function () {
  if (window.__sscAnalyticsReady) return;
  window.__sscAnalyticsReady = true;

  var PRODUCT_VALUE = {
    guidebook: 22,
    'time-cycle': 17,
    timecycle: 17,
    bundle: 29,
    consultation: 88,
    membership: 0,
  };

  var initialized = false;
  var measurementId = '';
  var lastPageLocation = '';
  var queuedEvents = [];

  function safeString(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeProduct(product) {
    product = safeString(product || 'guidebook').toLowerCase();
    return product === 'timecycle' ? 'time-cycle' : product;
  }

  function productValue(product, fallback) {
    var parsed = Number(fallback);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    product = normalizeProduct(product);
    return PRODUCT_VALUE[product] != null ? PRODUCT_VALUE[product] : 0;
  }

  function eventIdFor(eventName, payload) {
    payload = payload || {};
    if (payload.event_id) return safeString(payload.event_id);
    if (payload.session_id) return 'stripe_' + safeString(payload.session_id);
    if (payload.transaction_id) return 'order_' + safeString(payload.transaction_id);
    return eventName + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function ecommerceItem(product, value) {
    product = normalizeProduct(product);
    return {
      item_id: product,
      item_name: product.replace(/-/g, ' '),
      item_category: 'digital_product',
      price: value,
      quantity: 1,
    };
  }

  function loadScript(id) {
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(script);
  }

  function rawGtag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    return window.gtag;
  }

  function flushQueue() {
    var events = queuedEvents.slice();
    queuedEvents = [];
    events.forEach(function (entry) {
      sendEvent(entry.name, entry.params);
    });
  }

  function init(id) {
    id = safeString(id);
    if (!id || id === 'G-XXXXXXXX' || initialized) return false;
    initialized = true;
    measurementId = id;
    loadScript(id);
    rawGtag()('js', new Date());
    rawGtag()('config', id, { send_page_view: false });
    pageView();
    flushQueue();
    return true;
  }

  function resolveMeasurementId() {
    var meta = document.querySelector('meta[name="ssc-ga4-measurement-id"]');
    var explicit = window.SSC_GA4_MEASUREMENT_ID || (meta && meta.content) || '';
    if (init(explicit)) return;

    fetch('/api/site-config', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (config) {
        if (config && config.ga4MeasurementId) init(config.ga4MeasurementId);
      })
      .catch(function () {});
  }

  function sendEvent(name, params) {
    if (!initialized) {
      queuedEvents.push({ name: name, params: params || {} });
      return;
    }
    try {
      rawGtag()('event', name, params || {});
    } catch (e) {}
  }

  function pageView(url, title) {
    var pageLocation = url || window.location.href;
    if (pageLocation === lastPageLocation) return;
    lastPageLocation = pageLocation;
    sendEvent('page_view', {
      page_title: title || document.title,
      page_location: pageLocation,
      page_path: window.location.pathname + window.location.search + window.location.hash,
    });
  }

  function trackPurchase(eventName, payload) {
    payload = payload || {};
    var product = normalizeProduct(payload.product);
    var value = productValue(product, payload.value);
    var eventId = eventIdFor(eventName, payload);
    sendEvent('purchase', {
      transaction_id: payload.session_id || payload.transaction_id || eventId,
      event_id: eventId,
      currency: payload.currency || 'USD',
      value: value,
      items: [ecommerceItem(product, value)],
    });
  }

  function bridgeEvent(eventName, payload) {
    if (!eventName) return;
    payload = payload || {};
    var product = normalizeProduct(payload.product);
    var eventId = eventIdFor(eventName, payload);

    if (
      eventName === 'guidebook_checkout_start' ||
      eventName === 'timecycle_checkout_start' ||
      eventName === 'bundle_checkout_start'
    ) {
      if (eventName === 'timecycle_checkout_start') product = normalizeProduct(payload.product || 'time-cycle');
      if (eventName === 'bundle_checkout_start') product = normalizeProduct(payload.product || 'bundle');
      sendEvent('begin_checkout', {
        event_id: eventId,
        currency: 'USD',
        value: productValue(product, payload.value),
        items: [ecommerceItem(product, productValue(product, payload.value))],
      });
      return;
    }

    if (
      eventName === 'guidebook_purchase_thank_you' ||
      eventName === 'timecycle_purchase_thank_you' ||
      eventName === 'bundle_purchase_thank_you' ||
      eventName === 'consultation_purchase_thank_you' ||
      eventName === 'membership_purchase_thank_you'
    ) {
      trackPurchase(eventName, payload);
      return;
    }

    if (
      eventName === 'calculator_decode_success' ||
      eventName === 'calculator_lead_submit_success'
    ) {
      sendEvent('generate_lead', {
        event_id: eventId,
        method: eventName,
        content_name: 'numerology_calculator',
      });
      return;
    }

    if (eventName === 'guidebook_sample_click') {
      sendEvent('select_content', {
        event_id: eventId,
        content_type: 'guidebook',
        item_id: 'guidebook_sample',
      });
      return;
    }

    sendEvent(eventName, Object.assign({ event_id: eventId }, payload));
  }

  function patchHistory(method) {
    var original = history[method];
    if (typeof original !== 'function') return;
    history[method] = function () {
      var result = original.apply(this, arguments);
      setTimeout(function () { pageView(); }, 0);
      return result;
    };
  }

  window.sscAnalytics = {
    init: init,
    pageView: pageView,
    track: sendEvent,
    bridgeEvent: bridgeEvent,
  };

  var previousTrack = window.sscTrackEvent;
  window.sscTrackEvent = function (eventName, payload) {
    try {
      bridgeEvent(eventName, payload);
    } catch (e) {}
    if (typeof previousTrack === 'function') {
      previousTrack(eventName, payload);
      return;
    }
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push(Object.assign({ event: eventName }, payload || {}));
    }
  };

  patchHistory('pushState');
  patchHistory('replaceState');
  window.addEventListener('popstate', function () {
    setTimeout(function () { pageView(); }, 0);
  });

  resolveMeasurementId();
})();
