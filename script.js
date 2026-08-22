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
    initFaqAccordion();
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

  /* ---------- Currency Toggle — manual NGN / USD ----------
   *
   *  Users pick their currency via toggle buttons/labels.
   *  Choice is saved to localStorage (bxCurrencyV2) and
   *  restored on every page. Defaults to NGN.
   *
   * --------------------------------------------------------- */
  function initCurrencyToggle() {
    var usdLabels = document.querySelectorAll('.label-usd');
    var ngnLabels = document.querySelectorAll('.label-ngn');
    var curBtns   = document.querySelectorAll('.cur-btn[data-cur]');

    if (!usdLabels.length && !ngnLabels.length && !curBtns.length) return;

    var activeCur = 'ngn';

    function applyState() {
      var isUSD = activeCur === 'usd';
      document.body.classList.toggle('show-usd', isUSD);
      window.bxActiveCurrency = activeCur;

      usdLabels.forEach(function(l) { l.classList.toggle('active', isUSD); });
      ngnLabels.forEach(function(l) { l.classList.toggle('active', !isUSD); });
      curBtns.forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.cur === activeCur);
      });

      try { localStorage.setItem('bxCurrencyV2', activeCur); } catch(e) {}
    }

    /* restore saved preference */
    try {
      var saved = localStorage.getItem('bxCurrencyV2');
      if (saved === 'ngn' || saved === 'usd') activeCur = saved;
    } catch(e) {}

    applyState();

    /* wire up clicks */
    usdLabels.forEach(function(l) {
      l.addEventListener('click', function() { activeCur = 'usd'; applyState(); });
    });
    ngnLabels.forEach(function(l) {
      l.addEventListener('click', function() { activeCur = 'ngn'; applyState(); });
    });
    document.querySelectorAll('.toggle-switch').forEach(function(t) {
      t.addEventListener('click', function() {
        activeCur = activeCur === 'usd' ? 'ngn' : 'usd';
        applyState();
      });
    });
    curBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeCur = btn.dataset.cur;
        applyState();
      });
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

/* ============================================================
   QUESTIONNAIRE SUMMARY API
   POST /questionnaires/summaries after email is captured
   ============================================================ */
var BX_API_BASE = 'https://dev.api.brixgate.com';

window.postQuestionnaireSummary = function(questionnaireId, email, score, ratingLevel, source, occupation, phoneNumber, fullName) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  var payload = {
    questionnaire_id: questionnaireId,
    email:            email,
    score:            parseFloat(Number(score).toFixed(2)),
    rating_level:     ratingLevel,
    source:           source,
    metadata:         JSON.stringify({ source: source })
  };
  /* occupation only sent for AI Readiness quiz (id 1) */
  if (questionnaireId === 1 && occupation) payload.occupation = occupation;
  if (phoneNumber) payload.phone_number = phoneNumber;
  if (fullName)    payload.name         = fullName;
  console.log('[Brixgate] postQuestionnaireSummary →', JSON.stringify(payload));
  fetch(BX_API_BASE + '/api/v1/questionnaires/summaries', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function(r) { return r.json(); })
  .then(function(d) { console.log('[Brixgate] questionnaire summary response:', JSON.stringify(d)); })
  .catch(function(e) { console.warn('[Brixgate] questionnaire summary error:', e); });
};

window.tierLabelToRatingLevel = function(label) {
  if (/undisputed|proof/i.test(label)) return 'ADVANCED';
  if (/enthusiast|ready/i.test(label)) return 'INTERMEDIATE';
  return 'BEGINNER';
};

/* ============================================================
   SHARED QUIZ CAPTURE GATE
   Used by: programme.html, all programme-*.html course pages
   ============================================================ */
