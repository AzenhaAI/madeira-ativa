// "Events nearby" on a trail page: what is on in the next weeks within reach of
// the trail, read from the live events feed. The pages are static and rebuilt
// rarely; the feed changes three times a day, so the list is made here.
//
// Why (SEO session goals, 17.11.2026): a walker who came for one trail has a
// reason to stay and come back — a festa in the village at the trailhead, a race
// on the same ridge. Places are free text in the feed; they are placed with the
// same small gazetteer as the map (ativa/map.html, the app's lib/gazetteer.dart):
// lowercase, accents off, longest key wins. A whole town is placed at its centre.
(function () {
  var t = window.TRAIL, box = document.getElementById('nearev');
  if (!t || !t.center || !box) return;
  var hl = document.documentElement.lang;
  var lang = hl === 'pt' || hl === 'pt-PT' ? 'pt' : hl === 'de' || hl === 'ru' ? hl : 'en';
  function L(en, pt, de, ru) { return { en: en, pt: pt, de: de, ru: ru }[lang]; }
  var PLACES = {
    'funchal': [32.6490, -16.9085], 'camara de lobos': [32.6500, -16.9770], 'curral das freiras': [32.7200, -16.9640],
    'santa cruz': [32.6883, -16.7930], 'camacha': [32.6790, -16.8480], 'machico': [32.7176, -16.7690],
    'porto da cruz': [32.7710, -16.8300], 'santana': [32.8010, -16.8880], 'sao vicente': [32.7970, -17.0440],
    'seixal': [32.8250, -17.1030], 'porto moniz': [32.8660, -17.1670], 'fanal': [32.8140, -17.1360],
    'calheta': [32.7180, -17.1770], 'ponta do sol': [32.6810, -17.1010], 'ribeira brava': [32.6740, -17.0620],
    'porto santo': [33.0700, -16.3400], 'pico do arieiro': [32.7357, -16.9285], 'pico ruivo': [32.7586, -16.9419],
    'monte': [32.6720, -16.9000], 'estadio dos barreiros': [32.6452, -16.9250], 'parque de santa catarina': [32.6460, -16.9180],
    'praca do povo': [32.6440, -16.9080], 'estadio do maritimo': [32.6470, -16.9350],
    'baltazar dias': [32.6481, -16.9076], 'assembleia legislativa da madeira': [32.6469, -16.9076],
    'largo do socorro': [32.6467, -16.8995], 'forum madeira': [32.6377, -16.9373], 'funchal, marina': [32.6452, -16.9093]
  };
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function place(loc) {
    var n = fold(loc), best = null;
    Object.keys(PLACES).forEach(function (k) { if (n.indexOf(k) >= 0 && (!best || k.length > best.length)) best = k; });
    return best ? PLACES[best] : null;
  }
  function km(a, b) {
    var r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    var h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.pow(Math.sin(dLon / 2), 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var MON = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
    ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  }[lang];
  function day(iso) { return (+iso.slice(8, 10)) + (lang === 'de' ? '. ' : ' ') + MON[+iso.slice(5, 7) - 1]; }

  var today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Atlantic/Madeira' }).format(new Date());
  var until = new Date(Date.parse(today + 'T00:00:00Z') + 30 * 864e5).toISOString().slice(0, 10);
  // km from the trail's centre: the next village, not the island. At 12 the
  // summit walks above Funchal listed the city's concert halls.
  var REACH = 8;
  fetch('/ativa/events.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    var seen = {}, list = ((d && d.events) || []).filter(function (e) {
      var on = e.date >= today || (e.date_end && e.date_end >= today && e.date < today);
      if (!on || e.date > until) return false;
      var p = place(e.location); if (!p) return false;
      e._km = km(t.center, p);
      var k = fold(e.name).replace(/[^a-z0-9]/g, '');
      if (e._km > REACH || seen[k]) return false;
      seen[k] = 1; return true;
    });
    list.sort(function (a, b) { return (a.date < today ? today : a.date).localeCompare(b.date < today ? today : b.date) || a._km - b._km; });
    list = list.slice(0, 4);
    if (!list.length) return;
    var root = lang === 'en' ? '/ativa/' : '/ativa/' + lang + '/';
    box.innerHTML = '<h2>' + L('Events nearby', 'Eventos perto', 'Veranstaltungen in der Nähe', 'События рядом') + '</h2><ul class="near">' +
      list.map(function (e) {
        var when = e.date < today && e.date_end ? L('until ', 'até ', 'bis ', 'до ') + day(e.date_end) : day(e.date);
        return '<li><a href="' + root + 'events"><span>' + esc(e.name.replace(/^"|"$/g, '')) + '</span><span class="m">' + esc(when) + ' · ' +
          esc(String(e.location).split(',')[0]) + '</span></a></li>';
      }).join('') + '</ul>';
    box.hidden = false;
  }).catch(function () {});
})();
