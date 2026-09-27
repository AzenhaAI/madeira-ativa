// Shared trail logic for the Madeira Ativa pages: difficulty and walking time,
// the IPMA zone a trail walks in, how a warning weighs on it, and the ranking
// behind "where to go today?". Used by /ativa/levada and /ativa/ask — one copy,
// so the list on one page and the answer on the other cannot disagree.
//
// Plain functions on the global scope, loaded synchronously before each page's
// own script. Language-specific wording stays in the pages.

var DIFF = [
  { max: 8,   level: 1, en: 'Easy',     pt: 'Fácil',    color: '#2e9e5b' },
  { max: 15,  level: 2, en: 'Moderate', pt: 'Moderado', color: '#c8912f' },
  { max: 24,  level: 3, en: 'Hard',     pt: 'Difícil',  color: '#d2691e' },
  { max: 1e9, level: 4, en: 'Severe',   pt: 'Severo',   color: '#b23a2e' },
];
function effort(l) { return (l.distance_km || 0) + (l.ascent_m || 0) / 100; }
// Official difficulty first — Visit Madeira's, the one on the trailhead board.
// Ours is computed from distance and climb, and the climb is only as good as the
// direction OSM happens to draw the route in: PR 1.3 is drawn uphill, runs
// downhill, and we called it Hard where the board says Moderate. The computed
// value stays for the trails with no official page.
var OFFICIAL_DIFF = { easy: 0, moderate: 1, difficult: 2, hard: 2, 'very difficult': 3 };
function difficulty(l) {
  var o = l.official && l.official.difficulty && OFFICIAL_DIFF[l.official.difficulty.toLowerCase()];
  if (o != null) return DIFF[o];
  var e = effort(l); for (var i = 0; i < DIFF.length; i++) if (e < DIFF[i].max) return DIFF[i]; return DIFF[3];
}
// Official walking time, "5 h" / "1 h 30".
function walkTime(l) {
  var m = l.official && l.official.duration_min;
  if (!m) return '';
  var h = Math.floor(m / 60), r = m % 60;
  return (h ? h + ' h' : '') + (h && r ? ' ' : '') + (r ? (r < 10 ? '0' + r : r) + (h ? '' : ' min') : '');
}

// Which IPMA warning zone a trail walks in. IPMA splits Madeira into the
// mountains, the north coast and the south coast, and Porto Santo is its own
// zone. A levada that climbs above 800 m spends its hours in the mountain zone,
// whatever coast it starts from; below that, the central ridge decides — it runs
// east–west at about 32.755° N.
function trailZone(l) {
  if (l.island === 'Porto Santo') return 'MPS';
  var top = (l.profile && l.profile.length) ? Math.max.apply(null, l.profile) : 0;
  if (top >= 800) return 'MRM';
  return l.center[0] >= 32.755 ? 'MCN' : 'MCS';
}

// How much an IPMA warning should push a trail down today's list. The weather
// score runs to about 150 on a wet, windy day; a yellow thunderstorm warning on
// the zone is worth more than any forecast rain, because IPMA issues one when it
// expects lightning, and a ridge is the wrong place to be. Heat weighs by climb.
var WARN_WEIGHT = {
  'Trovoada':          { yellow: 90, orange: 220, red: 1000 },
  'Precipitação':      { yellow: 60, orange: 160, red: 1000 },
  'Vento':             { yellow: 45, orange: 130, red: 1000 },
  'Neve':              { yellow: 60, orange: 160, red: 1000 },
  'Tempo Frio':        { yellow: 30, orange: 90,  red: 400 },
  'Nevoeiro':          { yellow: 25, orange: 60,  red: 200 },
  'Tempo Quente':      { yellow: 12, orange: 50,  red: 300 },
  'Agitação Marítima': { yellow: 8,  orange: 25,  red: 100 },
};

