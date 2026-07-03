#!/usr/bin/env python3
"""Daily check: has the official Trail Madeira calendar PDF changed?

Downloads the TM "Quadro de Provas" PDF, compares a content hash (and the
"Alterado em" date) against what is stored in madeira/trail_calendar.json.
If it changed, records the new hash + date and sets "needs_review": true so
the site can flag that the calendar may be out of date. The curated event
rows are left untouched (the PDF layout is too irregular to re-parse safely).
"""

import hashlib
import json
import re
import urllib.request
from io import BytesIO
from pathlib import Path

import pdfplumber

CAL = Path(__file__).resolve().parent.parent / "madeira" / "trail_calendar.json"


def main():
    data = json.loads(CAL.read_text())
    url = data.get("source")
    if not url:
        print("No source URL in trail_calendar.json")
        return

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 MadeiraTrailCheck/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            pdf_bytes = resp.read()
    except Exception as e:
        print(f"Could not download PDF: {e}")
        return

    sha = hashlib.sha256(pdf_bytes).hexdigest()
    alterado = ""
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages)
        m = re.search(r"Alterado em\s*([0-9]{1,2}/\w+)", text)
        if m:
            alterado = m.group(1)
    except Exception as e:
        print(f"Could not read PDF text: {e}")

    if sha == data.get("pdf_sha"):
        print(f"No change (sha {sha[:10]}…, Alterado {alterado or '?'})")
        if data.get("needs_review"):
            data["needs_review"] = False
            CAL.write_text(json.dumps(data, ensure_ascii=False, indent=2))
        return

    print(f"PDF CHANGED — new Alterado: {alterado or '?'} (sha {sha[:10]}…)")
    data["pdf_sha"] = sha
    if alterado:
        data["pdf_alterado"] = alterado
    data["needs_review"] = True
    CAL.write_text(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
