import re
from datetime import date
from typing import Optional

import requests
from bs4 import BeautifulSoup


AORAM_CALENDAR_URL = "https://aoram.pt/calendario/"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/125.0 Safari/537.36",
}
MONTHS = {
    "janeiro": 1,
    "fevereiro": 2,
    "março": 3,
    "marco": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}

LOCATION_HINTS = {
    "machico": "Machico",
    "fanal": "Fanal, Porto Moniz",
    "camacha": "Camacha",
    "caniçal": "Caniçal, Machico",
    "canical": "Caniçal, Machico",
    "funchal": "Funchal",
    "santa cruz": "Santa Cruz",
    "ilha": "Ilha, Santana",
    "santana": "Santana",
    "ponta delgada": "Ponta Delgada, São Vicente",
    "lombadas": "Ponta Delgada, São Vicente",
    "porto santo": "Porto Santo",
    "estreito da calheta": "Estreito da Calheta",
    "são vicente": "São Vicente",
    "sao vicente": "São Vicente",
    "ribeira brava": "Ribeira Brava",
    "ponta sol": "Ponta do Sol",
    "ponta do sol": "Ponta do Sol",
    "câmara de lobos": "Câmara de Lobos",
    "camara de lobos": "Câmara de Lobos",
    "festa da maçã": "Camacha",
    "festa da maca": "Camacha",
    "estreito": "Estreito de Câmara de Lobos",
    "poiso": "Poiso",
    "jardim do mar": "Jardim do Mar, Calheta",
    "calheta": "Calheta",
}


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _location_for(name: str) -> str:
    normalized = name.casefold()
    for marker, location in LOCATION_HINTS.items():
        if marker in normalized:
            return location
    return "Madeira"


def _discipline(cells: list[str]) -> str:
    labels = []
    if cells[4]:
        labels.append("Extra")
    if cells[5]:
        labels.append("Pedestre")
    if cells[6]:
        labels.append("Urbana")
    if cells[7]:
        labels.append("Rogaine")
    return ", ".join(labels)


def _event_name(name: str, cells: list[str], event_date: date, end_date: Optional[date]) -> str:
    discipline = _discipline(cells)
    label = f"Orientação: {name}"
    if discipline:
        label = f"{label} ({discipline})"
    if end_date:
        return f"{label} ({event_date:%d/%m}-{end_date:%d/%m})"
    return label


def parse_aoram() -> list[dict]:
    response = requests.get(AORAM_CALENDAR_URL, headers=REQUEST_HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")

    events = []
    month = None
    for row in soup.select("#table_1 tbody tr"):
        cells = [_clean(cell.get_text(" ", strip=True)) for cell in row.select("td")]
        if len(cells) < 8:
            continue

        if cells[0]:
            month = MONTHS.get(cells[0].casefold())
        if not month or not cells[1] or not cells[2]:
            continue

        days = [int(day) for day in re.findall(r"\d+", cells[1])]
        if not days:
            continue

        event_date = date(2026, month, days[0])
        end_date = date(2026, month, days[-1]) if len(days) > 1 else None
        name = cells[2].replace(" | ", ": ")

        events.append({
            "name": _event_name(name, cells, event_date, end_date),
            "event_date": event_date,
            "location": _location_for(name),
            "url": AORAM_CALENDAR_URL,
            "event_type": "orienteering",
        })

    return events
