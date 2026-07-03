import json
import logging
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from parsers import ALL_PARSERS

OUTPUT_PATH = ROOT / "madeira" / "events.json"

CANONICAL_LINKS = [
    {
        "contains": "porto santo nature trail",
        "url": "https://www.portosantonaturetrail.com/",
    },
    {
        "contains": "cristo rei trail",
        "date": "2026-06-27",
        "url": "https://lap2go.com/pt/event/cristo-rei-trail-2026",
    },
    {
        "contains": "trail porto da cruz natura",
        "date": "2026-07-19",
        "url": "https://www.trail-natura.com/",
    },
    {
        "contains": "camacha trail",
        "url": "https://atletismodamadeira.pt/event/camacha-trail-3/",
    },
    {
        "contains": "circuito do canico",
        "date": "2026-06-07",
        "url": "https://atletismodamadeira.pt/event/circuito-do-canico-7/",
    },
    {
        "contains": "mius",
        "url": "https://www.miusmadeira.com/",
    },
    {
        "contains": "trail agua de pena",
        "url": "https://www.trailaguadepena.pt/",
    },
    {
        "contains": "trail água de pena",
        "url": "https://www.trailaguadepena.pt/",
    },
    {
        "contains": "adn race",
        "url": "https://adnrace.pt/",
    },
    {
        "contains": "ultra madeira",
        "url": "https://en.ultratrailmadeiraisland.com/",
    },
    {
        "contains": "maxi race",
        "url": "https://maxiracemadeira.com/",
    },
]

KIDS_KEYWORDS = [
    "kids", "kid", "children", "child", "family", "families",
    "sub14", "sub-14", "sub16", "sub-16", "sub18", "sub-18", "sub20", "sub-20",
    "jovem", "jovens", "junior", "júnior", "juniores", "benjamins",
    "infantis", "juvenis", "escolar", "fun' athletics",
]

PRO_KEYWORDS = [
    "campeonato", "campeonatos", "torneio", "trofeu", "troféu", "meeting",
    "absolutos", "estafetas", "regional", "regionais", "lancamentos",
    "lançamentos", "fasquias", "nadador completo", "tecnicas combinadas",
    "técnicas combinadas", "gp -", "grande premio", "grande prémio",
    "circuito",
]

SWIM_KEYWORDS = [
    "swim", "swimrun", "triathlon", "triatlo", "duatlo", "aquatlo",
    "travessia", "natacao", "natação", "aguas abertas", "águas abertas",
    "mius",
]

CYCLING_KEYWORDS = [
    "bike", "btt", "cycling", "ciclismo", "bicicleta", "granfondo",
    "enduro", "xco", "dhi", "dhu", "rampa", "cicloturismo", "avalanche",
]

MOTORSPORT_KEYWORDS = [
    "rally", "rali", "car", "classic car", "automovel", "automóvel",
    "motorsport", "eco rally",
]

ROAD_RUN_KEYWORDS = [
    "marathon", "maratona", "meia maratona", "mini maratona", "corrida",
    "circuito", "milha", "road", "volta a cidade",
]

STOP_WORDS = {
    "a", "o", "os", "as", "de", "do", "da", "dos", "das", "e",
    "the", "race", "trail", "trails", "corrida", "prova", "evento",
    "madeira", "island", "ilha", "km", "d", "edition", "edicao",
}


def contains_any(text, keywords):
    text = (text or "").lower()
    return any(keyword in text for keyword in keywords)


def is_kids_event(event):
    if event.get("event_type") in {"swimming_kids", "cycling_kids", "triathlon_kids"}:
        return True
    return contains_any(
        f"{event.get('name', '')} {event.get('location', '')} {event.get('event_type', '')}",
        KIDS_KEYWORDS,
    )


def is_pro_event(event):
    if event.get("event_type") in {"swimming_pro", "cycling_pro", "triathlon_pro"}:
        return True
    return contains_any(
        f"{event.get('name', '')} {event.get('location', '')} {event.get('event_type', '')}",
        PRO_KEYWORDS,
    )


def is_swim_event(event):
    return contains_any(
        f"{event.get('name', '')} {event.get('location', '')} {event.get('event_type', '')}",
        SWIM_KEYWORDS,
    )


def is_cycling_event(event):
    return event.get("event_type") in {"cycling", "cycling_pro", "cycling_kids", "motorsport"} or contains_any(
        f"{event.get('name', '')} {event.get('location', '')} {event.get('event_type', '')}",
        CYCLING_KEYWORDS + MOTORSPORT_KEYWORDS,
    )


def is_road_run_event(event):
    return contains_any(
        f"{event.get('name', '')} {event.get('location', '')} {event.get('event_type', '')}",
        ROAD_RUN_KEYWORDS,
    )


def should_show_event(event, mode="trail"):
    if event.get("event_type") == "festival":
        return False
    if event.get("event_type") == "orienteering":
        return mode == "trail"
    if mode == "kids":
        return is_kids_event(event)
    if mode == "pro":
        return is_pro_event(event) and not is_kids_event(event)
    if mode == "swim":
        return is_swim_event(event) and not is_kids_event(event) and not is_pro_event(event)
    if mode == "cycling":
        return is_cycling_event(event) and not is_kids_event(event) and not is_pro_event(event)
    if mode == "road":
        return is_road_run_event(event)
    return (
        not is_kids_event(event)
        and not is_pro_event(event)
        and not is_swim_event(event)
        and not is_cycling_event(event)
        and not is_road_run_event(event)
    )


