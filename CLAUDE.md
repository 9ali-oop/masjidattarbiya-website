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
| Registered name | Kowneyn Education and Cultural Centre (what donors see at GoCardless checkout) |
| Madrasah | **Madrasah Al Furqan** (مدرسة الفرقان), the masjid's own madrasah - not a separate organisation |
| Address | 2 Revesby Walk, Nechells, Birmingham B7 4LG |
| Charity number | 1142204 |
| Phone | 07908 854187 (`tel:+447908854187`, `wa.me/447908854187`), confirmed by the masjid 7 October 2026 |
| Email | info@masjidatarbiya.org (note: **one** 't', and that is correct - see below) |
| Website | masjidattarbiya.org (note: **two** t's) |
| Prayer times | https://masjidbox.com/prayer-times/masjid-attarbiya |
| Contact form | Formspree form `xqpzjjee` (`https://formspree.io/f/xqpzjjee`), delivering to info@masjidatarbiya.org; the masjid holds the Formspree login |
| Facebook | https://www.facebook.com/p/Attarbiya-Masjid-Kowneyn-Community-Center-100088731259188/ |
| Instagram | https://www.instagram.com/masjid.attarbiya/ |
| YouTube | https://www.youtube.com/@MasjidAttarbiyaBirmingham |
| Madrasah timetable | Five groups, six days a week, no classes on Friday. Group 1 Saturday 10:00 to 13:00 and Monday and Wednesday 17:00 to 19:00; Group 2 Sunday 10:00 to 13:00 and Tuesday and Thursday 17:00 to 19:00; Group 3 Saturday and Sunday 14:00 to 17:00; Group 4 (older boys and men) Monday and Wednesday 19:00 to 21:00; Group 5 (women) Sunday 14:00 to 18:00. Children learn the Qaidah, then the Qur'an, and tarbiyah. Confirmed by Malim Husain, the madrasah's management, 9 October 2026 |
| Weekly class | Riyadh al-Salihin with Sheikh Abdullahi Harshi, every Saturday and Sunday between Maghrib and Isha, brothers only (confirmed by Ali, 10 October 2026) |
| Sisters | A sisters' prayer area with its own entrance: facing the masjid, sisters' entrance on the left, brothers' on the right (confirmed 7 October 2026) |
| Jumu'ah | One Jumu'ah each Friday; khutbah usually in Arabic and English, sometimes English only (confirmed 7 October 2026) |
| Opening | Open for Fajr and closed shortly after it; open again from Dhuhr until shortly after Isha. No fixed clock hours: they move with the prayer times (confirmed by Ali, 21 October 2026) |
| Access | Step-free entrance. No car park of the masjid's own; parking on the streets nearby (confirmed by Ali, 21 October 2026) |

**The email really does have one 't'.** `masjidatarbiya.org` has live Google Workspace mail
records, so that address works; our website domain `masjidattarbiya.org` has no mail records at
all. The two simply have different histories. Do not "correct" the email to match the website.
(If you ever want `info@masjidattarbiya.org` to work as well, Cloudflare Email Routing forwards
it free.)

**The phone number is settled.** The masjid's signage shows a number beginning `07929`, but the
masjid confirmed on 7 October 2026 that 07908 854187 (the number on the Charity Commission
register) is the one to publish. The 07929 number on the sign is Malim Husain's, the madrasah's
management. On 9 October 2026 he sent the three maalims' names and mobiles for the site (Husain,
Aden, Shaafici); Ali holds them, they are not in this repo, and they go on the madrasah page only
once each maalim has agreed to be named. Until the facts table carries a number,
`check_facts.py` blocks it.

## Rules

1. **Never publish anything we cannot verify.** No invented opening hours, class times, fees,
   teacher names or facilities. If a fact is not in the table above or confirmed by the masjid,
   it does not go on the site. An earlier draft of this site published invented service
   descriptions and guessed opening hours; that is what most of the cleanup was about.
   **The one agreed exception** is the madrasah's timetable, term dates, group descriptions,
   places and resources (`assets/madrasah.json`), which the masjid asked for as placeholders in
   October 2026 so the page could be designed and reviewed. Every one of them is marked
   `"placeholder": true` and carries a visible "To be confirmed" label on the page. On 7 October
   2026 the masjid widened this: a detail a page genuinely needs, which the masjid has not yet
   confirmed, may appear as a **labelled** placeholder (the `.tbc` "To be confirmed" chip) so
   the page can be built and reviewed, provided it is also on the list of questions for the
   masjid (the "Questions for the masjid admins" doc). Never an unlabelled placeholder, never
   a made-up fee, name or phone number, and never anything a visitor could act on wrongly
   (a prayer time, an address, an opening hour).
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
- `js/main.js` renders it into four places: today's card (`#prayer-times`, homepage and prayer
  times page), the week grid (`#prayer-week`), the "Next" line in the top bar of every page
  (`#topbar-next`) and the Jumu'ah note on the homepage (`#visit-jumuah`).
- **"Next" is measured against the iqamah**, not the start time, because that is when the
  congregation stands. A prayer that has begun but whose jama'ah has not is still next.
- **A start time of exactly 00:00 is a placeholder, not a time.** Masjidbox once published an
  Isha of 00:00; the fetch script now drops such values, the page shows a dash for the start
  and still shows the iqamah, and `check_data.py` fails if one ever gets through.

Two things to respect:

- **Jumu'ah is its own field, not Friday's Dhuhr.** They are different times (13:30 vs 13:09).
  An earlier version relabelled Dhuhr and would have published the wrong khutbah time.
- **Failure must stay honest.** If the JSON is missing, or has no entry for today, the page says
  so and links to the live Masjidbox page. It must never fall back to guessed or stale times.

To refresh by hand: `python scripts/fetch_prayer_times.py`

**The week can be printed.** The prayer times page has a "Print this week" button and a print
stylesheet that leaves only the masjid's name, the week table and where the times come from:
the fridge-door timetable every big masjid offers as a PDF, without a PDF to keep up to date.
Masjidbox only embeds seven days in its page, so a monthly table is not possible from it.

## Duplication, and the checks that police it

The header and footer are copy-pasted into every page. There is no templating, so a change to the
phone number, a nav item or a footer link means editing **every** page. This has already gone wrong
once: three pages kept an old footer carrying a stale "site rebuilt" note and hardcoded Jumu'ah times.

The fix is a single source of truth plus a checker:

- `partials/header.html` and `partials/footer.html` are canonical, and **every page carries
  them**, the madrasah's pages and the donate page included. The madrasah's pages once had a
  header of their own; the masjid found the switch between two headers and two palettes
  confusing, so since 7 October 2026 there is one header everywhere and the madrasah pages add
  a slim sub-navigation strip (`.subnav`, written into `madrasah.html` and `portal.html`)
  under it, with the madrasah's logo and its sections.
