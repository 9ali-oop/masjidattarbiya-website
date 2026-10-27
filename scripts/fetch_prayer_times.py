"""Write assets/prayer-times.json from the masjid's printed timetable, with Masjidbox for gaps.

The times on the site are the masjid's own printed monthly timetable, the sheet given out
at Revesby Walk (Ali, 27 October 2026: "these are the proper times", after the site had shown
Masjidbox's Asr jama'at of 2:30 for the sheet's 2:45). Each month is typed into
scripts/timetable/YYYY-MM.txt, checked against the sun by timetable.py, and read here.

Masjidbox, the masjid's online timetable, disagreed with the sheet on jama'at times, Jumu'ah
and the start of Isha, so it is used only for a day no typed sheet covers yet, marked
"from": "masjidbox". check_data.py fails while any day of the coming week comes from it,
which is the cue to type the next month's sheet.

Masjidbox renders its timetable client-side, but the data is embedded in the page as
URL-encoded JSON; we pull the `timetable` array out of that. If the page changes, those days
are simply left out and the site says it has no times for them.

Run daily from GitHub Actions, so the week on the site moves on by itself.
"""

import json, pathlib, re, sys, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

SHEETS = pathlib.Path(__file__).resolve().parent / "timetable"
sys.path.insert(0, str(SHEETS))
import timetable  # noqa: E402  (reads and converts the typed sheets)

