# Madrasah Al Furqan parent portal

`portal.html` lets a parent sign in with a one-time code emailed to them, give their own
details once, then register their children with the madrasah and keep those details up to
date. Madrasah staff see every registration, set its status and download them all as a
spreadsheet.

**Status: built, tested, not switched on.** While `js/portal-config.js` is empty the page says
the portal opens soon and points parents to WhatsApp and the phone. Nothing is collected.
The plan is to gather feedback from the madrasah's teachers and a few parents first.

## How it fits together

| Piece | What it does |
|---|---|
| `portal.html` | The page. Madrasah header, the portal panel, and a plain-English "what we ask for and why". |
| `js/portal.js` | The whole portal: sign-in, family details, children, resources, staff view. Talks to Supabase's REST API directly, so there is no library and no build step. |
| `js/portal-config.js` | The project URL and **public** key. Empty until the portal is switched on. |
| `supabase/schema.sql` | Every table and every permission. Run once in the Supabase SQL editor. |
| `scripts/check_portal.py` | Runs in CI. Fails the build if a secret key is ever pasted into the config. |
| `.github/workflows/portal-keepalive.yml` | One request a day so a free Supabase project is never paused. Does nothing until configured. |

**All security lives in the database**, in the row-level security rules at the bottom of
`schema.sql`. The key in `portal-config.js` is public by design. The rules are what stop one
parent from ever seeing another family. They were tested against a real Postgres database
before this was committed:

- a parent sees and edits only their own details and children
- a parent cannot approve their own registration, move a child to another family, or make
  themselves staff
- the parent's email is always taken from their sign-in account, never from the form
- staff see every family and can set statuses and add resources
- an anonymous visitor can read nothing at all

If you ever change a policy, re-test with two parent accounts and one staff account.

## Before switching it on

These are decisions for the trustees, not code:

1. **Who is staff.** Name the people who may see every child's details. Keep the list short.
2. **How long data is kept.** For example: while the child attends, then deleted a year after
   they leave. Write it into the portal section of `privacy.html`, replacing the "not open
   yet" paragraph.
3. **The privacy notice.** Read the portal section of `privacy.html` and confirm it matches
   what the madrasah will actually do.
4. **ICO registration.** Check whether the charity needs to pay the data protection fee
   (small charities are often exempt, but the check takes five minutes on ico.org.uk).
5. **Who owns the Supabase account.** It should be a masjid email address that more than one
   trustee can reach, not a volunteer's personal account.

## Switching it on

1. Create a free project at supabase.com, signed in with the masjid's account. Choose the
   **London (eu-west-2)** region: the privacy notice promises UK or EU storage.
2. **SQL Editor > New query**, paste all of `supabase/schema.sql`, **Run**.
3. **Authentication > Sign In / Providers > Email**: leave email enabled. Under **Emails >
   Magic Link**, make sure the template includes `{{ .Token }}` so parents receive a code as
   well as a link.
4. **Authentication > Emails > SMTP Settings**: Supabase's built-in email only reaches the
   project's own team, so parents would never get their code. Connect the masjid's Google
   Workspace (`smtp.gmail.com`, an app password for info@masjidatarbiya.org) or any SMTP
   service.
5. **Authentication > URL Configuration**: set the Site URL to the live site and add
   `https://masjidattarbiya.org/portal.html` (and the github.io preview URL while testing) to
   the redirect URLs.
6. **Project Settings > API**: copy the Project URL and the **anon / publishable** key into
   `js/portal-config.js`. Never the service_role or secret key: CI will refuse it.
7. Sign in on the portal once as each staff member, then add them in the SQL editor:
   `insert into public.staff (user_id, name) values ('<their user id>', 'Their name');`
   (the id is under **Authentication > Users**).
8. Test with a spare email as a parent before telling families.

Staff can also read, filter and export registrations directly in the Supabase **Table
Editor**, and add parent-only resources as rows in the `resources` table.
