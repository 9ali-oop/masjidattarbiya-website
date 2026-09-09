# Attarbiya Masjid website - working notes

Official website for **Attarbiya Masjid & Kowneyn Community Centre**, a registered UK charity
in Nechells, Birmingham. Plain static HTML, CSS and JavaScript. No framework, no build step:
edit a file, commit, and it deploys.

Read this before changing anything.

## The facts, in one place

These appear in many files. If any of them changes, it changes **everywhere** - see "Duplication"
below. Never invent a value that is not on this list.

| Fact | Value |
|---|---|
| Name | Attarbiya Masjid & Kowneyn Community Centre |
| Address | 2 Revesby Walk, Nechells, Birmingham B7 4LG |
| Charity number | 1142204 |
| Phone | 07908 854187 (`tel:+447908854187`, `wa.me/447908854187`) |
| Email | info@masjidatarbiya.org (note: **one** 't', and that is correct - see below) |
| Website | masjidattarbiya.org (note: **two** t's) |
| Prayer times | https://masjidbox.com/prayer-times/masjid-attarbiya |
| Facebook | https://www.facebook.com/p/Attarbiya-Masjid-Kowneyn-Community-Center-100088731259188/ |
| Instagram | https://www.instagram.com/masjid.attarbiya/ |
| YouTube | https://www.youtube.com/@MasjidAttarbiyaBirmingham |

**The email really does have one 't'.** `masjidatarbiya.org` has live Google Workspace mail
records, so that address works; our website domain `masjidattarbiya.org` has no mail records at
all. The two simply have different histories. Do not "correct" the email to match the website.
(If you ever want `info@masjidattarbiya.org` to work as well, Cloudflare Email Routing forwards
it free.)

**Open question:** the masjid's own signage shows a phone number beginning `07929`, which matches
neither the number above nor an older leaflet. The number above comes from the Charity Commission
register. Confirm with the trustees before relying on either.

## Rules

1. **Never publish anything we cannot verify.** No invented opening hours, class times, fees,
   teacher names or facilities. If a fact is not in the table above or confirmed by the masjid,
   it does not go on the site. An earlier draft of this site published invented service
   descriptions and guessed opening hours; that is what most of the cleanup was about.
2. **Never hardcode prayer times.** They go stale within a day and that is precisely what made
   the masjid's previous website a problem. See "Prayer times" below for how they actually work.
3. **Never break the donation flow.** See "Donations" below.
4. **Plain hyphens, not em dashes,** in all copy.
5. **British English** throughout.

## Prayer times

Prayer times are **not** an iframe any more, and are **not** hand-written into the HTML.

- `scripts/fetch_prayer_times.py` reads the masjid's own Masjidbox page, pulls the timetable out
  of the JSON embedded in it, and writes `assets/prayer-times.json` - about a week of start times,
  iqamah times, hijri dates, and Jumu'ah as its own field.
- `.github/workflows/prayer-times.yml` runs that daily at 02:20 UTC and commits any change.
- `js/main.js` renders it into `<div id="prayer-times">` on the homepage and the prayer times page.

Two things to respect:

- **Jumu'ah is its own field, not Friday's Dhuhr.** They are different times (13:30 vs 13:09).
  An earlier version relabelled Dhuhr and would have published the wrong khutbah time.
- **Failure must stay honest.** If the JSON is missing, or has no entry for today, the page says
  so and links to the live Masjidbox page. It must never fall back to guessed or stale times.

To refresh by hand: `python scripts/fetch_prayer_times.py`

## Duplication, and the checks that police it

The header and footer are copy-pasted into every page. There is no templating, so a change to the
phone number, a nav item or a footer link means editing **every** page. This has already gone wrong
once: three pages kept an old footer carrying a stale "site rebuilt" note and hardcoded Jumu'ah times.

The fix is a single source of truth plus a checker:

- `partials/header.html` and `partials/footer.html` are canonical.
- `python scripts/sync_chrome.py` stamps them into every page, setting the active nav link.
- `python scripts/sync_chrome.py --check` reports drift without changing anything.

**Edit the partials, then run the sync. Never edit a header or footer inside a page.**
(`404.html` is excluded on purpose: GitHub Pages serves it for any missing path, so it needs
root-relative asset URLs that the other pages must not use.)

Three checks run in CI on every push, and are worth running before you commit:

```bash
python scripts/sync_chrome.py --check   # header/footer identical across pages
python scripts/check_links.py           # no broken links or root-relative paths, balanced tags, one h1
python scripts/check_facts.py           # contact details consistent, no hardcoded prayer times
python scripts/check_data.py            # prayer times data valid, in order, and still current
```

`check_data.py` matters most of the four: `assets/prayer-times.json` is the only file that changes
on its own, written by a scheduled scrape of a third party, so it is the most likely thing to break
quietly. It catches missing prayers, times out of order, a Jumu'ah copied from Dhuhr, and data that
has gone stale because the daily job stopped.

This duplication is deliberate for now: a build step would add a toolchain that a volunteer
cannot debug, and the site is only five pages. **Revisit when news or blog posts are added** -
that is the point at which a static site generator (Eleventy) plus a git-based CMS earns its
keep, because a CMS writes markdown and markdown needs building into pages.

## Donations

The donation page links directly to **GoCardless payment templates**. Treat these as live
financial infrastructure:

- Never edit, add or remove a `pay.gocardless.com/BRT...` link without checking the verified
  link map in `INTEGRATION.md` in the donation repo, and opening the page to confirm the amount
  and type (one-off vs recurring) it actually shows a donor.
- There are exactly **nine tiers on each tab**: £5, £10, £20, £50, £100, £250, £500, £1,000,
  £2,000. The old £1 and £2 tiers were retired by the masjid's management and must not return.
- Four one-off templates exist in GoCardless that wrongly bundle a recurring Direct Debit mandate
  into a "one-off" payment. They are not used here and must never be linked.
- **Do not add `target="_blank"`** to payment links. GoCardless returns the donor to this site
  with `?thanks=oneoff` or `?thanks=monthly`, and `js/main.js` shows a thank-you banner. Opening
  checkout in a new tab strands that redirect.

## Design

The palette and type are sampled from the masjid's logo and shared with the donation page.

| Token | Value | Use |
|---|---|---|
| `--green` | `#42bac5` | fills, borders, backgrounds - **not text** |
| `--green-text` | `#17808a` | teal text and links (4.68:1 on white, passes AA) |
| `--green-dark` | `#1a7078` | headings, footer, banners |
| `--green-ink` | `#0e4a50` | darkest teal |
| `--gold` | `#d4ae61` | fills only - fails contrast as text |
| `--gold-deep` | `#b08d3f` | deeper gold |

Headings use **Marcellus**, body uses **Inter**. Bright teal and gold both fail WCAG AA as text
on white, so use `--green-text` for anything readable.

## Accessibility, don't regress it

Every page has one `<h1>`, a `<main id="main">` landmark, a skip link, and visible focus styles.
Tap targets are at least 44px. The site respects `prefers-reduced-motion`. Keep all of that.

## Parked, waiting on content

Nothing here is blocked by code. Each needs material from the masjid first.

**Photography.** The youth team are taking these; drop them in `assets/` and they get placed:
1. Exterior, bright day, straight on from across Revesby Walk so the sign reads. Landscape.
2. The entrance at an angle, door open.
3. Prayer hall empty, from the back corner toward the mihrab, lights on. Landscape.
4. The mihrab and minbar closer up - the marble wall is the most photogenic thing here.
5. A madrasah classroom, empty, set up as if a class is about to start.

Landscape, not cropped tight - text gets placed over these. `assets/prayer-hall.jpg` is a
stopgap pulled from a WhatsApp export; replace it when a better one exists.

**Instagram.** `masjid.attarbiya` is public and the youth team run the account, but anonymous
scraping gets HTTP 429 immediately. It needs a logged-in session, run locally by someone on the
team - never paste credentials into a chat:

```bash
instaloader --login YOUR_USERNAME --no-videos --no-metadata-json --fast-update masjid.attarbiya
```

For twenty or thirty photos, saving them from the app by hand is honestly quicker.

**Events and madrasah pages.** Waiting on real details: which classes run on which days
(Tue/Wed/Sat/Sun), term dates, ages, whether places are open. Past events can be built from
posters the masjid itself published.

**Photos of people.** Running the masjid's accounts covers content the masjid published. It does
not cover individual likenesses, and much of the available material shows teenagers. Group shots
need a quick "can we put this on the website?" first, and anything involving children needs
parental consent - the masjid runs children's classes, so that standard applies here anyway.

## Not currently published

`services.html`, `events.html`, `madrasah.html` and `registration.html` were removed from the
launch scope because their content was invented or, in the case of registration, collected
children's personal data through an embedded Google Form with no privacy notice. They remain in
git history (see the first commit) and can be restored once there is real content and, for
registration, a privacy notice and a decision on who owns the data.

## Deploying

Pushing to `main` publishes automatically via GitHub Pages.
Preview: https://9ali-oop.github.io/masjidattarbiya-website/

**Note on link previews before cutover:** every page's `og:image`, `og:url` and `canonical` point
at `https://masjidattarbiya.org/...`, which is the intended final home but is currently served by
the donation-page repo. So sharing the github.io preview link will *not* show a preview card yet.
That is expected; the tags become correct the moment the domain moves. Do not "fix" them by
pointing at github.io unless you also remember to change them back at cutover.

The custom domain masjidattarbiya.org currently points at the **separate donation-page repo**.
It moves here only once this site is clearly better than what is already live. When it does,
follow the cutover checklist in `INTEGRATION.md` in that repo - in particular, the 22 GoCardless
redirect URLs must be updated in the same pass or donors will land on a dead page after paying.
