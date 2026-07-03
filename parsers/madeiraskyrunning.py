import re
from datetime import datetime

import requests
from bs4 import BeautifulSoup


RACES = [
    "santana-sky-speed",
    "furao-sky-race",
    "santana-sky-race",
    "santana-vertical-kilometer",
    "madeira-sky-race",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
    "Referer": "https://madeiraskyrunning.com/",
}


def _parse_date(text: str):
    match = re.search(r"\b(\d{2}/\d{2}/\d{4})\s+(\d{1,2}:\d{2})", text)
    if not match:
        return None

    try:
        return datetime.strptime(" ".join(match.groups()), "%d/%m/%Y %H:%M").date()
    except ValueError:
        return None


def _extract_distance(text: str) -> str:
    match = re.search(r"\b(\d+(?:[.,]\d+)?)\s*km\s*\|\s*(\d+)\s*D\+", text, re.IGNORECASE)
    if not match:
        return ""
    distance = match.group(1).replace(",", ".")
    climb = match.group(2)
    return f"{distance}km | {climb}D+"


def parse_madeiraskyrunning() -> list[dict]:
    events = []

    for slug in RACES:
        url = f"https://madeiraskyrunning.com/prova/{slug}/"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
        except requests.RequestException:
            continue

        soup = BeautifulSoup(resp.text, "lxml")
        text = soup.get_text("\n", strip=True)

        title_el = soup.find(["h1", "h2"])
        name = title_el.get_text(strip=True) if title_el else slug.replace("-", " ").title()
        event_date = _parse_date(text)
        distance = _extract_distance(text)

        if distance:
            name = f"{name} ({distance})"

        events.append({
            "name": name,
            "event_date": event_date,
            "location": "Santana, Madeira",
            "url": url,
            "event_type": "trail",
        })

    return events
