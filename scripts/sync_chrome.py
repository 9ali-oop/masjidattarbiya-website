"""Keep the shared header and footer identical across every page.

The site is plain HTML with no build step, so the header and footer are physically
copied into each page. That is fine until someone edits one page and forgets the
others - which has already happened once, leaving three pages with a stale footer.

This script stamps partials/header.html and partials/footer.html into every page,
marking the current page's nav link as active.

    python scripts/sync_chrome.py          apply the partials to every page
    python scripts/sync_chrome.py --check  report drift and exit 1 (used in CI)

404.html is deliberately excluded: GitHub Pages serves it for any missing path, so
it needs root-relative asset URLs that the other pages must not use.
"""

import glob
import re
import sys

PAGES = ["index.html", "about.html", "prayer-times.html", "donate.html", "contact.html",
         "privacy.html"]
HEADER_START, HEADER_END = '<header class="site-header">', "</header>"
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
    """The shared header with this page's nav link marked active."""
    html = read("partials/header.html").rstrip("\n")
    slug = page[:-5]  # strip ".html"
    return re.sub(
        r'<a href="([^"]+)" data-nav="' + re.escape(slug) + r'"',
        r'<a href="\1" class="active" data-nav="' + slug + '"',
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
            drift.append(f"{page}: {label} differs from partials/{label}.html")
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
