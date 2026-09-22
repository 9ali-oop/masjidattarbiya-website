"""Validate assets/events.json and assets/youtube.json before they reach the site.

The events file is the one part of this site where a person types free text that
gets published, so it is the one most likely to carry a mistake. These checks are
deliberately blunt:

  - every event must say how we know it happened (the 'evidence' field), because
    the rule for this site is that nothing unverifiable gets published;
  - dates must parse, agree with their stated precision, and run forwards;
  - contact details must not be copied in. Social media captions for this masjid
    contain the charity's sort code and account number and a volunteer's mobile
    number. On Instagram that is the masjid's own choice. Mirrored onto a public
    website next to a donate page it becomes a fraud risk, so it is blocked here.

    python scripts/check_events.py
"""

import json
import re
import sys
from datetime import date

EVENTS = "assets/events.json"
VIDEOS = "assets/youtube.json"

REQUIRED = ("id", "title", "kind", "start", "summary", "evidence")
TEXT_FIELDS = ("title", "summary", "time", "with", "kind")

# Things that must never appear in published event copy.
BANNED = [
    (re.compile(r"\b(sort\s*code|account\s*number|iban|swift)\b", re.I),
     "bank details do not belong on this page - link to the donate page instead"),
    (re.compile(r"\b0\d{4}\s?\d{3}\s?\d{3,4}\b"),
     "a phone number - the site has one contact number, in the footer"),
    (re.compile(r"\+44\s?\d[\d\s]{8,}"),
     "an international phone number"),
    (re.compile(r"[\w.+-]+@[\w.-]+\.\w+"),
     "an email address - the site has one, in the footer"),
]

problems = []


def parse_start(value, precision):
    """Return a date, or None if the value does not match its stated precision."""
    bits = str(value).split("-")
    try:
        if precision == "month":
            if len(bits) != 2:
                return None
            return date(int(bits[0]), int(bits[1]), 1)
        if len(bits) != 3:
            return None
        return date(int(bits[0]), int(bits[1]), int(bits[2]))
    except ValueError:
        return None


def check_events():
    try:
        data = json.load(open(EVENTS, encoding="utf-8"))
    except (OSError, ValueError) as e:
        problems.append(f"{EVENTS}: cannot be read - {e}")
        return

    events = data.get("events")
    if not isinstance(events, list):
        problems.append(f"{EVENTS}: no 'events' list")
        return

    seen = set()
    for i, ev in enumerate(events):
        where = f"{EVENTS}[{i}] {ev.get('id') or ev.get('title') or '?'}"

        for field in REQUIRED:
            if not ev.get(field):
                problems.append(f"{where}: missing '{field}'")
        if not ev.get("id"):
            continue

        if ev["id"] in seen:
            problems.append(f"{where}: duplicate id")
        seen.add(ev["id"])

        precision = ev.get("precision", "day")
        if precision not in ("day", "month"):
            problems.append(f"{where}: precision must be 'day' or 'month'")
            continue

        start = parse_start(ev.get("start"), precision)
        if start is None:
            problems.append(f"{where}: start {ev.get('start')!r} does not match precision {precision!r}")
            continue

        if ev.get("end"):
            end = parse_start(ev["end"], precision)
            if end is None:
                problems.append(f"{where}: end {ev['end']!r} does not match precision {precision!r}")
            elif end < start:
                problems.append(f"{where}: ends before it starts")

        # A typo in the year is the easy mistake, and it silently pins the event
        # to the top of the page forever under "Coming up".
        if start.year > date.today().year + 2:
            problems.append(f"{where}: starts in {start.year}, which looks like a typo")
        if start.year < 2000:
            problems.append(f"{where}: starts in {start.year}, which looks like a typo")

        for field in TEXT_FIELDS:
            value = ev.get(field)
            if not isinstance(value, str):
                continue
            for pattern, why in BANNED:
                if pattern.search(value):
                    problems.append(f"{where}: '{field}' contains {why}")


def check_videos():
    try:
        data = json.load(open(VIDEOS, encoding="utf-8"))
    except OSError:
        return  # not fetched yet; the page degrades to a link
    except ValueError as e:
        problems.append(f"{VIDEOS}: cannot be read - {e}")
        return

    videos = data.get("videos") or []
    if not videos:
        problems.append(f"{VIDEOS}: no videos - the nightly job should never write an empty list")
        return

    for v in videos:
        if not (v.get("id") and v.get("title") and v.get("published") and v.get("url")):
            problems.append(f"{VIDEOS}: incomplete entry {v.get('id') or v}")
        # Thumbnails must be local files. Hotlinking would make this the only page
        # on the site that contacts a third party, which the privacy notice denies.
        thumb = v.get("thumb")
        if thumb and not str(thumb).startswith("assets/"):
            problems.append(f"{VIDEOS}: {v.get('id')} thumbnail is not served from this site: {thumb}")
        if "description" in v:
            problems.append(f"{VIDEOS}: {v.get('id')} carries a description - "
                            "these contain the charity's bank details and must not be published")


check_events()
check_videos()

for p in problems:
    print("FAIL: " + p)
print("Events and recordings are valid." if not problems else f"\n{len(problems)} problem(s).")
sys.exit(1 if problems else 0)
