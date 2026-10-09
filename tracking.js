/**
 * Brixgate — Centralised Tracking
 * ─────────────────────────────────
 * All analytics/pixel scripts live here.
 * To add a new pixel, paste its code in the relevant section below and
 * set the ID constant at the top. No need to touch individual HTML pages.
 *
 * Loaded from: <script src="/tracking.js"></script> in every page <head>.
 */

/* ─── 1. GOOGLE ANALYTICS 4 ─────────────────────────────────────────────── */
var GA_ID = 'G-KXCNZMML3L';

(function() {
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
})();

window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
window.gtag = gtag;
gtag('js', new Date());
gtag('config', GA_ID);


/* ─── 2. META PIXEL ─────────────────────────────────────────────────────── */
var META_PIXEL_ID = '951051781163603';

!function(f,b,e,v,n,t,s) {
  if(f.fbq) return; n=f.fbq=function() { n.callMethod ?
  n.callMethod.apply(n,arguments) : n.queue.push(arguments) };
  if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0';
  n.queue=[]; t=b.createElement(e); t.async=!0;
  t.src=v; s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)
}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

fbq('init', META_PIXEL_ID);
fbq('track', 'PageView');

/* noscript fallback — appended to body */
document.addEventListener('DOMContentLoaded', function() {
  var ns = document.createElement('noscript');
  var img = document.createElement('img');
  img.height = 1; img.width = 1; img.style.display = 'none';
  img.src = 'https://www.facebook.com/tr?id=' + META_PIXEL_ID + '&ev=PageView&noscript=1';
  ns.appendChild(img);
  document.body && document.body.insertBefore(ns, document.body.firstChild);
});


/* ─── 3. LINKEDIN INSIGHT TAG ───────────────────────────────────────────── */
/* Paste your LinkedIn Partner ID here (numeric) */
var LINKEDIN_PARTNER_ID = ''; /* ← add ID when received */

if (LINKEDIN_PARTNER_ID) {
  window._linkedin_partner_id = LINKEDIN_PARTNER_ID;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(LINKEDIN_PARTNER_ID);

  (function(l) {
    if (!l) {
      window.lintrk = function(a,b) { window.lintrk.q.push([a,b]) };
      window.lintrk.q = [];
    }
    var s = document.getElementsByTagName('script')[0];
    var b = document.createElement('script');
    b.type = 'text/javascript';
    b.async = true;
    b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    s.parentNode.insertBefore(b, s);
  })(window.lintrk);
}


/* ─── 4. ZOHO THRIVE (affiliate / loyalty) ──────────────────────────────────
   Thrive attributes a referral to an affiliate, so what it records decides
   who gets paid. That shapes two decisions here.

   First, ztUserData is declared before the widget script is appended.
   Zoho's own snippet does the same, and the order is not cosmetic: the
   widget reads the object as it initialises, so anything written after it
   loads is not seen.

   Second, identifying a member needs thrive_digest — an HMAC the server
   signs. It is deliberately not computed here and cannot be: the key that
   signs it would have to ship in this file, and anyone could then sign
   themselves in as anyone. bxThriveIdentify() below is the seam the
   backend fills once it exposes that digest.
   ────────────────────────────────────────────────────────────────────── */
var THRIVE_WIDGET_CODE = 'db2b3412dd6de35dd54effe5ad801e60542aa4520685487ad77c3008770ea1de';

if (THRIVE_WIDGET_CODE) {
  window.platformType = 'custom_user_site';
  window.thriveWidgetCode = THRIVE_WIDGET_CODE;

  /* Present and empty from the first line, so the widget never reads an
     undefined object on a page where nobody has identified themselves. */
  window.ztUserData = window.ztUserData || {};

  /* Called once the backend can sign a digest. Until then nothing calls
     it, and Thrive runs in anonymous tracking mode — which is the correct
     behaviour for a visitor we have not identified, not a degraded one.

     Every field is required by Zoho; a partial identify is worse than
     none, because it attributes a referral against an unverified email. */
  window.bxThriveIdentify = function (d) {
    if (!d || !d.email || !d.userId || !d.digest) return false;
    window.ztUserData['za_email_id']    = d.email;
    window.ztUserData['user_unique_id'] = d.userId;
    window.ztUserData['thrive_digest']  = d.digest;
    window.ztUserData['signUpPage']     = d.signUpPage || 'https://portal.brixgate.com/signup';
    window.ztUserData['signInPage']     = d.signInPage || 'https://portal.brixgate.com/login';
    return true;
  };

  (function () {
    var s = document.createElement('script');
    s.id = 'thrive_script';
    s.src = 'https://thrive.zohopublic.com/thrive/publicpages/thrivewidget';
    document.head.appendChild(s);
  })();
}
