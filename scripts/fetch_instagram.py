"""Pull the masjid's own Instagram posts into staging/ for a human to review.

This deliberately does NOT publish anything. It writes to `staging/`, which
`_config.yml` keeps out of the built site, and the events page never reads it.
Someone has to move an entry into assets/events.json by hand before it appears.

That is not timidity, it is the only correct design here:

  - **A post's date is not the event's date.** Captions say "Saturday 11th April"
    with no year, and some give a time and no date at all. There is no structured
    event date anywhere in what the API returns, only when the post was made.
  - **Captions carry things that must not be republished on our own domain.** The
    Ramadan appeal contains the charity's sort code and account number; the summer
    course contains a volunteer's mobile number. Those are the masjid's choice on
    Instagram. Mirrored onto a page next to a donate button and indexed by Google,
    they become a fraud risk. This script redacts them on the way in, and
    check_events.py blocks them again on the way out.
  - **Some of the best events were posted by other accounts we own** (Al Kissaii,
    Al Furqan). This only ever sees @masjid.attarbiya, so it is never the whole
    picture.

Images are downloaded immediately because Instagram's media_url links expire
within hours - a stored link would be dead long before anyone looked at it.

Needs the IG_TOKEN environment variable, which comes from a GitHub Actions
secret. The token is never printed, never written to a file, and never committed.

    IG_TOKEN=... python scripts/fetch_instagram.py
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

API = "https://graph.instagram.com"
OUT = "staging/instagram.json"
IMG_DIR = "staging/instagram"

FIELDS = "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url"

# Fail the job while there is still time to act, rather than after it has died.
WARN_DAYS = 14

REDACTIONS = [
    (re.compile(r"\b(?:sort\s*code)\b[\s:]*\d{2}[-\s]?\d{2}[-\s]?\d{2}", re.I), "[sort code removed]"),
    (re.compile(r"\b(?:account\s*(?:number|no\.?))\b[\s:]*\d[\d\s]{6,}", re.I), "[account number removed]"),
    (re.compile(r"\+44\s?\d[\d\s]{8,}|\b0\d{4}\s?\d{3}\s?\d{3,4}\b"), "[phone number removed]"),
]


def get(path, **params):
    url = f"{API}/{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "masjidattarbiya.org instagram sync"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # Meta puts the token in the query string, so never echo the URL back.
        body = e.read().decode("utf-8", "replace")[:400]
        raise ValueError(f"HTTP {e.code} from /{path}: {body}") from None


def redact(text):
    if not text:
        return ""
    for pattern, replacement in REDACTIONS:
        text = pattern.sub(replacement, text)
    return text.strip()


def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 2000:
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "masjidattarbiya.org instagram sync"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    except Exception:
        return False
    if len(data) < 2000:
        return False
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)
    return True


def check_token(token):
    """Report how much life the token has left, without ever revealing it."""
    try:
        r = get("refresh_access_token", grant_type="ig_refresh_token", access_token=token)
    except ValueError as e:
        print(f"  token refresh failed: {e}", file=sys.stderr)
        return None
    days = int(r.get("expires_in", 0)) // 86400
    rotated = r.get("access_token") and r["access_token"] != token
    print(f"  token valid for about {days} more days"
          + (" (Meta issued a NEW token string - see below)" if rotated else ""))
    if rotated:
        print("  ACTION NEEDED: the refresh returned a different token. This job cannot write it\n"
              "  back into the repository secret on its own, so generate a fresh token in the Meta\n"
              "  App Dashboard and update the IG_TOKEN secret before the current one expires.",
              file=sys.stderr)
    return days


def main():
    token = os.environ.get("IG_TOKEN", "").strip()
    if not token:
        print("IG_TOKEN is not set. Add it as a GitHub Actions secret.", file=sys.stderr)
        return 1

    me = get("me", fields="id,username,media_count", access_token=token)
    print(f"  connected to @{me.get('username')} ({me.get('media_count')} posts)")

    days_left = check_token(token)

    media = get("me/media", fields=FIELDS, limit=100, access_token=token)
    items = media.get("data", [])
    if not items:
        raise ValueError("the API returned no posts - refusing to overwrite the staging file")

    known = {}
    if os.path.exists(OUT):
        try:
            for p in json.load(open(OUT, encoding="utf-8")).get("posts", []):
                known[p["id"]] = p
        except (ValueError, KeyError):
            pass

    new = 0
    posts = []
    for m in items:
        pid = m["id"]
        image = m.get("media_url") if m.get("media_type") == "IMAGE" else m.get("thumbnail_url")
        entry = known.get(pid, {})
        local = entry.get("image")
        if image and not local:
            dest = os.path.join(IMG_DIR, pid + ".jpg")
            local = dest.replace("\\", "/") if download(image, dest) else None
        if pid not in known:
            new += 1
        posts.append({
            "id": pid,
            "posted": (m.get("timestamp") or "")[:10],
            "type": m.get("media_type"),
            "permalink": m.get("permalink"),
            # Redacted, and never a live media_url: those links die within hours.
            "caption": redact(m.get("caption")),
            "image": local,
            "promoted": entry.get("promoted", False),
        })

    posts.sort(key=lambda p: p["posted"], reverse=True)
    os.makedirs("staging", exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({
            "account": me.get("username"),
            "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": "Staging only. Not served: _config.yml excludes staging/. Move an entry into "
                    "assets/events.json by hand, with a real event date, to publish it.",
            "posts": posts,
        }, f, indent=1, ensure_ascii=False)
        f.write("\n")

    unpromoted = sum(1 for p in posts if not p["promoted"])
    print(f"wrote {OUT}: {len(posts)} posts ({new} new), {unpromoted} not yet reviewed")

    if days_left is not None and days_left < WARN_DAYS:
        print(f"FAILING ON PURPOSE: the Instagram token expires in about {days_left} days. "
              "Generate a new one in the Meta App Dashboard and update the IG_TOKEN secret.",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
