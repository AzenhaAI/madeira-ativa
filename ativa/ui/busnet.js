// Madeira Ativa — the island bus network on /bus: every line on a map, stops
// with their next departures, a From → To search for direct lines, and the full
// SIGA list. Data: /ativa/bus/network.json (scripts/build_bus_network.py) and
// /ativa/bus/stops/<id>.json for the Funchal stops that have a real timetable.
(function () {
  var t = MA.t, esc = MA.esc, NET = null, map = null, layers = {}, stopLayer = null, hl = null, mode = 'all';

  function decode(str) {
    var pts = [], i = 0, lat = 0, lon = 0;
    while (i < str.length) {
      for (var k = 0; k < 2; k++) {
        var b, shift = 0, res = 0;
        do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        var d = (res & 1) ? ~(res >> 1) : (res >> 1);
        if (k === 0) lat += d; else lon += d;
      }
      pts.push([lat / 1e5, lon / 1e5]);
    }
    return pts;
  }
  function nowMin() {
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Atlantic/Madeira', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':');
    return +p[0] * 60 + +p[1];
  }
  // Sentences with the name inside stay whole for translation (de.js looks up
  // the English template, not the pieces around a name).
  function fmt(s) { var a = arguments; return s.replace(/\{(\d)\}/g, function (_, i) { return a[+i + 1]; }); }
  function hhmm(m) { m = m % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  // SIGA renumbered every line in 2026 (23 -> 701, 139 -> 340…). The buses and
  // stops are changing over, so both numbers are shown until the old one fades.
  function numChanged(l) { return !!l.new && String(l.new).replace(/^0+/, '') !== String(l.ref).replace(/^0+/, ''); }
  function chip(li, num) {
    var l = NET.lines[li], named = !/^\d/.test(String(l.ref)), now = num || l.new, ch = !named && !!now && String(now).replace(/^0+/, '') !== String(l.ref).replace(/^0+/, '');
    return '<span class="bl" style="background:' + esc(l.color) + '">' + esc(named ? l.ref : ch ? now : l.ref) + '</span>' +
      (ch ? '<small class="bl-old" title="' + esc(t('Old number', 'Número antigo')) + '">' + esc(l.ref) + '</small>' : '');
  }
  // How often a line runs, from its timetable: said on the card, and a rare
  // bus never wins over a frequent one.
  // A city line's pattern carries its weekday trips (GTFS); fewer than four
  // means the bus is not a way to get anywhere today.
  function svcOf(l, p) { return l.src === 'gtfs' && p && p.trips != null && p.trips <= 3 ? 'few' : l.svc; }
  function svcNote(l, p) {
    var v = svcOf(l, p);
    return v === 'sundays' ? t('Sundays and holidays only', 'Só domingos e feriados')
      : v === 'weekends' ? t('Weekends only', 'Só fins de semana')
      : v === 'school' ? t('School days only', 'Só em dias de escola')
      : v === 'weekdays-few' ? t('Weekdays only, a few buses a day', 'Só dias úteis, poucos autocarros por dia')
      : v === 'weekdays' ? t('Weekdays only', 'Só dias úteis')
      : v === 'few' ? t('A few buses a day', 'Poucos autocarros por dia') : '';
  }
  function svcCost(l, p) {
    var v = svcOf(l, p);
    return v === 'school' || v === 'sundays' ? 120 : v === 'weekends' ? 80 : v === 'weekdays-few' || v === 'few' ? 60 : v === 'weekdays' ? 15 : 0;
  }
  // Weekday buses per direction (timetables): 3 a day costs far more than 20.
  function freqCost(l) { return l.freq ? Math.min(40, 60 / l.freq) : 0; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  // OSM joins alternative names with ";" ("Rua do Matadouro;03 - Campo da Barca").
  function stopName(i) { return NET.stops[i][1].split(';')[0].trim(); }
  function km(m) { var v = (m / 1000).toFixed(1); return (MA.lang && MA.lang() !== 'en' ? v.replace('.', ',') : v) + ' km'; }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  // How a name sounds, so "Canico", "Caniso" and "Caniço" meet, and "Machiko"
  // finds Machico: ç/z/ss -> s, c and qu -> k (s before e/i), Portuguese ch -> x,
  // lh/nh, silent h, doubled letters.
  // "s vicente", "sta cruz", "rib brava", "ponta pargo", "camara lobos":
  // abbreviations opened up and the little words (do, da, de…) left out.
  var ABBR = { s: 'sao', sta: 'santa', sto: 'santo', rib: 'ribeira', r: 'rua', av: 'avenida', est: 'estrada', estr: 'estrada', trav: 'travessa', cam: 'caminho', n: 'nossa', sra: 'senhora' };
  var SMALLW = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1 };
  function words(x) {
    return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
      .filter(Boolean).map(function (w) { return ABBR[w] || w; }).filter(function (w) { return !SMALLW[w]; });
  }
  function phon(x) {
    x = String(x || '').toLowerCase().replace(/ç/g, 's').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    x = x.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).map(function (w) { return ABBR[w] || w; }).filter(function (w) { return w && !SMALLW[w]; }).join(' ');
    return x.replace(/qu(?=[ei])/g, 'k').replace(/qu/g, 'kw').replace(/ch/g, 'x').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k')
      .replace(/ph/g, 'f').replace(/lh/g, 'ly').replace(/nh/g, 'ny').replace(/z/g, 's').replace(/y/g, 'i').replace(/w/g, 'v')
      .replace(/(^|\s)h/g, '$1').replace(/[^a-z0-9 ]/g, ' ').replace(/([a-z])\1+/g, '$1').replace(/\s+/g, ' ').trim();
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var lo = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < lo) lo = cur[j];
      }
      if (lo > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function dist(a, b) {
    var R = 6371000, dl = (b[0] - a[0]) * Math.PI / 180, dn = (b[1] - a[1]) * Math.PI / 180;
    var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dn / 2) * Math.sin(dn / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // ---- departures at a GTFS stop (cached per stop)
  var depCache = {};
  function departures(stopIdx, filterLine, filterHead, n) {
    var s = NET.stops[stopIdx];
    if (s[5] !== 'gtfs') return Promise.resolve(null);
    var p = depCache[s[0]] || (depCache[s[0]] = MA.get('/ativa/bus/stops/' + s[0] + '.json'));
    return p.then(function (doc) {
      if (!doc) return [];
      var today = MA.today(), tmr = MA.addDays(today, 1), now = nowMin(), out = [];
      [[today, 0], [tmr, 1440]].forEach(function (d) {
        (NET.services[d[0]] || []).forEach(function (svc) {
          (doc[svc] || []).forEach(function (x) {
            var m = x[0] + d[1];
            if (m < now || m > now + 1440) return;
            if (filterLine != null && x[1] !== filterLine) return;
            if (filterHead != null && !filterHead[x[2]]) return;
            out.push([m, x[1], x[2]]);
          });
        });
      });
      out.sort(function (a, b) { return a[0] - b[0]; });
      return out.slice(0, n || 6);
    });
  }
  // The Funchal GTFS covers a window (NET.gtfs_valid); outside it, or when the
  // feed failed, "no departures" would be a lie.
  function feedCoversToday() {
    var v = NET.gtfs_valid || [], d = MA.today().replace(/-/g, '');
    return !!(NET.services && NET.services[MA.today()]) || (v[0] && v[1] && d >= v[0] && d <= v[1]);
  }
  function depHtml(list) {
    if (list == null) return '';
    if (!list.length && !feedCoversToday()) return '<div class="bn-empty">' + t('Timetable not available for today — check the operator’s site.', 'Horário indisponível para hoje — consulte o site do operador.') + '</div>';
    if (!list.length) return '<div class="bn-empty">' + t('No more departures in the next 24 hours.', 'Sem partidas nas próximas 24 horas.') + '</div>';
    return '<div class="bn-deps">' + list.map(function (x) {
      return '<div><b>' + (x[0] >= 1440 ? t('tmrw', 'amanhã') + ' ' : '') + hhmm(x[0]) + '</b> ' + chip(x[1]) + ' ' + esc(x[2]) + '</div>';
    }).join('') + '</div>';
  }

  // ---- map
  function drawLines() {
    Object.keys(layers).forEach(function (k) { map.removeLayer(layers[k]); });
    layers = {};
    NET.lines.forEach(function (l, i) {
      var city = l.src === 'gtfs';
      if ((mode === 'city' && !city) || (mode === 'inter' && city)) return;
      var g = L.layerGroup();
      l.paths.forEach(function (p) {
        L.polyline(decode(p), { color: l.color, weight: city ? 2.5 : 3.5, opacity: hl ? 0.2 : (city ? 0.7 : 0.85), dashArray: l.approx ? '7 6' : null, renderer: R })
          .on('click', function (e) { lineInfo(i, e.latlng); }).addTo(g);
      });
      g.addTo(map); layers[i] = g;
    });
    drawStops();
  }
  var R, TOUCH = L.Browser.touch, badge = null, drawn = [];
  // Interurban stops (1.3k) are drawn at every zoom: they are what a visitor
  // looks for, and the island view used to show no dot at all. Funchal's 1.7k
  // city stops come in from zoom 12, where they stop being one blob.
  function drawStops() {
    if (stopLayer) map.removeLayer(stopLayer);
    stopLayer = L.layerGroup(); drawn = [];
    var z = map.getZoom(), city_ok = z >= 12, big = TOUCH ? (z >= 13 ? 7 : 5) : (z >= 15 ? 5 : 3.5);
    var bounds = map.getBounds().pad(0.2);
    NET.stops.forEach(function (s, i) {
      var city = s[5] === 'gtfs';
      if (city && !city_ok) return;
      if ((mode === 'city' && !city) || (mode === 'inter' && city)) return;
      if (!bounds.contains([s[2], s[3]]) || !s[4].length) return;
      drawn.push(i);
      L.circleMarker([s[2], s[3]], { radius: city ? big : big + 1, color: '#fff', weight: 1, fillColor: city ? '#B7791F' : '#1F4D32', fillOpacity: 1, renderer: R, interactive: !TOUCH })
        .on('click', function () { stopInfo(i); }).addTo(stopLayer);
    });
    stopLayer.addTo(map);
    if (hl) hl.eachLayer(function (x) { x.bringToFront(); });
    setBadge();
  }
  // On touch the dot itself is not the target: a tap anywhere picks the nearest
  // drawn stop within a finger's width (22 px), and a finger that wobbles a few
  // pixels no longer counts as a drag that cancels the click.
  function pickStop(e) {
    if (!TOUCH || !drawn.length) return;
    var pt = map.latLngToContainerPoint(e.latlng), best = -1, bd = 22;
    drawn.forEach(function (i) {
      var s = NET.stops[i], q = map.latLngToContainerPoint([s[2], s[3]]), d = Math.max(Math.abs(q.x - pt.x), Math.abs(q.y - pt.y));
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { stopInfo(best); return true; }
  }
  // One small overlay says what the map can do right now, instead of a grey
  // paragraph under it that nobody reads: zoom for the city stops, or tap to
  // start panning (the map starts inert on touch so the page can scroll).
  function setBadge() {
    var txt = !map.dragging.enabled() ? t('Tap the map to move it', 'Toque no mapa para o mover')
      : hl ? t('Clear route', 'Limpar percurso')
      : map.getZoom() < 12 ? t('Zoom in for Funchal stops', 'Aproxime para ver as paragens do Funchal') : '';
    if (!badge) {
      badge = L.control({ position: 'bottomleft' });
      badge.onAdd = function () {
        var d = L.DomUtil.create('div', 'bn-badge');
        L.DomEvent.disableClickPropagation(d);
        d.onclick = function () {
          if (!map.dragging.enabled()) wakeMap(); else if (hl) clearRoute(); else map.setView([32.648, -16.91], 12);
        };
        return d;
      };
      badge.addTo(map);
    }
    var el = badge.getContainer(); el.textContent = txt; el.style.display = txt ? '' : 'none';
  }
  function wakeMap() {
    map.dragging.enable();
    map.getContainer().style.touchAction = 'none';
    setBadge();
  }
  function lineInfo(i, at) {
    var l = NET.lines[i];
    L.popup().setLatLng(at).setContent('<div class="bn-pop">' + chip(i) + ' <b>' + esc(l.name) + '</b><div class="bn-op">' + esc(l.op || '') + '</div>' +
      (l.approx ? '<div class="bn-op">' + t('Approximate route: town to town from the SIGA timetable, not yet mapped stop by stop.', 'Percurso aproximado: de localidade em localidade pelo horário SIGA, ainda sem as paragens todas.') + '</div>' : '') +
      (l.url ? '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + t('Timetable', 'Horário') + ' ↗</a>' : '') + '</div>').openOn(map);
  }
  function stopInfo(i) {
    var s = NET.stops[i];
    var html = '<div class="bn-pop"><b>' + esc(s[1]) + '</b><div class="bn-lines">' + s[4].map(chip).join(' ') + '</div><div class="bn-wait">…</div></div>';
    var pop = L.popup({ maxWidth: 300 }).setLatLng([s[2], s[3]]).setContent(html).openOn(map);
    departures(i, null, null, window.innerWidth < 600 ? 4 : 8).then(function (list) {
      var extra = s[4].filter(function (li) { return NET.lines[li].src !== 'gtfs' && NET.lines[li].url; })
        .map(function (li) { return '<a href="' + esc(NET.lines[li].url) + '" target="_blank" rel="noopener">' + chip(li) + ' ' + t('timetable', 'horário') + ' ↗</a>'; });
      pop.setContent(html.replace('<div class="bn-wait">…</div>', depHtml(list) + (extra.length ? '<div class="bn-links">' + extra.join(' ') + '</div>' : '')));
    });
  }

  // ---- From → To
  var RANK = { city: 6, town: 5, village: 4, suburb: 3, neighbourhood: 2, hamlet: 2, locality: 1 };
  // Stops for a place, each with its distance from the place's centre (0 for a
  // stop matched by name), so a trip ends in Santana, not at its edge.
  // A point instead of a name ("32.65,-16.91"): Apple Maps hands the app two
  // coordinates, and a trail page knows its own ends. The nearest stops within
  // 1.5 km, or the four nearest within 5 km where the map is thin.
  function parseLL(s) {
    var m = String(s || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    return m ? [+m[1], +m[2]] : null;
  }
  function nearStops(ll, reach) {
    var all = NET.stops.map(function (s, i) { return [i, dist(ll, [s[2], s[3]])]; }).sort(function (x, y) { return x[1] - y[1]; });
    var pick = all.filter(function (x) { return x[1] <= 1500; }).slice(0, 8);
    var out = {};
    if (!pick.length) {
      // The nearest stop and the others not much further: from Queimadas both
      // the São Jorge road and Santana, not only the single closest pole.
      var d0 = all.length ? all[0][1] : 0;
      pick = all.filter(function (x) { return x[1] <= (reach || 5000) && x[1] <= d0 + 2500; }).slice(0, 10);
      // Nothing within walking distance: the answer must say so, not offer a
      // bus to a stop in the next valley as if it were round the corner.
      if (all.length) out._far = all[0];
    }
    pick.forEach(function (x) { out[x[0]] = x[1]; });
    return out;
  }
  // What to call a point in the field: the nearest named place, else the nearest stop.
  function nearLabel(ll) {
    var best = null, bd = 3000;
    NET.places.forEach(function (p) { var d = dist(ll, [p[1], p[2]]); if (d < bd) { bd = d; best = p[0]; } });
    if (!best) NET.stops.forEach(function (s) { var d = dist(ll, [s[2], s[3]]); if (d < bd || !best) { bd = d; best = s[1]; } });
    return '📍 ' + t('Near', 'Perto de') + ' ' + best;
  }
  // What people type that the data calls something else.
  var ALIAS = { 'airport': 'aeroporto', 'flughafen': 'aeroporto', 'funchal airport': 'aeroporto', 'aeroporto da madeira': 'aeroporto',
    'santo da serra': 'santo antonio da serra', 'camara de lobos': 'camara de lobos', 'funchal centre': 'funchal', 'funchal center': 'funchal',
    'ribeira brava': 'ribeira brava', 'sao vicente': 'sao vicente', 'porto santo': 'vila baleira',
    'old town': 'zona velha', 'funchal old town': 'zona velha', 'market': 'mercado dos lavradores', 'farmers market': 'mercado dos lavradores',
    'botanical garden': 'jardim botanico', 'botanical gardens': 'jardim botanico', 'cr7 museum': 'museu cr7', 'casino': 'casino da madeira' };
  // "Alegria  T-42 (641A)" -> "alegria": the stop codes are for the operator.
  function stopKey(name) { return norm(name).replace(/\s*\([^)]*\d[^)]*\)\s*/g, ' ').replace(/[()]/g, ' ').replace(/^\d+\s*-\s*/, '').replace(/\s+t-\d+\w*/g, '').replace(/\s+/g, ' ').trim(); }
  // A name as typed -> the name in the data: exact, alias, then by sound with
  // one or two slips ("Caniso", "Ravbacal"). Returns null when nothing is close.
  var nameIndex = null;
  function names() {
    if (nameIndex) return nameIndex;
    var seen = {}, out = [];
    function add(n, rank) { var k = norm(n); if (!k || seen[k]) return; seen[k] = 1; out.push({ n: n, k: k, p: phon(n), r: rank }); }
    NET.places.forEach(function (p) { if ((RANK[p[3]] || 0) >= 1) add(p[0], RANK[p[3]] + 2); });
    (NET.spots || []).forEach(function (p) { add(p[0], p[3] === 'trail' ? 5 : 3); });
    allNames().forEach(function (n) { add(n, 1); });
    return (nameIndex = out);
  }
  function resolve(text) {
    var q = norm(text);
    if (!q) return null;
    if (ALIAS[q]) return ALIAS[q];
    var idx = names(), i, pq = phon(text);
    for (i = 0; i < idx.length; i++) if (idx[i].k === q) return idx[i].k;
    for (i = 0; i < idx.length; i++) if (idx[i].p === pq) return idx[i].k;
    var max = pq.length >= 7 ? 2 : pq.length >= 5 ? 1 : 0, best = null, bd = max + 1;
    if (!max) return null;
    idx.forEach(function (x) {
      if (x.p[0] !== pq[0]) return;
      var d = lev(pq, x.p, max);
      if (d < bd || (d === bd && best && x.r > best.r)) { bd = d; best = x; }
    });
    return best && bd <= max ? best.k : null;
  }
  // Street addresses ("Estrada Monumental 106", "106 Estrada Monumental"):
  // /ativa/bus/addresses.json, loaded the first time a search carries a number.
  // OSM does not number every house, so the nearest number on the street wins.
  var ADDR = null;
  function addrParts(text) {
    var v = String(text || '').trim(), m = v.match(/^(.*?\D)[\s,]*(?:n\.?\s*º?\s*)?(\d{1,4})\s*[a-z]?$/i) || v.match(/^(\d{1,4})\s*[a-z]?[\s,]+(.*\D.*)$/i);
    if (!m) return null;
    return /^\d/.test(m[1]) ? { street: m[2], n: +m[1] } : { street: m[1], n: +m[2] };
  }
  function looksLikeAddress(el) { return !ll_of(el) && !parseLL(el.value) && !!addrParts(el.value); }
  function findAddress(text) {
    var a = addrParts(text); if (!a || !ADDR) return null;
    var q = phon(a.street.replace(/[,.]+$/, '')), best = null, bs = -1;
    Object.keys(ADDR).forEach(function (st) {
      var p = phon(st), sc = p === q ? 3 : (p.length > q.length && p.slice(-q.length) === q && p[p.length - q.length - 1] === ' ') ? 2 : (q.length >= 7 && lev(q, p, 2) <= 2) ? 1 : 0;
      if (sc > bs || (sc === bs && sc > 0 && ADDR[st].length > ADDR[best].length)) { bs = sc; best = st; }
    });
    if (!best || bs < 1) return null;
    var hit = ADDR[best].reduce(function (x, y) { return Math.abs(y[0] - a.n) < Math.abs(x[0] - a.n) ? y : x; });
    return { lat: hit[1], lon: hit[2], label: best + ' ' + hit[0], exact: hit[0] === a.n };
  }
  function candHas(text) { return Object.keys(candidates(text)).some(function (k) { return k[0] !== '_'; }); }
  function spotOf(q) {
    var hit = null;
    (NET.spots || []).forEach(function (p) { if (!hit && norm(p[0]) === q) hit = p; });
    return hit;
  }
  function candidates(text) {
    var ll = parseLL(text);
    if (ll) return nearStops(ll);
    var q = norm(text);
    if (!q) return {};
    q = ALIAS[q] || q;
    // A trailhead, summit or viewpoint that is not also a town: its own point,
    // the stops within walking distance, else the nearest ones and how far.
    var spot = spotOf(q), town = NET.places.some(function (p) { return norm(p[0]) === q && (RANK[p[3]] || 0) >= 2; });
    var byName = NET.stops.some(function (s) { return stopKey(s[1]).indexOf(q) === 0; });
    if (spot && !town && !byName) { var o = nearStops([spot[1], spot[2]], 12000); o._spot = spot; delete o._others; return o; }
    // Several places share a name ("Monte" in Funchal and in Ponta do Sol):
    // the one with more stops around is the one people mean.
    var best = null, bestN = -1;
    NET.places.forEach(function (p) {
      if (norm(p[0]) !== q) return;
      var n = 0;
      NET.stops.forEach(function (s) { if (s[4].length && Math.abs(s[2] - p[1]) < 0.01 && Math.abs(s[3] - p[2]) < 0.012 && dist([p[1], p[2]], [s[2], s[3]]) < 800) n++; });
      // A town (Santana) always beats a district of the same name (Santana in
      // Funchal); among villages and districts, the one with more stops.
      var big = (RANK[p[3]] || 0) >= 5, bigBest = best && (RANK[best[3]] || 0) >= 5;
      if (!best || (big && !bigBest) || (big === bigBest && (n > bestN || (n === bestN && (RANK[p[3]] || 0) > (RANK[best[3]] || 0))))) { best = p; bestN = n; }
    });
    var out = {}, r = best ? (q === 'funchal' ? 1800 : best[3] === 'city' ? 1000 : best[3] === 'town' ? 900 : 700) : 0;
    var qw = words(text);
    NET.stops.forEach(function (s, i) {
      if (norm(s[1]) === q || stopKey(s[1]) === q) { out[i] = 0; return; }
      if (best) { var d = dist([best[1], best[2]], [s[2], s[3]]); if (d <= r) out[i] = d; }
      else if (q.length > 3 && stopKey(s[1]).indexOf(q) >= 0) out[i] = 0;
      else if (qw.length) {
        // Every typed word starts a word of the stop's name: "estacao machico".
        var sw = words(stopKey(s[1]));
        if (qw.every(function (w) { return sw.some(function (x) { return x.indexOf(w) === 0; }); })) out[i] = 0;
      }
    });
    // One name, several places ("Teleférico": Funchal, Jardim Botânico,
    // Garajau…): keep the group with the most stops, offer the others.
    if (!best) {
      var ids = Object.keys(out), groups = [];
      ids.forEach(function (k) {
        var s = NET.stops[k], g = groups.filter(function (x) { return dist([x.lat, x.lon], [s[2], s[3]]) < 1500; })[0];
        if (g) g.ids.push(k); else groups.push({ lat: s[2], lon: s[3], ids: [k], name: s[1] });
      });
      if (groups.length > 1) {
        // The best name match first ("01 - Aeroporto", "Aeroporto-Zona 25"
        // before "Estrada do Aeroporto"), then the group with more stops.
        var quality = function (g) {
          return Math.max.apply(null, g.ids.map(function (k) {
            var n = stopKey(NET.stops[k][1]).replace(/^\d+\s*-\s*/, '');
            return n === q ? 3 : n.indexOf(q) === 0 ? 2 : 1;
          }));
        };
        groups.forEach(function (g) { g.q = quality(g); });
        groups.sort(function (a, b) { return b.q - a.q || b.ids.length - a.ids.length; });
        var keep = {}; groups[0].ids.forEach(function (k) { keep[k] = out[k]; });
        keep._others = groups.slice(1, 5).map(function (g) { return g.name.replace(/\s*\(.*?\)/g, '').replace(/\s+T-\d+\w*/g, '').trim(); });
        keep._chosen = groups[0].name.replace(/\s*\(.*?\)/g, '').replace(/\s+T-\d+\w*/g, '').trim();
        out = keep;
      }
    }
    // A stop typed by its sign ("Estação de Machico", "Teleférico-Término"):
    // the timetable's town stop a few hundred metres off, and any stop a short
    // walk away, are the same place for the bus.
    if (!best) {
      var named0 = Object.keys(out).filter(function (k) { return out[k] === 0; }).slice(0, 12);
      NET.stops.forEach(function (s, i) {
        if (i in out || !s[4].length) return;
        named0.forEach(function (k) {
          var d = dist([NET.stops[k][2], NET.stops[k][3]], [s[2], s[3]]);
          if ((d < 400 || (s[5] === 'siga' && d < 700)) && (!(i in out) || d < out[i])) out[i] = d;
        });
      });
    }
    // A town with no mapped stop inside its radius (Caniçal): the nearest ones
    // within 3 km, then stops whose name carries the word.
    if (best && !Object.keys(out).length) {
      NET.stops.map(function (s, i) { return [i, dist([best[1], best[2]], [s[2], s[3]])]; })
        .filter(function (x) { return x[1] <= 3000; }).sort(function (x, y) { return x[1] - y[1]; }).slice(0, 6)
        .forEach(function (x) { out[x[0]] = x[1]; });
      if (!Object.keys(out).length) NET.stops.forEach(function (s, i) { if (norm(s[1]).indexOf(q) >= 0) out[i] = 0; });
    }
    return out;
  }
  // What a ride costs, in "stops": a line drawn town by town has one stop
  // between Estrada Monumental and Funchal, so its length counts by distance
  // (a city bus stops every ~400 m); an interurban bus also costs the wait.
  function legCost(p, i, k) {
    var l = NET.lines[p.line], n = stopCount(p, i, k);
    if (l.src === 'gtfs') return n + svcCost(l, p) / 2;
    var a = NET.stops[p.stops[i]], b = NET.stops[p.stops[k]];
    return Math.max(n, dist([a[2], a[3]], [b[2], b[3]]) / 600) + 8 + svcCost(l, p) / 2 + freqCost(l) + (/^aerobus$/i.test(l.ref) ? 12 : 0);
  }
  // OSM maps a stop twice (the pole and the platform): count names, not nodes.
  function stopCount(p, i, k) {
    var seen = {}, n = 0;
    for (var x = i + 1; x <= k; x++) { var nm = NET.stops[p.stops[x]][1]; if (!seen[nm]) { seen[nm] = 1; n++; } }
    return n;
  }
  function search() {
    searchCore();
    var box = document.getElementById('bnRes');
    if (box && box.getBoundingClientRect().top > window.innerHeight * 0.7) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function searchCore() {
    var fa0 = document.getElementById('bnFrom'), fb0 = document.getElementById('bnTo');
    if (ADDR === null && (looksLikeAddress(fa0) || looksLikeAddress(fb0)) && !(candHas(fa0.value) && candHas(fb0.value))) {
      document.getElementById('bnRes').innerHTML = '<p class="empty">' + t('Looking up the address…', 'A procurar a morada…') + '</p>';
      MA.get('/ativa/bus/addresses.json').then(function (d) { ADDR = d || {}; searchCore(); });
      return;
    }
    // An empty field takes its placeholder: "Find" on a fresh page shows the example.
    var fa = document.getElementById('bnFrom'), fb = document.getElementById('bnTo'), box = document.getElementById('bnRes');
    // The example pair (data-example) fills an untouched fresh form, so "Find"
    // on a fresh page shows what a result looks like. A field left empty after
    // a link filled the other one (a trail's "by bus" button) is asked for,
    // not guessed: it used to search for the placeholder "Where from?".
    if (!fa.value.trim() && fb.value.trim() && !fb.dataset.example) {
      box.innerHTML = '<p class="empty">' + t('Type where you start from — a town or a stop.', 'Escreva de onde parte — uma localidade ou uma paragem.') + '</p>';
      return;
    }
    if (!fa.value.trim()) fa.value = fa.dataset.example || '';
    if (!fb.value.trim()) fb.value = fb.dataset.example || '';
    clearRoute();
    TLEGS = []; SEARCH++;
    var sug = document.getElementById('bnSug'); if (sug) sug.hidden = true;
    // What was typed -> what the data calls it ("Caniso" -> Caniço), said aloud.
    var notes = [];
    [fa, fb].forEach(function (el) {
      if (ll_of(el) || !looksLikeAddress(el) || candHas(el.value)) return;
      var h = findAddress(el.value);
      if (!h) return;
      el.dataset.ll = h.lat + ',' + h.lon; el.dataset.label = el.value;
      notes.push(fmt(h.exact ? t('Address found: {0}.', 'Morada encontrada: {0}.') : t('No such house number in the map data — using the nearest: {0}.', 'Esse número não está nos dados do mapa — a usar o mais próximo: {0}.'), '<b>' + esc(h.label) + '</b>'));
    });
    [fa, fb].forEach(function (el) {
      if (ll_of(el)) return;
      var r = resolve(el.value);
      if (!r) return;
      var shown = names().filter(function (x) { return x.k === r; })[0];
      if (r !== norm(el.value)) {
        el.value = shown ? shown.n : el.value;
        notes.push(fmt(t('Showing results for {0}.', 'A mostrar resultados para {0}.'), '<b>' + esc(el.value) + '</b>'));
      } else if (shown && shown.n !== el.value) el.value = shown.n;
    });
    var a = ll_of(fa) || fa.value, b = ll_of(fb) || fb.value;
    var SA = candidates(a), SB = candidates(b);
    var count = function (S) { return Object.keys(S).filter(function (k) { return k[0] !== '_'; }).length; };
    if (!count(SA) || !count(SB)) {
      var missEl = !count(SA) ? fa : fb, miss = missEl.value;
      box.innerHTML = '<p class="empty">' + fmt(t('No stop or place found for “{0}”.', 'Nenhuma paragem ou local para «{0}».'), esc(miss)) + ' ' + didYouMean(miss, missEl.id) + '</p>';
      return;
    }
    [[SA, fa], [SB, fb]].forEach(function (x) {
      if (!x[0]._others) return;
      notes.push(fmt(t('Several places are called “{0}”: showing {1}. Others:', 'Há vários locais chamados «{0}»: a mostrar {1}. Outros:'), esc(x[1].value), '<b>' + esc(x[0]._chosen) + '</b>') + ' ' +
        x[0]._others.map(function (n) { return '<button type="button" class="chip bn-sug" data-f="' + x[1].id + '" data-v="' + esc(n) + '">' + esc(n) + '</button>'; }).join(' '));
    });
    // A trailhead with no bus: say how close the buses come, then show them.
    [[SA, fa], [SB, fb]].forEach(function (x) {
      var S = x[0], f = S._far;
      var road = S._spot && S._spot[6];
      if (S._spot && (road && road.length ? road[0][1] > 1500 : f && f[1] > 1000)) {
        var list = (road && road.length ? road : f ? [[f[0], f[1]]] : []).map(function (r) {
          var st = NET.stops[r[0]];
          return '<b>' + esc(st[1].replace(/\s*\([^)]*\d[^)]*\)/g, '')) + '</b> ' + st[4].slice(0, 3).map(function (li) { return chip(li); }).join(' ') + ' — ' + km(r[1]) + (road ? ' ' + t('by road', 'por estrada') : '');
        });
        notes.push(fmt(t('No bus goes to {0}{1}. Nearest stops:', 'Nenhum autocarro vai a {0}{1}. Paragens mais próximas:'),
          '<b>' + esc(x[1].value) + '</b>', S._spot[5] ? ' (' + S._spot[5] + ' m)' : '') + '<br>' + list.join('<br>') + '<br>' +
          t('The rest is a walk uphill, a taxi or a tour.', 'O resto é a pé a subir, de táxi ou em excursão.'));
        if (road && road.length) {
          // Plan to the stops the road reaches first, not across a ridge.
          Object.keys(S).forEach(function (k) { if (k[0] !== '_') delete S[k]; });
          road.forEach(function (r) { S[r[0]] = r[1]; });
        }
      }
    });
    // How far a stop may be from what was typed before it is worth saying:
    // Funchal is a city (the Rodoeste station is a kilometre from its centre).
    var limit = function (el, S) {
      // Funchal is big (its stations are a kilometre from the centre); other
      // towns are small, and 900 m out of Câmara de Lobos is worth saying.
      if (S._spot || ll_of(el)) return 300;
      var q = norm(el.value), p = NET.places.filter(function (x) { return norm(x[0]) === q; })[0];
      return p ? (q === 'funchal' ? 2500 : p[3] === 'city' || p[3] === 'town' ? 600 : 500) : 800;
    };
    var la = limit(fa, SA), lb = limit(fb, SB);
    var far = function (d, el, lim) { return d > lim ? ' <span class="bn-far">' + (d >= 1000 ? km(d) : Math.round(d) + ' m') + ' ' + t('from', 'de') + ' ' + esc(el.value.replace(/^📍\s*/, '')) + '</span>' : ''; };
    var gq = function (el) { return ll_of(el) || (el.value + ', Madeira'); };
    var gmaps = '<a class="bn-gmaps" href="https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=' + encodeURIComponent(gq(fa)) + '&destination=' + encodeURIComponent(gq(fb)) + '" target="_blank" rel="noopener">' + t('Compare in Google Maps', 'Comparar no Google Maps') + ' ↗</a>';
    var head = (notes.length ? '<p class="sub bn-note">' + notes.join('<br>') + '</p>' : '') + '<p class="sub">' + gmaps + '</p>';
    var found = {};
    NET.patterns.forEach(function (p) {
      // Among the boarding and alighting stops this pattern serves, the pair
      // closest to the two centres, boarding before alighting.
      var bi = -1, bk = -1, bestScore = Infinity;
      for (var i = 0; i < p.stops.length; i++) {
        if (!(p.stops[i] in SA)) continue;
        for (var k = i + 1; k < p.stops.length; k++) {
          if (!(p.stops[k] in SB)) continue;
          var sc = SA[p.stops[i]] + SB[p.stops[k]];
          if (sc < bestScore) { bestScore = sc; bi = i; bk = k; }
        }
      }
      if (bi < 0) return;
      var key = p.line, cnt = stopCount(p, bi, bk), f = found[key], cost = legCost(p, bi, bk);
      // A pattern through a footnoted town ("g – via Gaula") answers only for
      // some buses: it counts, but loses to the plain one and says so.
      var part = (p.via || []).filter(function (n) { return n === NET.stops[p.stops[bi]][1] || n === NET.stops[p.stops[bk]][1]; });
      var sc2 = bestScore + (part.length ? 50 : 0);
      if (!f) f = found[key] = { line: p.line, heads: {}, head: p.head, from: p.stops[bi], to: p.stops[bk], n: cnt, c: cost, sc: sc2, part: part, pat: p, bk: bk };
      f.heads[p.head] = 1;
      if (sc2 < f.sc) { f.head = p.head; f.from = p.stops[bi]; f.to = p.stops[bk]; f.n = cnt; f.c = cost; f.sc = sc2; f.part = part; f.pat = p; f.bk = bk; }
    });
    // A town-to-town approximation scores 0 at its town "stop" and would always
    // outrank the same line mapped stop by stop; and one line under two ids
    // (142 drawn from SIGA and 142 from OSM) is one card.
    var seenRef = {};
    var res = Object.keys(found).map(function (k) { return found[k]; })
      .sort(function (x, y) {
        var lx = NET.lines[x.line], ly = NET.lines[y.line];
        var cx = x.sc + (lx.approx ? 300 : 0) + (svcCost(lx, x.pat) + freqCost(lx)) * 20, cy = y.sc + (ly.approx ? 300 : 0) + (svcCost(ly, y.pat) + freqCost(ly)) * 20;
        return (cx - cy) || (x.c - y.c);
      })
      .filter(function (r) { var l = NET.lines[r.line], k = l.ref + '|' + (l.op || ''); if (seenRef[k]) return false; seenRef[k] = 1; return true; }).slice(0, 8);
    if (!res.length) { transfers(SA, SB, box, head); return; }
    // A direct ride of 30+ stops, or only rare buses: a change may be the real answer.
    var slog = res.every(function (r) {
      var l = NET.lines[r.line];
      return (l.src === 'gtfs' && r.n > 30) || svcCost(l, r.pat) >= 60 || (l.freq && l.freq < 2);
    });
    box.innerHTML = head + res.map(function (r, n) {
      var l = NET.lines[r.line];
      var num = r.pat && r.pat.num, alt = r.pat && r.pat.alt, sv = svcNote(l, r.pat);
      return '<div class="card bn-r"><div>' + chip(r.line, num) + ' <b>' + esc(r.head || l.name) + '</b>' + (l.approx ? ' <span class="bn-approx">' + t('approx. route', 'percurso aprox.') + '</span>' : '') + '</div>' +
        (sv ? '<div class="bn-op bn-svc">⚠️ ' + esc(sv) + '</div>' : '') +
        (l.title ? '<div class="bn-op bn-title">' + esc(l.title) + (l.op ? ' · ' + esc(l.op) : '') + (alt && alt.length ? ' · ' + t('also numbered', 'também') + ' ' + esc(alt.join(', ')) : '') + '</div>' : '') +
        '<div class="bn-op">' + t('Board at', 'Embarque em') + ' <b>' + esc(NET.stops[r.from][1]) + '</b>' + far(SA[r.from], fa, la) + ' → <b>' + esc(NET.stops[r.to][1]) + '</b>' + far(SB[r.to], fb, lb) + (l.src === 'gtfs' ? ' · ' + plural(r.n, t('stop', 'paragem'), t('stops', 'paragens')) : '') + '</div>' +
        (r.part && r.part.length ? '<div class="bn-op bn-far">' + fmt(t('Only some buses go via {0} — check the timetable.', 'Só alguns autocarros passam por {0} — veja o horário.'), esc(r.part.join(', '))) + '</div>' : '') +
        (lb < 2500 && l.src !== 'gtfs' ? otherStops(r, SB) : '') +
        '<div id="bnR' + n + '"></div>' +
        (l.src !== 'gtfs' ? '<div class="bn-op">' + t('Times: ', 'Horas: ') + (l.url ? '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + t('timetable', 'horário') + ' (SIGA) ↗</a>' : t('on the operator’s timetable', 'no horário do operador')) + '</div>' : '') +
        ' <button type="button" class="btn ghost bn-show" data-r="' + n + '">' + t('Show on map', 'Ver no mapa') + '</button></div>';
    }).join('');
    res.forEach(function (r, n) {
      // Only the Funchal GTFS lines have departures per stop; a CAM line from a
      // city stop would read "no more departures", which is not true.
      if (NET.lines[r.line].src !== 'gtfs') return;
      var token = SEARCH;
      departures(r.from, r.line, r.heads, 4).then(function (list) { var el = document.getElementById('bnR' + n); if (el && token === SEARCH) el.innerHTML = depHtml(list); });
    });
    // The best answer goes on the map at once; the button brings the map into view.
    showRoute([res[0]]);
    if (slog) {
      var more = document.createElement('div'); more.id = 'bnMore'; box.appendChild(more);
      var onDirect = {}; res.forEach(function (r) { onDirect[r.line] = 1; });
      transfers(SA, SB, more, '', true, onDirect);
    }
    box.onclick = function (e) {
      var btn = e.target.closest('.bn-show'); if (!btn) return;
      if (btn.dataset.t != null) showRoute(TLEGS[+btn.dataset.t]); else showRoute([res[+btn.dataset.r]]);
      mapIntoView();
    };
  }
  // Draws the lines of a trip (one leg, or two with a change) and marks where
  // to board, change and get off. Same renderer as the stops: a layer without
  // one made Leaflet add a second canvas on top, and nothing underneath could
  // be tapped again.
  function showRoute(legs) {
    if (hl) map.removeLayer(hl);
    var parts = [], pts = [], fitPts = [];
    legs.forEach(function (r) {
      var l = NET.lines[r.line], A = NET.stops[r.from], B = NET.stops[r.to], a = [A[2], A[3]], b = [B[2], B[3]];
      // The stretch between boarding and alighting, from whichever drawn path
      // passes both closest — not the whole line to its far terminus.
      var best = null;
      l.paths.forEach(function (p) {
        var pts0 = decode(p), ia = 0, ib = 0, da = Infinity, db = Infinity;
        pts0.forEach(function (q, k) { var x = dist(q, a), y = dist(q, b); if (x < da) { da = x; ia = k; } if (y < db) { db = y; ib = k; } });
        if (!best || da + db < best.d) best = { d: da + db, seg: pts0.slice(Math.min(ia, ib), Math.max(ia, ib) + 1) };
      });
      var segs = [];
      if (best && best.d < 3000 && best.seg.length > 1) segs = [best.seg];
      // OSM draws many lines as separate pieces of road: when no one piece
      // runs from boarding to alighting, every piece between the two is drawn.
      var span = dist(a, b);
      var covered = segs.length ? dist(segs[0][0], segs[0][segs[0].length - 1]) : 0;
      if (covered < 0.6 * span) {
        var box = L.latLngBounds([a, b]).pad(0.15);
        segs = [];
        l.paths.forEach(function (p) {
          var pts0 = decode(p).filter(function (q) { return box.contains(q); });
          if (pts0.length > 1) segs.push(pts0);
        });
      }
      if (!segs.length) segs = [[a, b]];
      segs.forEach(function (seg) {
        var straight = seg.length === 2 && seg[0] === a;
        parts.push(L.polyline(seg, { color: l.color, weight: 7, opacity: 0.9, renderer: R, interactive: false, dashArray: straight ? '8 8' : null }));
        seg.forEach(function (q) { fitPts.push(q); });
      });
      pts.push(a); pts.push(b);
    });
    pts.forEach(function (ll, i) {
      parts.push(L.circleMarker(ll, { radius: 9, color: '#fff', weight: 2, fillColor: i === 0 || i === pts.length - 1 ? '#993C1D' : '#B7791F', fillOpacity: 1, renderer: R, interactive: false }));
    });
    hl = L.layerGroup(parts).addTo(map);
    // The rest of the network fades so the trip reads at a glance.
    Object.keys(layers).forEach(function (k) { layers[k].eachLayer(function (p) { p.setStyle({ opacity: 0.2 }); }); });
    map.fitBounds(L.latLngBounds(fitPts.concat(pts)).pad(0.15), { maxZoom: 14 });
    setBadge();
  }
  function clearRoute() {
    if (!hl) return;
    map.removeLayer(hl); hl = null;
    drawLines();
  }

  // One change: ride line 1 from A to a stop X, walk at most ~250 m (same grid
  // cell or a neighbour), ride line 2 from X to B. Ranked by stops ridden.
  // Funchal's interurban terminals (Rodoeste station, the SAM terminal on
  // Avenida do Mar) and the timetables' "Funchal" are 1–1.5 km apart: a walk
  // across the centre, which a change there has to allow.
  var HUB = [32.6497, -16.9087];
  function hub(s) { return s[5] !== 'gtfs' && dist(HUB, [s[2], s[3]]) < 1200; }
  function cellKey(s) { return Math.round(s[2] / 0.0025) + ':' + Math.round(s[3] / 0.0025); }
  function near(s) {
    var a = Math.round(s[2] / 0.0025), b = Math.round(s[3] / 0.0025), out = [];
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) out.push((a + i) + ':' + (b + j));
    if (hub(s)) out.push('FNC');
    return out;
  }
  var TLEGS = [], SEARCH = 0;
  function mapIntoView() {
    var m = document.getElementById('busmap'), y = m.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  function transfers(SA, SB, box, head, extra, directLines) {
    head = head || ''; directLines = directLines || {};
    var centre = function (S) {
      var ks = Object.keys(S).filter(function (k) { return k[0] !== '_'; }), la = 0, lo = 0;
      ks.forEach(function (k) { la += NET.stops[k][2]; lo += NET.stops[k][3]; });
      return [la / ks.length, lo / ks.length];
    };
    var cA = centre(SA), cB = centre(SB), direct = dist(cA, cB);
    var bIds = Object.keys(SB).filter(function (k) { return k[0] !== '_'; });
    var aIds = Object.keys(SA).filter(function (k) { return k[0] !== '_'; });
    var walkFromStart = function (si) {
      var s0 = NET.stops[si];
      return si in SA || aIds.some(function (k) { return dist([s0[2], s0[3]], [NET.stops[k][2], NET.stops[k][3]]) < 400; });
    };
    var arrived = function (si) {
      var s0 = NET.stops[si];
      return si in SB || bIds.some(function (k) { return dist([s0[2], s0[3]], [NET.stops[k][2], NET.stops[k][3]]) < 900; });
    };
    var reach = {};   // cell -> best first leg
    NET.patterns.forEach(function (p) {
      var i = -1;
      for (var k = 0; k < p.stops.length; k++) {
        if (i < 0) { if (p.stops[k] in SA) i = k; continue; }
        var key = cellKey(NET.stops[p.stops[k]]), n = stopCount(p, i, k);
        var n2 = legCost(p, i, k), st0 = NET.stops[p.stops[k]], sti = NET.stops[p.stops[i]];
        if (stopName(p.stops[i]) === stopName(p.stops[k])) continue;  // a loop back to where it started
        if (directLines[p.line]) continue;  // this bus goes there itself
        if (dist([st0[2], st0[3]], cB) > dist([sti[2], sti[3]], cB) - 500) continue;  // not getting closer
        if (dist([st0[2], st0[3]], [sti[2], sti[3]]) < 700) continue;  // a walk, not a ride
        var keys = hub(st0) ? [key, 'FNC'] : [key];
        keys.forEach(function (kk) {
          if (!reach[kk] || n2 < reach[kk].n2) reach[kk] = { line: p.line, head: p.head, num: p.num, pat: p, from: p.stops[i], at: p.stops[k], n: n, n2: n2 };
        });
      }
    });
    var best = {};
    NET.patterns.forEach(function (q) {
      var j = -1;
      for (var k = q.stops.length - 1; k >= 0; k--) { if (q.stops[k] in SB) { j = k; break; } }
      if (j < 1) return;
      for (var m = 0; m < j; m++) {
        var cand = near(NET.stops[q.stops[m]]);
        for (var c = 0; c < cand.length; c++) {
          var r = reach[cand[c]];
          if (!r || r.line === q.line || NET.lines[r.line].ref === NET.lines[q.line].ref) continue;
          // No detours: changing in Funchal for a 10 km hop between two east-coast towns.
          var via = NET.stops[q.stops[m]];
          if (dist(cA, [via[2], via[3]]) + dist([via[2], via[3]], cB) > 1.8 * direct + 4000) continue;
          var tot = r.n2 + legCost(q, m, j) + 3, key = r.line + '>' + q.line;
          if (stopName(q.stops[m]) === stopName(q.stops[j])) continue;
          // The first bus already brings you there (Santana → Funchal, then
          // "one stop on a city bus"): not a change worth offering.
          if (arrived(r.at)) continue;
          // The change stop is a walk from where you are (in Funchal, to the
          // SAM terminal): board the second bus there instead.
          if (walkFromStart(q.stops[m])) continue;
          if (directLines[q.line]) continue;  // the second bus itself runs from the start
          var mq = NET.stops[q.stops[m]], jq = NET.stops[q.stops[j]];
          if (dist([jq[2], jq[3]], cB) > dist([mq[2], mq[3]], cB) - 500) continue;
          var walk = dist([NET.stops[r.at][2], NET.stops[r.at][3]], [NET.stops[q.stops[m]][2], NET.stops[q.stops[m]][3]]);
          tot += walk / 250;
          if (!best[key] || tot < best[key].tot) best[key] = { a: r, b: { line: q.line, head: q.head, num: q.num, pat: q, from: q.stops[m], to: q.stops[j], n: stopCount(q, m, j) }, tot: tot };
        }
      }
    });
    var res = Object.keys(best).map(function (k) { return best[k]; }).sort(function (x, y) { return x.tot - y.tot; }).slice(0, 5);
    if (!res.length && extra) return;
    if (!res.length) {
      var f = SA._far || SB._far;
      box.innerHTML = head + '<p class="empty">' + (f
        ? fmt(t('No bus stop within walking distance of that point: the nearest is {0}, {1} km away, and no scheduled bus comes closer.',
            'Não há paragem a pé desse ponto: a mais próxima é {0}, a {1} km, e nenhum autocarro regular chega mais perto.'), esc(NET.stops[f[0]][1]), (f[1] / 1000).toFixed(1))
        : t('No route with one change between these two. Try a nearby town, or check the lines on the map.', 'Sem percurso com uma mudança entre os dois. Experimente uma localidade próxima, ou veja as linhas no mapa.')) + '</p>';
      return;
    }
    var leg = function (x, last) {
      var l = NET.lines[x.line], sv = svcNote(l, x.pat);
      return '<div class="bn-leg"><div>' + chip(x.line, x.num) + ' <b>' + esc(x.head || l.name) + '</b></div>' + (sv ? '<div class="bn-op bn-svc">⚠️ ' + esc(sv) + '</div>' : '') +
        '<div class="bn-op">' + esc(stopName(x.from)) + ' → <b>' + esc(stopName(last)) + '</b>' + (l.src === 'gtfs' ? ' · ' + plural(x.n, t('stop', 'paragem'), t('stops', 'paragens')) : '') +
        (l.src !== 'gtfs' && l.url ? ' · <a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + t('Timetable', 'Horário') + ' ↗</a>' : '') + '</div></div>';
    };
    var base = TLEGS.length;
    res.forEach(function (r) { TLEGS.push([{ line: r.a.line, from: r.a.from, to: r.a.at }, { line: r.b.line, from: r.b.from, to: r.b.to }]); });
    box.innerHTML = head + '<p class="sub">' + (extra ? t('Or with one change:', 'Ou com uma mudança:') : t('No direct line — with one change:', 'Sem linha direta — com uma mudança:')) + '</p>' + res.map(function (r, n) {
      return '<div class="card bn-r">' + leg(r.a, r.a.at) + '<div class="bn-change">↓ ' + t('Change at', 'Mude em') + ' <b>' + esc(stopName(r.a.at)) + '</b>' +
        (r.a.at !== r.b.from ? ' · ' + t('walk to', 'a pé até') + ' <b>' + esc(stopName(r.b.from)) + '</b> (' + Math.round(dist([NET.stops[r.a.at][2], NET.stops[r.a.at][3]], [NET.stops[r.b.from][2], NET.stops[r.b.from][3]]) / 10) * 10 + ' m)' : '') + '</div>' +
        leg(r.b, r.b.to) + '<div id="bnT' + (base + n) + '"></div><button type="button" class="btn ghost bn-show" data-t="' + (base + n) + '">' + t('Show on map', 'Ver no mapa') + '</button></div>';
    }).join('');
    if (!extra) {
      showRoute(TLEGS[base]);
      box.onclick = function (e) { var btn = e.target.closest('.bn-show'); if (!btn) return; showRoute(TLEGS[+btn.dataset.t]); mapIntoView(); };
    }
    res.forEach(function (r, n) {
      var heads = {}; heads[r.a.head] = 1;
      if (NET.lines[r.a.line].src !== 'gtfs') return;
      var token = SEARCH;
      departures(r.a.from, r.a.line, heads, 3).then(function (list) { var el = document.getElementById('bnT' + (base + n)); if (el && list && list.length && token === SEARCH) el.innerHTML = '<div class="bn-op">' + t('First bus leaves', 'O primeiro autocarro parte') + ':</div>' + depHtml(list); });
    });
  }

  // The other stops this bus makes in the destination ("Santana" has several):
  // after the one suggested, within the place the reader typed.
  function otherStops(r, SB) {
    var p = r.pat; if (!p) return '';
    var seen = {}, out = [];
    seen[NET.stops[r.to][1]] = 1;
    for (var k = 0; k < p.stops.length; k++) {
      var si = p.stops[k], nm = NET.stops[si][1];
      if (k === r.bk || !(si in SB) || seen[nm]) continue;
      seen[nm] = 1; out.push(nm.replace(/\s*\(.*?\)/g, ''));
    }
    return out.length ? '<div class="bn-op">' + t('Also stops at', 'Também para em') + ': ' + esc(out.slice(0, 5).join(' · ')) + '</div>' : '';
  }
  function sigaList() {
    var el = document.getElementById('bnAll');
    if (!el) return;
    el.innerHTML = NET.siga.map(function (x) {
      return '<a class="row" href="' + esc(x[2]) + '" target="_blank" rel="noopener"><div class="d"><b>' + esc(x[0]) + '</b></div><div class="t"><b>' + esc(x[1]) + '</b></div><div class="k">↗</div></a>';
    }).join('');
  }

  // A field filled from a link keeps its point while its text is what we wrote.
  function ll_of(el) { return el.dataset.ll && el.value === el.dataset.label ? el.dataset.ll : null; }
  // Closest names for a miss: "Did you mean …", as tappable chips.
  function didYouMean(q, field) {
    var pq = phon(q); if (pq.length < 3) return '';
    var hits = names().map(function (x) { return [x, lev(pq, x.p, 3)]; }).filter(function (x) { return x[1] <= 3; })
      .sort(function (a, b) { return a[1] - b[1] || b[0].r - a[0].r; }).slice(0, 4).map(function (x) { return x[0].n; });
    return hits.length ? '<span class="bn-dym">' + t('Did you mean:', 'Queria dizer:') + ' ' + hits.map(function (n) { return '<button type="button" class="chip bn-sug" data-f="' + esc(field || '') + '" data-v="' + esc(n) + '">' + esc(n) + '</button>'; }).join(' ') + '</span>' : '';
  }
  var namesCache = null;
  function allNames() {
    if (namesCache) return namesCache;
    var seen = {}, out = [];
    NET.places.forEach(function (p) { var k = norm(p[0]); if (!seen[k] && RANK[p[3]] >= 3) { seen[k] = 1; out.push(p[0]); } });
    // Stop names without the operator's codes: "Fundoa Cima  S1A (641)" -> "Fundoa Cima".
    NET.stops.forEach(function (s) {
      var n = s[1].replace(/\s*\(.*?\)/g, '').replace(/\s+T-\d+\w*/g, '').replace(/\s+[DS]\d*[A-Z]?$/, '').replace(/\s+/g, ' ').trim();
      var k = norm(n);
      if (n.length > 2 && !seen[k]) { seen[k] = 1; out.push(n); }
    });
    return (namesCache = out);
  }
  // Suggestions under the field. <datalist> never shows in the iPhone app's
  // WebView, so a visitor typed a town and saw nothing happen.
  function suggest(el) {
    var box = document.getElementById('bnSug'), q = norm(el.value);
    if (!box) return;
    if (q.length < 2 || !NET) { box.hidden = true; return; }
    var pre = [], mid = [], pq = phon(el.value);
    names().slice().sort(function (a, b) { return b.r - a.r; }).forEach(function (x) {
      if (x.k.indexOf(q) === 0 || x.p.indexOf(pq) === 0) pre.push(x.n); else if (x.k.indexOf(' ' + q) > 0 || x.p.indexOf(' ' + pq) > 0) mid.push(x.n);
    });
    var hits = pre.concat(mid).slice(0, 6);
    box.innerHTML = hits.map(function (n) { return '<button type="button" class="bn-sug" data-v="' + esc(n) + '">' + esc(n) + '</button>'; }).join('');
    box.hidden = !hits.length;
    box.dataset.for = el.id;
  }

  function init() {
    if (!window.L || !document.getElementById('busmap')) return;
    var form = document.getElementById('bnForm'), pending = false;
    // Wired before the data: a submit from the keyboard's Go used to reload the page.
    form.onsubmit = function (e) { e.preventDefault(); if (NET) search(); else { pending = true; document.getElementById('bnRes').innerHTML = '<p class="empty">' + t('Loading the network…', 'A carregar a rede…') + '</p>'; } };
    ['bnFrom', 'bnTo'].forEach(function (id) {
      var el = document.getElementById(id);
      el.setAttribute('aria-label', id === 'bnFrom' ? t('From', 'De') : t('To', 'Para'));
      el.addEventListener('input', function () { delete el.dataset.example; suggest(el); });
      el.addEventListener('focus', function () { suggest(el); });
      el.addEventListener('blur', function () { setTimeout(function () { var b = document.getElementById('bnSug'); if (b && b.dataset.for === id && !b.matches(':hover')) b.hidden = true; }, 200); });
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.bn-sug'); if (!b) return;
      var box = document.getElementById('bnSug'), el = document.getElementById((box && box.dataset.for) || 'bnFrom');
      if (b.closest('#bnRes')) el = document.getElementById(b.dataset.f || 'bnTo');
      el.value = b.dataset.v; delete el.dataset.ll; delete el.dataset.example; el.style.boxShadow = '';
      if (box) box.hidden = true;
      if (document.getElementById('bnFrom').value.trim() && document.getElementById('bnTo').value.trim()) search();
    });
    MA.get('/ativa/bus/network.json').then(function (net) {
      if (!net) return;
      NET = net;
      if (TOUCH) L.Draggable.prototype.options.clickTolerance = 12;
      R = L.canvas({ padding: 0.3, tolerance: TOUCH ? 12 : 6 });
      map = L.map('busmap', { zoomControl: true, scrollWheelZoom: false, preferCanvas: true, dragging: !TOUCH });
      if (TOUCH) map.getContainer().style.touchAction = 'pan-y';
      map.on('click', function (e) { if (pickStop(e)) return; if (!map.dragging.enabled()) wakeMap(); });
      map.attributionControl.setPrefix(false);  // no library credit; the OSM line is required and stays
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      // Fit the whole network, whatever the screen: a fixed centre cut off the west on phones.
      map.fitBounds(L.latLngBounds(NET.stops.filter(function (s) { return s[2] < 32.9; }).map(function (s) { return [s[2], s[3]]; })), { padding: [4, 4] });  // Madeira; Porto Santo is a pan away
      map.on('zoomend moveend', drawStops);
      drawLines();
      document.getElementById('bnFind').disabled = false;
      if (pending) search();
      document.getElementById('bnMode').onclick = function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        mode = c.dataset.m;
        document.querySelectorAll('#bnMode .chip').forEach(function (x) { x.classList.toggle('on', x === c); });
        drawLines();
      };
      var city = NET.lines.filter(function (l) { return l.src === 'gtfs'; }).length;
      document.getElementById('bnCount').textContent = NET.lines.length + ' ' + t('lines on the map', 'linhas no mapa') + ' (' + city + ' ' + t('Funchal city', 'urbanas do Funchal') +
        ', ' + (NET.lines.length - city) + ' ' + t('interurban', 'interurbanas') + ') · ' + NET.siga.length + ' ' + t('in the full list below', 'na lista completa abaixo');
      sigaList();
      MA.onLang(function () { if (document.getElementById('bnRes').innerHTML) search(); });
      // ?from=&to= — a place name or "lat,lon", with an optional fromName/toName
      // to show instead of the coordinates. Both given: search at once. Only the
      // destination (Apple Maps from "My Location", a trail's "by bus" button):
      // fill it and leave the start to the reader.
      var sp = new URLSearchParams(location.search), any = false;
      ['from', 'to'].forEach(function (k) {
        var v = sp.get(k), el = document.getElementById(k === 'from' ? 'bnFrom' : 'bnTo');
        if (!v) return;
        any = true;
        var ll = parseLL(v);
        if (ll) { el.dataset.ll = v; el.value = el.dataset.label = sp.get(k + 'Name') || nearLabel(ll); } else el.value = v;
        delete el.dataset.example;
      });
      if (any) {
        if (sp.get('from') && sp.get('to')) search();
        else {
          // Point at the empty start without focusing it: a programmatic focus
          // inside the app's WebView raised the keyboard and hung the page.
          var f = document.getElementById('bnFrom');
          f.placeholder = t('Where from?', 'De onde?');
          delete f.dataset.example;
          f.style.boxShadow = '0 0 0 2px #2e9e5b';
        }
        // After the trail list below has rendered, or the page is still short and
        // the browser lands somewhere else.
        setTimeout(function () { document.getElementById('bnForm').scrollIntoView({ block: 'start' }); }, 600);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
