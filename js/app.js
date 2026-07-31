// ════════════════════════════════════════════════════════════
//  SSC WEBSITE — app.js
//  SPA routing · Meta · SEO · shared nav/footer for blog pages
//
//  Blog posts live at /blog/{slug}/ (built from content/*.md via build.js).
//  Legacy ?post= URLs redirect to those canonical paths (see LEGACY_POST_SLUGS).
// ════════════════════════════════════════════════════════════


// ────────────────────────────────────────────────────────────
//  SITE DEFAULTS
// ────────────────────────────────────────────────────────────
const SITE = {
  name        : 'Simulation Source Code',
  titleSuffix : ' · SSC Numerology',
  description : 'Discover your seven numerology frequencies — Life Path, Expression, Life Calling, Soul, Outer, Achievement & Theme.',
  ogImage     : 'https://simulationsourcecode.com/Images/ssc-og.png',
  baseUrl     : 'https://simulationsourcecode.com',
};

function trackSscEvent(eventName, payload) {
  if (!eventName) return;
  if (window.sscTrackEvent && window.sscTrackEvent !== trackSscEvent) {
    window.sscTrackEvent(eventName, payload);
    return;
  }
  if (window.dataLayer && typeof window.dataLayer.push === 'function') {
    window.dataLayer.push(Object.assign({ event: eventName }, payload || {}));
  }
}

window.sscTrackEvent = window.sscTrackEvent || trackSscEvent;

// Maps legacy SPA post ids (?post=post-…) to /blog/{slug}/ — keep in sync with admin.js POST_REGISTRY.
const LEGACY_POST_SLUGS = {
  'post-simulation': 'simulation-theory-numerology-source-code',
  'post-system': 'evolution-of-energy-0-through-9',
  'post-electric-magnetic-aether': 'electric-magnetic-aether-three-natures-of-number',
  'post-codex-architecture': 'codex-architecture-consciousness-matrix',
  'post-666': '666-numerology-meaning',
  'post-369': '3-6-9-pattern-tesla-numerology',
  'post-transformation-path': 'path-of-transformation-1-4-7-2-5-8-3-6-9',
  'post-five-lenses': 'five-lenses-of-self-ego-mind-soul-spirit-void',
  'post-decoding-matrix': 'decoding-matrix',
  'post-decoding-matrix-2': 'decoding-the-matrix-simulation-source-code',
  'post-pillar': 'pillar-numerology-source-code',
  'post-pillar-numerology-source-code': 'pillar-numerology-source-code',
  'post-infinity': 'infinity-loop-cycles-recursion-numerology',
  'post-infinity-loop': 'infinity-loop-cycles-recursion-numerology',
  'post-angel-numbers': 'angel-numbers-being-read-wrong',
  'post-lifepath': 'life-path-number-explained',
  'post-theme-number': 'theme-number-birth-year-numerology',
  'post-seven': 'why-seven-frequencies-numerology',
  'post-trinity-purpose': 'trinity-of-purpose-numerology',
  'post-trinity-expression': 'trinity-of-expression-numerology',
  'post-trinity-lessons': 'trinity-of-lessons-numerology',
  'post-master': 'master-numbers-11-22-33-numerology',
  'post-pythagorean': 'pythagorean-vs-chaldean-numerology',
  'post-lp1': 'life-path-1-numerology',
  'post-lp2': 'life-path-2-numerology',
  'post-lp3': 'life-path-3-numerology',
  'post-lp4': 'life-path-4-numerology',
  'post-lp5': 'life-path-5-numerology',
  'post-lp6': 'life-path-6-numerology',
  'post-lp7': 'life-path-7-numerology',
  'post-lp8': 'life-path-8-numerology',
  'post-lp9': 'life-path-9-numerology',
  'post-lp11': 'life-path-11-numerology',
  'post-lp22': 'life-path-22-numerology',
  'post-lp33': 'life-path-33-numerology',
  'post-lp44': 'life-path-44-numerology',
  'post-lifepath-1': 'life-path-1-numerology',
  'post-lifepath-2': 'life-path-2-numerology',
  'post-lifepath-3': 'life-path-3-numerology',
  'post-lifepath-4': 'life-path-4-numerology',
  'post-lifepath-5': 'life-path-5-numerology',
  'post-lifepath-6': 'life-path-6-numerology',
  'post-lifepath-7': 'life-path-7-numerology',
  'post-lifepath-8': 'life-path-8-numerology',
  'post-lifepath-9': 'life-path-9-numerology',
  'post-exp1': 'expression-1-numerology',
  'post-exp2': 'expression-2-numerology',
  'post-exp3': 'expression-3-numerology',
  'post-exp4': 'expression-4-numerology',
  'post-exp5': 'expression-5-numerology',
  'post-exp6': 'expression-6-numerology',
  'post-exp7': 'expression-7-numerology',
  'post-exp8': 'expression-8-numerology',
  'post-exp9': 'expression-9-numerology',
  'post-exp11': 'expression-11-numerology',
  'post-exp22': 'expression-22-numerology',
  'post-exp33': 'expression-33-numerology',
  'post-su1': 'soul-urge-1-numerology',
  'post-su2': 'soul-urge-2-numerology',
  'post-su3': 'soul-urge-3-numerology',
  'post-su4': 'soul-urge-4-numerology',
  'post-su5': 'soul-urge-5-numerology',
  'post-su6': 'soul-urge-6-numerology',
  'post-su7': 'soul-urge-7-numerology',
  'post-su8': 'soul-urge-8-numerology',
  'post-su9': 'soul-urge-9-numerology',
  'post-su11': 'soul-urge-11-numerology',
  'post-su22': 'soul-urge-22-numerology',
  'post-su33': 'soul-urge-33-numerology',
  'post-shadow': 'shadow-side-of-numerology-numbers',
  'post-calculate': 'how-to-calculate-life-path-number',
  'post-name': 'birth-name-vs-known-name-numerology',
  'post-name-change': 'name-change-numerology-simulation',
};

function resolveLegacyPostSlug(id) {
  return LEGACY_POST_SLUGS[id] || null;
}

function redirectToBlogPost(id) {
  const slug = resolveLegacyPostSlug(id);
  window.location.replace(slug ? '/blog/' + slug + '/' : '/blog/');
}

function openPost(id) {
  redirectToBlogPost(id);
}

function closePosts() {
  window.location.href = '/blog/';
}


// Per-page meta
const PAGE_META = {
  home: {
    title      : 'Simulation Source Code · Numerology Calculator · Decode Your Blueprint',
    description: 'Decode the seven frequencies encoded in your birth date and name — Life Path, Expression, Life Calling, Soul Urge, Outer Persona, Achievement, and Theme. Free numerology calculator.',
  },
  ssc: {
    title      : 'The SSC System · Seven Frequencies · Simulation Source Code',
    description: 'The complete Simulation Source Code framework — seven frequencies encoded in your birth date and name. Life Path, Expression, Soul Urge, Life Calling, Achievement, Theme, and Outer Self decoded.',
  },
  calculator: {
    title      : 'Free Numerology Calculator · Life Path & Seven Frequencies · SSC',
    description: 'Free numerology calculator for your Life Path number and six more frequencies — Expression, Life Calling, Soul Urge, Outer Persona, Achievement, and Theme from birth date and name.',
  },
  books: {
    title      : 'Recommended Numerology Books · Simulation Source Code',
    description: 'A curated library of numerology, consciousness, and simulation theory books — the essential reading for understanding the system behind Simulation Source Code.',
  },
  about: {
    title      : 'About Simulation Source Code · Numerology Framework',
    description: 'Simulation Source Code is a numerology framework built on Pythagorean principles, simulation theory, and consciousness research — offering practical, grounded readings of your seven encoded frequencies.',
  },
  services: {
    title      : 'Numerology Reading & Guidebook Report · Services · SSC',
    description: 'Order a numerology guidebook report or live numerology reading — PDF blueprint, consultation, TellTale Tarot, and original books by Kytholek.',
  },
  codex: {
    title      : 'The Codex — Nine Frequencies · Simulation Source Code',
    description: 'The nine-frequency consciousness matrix. The complete architecture of the Simulation Source Code framework — each number a stage in the evolution of energy from void to wisdom.',
  },
  privacy: {
    title      : 'Privacy Policy · Simulation Source Code',
    description: 'How Simulation Source Code handles your data. All calculator inputs are processed locally and never stored on our servers.',
  },
};


// ────────────────────────────────────────────────────────────
//  META TAG HELPERS
// ────────────────────────────────────────────────────────────
function setMeta(title, description, ogImage, canonicalUrl, ogType) {
  document.title = title;
  _setMetaName('description',         description);
  _setOgTag   ('og:title',            title);
  _setOgTag   ('og:description',      description);
  _setOgTag   ('og:image',            ogImage      || SITE.ogImage);
  _setOgTag   ('og:url',              canonicalUrl || window.location.href);
  _setOgTag   ('og:type',             ogType || 'website');
  _setMetaName('twitter:card',        'summary_large_image');
  _setMetaName('twitter:title',       title);
  _setMetaName('twitter:description', description);
  _setMetaName('twitter:image',       ogImage      || SITE.ogImage);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl || window.location.href;
}

