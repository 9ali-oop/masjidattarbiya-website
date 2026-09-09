"""Fetch the masjid's prayer timetable from Masjidbox and write assets/prayer-times.json.

Masjidbox renders the timetable client-side, but the underlying data is embedded in the
page as URL-encoded JSON. We pull the `timetable` array out of that, which gives us both
start times and iqamah times, plus the hijri date, for about a week ahead.

Run daily from GitHub Actions. If anything about the page changes, this exits non-zero and
leaves the previous JSON in place; the site then shows a staleness notice and points people
at the live Masjidbox page instead of showing wrong times.
"""

import json, re, sys, urllib.parse, urllib.request
from datetime import datetime, timezone

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


def hhmm(iso):
    if not isinstance(iso, str) or "T" not in iso:
        return None
    try:
        return datetime.fromisoformat(iso).strftime("%H:%M")
    except ValueError:
        return None


def build(rows):
    days = []
    for row in rows:
        if not row.get("date"):
            continue
        iq = row.get("iqamah") or {}
        hijri = row.get("hijri") or {}
        day = {
            "date": row["date"][:10],
            "hijri": hijri.get("formatted") or "",
            "times": {p: hhmm(row.get(p)) for p in PRAYERS if hhmm(row.get(p))},
            "iqamah": {p: hhmm(v) for p, v in iq.items() if hhmm(v)},
        }
        days.append(day)
    if not days:
        raise ValueError("timetable parsed but contained no usable days")
    return {
        "source": SOURCE,
        "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "days": days,
    }


def main():
    data = build(extract_timetable(fetch(SOURCE)))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    d = data["days"][0]
    print(f"wrote {OUT}: {len(data['days'])} days, first {d['date']} "
          f"fajr {d['times'].get('fajr')} (iqamah {d['iqamah'].get('fajr')})")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
