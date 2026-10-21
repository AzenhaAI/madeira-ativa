// Madeira Ativa — page scripts for /ativa/. One file, one init per page
// (body[data-page]). Everything renders from the same public files the live
// site uses, and re-renders when the language changes.
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var esc = MA.esc, t = MA.t;
  var page = document.body.dataset.page;

  var KINDS = {
    trail: ['Trail', 'Trail'], road: ['Road', 'Estrada'], orienteering: ['Orient', 'Orientação'], cycling: ['Bike', 'Bike'],
    kids: ['Kids', 'Crianças'], pro: ['Pro', 'Pro'], swim: ['Swim', 'Natação'], festivals: ['Festa', 'Festa'], other: ['Other', 'Outros'],
  };
  var CATS = {
    concert: ['Concerts', 'Concertos'], festival: ['Festivals', 'Festivais'], arraial: ['Arraiais', 'Arraiais'], theatre: ['Theatre', 'Teatro'],
    exhibition: ['Exhibitions', 'Exposições'], cinema: ['Cinema', 'Cinema'], dance: ['Dance', 'Dança'], folklore: ['Folklore', 'Folclore'],
    family: ['Family', 'Família'], workshop: ['Workshops', 'Oficinas'], religious: ['Religious', 'Religioso'], talk: ['Talks', 'Palestras'],
  };
  function kindOf(e) { return e.event_type === 'orienteering' ? 'orienteering' : e.mode; }
  // A culture event shows what it is (Concert, Exhibition…), not just "Festa";
  // a sport event in the festas feed (a race) shows "Sport".
  var CAT1 = { concert: ['Concert', 'Concerto'], festival: ['Festival', 'Festival'], arraial: ['Arraial', 'Arraial'], theatre: ['Theatre', 'Teatro'],
    exhibition: ['Exhibition', 'Exposição'], cinema: ['Cinema', 'Cinema'], dance: ['Dance', 'Dança'], folklore: ['Folklore', 'Folclore'],
    family: ['Family', 'Família'], workshop: ['Workshop', 'Oficina'], religious: ['Religious', 'Religioso'], talk: ['Talk', 'Palestra'],
    market: ['Market', 'Mercado'], show: ['Show', 'Espetáculo'], sport: ['Sport', 'Desporto'], culture: ['Culture', 'Cultura'] };
  function kindLabel(e) {
    if (e.mode === 'festivals' && CAT1[e.category]) return t(CAT1[e.category][0], CAT1[e.category][1]);
    var k = KINDS[kindOf(e)]; return k ? t(k[0], k[1]) : '';
  }
  function statusPill(s) {
    return s === 'closed' ? '<span class="pill bad">' + t('closed', 'encerrado') + '</span>'
      : s === 'partial' ? '<span class="pill warn">' + t('partly open', 'parcial') + '</span>'
      : '<span class="pill ok">' + t('open', 'aberto') + '</span>';
  }
  // Objects keyed en/pt from the shared scripts: German falls back to the English.
  function pick(o) { return o ? (o[MA.lang()] || o.en || '') : ''; }
  function diff(l) { var o = l.official || {}; return o.difficulty ? MA.t(o.difficulty, DIFF_PT[o.difficulty] || o.difficulty) : (window.difficulty ? pick(difficulty(l)) : ''); }
  var DIFF_PT = { 'Easy': 'Fácil', 'Moderate': 'Moderado', 'Difficult': 'Difícil', 'Very difficult': 'Muito difícil' };
  // Visit Madeira writes durations in English ("5 hours", "6:30 hours").
  function dur(x) {
    if (!x) return '';
    if (MA.lang() === 'pt') return String(x).replace(/\bhours\b/g, 'horas').replace(/\bhour\b/g, 'hora').replace(/\bminutes\b/g, 'minutos');
    if (MA.lang() === 'de') return String(x).replace(/\bhours?\b/g, 'Std.').replace(/\bminutes\b/g, 'Min.');
    if (MA.lang() === 'ru') return String(x).replace(/\bhours?\b/g, 'ч').replace(/\bminutes\b/g, 'мин')
    return x;
  }
  function time(l) { var o = l.official || {}; return dur(o.duration); }

  // The registration window a race publishes (lap2go): one short line, only
  // while it matters — before it closes, or "full" while it is still open.
  function regLine(e) {
    var r = e.registration; if (!r || !r.closes) return '';
    var today = MA.today(), c = MA.day(r.closes), o = r.opens ? MA.day(r.opens) : null;
    var days = Math.round((new Date(r.closes + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 864e5);
    var txt, cls = 'reg';
    if (r.status === 'closed' || days < 0) { txt = t('Registration closed', 'Inscrições encerradas'); cls += ' off'; }
    else if (r.status === 'soon' && o) txt = fmt(t('Registration opens {0} {1}', 'Inscrições abrem a {0} {1}'), o.d, o.m);
    else if (r.status === 'full') { txt = t('Sold out', 'Esgotado'); cls += ' off'; }
    else if (days <= 7) { txt = days === 0 ? t('Registration closes today', 'Inscrições terminam hoje') : fmt(t('Registration closes in {0} days', 'Inscrições terminam em {0} dias'), days); cls += ' hot'; }
    else txt = fmt(t('Registration until {0} {1}', 'Inscrições até {0} {1}'), c.d, c.m);
    return '<span class="' + cls + '">' + esc(txt) + '</span>';
  }
  function fmt(s) { var a = arguments; return s.replace(/\{(\d)\}/g, function (_, i) { return a[+i + 1]; }); }
  function eventRow(e) {
    var d = MA.day(e.date);
    var price = /^(free|grátis|gratuito|entrada livre)$/i.test(e.price || '') ? t('Free', 'Grátis') : e.price;
    var meta = [e.time, e.location, price].filter(Boolean).join(' · ');
    return '<a class="row" href="' + esc(e.url || '#') + '"' + (e.url ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<div class="d"><b>' + d.d + '</b><span>' + d.m + '</span></div>' +
      '<div class="t"><b>' + esc(e.name) + '</b><span>' + esc(d.w + (meta ? ' · ' + meta : '')) + '</span>' + regLine(e) + '</div>' +
      '<div class="k">' + esc(kindLabel(e)) + '</div></a>';
  }
  function trailRow(l, extra) {
    var code = l.code.replace(/^PR\s*/, '');
    var bits = [l.distance_km ? l.distance_km + ' km' : '', time(l), diff(l)].filter(Boolean).join(' · ');
    return '<a class="row" href="' + MA.trailUrl(l.code) + (l.island === 'Porto Santo' ? '&island=ps' : '') + '">' +
      '<div class="d"><b>' + esc(code) + '</b><span>' + (l.island === 'Porto Santo' ? 'PS' : 'PR') + '</span></div>' +
      '<div class="t"><b>' + esc(l.name) + '</b><span>' + esc(extra || bits) + '</span></div>' +
      '<div class="k">' + statusPill(l.status) + '</div></a>';
  }
  // A ranked pick: the weather on the trail leads (icon, temperature at the
  // trail's height, rain, wind); code and name follow, so "23" is never read as 23°.
  function pickRow(q) {
    var l = q.l;
    var bits = [q.rain + '% ' + t('rain', 'chuva'), Math.round(q.wind) + ' km/h', time(l), diff(l)].filter(Boolean).join(' · ');
    return '<a class="row pick" href="' + MA.trailUrl(l.code) + '">' +
      '<div class="d wx"><b>' + MA.emo(q.code) + '</b><span class="tp ' + (q.temp < 10 ? 't0' : q.temp < 15 ? 't1' : q.temp < 20 ? 't2' : q.temp < 25 ? 't3' : 't4') + '">' + Math.round(q.temp) + '°</span></div>' +
      '<div class="t"><b>' + esc(l.code + ' · ' + l.name) + '</b><span>' + esc(bits) + '</span></div>' +
      '<div class="k">' + statusPill(l.status) + '</div></a>';
  }
  function dedupe(list) {
    var seen = {};
    return list.filter(function (e) { var k = e.date + '|' + e.name; if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function chips(el, items, current, onPick) {
    el.innerHTML = items.map(function (it) {
      return '<button type="button" class="chip' + (it[0] === current ? ' on' : '') + '" data-v="' + esc(it[0]) + '">' + esc(it[1]) + '</button>';
    }).join('');
    el.onclick = function (e) { var b = e.target.closest('.chip'); if (b) onPick(b.dataset.v); };
  }
  function rerender(fn) { fn(); MA.onLang(fn); }

  // ------------------------------------------------------------ home
  function home() {
    var today = MA.today(), data = {};
    Promise.all([
      MA.get('/ativa/api/om/forecast?latitude=32.648,32.735,32.698,32.867&longitude=-16.908,-16.929,-16.774,-17.169&elevation=50,1818,58,20&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&daily=sunrise,sunset&forecast_days=1&timezone=Atlantic%2FMadeira'),
      MA.get('/ativa/api/om/marine?latitude=32.63&longitude=-16.92&current=wave_height,sea_surface_temperature&timezone=Atlantic%2FMadeira'),
      MA.get('/ativa/trails_status.json'), MA.get('/ativa/cruise_calls.json'),
      MA.get('https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json'),
      MA.get('/ativa/events.json'), MA.get('/ativa/levadas.json'), MA.get('/ativa/island.json'),
    ]).then(function (r) {
      data = { wx: r[0] || [], sea: r[1] && r[1].current, st: r[2], ships: r[3], warn: r[4] || [], ev: r[5], lev: r[6], isl: r[7] };
      rerender(paint);
      if (data.lev && window.rankToday) rankToday(data.lev.levadas).then(function (p) { data.picks = p; paintTrails(); paint(); }).catch(paintTrails);
      else paintTrails();
    });
    // Temperature on one scale for air and sea: cool blue to hot red.
    function tcls(v) { return v < 10 ? 't0' : v < 15 ? 't1' : v < 20 ? 't2' : v < 25 ? 't3' : v < 30 ? 't4' : 't5'; }
    function cell(icon, label, body, cls, href, ext) {
      var inner = '<span class="ni" aria-hidden="true">' + icon + '</span><div class="nb"><div class="lbl">' + label + (ext ? ' ↗' : '') + '</div>' + body + '</div>';
      return '<div class="nc' + (cls ? ' ' + cls : '') + '">' + (href ? '<a class="cell-link" href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + inner + '</a>' : inner) + '</div>';
    }
    var CAMS = [['Pico do Arieiro', 'https://www.netmadeira.com/webcams-madeira/pico-do-arieiro', 'Arieiro'], ['Rabaçal', 'https://www.netmadeira.com/webcams-madeira/rabacal-madeira', 'Rabaçal'],
      ['Achada do Teixeira', 'https://www.netmadeira.com/webcams-madeira/achada-do-teixeira', 'Teixeira']];

    // ---- the face: a photo by the hour, the island with the weather on it,
    // and what today is good for. Same rules as the app.
    function sky(code) { if (code == null) return ''; return code >= 61 ? t('rain', 'chuva') : code >= 51 ? t('showers', 'aguaceiros') : code >= 45 ? t('fog', 'nevoeiro') : code === 3 ? t('cloud', 'nublado') : code >= 1 ? t('clear', 'limpo') : t('sunny', 'sol'); }
    function hm(iso) { return iso && iso.length >= 16 ? iso.slice(11, 16) : ''; }
    function hours(iso) { return iso ? +iso.slice(11, 13) + (+iso.slice(14, 16)) / 60 : null; }
    function dayPart() {
      var d0 = data.wx[0] && data.wx[0].daily, sr = hours(d0 && d0.sunrise && d0.sunrise[0]) || 7.5, ss = hours(d0 && d0.sunset && d0.sunset[0]) || 18.5;
      // Madeira's clock as numbers; the earlier "02:22" string made an
      // Invalid Date and every hour read as evening.
      var hp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Atlantic/Madeira', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':');
      var h = (+hp[0] % 24) + (+hp[1]) / 60;
      if (h < sr - 0.5 || h >= ss + 1.2) return 'night';
      if (h < 12) return 'morning';
      if (h < ss - 1) return 'afternoon';
      return 'evening';
    }
    // Photo pools by the time of day and the sky; same as the app
    // (lib/home_face.dart, _heroPools). Wide, so pictures rarely repeat.
    var HERO = {
      morning: {
        clear: ['morning_umbrella', 'morning_rays', 'day_rocks', 'ps_ferry', 'day_cloudfall_village', 'ps_ferry_wake', 'day_levada'],
        cloud: ['morning_funchal_sea', 'cloud_ridge', 'morning_rays', 'cloud_sea', 'day_cloudfall_ridge', 'day_cloudfall_village', 'ps_beach_clouds'],
        fog: ['fog_valley', 'fog_heath', 'cloud_sea', 'cloud_eucalyptus', 'day_levada'],
        rain: ['morning_funchal_sea', 'grey_sea', 'rain_yachts', 'fog_valley', 'day_levada']
      },
      afternoon: {
        clear: ['day_terraces', 'day_tallship', 'day_plane', 'day_valley', 'day_rocks', 'cloud_sea', 'ps_ferry', 'ps_ferry_wake', 'ps_beach_clouds', 'day_cloudfall_village', 'day_cloudfall_ridge', 'day_levada'],
        cloud: ['cloud_sea', 'cloud_ridge', 'day_valley', 'day_terraces', 'day_cloudfall_village', 'day_cloudfall_ridge', 'ps_beach_clouds', 'cloud_eucalyptus', 'day_levada', 'rain_yachts'],
        fog: ['fog_valley', 'fog_heath', 'cloud_eucalyptus', 'cloud_sea', 'day_levada'],
        rain: ['rain_yachts', 'grey_sea', 'fog_valley', 'fog_heath', 'day_levada']
      },
      evening: {
        clear: ['evening_banana', 'evening_redsun', 'dusk_islets'], cloud: ['dusk_islets', 'evening_banana', 'evening_redsun'],
        fog: ['dusk_islets', 'evening_banana'], rain: ['dusk_islets', 'evening_banana']
      },
      night: {
        clear: ['night_sea', 'evening_redsun', 'dusk_islets'], cloud: ['night_sea', 'dusk_islets'],
        fog: ['night_sea', 'dusk_islets'], rain: ['night_sea', 'dusk_islets']
      }
    };
    function paintHero() {
      var el = $('#hero'); if (!el) return;
      var cw = data.wx[0] && data.wx[0].current, sw = data.wx[1] && data.wx[1].current;
      var cc = cw ? cw.weather_code : 0, sc = sw ? sw.weather_code : 0;
      var skyNow = cc >= 51 ? 'rain' : (cc >= 45 && cc <= 48) || (sc >= 45 && sc <= 48) ? 'fog' : cc === 3 || sc === 3 ? 'cloud' : 'clear';
      var part = dayPart();
      var pool = HERO[part][skyNow];
      var doy = Math.floor((new Date(today + 'T00:00:00Z') - new Date(today.slice(0, 4) + '-01-01T00:00:00Z')) / 864e5);
      var pi = { morning: 0, afternoon: 1, evening: 2, night: 3 }[part];
      var photo = pool[(doy + pi * 3) % pool.length];
      var greet = part === 'morning' ? t('Good morning', 'Bom dia') : part === 'afternoon' ? t('Good afternoon', 'Boa tarde') : part === 'evening' ? t('Good evening', 'Boa tarde') : t('Good night', 'Boa noite');
      var c = data.wx[0] && data.wx[0].current, d0 = data.wx[0] && data.wx[0].daily, dd = MA.day(today);
      var arr = (data.lev && data.lev.levadas) || [], open = arr.filter(function (x) { return x.status === 'open'; }).length;
      var parts = [dd.w + ' ' + dd.d + ' ' + dd.m];
      if (c) parts.push(Math.round(c.temperature_2m) + '° ' + t('in Funchal', 'no Funchal'));
      if (part === 'morning' && d0) parts.push(t('sunrise', 'nascer do sol') + ' ' + hm(d0.sunrise[0]));
      if (part === 'evening' && d0) parts.push(t('sunset', 'pôr do sol') + ' ' + hm(d0.sunset[0]));
      if (open && part !== 'evening') parts.push(MA.n(open, 'levadas open', 'levadas abertas'));
      el.innerHTML = '<img src="/ativa/hero/' + photo + '.jpg" alt="Madeira" loading="eager"><div class="ov"><b>' + greet + '</b><small>' + esc(parts.join(' · ')) + '</small></div>';
      el.hidden = false;
    }
    function scores() {
      var c = data.wx[0] && data.wx[0].current, p = data.wx[1] && data.wx[1].current, a = data.wx[2] && data.wx[2].current, sea = data.sea;
      var sc = p ? p.weather_code : 0, cc = c ? c.weather_code : 0, rain = sc >= 51 || cc >= 51, fog = sc >= 45 && sc <= 48, cloudRidge = sc === 3 || fog;
      var gusts = a ? a.wind_gusts_10m || 0 : 0, cross = a && a.wind_gusts_10m != null ? a.wind_gusts_10m * Math.abs(Math.sin((a.wind_direction_10m - 50) * Math.PI / 180)) : null;
      var severe = data.warn.some(function (x) { return (x.awarenessLevelID === 'orange' || x.awarenessLevelID === 'red') && new Date(x.endTime) > new Date(); });
      var cl = function (v) { return Math.max(1, Math.min(5, v)); }, out = [];
      var h = 5, hw = [];
      if (rain) { h -= 3; hw.push(t('wet on the trails', 'molhado nas veredas')); } else hw.push(t('dry', 'seco'));
      if (p && p.temperature_2m < 5) { h -= 1; hw.push(t('cold on the summit', 'frio no cume')); }
      if (fog) { h -= 1; hw.push(t('ridge in cloud', 'cumeada nas nuvens')); }
      if (gusts > 55) { h -= 1; hw.push(t('gusts', 'rajadas') + ' ' + Math.round(gusts)); }
      if (severe) { h -= 2; hw.push(t('IPMA warning', 'aviso IPMA')); }
      out.push(['🥾', t('Hiking', 'Caminhadas'), cl(h), hw.join(' · ')]);
      var st = sea ? sea.sea_surface_temperature : 21, wv = sea ? sea.wave_height : 1, b = st >= 22 ? 4 : st >= 20 ? 3 : 2, bw = [t('sea', 'mar') + ' ' + st.toFixed(1) + '°'];
      if (cc <= 1 && !rain) b += 1;
      if (wv > 2.5) { b -= 2; bw.push(t('sea too rough', 'mar demasiado agitado')); } else { if (wv > 1.5) b -= 1; bw.push(t('waves', 'ondas') + ' ' + wv.toFixed(1) + ' m'); }
      if (rain) { b -= 2; bw.push(t('rain', 'chuva')); }
      if (c && c.wind_speed_10m > 30) { b -= 1; bw.push(t('strong wind', 'vento forte')); }
      out.push(['🏖', t('Beach', 'Praia'), cl(b), bw.join(' · ')]);
      var v = sc <= 1 ? 5 : sc === 2 ? 3 : 1, vw = [];
      if (rain) { v = 1; vw.push(t('rain', 'chuva')); } else if (cloudRidge) { vw.push(t('ridge in cloud', 'cumeada nas nuvens'), t('try the coast', 'tente a costa')); } else if (sc === 2) vw.push(t('cloud', 'nublado')); else vw.push(t('ridge clear', 'cumeada limpa'));
      out.push(['👁', t('Viewpoints', 'Miradouros'), cl(v), vw.join(' · ')]);
      var fl = cross == null ? 4 : cross >= 28 ? 1 : cross >= 20 ? 3 : 5, fw = [];
      if (gusts > 60) fl = 1;
      if (cross == null) fw.push(t('calm', 'calmo')); else if (cross >= 28) fw.push(t('crosswind over the limit', 'vento cruzado acima do limite'), t('diversions likely', 'desvios prováveis')); else if (cross >= 20) fw.push(t('gusts', 'rajadas') + ' ' + Math.round(gusts), t('delays', 'atrasos')); else fw.push(t('calm for landings', 'calmo para aterrar'));
      out.push(['✈', t('Flights', 'Voos'), cl(fl), fw.join(' · ')]);
      return out;
    }
    function paintFace() {
      var el = $('#face'), isl = data.isl, c = data.wx[0] && data.wx[0].current; if (!el || !isl || !c) return;
      var p = data.wx[1] && data.wx[1].current, a = data.wx[2] && data.wx[2].current, nn = data.wx[3] && data.wx[3].current, sea = data.sea;
      var P = isl.pts, W = isl.w, H = isl.h, padX = 170, padT = 64, padB = 96;
      var cloudy = p && (p.weather_code === 3 || (p.weather_code >= 45 && p.weather_code <= 48) || p.weather_code >= 51);
      var dark = document.documentElement.classList.contains('dark');
      var land1 = dark ? '#2E7A5E' : '#9CCBB4', land2 = dark ? '#1E4A3B' : '#CFE6DB', seaC = dark ? '#6FA8D6' : '#2F6F9E', cloudC = dark ? '#5A6065' : '#B9BEC2', green = dark ? '#7FC79C' : '#0F6E56', terra = dark ? '#E0885F' : '#993C1D', ink = dark ? '#E7ECE6' : '#15201A';
      var s = '<svg viewBox="' + (-padX) + ' ' + (-padT) + ' ' + (W + 2 * padX) + ' ' + (H + padT + padB) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + t('The island now', 'A ilha agora') + '">';
      s += '<defs><clipPath id="islc"><path d="' + isl.path + '"/></clipPath><linearGradient id="islg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + land1 + '"/><stop offset="1" stop-color="' + land2 + '"/></linearGradient></defs>';
      s += '<path d="' + isl.path + '" fill="none" stroke="' + seaC + '" stroke-opacity=".22" stroke-width="40" stroke-linejoin="round"/>';
      s += '<path d="' + isl.path + '" fill="url(#islg)" stroke="' + green + '" stroke-width="5" stroke-linejoin="round"/>';
      if (cloudy) s += '<g clip-path="url(#islc)"><path d="M-100 -50 L1100 -50 L1100 150 Q 900 215 700 190 Q 500 165 300 230 Q 150 270 -100 240 Z" fill="' + cloudC + '" opacity=".55"/><path d="M-100 -50 L1100 -50 L1100 60 Q 800 120 500 90 Q 250 60 -100 120 Z" fill="' + cloudC + '" opacity=".5"/></g>';
      s += '<path d="M' + P.arieiro[0] + ' ' + P.arieiro[1] + ' L' + P.picoruivo[0] + ' ' + P.picoruivo[1] + '" stroke="' + ink + '" stroke-opacity=".35" stroke-width="5" stroke-dasharray="10 12"/>';
      var dot = function (q, col, r) { r = r || 24; return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (r + 14) + '" fill="' + col + '" opacity=".18"/><circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + r + '" fill="' + col + '" stroke="' + (dark ? '#171E19' : '#fff') + '" stroke-width="7"/>'; };
      var lab = function (x, y, big, sub, anchor, col, act) { anchor = anchor || 'start'; var da = act ? ' data-act="' + act + '" style="cursor:pointer' + (col ? ';fill:' + col : '') + '"' : (col ? ' style="fill:' + col + '"' : ''); return '<text x="' + x + '" y="' + y + '" class="big" text-anchor="' + anchor + '"' + da + '>' + esc(big) + '</text><text x="' + x + '" y="' + (y + 31) + '" class="sub" text-anchor="' + anchor + '"' + (act ? ' data-act="' + act + '" style="cursor:pointer"' : '') + '>' + esc(sub) + '</text>'; };
      var f = P.funchal, ap = P.airport, pm = P.portomoniz, ar = P.arieiro;
      s += dot(f, green) + lab(f[0], f[1] + 74, Math.round(c.temperature_2m) + '°', 'Funchal · ' + Math.round(c.wind_speed_10m) + ' km/h', 'middle', null, 'day');
      if (p) s += dot(ar, ink, 20) + lab(ar[0] + 36, ar[1] + 4, Math.round(p.temperature_2m) + '°', 'Pico do Arieiro · ' + sky(p.weather_code), null, null, 'arieiro');
      if (a && a.wind_gusts_10m != null) { var cross = a.wind_gusts_10m * Math.abs(Math.sin((a.wind_direction_10m - 50) * Math.PI / 180)); s += dot(ap, terra) + lab(ap[0] + 44, ap[1] + 18, '✈ ' + Math.round(a.wind_speed_10m) + ' / ' + Math.round(a.wind_gusts_10m), cross >= 28 ? t('diversions likely', 'desvios prováveis') : cross >= 20 ? t('gusty', 'rajadas') + ' · ' + t('delays', 'atrasos') : t('calm for landings', 'calmo para aterrar'), null, null, 'air'); }
      if (nn) s += dot(pm, seaC, 20) + lab(pm[0] + 36, pm[1] + 54, Math.round(nn.temperature_2m) + '°', 'Porto Moniz · ' + sky(nn.weather_code));
      if (sea) s += lab(f[0] - 330, f[1] + 64, '🌊 ' + sea.sea_surface_temperature.toFixed(1) + '°', t('sea', 'mar') + ' · ' + t('waves', 'ondas') + ' ' + sea.wave_height.toFixed(1) + ' m', 'middle', seaC, 'day');
      // Tap targets over the points (a finger is bigger than a dot).
      var hit = function (q, act) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="95" fill="transparent" data-act="' + act + '" style="cursor:pointer"/>'; };
      s += hit(f, 'day') + hit(ap, 'air') + hit(ar, 'arieiro') + hit([f[0] - 330, f[1] + 40], 'day');
      s += '</svg>';
      var sc = scores(), colOf = function (n) { return n >= 4 ? green : n === 3 ? '#D9A441' : terra; };
      s += '<div class="gd">' + sc.map(function (x) { return '<button type="button" title="' + esc(x[3]) + '"><span class="gl"><span>' + x[0] + '</span>' + esc(x[1]) + '</span><span class="dots">' + [0, 1, 2, 3, 4].map(function (i) { return '<i' + (i < x[2] ? ' style="background:' + colOf(x[2]) + '"' : '') + '></i>'; }).join('') + '</span><span class="why">' + esc(x[3]) + '</span></button>'; }).join('') + '</div>';
      el.innerHTML = s; el.hidden = false;
      el.querySelectorAll('.gd button').forEach(function (b) { b.onclick = function () { el.classList.toggle('why'); }; });
      // The island answers taps like the app's: Funchal and the sea open the
      // reasons for the day, the airport the flight board, Pico do Arieiro
      // its webcam; anywhere else on the drawing opens the map.
      var svgEl = el.querySelector('svg');
      if (svgEl) {
        svgEl.style.cursor = 'pointer';
        svgEl.addEventListener('click', function (e) {
          var act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
          if (act === 'day') { el.classList.add('why'); var g = el.querySelector('.gd'); if (g) g.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
          else if (act === 'air') window.open('https://www.flightradar24.com/airport/fnc', '_blank', 'noopener');
          else if (act === 'arieiro') window.open('https://www.netmadeira.com/webcams-madeira/pico-do-arieiro', '_blank', 'noopener');
          else location.href = '/ativa/maps/' + location.search;
        });
      }
    }
    function paint() {
      paintHero(); paintFace();
      var face = !!(data.isl && data.wx[0] && data.wx[0].current);
      var c = data.wx[0] && data.wx[0].current, p = data.wx[1] && data.wx[1].current, a = data.wx[2] && data.wx[2].current, h = '';
      var seaCell = data.sea;
      if (face) { c = null; p = null; a = null; seaCell = null; }
      if (c) h += cell(MA.emo(c.weather_code), 'Funchal', '<div class="val"><span class="tp ' + tcls(c.temperature_2m) + '">' + Math.round(c.temperature_2m) + '°</span> <small>' + Math.round(c.wind_speed_10m) + ' km/h</small></div>');
      if (p) h += cell(MA.emo(p.weather_code), 'Pico do Arieiro', '<div class="val"><span class="tp ' + tcls(p.temperature_2m) + '">' + Math.round(p.temperature_2m) + '°</span> <small>1818 m</small></div>');
      if (seaCell) {
        var wv = seaCell.wave_height;
        h += cell('🌊', t('Sea', 'Mar'), '<div class="val"><span class="tp ' + tcls(data.sea.sea_surface_temperature) + '">' + data.sea.sea_surface_temperature.toFixed(1) + '°</span> <small class="' + (wv >= 2.5 ? 'k-bad' : wv >= 1.5 ? 'k-warn' : 'k-ok') + '">' + t('waves', 'ondas') + ' ' + wv.toFixed(1) + ' m</small></div>');
      }
      if (a && a.wind_gusts_10m != null) {
        var cross = Math.round(a.wind_gusts_10m * Math.abs(Math.sin((a.wind_direction_10m - 50) * Math.PI / 180)));
        var k = cross >= 28 ? 'k-bad' : cross >= 20 ? 'k-warn' : 'k-ok';
        h += cell('✈️', t('Airport', 'Aeroporto'), '<div class="val ' + k + '">' + (cross >= 28 ? t('diversions likely', 'desvios prováveis') : cross >= 20 ? t('gusty', 'rajadas') : t('calm', 'calmo')) +
          '</div><small class="sub2">' + t('crosswind', 'vento cruzado') + ' ' + cross + ' km/h</small>', '', 'https://www.flightradar24.com/airport/fnc', true);
      }
      if (data.st) {
        // Levadas by status, each number a link to that list; under it today's best open ones.
        // Counted from levadas.json, the list the links open, so the numbers match it.
        var arr = (data.lev && data.lev.levadas) || data.st.trails || [], n = function (k) { return arr.filter(function (x) { return x.status === k; }).length; };
        var lk = function (f, num, en, pt, dot) { return '<a href="/ativa/levada?f=' + f + '"><i class="dot ' + dot + '"></i><b>' + num + '</b> ' + t(en, pt) + '</a>'; };
        h += '<div class="nc wide-cell"><span class="ni" aria-hidden="true">🥾</span><div class="nb"><div class="lbl">Levadas</div><div class="val st3">' + lk('open', n('open'), 'open', 'abertas', 'ok') +
          ' · ' + lk('partial', n('partial'), 'partly', 'parciais', 'warn') + ' · ' + lk('closed', n('closed'), 'closed', 'encerradas', 'bad') + '</div></div></div>';
      }
      h += '<div class="nc wide-cell"><span class="ni" aria-hidden="true">📷</span><div class="nb"><a class="cell-link" href="/ativa/webcams"><div class="lbl">Webcams</div><div class="val">' +
        t('Live views of the island', 'Vistas em direto da ilha') + ' <small>›</small></div></a></div><div class="camq">' +
        CAMS.slice(0, 3).map(function (x) { return '<a href="' + x[1] + '" target="_blank" rel="noopener" title="' + esc(x[0]) + '" aria-label="' + esc(x[0]) + '"><span>📷</span><small>' + esc(x[2]) + '</small></a>'; }).join('') + '</div></div>';
      if (data.ships && data.ships.calls) {
        // Funchal port calls from APRAM. A cruise ship is what changes a day in
        // Funchal (crowds in town, coaches at Pico do Arieiro and PR 6), so it
        // leads; ferries and freight follow in small type.
        var tmr = MA.addDays(today, 1), seen = {};
        var cruise = function (x) { return /Sul/.test(x.berth); };
        var kind = function (b) { return /Cimenteiro/.test(b) ? t('cement carrier', 'cimenteiro') : /Norte/.test(b) ? t('ferry / cargo', 'ferry / carga') : t('at anchor', 'ao largo'); };
        var calls = data.ships.calls.filter(function (x) { return x.superseded !== true && x.superseded !== 'True' && x.arrival && x.departure; });
        var on = function (day) { return calls.filter(function (x) { return x.arrival.slice(0, 10) <= day && x.departure.slice(0, 10) >= day; }); };
        var hrs = function (x, day) { return x.arrival.slice(0, 10) === day ? x.arrival.slice(11, 16) + '–' + (x.departure.slice(0, 10) === day ? x.departure.slice(11, 16) : MA.day(x.departure.slice(0, 10)).w + ' ' + x.departure.slice(11, 16)) : ''; };
        var line = function (day, label) {
          // One line per ship; a ship staying over shows on its first day only.
          return on(day).filter(function (x) { var k2 = x.ship.toUpperCase(); if (seen[k2]) return false; seen[k2] = 1; return true; })
            .sort(function (x, y) { return cruise(y) - cruise(x); })
            .map(function (x) {
              var hh = hrs(x, day);
              return '<div><span class="when">' + label + ':</span> <b>' + esc(x.ship) + '</b> <small>' + (cruise(x) ? t('cruise', 'cruzeiro') : kind(x.berth)) + (hh ? ' · ' + hh : '') + '</small></div>';
            }).join('');
        };
        var body = line(today, t('Today', 'Hoje')) + line(tmr, t('Tomorrow', 'Amanhã'));
        if (body) h += '<div class="nc wide-cell"><a class="cell-link" href="https://apram.pt/movimento-navios?port=ptfnc" target="_blank" rel="noopener"><span class="ni" aria-hidden="true">🛳️</span><div class="nb"><div class="lbl">' + t('Port of Funchal', 'Porto do Funchal') + ' ↗</div><div class="ships">' + body + '</div></div></a></div>';
      }
      $('#now').innerHTML = h || '<div class="wide-cell empty">' + t('Live data did not load.', 'Os dados em direto não carregaram.') + '</div>';
      var Z = { MRM: ['mountains', 'montanha'], MCN: ['north coast', 'costa norte'], MCS: ['south coast', 'costa sul'], MPS: ['Porto Santo', 'Porto Santo'] };
      var LV = { yellow: ['Yellow', 'Amarelo'], orange: ['Orange', 'Laranja'], red: ['Red', 'Vermelho'] };
      var seenW = {}, w = data.warn.filter(function (x) { return Z[x.idAreaAviso] && LV[x.awarenessLevelID] && new Date(x.endTime) > new Date(); })
        .filter(function (x) { var k = x.awarenessTypeName + x.awarenessLevelID; if (seenW[k]) return false; seenW[k] = 1; return true; });
      var al = $('#alert');
      if (w.length) {
        al.innerHTML = '⚠ ' + esc(w.slice(0, 2).map(function (x) { var l = LV[x.awarenessLevelID]; return t(l[0] + ' warning', 'Aviso ' + l[1].toLowerCase()) + ': ' + x.awarenessTypeName.toLowerCase() + ' — ' + t(Z[x.idAreaAviso][0], Z[x.idAreaAviso][1]); }).join(' · '));
        al.className = 'alert' + (w.some(function (x) { return x.awarenessLevelID !== 'yellow'; }) ? ' bad' : '');
        al.hidden = false;
      } else al.hidden = true;
      var E = dedupe(((data.ev && data.ev.events) || []).filter(function (e) { return e.date >= today; }));
      // Sport first, the way the app's home mixes it: a Saturday with six
      // village festas would otherwise push every race off the list.
      var sport = E.filter(function (e) { return kindOf(e) !== 'festivals'; }).slice(0, 4);
      var fest = E.filter(function (e) { return kindOf(e) === 'festivals'; }).slice(0, 6 - sport.length);
      E = sport.concat(fest).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      $('#events').innerHTML = E.slice(0, 6).map(eventRow).join('') || '<p class="empty">' + t('Nothing in the calendar yet.', 'Ainda nada no calendário.') + '</p>';
      paintTrails();
    }
    function paintTrails() {
      var el = $('#trails'); if (!el) return;
      if (data.picks && data.picks.length) {
        el.innerHTML = data.picks.map(function (p) {
          var l = p.l;
          return pickRow(p);
        }).join('');
      } else if (data.lev) {
        var L = data.lev.levadas.filter(function (l) { return l.status === 'open' && l.island !== 'Porto Santo'; });
        var want = ['PR 6', 'PR 1', 'PR 11'];
        el.innerHTML = want.map(function (c) { return L.find(function (l) { return l.code === c; }); }).filter(Boolean).map(function (l) { return trailRow(l); }).join('');
      }
    }
  }

  // ------------------------------------------------------------ events
  function events() {
    var qEl = $('#q'); if (qEl) MA.onLang(function () { qEl.placeholder = t('Search', 'Procurar'); }), qEl.placeholder = t('Search', 'Procurar');
    var P = [['today', 'Today', 'Hoje', 0], ['weekend', 'Weekend', 'Fim de semana', -1], ['week', 'Week', 'Semana', 7], ['month', 'Month', 'Mês', 31],
      ['3mo', '3 months', '3 meses', 92], ['6mo', '6 months', '6 meses', 183], ['year', 'Year', 'Ano', 366]];
    var K = [['all', 'All', 'Todos'], ['trail', 'Trail', 'Trail'], ['road', 'Road', 'Estrada'], ['orienteering', 'Orient', 'Orientação'],
      ['cycling', 'Bike', 'Bike'], ['swim', 'Swim', 'Natação'], ['kids', 'Kids', 'Crianças'], ['pro', 'Pro', 'Pro'], ['festivals', 'Festas', 'Festas'], ['other', 'Other', 'Outros']];
    var q = new URLSearchParams(location.search);
    var per = q.get('p') || '3mo', kind = q.get('k') || 'all', text = '', E = [], W = [];
    Promise.all([MA.get('/ativa/events.json'), MA.get('/ativa/watchlist.json')]).then(function (r) {
      E = dedupe(((r[0] && r[0].events) || []).filter(function (e) { return e.date >= MA.today(); }));
      W = (r[1] && r[1].items) || [];
      rerender(paint);
    });
    $('#q').addEventListener('input', function (e) { text = e.target.value.trim().toLowerCase(); paint(); });
    function range() {
      var today = MA.today(), p = P.find(function (x) { return x[0] === per; });
      if (p[3] === -1) { var d = new Date(today + 'T00:00:00Z').getUTCDay(), sat = (6 - d + 7) % 7; return [MA.addDays(today, d === 0 ? 0 : sat), MA.addDays(today, d === 0 ? 0 : sat + 1)]; }
      return [today, MA.addDays(today, p[3])];
    }
    function paint() {
      chips($('#periods'), P.map(function (p) { return [p[0], t(p[1], p[2])]; }), per, function (v) { per = v; paint(); });
      chips($('#kinds'), K.map(function (k) { return [k[0], t(k[1], k[2])]; }), kind, function (v) { kind = v; paint(); });
      var r = range();
      var list = E.filter(function (e) {
        return e.date >= r[0] && e.date <= r[1] && (kind === 'all' || kindOf(e) === kind) &&
          (!text || (e.name + ' ' + (e.location || '')).toLowerCase().indexOf(text) >= 0);
      });
      var later = E.filter(function (e) { return e.date > r[1] && (kind === 'all' || kindOf(e) === kind); }).length;
      $('#count').textContent = MA.n(list.length, 'events', 'eventos') + (later ? ' · ' + later + ' ' + t('later', 'mais tarde') : '');
      var out = '', month = '';
      list.forEach(function (e) {
        var m = e.date.slice(0, 7);
        if (m !== month) { month = m; var d = MA.day(e.date); out += '<h2 style="margin:16px 0 4px">' + d.m.charAt(0).toUpperCase() + d.m.slice(1) + ' ' + e.date.slice(0, 4) + '</h2>'; }
        out += eventRow(e);
      });
      $('#list').innerHTML = out || '<p class="empty">' + t('Nothing in this period. Try a longer one.', 'Nada neste período. Experimente um mais longo.') + '</p>';
      var w = W.filter(function (x) { return kind === 'all' || x.mode === kind; });
      $('#watch').innerHTML = w.map(function (x) {
        return '<a class="row" href="' + esc(x.url) + '" target="_blank" rel="noopener"><div class="d"><b>?</b><span>' + esc(x.expected.replace(/^Expected in /, '').slice(0, 3)) + '</span></div>' +
          '<div class="t"><b>' + esc(x.name) + '</b><span>' + esc(x.expected + ' · ' + x.location) + '</span></div><div class="k">' + esc((KINDS[x.mode] || ['', ''])[MA.lang() === 'pt' ? 1 : 0]) + '</div></a>';
      }).join('');
      $('#watchWrap').hidden = !w.length;
    }
  }

  // ------------------------------------------------------------ levadas
  function levadas() {
    var q = new URLSearchParams(location.search);
    var F = [['all', 'All', 'Todos'], ['open', 'Open', 'Abertos'], ['partial', 'Partly open', 'Parciais'], ['closed', 'Closed', 'Encerrados'], ['bus', 'By bus', 'De autocarro'], ['ps', 'Porto Santo', 'Porto Santo']];
    var S = [['code', 'Number', 'Número'], ['dist', 'Distance', 'Distância'], ['climb', 'Climb', 'Subida'], ['time', 'Time', 'Duração']];
    var f = q.get('f') || 'all', sort = 'code', text = '', L = [], picks = null;
    MA.get('/ativa/levadas.json').then(function (j) {
      L = (j && j.levadas) || [];
      rerender(paint);
      if (window.rankToday) rankToday(L).then(function (p) { picks = p; paintToday(); }).catch(function () {});
    });
    $('#q').addEventListener('input', function (e) { text = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); paint(); });
    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function paintToday() {
      if (!picks || !picks.length) { $('#todayWrap').hidden = true; return; }
      $('#todayWrap').hidden = false;
      $('#today').innerHTML = picks.map(pickRow).join('');
    }
    function paint() {
      chips($('#filters'), F.map(function (x) { return [x[0], t(x[1], x[2])]; }), f, function (v) { f = v; paint(); });
      chips($('#sorts'), S.map(function (x) { return [x[0], t(x[1], x[2])]; }), sort, function (v) { sort = v; paint(); });
      var list = L.filter(function (l) {
        if (f === 'ps') { if (l.island !== 'Porto Santo') return false; }
        else if (f === 'bus') { if (!(window.reachableByBus && reachableByBus(l))) return false; }
        else if (f !== 'all' && l.status !== f) return false;
        return !text || norm(l.code + ' ' + l.name + ' ' + (l.from || '') + ' ' + (l.to || '')).indexOf(text) >= 0;
      });
      list.sort(function (a, b) {
        if (sort === 'dist') return (b.distance_km || 0) - (a.distance_km || 0);
        if (sort === 'climb') return (b.ascent_m || 0) - (a.ascent_m || 0);
        if (sort === 'time') return ((b.official || {}).duration_min || 0) - ((a.official || {}).duration_min || 0);
        return (a.island === 'Porto Santo') - (b.island === 'Porto Santo') || MA.codeSort(a.code, b.code);
      });
      $('#count').textContent = MA.n(list.length, 'trails', 'percursos');
      $('#list').innerHTML = list.map(function (l) { return trailRow(l); }).join('') || '<p class="empty">' + t('No trail matches.', 'Nenhum percurso corresponde.') + '</p>';
      paintToday();
    }
  }

  // ------------------------------------------------------------ trail
  function trail() {
    var q = new URLSearchParams(location.search), code = q.get('code') || 'PR 10', ps = q.get('island') === 'ps', T = null, wx = null;
    MA.get('/ativa/levadas.json').then(function (j) {
      var L = (j && j.levadas) || [];
      T = L.find(function (x) { return x.code === code && (ps ? x.island === 'Porto Santo' : x.island !== 'Porto Santo'); }) || L.find(function (x) { return x.code === code; });
      if (!T) { $('#name').textContent = t('Trail not found', 'Percurso não encontrado'); return; }
      // Next to a closed or partly open trail, only open ones are an alternative.
      // Same island only: Porto Santo's nearest Madeira trail is 50 km of sea away.
      T._near = L.filter(function (o) { return o !== T && o.center && T.center && (o.island || 'Madeira') === (T.island || 'Madeira') && (T.status === 'open' || o.status === 'open'); }).map(function (o) {
        var dx = (o.center[0] - T.center[0]) * 111, dy = (o.center[1] - T.center[1]) * 94; return [o, Math.sqrt(dx * dx + dy * dy)];
      }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, 4);
      rerender(paint);
      if (T.center) MA.get('/ativa/api/om/forecast?latitude=' + T.center[0] + '&longitude=' + T.center[1] +
        '&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_days=1&timezone=Atlantic%2FMadeira').then(function (w) { wx = w; paintWx(); });
      if (window.ipmaReady) ipmaReady().then(function (api) { if (api) api.live().then(function (all) { T._warn = window.warnFor ? warnFor(T, all || []) : null; T._api = api; paintWx(); }); });
    });
    function paintWx() {
      var parts = [];
      if (wx && wx.current) {
        var hp = ((wx.hourly && wx.hourly.precipitation_probability) || []).slice(9, 18).filter(function (v) { return v != null; });
        var rain = hp.length ? Math.max.apply(null, hp) : null;
        parts.push(MA.emo(wx.current.weather_code) + ' ' + Math.round(wx.current.temperature_2m) + '° ' + t('on the trail now', 'no percurso agora') + ' · ' + Math.round(wx.current.wind_speed_10m) + ' km/h' + (rain != null ? ' · ' + rain + '% ' + t('rain 9–17', 'chuva 9–17') : ''));
      }
      $('#wx').innerHTML = parts.map(esc).join('');
      $('#wx').hidden = !parts.length;
      var w = T && T._warn, api = T && T._api, al = $('#warn');
      if (w && api) {
        var lv = api.LEVELS[w.level], types = w.types.map(function (x) { var tt = api.TYPES[x]; return tt ? pick(tt).toLowerCase() : x; }).join(', ');
        al.textContent = '⚠ ' + t(lv.en + ' IPMA warning', 'Aviso ' + lv.pt.toLowerCase() + ' do IPMA') + ': ' + types + ' — ' + pick(api.ZONES[w.zone]).toLowerCase();
        al.className = 'alert' + (w.level !== 'yellow' ? ' bad' : ''); al.hidden = false;
      } else al.hidden = true;
    }
    function paint() {
      var o = T.official || {}, x = T.exposure || {}, a = T.access || {};
      document.title = T.code + ' ' + T.name + ' · Madeira Ativa';
      $('#code').textContent = T.code; $('#name').textContent = T.name;
      $('#status').outerHTML = '<span id="status">' + statusPill(T.status) + '</span>';
      // What "partly open" means for this trail, from IFCN's notice.
      if (T.status === 'partial' || T.status === 'closed') Promise.all([MA.get('/ativa/trails_status.json'), MA.get('/ativa/ifcn_notes.json')]).then(function (r) {
        var cur = ((r[0] || {}).trails || []).find(function (x) { return x.code === T.code && (x.island || 'Madeira') === (T.island || 'Madeira'); });
        var n = (((r[1] || {}).trails) || {})[T.code];
        var box = document.getElementById('ifcn'); if (!box || !cur) return;
        var txt = n && n.src === cur.name ? (n[MA.lang()] || n.en) : (T.status === 'partial' ? cur.name : '');
        var paint = function () {
          var t2 = n && n.src === cur.name ? (n[MA.lang()] || n.en) : txt;
          box.innerHTML = '<div><b>' + (T.status === 'closed' ? t('Closed by IFCN', 'Encerrado pelo IFCN') : t('Partly open', 'Parcialmente aberto')) + '</b>' + (t2 ? ' — ' + esc(t2) : '') +
            ' <a href="' + esc((r[0] || {}).source || 'https://ifcn.madeira.gov.pt/') + '" target="_blank" rel="noopener">IFCN ↗</a>' +
            ' · <a href="#near">' + t('Open trails nearby', 'Percursos abertos perto') + ' ↓</a></div>';
          box.hidden = false;
        };
        paint(); MA.onLang(paint);
      });
      $('#route').textContent = T.from && T.to ? (T.from === T.to ? T.from : T.from + ' → ' + T.to) : '';
      $('#facts').innerHTML = [[t('Distance', 'Distância'), (T.distance_km || '—') + ' km'], [t('Time', 'Duração'), dur(o.duration) || '—'],
        [t('Climb', 'Subida'), '↑' + (T.ascent_m || 0) + ' m ↓' + (T.descent_m || 0) + ' m'], [t('Grade', 'Dificuldade'), diff(T) || '—']]
        .map(function (f) { return '<div><div class="lbl">' + f[0] + '</div><div class="val">' + esc(f[1]) + '</div></div>'; }).join('');
      // profile, cut at breaks in the mapped route instead of drawing a cliff
      var p = T.profile || [], br = T.profile_breaks || [];
      if (p.length > 1) {
        // A profile you can read: filled, with its highest and lowest point, a
        // km scale and both ends named (the old one was a bare line with no axes).
        var W = 600, H = 120, mn = Math.min.apply(null, p), mx = Math.max.apply(null, p), segs = [], cur = [], km = T.distance_km || 0;
        var y = function (v) { return (H - 4 - (v - mn) / ((mx - mn) || 1) * (H - 16)).toFixed(1); };
        p.forEach(function (v, i) {
          if (br.indexOf(i) >= 0 && cur.length) { segs.push(cur); cur = []; }
          cur.push([(i / (p.length - 1) * W).toFixed(1), y(v)]);
        });
        segs.push(cur);
        var svg = segs.map(function (sg) {
          var line = sg.map(function (q) { return q[0] + ',' + q[1]; }).join(' ');
          var area = sg[0][0] + ',' + H + ' ' + line + ' ' + sg[sg.length - 1][0] + ',' + H;
          return '<polygon fill="var(--green-tint)" points="' + area + '"/><polyline fill="none" stroke="var(--green)" stroke-width="2" vector-effect="non-scaling-stroke" points="' + line + '"/>';
        }).join('');
        var half = km ? (Math.round(km / 2 * 10) / 10) : '';
        $('#elev').innerHTML = '<div class="elevbox"><svg class="elev" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + svg + '</svg>' +
          '<span class="ey top">' + mx + ' m</span><span class="ey bot">' + mn + ' m</span></div>' +
          '<div class="ex"><span>0 km' + (T.from ? ' · ' + esc(T.from) : '') + '</span>' + (km ? '<span>' + half + ' km</span>' : '') +
          '<span>' + (km ? km + ' km' : '') + (T.to && T.to !== T.from ? ' · ' + esc(T.to) : '') + '</span></div>';
      }
      // A small map of the route itself; the full map is one tap away.
      if (window.L && document.getElementById('tmap')) MA.get('/ativa/trails_geo.json').then(function (g) {
        var ps = T.island === 'Porto Santo';
        var tr = ((g || {}).trails || []).find(function (q) {
          var first = q.lines && q.lines[0] && q.lines[0][0];
          return q.code === T.code && first && ((first[0] > 32.95) === ps);
        });
        if (!tr) return;
        var box = document.getElementById('tmap'); box.hidden = false;
        var m = L.map(box, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, attributionControl: true });
        m.attributionControl.setPrefix(false);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenStreetMap' }).addTo(m);
        var col = T.status === 'closed' ? '#C0392B' : T.status === 'partial' ? '#D68910' : '#0F6E56';
        var grp = L.featureGroup(tr.lines.map(function (ln) { return L.polyline(ln, { color: col, weight: 4 }); })).addTo(m);
        m.fitBounds(grp.getBounds(), { padding: [14, 14] });
      });
      var path = window.pathFacts ? pathFacts(x, MA.lang()) : [];
      $('#path').innerHTML = path.length ? '<h2>' + t('On the path', 'No trilho') + '</h2><div class="card"><ul style="margin:0;padding-left:18px">' + path.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul><p class="sub" style="margin:8px 0 0">' + t('OpenStreetMap, where surveyed; mapped on', 'OpenStreetMap, onde levantado; mapeado em') + ' ' + (x.mapped_pct || 0) + '% ' + t('of the route', 'do percurso') + '</p></div>' : '';
      var ends = a.ends || [], spread = ends.length === 2 ? ends[0].elev - ends[1].elev : 0, rows = '';
      ends.forEach(function (e, i) {
        var title = ends.length === 1 ? t('Start and finish', 'Início e fim') : spread >= 150 ? (i === 0 ? t('Upper end', 'Extremo superior') : t('Lower end', 'Extremo inferior')) : t('Trail end', 'Extremo');
        var s = [];
        if (e.parking) s.push('<a href="https://www.google.com/maps/dir/?api=1&destination=' + e.parking.lat + ',' + e.parking.lon + '" target="_blank" rel="noopener">' + t('Car park', 'Parque') + ' ' + e.parking.dist + ' m ' + t('from the path', 'do trilho') + ' ↗</a>');
        else s.push('<a href="https://www.google.com/maps/search/?api=1&query=' + e.lat + ',' + e.lon + '" target="_blank" rel="noopener">' + t('Place on the map', 'Local no mapa') + ' ↗</a>');
        var lines = (e.lines || []).map(function (l) { return l.timetable ? '<a href="' + esc(l.timetable) + '" target="_blank" rel="noopener">' + esc(l.line) + '</a>' : esc(l.line); });
        if (lines.length) s.push(t('Bus', 'Autocarro') + ' ' + lines.join(', '));
        if (e.bus) {
          s.push(t('Stop', 'Paragem') + ' ' + esc(e.bus.stop.replace(/\s*\([^)]*\)\s*$/, '')) + ', ' + e.bus.dist + ' m');
          var nb = window.nextBuses ? nextBuses(e.bus.departures, 3) : [];
          if (nb.length) s.push('<b>' + t('Next', 'Próximo') + ':</b> ' + nb.map(function (b) { return (b.today ? '' : MA.day(b.day).w + ' ') + b.time + ' ' + esc(b.line) + ' → ' + esc(b.to); }).join(' · '));
          if (e.bus.note) s.push('<small class="sub2">' + esc(e.bus.note[MA.lang()] || e.bus.note.en) + '</small>');
        }
        // The island planner with this end as the destination, as in the app.
        if (lines.length || e.bus) s.push('<a href="/ativa/bus?to=' + e.lat.toFixed(5) + ',' + e.lon.toFixed(5) + '&toName=' +
          encodeURIComponent(T.code + ' · ' + title) + '">🗺 ' + t('Plan the trip here by bus', 'Planear a viagem de autocarro até aqui') + ' →</a>');
        rows += '<dt>' + title + ' · ' + e.elev + ' m</dt><dd>' + s.join('<br>') + '</dd>';
      });
      (a.webcams || []).forEach(function (c) { rows += '<dt>Webcam</dt><dd><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.name) + ' ↗</a></dd>'; });
      $('#there').innerHTML = rows ? '<h2>' + t('How to get there', 'Como chegar') + '</h2><div class="card"><dl class="kv">' + rows + '</dl></div>' : '';
      $('#ask').href = '/ativa/ask?q=' + encodeURIComponent(T.code + ' ' + T.name);
      $('#official').innerHTML = T.url_en ? '<a href="' + esc(MA.lang() === 'pt' ? (T.url_pt || T.url_en) : T.url_en) + '" target="_blank" rel="noopener">' + t('Official route page', 'Página oficial do percurso') + ' ↗</a>' : '';
      $('#near').innerHTML = (T._near || []).map(function (n) { return trailRow(n[0], n[1].toFixed(1) + ' km ' + t('away', 'de distância')); }).join('');
      paintWx();
    }
  }

  // ------------------------------------------------------------ news
  function news() {
    var C = [['all', 'All', 'Tudo'], ['trail', 'Trail', 'Trail'], ['desporto', 'Sport', 'Desporto'], ['cultura', 'Culture', 'Cultura'],
      ['ocorrências', 'Incidents', 'Ocorrências'], ['política', 'Politics', 'Política'], ['educação', 'Education', 'Educação'], ['geral', 'General', 'Geral']];
    var cat = 'all', N = [];
    MA.get('/ativa/news_feed.json').then(function (j) {
      N = Array.isArray(j) ? j : (j && (j.items || Object.values(j).find(Array.isArray))) || [];
      rerender(paint);
    });
    // Headlines are translated into six languages by the pipeline; the reading
    // language is the reader's choice, separate from the interface language.
    var RL = [['', 'Original', 'Original'], ['en', 'EN', 'EN'], ['pt', 'PT', 'PT'], ['de', 'DE', 'DE'], ['pl', 'PL', 'PL'], ['uk', 'UA', 'UA'], ['ru', 'RU', 'RU']];
    var rl = null; try { rl = localStorage.getItem('news-lang'); } catch (e) {}
    function readLang() { return rl === null ? MA.lang() : rl; }
    function pick(n, field, plural) {
      var l = readLang(), own = (n.lang || '').toLowerCase();
      if (!l || own === l) return n[field] || '';
      return (n[plural] && n[plural][l]) || n[field] || '';
    }
    function title(n) { return pick(n, 'title', 'titles'); }
    function paint() {
      chips($('#rl'), RL.map(function (x) { return [x[0], t(x[1], x[2])]; }), readLang(), function (v) {
        rl = v; try { localStorage.setItem('news-lang', v); } catch (e) {} paint();
      });
      chips($('#cats'), C.map(function (c) { return [c[0], t(c[1], c[2])]; }), cat, function (v) { cat = v; paint(); });
      var list = N.filter(function (n) { return cat === 'all' || n.cat === cat; });
      $('#list').innerHTML = list.map(function (n) {
        var d = MA.day(n.date);
        return '<a class="row wrap-text" href="' + esc(n.link) + '" target="_blank" rel="noopener"><div class="d"><b>' + d.d + '</b><span>' + d.m + '</span></div>' +
          '<div class="t"><b>' + esc(title(n)) + '</b><span>' + esc(n.source) + '</span></div><div class="k">↗</div></a>';
      }).join('') || '<p class="empty">' + t('No news in this topic today.', 'Sem notícias neste tema hoje.') + '</p>';
    }
  }

  // ------------------------------------------------------------ festas
  function festas() {
    var cat = 'all', E = [];
    MA.get('/ativa/events.json').then(function (j) {
      E = dedupe(((j && j.events) || []).filter(function (e) { return e.mode === 'festivals' && e.date >= MA.today(); }));
      rerender(paint);
    });
    function paint() {
      var counts = {};
      E.forEach(function (e) { var c = CATS[e.category] ? e.category : 'other'; counts[c] = (counts[c] || 0) + 1; });
      var items = [['all', t('All', 'Tudo') + ' ' + E.length]].concat(Object.keys(CATS).filter(function (c) { return counts[c]; })
        .map(function (c) { return [c, t(CATS[c][0], CATS[c][1]) + ' ' + counts[c]]; }));
      if (counts.other) items.push(['other', t('Other', 'Outros') + ' ' + counts.other]);
      chips($('#cats'), items, cat, function (v) { cat = v; paint(); });
      var list = E.filter(function (e) { var c = CATS[e.category] ? e.category : 'other'; return cat === 'all' || c === cat; }).slice(0, 120);
      $('#list').innerHTML = list.map(function (e) {
        var d = MA.day(e.date), meta = [e.time, e.location, e.price].filter(Boolean).join(' · ');
        var c = CATS[e.category];
        return '<a class="row" href="' + esc(e.url || '#') + '"' + (e.url ? ' target="_blank" rel="noopener"' : '') + '><div class="d"><b>' + d.d + '</b><span>' + d.m + '</span></div>' +
          '<div class="t"><b>' + esc(e.name) + '</b><span>' + esc(d.w + (meta ? ' · ' + meta : '')) + '</span>' + regLine(e) + '</div><div class="k">' + esc(c ? t(c[0], c[1]) : '') + '</div></a>';
      }).join('') || '<p class="empty">' + t('Nothing in this category.', 'Nada nesta categoria.') + '</p>';
    }
  }

  // ------------------------------------------------------------ webcams
  function webcams() {
    var L = [];
    MA.get('/ativa/levadas.json').then(function (j) { L = (j && j.levadas) || []; rerender(paint); });
    function paint() {
      var cams = {};
      L.forEach(function (l) { ((l.access || {}).webcams || []).forEach(function (c) { (cams[c.url] = cams[c.url] || { c: c, t: [] }).t.push(l); }); });
      $('#list').innerHTML = Object.values(cams).sort(function (a, b) { return a.c.name.localeCompare(b.c.name); }).map(function (x) {
        return '<div class="card"><div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap"><b>' + esc(x.c.name) + '</b>' +
          '<a class="btn" href="' + esc(x.c.url) + '" target="_blank" rel="noopener">' + t('Watch live', 'Ver em direto') + ' ↗</a></div>' +
          '<div class="chips" style="margin-top:10px">' + x.t.sort(function (a, b) { return MA.codeSort(a.code, b.code); }).map(function (l) {
            return '<a class="chip" href="' + MA.trailUrl(l.code) + '">' + esc(l.code + ' ' + l.name) + '</a>'; }).join('') + '</div></div>';
      }).join('');
    }
  }

  // ------------------------------------------------------------ bus
  function bus() {
    var L = [];
    MA.get('/ativa/levadas.json').then(function (j) { L = (j && j.levadas) || []; rerender(paint); });
    function paint() {
      var list = L.filter(function (l) { return window.reachableByBus && reachableByBus(l); }).sort(function (a, b) { return MA.codeSort(a.code, b.code); });
      $('#count').textContent = MA.n(list.length, 'trails with a bus at one end or both', 'percursos com autocarro num extremo ou em ambos');
      $('#list').innerHTML = list.map(function (l) {
        var rows = '';
        ((l.access || {}).ends || []).forEach(function (e) {
          if (!((e.lines && e.lines.length) || e.bus)) return;
          var s = [];
          var lines = (e.lines || []).map(function (x) { return x.timetable ? '<a href="' + esc(x.timetable) + '" target="_blank" rel="noopener">' + esc(x.line) + '</a>' : esc(x.line); });
          if (lines.length) s.push((lines.length === 1 ? t('Line', 'Linha') : t('Lines', 'Linhas')) + ' ' + lines.join(', '));
          if (e.bus) {
            s.push(t('Stop', 'Paragem') + ' ' + esc(e.bus.stop.replace(/\s*\([^)]*\)\s*$/, '')) + ', ' + e.bus.dist + ' m');
            var nb = window.nextBuses ? nextBuses(e.bus.departures, 3) : [];
            if (nb.length) s.push('<b>' + t('Next', 'Próximo') + ':</b> ' + nb.map(function (b) { return (b.today ? '' : MA.day(b.day).w + ' ') + b.time + ' ' + esc(b.line) + ' → ' + esc(b.to); }).join(' · '));
            if (e.bus.note) s.push('<small class="sub2">' + esc(e.bus.note[MA.lang()] || e.bus.note.en) + '</small>');
          }
          rows += '<dt>' + e.elev + ' m</dt><dd>' + s.join('<br>') + '</dd>';
        });
        return '<div class="card"><a href="' + MA.trailUrl(l.code) + '"><b>' + esc(l.code + ' ' + l.name) + '</b></a> ' + statusPill(l.status) +
          '<p class="sub" style="margin:2px 0 8px">' + esc(l.from && l.to ? l.from + ' → ' + l.to : '') + '</p><dl class="kv">' + rows + '</dl></div>';
      }).join('');
    }
  }

  var INIT = { home: home, events: events, levadas: levadas, trail: trail, news: news, webcams: webcams, bus: bus };
  if (INIT[page]) INIT[page]();
})();