function _setOgTag(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.content = content;
}

function _setMetaName(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

function _setJsonLd(data) {
  let el = document.getElementById('page-jsonld');
  if (!el) { el = document.createElement('script'); el.id = 'page-jsonld'; el.type = 'application/ld+json'; document.head.appendChild(el); }
  el.text = JSON.stringify(data);
}

function _clearJsonLd() {
  const el = document.getElementById('page-jsonld');
  if (el) el.remove();
}


// ────────────────────────────────────────────────────────────
//  LOAD SHARED NAVIGATION (for blog pages)
// ────────────────────────────────────────────────────────────
async function loadNav() {
  try {
    const navPlaceholder = document.getElementById('main-nav');
    if (!navPlaceholder) return; // No placeholder, nav not needed on this page
    
    const response = await fetch('/pages/nav.html?v=20260730-about-other', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load nav');
    
    const navHtml = await response.text();
    
    // Parse HTML safely — nav bar + mobile menu
    const temp = document.createElement('div');
    temp.innerHTML = navHtml;
    const frag = document.createDocumentFragment();
    while (temp.firstChild) {
      if (temp.firstChild.nodeType === Node.COMMENT_NODE) {
        temp.removeChild(temp.firstChild);
        continue;
      }
      frag.appendChild(temp.firstChild);
    }
    
    if (frag.childNodes.length) {
      navPlaceholder.replaceWith(frag);
      _updateThemeToggle(getTheme());
      
      // Re-attach event listeners
      const hamburger = document.getElementById('hamburger');
      if (hamburger) {
        hamburger.onclick = toggleMenu;
      }
    }
    ensureChatWidget();
  } catch (err) {
    console.error('loadNav error:', err);
  }
}

/** Load site assistant widget (CSS + JS) once — SPA shell and blog pages. */
function ensureChatWidget() {
  try {
    if (!document.getElementById('ssc-chat-widget-css')) {
      var link = document.createElement('link');
      link.id = 'ssc-chat-widget-css';
      link.rel = 'stylesheet';
      link.href = '/css/chat-widget.css?v=20260726-chat';
      document.head.appendChild(link);
    }
    if (typeof window.initChatWidget === 'function') {
      window.initChatWidget();
      return;
    }
    if (document.querySelector('script[data-ssc-chat-widget]')) {
      return;
    }
    var script = document.createElement('script');
    script.src = '/js/chat-widget.js?v=20260726-chat';
    script.defer = true;
    script.dataset.sscChatWidget = '1';
    script.onload = function () {
      if (typeof window.initChatWidget === 'function') window.initChatWidget();
    };
    document.head.appendChild(script);
  } catch (err) {
    console.error('ensureChatWidget error:', err);
  }
}

// Make loadNav globally available
window.loadNav = loadNav;

async function loadFooter() {
  try {
    const placeholder = document.querySelector('#main-footer, #footer');
    if (!placeholder) return;
    if (placeholder.innerHTML.trim().length > 0) return;

    const response = await fetch('/pages/footer.html?v=20260726-nosubstack');
    if (!response.ok) throw new Error('Failed to load footer');
    const html = await response.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const newFooter = temp.firstElementChild;
    if (newFooter) placeholder.replaceWith(newFooter);
  } catch (err) {
    console.error('loadFooter error:', err);
  }
}
window.loadFooter = loadFooter;


// ────────────────────────────────────────────────────────────
//  PAGE ROUTING
// ────────────────────────────────────────────────────────────
function showPage(name, pushState = true) {
  if (name === 'codex' && !document.getElementById('page-codex') && typeof window.ensureCodexPageLoaded === 'function') {
    window.ensureCodexPageLoaded().then(function () {
      if (document.getElementById('page-codex')) showPage(name, pushState);
    });
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link, .nav-submenu-link').forEach(l => l.classList.remove('active'));

  // Reset codex initiation state when navigating to it fresh
  if (name === 'codex') {
    const cdx = document.getElementById('page-codex');
    if (cdx) {
      cdx.classList.remove('cdx-active');
      cdx.classList.remove('cdx-settled');
      delete cdx.dataset.cdxActiveView;
    }
    const card = document.getElementById('node-card');
    if (card) card.classList.remove('visible');
    if (cdx) cdx.querySelectorAll('.node.pinned').forEach(function(n) { n.classList.remove('pinned'); });
    if (typeof _codexSetActiveNode === 'function') _codexSetActiveNode(null);
    setTimeout(function() {
      if (typeof _initiateCodex === 'function') _initiateCodex();
    }, 50);
  }

  const page = document.getElementById('page-' + name);
  const hashTarget = (name === 'services' && window.location.hash)
    ? window.location.hash.slice(1)
    : '';
  if (page) {
    page.classList.add('active');
    if (!hashTarget) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'about' && typeof applyLanguage === 'function') applyLanguage(getLang());
  } else {
    // SECONDARY pages load async — retry once after they arrive
    setTimeout(function () {
      const p2 = document.getElementById('page-' + name);
      if (p2) {
        p2.classList.add('active');
        if (!hashTarget) window.scrollTo({ top: 0, behavior: 'smooth' });
        if (name === 'about' && typeof applyLanguage === 'function') applyLanguage(getLang());
      }
    }, 600);
  }

  const navLink = document.getElementById('nav-' + name);
  if (navLink) navLink.classList.add('active');

  const meta = PAGE_META[name] || { title: name + SITE.titleSuffix, description: SITE.description };
  const url  = name === 'home' ? '/' : '/' + name + '/';
  setMeta(meta.title, meta.description, SITE.ogImage, SITE.baseUrl + url, 'website');

  if (pushState && name !== 'codex') {
    history.pushState({ page: name, post: null }, meta.title, url);
  }

  // Inject page-specific structured data
  _injectPageSchema(name);

  if (name === 'codex' && pushState) {
    setTimeout(function() {
      var params = new URLSearchParams(window.location.search);
      var vp = params.get('view');
      var view = vp === 'spiral' ? 'spiral' : vp === 'journey' ? 'journey' : 'matrix';
      setCodexView(view, true);
    }, 0);
  }
}

function _injectPageSchema(name) {
  _clearJsonLd();
  if (name === 'calculator') {
    _setJsonLd({
      '@context'   : 'https://schema.org',
      '@type'      : 'WebApplication',
      'name'       : 'SSC Numerology Calculator',
      'url'        : 'https://simulationsourcecode.com/calculator/',
      'description': 'Free numerology calculator. Enter your birth date and full name to calculate your seven core frequencies: Life Path, Expression, Life Calling, Soul Urge, Outer Persona, Achievement, and Theme.',
      'applicationCategory': 'UtilitiesApplication',
      'operatingSystem'    : 'Any',
      'offers': {
        '@type'       : 'Offer',
        'price'       : '0',
        'priceCurrency': 'USD',
        'description' : 'Free numerology frequency calculator'
      },
      'author': { '@type': 'Organization', 'name': 'Simulation Source Code' }
    });
  } else if (name === 'services') {
    _setJsonLd({
      '@context': 'https://schema.org',
      '@type'   : 'Service',
      'name'    : 'Numerology Readings — Simulation Source Code',
      'url'     : 'https://simulationsourcecode.com/services/',
      'description': 'Personalised numerology guidebook PDF, live consultation, TellTale Tarot, group membership, and original books by Kytholek.',
      'provider': { '@type': 'Organization', 'name': 'Simulation Source Code' },
      'offers'  : [
        { '@type': 'Offer', 'name': 'Guidebook Report', 'price': '22', 'priceCurrency': 'USD' },
        { '@type': 'Offer', 'name': 'Time Cycle', 'price': '17', 'priceCurrency': 'USD' },
        { '@type': 'Offer', 'name': 'Personal Consultation', 'price': '88', 'priceCurrency': 'USD' },
        { '@type': 'Offer', 'name': 'TellTale Tarot Reading', 'price': '20', 'priceCurrency': 'USD' }
      ]
    });
  } else if (name === 'about') {
    _setJsonLd({
      '@context'   : 'https://schema.org',
      '@type'      : 'AboutPage',
      'name'       : 'About Simulation Source Code',
      'url'        : 'https://simulationsourcecode.com/about/',
      'description': 'Simulation Source Code is a numerology framework built on Pythagorean principles, simulation theory, and consciousness research.',
      'author'     : { '@type': 'Organization', 'name': 'Simulation Source Code' }
    });
  }
}


// ────────────────────────────────────────────────────────────
//  MOBILE MENU
// ────────────────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('mobile-menu').classList.toggle('open');
}


// ────────────────────────────────────────────────────────────
//  POPSTATE
// ────────────────────────────────────────────────────────────
window.addEventListener('popstate', e => {
  const s = e.state;
  if (!s)        { showPage('home', false); return; }
  if (s.post)    { redirectToBlogPost(s.post); return; }
  else if (s.page) {
    showPage(s.page, false);
    if (s.page === 'codex') {
      setCodexView(s.codexView === 'spiral' ? 'spiral' : 'matrix', false);
    }
  }
  else             showPage('home', false);
});


// ────────────────────────────────────────────────────────────
//  DEEP LINK ON LOAD
// ────────────────────────────────────────────────────────────
async function handleDeepLink() {
  const params    = new URLSearchParams(window.location.search);
  const postId    = params.get('post');
  const pageId    = params.get('page');  // legacy ?page= support
  const payment   = params.get('payment');
  const pathname  = window.location.pathname.replace(/^\//, '').replace(/\/$/, ''); // e.g. 'services'

  if (postId) {
    redirectToBlogPost(postId);
    return;
  }

  if (payment === 'cancelled') {
    showPage('calculator', false);
    history.replaceState({ page: 'calculator', post: null }, document.title, '/calculator/');
    setTimeout(function() {
      restorePendingGuidebookDetails();
      showPaymentCancelledNotice();
      trackSscEvent('guidebook_checkout_cancelled', { source: 'stripe' });
    }, 80);
    return;
  }

  if (pathname === 'blog') {
    window.location.replace('/blog/');
    return;
  } else if (pageId && PAGE_META[pageId]) {
    if (pageId === 'codex' && typeof window.ensureCodexPageLoaded === 'function') {
      await window.ensureCodexPageLoaded();
    }
    showPage(pageId, false);
    if (pageId === 'codex') {
      const legacyView = params.get('view');
      const legacyCodexView = legacyView === 'spiral' ? 'spiral' : legacyView === 'journey' ? 'journey' : 'matrix';
      const legacyNode = params.get('node');
      setCodexView(legacyCodexView, false);
      history.replaceState(
        { page: 'codex', post: null, codexView: legacyCodexView === 'spiral' ? 'spiral' : 'matrix' },
        document.title,
        legacyCodexView === 'spiral' ? '/codex/?view=spiral'
          : legacyCodexView === 'journey' ? '/codex/?view=journey'
          : legacyNode ? '/codex/?node=' + encodeURIComponent(legacyNode)
          : '/codex/'
      );
    } else {
      const keepHash = pageId === 'services' ? (window.location.hash || '') : '';
      history.replaceState({ page: pageId, post: null }, document.title, '/' + pageId + '/' + keepHash);
    }
  } else if (pathname && PAGE_META[pathname]) {
    if (pathname === 'codex' && typeof window.ensureCodexPageLoaded === 'function') {
      await window.ensureCodexPageLoaded();
    }
    showPage(pathname, false);
    if (pathname === 'codex') {
      const viewParam = params.get('view');
      const codexView = viewParam === 'spiral' ? 'spiral' : viewParam === 'journey' ? 'journey' : 'matrix';
      const nodeParam = params.get('node');
      setCodexView(codexView, false);
      history.replaceState(
        { page: 'codex', post: null, codexView: codexView === 'spiral' ? 'spiral' : 'matrix' },
        document.title,
        codexView === 'spiral' ? '/codex/?view=spiral'
          : codexView === 'journey' ? '/codex/?view=journey'
          : nodeParam ? '/codex/?node=' + encodeURIComponent(nodeParam)
          : '/codex/'
      );
    } else {
      const keepHash = pathname === 'services' ? (window.location.hash || '') : '';
      history.replaceState({ page: pathname, post: null }, document.title, '/' + pathname + '/' + keepHash);
    }
  } else {
    showPage('home', false);
    history.replaceState({ page: 'home', post: null }, document.title, '/');
  }
}

function restorePendingGuidebookDetails() {
  var pending = {};
  try { pending = JSON.parse(sessionStorage.getItem('ssc_pending_order') || '{}'); } catch(e) {}
  if (!pending || typeof pending !== 'object') return;

  var values = {
    'calc-month': pending.month,
    'calc-day': pending.day,
    'calc-year': pending.year,
    'calc-fullname': pending.name,
    'unlock-email': pending.email,
    'calc-lead-email': pending.email,
  };

  Object.keys(values).forEach(function(id) {
    var el = document.getElementById(id);
    if (el && values[id]) el.value = values[id];
  });
}

function showPaymentCancelledNotice() {
  if (document.getElementById('ssc-payment-cancelled')) return;
  var notice = document.createElement('div');
  notice.id = 'ssc-payment-cancelled';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.style.cssText = [
    'position:fixed','left:50%','bottom:24px','transform:translateX(-50%)',
    'z-index:9999','max-width:min(520px, calc(100vw - 32px))',
    'padding:16px 20px','border:1px solid rgba(201,168,76,.35)',
    'border-radius:10px','background:rgba(13,11,24,.94)',
    'box-shadow:0 18px 48px rgba(0,0,0,.35)','color:var(--text)',
    'font-family:EB Garamond, serif','font-size:16px','line-height:1.5',
    'text-align:center','backdrop-filter:blur(12px)'
  ].join(';');
  notice.innerHTML = 'Checkout was cancelled. Your details are still here if you want to continue with the Guidebook Report.';
  document.body.appendChild(notice);
  setTimeout(function() {
    notice.style.transition = 'opacity .5s ease';
    notice.style.opacity = '0';
    setTimeout(function() { if (notice.parentNode) notice.remove(); }, 550);
  }, 8000);
}


// ────────────────────────────────────────────────────────────
//  INIT
// ────────────────────────────────────────────────────────────
async function initApp() {
  initTheme();
  await handleDeepLink();
  // Apply saved language preference on every load
  applyLanguage(getLang());
  _updateLangToggle(getLang());
  _initRpCarousel();
  _initNavHero();
  initHomePage();
  initCodexPage();
  ensureChatWidget();
}


// ────────────────────────────────────────────────────────────
//  HOME PAGE — scroll reveal, chip stagger, SCL boot, parallax
// ────────────────────────────────────────────────────────────
var _homePageInited = false;
var _homeRevealInited = false;
var _homeChipsInited = false;

function initHomePage() {
  var page = document.getElementById('page-home');
  if (!page) return;

  if (_homeRevealInited) {
    page.querySelectorAll('.hp-reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
  var revealEls = _homeRevealInited ? [] : page.querySelectorAll('.hp-reveal');
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(function (el) { revealObs.observe(el); });
  if (revealEls.length) _homeRevealInited = true;

  function revealChips(block) {
    block.querySelectorAll('.hp-freq-chip').forEach(function (chip, i) {
      setTimeout(function () { chip.classList.add('is-visible'); }, i * 90);
    });
    var calling = block.querySelector('.hp-freq-calling-wrap');
    if (calling) calling.classList.add('is-visible');
  }
  var freqBlock = document.getElementById('hp-freq-block');
  if (freqBlock && !_homeChipsInited) {
    freqBlock.querySelectorAll('.hp-freq-chip').forEach(function (chip) {
      chip.classList.add('pre-animate');
    });
    var calling = freqBlock.querySelector('.hp-freq-calling-wrap');
    if (calling) calling.classList.add('pre-animate');

    var chipObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        revealChips(e.target);
        chipObs.unobserve(e.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    chipObs.observe(freqBlock);
    _homeChipsInited = true;
  } else if (freqBlock && _homeChipsInited) {
    revealChips(freqBlock);
  }

  // SCL terminal boot sequence
  var sclObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      sclObs.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  var sclSection = document.getElementById('hp-scl-section');
  if (sclSection) sclObs.observe(sclSection);

  // Hero image parallax (only set up once)
  if (!_homePageInited) {
    initHomeFaqAccordion();
    initHomeStickyCta();
    initHomeCtaTracking();
    initSclCarousel();
    _homePageInited = true;
  }
  initSclCarousel();
}

function initHomeFaqAccordion() {
  if (window._homeFaqBound) return;
  window._homeFaqBound = true;

  // Keep one FAQ open at a time; icons handled via CSS on [open]
  document.addEventListener('toggle', function (e) {
    var item = e.target;
    if (!item || !item.classList || !item.classList.contains('hp-faq-item')) return;
    if (!item.open) return;
    document.querySelectorAll('.hp-faq-item[open]').forEach(function (other) {
      if (other !== item) other.removeAttribute('open');
    });
  }, true);
}

function initHomeStickyCta() {
  var sticky = document.querySelector('.hp-sticky-calc-cta');
  if (!sticky || !window.matchMedia('(max-width: 600px)').matches) return;
  function updateSticky() {
    var onHome = document.getElementById('page-home') && document.getElementById('page-home').classList.contains('active');
    if (!onHome) {
      sticky.classList.remove('is-visible');
      return;
    }
    if (window.scrollY > 420) sticky.classList.add('is-visible');
    else sticky.classList.remove('is-visible');
  }
  window.addEventListener('scroll', updateSticky, { passive: true });
  updateSticky();
}

function initHomeCtaTracking() {
  if (window._homeCtaBound) return;
  window._homeCtaBound = true;
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('.js-track-cta') : null;
    if (!el || !document.getElementById('page-home')) return;
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push({
        event: 'home_cta_click',
        cta_id: el.getAttribute('data-cta') || 'unknown'
      });
    }
  });
}

// ────────────────────────────────────────────────────────────
//  CODEX PAGE — Spirit SVG + tooltip HUD
// ────────────────────────────────────────────────────────────
var NATURE_COLORS_CDX = { electric: '#F5C842', magnetic: '#378ADD', aetheric: '#C0C0E0' };
var PLANE_COLORS_CDX  = { mind: '#7ec8c8', body: '#e8c96b', spirit: '#a96ed4', pivot: '#e8c96b' };

var CODEX_NODES = window.CODEX_NODES || {};


function initSclCarousel() {
  var root = document.getElementById('hp-scl-carousel');
  if (!root || root.dataset.ready === '1') return;
  root.dataset.ready = '1';

  var slides = Array.prototype.slice.call(root.querySelectorAll('.hp-scl-slide'));
  var dotsHost = root.querySelector('.hp-scl-carousel-dots');
  var prevBtn = root.querySelector('.hp-scl-carousel-btn.prev');
  var nextBtn = root.querySelector('.hp-scl-carousel-btn.next');
  var index = 0;
  var timer = null;
  var delay = 4000;
  var liveSlides = [];

  function rebuildLive() {
    liveSlides = slides.filter(function (s) { return !s.classList.contains('is-broken'); });
    if (!liveSlides.length) {
      root.classList.add('is-empty');
      return false;
    }
    root.classList.remove('is-empty');
    if (dotsHost) {
      dotsHost.innerHTML = '';
      liveSlides.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hp-scl-carousel-dot' + (i === 0 ? ' is-active' : '');
        b.setAttribute('aria-label', 'Show screenshot ' + (i + 1));
        b.addEventListener('click', function () { goTo(i); restart(); });
        dotsHost.appendChild(b);
      });
    }
    index = 0;
    show(0);
    return true;
  }

  function show(i) {
    if (!liveSlides.length) return;
    index = ((i % liveSlides.length) + liveSlides.length) % liveSlides.length;
    slides.forEach(function (s) { s.classList.remove('is-active'); });
    liveSlides[index].classList.add('is-active');
    if (dotsHost) {
      Array.prototype.forEach.call(dotsHost.children, function (d, di) {
        d.classList.toggle('is-active', di === index);
      });
    }
  }

  function goTo(i) { show(i); }
  function next() { show(index + 1); }
  function prev() { show(index - 1); }

  function restart() {
    clearInterval(timer);
    if (liveSlides.length > 1) timer = setInterval(next, delay);
  }

  var pending = slides.length;
  if (!pending) {
    root.classList.add('is-empty');
    return;
  }

  slides.forEach(function (slide) {
    var img = slide.querySelector('img');
    if (!img) {
      slide.classList.add('is-broken');
      pending -= 1;
      if (pending <= 0) { if (rebuildLive()) restart(); }
      return;
    }
    function done(ok) {
      if (!ok) slide.classList.add('is-broken');
      pending -= 1;
      if (pending <= 0) { if (rebuildLive()) restart(); }
    }
    if (img.complete && img.naturalWidth > 0) {
      done(true);
    } else if (img.complete) {
      done(false);
    } else {
      img.addEventListener('load', function () { done(true); }, { once: true });
      img.addEventListener('error', function () { done(false); }, { once: true });
    }
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { prev(); restart(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { next(); restart(); });

  root.addEventListener('mouseenter', function () { clearInterval(timer); });
  root.addEventListener('mouseleave', function () { restart(); });
  root.addEventListener('focusin', function () { clearInterval(timer); });
  root.addEventListener('focusout', function () { restart(); });

  // Minimal swipe
  var startX = null;
  root.addEventListener('pointerdown', function (e) { startX = e.clientX; });
  root.addEventListener('pointerup', function (e) {
    if (startX == null) return;
    var dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next(); else prev();
    restart();
  });
}


function _codexNodeColor(node) {
  var nature = node.dataset.nature;
  if (nature && NATURE_COLORS_CDX[nature]) return NATURE_COLORS_CDX[nature];
  return PLANE_COLORS_CDX[node.dataset.plane] || '#F5C842';
}

function _codexSetActiveNode(num) {
  var page = document.getElementById('page-codex');
  if (!page) return;
  page.querySelectorAll('.cdxfield-node-group.is-active').forEach(function(g) {
    g.classList.remove('is-active');
  });
  if (num) {
    var group = page.querySelector('.cdxfield-node-group[data-num="' + num + '"]');
    if (group) group.classList.add('is-active');
    page.classList.add('codex-node-focus');
  } else {
    page.classList.remove('codex-node-focus');
  }
}
window._codexSetActiveNode = _codexSetActiveNode;

function hudShow(node) {
  var num     = node.dataset.num;
  var meta    = CODEX_NODES[num];
  var card    = document.getElementById('node-card');
  var numEl   = document.getElementById('nc-number');
  if (!card || !numEl) return;
  var color   = _codexNodeColor(node);
  numEl.textContent      = num || '—';
  numEl.style.color      = color;
  numEl.style.textShadow = '0 0 30px ' + color;
  document.getElementById('nc-name').textContent     = meta ? meta.name     : '';
  document.getElementById('nc-position').textContent = meta ? meta.position : '';
  document.getElementById('nc-essence').textContent  = meta ? meta.essence  : '';
  document.getElementById('nc-body').textContent     = meta ? meta.body     : '';
  var actionsEl = document.getElementById('nc-actions');
  if (actionsEl) {
    actionsEl.innerHTML = '';
    if (meta && meta.links) {
      meta.links.forEach(function(link, i) {
        var btn = document.createElement('a');
        btn.href = link.href;
        btn.textContent = link.label;
        btn.className = 'nc-btn ' + (i === 0 ? 'nc-btn-lp' : 'nc-btn-calc');
        actionsEl.appendChild(btn);
      });
    }
  }
  card.classList.add('visible');
  if (node && node.dataset.num) _codexSetActiveNode(node.dataset.num);
}

function hudReset() {
  var card = document.getElementById('node-card');
  if (card) card.classList.remove('visible');
  _codexSetActiveNode(null);
}

function setCodexView(view, pushState) {
  var journey = view === 'journey';
  view = view === 'spiral' ? 'spiral' : 'matrix';
  var page = document.getElementById('page-codex');
  if (!page) return;
  if (page.dataset.cdxActiveView === view) {
    if (view === 'spiral') {
      _ensureCodexSpiral(page);
    } else {
      _ensureCodexMatrix(page);
      if (journey && typeof window._startCodexJourney === 'function') window._startCodexJourney(page);
    }
    if (journey) {
      if (typeof window._startCodexJourney === 'function') window._startCodexJourney(page);
      if (pushState) {
        var jMeta = PAGE_META.codex || { title: 'Codex' };
        history.pushState({ page: 'codex', post: null, codexView: 'matrix' }, jMeta.title, '/codex/?view=journey');
      }
    }
    return;
  }
  page.dataset.cdxActiveView = view;

  var matrixPanel = page.querySelector('.cdx-view-matrix');
  var spiralPanel = page.querySelector('.cdx-view-spiral');
  var instruction = document.getElementById('codex-instruction');

  page.querySelectorAll('.cdx-view-tab').forEach(function(tab) {
    tab.classList.toggle('is-active', tab.dataset.cdxView === view);
  });

  if (matrixPanel) {
    matrixPanel.classList.toggle('is-active', view === 'matrix');
    matrixPanel.hidden = view !== 'matrix';
  }
  if (spiralPanel) {
    spiralPanel.classList.toggle('is-active', view === 'spiral');
    spiralPanel.hidden = view !== 'spiral';
  }

  if (instruction) {
    instruction.textContent = view === 'spiral'
      ? 'Click any number to learn \u00b7 Play traces 0\u219299 in spiral order \u00b7 Root-aligned rays'
      : 'Hover to explore \u00b7 Click to pin \u00b7 Keys 0\u20139 \u00b7 Arrows follow the flow';
  }

  if (view === 'matrix') {
    var spiralRoot = page.querySelector('.cdx-spiral-root');
    if (spiralRoot && typeof spiralRoot._stopSpiral === 'function') spiralRoot._stopSpiral();
    hudReset();
    _ensureCodexMatrix(page);
    requestAnimationFrame(function() {
      _ensureCodexMatrix(page);
      requestAnimationFrame(function() {
        if (typeof triggerCodexMatrixConstruct === 'function') triggerCodexMatrixConstruct(page);
        if (journey && typeof window._startCodexJourney === 'function') window._startCodexJourney(page);
      });
    });
  }

  if (view === 'spiral') {
    if (typeof window._exitCodexJourney === 'function') window._exitCodexJourney();
    if (typeof window._cdxStopTrace === 'function') window._cdxStopTrace();
    hudReset();
    _ensureCodexSpiral(page);
    requestAnimationFrame(function() {
      _ensureCodexSpiral(page);
      requestAnimationFrame(function() {
        if (typeof triggerCodexSpiralAutoPlay === 'function') {
          triggerCodexSpiralAutoPlay(page);
        }
      });
    });
  }

  if (pushState) {
    var meta = PAGE_META.codex || { title: 'Codex' };
    var url  = journey ? '/codex/?view=journey' : view === 'spiral' ? '/codex/?view=spiral' : '/codex/';
    history.pushState({ page: 'codex', post: null, codexView: view }, meta.title, url);
  }
}
window.setCodexView = setCodexView;

function navigateCodex(view, e) {
  var isSpa = !!document.getElementById('page-home');
  if (!isSpa) return;
  if (e) e.preventDefault();
  var v = view === 'spiral' ? 'spiral' : 'matrix';
  var go = function() {
    showPage('codex', false);
    setCodexView(v, true);
  };
  if (!document.getElementById('page-codex') && typeof window.ensureCodexPageLoaded === 'function') {
    window.ensureCodexPageLoaded().then(go);
  } else {
    go();
  }
}
window.navigateCodex = navigateCodex;

function navigateCodexNode(num, e) {
  var isSpa = !!document.getElementById('page-home');
  if (!isSpa) return;
  if (e) e.preventDefault();
  num = String(parseInt(num, 10));
  if (!num || num === 'NaN') return;
  var go = function() {
    showPage('codex', false);
    setCodexView('matrix', true);
    var meta = PAGE_META.codex || { title: 'Codex' };
    history.pushState({ page: 'codex', post: null, codexView: 'matrix' }, meta.title, '/codex/?node=' + encodeURIComponent(num));
    var pin = function() {
      if (typeof window.pinCodexNode === 'function') window.pinCodexNode(num);
    };
    setTimeout(pin, 1800);
    setTimeout(pin, 2800);
  };
  if (!document.getElementById('page-codex') && typeof window.ensureCodexPageLoaded === 'function') {
    window.ensureCodexPageLoaded().then(go);
  } else {
    go();
  }
}
window.navigateCodexNode = navigateCodexNode;

var CODEX_SCRIPT_PATHS = [
  '/js/codex-spiral.js',
  '/js/codex-spiral-learn.js',
  '/js/codex-matrix.js',
  '/js/codex-learn.js'
];
var _codexScriptsPromise = null;

function _scriptPathMatches(script, src) {
  try {
    return new URL(script.src, window.location.href).pathname === new URL(src, window.location.href).pathname;
  } catch (_) {
    return script.src && script.src.indexOf(src) !== -1;
  }
}

function _loadScriptOnce(src) {
  var existing = Array.from(document.scripts).find(function(script) {
    return _scriptPathMatches(script, src);
  });
  if (existing) {
    if (existing.dataset.loaded === '1' || document.readyState !== 'loading') return Promise.resolve();
    return new Promise(function(resolve, reject) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = function() {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function _ensureCodexScripts() {
  if (typeof initCodexMatrix === 'function' &&
      typeof initCodexSpiral === 'function' &&
      typeof initCodexLearn === 'function') {
    return Promise.resolve();
  }
  if (!_codexScriptsPromise) {
    _codexScriptsPromise = CODEX_SCRIPT_PATHS.reduce(function(chain, src) {
      return chain.then(function() { return _loadScriptOnce(src); });
    }, Promise.resolve()).catch(function(err) {
      _codexScriptsPromise = null;
      console.error('Codex script load error:', err);
      throw err;
    });
  }
  return _codexScriptsPromise;
}

function _ensureCodexMatrix(page, attempt) {
  attempt = attempt || 0;
  var wrap = page && page.querySelector('#codex-spirit-wrap');
  if (!wrap) return;
  if (typeof initCodexMatrix === 'function') {
    initCodexMatrix(wrap);
    return;
  }
  if (attempt === 0) {
    _ensureCodexScripts().then(function() { _ensureCodexMatrix(page, 1); }).catch(function() {});
    return;
  }
  if (attempt < 40) {
    setTimeout(function() { _ensureCodexMatrix(page, attempt + 1); }, 50);
  }
}

function _ensureCodexSpiral(page, attempt) {
  attempt = attempt || 0;
  var root = page && page.querySelector('.cdx-spiral-root');
  if (!root) return;
  if (typeof initCodexSpiral === 'function') {
    initCodexSpiral(root);
    return;
  }
  if (attempt === 0) {
    _ensureCodexScripts().then(function() { _ensureCodexSpiral(page, 1); }).catch(function() {});
    return;
  }
  if (attempt < 40) {
    setTimeout(function() { _ensureCodexSpiral(page, attempt + 1); }, 50);
  }
}

function _bindCodexViews(page) {
  /* Tab clicks handled via document delegation below */
}

function _ensureCodexLearn(page, attempt) {
  attempt = attempt || 0;
  if (!page) return;
  if (typeof initCodexLearn === 'function') {
    initCodexLearn(page);
    return;
  }
  if (attempt === 0) {
    _ensureCodexScripts().then(function() { _ensureCodexLearn(page, 1); }).catch(function() {});
    return;
  }
  if (attempt < 40) {
    setTimeout(function() { _ensureCodexLearn(page, attempt + 1); }, 50);
  }
}

(function() {
  if (document.documentElement.dataset.codexTabsDelegated === '1') return;
  document.documentElement.dataset.codexTabsDelegated = '1';
  document.addEventListener('click', function(e) {
    var tab = e.target.closest && e.target.closest('.cdx-view-tab');
    if (!tab || !tab.closest('#page-codex')) return;
    var v = tab.dataset.cdxView;
    if (v) {
      e.preventDefault();
      setCodexView(v, true);
    }
  });
})();

function initCodexPage() {
  var page = document.getElementById('page-codex');
  if (!page) return;
  _bindCodexViews(page);
  if (page.dataset.codexBound === '1') return;
  if (!page.querySelectorAll('.node').length) return;

  page.dataset.codexBound = '1';

  // Fixed overlays must sit on body — position:fixed breaks inside transformed .page.active
  ['node-card', 'modal-666', 'modal-369', 'modal-alternator'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  });

  function hasPinned() { return !!page.querySelector('.node.pinned'); }

  page.querySelectorAll('.node').forEach(function(node) {
    var hideTimer = null;
    node.addEventListener('mouseenter', function() {
      if (hasPinned()) return;
      clearTimeout(hideTimer);
      hudShow(node);
    });
    node.addEventListener('mouseleave', function() {
      if (hasPinned()) return;
      hideTimer = setTimeout(function() {
        hudReset();
      }, 200);
    });
    node.addEventListener('click', function(e) {
      if (e.target.closest('.nc-btn')) return;
      e.stopPropagation();
      var wasPinned = node.classList.contains('pinned');
      page.querySelectorAll('.node.pinned').forEach(function(n) { n.classList.remove('pinned'); });
      if (!wasPinned) {
        node.classList.add('pinned');
        hudShow(node);
      } else {
        hudReset();
      }
    });
  });

  document.addEventListener('click', function codexOutsideClick(e) {
    if (!document.getElementById('page-codex')?.classList.contains('active')) return;
    if (e.target.closest('#page-codex .node') || e.target.closest('#node-card')) return;
    page.querySelectorAll('.node.pinned').forEach(function(n) { n.classList.remove('pinned'); });
    hudReset();
  });

  document.addEventListener('keydown', function codexEscape(e) {
    if (e.key !== 'Escape') return;
    ['modal-666', 'modal-369', 'modal-alternator'].forEach(function(id) {
      var m = document.getElementById(id);
      if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
    });
  });

  _ensureCodexLearn(page);

  if (window._initiateCodex) window._initiateCodex();
}
window.initCodexPage = initCodexPage;

function openModal(id) {
  var m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'modal-666') {
    document.querySelectorAll('#page-codex .axis-sum').forEach(function(el) { el.classList.add('revealed'); });
  }
}
window.openModal = openModal;

function closeModal(id, e) {
  if (e && e.target !== document.getElementById(id)) return;
  var m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
  if (id === 'modal-666') {
    document.querySelectorAll('#page-codex .axis-sum').forEach(function(el) { el.classList.remove('revealed'); });
  }
}
window.closeModal = closeModal;

var NODE_SLUGS_CDX = {
  '1':'life-path-1-numerology','2':'life-path-2-numerology','3':'life-path-3-numerology',
  '4':'life-path-4-numerology','5':'life-path-5-numerology','6':'life-path-6-numerology',
  '7':'life-path-7-numerology','8':'life-path-8-numerology','9':'life-path-9-numerology',
};
function shareNode(e, num) {
  e.stopPropagation();
  var url = 'https://simulationsourcecode.com/blog/' + (NODE_SLUGS_CDX[num] || '') + '/';
  var btn = e.currentTarget;
  function markCopied() { btn.textContent = '✓ copied'; btn.classList.add('copied'); setTimeout(function(){ btn.innerHTML = '⧉ share'; btn.classList.remove('copied'); }, 2000); }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(markCopied).catch(function() {
      var inp = document.createElement('input'); inp.value = url;
      document.body.appendChild(inp); inp.select(); document.execCommand('copy'); inp.remove(); markCopied();
    });
  } else {
    var inp = document.createElement('input'); inp.value = url;
    document.body.appendChild(inp); inp.select(); document.execCommand('copy'); inp.remove(); markCopied();
  }
}
window.shareNode = shareNode;

function _initiateCodex() {
  var page = document.getElementById('page-codex');
  if (!page) return;
  page.classList.add('cdx-active');
}
window._initiateCodex = _initiateCodex;


// ────────────────────────────────────────────────────────────
//  NAV HERO — expand on home page when at top, shrink on scroll
// ────────────────────────────────────────────────────────────
function _initNavHero() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  function _updateNavHero() {
    const onHome   = document.getElementById('page-home')?.classList.contains('active');
    const atTop    = window.scrollY < 60;
    if (onHome && atTop) {
      nav.classList.add('nav-hero');
    } else {
      nav.classList.remove('nav-hero');
    }
  }

  window.addEventListener('scroll', _updateNavHero, { passive: true });
  // Also re-evaluate whenever showPage is called
  const _origShowPage = window.showPage;
  window.showPage = function(name, pushState) {
    _origShowPage(name, pushState);
    _updateNavHero();
    if (name === 'home')     setTimeout(initHomePage,     50);
    if (name === 'codex')    setTimeout(initCodexPage,    50);
    if (name === 'services') setTimeout(initServicesPage, 100);
  };

  _updateNavHero(); // run once on load
}

// ────────────────────────────────────────────────────────────
//  EXPOSE to inline onclick attributes
// ────────────────────────────────────────────────────────────
window.toggleMenu = toggleMenu;
window.toggleTheme = toggleTheme;
window.setTheme    = setTheme;
window.getTheme    = getTheme;
window.showPage    = showPage;
window.openPost    = openPost;
window.closePosts  = closePosts;


// ────────────────────────────────────────────────────────────
//  Calculator button binding
// ────────────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target?.closest?.('.calc-btn');
  if (!btn || typeof window.calculateReading !== 'function') return;
  e.preventDefault();
  window.calculateReading();
});


// ════════════════════════════════════════════════════════════
//  i18n — LANGUAGE SYSTEM
//  Reads SSC_TRANSLATIONS from translations.js
//  Applies to all [data-i18n] elements on the page
// ════════════════════════════════════════════════════════════

const I18N_KEY     = 'ssc-lang';
const I18N_DEFAULT = 'en';

// Returns the active language ('en' or 'es')
function getLang() {
  return localStorage.getItem(I18N_KEY) || I18N_DEFAULT;
}

const THEME_KEY = 'ssc-theme';

function getTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function _updateThemeToggle(theme) {
  const label = theme === 'dark' ? 'Light' : 'Dark';
  const aria = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const title = theme === 'dark' ? 'Switch theme to light' : 'Switch theme to dark';

  ['theme-toggle', 'theme-toggle-mobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = label;
    btn.setAttribute('aria-label', aria);
    btn.setAttribute('title', title);
  });
}

