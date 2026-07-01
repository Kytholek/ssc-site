// ══════════════════════════════════════════════════════════════
// SSC ADMIN SYSTEM — Blog CMS
// Access: navigate to #admin in the URL, or press Ctrl+Shift+A,
//         or click the © in the footer 5 times.
// Password: set PASS below
// ══════════════════════════════════════════════════════════════

var adminSystem = (function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────
  var PASS        = 'ssc2025';
  var STORAGE_KEY = 'ssc-blog-posts';
  var BLOG_PATH   = 'blog/';

  // ── State ──────────────────────────────────────────────────
  var posts     = [];   // dynamic (localStorage) posts
  var editingId = null; // id of dynamic post being edited

  // Currently loaded static post for the editor
  var _staticEditId   = null;  // post id e.g. 'post-666'
  var _staticOrigHTML = '';    // raw fetched HTML (full file)
  var _staticPostEl   = null;  // parsed DOM element

  // ── Post registry — id + actual folder path + title + category ─
  // path = the folder name inside /blog/ (file is always index.html)
  var POST_REGISTRY = [
    // ── The System series ──────────────────────────────────────
    { id:'post-simulation',              path:'simulation-theory-numerology-source-code',           title:'You Are Running on a Simulation',                          category:'the-system' },
    { id:'post-system',                  path:'evolution-of-energy-0-through-9',                    title:'The Evolution of Energy: 0 Through 9',                     category:'the-system' },
    { id:'post-electric-magnetic-aether',path:'electric-magnetic-aether-three-natures-of-number',  title:'Electric, Magnetic & Aether: The Three Natures of Number', category:'the-system' },
    { id:'post-codex-architecture',      path:'codex-architecture-consciousness-matrix',            title:'The Codex: Architecture of the Consciousness Matrix',       category:'the-system' },
    { id:'post-666',                     path:'666-numerology-meaning',                             title:'666 Is Not What You Think',                                category:'the-system' },
    { id:'post-369',                     path:'3-6-9-pattern-tesla-numerology',                     title:'The 3-6-9 Pattern: Why Tesla Was Right',                   category:'the-system' },
    { id:'post-transformation-path',     path:'path-of-transformation-1-4-7-2-5-8-3-6-9',         title:'The Path of Transformation: 1→4→7→2→5→8→3→6→9',           category:'the-system' },
    { id:'post-five-lenses',             path:'five-lenses-of-self-ego-mind-soul-spirit-void',     title:'The Five Lenses of Self',                                  category:'the-system' },
    { id:'post-decoding-matrix',         path:'decoding-matrix',                                    title:'Decoding the Matrix: The Complete Architecture',            category:'the-system' },
    { id:'post-decoding-matrix-2',       path:'decoding-the-matrix-simulation-source-code',        title:'Decoding the Matrix: Simulation Source Code',               category:'the-system' },
    { id:'post-pillar',                  path:'pillar-numerology-source-code',                      title:'The Pillar: Numerology as Source Code',                     category:'the-system' },
    { id:'post-infinity',                path:'infinity-loop-cycles-recursion-numerology',          title:'The Infinity Loop: Cycles, Recursion & Numerology',         category:'the-system' },
    { id:'post-angel-numbers',           path:'angel-numbers-being-read-wrong',                     title:'Angel Numbers Are Being Read Wrong',                        category:'the-system' },
    // ── Numerology / frameworks ────────────────────────────────
    { id:'post-lifepath',                path:'life-path-number-explained',                         title:'The Life Path Number: Your Primary Frequency',              category:'numerology'  },
    { id:'post-theme-number',            path:'theme-number-birth-year-numerology',                 title:"Your Birth Year's Hidden Frequency: The Theme Number",      category:'numerology'  },
    { id:'post-seven',                   path:'why-seven-frequencies-numerology',                   title:'Why Seven Frequencies?',                                   category:'numerology'  },
    { id:'post-trinity-purpose',         path:'trinity-of-purpose-numerology',                      title:'The Trinity of Purpose',                                   category:'numerology'  },
    { id:'post-trinity-expression',      path:'trinity-of-expression-numerology',                   title:'The Trinity of Expression',                                category:'numerology'  },
    { id:'post-trinity-lessons',         path:'trinity-of-lessons-numerology',                      title:'The Trinity of Lessons',                                   category:'numerology'  },
    // ── The Numbers ────────────────────────────────────────────
    { id:'post-master',                  path:'master-numbers-11-22-33-numerology',                 title:'Master Numbers 11, 22 & 33: Amplified Purpose',            category:'numbers'     },
    { id:'post-pythagorean',             path:'pythagorean-vs-chaldean-numerology',                 title:'Pythagorean vs. Chaldean Numerology',                      category:'numbers'     },
    // Life Path
    { id:'post-lp1',                     path:'life-path-1-numerology',                             title:'Life Path 1',                                              category:'numbers'     },
    { id:'post-lp2',                     path:'life-path-2-numerology',                             title:'Life Path 2',                                              category:'numbers'     },
    { id:'post-lp3',                     path:'life-path-3-numerology',                             title:'Life Path 3',                                              category:'numbers'     },
    { id:'post-lp4',                     path:'life-path-4-numerology',                             title:'Life Path 4',                                              category:'numbers'     },
    { id:'post-lp5',                     path:'life-path-5-numerology',                             title:'Life Path 5',                                              category:'numbers'     },
    { id:'post-lp6',                     path:'life-path-6-numerology',                             title:'Life Path 6',                                              category:'numbers'     },
    { id:'post-lp7',                     path:'life-path-7-numerology',                             title:'Life Path 7',                                              category:'numbers'     },
    { id:'post-lp8',                     path:'life-path-8-numerology',                             title:'Life Path 8',                                              category:'numbers'     },
    { id:'post-lp9',                     path:'life-path-9-numerology',                             title:'Life Path 9',                                              category:'numbers'     },
    { id:'post-lp11',                    path:'life-path-11-numerology',                            title:'Life Path 11',                                             category:'numbers'     },
    { id:'post-lp22',                    path:'life-path-22-numerology',                            title:'Life Path 22',                                             category:'numbers'     },
    { id:'post-lp33',                    path:'life-path-33-numerology',                            title:'Life Path 33',                                             category:'numbers'     },
    { id:'post-lp44',                    path:'life-path-44-numerology',                            title:'Life Path 44',                                             category:'numbers'     },
    // Expression
    { id:'post-exp1',                    path:'expression-1-numerology',                            title:'Expression 1',                                             category:'numbers'     },
    { id:'post-exp2',                    path:'expression-2-numerology',                            title:'Expression 2',                                             category:'numbers'     },
    { id:'post-exp3',                    path:'expression-3-numerology',                            title:'Expression 3',                                             category:'numbers'     },
    { id:'post-exp4',                    path:'expression-4-numerology',                            title:'Expression 4',                                             category:'numbers'     },
    { id:'post-exp5',                    path:'expression-5-numerology',                            title:'Expression 5',                                             category:'numbers'     },
    { id:'post-exp6',                    path:'expression-6-numerology',                            title:'Expression 6',                                             category:'numbers'     },
    { id:'post-exp7',                    path:'expression-7-numerology',                            title:'Expression 7',                                             category:'numbers'     },
    { id:'post-exp8',                    path:'expression-8-numerology',                            title:'Expression 8',                                             category:'numbers'     },
    { id:'post-exp9',                    path:'expression-9-numerology',                            title:'Expression 9',                                             category:'numbers'     },
    { id:'post-exp11',                   path:'expression-11-numerology',                           title:'Expression 11',                                            category:'numbers'     },
    { id:'post-exp22',                   path:'expression-22-numerology',                           title:'Expression 22',                                            category:'numbers'     },
    { id:'post-exp33',                   path:'expression-33-numerology',                           title:'Expression 33',                                            category:'numbers'     },
    // Soul Urge
    { id:'post-su1',                     path:'soul-urge-1-numerology',                             title:'Soul Urge 1',                                              category:'numbers'     },
    { id:'post-su2',                     path:'soul-urge-2-numerology',                             title:'Soul Urge 2',                                              category:'numbers'     },
    { id:'post-su3',                     path:'soul-urge-3-numerology',                             title:'Soul Urge 3',                                              category:'numbers'     },
    { id:'post-su4',                     path:'soul-urge-4-numerology',                             title:'Soul Urge 4',                                              category:'numbers'     },
    { id:'post-su5',                     path:'soul-urge-5-numerology',                             title:'Soul Urge 5',                                              category:'numbers'     },
    { id:'post-su6',                     path:'soul-urge-6-numerology',                             title:'Soul Urge 6',                                              category:'numbers'     },
    { id:'post-su7',                     path:'soul-urge-7-numerology',                             title:'Soul Urge 7',                                              category:'numbers'     },
    { id:'post-su8',                     path:'soul-urge-8-numerology',                             title:'Soul Urge 8',                                              category:'numbers'     },
    { id:'post-su9',                     path:'soul-urge-9-numerology',                             title:'Soul Urge 9',                                              category:'numbers'     },
    { id:'post-su11',                    path:'soul-urge-11-numerology',                            title:'Soul Urge 11',                                             category:'numbers'     },
    { id:'post-su22',                    path:'soul-urge-22-numerology',                            title:'Soul Urge 22',                                             category:'numbers'     },
    { id:'post-su33',                    path:'soul-urge-33-numerology',                            title:'Soul Urge 33',                                             category:'numbers'     },
    // ── Philosophy ─────────────────────────────────────────────
    { id:'post-shadow',                  path:'shadow-side-of-numerology-numbers',                  title:'The Shadow Side of Your Numbers',                          category:'philosophy'  },
    // ── Practice ───────────────────────────────────────────────
    { id:'post-calculate',               path:'how-to-calculate-life-path-number',                  title:'How to Calculate Your Life Path by Hand',                  category:'practice'    },
    { id:'post-name',                    path:'birth-name-vs-known-name-numerology',                title:'Which Name Do You Use?',                                   category:'practice'    },
    { id:'post-name-change',             path:'name-change-numerology-simulation',                  title:'The Name-Changer Dilemma',                                 category:'practice'    },
  ];

  // ── Helpers ────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function catLabel(cat) {
    return { numerology:'Numerology', philosophy:'Philosophy', numbers:'The Numbers',
             practice:'Practice', 'the-system':'The System' }[cat] || cat;
  }

  function catBadge(cat) {
    var cls = { philosophy:' gold', numbers:' teal', practice:' rose', 'the-system':' gold' };
    return '<span class="blog-tag' + (cls[cat]||'') + '">' + catLabel(cat) + '</span>';
  }

  function catGlyph(cat) {
    return { numerology:'&#9732;', philosophy:'&#10022;', numbers:'&#9651;',
             practice:'&#9998;', 'the-system':'0→9' }[cat] || '&#10022;';
  }

  function showToast(msg, type) {
    var t = $('admin-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'admin-toast show' + (type === 'error' ? ' toast-error' : type === 'ok' ? ' toast-ok' : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  function formatDate(d) {
    var m = ['January','February','March','April','May','June','July',
             'August','September','October','November','December'];
    return m[d.getMonth()] + ' ' + d.getFullYear();
  }

  // ── Markdown ↔ HTML ────────────────────────────────────────
  function markdownToHtml(md) {
    var lines = (md || '').split('\n');
    var html = '', inPara = false;
    function closePara() { if (inPara) { html += '</p>\n'; inPara = false; } }
    lines.forEach(function (line) {
      line = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      var trimmed = line.trim();
      if (/^!\[/.test(trimmed)) {
        closePara();
        var m = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (m) html += '<img src="' + m[2] + '" alt="' + m[1] + '" style="max-width:100%;border-radius:4px;margin:16px 0;display:block"/>\n';
        return;
      }
      if (/^#{1,3}\s/.test(trimmed)) {
        closePara();
        html += '<h3>' + inlineFmt(trimmed.replace(/^#+\s/, '')) + '</h3>\n';
        return;
      }
      if (/^>\s/.test(trimmed)) {
        closePara();
        html += '<blockquote>' + inlineFmt(trimmed.slice(2)) + '</blockquote>\n';
        return;
      }
      if (!trimmed) { closePara(); return; }
      if (!inPara) { html += '<p>'; inPara = true; } else { html += ' '; }
      html += inlineFmt(trimmed);
    });
    closePara();
    return html;
  }

  function inlineFmt(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  // Convert simple post HTML content back to editable markdown-ish text
  function htmlToEditable(html) {
    return (html || '')
      .replace(/<h3>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, '\n> $1\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<p>([\s\S]*?)<\/p>/gi, '\n$1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#8594;/g, '→')
      .replace(/&#8592;/g, '←')
      .replace(/&middot;/g, '·')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ── Auth ───────────────────────────────────────────────────
  function open() {
    var overlay = $('admin-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    if (sessionStorage.getItem('ssc-admin-auth') === '1') {
      showPanel();
    } else {
      $('admin-login').style.display = 'flex';
      $('admin-panel').classList.remove('open');
      setTimeout(function () { var i = $('admin-pass-input'); if (i) i.focus(); }, 100);
    }
  }

  function close() {
    var overlay = $('admin-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function login() {
    var val = ($('admin-pass-input').value || '').trim();
    var err = $('admin-login-error');
    if (val === PASS) {
      sessionStorage.setItem('ssc-admin-auth', '1');
      $('admin-pass-input').value = '';
      err.textContent = '';
      showPanel();
    } else {
      err.textContent = 'Incorrect passphrase.';
      $('admin-pass-input').value = '';
      $('admin-pass-input').focus();
    }
  }

  function showPanel() {
    $('admin-login').style.display = 'none';
    $('admin-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
    loadPosts();
    renderPostsList();
    renderDynamicPosts();
    renderStaticPostList();
  }

  // ── Tab routing ────────────────────────────────────────────
  function switchTab(name) {
    document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.admin-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var tab = $('tab-' + name);
    var btn = $('tab-btn-' + name);
    if (tab) tab.classList.add('active');
    if (btn) btn.classList.add('active');
    if (name === 'preview') buildPreview();
    if (name === 'posts')   renderPostsList();
    if (name === 'edit')    renderStaticPostList();
    if (name === 'export')  {} // nothing to auto-run
  }

  // ── Write tab (dynamic posts) ──────────────────────────────
  function wrap(before, after, mode) {
    var ta = $('admin-body');
    var start = ta.selectionStart, end = ta.selectionEnd;
    var sel = ta.value.substring(start, end);
    var replacement = (mode === 'heading' || mode === 'quote')
      ? before + (sel || 'Text here')
      : before + (sel || 'text') + after;
    ta.value = ta.value.substring(0, start) + replacement + ta.value.substring(end);
    ta.focus();
    ta.selectionStart = start + before.length;
    ta.selectionEnd   = start + replacement.length - after.length;
  }

  function insertBreak() {
    var ta = $('admin-body');
    var pos = ta.selectionStart;
    ta.value = ta.value.substring(0, pos) + '\n\n' + ta.value.substring(pos);
    ta.selectionStart = ta.selectionEnd = pos + 2;
    ta.focus();
  }

  function insertImage() {
    var url = prompt('Paste the image URL:');
    if (!url) return;
    var alt = prompt('Image description (optional):') || '';
    var ta  = $('admin-body');
    var pos = ta.selectionStart;
    var tag = '\n![' + alt + '](' + url + ')\n';
    ta.value = ta.value.substring(0, pos) + tag + ta.value.substring(pos);
    ta.selectionStart = ta.selectionEnd = pos + tag.length;
    ta.focus();
  }

  function buildPreview() {
    var title    = ($('admin-title').value    || '').trim();
    var category = $('admin-category').value;
    var date     = ($('admin-date').value     || '').trim();
    var body     = $('admin-body').value;
    var el       = $('admin-preview-content');
    if (!title && !body) {
      el.innerHTML = '<div class="admin-empty">Fill in the Write tab to see a preview.</div>';
      return;
    }
    var readTime = Math.max(1, Math.round(body.split(/\s+/).length / 200));
    el.innerHTML =
      '<div class="blog-post-eyebrow">' + catBadge(category) + '</div>' +
      '<h1 class="preview-banner">' + escHtml(title || 'Untitled') + '</h1>' +
      '<div class="preview-meta">' +
        '<span class="blog-date">' + (date || 'Draft') + '</span>' +
        '<span style="color:var(--text-muted)">&middot;</span>' +
        '<span class="blog-date">' + readTime + ' min read</span>' +
      '</div>' +
      '<div class="preview-body">' + markdownToHtml(body) + '</div>';
  }

  function previewCardImage(url) {
    var p = $('admin-image-preview');
    if (!p) return;
    if (url && url.startsWith('http')) {
      p.style.display = 'block';
      p.style.backgroundImage = 'url(' + url + ')';
    } else {
      p.style.display = 'none';
      p.style.backgroundImage = '';
    }
  }

  // ── Dynamic posts (localStorage) ──────────────────────────
  function loadPosts() {
    try { var raw = localStorage.getItem(STORAGE_KEY); posts = raw ? JSON.parse(raw) : []; }
    catch (e) { posts = []; }
  }

  function savePosts() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }
    catch (e) { showToast('Storage error — posts may not persist', 'error'); }
  }

  function publish() {
    var title    = ($('admin-title').value    || '').trim();
    var category = $('admin-category').value;
    var date     = ($('admin-date').value     || '').trim() || formatDate(new Date());
    var excerpt  = ($('admin-excerpt').value  || '').trim();
    var body     = ($('admin-body').value     || '').trim();
    var image    = ($('admin-image').value    || '').trim();
    var idInput  = $('admin-editing-id').value;
    if (!title) { showToast('Please add a title first.', 'error'); return; }
    if (!body)  { showToast('Please write some content.', 'error'); return; }
    loadPosts();
    if (idInput) {
      var idx = posts.findIndex(function (p) { return p.id === idInput; });
      if (idx >= 0) posts[idx] = { id:idInput, title:title, category:category, date:date, excerpt:excerpt, body:body, image:image };
    } else {
      posts.push({ id:'dyn-' + Date.now(), title:title, category:category, date:date, excerpt:excerpt, body:body, image:image });
    }
    savePosts();
    renderDynamicPosts();
    renderPostsList();
    clearForm();
    showToast(idInput ? 'Post updated!' : 'Post published!', 'ok');
    switchTab('posts');
  }

  function editDynPost(id) {
    var post = posts.find(function (p) { return p.id === id; });
    if (!post) return;
    $('admin-editing-id').value = id;
    $('admin-title').value    = post.title;
    $('admin-category').value = post.category;
    $('admin-date').value     = post.date;
    $('admin-excerpt').value  = post.excerpt || '';
    $('admin-body').value     = post.body;
    $('admin-image').value    = post.image || '';
    switchTab('write');
  }

  function deleteDynPost(id) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    posts = posts.filter(function (p) { return p.id !== id; });
    savePosts();
    renderDynamicPosts();
    renderPostsList();
    showToast('Post deleted.');
  }

  function clearForm() {
    $('admin-editing-id').value = '';
    $('admin-title').value    = '';
    $('admin-category').value = 'numerology';
    $('admin-date').value     = '';
    $('admin-excerpt').value  = '';
    $('admin-body').value     = '';
    $('admin-image').value    = '';
    editingId = null;
  }

  function renderDynamicPosts() {
    document.querySelectorAll('.dyn-blog-card, .dyn-blog-post').forEach(function (el) { el.remove(); });
    var grid = $('blog-grid');
    if (!grid) return;
    posts.forEach(function (post) {
      var card = document.createElement('div');
      card.className = 'blog-card dyn-blog-card';
      card.setAttribute('data-category', post.category);
      card.onclick = function () { openDynPost(post.id); };
      var isSystem = post.category === 'the-system';
      var bannerStyle = (!isSystem && post.image)
        ? 'height:120px;background-image:url(' + escHtml(post.image) + ');background-size:cover;background-position:center;'
        : 'height:120px';
      var glyphHtml = (!isSystem && post.image) ? '' : '<div class="blog-card-glyph' + (isSystem ? ' system-glyph' : '') + '" style="font-size:38px">' + catGlyph(post.category) + '</div>';
      if (isSystem) card.classList.add('blog-card-system');
      card.innerHTML =
        '<div class="blog-card-banner' + (isSystem ? ' blog-card-banner-system' : '') + '" style="' + bannerStyle + '">' + glyphHtml + '</div>' +
        '<div class="blog-card-body">' +
          '<div class="blog-card-meta">' + catBadge(post.category) + '<span class="blog-date">' + post.date + '</span></div>' +
          '<div class="blog-card-title">' + escHtml(post.title) + '</div>' +
          (post.excerpt ? '<p class="blog-card-excerpt">' + escHtml(post.excerpt) + '</p>' : '') +
          '<div class="blog-read-more">Read Article &#8594;</div>' +
        '</div>';
      grid.appendChild(card);

      var article = document.createElement('div');
      article.className = 'blog-post dyn-blog-post';
      article.id = 'dyn-post-' + post.id;
      var readTime = Math.max(1, Math.round(post.body.split(/\s+/).length / 200));
      article.innerHTML =
        '<button class="blog-post-back" onclick="closePosts()">&#8592; Back to Blog</button>' +
        '<div class="blog-post-eyebrow">' + catBadge(post.category) + '</div>' +
        '<h1 class="blog-post-title">' + escHtml(post.title) + '</h1>' +
        '<div class="blog-post-meta">' + escHtml(post.date) + ' &middot; ' + readTime + ' min read</div>' +
        '<div class="blog-post-content">' + markdownToHtml(post.body) + '</div>';
      var blogPage = $('page-blog');
      if (blogPage) blogPage.appendChild(article);
    });
  }

  function openDynPost(id) {
    var listing = $('blog-listing');
    if (listing) listing.style.display = 'none';
    document.querySelectorAll('.blog-post').forEach(function (p) { p.classList.remove('active'); });
    var post = $('dyn-post-' + id);
    if (post) { post.classList.add('active'); window.scrollTo({ top:0, behavior:'smooth' }); }
  }

  function renderPostsList() {
    var container = $('admin-posts-list-inner');
    if (!container) return;
    if (!posts.length) {
      container.innerHTML = '<div class="admin-empty">No dynamic posts yet. Write one in the Write tab.</div>';
      return;
    }
    container.innerHTML = posts.slice().reverse().map(function (post) {
      return (
        '<div class="admin-post-item">' +
          '<div class="admin-post-info">' +
            '<div class="admin-post-title">' + escHtml(post.title) + '</div>' +
            '<div class="admin-post-meta">' + catBadge(post.category) + ' &nbsp;' + escHtml(post.date) + '</div>' +
          '</div>' +
          '<div class="admin-post-btns">' +
            '<button class="admin-post-edit"   onclick="adminSystem.editDynPost(\'' + post.id + '\')">Edit</button>' +
            '<button class="admin-post-delete" onclick="adminSystem.deleteDynPost(\'' + post.id + '\')">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // ── STATIC POST EDITOR ─────────────────────────────────────
  // Lists all static posts from POST_REGISTRY.
  // User clicks a post → we fetch the file → parse into editable fields.
  // On save → regenerate the HTML file → trigger a download.

  function renderStaticPostList() {
    var list = $('static-post-list');
    if (!list) return;
    list.innerHTML = POST_REGISTRY.map(function (p) {
      var badge = catBadge(p.category);
      return (
        '<div class="admin-post-item static-post-item" id="spi-' + p.id + '">' +
          '<div class="admin-post-info">' +
            '<div class="admin-post-title">' + escHtml(p.title) + '</div>' +
            '<div class="admin-post-meta">' + badge + '</div>' +
          '</div>' +
          '<div class="admin-post-btns">' +
            '<button class="admin-post-edit" onclick="adminSystem.loadStaticPost(\'' + p.id + '\')">Edit</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function loadStaticPost(id) {
    // Show loading state
    var pane = $('static-editor-pane');
    var list = $('static-post-list-wrap');
    var loading = $('static-loading');

    if (pane)    pane.style.display    = 'none';
    if (loading) { loading.style.display = 'flex'; loading.textContent = 'Fetching ' + id + '.html…'; }

    var reg = POST_REGISTRY.find(function (p) { return p.id === id; });
    if (!reg || !reg.path) {
      showToast('Post path not found in registry for: ' + id, 'error');
      if (loading) loading.style.display = 'none';
      return;
    }
    fetch(BLOG_PATH + reg.path + '/index.html?v=' + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        _staticEditId   = id;
        _staticOrigHTML = html;
        _populateStaticEditor(id, html);
        if (loading) loading.style.display = 'none';
        if (pane)    pane.style.display    = 'flex';
        if (list)    list.style.display    = 'none';
      })
      .catch(function (err) {
        if (loading) loading.style.display = 'none';
        showToast('Could not load ' + id + '.html — is the dev server running?', 'error');
        console.error('[SSC Admin]', err);
      });
  }

  function _populateStaticEditor(id, rawHtml) {
    // Parse the full HTML document properly
    var parser = new DOMParser();
    var doc    = parser.parseFromString(rawHtml, 'text/html');

    // Check it has post content
    var contentEl = doc.querySelector('.blog-post-content');
    if (!contentEl) {
      showToast('Could not find .blog-post-content — falling back to HTML mode.', 'error');
      var rawArea = $('static-raw-html');
      if (rawArea) rawArea.value = rawHtml;
      var pane = $('static-editor-pane');
      if (pane) pane.style.display = 'flex';
      _showStaticMode('raw');
      return;
    }

    // Extract title — prefer h1, fall back to <title> tag
    var h1El     = doc.querySelector('.blog-post-title');
    var titleTag = doc.querySelector('title');
    var title    = (h1El && h1El.textContent.trim()) ||
                   (titleTag ? titleTag.textContent.replace(/\s*[|·—–\-].*$/, '').trim() : '');

    // Extract meta description
    var metaDescEl = doc.querySelector('meta[name="description"]');
    var desc       = metaDescEl ? (metaDescEl.getAttribute('content') || '') : '';

    // Extract date from .blog-post-meta (text before the first separator)
    var metaDateEl = doc.querySelector('.blog-post-meta');
    var date       = '';
    if (metaDateEl) {
      var dateMatch = metaDateEl.textContent.match(/^([A-Z][a-z]+ \d{4})/);
      if (dateMatch) date = dateMatch[1];
    }

    // Populate fields
    var titleInput = $('static-title');
    var descInput  = $('static-desc');
    var dateInput  = $('static-date');
    var catSelect  = $('static-category');
    var bodyArea   = $('static-body');
    var rawArea    = $('static-raw-html');

    if (titleInput) titleInput.value = title;
    if (descInput)  descInput.value  = desc;
    if (dateInput)  dateInput.value  = date;

    // Match category from registry
    var reg = POST_REGISTRY.find(function (p) { return p.id === id; });
    if (catSelect && reg) catSelect.value = reg.category;

    // Load content into both editing modes
    var rawContent = contentEl.innerHTML;
    if (bodyArea) bodyArea.value = htmlToEditable(rawContent);
    if (rawArea)  rawArea.value  = rawContent;

    // Update editor header
    var header = $('static-editor-title');
    if (header) header.textContent = title || id;

    // If the content has custom HTML components, default to raw mode
    // to avoid htmlToEditable() stripping them when visual mode is active
    var hasComplexHtml = /<(div|section|aside|figure|table)\b/i.test(rawContent) ||
                         /class=["'][^"']*(?:math-block|codex-callout|seq-box|pull-quote|step-|freq-|pillar-)[^"']*["']/i.test(rawContent);
    _showStaticMode(hasComplexHtml ? 'raw' : 'visual');
  }

  function _showStaticMode(mode) {
    var visualPane  = $('static-visual-mode');
    var rawPane     = $('static-raw-mode');
    var previewPane = $('static-preview-mode');
    var modeBtns    = document.querySelectorAll('.static-mode-btn');

    modeBtns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    if (visualPane)  visualPane.style.display  = mode === 'visual'  ? 'flex' : 'none';
    if (rawPane)     rawPane.style.display     = mode === 'raw'     ? 'flex' : 'none';
    if (previewPane) previewPane.style.display = mode === 'preview' ? 'flex' : 'none';
  }

  function switchStaticMode(mode) {
    // If switching to raw, sync body → raw
    if (mode === 'raw') {
      var bodyArea = $('static-body');
      var rawArea  = $('static-raw-html');
      if (bodyArea && rawArea) {
        rawArea.value = markdownToHtml(bodyArea.value);
      }
    }
    // If switching to visual, warn if raw HTML has custom components
    if (mode === 'visual') {
      var rawArea  = $('static-raw-html');
      var bodyArea = $('static-body');
      if (rawArea) {
        var hasComplex = /<(div|section|aside|figure|table)\b/i.test(rawArea.value) ||
                         /class=["'][^"']*(?:math-block|codex-callout|seq-box|pull-quote)[^"']*["']/i.test(rawArea.value);
        if (hasComplex) {
          if (!confirm('⚠️ This article has custom HTML components (math boxes, callouts, etc.).\n\nSwitching to Visual mode will strip those to plain text and they cannot be recovered.\n\nStay in Raw HTML mode to preserve them.\n\nSwitch anyway?')) {
            return;
          }
        }
        if (bodyArea) bodyArea.value = htmlToEditable(rawArea.value);
      }
    }
    _showStaticMode(mode);
  }

  function staticWrap(before, after, mode) {
    var ta = $('static-body');
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var sel = ta.value.substring(start, end);
    var replacement = (mode === 'heading' || mode === 'quote')
      ? before + (sel || 'Text here')
      : before + (sel || 'text') + after;
    ta.value = ta.value.substring(0, start) + replacement + ta.value.substring(end);
    ta.focus();
    ta.selectionStart = start + before.length;
    ta.selectionEnd   = start + replacement.length - after.length;
  }

  function staticInsertBreak() {
    var ta = $('static-body');
    if (!ta) return;
    var pos = ta.selectionStart;
    ta.value = ta.value.substring(0, pos) + '\n\n' + ta.value.substring(pos);
    ta.selectionStart = ta.selectionEnd = pos + 2;
    ta.focus();
  }

  function previewStaticPost() {
    var title   = ($('static-title').value || '').trim();
    var body    = $('static-body').value;
    var rawMode = $('static-raw-mode') && $('static-raw-mode').style.display !== 'none';
    var content = rawMode ? $('static-raw-html').value : markdownToHtml(body);
    var preview = $('static-preview-content');
    if (!preview) return;
    var readTime = Math.max(1, Math.round(content.replace(/<[^>]+>/g,'').split(/\s+/).length / 200));
    preview.innerHTML =
      '<h1 class="blog-post-title">' + escHtml(title) + '</h1>' +
      '<div class="blog-post-meta">' + readTime + ' min read</div>' +
      '<div class="blog-post-content">' + content + '</div>';
    _showStaticMode('preview');
  }

  function saveStaticPost() {
    if (!_staticEditId || !_staticOrigHTML) {
      showToast('No post loaded.', 'error');
      return;
    }

    var title   = ($('static-title').value || '').trim();
    var desc    = ($('static-desc').value  || '').trim();
    var date    = ($('static-date').value  || '').trim();
    var rawPane = $('static-raw-mode');
    var isRaw   = rawPane && rawPane.style.display !== 'none';
    var newContent = isRaw
      ? $('static-raw-html').value
      : markdownToHtml($('static-body').value);

    if (!title) { showToast('Title cannot be empty.', 'error'); return; }

    // Parse the full document (not wrapped in extra tags — that was the old bug)
    var parser = new DOMParser();
    var doc    = parser.parseFromString(_staticOrigHTML, 'text/html');

    // Update <title> tag — preserve any suffix like "| SSC Numerology"
    var titleEl = doc.querySelector('title');
    if (titleEl) {
      var suffix = titleEl.textContent.match(/(\s*[|·—–].+)$/);
      titleEl.textContent = title + (suffix ? suffix[1] : '');
    }

    // Update meta description
    var metaDescEl = doc.querySelector('meta[name="description"]');
    if (metaDescEl && desc) metaDescEl.setAttribute('content', desc);

    // Update h1
    var h1 = doc.querySelector('.blog-post-title');
    if (h1) h1.textContent = title;

    // Update date in .blog-post-meta (replace leading date, keep read-time)
    var metaDateEl = doc.querySelector('.blog-post-meta');
    if (metaDateEl && date) {
      metaDateEl.innerHTML = metaDateEl.innerHTML.replace(/^[A-Z][a-z]+ \d{4}/, date);
    }

    // Replace content
    var contentEl = doc.querySelector('.blog-post-content');
    if (contentEl) contentEl.innerHTML = '\n        ' + newContent + '\n      ';

    // Serialize — prepend DOCTYPE (DOMParser strips it from outerHTML)
    var finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

    _downloadFile('index.html', finalHtml);
    var reg = POST_REGISTRY.find(function (p) { return p.id === _staticEditId; });
    var folder = reg ? reg.path : _staticEditId;
    showToast('\u2713 index.html downloaded \u2014 replace in /blog/' + folder + '/', 'ok');
  }

  function _downloadFile(filename, content) {
    var blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function closeStaticEditor() {
    _staticEditId   = null;
    _staticOrigHTML = '';
    _staticPostEl   = null;
    var pane = $('static-editor-pane');
    var list = $('static-post-list-wrap');
    if (pane) pane.style.display = 'none';
    if (list) list.style.display = 'block';
    _showStaticMode('visual');
  }

  // ── Export ─────────────────────────────────────────────────
  function exportCode() {
    loadPosts();
    if (!posts.length) { showToast('No dynamic posts to export yet.'); return; }
    var cls = { philosophy:' gold', numbers:' teal', practice:' rose', 'the-system':' gold' };

    var cardsHtml = posts.map(function (post) {
      var tag = '<span class=\\"blog-tag' + (cls[post.category]||'') + '\\">' + catLabel(post.category) + '</span>';
      var banner = post.image
        ? '  <div class="blog-card-banner" style="height:120px;background-image:url(' + post.image + ');background-size:cover;background-position:center"></div>'
        : '  <div class="blog-card-banner" style="height:120px"><div class="blog-card-glyph" style="font-size:38px">' + catGlyph(post.category) + '</div></div>';
      return [
        '<div class="blog-card" onclick="openPost(\'' + post.id + '\')" data-category="' + post.category + '">',
        banner,
        '  <div class="blog-card-body">',
        '    <div class="blog-card-meta">' + tag + '<span class="blog-date">' + escHtml(post.date) + '</span></div>',
        '    <div class="blog-card-title">' + escHtml(post.title) + '</div>',
        (post.excerpt ? '    <p class="blog-card-excerpt">' + escHtml(post.excerpt) + '</p>' : ''),
        '    <div class="blog-read-more">Read Article &#8594;</div>',
        '  </div>',
        '</div>',
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    var postsHtml = posts.map(function (post) {
      var readTime = Math.max(1, Math.round(post.body.split(/\s+/).length / 200));
      var tag = '<span class=\\"blog-tag' + (cls[post.category]||'') + '\\">' + catLabel(post.category) + '</span>';
      return [
        '<div class="blog-post" id="' + post.id + '">',
        '  <button class="blog-post-back" onclick="closePosts()">&#8592; Back to Blog</button>',
        '  <div class="blog-post-eyebrow">' + tag + '</div>',
        '  <h1 class="blog-post-title">' + escHtml(post.title) + '</h1>',
        '  <div class="blog-post-meta">' + escHtml(post.date) + ' &middot; ' + readTime + ' min read</div>',
        '  <div class="blog-post-content">',
        '    ' + markdownToHtml(post.body).replace(/\n/g, '\n    '),
        '  </div>',
        '</div>',
      ].join('\n');
    }).join('\n\n');

    var out = '<!-- PASTE CARDS into blog/index.html (GENERATED_POSTS section) -->\n' + cardsHtml +
              '\n\n<!-- Dynamic post preview HTML (legacy export) -->\n' + postsHtml;
    $('admin-export-output').value = out;
    showToast('Export ready — copy cards into blog/index.html');
  }

  // ── IN-PLACE PAGE EDITOR ───────────────────────────────────
  // When admin is authenticated, editable text elements across
  // all pages get a hover highlight. Click any element to edit
  // it inline. A floating bar lets you download the updated
  // page fragment file.

  var PAGE_EDITABLE_SELECTOR = [
    'h1', 'h2', 'h3', 'h4', 'p',
    '.section-eyebrow', '.section-title', '.section-body',
    '.hero-title', '.hero-subtitle', '.hero-body',
    '.freq-name', '.freq-desc',
    '.step-title', '.step-body',
    '.quote-text', '.quote-attr',
    '.about-section-title',
    '.pillar-title', '.pillar-text',
    '.book-title', '.book-author', '.book-desc', '.book-tag',
    '.layer-name',
  ].join(', ');

  var PAGE_FILES = {
    'page-home'      : 'home.html',
    'page-about'     : 'about.html',
    'page-books'     : 'books.html',
    'page-calculator': 'calculator.html',
    'page-privacy'   : 'privacy.html',
  };

  var _pageEditMode   = false;
  var _pageEditTarget = null;
  var _dirtyPageId    = null;

  function enablePageEditMode() {
    if (_pageEditMode) return;
    _pageEditMode = true;

    document.querySelectorAll(PAGE_EDITABLE_SELECTOR).forEach(function (el) {
      if (el.closest('#admin-overlay') || el.closest('#page-editor-bar')) return;
      if (_hasBlockChildren(el)) return;

      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
      el.classList.add('page-editable');
      el.addEventListener('focus',   _onEdFocus,   true);
      el.addEventListener('blur',    _onEdBlur,    true);
      el.addEventListener('input',   _onEdInput,   true);
      el.addEventListener('keydown', _onEdKeydown, true);
    });

    var bar = $('page-editor-bar');
    if (bar) bar.classList.add('visible');
    showToast('Click any text on the page to edit it', 'ok');
  }

  function disablePageEditMode(force) {
    if (!_pageEditMode) return;
    if (!force && _dirtyPageId && !confirm('You have unsaved changes. Exit page edit mode?')) return;
    _pageEditMode = false;

    document.querySelectorAll('.page-editable').forEach(function (el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.classList.remove('page-editable', 'page-editable-focused');
      el.removeEventListener('focus',   _onEdFocus,   true);
      el.removeEventListener('blur',    _onEdBlur,    true);
      el.removeEventListener('input',   _onEdInput,   true);
      el.removeEventListener('keydown', _onEdKeydown, true);
    });

    var bar = $('page-editor-bar');
    if (bar) bar.classList.remove('visible');
    _pageEditTarget = null;
    _dirtyPageId    = null;
    var ind = $('page-editor-dirty'); if (ind) ind.style.display = 'none';
  }

  function _hasBlockChildren(el) {
    var allowed = ['span','strong','em','b','i','a','br','code'];
    for (var i = 0; i < el.children.length; i++) {
      if (!allowed.includes(el.children[i].tagName.toLowerCase())) return true;
    }
    return false;
  }

  function _onEdFocus(e) {
    _pageEditTarget = e.currentTarget;
    _pageEditTarget.classList.add('page-editable-focused');
    var pageEl = _pageEditTarget.closest('[id^="page-"]');
    var hint = $('page-editor-file-hint');
    if (hint) hint.textContent = pageEl ? (PAGE_FILES[pageEl.id] || pageEl.id) : '';
  }

  function _onEdBlur(e) {
    if (_pageEditTarget) _pageEditTarget.classList.remove('page-editable-focused');
    _pageEditTarget = null;
  }

  function _onEdInput(e) {
    var pageEl = e.currentTarget.closest('[id^="page-"]');
    if (pageEl) {
      _dirtyPageId = pageEl.id;
      var ind = $('page-editor-dirty'); if (ind) ind.style.display = 'inline';
    }
  }

  function _onEdKeydown(e) {
    var tag = e.currentTarget.tagName.toLowerCase();
    if (e.key === 'Enter' && ['h1','h2','h3','h4'].includes(tag)) {
      e.preventDefault(); e.currentTarget.blur();
    }
    if (e.key === 'Escape') e.currentTarget.blur();
  }

  function savePageEdits() {
    if (!_dirtyPageId) { showToast('No changes to save yet.', 'error'); return; }
    var pageEl = $(_dirtyPageId);
    if (!pageEl) { showToast('Page element not found.', 'error'); return; }
    var fileName = PAGE_FILES[_dirtyPageId];
    if (!fileName) { showToast('Unknown page — cannot save.', 'error'); return; }

    // Temporarily strip edit attributes before serialising
    var eds = pageEl.querySelectorAll('.page-editable');
    eds.forEach(function (el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.classList.remove('page-editable', 'page-editable-focused');
    });

    var html = pageEl.outerHTML;

    // Restore
    eds.forEach(function (el) {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
      el.classList.add('page-editable');
    });

    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);

    showToast('\u2713 ' + fileName + ' downloaded \u2014 drop into /pages/', 'ok');
    _dirtyPageId = null;
    var ind = $('page-editor-dirty'); if (ind) ind.style.display = 'none';
  }

  function togglePageEditMode() {
    if (_pageEditMode) disablePageEditMode();
    else               enablePageEditMode();
  }

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    loadPosts();
    if (posts.length) renderDynamicPosts();

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); open(); }
    });

    function checkHash() {
      if (window.location.hash === '#admin') { window.location.hash = ''; open(); }
    }
    checkHash();
    window.addEventListener('hashchange', checkHash);

    var triggerClicks = 0, triggerTimer = null;
    var trigger = $('admin-trigger');
    if (trigger) {
      trigger.addEventListener('click', function () {
        triggerClicks++;
        clearTimeout(triggerTimer);
        if (triggerClicks >= 5) { triggerClicks = 0; open(); }
        else { triggerTimer = setTimeout(function () { triggerClicks = 0; }, 1200); }
      });
    }

    var overlay = $('admin-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === this) close(); });
    }
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    open, close, login, boot,
    switchTab,
    // Write tab
    wrap, insertBreak, insertImage,
    buildPreview, previewCardImage,
    publish, clearForm,
    // Dynamic posts tab
    editDynPost, deleteDynPost,
    // Static post editor
    loadStaticPost, closeStaticEditor,
    switchStaticMode, staticWrap, staticInsertBreak,
    previewStaticPost, saveStaticPost,
    // Export
    exportCode,
    // Page editor
    togglePageEditMode, savePageEdits, disablePageEditMode,
  };

})();

// Boot is called by index.html onAllLoaded() after all fragments are injected.
