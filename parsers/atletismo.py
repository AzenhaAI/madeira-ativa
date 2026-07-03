import requests
from icalendar import Calendar
from datetime import date


def parse_atletismo() -> list[dict]:
    url = "https://atletismodamadeira.pt/events/?ical=1"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    cal = Calendar.from_ical(resp.content)
    events = []

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        dt = component.get("dtstart")
        if dt is None:
            continue
        event_date = dt.dt if isinstance(dt.dt, date) else dt.dt.date()

        name = str(component.get("summary", ""))
        location = str(component.get("location", ""))
        event_url = str(component.get("url", ""))
        description = str(component.get("description", ""))

        events.append({
            "name": name,
            "event_date": event_date,
            "location": location,
            "url": event_url,
            "event_type": "running",
        })

    return events
