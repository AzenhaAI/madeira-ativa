// Madeira Ativa — the ways off the site, counted, and the app offered in the
// order this device can use it.
//
// Goals set 17.11.2026: more use of the site and of the apps, and search for
// the brand showing Google Play as well as the App Store. GA4 already counts
// pages and returns; what it could not see is anyone leaving for a store, the
// APK, Telegram, or installing the site itself. One delegated listener covers
// every page that loads this file, whatever builds the link.
(function () {
  function ev(name, params) {
    try { if (window.gtag) window.gtag('event', name, params); } catch (e) {}
  }
  var path = location.pathname;
  var page = /\/trail\//.test(path) ? 'trail' : /\/events/.test(path) ? 'events' : /\/bus/.test(path) ? 'bus' : /\/levada/.test(path) ? 'levadas'
    : /^\/ativa(\/(pt|de|ru))?\/?$/.test(path) ? 'home' : 'other';
  var trail = (path.match(/\/trail\/([a-z0-9-]+)/) || [])[1] || '';

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    // Names shared with AlfaCat, so one GA4 report (custom dimensions store,
    // page_type) covers every product.
    var store = /apps\.apple\.com/.test(h) ? 'app_store' : /play\.google\.com/.test(h) ? 'google_play' : /\.apk(\?|$)/.test(h) ? 'apk' : '';
    if (store) { ev('store_click', { store: store, page_type: page, trail: trail }); return; }
    var tg = h.match(/t\.me\/([A-Za-z0-9_]+)/);
    if (tg) ev('tg_click', { target: tg[1] === 'madeira_ativa' ? 'channel' : 'bot', page_type: page });
  }, true);

  // The store this device can install from goes first; Android also gets the
  // APK, for phones without Google Play. Desktop keeps both, Play first:
  // Google Play is the listing search has been missing.
  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  function order() {
    document.querySelectorAll('.getapp').forEach(function (box) {
      var btns = box.querySelector('.ga-btns'), apple = box.querySelector('[data-store="apple"]');
      if (ios && btns && apple) btns.insertBefore(apple, btns.firstChild);
      var apk = box.querySelector('.ga-apk');
      if (apk) apk.hidden = !android;
    });
  }

  // The site as an app, where the browser offers it (Chrome, Edge, Android).
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    document.querySelectorAll('[data-pwa]').forEach(function (b) { b.hidden = false; });
  });
  window.addEventListener('appinstalled', function () { ev('pwa_install', { outcome: 'installed', page_type: page }); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pwa]');
    if (!b || !deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function (c) {
      ev('pwa_install', { outcome: c && c.outcome || 'unknown', page_type: page });
      deferred = null;
      document.querySelectorAll('[data-pwa]').forEach(function (x) { x.hidden = true; });
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', order); else order();
})();
