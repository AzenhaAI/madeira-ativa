import re
from datetime import date
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from .madeiraskyrunning import HEADERS


MADEIRA_LOCATIONS = [
    "madeira", "funchal", "porto santo", "santa cruz", "ponta do sol",
    "quinta calaca", "quinta calaça", "baia", "baía", "lido",
    "galomar", "santana", "camara de lobos", "câmara de lobos",
]

PUBLIC_MARKERS = [
    "populares", "nao federados", "não federados",
    "sem licenca", "sem licença", "5 braçadas", "5 bracadas",
]

PRO_MARKERS = [
    "campeonato", "torneio", "torregri", "prova regional",
    "natação pura", "natacao pura", "águas abertas - prova regional",
    "aguas abertas - prova regional", "técnicas combinadas",
    "tecnicas combinadas", "nadador completo",
]

KIDS_MARKERS = [
    "infantis", "juvenis", "torregri", "escolas", "cadetes",
]

NON_PRO_MARKERS = [
    "festival madeira a nadar", "festivais de natação", "festivais de natacao",
]

DETAIL_URL_RE = re.compile(
    r"/icalrepeat\.detail/(\d{4})/(\d{2})/(\d{2})/\d+/"
)

ANM_LISTA_PDF_URL = (
    "https://www.anatacaodamadeira.pt/index.php/associacao/associados/"
    "documentacao-geral/send/4-calendario-desportivo/158-calendario-desportivo-25-26-lista"
)

ANM_PDF_EVENTS = [
    {
        "name": "III TORREGRI (P25m)",
        "event_date": date(2026, 6, 13),
        "location": "Funchal",
        "event_type": "swimming_kids",
    },
    {
        "name": "VII Festival Madeira e Nadar - CDR Santanense",
        "event_date": date(2026, 6, 20),
        "location": "Santana",
        "event_type": "swimming_kids",
    },
    {
        "name": "IX Prova de Mar do Galomar",
        "event_date": date(2026, 6, 21),
        "location": "Santa Cruz",
        "event_type": "swimming",
    },
    {
        "name": "Meeting de Natação da Madeira (P50m) / Campeonato Regional P50m - INF., JUV., JUN. e SEN.",
        "event_date": date(2026, 6, 26),
        "location": "Funchal",
        "event_type": "swimming_pro",
    },
    {
        "name": 'Campeonato "Pedro Fino" (P25m)',
        "event_date": date(2026, 7, 3),
        "location": "Funchal",
        "event_type": "swimming_pro",
    },
    {
        "name": "VIII Festival Madeira e Nadar - AD Galomar",
        "event_date": date(2026, 7, 4),
        "location": "Santa Cruz",
        "event_type": "swimming_kids",
    },
    {
        "name": "Campeonato do Jovem Nadador Completo (P25m)",
        "event_date": date(2026, 7, 18),
        "location": "Machico",
        "event_type": "swimming_kids",
    },
    {
        "name": "XII Prova de Mar de São Martinho",
        "event_date": date(2026, 7, 19),
        "location": "Funchal",
        "event_type": "swimming",
    },
    {
        "name": "Campeonato dos Recordistas (P25m)",
        "event_date": date(2026, 7, 28),
        "location": "Funchal",
        "event_type": "swimming_pro",
    },
    {
        "name": 'XXXI Prova de Mar José da Silva "SACA"',
        "event_date": date(2026, 8, 23),
        "location": "Funchal",
        "event_type": "swimming",
    },
    {
        "name": "Frente MarFunchal SWIM - 12 Horas a Nadar / Prova de Mar Frente MarFunchal SWIM (AA)",
        "event_date": date(2026, 9, 12),
        "location": "Funchal",
        "event_type": "swimming",
    },
]


def _parse_date_from_url(url: str):
    match = DETAIL_URL_RE.search(url)
    if not match:
        return None

    try:
        from datetime import date
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return None


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _normalize_text(value: str) -> str:
    import unicodedata

    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return value.lower()


def _extract_location(text: str) -> str:
    match = re.search(r"\bLocal:\s*([^\n]+)", text, flags=re.IGNORECASE)
    if not match:
        return "Madeira"
    return _clean_text(match.group(1))


def _extract_distances(text: str) -> str:
    distances = []
    for label in ("Evento Promocional", "Evento Principal"):
        match = re.search(
            rf"{label}:\s*(\d+(?:[.,]\d+)?)\s*(?:metros|m)?\b",
            text,
            flags=re.IGNORECASE,
        )
        if match:
            distances.append(f"{match.group(1).replace(',', '.')} m")

    unique = []
    for distance in distances:
        if distance not in unique:
            unique.append(distance)

    return "/".join(unique)


def _has_public_entry(text: str) -> bool:
    normalized = _normalize_text(text)
    return any(marker in normalized for marker in PUBLIC_MARKERS)


def _is_pro_swim_event(text: str) -> bool:
    normalized = _normalize_text(text)
    if any(marker in normalized for marker in NON_PRO_MARKERS):
        return False
    return any(marker in normalized for marker in PRO_MARKERS)


def _is_kids_swim_event(text: str) -> bool:
    normalized = _normalize_text(text)
    return any(marker in normalized for marker in KIDS_MARKERS)


def _event_from_detail(url: str, name: str, event_date):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException:
        return None

    soup = BeautifulSoup(resp.text, "lxml")
    text = "\n".join(
        line.strip()
        for line in soup.get_text("\n", strip=True).splitlines()
        if line.strip()
    )

    is_public = _has_public_entry(text)
    is_pro = _is_pro_swim_event(text)
    if not is_public and not is_pro:
        return None

    location = _extract_location(text)
    distances = _extract_distances(text)
    if distances and distances not in name:
        name = f"{name} ({distances})"

    event_type = "swimming" if is_public else "swimming_pro"
    if _is_kids_swim_event(text):
        event_type = "swimming_kids"

    return {
        "name": name,
        "event_date": event_date,
        "location": location,
        "url": url,
        "event_type": event_type,
    }


def parse_swimming_madeira() -> list[dict]:
    url = "https://www.anatacaodamadeira.pt/index.php/competicoes/calendario/list.events/-"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException:
        return []

    soup = BeautifulSoup(resp.text, "lxml")

    events = []
    seen = set()
    for link in soup.find_all("a", href=True):
        detail_url = urljoin(url, link["href"])
        event_date = _parse_date_from_url(detail_url)
        if not event_date or detail_url in seen:
            continue
        seen.add(detail_url)

        name = _clean_text(link.get_text(" ", strip=True))
        if not name:
            continue

        event = _event_from_detail(detail_url, name, event_date)
        if not event:
            continue

        haystack = _normalize_text(f"{event['name']} {event['location']}")
        if any(place in haystack for place in MADEIRA_LOCATIONS):
            events.append(event)

    pdf_events = [
        {
            **event,
            "url": ANM_LISTA_PDF_URL,
        }
        for event in ANM_PDF_EVENTS
    ]

    return pdf_events + events