function setTheme(theme, save = true) {
  theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;

  if (save) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      // ignore storage failures
    }
  }

  _updateThemeToggle(theme);
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  setTheme(getTheme(), false);
}

document.addEventListener('DOMContentLoaded', initTheme);
if (document.readyState !== 'loading') initTheme();

// Swap to a language and re-render all keyed elements
function setLang(lang) {
  var prev = getLang();
  localStorage.setItem(I18N_KEY, lang);
  applyLanguage(lang, { recalcIfReading: prev !== lang });
  _updateLangToggle(lang);
}

// Toggle between en ↔ es
function toggleLang() {
  setLang(getLang() === 'en' ? 'es' : 'en');
}

// Apply translations to every [data-i18n] element in the DOM
// Fades elements out, swaps text, fades back in
function applyLanguage(lang, opts) {
  opts = opts || {};
  lang = lang || getLang();
  if (typeof SSC_TRANSLATIONS === 'undefined') return;

  const els = document.querySelectorAll('[data-i18n]');

  // If this is a user-triggered swap, do a quick fade
  const isSwap = document._i18nReady;
  if (isSwap) els.forEach(el => el.classList.add('lang-switching'));

  const doSwap = () => {
    els.forEach(el => {
      const key   = el.dataset.i18n;
      const entry = SSC_TRANSLATIONS[key];
      if (!entry) return;
      const text = entry[lang] || entry[I18N_DEFAULT] || '';
      if (text.includes('<') || text.includes('&')) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    });

    // Handle data-i18n-placeholder (e.g. calculator name input)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key   = el.dataset.i18nPlaceholder;
      const entry = SSC_TRANSLATIONS[key];
      if (entry) el.placeholder = entry[lang] || entry[I18N_DEFAULT] || '';
    });
    document.documentElement.lang = lang;
    if (isSwap) {
      requestAnimationFrame(() => els.forEach(el => el.classList.remove('lang-switching')));
    }

    // Re-render an active reading only when the user switched language
    if (opts.recalcIfReading) {
      const resultsArea = document.getElementById('results-area');
      const hasReading  = resultsArea && !resultsArea.querySelector('.results-placeholder-icon');
      if (hasReading && typeof calculateReading === 'function') {
        const month = document.getElementById('calc-month')?.value;
        const day   = document.getElementById('calc-day')?.value;
        const year  = document.getElementById('calc-year')?.value;
        const name  = document.getElementById('calc-fullname')?.value;
        if (month && day && year && name) calculateReading();
      }
    }
  };

  if (isSwap) {
    setTimeout(doSwap, 180);
  } else {
    doSwap();
    document._i18nReady = true; // mark ready for future swaps
  }
}

