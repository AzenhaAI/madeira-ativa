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
        "trail": "Madeira Ative Trail & Ultra events",
        "road": "Madeira Ative Road run",
        "cycling": "Madeira Ative Bike & Moto",
        "swim": "Madeira Ative Swimming & Triathlon",
        "kids": "Madeira Ative Kids",
        "pro": "Madeira Ative Pro Races",
        "festivals": "Madeira Ative Festivais",
    }
    today, end, events = load_events(mode, months)

    lines = [
        f"{titles.get(mode, 'Madeira Ative')} for the next {months} months",
        f"{len(events)} events from {today.isoformat()} to {end.isoformat()}",
        "",
    ]

    if not events:
        lines.append("No events found.")
        return "\n".join(lines)

    for event in events[:25]:
        line = f"{event['date']} - {event['name']}"
        if event.get("location"):
            line += f" | {event['location']}"
        if event.get("url"):
            line += f"\n{event['url']}"
        lines.append(line)

    if len(events) > 25:
        lines.append(f"...and {len(events) - 25} more.")

    lines.append("")
    lines.append("Full calendar: https://shpara.com/madeira/")
    return "\n".join(lines)


def send_telegram(text):
    token = os.environ["TELEGRAM_BOT_TOKEN"].strip()
    chat_id = os.environ["TELEGRAM_CHAT_ID"].strip()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body = f"chat_id={quote(chat_id)}&text={quote(text)}&disable_web_page_preview=true".encode()
    request = Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            response.read()
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Telegram sendMessage failed: HTTP {exc.code} {error_body}") from exc


def main():
    mode = os.getenv("MADEIRA_DIGEST_MODE", "trail")
    months = int(os.getenv("MADEIRA_DIGEST_MONTHS", "2"))
    message = format_message(mode=mode, months=months)

    if "--dry-run" in sys.argv:
        print(message)
        return

    send_telegram(message)


if __name__ == "__main__":
    main()
