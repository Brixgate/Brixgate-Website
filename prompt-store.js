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

  /* ---------- demo mode ----------

     Scaffolding, so the store can be clicked through before the
     backend has a catalogue. It is off unless ?demo=1 appears in
     the URL, and it announces itself with a banner, because a demo
     price that is mistaken for a real one is how someone ends up
     quoting 4,500 naira to a customer.

     The whole of it hangs off one hook inside PS.call below, so no
     page knows it exists. Delete this block and
     prompt-store-demo.js together once there are real packs. */

  PS.demo = (function () {
    var q = window.location.search;
    try {
      if (/[?&]demo=1\b/.test(q)) sessionStorage.setItem('ps_demo', '1');
      if (/[?&]demo=0\b/.test(q)) sessionStorage.removeItem('ps_demo');
      return sessionStorage.getItem('ps_demo') === '1';
    } catch (e) {
      /* private mode: honour the URL for this page only */
      return /[?&]demo=1\b/.test(q);
    }
  })();

  /* Fetched on demand so a real visitor never downloads it. */
  var demoLoading = null;
  function demoData() {
    if (window.PromptStoreDemo) return Promise.resolve(window.PromptStoreDemo);
    if (demoLoading) return demoLoading;
    demoLoading = new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = '/prompt-store-demo.js';
      el.onload = function () { resolve(hydrate(window.PromptStoreDemo)); };
      el.onerror = reject;
      document.head.appendChild(el);
    });
    return demoLoading;
  }

  /* The file stores each scene once and each `related` entry as a
     bare slug; both are expanded here so the rest of the code sees
     exactly the shape the real API returns. */
  function hydrate(d) {
    if (!d || d._ready) return d;
    Object.keys(d.cards).forEach(function (slug) {
      d.cards[slug].scene_svg = d.scenes[slug] || '';
    });
    Object.keys(d.details).forEach(function (slug) {
      var det = d.details[slug];
      det.scene_svg = d.scenes[slug] || '';
      det.related = (det.related || []).map(function (r) { return d.cards[r.slug]; }).filter(Boolean);
    });
    d.featured = (d.featured || []).map(function (f) {
      return { headline: f.headline, pack: d.cards[f.slug] };
    }).filter(function (f) { return f.pack; });
    d.packs = d.order.map(function (slug) { return d.cards[slug]; });
    d._ready = true;
    return d;
  }

  function ok(data, message) {
    return { ok: true, status: 200, body: { success: true, message: message, data: data }, data: data, message: message };
  }

  function demoAnswer(path, opts) {
    return demoData().then(function (d) {
      var method = (opts.method || 'GET').toUpperCase();

      if (path === '/storefront') {
        return ok({ config: d.config, categories: d.categories, featured: d.featured, packs: d.packs }, 'Storefront retrieved');
      }
      if (path === '/config') return ok(d.config, 'Config retrieved');
      if (path === '/categories') return ok(d.categories, 'Categories retrieved');
      if (path === '/packs/featured') return ok(d.featured, 'Featured packs retrieved');

      var m = /^\/packs\/([^/?]+)$/.exec(path);
      if (m && method === 'GET') {
        var det = d.details[decodeURIComponent(m[1])];
        return det ? ok(det, 'Pack retrieved')
                   : { ok: false, status: 404, body: { message: 'Prompt pack not found' }, message: 'Prompt pack not found' };
      }

      /* Checkout is the one thing a demo cannot fake. These packs do
         not exist on the backend, so there is nothing to pay for and
         pretending otherwise would be the most misleading possible
         thing to do here. */
      if (/\/checkout$/.test(path)) {
        return {
          ok: false, status: 409,
          body: { message: 'This is a demo pack, so there is nothing to pay for. Checkout needs a real pack on the backend.' },
          message: 'This is a demo pack, so there is nothing to pay for. Checkout needs a real pack on the backend.'
        };
      }

      return null;   /* anything else falls through to the real API */
    });
  }

  /* A standing reminder that none of this is real. */
  PS.demoBanner = function () {
    if (!PS.demo || document.getElementById('ps-demo-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'ps-demo-bar';
    bar.innerHTML = 'DEMO DATA \u00b7 these three packs are samples, not the real catalogue, and cannot be bought. ' +
                    '<a href="?demo=0">Switch off</a>';
    document.body.appendChild(bar);

    /* The bar wraps to two lines on a narrow screen, so its height
       is measured rather than guessed: the sticky buy bar sits on
       top of it and a guess puts one over the other. */
    var measure = function () {
      document.documentElement.style.setProperty('--ps-demo-h', bar.offsetHeight + 'px');
    };
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(bar);
    else window.addEventListener('resize', measure);
  };

  PS.call = function (path, opts) {
    opts = opts || {};
    if (PS.demo) {
      return demoAnswer(path, opts).then(function (answer) {
        return answer || realCall(path, opts);
      });
    }
    return realCall(path, opts);
  };

  function realCall(path, opts) {
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
  }

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

     The API prices every pack in both currencies: `price.ngn` and
     `price.usd`, each a {currency, current, list, founding}. These
     are real prices, not a converted estimate, and the currency the
     buyer sees is the currency they are charged in.

     That matters because the currency also picks the gateway, which
     is the same rule currency.js already applies to the rest of the
     site: NGN goes to Paystack, USD goes to Stripe. So the figure on
     the card is the figure on the checkout page, and there is no
     "charged as" footnote to write.

     NGN is the fallback whenever a pack has no USD price, because
     being shown naira is recoverable and being shown nothing is
     not. */

  PS.money = function (m) {
    if (!m) return '';
    var n = Number(m.current || 0);
    return m.currency === 'USD'
      ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '\u20a6' + n.toLocaleString('en-US');
  };

  PS.moneyOf = function (m, value) {
    if (!m) return '';
    return m.currency === 'USD'
      ? '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '\u20a6' + Number(value).toLocaleString('en-US');
  };

  PS.isUSD = function () {
    return String(window.bxActiveCurrency || 'ngn').toLowerCase() === 'usd';
  };

  /* The store's own settings, shared by every page that loads them.
     Kept here so the currency gate below has one source. */
  PS.config = null;
  PS.applyConfig = function (c) {
    PS.config = c || null;
    if (c && c.support_email) PS.SUPPORT = c.support_email;
    PS.refreshPrices();
  };

  /* Dollars are only offered when the store says it can take them.
     A price object may carry a USD figure the backend would refuse
     at checkout, and showing a price nobody can pay is worse than
     showing naira to someone abroad. */
  PS.usdAllowed = function () {
    var cc = PS.config && PS.config.checkout_currencies;
    return !cc || cc.indexOf('USD') > -1;
  };

  /* Which of the two the visitor should see. USD only when
     currency.js says so, the store accepts it, and the pack
     actually carries a USD price. */
  PS.side = function (price) {
    if (!price) return null;
    return (PS.isUSD() && PS.usdAllowed() && price.usd)
      ? price.usd
      : (price.ngn || price.usd || null);
  };

  /* The markup carries both sides, so a currency decision that
     lands after paint — the geo lookup is a network call — only has
     to rewrite text rather than re-fetch anything. */
  PS.priceHTML = function (price) {
    if (!price) return '';
    return '<span class="ps-amt" data-money="' + PS.esc(JSON.stringify(price)) + '">' +
             PS.amtText(price) +
           '</span>';
  };

  PS.amtText = function (price) {
    var m = PS.side(price);
    if (!m) return '';

    var out = PS.esc(PS.money(m));

    /* The previous price is struck through only when the founding
       price is actually applied, and it is shown in the same
       currency as the headline — a dollar figure beside a struck
       naira one reads as a comparison that cannot be made. */
    if (price.founding_applied && m.list != null && Number(m.list) > Number(m.current)) {
      out += '<s>' + PS.esc(PS.moneyOf(m, m.list)) + '</s>';
    }
    return out;
  };

  /* The currency a checkout should be started in, which is also what
     decides the gateway on the backend. */
  PS.checkoutCurrency = function (price) {
    var m = PS.side(price);
    return (m && m.currency) || 'NGN';
  };

  /* Re-render every price in place when currency.js reports in. */
  PS.refreshPrices = function (root) {
    var nodes = (root || document).querySelectorAll('.ps-amt');
    for (var i = 0; i < nodes.length; i++) {
      try {
        var price = JSON.parse(nodes[i].getAttribute('data-money'));
        nodes[i].innerHTML = PS.amtText(price);
        /* the sort key follows the displayed currency, so that
           "price: low to high" still sorts what the eye can see */
        var card = nodes[i].closest ? nodes[i].closest('.ps-card') : null;
        if (card) card.dataset.price = Number((PS.side(price) || {}).current || 0);
      } catch (e) {}
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

    return '<a class="ps-card" href="/prompt-store/pack?pack=' + encodeURIComponent(p.slug) + '"' +
             ' data-cat="' + PS.esc(cat.slug || '') + '"' +
             ' data-price="' + Number(((PS.side(p.price) || {}).current) || 0) + '"' +
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
