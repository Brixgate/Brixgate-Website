# FutureMakers — API the website needs

**For:** Backend engineering
**From:** Website
**Status:** requested, none of this exists yet
**Base:** `https://api.brixgate.com/api/v1`

The website is static HTML on a CDN. It has no database, no sessions and no
server. Every rule below has to be enforced **in the API**, because anything
enforced in the browser can be edited by the person paying.

Conventions already true of this API and assumed here: request bodies are
**snake_case**, responses are `{ success, message, data }`, and money is a
number in the currency's major unit with a `currency` field beside it.

---

## 0. What the site can and cannot do

| Capability | Where it has to live |
|---|---|
| Rendering pages, forms, validation hints | Website |
| Showing prices and calculating a running total | Website, from §1 |
| Taking money | **API** — never from static JS |
| Deciding if the ₦500,000 / 3-learner bar is met | **API** |
| Storing a sponsor, a scholarship, an application | **API** |
| Deciding a slug and serving a scholarship page | **API** |
| Preventing a duplicate application | **API** |
| Closing applications on a deadline | **API** |
| Approving a scholarship before it is public | **Portal** |

---

## 1. `GET /scholarship-programmes`

Which programmes can be sponsored, and at what price.

**Why it is separate from `/pricing-plans`:** sponsorship is bought per seat,
not per plan, and the two can diverge. It also lets Operations open or close a
programme to sponsorship without touching its public pricing.

```json
{ "success": true, "data": { "programmes": [
  { "program_id": 26,
    "title": "Data Science",
    "level": "BEGINNER",
    "duration": "16 Weeks",
    "sponsor_price": { "NGN": 189999, "USD": 150 },
    "open_to_sponsorship": true }
] } }
```

`sponsor_price` must be **one authoritative number per currency**. See the
warning in §9 — the site currently gets two different answers for what a
programme costs depending on which endpoint it asks.

---

## 2. `POST /sponsorships` — Sponsor a Learner

Creates a pending sponsorship and returns a payment session. Nothing is
sponsored until payment is verified.

```json
{ "sponsor_name": "...", "sponsor_email": "...", "sponsor_phone": "+234...",
  "sponsor_type": "INDIVIDUAL",            // INDIVIDUAL | ORGANISATION
  "organisation_name": "...",              // required when ORGANISATION
  "beneficiary_category": "YOUTH",         // STUDENT | YOUTH | ADULT
  "program_id": 26,
  "learner_count": 3,
  "nomination_mode": "BRIXGATE_SELECTS",   // BRIXGATE_SELECTS | NOMINATED
  "nominee": { "name": "...", "email": "...", "phone": "..." },
  "currency": "NGN" }
```

**The API recalculates the amount from `program_id × learner_count`. It must
never trust an amount sent by the browser.**

```json
{ "success": true, "data": {
  "sponsorship_id": 101, "reference": "BXS-0001",
  "amount": 569997, "currency": "NGN", "tier": "LEGACY",
  "qualifies_for_named_scholarship": true,
  "payment": { "gateway": "PAYSTACK", "authorization_url": "https://..." } } }
```

Gateway follows the currency: **NGN → Paystack, anything else → Stripe.** The
site already derives this from the active currency (`window.bxGateway()`), and
the API should derive it the same way rather than from the sponsor's country.

---

## 3. `POST /scholarships` — Create a Named Scholarship

Same as §2 plus the naming fields. **Reject with `422` when the bar is not
met**; do not silently downgrade it to a plain sponsorship.

```json
{ "...": "all fields from §2",
  "scholarship_name": "The Elizabeth Adeboye Technology Scholarship",
  "description": "...",
  "sponsor_logo_url": "...",               // from §4
  "publish_consent": true,                 // must be true
  "display_anonymously": false }
```

**The two conditions are AND, not OR, and both are the API's to check:**
`learner_count >= 3` **and** `amount >= 500000 NGN` (define and document the
USD equivalent).

Returns the slug the public page will live at — **the API owns the slug**, not
the website:

```json
{ "success": true, "data": {
  "scholarship_id": 7, "slug": "elizabeth-adeboye-technology-scholarship",
  "status": "PENDING_PAYMENT",
  "payment": { "gateway": "PAYSTACK", "authorization_url": "https://..." } } }
```

Status lifecycle: `PENDING_PAYMENT → PENDING_APPROVAL → PUBLISHED → CLOSED →
COMPLETED`. Only `PUBLISHED` appears in §6 and §7.

---

## 4. `POST /uploads/sponsor-logo`

`multipart/form-data`, returns a URL. Accept JPEG, PNG, WebP; cap at 5 MB;
reject anything else by MIME **and** by magic bytes. The site cannot be the
thing that validates this.

---

## 5. `POST /sponsorships/{id}/verify` — payment callback

Called by the site's return page after the gateway redirects. Verifies against
Paystack/Stripe server-side and flips status. Must be **idempotent** — a
sponsor who refreshes the thank-you page must not create a second record.

---

## 6. `GET /scholarships` — the directory

```
?status=OPEN&program_id=26&tier=LEGACY&page=1&per_page=12
```

Each item needs exactly what the card shows: `slug`, `scholarship_name`,
`sponsor_display_name`, `sponsor_logo_url`, `tier`, `programme`,
`slots_total`, `slots_remaining`, `application_deadline`, `status`.

`slots_remaining` must be computed server-side. The site must never work it
out from a count of applications.

---

## 7. `GET /scholarships/{slug}` — one scholarship

Everything in §6 plus `description`, `sponsor_bio`, `eligibility`, and the
`programmes` covered. Returning `404` for an unapproved slug is what stops a
pending scholarship leaking before Operations has seen it.

---

## 8. `POST /scholarships/{slug}/applications`

Fields per the brief, plus `consent_privacy: true` and `date_of_birth` — the
brief sets an 18+ floor, and age has to be checked against a date, not a
self-declared number.

**Three rules the API owns, because the browser cannot be trusted with any of
them:**

| Rule | Response |
|---|---|
| One application per email per scholarship | `409 ALREADY_APPLIED` |
| Nothing accepted after the deadline | `422 APPLICATIONS_CLOSED` |
| Nothing accepted unless `PUBLISHED` | `404` |

---

## 9. Three things to settle before any of this is built

**1. Two endpoints disagree about what a programme costs.** On 12 of 15
programmes today, `/programs` and `/pricing-plans` give different final
prices:

| id | title | `/programs` | `/pricing-plans` |
|---|---|---|---|
| 1 | AI in Software Engineering | 200,000 → 200,000 | 150,000 → **99,999** |
| 27 | Business Analysis & PM | 300,000 → 300,000 | 300,000 → **179,999** |
| 30 | Cybersecurity | 300,000 → 300,000 | 300,000 → **189,999** |
| 35 | AI in Data | 150,000 → 150,000 | 150,000 → **99,999** |

The website reads `/pricing-plans`. If anything server-side reads `/programs`
when charging, a sponsor is shown one number and billed another. **Pick one
source of truth before sponsorship money depends on it.**

**2. Which price funds a scholarship — the base or the discounted one?** At
₦300,000 three learners is ₦900,000 and clears the named bar. At ₦189,999 it
is ₦569,997 and still clears it. At a smaller programme it would not. This
changes who qualifies and has to be a stated policy, not an accident of
whichever number the code reaches for.

**3. The slugs on programmes 26 and 29 are crossed.**

```
id 29  title "Data Analytics"   slug "data-science"
id 26  title "Data Science"     slug "data-analytics"
```

The website no longer depends on them — it reads titles — but anything keyed
on slug is wrong until these are swapped in the admin.

**Also worth knowing:** `subtitle` is set on 2 of 15 programmes, `images` on 1
of 15, and cohort `capacity` is null everywhere, so "seats left" cannot be
shown anywhere on the site today.

---

## 10. Order of delivery

The website can ship §1 and a real landing page immediately. After that,
useful in this order:

1. §1 `GET /scholarship-programmes` — unblocks the live calculator
2. §2 + §5 — Sponsor a Learner can take money
3. §3 + §4 — Named scholarships
4. §6 + §7 — the directory and the public pages
5. §8 — applications
