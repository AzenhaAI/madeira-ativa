// Sunrise at Pico do Arieiro, for the next five mornings.
//
// People drive up in the dark for this, at 1818 m, and most mornings they find
// either a clear sky over a sea of cloud or the inside of a cloud. The forecast
// can tell those apart, so this reads it rather than printing a sunrise time
// and leaving the rest to luck.
//
// Two points are asked for, at their real heights: the summit, and the north
// slope below it at 900 m, where the cloud sea sits when there is one.
//   in the cloud  — summit visibility under 5 km, or low cloud at the summit
//   overcast      — mid or high cloud over the summit, the sun will not show
//   clear         — sky above the summit mostly open
//   sea of clouds — clear above AND low cloud filling the slope below
// A morning is marked "best" only if it is actually good. On a week with none,
// the card says so; that is more use to someone setting an alarm for 5 am than a
// least-bad pick dressed up as a recommendation.
//
// Mount with <div id="sunriseArieiro" hidden></div> and this script.
(function () {
  var URL_ = 'https://api.open-meteo.com/v1/forecast?latitude=32.735,32.745&longitude=-16.929,-16.890' +
    '&elevation=1818,900&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,' +
    'precipitation_probability,visibility&daily=sunrise&forecast_days=7&timezone=Atlantic%2FMadeira';
  var TRAIL = '/ativa/trail/pr-1-vereda-do-areeiro';
  var DAYS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] };
  var LABEL = {
    sea:      { en: 'sea of clouds', pt: 'mar de nuvens', icon: '🌅', good: true },
    clear:    { en: 'clear', pt: 'limpo', icon: '🌄', good: true },
    overcast: { en: 'overcast', pt: 'encoberto', icon: '☁️', good: false },
    fog:      { en: 'in the cloud', pt: 'dentro da nuvem', icon: '🌫', good: false },
    rain:     { en: 'rain', pt: 'chuva', icon: '🌧', good: false },
  };

  function classify(S, L, i) {
    var low = S.cloud_cover_low[i], mid = S.cloud_cover_mid[i], high = S.cloud_cover_high[i];
    var vis = S.visibility[i], rain = S.precipitation_probability[i];
    if (rain >= 40) return { kind: 'rain', score: 0 };
    if (vis < 5000 || low >= 50) return { kind: 'fog', score: 5 };
    // Thin high cloud can colour a sunrise; a solid mid layer hides it.
    var cover = Math.max(mid, high * 0.7);
    if (cover >= 60) return { kind: 'overcast', score: 30 - cover / 10 };
    var sea = L.cloud_cover_low[i] >= 50;
    return { kind: sea ? 'sea' : 'clear', score: 100 - cover + (sea ? 15 : 0) };
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var days = null;
  function paint() {
    var box = document.getElementById('sunriseArieiro');
    if (!box || !days || !days.length) return;
    var lang = (document.documentElement.lang || 'en') === 'pt' ? 'pt' : 'en';
    var best = null;
    days.forEach(function (d) { if (LABEL[d.kind].good && (!best || d.score > best.score)) best = d; });
    var cells = days.map(function (d) {
      var lb = LABEL[d.kind];
      var date = new Date(d.sunrise.slice(0, 10) + 'T00:00:00Z');
      return '<div class="sr-day' + (d === best ? ' sr-best' : '') + (lb.good ? '' : ' sr-poor') + '">' +
        '<span class="sr-date">' + DAYS[lang][date.getUTCDay()] + ' ' + date.getUTCDate() + '</span>' +
        '<span class="sr-icon">' + lb.icon + '</span>' +
        '<span class="sr-time">' + d.sunrise.slice(11, 16) + '</span>' +
        '<span class="sr-kind">' + esc(lb[lang]) + '</span></div>';
    }).join('');
    var verdict = best
      ? (lang === 'pt' ? 'Melhor manhã: ' : 'Best morning: ') + DAYS[lang][new Date(best.sunrise.slice(0, 10) + 'T00:00:00Z').getUTCDay()] +
        ' ' + best.sunrise.slice(11, 16) + ' — ' + LABEL[best.kind][lang]
      : (lang === 'pt' ? 'Nenhum nascer do sol limpo previsto nestes dias.' : 'No clear sunrise forecast in these days.');
    box.innerHTML =
      '<div class="sr-head"><a href="' + TRAIL + '">' + (lang === 'pt' ? 'Nascer do sol no Pico do Arieiro' : 'Sunrise at Pico do Arieiro') + '</a>' +
      '<span class="sr-verdict">' + esc(verdict) + '</span></div>' +
      '<div class="sr-row">' + cells + '</div>' +
      '<div class="sr-note">' + (lang === 'pt'
        ? 'Previsão Open-Meteo para o cume (1818 m) e a encosta norte (900 m); menos fiável depois do 3.º dia.'
        : 'Open-Meteo forecast for the summit (1818 m) and the north slope (900 m); less reliable after day 3.') + '</div>';
    box.hidden = false;
  }

  function style() {
    var css = document.createElement('style');
    css.textContent =
      '#sunriseArieiro{margin:10px 0 18px;border:1px solid var(--line,rgba(127,127,127,.3));border-radius:12px;padding:12px 14px}' +
      '#sunriseArieiro .sr-head{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin-bottom:8px}' +
      '#sunriseArieiro .sr-head a{font-weight:700;color:var(--accent,inherit);text-decoration:none}' +
      '#sunriseArieiro .sr-head a:hover{text-decoration:underline}' +
      '#sunriseArieiro .sr-verdict{font-size:13px;opacity:.8}' +
      '#sunriseArieiro .sr-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}' +
      '#sunriseArieiro .sr-day{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px;border-radius:9px;font-size:12px;text-align:center}' +
      '#sunriseArieiro .sr-best{background:rgba(217,164,0,.15);outline:1px solid rgba(217,164,0,.6)}' +
      '#sunriseArieiro .sr-poor{opacity:.6}' +
      '#sunriseArieiro .sr-date{font-weight:700}' +
      '#sunriseArieiro .sr-icon{font-size:20px;line-height:1.3}' +
      '#sunriseArieiro .sr-kind{font-size:11px;line-height:1.2}' +
      '#sunriseArieiro .sr-note{margin-top:8px;font-size:11px;opacity:.6}';
    document.head.appendChild(css);
  }

  function start() {
    if (!document.getElementById('sunriseArieiro')) return;
    style();
    fetch(URL_).then(function (r) { return r.json(); }).then(function (res) {
      var S = res[0].hourly, L = res[1].hourly, sunrises = res[0].daily.sunrise;
      var now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Atlantic/Madeira', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).replace(' ', 'T');
      days = sunrises.filter(function (sr) { return sr > now; }).slice(0, 5).map(function (sr) {
        var i = S.time ? res[0].hourly.time.indexOf(sr.slice(0, 13) + ':00') : -1;
        var c = i >= 0 ? classify(S, L, i) : { kind: 'overcast', score: 0 };
        return { sunrise: sr, kind: c.kind, score: c.score };
      });
      paint();
    }).catch(function () { /* no card is better than a wrong one */ });
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
