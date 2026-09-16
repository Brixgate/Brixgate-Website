/* ============================================================
   PROGRAMMES MEGA MENU

   One shared component instead of a dropdown copied into every
   page. Every page carries a single placeholder:

     <div class="nav-mega" data-nav-mega></div>

   and this file builds the panel into it. Courses come from the
   API grouped by level, so adding a programme on the backend puts
   it in the nav everywhere without anyone touching HTML.

   Hovering a tier on the left swaps the course list on the right,
   which is the behaviour asked for. The tier links themselves
   still navigate, so the menu is usable by keyboard and on touch
   where hover does not exist.

   If the API is slow or unreachable the panel still renders from
   FALLBACK below, so the nav is never empty.
   ============================================================ */
(function () {
  'use strict';

  var API = (location.hostname === 'brixgate.com' || location.hostname === 'www.brixgate.com')
    ? 'https://api.brixgate.com'
    : 'https://dev.api.brixgate.com';

  /* One glance should say which tier is which, so each carries an icon:
     a sprout for starting from nothing, a badge for people already
     qualified in their field. */
  var ICON = {
    foundations: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-8"/><path d="M12 13c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6z"/><path d="M12 13c0-3.9 3.1-7 7-7 0 3.9-3.1 7-7 7z"/></svg>',
    professionals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><path d="M8.5 13.2L7 22l5-2.8L17 22l-1.5-8.8"/></svg>'
  };

  var TIERS = [
    {
      key: 'foundations',
      levels: ['BEGINNER'],
      /* The tier is called AI Foundations on its own pages. Here it is
         doing the job of a call to action, so it says what the reader
         gets rather than what we named it. */
      name: 'Start your tech career',
      desc: 'Start from zero. Six to sixteen weeks, nothing assumed.',
      href: 'foundations.html',
      kicker: 'Live courses for people starting out',
      all: 'See all Foundations courses',
      empty: 'The first Foundations courses are being scheduled. Join the waitlist to hear first.'
    },
    {
      key: 'professionals',
      levels: ['INTERMEDIATE', 'ADVANCED'],
      name: 'AI for Professionals',
      desc: 'Already in the field. Four-week practitioner sprints.',
      href: 'professionals.html',
      kicker: 'Live courses taught by working practitioners',
      all: 'See all professional programmes',
      empty: 'Cohort dates are being scheduled. Join the waitlist to hear first.'
    }
  ];

  /* Page per programme. A programme with no page here still shows in
     the menu, but points at its tier hub rather than a dead URL.

     Matched on a keyword rather than the exact slug, because the two
     environments do not agree: Product Marketing is
     ai-in-product-marketing on prod and ai-in-product-technology on
     dev. Keying off "marketing" or "product" survives that. */
  var PAGE_RULES = [
    /* Tier-scoped, because the two tiers collide. "Cyber Security" exists
       in both, and a beginner clicking it from the Foundations column must
       not land on the four-week professional sprint. A rule with no tier
       matches either. */
    { tier: 'professionals', any: ['software-engineering', 'engineering'], page: 'programme-engineering.html' },
    { tier: 'professionals', any: ['cyber'],                               page: 'programme-cybersecurity.html' },
    { tier: 'professionals', any: ['financial', 'finance'],                page: 'programme-finance.html' },
    { tier: 'professionals', any: ['marketing', 'product-technology'],     page: 'programme-marketing.html' },

    { tier: 'foundations',   any: ['automation'],        page: 'foundations-ai-automation.html' },
    { tier: 'foundations',   any: ['data-analytic', 'analytic'], page: 'foundations-data-analytics.html' },
    { tier: 'foundations',   any: ['data-science'],      page: 'foundations-data-science.html' },
    { tier: 'foundations',   any: ['cyber', 'security'], page: 'foundations-cyber-security.html' },
    /* BAPM matches either half: the backend may name the programme after
       one discipline or the other, and both belong to the merged page. */
    { tier: 'foundations',   any: ['bapm', 'business-analysis', 'business analysis'], page: 'foundations-bapm.html' },
    { tier: 'foundations',   any: ['product-management', 'product management'],       page: 'foundations-product-management.html' },
    /* Project management now resolves to BAPM, so an old backend record
       does not dead-end. Listed after product management so
       "product management" is never caught by it. */
    { tier: 'foundations',   any: ['project-management', 'project management'],       page: 'foundations-bapm.html' }
  ];

  /* The Foundations register is the better source when the page has it:
     it is the same list the course pages are generated from, so it cannot
     disagree with what actually exists on disk. */
  function fromRegister(p) {
    if (!window.FND || !window.FND.COURSES) return null;
    var hay = ((p.slug || '') + ' ' + (p.title || '')).toLowerCase();
    for (var i = 0; i < window.FND.COURSES.length; i++) {
      var c = window.FND.COURSES[i];
      var keys = c.match || [c.slug];
      for (var j = 0; j < keys.length; j++) {
        if (hay.indexOf(String(keys[j]).toLowerCase()) !== -1) {
          return c.ready ? c.page : null;
        }
      }
    }
    return null;
  }

  function pageFor(p, tierKey) {
    if (tierKey === 'foundations') {
      var reg = fromRegister(p);
      if (reg) return reg;
    }
    var hay = ((p.slug || '') + ' ' + (p.title || '')).toLowerCase().replace(/[\s_]+/g, '-');
    for (var i = 0; i < PAGE_RULES.length; i++) {
      var r = PAGE_RULES[i];
      if (r.tier && tierKey && r.tier !== tierKey) continue;
      for (var j = 0; j < r.any.length; j++) {
        if (hay.indexOf(r.any[j]) !== -1) return r.page;
      }
    }
    return null;
  }

  /* Short lines for the menu. API subtitles run to whole paragraphs,
     which is unreadable at this size; anything not listed falls back
     to the first clause of the subtitle. */
  var BLURB_RULES = [
    { any: ['software-engineering', 'engineering'], text: 'Ship with AI in the loop, and review what it writes' },
    { any: ['cyber'],                               text: 'Triage and response with the judgement to match' },
    { any: ['financial', 'finance'],                text: 'Faster models that still survive an audit' },
    { any: ['marketing', 'product-technology'],     text: 'Move faster without flattening the brand' },
    { any: ['automation'],                          text: 'Build the automations that do the repetitive work' },
    { any: ['data', 'analytics'],                   text: 'Turn messy data into answers people act on' }
  ];

  /* Foundations is seeded from the register rather than hardcoded here.
     The register is what the course pages are generated from, so the menu
     cannot advertise a course whose page does not exist, and a new course
     appears in the nav the moment its page is marked ready. The API
     overrides this when it returns BEGINNER programmes of its own. */
  function foundationsSeed() {
    if (!window.FND || !window.FND.COURSES) return [];
    return window.FND.COURSES.filter(function (c) { return c.ready; })
      .map(function (c) { return { title: c.title, slug: c.slug, subtitle: c.blurb || '' }; });
  }

  var FALLBACK = {
    foundations: [],
    professionals: [
      { title: 'AI in Software Engineering', slug: 'ai-in-software-engineering' },
      { title: 'AI in Cyber Security',       slug: 'ai-in-cyber-security' },
      { title: 'AI in Financial Modelling',  slug: 'ai-in-financial-modelling' }
    ]
  };

  var CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  var ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function blurb(p) {
    var hay = ((p.slug || '') + ' ' + (p.title || '')).toLowerCase().replace(/[\s_]+/g, '-');
    for (var i = 0; i < BLURB_RULES.length; i++) {
      for (var j = 0; j < BLURB_RULES[i].any.length; j++) {
        if (hay.indexOf(BLURB_RULES[i].any[j]) !== -1) return BLURB_RULES[i].text;
      }
    }
    var s = (p.subtitle || '').trim();
    if (!s) return '';
    /* first sentence, and only if it is short enough to sit on one line */
    var first = s.split(/(?<=\.)\s/)[0] || s;
    if (first.length > 74) first = first.slice(0, 71).replace(/\s+\S*$/, '') + '…';
    return first;
  }

  function courseHTML(p, tier) {
    var page = pageFor(p, tier.key);
    var href = page || tier.href;
    var b = blurb(p);
    var soon = page ? '' : '<span class="nav-mega-soon">Page coming</span>';
    return '<a class="nav-mega-course" href="' + href + '">' +
             '<span class="nav-mega-course-t">' + esc(p.title) + soon + '</span>' +
             (b ? '<span class="nav-mega-course-d">' + esc(b) + '</span>' : '') +
           '</a>';
  }

  function listHTML(tier, items) {
    if (!items.length) {
      return '<p class="nav-mega-empty">' + esc(tier.empty) + '</p>' +
             '<a class="nav-mega-all" href="' + tier.href + '#waitlist">Join the waitlist ' + ARROW + '</a>';
    }
    return '<div class="nav-mega-grid">' + items.map(function (p) { return courseHTML(p, tier); }).join('') + '</div>' +
           '<a class="nav-mega-all" href="' + tier.href + '">' + esc(tier.all) + ' ' + ARROW + '</a>';
  }

  function build(host, byTier) {
    host.innerHTML =
      '<a href="programme.html" class="nav-mega-trigger">Programmes</a>' +
      '<button class="nav-mega-chevron" type="button" aria-label="Toggle programmes menu" aria-expanded="false">' + CHEV + '</button>' +
      '<div class="nav-mega-panel">' +
        '<div class="nav-mega-inner">' +
          '<div class="nav-mega-tiers">' +
            TIERS.map(function (t, i) {
              return '<a class="nav-mega-tier' + (i === 0 ? ' is-on' : '') + '" data-tier="' + t.key + '" href="' + t.href + '">' +
                       '<span class="nav-mega-tier-ic">' + (ICON[t.key] || '') + '</span>' +
                       '<span class="nav-mega-tier-t">' + esc(t.name) + '</span>' +
                       '<span class="nav-mega-tier-d">' + esc(t.desc) + '</span>' +
                     '</a>';
            }).join('') +
          '</div>' +
          '<div class="nav-mega-courses">' +
            TIERS.map(function (t, i) {
              return '<div class="nav-mega-pane' + (i === 0 ? ' is-on' : '') + '" data-pane="' + t.key + '">' +
                       '<div class="nav-mega-kicker">' + esc(t.kicker) + '</div>' +
                       listHTML(t, byTier[t.key] || []) +
                     '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    var tiers = host.querySelectorAll('.nav-mega-tier');
    var panes = host.querySelectorAll('.nav-mega-pane');

    function show(key) {
      for (var i = 0; i < tiers.length; i++) tiers[i].classList.toggle('is-on', tiers[i].getAttribute('data-tier') === key);
      for (var j = 0; j < panes.length; j++) panes[j].classList.toggle('is-on', panes[j].getAttribute('data-pane') === key);
    }

    for (var i = 0; i < tiers.length; i++) {
      (function (el) {
        var key = el.getAttribute('data-tier');
        el.addEventListener('mouseenter', function () { show(key); });
        el.addEventListener('focus', function () { show(key); });
      })(tiers[i]);
    }

    /* Touch and keyboard: the chevron toggles, since hover does not exist */
    var chev = host.querySelector('.nav-mega-chevron');
    chev.addEventListener('click', function (e) {
      e.preventDefault();
      var open = host.classList.toggle('open');
      chev.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!host.contains(e.target)) {
        host.classList.remove('open');
        chev.setAttribute('aria-expanded', 'false');
      }
    });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { host.classList.remove('open'); chev.setAttribute('aria-expanded', 'false'); }
    });
  }

  function init() {
    var hosts = document.querySelectorAll('[data-nav-mega]');
    if (!hosts.length) return;

    function render(byTier) {
      for (var i = 0; i < hosts.length; i++) build(hosts[i], byTier);
    }

    /* draw immediately from the fallback so the nav is never empty,
       then redraw once the API answers */
    FALLBACK.foundations = foundationsSeed();
    render(FALLBACK);

    fetch(API + '/api/v1/programs')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        var list = json && json.data && json.data.programs;
        if (!list || !list.length) return;
        var live = list.filter(function (p) { return p.status === 'PUBLISHED'; });
        var byTier = {};
        TIERS.forEach(function (t) {
          byTier[t.key] = live.filter(function (p) { return t.levels.indexOf(p.level) !== -1; });
        });

        /* Foundations merges rather than replaces. The backend currently
           carries one BEGINNER programme while six course pages exist, so
           replacing would shrink the menu to one the moment the fetch
           resolved. The register leads, and anything the API knows about
           that the register does not gets appended. */
        var seed = foundationsSeed();
        if (seed.length) {
          var known = seed.map(function (c) { return (c.title + ' ' + c.slug).toLowerCase(); }).join(' | ');
          var extra = (byTier.foundations || []).filter(function (p) {
            var t = String(p.title || '').toLowerCase();
            return t && known.indexOf(t) === -1 && !fromRegister(p);
          });
          byTier.foundations = seed.concat(extra);
        }
        render(byTier);
      })
      .catch(function () { /* fallback is already on screen */ });
  }

  /* ============================================================
     --nav-height is declared 104px in styles.css but the bar renders
     63px. body padding-top is calc(banner + nav), so every page sat
     45px lower than its own nav and showed a strip of page background
     between the two. The same token drives the mobile sheet offset and
     the sticky FAQ head, so measuring it once fixes all three.

     Measured rather than hard-coded: the bar's height depends on the
     logo, the font and the viewport, and hard-coding a second wrong
     number is how the first one happened.
     ============================================================ */
  function syncNavHeight() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var h = Math.round(nav.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty('--nav-height', h + 'px');
  }

  function boot() {
    syncNavHeight();
    init();
    window.addEventListener('resize', syncNavHeight, { passive: true });
    window.addEventListener('load', syncNavHeight);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
