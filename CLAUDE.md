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

## Events

`events.html` renders two lists, both from JSON, neither typed into the markup.

**`assets/events.json` is written by hand and reviewed before it is published.** That is
deliberate and should stay that way. Everything on it carries an `evidence` field saying how we
know the event happened; `scripts/check_events.py` fails the build if one is missing.

Where the current entries came from, so nobody has to re-derive it:

- Six are quoted from the masjid's own Instagram announcements, which are readable without
  logging in because Instagram still serves the full caption in a post's `og:description`.
- Three are transcribed from the masjid's event posters by the volunteer who built the first
  version of this site. Each states a weekday and a date, and every one of those pairs resolves
  to exactly one year, which is why the years are trusted. They are the least certain entries
  here; if a trustee can confirm them, say so in the `evidence` field.
- Two Eid entries carry a month and no day, because the announcements gave prayer times but never
  a calendar date. Do not fill those in by calculating Eid yourself - it moves with the sighting
  and with what the masjid decided that year.

**Three traps, all of which have already been hit once:**

1. **A post's date is not the event's date.** Captions say "Saturday 11th April" with no year, and
   some give a time and no date at all. Nothing about this is machine-readable, which is the main
   reason the events list is not automated.
2. **A third of the best event posts come from a different account that is still the masjid's.**
   Both Youth Nights and the January community evening were posted by **Al Kissaii**, which is not
   an outside partner: the masjid runs it as its programme for teens and older children. **Al
   Furqan** is the same arrangement for the madrasah. Treat all three as one organisation under
   different names, credit the right one, and never describe them as a partnership. The events
   that came from those accounts carry a `credit` line saying which programme ran them.
   Note this also means the Instagram API, which returns only the masjid's own account's media,
   will miss anything posted under the Al Kissaii or Al Furqan accounts.
3. **Captions contain things that must not be republished here.** The summer course post carries a
   volunteer's mobile number and the Ramadan appeal carries the charity's sort code and account
   number. On the masjid's own Instagram that is its choice. Mirrored onto this site, next to a
   donate page and indexed by search engines, it becomes a fraud risk. `check_events.py` blocks
   bank details, phone numbers and email addresses in event copy.

### Recorded talks

`assets/youtube.json` and `assets/youtube/*.jpg` are refreshed nightly by
`scripts/fetch_youtube.py` (`.github/workflows/youtube.yml`, 03:40 UTC). **This needs no API key,
no login and no secret** - the channel's Atom feed is public. Channel `UCHTSGHCZzLQVVjYPDMlnMlg`.

Four things that script is careful about, each for a reason worth keeping:

- It **accumulates by video id**. The feed only returns the newest 15, so a wholesale overwrite
  would silently drop older talks once the channel grows past fifteen.
- It sorts on `published`, never `updated` - `updated` changes whenever YouTube touches metadata.
- It **downloads thumbnails into the repo**. Hotlinking `i.ytimg.com` would make this the only
  page that contacts a third party, which the privacy notice explicitly denies. Note that YouTube
  answers a missing thumbnail size with HTTP 404 *and* a grey JPEG body, so the script checks the
  status code and the byte size.
- It **drops video descriptions entirely**, for the same bank-details reason as above.
- Do not move the cron into 09:00-12:00 UTC: Google's feed endpoint has been throwing intermittent
  404s and 500s in that window since late 2025.

### Instagram sync

`scripts/fetch_instagram.py` + `.github/workflows/instagram.yml` (04:10 UTC) pull the masjid's own
posts into **`staging/instagram.json`**. `_config.yml` excludes `staging/` from the built site and
`events.html` never reads it, so **this publishes nothing**. A person moves an entry into
`assets/events.json`, with a real event date, to publish it. That gate is the whole point: the API
returns when a post was made, never when the event happened, and captions say things like
"Saturday 11th April" with no year.

Needs one secret, `IG_TOKEN`, with scope `instagram_business_basic` (read-only). App
`1536463652013581`, account `17841465709272542`, unpublished, the account holds the Instagram
Tester role. The token is long-lived but finite: the job calls `refresh_access_token` each night,
prints the days remaining, and **deliberately fails when under 14 days** so the failure email
arrives while there is still time to replace it. If Meta ever returns a *different* token string,
the job says so - it cannot write a new value into the secret by itself.

Captions are redacted on the way in (sort codes, account numbers, phone numbers) and
`check_events.py` blocks the same things on the way out.

Images are downloaded immediately because Instagram's `media_url` links expire within hours.

### What was deliberately not automated, and why

Researched properly in September 2026; do not redo this without reading it.

Confirmed from Meta's documentation in September 2026: **"Instagram API with Instagram Login"
does not require a Facebook Page to be linked to the account.** Nobody needs to create a Facebook
account or link Pages to make this work, and nobody should create a throwaway one to try.

| Route | Verdict |
|---|---|
| YouTube Atom feed | **Built.** No credentials, nothing expires. |
| Facebook Page | **Rejected on content, not plumbing.** The Page has 7 followers and 5 public items, the newest from May 2023, and not one is an event. A never-expiring Page token is genuinely obtainable, so revisit only if the masjid starts posting there. Also: a *second* Facebook page for the masjid ranks higher in search - somebody should work out which one is real. |
| Instagram Graph API | **Possible, not yet built.** Needs the account converted to Business or Creator, a Meta app, and a 60-day token that a nightly job must keep refreshing. No App Review needed to read your own posts. The catch is that GitHub disables scheduled workflows in a quiet public repo after 60 days, which is the same window - so both clocks can run out together. A System User token in a Meta Business portfolio never expires and removes that trap. |
| Scraping Instagram with a login | **Rejected outright.** Anonymous requests for this account already return HTTP 429, instaloader's own issue tracker shows logged-in sessions hitting 429s and `feedback_required` blocks, and Meta's terms make automated collection grounds for disabling the account. The masjid's account is worth more than the feature. |

**Never accept a password for any of these.** If a token is ever needed it is created by the
account owner and pasted by them into the repo's Settings > Secrets and variables > Actions. It
does not go in a file, a commit, or a chat message.

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

| `--gold-text` | `#7a5c1f` | the only gold safe as text (6.22:1 on white) |

Headings use **Marcellus**, body uses **Inter**. Bright teal and gold both fail WCAG AA as text
on white, so use `--green-text` or `--gold-text` for anything readable.

**The typefaces are served from this site, not from Google.** `css/fonts.css` and
`assets/fonts/` are generated by `python scripts/fetch_fonts.py`; edit that script, not the
generated CSS. Only the latin subset at the weights actually used (Inter 400/600/700, Marcellus
400) is downloaded, which keeps it to 155KB. If content ever needs accented characters - macrons
in transliteration, say - add `latin-ext` to `SUBSETS` in that script and re-run it.

The result is that **no third party is contacted on any page except the Google map on the
contact page.** That is worth protecting: the privacy notice says so in as many words.

## Accessibility, don't regress it

Every page has one `<h1>`, a `<main id="main">` landmark, a skip link, and visible focus styles.
Tap targets are at least 44px. The site respects `prefers-reduced-motion`. Keep all of that.

## Photographs

**Never render a photo larger than it actually is.** The source pictures are phone photographs
around 900px wide; stretched across the 1140px container one both dominates the page and goes
visibly soft. `.photo-figure` is capped at 680px for that reason. Check a new image at desktop
width, not just on a phone - a portrait photo at full container width can run to one and a half
screen heights.

Prefer landscape crops. Text sits better beside them and they do not push the rest of the page
off the screen.

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

`services.html`, `madrasah.html` and `registration.html` were removed from the
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
