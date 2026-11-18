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
    // Clicks in the phone bar below count as page_type mobile_banner; the page
    // they came from goes in banner_page.
    if (store) {
      var inBar = a.hasAttribute('data-banner');
      ev('store_click', { store: store, page_type: inBar ? 'mobile_banner' : page, trail: trail, banner_page: inBar ? page : '' });
      return;
    }
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

  // A slim "get the app" bar for phone browsers (SEO goals 18.11.2026: every
  // page, not only the home, offers the app). One store per device: Google
  // Play on Android (plus the APK, for phones without Play), the App Store on
  // iPhone and iPad. Safari on iOS shows Apple's own Smart App Banner from the
  // apple-itunes-app meta, so the bar is for Chrome, Firefox and the rest there.
  // It sits at the top of the page, in the flow: it covers nothing, and the
  // bottom of the screen belongs to the tab bar. Never inside the app, an
  // installed copy of the site, the map embedded on the home page or a
  // full-screen map; closed, it stays away for 14 days.
  var BANNER_KEY = 'ma-appbar-closed', BANNER_DAYS = 14;
  var BANNER = {
    en: { play: 'Free app on Google Play', apple: 'Free app on the App Store', get: 'Get', close: 'Close' },
    pt: { play: 'App grátis no Google Play', apple: 'App grátis na App Store', get: 'Obter', close: 'Fechar' },
    de: { play: 'Gratis-App bei Google Play', apple: 'Gratis-App im App Store', get: 'Laden', close: 'Schließen' },
    ru: { play: 'Бесплатно в Google Play', apple: 'Бесплатно в App Store', get: 'Скачать', close: 'Закрыть' },
  };
  function bannerWanted() {
    if (!ios && !android) return '';
    var q = new URLSearchParams(location.search), inApp = q.has('app');
    try { inApp = inApp || sessionStorage.getItem('inApp') === '1'; } catch (e) {}
    if (inApp || q.has('embed') || q.has('shell')) return '';
    if (/; wv\)/.test(ua)) return '';                                // Android WebView (the app)
    if (ios && !/Safari\//.test(ua)) return '';                       // WKWebView (the app, in-app browsers)
    if (window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) return '';
    if (document.body.classList.contains('full')) return '';         // full-screen maps
    if (ios && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|GSA\//.test(ua)) return ''; // Safari: Apple's own banner
    try {
      var t = +localStorage.getItem(BANNER_KEY);
      if (t && Date.now() - t < BANNER_DAYS * 864e5) return '';
    } catch (e) {}
    return android ? 'google_play' : 'app_store';
  }
  function banner() {
    var store = bannerWanted();
    if (!store) return;
    var s = BANNER[document.documentElement.lang] || BANNER.en;
    var href = store === 'google_play'
      ? 'https://play.google.com/store/apps/details?id=ai.azenha.ativa&utm_source=site&utm_medium=mobile_banner&utm_campaign=' + page
      : 'https://apps.apple.com/app/madeira-ativa/id6796836699?pt=129240922&ct=mobile_banner&mt=8';
    var css = document.createElement('style');
    css.textContent =
      '.ma-appbar{--ab-bg:#F2EEE4;--ab-ink:#15201A;--ab-soft:#5F6F62;--ab-line:#E3DDD0;--ab-btn:#0F6E56;--ab-on:#fff;' +
      'display:flex;align-items:center;gap:10px;padding:7px max(12px,env(safe-area-inset-right)) 7px max(8px,env(safe-area-inset-left));' +
      'background:var(--ab-bg);color:var(--ab-ink);border-bottom:1px solid var(--ab-line);font:13px/1.25 Inter,system-ui,-apple-system,sans-serif;position:relative;z-index:60}' +
      'html.dark .ma-appbar{--ab-bg:#171E19;--ab-ink:#E7ECE6;--ab-soft:#98A79B;--ab-line:#2A332C;--ab-btn:#7FC79C;--ab-on:#0D2418}' +
      '@media (prefers-color-scheme:dark){html:not(.light) .ma-appbar{--ab-bg:#171E19;--ab-ink:#E7ECE6;--ab-soft:#98A79B;--ab-line:#2A332C;--ab-btn:#7FC79C;--ab-on:#0D2418}}' +
      '.ma-appbar button.x{flex:none;width:28px;height:28px;margin:0 -4px 0 0;padding:0;border:0;background:none;color:var(--ab-soft);font-size:20px;line-height:28px;cursor:pointer}' +
      '.ma-appbar img{flex:none;width:36px;height:36px;border-radius:9px}' +
      '.ma-appbar .t{flex:1;min-width:0}.ma-appbar .t b{display:block;font-weight:600;font-size:14px}' +
      '.ma-appbar .t span{display:block;color:var(--ab-soft);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ma-appbar .t a{color:var(--ab-soft);text-decoration:underline}' +
      '.ma-appbar a.go{flex:none;padding:7px 14px;border-radius:999px;background:var(--ab-btn);color:var(--ab-on);font-weight:600;font-size:13px;text-decoration:none}';
    var bar = document.createElement('div');
    bar.className = 'ma-appbar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Madeira Ativa app');
    bar.innerHTML =
      '<button class="x" type="button" aria-label="' + s.close + '">×</button>' +
      '<img src="/ativa/icon-192.png" alt="" width="36" height="36">' +
      '<div class="t"><b>Madeira Ativa</b>' +
      '<span>' + (store === 'google_play' ? s.play + ' · <a data-banner href="/ativa/madeira-events.apk">APK</a>' : s.apple) + '</span></div>' +
      '<a class="go" data-banner href="' + href + '" rel="noopener">' + s.get + '</a>';
    document.head.appendChild(css);
    document.body.insertBefore(bar, document.body.firstChild);
    ev('app_banner_view', { store: store, page_type: page });
    // The language switch on the page works in place; the bar follows it.
    if (window.MutationObserver) new MutationObserver(function () {
      var l = BANNER[document.documentElement.lang] || BANNER.en;
      bar.querySelector('.go').textContent = l.get;
      bar.querySelector('.x').setAttribute('aria-label', l.close);
      bar.querySelector('.t span').firstChild.nodeValue = store === 'google_play' ? l.play + ' · ' : l.apple;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    bar.querySelector('.x').addEventListener('click', function () {
      try { localStorage.setItem(BANNER_KEY, String(Date.now())); } catch (e) {}
      bar.remove();
      ev('app_banner_dismiss', { store: store, page_type: page });
    });
  }

  // The site-wide Android strip from functions/_middleware.js (#az-apk) says
  // the same thing at the bottom, over the tab bar: on pages with this file the
  // bar above replaces it, whether shown or closed.
  try {
    var hideStrip = document.createElement('style');
    hideStrip.textContent = '#az-apk{display:none!important}';
    document.head.appendChild(hideStrip);
  } catch (e) {}

  function ready() { order(); banner(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
