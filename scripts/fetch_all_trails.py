#!/usr/bin/env python3
"""Fetch all Madeira trail race data from ts.uma.pt API."""
import json
import os
import sys
import time
import urllib.request

API = "https://api.ts.uma.pt"
# Personal API token for ts.uma.pt — set TS_UMA_TOKEN in your environment
# (locally via .env, in CI via GitHub Secrets). Never commit the value.
TOKEN = f"Token {os.environ['TS_UMA_TOKEN']}"


def api_get(path):
    url = f"{API}{path}"
    req = urllib.request.Request(url, headers={"Authorization": TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  WARN: {path} -> {e}", file=sys.stderr)
        return None


def fetch_all_events():
    """Get all events from paginated EventRecents."""
    events = api_get("/trail/EventRecents/1/")
    if not events:
        print("Failed to fetch events", file=sys.stderr)
        sys.exit(1)
    print(f"Fetched {len(events)} events")
    return events


def fetch_event_data(event):
    trail_id = event["trail_event_id"]
    name = event["name"]
    date = event.get("init_date", "")[:10]
    year = int(date[:4]) if date else 0

    print(f"  {name} ({year})...")

    genders = api_get(f"/trail/GenderTotal/{trail_id}/") or []
    nationalities = api_get(f"/trail/NacionalityTotal/{trail_id}/") or []
    nationalities = [n for n in nationalities if n.get("Value", 0) > 0]
    categories = api_get(f"/trail/CategoryTotal/{trail_id}/") or []
    categories = [c for c in categories if c.get("Value", 0) > 0]

    male = next((g["Value"] for g in genders if g["Label"] == "M"), 0)
    female = next((g["Value"] for g in genders if g["Label"] == "F"), 0)
    total = male + female

    competitions = []
    for comp in event.get("competitions", []):
        comp_id = comp["competition_id"]
        comp_name = comp.get("name") or comp.get("long_name", "")
        distance = float(comp.get("total_distance", 0) or 0)

        winners_m = api_get(f"/results/AthsWinnersGender/{comp_id}/M/") or []
        winners_f = api_get(f"/results/AthsWinnersGender/{comp_id}/F/") or []
        dnfs = api_get(f"/competition/AthsGiveup/{comp_id}/") or []
        finishers = api_get(f"/results/AthsFinalTimeGlobalWithPositions/{comp_id}/")

        finish_count = len(finishers) if finishers else 0

        record_m = None
        if winners_m:
            w = winners_m[0]
            record_m = {
                "name": w.get("name", ""),
                "country": w.get("country", ""),
                "time": w.get("acumulated_time", ""),
                "category": w.get("escalao", ""),
            }

        record_f = None
        if winners_f:
            w = winners_f[0]
            record_f = {
                "name": w.get("name", ""),
                "country": w.get("country", ""),
                "time": w.get("acumulated_time", ""),
                "category": w.get("escalao", ""),
            }

        competitions.append({
            "comp_id": comp_id,
            "name": comp_name,
            "distance_km": distance,
            "finishers": finish_count,
            "dnf": len(dnfs),
            "record_m": record_m,
            "record_f": record_f,
        })

        time.sleep(0.25)

    return {
        "trail_event_id": trail_id,
        "name": name,
        "short_name": event.get("short_name", ""),
        "date": date,
        "year": year,
        "total": total,
        "male": male,
        "female": female,
        "nationalities": nationalities[:30],
        "num_countries": len(nationalities),
        "categories": categories,
        "competitions": competitions,
        "total_finishers": sum(c["finishers"] for c in competitions),
        "total_dnf": sum(c["dnf"] for c in competitions),
    }


def main():
    out_path = "/Users/kirillshpara/shpara1/madeira/all_trails.json"

    events = fetch_all_events()

    # Filter to Madeira events only (exclude Azores)
    azores_keywords = ["Azores", "Açores", "Pico Mountain"]
    madeira_events = [
        e for e in events
        if not any(kw in e["name"] for kw in azores_keywords)
    ]
    print(f"Madeira events: {len(madeira_events)} (filtered {len(events) - len(madeira_events)} Azores)")

    results = []
    for event in madeira_events:
        data = fetch_event_data(event)
        if data and data["total"] > 0:
            results.append(data)
        time.sleep(0.3)

    results.sort(key=lambda e: e["date"])

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(results)} events to {out_path}")
    total_athletes = sum(e["total"] for e in results)
    print(f"Total athletes across all events: {total_athletes:,}")

    by_year = {}
    for e in results:
        by_year.setdefault(e["year"], []).append(e)
    for year in sorted(by_year):
        evts = by_year[year]
        t = sum(e["total"] for e in evts)
        print(f"  {year}: {len(evts)} events, {t:,} athletes")


if __name__ == "__main__":
    main()
