"""Fail if any page links to a file that does not exist, or leaves tags unbalanced."""
import glob, os, re, sys

problems = []

for page in sorted(glob.glob("*.html")):
    html = open(page, encoding="utf-8").read()

    for m in re.finditer(r'(?:src|href)="([^"#][^"]*)"', html):
        url = m.group(1)
        if url.startswith(("http://", "https://", "mailto:", "tel:", "#", "data:")):
            continue
        # Root-relative paths resolve against the domain root. The site is served
        # from a subpath on GitHub Pages, so they 404 there - this is exactly how
        # every link and asset on the 404 page came to be broken.
        if url.startswith("/"):
            problems.append(f"{page}: root-relative path {url} - use a relative path")

        target = url.lstrip("/").split("?")[0].split("#")[0]
        if not os.path.exists(target):
            problems.append(f"{page}: links to missing {url}")

    for tag in ("div", "section", "main", "table", "ul", "header", "footer"):
        opened = len(re.findall(r"<" + tag + r"[\s>]", html))
        closed = len(re.findall(r"</" + tag + r">", html))
        if opened != closed:
            problems.append(f"{page}: <{tag}> opened {opened} times, closed {closed}")

    if len(re.findall(r"<h1[\s>]", html)) != 1:
        problems.append(f"{page}: should have exactly one <h1>")

for p in problems:
    print("FAIL: " + p)
print("Links, tag balance and headings are fine." if not problems else f"\n{len(problems)} problem(s).")
sys.exit(1 if problems else 0)
