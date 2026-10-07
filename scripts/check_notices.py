"""Fail if assets/notices.json is malformed, or a notice carries contact or bank details.

Notices show on the homepage and the prayer times page while current (see js/main.js).
They are written by hand, so this catches a mistyped date before it hides a notice, and
the same things check_events.py blocks in event copy: bank details and phone numbers do
not belong on a page next to a donate button.
"""
import json, re, sys

problems = []
try:
    data = json.load(open("assets/notices.json", encoding="utf-8"))
except Exception as e:  # noqa: BLE001
    print(f"FAIL: assets/notices.json does not parse: {e}")
    sys.exit(1)

notices = data.get("notices")
if not isinstance(notices, list):
    problems.append('"notices" must be a list')
    notices = []

DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
BLOCKED = [
    (re.compile(r"\b\d{2}-\d{2}-\d{2}\b"), "looks like a sort code"),
    (re.compile(r"\b\d{8}\b"), "looks like an account number"),
    (re.compile(r"(?:\+44|\b0)\s?\d[\d\s]{8,}"), "looks like a phone number - link to contact.html instead"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "email address - link to contact.html instead"),
]

for i, n in enumerate(notices):
    where = f"notice {i + 1}"
    if not isinstance(n, dict) or not n.get("title"):
        problems.append(f"{where}: needs a title")
        continue
    for key in ("from", "until"):
        if key in n and not DATE.match(str(n[key])):
            problems.append(f"{where}: {key} must be YYYY-MM-DD, got {n[key]!r}")
    if n.get("from") and n.get("until") and n["from"] > n["until"]:
        problems.append(f"{where}: from is after until")
    if "until" not in n:
        problems.append(f"{where}: needs an until date, so it cannot linger for ever")
    text = " ".join(str(n.get(k, "")) for k in ("title", "text"))
    for rx, why in BLOCKED:
        if rx.search(text):
            problems.append(f"{where}: {why}")
    if len(str(n.get("text", ""))) > 280:
        problems.append(f"{where}: text over 280 characters - link to a page instead")

live = [n for n in notices if isinstance(n, dict) and n.get("title")]
for p in problems:
    print("FAIL: " + p)
print(f"assets/notices.json: {len(live)} notice(s), well formed." if not problems else f"\n{len(problems)} problem(s).")
sys.exit(1 if problems else 0)
