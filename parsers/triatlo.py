from typing import Optional

import requests
from bs4 import BeautifulSoup
from datetime import date
import re

MONTHS_PT = {
    "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
    "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12,
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}

TRIATLO_MADEIRA_URL = "https://triatlomadeira.com/2026/04/"
TRIATLO_CALENDAR_2026_URL = "https://triatlomadeira.com/wp-content/uploads/2026/03/Calendario-Provas-Triatlo-Madeira-e-Porto-Santo-2026-V.-06-03-2026.pdf"

FALLBACK_EVENTS = [
    {
        "name": "Aquabike do Porto Moniz",
        "event_date": date(2026, 5, 2),
        "location": "Porto Moniz",
        "url": TRIATLO_MADEIRA_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Aquatlo Sprint e Super-Sprint do Porto Moniz",
        "event_date": date(2026, 5, 3),
        "location": "Porto Moniz",
        "url": TRIATLO_MADEIRA_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Aquatlo Jovem do Porto Moniz",
        "event_date": date(2026, 5, 3),
        "location": "Porto Moniz",
        "url": TRIATLO_MADEIRA_URL,
        "event_type": "triathlon_kids",
    },
    {
        "name": "Aquatlo Equipas Estafetas da Calheta",
        "event_date": date(2026, 5, 16),
        "location": "Calheta",
        "url": TRIATLO_MADEIRA_URL,
        "event_type": "triathlon_pro",
    },
    {
        "name": "Aquatlo Jovem da Calheta",
        "event_date": date(2026, 5, 16),
        "location": "Calheta",
        "url": TRIATLO_MADEIRA_URL,
        "event_type": "triathlon_kids",
    },
    {
        "name": "Triatlo da Ponta do Sol - Madalena do Mar",
        "event_date": date(2026, 6, 7),
        "location": "Madalena do Mar / Ponta do Sol",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Triatlo Jovem da Ponta do Sol - Madalena do Mar",
        "event_date": date(2026, 6, 7),
        "location": "Madalena do Mar / Ponta do Sol",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon_kids",
    },
    {
        "name": "Triatlo Sprint Cidade de Machico",
        "event_date": date(2026, 7, 5),
        "location": "Machico",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Triatlo Jovem Cidade de Machico",
        "event_date": date(2026, 7, 5),
        "location": "Machico",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon_kids",
    },
    {
        "name": "Triatlo Sprint Cidade de Machico",
        "event_date": date(2026, 7, 19),
        "location": "Machico",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Triatlo Super-Sprint Cidade de Machico",
        "event_date": date(2026, 7, 19),
        "location": "Machico",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Triatlo Sprint Cidade do Funchal",
        "event_date": date(2026, 8, 30),
        "location": "Funchal",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Triatlo Jovem Cidade do Funchal",
        "event_date": date(2026, 8, 30),
        "location": "Funchal",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon_kids",
    },
    {
        "name": "Duatlo BTT do Funchal",
        "event_date": date(2026, 9, 13),
        "location": "Funchal",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Duatlo Jovem BTT do Funchal",
        "event_date": date(2026, 9, 13),
        "location": "Funchal",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon_kids",
    },
    {
        "name": "Triatlo Olimpico Porto Santo",
        "event_date": date(2026, 10, 3),
        "location": "Porto Santo",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon",
    },
    {
        "name": "Triatlo Jovem Porto Santo",
        "event_date": date(2026, 10, 3),
        "location": "Porto Santo",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon_kids",
    },
    {
        "name": "Camp. Regional de Equipas de Estafetas de Triatlo",
        "event_date": date(2026, 10, 4),
        "location": "Porto Santo",
        "url": TRIATLO_CALENDAR_2026_URL,
        "event_type": "triathlon_pro",
    },
]


def _extract_date(text: str, fallback_year: int) -> Optional[date]:
    text = text.lower().strip()

    match = re.search(r"(\d{4})\s+(\d{1,2})\s+(\w+)", text)
    if match:
        year = int(match.group(1))
        day = int(match.group(2))
        month_str = match.group(3)[:3]
        month = MONTHS_PT.get(month_str)
        if month:
            try:
                return date(year, month, day)
            except ValueError:
                pass

    match = re.search(r"(\d{1,2})\s+(?:de\s+)?(\w+)(?:\s+(?:de\s+)?(\d{4}))?", text)
    if match:
        day = int(match.group(1))
        month_str = match.group(2)[:3]
        year = int(match.group(3)) if match.group(3) else fallback_year
        month = MONTHS_PT.get(month_str)
        if month:
            try:
                return date(year, month, day)
            except ValueError:
                pass

    return None


def parse_triatlo() -> list[dict]:
    events = FALLBACK_EVENTS.copy()
    current_year = date.today().year

    for month in range(1, 13):
        url = f"https://triatlomadeira.com/{current_year}/{month:02d}/"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 404:
                continue
            resp.raise_for_status()
        except requests.RequestException:
            continue

        soup = BeautifulSoup(resp.text, "lxml")

        for article in soup.select("article, .post, .entry"):
            title_el = article.select_one("h1 a, h2 a, h3 a, .entry-title a")
            if not title_el:
                continue

            name = title_el.get_text(strip=True)
            href = title_el.get("href", "")

            content = article.get_text(" ", strip=True)
            event_date = _extract_date(content, current_year)

            location = "Madeira"
            for loc in ["funchal", "machico", "porto moniz", "santana", "calheta",
                        "câmara de lobos", "santa cruz", "ribeira brava", "porto santo"]:
                if loc in content.lower():
                    location = loc.title()
                    break

            events.append({
                "name": name,
                "event_date": event_date,
                "location": location,
                "url": href,
                "event_type": "triathlon",
            })

    return events
