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
  // On a phone the top row keeps only what the bar does not carry — Trail
  // stats, Festas, History — so no section is listed twice on one screen.
  // Desktop has no bar and keeps the full row.
  if (matchMedia('(max-width: 760px)').matches) {
    document.querySelectorAll('.site-nav-inner a').forEach(function (a) {
      var h = (a.getAttribute('href') || '') + ' ' + (a.getAttribute('onclick') || '');
      if (/\/ativa\/(levada|map|madeira_news)/.test(h)) a.style.display = 'none';
    });
  }
  // Pages switch language in place; relabel without rebuilding.
  new MutationObserver(function () {
    var p = (document.documentElement.lang || 'en') === 'pt';
    var labels = [p ? 'Início' : 'Home', 'Ask AI', p ? 'Eventos' : 'Events', p ? 'Mapa' : 'Map', 'Levadas', p ? 'Notícias' : 'News'];
    bar.querySelectorAll('span').forEach(function (s, i) { s.textContent = labels[i]; });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
