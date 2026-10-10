// Madeira Ativa — the shell every page shares: language, theme, menu, and the
// small helpers the page scripts use. Language and theme are set before first
// paint by the inline bootstrap in each page's <head> (see build_next.py); this
// keeps them in step afterwards.
(function () {
  var html = document.documentElement;
  var LANGS = ['en', 'pt', 'de'];

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---- language
  var listeners = [];
  window.MA = {
    lang: function () { return LANGS.indexOf(html.lang) > 0 ? html.lang : 'en'; },
    // German comes from window.MA_DE (de.js, built from scripts/data/strings_de.json),
    // keyed by the English; a string not translated yet stays English.
    t: function (en, pt) { var l = MA.lang(); return l === 'pt' ? (pt == null ? en : pt) : l === 'de' ? ((window.MA_DE || {})[en] || en) : en; },
    onLang: function (fn) { listeners.push(fn); },
    setLang: function (l) {
      if (LANGS.indexOf(l) < 0) l = 'en';
      html.lang = l; store('lang', l);
      document.querySelectorAll('.seg [data-set]').forEach(function (b) { b.classList.toggle('on', b.dataset.set === l); });
      listeners.forEach(function (fn) { try { fn(l); } catch (e) { console.error(e); } });
      retitle();
    },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); },
    get: function (u) { return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); },
    today: function () { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Atlantic/Madeira' }).format(new Date()); },
    addDays: function (iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); },
    day: function (iso) {
      var d = new Date(iso + 'T00:00:00Z');
      var l = MA.lang();
      var W = l === 'pt' ? ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] : l === 'de' ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var M = l === 'pt' ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] : l === 'de' ? ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { d: d.getUTCDate(), w: W[d.getUTCDay()], m: M[d.getUTCMonth()] };
    },
    emo: function (c) { return c >= 95 ? '⛈' : c >= 80 ? '🌧' : c >= 61 ? '🌧' : c >= 51 ? '🌦' : c >= 45 ? '🌫' : c === 3 ? '☁️' : c >= 1 ? '🌤' : '☀️'; },
    trailUrl: function (code) { return '/ativa/route?code=' + encodeURIComponent(code); },
    // PR 2 before PR 10, PR 6.1 after PR 6.
    codeSort: function (a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true }); },
  };

  // The tab title follows the language too (the trail page sets its own).
  var titleEn = document.title;
  function retitle() {
    var b = document.body; if (!b || b.dataset.page === 'trail') return;
    var l = MA.lang();
    document.title = l === 'pt' ? (b.dataset.titlePt || titleEn) : l === 'de' ? (b.dataset.titleDe || titleEn) : titleEn;
  }

  // ---- theme
  function paintTheme() {
    var dark = html.classList.contains('dark');
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.innerHTML = dark
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5 1.5 3h-3zm0 20-1.5-3h3zM2 12l3-1.5v3zm20 0-3 1.5v-3zM4.9 4.9l3.2 1-2.1 2.1zm14.2 14.2-3.2-1 2.1-2.1zM4.9 19.1l1-3.2 2.1 2.1zM19.1 4.9l-1 3.2-2.1-2.1z"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 15.3A8 8 0 0 1 8.7 4a8 8 0 1 0 11.3 11.3z"/></svg>';
      b.setAttribute('aria-label', dark ? 'Light theme' : 'Dark theme');
    });
  }
  function toggleTheme() {
    var dark = !html.classList.contains('dark');
    html.classList.toggle('dark', dark); html.classList.toggle('light', !dark);
    store('ma-theme', dark ? 'dark' : 'light'); paintTheme();
  }

  // ---- menu
  function openMenu(open) {
    var d = document.getElementById('drawer'), s = document.getElementById('scrim');
    if (!d) return;
    d.hidden = !open; s.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-set],[data-theme-btn],[data-menu],[data-close],#scrim');
    if (!t) return;
    if (t.dataset.set) { MA.setLang(t.dataset.set); }
    else if (t.hasAttribute('data-theme-btn')) { toggleTheme(); }
    else if (t.hasAttribute('data-menu')) { openMenu(true); }
    else { openMenu(false); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openMenu(false); });

  function ready() {
    document.querySelectorAll('.seg [data-set]').forEach(function (b) { b.classList.toggle('on', b.dataset.set === MA.lang()); });
    paintTheme();
    retitle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
