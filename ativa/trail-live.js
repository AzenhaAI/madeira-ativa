// The live lines on a trail page: IPMA warnings for the trail's zone, the
// weather on the trail now, and the next Funchal urban buses where a timetable
// exists. The page is static (built by scripts/gen_trail_pages.py); this reads
// window.TRAIL, which that build embeds, and uses trail-core.js and ipma.js.
(function () {
  var t = window.TRAIL, box = document.getElementById('live');
  if (!t || !box) return;
  // The page is written in en, pt, de or ru (/ativa/<lang>/trail/...); its
  // <html lang> says which, and the live lines follow it. ipma.js names
  // levels, types and zones in en/pt/de; the Russian names live here.
  var hl = document.documentElement.lang;
  var lang = hl === 'pt' || hl === 'de' || hl === 'ru' ? hl : 'en';
  function L(en, pt, de, ru) { return { en: en, pt: pt, de: de, ru: ru }[lang]; }
  var RU = {
    levels: { red: 'Красное', orange: 'Оранжевое', yellow: 'Жёлтое' },
    types: { 'Trovoada': 'гроза', 'Precipitação': 'сильный дождь', 'Vento': 'ветер', 'Agitação Marítima': 'волнение на море',
      'Nevoeiro': 'туман', 'Tempo Quente': 'жара', 'Tempo Frio': 'холод', 'Neve': 'снег' },
    zones: { MRM: 'горы', MCN: 'северное побережье', MCS: 'южное побережье', MPS: 'Порту-Санту' }
  };
  var lines = [];
  // Same icons as the levada page keeps in its own script.
  function emo(c) { return c >= 95 ? '⛈' : c >= 80 ? '🌧' : c >= 71 ? '🌨' : c >= 61 ? '🌧' : c >= 51 ? '🌦' : c >= 45 ? '🌫' : c === 3 ? '☁️' : c >= 1 ? '🌤' : '☀️'; }
  function paint() { box.innerHTML = lines.join(''); box.hidden = !lines.length; }

  // Warnings for this trail's zone — only the zone, so a sea-state warning on
  // the south coast does not alarm a ridge walk.
  ipmaReady().then(function (api) {
    if (!api) return;
    return Promise.resolve(api.live()).then(function (all) {
      var w = warnFor(t, all || []);
      if (!w) return;
      var lv = api.LEVELS[w.level];
      // German keeps its capitals: nouns stay nouns.
      function low(s) { return lang === 'de' ? s : s.toLowerCase(); }
      var types = w.types.map(function (x) {
        if (lang === 'ru') return RU.types[x] || x;
        var tt = api.TYPES[x]; return tt ? low(tt[lang]) : x;
      }).join(', ');
      var zone = lang === 'ru' ? RU.zones[w.zone] : low(api.ZONES[w.zone][lang]);
      var head = L(lv.en + ' IPMA warning: ', 'Aviso ' + (lv.pt || '').toLowerCase() + ' do IPMA: ',
        'IPMA-Warnstufe ' + lv.de + ': ', RU.levels[w.level] + ' предупреждение IPMA: ');
      lines.unshift('<span class="warn" style="color:' + lv.colour + '">⚠ ' + head + types + ' — ' + zone + '</span>');
      paint();
    });
  });

  // Weather on the trail now, at its own coordinates.
  if (t.center) {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + t.center[0] + '&longitude=' + t.center[1] +
      '&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_days=1&timezone=Atlantic%2FMadeira')
      .then(function (r) { return r.json(); }).then(function (w) {
        if (!w || !w.current) return;
        var hp = (w.hourly && w.hourly.precipitation_probability) || [];
        var day = hp.slice(9, 18).filter(function (x) { return x != null; });
        var rain = day.length ? Math.max.apply(null, day) : null;
        var temp = Math.round(w.current.temperature_2m), wind = Math.round(w.current.wind_speed_10m);
        lines.push(emo(w.current.weather_code) + ' ' + L(
          temp + '° on the trail now · ' + wind + ' km/h wind' + (rain != null ? ' · ' + rain + '% chance of rain 9:00–17:00' : ''),
          temp + '° no percurso agora · vento a ' + wind + ' km/h' + (rain != null ? ' · ' + rain + '% de probabilidade de chuva entre as 9:00 e as 17:00' : ''),
          temp + '° jetzt am Weg · Wind ' + wind + ' km/h' + (rain != null ? ' · ' + rain + ' % Regenwahrscheinlichkeit 9–17 Uhr' : ''),
          temp + '° на тропе сейчас · ветер ' + wind + ' км/ч' + (rain != null ? ' · вероятность дождя ' + rain + '% с 9:00 до 17:00' : '')));
        paint();
      }).catch(function () {});
  }

  // Next buses at each end that has a Funchal urban stop.
  (t.departures || []).forEach(function (dep, i) {
    var el = document.querySelector('.gt-next[data-end="' + i + '"]');
    if (!el || !dep) return;
    var nb = nextBuses(dep, 4);
    if (!nb.length) return;
    el.innerHTML = L('🕒 Next bus: ', '🕒 Próximo autocarro: ', '🕒 Nächster Bus: ', '🕒 Ближайший автобус: ') + nb.map(function (b) {
      return '<b>' + (b.today ? '' : L('tomorrow ', 'amanhã ', 'morgen ', 'завтра ')) + b.time + '</b> ' + b.line + ' → ' + b.to;
    }).join(' · ');
  });
})();
