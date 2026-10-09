// The bottom tab bar on phones: the same six places, in the same order, as the
// app's bar — Home, Ask AI, Events, Map, Levadas, News — so someone who uses
// both never has to look for anything. Desktop keeps the top navigation.
//
// Not shown inside the app (?app=1, or an Android WebView), where the app has
// its own bar underneath, nor in the map embedded on the home page (embed=1).
// Pages that fill the screen read --tabbar to leave room for it.
(function () {
  var q = new URLSearchParams(location.search);
  if (q.has('app') || q.has('embed') || /; wv\)/.test(navigator.userAgent)) return;
  var pt = (document.documentElement.lang || 'en') === 'pt';
  var TABS = [
    ['/ativa/', pt ? 'Início' : 'Home', 'M12 3 2 12h3v8h5v-6h4v6h5v-8h3z'],
    ['/ativa/ask', 'Ask AI', 'M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8zM5 16l.9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9zM19 14l.7 1.6 1.6.7-1.6.7L19 18.6l-.7-1.6-1.6-.7 1.6-.7z'],
    ['/ativa/#events', pt ? 'Eventos' : 'Events', 'M7 2v2H4v18h16V4h-3V2h-2v2H9V2zm-1 7h12v11H6zm2 2v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zm-8 4v2h2v-2zm4 0v2h2v-2z'],
    ['/ativa/map', pt ? 'Mapa' : 'Map', 'M15 4 9 2 3 4v18l6-2 6 2 6-2V2zm-5 .4 4 1.3v13.9l-4-1.3zM5 5.4l3-1v13.9l-3 1zm14 13.2-3 1V5.7l3-1z'],
    ['/ativa/levada', 'Levadas', 'M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 10.3V15h2v-3.4z'],
    ['/ativa/madeira_news', pt ? 'Notícias' : 'News', 'M4 3h16v18H4zm2 2v14h12V5zm2 2h8v2H8zm0 4h8v2H8zm0 4h5v2H8z'],
  ];
  var here = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/ativa';
  var active = TABS.length - 1;
  // The longest matching prefix wins, so a trail page lights Levadas and the
  // home page only lights Home. Events is Home's calendar, lit only by its hash.
  var best = -1;
  TABS.forEach(function (t, i) {
    var p = t[0].replace(/\/$/, '').split('#')[0];
    if (t[0].indexOf('#') >= 0) { if (location.hash === '#events' && here === '/ativa') { best = 99; active = i; } return; }
    if ((here === p || here.indexOf(p + '/') === 0 || (p === '/ativa/levada' && here.indexOf('/ativa/trail') === 0)) && p.length > best) { best = p.length; active = i; }
  });
  var css = document.createElement('style');
  // Solid colours of its own: the pages name their theme variables differently
  // (--panel on one, --card on another), and a bar that inherits the wrong one
  // turns see-through over the content it is meant to sit on.
  css.textContent =
    '.ma-tabbar{display:none}' +
    '@media(max-width:760px){' +
    ':root{--tabbar:64px}' +
    'body{padding-bottom:calc(64px + env(safe-area-inset-bottom))}' +
    '.ma-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:1200;display:flex;justify-content:space-around;align-items:stretch;height:calc(64px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:#FBF9F4;border-top:1px solid #DAD3C5;box-shadow:0 -4px 16px rgba(0,0,0,.08)}' +
    '.ma-tabbar a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-decoration:none;color:#6B8763;font:600 11px/1 Inter,system-ui,sans-serif;letter-spacing:.02em}' +
    '.ma-tabbar a svg{width:24px;height:24px;fill:currentColor}' +
    '.ma-tabbar a.on{color:#1F4D32}' +
    '.ma-tabbar a.on svg{background:rgba(31,77,50,.12);border-radius:14px;padding:3px 10px;width:44px;box-sizing:content-box}' +
    'html.dark .ma-tabbar{background:#161d18;border-color:#2c352c}' +
    'html.dark .ma-tabbar a{color:#8fa68c}html.dark .ma-tabbar a.on{color:#9fcfaa}html.dark .ma-tabbar a.on svg{background:rgba(159,207,170,.14)}' +
    '@media(prefers-color-scheme:dark){html:not(.light) .ma-tabbar{background:#161d18;border-color:#2c352c}' +
    'html:not(.light) .ma-tabbar a{color:#8fa68c}html:not(.light) .ma-tabbar a.on{color:#9fcfaa}html:not(.light) .ma-tabbar a.on svg{background:rgba(159,207,170,.14)}}' +
    // What already floats at the bottom of a page moves up above the bar.
    '#a2hs{bottom:calc(12px + 64px + env(safe-area-inset-bottom))!important}' +
    '#toTop,.totop{bottom:calc(18px + 64px + env(safe-area-inset-bottom))!important}' +
    '#az-apk{bottom:calc(64px + env(safe-area-inset-bottom))!important}' +
    '}';
  document.head.appendChild(css);
  var bar = document.createElement('nav');
  bar.className = 'ma-tabbar';
  bar.setAttribute('aria-label', pt ? 'Secções' : 'Sections');
  bar.innerHTML = TABS.map(function (t, i) {
    return '<a href="' + t[0] + '"' + (i === active ? ' class="on" aria-current="page"' : '') + '>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + t[2] + '"/></svg><span>' + t[1] + '</span></a>';
  }).join('');
  document.body.appendChild(bar);
  // On a phone every page's own navigation row drops the places the bar
  // already carries — Home, Levadas, the 2D map, News — so nothing is listed
  // twice on one screen: the home row's Levadas/Maps/News, the "🏠 Main" that
  // opens each content page's row, the back links on Ask and Sources, the
  // "Home / ← Levadas" on the map pages, the "2D ↗" on the levada list. The
  // burger drawer keeps the full menu, and 3D, Fly and Aerial stay: the bar
  // has no place for them. Desktop has no bar and keeps every row whole.
  if (matchMedia('(max-width: 760px)').matches) {
    var carried = /^(?:\.\/|\/ativa\/?|\/ativa\/levada(?:\.html)?|\/ativa\/map(?:\.html)?(?:\?.*)?|\/ativa\/madeira_news(?:\.html)?(?:\?.*)?)(?:#.*)?$/;
    document.querySelectorAll('.site-nav-inner a, .section-nav-inner a, .topbar a, a.back, a.back-link').forEach(function (a) {
      var href = a.getAttribute('href') || '', click = a.getAttribute('onclick') || '';
      if (carried.test(href) || /\/ativa\/madeira_news/.test(click)) a.style.display = 'none';
      if (/\/ativa\/madeira_stat(?:\.html)?$/.test(href) && a.closest('.site-nav-inner')) a.textContent = 'Stats';
      // Where the row had "Maps", the three views the bar cannot show take its
      // place: the 3D island, the webcams and the trails by bus (the flyover stays in the drawer).
      if (/^\/ativa\/map(?:\.html)?(?:\?.*)?$/.test(href) && a.closest('.site-nav-inner') && !a.closest('.site-nav-inner').querySelector('.ma-views')) {
        var views = [['/ativa/map3d', '3D'], ['/ativa/webcams', 'Webcams'], ['/ativa/bus', 'Bus']];
        views.reverse().forEach(function (v) {
          var l = document.createElement('a');
          l.className = 'ma-views'; l.href = v[0]; l.textContent = v[1];
          a.insertAdjacentElement('afterend', l);
        });
      }
    });
  }
  // The two store badges above every page's footer — the same pair the apps
  // page shows, drawn here so the 16 pages need no markup of their own. Not
  // inside the app, where the reader already has it.
  (function () {
    var host = document.querySelector('footer') || document.querySelector('.wrap') || document.body;
    var box = document.createElement('div');
    box.className = 'ma-stores';
    var apple = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.7-3.1.7-.7 0-1.7-.7-2.8-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2.1.8-1.2 1.1-2.3 1.2-2.4 0 0-2.7-1-2.7-3.4ZM14.3 6.6c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.7-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2Z"/></svg>';
    var play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00d7fe" d="M4.6 2.6a1 1 0 0 0-.5.9v17a1 1 0 0 0 .5.9l9.1-9.4-9.1-9.4Z"/><path fill="#00f076" d="m14.8 10.9 2.9-3-9.9-5.6 7 8.6Z"/><path fill="#ff3a44" d="m14.8 13.1-7 8.6 9.9-5.6-2.9-3Z"/><path fill="#ffd500" d="m18.9 10.9-2.4-1.4-3 3.5 3 3.5 2.4-1.4c.9-.5.9-1.7 0-2.2Z"/></svg>';
    box.innerHTML =
      '<a class="ma-store" href="https://apps.apple.com/app/madeira-ativa/id6796836699" target="_blank" rel="noopener">' + apple +
        '<span><small>' + (pt ? 'Descarregar na' : 'Download on the') + '</small>App Store</span></a>' +
      '<a class="ma-store" href="https://play.google.com/store/apps/details?id=ai.azenha.ativa" target="_blank" rel="noopener">' + play +
        '<span><small>' + (pt ? 'Disponível no' : 'Get it on') + '</small>Google Play</span></a>';
    var st = document.createElement('style');
    st.textContent =
      '.ma-stores{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:28px auto 18px;max-width:760px;padding:0 4px}' +
      '.ma-store{flex:1 1 200px;max-width:260px;display:flex;align-items:center;gap:10px;background:#111;color:#fff;text-decoration:none;border:1px solid #444;border-radius:12px;padding:9px 16px;font:600 17px/1.15 Inter,system-ui,sans-serif}' +
      '.ma-store:hover{border-color:#888}' +
      '.ma-store svg{width:28px;height:28px;flex:0 0 auto}' +
      '.ma-store small{display:block;font-size:11px;font-weight:500;opacity:.85;letter-spacing:.02em}';
    document.head.appendChild(st);
    if (host.tagName === 'FOOTER') host.parentNode.insertBefore(box, host); else host.appendChild(box);
  })();

  // Russian, by choice. The drawer ends with "Interface languages": English and
  // Portuguese are always on; Russian is a tick the reader can set, remembered
  // on this device. With it on, a third button, RU, joins the page's EN/PT
  // switch. The Russian strings are the <span data-lang="ru"> that
  // scripts/i18n_ru.py adds beside each EN/PT pair as the nightly run
  // translates them; a pair without one shows English, so a page is never
  // blank in Russian — only, at worst, partly English.
  (function () {
    var KEY = 'ma-ru';
    function ruOn() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
    var st = document.createElement('style');
    st.textContent =
      'html[lang="ru"] [data-lang="ru"]{display:revert}' +
      'html[lang="ru"] .ma-ru-en{display:revert}' +
      '.ma-langs{margin:14px 10px 6px;padding-top:12px;border-top:1px solid rgba(127,127,127,.3);font:600 14px/1.4 Inter,system-ui,sans-serif}' +
      '.ma-langs .t{opacity:.7;font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px}' +
      '.ma-langs label{display:flex;align-items:center;gap:10px;padding:7px 0;cursor:pointer}' +
      '.ma-langs label.fixed{opacity:.6;cursor:default}' +
      '.ma-langs input{width:18px;height:18px;accent-color:#1F4D32}' +
      'html.dark .ma-langs input,html:not(.light) .ma-langs input{accent-color:#9fcfaa}' +
      '.ma-ru-btn.active{background:#1F4D32;color:#fff;border-color:#1F4D32}';
    document.head.appendChild(st);

    // English shows wherever the Russian line is missing.
    function markFallback() {
      document.querySelectorAll('[data-lang="en"]:not(.ma-ru-en):not(.ma-ru-has)').forEach(function (en) {
        var ru = en.nextElementSibling;
        while (ru && ru.getAttribute('data-lang') === 'pt') ru = ru.nextElementSibling;
        en.classList.add(ru && ru.getAttribute('data-lang') === 'ru' ? 'ma-ru-has' : 'ma-ru-en');
      });
    }
    function setLang(l) {
      document.documentElement.lang = l;
      try { localStorage.setItem('lang', l); } catch (e) {}
      paintRu();
    }
    function paintRu() {
      var on = document.documentElement.lang === 'ru';
      document.querySelectorAll('.ma-ru-btn').forEach(function (b) { b.classList.toggle('active', on); });
      if (on) markFallback();
    }

    // The RU button beside whichever EN/PT switch the page has.
    function placeButton() {
      if (document.querySelector('.ma-ru-btn')) return;
      var b = document.createElement('button');
      b.className = 'ma-ru-btn'; b.type = 'button'; b.textContent = 'RU';
      b.addEventListener('click', function () { setLang('ru'); });
      var pill = document.querySelector('.lang [data-set-lang]');
      var toggle = document.querySelector('.lang-toggle');
      var group = document.querySelector('.lang-btn');
      if (pill) { b.className += ' ' + pill.className; pill.parentNode.appendChild(b); }
      else if (toggle) { b.className += ' ' + toggle.className; toggle.insertAdjacentElement('afterend', b); }
      else if (group) { b.className += ' lang-btn'; group.parentNode.appendChild(b); }
      else return;
    }
    function removeButton() {
      var b = document.querySelector('.ma-ru-btn'); if (b) b.remove();
    }

    // The drawer's "Interface languages" block.
    var nav = document.querySelector('.drawer-nav');
    if (nav) {
      var box = document.createElement('div');
      box.className = 'ma-langs';
      box.innerHTML =
        '<p class="t">' + (pt ? 'Línguas da interface' : 'Interface languages') + '</p>' +
        '<label class="fixed"><input type="checkbox" checked disabled> English</label>' +
        '<label class="fixed"><input type="checkbox" checked disabled> Português</label>' +
        '<label><input type="checkbox" id="maRuTick"' + (ruOn() ? ' checked' : '') + '> Русский</label>';
      nav.appendChild(box);
      box.querySelector('#maRuTick').addEventListener('change', function (e) {
        try { localStorage.setItem(KEY, e.target.checked ? '1' : '0'); } catch (x) {}
        if (e.target.checked) { placeButton(); setLang('ru'); }
        else { removeButton(); if (document.documentElement.lang === 'ru') setLang('en'); }
      });
    }

    if (ruOn()) {
      placeButton();
      var saved = null; try { saved = localStorage.getItem('lang'); } catch (e) {}
      // The page's own script set en or pt on load; Russian is restored here.
      if (saved === 'ru') setLang('ru');
    }
    markFallback();
    paintRu();
    new MutationObserver(paintRu).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    // Content the page renders later carries its own EN/PT pairs.
    var pending = false;
    new MutationObserver(function () {
      if (pending) return; pending = true;
      requestAnimationFrame(function () { pending = false; if (document.documentElement.lang === 'ru') markFallback(); });
    }).observe(document.body, { childList: true, subtree: true });
  })();

  // Pages switch language in place; relabel without rebuilding.
  new MutationObserver(function () {
    var p = (document.documentElement.lang || 'en') === 'pt';
    var labels = [p ? 'Início' : 'Home', 'Ask AI', p ? 'Eventos' : 'Events', p ? 'Mapa' : 'Map', 'Levadas', p ? 'Notícias' : 'News'];
    bar.querySelectorAll('span').forEach(function (s, i) { s.textContent = labels[i]; });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
