// Ask — beta.
//
// Answers questions about Madeira's trails, where to go today, the weather and
// what's on, from Madeira Ativa's own live data: levadas.json (IFCN status,
// Visit Madeira walking times, car parks, bus lines), events.json, IPMA warnings
// and Open-Meteo forecasts. It recognises what is being asked, assembles the
// facts and writes a short summary on top of them.
//
// It uses no language model yet, on purpose: every sentence it writes is built
// from a field it just read, so it cannot invent a closure, a bus or a date.
// That same fact assembly is what a conversational model would be given as its
// context in the next version — so this is the first half of that feature, not a
// throwaway.
//
// Needs trail-core.js (difficulty, walking time, zones, ranking) and ipma.js.
(function () {
  var data = { levadas: null, events: null };
  var lang = 'en';

  var T = {
    thinking:  { en: 'Looking it up…', pt: 'A procurar…' },
    aiWriting: { en: 'Writing a short answer…', pt: 'A escrever uma resposta curta…' },
    aiNote:    { en: 'AI answers can be wrong — the facts below are the source.',
                 pt: 'As respostas da IA podem ter erros — a fonte são os factos em baixo.' },
    noAnswer:  { en: 'I can answer about a trail (by name or PR code), where to go today, the weather and what’s on. Try one of the examples above.',
                 pt: 'Posso responder sobre um percurso (pelo nome ou código PR), onde ir hoje, o tempo e o que se passa. Experimente um dos exemplos acima.' },
    failed:    { en: 'One of the live sources did not answer. Try again in a moment.',
                 pt: 'Uma das fontes em direto não respondeu. Tente de novo daqui a pouco.' },
    open:      { en: 'is open', pt: 'está aberto' },
    partial:   { en: 'is partly open', pt: 'está parcialmente aberto' },
    closed:    { en: 'is closed', pt: 'está encerrado' },
    statusSrc: { en: 'IFCN, updated', pt: 'IFCN, atualizado a' },
    walk:      { en: 'Walk', pt: 'Percurso' },
    stOpen:    { en: 'Open', pt: 'Aberto' },
    stPartial: { en: 'Partly open', pt: 'Parcialmente aberto' },
    stClosed:  { en: 'Closed', pt: 'Encerrado' },
    carParksBoth: { en: 'car parks at both ends', pt: 'parques nos dois extremos' },
    and:       { en: 'and', pt: 'e' },
    away:      { en: 'away', pt: 'de distância' },
    oneWay:    { en: 'one way', pt: 'só ida' },
    loop:      { en: 'loop', pt: 'circular' },
    climb:     { en: 'climb', pt: 'subida' },
    nowAt:     { en: 'Now on the trail', pt: 'Agora no percurso' },
    rainToday: { en: 'chance of rain 9:00–17:00', pt: 'probabilidade de chuva 9:00–17:00' },
    wind:      { en: 'wind', pt: 'vento' },
    noWarn:    { en: 'No IPMA warning for its zone.', pt: 'Sem aviso do IPMA para a sua zona.' },
    getThere:  { en: 'Getting there', pt: 'Como chegar' },
    carPark:   { en: 'car park', pt: 'parque' },
    atUpper:   { en: 'at the upper end', pt: 'no extremo superior' },
    atLower:   { en: 'at the lower end', pt: 'no extremo inferior' },
    atOneEnd:  { en: 'at one end', pt: 'num extremo' },
    atStart:   { en: 'at the start', pt: 'no início' },
    bus:       { en: 'bus', pt: 'autocarro' },
    buses:     { en: 'buses', pt: 'autocarros' },
    noBus:     { en: 'no bus route mapped near either end', pt: 'sem linha de autocarro mapeada perto dos extremos' },
    trailPage: { en: 'Full trail page', pt: 'Página do percurso' },
    nextBus:   { en: 'Next bus', pt: 'Próximo autocarro' },
    onPath:    { en: 'On the path', pt: 'No trilho' },
    pathSrc:   { en: 'OpenStreetMap; route mapped on', pt: 'OpenStreetMap; percurso mapeado em' },
    webcam:    { en: 'Live webcam', pt: 'Webcam em direto' },
    todayHead: { en: 'Best bets for today', pt: 'Melhores opções para hoje' },
    todayWarn: { en: 'Every Madeira zone has a warning today — these are the least affected.',
                 pt: 'Todas as zonas da Madeira têm aviso hoje — estes são os menos afetados.' },
    moreToday: { en: 'Full ranking on the Levadas page', pt: 'Lista completa na página das Levadas' },
    weatherHd: { en: 'Weather now', pt: 'Tempo agora' },
    coast:     { en: 'Funchal', pt: 'Funchal' },
    summit:    { en: 'Pico do Arieiro', pt: 'Pico do Arieiro' },
    sea:       { en: 'sea', pt: 'mar' },
    waves:     { en: 'waves', pt: 'ondas' },
    warnings:  { en: 'IPMA warnings', pt: 'Avisos IPMA' },
    noWarnAll: { en: 'No yellow, orange or red IPMA warning for Madeira right now.',
                 pt: 'Sem avisos amarelos, laranja ou vermelhos do IPMA para a Madeira neste momento.' },
    eventsHd:  { en: 'What’s on', pt: 'O que se passa' },
    noEvents:  { en: 'Nothing in the calendar for that period.', pt: 'Nada no calendário para esse período.' },
    allEvents: { en: 'Full calendar', pt: 'Calendário completo' },
    today:     { en: 'today', pt: 'hoje' },
    tomorrow:  { en: 'tomorrow', pt: 'amanhã' },
    weekend:   { en: 'this weekend', pt: 'este fim de semana' },
    week:      { en: 'in the next 7 days', pt: 'nos próximos 7 dias' },
    moreEv:    { en: 'more', pt: 'mais' },
  };
  var DAYS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] };

  function t(k) { return (T[k] || {})[lang] || k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  // Same rule as scripts/gen_trail_pages.py, so the link lands on a real page.
  function slugify(s) {
    return String(s).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function madeiraToday() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Atlantic/Madeira', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function dayLabel(iso) { var d = new Date(iso + 'T00:00:00Z'); return DAYS[lang][d.getUTCDay()] + ' ' + d.getUTCDate(); }
  function emo(c) { return c >= 95 ? '⛈' : c >= 80 ? '🌧' : c >= 61 ? '🌧' : c >= 51 ? '🌦' : c >= 45 ? '🌫' : c === 3 ? '☁️' : c >= 1 ? '🌤' : '☀️'; }

  function load(name, url) {
    if (data[name]) return Promise.resolve(data[name]);
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); })
      .then(function (j) { data[name] = j; return j; });
  }
  function warningsNow() {
    return ipmaReady().then(function (api) { return api ? api.live() : []; });
  }

  // ------------------------------------------------------------ recognising
  var WORDS = {
    today:   ['today', 'hoje', 'where to go', 'onde ir', 'recommend', 'suggest', 'sugere', 'sugest', 'сегодня', 'куда'],
    weather: ['weather', 'tempo', 'meteo', 'rain', 'chuva', 'wind', 'vento', 'temperature', 'temperatura', 'sea', ' mar', 'waves', 'ondas', 'warning', 'aviso', 'storm', 'trovoada', 'погода', 'дожд'],
    events:  ['event', 'what\'s on', 'whats on', 'race', 'prova', 'corrida', 'festa', 'festival', 'concert', 'concerto',
              'weekend', 'fim de semana', 'this week', 'esta semana', 'agenda', 'событи', 'выходн'],
    getThere:['bus', 'autocarro', 'get there', 'chegar', 'parking', 'car park', 'estacionamento', 'автобус', 'добрат'],
  };
  function has(q, list) { return list.some(function (w) { return q.indexOf(w) >= 0; }); }

  var STOP = ['levada', 'levadas', 'vereda', 'caminho', 'percurso', 'trail', 'trilho', 'what', 'about', 'the', 'and', 'with',
              'como', 'para', 'sobre', 'esta', 'this', 'there', 'status', 'estado', 'open', 'aberto', 'closed', 'weather', 'tempo',
              'today', 'hoje', 'bus', 'real', 'pico'];

  function findTrail(q) {
    var list = data.levadas.levadas;
    var ps = q.indexOf('porto santo') >= 0;
    var m = q.match(/\bpr\s*(\d+(?:\.\d+)?)/);
    if (m) {
      var code = 'PR ' + m[1];
      var hit = list.filter(function (l) { return l.code === code && (ps ? l.island === 'Porto Santo' : l.island !== 'Porto Santo'); })[0] ||
        list.filter(function (l) { return l.code === code; })[0];
      if (hit) return hit;
    }
    // Words of four letters or more, and numbers ("25" in 25 Fontes is the one
    // word that tells PR 6 from PR 13.1, whose far end is also called 25 Fontes).
    var words = q.split(/[^a-z0-9']+/).filter(function (w) {
      return (w.length >= 4 || /^\d+$/.test(w)) && STOP.indexOf(w) < 0;
    });
    if (!words.length) return null;
    var best = null, bestScore = 0;
    list.forEach(function (l) {
      var name = ' ' + norm(l.name) + ' ', ends = norm((l.from || '') + ' ' + (l.to || ''));
      var score = 0;
      words.forEach(function (w) {
        if (name.indexOf(' ' + w + ' ') >= 0 || (w.length >= 4 && name.indexOf(w) >= 0)) score += 3;
        else if (ends.indexOf(w) >= 0) score += 1;
      });
      if (q.indexOf(norm(l.name)) >= 0) score += 10;  // the whole name was typed
      if (score > bestScore) { best = l; bestScore = score; }
    });
    return bestScore ? best : null;
  }

  // -------------------------------------------------------------- answering
  function answerTrail(l) {
    var ends = (l.access && l.access.ends) || [];
    var c = l.center || (ends[0] ? [ends[0].lat, ends[0].lon] : null);
    var wx = c ? fetch('https://api.open-meteo.com/v1/forecast?latitude=' + c[0] + '&longitude=' + c[1] +
      '&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_days=1&timezone=Atlantic%2FMadeira')
      .then(function (r) { return r.json(); }).catch(function () { return null; }) : Promise.resolve(null);
    return Promise.all([wx, warningsNow()]).then(function (res) {
      var w = res[0], warn = warnFor(l, res[1] || []);
      var df = difficulty(l), time = walkTime(l);
      var status = l.status === 'closed' ? t('closed') : l.status === 'partial' ? t('partial') : t('open');

      // The short summary: every clause comes from a field read above.
      var s = [esc(l.code + ' ' + l.name) + ' ' + status + '.'];
      if (warn) s.push(warnSentence(warn));
      var rain = null;
      if (w && w.current) {
        var hp = (w.hourly && w.hourly.precipitation_probability) || [];
        var day = hp.slice(9, 18).filter(function (x) { return x != null; });
        rain = day.length ? Math.max.apply(null, day) : null;
        s.push(Math.round(w.current.temperature_2m) + '° ' + (lang === 'pt' ? 'no percurso agora' : 'on the trail now') +
          (rain != null ? ', ' + rain + '% ' + (lang === 'pt' ? 'de chuva máx. hoje' : 'max chance of rain today') : '') + '.');
      }
      s.push((time ? time + ', ' : '') + df[lang].toLowerCase() + ', ' + (l.distance_km || '?') + ' km.');
      var reach = reachSentence(ends);
      if (reach) s.push(reach);

      var html = '<p class="a-sum">' + s.join(' ') + '</p><dl class="a-facts">';
      var badge = l.status === 'closed' ? t('stClosed') : l.status === 'partial' ? t('stPartial') : t('stOpen');
      html += '<dt>' + (lang === 'pt' ? 'Estado' : 'Status') + '</dt><dd><span class="a-badge ' + esc(l.status) + '">' + badge + '</span></dd>';
      html += '<dt>' + t('walk') + '</dt><dd>' + (l.distance_km || '?') + ' km · ↑' + (l.ascent_m || 0) + ' m ' + t('climb') +
        (time ? ' · ⏱ ' + time : '') + ' · ' + df[lang] + ' · ' + (l.roundtrip ? t('loop') : t('oneWay')) + '</dd>';
      if (w && w.current) {
        html += '<dt>' + t('nowAt') + '</dt><dd>' + emo(w.current.weather_code) + ' ' + Math.round(w.current.temperature_2m) + '° · ' +
          Math.round(w.current.wind_speed_10m) + ' km/h ' + t('wind') + (rain != null ? ' · ' + rain + '% ' + t('rainToday') : '') + '</dd>';
      }
      html += '<dt>IPMA</dt><dd>' + (warn ? warnSentence(warn) : t('noWarn')) + '</dd>';
      if (reach) html += '<dt>' + t('getThere') + '</dt><dd>' + reach + '</dd>';
      // Next departures where Funchal's urban timetable reaches an end.
      ends.forEach(function (e) {
        var nb = e.bus ? nextBuses(e.bus.departures, 3) : [];
        if (nb.length) html += '<dt>' + t('nextBus') + '</dt><dd>' + nb.map(function (b) {
          return (b.today ? '' : t('tomorrow') + ' ') + b.time + ' ' + esc(b.line) + ' → ' + esc(b.to);
        }).join(' · ') + ' (' + esc(e.bus.stop.replace(/\s*\([^)]*\)\s*$/, '')) + ')</dd>';
      });
      // Railings, narrow ledges, tunnels — the question a tester asked first.
      var pf = pathFacts(l.exposure, lang);
      if (pf.length) html += '<dt>' + t('onPath') + '</dt><dd>' + pf.map(esc).join('; ') + '. <span class="a-soft">(' +
        t('pathSrc') + ' ' + l.exposure.mapped_pct + '%)</span></dd>';
      ((l.access && l.access.webcams) || []).forEach(function (c) {
        html += '<dt>' + t('webcam') + '</dt><dd><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.name) + ' ↗</a></dd>';
      });
      html += '</dl><p class="a-links"><a href="/ativa/trail/' + slugify(l.code + ' ' + l.name) + '">' + t('trailPage') + ' →</a></p>';
      return html;
    });
  }

  function warnSentence(warn) {
    var api = window.AtivaIPMA; if (!api) return '';
    var lv = api.LEVELS[warn.level];
    var types = warn.types.map(function (x) { var tt = api.TYPES[x]; return tt ? tt[lang].toLowerCase() : x.toLowerCase(); }).join(', ');
    var zone = api.ZONES[warn.zone][lang].toLowerCase();
    return '<span style="color:' + lv.colour + ';font-weight:700">⚠ ' +
      (lang === 'pt' ? 'Aviso ' + lv.pt.toLowerCase() + ' do IPMA' : lv.en + ' IPMA warning') + ': ' + esc(types) + ' — ' + esc(zone) + '.</span>';
  }

  // "car park 83 m from the lower end" / "parque a 83 m do extremo inferior".
  function parkAt(dist, end) {
    var en = { upper: 'the upper end', lower: 'the lower end', one: 'one end', start: 'the start' };
    var pt = { upper: 'do extremo superior', lower: 'do extremo inferior', one: 'de um dos extremos', start: 'do início' };
    return lang === 'pt' ? 'parque a ' + dist + ' m ' + pt[end] : 'car park ' + dist + ' m from ' + en[end];
  }

  function reachSentence(ends) {
    if (!ends.length) return '';
    var spread = ends.length === 2 ? ends[0].elev - ends[1].elev : 0;
    var named = ends.length === 1 || spread >= 150;
    function where(i) { return ends.length === 1 ? t('atStart') : i === 0 ? t('atUpper') : t('atLower'); }
    function lineLinks(ls) {
      return ls.map(function (x) {
        return x.timetable ? '<a href="' + esc(x.timetable) + '" target="_blank" rel="noopener">' + esc(x.line) + '</a>' : esc(x.line);
      }).join(' · ');
    }
    var bits = [];
    var parks = ends.map(function (e) { return e.parking ? e.parking.dist : null; });
    if (named) {
      // "83 m from the lower end", not "at the lower end (83 m)": both models
      // tested read the bracketed figure as an altitude, and so might a reader.
      ends.forEach(function (e, i) { if (e.parking) bits.push(parkAt(e.parking.dist, ends.length === 1 ? 'start' : i === 0 ? 'upper' : 'lower')); });
    } else if (parks[0] != null && parks[1] != null) {
      bits.push(t('carParksBoth') + ' (' + parks[0] + ' m ' + t('and') + ' ' + parks[1] + ' m ' + t('away') + ')');
    } else if (parks[0] != null || parks[1] != null) {
      bits.push(parkAt(parks[0] != null ? parks[0] : parks[1], 'one'));
    }
    // Lines are kept with the end they serve: at PR 10 the mountain buses stop
    // at Ribeiro Frio and a different line at Portela, 280 m lower.
    var anyLines = false;
    ends.forEach(function (e, i) {
      var ls = e.lines || [];
      if (!ls.length) return;
      anyLines = true;
      bits.push((ls.length > 1 ? t('buses') : t('bus')) + ' ' + lineLinks(ls) + ' ' + (named ? where(i) : t('atOneEnd')));
    });
    if (!anyLines && ends.some(function (e) { return e.lines !== undefined; })) bits.push(t('noBus'));
    if (!bits.length) return '';
    var txt = bits.join('; ');
    return txt.charAt(0).toUpperCase() + txt.slice(1) + '.';
  }


  function answerToday() {
    return rankToday(data.levadas.levadas).then(function (picks) {
      if (!picks.length) return '<p class="a-sum">' + t('failed') + '</p>';
      var allWarned = picks.every(function (p) { return p.warn && p.warn.severe; });
      var sum = picks.map(function (p) {
        return esc(p.l.code + ' ' + p.l.name) + ' (' + Math.round(p.temp) + '°, ' + p.rain + '% ' +
          (lang === 'pt' ? 'chuva' : 'rain') + (walkTime(p.l) ? ', ' + walkTime(p.l) : '') + ')';
      });
      var html = '<p class="a-sum">' + (lang === 'pt' ? 'Hoje: ' : 'Today: ') + sum.join('; ') + '.' +
        (allWarned ? ' ' + t('todayWarn') : '') + '</p><ol class="a-list">';
      picks.forEach(function (p) {
        html += '<li><a href="/ativa/trail/' + slugify(p.l.code + ' ' + p.l.name) + '"><b>' + esc(p.l.code) + '</b> ' + esc(p.l.name) + '</a>' +
          '<span>' + emo(p.code) + ' ' + Math.round(p.temp) + '° · ' + p.rain + '% ' + (lang === 'pt' ? 'chuva' : 'rain') + ' · ' +
          Math.round(p.wind) + ' km/h · ' + difficulty(p.l)[lang] + (walkTime(p.l) ? ' · ⏱ ' + walkTime(p.l) : '') + '</span>' +
          (p.warn ? '<span>' + warnSentence(p.warn) + '</span>' : '') + '</li>';
      });
      return html + '</ol><p class="a-links"><a href="/ativa/levada">' + t('moreToday') + ' →</a></p>';
    });
  }

  function answerWeather() {
    var wx = 'https://api.open-meteo.com/v1/forecast?latitude=32.648,32.735&longitude=-16.908,-16.929' +
      '&elevation=50,1818&current=temperature_2m,weather_code,wind_speed_10m';
    var sea = 'https://marine-api.open-meteo.com/v1/marine?latitude=32.63&longitude=-16.92&current=wave_height,sea_surface_temperature';
    function get(u) { return fetch(u).then(function (r) { return r.json(); }).catch(function () { return null; }); }
    return Promise.all([get(wx), get(sea), warningsNow()]).then(function (res) {
      var pts = Array.isArray(res[0]) ? res[0] : [];
      var coast = pts[0] && pts[0].current, peak = pts[1] && pts[1].current, m = res[1] && res[1].current;
      var parts = [];
      if (coast) parts.push(t('coast') + ' ' + emo(coast.weather_code) + ' ' + Math.round(coast.temperature_2m) + '°, ' + Math.round(coast.wind_speed_10m) + ' km/h');
      if (peak) parts.push(t('summit') + ' ' + emo(peak.weather_code) + ' ' + Math.round(peak.temperature_2m) + '°, ' + Math.round(peak.wind_speed_10m) + ' km/h');
      if (m && m.sea_surface_temperature != null) parts.push(t('sea') + ' ' + m.sea_surface_temperature.toFixed(1) + '°' +
        (m.wave_height != null ? ', ' + t('waves') + ' ' + m.wave_height.toFixed(1) + ' m' : ''));
      var warns = res[2] || [];
      var api = window.AtivaIPMA, rows = {};
      warns.forEach(function (w) {
        var k = w.awarenessLevelID + '|' + w.awarenessTypeName;
        (rows[k] = rows[k] || { w: w, z: [] }).z.push(w.idAreaAviso);
      });
      var wl = Object.keys(rows).map(function (k) {
        var r = rows[k], lv = api.LEVELS[r.w.awarenessLevelID], ty = api.TYPES[r.w.awarenessTypeName];
        return '<li><span style="color:' + lv.colour + ';font-weight:700">' + lv[lang] + '</span> · ' +
          esc(ty ? ty[lang] : r.w.awarenessTypeName) + ' — ' + r.z.sort(function (a, b) {
            return ['MRM', 'MCN', 'MCS', 'MPS'].indexOf(a) - ['MRM', 'MCN', 'MCS', 'MPS'].indexOf(b);
          }).map(function (z) { return api.ZONES[z][lang]; }).join(', ') + '</li>';
      });
      var html = '<p class="a-sum">' + (parts.length ? parts.join(' · ') + '.' : t('failed')) + ' ' +
        (wl.length ? (lang === 'pt' ? wl.length + ' aviso(s) do IPMA em vigor.' : wl.length + ' IPMA warning' + (wl.length > 1 ? 's' : '') + ' in force.') : t('noWarnAll')) + '</p>';
      if (wl.length) html += '<p class="a-sub">' + t('warnings') + '</p><ul class="a-list">' + wl.join('') + '</ul>';
      return html;
    });
  }

  function answerEvents(q) {
    return load('events', '/ativa/events.json').then(function (d) {
      var all = (d.events || []).filter(function (e) { return e.date; });
      var today = madeiraToday(), from = today, to = addDays(today, 6), label = t('week');
      if (has(q, ['tomorrow', 'amanha', 'завтра'])) { from = to = addDays(today, 1); label = t('tomorrow'); }
      else if (has(q, ['today', 'hoje', 'tonight', 'esta noite', 'сегодня'])) { from = to = today; label = t('today'); }
      else if (has(q, ['weekend', 'fim de semana', 'выходн'])) {
        // Saturday and Sunday; on a Sunday, what is left of it.
        var dow = new Date(today + 'T00:00:00Z').getUTCDay();
        if (dow === 0) { from = to = today; }
        else { from = addDays(today, 6 - dow); to = addDays(from, 1); }
        label = t('weekend');
      }
      var kinds = [
        [['trail', 'trilho', 'ultra'], ['trail']], [['run', 'corrida', 'road', 'estrada'], ['road']],
        [['bike', 'cycling', 'bicicleta', 'ciclismo'], ['cycling']], [['swim', 'natacao'], ['swim']],
        [['festa', 'festival', 'concert', 'concerto', 'music', 'musica'], ['festivals', 'festival', 'concert']],
        [['kids', 'crianca', 'family', 'familia'], ['kids', 'family']],
      ];
      var want = null;
      kinds.forEach(function (k) { if (!want && has(q, k[0])) want = k[1]; });
      var list = all.filter(function (e) {
        var end = e.date_end || e.date;
        return end >= from && e.date <= to && (!want || want.indexOf(e.mode) >= 0 || want.indexOf(e.event_type) >= 0);
      }).sort(function (a, b) { return (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')); });
      if (!list.length) return '<p class="a-sum">' + t('noEvents') + '</p><p class="a-links"><a href="/ativa/">' + t('allEvents') + ' →</a></p>';
      var shown = list.slice(0, 8);
      var html = '<p class="a-sum">' + list.length + ' ' + (lang === 'pt' ? (list.length === 1 ? 'evento' : 'eventos') : (list.length === 1 ? 'event' : 'events')) +
        ' ' + label + (lang === 'pt' ? '.' : '.') + '</p><ul class="a-list">';
      shown.forEach(function (e) {
        var name = String(e.name || '').replace(/^"|"$/g, '');
        html += '<li>' + (e.url ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener"><b>' + esc(name) + '</b></a>' : '<b>' + esc(name) + '</b>') +
          '<span>' + dayLabel(e.date) + (e.time ? ', ' + esc(e.time) : '') + (e.location ? ' · ' + esc(e.location) : '') +
          (e.price ? ' · ' + esc(e.price) : '') + '</span></li>';
      });
      html += '</ul>';
      if (list.length > shown.length) html += '<p class="a-sub">+' + (list.length - shown.length) + ' ' + t('moreEv') + '</p>';
      return html + '<p class="a-links"><a href="/ativa/">' + t('allEvents') + ' →</a></p>';
    });
  }

  function answer(question) {
    var q = ' ' + norm(question) + ' ';
    return load('levadas', '/ativa/levadas.json').then(function () {
      var trail = findTrail(q);
      if (trail) return answerTrail(trail);
      if (has(q, WORDS.events)) return answerEvents(q);
      if (has(q, WORDS.today)) return answerToday();
      if (has(q, WORDS.weather)) return answerWeather();
      return '<p class="a-sum">' + t('noAnswer') + '</p>';
    });
  }

  // -------------------------------------------------------------------- UI
  function start() {
    var form = document.getElementById('askForm'), input = document.getElementById('askInput'), out = document.getElementById('askOut');
    if (!form) return;
    lang = (document.documentElement.lang || 'en') === 'pt' ? 'pt' : 'en';
    var last = '';
    function run(qs) {
      if (!qs.trim()) return;
      last = qs;
      lang = (document.documentElement.lang || 'en') === 'pt' ? 'pt' : 'en';
      out.innerHTML = '<p class="a-wait">' + t('thinking') + '</p>';
      out.hidden = false;
      answer(qs).then(function (html) {
        if (qs !== last) return;
        out.innerHTML = html;
        converse(qs);
      }).catch(function () { if (qs === last) out.innerHTML = '<p class="a-sum">' + t('failed') + '</p>'; });
      try { history.replaceState(null, '', '?q=' + encodeURIComponent(qs)); } catch (e) {}
    }
    // The conversational layer: the facts just rendered go to the model with
    // the question, and its reply is shown above them. Only when there are
    // facts to give it — a question the page could not ground is not sent —
    // and only if it answers; otherwise the facts stand alone, as before.
    function converse(qs) {
      if (!out.querySelector('.a-facts, .a-list')) return;
      var facts = out.innerText.slice(0, 5800);
      var box = document.createElement('div');
      box.className = 'a-ai';
      box.innerHTML = '<span class="a-ai-tag">✨ AI</span><p class="a-ai-text">' + t('aiWriting') + '</p>';
      out.insertBefore(box, out.firstChild);
      fetch('/ativa/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: qs, lang: lang, facts: facts }),
      }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (qs !== last) return;
        if (!j || !j.answer) { box.remove(); return; }
        box.querySelector('.a-ai-text').textContent = j.answer;
        box.insertAdjacentHTML('beforeend', '<p class="a-ai-note">' + t('aiNote') + '</p>');
      }).catch(function () { box.remove(); });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); });
    document.querySelectorAll('[data-ask]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-ask-' + ((document.documentElement.lang || 'en') === 'pt' ? 'pt' : 'en')) || b.getAttribute('data-ask');
        input.value = q; run(q);
      });
    });
    new MutationObserver(function () { if (last) run(last); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    var q0 = new URLSearchParams(location.search).get('q');
    if (q0) { input.value = q0; run(q0); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
