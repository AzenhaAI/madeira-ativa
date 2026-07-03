#!/usr/bin/env python3
"""Fetch Madeira sport news from RSS feeds and web pages, save to JSON."""

import json
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from html import unescape
from pathlib import Path

from deep_translator import GoogleTranslator

OUT = Path(__file__).resolve().parent.parent / "madeira" / "news_feed.json"

FEEDS = [
    # Trail / sport international
    {"url": "https://irunfar.com/feed", "source": "iRunFar", "lang": "EN", "cat": "trail", "filter_keywords": None},
    # JM Madeira sections
    {"url": "https://www.jm-madeira.pt/rss.jsp?sezione=996", "source": "JM Madeira", "lang": "PT", "cat": "geral", "filter_keywords": None},
    {"url": "https://www.jm-madeira.pt/rss.jsp?sezione=1003", "source": "JM Madeira", "lang": "PT", "cat": "desporto", "filter_keywords": None},
    {"url": "https://www.jm-madeira.pt/rss.jsp?sezione=1013", "source": "JM Madeira", "lang": "PT", "cat": "cultura", "filter_keywords": None},
    {"url": "https://www.jm-madeira.pt/rss.jsp?sezione=1004", "source": "JM Madeira", "lang": "PT", "cat": "educação", "filter_keywords": None},
    {"url": "https://www.jm-madeira.pt/rss.jsp?sezione=997", "source": "JM Madeira", "lang": "PT", "cat": "ocorrências", "filter_keywords": None},
]

HEADERS = {"User-Agent": "MadeiraNewsFetcher/1.0"}


def fetch_url(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


def strip_html(text):
    if not text:
        return ""
    text = unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:300]


def parse_rss(xml_bytes, source_info):
    items = []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        print(f"  XML parse error for {source_info['source']}")
        return items

    ns = {}
    for prefix in ["content", "dc", "media"]:
        for el in root.iter():
            for k, v in el.attrib.items() if hasattr(el, 'attrib') else []:
                pass
        # Try common namespace

    channel = root.find("channel")
    if channel is None:
        # Atom feed
        for entry in root.findall("{http://www.w3.org/2005/Atom}entry"):
            title = entry.findtext("{http://www.w3.org/2005/Atom}title", "")
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            link = link_el.get("href", "") if link_el is not None else ""
            pub = entry.findtext("{http://www.w3.org/2005/Atom}published", "") or entry.findtext("{http://www.w3.org/2005/Atom}updated", "")
            summary = entry.findtext("{http://www.w3.org/2005/Atom}summary", "")
            items.append({
                "title": strip_html(title),
                "link": link,
                "date": pub,
                "snippet": strip_html(summary),
                "source": source_info["source"],
                "lang": source_info["lang"],
                "cat": source_info["cat"],
            })
        return items

    for item in channel.findall("item"):
        title = item.findtext("title", "")
        link = item.findtext("link", "")
        pub_date = item.findtext("pubDate", "")
        desc = item.findtext("description", "")
        categories = [c.text for c in item.findall("category") if c.text]

        items.append({
            "title": strip_html(title),
            "link": link,
            "date": pub_date,
            "snippet": strip_html(desc),
            "source": source_info["source"],
            "lang": source_info["lang"],
            "cat": guess_cat(categories, title, source_info),
        })

    return items


def guess_cat(categories, title, source_info):
    feed_cat = source_info.get("cat", "")
    if feed_cat in ("trail", "cultura", "educação", "ocorrências"):
        return feed_cat
    text = " ".join(categories).lower() + " " + title.lower()
    if any(w in text for w in ["trail", "corrida", "running", "ultra", "miut", "maratona"]):
        return "trail"
    if any(w in text for w in ["futebol", "football", "marítimo", "liga", "sporting", "benfica"]):
        return "desporto"
    if any(w in text for w in ["desporto", "sport", "basquete", "natação", "ciclismo", "volta", "atletismo", "olímpic"]):
        return "desporto"
    if any(w in text for w in ["cultura", "festival", "museu", "exposição", "teatro", "música", "cinema", "arte"]):
        return "cultura"
    if any(w in text for w in ["evento", "cerimónia", "parlamento", "câmara"]):
        return "cultura"
    return "geral"


def parse_date(date_str):
    if not date_str:
        return ""
    for fmt in [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
    ]:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Try partial parse
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", date_str)
    if m:
        return m.group(0)
    return ""


