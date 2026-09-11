/* ============================================================
   AI FOUNDATIONS — course page behaviour

   Shared by every Foundations course page. The page declares which
   course it is with a single attribute on <body>:

     <body class="fc" data-course="ai-automation">

   and this file handles the rest: cohorts from the API, the waitlist,
   the FAQ, the reveals and the button stagger. Anything course
   specific lives in foundations-courses.js, so a page never repeats
   a duration or a title that could drift.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slug = document.body.getAttribute('data-course');
  var COURSE = window.FND && window.FND.COURSES.filter(function (c) { return c.slug === slug; })[0];

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- reveals ---------- */
  (function () {
    var rise = [].slice.call(document.querySelectorAll('.fc-rise'));
    if (!rise.length) return;
    function showAll() { rise.forEach(function (el) { el.classList.add('in'); }); }
    if (!('IntersectionObserver' in window) || reduce) { showAll(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var host = e.target;
        var sibs = [].slice.call(host.parentNode.children).filter(function (n) {
          return n.classList && n.classList.contains('fc-rise');
        });
        host.style.transitionDelay = (Math.max(0, sibs.indexOf(host)) * 0.08) + 's';
        host.classList.add('in');
        io.unobserve(host);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rise.forEach(function (el) { io.observe(el); });
    /* nothing is ever left invisible, whatever the observer does */
    setTimeout(showAll, 3000);
  })();

  /* ---------- per-character button stagger ---------- */
  [].slice.call(document.querySelectorAll('[data-chars]')).forEach(function (el) {
    var text = el.textContent, step = 0.014;
    function layer(cls) {
      return '<span class="' + cls + '">' + [].map.call(text, function (ch, i) {
        return '<span style="--d:' + (i * step).toFixed(3) + 's">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
      }).join('') + '</span>';
    }
    el.classList.add('fc-chars');
    el.setAttribute('aria-label', text);
    el.innerHTML = layer('fc-chars-a') + layer('fc-chars-b');
  });

  /* ---------- FAQ ---------- */
  (function () {
    var list = document.getElementById('fc-faq');
    if (!list) return;
    var items = [].slice.call(list.querySelectorAll('.fc-faq-item'));
    items.forEach(function (item) {
      var btn = item.querySelector('.fc-faq-q'), panel = item.querySelector('.fc-faq-a');
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        items.forEach(function (o) {
          if (o === item) return;
          o.classList.remove('open');
          var ob = o.querySelector('.fc-faq-q'), op = o.querySelector('.fc-faq-a');
          if (ob) ob.setAttribute('aria-expanded', 'false');
          if (op) op.setAttribute('aria-hidden', 'true');
        });
        item.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
        panel.setAttribute('aria-hidden', String(isOpen));
      });
    });
    if (items[0]) {
      items[0].classList.add('open');
      items[0].querySelector('.fc-faq-q').setAttribute('aria-expanded', 'true');
      items[0].querySelector('.fc-faq-a').setAttribute('aria-hidden', 'false');
    }
  })();

  /* ---------- sibling courses ---------- */
  (function () {
    var host = document.getElementById('fc-more');
    if (!host || !window.FND) return;
    host.innerHTML = FND.COURSES
      .filter(function (c) { return c.slug !== slug; })
      .slice(0, 3)
      .map(function (c) {
        return '<a class="fc-more-c" href="' + c.page + '">' +
                 '<div class="fc-more-art"><img src="' + c.art + '" alt="" loading="lazy" /></div>' +
                 '<div class="fc-more-b"><b>' + esc(c.title) + '</b><span>' + c.weeks + ' weeks · ' + esc(c.tagline) + '</span></div>' +
               '</a>';
      }).join('');
  })();

  if (!COURSE) return;

  /* ---------- cohorts ----------
     Two steps, because cohorts hang off a programme id rather than a
     name: match the course against /programs, then fetch its cohorts.
     Three honest states: real dates, a record with no dates yet, or
     no backend record at all. */
  (function () {
    var host = document.getElementById('fc-cohorts');
    if (!host) return;

    var CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';
    var CLK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>';
    var CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14"/></svg>';

    FND.fetchCohorts(COURSE).then(function (res) {
      var live = res.cohorts.filter(function (c) {
        return String(c.status || '').toUpperCase() !== 'COMPLETED';
      }).sort(function (a, b) { return new Date(a.start_date || 0) - new Date(b.start_date || 0); });

      if (!live.length) {
        host.innerHTML =
          '<div class="fc-cohort-empty">' +
            '<b>' + (res.programme ? 'Dates for the next cohort are being scheduled.' : 'This course opens with the next intake.') + '</b> ' +
            'Join the waitlist below and you will get the start date, the timetable and the pricing before any of it goes public.' +
          '</div>';
        return;
      }

      host.innerHTML = live.map(function (c) {
        var start = FND.fmtDate(c.start_date), end = FND.fmtDate(c.end_date);
        var meta = [];
        if (start) meta.push('<span>' + CAL + (end ? start + ' to ' + end : 'Starts ' + start) + '</span>');
        if (c.frequency) meta.push('<span>' + CLK + esc(String(c.frequency).toLowerCase().replace(/^./, function (m) { return m.toUpperCase(); })) + '</span>');
        if (c.learning_format) meta.push('<span>' + CAM + esc(String(c.learning_format).toUpperCase() === 'LIVE' ? 'Live online' : c.learning_format) + '</span>');

        var seats = '';
        if (c.max_students) {
          var left = c.max_students - (c.enrolled_students_count || 0);
          seats = '<div class="fc-cohort-seats">' +
            (left > 0 ? left + ' of ' + c.max_students + ' seats still open' : 'This cohort is full') +
            (c.admission_period ? ' · Applications ' + esc(c.admission_period) : '') + '</div>';
        }

        return '<div class="fc-cohort">' +
                 '<div>' +
                   '<div class="fc-cohort-k"><i></i>' + esc(String(c.status || 'Upcoming').toLowerCase()) + '</div>' +
                   '<h3>' + esc(c.title || COURSE.title) + '</h3>' +
                   '<div class="fc-cohort-meta">' + meta.join('') + '</div>' +
                   seats +
                 '</div>' +
                 '<a class="fc-btn fc-btn-accent" href="#waitlist"><span data-chars-late>Join the waitlist</span></a>' +
               '</div>';
      }).join('');

      /* buttons drawn after the stagger pass ran need their own */
      [].slice.call(host.querySelectorAll('[data-chars-late]')).forEach(function (el) {
        var text = el.textContent, step = 0.014;
        function layer(cls) {
          return '<span class="' + cls + '">' + [].map.call(text, function (ch, i) {
            return '<span style="--d:' + (i * step).toFixed(3) + 's">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
          }).join('') + '</span>';
        }
        el.classList.add('fc-chars');
        el.setAttribute('aria-label', text);
        el.innerHTML = layer('fc-chars-a') + layer('fc-chars-b');
      });
    });
  })();

  /* ---------- waitlist ----------
     Same contract as the Foundations hub: level and programme are sent
     under names that live in one place, and the tier is also prefixed
     onto primary_field so it survives whatever the backend settles on. */
  (function () {
    var form = document.getElementById('fc-waitlist-form');
    if (!form) return;

    var WL_FIELDS = { tier: 'level', programme: 'programme', tierValue: 'BEGINNER' };
    var errEl = document.getElementById('fc-wl-err');
    var okEl  = document.getElementById('fc-wl-ok');
    var btn   = document.getElementById('fc-wl-btn');

    function setLabel(t) {
      var a = btn.querySelector('.fc-chars-a');
      if (a) a.textContent = t; else btn.textContent = t;
    }
    function fail(msg) {
      errEl.textContent = msg; errEl.style.display = 'block';
      setLabel('Join the waitlist'); btn.disabled = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errEl.style.display = 'none';

      var name  = document.getElementById('fc-name').value.trim();
      var email = document.getElementById('fc-email').value.trim();
      var phone = document.getElementById('fc-phone').value.trim();

      if (!name || !email) { fail('Please fill in your name and email.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail('That email address does not look right.'); return; }

      setLabel('Joining…');
      btn.disabled = true;

      var payload = {
        name: name, email: email, phone: phone,
        primary_field: 'AI Foundations: ' + COURSE.title
      };
      payload[WL_FIELDS.tier] = WL_FIELDS.tierValue;
      payload[WL_FIELDS.programme] = COURSE.title;

      fetch(FND.api + '/api/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        if (data.success) { form.style.display = 'none'; okEl.style.display = 'block'; }
        else {
          var msg = (data.errors && Object.values(data.errors)[0]) || data.message || 'Something went wrong. Please try again.';
          fail(Array.isArray(msg) ? msg[0] : msg);
        }
      })
      .catch(function () { fail('We could not reach the server. Please check your connection and try again.'); });
    });
  })();
})();
