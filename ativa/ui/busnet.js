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
  function depHtml(list) {
    if (list == null) return '';
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
        L.polyline(decode(p), { color: l.color, weight: city ? 2.5 : 3.5, opacity: city ? 0.7 : 0.85, renderer: R })
          .on('click', function (e) { lineInfo(i, e.latlng); }).addTo(g);
      });
      g.addTo(map); layers[i] = g;
    });
    drawStops();
  }
  var R;
  function drawStops() {
    if (stopLayer) map.removeLayer(stopLayer);
    stopLayer = L.layerGroup();
    var show = map.getZoom() >= 12;
    if (show) NET.stops.forEach(function (s, i) {
      var city = s[5] === 'gtfs';
      if ((mode === 'city' && !city) || (mode === 'inter' && city)) return;
      if (!map.getBounds().pad(0.2).contains([s[2], s[3]])) return;
      L.circleMarker([s[2], s[3]], { radius: map.getZoom() >= 15 ? 5 : 3.5, color: '#fff', weight: 1, fillColor: city ? '#B7791F' : '#1F4D32', fillOpacity: 1, renderer: R })
        .on('click', function () { stopInfo(i); }).addTo(stopLayer);
    });
    stopLayer.addTo(map);
  }
  function lineInfo(i, at) {
    var l = NET.lines[i];
    L.popup().setLatLng(at).setContent('<div class="bn-pop">' + chip(i) + ' <b>' + esc(l.name) + '</b><div class="bn-op">' + esc(l.op || '') + '</div>' +
      (l.url ? '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + t('Timetable', 'Horário') + ' ↗</a>' : '') + '</div>').openOn(map);
  }
  function stopInfo(i) {
    var s = NET.stops[i];
    var html = '<div class="bn-pop"><b>' + esc(s[1]) + '</b><div class="bn-lines">' + s[4].map(chip).join(' ') + '</div><div class="bn-wait">…</div></div>';
    var pop = L.popup({ maxWidth: 300 }).setLatLng([s[2], s[3]]).setContent(html).openOn(map);
    departures(i, null, null, 8).then(function (list) {
      var extra = s[4].filter(function (li) { return NET.lines[li].src !== 'gtfs' && NET.lines[li].url; })
        .map(function (li) { return '<a href="' + esc(NET.lines[li].url) + '" target="_blank" rel="noopener">' + chip(li) + ' ' + t('timetable', 'horário') + ' ↗</a>'; });
      pop.setContent(html.replace('<div class="bn-wait">…</div>', depHtml(list) + (extra.length ? '<div class="bn-links">' + extra.join(' ') + '</div>' : '')));
    });
  }

  // ---- From → To
  var RANK = { city: 6, town: 5, village: 4, suburb: 3, neighbourhood: 2, hamlet: 2, locality: 1 };
  function candidates(text) {
    var q = norm(text);
    if (!q) return [];
    // Of places sharing a name, the biggest: "Santana" is the town, not the
    // Funchal neighbourhood of the same name.
    var best = null;
    NET.places.forEach(function (p) {
      if (norm(p[0]) === q && (!best || (RANK[p[3]] || 0) > (RANK[best[3]] || 0))) best = p;
    });
    var out = {}, r = best ? (best[3] === 'city' ? 1800 : best[3] === 'town' ? 1000 : 700) : 0;
    NET.stops.forEach(function (s, i) {
      if (norm(s[1]) === q) out[i] = 1;
      else if (best) { if (dist([best[1], best[2]], [s[2], s[3]]) <= r) out[i] = 1; }
      else if (q.length > 3 && norm(s[1]).indexOf(q) >= 0) out[i] = 1;
    });
    return Object.keys(out).map(Number);
  }
  // OSM maps a stop twice (the pole and the platform): count names, not nodes.
  function stopCount(p, i, k) {
    var seen = {}, n = 0;
    for (var x = i + 1; x <= k; x++) { var nm = NET.stops[p.stops[x]][1]; if (!seen[nm]) { seen[nm] = 1; n++; } }
    return n;
  }
  function search() {
    var a = document.getElementById('bnFrom').value, b = document.getElementById('bnTo').value, box = document.getElementById('bnRes');
    var A = candidates(a), B = candidates(b);
    if (!A.length || !B.length) {
      box.innerHTML = '<p class="empty">' + (!A.length ? t('No stop found for “' + esc(a) + '”.', 'Nenhuma paragem para «' + esc(a) + '».') : t('No stop found for “' + esc(b) + '”.', 'Nenhuma paragem para «' + esc(b) + '».')) + '</p>';
      return;
    }
    var SA = {}, SB = {};
    A.forEach(function (x) { SA[x] = 1; }); B.forEach(function (x) { SB[x] = 1; });
    var found = {};
    NET.patterns.forEach(function (p) {
      var i = -1;
      for (var k = 0; k < p.stops.length; k++) {
        if (i < 0 && SA[p.stops[k]]) i = k;
        else if (i >= 0 && SB[p.stops[k]]) {
          // One result per line; every variant (headsign) that gets there counts,
          // since the weekday and weekend runs of a line often differ.
          var key = p.line, cnt = stopCount(p, i, k), f = found[key];
          if (!f) f = found[key] = { line: p.line, heads: {}, head: p.head, from: p.stops[i], to: p.stops[k], n: cnt };
          f.heads[p.head] = 1;
          if (cnt < f.n) { f.head = p.head; f.from = p.stops[i]; f.to = p.stops[k]; f.n = cnt; }
          break;
        }
      }
    });
    var res = Object.keys(found).map(function (k) { return found[k]; }).sort(function (x, y) { return x.n - y.n; }).slice(0, 8);
    if (!res.length) {
      box.innerHTML = '<p class="empty">' + t('No direct line between these two. A change in Funchal usually does it — check the lines on the map.', 'Não há linha direta entre os dois. Normalmente faz-se com mudança no Funchal — veja as linhas no mapa.') + '</p>';
      return;
    }
    box.innerHTML = res.map(function (r, n) {
      var l = NET.lines[r.line];
      return '<div class="card bn-r"><div>' + chip(r.line) + ' <b>' + esc(r.head || l.name) + '</b></div>' +
        '<div class="bn-op">' + t('Board at', 'Embarque em') + ' <b>' + esc(NET.stops[r.from][1]) + '</b> → ' + esc(NET.stops[r.to][1]) + ' · ' + r.n + ' ' + t('stops', 'paragens') + '</div>' +
        '<div id="bnR' + n + '"></div>' +
        (l.src !== 'gtfs' && l.url ? '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + t('Timetable', 'Horário') + ' (SIGA) ↗</a>' : '') +
        ' <button type="button" class="btn ghost bn-show" data-r="' + n + '">' + t('Show on map', 'Ver no mapa') + '</button></div>';
    }).join('');
    res.forEach(function (r, n) {
      departures(r.from, r.line, r.heads, 4).then(function (list) { var el = document.getElementById('bnR' + n); if (el) el.innerHTML = depHtml(list); });
    });
    box.onclick = function (e) {
      var btn = e.target.closest('.bn-show'); if (!btn) return;
      var r = res[+btn.dataset.r], l = NET.lines[r.line];
      if (hl) map.removeLayer(hl);
      hl = L.layerGroup(l.paths.map(function (p) { return L.polyline(decode(p), { color: l.color, weight: 7, opacity: 0.9 }); })
        .concat([r.from, r.to].map(function (si) { var s = NET.stops[si]; return L.circleMarker([s[2], s[3]], { radius: 8, color: '#fff', weight: 2, fillColor: '#993C1D', fillOpacity: 1 }); }))).addTo(map);
      map.fitBounds(L.latLngBounds([r.from, r.to].map(function (si) { return [NET.stops[si][2], NET.stops[si][3]]; })).pad(0.4));
      document.getElementById('busmap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  }

  function sigaList() {
    var el = document.getElementById('bnAll');
    if (!el) return;
    el.innerHTML = NET.siga.map(function (x) {
      return '<a class="row" href="' + esc(x[2]) + '" target="_blank" rel="noopener"><div class="d"><b>' + esc(x[0]) + '</b></div><div class="t"><b>' + esc(x[1]) + '</b></div><div class="k">↗</div></a>';
    }).join('');
  }

  function init() {
    if (!window.L || !document.getElementById('busmap')) return;
    MA.get('/ativa/bus/network.json').then(function (net) {
      if (!net) return;
      NET = net;
      R = L.canvas({ padding: 0.3, tolerance: 6 });
      map = L.map('busmap', { zoomControl: true, scrollWheelZoom: false, preferCanvas: true }).setView([32.73, -16.98], 10);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      // Fit the whole network, whatever the screen: a fixed centre cut off the west on phones.
      map.fitBounds(L.latLngBounds(NET.stops.filter(function (s) { return s[2] < 32.9; }).map(function (s) { return [s[2], s[3]]; })), { padding: [4, 4] });  // Madeira; Porto Santo is a pan away
      map.on('zoomend moveend', drawStops);
      drawLines();
      var names = {};
      NET.places.forEach(function (p) { names[p[0]] = 1; });
      NET.stops.forEach(function (s) { names[s[1]] = 1; });
      document.getElementById('bnNames').innerHTML = Object.keys(names).sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
      document.getElementById('bnForm').onsubmit = function (e) { e.preventDefault(); search(); };
      document.getElementById('bnMode').onclick = function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        mode = c.dataset.m;
        document.querySelectorAll('#bnMode .chip').forEach(function (x) { x.classList.toggle('on', x === c); });
        drawLines();
      };
      var city = NET.lines.filter(function (l) { return l.src === 'gtfs'; }).length;
      document.getElementById('bnCount').textContent = t(NET.lines.length + ' lines on the map (' + city + ' Funchal city, ' + (NET.lines.length - city) + ' interurban) · ' + NET.siga.length + ' in the full list below',
        NET.lines.length + ' linhas no mapa (' + city + ' urbanas do Funchal, ' + (NET.lines.length - city) + ' interurbanas) · ' + NET.siga.length + ' na lista completa abaixo');
      sigaList();
      MA.onLang(function () { if (document.getElementById('bnRes').innerHTML) search(); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
