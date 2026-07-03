from typing import Optional

import requests
from bs4 import BeautifulSoup
from datetime import date
import re


def _parse_date_text(text: str) -> Optional[date]:
    match = re.search(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})", text)
    if match:
        d, m, y = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            return date(y, m, d)
        except ValueError:
            pass
    match = re.search(r"(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})", text)
    if match:
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            return date(y, m, d)
        except ValueError:
            pass
    return None


def parse_racefinder() -> list[dict]:
    events = []
    base_url = "https://racefinder.pt/pt/event/"

    for page in range(1, 10):
        url = f"{base_url}?pg={page}&location=madeira"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 404:
                break
            resp.raise_for_status()
        except requests.RequestException:
            break

        soup = BeautifulSoup(resp.text, "lxml")
        cards = soup.select("a[href*='/pt/event/']")

        if not cards:
            break

        for card in cards:
            href = card.get("href", "")
            if href == base_url or href.endswith("/event/"):
                continue
            if not href.startswith("http"):
                href = "https://racefinder.pt" + href

            text = card.get_text(" ", strip=True)
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            name = lines[0] if lines else text[:100]

            event_date = _parse_date_text(text)
            location = "Madeira"

            events.append({
                "name": name,
                "event_date": event_date,
                "location": location,
                "url": href,
                "event_type": "running",
            })

    return events