function warnFor(l, warnings) {
  var zone = trailZone(l);
  var best = {};  // type -> the highest level in force for this zone
  var rank = { red: 0, orange: 1, yellow: 2 };
  warnings.forEach(function (w) {
    if (w.idAreaAviso !== zone) return;
    // Sea state warns about the shore, not about a path at altitude.
    if (w.awarenessTypeName === 'Agitação Marítima' && zone === 'MRM') return;
    var cur = best[w.awarenessTypeName];
    if (!cur || rank[w.awarenessLevelID] < rank[cur]) best[w.awarenessTypeName] = w.awarenessLevelID;
  });
  var types = Object.keys(best);
  if (!types.length) return null;
  var penalty = 0, top = 'yellow';
  types.forEach(function (t) {
    var weights = WARN_WEIGHT[t] || { yellow: 20, orange: 60, red: 300 };
    var w = weights[best[t]] || 0;
    if (t === 'Tempo Quente') w += Math.min(l.ascent_m || 0, 1200) / 40;
    penalty += w;
    if (rank[best[t]] < rank[top]) top = best[t];
  });
  // Severe = worth leaving a trail out of the "different difficulty" picks for.
  var severe = penalty >= 45 || top !== 'yellow';
  return { zone: zone, level: top, types: types, penalty: penalty, severe: severe };
}

// ipma.js is deferred; this page's data can arrive before it has run.
function ipmaReady() {
  return new Promise(function (resolve) {
    function go() { resolve(window.AtivaIPMA || null); }
    if (window.AtivaIPMA || document.readyState !== 'loading') go();
    else document.addEventListener('DOMContentLoaded', go);
  });
}

// Where to go today: open Madeira trails ranked by the forecast along each route
// between 09:00 and 17:00 (rain, wind), IFCN status and IPMA warnings in force
// for the walking window. Resolves to up to three picks; rejects if the weather
// service cannot be reached, so the caller can say so instead of guessing.
//
// Madeira only. Porto Santo is two and a half hours away by ferry, so it is not
// an answer to "where to go today" — and on a day when IPMA warns every Madeira
// zone of thunderstorms and Porto Santo only of heat, it would otherwise take
// all three places. On such a day the picks are the least bad Madeira trails,
// each carrying its warning, which is the honest answer.
function rankToday(levadas) {
  var cands = levadas.filter(function (l) {
    return l.status !== 'closed' && l.center && l.island !== 'Porto Santo';
  });
  if (!cands.length) return Promise.resolve([]);
  var lats = cands.map(function (l) { return l.center[0].toFixed(4); }).join(',');
  var lons = cands.map(function (l) { return l.center[1].toFixed(4); }).join(',');
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lats + '&longitude=' + lons +
    '&hourly=temperature_2m,precipitation_probability,windspeed_10m,weathercode' +
    '&forecast_days=1&timezone=Europe%2FLisbon';
  var warnings = ipmaReady().then(function (api) {
    if (!api) return [];
    var day = api.madeiraNow().toISOString().slice(0, 10);
    return api.live(api.asWallClock(day + 'T17:00:00'));
  });
  return fetch(url).then(function (r) { return r.json(); }).then(function (res) {
    return warnings.then(function (w) { return [res, w]; });
  }).then(function (both) {
    var res = both[0], warns = both[1];
    var arr = Array.isArray(res) ? res : [res];
    var scored = cands.map(function (l, i) {
      var h = (arr[i] || {}).hourly || {};
      var rain = 0, wind = 0, temp = 20, code = 0, n = 0;
      for (var k = 9; k <= 17; k++) {
        if (!h.temperature_2m || h.temperature_2m[k] == null) continue;
        rain += h.precipitation_probability ? (h.precipitation_probability[k] || 0) : 0;
        wind = Math.max(wind, h.windspeed_10m ? (h.windspeed_10m[k] || 0) : 0);
        if (k === 13) { temp = h.temperature_2m[k]; code = h.weathercode ? (h.weathercode[k] || 0) : 0; }
        n++;
      }
      rain = n ? Math.round(rain / n) : 50;
      var warn = warnFor(l, warns);
      var score = rain * 1.3 + wind * 0.7 + (l.status === 'partial' ? 30 : 0) + (warn ? warn.penalty : 0);
      return { l: l, rain: rain, wind: wind, temp: temp, code: code, score: score, warn: warn };
    }).sort(function (a, b) { return a.score - b.score; });
    // Top three, one of each difficulty where possible — but never let that
    // variety rule pick a trail under a serious warning just to fill a level.
    var picks = [], used = {};
    scored.forEach(function (p) {
      if (picks.length >= 3 || (p.warn && p.warn.severe)) return;
      var lv = difficulty(p.l).level;
      if (!used[lv]) { used[lv] = 1; picks.push(p); }
    });
    scored.forEach(function (p) { if (picks.length < 3 && picks.indexOf(p) === -1) picks.push(p); });
    return picks;
  });
}