def normalize_name(name):
    name = unicodedata.normalize("NFKD", name or "")
    name = "".join(ch for ch in name if not unicodedata.combining(ch))
    name = re.sub(r"\([^)]*\)", " ", name.lower())
    words = re.findall(r"[a-z0-9]+", name)
    return {word for word in words if word not in STOP_WORDS and not word.isdigit()}


def event_quality(event):
    name = event.get("name", "")
    score = 0
    if re.search(r"\d+\s*/\s*\d+|\d+\s*km", name, flags=re.IGNORECASE):
        score += 10
    if event.get("url") and "fpacompeticoes.pt" not in event.get("url", ""):
        score += 2
    if event.get("location") and event.get("location") not in {"-", "Madeira"}:
        score += 1
    return score


def is_distinct_festival_detail(event, existing):
    if event.get("event_type") != "festival" or existing.get("event_type") != "festival":
        return False

    name = event.get("name", "")
    existing_name = existing.get("name", "")
    if name == existing_name:
        return False

    detail_prefixes = (
        "Regional Arts Week:",
        "Festival Raízes do Atlântico:",
    )
    return name.startswith(detail_prefixes) or existing_name.startswith(detail_prefixes)


def distance_signature(name):
    distances = re.findall(r"\b\d+(?:[.,]\d+)?\s*(?:km|k)\b", name or "", flags=re.IGNORECASE)
    return tuple(distance.lower().replace(" ", "").replace(",", ".") for distance in distances)


def exact_signature(event):
    name = unicodedata.normalize("NFKD", event.get("name", "").lower())
    name = "".join(ch for ch in name if not unicodedata.combining(ch))
    name = re.sub(r"\s+", " ", name).strip()
    location = unicodedata.normalize("NFKD", event.get("location", "").lower())
    location = "".join(ch for ch in location if not unicodedata.combining(ch))
    location = re.sub(r"\s+", " ", location).replace(" ,", ",").strip()
    return (
        event.get("event_date"),
        event.get("event_type", ""),
        name,
        location,
        event.get("url", ""),
    )


def deduplicate_events(events):
    unique = []
    exact_seen = {}

    for event in events:
        exact_key = exact_signature(event)
        if exact_key in exact_seen:
            existing = exact_seen[exact_key]
            if event_quality(event) > event_quality(existing):
                unique.remove(existing)
                unique.append(event)
                exact_seen[exact_key] = event
            continue
        exact_seen[exact_key] = event

        event_date = event.get("event_date")
        tokens = normalize_name(event.get("name", ""))
        if not event_date or not tokens:
            unique.append(event)
            continue

        duplicate = False
        for existing in unique:
            if existing.get("event_date") != event_date:
                continue

            if is_distinct_festival_detail(event, existing):
                continue

            existing_tokens = normalize_name(existing.get("name", ""))
            if not existing_tokens:
                continue

            event_distance = distance_signature(event.get("name", ""))
            existing_distance = distance_signature(existing.get("name", ""))
            if event_distance and existing_distance and event_distance != existing_distance:
                continue

            shared = len(tokens & existing_tokens)
            smaller = min(len(tokens), len(existing_tokens))
            if smaller < 2:
                continue
            if smaller and shared / smaller >= 0.75:
                if event_quality(event) > event_quality(existing):
                    unique.remove(existing)
                    unique.append(event)
                duplicate = True
                break

        if not duplicate:
            unique.append(event)

    return unique


def normalize_date(value):
    if isinstance(value, date):
        return value.isoformat()
    if value:
        return str(value)
    return ""


def canonicalize_event(event):
    normalized_name = " ".join(normalize_name(event.get("name", "")))
    plain_name = unicodedata.normalize("NFKD", event.get("name", "").lower())
    plain_name = "".join(ch for ch in plain_name if not unicodedata.combining(ch))
    event_date = event.get("event_date")

    for rule in CANONICAL_LINKS:
        rule_name = unicodedata.normalize("NFKD", rule["contains"].lower())
        rule_name = "".join(ch for ch in rule_name if not unicodedata.combining(ch))
        if rule.get("date") and rule["date"] != event_date:
            continue
        if rule_name in plain_name or rule_name in normalized_name:
            event = {**event, "url": rule["url"]}
            break

    return event


def parse_events():
    parsed = []
    for source_name, parser_fn in ALL_PARSERS:
        try:
            events = parser_fn()
        except Exception:
            logging.exception("Failed to parse %s", source_name)
            continue

        logging.info("%s: %s events", source_name, len(events))
        for event in events:
            parsed.append({
                "source": source_name,
                "name": event.get("name", "").strip(),
                "event_date": normalize_date(event.get("event_date")),
                "location": event.get("location", "").strip(),
                "url": event.get("url", "").strip(),
                "event_type": event.get("event_type", "").strip(),
            })

    today = date.today().isoformat()
    upcoming = [
        event for event in parsed
        if event["name"] and event["event_date"] and event["event_date"] >= today
    ]
    return deduplicate_events(upcoming)


def export_events(events):
    output = []
    for event in events:
        event = canonicalize_event(event)
        public_event = {
            "name": event["name"],
            "date": event["event_date"],
            "location": event["location"],
            "url": event["url"],
            "event_type": event.get("event_type", ""),
        }

        if event.get("event_type") == "festival":
            output.append({"mode": "festivals", **public_event})
            continue

        for mode in ("trail", "road", "cycling", "swim", "kids", "pro"):
            if should_show_event(event, mode):
                output.append({"mode": mode, **public_event})

    output.sort(key=lambda item: (item["date"], item["mode"], item["name"]))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "generated_at": date.today().isoformat(),
                "events": output,
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    logging.info("Exported %s mode-events to %s", len(output), OUTPUT_PATH)


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    export_events(parse_events())


if __name__ == "__main__":
    main()
