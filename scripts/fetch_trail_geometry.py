#!/usr/bin/env python3
"""Fetch OSM geometry for Madeira's classified walking trails (levadas/veredas).

Reads madeira/trails_status.json (from fetch_trails.py) for each PR trail's
open/partial/closed status, queries the OpenStreetMap Overpass API for the
matching PR hiking routes, simplifies the polylines and writes them to
madeira/trails_geo.json for the map's "Walking trails" layer.

Data © OpenStreetMap contributors (ODbL).
"""

import json
import math
import re
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "madeira"
STATUS_IN = BASE / "trails_status.json"
GEO_OUT = BASE / "trails_geo.json"

OVERPASS = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:120];
area["ISO3166-2"="PT-30"]->.a;
(
  relation["route"="hiking"]["ref"~"^PR"](area.a);
);
out geom;
"""

MIN_GAP_M = 12  # drop points closer than this to the previous kept point


def norm(code):
    return re.sub(r"\s+", "", str(code or "")).upper()


def tokens(text):
    return set(re.findall(r"[a-zàáâãéêíóôõúç]+", (text or "").lower()))


def haversine(a, b):
    R = 6371000
    dlat = math.radians(b[0] - a[0])
    dlon = math.radians(b[1] - a[1])
    la1, la2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin(dlat / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def thin(pts):
    if len(pts) <= 2:
        return pts
    out = [pts[0]]
    for p in pts[1:-1]:
        if haversine(out[-1], p) >= MIN_GAP_M:
            out.append(p)
    out.append(pts[-1])
    return out


def fetch_osm():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    req = urllib.request.Request(OVERPASS, data=data, headers={"User-Agent": "MadeiraTrails/1.0"})
    with urllib.request.urlopen(req, timeout=150) as resp:
        return json.loads(resp.read())


def relation_lines(rel):
    lines = []
    for m in rel.get("members", []):
        if m.get("type") != "way" or "geometry" not in m:
            continue
        pts = [[round(p["lat"], 5), round(p["lon"], 5)] for p in m["geometry"]]
        pts = thin(pts)
        if len(pts) >= 2:
            lines.append(pts)
    return lines


def main():
    status = json.loads(STATUS_IN.read_text())
    all_status = status.get("trails") or status.get("alerts") or []
    status_by_code = {}
    name_by_code = {}
    for t in all_status:
        status_by_code[norm(t["code"])] = t["status"]
        name_by_code[norm(t["code"])] = t.get("name", "")
    print(f"Status known for {len(status_by_code)} trails")

    osm = fetch_osm()
    elements = [e for e in osm.get("elements", []) if e.get("tags", {}).get("ref")]
    print(f"OSM PR relations: {len(elements)}")

    out = []
    seen = set()
    for el in elements:
        tags = el.get("tags", {})
        code = norm(tags.get("ref"))
        osm_name = tags.get("name", "")
        lines = relation_lines(el)
        if not lines:
            continue
        # avoid drawing the same ref+name twice
        key = (code, osm_name)
        if key in seen:
            continue
        seen.add(key)
        st = status_by_code.get(code, "open")
        # clean the OSM name "PR 7 - Levada do Moinho" -> "Levada do Moinho"
        disp = re.sub(r"^PR[\s\d.]*[-–]?\s*", "", osm_name).strip() or name_by_code.get(code, "")
        out.append({
            "code": tags.get("ref"),
            "name": disp,
            "status": st,
            "lines": lines,
        })

    out.sort(key=lambda t: {"closed": 0, "partial": 1, "open": 2}.get(t["status"], 3))
    counts = {}
    for t in out:
        counts[t["status"]] = counts.get(t["status"], 0) + 1

    result = {
        "fetched": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "attribution": "© OpenStreetMap contributors",
        "count": len(out),
        "counts": counts,
        "trails": out,
    }
    GEO_OUT.write_text(json.dumps(result, ensure_ascii=False))
    size_kb = GEO_OUT.stat().st_size / 1024
    print(f"Saved {len(out)} trail geometries ({counts}) to {GEO_OUT} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
