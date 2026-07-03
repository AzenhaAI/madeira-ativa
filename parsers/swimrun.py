from typing import Optional

import requests
from bs4 import BeautifulSoup
from datetime import date
import re

MONTHS_PT = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
    "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
    "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12,
}

MONTHS_EN = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5,
    "june": 6, "july": 7, "august": 8, "september": 9, "october": 10,
    "november": 11, "december": 12,
}


def _parse_date_text(text: str) -> Optional[date]:
    text = text.lower().strip()
    all_months = {**MONTHS_PT, **MONTHS_EN}

    for month_name, month_num in all_months.items():
        if month_name in text:
            day_match = re.search(r"(\d{1,2})", text)
            year_match = re.search(r"(20\d{2})", text)
            if day_match and year_match:
                try:
                    return date(int(year_match.group(1)), month_num, int(day_match.group(1)))
                except ValueError:
                    pass

    date_match = re.search(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})", text)
    if date_match:
        d, m, y = int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))
        try:
            return date(y, m, d)
        except ValueError:
            pass

    return None


def parse_swimrun() -> list[dict]:
    url = "https://www.swimrunportugal.com/madeira"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except requests.RequestException:
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    text = soup.get_text(" ", strip=True)

    event_date = _parse_date_text(text)

    return [{
        "name": "Madeira SwimRun",
        "event_date": event_date,
        "location": "Madeira",
        "url": url,
        "event_type": "swimrun",
    }]