// Keep the toggle button label in sync
function _updateLangToggle(lang) {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  btn.textContent = lang === 'en' ? 'ES' : 'EN';
  btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Spanish' : 'Switch to English');
  btn.setAttribute('title',      lang === 'en' ? 'Ver en Español'    : 'View in English');
}

// Expose
window.toggleLang    = toggleLang;
window.setLang       = setLang;
window.applyLanguage = applyLanguage;


// ════════════════════════════════════════════════════════════
//  CALCULATOR MODAL — Services Page
//  Pop-up calculator overlay for guidebook purchase flow
// ════════════════════════════════════════════════════════════

var MODAL_CHECKOUT_BTN_LABEL = 'Get My $22 Guidebook';
var MODAL_PRODUCT = 'guidebook';

var MODAL_PRODUCT_COPY = {
  guidebook: {
    title: 'Your Details',
    subtitle: "We'll send your guidebook to your inbox.",
    emailLabel: 'Where shall we send your guidebook?',
    btnLabel: 'Get My $22 Guidebook',
    eventName: 'guidebook_checkout_start'
  },
  'time-cycle': {
    title: 'Your Details',
    subtitle: "We'll build your 3-month forecast and email the PDF.",
    emailLabel: 'Where shall we send your Time Cycle?',
    btnLabel: 'Get My $17 Time Cycle',
    eventName: 'timecycle_checkout_start'
  },
  bundle: {
    title: 'Your Details',
    subtitle: "We'll send both PDFs — Guidebook + Time Cycle — to your inbox.",
    emailLabel: 'Where shall we send your bundle?',
    btnLabel: 'Get Both for $29',
    eventName: 'bundle_checkout_start'
  }
};

