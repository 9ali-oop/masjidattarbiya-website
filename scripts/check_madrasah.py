"""Check assets/madrasah.json, and list everything on it that is still a placeholder.

The madrasah page went up with placeholder times and term dates, agreed so the
page could be designed and reviewed before the madrasah confirmed its details.
The page labels each one "To be confirmed". This check keeps that honest:

  - it fails if the file is malformed, a date does not parse, a term ends before
    it starts, a group has no sessions, a timetable row names a group that does
    not exist, or the file
    claims to be final ("provisional": false) while placeholders remain;
  - it fails if contact details are typed into the copy (the site has one phone
    number and one email, in the footer);
  - it does NOT fail just because placeholders exist. It lists them instead, as
    GitHub Actions warnings, so they stay visible until someone confirms them.

    python scripts/check_madrasah.py
"""

import json
import re
import sys
from datetime import date

PATH = "assets/madrasah.json"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
BANNED = [
    (re.compile(r"\b0\d{4}\s?\d{3}\s?\d{3,4}\b|\+44\s?\d[\d\s]{8,}"), "a phone number"),
    (re.compile(r"[\w.+-]+@[\w.-]+\.\w+"), "an email address"),
    (re.compile(r"\b(sort\s*code|account\s*number)\b", re.I), "bank details"),
]

problems, placeholders = [], []


def text_values(node, where):
    if isinstance(node, dict):
        for k, v in node.items():
            if k != "note":
                yield from text_values(v, f"{where}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from text_values(v, f"{where}[{i}]")
    elif isinstance(node, str):
        yield where, node


try:
    data = json.load(open(PATH, encoding="utf-8"))
except (OSError, ValueError) as e:
    print(f"FAIL: {PATH} cannot be read - {e}")
    sys.exit(1)

groups = data.get("groups") or []
ids = [g.get("id") for g in groups]
for g in groups:
    for field in ("id", "name", "who"):
        if not g.get(field):
            problems.append(f"group {g.get('id') or '?'}: missing '{field}'")
    if not g.get("sessions"):
        problems.append(f"group {g.get('id') or '?'}: no sessions")
    if g.get("who_placeholder"):
        placeholders.append(f"group '{g.get('name')}': who it is for")
    if g.get("placeholder"):
        placeholders.append(f"group '{g.get('name')}': description")
if not data.get("curriculum"):
    problems.append("missing 'curriculum': what the children learn")

rows = data.get("timetable") or []
for r in rows:
    day = r.get("day")
    if day not in DAYS:
        problems.append(f"timetable: {day!r} is not a day of the week")
    unknown = [k for k in r if k not in ("day", "closed", "placeholder") and k not in ids]
    if unknown:
        problems.append(f"timetable {day}: unknown group(s) {unknown}")
    if r.get("placeholder"):
        placeholders.append(f"timetable: {day}")
if rows and [r.get("day") for r in rows] != [d for d in DAYS if d in [r.get("day") for r in rows]]:
    problems.append("timetable: days are not in Monday-to-Sunday order")

terms = data.get("terms") or {}
for t in terms.get("list") or []:
    try:
        start, end = date.fromisoformat(t["start"]), date.fromisoformat(t["end"])
        if end < start:
            problems.append(f"term {t.get('name')}: ends before it starts")
    except (KeyError, ValueError):
        problems.append(f"term {t.get('name')}: start and end must be YYYY-MM-DD dates")
if terms.get("placeholder"):
    placeholders.append(f"term dates {terms.get('year', '')}".strip())

for key in ("places", "fees"):
    if (data.get(key) or {}).get("placeholder"):
        placeholders.append(key)
for r in data.get("resources") or []:
    if r.get("placeholder"):
        placeholders.append(f"resource '{r.get('title')}'")
    if r.get("url") and not str(r["url"]).startswith(("https://", "assets/")):
        problems.append(f"resource '{r.get('title')}': url must start https:// or assets/")

for where, value in text_values(data, "madrasah"):
    for pattern, what in BANNED:
        if pattern.search(value):
            problems.append(f"{where}: contains {what} - link to the contact page instead")

if data.get("provisional") is False and placeholders:
    problems.append('"provisional" is false but placeholders remain - the page would drop its draft notice')

for p in problems:
    print("FAIL: " + p)
for p in placeholders:
    print(f"::warning file={PATH}::Placeholder still to confirm: {p}")
if not problems:
    left = f", {len(placeholders)} placeholder(s) still to confirm" if placeholders else ", nothing left to confirm"
    print(f"{PATH}: well formed{left}.")
sys.exit(1 if problems else 0)
