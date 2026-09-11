/* ============================================================
   CUSTOM CURSOR  ·  cursor.js

   Any section that carries a gradient marks itself:

     <section class="... cursor-zone" data-cursor="Inside the cohort">

   and the pointer becomes an arrow with that label while inside it.
   The element is created here rather than sitting in every page's
   markup, and nothing happens at all if the page has no zone, on
   touch, on a small screen, or under reduced motion.
   ============================================================ */
(function () {
  'use strict';
  /* Nothing to place in every page's markup: the element is built
     here, once, only when there is a zone to show it in. */
  if (!document.querySelector('.cursor-zone')) return;

  var el = document.getElementById('lp-cursor');
  if (!el) {
    el = document.createElement('div');
    el.className = 'lp-cursor';
    el.id = 'lp-cursor';
    el.setAttribute('aria-hidden', 'true');
    /* Positioning is set inline as well as in the stylesheet. This element
       is appended to <body>, so if styles.css is stale or missing it would
       otherwise sit in normal flow and add a strip of blank page under the
       footer. Inline, it can never contribute layout. */
    el.style.cssText = 'position:fixed;top:0;left:0;z-index:900;pointer-events:none;';
    el.innerHTML =
      '<svg class="lp-cursor-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none">' +
        '<path d="M5 2.5 19.5 11 12.6 12.6 10.2 19.2z" fill="#fff" stroke="#021024" stroke-width="1.4" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span class="lp-cursor-label" id="lp-cursor-label"></span>';
    document.body.appendChild(el);
  }
  var label = document.getElementById('lp-cursor-label');
  if (!label) return;
  if (window.matchMedia && (window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(max-width: 960px)').matches)) return;

  var tx = -100, ty = -100, cx = -100, cy = -100, raf = 0, on = false, current = '';

  function frame() {
    cx += (tx - cx) * 0.30;
    cy += (ty - cy) * 0.30;
    el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    if (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  document.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;

    var zone = e.target && e.target.closest ? e.target.closest('.cursor-zone') : null;
    if (zone) {
      var text = zone.getAttribute('data-cursor') || 'You';
      if (!on) { on = true; el.classList.add('on'); }
      if (text !== current) {
        current = text;
        label.textContent = text;
        // replay the pop so the label change reads as intentional
        label.style.animation = 'none';
        void label.offsetWidth;
        label.style.animation = '';
      }
    } else if (on) {
      on = false; current = '';
      el.classList.remove('on');
    }

    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    on = false; current = ''; el.classList.remove('on');
  });
})();