- `python scripts/sync_chrome.py` stamps them into every page, setting the active nav link
  (with `aria-current="page"`; `ACTIVE_AS` maps `portal.html` to the "Madrasah" item). New
  pages must be added to its page list.
- `python scripts/sync_chrome.py --check` reports drift without changing anything.

**Edit the partials, then run the sync. Never edit a header or footer inside a page.**
(`404.html` is excluded on purpose: GitHub Pages serves it for any missing path, so it needs
root-relative asset URLs that the other pages must not use.)

These checks run in CI on every push, and are worth running before you commit:

```bash
python scripts/sync_chrome.py --check   # header/footer identical across pages
python scripts/check_links.py           # no broken links or root-relative paths, balanced tags, one h1
python scripts/check_facts.py           # contact details consistent, no hardcoded prayer times
python scripts/check_data.py            # prayer times data valid, in order, and still current
python scripts/check_events.py          # events evidenced, posters local, no contact details in copy
python scripts/check_madrasah.py        # madrasah data well formed; lists what is still a placeholder
python scripts/check_notices.py         # notices well formed, dated, and free of contact or bank details
```

`check_data.py` matters most of the four: `assets/prayer-times.json` is the only file that changes
on its own, written by a scheduled scrape of a third party, so it is the most likely thing to break
quietly. It catches missing prayers, times out of order, a Jumu'ah copied from Dhuhr, and data that
has gone stale because the daily job stopped.

This duplication is deliberate for now: a build step would add a toolchain that a volunteer
cannot debug, and the site is still only a dozen pages. **Revisit when news or blog posts are added** -
that is the point at which a static site generator (Eleventy) plus a git-based CMS earns its
keep, because a CMS writes markdown and markdown needs building into pages.

## Donations

**`donate.html` is a page of the site with the original amount card at its heart.** The page
came from the one-page donation site that was live on masjidattarbiya.org until 7 October
2026. On 8 October the masjid said it looked like a different site, so it now has the teal
heading band, a lede, and the site's own lists: the hadith as a plain quote, and "Giving
safely" (the charity number and the registered name a donor sees at checkout, GoCardless,
this is the only donation page) as a `.facts` list beside the card. The Visit card went; the
footer carries the address. **The amount card is still the original**: its tabs, amounts,
button and secure note are the original markup, its styles are scoped under `.donate-page`
(which now wraps only the card, so the site's stylesheet cannot restyle the card and the
card's colours cannot leak out), and the amounts and links live in the `LINKS` object in the
page's inline script. The `?thanks=` banner is shown by `js/main.js`, as on every page; the
page has no copy of that script, so a donor is never thanked twice. The quote is set in
`--gold-text`, which passes AA; the old 3.1:1 gold box is gone.

The donation page links directly to **GoCardless payment templates**. Treat these as live
financial infrastructure:

- Never edit, add or remove a `pay.gocardless.com/BRT...` link without checking the verified
  link map in `INTEGRATION.md` in the old donation repo (`9ali-oop/masjid-attarbiya`), and opening the page to confirm the amount
  and type (one-off vs recurring) it actually shows a donor.
- There are exactly **nine tiers on each tab**: £5, £10, £20, £50, £100, £250, £500, £1,000,
  £2,000. The old £1 and £2 tiers were retired by the masjid's management and must not return.
- Four one-off templates exist in GoCardless that wrongly bundle a recurring Direct Debit mandate
  into a "one-off" payment. They are not used here and must never be linked.
- **Do not add `target="_blank"`** to payment links. GoCardless returns the donor to this site
  with `?thanks=oneoff` or `?thanks=monthly`, and `js/main.js` shows a thank-you banner. Opening
  checkout in a new tab strands that redirect.

## Contact form

`contact.html` carries a form (name, email, optional phone, message) that posts to the
masjid's **Formspree** form, `https://formspree.io/f/xqpzjjee`, which emails each message to
the masjid's inbox. Formspree is the only thing on the site that a visitor's own words are
sent to, and nothing goes to it until they press Send; the privacy notice says so under "If
you contact us". Things to keep as they are:

- `js/main.js` sends the form in the background (`Accept: application/json`) and shows the
  result in place, hiding the form on success. Without script, or if the request fails, the
  browser posts the form itself and Formspree shows its own thank-you page. If the masjid
  wants visitors back on our page instead, set the form's "Thank You" redirect in Formspree
  to `https://masjidattarbiya.org/contact#sent`: the page shows the `#sent` message via
  `:target`.
- **reCAPTCHA must stay off** for this form (Formspree: form Settings > Spam protection).
  With it on, background sending is rejected and every visitor falls through to Formspree's
  page. Spam is caught by the hidden `_gotcha` honeypot (hidden by the `.gotcha` class, never
  removed) and Formspree's own filtering.
- The `email` field is the Reply-To, so the masjid can answer from its inbox; the hidden
  `subject` field sets the email's subject line.
- **The form ID is public** (it is in the HTML) and is not a secret. The Formspree account
  login is the masjid's and never goes in the repo, a commit or a chat message. The free plan
  allows 50 messages a month, keeps 30 days of history in Formspree's inbox, and notifies up
  to two addresses; if the masjid outgrows that, it is a paid plan, not a code change.
- `check_facts.py` still polices contact details on the page; the form's own copy must not
  carry a phone number or email beyond the masjid's.

## Notices

`assets/notices.json` holds short, dated announcements: an Eid prayer time, a changed iqamah,
a closure, a Ramadan programme. `js/main.js` shows up to three current ones in the `.notices`
box on the homepage and the prayer times page; each has `from` and `until` dates (inclusive,
UK), so a notice disappears by itself the day after. With nothing current the box is empty
and takes no space. Write them by hand, like events; `check_notices.py` fails on a bad date,
a missing `until`, or a phone number, email or bank detail in the text (link to the contact
or donate page instead). This is how the big masjid sites handle Eid and Ramadan: a dated
notice, not a rewrite of the page.

## Events

`events.html` renders two lists, both from JSON, neither typed into the markup. The homepage
also shows the three most recent events and the newest talks from the same files.

**Posters.** An event can carry `image` and `image_alt`: the masjid's own poster, copied into
`assets/events/<event-id>.jpg` at about 560px wide. Never hotlink Instagram (links expire and it
would contact a third party), never use a poster that shows a phone number or bank details
(the Qur'an Intensive poster was cropped to remove a volunteer's mobile), and prefer posters
to photographs of people. `check_events.py` enforces the location and the alt text.

**Regular classes live in the markup of `events.html`, under "Every week", not in `events.json`,**
which is for dated events. The first is Riyadh al-Salihin (facts table). Its book cover,
`assets/riyadh-al-salihin.jpg`, is a Wikimedia Commons photograph of the Dar Ibn Kathir edition
by the Commons user أبو آسر, licensed CC BY-SA 4.0, stored here at its native 490px rather than
hotlinked (the site loads nothing from third parties); the page carries the credit and the
licence link, which the licence requires, so never drop that caption. Wikimedia rate-limited
this session's downloads (HTTP 429); the file came through the images.weserv.nl proxy. The homepage's "What's on" and the
prayer times aside carry a one-line mention that links to `events#weekly`.

**`assets/events.json` is written by hand and reviewed before it is published.** That is
deliberate and should stay that way. Everything on it carries an `evidence` field saying how we
know the event happened; `scripts/check_events.py` fails the build if one is missing.

Where the current entries came from, so nobody has to re-derive it:

- Most are quoted from the masjid's own Instagram announcements, now pulled through the API into
  `staging/instagram.json`.
- **One** is transcribed from a poster by the volunteer who built the first version of this site:
  the December 2023 Winter Conference. It predates the Instagram account, whose first post is 18
  March 2024, so there is no second source for it. Two others that rested on transcriptions - the
  January 2025 Winter Conference and the February 2025 Objectives of Fasting - have since been
  confirmed against the masjid's own posts, which also proved the transcriptions were accurate.
- Eid entries carry a month and no day where the announcement gave prayer times but never a
  calendar date. Do not fill those in by calculating Eid yourself - it moves with the sighting
  and with what the masjid decided that year. Eid al-Fitr 2026 now has its day because the
  masjid's own poster in that post states it: Friday 20 March 2026.

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

### Recordings from YouTube

The site calls these "recordings", not "talks": the channel carries recitations and prayers
(a Tahajjud recording, for one) as well as lectures, and labelling a prayer a talk was wrong.

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
| Instagram API with Instagram Login | **Built, staged not published** - see the Instagram sync above. Confirmed in practice: the dashboard token is long-lived (the first run reported 59 days left) and no App Review, Page or business verification was needed. **Known problem:** each nightly refresh returns a *different* token string, and the job cannot write that back into the repository secret, so the stored token still dies on its original 60-day clock. Either add a fine-grained PAT with Secrets write so the job can rotate it, or replace the token by hand when the job starts failing at 14 days. |
| Scraping Instagram with a login | **Rejected outright.** Anonymous requests for this account already return HTTP 429, instaloader's own issue tracker shows logged-in sessions hitting 429s and `feedback_required` blocks, and Meta's terms make automated collection grounds for disabling the account. The masjid's account is worth more than the feature. |

**Never accept a password for any of these.** If a token is ever needed it is created by the
account owner and pasted by them into the repo's Settings > Secrets and variables > Actions. It
does not go in a file, a commit, or a chat message.

## Our Story (the history timeline)

`history.html` renders `assets/history.json`. It is **in the nav and the sitemap** as "Our
Story", modelled on Green Lane Masjid's two-part history (the building, then the mosque), with
each milestone tagged by strand (`charity`, `building`, `learning`, `community`) and filter
buttons for each.

**A written history, read in one direction** (rebuilt 21 October 2026 at Ali's request; he
found the timeline with its gold spine, dots, rolling year and sticky rail looked like every
AI-made timeline, and that it jumped about in time). It is laid out the way a local history
would be printed, after East London Mosque's history of the London Muslim Centre and Green
Lane's history of its building: the year in the margin, a short account, an archive
photograph at its own shape with its caption, the source in small type, hairlines between
entries. **No spine, no dots, no cards, no strand pills, no rail, and nothing moves.** The
heading band is unchanged (Ali likes it). Under it, a line of links to the three chapters and
the strand filters as quiet text buttons (the current one in bold with a gold underline, as in
the main menu).

**Three chapters, in the order things happened:** Garrison Lane (الجذور, the roots), Revesby
Walk (الدار, the house) and Today (اليوم). They live in `chapters` in `history.json`, each
milestone names its `chapter`, and **the file keeps the milestones in date order**: the page
renders them in that order, so keep new ones in their place. Chapters are labelled by the year
they start ("From 2004", "From 2019", "From 2023"), never with an end year: nothing on record
says when Garrison Lane ended (the accounts give it as the principal office until March 2022,
and the move and the last prayer there are open questions). Each chapter opens with its Arabic
name over its English one, as in the heading bands, its introduction, and its photograph
beside them on a wide screen.

**Asides.** A milestone with `"aside": "<line>"` is set apart in a plain white box under that
line, and consecutive milestones with the same line share the box. Two runs use it: the
building's own past ("On Revesby Walk, before it was ours": the unknown years before the club,
and the Vauxhall Sports and Social Club from October 2007), placed at 2007 in the Garrison Lane
chapter; and "Looking back at Garrison Lane" (the "To 2022" entry that closes the Revesby Walk
chapter). They are how the page tells the building's story and looks back without jumping
about. One line was trimmed in the rebuild ("This is the turning point of the whole story.",
dramatic copy); every other word, ask and source is as it was.

