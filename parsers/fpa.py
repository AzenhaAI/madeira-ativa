import re

import requests
from bs4 import BeautifulSoup

from .date_utils import parse_iso_date
from .madeiraskyrunning import HEADERS


MADEIRA_LOCATIONS = [
    "madeira", "funchal", "camara de lobos", "câmara de lobos",
    "ribeira brava", "porto santo", "machico", "santana",
    "porto moniz", "sao vicente", "são vicente", "seixal",
]


def _is_madeira_event(title: str, location: str) -> bool:
    haystack = f"{title} {location}".lower()
    return any(place in haystack for place in MADEIRA_LOCATIONS)


def parse_fpa_competicoes() -> list[dict]:
    url = "https://fpacompeticoes.pt/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException:
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    lines = [line.strip() for line in soup.get_text("\n", strip=True).splitlines()]
    lines = [line for line in lines if line and line != "Image"]

    events = []
    for i, line in enumerate(lines):
        if not re.search(r"\d{4}/\d{2}/\d{2}", line):
            continue

        event_date = parse_iso_date(line)
        if not event_date:
            continue

        title = lines[i - 1] if i > 0 else ""
        location = lines[i + 1] if i + 1 < len(lines) else ""

        if not title or not _is_madeira_event(title, location):
            continue

        events.append({
            "name": title,
            "event_date": event_date,
            "location": location,
            "url": url,
            "event_type": "running",
        })

    return events