function openCalculatorModal(product) {
  if (product === 'time-cycle') MODAL_PRODUCT = 'time-cycle';
  else if (product === 'bundle') MODAL_PRODUCT = 'bundle';
  else MODAL_PRODUCT = 'guidebook';
  var copy = MODAL_PRODUCT_COPY[MODAL_PRODUCT] || MODAL_PRODUCT_COPY.guidebook;
  var titleEl = document.getElementById('modal-calculator-title');
  var subEl = document.getElementById('modal-calculator-subtitle');
  var labelEl = document.getElementById('modal-unlock-email-label');
  var btn = document.getElementById('modal-unlock-pay-btn');
  if (titleEl) titleEl.textContent = copy.title;
  if (subEl) subEl.textContent = copy.subtitle;
  if (labelEl) labelEl.textContent = copy.emailLabel;
  if (btn) {
    btn.disabled = false;
    btn.textContent = copy.btnLabel;
  }
  MODAL_CHECKOUT_BTN_LABEL = copy.btnLabel;

  var overlay = document.getElementById('calculator-modal-overlay');
  if (overlay) overlay.classList.add('open');
  setTimeout(function() {
    var month = document.getElementById('modal-calc-month');
    if (month) month.focus();
  }, 100);
}

/**
 * Prefill + auto-open guidebook checkout from query params
 * (e.g. life app Character Guidebook CTA).
 * Expected: ?product=guidebook&name=...&month=...&day=...&year=...&email=...&source=scl
 */
