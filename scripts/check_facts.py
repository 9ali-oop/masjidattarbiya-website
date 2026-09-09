"""Fail if a page publishes contact details that contradict CLAUDE.md.

The header and footer are duplicated into every page, so a single wrong number can
end up in one place and not the others. This is the cheap guard against that.
"""
import glob, re, sys

PHONE = "07908 854187"
TEL = "tel:+447908854187"
WA = "wa.me/447908854187"
EMAIL = "info@masjidatarbiya.org"
CHARITY = "1142204"

problems = []

for page in sorted(glob.glob("*.html")):
    html = open(page, encoding="utf-8").read()

    # Any UK mobile in the visible text must be the masjid's, correctly formatted.
    # Strip attribute values first, so digits inside URLs (e.g. the Facebook page id)
    # are not mistaken for phone numbers.
    text = re.sub(r"<script.*?</script>", "", html, flags=re.S)
    text = re.sub(r'(?:href|src|content)="[^"]*"', "", text)
    for found in set(re.findall(r"0\d{4}\s?\d{3}\s?\d{3,4}", text)):
        if found.replace(" ", "") != PHONE.replace(" ", ""):
            problems.append(f"{page}: unexpected phone number {found!r}")

    for tel in set(re.findall(r"tel:\+?[\d]+", html)):
        if tel != TEL:
            problems.append(f"{page}: bad tel link {tel!r}")

    for wa in set(re.findall(r"wa\.me/[\d]+", html)):
        if wa != WA:
            problems.append(f"{page}: bad WhatsApp link {wa!r}")

    for mail in set(re.findall(r"[\w.+-]+@[\w.-]+\.\w+", html)):
        if mail != EMAIL:
            problems.append(f"{page}: unexpected email {mail!r}")

    if page != "404.html" and CHARITY not in html:
        problems.append(f"{page}: missing charity number {CHARITY}")

    # Prayer times must never be hardcoded into the markup. The giveaway is a
    # prayer name and a clock time close together, which is what a pasted
    # timetable looks like. The live table is built by JavaScript, so nothing
    # like this should appear in a source file.
    for m in re.finditer(r"<t[dh][^>]*>\s*(Fajr|Dhuhr|Zuhr|Asr|Maghrib|Isha|Jumu)", text, re.I):
        if re.search(r"\d{1,2}[:.]\d{2}", text[m.start():m.start() + 260]):
            problems.append(f"{page}: hardcoded prayer timetable near {m.group(1)!r} - use the live data")
            break
    if re.search(r"(Fajr|Maghrib|Isha)\b[^<>]{0,30}\d{1,2}[:.]\d{2}\s*(am|pm)", text, re.I):
        problems.append(f"{page}: a prayer time appears in the copy - use the live data")

for p in problems:
    print("FAIL: " + p)
print("Contact details are consistent." if not problems else f"\n{len(problems)} problem(s).")
sys.exit(1 if problems else 0)
