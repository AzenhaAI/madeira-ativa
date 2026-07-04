# Madeira Ative 🌿

**Every race, trail and levada on Madeira — in one place, in your language.**

A living guide to sport, trails and events across Madeira Island: the full
event calendar, the official trail-race quadro, a levada guide with live
IFCN status, 2D + 3D terrain maps, and island news auto-translated into six
languages. Static, fast, no tracking.

**Live: [shpara.com/madeira](https://shpara.com/madeira)**

## What's inside

| Section | What |
|---|---|
| [Events](https://shpara.com/madeira) | Filterable calendar — Trail, Road, Orienteering, Bike, Kids, Pro, Swim, Festivals — with a "Next" view that jumps to the nearest race |
| [Trail stats](https://shpara.com/madeira/madeira_stat.html) | Annual calendar wheels, difficulty map, elevation profiles, MIUT analytics, and the official **Trail Madeira quadro** (17 races incl. MIUT / Ultra Skyrunning / Ultra X) — filterable, exportable to CSV / Excel / PDF |
| [Levadas](https://shpara.com/madeira/levada) | Guide to all 44 classified PR walking trails — distance, ascent, start→end, fees, difficulty rating, elevation-profile sparklines, live **open / restricted / closed** status |
| [Map](https://shpara.com/madeira/map) | 2D Leaflet map — race courses, walking trails by status, closures, popularity heatmap, plus city/road/tunnel and *all-levadas* overlays |
| 3D maps | Three MapLibre terrain views — **[3D](https://shpara.com/madeira/map3d)** (topo), **[Fly](https://shpara.com/madeira/mapfly)** (satellite + route flyover), **[Aerial](https://shpara.com/madeira/mapbay)** (orbiting satellite) — with the same toggleable layers |
| [News](https://shpara.com/madeira/madeira_news.html) | Island news aggregated from RSS, auto-translated into **PT · EN · DE · PL · UA · RU**, plus upcoming TV broadcasts (FIFA World Cup, Marítimo & Nacional) |

Plus a **Telegram bot** (`@madeira_ebot`), installable **PWA**, and a
levada map draped over real 3D terrain.

## Highlights

- **Real 3D terrain** — Madeira's dramatic relief from Terrarium DEM (MapLibre),
  with the classified levadas draped on the hillside and coloured by status
- **Live trail status** — parsed daily from the official IFCN closed/open PDF;
  closed and restricted trails surfaced on the guide and drawn red on the map
- **~2 551 levadas** — every named irrigation channel on the island, pulled
  from OpenStreetMap on demand
- **Six-language news** — Portuguese sources translated on ingest so each
  headline reads natively, with a one-tap Google Translate deep-link
- **Elevation everywhere** — per-trail ascent/descent sampled from EU-DEM,
  rendered as profile sparklines and a distance × climb scatter
- **Export-ready** — the trail-race calendar downloads as CSV, Excel or PDF

## Principles

1. **Only public, sourced data.** Official federation (AARAM), IFCN, OpenStreetMap,
   TheSportsDB — every figure carries its origin.
2. **No client framework.** Static HTML + hand-written vanilla JS. Fast on any
   phone, installable, offline-tolerant.
3. **Fresh by itself.** News, TV broadcasts, trail status, geometry and the
   race-calendar check all refresh daily via GitHub Actions.

## Architecture

```
madeira/
  index.html            # events calendar (categories, periods, watchlist)
  madeira_stat.html     # trail-race analytics + calendar table
  levada.html           # PR walking-trail guide
  map.html              # 2D Leaflet map
  map3d / mapfly / mapbay.html   # 3D MapLibre terrain views
  madeira_news.html     # multilingual news + TV broadcasts
  *.json                # generated feeds (events, news, trails, levadas, broadcasts)
scripts/
  fetch_news.py         # RSS → translate (6 langs) → news_feed.json
  fetch_broadcasts.py   # FIFA WC + clubs → tv_broadcasts.json
  fetch_trails.py       # IFCN PDF → open/partial/closed status
  fetch_trail_geometry.py  # OSM PR routes → map geometry
  fetch_levadas.py      # OSM tags + EU-DEM elevation → levada guide
  check_trail_pdf.py    # watch the official trail quadro for updates
```

## Automation

| Workflow | Schedule | Does |
|---|---|---|
| `update-madeira-events.yml` | daily | re-exports the event calendar |
| `update-madeira-news.yml` | daily | news + translations, TV broadcasts, trail status & geometry, levada guide, calendar-PDF check |

Each step is fault-tolerant — a throttled translator or a slow source never
blocks the daily refresh.

## Tech

Static HTML · vanilla JS · [Leaflet](https://leafletjs.com) (2D) ·
[MapLibre GL](https://maplibre.org) + Terrarium DEM (3D) · Python parsers ·
GitHub Actions · deployed on Cloudflare Pages.

## Licence

Code is [MIT](LICENSE). Trail, terrain and map data © their sources —
OpenStreetMap (ODbL), IFCN, AARAM, EU-DEM / Mapzen, Esri — credited in the UI;
check each source's terms before redistributing.
