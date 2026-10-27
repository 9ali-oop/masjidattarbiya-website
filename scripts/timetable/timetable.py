"""The masjid's monthly prayer timetable as a one-page A4 PDF.

    python scripts/timetable/timetable.py check 2026-10    # check a month against the sun
    python scripts/timetable/timetable.py html 2026-10     # write the page, ready to print
    node scripts/timetable/render_pdf.js 2026-10           # print it to PDF

A month is a text file here (2026-10.txt), typed from the masjid's own printed
timetable. These files are the site's live prayer times too: fetch_prayer_times.py
builds the coming week from them every night (see README.md).
"""
import base64, calendar, datetime as dt, html, math, pathlib, statistics, sys, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
SITE = HERE.parent.parent
OUT = HERE / "out"
FONTS = HERE / "fonts"
POPPINS = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-{}.ttf"
WEIGHTS = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold"}
LAT, LON = 52.493, -1.880   # 2 Revesby Walk


def read(ym):
    """Rows and notes of a month file."""
    rows, notes = [], {}
    for line in (HERE / f"{ym}.txt").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "|" not in line:
            key, _, value = line.partition(":")
            notes[key.strip()] = value.strip()
            continue
        p = [x.split() for x in line.split("|")]
        rows.append(dict(day=int(p[0][0]), hijri=int(p[0][1]), fajr=p[1], sunrise=p[2][0],
                         dhuhr=p[3], asr=p[4], maghrib=p[5][0], isha=p[6]))
    return rows, notes


def minutes(prayer, t):
    """A 12-hour time from the sheet, as minutes after midnight."""
    h, m = map(int, t.split(":"))
    if prayer in ("dhuhr",):
        h = h if h >= 11 else h + 12
    elif prayer not in ("fajr", "sunrise"):
        h += 12
    return h * 60 + m


def sun(day, utc_offset):
    """Sunrise, solar noon, sunset and the start of Asr (shadow equal to height), local minutes."""
    g = 2 * math.pi / 365 * (day.timetuple().tm_yday - 1)
    eq = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                   - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    dec = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g)
           + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    lat = math.radians(LAT)

    def hour_angle(alt):
        return math.degrees(math.acos((math.sin(math.radians(alt)) - math.sin(lat) * math.sin(dec))
                                      / (math.cos(lat) * math.cos(dec))))
    noon = 720 - 4 * LON - eq + utc_offset
    asr_alt = math.degrees(math.atan(1 / (1 + math.tan(abs(lat - dec)))))
    return dict(sunrise=noon - 4 * hour_angle(-0.833), dhuhr=noon,
                maghrib=noon + 4 * hour_angle(-0.833), asr=noon + 4 * hour_angle(asr_alt))


def uk_offset(day):
    """60 during British Summer Time, else 0 (last Sunday of March to last Sunday of October)."""
    def last_sunday(month):
        d = dt.date(day.year, month, calendar.monthrange(day.year, month)[1])
        return d - dt.timedelta(days=(d.weekday() + 1) % 7)
    return 60 if last_sunday(3) <= day < last_sunday(10) else 0


