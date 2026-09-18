# Programmes to create in the admin portal

Ten programmes: six BEGINNER, four INTERMEDIATE. Descriptions are
written to be pasted straight into the description field.

---

## Two things that must match exactly

**`level`** is what the whole front end filters on. The nav, the apply
form's tier dropdown and both landing page grids all read it. A
programme with the wrong level appears in the wrong tier, or in neither.

**The title has to contain the matching word below.** Cohort lookups on
each course page key off a `data-course` value, and the page finds its
programme by matching that word against the title. If the title does not
contain it, **that page shows no cohorts** — everything else still works,
which is what makes it easy to miss.

---

## BEGINNER — AI Foundations

### 1. AI Automation
**6 weeks** · title must contain `automation`

> Turn the repetitive parts of your week into something that runs on its
> own. You take one real task you currently do by hand, break it into
> triggers and actions, and build it properly, including what happens
> when it fails at two in the morning with nobody watching. No coding
> background needed. You finish with a working automation and, just as
> useful, the judgement to know which tasks are worth automating and
> which are better left alone.

### 2. Data Analytics
**8 weeks** · title must contain `analytic`

> Most data work fails at the interpretation, not the tooling. Eight
> weeks on reading data honestly: cleaning what you are handed,
> questioning where it came from, and presenting a finding a room will
> act on rather than argue with. Nothing is assumed beyond being able to
> use a spreadsheet. You leave with a real analysis you have presented
> and defended, which is the part that convinces an employer.

### 3. Business Analysis & Project Management
**12 weeks** · title must contain `bapm`, `business analysis` or `project management`

> Business analysis works out what should be built and why. Project
> management gets it delivered. Outside large organisations the same
> person does both, so this teaches both together. Twelve weeks carrying
> one real problem from a vague first request through to something
> delivered, and you finish with two things worth showing: a
> requirements pack a team could build from, and a record of the
> delivery including the week it went sideways. No technical background
> needed.

*This is the merged course. Do not create Business Analysis and Project
Management separately.*

### 4. Product Management
**12 weeks** · title must contain `product management`

> The job is not having ideas. It is deciding which ideas are worth
> building, and finding out afterwards whether you were right. Twelve
> weeks on interviewing users without leading them, reading what usage
> data does and does not tell you, saying no to a popular request with
> evidence behind it, and measuring the result honestly. You leave with
> a decision you can defend end to end, including what would have
> changed your mind.

*Product, not project. Different course, different page.*

### 5. Data Science
**16 weeks** · title must contain `data science`

> The deepest course we run, and the slowest on purpose. Sixteen weeks
> from arithmetic you half remember to statistics, modelling and machine
> learning you genuinely understand rather than copy. Nothing is skipped
> and nothing is assumed. It is demanding rather than difficult: the
> pace is built for somebody starting from nothing who is willing to
> keep showing up, not for somebody who already had a head start.

### 6. Cyber Security
**16 weeks** · title must contain `cyber` or `security`

> How attacks actually work, how defences are built, and where AI helps
> or quietly makes things worse. Sixteen weeks from the fundamentals
> through to triage and response, practised against realistic scenarios
> rather than described in slides. No prior security or networking
> background assumed. You leave able to explain what happened in an
> incident and what should be done about it, which is what the job
> actually asks of you.

*A Cyber Security course exists at INTERMEDIATE too. The level is the
only thing separating them, so it has to be right on both.*

---

## INTERMEDIATE — AI for Professionals

All four are four-week sprints and all end in a defended capstone and a
verifiable certificate.

### 7. AI in Software Engineering
**4 weeks** · title must contain `software engineering` or `engineering`

> For engineers already writing code professionally. Four weeks on
> working with AI in the loop and, more importantly, reviewing what it
> produces: where it is genuinely faster, where it quietly introduces
> risk, and how to tell the difference under deadline. Taught by an
> engineer who has already done this in production. Ends in a capstone
> you defend and a certificate an employer can verify.

### 8. AI in Cyber Security
**4 weeks** · title must contain `cyber`

> For people already working in security. Four weeks on using AI in
> triage and response without handing your judgement to it: faster
> analysis, fewer missed signals, and a clear sense of where an
> automated answer should never be trusted on its own. Taught by a
> practitioner from the field. Ends in a capstone you defend and a
> certificate an employer can verify.

### 9. AI in Financial Modelling
**4 weeks** · title must contain `financial` or `finance`

> For analysts and finance professionals building models other people
> rely on. Four weeks on moving considerably faster with AI while
> producing work that still survives an audit: what to delegate, what to
> check line by line, and how to document the reasoning behind a number
> so it holds up months later. Ends in a capstone you defend and a
> certificate an employer can verify.

### 10. AI in Product Marketing
**4 weeks** · title must contain `marketing`

> For marketers already responsible for positioning and launch. Four
> weeks on using AI for the volume and the speed without flattening the
> voice that makes the brand recognisable. Practical work across
> research, messaging and measurement, with the judgement about what to
> keep human. Ends in a capstone you defend and a certificate an
> employer can verify.

---

## What already exists on dev

| Level | Already created | Still to create |
|---|---|---|
| BEGINNER | AI Automations (28), Data Analytics (29), Data Science (31) | BAPM, Product Management, Cyber Security |
| INTERMEDIATE | Software Engineering (1), Cyber Security (2), Product Marketing (4) | Financial Modelling |

Financial Modelling exists as `program_id 3` with pricing plans attached
but is not returned by `/programs`, so it is either unpublished or
missing. Worth checking rather than creating a duplicate.

---

## After creating them

Each programme needs at least one cohort, or its page shows the waitlist
instead of dates. The page reads `start_date` and computes from that
rather than from `status`, because several existing cohorts are still
marked UPCOMING with a start date already in the past.

Prices come from pricing plans, per programme and per currency. Every
programme needs both an NGN and a USD breakdown: the site picks currency
from the visitor's country, so a programme priced only in NGN shows a
blank price to everybody outside Nigeria.
