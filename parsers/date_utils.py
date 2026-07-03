import re
from datetime import date, datetime


MONTHS = {
    "jan": 1, "janeiro": 1, "january": 1,
    "fev": 2, "fevereiro": 2, "february": 2,
    "mar": 3, "marco": 3, "março": 3, "march": 3,
    "abr": 4, "abril": 4, "april": 4,
    "mai": 5, "maio": 5, "may": 5,
    "jun": 6, "junho": 6, "june": 6,
    "jul": 7, "julho": 7, "july": 7,
    "ago": 8, "agosto": 8, "august": 8,
    "set": 9, "setembro": 9, "sep": 9, "september": 9,
    "out": 10, "outubro": 10, "oct": 10, "october": 10,
    "nov": 11, "novembro": 11, "november": 11,
    "dez": 12, "dezembro": 12, "dec": 12, "december": 12,
}


def parse_iso_date(text: str):
    match = re.search(r"\b(\d{4})[-/](\d{2})[-/](\d{2})\b", text)
    if not match:
        return None
    try:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return None


def parse_numeric_date(text: str):
    match = re.search(r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b", text)
    if not match:
        return None
    try:
        return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
    except ValueError:
        return None


def parse_text_date(text: str):
    clean = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", text, flags=re.IGNORECASE)
    clean = clean.replace("–", "-").replace("&", " ")

    range_match = re.search(
        r"\b(\d{1,2})\s+(?:de\s+)?([A-Za-zÀ-ÿ]+)\s*-\s*"
        r"\d{1,2}\s+(?:de\s+)?[A-Za-zÀ-ÿ]+\s+(?:de\s+)?(\d{4})\b",
        clean,
        flags=re.IGNORECASE,
    )
    if range_match:
        month = MONTHS.get(range_match.group(2).lower()[:3]) or MONTHS.get(range_match.group(2).lower())
        if month:
            try:
                return date(int(range_match.group(3)), month, int(range_match.group(1)))
            except ValueError:
                return None

    same_month_range = re.search(
        r"\b(\d{1,2})\s*-\s*\d{1,2}\s+([A-Za-zÀ-ÿ]+)\s+(?:de\s+)?(\d{4})\b",
        clean,
        flags=re.IGNORECASE,
    )
    if same_month_range:
        month = MONTHS.get(same_month_range.group(2).lower()[:3]) or MONTHS.get(same_month_range.group(2).lower())
        if month:
            try:
                return date(int(same_month_range.group(3)), month, int(same_month_range.group(1)))
            except ValueError:
                return None

    patterns = [
        r"\b(\d{1,2})\s+(?:de\s+)?([A-Za-zÀ-ÿ]+)\s+(?:de\s+)?(\d{4})\b",
        r"\b([A-Za-zÀ-ÿ]+)\s+(\d{1,2}),?\s+(\d{4})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, clean, flags=re.IGNORECASE)
        if not match:
            continue

        parts = match.groups()
        if parts[0].isdigit():
            day = int(parts[0])
            month = MONTHS.get(parts[1].lower()[:3]) or MONTHS.get(parts[1].lower())
            year = int(parts[2])
        else:
            month = MONTHS.get(parts[0].lower()[:3]) or MONTHS.get(parts[0].lower())
            day = int(parts[1])
            year = int(parts[2])

        if month:
            try:
                return date(year, month, day)
            except ValueError:
                return None

    return None


def parse_any_date(text: str):
    return parse_iso_date(text) or parse_numeric_date(text) or parse_text_date(text)