def check(ym):
    """Catch a misread digit. Sunrise, Dhuhr, Asr and Maghrib follow the sun, each at its own
    steady offset (the masjid adds a few minutes to Dhuhr), so a value more than two minutes off
    its column's usual offset is a typo. Fajr and Isha are checked for smoothness, the hijri
    dates for order, and every jama'at for falling after its start."""
    y, m = map(int, ym.split("-"))
    rows, _ = read(ym)
    problems, resid = [], {k: [] for k in ("sunrise", "dhuhr", "asr", "maghrib")}
    if len(rows) != calendar.monthrange(y, m)[1] or [r["day"] for r in rows] != list(range(1, len(rows) + 1)):
        problems.append("the days are not 1 to the end of the month, in order")
    for i, r in enumerate(rows):
        day = dt.date(y, m, r["day"])
        calc = sun(day, uk_offset(day))
        for k in resid:
            resid[k].append((day, r[k] if k in ("sunrise", "maghrib") else r[k][0],
                             minutes(k, r[k] if k in ("sunrise", "maghrib") else r[k][0]) - calc[k]))
        starts = [minutes("fajr", r["fajr"][0]), minutes("sunrise", r["sunrise"]), minutes("dhuhr", r["dhuhr"][0]),
                  minutes("asr", r["asr"][0]), minutes("maghrib", r["maghrib"]), minutes("isha", r["isha"][0])]
        if starts != sorted(starts):
            problems.append(f"{day}: times out of order")
        for k in ("fajr", "asr", "isha") + (() if day.weekday() == 4 else ("dhuhr",)):
            if minutes(k, r[k][1]) < minutes(k, r[k][0]):
                problems.append(f"{day}: {k} jama'at {r[k][1]} is before it begins at {r[k][0]}")
        if i:
            p = rows[i - 1]
            ok = r["hijri"] == p["hijri"] + 1 or (r["hijri"] == 1 and p["hijri"] in (29, 30))
            if not ok:
                problems.append(f"{day}: hijri date {p['hijri']} then {r['hijri']}")
            shift = uk_offset(day) - uk_offset(day - dt.timedelta(days=1))
            for k in ("fajr", "isha"):
                step = minutes(k, r[k][0]) - minutes(k, p[k][0]) - shift
                if abs(step) > 3:
                    problems.append(f"{day}: {k} moves {step} minutes from the day before")
    for k, values in resid.items():
        usual = statistics.median(v for _, _, v in values)
        for day, t, v in values:
            if abs(v - usual) > 2:
                problems.append(f"{day}: {k} {t} is {v - usual:+.1f} minutes off the rest of its column")
    for p in problems:
        print("FAIL: " + p)
    print(f"{ym}: {len(rows)} days, " + ("all consistent." if not problems else f"{len(problems)} problem(s)."))
    return not problems


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(pathlib.Path(path).read_bytes()).decode()


def font(weight):
    path = FONTS / f"poppins-{weight}.ttf"
    if not path.exists():
        FONTS.mkdir(exist_ok=True)
        path.write_bytes(urllib.request.urlopen(POPPINS.format(WEIGHTS[weight])).read())
    return path


def qr_svg():
    import segno   # pip install segno
    path = OUT / "qr-donate.svg"
    segno.make("https://masjidattarbiya.org/donate", error="m").save(str(path), scale=4, border=0, dark="#0e4a50")
    return path


def pair(v):
    return f"<b>{v[0]}</b><i>|</i>{v[1]}"


def page(ym):
    y, m = map(int, ym.split("-"))
    rows, notes = read(ym)
    OUT.mkdir(exist_ok=True)
    body = []
    for r in rows:
        day = dt.date(y, m, r["day"])
        body.append(
            f'<tr{" class=fri" if day.weekday() == 4 else ""}>'
            f'<td class=date>{calendar.day_abbr[day.weekday()]} {day.day}</td><td class=hij>{r["hijri"]}</td>'
            f'<td>{pair(r["fajr"])}</td><td>{r["sunrise"]}</td><td>{pair(r["dhuhr"])}</td>'
            f'<td>{pair(r["asr"])}</td><td><b>{r["maghrib"]}</b></td><td>{pair(r["isha"])}</td></tr>')
    fonts = "\n".join(f"@font-face{{font-family:Poppins;font-weight:{w};src:url({data_uri(font(w), 'font/ttf')})}}"
                      for w in WEIGHTS)
    box = [f'<p>Recommended Days of Fasting: <b class=nw>Mondays and Thursdays</b></p>']
    if notes.get("jumuah"):
        box.append(f"<p>{notes['jumuah']}</p>")
    if notes.get("jumuah-small"):
        box.append(f'<p class="small">{notes["jumuah-small"]}</p>')
    if notes.get("note"):
        box.append(f'<p class="extra">{html.escape(notes["note"])}</p>')
    first = dt.date(y, m, 1)
    return f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<title>Attarbiya Masjid prayer timetable, {first:%B %Y}</title>
