"""Fail if any page links to a file that does not exist, uses the wrong kind of
address, or leaves tags unbalanced."""
import glob, os, re, sys

SITE = "https://masjidattarbiya.org/"

problems = []
# Pages load css/style.css and js/main.js with a ?v= version so that browsers
# fetch the new file after a change, instead of pairing new pages with the old
# stylesheet they kept (GitHub Pages lets them keep it for ten minutes). Bump
# the version on every page when either file changes; this keeps them in step.
versions = {}


def resolve(target):
    """The file a link target refers to, or None.

    Pages are linked without their extension (GitHub Pages serves about.html at
    /about as well as /about.html), so `about` resolves to about.html and the
    empty path, the site root, to index.html."""
    if target in ("", "."):
        return "index.html"
    for candidate in (target, target + ".html", os.path.join(target, "index.html")):
        if os.path.isfile(candidate):
            return candidate
    return None


for page in sorted(glob.glob("*.html")):
    html = open(page, encoding="utf-8").read()

    for m in re.finditer(r'(?:src|href)="([^"#][^"]*)"', html):
        url = m.group(1)
        if url.startswith(("http://", "https://", "mailto:", "tel:", "#", "data:")):
            continue
        path = url.split("?")[0].split("#")[0]

        # Page addresses are clean: donate, not donate.html. GitHub Pages serves
        # the file at both, so links already shared keep working, but every link
        # on the site uses the clean form. (Never a trailing slash: /donate/ is a
        # 404 there.)
        if path.endswith(".html"):
            problems.append(f"{page}: links to {url} - link to the page without .html")

        # Root-relative paths resolve against the domain root. Only 404.html uses
        # them, because GitHub Pages serves it at whatever missing address was
        # asked for, however deep, so relative paths would break there. Every
        # other page uses relative paths, with "/" for the homepage.
        if url.startswith("/") and page != "404.html" and path != "/":
            problems.append(f"{page}: root-relative path {url} - use a relative path")

        if resolve(path.lstrip("/")) is None:
            problems.append(f"{page}: links to missing {url}")

    # The canonical address and og:url use the clean form too.
    for m in re.finditer(re.escape(SITE) + r'[^"\s]*\.html', html):
        problems.append(f"{page}: {m.group(0)} - site addresses never end in .html")

    for asset in ("css/style.css", "js/main.js"):
        for v in re.findall(r'"' + re.escape(asset) + r'(\?v=[^"]*)?"', html):
            versions.setdefault(asset, {}).setdefault(v or "(none)", []).append(page)

    for tag in ("div", "section", "main", "table", "ul", "header", "footer"):
        opened = len(re.findall(r"<" + tag + r"[\s>]", html))
        closed = len(re.findall(r"</" + tag + r">", html))
        if opened != closed:
            problems.append(f"{page}: <{tag}> opened {opened} times, closed {closed}")

    if len(re.findall(r"<h1[\s>]", html)) != 1:
        problems.append(f"{page}: should have exactly one <h1>")

for asset, seen in versions.items():
    if len(seen) > 1:
        detail = "; ".join(f"{v} on {', '.join(pages)}" for v, pages in sorted(seen.items()))
        problems.append(f"{asset} is loaded with different versions: {detail}")

for p in problems:
    print("FAIL: " + p)
print("Links, addresses, tag balance and headings are fine." if not problems else f"\n{len(problems)} problem(s).")
sys.exit(1 if problems else 0)
