#!/usr/bin/env python3
"""Fetch the official IFCN classified walking-trail status for Madeira.

Source: Visit Madeira / IFCN PDF "Percursos Pedestres Classificados — Abertos/Fechados".
Parses each trail's PR code, name and status (open / partial / closed) and writes
the actionable subset (closed + partially open) plus counts to JSON.

Output: madeira/trails_status.json
"""

import json
import re
import urllib.request
from datetime import datetime
from io import BytesIO
from pathlib import Path

import pdfplumber

OUT = Path(__file__).resolve().parent.parent / "madeira" / "trails_status.json"
PDF_URL = (
    "https://visitmadeira.com/media/bl4glmch/"
    "percursos-pedestres-classificados-abertos-fechados.pdf"
)
SOURCE_PAGE = "https://visitmadeira.com/en/what-to-do/nature-seekers/notice-to-walkers-and-list-of-walks/"

STATUS = {"ABERTO": "open", "ENCERRADO": "closed", "PARCIALMENTE": "partial", "FECHADO": "closed"}
PRIORITY = {"closed": 0, "partial": 1, "open": 2}


def clean_name(text):
    text = re.split(r"Nota:|Note:|\(Descri", text)[0]
    text = re.sub(r"\s+", " ", text)
    # Restore spaces around dashes and glued words like "daEncumeada".
    text = re.sub(r"\s*([–-])\s*", r" \1 ", text)
    text = re.sub(r"([a-zçãõáéíóú])([A-ZÇÃÕ])", r"\1 \2", text)
    text = re.sub(r"\s*\(\s*", " (", text).replace(" )", ")")
    return re.sub(r"\s+", " ", text).strip(" .-")


def fetch_pdf_bytes():
    req = urllib.request.Request(PDF_URL, headers={"User-Agent": "Mozilla/5.0 MadeiraTrails/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse(pdf_bytes):
    trails = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            statuses = [(w["top"], STATUS[w["text"]]) for w in words
                        if w["text"] in STATUS and w["x0"] > 380]
            name_words = [(w["top"], w["x0"], w["text"]) for w in words if 110 < w["x0"] < 335]

            for w in words:
                if w["text"] != "PR" and not re.match(r"^PR\d", w["text"]):
                    continue
                code = w["text"]
                if code == "PR":  # number is a separate word on the same row
                    for w2 in words:
                        if abs(w2["top"] - w["top"]) < 6 and 0 < w2["x0"] - w["x0"] < 40 \
                                and re.match(r"^\d", w2["text"]):
                            code = "PR" + w2["text"]
                            break
                code = code.replace(" ", "")
                top = w["top"]

                near = [s for (st, s) in statuses if abs(top - st) < 24]
                if not near and statuses:
                    near = [min(statuses, key=lambda r: abs(top - r[0]))[1]]
                if not near:
                    continue
                near.sort(key=lambda s: PRIORITY[s])
                status = near[0]

                band = sorted([(t, x, txt) for (t, x, txt) in name_words if abs(t - top) < 22])
                name = clean_name(" ".join(txt for (_, _, txt) in band))
                trails.append({"code": code.replace("PR", "PR "), "name": name, "status": status})
    return trails


def main():
    print("Downloading IFCN trail-status PDF...")
    trails = parse(fetch_pdf_bytes())

    counts = {"open": 0, "partial": 0, "closed": 0}
    for t in trails:
        counts[t["status"]] = counts.get(t["status"], 0) + 1

    # Only the actionable subset goes to the site (closed first, then partial).
    alerts = [t for t in trails if t["status"] in ("closed", "partial")]
    alerts.sort(key=lambda t: PRIORITY[t["status"]])

    result = {
        "fetched": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "source": SOURCE_PAGE,
        "counts": counts,
        "total": len(trails),
        "alerts": alerts,
        "trails": trails,
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Parsed {len(trails)} trails — "
          f"{counts['open']} open, {counts['partial']} partial, {counts['closed']} closed")
    print(f"Saved {len(alerts)} alerts to {OUT}")


if __name__ == "__main__":
    main()