<style>
{fonts}
@page {{ size: A4; margin: 0; }}
:root {{ --ink:#1d2427; --soft:#56646a; --teal:#17808a; --wash:#f4f8f9; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; }}
body {{ font-family: Poppins, sans-serif; color: var(--ink); width: 210mm; height: 297mm;
       padding: 10mm 13mm 8mm; display: flex; flex-direction: column; }}
header {{ display: flex; align-items: center; gap: 7mm; }}
header img {{ height: 17mm; }}
header .rule {{ width: 0.5mm; align-self: stretch; background: var(--ink); margin: 1mm 0; }}
header .addr, header .contact {{ font-weight: 600; font-size: 11.5pt; line-height: 1.45; }}
header .contact {{ margin-left: auto; }}
.titles {{ display: flex; align-items: center; justify-content: space-between; gap: 8mm; margin: 5mm 0 4mm; }}
.titles > div:first-child {{ flex: none; }}
.titles h1 {{ font-size: 27pt; font-weight: 700; line-height: 1; margin: 0; letter-spacing: 0.01em; }}
.titles h2 {{ font-size: 14.5pt; font-weight: 500; margin: 2mm 0 0; letter-spacing: 0.02em; }}
.titles .hijri {{ font-size: 9pt; color: var(--soft); margin: 1.2mm 0 0; white-space: nowrap; }}
.nw {{ white-space: nowrap; }}
.box {{ border: 0.6mm solid var(--ink); border-radius: 2.5mm; padding: 3mm 4.5mm; font-size: 10pt; line-height: 1.5; flex: 0 1 118mm; min-width: 0; }}
.box p {{ margin: 0; }}
.box .small {{ font-size: 8.5pt; }}
.box .extra {{ font-size: 8.5pt; color: var(--soft); margin-top: 1mm; }}
table {{ width: 100%; border-collapse: collapse; font-size: 10pt; font-variant-numeric: tabular-nums; }}
thead th {{ font-size: 8.6pt; font-weight: 600; text-align: center; padding: 0 0 1.6mm; white-space: nowrap; }}
thead th:first-child {{ text-align: left; padding-left: 2.5mm; }}
tbody tr {{ height: 5.8mm; }}
tbody tr:nth-child(odd):not(.fri) {{ background: var(--wash); }}
td {{ text-align: center; padding: 0 1mm; white-space: nowrap; }}
td.date {{ text-align: left; font-weight: 600; padding-left: 2.5mm; }}
td.hij, td b {{ font-weight: 600; }}
td i {{ font-style: normal; color: var(--soft); padding: 0 1.3mm; }}
tr.fri {{ background: var(--teal); color: #fff; }}
tr.fri td i {{ color: rgba(255,255,255,0.75); }}
footer {{ margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 7mm; padding-top: 3mm; }}
footer .words {{ text-align: center; }}
footer h3 {{ font-size: 14pt; font-weight: 600; margin: 0 0 1mm; }}
footer p {{ margin: 0; font-size: 10pt; line-height: 1.5; }}
footer .charity {{ font-size: 8.5pt; color: var(--soft); }}
footer img {{ width: 21mm; height: 21mm; }}
</style></head><body>
<header>
  <img src="{data_uri(SITE / "assets/logo.png", "image/png")}" alt="Attarbiya Masjid">
  <span class="rule"></span>
  <div class="addr">2 Revesby Walk, Nechells<br>Birmingham, B7 4LG</div>
  <div class="contact">info@masjidatarbiya.org<br>07929 242914</div>
</header>
<div class="titles">
  <div>
    <h1>{first.strftime("%b %Y").upper()}</h1>
    <h2>PRAYER TIMETABLE</h2>
    <p class="hijri">{html.escape(notes.get("hijri", ""))}</p>
  </div>
  <div class="box">
    {chr(10).join(box)}
  </div>
</div>
<table>
  <thead><tr><th>Date</th><th>Hijri Date</th><th>Fajr | Jama'at</th><th>Sunrise</th><th>Dhuhr | Jama'at</th><th>Asr | Jama'at</th><th>Maghrib</th><th>Isha | Jama'at</th></tr></thead>
  <tbody>
{chr(10).join(body)}
  </tbody>
</table>
<footer>
  <div class="words">
    <h3>Please Donate Generously</h3>
    <p>Give online at <b>masjidattarbiya.org/donate</b></p>
    <p class="charity">Attarbiya Masjid &amp; Kowneyn Community Centre &middot; Registered charity 1142204</p>
  </div>
  <img src="{data_uri(qr_svg(), "image/svg+xml")}" alt="QR code for masjidattarbiya.org/donate">
</footer>
</body></html>"""


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("check", "html"):
        sys.exit(__doc__)
    action, ym = sys.argv[1], sys.argv[2]
    if action == "check":
        sys.exit(0 if check(ym) else 1)
    OUT.mkdir(exist_ok=True)
    (OUT / f"{ym}.html").write_text(page(ym))
    print(f"wrote {OUT / f'{ym}.html'}")
