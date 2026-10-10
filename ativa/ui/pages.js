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
    return x;
  }
  function time(l) { var o = l.official || {}; return dur(o.duration); }

  function eventRow(e) {
    var d = MA.day(e.date);
    var meta = [e.time, e.location, e.price].filter(Boolean).join(' · ');
    return '<a class="row" href="' + esc(e.url || '#') + '"' + (e.url ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<div class="d"><b>' + d.d + '</b><span>' + d.m + '</span></div>' +
      '<div class="t"><b>' + esc(e.name) + '</b><span>' + esc(d.w + (meta ? ' · ' + meta : '')) + '</span></div>' +
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
      MA.get('/ativa/api/om/forecast?latitude=32.648,32.735,32.698&longitude=-16.908,-16.929,-16.774&elevation=50,1818,58&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m'),
      MA.get('/ativa/api/om/marine?latitude=32.63&longitude=-16.92&current=wave_height,sea_surface_temperature&timezone=Atlantic%2FMadeira'),
      MA.get('/ativa/trails_status.json'), MA.get('/ativa/cruise_calls.json'),
      MA.get('https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json'),
      MA.get('/ativa/events.json'), MA.get('/ativa/levadas.json'),
    ]).then(function (r) {
      data = { wx: r[0] || [], sea: r[1] && r[1].current, st: r[2], ships: r[3], warn: r[4] || [], ev: r[5], lev: r[6] };
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
    function paint() {
      var c = data.wx[0] && data.wx[0].current, p = data.wx[1] && data.wx[1].current, a = data.wx[2] && data.wx[2].current, h = '';
      if (c) h += cell(MA.emo(c.weather_code), 'Funchal', '<div class="val"><span class="tp ' + tcls(c.temperature_2m) + '">' + Math.round(c.temperature_2m) + '°</span> <small>' + Math.round(c.wind_speed_10m) + ' km/h</small></div>');
      if (p) h += cell(MA.emo(p.weather_code), 'Pico do Arieiro', '<div class="val"><span class="tp ' + tcls(p.temperature_2m) + '">' + Math.round(p.temperature_2m) + '°</span> <small>1818 m</small></div>');
      if (data.sea) {
        var wv = data.sea.wave_height;
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
          return trailRow(l, Math.round(p.temp) + '° · ' + p.rain + '% ' + t('rain', 'chuva') + ' · ' + [time(l), diff(l)].filter(Boolean).join(' · '));
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
      $('#count').textContent = list.length + ' ' + t('events', 'eventos') + (later ? ' · ' + later + ' ' + t('later', 'mais tarde') : '');
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
      $('#today').innerHTML = picks.map(function (p) { return trailRow(p.l, Math.round(p.temp) + '° · ' + p.rain + '% ' + t('rain', 'chuva') + ' · ' + [time(p.l), diff(p.l)].filter(Boolean).join(' · ')); }).join('');
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
      $('#count').textContent = list.length + ' ' + t('trails', 'percursos');
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
      T._near = L.filter(function (o) { return o !== T && o.center && T.center; }).map(function (o) {
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
          box.innerHTML = '<b>' + (T.status === 'closed' ? t('Closed by IFCN', 'Encerrado pelo IFCN') : t('Partly open', 'Parcialmente aberto')) + '</b>' + (t2 ? ' — ' + esc(t2) : '') +
            ' <a href="' + esc((r[0] || {}).source || 'https://ifcn.madeira.gov.pt/') + '" target="_blank" rel="noopener">IFCN ↗</a>';
          box.hidden = false;
        };
        paint(); MA.onLang(paint);
      });
      $('#route').textContent = T.from && T.to ? (T.from === T.to ? T.from : T.from + ' → ' + T.to) : '';
      $('#facts').innerHTML = [[t('Distance', 'Distância'), (T.distance_km || '—') + ' km'], [t('Time', 'Duração'), dur(o.duration) || '—'],
        [t('Climb', 'Subida'), '↑' + (T.ascent_m || 0) + ' m'], [t('Grade', 'Dificuldade'), diff(T) || '—']]
        .map(function (f) { return '<div><div class="lbl">' + f[0] + '</div><div class="val">' + esc(f[1]) + '</div></div>'; }).join('');
      // profile, cut at breaks in the mapped route instead of drawing a cliff
      var p = T.profile || [], br = T.profile_breaks || [];
      if (p.length > 1) {
        var W = 600, H = 110, mn = Math.min.apply(null, p), mx = Math.max.apply(null, p), segs = [], cur = [];
        p.forEach(function (v, i) {
          if (br.indexOf(i) >= 0 && cur.length) { segs.push(cur); cur = []; }
          cur.push((i / (p.length - 1) * W).toFixed(1) + ',' + (H - 6 - (v - mn) / ((mx - mn) || 1) * (H - 18)).toFixed(1));
        });
        segs.push(cur);
        $('#elev').innerHTML = '<svg class="elev" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + segs.map(function (s) {
          return '<polyline fill="none" stroke="var(--green)" stroke-width="2" vector-effect="non-scaling-stroke" points="' + s.join(' ') + '"/>';
        }).join('') + '</svg><div class="sub" style="margin-top:4px">' + mn + '–' + mx + ' m</div>';
      }
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
        }
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
          '<div class="t"><b>' + esc(e.name) + '</b><span>' + esc(d.w + (meta ? ' · ' + meta : '')) + '</span></div><div class="k">' + esc(c ? t(c[0], c[1]) : '') + '</div></a>';
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
      $('#count').textContent = list.length + ' ' + t('trails with a bus at one end or both', 'percursos com autocarro num extremo ou em ambos');
      $('#list').innerHTML = list.map(function (l) {
        var rows = '';
        ((l.access || {}).ends || []).forEach(function (e) {
          if (!((e.lines && e.lines.length) || e.bus)) return;
          var s = [];
          var lines = (e.lines || []).map(function (x) { return x.timetable ? '<a href="' + esc(x.timetable) + '" target="_blank" rel="noopener">' + esc(x.line) + '</a>' : esc(x.line); });
          if (lines.length) s.push(t('Lines', 'Linhas') + ' ' + lines.join(', '));
          if (e.bus) {
            s.push(t('Stop', 'Paragem') + ' ' + esc(e.bus.stop.replace(/\s*\([^)]*\)\s*$/, '')) + ', ' + e.bus.dist + ' m');
            var nb = window.nextBuses ? nextBuses(e.bus.departures, 3) : [];
            if (nb.length) s.push('<b>' + t('Next', 'Próximo') + ':</b> ' + nb.map(function (b) { return (b.today ? '' : MA.day(b.day).w + ' ') + b.time + ' ' + esc(b.line) + ' → ' + esc(b.to); }).join(' · '));
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
