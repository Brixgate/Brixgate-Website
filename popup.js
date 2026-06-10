/* ============================================================
   Brixgate — Spot Capture Popup
   Injected on every page. Shows on every load/reload/new tab.
   ============================================================ */
(function () {
  'use strict';

  if (document.getElementById('bxSpotPopup')) return;

  /* ── Styles ─────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '@keyframes bxSlideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes bxPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.6)}}',

    '#bxSpotPopup{',
      'display:none;position:fixed;bottom:100px;right:28px;width:340px;',
      'background:#0D1C34;border-radius:16px;',
      'box-shadow:0 20px 60px rgba(0,0,0,.5),0 4px 16px rgba(0,0,0,.3);',
      'padding:28px 24px 22px;z-index:10001;',
      'animation:bxSlideIn .4s cubic-bezier(.22,.68,0,1.2);',
      "font-family:'DM Sans','Trebuchet MS',Arial,sans-serif;",
      'border:1px solid rgba(255,255,255,.08);',
    '}',
    '#bxSpotPopup *{box-sizing:border-box}',

    /* Close button — square */
    '#bxPopupClose{',
      'position:absolute;top:16px;right:16px;',
      'width:32px;height:32px;',
      'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);',
      'border-radius:7px;cursor:pointer;',
      'color:rgba(255,255,255,.6);font-size:1.1rem;line-height:1;',
      'display:flex;align-items:center;justify-content:center;',
      'transition:background .15s,color .15s;font-family:inherit;',
    '}',
    '#bxPopupClose:hover{background:rgba(255,255,255,.14);color:#fff}',

    /* City pills */
    '.bx-city-pill{',
      'display:inline-block;',
      'padding:5px 12px;border-radius:20px;',
      'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.13);',
      'font-size:.72rem;font-weight:600;color:rgba(255,255,255,.75);',
      'white-space:nowrap;',
    '}',

    /* Email input */
    '#bxPopupEmail{',
      'width:100%;border:1px solid rgba(255,255,255,.15);border-radius:9px;',
      'padding:11px 14px;font-size:.875rem;',
      'color:#fff;background:rgba(255,255,255,.07);',
      'font-family:inherit;outline:none;margin-bottom:10px;',
      'transition:border-color .2s;',
    '}',
    '#bxPopupEmail::placeholder{color:rgba(255,255,255,.35)}',
    '#bxPopupEmail:focus{border-color:#FF294E;background:rgba(255,255,255,.1)}',

    /* Submit button */
    '#bxPopupBtn{',
      'width:100%;background:#fff;color:#021024;border:none;border-radius:9px;',
      'padding:12px;font-size:.9rem;font-weight:800;cursor:pointer;',
      'font-family:inherit;transition:opacity .2s,transform .15s;letter-spacing:-.01em;',
    '}',
    '#bxPopupBtn:hover{opacity:.92;transform:translateY(-1px)}',
    '#bxPopupBtn:disabled{opacity:.6;cursor:not-allowed;transform:none}',

    '@media(max-width:420px){',
      '#bxSpotPopup{width:calc(100vw - 32px);right:16px;bottom:90px}',
    '}',
  ].join('');
  document.head.appendChild(css);

  /* ── HTML ────────────────────────────────────────────────── */
  var el = document.createElement('div');
  el.id = 'bxSpotPopup';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Secure your spot');
  el.innerHTML = [

    /* Close */
    '<button id="bxPopupClose" aria-label="Close">&#215;</button>',

    /* Top label — dot + text, no pill */
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">',
      '<span style="width:7px;height:7px;background:#FF294E;border-radius:50%;',
        'flex-shrink:0;display:inline-block;animation:bxPulse 2s infinite"></span>',
      '<span style="font-size:.7rem;font-weight:800;text-transform:uppercase;',
        'letter-spacing:.1em;color:#FF294E">AI in Software Engineering</span>',
    '</div>',

    /* Heading — keep original */
    '<h3 style="font-size:1.15rem;font-weight:900;color:#fff;margin:0 0 10px;',
      'line-height:1.25;padding-right:24px">',
      'Limited Spots in AI in Software Engineering',
    '</h3>',

    /* Subtext — keep original */
    '<p style="font-size:.8rem;color:rgba(255,255,255,.6);margin:0 0 18px;line-height:1.65">',
      'Secure your spot before it fills now! Drop your email and we\'ll send',
      ' cohort details, early-bird discounts and application updates straight to you.',
    '</p>',

    /* Social proof block — flat single bg */
    '<div style="background:rgba(255,255,255,.05);border-radius:10px;',
      'padding:12px 14px;margin-bottom:18px">',
      '<p style="font-size:.78rem;font-weight:700;color:rgba(255,255,255,.75);',
        'margin:0 0 10px;line-height:1.4">',
        'Engineers across 6 cities are already on this list.',
      '</p>',
      '<div style="display:flex;flex-wrap:wrap;gap:6px">',
        '<span class="bx-city-pill">Lagos</span>',
        '<span class="bx-city-pill">Nairobi</span>',
        '<span class="bx-city-pill">Johannesburg</span>',
        '<span class="bx-city-pill">Accra</span>',
        '<span class="bx-city-pill">London</span>',
        '<span class="bx-city-pill">New York</span>',
      '</div>',
    '</div>',

    /* Form */
    '<div id="bxPopupForm">',
      '<input type="email" id="bxPopupEmail" placeholder="Your email address" autocomplete="email" />',
      '<p id="bxPopupErr" style="display:none;font-size:.74rem;color:#FF6B6B;margin:0 0 8px"></p>',
      '<button id="bxPopupBtn">Add me to the list &rarr;</button>',
    '</div>',

    /* Success */
    '<div id="bxPopupSuccess" style="display:none;text-align:center;padding:12px 0 6px">',
      '<div style="font-size:1.8rem;margin-bottom:10px">🎉</div>',
      '<div style="font-size:.95rem;font-weight:800;color:#fff;margin-bottom:6px">',
        'You\'re on the list!',
      '</div>',
      '<div style="font-size:.78rem;color:rgba(255,255,255,.55);line-height:1.5">',
        'We\'ll be in touch with updates and early-bird details.',
      '</div>',
    '</div>',

    /* Footer */
    '<p style="text-align:center;font-size:.7rem;color:rgba(255,255,255,.3);',
      'margin:14px 0 0;line-height:1">',
      '&#128274; No spam. Unsubscribe anytime.',
    '</p>',

  ].join('');

  document.body.appendChild(el);

  /* ── Show / hide ─────────────────────────────────────────── */
  var _dismissed = false;

  function dismiss() {
    if (_dismissed) return;
    _dismissed = true;
    el.style.transition = 'opacity .25s,transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(function () { el.style.display = 'none'; }, 270);
  }

  document.getElementById('bxPopupClose').addEventListener('click', dismiss);

  /* Show on every page load after 3 s */
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
        btn.textContent = 'Add me to the list →';
        btn.disabled = false;
      });
  });
})();
