// Official IPMA weather warnings for Madeira, read live from the source.
//
// A thunderstorm warning for the mountains is issued at ten in the morning and
// matters by noon. Anything that waits for a nightly pipeline shows it a day
// late, so this does not wait: IPMA serves its warnings as open JSON with
// Access-Control-Allow-Origin: *, and every page load asks it directly.
//
// Only what can change a plan is shown — yellow, orange, red. Green is IPMA's
// "no warning" and is the normal state of every zone; listing it would bury the
// one line that matters. When nothing is above green the block stays hidden.
// It never says "all clear": a failed request and a calm day would look the same,
// and only one of them is true.
//
// Times. IPMA writes local times without an offset. Madeira keeps the same clock
// as Lisbon all year, so they are read as Atlantic/Madeira time. A warning is
// kept on screen for an hour past its stated end: if that reading were ever off
// by the hour, the error falls on the side of warning too long, never too short.
//
// Used by /ativa/ and /ativa/levada. Mount with:
//   <div id="ipmaWarnings" hidden></div>
//   <script src="/ativa/ipma.js" defer></script>
(function () {
  var FEED = 'https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json';
  var GRACE_MS = 60 * 60 * 1000;
  var AHEAD_MS = 24 * 60 * 60 * 1000;

  var ZONES = {
    MRM: { en: 'Mountains', pt: 'Regiões montanhosas' },
    MCN: { en: 'North coast', pt: 'Costa Norte' },
    MCS: { en: 'South coast', pt: 'Costa Sul' },
    MPS: { en: 'Porto Santo', pt: 'Porto Santo' },
  };
  var ORDER = ['MRM', 'MCN', 'MCS', 'MPS'];

  var TYPES = {
    'Trovoada': { en: 'Thunderstorm', pt: 'Trovoada', icon: '⛈' },
    'Precipitação': { en: 'Heavy rain', pt: 'Precipitação', icon: '🌧' },
    'Vento': { en: 'Wind', pt: 'Vento', icon: '💨' },
    'Agitação Marítima': { en: 'Rough sea', pt: 'Agitação marítima', icon: '🌊' },
    'Nevoeiro': { en: 'Fog', pt: 'Nevoeiro', icon: '🌫' },
    'Tempo Quente': { en: 'Heat', pt: 'Tempo quente', icon: '🌡' },
    'Tempo Frio': { en: 'Cold', pt: 'Tempo frio', icon: '🥶' },
    'Neve': { en: 'Snow', pt: 'Neve', icon: '❄️' },
  };

  var LEVELS = {
    red: { rank: 0, en: 'Red', pt: 'Vermelho', colour: '#d63a2e' },
    orange: { rank: 1, en: 'Orange', pt: 'Laranja', colour: '#e8741c' },
    yellow: { rank: 2, en: 'Yellow', pt: 'Amarelo', colour: '#d9a400' },
  };

  var DAYS = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  };

  // Both sides of every comparison are Madeira wall-clock times held in a Date
  // as if they were UTC. The arithmetic is then plain subtraction, and no browser
  // time zone can shift one side and not the other.
  function asWallClock(s) {
    return new Date(s.slice(0, 19) + 'Z');
  }
  function madeiraNow() {
    var parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Atlantic/Madeira',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(new Date());
    return asWallClock(parts.replace(' ', 'T'));
  }

  function hhmm(d) {
    return d.toISOString().slice(11, 16);
  }
  function sameDay(a, b) {
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
  }
  function when(start, end, now, lang) {
    var pt = lang === 'pt';
    var day = function (d) { return sameDay(d, now) ? '' : DAYS[lang][d.getUTCDay()] + ' '; };
    if (start > now) {
      return (pt ? 'a partir de ' : 'from ') + day(start) + hhmm(start);
    }
    return (pt ? 'até ' : 'until ') + day(end) + hhmm(end);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render(box, warnings) {
    var lang = (document.documentElement.lang || 'en') === 'pt' ? 'pt' : 'en';
    var now = madeiraNow();

    var live = warnings.filter(function (w) {
      if (!ZONES[w.idAreaAviso] || !LEVELS[w.awarenessLevelID]) return false;
      var start = asWallClock(w.startTime);
      var end = asWallClock(w.endTime);
      return end.getTime() + GRACE_MS > now.getTime() && start.getTime() - AHEAD_MS < now.getTime();
    });
    if (!live.length) {
      box.hidden = true;
      return;
    }

    // One line per (level, type, time window): "Thunderstorm — Mountains, North
    // coast · until 18:00" reads faster than the same storm listed three times.
    var groups = {};
    live.forEach(function (w) {
      var key = w.awarenessLevelID + '|' + w.awarenessTypeName + '|' + w.startTime + '|' + w.endTime;
      (groups[key] = groups[key] || { w: w, zones: [] }).zones.push(w.idAreaAviso);
    });
    var rows = Object.keys(groups).map(function (k) { return groups[k]; });
    rows.sort(function (a, b) {
      return LEVELS[a.w.awarenessLevelID].rank - LEVELS[b.w.awarenessLevelID].rank ||
        (a.w.startTime < b.w.startTime ? -1 : a.w.startTime > b.w.startTime ? 1 : 0);
    });

    var html = rows.map(function (g) {
      var w = g.w;
      var level = LEVELS[w.awarenessLevelID];
      var type = TYPES[w.awarenessTypeName] || { en: w.awarenessTypeName, pt: w.awarenessTypeName, icon: '⚠️' };
      var zones = g.zones
        .sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); })
        .map(function (z) { return ZONES[z][lang]; })
        .join(', ');
      var link = 'https://www.ipma.pt/' + lang + '/otempo/prev-sam/?p=' + g.zones[0];
      return '<a class="ipma-row" href="' + link + '" target="_blank" rel="noopener" style="--lvl:' + level.colour + '">' +
        '<span class="ipma-lvl">' + esc(level[lang]) + '</span>' +
        '<span class="ipma-what">' + type.icon + ' ' + esc(type[lang]) + ' — ' + esc(zones) + '</span>' +
        '<span class="ipma-when">' + esc(when(asWallClock(w.startTime), asWallClock(w.endTime), now, lang)) + '</span>' +
        '</a>';
    }).join('');

    box.innerHTML =
      '<div class="ipma-head">' + (lang === 'pt' ? 'Avisos IPMA' : 'IPMA warnings') + '</div>' + html;
    box.hidden = false;
  }

  function style() {
    if (document.getElementById('ipma-style')) return;
    var css = document.createElement('style');
    css.id = 'ipma-style';
    css.textContent =
      '#ipmaWarnings{margin:10px 0 0;display:flex;flex-direction:column;gap:6px}' +
      '#ipmaWarnings .ipma-head{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.65}' +
      '#ipmaWarnings .ipma-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:8px 12px;' +
      'border:1px solid var(--line,rgba(127,127,127,.3));border-left:4px solid var(--lvl);border-radius:10px;' +
      'color:inherit;text-decoration:none;font-size:13.5px;line-height:1.35}' +
      '#ipmaWarnings .ipma-row:hover{background:rgba(127,127,127,.08)}' +
      '#ipmaWarnings .ipma-lvl{font-weight:700;color:var(--lvl);font-size:12px;text-transform:uppercase;letter-spacing:.04em}' +
      '#ipmaWarnings .ipma-what{font-weight:600}' +
      '#ipmaWarnings .ipma-when{opacity:.7;margin-left:auto;white-space:nowrap}';
    document.head.appendChild(css);
  }

  var feed = fetch(FEED)
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) { return Array.isArray(data) ? data : []; });

  // For other scripts on the page: warnings above green that are in force now or
  // due to start before `untilWallClock` (a Madeira wall-clock Date, default: now
  // + 24 h). Resolves to [] if IPMA cannot be reached — callers treat that as
  // "unknown", which is not the same as "calm", and must not say otherwise.
  window.AtivaIPMA = {
    ZONES: ZONES,
    LEVELS: LEVELS,
    TYPES: TYPES,
    madeiraNow: madeiraNow,
    asWallClock: asWallClock,
    live: function (untilWallClock) {
      return feed.then(function (all) {
        var now = madeiraNow().getTime();
        var until = untilWallClock ? untilWallClock.getTime() : now + AHEAD_MS;
        return all.filter(function (w) {
          return ZONES[w.idAreaAviso] && LEVELS[w.awarenessLevelID] &&
            asWallClock(w.endTime).getTime() + GRACE_MS > now &&
            asWallClock(w.startTime).getTime() < until;
        });
      }).catch(function () { return []; });
    },
  };

  function start() {
    var box = document.getElementById('ipmaWarnings');
    if (!box) return;
    style();
    var cache = null;
    feed
      .then(function (data) {
        cache = data;
        render(box, cache);
      })
      .catch(function () { box.hidden = true; });

    // The pages switch language in place; follow them without refetching.
    new MutationObserver(function () { if (cache) render(box, cache); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