SOURCE = "https://masjidbox.com/prayer-times/masjid-attarbiya"
OUT = "assets/prayer-times.json"
PRAYERS = ("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "masjidattarbiya.org prayer-times updater"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def decode_u_escapes(text):
    """Masjidbox encodes non-ASCII as JavaScript-style %uXXXX, which unquote leaves alone."""
    return re.sub(r"%u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), text)


def extract_timetable(html):
    """Pull the `"timetable":[...]` array out of the page's embedded state."""
    text = decode_u_escapes(urllib.parse.unquote(html))
    i = text.find('"timetable":[')
    if i == -1:
        raise ValueError('no "timetable" key in page - Masjidbox markup has changed')
    start = text.index("[", i)
    depth, end = 0, None
    for j in range(start, len(text)):
        if text[j] == "[":
            depth += 1
        elif text[j] == "]":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    if end is None:
        raise ValueError("unterminated timetable array")
    return json.loads(text[start:end])


def first_time(value):
    """Masjidbox stores jumu'ah as a list of ISO timestamps; take the first."""
    if isinstance(value, list):
        value = value[0] if value else None
    return hhmm(value)


def hhmm(iso):
    if not isinstance(iso, str) or "T" not in iso:
        return None
    try:
        return datetime.fromisoformat(iso).strftime("%H:%M")
    except ValueError:
        return None


def start_hhmm(day_iso, iso):
    """A start time as the clock on the wall reads it.

    On the two days a year the clocks change, Masjidbox works the start times out
    in the offset the day began with, then stamps them with the offset in force
    after the change. On Sunday 25 October 2026 every start time came out an hour
    late (Fajr "06:17Z" for 05:17, sunrise 07:52 for 06:52), while the iqamah
    times, which the masjid sets by hand, were right. So where a start time's
    offset differs from the day's own, read its clock time in the day's offset
    and move it to the offset in force. On every other day the two match and
    nothing changes.
    """
    if not isinstance(iso, str) or "T" not in iso:
        return None
    try:
        t = datetime.fromisoformat(iso)
        day = datetime.fromisoformat(day_iso) if isinstance(day_iso, str) else None
    except ValueError:
        return None
    if day is not None and t.utcoffset() is not None and day.utcoffset() is not None \
            and t.utcoffset() != day.utcoffset():
        t = t - (day.utcoffset() - t.utcoffset())
    return t.strftime("%H:%M")


def clean_times(date, times):
    """Drop start times that are plainly placeholders rather than times.

    Masjidbox has published an Isha of exactly 00:00 for a single day, which would
    have gone out on the site as a real time. No prayer starts at midnight on the
    dot, so that value means "missing". Leaving the start blank is honest: the
    iqamah for the same prayer is usually still valid and is shown on its own.
    """
    for p in list(times):
        if times[p] == "00:00":
            print(f"  {date}: dropping {p} start of 00:00 - looks like a placeholder", file=sys.stderr)
            del times[p]
    return times


AR_DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
WINDOW = range(-1, 8)   # yesterday (for the hours after midnight) to a week ahead
ORDERED = ("fajr", "sunrise", "dhuhr", "jumuah", "asr", "maghrib", "isha")


def clock(prayer, t):
    """A 12-hour time from the sheet as HH:MM on the 24-hour clock."""
    m = timetable.minutes(prayer, t)
    return f"{m // 60:02d}:{m % 60:02d}"


def sheet_month(ym):
    """Every day of a typed month, in the shape the site reads. {} if it is not typed yet."""
    if not (SHEETS / f"{ym}.txt").exists():
        return {}
    rows, notes = timetable.read(ym)
    y, m = map(int, ym.split("-"))
    months = [x.strip() for x in notes.get("hijri-months", "").split(",") if x.strip()]
    jumuah = sorted((int(k.rsplit("-", 1)[1]), v.split()) for k, v in notes.items()
                    if k.startswith("jumuah-from-"))
    if not months or not notes.get("hijri-year") or not jumuah:
        raise ValueError(f"{ym}.txt needs hijri-months, hijri-year and jumuah-from-N lines")
    out, month, last = {}, 0, None
    for r in rows:
        d = date(y, m, r["day"])
        if last is not None and r["hijri"] < last:
            month += 1
        last = r["hijri"]
        if month >= len(months):
            raise ValueError(f"{ym}.txt: {d} needs a hijri month after {months[-1]}")
        day = {
            "date": d.isoformat(),
            "hijri": f"{AR_DAYS[d.weekday()]} {r['hijri']} {months[month]} {notes['hijri-year']}",
            "times": {"fajr": clock("fajr", r["fajr"][0]), "sunrise": clock("sunrise", r["sunrise"]),
                      "dhuhr": clock("dhuhr", r["dhuhr"][0]), "asr": clock("asr", r["asr"][0]),
                      "maghrib": clock("maghrib", r["maghrib"]), "isha": clock("isha", r["isha"][0])},
            # Maghrib has no jama'at column: the congregation prays at sunset.
            "iqamah": {"fajr": clock("fajr", r["fajr"][1]), "asr": clock("asr", r["asr"][1]),
                       "maghrib": clock("maghrib", r["maghrib"]), "isha": clock("isha", r["isha"][1])},
            "from": "sheet",
        }
        if d.weekday() == 4:
            # On a Friday the sheet's Dhuhr jama'at column is the khutbah, and the jama'at
            # is in the note at the top. Jumu'ah is its own service, not a relabelled Dhuhr.
            khutbah, jamaat = [v for f, v in jumuah if f <= r["day"]][-1]
            if clock("dhuhr", khutbah) != clock("dhuhr", r["dhuhr"][1]):
                raise ValueError(f"{ym}.txt: {d} khutbah {r['dhuhr'][1]} disagrees with the note's {khutbah}")
            day["times"]["jumuah"] = clock("dhuhr", khutbah)
            day["iqamah"]["jumuah"] = clock("dhuhr", jamaat)
        else:
            day["iqamah"]["dhuhr"] = clock("dhuhr", r["dhuhr"][1])
        # In the order of the day, so the file reads like the sheet.
        for part in ("times", "iqamah"):
            day[part] = {k: day[part][k] for k in ORDERED if k in day[part]}
        out[day["date"]] = day
    return out


def masjidbox_days(rows):
    days = {}
    for row in rows:
        if not row.get("date"):
            continue
        iq = row.get("iqamah") or {}
        hijri = row.get("hijri") or {}
        day = {
            "date": row["date"][:10],
            "hijri": hijri.get("formatted") or "",
            "times": clean_times(row["date"][:10],
                                 {p: start_hhmm(row["date"], row.get(p)) for p in PRAYERS
                                  if start_hhmm(row["date"], row.get(p))}),
            "iqamah": {p: hhmm(v) for p, v in iq.items() if hhmm(v)},
            "from": "masjidbox",
        }
        # Masjidbox gives Jumu'ah a separate field (a list, since a masjid can hold
        # more than one jumu'ah).
        jum = first_time(row.get("jumuah"))
        if jum:
            day["times"]["jumuah"] = jum
            jum_iq = first_time(iq.get("jumuah"))
            if jum_iq:
                day["iqamah"]["jumuah"] = jum_iq
        days[day["date"]] = day
    return days


def build(today):
    dates = [(today + timedelta(days=n)).isoformat() for n in WINDOW]
    sheets = {}
    for ym in sorted({d[:7] for d in dates}):
        sheets.update(sheet_month(ym))
    fallback = {}
    if any(d not in sheets for d in dates):
        try:
            fallback = masjidbox_days(extract_timetable(fetch(SOURCE)))
        except Exception as e:  # noqa: BLE001
            print(f"  Masjidbox unavailable ({e}); days with no sheet are left out", file=sys.stderr)
    days = [sheets.get(d) or fallback.get(d) for d in dates]
    # Every prayer needs at least a start time or an iqamah to be worth showing.
    required = {"fajr", "dhuhr", "asr", "maghrib", "isha"}
    days = [d for d in days if d and required <= set(d["times"]) | set(d["iqamah"])]
    # Refuse to publish a thin or broken timetable: an empty week under the site's
    # heading is worse than yesterday's file, which the site will call out as stale.
    if len(days) < 3 or not any(d["date"] >= today.isoformat() for d in days):
        raise ValueError(f"only {len(days)} usable day(s) from today - refusing to overwrite the timetable")
    for d in days:
        if d["from"] != "sheet":
            print(f"  {d['date']}: no printed sheet typed for {d['date'][:7]}, using Masjidbox", file=sys.stderr)
    return {
        "source": "The masjid's printed monthly timetable (scripts/timetable); Masjidbox only where no month is typed",
        "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "days": days,
    }


def main():
    data = build(datetime.now(ZoneInfo("Europe/London")).date())
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    d = data["days"][0]
    print(f"wrote {OUT}: {len(data['days'])} days from {d['date']}, "
          f"{sum(x['from'] == 'sheet' for x in data['days'])} from the printed sheets")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
