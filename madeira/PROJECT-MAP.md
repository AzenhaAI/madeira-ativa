# Madeira Ative — web project map

Where everything lives and how to change it. (Internal orientation doc; the
public-facing overview is in `README.md`.)

## Live site

- **URL:** https://shpara.com/madeira
- **Source folder:** `~/shpara1/madeira/`  ← **this is the web version**
- **Deploy:** Cloudflare Pages, **auto-deploys on push to `github.com/kirshp/shpara1` (main)**.
  Just `git push` the `shpara1` repo → prod is live in ~1 min. No manual step.
- **Clean URLs:** handled by `~/shpara1/_redirects` (e.g. `/madeira/history` → `madeira_history.html`).
  `vercel.json` is legacy/unused — prod is Cloudflare, not Vercel.

## Folder map (`~/shpara1/madeira/`)

| Path | What |
|---|---|
| `index.html` | Home — event calendar, filters, weather strip, hero map, hamburger drawer |
| `madeira_stat.html` | Trail stats & race calendar (`#calendar`) |
| `levada.html` | Levada guide + "Where to go today" weather picker |
| `map.html` | 2D Leaflet map |
| `map3d.html` · `mapfly.html` · `mapbay.html` | 3D MapLibre terrain views (topo / flyover / aerial) |
| `madeira_festas.html` | Festivals year (postcard grid + tabs) |
| `madeira_news.html` | 6-language news + TV broadcasts |
| `madeira_history.html` | Illustrated island history (timeline + story threads + Album) |
| `*.json` | Generated data feeds — see below |
| `history/` | ~40 public-domain history illustrations (`art-*`, dated) |
| `portfolio-images/` · `splash/` | Mockups & PWA splash screens |
| `icon.svg` · `icon-192/512.png` · `apple-touch-icon.png` | App icons |
| `manifest.webmanifest` · `service-worker.js` | PWA (home-screen name **"Madeira Ative"**; bump `CACHE_NAME` on every change) |
| `*.apk` · `*.dmg` · `*.exe` | Installable native wrappers (see "Apps" below) |

### Data feeds (auto-generated `.json`)

`events.json` · `news_feed.json` · `tv_broadcasts.json` · `trails_status.json` ·
`trails_geo.json` · `levadas.json` · `trail_calendar.json` · plus the MIUT/analytics set.

## Data automation (daily)

GitHub Actions in the repo (`.github/workflows/`), cron in the early morning:

| Workflow | Does |
|---|---|
| `update-madeira-events.yml` | re-export the event calendar |
| `update-madeira-news.yml` | news + 6-lang translations, TV, trail status & geometry, levada guide, calendar-PDF check |

Both use a **rebase-safe commit step** and a shared `concurrency` group so they never
race. Commits are authored as Kirill (greens the graph). Producing scripts live in
`~/shpara1/scripts/` (`fetch_*.py`, `export_madeira_events.py`, `check_trail_pdf.py`)
and `~/shpara1/parsers/`. The `ts.uma.pt` scripts read `TS_UMA_TOKEN` from env (never committed).

## Repositories

- **`kirshp/shpara1`** (private) — the real monorepo. **This is what deploys.** Edit here.
- **`kirshp/madeira-ative`** (public) — clean showcase mirror for conferences. **NOT deployed.**
  Keep it in sync by copying changed files from `shpara1/madeira/` after each push.
  Its README/LICENSE/topics are the public face; installers are attached as GitHub Releases.

## Installable apps

The homepage "Mobile access" buttons download native wrappers that just load the live site:

- Android → `madeira-events.apk` · Windows → `Madeira Events_1.0.0_x64-setup.exe` · macOS → `Madeira-Ative.dmg`
- iOS → email request (needs a paid Apple account to publish)
- The canonical, versioned installers are also on the **madeira-ative GitHub Releases** page.

**The full native app is a separate project:** `~/Projects/ativa` (Flutter), with its own
store-submission bundle in `~/Projects/ativa/store/` (`android/`, `ios/`, `PLAY-STEPS.md`,
`APPSTORE-STEPS.md`, `listing.md`). That is what goes to Google Play / App Store; the files
here are just the lightweight web-wrapper downloads.

## How to change something

1. Edit the file in `~/shpara1/madeira/`.
2. If it's a page change users should see immediately, bump `CACHE_NAME` in `service-worker.js`.
3. `git -C ~/shpara1 add … && commit && push` → prod deploys automatically.
4. Copy the changed files into `~/Projects/madeira-ative/madeira/` and push that repo too (showcase).
5. No Cyrillic on any public surface (pages, repo, commits, meta) — English/PT only.