function applyGuidebookPrefillFromQuery() {
  var params = new URLSearchParams(window.location.search);
  var product = (params.get('product') || '').toLowerCase();
  var source = (params.get('source') || '').toLowerCase();
  var name = params.get('name');
  var month = params.get('month');
  var day = params.get('day');
  var year = params.get('year');
  var email = params.get('email');

  var knownProduct = product === 'guidebook' || product === 'bundle' || product === 'time-cycle';
  var hasIdentity = !!(name || month || day || year || email);
  if (!knownProduct && !(source === 'scl' && hasIdentity)) return;

  if (!knownProduct) product = 'guidebook';

  var monthEl = document.getElementById('modal-calc-month');
  var dayEl   = document.getElementById('modal-calc-day');
  var yearEl  = document.getElementById('modal-calc-year');
  var nameEl  = document.getElementById('modal-calc-fullname');
  var emailEl = document.getElementById('modal-unlock-email');

  if (monthEl && month) monthEl.value = String(parseInt(month, 10) || '');
  if (dayEl && day) dayEl.value = String(parseInt(day, 10) || '');
  if (yearEl && year) yearEl.value = String(parseInt(year, 10) || '');
  if (nameEl && name) nameEl.value = name;
  if (emailEl && email) emailEl.value = email;

  openCalculatorModal(product);

  if (typeof trackSscEvent === 'function') {
    trackSscEvent('guidebook_prefill_open', {
      source: source || 'query',
      product: product,
      has_name: !!name,
      has_dob: !!(month && day && year),
      has_email: !!email,
    });
  }

  // Drop query params so refresh does not reopen the modal; keep product hash
  try {
    var hash = product === 'bundle' ? 'bundle' : product === 'time-cycle' ? 'season' : 'guidebook';
    history.replaceState(
      { page: 'services', post: null },
      document.title,
      '/services/#' + hash
    );
  } catch (e) { /* ignore */ }
}

