/* ============================================================
   price-display.js  —  one place that decides how a price reads.

   The pricing endpoint gives every breakdown a base_price and a
   final_price. When an admin raises base_price above final_price the
   difference is a discount, and the card should say so: the base
   struck through in red, the final price beside it as the real one.
   When the two match — which is how every programme ships until
   someone sets a discount — there is nothing to compare, so the card
   shows a single price exactly as it always has.

   Everything that renders a price loads this, so the rule lives once
   instead of in eighteen inline scripts that would drift apart.
   ============================================================ */
(function (w) {
  'use strict';

  var SYMS = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', CAD: 'C$' };

  function money(cur, n) {
    return (SYMS[cur] || '') + Math.round(Number(n)).toLocaleString('en-US');
  }

  /* Reads one breakdown and says whether it is discounted.

     base_price is trusted only when it is a real number ABOVE the
     final price. A missing base, a zero, or a base below final is not
     a discount — it is bad data, and showing "was ₦0" or a struck
     price lower than the one you pay would cost more trust than the
     marketing could win back. */
  function read(breakdown) {
    if (!breakdown) return null;
    var final = Number(breakdown.final_price != null ? breakdown.final_price : breakdown.finalPrice);
    if (!isFinite(final) || final <= 0) return null;

    var base = Number(breakdown.base_price != null ? breakdown.base_price : breakdown.basePrice);
    var off  = (isFinite(base) && base > final) ? base : null;

    return {
      final: final,
      base: off,
      discounted: off != null,
      percent: off != null ? Math.round((1 - final / off) * 100) : 0
    };
  }

  /* The inner markup for one currency. Callers keep their own
     <span class="currency-ngn"> wrapper, because currency.js shows and
     hides by that class and this must not interfere with it. */
  function inner(cur, info, empty) {
    /* `empty` lets a caller choose what a currency with no breakdown
       looks like. professionals.html has always left it blank; the rest
       show an em-dash. */
    if (!info) return empty == null ? '—' : empty;
    if (!info.discounted) return money(cur, info.final);
    return '<s class="bx-was">' + money(cur, info.base) + '</s>' +
           '<span class="bx-now">' + money(cur, info.final) + '</span>';
  }

  /* Picks the breakdown for a currency out of a plan's list. */
  function forCurrency(breakdowns, cur) {
    var want = String(cur).toUpperCase();
    var hit = (breakdowns || []).filter(function (b) {
      return String(b.currency || '').toUpperCase() === want;
    })[0];
    return read(hit);
  }

  /* Convenience for the pages that build a row of per-currency spans.
     Returns the whole row, wrappers included. */
  function spans(breakdowns, currencies, empty) {
    return (currencies || ['ngn', 'usd', 'gbp', 'eur', 'cad']).map(function (c) {
      var cur = c.toUpperCase();
      return '<span class="currency-' + c + '">' + inner(cur, forCurrency(breakdowns, cur), empty) + '</span>';
    }).join('');
  }

  w.BXPrice = {
    money: money,
    read: read,
    forCurrency: forCurrency,
    inner: inner,
    spans: spans
  };
})(window);
