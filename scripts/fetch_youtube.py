"""Fetch the masjid's YouTube uploads into assets/youtube.json, with thumbnails.

The channel's public Atom feed needs no API key, no login and no secret of any
kind, which is why this route was chosen over anything involving a token.

    https://www.youtube.com/feeds/videos.xml?channel_id=UCHTSGHCZzLQVVjYPDMlnMlg

Four things this script is careful about, each for a reason:

1. It ACCUMULATES. The feed only ever returns the most recent 15 videos, so a
   wholesale overwrite would silently drop older talks once the channel grows
   past fifteen. Entries are merged by video id and never deleted.

2. It uses `published`, not `updated`. The `updated` field changes whenever
   YouTube touches the metadata, so sorting by it scrambles the list into an
   order that means nothing to a reader.

3. It downloads thumbnails into the repo. The site contacts no third party on
   page load, and hotlinking i.ytimg.com would break that. Note that YouTube
   serves a 404 for missing thumbnail sizes with Content-Type image/jpeg and a
   grey placeholder body, so the status code AND the size are both checked.

4. It drops video descriptions entirely. Several of them contain the charity's
   bank details and a volunteer's mobile number. Those are the masjid's choice
   to publish on YouTube; mirroring them onto the website, next to a donate
   page and indexed by search engines, is a different decision and not one a
   scheduled job should be making.

Run daily from GitHub Actions. Exits non-zero and leaves the previous file
untouched if anything looks wrong, so a YouTube outage never blanks the page.

    python scripts/fetch_youtube.py
"""

import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

CHANNEL_ID = "UCHTSGHCZzLQVVjYPDMlnMlg"
FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=" + CHANNEL_ID
OUT = "assets/youtube.json"
THUMB_DIR = "assets/youtube"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}

# A 404 from i.ytimg.com still arrives as a JPEG: a 1097-byte grey placeholder.
# Anything smaller than this is not a real thumbnail.
MIN_THUMB_BYTES = 4000


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "masjidattarbiya.org youtube updater"})
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status != 200:
            raise ValueError(f"{url} returned HTTP {r.status}")
        return r.read()


def thumbnail(video_id):
    """Save the best thumbnail that actually exists. Returns a repo path or None.

    mqdefault is a true 16:9 crop at 320x180. hqdefault is larger but letterboxes
    16:9 video inside 4:3 with black bars, so it is only the fallback.
    """
    path = os.path.join(THUMB_DIR, video_id + ".jpg")
    if os.path.exists(path) and os.path.getsize(path) >= MIN_THUMB_BYTES:
        return path.replace("\\", "/")
    for name in ("mqdefault", "hqdefault"):
        try:
            data = get(f"https://i.ytimg.com/vi/{video_id}/{name}.jpg")
        except Exception:
            continue
        if len(data) < MIN_THUMB_BYTES:
            continue  # the grey "no thumbnail" placeholder
        os.makedirs(THUMB_DIR, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return path.replace("\\", "/")
    return None


def parse(xml_bytes):
    root = ET.fromstring(xml_bytes)
    videos = []
    for e in root.findall("atom:entry", NS):
        vid = e.findtext("yt:videoId", None, NS)
        title = (e.findtext("atom:title", "", NS) or "").strip()
        published = e.findtext("atom:published", None, NS)
        link_el = e.find("atom:link[@rel='alternate']", NS)
        url = link_el.get("href") if link_el is not None else None
        if not (vid and title and published and url):
            continue
        videos.append({
            "id": vid,
            "title": title,
            "published": published[:10],
            "url": url,
            # Shorts live at /shorts/<id>; everything else at /watch?v=<id>.
            "short": "/shorts/" in url,
        })
    return videos


def main():
    fresh = parse(get(FEED))
    if not fresh:
        raise ValueError("feed parsed to zero entries - refusing to overwrite the existing file")

    existing = {}
    if os.path.exists(OUT):
        try:
            for v in json.load(open(OUT, encoding="utf-8")).get("videos", []):
                existing[v["id"]] = v
        except (ValueError, KeyError):
            pass  # unreadable file, rebuild from the feed

    added = 0
    for v in fresh:
        if v["id"] not in existing:
            added += 1
        keep = existing.get(v["id"], {})
        v["thumb"] = keep.get("thumb") or thumbnail(v["id"])
        existing[v["id"]] = v

    videos = sorted(existing.values(), key=lambda v: v["published"], reverse=True)
    data = {
        "source": f"https://www.youtube.com/channel/{CHANNEL_ID}",
        "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "videos": videos,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")

    missing = sum(1 for v in videos if not v.get("thumb"))
    print(f"wrote {OUT}: {len(videos)} videos ({added} new), newest {videos[0]['published']}"
          + (f", {missing} without a thumbnail" if missing else ""))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