def scrape_rtp_desporto():
    """Scrape RTP Madeira sport page for headlines."""
    items = []
    try:
        html = fetch_url("https://madeira.rtp.pt/noticias/?tema=desporto").decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  Failed to fetch RTP Madeira desporto: {e}")
        return items

    # Extract article titles and links from HTML
    pattern = r'<a[^>]+href="(https?://madeira\.rtp\.pt/[^"]+)"[^>]*>\s*<[^>]*class="[^"]*titulo[^"]*"[^>]*>([^<]+)'
    for match in re.finditer(pattern, html):
        link, title = match.groups()
        items.append({
            "title": strip_html(title),
            "link": link,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "snippet": "",
            "source": "RTP Madeira",
            "lang": "PT",
            "cat": "sport",
        })

    # Fallback: simpler pattern
    if not items:
        pattern2 = r'<h[23][^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>'
        for match in re.finditer(pattern2, html):
            link, title = match.groups()
            if "madeira.rtp.pt" in link or link.startswith("/"):
                items.append({
                    "title": strip_html(title),
                    "link": link if link.startswith("http") else "https://madeira.rtp.pt" + link,
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "snippet": "",
                    "source": "RTP Madeira",
                    "lang": "PT",
                    "cat": "sport",
                })

    return items[:10]


TARGET_LANGS = ["pt", "en", "de", "pl", "uk", "ru"]
SEP = "\n||||||\n"
MAX_ITEMS = 50  # cap the feed; refreshed once a day


def batch_translate(texts, src, tgt, chunk_size=10):
    """Translate a list of texts from src to tgt using Google Translate, batched."""
    if not texts or src == tgt:
        return texts
    result = []
    for start in range(0, len(texts), chunk_size):
        chunk = texts[start:start + chunk_size]
        chunk = [t[:500] if t else "" for t in chunk]
        joined = SEP.join(chunk)
        try:
            translated = GoogleTranslator(source=src, target=tgt).translate(joined)
            parts = translated.split("||||||")
            parts = [p.strip() for p in parts]
            if len(parts) == len(chunk):
                result.extend(parts)
                continue
        except Exception as e:
            print(f"    Chunk translate {src}->{tgt} failed: {e}")
        for t in chunk:
            try:
                result.append(GoogleTranslator(source=src, target=tgt).translate(t) if t else "")
            except Exception:
                result.append(t)
        time.sleep(0.2)
    return result


def translate_items(items):
    """Add translated titles and snippets for all target languages."""
    groups = {}
    for i, item in enumerate(items):
        lang = (item.get("lang") or "PT").lower()
        groups.setdefault(lang, []).append(i)

    for src_lang, indices in groups.items():
        titles = [items[i]["title"] for i in indices]
        snippets = [items[i].get("snippet", "") for i in indices]
        for tgt in TARGET_LANGS:
            if tgt == src_lang:
                continue
            print(f"  Translating {len(titles)} titles {src_lang}->{tgt}...")
            t_titles = batch_translate(titles, src_lang, tgt)
            t_snippets = batch_translate(snippets, src_lang, tgt)
            time.sleep(0.3)
            for j, idx in enumerate(indices):
                items[idx].setdefault("titles", {})[tgt] = t_titles[j]
                items[idx].setdefault("snippets", {})[tgt] = t_snippets[j] if j < len(t_snippets) else ""


def main():
    all_items = []

    # RSS feeds
    for feed in FEEDS:
        print(f"Fetching {feed['source']} ({feed['url']})...")
        try:
            data = fetch_url(feed["url"])
            items = parse_rss(data, feed)
            print(f"  Got {len(items)} items")

            # Apply keyword filter if set
            if feed.get("filter_keywords") and feed.get("filter_mode") != "any":
                keywords = feed["filter_keywords"]
                items = [i for i in items if any(
                    kw in i["title"].lower() or kw in i["snippet"].lower()
                    for kw in keywords
                )]
                print(f"  After filter: {len(items)} items")

            all_items.extend(items[:15])
        except Exception as e:
            print(f"  Error: {e}")

    # RTP Madeira scrape
    print("Scraping RTP Madeira desporto...")
    rtp_items = scrape_rtp_desporto()
    print(f"  Got {len(rtp_items)} items")
    all_items.extend(rtp_items)

    # Normalize dates
    for item in all_items:
        item["date"] = parse_date(item.get("date", ""))

    # Sort by date descending
    all_items.sort(key=lambda x: x.get("date", ""), reverse=True)

    # Deduplicate by title similarity
    seen_titles = set()
    unique = []
    for item in all_items:
        key = re.sub(r"\W+", "", item["title"].lower())[:40]
        if key not in seen_titles:
            seen_titles.add(key)
            unique.append(item)

    final = unique[:MAX_ITEMS]

    # Translate titles and snippets into all target languages.
    # Never let a translation hiccup block the daily refresh — save fresh
    # news regardless (untranslated items fall back to the original text).
    print("\nTranslating titles and snippets...")
    try:
        translate_items(final)
    except Exception as e:
        print(f"  Translation step failed, saving untranslated: {e}")

    result = {
        "fetched": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "count": len(final),
        "items": final,
    }

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved {len(final)} items to {OUT}")


if __name__ == "__main__":
    main()
