/* ============================================================
   TIER CARD UNDERLAY NAVIGATION

   The Osmo fixed-underlay idea scoped to a card: a list of courses
   sits underneath each tier card the whole time, and on hover the
   card face slides aside and scales back to reveal it, like a lid
   coming off. Transform and opacity only, so nothing reflows.

   This is deliberately a progressive enhancement. index.html still
   contains the plain <a class="lp-tier"> cards; this file
   restructures them at runtime into container + underlay + face.
   To remove the whole experiment, drop the <script> tag and the
   TIER UNDERLAY block in the stylesheet. The markup underneath is
   untouched and the cards go back to being ordinary links.

   Accessibility and touch:
     - the face keeps its own href, so a click anywhere on the card
       still goes to the tier page. The underlay is a shortcut, not
       the only route in.
     - :focus-within opens the same state, so tabbing into the card
       reveals the links rather than focusing something invisible.
     - below the breakpoint there is no hover to perform, so the
       underlay renders as a plain list under the face instead.
   ============================================================ */
(function () {
  'use strict';

  var API = (location.hostname === 'brixgate.com' || location.hostname === 'www.brixgate.com')
    ? 'https://api.brixgate.com'
    : 'https://dev.api.brixgate.com';

  /* Short names on purpose. With the face slid across, the list gets
     roughly half the card, and "AI in Software Engineering" wraps. */
  var PAGE_RULES = [
    { any: ['software-engineering', 'engineering'], page: 'programme-engineering.html',   short: 'Software Engineering' },
    { any: ['cyber'],                               page: 'programme-cybersecurity.html', short: 'Cyber Security' },
    { any: ['financial', 'finance'],                page: 'programme-finance.html',       short: 'Financial Modelling' },
    { any: ['marketing', 'product-technology'],     page: 'programme-marketing.html',     short: 'Product Marketing' },
    { any: ['automation'],                          page: null,                           short: 'AI Automation' },
    { any: ['data science'],                        page: null,                           short: 'Data Science' },
    { any: ['analytic'],                            page: null,                           short: 'Data Analytics' }
  ];

  var TIERS = {
    'lp-tier-f': {
      href: 'foundations.html',
      kicker: 'Courses',
      all: 'Explore all programmes',
      levels: ['BEGINNER'],
      fallback: [
        { short: 'AI Automation',  page: 'foundations-ai-automation.html' },
        { short: 'Data Analytics', page: null },
        { short: 'Data Science',   page: 'foundations-data-science.html' }
      ]
    },
    'lp-tier-p': {
      href: 'professionals.html',
      kicker: 'Courses',
      all: 'Explore all programmes',
      levels: ['INTERMEDIATE', 'ADVANCED'],
      fallback: [
        { short: 'Software Engineering', page: 'programme-engineering.html' },
        { short: 'Cyber Security',       page: 'programme-cybersecurity.html' },
        { short: 'Financial Modelling',  page: 'programme-finance.html' }
      ]
    }
  };

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function rule(p) {
    var hay = ((p.slug || '') + ' ' + (p.title || '')).toLowerCase().replace(/[-_]+/g, ' ');
    for (var i = 0; i < PAGE_RULES.length; i++) {
      for (var j = 0; j < PAGE_RULES[i].any.length; j++) {
        if (hay.indexOf(PAGE_RULES[i].any[j].replace(/-/g, ' ')) !== -1) return PAGE_RULES[i];
      }
    }
    return null;
  }

  /* The Foundations register, when the page has loaded it, is the
     better source: it knows which course pages actually exist. */
  function foundationsFromRegister() {
    if (!window.FND || !window.FND.COURSES) return null;
    return window.FND.COURSES.slice(0, 3).map(function (c) {
      return { short: c.title, page: c.ready ? c.page : null };
    });
  }

  function listHTML(tier, items) {
    var rows = items.slice(0, 3).map(function (it, i) {
      var href = it.page || tier.href;
      return '<a class="lp-tier-link" href="' + href + '" style="--i:' + i + '">' +
               '<span>' + esc(it.short) + '</span>' +
               (it.page ? '' : '<em>soon</em>') +
             '</a>';
    }).join('');
    return '<div class="lp-tier-under-k">' + esc(tier.kicker) + '</div>' +
           rows +
           '<a class="lp-tier-link is-all" href="' + tier.href + '" style="--i:3">' +
             '<span>' + esc(tier.all) + '</span>' + ARROW +
           '</a>';
  }

  function enhance(card) {
    var key = card.classList.contains('lp-tier-f') ? 'lp-tier-f' : 'lp-tier-p';
    var tier = TIERS[key];
    if (!tier) return null;

    /* container takes the card's classes; the original anchor becomes
       the face, so its href and all its content survive untouched */
    var wrap = document.createElement('div');
    wrap.className = card.className;
    wrap.setAttribute('data-tier-card', key);
    card.parentNode.insertBefore(wrap, card);

    var under = document.createElement('div');
    under.className = 'lp-tier-under';
    under.innerHTML = listHTML(tier, tier.fallback);

    card.classList.remove('fade-up');
    card.className = card.className.replace(/\blp-tier\b[^ ]*/g, '').trim();
    card.className = ('lp-tier-face ' + card.className).trim();

    wrap.appendChild(under);
    wrap.appendChild(card);
    return { wrap: wrap, under: under, tier: tier, key: key };
  }

  function init() {
    var cards = [].slice.call(document.querySelectorAll('a.lp-tier'));
    if (!cards.length) return;

    var built = cards.map(enhance).filter(Boolean);
    if (!built.length) return;

    /* Foundations can answer from the register immediately */
    built.forEach(function (b) {
      if (b.key !== 'lp-tier-f') return;
      var reg = foundationsFromRegister();
      if (reg) b.under.innerHTML = listHTML(b.tier, reg);
    });

    /* then refresh whichever lists the API can improve */
    fetch(API + '/api/v1/programs')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        var all = (json && json.data && json.data.programs) || [];
        if (!all.length) return;
        built.forEach(function (b) {
          if (b.key === 'lp-tier-f' && foundationsFromRegister()) return;  /* register wins */
          var live = all.filter(function (p) {
            return String(p.status || '').toUpperCase() === 'PUBLISHED' &&
                   b.tier.levels.indexOf(p.level) !== -1;
          });
          if (!live.length) return;
          b.under.innerHTML = listHTML(b.tier, live.map(function (p) {
            var r = rule(p);
            return { short: (r && r.short) || p.title, page: r && r.page };
          }));
        });
      })
      .catch(function () { /* the fallback lists are already rendered */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
