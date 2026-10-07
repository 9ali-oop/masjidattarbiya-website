# Madrasah Al Furqan parent portal

**Decision (October 2026): the madrasah will use [Teach 'n Go](https://www.teachngo.com/).**
`portal.html` on this site is the front door to it: one button for new families
(the registration form) and one for enrolled families (log in). Everything else -
the register, classes, attendance, messages to parents, fees - happens inside Teach 'n Go,
on the web and in its app.

**Status: not open yet.** The page says "Opening soon" and points parents to WhatsApp and
the phone. Nothing is collected through this website.

## Why Teach 'n Go

Chosen for the people who will actually use it every week: the teachers and the parents.

| | |
|---|---|
| **Ease of use** | Rated 4.7 out of 5 on Capterra UK across 91 reviews, and 4.8 for ease of use - the highest-scoring part. |
| **Proven locally** | Green Lane Masjid's madrasah, the biggest in Birmingham, runs its enrolment on it, so some of our parents will already have seen it. |
| **For parents** | A parent portal and a mobile app: attendance, messages, invoices and payments in one place. |
| **For teachers** | Registers on a phone, class lists, and announcements to whole classes. |
| **Registration** | A public online enrolment form that this site links to. New registrations arrive as leads the madrasah accepts into a class. |
| **Data** | Run by Teach 'n Go Ireland Limited in Dublin, under UK and EU data protection law. |
| **Cost** | From €69 a month for up to 100 live students, billed in euros. A 14-day free trial, no card needed. |

**Its weak spots, so nobody is surprised later:**

- It is built for all kinds of schools, not madrasahs. There is no ready-made Qaidah or hifdh
  progress tracker; teachers would use its notes or grading fields.
- Fees are paid by card (through Stripe) or PayPal. UK Direct Debit is not offered.
- It is priced in euros, so the monthly cost in pounds moves a little.

**The runner-up was [e-Maktab](https://e-maktab.co.uk/)**: UK-made for maktabs, cheaper
(published at £15 to £60 a month by student numbers) and collects fees by Direct Debit. Worth
a second look if the cost or Direct Debit matters more than the polish of the app. Newer
madrasah-specific tools (IlmFlow and others) were too new to trust with children's records.

## Switching it on

1. **Start the free trial** at teachngo.com, signed up with a masjid email address that more
   than one trustee can reach, never a volunteer's personal account.
2. **Set up the school**: the two groups (Juniors, ages 6 to 11; Seniors, 12 and over), the
   days and times, the teachers. Use the confirmed timetable, not the placeholders on the
   website (see `assets/madrasah.json`).
3. **Create the enrolment form** (Teach 'n Go calls registrations "leads"). Ask only for what
   the privacy notice lists: parent name, phone, email, emergency contact; child's name, date
   of birth, school, Qur'an reading level, and anything needed to keep them safe.
4. **Sign Teach 'n Go's data processing agreement**, and decide who on the madrasah's side can
   see what, and how long records are kept after a child leaves.
5. **Update this website** - three edits, all in `portal.html` and `privacy.html`:
   - in `portal.html`, turn the two `status-line` paragraphs ("Online registration form" and
     "Parent login and app") into `btn btn-teal` links: the enrolment form's address for the
     first, `https://app.teachngo.com/login` for the second; delete the `#portal-soon` status
     line in the heading band and the "When does the portal open?" question in the FAQ;
   - in `privacy.html`, replace the "The portal is not open yet" paragraph with the retention
     period and who can see registrations.
6. **Test it as a parent** with a spare email before telling families.

## What happened to the self-built portal

Before Teach 'n Go was chosen, a portal was built for this site on Supabase: one-time email
codes, parent and staff views, and row-level security tested against a real database. It was
removed when the decision was made, so that parents never meet two systems. It is in git
history at commit `42ed7b3` if it is ever wanted again.