// ---------------------------------------------------------------- by bus

// A trail is reachable by bus when a mapped line passes one of its ends or a
// Funchal urban stop stands near one. 15 of Madeira's 40 today.
function reachableByBus(l) {
  return ((l.access && l.access.ends) || []).some(function (e) {
    return (e.lines && e.lines.length) || e.bus;
  });
}

function madeiraClock() {
  var s = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Atlantic/Madeira', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  return { date: s.slice(0, 10), time: s.slice(11, 16) };
}

// The next departures from an end's urban stop: today's remaining ones, or
// tomorrow's first if the day is over. [{day, time, line, to}] — empty when the
// timetable in the file does not reach that far (it covers a week from its build).
function nextBuses(departures, n) {
  if (!departures) return [];
  var now = madeiraClock(), out = [];
  Object.keys(departures).sort().forEach(function (d) {
    if (d < now.date || out.length >= n) return;
    departures[d].forEach(function (x) {
      if (out.length >= n) return;
      if (d === now.date && x[0] < now.time) return;
      out.push({ day: d, today: d === now.date, time: x[0], line: x[1], to: x[2] });
    });
  });
  return out;
}

// ---------------------------------------------------------- on the path

// What the path itself is like, from OpenStreetMap by length (see
// scripts/build_trail_exposure.py): railing, narrow ledge, tunnels, demanding
// ground. Returns short phrases in the reader's language; nothing is said about
// what was not mapped except how much that is.
function pathFacts(x, lang) {
  if (!x || !x.length_km) return [];
  var pt = lang === 'pt', out = [];
  if (x.railing_pct || x.no_railing_pct) {
    var unknown = Math.max(0, 100 - x.railing_pct - x.no_railing_pct);
    out.push(pt
      ? 'Corrimão registado em ' + x.railing_pct + '% do percurso, sem corrimão em ' + x.no_railing_pct + '%, desconhecido em ' + unknown + '%'
      : 'Railing recorded on ' + x.railing_pct + '% of the route, none on ' + x.no_railing_pct + '%, unknown on ' + unknown + '%');
  } else {
    out.push(pt ? 'Sem registo de corrimão em nenhum troço' : 'No railing recorded on any section');
  }
  if (x.narrow_pct) out.push(pt ? x.narrow_pct + '% do trilho com 0,5 m de largura ou menos' : x.narrow_pct + '% of the path 0.5 m wide or less');
  if (x.tunnels) out.push(pt ? x.tunnels + (x.tunnels > 1 ? ' túneis' : ' túnel') + ' (' + x.tunnel_m + ' m) — leve lanterna'
                             : x.tunnels + (x.tunnels > 1 ? ' tunnels' : ' tunnel') + ' (' + x.tunnel_m + ' m) — bring a torch');
  if (x.demanding_pct) out.push(pt ? x.demanding_pct + '% em terreno de montanha exigente' : x.demanding_pct + '% demanding mountain terrain');
  return out;
}
