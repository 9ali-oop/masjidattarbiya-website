# Attarbiya Masjid

The website for **Attarbiya Masjid & Kowneyn Community Centre**, Nechells, Birmingham.
Registered charity **1142204**.

Live preview: https://9ali-oop.github.io/masjidattarbiya-website/

## What this is

Five pages of plain HTML, CSS and JavaScript. No framework, no build step, no dependencies to
install. Edit a file, commit, and GitHub Pages publishes it within a minute or two.

| | |
|---|---|
| **Home** | Today's prayer times, who we are, and how to give |
| **About** | The masjid's history and what it does |
| **Prayer Times** | Today plus the coming week, updated automatically |
| **Donate** | One-off and monthly giving through GoCardless |
| **Contact** | Phone, WhatsApp, email and a map |

Plus a privacy notice and a 404 page.

## Working on it

Nothing to install to edit the site. To preview it locally:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

Before you commit, run the four checks. They take a second and they catch the mistakes this
project has actually made:

```bash
python scripts/sync_chrome.py --check   # the header and footer are identical on every page
python scripts/check_links.py           # no broken links, balanced tags, one h1 per page
python scripts/check_facts.py           # contact details consistent, no hardcoded prayer times
python scripts/check_data.py            # prayer times valid, in order, and still current
```

They also run automatically on every push.

## Two things to know before editing

**The header and footer are copied into every page.** Edit `partials/header.html` or
`partials/footer.html`, then run `python scripts/sync_chrome.py`. Never edit them inside a page.

**Prayer times are never typed by hand.** A scheduled job reads the masjid's own Masjidbox
timetable each night into `assets/prayer-times.json`, and the page renders from that. Hardcoding
times is what made the previous website a problem, and `check_facts.py` will stop you.

**`CLAUDE.md` in this repo is the fuller guide** - the facts that must stay consistent, how
donations are wired, the colour and type rules, and what is deliberately not published yet. Read
it before making changes, especially to the donate page.

## Scripts

| Script | What it does |
|---|---|
| `fetch_prayer_times.py` | Pulls the timetable from Masjidbox. Runs nightly; safe to run by hand. |
| `sync_chrome.py` | Stamps the shared header and footer into every page |
| `fetch_fonts.py` | Re-downloads the typefaces, which are served from this site rather than Google |
| `check_*.py` | The four checks above |

## Licence and credit

The site content, photographs and branding belong to Attarbiya Masjid & Kowneyn Community Centre.

The first version was built by [@zakadinho-create](https://github.com/zakadinho-create); the
initial commit here preserves that work as it was written.
