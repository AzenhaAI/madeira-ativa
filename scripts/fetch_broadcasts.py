#!/usr/bin/env python3
"""Fetch upcoming TV broadcasts relevant to Madeira viewers.

Sources (TheSportsDB free API):
  - FIFA World Cup matches (currently running) — via eventsday over a date range.
  - CS Marítimo (id 134023) and CD Nacional da Madeira (id 134109) — via eventsnext,
    so club fixtures appear automatically once the new season schedule is published.

Output: madeira/tv_broadcasts.json
Times are converted to Madeira local time (Atlantic/Madeira).
"""

import json
import urllib.request
import time as time_mod
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
    MADEIRA_TZ = ZoneInfo("Atlantic/Madeira")
except Exception:
    MADEIRA_TZ = timezone.utc

OUT = Path(__file__).resolve().parent.parent / "madeira" / "tv_broadcasts.json"
API = "https://www.thesportsdb.com/api/v1/json/3"

DAYS_AHEAD = 21
CLUBS = [("134023", "Marítimo"), ("134109", "Nacional")]
# National teams whose World Cup matches must always be included.
# eventsday on the free tier is incomplete, so we fetch these directly.
NATIONAL = [("133908", "Portugal")]

# Portuguese broadcaster mapping
PORTUGAL_TEAMS = {"Portugal"}


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "MadeiraBroadcasts/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def to_madeira(date_str, time_str):
    """Combine UTC date+time from API into Madeira local date and HH:MM."""
    if not date_str:
        return None, ""
    t = (time_str or "00:00:00")[:8]
    try:
        dt = datetime.strptime(date_str + " " + t, "%Y-%m-%d %H:%M:%S")
        dt = dt.replace(tzinfo=timezone.utc).astimezone(MADEIRA_TZ)
        return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")
    except ValueError:
        return date_str, ""


def channel_for_wc(home, away):
    teams = {home, away}
    if teams & PORTUGAL_TEAMS:
        return "RTP · Mundial"
    return "Sport TV · Mundial"


def fetch_world_cup():
    events = []
    start = date.today()
    for i in range(DAYS_AHEAD):
        d = (start + timedelta(days=i)).isoformat()
        try:
            data = fetch_json(f"{API}/eventsday.php?d={d}&s=Soccer")
        except Exception as e:
            print(f"  WC {d} error: {e}")
            continue
        for e in data.get("events") or []:
            if e.get("strLeague") != "FIFA World Cup":
                continue
            home = e.get("strHomeTeam") or ""
            away = e.get("strAwayTeam") or ""
            ev_date, ev_time = to_madeira(e.get("dateEvent"), e.get("strTime"))
            events.append({
                "date": ev_date,
                "time": ev_time,
                "name": e.get("strEvent") or f"{home} vs {away}",
                "comp": "FIFA World Cup",
                "channel": channel_for_wc(home, away),
            })
        time_mod.sleep(0.25)
    print(f"  World Cup: {len(events)} matches in next {DAYS_AHEAD} days")
    return events


def fetch_national():
    """Fetch upcoming World Cup matches for tracked national teams."""
    events = []
    for tid, name in NATIONAL:
        try:
            data = fetch_json(f"{API}/eventsnext.php?id={tid}")
        except Exception as e:
            print(f"  National {name} error: {e}")
            continue
        evs = data.get("events") or []
        for e in evs:
            home = e.get("strHomeTeam") or ""
            away = e.get("strAwayTeam") or ""
            ev_date, ev_time = to_madeira(e.get("dateEvent"), e.get("strTime"))
            events.append({
                "date": ev_date,
                "time": ev_time,
                "name": e.get("strEvent") or f"{home} vs {away}",
                "comp": e.get("strLeague") or "FIFA World Cup",
                "channel": channel_for_wc(home, away),
            })
        print(f"  {name}: {len(evs)} upcoming match(es)")
        time_mod.sleep(0.25)
    return events


def fetch_clubs():
    events = []
    horizon = date.today() + timedelta(days=60)
    for tid, name in CLUBS:
        try:
            data = fetch_json(f"{API}/eventsnext.php?id={tid}")
        except Exception as e:
            print(f"  Club {name} error: {e}")
            continue
        for e in data.get("events") or []:
            ev_date, ev_time = to_madeira(e.get("dateEvent"), e.get("strTime"))
            try:
                if datetime.strptime(ev_date, "%Y-%m-%d").date() > horizon:
                    continue
            except (ValueError, TypeError):
                pass
            tv = e.get("strTVStation")
            events.append({
                "date": ev_date,
                "time": ev_time,
                "name": e.get("strEvent") or name,
                "comp": e.get("strLeague") or "",
                "channel": tv if tv else "Sport TV",
            })
        print(f"  {name}: {len(data.get('events') or [])} upcoming fixtures")
        time_mod.sleep(0.25)
    return events


def main():
    print("Fetching World Cup broadcasts...")
    events = fetch_world_cup()
    print("Fetching national team fixtures...")
    events += fetch_national()
    print("Fetching club fixtures...")
    events += fetch_clubs()

    # Drop entries with no usable date, sort, dedupe
    events = [e for e in events if e.get("date")]
    events.sort(key=lambda e: (e["date"], e.get("time", "")))
    seen = set()
    unique = []
    for e in events:
        key = (e["date"], e["name"])
        if key not in seen:
            seen.add(key)
            unique.append(e)

    result = {
        "fetched": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "count": len(unique),
        "events": unique,
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved {len(unique)} broadcasts to {OUT}")


if __name__ == "__main__":
    main()
