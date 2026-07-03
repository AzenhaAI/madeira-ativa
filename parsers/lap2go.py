import requests
from bs4 import BeautifulSoup
from datetime import datetime, date

MADEIRA_KEYWORDS = ["madeira", "funchal", "machico", "câmara de lobos", "santa cruz",
                    "porto moniz", "santana", "calheta", "ribeira brava", "ponta do sol",
                    "são vicente", "porto santo"]

MAINLAND_EXCLUSIONS = ["são joão da madeira", "são joao da madeira", "sao joao da madeira"]


def parse_lap2go() -> list[dict]:
    events = []
    current_year = date.today().year

    for month in range(1, 13):
        url = f"https://lap2go.com/pt/event/list?year={current_year}&month={month}"
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
        except requests.RequestException:
            continue

        soup = BeautifulSoup(resp.text, "lxml")

        for card in soup.select("a.event-item"):
            name = card.get("data-name", "")
            city = card.get("data-city", "")
            day_str = card.get("data-day", "")

            if not name:
                continue

            if not any(kw in (name + " " + city).lower() for kw in MADEIRA_KEYWORDS):
                continue

            if any(place in (name + " " + city).lower() for place in MAINLAND_EXCLUSIONS):
                continue

            href = card.get("href", "")
            if href and not href.startswith("http"):
                href = "https://lap2go.com" + href

            event_date = None
            if day_str:
                try:
                    event_date = datetime.strptime(day_str, "%d-%m-%Y").date()
                except ValueError:
                    pass

            events.append({
                "name": name,
                "event_date": event_date,
                "location": city or "Madeira",
                "url": href,
                "event_type": "",
            })

    return events
