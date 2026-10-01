// The live lines on a trail page: IPMA warnings for the trail's zone, the
// weather on the trail now, and the next Funchal urban buses where a timetable
// exists. The page is static (built by scripts/gen_trail_pages.py); this reads
// window.TRAIL, which that build embeds, and uses trail-core.js and ipma.js.
(function () {
  var t = window.TRAIL, box = document.getElementById('live');
  if (!t || !box) return;
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
      var types = w.types.map(function (x) { var tt = api.TYPES[x]; return tt ? tt.en.toLowerCase() : x; }).join(', ');
      lines.unshift('<span class="warn" style="color:' + lv.colour + '">⚠ ' + lv.en + ' IPMA warning: ' + types +
        ' — ' + api.ZONES[w.zone].en.toLowerCase() + '</span>');
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
        lines.push(emo(w.current.weather_code) + ' ' + Math.round(w.current.temperature_2m) + '° on the trail now · ' +
          Math.round(w.current.wind_speed_10m) + ' km/h wind' + (rain != null ? ' · ' + rain + '% chance of rain 9:00–17:00' : ''));
        paint();
      }).catch(function () {});
  }

  // Next buses at each end that has a Funchal urban stop.
  (t.departures || []).forEach(function (dep, i) {
    var el = document.querySelector('.gt-next[data-end="' + i + '"]');
    if (!el || !dep) return;
    var nb = nextBuses(dep, 4);
    if (!nb.length) return;
    el.innerHTML = '🕒 Next bus: ' + nb.map(function (b) {
      return '<b>' + (b.today ? '' : 'tomorrow ') + b.time + '</b> ' + b.line + ' → ' + b.to;
    }).join(' · ');
  });
})();