(function () {
  var _captureCallback = null;

  function ensureOverlay() {
    if (document.getElementById('bx-quiz-capture')) return;
    var el = document.createElement('div');
    el.id = 'bx-quiz-capture';
    el.setAttribute('style', [
      'display:none',
      'position:fixed',
      'inset:0',
      'z-index:9000',
      'background:rgba(2,16,36,0.96)',
      'align-items:center',
      'justify-content:center',
      'padding:24px'
    ].join(';'));
    var inputStyle = 'width:100%;padding:13px 16px;border-radius:8px;border:1.5px solid #1A3050;background:rgba(255,255,255,0.05);color:#fff;font-size:0.92rem;margin-bottom:10px;outline:none;box-sizing:border-box;';
    var ccStyle    = 'padding:13px 10px;border-radius:8px;border:1.5px solid #1A3050;background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;outline:none;cursor:pointer;flex-shrink:0;width:116px;box-sizing:border-box;';
    var phoneStyle = 'padding:13px 16px;border-radius:8px;border:1.5px solid #1A3050;background:rgba(255,255,255,0.05);color:#fff;font-size:0.92rem;outline:none;box-sizing:border-box;flex:1;min-width:0;';
    el.innerHTML =
      '<div style="background:#0D1C34;border:1px solid #1A3050;border-radius:20px;padding:40px 32px;max-width:440px;width:100%;text-align:center;">' +
        '<div style="font-size:2rem;margin-bottom:12px;">🎯</div>' +
        '<h3 style="font-size:1.3rem;font-weight:900;color:#fff;margin-bottom:8px;">Your Results Are Ready</h3>' +
        '<p style="font-size:0.88rem;color:#7A94A8;line-height:1.6;margin-bottom:20px;">Enter your details to receive your result and unlock a <strong style="color:#FF294E;">10% coupon</strong> for the programme.</p>' +
        '<input id="bx-quiz-name" type="text" placeholder="Full name" autocomplete="name" style="' + inputStyle + '" />' +
        '<input id="bx-quiz-email" type="email" placeholder="your@email.com" autocomplete="email" style="' + inputStyle + '" />' +
        '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
          '<select id="bx-quiz-cc" style="' + ccStyle + '">' +
            '<option value="+234">🇳🇬 +234</option>' +
            '<option value="+233">🇬🇭 +233</option>' +
            '<option value="+254">🇰🇪 +254</option>' +
            '<option value="+27">🇿🇦 +27</option>' +
            '<option value="+255">🇹🇿 +255</option>' +
            '<option value="+256">🇺🇬 +256</option>' +
            '<option value="+251">🇪🇹 +251</option>' +
            '<option value="+1">🇺🇸 +1</option>' +
            '<option value="+44">🇬🇧 +44</option>' +
            '<option value="+971">🇦🇪 +971</option>' +
            '<option value="+91">🇮🇳 +91</option>' +
            '<option value="+49">🇩🇪 +49</option>' +
            '<option value="+33">🇫🇷 +33</option>' +
            '<option value="+61">🇦🇺 +61</option>' +
            '<option value="+1-CA">🇨🇦 +1</option>' +
          '</select>' +
          '<input id="bx-quiz-phone" type="tel" placeholder="Phone number" autocomplete="tel" style="' + phoneStyle + '" />' +
        '</div>' +
        '<div id="bx-quiz-err" style="color:#FF294E;font-size:0.78rem;min-height:18px;margin-bottom:10px;text-align:left;"></div>' +
        '<button onclick="submitQuizCapture()" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF294E,#FF5748);border:none;border-radius:10px;color:#fff;font-weight:800;font-size:1rem;cursor:pointer;margin-bottom:12px;">Get My Results</button>' +
        '<br/><a href="#" onclick="skipQuizCapture(event)" style="color:#7A94A8;font-size:0.82rem;text-decoration:underline;">Skip — just show me results</a>' +
      '</div>';
    document.body.appendChild(el);
  }

  var _captureKey = 'bxQuizCaptured';

  window.showQuizCaptureGate = function (callback, pageId) {
    _captureKey = pageId ? ('bxQuizCaptured_' + pageId) : 'bxQuizCaptured';
    if (localStorage.getItem(_captureKey)) { callback(); return; }
    ensureOverlay();
    _captureCallback = callback;
    document.getElementById('bx-quiz-capture').style.display = 'flex';
  };

  window.submitQuizCapture = function () {
    var nameEl   = document.getElementById('bx-quiz-name');
    var emailEl  = document.getElementById('bx-quiz-email');
    var ccEl     = document.getElementById('bx-quiz-cc');
    var phoneEl  = document.getElementById('bx-quiz-phone');
    var errEl    = document.getElementById('bx-quiz-err');
    var name     = nameEl  ? nameEl.value.trim()  : '';
    var email    = emailEl ? emailEl.value.trim() : '';
    var cc       = ccEl    ? ccEl.value.replace(/-[A-Z]+$/, '') : '+234';
    var phoneRaw = phoneEl ? phoneEl.value.replace(/\D/g, '')   : '';
    var phone    = phoneRaw ? (cc + phoneRaw) : '';
    if (errEl) errEl.textContent = '';
    if (!name) {
      if (nameEl)  { nameEl.style.borderColor  = '#FF294E'; nameEl.focus(); }
      if (errEl)   errEl.textContent = 'Please enter your name.';
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (emailEl) { emailEl.style.borderColor = '#FF294E'; emailEl.focus(); }
      if (errEl)   errEl.textContent = 'Please enter a valid email address.';
      return;
    }
    if (!phoneRaw) {
      if (phoneEl) { phoneEl.style.borderColor = '#FF294E'; phoneEl.focus(); }
      if (errEl)   errEl.textContent = 'Please enter your phone number.';
      return;
    }
    try {
      localStorage.setItem(_captureKey,   '1');
      localStorage.setItem('bxQuizEmail', email);
      localStorage.setItem('bxQuizName',  name);
      localStorage.setItem('bxQuizPhone', phone);
    } catch (e) {}
    document.getElementById('bx-quiz-capture').style.display = 'none';
    if (_captureCallback) { var cb = _captureCallback; _captureCallback = null; cb(); }
  };

  window.skipQuizCapture = function (e) {
    if (e) e.preventDefault();
    try { localStorage.setItem(_captureKey, 'skip'); } catch (e) {}
    document.getElementById('bx-quiz-capture').style.display = 'none';
    if (_captureCallback) { var cb = _captureCallback; _captureCallback = null; cb(); }
  };
  /* ── FAQ Accordion ── */
  function initFaqAccordion() {
    document.querySelectorAll('.faq-question').forEach(function (btn) {
      /* Skip buttons already inside a container with id="faq-list" —
         those have their own inline handler in programme.html */
      if (btn.closest('#faq-list')) return;

      btn.addEventListener('click', function () {
        var item = this.closest('.faq-item');
        var isOpen = item.classList.contains('open');
        // Close all siblings first
        var list = item.closest('.faq-list');
        if (list) {
          list.querySelectorAll('.faq-item.open').forEach(function (el) {
            el.classList.remove('open');
          });
        }
        if (!isOpen) item.classList.add('open');
      });
    });
  }

}());

/* ── Dynamic copyright year ── */
(function() {
  var el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}());

/* ── Nav programmes dropdown (chevron toggle) ── */
(function() {
  var wrap = document.querySelector('.nav-prog-dropdown');
  var chevron = document.querySelector('.nav-prog-chevron');
  if (!wrap || !chevron) return;
  chevron.addEventListener('click', function(e) {
    e.stopPropagation();
    wrap.classList.toggle('open');
  });
  document.addEventListener('click', function() {
    if (wrap) wrap.classList.remove('open');
  });
}());

/* ── Instagram video grid & modal ── */
(function () {
  var modal    = document.getElementById('ig-modal');
  var modalVid = document.getElementById('ig-modal-video');
  var backdrop = modal && modal.querySelector('.ig-modal-backdrop');
  var closeBtn = modal && modal.querySelector('.ig-modal-close');
  if (!modal || !modalVid) return;

  function openModal(src) {
    modalVid.src = src;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modalVid.play();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modalVid.pause();
    modalVid.src = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.ig-video-card').forEach(function (card) {
    card.addEventListener('click', function () { openModal(card.dataset.src); });
  });

  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modalVid.addEventListener('ended', closeModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
}());
