/* ============================================================
   BRIXGATE — chat widget
   Talks to the n8n Chat Trigger webhook. Self-contained: no CDN,
   no framework. Sits above the WhatsApp float rather than over it.
   ============================================================ */
(function () {
  'use strict';

  var ENDPOINT = 'https://brixgate.app.n8n.cloud/webhook/48d385b2-49fc-47b3-bbbd-499977796076/chat';

  /* Answers that hit the cohort tool have measured ~18s round trips, so the
     timeout is generous and the typing state has to carry the wait. */
  var TIMEOUT_MS = 45000;
  var SESSION_KEY = 'bxChatSession';
  var LOG_KEY = 'bxChatLog';

  var WHATSAPP = 'https://wa.me/2348079160291?text=Hi%20Brixgate%2C%20I%27d%20like%20to%20ask%20a%20question.';

  var GREETING = "Hi. I can answer questions about our programmes, pricing and cohort dates. What would you like to know?";
  var CHIPS = ['What programmes do you run?', 'How much does it cost?', 'When does the next cohort start?'];

  if (window.__bxChatLoaded) return;
  window.__bxChatLoaded = true;

  /* ---------- session ---------- */
  function sessionId() {
    var id;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
    if (!id) {
      id = 'bx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      try { sessionStorage.setItem(SESSION_KEY, id); } catch (e) {}
    }
    return id;
  }

  /* ---------- styles ---------- */
  var css = `
.bxc-btn{position:fixed;right:20px;bottom:96px;z-index:9998;width:56px;height:56px;border:0;border-radius:50%;
 cursor:pointer;display:grid;place-items:center;padding:0;
 background:linear-gradient(135deg,#FF294E,#FF5748);color:#fff;
 box-shadow:0 10px 30px -8px rgba(255,41,78,.65);
 transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s}
.bxc-btn:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 16px 38px -10px rgba(255,41,78,.75)}
.bxc-btn svg{pointer-events:none}
.bxc-btn .x{display:none}
.bxc-btn.open .c{display:none}
.bxc-btn.open .x{display:block}
.bxc-dot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;
 background:#4ade80;border:2px solid #fff}
.bxc-btn.open .bxc-dot{display:none}

.bxc-panel{position:fixed;right:20px;bottom:164px;z-index:9999;width:380px;max-width:calc(100vw - 40px);
 height:min(560px,calc(100vh - 200px));display:flex;flex-direction:column;overflow:hidden;
 background:#fff;border-radius:20px;border:1px solid #E6E8EC;
 box-shadow:0 2px 6px rgba(2,16,36,.06),0 30px 70px -24px rgba(2,16,36,.42);
 opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;
 transition:opacity .26s cubic-bezier(.2,.7,.2,1),transform .26s cubic-bezier(.2,.7,.2,1)}
.bxc-panel.open{opacity:1;transform:none;pointer-events:auto}

.bxc-head{position:relative;overflow:hidden;padding:18px 20px;color:#fff;flex-shrink:0;
 background:radial-gradient(90% 140% at 100% 0%,rgba(255,87,72,.65) 0%,transparent 60%),
 linear-gradient(118deg,#021024 0%,#1B3A5C 46%,#9A2335 78%,#C4173A 100%)}
.bxc-head::after{content:'';position:absolute;inset:0;opacity:.22;mix-blend-mode:overlay;pointer-events:none;
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")}
.bxc-head>*{position:relative;z-index:1}
.bxc-title{font-size:.98rem;font-weight:700;letter-spacing:-.01em}
.bxc-sub{font-size:.76rem;color:rgba(255,255,255,.72);margin-top:3px;display:flex;align-items:center;gap:6px}
.bxc-live{width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block}

.bxc-log{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;background:#FAFBFC}
.bxc-log::-webkit-scrollbar{width:6px}
.bxc-log::-webkit-scrollbar-thumb{background:#D8DDE4;border-radius:3px}

.bxc-msg{max-width:86%;font-size:.89rem;line-height:1.58;padding:11px 14px;border-radius:14px;
 white-space:pre-wrap;word-wrap:break-word;animation:bxcIn .28s cubic-bezier(.2,.7,.2,1) both}
@keyframes bxcIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.bxc-bot{align-self:flex-start;background:#fff;border:1px solid #E6E8EC;color:#1B2A41;border-bottom-left-radius:5px}
.bxc-me{align-self:flex-end;background:linear-gradient(135deg,#FF294E,#FF5748);color:#fff;border-bottom-right-radius:5px}
.bxc-err{align-self:flex-start;background:rgba(255,41,78,.06);border:1px solid rgba(255,41,78,.24);color:#8B1029}
.bxc-msg a{color:inherit;font-weight:650;text-decoration:underline}
.bxc-bot a{color:#FF294E}

.bxc-typing{align-self:flex-start;display:flex;gap:4px;padding:13px 15px;background:#fff;
 border:1px solid #E6E8EC;border-radius:14px;border-bottom-left-radius:5px}
.bxc-typing i{width:6px;height:6px;border-radius:50%;background:#9FB0C4;display:block;
 animation:bxcBlink 1.3s ease-in-out infinite}
.bxc-typing i:nth-child(2){animation-delay:.18s}
.bxc-typing i:nth-child(3){animation-delay:.36s}
@keyframes bxcBlink{0%,60%,100%{opacity:.28;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.bxc-slow{align-self:flex-start;font-size:.74rem;color:#6B7A90;padding:0 4px}

.bxc-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 18px 14px;background:#FAFBFC}
.bxc-chip{font-family:inherit;font-size:.78rem;font-weight:600;color:#1B2A41;cursor:pointer;
 background:#fff;border:1px solid #E6E8EC;border-radius:999px;padding:7px 13px;
 transition:border-color .2s,transform .2s}
.bxc-chip:hover{border-color:#FF294E;color:#FF294E;transform:translateY(-1px)}

.bxc-foot{flex-shrink:0;border-top:1px solid #EEF0F3;background:#fff;padding:12px 14px}
.bxc-form{display:flex;gap:9px;align-items:flex-end}
.bxc-in{flex:1;min-width:0;resize:none;max-height:104px;font-family:inherit;font-size:.89rem;line-height:1.5;
 color:#021024;background:#F7F8FA;border:1.5px solid #E6E8EC;border-radius:12px;padding:10px 13px;outline:none;
 transition:border-color .2s,background .2s}
.bxc-in::placeholder{color:#A9B4C2}
.bxc-in:focus{border-color:#FF294E;background:#fff}
.bxc-send{flex-shrink:0;width:40px;height:40px;border:0;border-radius:11px;cursor:pointer;display:grid;place-items:center;
 background:linear-gradient(135deg,#FF294E,#FF5748);color:#fff;transition:transform .2s,opacity .2s}
.bxc-send:hover:not(:disabled){transform:translateY(-1px)}
.bxc-send:disabled{opacity:.4;cursor:not-allowed}
.bxc-note{font-size:.68rem;color:#98A4B5;text-align:center;margin-top:9px}
.bxc-note a{color:#6B7A90;text-decoration:underline}

@media (max-width:520px){
 .bxc-panel{right:0;left:0;bottom:0;width:100%;max-width:none;height:min(76vh,620px);
  border-radius:20px 20px 0 0;border-left:0;border-right:0;border-bottom:0}
 .bxc-btn{bottom:88px;right:14px}
}
@media (prefers-reduced-motion:reduce){
 .bxc-panel,.bxc-btn,.bxc-msg{transition:none!important;animation:none!important}
 .bxc-typing i{animation:none;opacity:.6}
}`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- markup ---------- */
  var btn = document.createElement('button');
  btn.className = 'bxc-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML =
    '<span class="bxc-dot"></span>' +
    '<svg class="c" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
    '<svg class="x" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'bxc-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with Brixgate');
  panel.innerHTML =
    '<div class="bxc-head">' +
      '<div class="bxc-title">Brixgate assistant</div>' +
      '<div class="bxc-sub"><span class="bxc-live"></span>Usually replies in a few seconds</div>' +
    '</div>' +
    '<div class="bxc-log" id="bxc-log"></div>' +
    '<div class="bxc-chips" id="bxc-chips"></div>' +
    '<div class="bxc-foot">' +
      '<form class="bxc-form" id="bxc-form">' +
        '<textarea class="bxc-in" id="bxc-in" rows="1" placeholder="Ask about programmes, pricing, dates…" aria-label="Your message"></textarea>' +
        '<button class="bxc-send" id="bxc-send" type="submit" aria-label="Send">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
      '</form>' +
      '<div class="bxc-note">Automated assistant — it can be wrong. <a href="' + WHATSAPP + '" target="_blank" rel="noopener">Talk to a human</a></div>' +
    '</div>';

  document.body.appendChild(panel);
  document.body.appendChild(btn);

  var log = panel.querySelector('#bxc-log');
  var chips = panel.querySelector('#bxc-chips');
  var form = panel.querySelector('#bxc-form');
  var input = panel.querySelector('#bxc-in');
  var send = panel.querySelector('#bxc-send');
  var busy = false;

  /* ---------- rendering ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* The agent replies in light markdown, so render just bold, bullets and
     links - escaped first, so nothing it returns can inject markup. */
  function render(text) {
    var s = esc(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|\s)\*\s+/gm, '$1• ');
    s = s.replace(/\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:)])/gi, function (m) {
      var href = m.indexOf('http') === 0 ? m : 'https://' + m;
      return '<a href="' + href + '" target="_blank" rel="noopener">' + m + '</a>';
    });
    s = s.replace(/\b(brixgate\.com\/[a-z0-9._\/-]+)/gi, function (m) {
      if (/<a /.test(m)) return m;
      return '<a href="https://' + m + '" target="_blank" rel="noopener">' + m + '</a>';
    });
    return s;
  }

  function bubble(text, kind) {
    var d = document.createElement('div');
    d.className = 'bxc-msg ' + (kind || 'bxc-bot');
    d.innerHTML = render(text);
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function save(role, text) {
    try {
      var l = JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]');
      l.push({ r: role, t: text });
      sessionStorage.setItem(LOG_KEY, JSON.stringify(l.slice(-40)));
    } catch (e) {}
  }

  function renderChips() {
    chips.innerHTML = '';
    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bxc-chip'; b.textContent = c;
      b.addEventListener('click', function () { ask(c); });
      chips.appendChild(b);
    });
  }

  function restore() {
    var l = [];
    try { l = JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]'); } catch (e) {}
    if (!l.length) { bubble(GREETING); renderChips(); return; }
    l.forEach(function (m) { bubble(m.t, m.r === 'me' ? 'bxc-me' : 'bxc-bot'); });
  }

  /* ---------- send ---------- */
  function ask(text) {
    if (busy) return;
    text = (text || '').trim();
    if (!text) return;

    chips.innerHTML = '';
    bubble(text, 'bxc-me'); save('me', text);
    input.value = ''; input.style.height = 'auto';

    busy = true; send.disabled = true;

    var typing = document.createElement('div');
    typing.className = 'bxc-typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    /* Tool-backed answers can run ~20s. Say so rather than look broken. */
    var slow = null;
    var slowTimer = setTimeout(function () {
      slow = document.createElement('div');
      slow.className = 'bxc-slow';
      slow.textContent = 'Checking live cohort data…';
      log.appendChild(slow);
      log.scrollTop = log.scrollHeight;
    }, 6000);

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var killer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    function done() {
      clearTimeout(slowTimer); clearTimeout(killer);
      typing.remove(); if (slow) slow.remove();
      busy = false; send.disabled = false;
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sendMessage', sessionId: sessionId(), chatInput: text }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        done();
        var out = (data && (data.output || data.text || data.message)) || '';
        if (!out) throw new Error('empty');
        bubble(out); save('bot', out);
      })
      .catch(function (err) {
        done();
        var msg = (err && err.name === 'AbortError')
          ? "That took longer than expected. Try again, or message us on WhatsApp and a person will pick it up."
          : "I couldn't reach the assistant just now. Please message us on WhatsApp at 0807 916 0291 or email we@brixgate.com.";
        bubble(msg, 'bxc-err');
      });
  }

  /* ---------- wiring ---------- */
  function toggle(open) {
    panel.classList.toggle('open', open);
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) setTimeout(function () { input.focus(); }, 260);
  }

  btn.addEventListener('click', function () { toggle(!panel.classList.contains('open')); });

  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 104) + 'px';
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) toggle(false);
  });

  restore();
})();
