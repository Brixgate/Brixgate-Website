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
    var localLabels = document.querySelectorAll('.label-ngn');
    var curBtns     = document.querySelectorAll('.cur-btn[data-cur]');

    if (!usdLabels.length && !localLabels.length && !curBtns.length) return;

    /* currency metadata — only NGN and USD active; others commented for future re-enable */
    var CURRENCY_META = {
      ngn: { label: '₦ NGN' },
      usd: { label: '$ USD' }
      // gbp: { label: '£ GBP' },
      // eur: { label: '€ EUR' },
      // cad: { label: 'C$ CAD' }
    };

    /* country → currency code — all non-NGN countries map to USD */
    var COUNTRY_MAP = {
      'NG': 'ngn'
      // 'GB': 'gbp', 'CA': 'cad',
      // 'DE': 'eur', 'FR': 'eur', 'ES': 'eur', 'IT': 'eur',
      // 'NL': 'eur', 'BE': 'eur', 'AT': 'eur', 'PT': 'eur',
      // 'FI': 'eur', 'IE': 'eur', 'GR': 'eur', 'LU': 'eur',
      // 'SK': 'eur', 'SI': 'eur', 'EE': 'eur', 'LV': 'eur',
      // 'LT': 'eur', 'MT': 'eur', 'CY': 'eur', 'HR': 'eur'
    };

    var activeCurrCode = 'ngn';

    function applyState(persist) {
      document.body.classList.remove('show-usd'/*, 'show-gbp', 'show-eur', 'show-cad'*/);
      if (activeCurrCode !== 'ngn') {
        document.body.classList.add('show-' + activeCurrCode);
      }
      window.bxActiveCurrency = activeCurrCode;

      var meta = CURRENCY_META[activeCurrCode] || CURRENCY_META.ngn;
      var isUSD = (activeCurrCode === 'usd');

      usdLabels.forEach(function(l) { l.classList.toggle('active', isUSD); });
      localLabels.forEach(function(l) {
        l.textContent = isUSD ? (l.dataset.localLabel || '₦ NGN') : meta.label;
        l.classList.toggle('active', !isUSD);
      });

      curBtns.forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.cur === activeCurrCode);
      });

      if (persist) {
        try { localStorage.setItem('bxCurrencyV2', activeCurrCode); } catch(e) {}
      }
    }

    /* old-style toggle clicks */
    usdLabels.forEach(function(l) {
      l.addEventListener('click', function() { activeCurrCode = 'usd'; applyState(true); });
    });
    localLabels.forEach(function(l) {
      l.addEventListener('click', function() {
        activeCurrCode = l.dataset.localCode || 'ngn';
        applyState(true);
      });
    });
    document.querySelectorAll('.toggle-switch').forEach(function(t) {
      t.addEventListener('click', function() {
        if (activeCurrCode === 'usd') {
          activeCurrCode = (localLabels[0] && localLabels[0].dataset.localCode) || 'ngn';
        } else {
          activeCurrCode = 'usd';
        }
        applyState(true);
      });
    });

    /* new 5-button toggle clicks */
    curBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeCurrCode = btn.dataset.cur;
        applyState(true);
      });
    });

    function setLocalLabel(code) {
      var meta = CURRENCY_META[code] || CURRENCY_META.ngn;
      localLabels.forEach(function(l) {
        l.dataset.localCode  = code;
        l.dataset.localLabel = meta.label;
        l.textContent = meta.label;
      });
    }

    /* restore saved preference */
    var saved;
    try { saved = localStorage.getItem('bxCurrencyV2'); } catch(e) {}

    if (saved && CURRENCY_META[saved]) {
      activeCurrCode = saved;
      setLocalLabel(saved !== 'usd' ? saved : 'ngn');
      applyState(false);
      if (saved === 'usd') {
        fetch('https://api.country.is/', { cache: 'no-store' })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var c = (data && data.country) ? data.country.toUpperCase() : '';
            var loc = COUNTRY_MAP[c] || 'ngn';
            if (loc === 'usd') loc = 'ngn';
            setLocalLabel(loc);
          }).catch(function() {});
      }
      return;
    }

    /* no saved preference — start NGN then detect */
    activeCurrCode = 'ngn';
    setLocalLabel('ngn');
    applyState(false);

    fetch('https://api.country.is/', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var c = (data && data.country) ? data.country.toUpperCase() : '';
        var detected = COUNTRY_MAP[c] || 'usd';
        if (detected !== 'usd') {
          setLocalLabel(detected);
          activeCurrCode = detected;
          applyState(false);
        } else {
          setLocalLabel('ngn');
          activeCurrCode = 'usd';
          applyState(false);
        }
      })
      .catch(function() {});
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
var BX_API_BASE = 'https://api.brixgate.com';

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
  if (/expert practitioner|ai practitioner/i.test(label)) return 'ADVANCED';
  if (/practitioner level|ai aware/i.test(label)) return 'INTERMEDIATE';
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
    var selectStyle = 'padding:0 10px;border-radius:8px 0 0 8px;border:1.5px solid #1A3050;border-right:none;background:rgba(255,255,255,0.08);color:#fff;font-size:0.82rem;cursor:pointer;outline:none;height:48px;flex-shrink:0;max-width:220px;';
    var phoneRowStyle = 'display:flex;align-items:stretch;margin-bottom:10px;';
    var phoneInputStyle = 'flex:1;padding:13px 16px;border-radius:0 8px 8px 0;border:1.5px solid #1A3050;border-left:none;background:rgba(255,255,255,0.05);color:#fff;font-size:0.92rem;outline:none;box-sizing:border-box;min-width:0;';
    el.innerHTML =
      '<div style="background:#0D1C34;border:1px solid #1A3050;border-radius:20px;padding:40px 32px;max-width:440px;width:100%;text-align:center;">' +
        '<div style="font-size:2rem;margin-bottom:12px;">🎯</div>' +
        '<h3 style="font-size:1.3rem;font-weight:900;color:#fff;margin-bottom:8px;">Your Results Are Ready</h3>' +
        '<p style="font-size:0.88rem;color:#7A94A8;line-height:1.6;margin-bottom:20px;">Enter your details to receive your result and unlock a <strong style="color:#FF294E;">10% coupon</strong> for the programme.</p>' +
        '<input id="bx-quiz-name" type="text" placeholder="Full name" autocomplete="name" style="' + inputStyle + '" />' +
        '<div style="' + phoneRowStyle + '">' +
          '<select id="bx-quiz-dialcode" style="' + selectStyle + '">' +
            '<option value="+234">🇳🇬 +234 Nigeria</option>' +
            '<option value="+1">🇺🇸 +1 United States</option>' +
            '<option value="+44">🇬🇧 +44 United Kingdom</option>' +
            '<option value="+233">🇬🇭 +233 Ghana</option>' +
            '<option value="+254">🇰🇪 +254 Kenya</option>' +
            '<option value="+27">🇿🇦 +27 South Africa</option>' +
            '<option value="+251">🇪🇹 +251 Ethiopia</option>' +
            '<option value="+225">🇨🇮 +225 Côte d\'Ivoire</option>' +
            '<option value="+212">🇲🇦 +212 Morocco</option>' +
            '<option value="+1">🇨🇦 +1 Canada</option>' +
            '<option value="+213">🇩🇿 +213 Algeria</option>' +
            '<option value="+20">🇪🇬 +20 Egypt</option>' +
            '<option value="+256">🇺🇬 +256 Uganda</option>' +
            '<option value="+255">🇹🇿 +255 Tanzania</option>' +
            '<option value="+237">🇨🇲 +237 Cameroon</option>' +
            '<option value="+221">🇸🇳 +221 Senegal</option>' +
            '<option value="+228">🇹🇬 +228 Togo</option>' +
            '<option value="+229">🇧🇯 +229 Benin</option>' +
            '<option value="+227">🇳🇪 +227 Niger</option>' +
            '<option value="+226">🇧🇫 +226 Burkina Faso</option>' +
            '<option value="+223">🇲🇱 +223 Mali</option>' +
            '<option value="+224">🇬🇳 +224 Guinea</option>' +
            '<option value="+245">🇬🇼 +245 Guinea-Bissau</option>' +
            '<option value="+220">🇬🇲 +220 Gambia</option>' +
            '<option value="+232">🇸🇱 +232 Sierra Leone</option>' +
            '<option value="+231">🇱🇷 +231 Liberia</option>' +
            '<option value="+236">🇨🇫 +236 Central African Rep.</option>' +
            '<option value="+235">🇹🇩 +235 Chad</option>' +
            '<option value="+243">🇨🇩 +243 DR Congo</option>' +
            '<option value="+242">🇨🇬 +242 Republic of Congo</option>' +
            '<option value="+241">🇬🇦 +241 Gabon</option>' +
            '<option value="+240">🇬🇶 +240 Equatorial Guinea</option>' +
            '<option value="+239">🇸🇹 +239 São Tomé & Príncipe</option>' +
            '<option value="+238">🇨🇻 +238 Cape Verde</option>' +
            '<option value="+222">🇲🇷 +222 Mauritania</option>' +
            '<option value="+249">🇸🇩 +249 Sudan</option>' +
            '<option value="+211">🇸🇸 +211 South Sudan</option>' +
            '<option value="+291">🇪🇷 +291 Eritrea</option>' +
            '<option value="+253">🇩🇯 +253 Djibouti</option>' +
            '<option value="+252">🇸🇴 +252 Somalia</option>' +
            '<option value="+250">🇷🇼 +250 Rwanda</option>' +
            '<option value="+257">🇧🇮 +257 Burundi</option>' +
            '<option value="+258">🇲🇿 +258 Mozambique</option>' +
            '<option value="+260">🇿🇲 +260 Zambia</option>' +
            '<option value="+263">🇿🇼 +263 Zimbabwe</option>' +
            '<option value="+265">🇲🇼 +265 Malawi</option>' +
            '<option value="+267">🇧🇼 +267 Botswana</option>' +
            '<option value="+268">🇸🇿 +268 Eswatini</option>' +
            '<option value="+266">🇱🇸 +266 Lesotho</option>' +
            '<option value="+261">🇲🇬 +261 Madagascar</option>' +
            '<option value="+230">🇲🇺 +230 Mauritius</option>' +
            '<option value="+248">🇸🇨 +248 Seychelles</option>' +
            '<option value="+269">🇰🇲 +269 Comoros</option>' +
            '<option value="+216">🇹🇳 +216 Tunisia</option>' +
            '<option value="+218">🇱🇾 +218 Libya</option>' +
            '<option value="+34">🇪🇸 +34 Spain</option>' +
            '<option value="+351">🇵🇹 +351 Portugal</option>' +
            '<option value="+33">🇫🇷 +33 France</option>' +
            '<option value="+49">🇩🇪 +49 Germany</option>' +
            '<option value="+39">🇮🇹 +39 Italy</option>' +
            '<option value="+31">🇳🇱 +31 Netherlands</option>' +
            '<option value="+32">🇧🇪 +32 Belgium</option>' +
            '<option value="+41">🇨🇭 +41 Switzerland</option>' +
            '<option value="+43">🇦🇹 +43 Austria</option>' +
            '<option value="+48">🇵🇱 +48 Poland</option>' +
            '<option value="+46">🇸🇪 +46 Sweden</option>' +
            '<option value="+47">🇳🇴 +47 Norway</option>' +
            '<option value="+45">🇩🇰 +45 Denmark</option>' +
            '<option value="+358">🇫🇮 +358 Finland</option>' +
            '<option value="+353">🇮🇪 +353 Ireland</option>' +
            '<option value="+30">🇬🇷 +30 Greece</option>' +
            '<option value="+36">🇭🇺 +36 Hungary</option>' +
            '<option value="+420">🇨🇿 +420 Czech Republic</option>' +
            '<option value="+421">🇸🇰 +421 Slovakia</option>' +
            '<option value="+40">🇷🇴 +40 Romania</option>' +
            '<option value="+359">🇧🇬 +359 Bulgaria</option>' +
            '<option value="+385">🇭🇷 +385 Croatia</option>' +
            '<option value="+381">🇷🇸 +381 Serbia</option>' +
            '<option value="+380">🇺🇦 +380 Ukraine</option>' +
            '<option value="+7">🇷🇺 +7 Russia</option>' +
            '<option value="+90">🇹🇷 +90 Turkey</option>' +
            '<option value="+972">🇮🇱 +972 Israel</option>' +
            '<option value="+961">🇱🇧 +961 Lebanon</option>' +
            '<option value="+966">🇸🇦 +966 Saudi Arabia</option>' +
            '<option value="+971">🇦🇪 +971 UAE</option>' +
            '<option value="+974">🇶🇦 +974 Qatar</option>' +
            '<option value="+965">🇰🇼 +965 Kuwait</option>' +
            '<option value="+973">🇧🇭 +973 Bahrain</option>' +
            '<option value="+968">🇴🇲 +968 Oman</option>' +
            '<option value="+962">🇯🇴 +962 Jordan</option>' +
            '<option value="+964">🇮🇶 +964 Iraq</option>' +
            '<option value="+98">🇮🇷 +98 Iran</option>' +
            '<option value="+92">🇵🇰 +92 Pakistan</option>' +
            '<option value="+91">🇮🇳 +91 India</option>' +
            '<option value="+880">🇧🇩 +880 Bangladesh</option>' +
            '<option value="+94">🇱🇰 +94 Sri Lanka</option>' +
            '<option value="+95">🇲🇲 +95 Myanmar</option>' +
            '<option value="+60">🇲🇾 +60 Malaysia</option>' +
            '<option value="+65">🇸🇬 +65 Singapore</option>' +
            '<option value="+63">🇵🇭 +63 Philippines</option>' +
            '<option value="+62">🇮🇩 +62 Indonesia</option>' +
            '<option value="+66">🇹🇭 +66 Thailand</option>' +
            '<option value="+84">🇻🇳 +84 Vietnam</option>' +
            '<option value="+855">🇰🇭 +855 Cambodia</option>' +
            '<option value="+86">🇨🇳 +86 China</option>' +
            '<option value="+81">🇯🇵 +81 Japan</option>' +
            '<option value="+82">🇰🇷 +82 South Korea</option>' +
            '<option value="+61">🇦🇺 +61 Australia</option>' +
            '<option value="+64">🇳🇿 +64 New Zealand</option>' +
            '<option value="+55">🇧🇷 +55 Brazil</option>' +
            '<option value="+52">🇲🇽 +52 Mexico</option>' +
            '<option value="+57">🇨🇴 +57 Colombia</option>' +
            '<option value="+54">🇦🇷 +54 Argentina</option>' +
            '<option value="+56">🇨🇱 +56 Chile</option>' +
            '<option value="+51">🇵🇪 +51 Peru</option>' +
            '<option value="+58">🇻🇪 +58 Venezuela</option>' +
            '<option value="+593">🇪🇨 +593 Ecuador</option>' +
            '<option value="+591">🇧🇴 +591 Bolivia</option>' +
            '<option value="+595">🇵🇾 +595 Paraguay</option>' +
            '<option value="+598">🇺🇾 +598 Uruguay</option>' +
          '</select>' +
          '<input id="bx-quiz-phone" type="tel" placeholder="Phone number (optional)" autocomplete="tel" style="' + phoneInputStyle + '" />' +
        '</div>' +
        '<input id="bx-quiz-email" type="email" placeholder="your@email.com" autocomplete="email" style="' + inputStyle + 'margin-bottom:6px;" />' +
        '<div id="bx-quiz-err" style="color:#FF294E;font-size:0.78rem;min-height:18px;margin-bottom:10px;text-align:left;"></div>' +
        '<button onclick="submitQuizCapture()" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF294E,#FF5748);border:none;border-radius:10px;color:#fff;font-weight:800;font-size:1rem;cursor:pointer;margin-bottom:12px;">Get My Results + Coupon</button>' +
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
    var nameEl    = document.getElementById('bx-quiz-name');
    var phoneEl   = document.getElementById('bx-quiz-phone');
    var dialEl    = document.getElementById('bx-quiz-dialcode');
    var emailEl   = document.getElementById('bx-quiz-email');
    var errEl     = document.getElementById('bx-quiz-err');
    var name      = nameEl  ? nameEl.value.trim()  : '';
    var phoneRaw  = phoneEl ? phoneEl.value.trim() : '';
    var dialCode  = dialEl  ? dialEl.value : '+234';
    var phone     = phoneRaw ? (dialCode + phoneRaw) : '';
    var email     = emailEl ? emailEl.value.trim() : '';
    if (errEl) errEl.textContent = '';
    if (!name) {
      if (nameEl)  { nameEl.style.borderColor = '#FF294E'; nameEl.focus(); }
      if (errEl)   errEl.textContent = 'Please enter your name.';
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (emailEl) { emailEl.style.borderColor = '#FF294E'; emailEl.focus(); }
      if (errEl)   errEl.textContent = 'Please enter a valid email address.';
      return;
    }
    try {
      localStorage.setItem(_captureKey, '1');
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
