# FutureMakers — what the portal has to do

**For:** Portal engineering
**Companion to:** `SCHOLARSHIP-API.md`
**Status:** requested, none of this exists yet

The brief lists twelve admin functions. They are not twelve screens — they
are **four jobs**, and three of them block money or publication, so they
decide the launch date more than the website does.

---

## Job 1 — Money in

**Screen: Sponsorships**

Table of every sponsorship: reference, sponsor, type, programme, learners,
amount, currency, gateway, payment status, date. Filter by status and date;
export CSV.

Detail view shows the gateway's own verification response, not just our
record of it. When a sponsor disputes a charge, the question is always
"what did Paystack actually say", and an admin should not need a developer
to answer it.

**Payment status must be read from the gateway, never set by hand.** A
manual "mark as paid" button is how a scholarship goes live unfunded. If
Operations genuinely needs to record an offline bank transfer, make that a
separate, logged action — `RECORDED_OFFLINE`, with who recorded it — not the
same field.

---

## Job 2 — Approval, and the thing that can embarrass you

**Screen: Scholarships awaiting approval**

This is the highest-risk screen in the system. A named scholarship publishes
**a real person's name, photograph and message on a public page**. Everything
else can be fixed quietly; this cannot.

Each pending scholarship shows the proposed name, description, logo or
photograph, sponsor, tier, funded learner count, and amount paid.

Four actions:

| Action | What it does |
|---|---|
| **Approve & publish** | `PUBLISHED`, page goes live at its slug |
| **Request changes** | back to sponsor with a note, stays unpublished |
| **Reject** | permanent, **requires a reason**, triggers §refunds |
| **Edit** | fix a typo in the name or description before approving |

**Two policy questions that need answering before launch, not after:**

1. **What happens to the money when a name is rejected?** A sponsor has paid.
   Refund in full, refund minus fees, or convert to an unnamed sponsorship?
   The brief does not say. The portal needs whichever it is as an explicit
   action with a record.

2. **Who can approve?** This should be a named role, not "any admin". One
   person approving their own friend's scholarship is the kind of thing that
   is only a problem after it is a problem.

An approval log — who, when, what changed — is not optional here.

---

## Job 3 — Selecting people

**Screen: Applications**, filtered by scholarship.

Per application: applicant, age, location, education, programme, reason,
financial need, experience, status.

Pipeline: `RECEIVED → SHORTLISTED → SELECTED → ENROLLED`, or `REJECTED`.
Bulk shortlist and bulk reject, because a popular scholarship will get
hundreds and clicking through them one at a time means it does not get done.

Selecting a beneficiary must **decrement `slots_remaining` on the scholarship
atomically**. Two admins selecting at the same moment must not be able to
over-fill a three-slot scholarship.

Assigning a selected applicant to a cohort should reuse the enrolment the
portal already has, not invent a parallel one. A FutureMakers learner is a
learner.

---

## Job 4 — Showing sponsors it worked

**Screen: Scholarship detail → Impact**

Per scholarship: slots funded, filled, applicants, selected, enrolled,
attendance, completed. This is what the Legacy, Impact and Transformation
tiers were sold on, so it is a deliverable, not a nice-to-have.

Export as a PDF a sponsor can forward. For a corporate CSR budget that
document *is* the product.

---

## Dashboard

Total sponsorship revenue (by currency — **do not add NGN and USD into one
number**), sponsors, active scholarships, applications, selected
beneficiaries, completed scholarships.

---

## Emails the portal triggers

| Trigger | To | Carries |
|---|---|---|
| Payment verified | sponsor | receipt, reference |
| Scholarship approved | sponsor | the public link |
| Changes requested | sponsor | the note |
| Rejected | sponsor | reason, refund position |
| Beneficiary selected | sponsor | who, with consent |
| Progress / completion | sponsor | impact report |
| Application received | applicant | acknowledgement |
| Shortlisted / selected / rejected | applicant | next step |
| Onboarding | applicant | cohort, dates, portal access |

Nine of these. Every one needs a sent/failed record visible in the portal —
"did the sponsor get their link" is a support question that will be asked.

---

## What will actually hold the launch up

Not the screens. These:

1. **Refund policy for a rejected scholarship name.** Unanswered in the brief.
2. **Eligibility and selection criteria.** The brief assigns this to
   Operations and it does not exist yet. Applications cannot open without it.
3. **Who may approve a published scholarship.**
4. **One price per programme.** See §9 of `SCHOLARSHIP-API.md` — two endpoints
   currently disagree on 12 of 15 programmes.
5. **Stripe.** The site has Paystack working. Stripe is in the brief and is
   not integrated anywhere yet; international sponsors are a named target
   audience, so this is on the critical path.
