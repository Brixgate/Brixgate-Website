/* ============================================================
   PROMPT STORE  ·  prompt-store.js

   Shared by the store, pack, callback and access pages. Nothing
   here renders a page on its own; each page builds its own markup
   and borrows the pieces that would otherwise be written four
   times: the API call, escaping, money, the pack card and the
   resend form.

   Two rules run through the whole file.

   1. Prices are never computed here. The API sends `price.current`
      and checkout charges exactly that. We format it and nothing
      more. The mock this replaced worked out the price in the
      browser and handed it to Paystack, which meant the buyer's
      devtools decided what they paid.

   2. Only `scene_svg` and `icon_svg` reach innerHTML, because the
      API documents them as admin-authored markup. Every other
      string goes through esc() on the way in.
   ============================================================ */
(function () {
  'use strict';

  var API_BASE = 'https://dev.api.brixgate.com';   /* rewritten to api.brixgate.com at deploy */
  var API = API_BASE + '/api/v1/prompt-store';

  var PS = window.PromptStore = {};

  PS.API = API;
  PS.SUPPORT = 'we@brixgate.com';   /* replaced by config.support_email once loaded */

  /* ---------- escaping ---------- */

  PS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- the API ----------

     Every store endpoint answers with the same envelope, so one
     helper covers all of them. It resolves rather than throws on an
     HTTP error, because every caller needs the status to choose its
     message: 404, 422, 429 and 502 all mean different things to the
     buyer. Only a genuine network failure rejects. */

  PS.call = function (path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET' };
    if (opts.body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(opts.body);
    }
    return fetch(API + path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { ok: res.ok, status: res.status, body: body, data: body.data, message: body.message };
      });
    });
  };

  /* Buyer-facing wording for the failures the API documents. */
  PS.errorText = function (r) {
    if (!r) return 'Something went wrong. Please try again.';
    if (r.status === 404) return 'We could not find that.';
    if (r.status === 429) return 'That was a lot of tries at once. Please wait a moment and try again.';
    if (r.status === 502) return 'We could not reach the payment provider. Please try again in a moment.';
    if (r.status === 422) return r.message || 'Please check the details above.';
    return r.message || 'Something went wrong. Please try again.';
  };

  /* The request body is snake_case but validation errors come back
     camelCase, so the two cannot be matched without this. */
  PS.FIELD_OF = {
    email: 'email',
    name: 'name',
    agreedToTerms: 'agreed_to_terms',
    agreed_to_terms: 'agreed_to_terms',
    callbackUrl: 'callback_url',
    callback_url: 'callback_url'
  };

  /* ---------- money ----------

     The store charges in naira through Paystack; `usd_estimate` is
     an estimate the API supplies for display. currency.js decides
     which one leads, exactly as it does everywhere else on the
     site, and the naira figure is always stated where money
     actually changes hands so nobody meets a surprise at Paystack. */

  PS.naira = function (n) {
    return '₦' + Number(n || 0).toLocaleString('en-US');
  };
  PS.usd = function (n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  PS.isUSD = function () {
    return String(window.bxActiveCurrency || 'ngn').toLowerCase() === 'usd';
  };

  /* A price renders as markup carrying both figures, so a currency
     decision that lands after paint (the geo lookup is a network
     call) only has to rewrite text, not re-fetch anything. */
  PS.priceHTML = function (price, opts) {
    opts = opts || {};
    if (!price) return '';
    var cur = Number(price.current || 0);
    var usd = price.usd_estimate != null ? Number(price.usd_estimate) : null;
    var strike = price.founding_applied && price.list != null && Number(price.list) > cur;

    return '<span class="ps-amt" data-ngn="' + cur + '"' +
             (usd != null ? ' data-usd="' + usd + '"' : '') +
             (strike ? ' data-list="' + Number(price.list) + '"' : '') + '>' +
             PS.amtText(cur, usd, strike ? Number(price.list) : null) +
           '</span>';
  };

  PS.amtText = function (ngn, usd, list) {
    var usdOn = PS.isUSD() && usd != null;

    /* The old price is shown struck through only when the founding
       price is actually applied, which the caller has checked. It
       stays in naira, because that is the real previous price
       rather than an estimate of one — which is also why it moves
       out of the headline when the headline is in dollars. Setting
       "$5.63" beside a struck-through "₦10,000" reads as though the
       two could be compared, and they cannot. */
    var out = PS.esc(usdOn ? PS.usd(usd) : PS.naira(ngn));
    if (!usdOn && list != null) out += '<s>' + PS.esc(PS.naira(list)) + '</s>';

    if (usdOn) {
      out += '<span class="ps-usd">charged as ' + PS.esc(PS.naira(ngn)) +
             (list != null ? ', was ' + PS.esc(PS.naira(list)) : '') + '</span>';
    } else if (usd != null) {
      out += '<span class="ps-usd">About ' + PS.esc(PS.usd(usd)) + '</span>';
    }
    return out;
  };

  /* Re-render every price in place when currency.js reports in. */
  PS.refreshPrices = function (root) {
    var nodes = (root || document).querySelectorAll('.ps-amt');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var usd = el.getAttribute('data-usd');
      var list = el.getAttribute('data-list');
      el.innerHTML = PS.amtText(
        Number(el.getAttribute('data-ngn')),
        usd == null ? null : Number(usd),
        list == null ? null : Number(list)
      );
    }
  };
  document.addEventListener('bx:currency', function () { PS.refreshPrices(); });

  /* ---------- pack card ----------
     One shape, used by the store grid and by "You may also like". */

  PS.card = function (p) {
    var cat = p.category || {};
    var hooks = (p.hooks || []).slice(0, 2).map(function (h) {
      return '<li>' + PS.esc(h) + '</li>';
    }).join('');

    return '<a class="ps-card" href="prompt-pack.html?pack=' + encodeURIComponent(p.slug) + '"' +
             ' data-cat="' + PS.esc(cat.slug || '') + '"' +
             ' data-price="' + Number((p.price && p.price.current) || 0) + '"' +
             ' data-pop="' + (p.popular ? 1 : 0) + '"' +
             ' data-text="' + PS.esc(((p.title || '') + ' ' + (p.tagline || '') + ' ' +
                 (cat.name || '') + ' ' + (p.hooks || []).join(' ')).toLowerCase()) + '">' +
             '<div class="ps-scene">' +
               (p.popular ? '<span class="ps-badge">POPULAR</span>' : '') +
               (cat.short_name ? '<span class="ps-catlab">' + PS.esc(cat.short_name) + '</span>' : '') +
               (p.scene_svg || '') +
             '</div>' +
             '<div class="ps-bd">' +
               '<h3>' + PS.esc(p.title) + '</h3>' +
               '<ul class="ps-hooks">' + hooks + '</ul>' +
               '<div class="ps-ft">' +
                 '<div class="ps-price">' + PS.priceHTML(p.price) + '</div>' +
                 '<span class="ps-go">View pack →</span>' +
               '</div>' +
             '</div>' +
           '</a>';
  };

  /* ---------- copy buttons ----------
     Delegated, so markup rendered later still works. The clipboard
     API needs a secure context, hence the textarea fallback. */

  PS.bindCopy = function (root) {
    (root || document).addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.ps-cp') : null;
      if (!btn) return;
      var pre = document.getElementById(btn.getAttribute('data-for'));
      if (!pre) return;
      var text = pre.textContent;
      var done = function () {
        var was = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = was; }, 1800);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { PS.fallbackCopy(text, done); });
      } else {
        PS.fallbackCopy(text, done);
      }
    });
  };

  PS.fallbackCopy = function (text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:absolute;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  };

  /* ---------- resend ----------

     Offered on the callback page when the pack has been paid for
     but not yet emailed, and behind "Didn't get your pack?" on the
     access page. The endpoint answers identically whether or not
     the email matches, so that it cannot be used to find out who
     bought what; the copy has to be just as uninformative. */

  PS.resendHTML = function (reference) {
    return '<div class="ps-resend">' +
             '<h4>Didn\'t get your pack?</h4>' +
             '<p>Enter the email you paid with and we will send it again.</p>' +
             '<form class="ps-resend-row" data-resend="' + PS.esc(reference) + '" novalidate>' +
               '<input type="email" name="email" placeholder="you@example.com" autocomplete="email" aria-label="Email you paid with" required>' +
               '<button type="submit" class="ps-btn ps-btn-dark">Resend</button>' +
             '</form>' +
             '<div class="ps-msg" data-resend-msg></div>' +
           '</div>';
  };

  PS.bindResend = function (root) {
    (root || document).addEventListener('submit', function (e) {
      var form = e.target.closest ? e.target.closest('[data-resend]') : null;
      if (!form) return;
      e.preventDefault();

      var reference = form.getAttribute('data-resend');
      var input = form.querySelector('input[name=email]');
      var btn = form.querySelector('button');
      var msg = form.parentNode.querySelector('[data-resend-msg]');
      var email = (input.value || '').trim();

      var say = function (text, kind) {
        if (!msg) return;
        msg.className = 'ps-msg ps-' + kind;
        msg.textContent = text;
      };

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say('Please enter the email you paid with.', 'err');
        return;
      }

      btn.disabled = true;
      say('Sending…', 'info');

      PS.call('/orders/' + encodeURIComponent(reference) + '/resend', {
        method: 'POST', body: { email: email }
      }).then(function (r) {
        btn.disabled = false;
        if (r.ok) say(r.message || 'If the details match a paid order, the pack has been sent again. Check your inbox and spam folder.', 'ok');
        else say(PS.errorText(r), 'err');
      }).catch(function () {
        btn.disabled = false;
        say('We could not reach our server. Please try again, or email ' + PS.SUPPORT + '.', 'err');
      });
    });
  };

  /* ---------- category icon ----------
     The API sends inner <path>s only, so they need a wrapper. */

  PS.icon = function (iconSvg, cls) {
    if (!iconSvg) return '';
    return '<svg viewBox="0 0 24 24"' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true">' + iconSvg + '</svg>';
  };

  /* ---------- misc ---------- */

  PS.param = function (name) {
    return new URLSearchParams(window.location.search).get(name);
  };

  PS.setYear = function () {
    var y = document.getElementById('footer-year');
    if (y) y.textContent = new Date().getFullYear();
  };
})();
