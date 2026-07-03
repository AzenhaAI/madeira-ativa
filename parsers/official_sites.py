import requests
from bs4 import BeautifulSoup

from .date_utils import parse_any_date
from .madeiraskyrunning import HEADERS


SITES = [
    {
        "url": "https://www.miutmadeira.com/",
        "name": "MIUT - Madeira Island Ultra Trail",
        "location": "Madeira",
        "event_type": "trail",
        "skip": True,
    },
    {
        "url": "https://adnrace.pt/",
        "name": "ADN Race Ponta do Sol",
        "location": "Ponta do Sol, Madeira",
        "event_type": "trail",
    },
    {
        "url": "https://trailportomoniz.com/",
        "name": "Trail do Porto Moniz",
        "location": "Porto Moniz, Madeira",
        "event_type": "trail",
    },
    {
        "url": "https://www.trail-natura.com/",
        "name": "Trail Porto da Cruz Natura",
        "location": "Porto da Cruz, Madeira",
        "event_type": "trail",
        "skip": True,
    },
    {
        "url": "https://www.trailaguadepena.pt/",
        "name": "Trail Agua de Pena",
        "location": "Machico, Madeira",
        "event_type": "trail",
        "skip": True,
    },
    {
        "url": "https://en.ultratrailmadeiraisland.com/",
        "name": "Ultra Madeira",
        "location": "Madeira",
        "event_type": "trail",
    },
    {
        "url": "https://ultra-x.co/pt/madeira/",
        "name": "Ultra X Madeira",
        "location": "Madeira",
        "event_type": "trail",
        "skip": True,
    },
    {
        "url": "https://trail.ludensmachico.pt/",
        "name": "Trail do Ludens Clube Machico",
        "location": "Machico, Madeira",
        "event_type": "trail",
    },
    {
        "url": "https://www.voltacidade.com/",
        "name": "Volta a Cidade do Funchal",
        "location": "Funchal, Madeira",
        "event_type": "running",
    },
    {
        "url": "https://trailboaventura.com/",
        "name": "Trail Boa Ventura",
        "location": "Boa Ventura, Madeira",
        "event_type": "trail",
        "skip": True,
    },
    {
        "url": "https://www.miusmadeira.com/",
        "name": "MIUS - Madeira Island Ultra Swim",
        "location": "Porto Santo, Madeira",
        "event_type": "swimming",
        "skip": True,
    },
    {
        "url": "https://maxiracemadeira.com/",
        "name": "MaXi Race Madeira",
        "location": "Sao Vicente, Madeira",
        "event_type": "trail",
        "skip": True,
    },
    {
        "url": "https://www.madeiramarathon.com/",
        "name": "Madeira Marathon",
        "location": "Funchal, Madeira",
        "event_type": "running",
    },
    {
        "url": "https://www.portosantonaturetrail.com/",
        "name": "Porto Santo Nature Trail",
        "location": "Porto Santo, Madeira",
        "event_type": "trail",
        "skip": True,
    },
]


def _fetch_text(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    return soup.get_text("\n", strip=True)


def parse_official_sites() -> list[dict]:
    events = []

    for site in SITES:
        if site.get("skip"):
            continue

        try:
            text = _fetch_text(site["url"])
        except requests.RequestException:
            continue

        event_date = parse_any_date(text)
        if not event_date:
            continue

        events.append({
            "name": site["name"],
            "event_date": event_date,
            "location": site["location"],
            "url": site["url"],
            "event_type": site["event_type"],
        })

    return events


def parse_ecotrail_madeira() -> list[dict]:
    url = "https://madeira.ecotrail.com/"
    try:
        text = _fetch_text(url)
    except requests.RequestException:
        return []

    events = []
    for name, marker in [
        ("EcoTrail Madeira 60 km", "Trail 60 km"),
        ("EcoTrail Madeira 45 km", "Trail 45 km"),
        ("EcoTrail Madeira 30 km", "Trail 30 km"),
        ("EcoTrail Madeira 15 km", "Trail 15 km"),
    ]:
        pos = text.find(marker)
        if pos == -1:
            continue
        event_date = parse_any_date(text[pos:pos + 250])
        if event_date:
            events.append({
                "name": name,
                "event_date": event_date,
                "location": "Funchal, Madeira",
                "url": url,
                "event_type": "trail",
            })

    return events


def parse_funchal_sky_race() -> list[dict]:
    url = "https://skyrunning.camadeira.com/"
    try:
        text = _fetch_text(url)
    except requests.RequestException:
        return []

    if "Funchal Sky Race" not in text or "2026" not in text:
        return []

    event_date = parse_any_date(text)
    if not event_date:
        return []

    return [
        {
            "name": "FX Sky Race 21 km / 1400D+",
            "event_date": event_date,
            "location": "Chão da Lagoa, Funchal",
            "url": url,
            "event_type": "trail",
        },
        {
            "name": "FX Sky Race 10 km / 800D+",
            "event_date": event_date,
            "location": "Chão da Lagoa, Funchal",
            "url": url,
            "event_type": "trail",
        },
    ]


def parse_ultra_x_madeira() -> list[dict]:
    url = "https://ultra-x.co/pt/madeira/"
    try:
        text = _fetch_text(url)
    except requests.RequestException:
        return []

    event_date = parse_any_date(text)
    if not event_date:
        return []

    return [
        {
            "name": f"Ultra X Madeira {distance}",
            "event_date": event_date,
            "location": "Madeira",
            "url": url,
            "event_type": "trail",
        }
        for distance in ("25 km", "50 km", "60 km", "110 km")
    ]
