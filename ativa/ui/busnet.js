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
  function hhmm(m) { m = m % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  function chip(li) {
    var l = NET.lines[li];
    return '<span class="bl" style="background:' + esc(l.color) + '">' + esc(l.ref) + '</span>';
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
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
        L.polyline(decode(p), { color: l.color, weight: city ? 2.5 : 3.5, opacity: city ? 0.7 : 0.85, dashArray: l.approx ? '7 6' : null, renderer: R })
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
      if (!bounds.contains([s[2], s[3]])) return;
      drawn.push(i);
      L.circleMarker([s[2], s[3]], { radius: city ? big : big + 1, color: '#fff', weight: 1, fillColor: city ? '#B7791F' : '#1F4D32', fillOpacity: 1, renderer: R, interactive: !TOUCH })
        .on('click', function () { stopInfo(i); }).addTo(stopLayer);
    });
    stopLayer.addTo(map);
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
      : map.getZoom() < 12 ? t('Zoom in for Funchal stops', 'Aproxime para ver as paragens do Funchal') : '';
    if (!badge) {
      badge = L.control({ position: 'bottomleft' });
      badge.onAdd = function () {
        var d = L.DomUtil.create('div', 'bn-badge');
        L.DomEvent.disableClickPropagation(d);
        d.onclick = function () {
          if (!map.dragging.enabled()) wakeMap(); else map.setView([32.648, -16.91], 12);
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
  function nearStops(ll) {
    var all = NET.stops.map(function (s, i) { return [i, dist(ll, [s[2], s[3]])]; }).sort(function (x, y) { return x[1] - y[1]; });
    var pick = all.filter(function (x) { return x[1] <= 1500; }).slice(0, 8);
    if (!pick.length) pick = all.filter(function (x) { return x[1] <= 5000; }).slice(0, 4);
    var out = {};
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
    'ribeira brava': 'ribeira brava', 'sao vicente': 'sao vicente', 'porto santo': 'vila baleira' };
  // Places with no scheduled bus at all: say so, instead of "no stop found" or
  // a stop in another valley 3 km away.
  var NOBUS = ['pico do arieiro', 'pico ruivo', 'achada do teixeira', 'rabacal', '25 fontes', 'vinte e cinco fontes', 'fanal', 'paul da serra', 'cabo girao', 'bica da cana', 'boca do risco'];
  // "Alegria  T-42 (641A)" -> "alegria": the stop codes are for the operator.
  function stopKey(name) { return norm(name).replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+t-\d+\w*/g, '').replace(/\s+/g, ' ').trim(); }
  function candidates(text) {
    var ll = parseLL(text);
    if (ll) return nearStops(ll);
    var q = norm(text);
    if (!q) return {};
    q = ALIAS[q] || q;
    if (NOBUS.indexOf(q) >= 0) return { nobus: true };
    var best = null;
    NET.places.forEach(function (p) {
      if (norm(p[0]) === q && (!best || (RANK[p[3]] || 0) > (RANK[best[3]] || 0))) best = p;
    });
    var out = {}, r = best ? (best[3] === 'city' ? 1800 : best[3] === 'town' ? 1000 : 700) : 0;
    NET.stops.forEach(function (s, i) {
      if (norm(s[1]) === q || stopKey(s[1]) === q) { out[i] = 0; return; }
      if (best) { var d = dist([best[1], best[2]], [s[2], s[3]]); if (d <= r) out[i] = d; }
      else if (q.length > 3 && stopKey(s[1]).indexOf(q) >= 0) out[i] = 0;
    });
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
  // OSM maps a stop twice (the pole and the platform): count names, not nodes.
  function stopCount(p, i, k) {
    var seen = {}, n = 0;
    for (var x = i + 1; x <= k; x++) { var nm = NET.stops[p.stops[x]][1]; if (!seen[nm]) { seen[nm] = 1; n++; } }
    return n;
  }
  function search() {
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
    var a = ll_of(fa) || fa.value, b = ll_of(fb) || fb.value;
    var SA = candidates(a), SB = candidates(b);
    if (SA.nobus || SB.nobus) {
      var who = SA.nobus ? fa.value : fb.value;
      box.innerHTML = '<p class="empty">' + t('No scheduled bus serves ' + esc(who) + '. The map shows the nearest lines; most people take a taxi or a tour from the last stop.',
        'Nenhum autocarro regular serve ' + esc(who) + '. O mapa mostra as linhas mais próximas; a maioria vai de táxi ou excursão a partir da última paragem.') + '</p>';
      return;
    }
    if (!Object.keys(SA).length || !Object.keys(SB).length) {
      var miss = !Object.keys(SA).length ? fa.value : fb.value;
      box.innerHTML = '<p class="empty">' + t('No stop found for “' + esc(miss) + '”.', 'Nenhuma paragem para «' + esc(miss) + '».') + ' ' + didYouMean(miss) + '</p>';
      return;
    }
    var far = function (d, el) { return d > 800 ? ' <span class="bn-far">' + (d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m') + ' ' + t('from', 'de') + ' ' + esc(el.value.replace(/^📍\s*/, '')) + '</span>' : ''; };
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
      var key = p.line, cnt = stopCount(p, bi, bk), f = found[key];
      if (!f) f = found[key] = { line: p.line, heads: {}, head: p.head, from: p.stops[bi], to: p.stops[bk], n: cnt, sc: bestScore };
      f.heads[p.head] = 1;
      if (bestScore < f.sc) { f.head = p.head; f.from = p.stops[bi]; f.to = p.stops[bk]; f.n = cnt; f.sc = bestScore; }
    });
    // A town-to-town approximation scores 0 at its town "stop" and would always
    // outrank the same line mapped stop by stop; and one line under two ids
    // (142 drawn from SIGA and 142 from OSM) is one card.
    var seenRef = {};
    var res = Object.keys(found).map(function (k) { return found[k]; })
      .sort(function (x, y) { return ((x.sc + (NET.lines[x.line].approx ? 300 : 0)) - (y.sc + (NET.lines[y.line].approx ? 300 : 0))) || (x.n - y.n); })
      .filter(function (r) { var l = NET.lines[r.line], k = l.ref + '|' + (l.op || ''); if (seenRef[k]) return false; seenRef[k] = 1; return true; }).slice(0, 8);
    if (!res.length) { transfers(SA, SB, box); return; }
    box.innerHTML = res.map(function (r, n) {
      var l = NET.lines[r.line];
      return '<div class="card bn-r"><div>' + chip(r.line) + ' <b>' + esc(r.head || l.name) + '</b>' + (l.approx ? ' <span class="bn-approx">' + t('approx. route', 'percurso aprox.') + '</span>' : '') + '</div>' +
        '<div class="bn-op">' + t('Board at', 'Embarque em') + ' <b>' + esc(NET.stops[r.from][1]) + '</b>' + far(SA[r.from], fa) + ' → ' + esc(NET.stops[r.to][1]) + far(SB[r.to], fb) + (l.src === 'gtfs' ? ' · ' + r.n + ' ' + t('stops', 'paragens') : '') + '</div>' +
        '<div id="bnR' + n + '"></div>' +
        (l.src !== 'gtfs' ? '<div class="bn-op">' + t('Times: ', 'Horas: ') + (l.url ? '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + t('timetable', 'horário') + ' (SIGA) ↗</a>' : t('on the operator’s timetable', 'no horário do operador')) + '</div>' : '') +
        ' <button type="button" class="btn ghost bn-show" data-r="' + n + '">' + t('Show on map', 'Ver no mapa') + '</button></div>';
    }).join('');
    res.forEach(function (r, n) {
      departures(r.from, r.line, r.heads, 4).then(function (list) { var el = document.getElementById('bnR' + n); if (el) el.innerHTML = depHtml(list); });
    });
    box.onclick = function (e) {
      var btn = e.target.closest('.bn-show'); if (!btn) return;
      var r = res[+btn.dataset.r], l = NET.lines[r.line];
      if (hl) map.removeLayer(hl);
      // Same renderer as the stops: a layer without one made Leaflet add a
      // second canvas on top, and nothing underneath could be tapped again.
      hl = L.layerGroup(l.paths.map(function (p) { return L.polyline(decode(p), { color: l.color, weight: 7, opacity: 0.9, renderer: R, interactive: false }); })
        .concat([r.from, r.to].map(function (si) { var s = NET.stops[si]; return L.circleMarker([s[2], s[3]], { radius: 9, color: '#fff', weight: 2, fillColor: '#993C1D', fillOpacity: 1, renderer: R, interactive: false }); }))).addTo(map);
      map.fitBounds(L.latLngBounds([r.from, r.to].map(function (si) { return [NET.stops[si][2], NET.stops[si][3]]; })).pad(0.4));
      document.getElementById('busmap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }

  // One change: ride line 1 from A to a stop X, walk at most ~250 m (same grid
  // cell or a neighbour), ride line 2 from X to B. Ranked by stops ridden.
  function cellKey(s) { return Math.round(s[2] / 0.0025) + ':' + Math.round(s[3] / 0.0025); }
  function near(s) {
    var a = Math.round(s[2] / 0.0025), b = Math.round(s[3] / 0.0025), out = [];
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) out.push((a + i) + ':' + (b + j));
    return out;
  }
  function transfers(SA, SB, box) {
    var reach = {};   // cell -> best first leg
    NET.patterns.forEach(function (p) {
      var i = -1;
      for (var k = 0; k < p.stops.length; k++) {
        if (i < 0) { if (p.stops[k] in SA) i = k; continue; }
        var key = cellKey(NET.stops[p.stops[k]]), n = stopCount(p, i, k);
        if (!reach[key] || n < reach[key].n) reach[key] = { line: p.line, head: p.head, from: p.stops[i], at: p.stops[k], n: n };
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
          var tot = r.n + stopCount(q, m, j), key = r.line + '>' + q.line;
          if (!best[key] || tot < best[key].tot) best[key] = { a: r, b: { line: q.line, head: q.head, from: q.stops[m], to: q.stops[j], n: stopCount(q, m, j) }, tot: tot };
        }
      }
    });
    var res = Object.keys(best).map(function (k) { return best[k]; }).sort(function (x, y) { return x.tot - y.tot; }).slice(0, 5);
    if (!res.length) {
      box.innerHTML = '<p class="empty">' + t('No route with one change between these two. Try a nearby town, or check the lines on the map.', 'Sem percurso com uma mudança entre os dois. Experimente uma localidade próxima, ou veja as linhas no mapa.') + '</p>';
      return;
    }
    var leg = function (x, last) {
      var l = NET.lines[x.line];
      return '<div class="bn-leg">' + chip(x.line) + ' <b>' + esc(x.head || l.name) + '</b><div class="bn-op">' + esc(NET.stops[x.from][1]) + ' → ' + esc(NET.stops[last][1]) + (l.src === 'gtfs' ? ' · ' + x.n + ' ' + t('stops', 'paragens') : '') +
        (l.src !== 'gtfs' && l.url ? ' · <a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + t('Timetable', 'Horário') + ' ↗</a>' : '') + '</div></div>';
    };
    box.innerHTML = '<p class="sub">' + t('No direct line — with one change:', 'Sem linha direta — com uma mudança:') + '</p>' + res.map(function (r, n) {
      return '<div class="card bn-r">' + leg(r.a, r.a.at) + '<div class="bn-change">↓ ' + t('change', 'mudança') + (r.a.at !== r.b.from ? ' · ' + t('walk to', 'a pé até') + ' ' + esc(NET.stops[r.b.from][1]) : '') + '</div>' + leg(r.b, r.b.to) + '<div id="bnT' + n + '"></div></div>';
    }).join('');
    res.forEach(function (r, n) {
      var heads = {}; heads[r.a.head] = 1;
      departures(r.a.from, r.a.line, heads, 3).then(function (list) { var el = document.getElementById('bnT' + n); if (el && list && list.length) el.innerHTML = '<div class="bn-op">' + t('First leg leaves', 'Primeira parte parte') + ':</div>' + depHtml(list); });
    });
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
  function didYouMean(q) {
    var k = norm(q); if (k.length < 3) return '';
    var hits = allNames().filter(function (n) { return norm(n).indexOf(k.slice(0, 4)) >= 0; }).slice(0, 4);
    return hits.length ? t('Did you mean', 'Queria dizer') + ' ' + hits.map(function (n) { return '<button type="button" class="chip bn-sug" data-v="' + esc(n) + '">' + esc(n) + '</button>'; }).join(' ') + '?' : '';
  }
  var namesCache = null;
  function allNames() {
    if (namesCache) return namesCache;
    var seen = {}, out = [];
    NET.places.forEach(function (p) { if (!seen[p[0]] && RANK[p[3]] >= 3) { seen[p[0]] = 1; out.push(p[0]); } });
    NET.stops.forEach(function (s) { var n = s[1].replace(/\s*\(.*?\)\s*$/, ''); if (!seen[n]) { seen[n] = 1; out.push(n); } });
    return (namesCache = out);
  }
  // Suggestions under the field. <datalist> never shows in the iPhone app's
  // WebView, so a visitor typed a town and saw nothing happen.
  function suggest(el) {
    var box = document.getElementById('bnSug'), q = norm(el.value);
    if (!box) return;
    if (q.length < 2 || !NET) { box.hidden = true; return; }
    var pre = [], mid = [];
    allNames().forEach(function (n) {
      var k = norm(n);
      if (k.indexOf(q) === 0) pre.push(n); else if (k.indexOf(' ' + q) > 0 || k.indexOf(q) > 0) mid.push(n);
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
      if (b.closest('#bnRes')) el = document.getElementById(document.getElementById('bnFrom').value.trim() ? 'bnTo' : 'bnFrom');
      el.value = b.dataset.v; delete el.dataset.ll; delete el.dataset.example; el.style.boxShadow = '';
      if (box) box.hidden = true;
      if (document.getElementById('bnFrom').value.trim() && document.getElementById('bnTo').value.trim()) search();
    });
    MA.get('/ativa/bus/network.json').then(function (net) {
      if (!net) return;
      NET = net;
      if (TOUCH) L.Draggable.prototype.options.clickTolerance = 12;
      R = L.canvas({ padding: 0.3, tolerance: TOUCH ? 12 : 6 });
      map = L.map('busmap', { zoomControl: true, scrollWheelZoom: false, preferCanvas: true, dragging: !TOUCH }).setView([32.73, -16.98], 10);
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