Milestones and chapters can be linked to directly: `history#m-madrasah`, `history#revesby`.
One with no known chapter still shows, in a group at the end.

**Only what is known is shown** (Ali, 22 October 2026). Milestones with `"status": "unknown"`
stay in `history.json` with their `asks`, but the page leaves them out until the people who
were there have answered: the plan is to sit down with the original teachers (an interview
sheet in date order, with a request for old photos and permission to use them, was written
for that). The page used to show them as dashed "unfinished page" cards with their questions
and an "I remember this" button, and every entry ended with its source; Ali found both
cluttered. Now each entry is a year, a heading, a paragraph and sometimes a picture, one line
under the story says where the dates come from, and the single "Were you there?" band at the
end does the asking. `source` and `asks` are still required in the file: they are how we know,
and what to ask. To publish an answered one, give it a year, a `source`, set `status` to
`confirmed` and delete its `asks` list.

**What is evidenced.** Researched properly on 7 October 2026 from official records. Read this
before redoing it.

- Declaration of Trust dated 3 September 2006, as the Somali Education and Cultural Centre
  (Charity Commission register). Registered 2 June 2011, number 1142204. Governing document
  amended 5 March 2021. **The registered name today is Kowneyn Education and Cultural Centre**;
  an earlier draft wrongly said 2021 renamed it "Attarbiya Masjid and Kowneyn Community Centre".
- The governing document's area of benefit is **Bordesley Green**. The charity's own accounts
  (downloadable from the register) give its principal office as **The Garrison Centre, 106
  Garrison Lane, B9** up to 2021/22, and 2 Revesby Walk from 2022/23.
- **The building was the Vauxhall Sports and Social Club, not a pub.** Companies House has a
  "Vauxhall Sports and Social Club Community Interest Company" (06409217) with its registered
  office at 2 Revesby Walk, incorporated October 2007, dissolved June 2010. The masjid's own
  earlier website (kowneyn.org) says the same.
