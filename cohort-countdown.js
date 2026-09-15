/* ============================================================
   NEXT COHORT COUNTDOWN

   A cohort starts at the beginning of each month, so this counts to
   the 1st of the next month rather than to the last day of this one.

   That is a deliberate one-day difference from "days left in the
   month". The line reads "Next cohort starts in N days", and on the
   15th of September the 1st of October is 16 days away while the end
   of September is 15. Counting to month end would make the sentence
   wrong by one, every month, forever. Same restart behaviour, same
   maintenance, accurate copy.

   Pinned to Africa/Lagos. Left to the browser's own clock, someone in
   California late on the 30th would see a different number from
   someone in Lagos, and on the last day of the month the month name
   would flip early.

   No API call. The banner never waits on a request and there is
   nothing to fail.
   ============================================================ */
(function () {
  'use strict';

  var TZ = 'Africa/Lagos';

  /* today, as Lagos sees it */
  function lagosToday() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date()).split('-');
      return { y: +parts[0], m: +parts[1], d: +parts[2] };
    } catch (e) {
      /* Intl without tz support: the browser's own date is close enough
         to be off by at most a day, which beats rendering nothing. */
      var n = new Date();
      return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
    }
  }

  function daysToNextFirst(t) {
    var thisFirst = Date.UTC(t.y, t.m - 1, 1);
    var nextFirst = Date.UTC(t.m === 12 ? t.y + 1 : t.y, t.m === 12 ? 0 : t.m, 1);
    var todayUTC  = Date.UTC(t.y, t.m - 1, t.d);
    return {
      days: Math.round((nextFirst - todayUTC) / 86400000),
      month: new Date(nextFirst).toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' }),
      isFirst: todayUTC === thisFirst
    };
  }

  function phrase() {
    var t = lagosToday();
    var n = daysToNextFirst(t);

    /* On the 1st the cohort is starting, so counting to the next one is
       both wrong and a wasted moment. */
    if (n.isFirst) return 'The new cohort starts today';
    if (n.days === 1) return 'Next cohort starts tomorrow';
    return 'Next cohort starts in ' + n.days + ' days';
  }

  function render() {
    var slots = document.querySelectorAll('[data-cohort-countdown]');
    if (!slots.length) return;
    var text = phrase();
    for (var i = 0; i < slots.length; i++) {
      slots[i].textContent = text;
      slots[i].hidden = false;
    }
  }

  /* Recompute just after Lagos midnight so a page left open overnight
     does not sit on yesterday's number. */
  function scheduleMidnight() {
    var t = lagosToday();
    var nowUTC = Date.now();
    var nextLagosMidnight = Date.UTC(t.y, t.m - 1, t.d + 1) - (60 * 60 * 1000); /* Lagos is UTC+1 */
    var wait = nextLagosMidnight - nowUTC;
    if (wait < 0) wait += 86400000;
    setTimeout(function () { render(); scheduleMidnight(); }, wait + 2000);
  }

  function boot() { render(); scheduleMidnight(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
