"""Fail if the parent portal's settings could leak the database.

js/portal-config.js is published to the world, so it may only ever hold the
project URL and the public (anon / publishable) key. Supabase also issues a
secret key (service_role, or "sb_secret_..."), which ignores every security rule
in supabase/schema.sql. If that one is ever pasted into the config file by
mistake, every family's details become readable by anyone. This check stops
that reaching the site.

    python scripts/check_portal.py
"""

import base64
import json
import re
import sys

CONFIG = "js/portal-config.js"

problems = []

try:
    text = open(CONFIG, encoding="utf-8").read()
except OSError:
    print(f"FAIL: {CONFIG} is missing - the portal page needs it, even with empty values")
    sys.exit(1)

url = re.search(r'supabaseUrl:\s*"([^"]*)"', text)
key = re.search(r'supabaseAnonKey:\s*"([^"]*)"', text)
if not url or not key:
    problems.append(f"{CONFIG}: cannot find supabaseUrl and supabaseAnonKey")
else:
    url, key = url.group(1).strip(), key.group(1).strip()

    if bool(url) != bool(key):
        problems.append(f"{CONFIG}: fill in both supabaseUrl and supabaseAnonKey, or neither")

    if url and not re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co", url):
        problems.append(f"{CONFIG}: supabaseUrl should look like https://<project>.supabase.co, not {url!r}")

    if key.startswith("sb_secret_"):
        problems.append(f"{CONFIG}: this is the SECRET key. Remove it now, and rotate it in the Supabase dashboard")

    # Legacy keys are JWTs: the middle part says which role the key carries.
    if key.count(".") == 2 and not key.startswith("sb_"):
        try:
            part = key.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
            if claims.get("role") != "anon":
                problems.append(f"{CONFIG}: this key has role {claims.get('role')!r}. Only the anon key belongs here. "
                                "Remove it now, and rotate it in the Supabase dashboard")
        except ValueError:
            problems.append(f"{CONFIG}: the key does not look like a Supabase key")

for p in problems:
    print("FAIL: " + p)
if not problems:
    print("Portal settings are safe to publish" + ("" if key else " (portal not configured yet)") + ".")
sys.exit(1 if problems else 0)