- **The pub was a different building.** The Ashted Hamlet stood on Revesby Walk from 1966 to
  1997 and was demolished around 2007, replaced by a community resource centre
  (closedpubs.co.uk, Birmingham History Forum). That is where the "it used to be a pub" memory
  comes from. A 2005 forum post also places the East Birmingham Constitutional Club ("the
  Conservative club") "at the top of Revesby Walk"; whether that was the same building as the
  Vauxhall club is an open question on the page, not a fact.
- **June 2019: the charity acquired 2 Revesby Walk.** HM Land Registry's price paid data records
  a sale of 2 Revesby Walk on 14 June 2019, and every balance sheet from 2020/21 lists "land and
  buildings" at exactly that price. The site does not publish the price.
- The accounts show heavy spending on "premises repairs and renewals" in each year from
  2020/21 to 2022/23: the conversion into a masjid.
- Registered activities: after-school club and supplementary education. Policies on file include
  safeguarding, complaints, and bullying and harassment. Not recognised by HMRC for Gift Aid, so
  never mention Gift Aid on the donate page.
- The Winter Conference of December 2023 (poster), the Instagram and YouTube accounts in March
  2024, the summer Qur'an Intensive of 2025 (Instagram).

**Three loose ends for the trustees, found along the way, none of them published:**

1. The register's governance page says the charity "does not own and/or lease land or
   property", which contradicts its own accounts. The next annual return should correct it.
2. The accounts call the building "freehold"; Land Registry records the 2019 sale as leasehold.
3. A separate company, Kowneyn Community CIC (15241519, incorporated 27 October 2023), is
   registered at 2 Revesby Walk. The site does not mention it; worth knowing it exists.

The accounts also show the building was partly funded by loans from members, still being
repaid. That is the community's business, not the website's.

**The masjid's own archive (13 October 2026).** The vicarage gave the masjid an external
drive: 133GB of backups from the Garrison Lane years, 2004 to 2024. Ali holds the copy
on his own computer (`Documents\Attarbiya archive\`, with a catalogue and a private
`findings.md`). **None of it is in this repo, and none of it ever goes in**: it holds pupil
registers, fee and donor lists, bank details, other people's private papers and hundreds
of photos of identifiable children. What it established, now on Our Story:

- **The madrasah came first.** Madrasah Al Furqan moved into the Garrison Centre, 106
  Garrison Lane, Bordesley Green B9 4BS, in December 2004 with about 50 children.
- **The masjid opened there in January 2007** as Masjid Dar al-Tarbiya (SOS Education
  Organisation's description of the centre; the masjid's own 2012 appeal leaves the year
  blank, so the page asks whether it is right).
- **Where "Attarbiya" comes from:** the charity's letterhead gives its Arabic name as
  دار التربية والثقافة الصومالية, Dar al-Tarbiya wal-Thaqafa al-Somaliya.
- From April 2007 the charity used the Garrison Centre under a licence from SOS Education
  Organisation, which held the lease from Birmingham City Council.
- First youth conference 16 April 2011; **Al Furqan and the masjid's own school became one
  school on 1 July 2012**; Ramadan tafsir, iftar, tarawih and i'tikaf; Eid prayers in
  Garrison Lane park; "Al-Kownayn Centre" (Masjid Dar-Attarbiyah & Madrassa Al-Furqan) by
  June 2014, the earliest use of the Kowneyn name found.

**Never published from the archive:** rents, lease terms and negotiations, the takeover and
purchase figures, fundraising amounts and appeal targets (they would reveal the 2019
price), loans, pupil numbers claimed in appeals (800, 900, "largest in Europe"), and the
Garrison Centre building's age (the archive contradicts itself). An archive source is cited
on the page as "in the masjid's archive", never by file path. One 2014 letterhead misprints
the charity number as 11442204; never copy a number from the archive. Photos of children from
the archive stay held back: the opt-out approach in "Photographs" covers the October 2026 shoot,
where the children took part knowingly, not pictures taken years ago.

**Archive pictures on the site** (`assets/history/`, resized, camera data stripped): the
Garrison Centre outside (chapter one; the original has a damaged strip along the bottom,
cropped off), the Al-Kownayn logo (2014) and an earlier Al Furqan logo, the logos shown whole
(`image_fit: "contain"`). The prayer hall and a corridor (November 2012) and a still from the
January 2014 film were taken off on 22 October 2026 as too low in quality; they are in git
history and the archive, and better photos of the Garrison Lane years are one of the things to
ask the original teachers for. **Held back on purpose:** two class photos of
children seen from behind (wait for a parent's written yes), a 2010 whiteboard lesson whose
content is not right for the masjid's public site, a 2010 poster for an SOS Education
Organisation event (not the masjid's, and it carries phone numbers), and pages of a
2012 fire engineers' report (a third party's photographs).

**Nothing on the page animates, on purpose.** Earlier versions revealed cards on scroll, tilted
them in depth, lit the chapter introductions word by word and filled a spine with gold; every
one of those had to be made to fail visible, and together they were what made the page look
templated. If motion ever comes back, the old rule stands: never start anything at
`opacity: 0` waiting for an observer. The rendering is a few dozen lines in `js/main.js`; no
animation library (it would load from a third party, which the privacy notice rules out).

**Photographs:** use Street View history for research only. Publishing Google imagery breaks
their terms, and embedding it live would break the site's no-third-parties promise.

## Madrasah Al Furqan

`madrasah.html` is the madrasah's home, and `portal.html` the front door to its parent portal.
Both carry the site's shared header and footer, plus the madrasah's sub-navigation strip (its
logo, which links to `madrasah.html`, and its sections). **Their pages use the masjid's teal
like every other page**; the madrasah's own colour appears only in its logo. An earlier version
gave the madrasah brown heading bands and its own header, and the masjid found the jump from
teal to brown and back confusing.

**It must always read as part of the masjid**, never as a partner or a separate charity. That
was an explicit request. The page says so in words ("Under one roof") as well as in the design.

- **The name** is Madrasah Al Furqan (مدرسة الفرقان), taken from its logo. Use "Al Furqan" as
  the short form.
- **Confirmed by the madrasah (9 October 2026, Malim Husain):** five groups, six days a week,
  **no classes on Friday**; the timetable in the facts table above. Children learn the Qaidah,
  then the Qur'an, and tarbiyah. The minimum age of 6 was confirmed on 7 October.
- **What the classes cover (Ali, 22 October 2026):** the older children are doing fiqh and Ali's
  class adab and akhlaq. The madrasah draws on a published tarbiyah curriculum with five
  subjects (iman and tazkiyah, the Qur'an and its meaning, fiqh and worship, adab and akhlaq,
  and the sirah and stories) and means to cover all five in time, but not yet. **Never name the
  curriculum or its publisher**, and do not list the five subjects as if they were all taught
  now; keep it general ("lessons in fiqh and in adab and akhlaq as well").
- **Still placeholders** (see Rule 1): which ages go in Groups 1 to 3 (`"who_placeholder"` on
  the group), the term dates, "places", fees and the resources list. They live in
  `assets/madrasah.json`, each flagged, and each shows a "To be confirmed" label. While `"provisional"` is true the page also shows a draft notice. When the madrasah
  confirms an item, correct it and delete its flag; `check_madrasah.py` lists what is left and
  fails if the file claims to be final while placeholders remain. Fees are deliberately "to be
  confirmed" with no placeholder figure.
- **The logos** are in `assets/furqan/`: `madrasah-al-furqan-brown.png` (Arabic with "MADRASAH
  AL FURQAN" underneath) and `madrasah-al-furqan-navy.png` (bold, Arabic only). They were cut out
  of screenshots onto transparent backgrounds, and are small (175 and 507 pixels wide), which
  made them blurry on phones. **The CSS now uses `.svg` files traced from those PNGs** (potrace,
  8x and 4x upscaled, then smoothed), which stay sharp at any size; the PNGs are kept as the
  source. If the madrasah has the original artwork (a real SVG or a large PNG), replace the SVGs
  with it at the same names, which is still worth asking for. They are used as CSS masks
  (`.furqan-logo-brown`, `.furqan-logo-navy`), so one file gives every colour. Under the navy
  logo the English name is set in type, because that logo has none. Mask widths are fixed in
  pixels on purpose: the logo sits in a shrink-to-fit box where a percentage width resolves to
  nothing and the logo silently disappears. The arch's padding is in pixels for a similar
  reason: percentage padding resolves against the grid column, not the arch, and once pushed
  the logo off centre.
- **Brown or navy is undecided.** The choice now affects only the logo: `--furqan` colours the
  logo mask (brown on `:root`, navy on `:root[data-furqan="navy"]`). Add `?furqan=navy` or
  `?furqan=brown` to any page address to preview: a switch appears and the choice sticks for
  the visit. Once the trustees choose, delete the other logo, the switch (top of `js/main.js`)
  and the `.colour-preview` styles.

### The parent portal

`portal.html` is laid out as a guided path for a parent on a phone: WhatsApp and phone buttons
in the heading band (they work today), three steps, one card per job (register, or log in),
then a `details`/`summary` FAQ ("Questions parents ask") and a "Have these ready" list. The
online form and login are **status lines, not disabled buttons**, until Teach 'n Go opens: a
greyed button that does nothing gets tapped repeatedly and blamed on the phone. The page uses
the masjid's teal, at the masjid's request, so it reads as part of the masjid's site. The
FAQ's one unconfirmed answer (fees) carries the "To be confirmed" chip.

**The madrasah will use Teach 'n Go** (chosen October 2026: best rated for ease of use, and
already used by Green Lane's madrasah). `portal.html` is just the front door: a "Register a
child" button for the enrolment form and a "Log in" button, both shown as "opening soon" until
the account exists. The reasoning, the runner-up (e-Maktab) and the switch-on steps are in
**`PORTAL.md`**. A self-built Supabase portal existed briefly and was removed in favour of Teach
'n Go so that parents never meet two systems; it is in git history at `42ed7b3`.

## Design

**Light and simple, on purpose.** In October 2026 the site was briefly redesigned around dark
"night" bands, rows of small arches and a star lattice. The masjid preferred the original look
and asked for it back, so the site now uses the original style with the new pages restyled to
match. **Do not reintroduce dark bands or heavy decoration without asking first.** What the
masjid liked, in its own words: the building's photograph at the top, and a light background,
"not dark green".

- **Homepage:** the building photograph at the top with the name over it, and today's prayer
  times in a white card overlapping it. Below that, light sections alternating with pale teal
  (`.section-alt`), a gold "donate" panel, and the visit details.
- **Inner pages:** a teal heading band (`.page-hero`), centred, with a breadcrumb and the page's
  name in Arabic above its English title.
- **Header and footer:** a slim teal top bar (next prayer, the madrasah, parent login) above a
  white header, and a teal footer with the logo on a white chip.
- **Buttons are pills.** Cards are white with a hairline border and a soft shadow.
- **The madrasah** uses the same teal; its logo (the only place its brown appears) sits inside
  the pointed arch of the masjid's windows, white, on the homepage and the madrasah's heading
  band, and links to the madrasah's page. Every logo on the site links to its home: the
  masjid's in the header and footer to `index.html`, the madrasah's to `madrasah.html`.
- **A faint lattice** of eight-pointed stars (`--lattice`, 7% white) lies over the teal heading
  bands and the footer, and nowhere text is read on a light background. It is the one
  pattern the site has; keep it that faint.
- **Lists and photographs, not rows of icon cards.** On 8 October 2026 the masjid said the
  homepage's three-card panels (an icon in a circle, a heading, three lines, an arrow link,
  an eyebrow label over every centred heading) looked like every templated site, and it was
  right. The homepage and the About page now set prose beside a photograph, the three strands
  (`.strands`), the visiting facts (`.facts`) and the trustees (`.people`) as plain lists
  with hairlines, and the contact page a list without icons. `.card` is for real things
  only: a class, an event, a step. Links say what they link to and are underlined, with no
  arrow. An eyebrow label stays only where it says something the heading does not (the
  hero's "Nechells, Birmingham", "Part of Attarbiya Masjid", "Under one roof", "Also run by
  the masjid"). Do not bring the icon-card rows back. On 21 October 2026 the same went
for the last rows of equal boxes: the madrasah page's "Under one roof" facts (`.one-roof`) and
its four summary facts (`.furqan-facts`, which keep their "To be confirmed" chips) are ruled
lists now, and the homepage's Our story band sets its five years in a ruled row with no dots
and no line through them (`.mini-line`; on a phone, year and words side by side). Decorative
dots, spines and gold rails are on Ali's list of things that give away an AI-made site.

The palette and type are sampled from the masjid's logo and shared with the donation page.

| Token | Value | Use |
|---|---|---|
| `--green` | `#42bac5` | fills and borders - **never text on a light background** |
| `--green-text` | `#17808a` | large teal text on white (4.68:1) |
| `--green-dark` | `#1a7078` | headings, links, solid buttons, the top bar and footer |
| `--green-ink` | `#0e4a50` | darkest teal |
| `--green-light` | `#e9f7f9` | pale teal sections and panels |
| `--gold` | `#d4ae61` | fills and gold buttons (with dark text) |
| `--gold-deep` | `#b08d3f` | deeper gold |
| `--gold-text` | `#7a5c1f` | the only gold safe as text on white (6.22:1) |
| `--gold-light` | `#f8f0e0` | cream panels; also small gold-tinted text on the teal bands (5:1) |
| `--furqan` | `#52322e` brown, or `#003060` navy | Madrasah Al Furqan's logo colour, sampled from its two logo files; brown is the default until the trustees choose. Used for the logo only |

**Contrast traps, all hit once already:** white text fails on `--green` and on `--gold`, so the
teal heading band keeps its gradient between `--green-dark` and `--green-text` wherever text can
sit (the bright teal is only a glow in the corner), and the gold donate panel uses dark text.
Gold text on the teal bands fails too: use `--gold-light` there.

Headings use **Marcellus**, body uses **Inter**, and Arabic display lettering uses **Reem Kufi**
(its geometric Kufi echoes the logo's Arabic). Running Arabic text, such as the hijri date, is
left to system fonts.

**The typefaces are served from this site, not from Google.** `css/fonts.css` and
`assets/fonts/` are generated by `python scripts/fetch_fonts.py`; edit that script, not the
generated CSS. Only the subsets and weights actually used are downloaded (Inter 400/600/700
latin, Marcellus 400 latin, Reem Kufi 500 arabic), about 165KB. If content ever needs accented
characters - macrons in transliteration, say - add `latin-ext` to the family's entry in `SUBSETS`
in that script and re-run it.

The result is that **no third party is contacted on any page except the Google map on the
contact page, and Formspree when a visitor presses Send on the contact form**. The parent portal does not change that: `portal.html` only links to Teach 'n
Go, and nothing loads from them until a parent chooses to go there. That is worth protecting:
the privacy notice says so in as many words.

## Accessibility, don't regress it

Every page has one `<h1>`, a `<main id="main">` landmark, a skip link, and visible focus styles.
Tap targets are at least 44px. The site respects `prefers-reduced-motion`. Keep all of that.

Teachers and parents will use the madrasah pages and the portal regularly, often on a phone, so
navigation there matters most. The phone menu repeats the links the top bar carries on a wide
screen (Parent login, Prayer times), opening it moves focus to the first link, Escape closes it
and returns focus to the button, and a tap outside closes it. The current page is marked with
`aria-current` and a gold bar, never colour alone. Wide tables scroll inside their own
`position: relative` box, so nothing makes the page scroll sideways at 390px.

## Photographs

**Never render a photo larger than it actually is.** The source pictures are phone photographs
around 900px wide; stretched across the 1140px container one both dominates the page and goes
visibly soft. `.photo-figure` is capped at 680px for that reason. Check a new image at desktop
width, not just on a phone - a portrait photo at full container width can run to one and a half
screen heights.

Prefer landscape crops. Text sits better beside them and they do not push the rest of the page
off the screen.

**Children in photographs (decided by Ali for the masjid, 21 October 2026).** The earlier
rule (children only from behind, a parent's written yes first) no longer applies to the
October 2026 shoot. The children were asked and wanted to take part, so their photos and clips
are used, and **any parent who objects gets their child's picture removed straight away, no
questions asked.** To remove one: delete the file from `assets/photos/`, `assets/tour/` or `assets/video/`
(with its `tour/g/` copy, its crop in `assets/photos/strip/` if it has one, and a clip's poster), remove every
reference (`grep -rn <name> .`), commit, and take it off the Google Business Profile too. The opt-out only works if parents know, so the
madrasah should tell them once that the photos are on the site. Older archive photos of
children are not covered (see "Our Story").

**The photo shoot** was Saturday 10 October 2026 (Tayseer, Sony FX30): 62 edited photographs
(6192x4128, about 20MB each) and 46 clips (4K, 25fps, 2 to 8 seconds, with sound). The camera
data dates every frame: the madrasah classes from 12:08, the empty prayer hall about 12:40,
**Dhuhr in congregation at 13:31** (so those pictures can be called Dhuhr), the large hall
and the one-to-one reading from 13:51, the exterior at 14:08, dusk at 18:31. The originals
are Ali's to keep and are **not in this repo**.

**Which class is which, because it was once got wrong:** the **red-carpet class** (boys
sitting round the walls and round their teacher, who wears a black jacket and cap and reads
to them from a book; clips C9791 to C9811) is **Ali's colleague's**, and it was calm and
attentive, so **it leads** wherever the madrasah is shown: the homepage's madrasah band, the
madrasah page, About and the Visit page. The **blue-carpet large hall** (a teacher in a white
headscarf with a microphone, children with their hands up; C9812 to C9824) is **Ali's own
class**, which was lively that day, so it plays a supporting part and stays off the Google
listing's film. The one-to-one reading at a table (from 13:51, the same teacher) counts as
Ali's too: its close-ups (`mushaf`, `reader`) do not show which class they are
from, so they can be used, but never described as the red-carpet class. Neither teacher is
named anywhere until they agree (see the facts table).

**Where the madrasah's pictures go (Ali, 21 October 2026):** the homepage carries only a sneak
peek, in the Madrasah Al Furqan band beside the parent portal ("maybe backshots": three small
pictures with no child's face); the madrasah page is where the rest of them are. The homepage's "Inside the
masjid" strip shows the building, prayer and the library, and no children from the madrasah.

**Left out on purpose, and deleted:** the wide classroom shots that show the state of the
rooms (Ali, 21 October 2026: "avoid any picture that shows a classroom in poor condition"):
`circle`, `one-to-one`, `big-hall`, `sisters`, `sisters-teacher`, the empty `hall` with its
peeling left wall, and the clips `madrasah-class`, `sisters-teacher`, `sisters-wide` and
`hands-up` (cluttered background). They are in git history and among Ali's originals. About's
first clip, `class-circle`, shows the same kind of room; it stays because Ali asked for About
to be left as it is, but it is the next candidate if he wants one more swapped.

| In `assets/` | What | Where |
|---|---|---|
| `photos/*.jpg` (1360; `exterior.jpg` 1920) | the first selection | Homepage hero and About figure, About, contact, portal, donate, Our Story |
| `photos/ruku-wide.jpg`, `photos/qiyam-wide.jpg` (1600 wide, about 3:1) | the rows at Dhuhr, cut below the ceiling | Prayer times; Our Story's "Today" |
| `photos/strip/<name>.jpg` (600px tall: 4:5, square or 2:1) | crops for the homepage strip | "Inside the masjid" on the homepage |
| `tour/<name>.jpg` (1920x1280) | the selection, 19 photographs | The viewer (every picture opens its full file) |
| `tour/g/<name>.jpg` (960x640) | smaller copies | The Visit page, the madrasah set, the homepage |
| `video/<name>.mp4` + `.jpg` poster (1280x720) | silent loops | About, the madrasah page, the Visit page |

The clips: `class-circle` (the red-carpet class, wide; About only), `class-teacher` (the teacher
reading, half speed; it leads the madrasah page and the Visit page's madrasah),
`class-white` (About), `sign` (the sign, half speed; the Visit page) and
`sisters-notes` (About, the Visit page). A clip plays in the viewer only over
its own poster: a still of a different moment never opens a clip. The portrait cuts (`-p`
files) were deleted with the old tour on 21 October 2026.

**Things hidden before anything was published, and they must stay hidden in any new crop:**
the green information screens in the prayer hall (one cycles through the **masjid's bank
account details**, another shows a day's prayer times, which must never look like current
times), the number plates of parked cars outside, and **07929 242914 on the sign**, Malim
Husain's number, not the masjid's. The sign's close-ups (`tour/sign-night`, the `sign` clip)
are cropped so the number is out of frame (and blurred under the crop as
well). By day the number panel is blurred in the wide shots. **At night the lit number line at
the bottom left of the sign was found unblurred** (21 October 2026: a few pixels, but readable
when the viewer's full file is zoomed), so it has been painted out from the surrounding colours
in `photos/entrance-night.jpg` (and in the night shots since deleted with the old tour).
Check any new night shot of the building for it. The teal line at the top left of the sign is
the charity's registered name, not a number. Every hall photo was checked at full size for the
screens; the lower prayer-times board in the hall is unblurred but illegible, so crop it out
where you can.

**Clips are silent loops, never video with sound.** Each is cut to a few seconds, colour graded
to match the photographs (`eq=contrast=1.12:brightness=0.015:saturation=1.18:gamma=0.97`),
H.264 with no audio track, crossfaded end to start so the loop has no jump, and about 300 to
600KB. Some are slowed to half speed with motion interpolation (ffmpeg `minterpolate`), which
reads as slow motion rather than as stutter; the camera shot 25fps, so plain half speed would
judder. `js/main.js` loads a clip only when it nears the screen, plays it only while visible,
and pauses it when it leaves or the tab is hidden; with reduced motion or Save-Data the
video is never downloaded and the poster stands in. Full-length video belongs on the YouTube
channel, linked, never embedded.

**Captions only where the picture cannot speak for itself** (Ali, 21 October 2026). Lines
such as "The prayer hall. The marble wall frames the mihrab and minbar" or "Revesby Walk at
dusk. Facing the building, ..." describe what anyone can see, and read as written by an AI;
no masjid's site does it. They were all removed. A caption stays only when it adds what the
picture cannot show: a date and place on an archive photograph in Our Story, and the licence
credit the Riyadh al-Salihin cover requires. Alt text is a different thing and stays. **The same goes for the viewer**: it shows
a caption only when a link has `data-caption`, and no longer falls back to the alt text (which
put the same descriptions back under every picture). A clip in the viewer takes its label for
screen readers from the link's hidden text.

**Vary the frame.** Rounded corners and a soft shadow are fine, but on every picture they
get plain. They stay only where one photograph sits beside prose (Home's and About's, which
Ali asked to keep). Groups of pictures are unframed, with square corners and a few pixels
between them. The homepage's Visiting photograph is square, unframed, as tall as the list
beside it, and runs off the right-hand edge of the page (`.visit-section` clips it, so nothing
scrolls sideways); on a phone it runs edge to edge.

**Groups of pictures, never rows of equal tiles.** On 21 October 2026 Ali said the photographs
all sat in the same frame and the site looked templated, "too AI", and then that the homepage's
photo essay ("One Saturday in October") dominated the page; the earlier "Inside the masjid"
strip had been better. So:
- **Homepage, "Inside the masjid"** (`.strip`): one row, 300px tall (220px on a phone), that
  scrolls sideways inside its own box: the mihrab, wudu, the rows in ruku, the library, the
  tafsir and the sign at night, in three shapes (square, 4:5 and one 2:1), so it reads as a
  strip of prints. Nothing the homepage already shows (the building by day is the hero), no
  children, no labels, no captions, no clips. Two round buttons move it for a mouse; they
  appear only when there is more to see, and use `aria-disabled` at the ends so a keyboard
  user keeps focus. It starts in line with the page and runs off the right-hand edge. A plain
  "Visit the masjid" link follows it.
- **Homepage, the madrasah band** (`.peek`): three small pictures under the buttons, one wider
  than the others, and no child's face: a teacher's hands holding the Qur'an with a pencil
  (`photos/teacher-hands.jpg`, cut from the one-to-one table; Ali asked on 22 October 2026 for
  a close-up there instead of the teacher's face), a pupil reading the Qur'an seen over his
  shoulder, and notes in a notebook. The madrasah's pictures carry no date line.
- **Madrasah page, "Inside the madrasah"** (`.set`): one block of eight, no subject twice,
  mostly close: the red-carpet clip leads, then the mushaf and a boy reading (both from the
  one-to-one table, so Ali's class), boys listening, the row of boys, a boy half smiling (all
  three the red-carpet class), a hand up in the large hall (Ali's class) and notes in the
  sisters' class. On a phone it becomes two columns.
- **About** keeps its row of three (`.mosaic.mosaic--row`) with the aperture animation, as Ali
  asked; only the third picture changed (the sisters' class at the whiteboard became the close
  clip of notes being taken), because the room was in poor condition.

**The viewer.** Any link marked `data-lightbox="<set>"` opens full screen in a native
`<dialog>` (`js/main.js`): the picture grows out of the one pressed and shrinks back into it,
arrows, arrow keys or a swipe move through its set, Escape or a tap beside the picture
closes it, and `data-video` plays a clip instead of the still. Without script each link
opens the image itself.

**Visit the masjid (`visit.html`, linked from the homepage hero, the homepage strip and the
footer).** On 22 October 2026 Ali agreed that the tour should become a page for someone coming
for the first time. It replaced `tour.html` (nine numbered stops with "Next" links, a
Standing / Bowing / Prostrating toggle and a contact sheet of thirty photographs), which still
read as a showpiece. Now the practical things come first, "Before you come" (address, getting
in by the two entrances, parking, opening, Jumu'ah, all from the facts table, with directions
and the prayer times), and then four short sections of photographs, each with its Arabic name:
outside and the entrances (the building by day, not the dark dusk shot, and the sign clip),
wudu, the prayer hall (mihrab and minbar, then the rows standing and bowing side by side; no
sujud, no toggle) and Madrasah Al Furqan (both classes together: the red-carpet clip leads,
then Ali's class with the microphone, the row of boys, a hand up and the sisters' notes). The
pictures sit on a twelve-column grid (`.frames`, `.f-*` widths, `.a-*` shapes); where two share
a row the smaller takes the row's height (`.f-fill`). **Left out on purpose:** the library (its
books are not open to the public), dusk, numbering and "Next" links, photo dates, and a contact
sheet. The order is not a statement about the building's layout: nobody has confirmed which
room a visitor meets first, so the page never says it is the order you walk in.

## Parked, waiting on content

Nothing here is blocked by code. Each needs material from the masjid first.

**Photography.** Done: the October 2026 shoot is on the site (see "Photographs"). Still
wanted, none of it urgent: the sisters' entrance from outside (for the contact page and
Visiting), a madrasah classroom set up and empty, and a drone view of the building and street
for Our Story. Portraits of trustees and teachers only with each person's agreement.

**Instagram.** Solved - see "Instagram sync" above. The official API now pulls all 21 posts on
the masjid's own account into `staging/`, with images. Do not go back to scraping. The account
has 24 posts; the 3 the API does not return are the collaborations posted under Al Kissaii, which
would need their own token.

**Madrasah details.** `madrasah.html` has the real groups and times since 9 October 2026. It is
still waiting on the age split of the children's groups, term dates, places and fees for
`assets/madrasah.json`, on the maalims' agreement to be named, and on the trustees' choice of
brown or navy (see "Madrasah Al Furqan").

**Photos of people.** Running the masjid's accounts covers content the masjid published. It does
not cover individual likenesses, and much of the available material shows teenagers. Group shots
need a quick "can we put this on the website?" first, and anything involving children needs
parental consent - the masjid runs children's classes, so that standard applies here anyway.

## Google Business Profile

The masjid's Google listing ("Attarbiya Masjid", Mosque, 4.8 from 59 reviews in October 2026)
is managed from the account **info@masjidatarbiya.org**; Ali signs in to it. Nothing in this
repo can edit it: changes are made by hand, signed in, from the "You manage this Business
Profile" panel on Google Search. As audited on 21 October 2026 it showed **Malim Husain's
mobile (07929 242914) instead of the masjid's 07908 854187**, "Closes 5 pm" hours, no
description, visitor photos from 2023 at the front and a visitor-posted December 2023
timetable. A private kit with every fix, a 683-character description built only from the
facts table, review replies, three posts, 26 photos and a logo sized for Google (screens,
plates and the sign's number hidden), a 23-second silent film led by the red-carpet class
(Ali's own class is left out of it), and a ready-to-paste brief that lets Claude in Chrome
make the text edits in Ali's signed-in browser, is at
https://claude.ai/artifact/PohQwVRJejWSAYgarKMTX9 (visible only to its owner). Hours stay
"Open with no main hours": Ali confirmed the pattern on 21 October 2026 (open for Fajr,
again from Dhuhr until shortly after Isha) but it moves with the prayer times, so it goes in
the description and on the site's Visiting list, never as fixed clock hours. Owners cannot delete visitors' photos, only report
them; setting the masjid's own cover is how a visitor's photo moves back.

## Not currently published

`services.html` and `registration.html` were removed from the launch scope because their content
was invented or, in the case of registration, collected children's personal data through an
embedded Google Form with no privacy notice. They remain in git history (see the first commit).
`madrasah.html` has since been rebuilt, and registration will go through Teach 'n Go, which is
not switched on yet (see `PORTAL.md`).

## Deploying

Pushing to `main` publishes automatically via GitHub Pages, at **https://masjidattarbiya.org**
(the `CNAME` file claims the domain; do not delete it). The old github.io address now forwards
there.

**When you change `css/style.css` or `js/main.js`, bump the `?v=` on every page** (it is the
date, e.g. `css/style.css?v=20261007`; one `sed` does every page, `404.html` included). GitHub Pages lets
browsers keep those files for ten minutes, so without it a visitor gets the new page with the
old stylesheet, which happened once and left the homepage banner unstyled. `check_links.py`
fails if the pages disagree on the version.

**Maintenance mode: the public sees "being updated" (switched on 21 October 2026, at Ali's
request, while the site is being worked on).** `js/gate.js`, loaded in the `<head>` of every
page except `donate.html`, replaces the page with a short notice: the masjid's name, the live
Masjidbox timetable, the donate page, WhatsApp, phone, email and address. Three things always
get through, and must keep doing so: **the donate page** (it does not load the script), **a
donor returning from GoCardless** (any address with `?thanks=` shows the real page and the
thank-you banner), and **the masjid's own team**, after opening any page once with
`?preview=<TOKEN>` (the token is in `js/gate.js`; `?preview=off` undoes it), who then see the
full site with a small "Preview" label. It hides the site from ordinary visitors and nothing
more: the pages are still public files and the token is readable in the script. **To open the
site to everyone, set `ON = false` in `js/gate.js` and push.** Do not leave it on for weeks:
search engines that render the page see the notice, and people who check prayer times here
are sent to Masjidbox instead.

**Addresses are clean: `/donate`, not `/donate.html`** (since 8 October 2026). GitHub Pages
serves `donate.html` at both, so every internal link, the canonical tag, `og:url` and the
sitemap use the clean form, the homepage is `/`, and `check_links.py` fails on any link that
still ends in `.html`. Never a trailing slash: `/madrasah/` is a 404 on GitHub Pages. Links
shared before the change still work, and the old donation repo's forward to `/donate.html`
is fine as it is. **To preview locally use `python scripts/serve.py`**, which resolves clean
addresses like the real host; Python's own `http.server` does not, so with it every internal
link 404s and the 404 page never shows.

### The domain move (7 October 2026)

masjidattarbiya.org used to serve a one-page donation site from the separate repo
`9ali-oop/masjid-attarbiya`. On 7 October 2026 the domain moved here and that page became
`donate.html`. The old repo now only forwards to `https://masjidattarbiya.org/donate.html`;
its `INTEGRATION.md` keeps the history of how the payment links were verified.

- **Donors are still thanked after paying.** All 22 GoCardless templates return donors to
  `https://masjidattarbiya.org/?thanks=oneoff` or `?thanks=monthly`, the homepage, and
  `js/main.js` shows the thank-you banner on whichever page carries `?thanks=`. So nothing in
  GoCardless had to change. **Never remove that handler from `js/main.js`, and never make the
  homepage redirect without carrying `?thanks=` along.** Pointing the templates at
  `/donate.html?thanks=...` instead is optional; it needs a GoCardless API token, created and
  used by the account owner and revoked straight after (see `INTEGRATION.md` in the old repo).
- **`404.html` uses root-relative paths** (`/css/...`), unlike every other page, because GitHub
  Pages serves it at whatever missing address was asked for, however deep. `check_links.py`
  allows that for `404.html` only.
- **HTTPS was in place straight away:** `http://` and `www.` both forward to
  `https://masjidattarbiya.org`, checked on the day.
- **Still to do by hand, by whoever holds the accounts:** re-test a real one-off and monthly
  donation end to end, and ask the trustees to change the charity's website on the Charity
  Commission register from the old `kowneyn.org` to masjidattarbiya.org (the strongest defence
  against fake donation pages).
