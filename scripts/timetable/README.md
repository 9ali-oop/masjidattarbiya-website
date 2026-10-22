# Monthly prayer timetable (PDF)

The masjid prints a timetable for each month. Big masjid websites offer theirs as a PDF to
download, so this folder rebuilds the printed sheet as a clean one-page A4 PDF instead of
putting a photo of the paper online.

**Published (22 October 2026, design approved by Ali).** The PDFs live in
`assets/timetables/`, listed in `assets/timetables.json`; the prayer times page shows a
download button for each month that has not ended yet. To add a month, make its PDF below,
copy it to `assets/timetables/attarbiya-prayer-timetable-YYYY-MM.pdf` and add a line to the
list.

## Making a month

1. Type the masjid's printed sheet into `YYYY-MM.txt`, copying an existing month's layout:
   one line per day (`day hijri | fajr jama'at | sunrise | dhuhr jama'at | asr jama'at |
   maghrib | isha jama'at`), and the notes for the box at the top (`hijri:`, `jumuah:`,
   `jumuah-small:`, `note:`). On Fridays the sheet's Dhuhr jama'at column holds the khutbah
   time; copy it as printed.
2. `python scripts/timetable/timetable.py check YYYY-MM`. Sunrise, Dhuhr, Asr and Maghrib
   follow the sun, so a misread digit stands out. It also checks Fajr and Isha for smoothness,
   the hijri dates for order, and every jama'at for falling after its start.
3. `python scripts/timetable/timetable.py html YYYY-MM`, then
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

## Where the printed sheet and Masjidbox disagree (found 22 October 2026)

The site's daily times come from Masjidbox; the PDF comes from the printed sheet. For October
2026 they differ, and the masjid should make them agree:

- Fajr and Isha start times differ by 3 to 4 minutes (a different calculation method).
- Asr jama'at from 25 to 31 October: 2:45 on the sheet, 2:30 on Masjidbox.
- Jumu'ah jama'at: 1:50 on the sheet, 1:55 on Masjidbox (the khutbah is 1:30 on both).
- The hijri date is a day ahead on the sheet: it starts Jumada al-Ula on 12 October,
  Masjidbox on 13 October.

Sunrise, Dhuhr, Asr and Maghrib start times agree.
