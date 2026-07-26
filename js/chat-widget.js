/**
 * SSC site assistant widget — single-turn UI, wiped on close/refresh.
 * Talks only to same-origin POST /api/chat (no API keys in the client).
 */
(function () {
  'use strict';

  var MAX_CHARS = 800;
  var ROOT_ID = 'ssc-chat-root';
  var _busy = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (ch) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch];
    });
  }

  /** Escape text, then linkify http(s) URLs only. */
  function formatReply(text) {
    var escaped = escapeHtml(text);
    return escaped.replace(
      /(https?:\/\/[^\s<]+[^\s<.,;:!?)'"])/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  function wipeMessages(listEl) {
    if (!listEl) return;
    listEl.innerHTML = '';
  }

  function appendBubble(listEl, role, text, pending) {
    var div = document.createElement('div');
    div.className =
      'ssc-chat-bubble ssc-chat-bubble--' +
      (role === 'user' ? 'user' : 'bot') +
      (pending ? ' ssc-chat-bubble--pending' : '');
    if (role === 'user') {
      div.textContent = text;
    } else {
      div.innerHTML = formatReply(text);
    }
    listEl.appendChild(div);
    listEl.scrollTop = listEl.scrollHeight;
    return div;
  }

  function currentPageHint() {
    try {
      return (location.pathname || '/') + (location.search || '');
    } catch (_) {
      return '/';
    }
  }

  function buildDom() {
    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'ssc-chat-root';
    root.setAttribute('data-ssc-chat', '1');
    root.innerHTML =
      '<div class="ssc-chat-panel" role="dialog" aria-label="SSC site assistant" aria-modal="false">' +
      '  <div class="ssc-chat-header">' +
      '    <div>' +
      '      <p class="ssc-chat-title">SSC Assistant</p>' +
      '      <p class="ssc-chat-sub">Site &amp; blog questions · session clears when closed</p>' +
      '    </div>' +
      '    <button type="button" class="ssc-chat-close" aria-label="Close chat">&times;</button>' +
      '  </div>' +
      '  <div class="ssc-chat-messages" aria-live="polite"></div>' +
      '  <form class="ssc-chat-form">' +
      '    <textarea class="ssc-chat-input" rows="1" maxlength="' +
      MAX_CHARS +
      '" placeholder="Ask about numerology, Codex, or services…" aria-label="Message"></textarea>' +
      '    <button type="submit" class="ssc-chat-send">Send</button>' +
      '  </form>' +
      '</div>' +
      '<button type="button" class="ssc-chat-fab" aria-label="Open SSC assistant">' +
      '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H7l-3 3V5z"/></svg>' +
      '</button>';
    return root;
  }

  function openPanel(root, listEl, inputEl) {
    root.classList.add('is-open');
    if (!listEl.dataset.greeted) {
      appendBubble(
        listEl,
        'bot',
        'Ask about Life Path, Expression, the Codex, the calculator, or Services. I only use what is published on this site and blog.'
      );
      listEl.dataset.greeted = '1';
    }
    setTimeout(function () {
      try {
        inputEl.focus();
      } catch (_) {}
    }, 50);
  }

  function closePanel(root, listEl, formEl, inputEl) {
    root.classList.remove('is-open');
    wipeMessages(listEl);
    delete listEl.dataset.greeted;
    if (formEl) formEl.reset();
    if (inputEl) inputEl.value = '';
    _busy = false;
  }

  async function sendMessage(listEl, inputEl, sendBtn) {
    if (_busy) return;
    var text = String(inputEl.value || '').trim();
    if (!text) return;
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    _busy = true;
    sendBtn.disabled = true;
    inputEl.value = '';
    appendBubble(listEl, 'user', text);
    var pending = appendBubble(listEl, 'bot', 'Thinking…', true);

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, page: currentPageHint() }),
      });
      var data = {};
      try {
        data = await res.json();
      } catch (_) {
        data = {};
      }

      pending.classList.remove('ssc-chat-bubble--pending');
      if (!res.ok) {
        pending.textContent =
          data.error || (res.status === 429 ? 'Too many requests — try again shortly.' : 'Chat unavailable right now.');
      } else {
        pending.innerHTML = formatReply(data.reply || 'No reply.');
      }
    } catch (_) {
      pending.classList.remove('ssc-chat-bubble--pending');
      pending.textContent = 'Could not reach the assistant. Check your connection and try again.';
    } finally {
      _busy = false;
      sendBtn.disabled = false;
      listEl.scrollTop = listEl.scrollHeight;
      try {
        inputEl.focus();
      } catch (_) {}
    }
  }

  function initChatWidget() {
    if (document.getElementById(ROOT_ID)) return;
    if (document.body && document.body.dataset.sscChatInit === '1') return;
    if (document.body) document.body.dataset.sscChatInit = '1';

    var root = buildDom();
    document.body.appendChild(root);

    var listEl = root.querySelector('.ssc-chat-messages');
    var formEl = root.querySelector('.ssc-chat-form');
    var inputEl = root.querySelector('.ssc-chat-input');
    var sendBtn = root.querySelector('.ssc-chat-send');
    var fab = root.querySelector('.ssc-chat-fab');
    var closeBtn = root.querySelector('.ssc-chat-close');

    fab.addEventListener('click', function () {
      openPanel(root, listEl, inputEl);
    });
    closeBtn.addEventListener('click', function () {
      closePanel(root, listEl, formEl, inputEl);
    });
    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      sendMessage(listEl, inputEl, sendBtn);
    });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(listEl, inputEl, sendBtn);
      }
    });

    window.addEventListener('pagehide', function () {
      closePanel(root, listEl, formEl, inputEl);
    });
  }

  window.initChatWidget = initChatWidget;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }
})();