function closeCalculatorModal() {
  var overlay = document.getElementById('calculator-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  resetCalculatorModal();
  MODAL_PRODUCT = 'guidebook';
}

function scrollServicesHash() {
  var id = (window.location.hash || '').replace(/^#/, '');
  if (!id) return;
  var el = document.getElementById(id);
  if (!el) return;
  requestAnimationFrame(function() {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function initServicesSectionNav() {
  var nav = document.querySelector('#page-services .svc-section-nav');
  if (!nav || nav.dataset.bound === '1') return;
  nav.dataset.bound = '1';

  var links = Array.prototype.slice.call(nav.querySelectorAll('.svc-section-nav-link'));

  links.forEach(function(link) {
    link.addEventListener('click', function(e) {
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      var target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      history.replaceState(
        { page: 'services', post: null },
        document.title,
        '/services/' + href
      );
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

var SVC_BOOKS = {
  'true-baptism': {
    title: 'True Baptism',
    author: 'Kytholek',
    tag: 'Original',
    img: '/Images/truebaptism.png',
    desc: 'The Ideals of Simulation Source Code, now within Biblical Scripture. Rather than treating scripture as distant history or abstract theology, this book approaches it as a living framework, one that describes the internal condition of the individual and the process of real change and transfiguration that happens with being Baptised in the Holy Spirit.',
    url: 'https://amzn.to/4vVM10j'
  },
  ssc: {
    title: 'Simulation Source Code',
    author: 'Kytholek',
    tag: 'Original',
    img: '/Images/SSCbook.png',
    desc: 'The complete framework for understanding numerology as the underlying code of reality.',
    url: null
  },
  forgetting: {
    title: 'Forgetting to Remember Again',
    author: 'Kytholek',
    tag: 'Original',
    img: '/Images/forgettingtoremember.png',
    desc: 'A guide to retrieving forgotten truths about your identity and purpose.',
    url: null
  },
  'reality-lost': {
    title: 'Reality/Lost',
    author: 'Kytholek',
    tag: 'Original',
    img: '/Images/realitylostcovermain.png',
    desc: 'After a promising path in the Marine Corps ends in an Other Than Honorable discharge, a man is cast outside the system he once trusted and forced into confrontation with his past, his addictions, and the nature of reality itself.',
    url: 'https://amzn.to/41nny6V'
  },
  'out-of-place': {
    title: 'Out of Place',
    author: 'Giada Ferrari',
    tag: 'Featured',
    img: '/Images/outofplace.png',
    desc: 'When you\'re born feeling different, the entire world can become a constant trap from which you must escape. But what happens when you discover that the problem isn\'t the place you are trying to escape?\n\nBetween sudden departures, scarring loves, existential questions, identity crises, psychotherapy, spirituality, and a constant dialogue with the relentless "background noise", this memoir explores the sense of belonging, the weight of inherited beliefs, and the courage needed to question everything we think we know about ourselves and learn to look at it with different eyes.\n\nA true story of searching, falls and rebirth, dedicated to those who have felt out of place at least once. Because sometimes what makes us different is not a curse, but a guide to finding our way home.',
    url: 'https://amzn.to/4yJz24h'
  }
};

function openBookDetail(id) {
  var book = SVC_BOOKS[id];
  if (!book) return;
  var overlay = document.getElementById('book-detail-overlay');
  var img = document.getElementById('book-detail-img');
  var tag = document.getElementById('book-detail-tag');
  var title = document.getElementById('book-detail-title');
  var author = document.getElementById('book-detail-author');
  var desc = document.getElementById('book-detail-desc');
  var cta = document.getElementById('book-detail-cta');
  if (!overlay || !img || !tag || !title || !author || !desc || !cta) return;

  // Page fade animation uses transform, which traps position:fixed — park on body.
  if (overlay.parentNode !== document.body) {
    document.body.appendChild(overlay);
  }

  img.src = book.img;
  img.alt = book.title;
  tag.textContent = book.tag;
  title.textContent = book.title;
  author.textContent = book.author;
  desc.textContent = book.desc;
  desc.style.whiteSpace = 'pre-line';

  if (book.url) {
    cta.hidden = false;
    cta.href = book.url;
    cta.textContent = 'View on Amazon \u2192';
    cta.removeAttribute('aria-disabled');
    cta.classList.remove('is-disabled');
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
  } else {
    cta.hidden = true;
    cta.href = '#';
    cta.removeAttribute('target');
    cta.removeAttribute('rel');
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  var closeBtn = document.getElementById('book-detail-close');
  if (closeBtn) closeBtn.focus();
}

function closeBookDetail() {
  var overlay = document.getElementById('book-detail-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function initBookDetailModal() {
  var overlay = document.getElementById('book-detail-overlay');
  if (!overlay) return;
  if (overlay.parentNode !== document.body) {
    document.body.appendChild(overlay);
  }
  if (overlay.dataset.bound === '1') return;
  overlay.dataset.bound = '1';

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeBookDetail();
  });

  var closeBtn = document.getElementById('book-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBookDetail);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeBookDetail();
    }
  });

  document.querySelectorAll('#page-services [data-book-id]').forEach(function(tile) {
    tile.addEventListener('click', function() {
      openBookDetail(tile.getAttribute('data-book-id'));
    });
  });

  var cta = document.getElementById('book-detail-cta');
  if (cta) {
    cta.addEventListener('click', function(e) {
      if (cta.classList.contains('is-disabled') || cta.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
      }
    });
  }
}

function initServicesPage() {
  var overlay = document.getElementById('calculator-modal-overlay');
  if (overlay && overlay.dataset.bound !== '1') {
    overlay.dataset.bound = '1';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeCalculatorModal();
    });
  }
  initBookDetailModal();
  initServicesSectionNav();
  scrollServicesHash();
  loadGoogleReviews();
  applyGuidebookPrefillFromQuery();
}

function renderGoogleReviewStars(rating) {
  var rounded = Math.round(rating || 5);
  var stars = '';
  for (var i = 0; i < 5; i++) {
    stars += i < rounded ? '\u2605' : '\u2606';
  }
  return stars;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadGoogleReviews() {
  var wrap = document.getElementById('svc-google-reviews');
  var grid = document.getElementById('svc-google-reviews-grid');
  var ratingEl = document.getElementById('svc-google-reviews-rating');
  if (!wrap || !grid || !ratingEl) return;

  fetch('/api/google-reviews')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data.configured || data.error || !data.reviews || !data.reviews.length) return;

      wrap.hidden = false;
      grid.innerHTML = data.reviews.map(function(review) {
        return (
          '<div class="svc-testimonial svc-testimonial--google">' +
            '<div class="svc-testimonial-stars">' + renderGoogleReviewStars(review.rating) + '</div>' +
            '<p class="svc-testimonial-text">&ldquo;' + escapeHtml(review.text) + '&rdquo;</p>' +
            '<div class="svc-testimonial-author">' +
              escapeHtml(review.author) + ' &nbsp;&#183;&nbsp; <span>Google Review</span>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      var reviewLink = data.reviewUrl || data.mapsUrl || '#';
      ratingEl.innerHTML =
        '<span class="svc-rating-stars">' + renderGoogleReviewStars(data.rating) + '</span>' +
        '<span class="svc-rating-text">' +
          (data.rating || 0).toFixed(1) + ' &nbsp;&#183;&nbsp; ' +
          (data.total || 0) + ' Reviews &nbsp;&#183;&nbsp; ' +
          '<a href="' + escapeHtml(reviewLink) + '" class="svc-rating-link" target="_blank" rel="noopener noreferrer">Leave a review</a>' +
        '</span>';
    })
    .catch(function(err) {
      console.warn('Google reviews unavailable:', err);
    });
}

function resetCalculatorModal() {
  var month = document.getElementById('modal-calc-month');
  var day   = document.getElementById('modal-calc-day');
  var year  = document.getElementById('modal-calc-year');
  var name  = document.getElementById('modal-calc-fullname');
  var email = document.getElementById('modal-unlock-email');
  var err   = document.getElementById('modal-unlock-email-error');
  if (month) month.value = '';
  if (day)   day.value = '';
  if (year)  year.value = '';
  if (name)  name.value = '';
  if (email) email.value = '';
  if (err)   err.textContent = '';
  [month, day, year, name].forEach(function(el) {
    if (el) el.classList.remove('ssc-input-error');
  });
}

function validateModalGuidebookFields() {
  var monthEl = document.getElementById('modal-calc-month');
  var dayEl   = document.getElementById('modal-calc-day');
  var yearEl  = document.getElementById('modal-calc-year');
  var nameEl  = document.getElementById('modal-calc-fullname');
  if (!monthEl || !dayEl || !yearEl || !nameEl) return false;

  var hasError = false;
  [monthEl, dayEl, yearEl, nameEl].forEach(function(el) { el.classList.remove('ssc-input-error'); });
  if (!parseInt(monthEl.value)) { monthEl.classList.add('ssc-input-error'); hasError = true; }
  if (!parseInt(dayEl.value))   { dayEl.classList.add('ssc-input-error'); hasError = true; }
  if (!parseInt(yearEl.value))  { yearEl.classList.add('ssc-input-error'); hasError = true; }
  if (!nameEl.value.trim())     { nameEl.classList.add('ssc-input-error'); hasError = true; }
  if (hasError) {
    var firstErr = document.querySelector('#calculator-modal-overlay .ssc-input-error');
    if (firstErr) firstErr.focus();
  }
  return !hasError;
}

function handleUnlockPaymentModal() {
  var emailInput = document.getElementById('modal-unlock-email');
  var errorEl   = document.getElementById('modal-unlock-email-error');
  var btn        = document.getElementById('modal-unlock-pay-btn');
  var email      = (emailInput ? emailInput.value : '').trim();

  console.log('=== handleUnlockPaymentModal called ===');
  console.log('Email:', email);
  console.log('Button element:', btn);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('Invalid email, returning');
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid email address.';
      errorEl.style.color = 'var(--rose-light)';
    }
    if (emailInput) emailInput.focus();
    return;
  }

  if (!validateModalGuidebookFields()) {
    if (errorEl) {
      errorEl.textContent = 'Please fill in your birth date and full name before proceeding.';
      errorEl.style.color = 'var(--rose-light)';
    }
    return;
  }

  var nameVal  = (document.getElementById('modal-calc-fullname') || {}).value || '';
  var monthVal = (document.getElementById('modal-calc-month')    || {}).value || '';
  var dayVal   = (document.getElementById('modal-calc-day')      || {}).value || '';
  var yearVal  = (document.getElementById('modal-calc-year')     || {}).value || '';

  if (errorEl) errorEl.textContent = '';

  var product = MODAL_PRODUCT || 'guidebook';
  var copy = MODAL_PRODUCT_COPY[product] || MODAL_PRODUCT_COPY.guidebook;
  var userPayload = {
    email:    email,
    name:     nameVal,
    month:    monthVal,
    day:      dayVal,
    year:     yearVal,
    product:  product
  };

  try {
    sessionStorage.setItem('ssc_pending_order', JSON.stringify(userPayload));
  } catch(e) {}
  trackSscEvent(copy.eventName || 'guidebook_checkout_start', { source: 'services_modal', product: product });

  btn.disabled    = true;
  btn.textContent = '· Connecting to Stripe ·';

  console.log('Sending payload:', JSON.stringify(userPayload));

  var checkoutUrl = (typeof SSC_CHECKOUT_URL !== 'undefined')
    ? SSC_CHECKOUT_URL
    : '/api/session';

  fetch(checkoutUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email:   email,
      name:    nameVal,
      month:   monthVal,
      day:     dayVal,
      year:    yearVal,
      product: product
    })
  })
  .then(response => {
    console.log('Fetch response status:', response.status);
    if (!response.ok) {
      return response.text().then(text => {
        var data = {};
        try { data = JSON.parse(text); } catch (_) {}
        var msg = data.error || text || ('HTTP ' + response.status);
        console.error('Error response:', msg);
        throw new Error(msg);
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('Checkout response:', data);
    if (data.success) {
      window.location.href = '/thank-you/?email=' + encodeURIComponent(email) + '&product=' + encodeURIComponent(product);
    } else if (data.url) {
      console.log('Redirecting to:', data.url);
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Failed to create checkout session');
    }
  })
  .catch(err => {
    console.error('Checkout error:', err);
    trackSscEvent('guidebook_checkout_error', {
      source: 'services_modal',
      message: err && err.message ? err.message : 'unknown'
    });
    if (errorEl) {
      errorEl.textContent = 'Checkout failed: ' + err.message;
      errorEl.style.color = 'var(--rose-light)';
    }
    btn.disabled    = false;
    btn.textContent = MODAL_CHECKOUT_BTN_LABEL;
  });
}

// Email capture form handler
function handleEmailCapture(e, form) {
  e.preventDefault();
  const email = form.querySelector('input[type="email"]').value;
  fetch('/submit-email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email }),
  })
    .finally(() => {
      form.style.display = 'none';
      const success = document.getElementById('email-capture-success');
      if (success) success.style.display = 'block';
    });
}

// ────────────────────────────────────────────────────────────
//  REPORT PREVIEW CAROUSEL
// ────────────────────────────────────────────────────────────
let _rpIndex    = 0;
let _rpTimer    = null;
const _rpDelay  = 4000;

function _initRpCarousel() {
  _rpIndex = 0;
  _startRpTimer();
}

function _rpUpdate(index) {
  const slides = document.querySelectorAll('.rp-slide');
  const dots   = document.querySelectorAll('.rp-dot');
  const label  = document.getElementById('rp-slide-label');
  if (!slides.length) return;
  _rpIndex = ((index % slides.length) + slides.length) % slides.length;
  slides.forEach((s, i) => s.classList.toggle('active', i === _rpIndex));
  dots.forEach((d, i)   => d.classList.toggle('active', i === _rpIndex));
  if (label) label.textContent = slides[_rpIndex].dataset.label || '';
}

function _startRpTimer() {
  clearInterval(_rpTimer);
  _rpTimer = setInterval(() => _rpUpdate(_rpIndex + 1), _rpDelay);
}

function rpCarousel(dir) {
  _rpUpdate(_rpIndex + dir);
  _startRpTimer();
}

function rpCarouselTo(index) {
  _rpUpdate(index);
  _startRpTimer();
}

window.rpCarousel   = rpCarousel;
window.rpCarouselTo = rpCarouselTo;

// Expose
window.openCalculatorModal = openCalculatorModal;
window.closeCalculatorModal = closeCalculatorModal;
window.openBookDetail = openBookDetail;
window.closeBookDetail = closeBookDetail;
window.initServicesPage = initServicesPage;

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  var modalOverlay = document.getElementById('calculator-modal-overlay');
  if (modalOverlay && modalOverlay.classList.contains('open')) {
    closeCalculatorModal();
  }
  var bookOverlay = document.getElementById('book-detail-overlay');
  if (bookOverlay && bookOverlay.classList.contains('open')) {
    closeBookDetail();
  }
});
window.calculateReadingModal = validateModalGuidebookFields;
window.handleUnlockPaymentModal = handleUnlockPaymentModal;

// ────────────────────────────────────────────────────────────
//  CALCULATOR ENTER KEY LISTENERS
// ────────────────────────────────────────────────────────────
(function() {
  function _onCalcKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (typeof calculateReading === 'function') calculateReading();
    }
  }

  function _onModalKeydown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var emailEl = document.getElementById('modal-unlock-email');
    if (emailEl && document.activeElement !== emailEl) {
      emailEl.focus();
      return;
    }
    var btn = document.getElementById('modal-unlock-pay-btn');
    if (btn && !btn.disabled) btn.click();
  }

  function _onUnlockEmailKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var btn = document.getElementById('unlock-pay-btn');
      if (btn && !btn.disabled) btn.click();
    }
  }

  function _onModalUnlockEmailKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var btn = document.getElementById('modal-unlock-pay-btn');
      if (btn && !btn.disabled) btn.click();
    }
  }

  function _bindCalcInputs() {
    var ids = ['calc-month', 'calc-day', 'calc-year', 'calc-fullname'];
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.removeEventListener('keydown', _onCalcKeydown);
        el.addEventListener('keydown', _onCalcKeydown);
      }
    });
    var unlockEmail = document.getElementById('unlock-email');
    if (unlockEmail) {
      unlockEmail.removeEventListener('keydown', _onUnlockEmailKeydown);
      unlockEmail.addEventListener('keydown', _onUnlockEmailKeydown);
    }
  }

  function _bindModalInputs() {
    var ids = ['modal-calc-month', 'modal-calc-day', 'modal-calc-year', 'modal-calc-fullname'];
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.removeEventListener('keydown', _onModalKeydown);
        el.addEventListener('keydown', _onModalKeydown);
      }
    });
    var modalUnlockEmail = document.getElementById('modal-unlock-email');
    if (modalUnlockEmail) {
      modalUnlockEmail.removeEventListener('keydown', _onModalUnlockEmailKeydown);
      modalUnlockEmail.addEventListener('keydown', _onModalUnlockEmailKeydown);
    }
  }

  // Bind on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    _bindCalcInputs();
    _bindModalInputs();
  });

  // Re-bind when calculator page is shown (SPA navigation)
  var _origShowPage = window.showPage;
  if (typeof _origShowPage === 'function') {
    window.showPage = function(page) {
      _origShowPage(page);
      if (page === 'calculator') {
        setTimeout(_bindCalcInputs, 100);
      }
    };
  }

  // Re-bind when modal is opened
  var _origOpenModal = window.openCalculatorModal;
  if (typeof _origOpenModal === 'function') {
    window.openCalculatorModal = function(product) {
      _origOpenModal(product);
      setTimeout(_bindModalInputs, 100);
    };
  }
})();
