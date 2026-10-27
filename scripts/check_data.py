"""Validate assets/prayer-times.json.

This is the only file on the site that changes on its own, rebuilt every night by
scripts/fetch_prayer_times.py from the masjid's printed monthly timetable (typed into
scripts/timetable/), with Masjidbox only for a day no typed month covers. It is the
thing most worth checking: wrong prayer times are worse than no website at all. Every
day taken from a sheet must match that sheet exactly, and the coming week must not
depend on Masjidbox, whose times have disagreed with the masjid's own sheet.

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
    iqamah = day.get("iqamah") or {}
    # A start time can be legitimately absent when the source published a
    # placeholder (the fetch script drops those), but then the iqamah must be
    # there, or the prayer has nothing to show at all.
    missing = [p for p in REQUIRED if p not in times and p not in iqamah]
    if missing:
        fail(f"{d}: missing {', '.join(missing)}")
    if "00:00" in times.values():
        fail(f"{d}: a start time of 00:00 is a placeholder, not a time")

    for name, value in list(times.items()) + list((day.get("iqamah") or {}).items()):
        if not valid_hhmm(value):
            fail(f"{d}: {name} is not a HH:MM time ({value!r})")

    # Prayers must run in order through the day. Jumu'ah is excluded because it
    # deliberately sits apart from Dhuhr on Fridays.
    ordered = [times[p] for p in ("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")
               if p in times and valid_hhmm(times[p])]
    if ordered != sorted(ordered):
        fail(f"{d}: prayer times are out of order - {ordered}")

    # The congregation cannot stand before the prayer's time has begun, and
    # Maghrib is prayed straight after sunset. A start time after its iqamah, or
    # a Maghrib iqamah long after Maghrib begins, is the mark of a start time an
    # hour out, which Masjidbox produced on the day the clocks went back in 2026.
    for p in ("fajr", "dhuhr", "asr", "maghrib", "isha"):
        s, q = times.get(p), iqamah.get(p)
        if valid_hhmm(s) and valid_hhmm(q) and s > q:
            fail(f"{d}: {p} begins at {s}, after its iqamah at {q} - a start time an hour out?")
    s, q = times.get("maghrib"), iqamah.get("maghrib")
    if valid_hhmm(s) and valid_hhmm(q):
        gap = (int(q[:2]) * 60 + int(q[3:])) - (int(s[:2]) * 60 + int(s[3:]))
        if gap > 20:
            fail(f"{d}: maghrib iqamah {q} is {gap} minutes after maghrib begins at {s} - a start time an hour out?")

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

# The times are the masjid's printed sheets. A day marked as from a sheet must equal
# what the sheet says; a day from Masjidbox in the coming week means next month's
# sheet has not been typed yet, and Masjidbox's times have disagreed with the sheet.
sys.path.insert(0, "scripts")
import fetch_prayer_times as sheets  # noqa: E402

typed = {}
week_end = (date.today() + timedelta(days=6)).isoformat()
for day in days:
    d = day.get("date", "")
    ym = d[:7]
    if day.get("from") == "sheet":
        if ym not in typed:
            try:
                typed[ym] = sheets.sheet_month(ym)
            except Exception as e:  # noqa: BLE001
                fail(f"scripts/timetable/{ym}.txt does not read: {e}")
                typed[ym] = {}
        want = typed[ym].get(d)
        if want is None:
            fail(f"{d}: marked as from the printed sheet, but scripts/timetable/{ym}.txt has no such day")
        elif any(want[k] != day.get(k) for k in ("hijri", "times", "iqamah")):
            fail(f"{d}: differs from the printed sheet in scripts/timetable/{ym}.txt - run python scripts/fetch_prayer_times.py")
    elif date.today().isoformat() <= d <= week_end:
        fail(f"{d}: no printed timetable typed for {ym} yet, so the site shows Masjidbox's times for this day. "
             f"Type the masjid's sheet into scripts/timetable/{ym}.txt (see its README), then run python scripts/fetch_prayer_times.py")

# The data must still be current. Allow a couple of days of slack so a weekend
# outage in the scheduled job does not fail the build before anyone can act.
today = date.today()
latest = max((d.get("date", "") for d in days), default="")
if latest and latest < (today - timedelta(days=1)).isoformat():
    fail(f"newest entry is {latest}, which is already in the past - the daily job may have stopped")

# The monthly timetable PDFs (assets/timetables.json): each month once, in order,
# with its file present and really a PDF. A broken entry would put a dead button
# on the prayer times page.
TIMETABLES = "assets/timetables.json"
months = []
try:
    listed = json.load(open(TIMETABLES, encoding="utf-8")).get("months") or []
except FileNotFoundError:
    listed = []
except Exception as e:  # noqa: BLE001
    fail(f"{TIMETABLES} does not parse: {e}")
    listed = []
for m in listed:
    month, file = m.get("month", ""), m.get("file", "")
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        fail(f"{TIMETABLES}: month {month!r} is not YYYY-MM")
        continue
    months.append(month)
    try:
        with open(file, "rb") as f:
            if f.read(5) != b"%PDF-":
                fail(f"{TIMETABLES}: {file} is not a PDF")
    except OSError:
        fail(f"{TIMETABLES}: {month} points to {file!r}, which does not exist")
if months != sorted(set(months)):
    fail(f"{TIMETABLES}: months must be listed once each, oldest first")

for p in problems:
    print("FAIL: " + p)

if problems:
    print(f"\n{len(problems)} problem(s) in {PATH}.")
    sys.exit(1)

print(f"{PATH}: {len(days)} days, {days[0]['date']} to {days[-1]['date']}, all consistent.")
if months:
    print(f"{TIMETABLES}: {len(months)} monthly PDF(s), {months[0]} to {months[-1]}, all present.")
