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
    title      : 'Free Numerology Calculator · Seven Frequencies · Simulation Source Code',
    description: 'Calculate your seven core numerology frequencies instantly. Life Path, Expression, Soul Urge, Outer Persona, Achievement, Theme, and Life Calling — from your birth date and full name.',
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
    title      : 'Numerology Services · Guidebook, Consultation & Membership · SSC',
    description: 'Choose your depth of decoding — a personalised PDF guidebook, a live one-on-one consultation, or a monthly membership to learn the system yourself.',
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
    
    const response = await fetch('/pages/nav.html');
    if (!response.ok) throw new Error('Failed to load nav');
    
    const navHtml = await response.text();
    
    // Parse HTML safely
    const temp = document.createElement('div');
    temp.innerHTML = navHtml;
    const newNav = temp.firstElementChild;
    
    // Replace placeholder with the actual nav
    if (newNav) {
      navPlaceholder.replaceWith(newNav);
      _updateThemeToggle(getTheme());
      
      // Re-attach event listeners
      const hamburger = document.getElementById('hamburger');
      if (hamburger) {
        hamburger.onclick = toggleMenu;
      }
    }
  } catch (err) {
    console.error('loadNav error:', err);
  }
}

// Make loadNav globally available
window.loadNav = loadNav;

async function loadFooter() {
  try {
    const placeholder = document.querySelector('#main-footer, #footer');
    if (!placeholder) return;
    if (placeholder.innerHTML.trim().length > 0) return;

    const response = await fetch('/pages/footer.html');
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
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

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
  if (page) {
    page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    // SECONDARY pages load async — retry once after they arrive
    setTimeout(function () {
      const p2 = document.getElementById('page-' + name);
      if (p2) { p2.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
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
      'description': 'Personalised numerology guidebook PDF, live consultation, and group membership.',
      'provider': { '@type': 'Organization', 'name': 'Simulation Source Code' },
      'offers'  : [
        { '@type': 'Offer', 'name': 'Holographic Blueprint PDF', 'price': '37', 'priceCurrency': 'USD' },
        { '@type': 'Offer', 'name': 'Personal Consultation',     'price': '55','priceCurrency': 'USD' },
        { '@type': 'Offer', 'name': 'Monthly Membership',        'price': '20', 'priceCurrency': 'USD', 'priceSpecification': { '@type': 'RecurringCharges', 'billingPeriod': 'Month' } }
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
  const pathname  = window.location.pathname.replace(/^\//, '').replace(/\/$/, ''); // e.g. 'services'

  if (postId) {
    redirectToBlogPost(postId);
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
      history.replaceState({ page: pageId, post: null }, document.title, '/' + pageId + '/');
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
      history.replaceState({ page: pathname, post: null }, document.title, '/' + pathname + '/');
    }
  } else {
    showPage('home', false);
    history.replaceState({ page: 'home', post: null }, document.title, '/');
  }
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
    page.querySelectorAll('.hp-reveal, .hp-reveal-left, .hp-reveal-right').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
  var revealEls = _homeRevealInited ? [] : page.querySelectorAll('.hp-reveal, .hp-reveal-left, .hp-reveal-right');
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
      var terminal = e.target.querySelector('.hp-scl-terminal');
      if (terminal) terminal.classList.add('hp-scl-booting');
      sclObs.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  var sclSection = document.getElementById('hp-scl-section');
  if (sclSection) sclObs.observe(sclSection);

  // Hero image parallax (only set up once)
  if (!_homePageInited) {
    var heroImg = page.querySelector('.hp-hero-img');
    if (heroImg) {
      window.addEventListener('scroll', function () {
        var p = document.getElementById('page-home');
        if (!p || !p.classList.contains('active')) return;
        heroImg.style.transform = 'translateY(' + (window.scrollY * 0.2) + 'px)';
      }, { passive: true });
    }
    _homePageInited = true;
  }
}

// ────────────────────────────────────────────────────────────
//  CODEX PAGE — Spirit SVG + tooltip HUD
// ────────────────────────────────────────────────────────────
var NATURE_COLORS_CDX = { electric: '#F5C842', magnetic: '#378ADD', aetheric: '#C0C0E0' };
var PLANE_COLORS_CDX  = { mind: '#7ec8c8', body: '#e8c96b', spirit: '#a96ed4', pivot: '#e8c96b' };

var CODEX_NODES = window.CODEX_NODES || {};

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
      ? 'Tracing 0\u219239 \u00b7 Unified 36\u00b0 grid'
      : 'Hover to explore \u00b7 Click to pin \u00b7 Keys 0\u20139 \u00b7 Arrows follow the flow';
  }

  if (view === 'matrix') {
    var spiralRoot = page.querySelector('.cdx-spiral-root');
    if (spiralRoot && typeof spiralRoot._stopSpiral === 'function') spiralRoot._stopSpiral();
    hudReset();
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
    requestAnimationFrame(function() {
      _ensureCodexSpiral(page);
      requestAnimationFrame(function() {
        if (typeof triggerCodexSpiralAutoPlay === 'function') triggerCodexSpiralAutoPlay(page);
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

function _ensureCodexMatrix(page, attempt) {
  attempt = attempt || 0;
  var wrap = page && page.querySelector('#codex-spirit-wrap');
  if (!wrap) return;
  if (typeof initCodexMatrix === 'function') {
    initCodexMatrix(wrap);
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
//  FALLBACK for calc button
// ────────────────────────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target?.classList.contains('calc-btn')) calculateReading();
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

var MODAL_CHECKOUT_BTN_LABEL = 'Continue to Payment · $11';

function openCalculatorModal() {
  var overlay = document.getElementById('calculator-modal-overlay');
  if (overlay) overlay.classList.add('open');
  setTimeout(function() {
    var month = document.getElementById('modal-calc-month');
    if (month) month.focus();
  }, 100);
}

function closeCalculatorModal() {
  var overlay = document.getElementById('calculator-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  resetCalculatorModal();
}

function initServicesPage() {
  var overlay = document.getElementById('calculator-modal-overlay');
  if (overlay && overlay.dataset.bound !== '1') {
    overlay.dataset.bound = '1';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeCalculatorModal();
    });
  }
  loadGoogleReviews();
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

  var userPayload = {
    email:    email,
    name:     nameVal,
    month:    monthVal,
    day:      dayVal,
    year:     yearVal,
  };

  try {
    sessionStorage.setItem('ssc_pending_order', JSON.stringify(userPayload));
  } catch(e) {}

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
      email:  email,
      name:   nameVal,
      month:  monthVal,
      day:    dayVal,
      year:   yearVal
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
      window.location.href = '/thank-you/?email=' + encodeURIComponent(email) + '&product=guidebook';
    } else if (data.url) {
      console.log('Redirecting to:', data.url);
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Failed to create checkout session');
    }
  })
  .catch(err => {
    console.error('Checkout error:', err);
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
window.initServicesPage = initServicesPage;

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  var modalOverlay = document.getElementById('calculator-modal-overlay');
  if (modalOverlay && modalOverlay.classList.contains('open')) {
    closeCalculatorModal();
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
    window.openCalculatorModal = function() {
      _origOpenModal();
      setTimeout(_bindModalInputs, 100);
    };
  }
})();
