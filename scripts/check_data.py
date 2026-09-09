"""Validate assets/prayer-times.json.

This is the only file on the site that changes on its own, written by a scheduled
job that scrapes a third party. It is therefore the most likely thing to break
quietly, and the thing most worth checking: wrong prayer times are worse than no
website at all.

Run by CI on every push, and worth running after any manual refresh.
"""

import json
import sys
from datetime import date, datetime, timedelta

PATH = "assets/prayer-times.json"
REQUIRED = ("fajr", "dhuhr", "asr", "maghrib", "isha")
MIN_DAYS = 3

problems = []


def fail(msg):
    problems.append(msg)


def valid_hhmm(value):
    try:
        datetime.strptime(value, "%H:%M")
        return True
    except (ValueError, TypeError):
        return False


try:
    with open(PATH, encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"FAIL: {PATH} is missing")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"FAIL: {PATH} is not valid JSON - {e}")
    sys.exit(1)

days = data.get("days") or []

if len(days) < MIN_DAYS:
    fail(f"only {len(days)} day(s) of prayer times; expected at least {MIN_DAYS}")

seen = set()
for day in days:
    d = day.get("date", "?")
    if d in seen:
        fail(f"{d}: duplicated")
    seen.add(d)

    times = day.get("times") or {}
    missing = [p for p in REQUIRED if p not in times]
    if missing:
        fail(f"{d}: missing {', '.join(missing)}")

    for name, value in list(times.items()) + list((day.get("iqamah") or {}).items()):
        if not valid_hhmm(value):
            fail(f"{d}: {name} is not a HH:MM time ({value!r})")

    # Prayers must run in order through the day. Jumu'ah is excluded because it
    # deliberately sits apart from Dhuhr on Fridays.
    ordered = [times[p] for p in ("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")
               if p in times and valid_hhmm(times[p])]
    if ordered != sorted(ordered):
        fail(f"{d}: prayer times are out of order - {ordered}")

    # A Friday should carry a Jumu'ah time, and it should not equal Dhuhr.
    try:
        is_friday = date.fromisoformat(d).weekday() == 4
    except ValueError:
        fail(f"{d}: not a valid ISO date")
        continue
    if is_friday:
        if "jumuah" not in times:
            fail(f"{d} is a Friday but has no jumuah time")
        elif times.get("jumuah") == times.get("dhuhr"):
            fail(f"{d}: jumuah equals dhuhr, which usually means it was read from the wrong field")

# The data must still be current. Allow a couple of days of slack so a weekend
# outage in the scheduled job does not fail the build before anyone can act.
today = date.today()
latest = max((d.get("date", "") for d in days), default="")
if latest and latest < (today - timedelta(days=1)).isoformat():
    fail(f"newest entry is {latest}, which is already in the past - the daily job may have stopped")

for p in problems:
    print("FAIL: " + p)

if problems:
    print(f"\n{len(problems)} problem(s) in {PATH}.")
    sys.exit(1)

print(f"{PATH}: {len(days)} days, {days[0]['date']} to {days[-1]['date']}, all consistent.")
