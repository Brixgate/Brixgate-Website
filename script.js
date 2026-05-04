/* ============================================================
   BRIXGATE — Shared JavaScript
   ============================================================ */

(function () {
  'use strict';

  /* ---------- DOM Ready ---------- */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initNav();
    initScrollProgress();
    initScrollAnimations();
    initBackToTop();
    initMobileMenu();
    initCurrencyToggle();
    initCounters();
    setActiveNavLink();
  }

  /* ---------- Banner scroll-away + Sticky Nav ---------- */
  function initNav() {
    const nav    = document.querySelector('.nav');
    const banner = document.querySelector('.region-banner');
    if (!nav) return;

    const bannerH = banner
      ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--banner-height') || '44')
      : 0;

    function updateNav() {
      const y = window.scrollY;

      // Banner: hide once scrolled past it
      if (banner) {
        if (y > bannerH) {
          banner.classList.add('hidden');
          nav.classList.add('banner-hidden');
        } else {
          banner.classList.remove('hidden');
          nav.classList.remove('banner-hidden');
        }
      }

      // Nav background
      if (y > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  /* ---------- Scroll Progress Bar ---------- */
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  /* ---------- Intersection Observer Animations ---------- */
  function initScrollAnimations() {
    const targets = document.querySelectorAll('.fade-up, .fade-in, .slide-left, .slide-right');
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => observer.observe(el));
  }

  /* ---------- Back to Top ---------- */
  function initBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Mobile Menu ---------- */
  function initMobileMenu() {
    const hamburger = document.querySelector('.nav-hamburger');
    const mobileNav = document.querySelector('.nav-mobile');
    if (!hamburger || !mobileNav) return;

    let open = false;

    hamburger.addEventListener('click', () => {
      open = !open;
      mobileNav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';

      // Animate hamburger lines
      const lines = hamburger.querySelectorAll('span');
      if (open) {
        lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        lines.forEach(l => {
          l.style.transform = '';
          l.style.opacity = '';
        });
      }
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        open = false;
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
        const lines = hamburger.querySelectorAll('span');
        lines.forEach(l => { l.style.transform = ''; l.style.opacity = ''; });
      });
    });
  }

  /* ---------- Currency Toggle — location-aware multi-currency ----------
   *
   *  Logic:
   *   1. If the visitor has ever manually chosen a currency, honour that
   *      preference (stored in localStorage key 'bxCurrencyV2').
   *      V2 key busts any stale V1 values from the old two-currency system.
   *   2. Otherwise fetch their country via api.country.is (lightweight,
   *      no-auth, CORS-open) and map it to their local currency:
   *        Nigeria (NG)         → NGN (₦)
   *        UK (GB)              → GBP (£)
   *        Everything else      → USD ($)
   *   3. While the lookup is in-flight, start with NGN so the page never
   *      flashes a price-less state (NGN is our primary market).
   *   4. The "local" label (label-ngn element) updates its text to reflect
   *      the detected or chosen local currency symbol/code.
   *   5. Manual toggle always wins and persists across page reloads.
   *
   * --------------------------------------------------------- */
  function initCurrencyToggle() {
    var usdLabels   = document.querySelectorAll('.label-usd');
    var localLabels = document.querySelectorAll('.label-ngn'); // "local currency" label

    if (!usdLabels.length && !localLabels.length) return;

    /* Country → currency map
     * code   : body class suffix & localStorage value
     * label  : what to display on the toggle button
     * isLocal: true = this is a non-USD "local" currency shown on the left label
     */
    var CURRENCY_MAP = {
      'NG': { code: 'ngn', label: '₦ NGN', isLocal: true  },
      'GB': { code: 'gbp', label: '£ GBP', isLocal: true  },
      'GH': { code: 'usd', label: '$ USD', isLocal: false },
      'KE': { code: 'usd', label: '$ USD', isLocal: false },
      'ZA': { code: 'usd', label: '$ USD', isLocal: false },
    };
    var DEFAULT_CURRENCY = { code: 'usd', label: '$ USD', isLocal: false };

    // Currently active currency object
    var activeCurrency = { code: 'ngn', label: '₦ NGN', isLocal: true };

    /* Update DOM to reflect activeCurrency */
    function applyState(persist) {
      // Remove all currency body classes first
      document.body.classList.remove('show-usd', 'show-gbp');

      var isUSD = (activeCurrency.code === 'usd');

      if (!isUSD) {
        // Show local currency (NGN or GBP): add appropriate show-* class
        if (activeCurrency.code !== 'ngn') {
          document.body.classList.add('show-' + activeCurrency.code);
        }
        // Update the local label text
        localLabels.forEach(function(l) {
          l.textContent = activeCurrency.label;
          l.classList.add('active');
        });
        usdLabels.forEach(function(l) { l.classList.remove('active'); });
      } else {
        // Show USD
        document.body.classList.add('show-usd');
        usdLabels.forEach(function(l) { l.classList.add('active'); });
        localLabels.forEach(function(l) { l.classList.remove('active'); });
      }

      if (persist) {
        try { localStorage.setItem('bxCurrencyV2', activeCurrency.code); } catch(e) {}
      }
    }

    /* Manual toggle: clicking USD label → switch to USD */
    usdLabels.forEach(function(l) {
      l.addEventListener('click', function() {
        activeCurrency = { code: 'usd', label: '$ USD', isLocal: false };
        applyState(true);
      });
    });

    /* Manual toggle: clicking local label → switch back to local */
    localLabels.forEach(function(l) {
      l.addEventListener('click', function() {
        // Restore whatever local currency was detected (stored in data attr)
        var localCode  = l.dataset.localCode  || 'ngn';
        var localLabel = l.dataset.localLabel || '₦ NGN';
        activeCurrency = { code: localCode, label: localLabel, isLocal: true };
        applyState(true);
      });
    });

    /* Toggle-switch (middle pill) flips between local and USD */
    document.querySelectorAll('.toggle-switch').forEach(function(t) {
      t.addEventListener('click', function() {
        if (activeCurrency.code === 'usd') {
          var el = localLabels[0];
          var localCode  = (el && el.dataset.localCode)  || 'ngn';
          var localLabel = (el && el.dataset.localLabel) || '₦ NGN';
          activeCurrency = { code: localCode, label: localLabel, isLocal: true };
        } else {
          activeCurrency = { code: 'usd', label: '$ USD', isLocal: false };
        }
        applyState(true);
      });
    });

    /* Helper: store the detected local currency on the label elements so
     * clicking the local label later can restore it */
    function setLocalCurrencyOnLabels(cur) {
      localLabels.forEach(function(l) {
        l.dataset.localCode  = cur.code;
        l.dataset.localLabel = cur.label;
        l.textContent = cur.label;
      });
    }

    /* 1 — Check for a saved user preference (V2 key only) */
    var saved;
    try { saved = localStorage.getItem('bxCurrencyV2'); } catch(e) {}

    if (saved === 'usd') {
      activeCurrency = { code: 'usd', label: '$ USD', isLocal: false };
      applyState(false);
      // Still detect country so the local label shows the right currency
      fetch('https://api.country.is/', { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var country = (data && data.country) ? data.country.toUpperCase() : '';
          var cur = CURRENCY_MAP[country] || DEFAULT_CURRENCY;
          var localCur = cur.isLocal ? cur : { code: 'ngn', label: '₦ NGN', isLocal: true };
          setLocalCurrencyOnLabels(localCur);
        })
        .catch(function() {});
      return;
    }
    if (saved === 'ngn' || saved === 'gbp') {
      var savedCode  = saved;
      var savedLabel = saved === 'gbp' ? '£ GBP' : '₦ NGN';
      activeCurrency = { code: savedCode, label: savedLabel, isLocal: true };
      setLocalCurrencyOnLabels(activeCurrency);
      applyState(false);
      return;
    }

    /* 2 — No saved preference: start with NGN while we detect location */
    activeCurrency = { code: 'ngn', label: '₦ NGN', isLocal: true };
    setLocalCurrencyOnLabels(activeCurrency);
    applyState(false);

    /* 3 — Detect country and apply the right local currency */
    fetch('https://api.country.is/', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var country = (data && data.country) ? data.country.toUpperCase() : '';
        var cur = CURRENCY_MAP[country] || DEFAULT_CURRENCY;

        if (cur.isLocal) {
          // Local currency (NGN or GBP)
          activeCurrency = cur;
          setLocalCurrencyOnLabels(cur);
          applyState(false);
        } else {
          // Outside Nigeria/UK — show USD by default, but keep NGN on local label
          // so the user can toggle back to NGN if they prefer
          var localFallback = { code: 'ngn', label: '₦ NGN', isLocal: true };
          setLocalCurrencyOnLabels(localFallback);
          activeCurrency = { code: 'usd', label: '$ USD', isLocal: false };
          applyState(false);
        }
      })
      .catch(function() {
        // API unreachable — stay on NGN (safe default for primary market)
      });
  }

  /* ---------- Animated Counters ---------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1600;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  /* ---------- Active Nav Link ---------- */
  function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-links a, .nav-mobile a');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  /* ---------- Smooth Scroll for Anchor Links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();
