/* ============================================================
   CURRENCY BY LOCATION

   Outside Nigeria the site prices in USD, inside it prices in NGN.
   The currency then decides the gateway: NGN goes to Paystack, USD to
   Stripe. There is no toggle; the COO asked for one price, decided for
   the visitor.

   Because this touches money, three rules shape the whole file:

   1. NGN is the fallback, always. Any failure at all - request blocked
      by an ad blocker, network down, malformed reply, no Intl support -
      lands on Naira. Nigeria is the largest market and it must never
      depend on a third-party request succeeding.

   2. The gateway is never derived from the country. It is derived from
      the currency that is actually active at the moment of payment, so
      the two cannot disagree. See bxGateway() at the bottom.

   3. One lookup per visit. The answer is cached in sessionStorage, so
      moving between pages costs nothing and a visitor cannot flip
      currency halfway through an application by navigating.

   The detection service is api.country.is: no key, no rate limit at our
   volume, and it returns only an IP and a country code. If it is ever
   replaced by the backend reading the request IP directly, only
   detect() below needs to change.
   ============================================================ */
(function () {
  'use strict';

  var CACHE_KEY = 'bxGeoCurrency';
  var HOME      = 'NG';
  var TIMEOUT   = 3500;

  var W = window;

  /* ---------- applying a currency ---------- */

  /* styles.css shows and hides .currency-ngn / .currency-usd from a class
     on <body>, and the rest of the site reads window.bxActiveCurrency.
     Both are set here so a page is consistent no matter which one it
     happens to consult. */
  function apply(cur) {
    cur = (cur === 'usd' || cur === 'USD') ? 'usd' : 'ngn';

    var body = document.body;
    if (body) body.classList.toggle('show-usd', cur === 'usd');

    W.bxActiveCurrency = cur;

    /* script.js's initCurrencyToggle restores this on load. Writing it
       keeps that function in agreement rather than fighting it. */
    try { localStorage.setItem('bxCurrencyV2', cur); } catch (e) {}

    document.dispatchEvent(new CustomEvent('bx:currency', { detail: { currency: cur } }));
  }

  /* ---------- detection ---------- */

  function cached() {
    try {
      var v = sessionStorage.getItem(CACHE_KEY);
      return (v === 'ngn' || v === 'usd') ? v : null;
    } catch (e) { return null; }
  }

  function remember(cur) {
    try { sessionStorage.setItem(CACHE_KEY, cur); } catch (e) {}
  }

  function detect() {
    /* AbortController keeps a hanging request from leaving the page on
       the fallback for its whole life. */
    var ctrl = null, timer = null;
    try { ctrl = new AbortController(); } catch (e) {}
    if (ctrl) timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT);

    return fetch('https://api.country.is/', ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (timer) clearTimeout(timer);
        var code = j && typeof j.country === 'string' ? j.country.toUpperCase() : '';
        /* An unrecognised or empty code is treated as home, not as
           abroad: guessing USD for someone we cannot place is the more
           expensive mistake. */
        if (!code) return 'ngn';
        return code === HOME ? 'ngn' : 'usd';
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        return 'ngn';
      });
  }

  /* ---------- boot ---------- */

  function start() {
    var hit = cached();
    if (hit) { apply(hit); return; }

    /* Show Naira while the lookup is in flight rather than an empty
       price. If the answer is USD the swap happens once, early. */
    apply('ngn');

    detect().then(function (cur) {
      remember(cur);
      apply(cur);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  /* ---------- the one thing payments call ----------
     Reads the currency that is actually active, not the detected
     country, so however the currency was arrived at the gateway
     follows it. Anything that is not USD pays in Naira through
     Paystack, which is the safe direction for an unexpected value. */
  W.bxGateway = function () {
    var cur = String(W.bxActiveCurrency || 'ngn').toLowerCase();
    return cur === 'usd' ? 'STRIPE' : 'PAYSTACK';
  };

  W.bxCurrency = function () {
    return String(W.bxActiveCurrency || 'ngn').toLowerCase();
  };
})();
