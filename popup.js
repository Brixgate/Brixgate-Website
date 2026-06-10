/* ============================================================
   Brixgate — Spot Capture Popup
   Injected on every page. Shows once per session.
   ============================================================ */
(function () {
  'use strict';

  /* Already injected (e.g. double-include guard) */
  if (document.getElementById('bxSpotPopup')) return;

  /* ── Styles ─────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '@keyframes bxSlideIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes bxPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)}}',
    '#bxSpotPopup{',
      'display:none;position:fixed;bottom:100px;right:28px;width:320px;',
      'background:#fff;border-radius:18px;',
      'box-shadow:0 12px 48px rgba(0,0,0,.18),0 2px 10px rgba(0,0,0,.07);',
      'padding:24px 24px 20px;z-index:10001;',
      'animation:bxSlideIn .4s ease;',
      "font-family:'DM Sans','Trebuchet MS',Arial,sans-serif;",
    '}',
    '#bxSpotPopup *{box-sizing:border-box}',
  ].join('');
  document.head.appendChild(css);

  /* ── HTML ────────────────────────────────────────────────── */
  var el = document.createElement('div');
  el.id = 'bxSpotPopup';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Secure your spot');
  el.innerHTML = [
    /* Close button */
    '<button id="bxPopupClose" aria-label="Close"',
      'style="position:absolute;top:14px;right:16px;background:none;border:none;',
      'cursor:pointer;color:#9CA3AF;font-size:1.35rem;line-height:1;padding:2px 6px;',
      'transition:color .15s;font-family:inherit"',
      'onmouseover="this.style.color=\'#374151\'" onmouseout="this.style.color=\'#9CA3AF\'">',
      '&times;',
    '</button>',

    /* Badge */
    '<div style="display:flex;align-items:center;gap:7px;margin-bottom:10px">',
      '<span style="width:7px;height:7px;background:#FF294E;border-radius:50%;',
        'display:inline-block;flex-shrink:0;animation:bxPulse 2s infinite"></span>',
      '<span style="font-size:.67rem;font-weight:800;text-transform:uppercase;',
        'letter-spacing:.1em;color:#FF294E">Limited Spots</span>',
    '</div>',

    /* Heading */
    '<h3 style="font-size:1rem;font-weight:900;color:#021024;margin:0 0 8px;',
      'line-height:1.3;padding-right:20px">',
      'Limited Spots in AI in Software Engineering',
    '</h3>',

    /* Sub-text */
    '<p style="font-size:.8rem;color:#6B7280;margin:0 0 18px;line-height:1.6">',
      'Secure your spot before it fills now! Drop your email and we\'ll send',
      ' cohort details, early-bird discounts and application updates straight to you.',
    '</p>',

    /* Form */
    '<div id="bxPopupForm">',
      '<input type="email" id="bxPopupEmail" placeholder="Enter your email address"',
        'style="width:100%;border:1.5px solid #E5E7EB;border-radius:9px;',
        'padding:10px 14px;font-size:.875rem;color:#021024;font-family:inherit;',
        'outline:none;margin-bottom:9px;transition:border-color .2s;background:#fff"',
        'onfocus="this.style.borderColor=\'#FF294E\'"',
        'onblur="this.style.borderColor=\'#E5E7EB\'"',
      '/>',
      '<p id="bxPopupErr" style="display:none;font-size:.75rem;color:#EF4444;margin:0 0 8px"></p>',
      '<button id="bxPopupBtn"',
        'style="width:100%;background:#FF294E;color:#fff;border:none;border-radius:9px;',
        'padding:11px;font-size:.875rem;font-weight:700;cursor:pointer;font-family:inherit;',
        'transition:background .2s"',
        'onmouseover="this.style.background=\'#e0183a\'"',
        'onmouseout="this.style.background=\'#FF294E\'">',
        'Secure My Spot &rarr;',
      '</button>',
    '</div>',

    /* Success */
    '<div id="bxPopupSuccess" style="display:none;text-align:center;padding:8px 0 4px">',
      '<div style="font-size:1.6rem;margin-bottom:8px">🎉</div>',
      '<div style="font-size:.92rem;font-weight:800;color:#021024;margin-bottom:5px">',
        'You\'re on the list!',
      '</div>',
      '<div style="font-size:.78rem;color:#6B7280;line-height:1.5">',
        'We\'ll be in touch with updates and early-bird details.',
      '</div>',
    '</div>',
  ].join('');

  document.body.appendChild(el);

  /* ── Show / hide logic ───────────────────────────────────── */
  /* No sessionStorage — popup shows on every page load / reload / new tab.
     The dismissed flag is in-memory only, so it resets on every navigation. */
  var _dismissed = false;

  function dismiss() {
    if (_dismissed) return;
    _dismissed = true;
    el.style.transition = 'opacity .25s';
    el.style.opacity = '0';
    setTimeout(function () { el.style.display = 'none'; }, 260);
  }

  document.getElementById('bxPopupClose').addEventListener('click', dismiss);

  setTimeout(function () { el.style.display = 'block'; }, 3000);

  /* ── Submit ──────────────────────────────────────────────── */
  document.getElementById('bxPopupBtn').addEventListener('click', function () {
    var input = document.getElementById('bxPopupEmail');
    var errEl = document.getElementById('bxPopupErr');
    var btn   = document.getElementById('bxPopupBtn');
    var email = (input.value || '').trim();

    errEl.style.display = 'none';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Please enter a valid email address.';
      errEl.style.display = 'block';
      return;
    }

    btn.textContent = 'Sending…';
    btn.disabled = true;

    var base = (typeof BX_API_BASE !== 'undefined')
      ? BX_API_BASE
      : 'https://dev.api.brixgate.com';

    fetch(base + '/api/v1/waitlist', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ primary_field: email }),
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        document.getElementById('bxPopupForm').style.display    = 'none';
        document.getElementById('bxPopupSuccess').style.display = 'block';
        setTimeout(dismiss, 4000);
      })
      .catch(function () {
        errEl.textContent = 'Network error — please try again.';
        errEl.style.display = 'block';
        btn.textContent = 'Secure My Spot →';
        btn.disabled = false;
      });
  });
})();
