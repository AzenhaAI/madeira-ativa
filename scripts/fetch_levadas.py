#!/usr/bin/env python3
"""Build the Madeira levada/trail guide dataset.

Combines:
  - OpenStreetMap PR hiking routes (name, from/to, distance, fee, description,
    official Visit Madeira website, trail marking) — via Overpass.
  - IFCN open/partial/closed status — from madeira/trails_status.json.
  - Ascent estimate — sampled from the route geometry via opentopodata (eudem25m).

Output: madeira/levadas.json (used by the /madeira/levada guide page).

Trail data © OpenStreetMap contributors. Elevation © opentopodata / EU-DEM.
"""

import json
import math
import re
import time
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "madeira"
STATUS_IN = BASE / "trails_status.json"
OUT = BASE / "levadas.json"

OVERPASS = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:120];
area["ISO3166-2"="PT-30"]->.a;
( relation["route"="hiking"]["ref"~"^PR"](area.a); );
out geom;
"""
ELEV_API = "https://api.opentopodata.org/v1/eudem25m"
SAMPLE_GAP_M = 120        # distance between elevation samples
MAX_SAMPLES = 95          # opentopodata allows 100 locations per call


def norm(code):
    return re.sub(r"\s+", "", str(code or "")).upper()


def haversine(a, b):
    R = 6371000
    dlat = math.radians(b[0] - a[0])
    dlon = math.radians(b[1] - a[1])
    la1, la2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin(dlat / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def fetch_osm():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    req = urllib.request.Request(OVERPASS, data=data, headers={"User-Agent": "MadeiraLevadas/1.0"})
    with urllib.request.urlopen(req, timeout=150) as resp:
        return json.loads(resp.read())


def ordered_points(rel):
    pts = []
    for m in rel.get("members", []):
        if m.get("type") == "way" and "geometry" in m:
            for p in m["geometry"]:
                pts.append((p["lat"], p["lon"]))
    return pts


def route_length_m(pts):
    return sum(haversine(pts[i - 1], pts[i]) for i in range(1, len(pts)))


def sample_points(pts):
    """Pick points spaced ~SAMPLE_GAP_M apart, capped at MAX_SAMPLES."""
    if len(pts) < 2:
        return pts
    total = route_length_m(pts)
    gap = max(SAMPLE_GAP_M, total / MAX_SAMPLES)
    out = [pts[0]]
    acc = 0.0
    for i in range(1, len(pts)):
        acc += haversine(pts[i - 1], pts[i])
        if acc >= gap:
            out.append(pts[i])
            acc = 0.0
    if out[-1] != pts[-1]:
        out.append(pts[-1])
    return out[:MAX_SAMPLES]


def elevation_profile(pts):
    """Sample elevations along the route. Returns (ascent_m, descent_m, [elevations])."""
    samples = sample_points(pts)
    if len(samples) < 2:
        return None, None, []
    locs = "|".join(f"{lat:.5f},{lon:.5f}" for lat, lon in samples)
    url = f"{ELEV_API}?locations={urllib.parse.quote(locs)}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MadeiraLevadas/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        elevs = [r["elevation"] for r in data.get("results", []) if r.get("elevation") is not None]
    except Exception as e:
        print(f"    elevation error: {e}")
        return None, None, []
    if len(elevs) < 2:
        return None, None, []
    gain = drop = 0.0
    for i in range(1, len(elevs)):
        d = elevs[i] - elevs[i - 1]
        if d > 1.5:
            gain += d
        elif d < -1.5:
            drop += -d
    time.sleep(1.1)  # respect opentopodata rate limit (1 req/s)
    return round(gain), round(drop), [round(e) for e in elevs]


def clean_name(name):
    return re.sub(r"^PR[\s\d.]*[-–]?\s*", "", name or "").strip()


def marking_colour(osmc):
    # osmc:symbol like "red:yellow:red_lower:PR 7:black" -> waymark colours
    if not osmc:
        return None
    parts = osmc.split(":")
    return parts[1] if len(parts) > 1 else parts[0]


def main():
    status = json.loads(STATUS_IN.read_text())
    status_by_code = {norm(t["code"]): t["status"] for t in (status.get("trails") or [])}

    osm = fetch_osm()
    rels = [e for e in osm.get("elements", []) if e.get("tags", {}).get("ref")]
    print(f"OSM PR relations: {len(rels)}")

    levadas = []
    seen = set()
    for rel in rels:
        t = rel.get("tags", {})
        code = t.get("ref")
        key = (norm(code), t.get("name", ""))
        if key in seen:
            continue
        seen.add(key)

        pts = ordered_points(rel)
        if len(pts) < 2:
            continue

        dist = t.get("distance")
        try:
            dist = round(float(dist), 1) if dist else round(route_length_m(pts) / 1000, 1)
        except ValueError:
            dist = round(route_length_m(pts) / 1000, 1)

        print(f"  {code}: sampling elevation...")
        asc, desc, profile = elevation_profile(pts)

        levadas.append({
            "code": code,
            "name": clean_name(t.get("name")),
            "alt_name": t.get("alt_name", ""),
            "status": status_by_code.get(norm(code), "open"),
            "distance_km": dist,
            "ascent_m": asc,
            "descent_m": desc,
            "profile": profile,
            "roundtrip": t.get("roundtrip") == "yes",
            "from": t.get("from", ""),
            "to": t.get("to", ""),
            "fee": t.get("fee") == "yes",
            "charge": t.get("charge", ""),
            "marking": marking_colour(t.get("osmc:symbol")),
            "desc_en": t.get("description:en", ""),
            "desc_pt": t.get("description:pt", ""),
            "url_en": t.get("website:en") or t.get("website", ""),
            "url_pt": t.get("website:pt") or t.get("website", ""),
            "center": pts[len(pts) // 2],
        })

    order = {"open": 0, "partial": 1, "closed": 2}
    levadas.sort(key=lambda x: (order.get(x["status"], 3), x["code"]))

    result = {
        "fetched": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "attribution": "Trails © OpenStreetMap · Elevation © EU-DEM/opentopodata",
        "count": len(levadas),
        "levadas": levadas,
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved {len(levadas)} levadas to {OUT}")


if __name__ == "__main__":
    main()
