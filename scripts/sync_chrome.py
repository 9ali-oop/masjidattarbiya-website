"""Keep the shared header and footer identical across every page.

The site is plain HTML with no build step, so the header and footer are physically
copied into each page. That is fine until someone edits one page and forgets the
others - which has already happened once, leaving three pages with a stale footer.

This script stamps the header and footer partials into every page, marking the
current page's nav link as active.

The Al Furqan madrasah pages carry their own header (partials/madrasah-header.html)
so parents know they are in the madrasah's part of the site, with a way back to
the masjid. They share the masjid's footer on purpose: the madrasah is part of the
same charity, not a separate organisation, and the footer says so.

    python scripts/sync_chrome.py          apply the partials to every page
    python scripts/sync_chrome.py --check  report drift and exit 1 (used in CI)

404.html is deliberately excluded: GitHub Pages serves it for any missing path, so
it needs root-relative asset URLs that the other pages must not use.
"""

import glob
import re
import sys

# donate.html is deliberately not here: it is the original donation page, moved in
# unchanged, with its own header, footer, styles and script, so that donations keep
# working whatever happens to the rest of the site.
MASJID_PAGES = ["index.html", "about.html", "prayer-times.html", "events.html", "history.html",
                "contact.html", "privacy.html"]
MADRASAH_PAGES = ["madrasah.html", "portal.html"]
PAGES = MASJID_PAGES + MADRASAH_PAGES
# A prefix, so the madrasah's header (class "site-header site-header--furqan") matches too.
HEADER_START, HEADER_END = '<header class="site-header', "</header>"
FOOTER_START, FOOTER_END = '<footer class="site-footer">', "</footer>"


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def block(text, start, end):
    i = text.find(start)
    if i == -1:
        return None, -1, -1
    j = text.find(end, i)
    if j == -1:
        return None, -1, -1
    return text[i:j + len(end)], i, j + len(end)


def header_for(page):
    """The right header for this page, with this page's nav link marked active."""
    partial = "partials/madrasah-header.html" if page in MADRASAH_PAGES else "partials/header.html"
    html = read(partial).rstrip("\n")
    slug = page[:-5]  # strip ".html"
    return re.sub(
        r'<a href="([^"]+)" data-nav="' + re.escape(slug) + r'"',
        r'<a href="\1" class="active" aria-current="page" data-nav="' + slug + '"',
        html,
    )


def footer_html():
    return read("partials/footer.html").rstrip("\n")


def sync(page, check_only):
    text = read(page)
    drift = []

    for want, start, end, label in (
        (header_for(page), HEADER_START, HEADER_END, "header"),
        (footer_html(), FOOTER_START, FOOTER_END, "footer"),
    ):
        have, i, j = block(text, start, end)
        if have is None:
            drift.append(f"{page}: no {label} found")
            continue
        if have != want:
            drift.append(f"{page}: {label} differs from its partial")
            if not check_only:
                text = text[:i] + want + text[j:]

    if not check_only and drift:
        with open(page, "w", encoding="utf-8") as f:
            f.write(text)
    return drift


def main():
    check_only = "--check" in sys.argv
    missing = [p for p in PAGES if p not in glob.glob("*.html")]
    if missing:
        print("missing pages: " + ", ".join(missing), file=sys.stderr)
        return 1

    all_drift = []
    for page in PAGES:
        all_drift += sync(page, check_only)

    if not all_drift:
        print("Header and footer are identical across all pages.")
        return 0

    for d in all_drift:
        print(("DRIFT: " if check_only else "fixed: ") + d)
    if check_only:
        print("\nRun: python scripts/sync_chrome.py", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
