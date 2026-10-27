# Monthly prayer timetable (PDF)

The masjid prints a timetable for each month. Big masjid websites offer theirs as a PDF to
download, so this folder rebuilds the printed sheet as a clean one-page A4 PDF instead of
putting a photo of the paper online.

**Published (22 October 2026, design approved by Ali).** The PDFs live in
`assets/timetables/`, listed in `assets/timetables.json`; the prayer times page shows a button
for each month that has not ended yet.

**These files are also the site's live prayer times (since 27 October 2026).** Ali confirmed in
person that the printed sheet's times are the proper ones, so `scripts/fetch_prayer_times.py`
builds the site's week from these files every night, and Masjidbox only fills a day no typed
month covers. `check_data.py` fails a week before a month that has not been typed, so **type
each month before it starts**.

## Making a month

1. Type the masjid's printed sheet into `YYYY-MM.txt`, copying an existing month's layout:
   one line per day (`day hijri | fajr jama'at | sunrise | dhuhr jama'at | asr jama'at |
   maghrib | isha jama'at`), and the notes for the box at the top (`hijri:`, `jumuah:`,
   `jumuah-small:`, `note:`). On Fridays the sheet's Dhuhr jama'at column holds the khutbah
   time; copy it as printed. Add the lines the website reads (copy them from an existing month):
   `jumuah-from-1: <khutbah> <jama'at>` (and another `jumuah-from-<day>:` if the time changes
   during the month, as on 30 October 2026), `hijri-months:` (the Arabic names of the hijri
   months the day numbers run through, comma separated) and `hijri-year:`.
2. `python scripts/timetable/timetable.py check YYYY-MM`. Sunrise, Dhuhr, Asr and Maghrib
   follow the sun, so a misread digit stands out. It also checks Fajr and Isha for smoothness,
   the hijri dates for order, and every jama'at for falling after its start.
3. `python scripts/fetch_prayer_times.py`, then `python scripts/check_data.py`: the site's
   times now come from the new month, and the check confirms they match it.
4. `python scripts/timetable/timetable.py html YYYY-MM`, then
   `node scripts/timetable/render_pdf.js YYYY-MM`. The PDF and a PNG preview land in `out/`
   (not committed). It needs `pip install segno` (the donate QR code) and Playwright with
   Chromium; the Poppins font is fetched into `fonts/` the first time.

## What the PDF leaves out on purpose

- **The bank details** printed at the foot of the paper sheet (account name, number, sort
  code). The website never publishes them: next to a donate page and indexed by search
  engines they become a fraud risk (see "Events" in CLAUDE.md). The PDF points to the donate
  page instead, with a QR code.
- **The printer's advert** in the yellow band at the bottom, with its phone number.
- The phone number is the facts table's (07929 242914), not whatever a sheet carries.

## Where the printed sheet and Masjidbox disagree (found 22 and 27 October 2026)

The site follows the sheet (above). Masjidbox, the masjid's online timetable, differs, and
whoever holds its login should bring it into line with the sheet:

- Fajr and Isha start times differ by 3 to 4 minutes (a different calculation method).
- Asr jama'at from 25 to 31 October: 2:45 on the sheet, 2:30 on Masjidbox.
- Jumu'ah jama'at: 1:50 on the sheet, 1:55 on Masjidbox (the khutbah is 1:30 on both).
- The hijri date is a day ahead on the sheet: it starts Jumada al-Ula on 12 October,
  Masjidbox on 13 October.

- From 1 November: a Fajr jama'at of 5:00 on the 1st (the sheet has 5:45, and Fajr begins at
  5:26), and Isha starting up to 25 minutes earlier than the sheet (17:43 for 6:08 PM on the 1st).
- Jumu'ah from 30 October: Masjidbox kept the summer 1:30 khutbah and 1:55 jama'at.

Sunrise, Dhuhr, Asr and Maghrib start times agree.
