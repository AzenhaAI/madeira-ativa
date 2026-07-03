import json
import os
import sys
from datetime import date
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
EVENTS_PATH = ROOT / "madeira" / "events.json"

MODE_EMOJI = {
    "trail": "🏔️",
    "road": "🏃",
    "swim": "🏊",
    "kids": "👦",
    "pro": "🏅",
    "festivals": "🎉",
}


def add_months(day, months):
    month = day.month - 1 + months
    year = day.year + month // 12
    month = month % 12 + 1
    month_lengths = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                     31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return day.replace(year=year, month=month, day=min(day.day, month_lengths[month - 1]))


def load_events(mode, months):
    today = date.today()
    end = add_months(today, months)

    data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
    events = []
    for event in data.get("events", []):
        if event.get("mode") != mode:
            continue
        event_date = date.fromisoformat(event["date"])
        if today <= event_date <= end:
            events.append(event)

    events.sort(key=lambda item: (item["date"], item["name"]))
    return today, end, events


def format_message(mode="trail", months=2):
    titles = {
        "trail": "🏔️ Madeira Ative Trail & Ultra events",
        "road": "🏃 Madeira Ative Road Run",
        "swim": "🏊 Madeira Ative Swimming & Triathlon",
        "kids": "👦 Madeira Ative Kids",
        "pro": "🏅 Madeira Ative Pro Races",
        "festivals": "🎉 Madeira Ative Festivais",
    }
    today, end, events = load_events(mode, months)

    lines = [
        f"*{titles.get(mode, 'Madeira Ative')}*",
        f"_{len(events)} events • {today.strftime('%d %b')} → {end.strftime('%d %b %Y')}_",
        "",
    ]

    if not events:
        lines.append("No upcoming events found.")
        return "\n".join(lines)

    for event in events[:20]:
        emoji = MODE_EMOJI.get(event.get("mode", ""), "📌")
        line = f"{emoji} *{event['date']}* — {event['name']}"
        if event.get("location"):
            line += f"\n📍 {event['location']}"
        if event.get("url"):
            line += f"\n🔗 {event['url']}"
        lines.append(line)
        lines.append("")

    if len(events) > 20:
        lines.append(f"_...and {len(events) - 20} more_")

    lines.append("📅 Full calendar: https://shpara.com/madeira/")
    return "\n".join(lines)


def send_whatsapp(text):
    token = os.environ["WHATSAPP_TOKEN"].strip()
    phone_id = os.environ["WHATSAPP_PHONE_NUMBER_ID"].strip()
    recipient = os.environ["WHATSAPP_RECIPIENT"].strip()

    url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
    payload = json.dumps({
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {"body": text},
    })
    request = Request(
        url,
        data=payload.encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read())
            print(f"Message sent: {result}")
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"WhatsApp send failed: HTTP {exc.code} {error_body}") from exc


def main():
    mode = os.getenv("MADEIRA_DIGEST_MODE", "trail")
    months = int(os.getenv("MADEIRA_DIGEST_MONTHS", "2"))
    message = format_message(mode=mode, months=months)

    if "--dry-run" in sys.argv:
        print(message)
        return

    send_whatsapp(message)


if __name__ == "__main__":
    main()
