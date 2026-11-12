# Brixgate — Design & Technical Audit

**Run:** 12 Nov 2026 · `$impeccable audit`
**Scope:** 62 HTML pages, `styles.css`, 12 pages through the mechanical detector, 8 pages measured live in a browser at 375 px, contrast computed from live computed styles on `index.html`.
**Status:** findings recorded, **nothing fixed yet**.

---

## Health score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | **1**/4 | 54 of 62 pages have no `<main>`; no skip link anywhere; brand red fails AA as text |
| 2 | Performance | **1**/4 | 22 MB and 19 MB MP4s plus 10 MB PNGs served as-is; 386 of 570 images not lazy |
| 3 | Theming | **3**/4 | Real token system, consistent per-page prefixes, few hard-coded escapes |
| 4 | Responsive | **2**/4 | Homepage scrolls 24 px horizontally at 375 px; footer links 14–20 px tall |
| 5 | Implementation Integrity | **2**/4 | Coherent system underneath, but 588 detector hits and repeated stock motifs |
| **Total** | | **9/20** | **Poor — major work needed on a11y and assets** |

### Implementation integrity verdict: pass, with drift

The site is not generic. The per-page CSS prefix convention (`.lp-` `.cm-` `.cp-` `.fd-` `.og-` `.pg-` `.ex-`) is disciplined, the copy is specific and human, and the tier cards carry real photography. That is a product-specific system.

The drift is repetition of stock motifs across pages built at different times: **seven distinct pulsing-dot implementations** (`.cm-dot`, `.cm-live i`, `.fd-badge i`, `.fd-vid-live i`, `.lp-vid-live i`, `.ps-live:before`, `.region-dot`) each with its own keyframes, **three separate marquee tracks** with three animations, and 24 icon-tile-above-heading cards. Same idea, six codepaths.

---

## P0 — fix first

### [P0] Brand red `#ff294e` fails WCAG AA as text, in both directions
**Category:** Accessibility · **WCAG:** 1.4.3 · **Verified:** computed from live styles

- White on `#ff294e` = **3.68:1** (needs 4.5:1)
- `#ff294e` on white = **3.68:1** (needs 4.5:1)

Affects the primary CTA (`a.lp-btn-red` "Begin your journey", 15 px), every `.lp-eyebrow`, every `.lp-cite` source line, and "Chat with us on WhatsApp" in 11 places. Footer is worse:

| Element | Colour | Ratio |
|---|---|---|
| Privacy Policy / Terms / Cookie Policy | `rgba(255,255,255,.75)` on red | **2.57:1** |
| `© 2026 Brixgate Ltd…` | `rgba(255,255,255,.85)` on red | **2.98:1** |

**Fix:** darken to roughly `#d6002c` (≈5.2:1 with white) for **text and button fills only**. Keep `#ff294e` for non-text accents, rules and dots — those legitimately pass the 3:1 UI-component rule. Raise footer link alpha to 1.
**Command:** `$impeccable colorize`

### [P0] No `<main>` landmark on 54 of 62 pages
**Category:** Accessibility · **WCAG:** 1.3.1

Screen-reader users have no way to jump past the nav. Compounded by **no skip link on any page** — every visit means tabbing the full nav, dropdown and More menu before reaching content.

**Fix:** wrap page content in `<main id="main">`; add a visually-hidden skip link as the first focusable element.
**Command:** `$impeccable harden`

---

## P1 — before release

### [P1] Homepage scrolls horizontally on mobile
**Category:** Responsive · **Verified:** measured at 375 px

`scrollWidth` **399 px** vs viewport 375 px. Source: `div.lp-global-lip` (left −30 → right 405) and `.lp-cta-glow` (−262 → 638) — decorative glows with no clip.

`foundations.html` (`.fd-hero-glow` → 398), `professionals.html` (`.pg-hero-waves` → 398), `organisations.html` (`.og-hero-waves`), `experts.html` (`.ex-hero-waves`) have the same shape but **are** clipped by an ancestor, so they don't leak. The homepage's isn't.

**Fix:** `overflow-x: clip` on the hero/CTA sections carrying those glows.
**Command:** `$impeccable adapt`

### [P1] Mobile nav button announces nothing about its state
**Category:** Accessibility · **WCAG:** 4.1.2

`index.html:1644` — `<button class="nav-hamburger" aria-label="Menu">` with no `aria-expanded`, no `aria-controls` pointing at `.nav-mobile`. The new **More** dropdown has the same gap.

The FAQ accordions already do this correctly (`aria-expanded` + `aria-controls`), so the pattern exists in the codebase — the nav never adopted it.
**Command:** `$impeccable harden`

### [P1] Focus indicators removed in 20+ places, restored in 10
**Category:** Accessibility · **WCAG:** 2.4.7

`outline:none` / `outline:0` across `professionals.html` (9×), `apply.html` (4×), `script.js`, `prompt-store.css`, `organisations.html`, `aiquiz/index.html` and others. `:focus-visible` appears in only 10 files.

The gap includes `apply.html` — the payment flow — where a keyboard user can lose track of where they are mid-enrolment.
**Command:** `$impeccable harden`

### [P1] Media assets shipped unprocessed
**Category:** Performance

Tracked and served:

| File | Size |
|---|---|
| `assets/Female Video.mp4` | 22.8 MB |
| `assets/male Video.mp4` | 18.9 MB |
| `assets/613e33708baf…mp4` | 13.5 MB |
| `assets/Hero 23 banner.png` | 10.7 MB |
| `assets/Hero 2 banner.png` | 8.8 MB |
| 5 × AI-readiness PNGs | 5–7 MB each |
| **`assets/` total** | **144 MB** |

Only **184 of 570** `<img>` tags carry `loading="lazy"`. On a Lagos mobile connection the homepage hero alone is a multi-second hold. `cwebp` is available on the build machine.

**Fix:** WebP/AVIF for the PNGs, re-encode the MP4s, lazy-load everything below the fold.
**Command:** `$impeccable optimize`

### [P1] No `aria-live` region anywhere on the site
**Category:** Accessibility · **WCAG:** 4.1.3

`apply.html` changes cohort duration, class count, currency and payment-plan summary asynchronously. None of it is announced — a screen-reader user selects a plan and hears nothing change.
**Command:** `$impeccable harden`

---

## P2

### [P2] Heading hierarchy skips on nearly every page
**WCAG:** 1.3.1

| Page | Skips |
|---|---|
| `organisations.html` | `h1→h3`, then four separate `h2→h4` |
| `professionals.html` | three `h2→h4` |
| `apply.html` | **two `<h1>`**, plus `h1→h3` and `h3→h5` |
| all 62 pages | `h2→h5` contributed by the shared footer |

**Command:** `$impeccable harden`

### [P2] Footer and inline links below the 24 px touch minimum
**WCAG:** 2.5.8 · measured at 375 px

Privacy Policy 20 px · Terms of Service 20 px · Cookie Policy 20 px · "Talk to a human" **14 px** · "Axios · May 2025 ↗" 15 px · LinkedIn 19 px. 48 interactive elements sit under 44 px on the homepage.
**Command:** `$impeccable adapt`

### [P2] Functional text below 11 px — 137 instances
`.lp-art-label` 9.9 px · `.lp-prog-tag` 9.9 px · `.lp-prog-dur` 10.2 px · `.lp-qf-src` 10.2 px · `.lp-cite` 10.6 px. These are badges and attributions, not legal smallprint.
**Command:** `$impeccable typeset`

### [P2] Secondary text at 4.36:1 — just under AA
`#6b7a90` on white across `.lp-chip`, `.lp-prog-price`, `.lp-exp-role`, `.lp-quote-sub`, `.lp-marquee-label`. One step darker clears it.
Also: `.lp-feat-num` ("01") `#98a4b5` = **2.53:1**; `.lp-verified` green `#16a34a` = **3.3:1**.

### [P2] Missing metadata
13 pages have no meta description, including `program-access/`, `prompt-store/access/`, `payments/callback/`, `aiquiz.html`, `callback.html`.
**`ai-readiness.html` has no viewport meta at all** — it renders desktop-width on phones.

---

## Systemic patterns

1. **One colour decision cascades into ~40 contrast failures.** Almost every AA miss traces to `#ff294e`. Fix the token, most of the list resolves.
2. **A11y was done per-component, never per-page.** `alt` text is on **570 of 570** images. Forms are properly labelled (`apply.html` 11 `label for=`, `organisations.html` 12). FAQ accordions have full ARIA. But landmarks, skip links, focus management and live regions — the page-level layer — were never added anywhere.
3. **`prefers-reduced-motion` is honoured on ~20 pages and absent on ~40**, including every `foundations-*` course page.
4. **Six implementations of the same live-dot.** Worth consolidating into one `.is-live` primitive.

## Positive findings — keep these

- **100% alt-text coverage across 570 images.** Rare at this scale.
- **Form labelling is genuinely good** on the three pages that matter most.
- **The CSS prefix convention holds** across 62 pages with almost no bleed — that discipline is why the More-menu fix landed cleanly across 45 files.
- **The community page is the cleanest page measured**: zero horizontal overflow, 3 small targets, one `h1`, one heading skip (the shared footer's).
- **Copy has a voice.** It is the strongest thing on the site.

---

## Recommended order

1. **[P0] `$impeccable colorize`** — retune `#ff294e` for text use; fix footer link alpha
2. **[P0] `$impeccable harden`** — `<main>`, skip links, nav `aria-expanded`, `aria-live` on apply, restore focus rings
3. **[P1] `$impeccable adapt`** — kill the 24 px homepage overflow, raise footer targets to 24 px
4. **[P1] `$impeccable optimize`** — WebP/AVIF, re-encode video, lazy-load below the fold
5. **[P2] `$impeccable typeset`** — lift sub-11 px functional text
6. **[P2] `$impeccable polish`** — final pass

---

## Coverage — what was and wasn't checked

**Measured:** detector across 12 pages · full-site greps for landmarks/ARIA/alt/labels/reduced-motion · live contrast computation on `index.html` · browser-measured overflow, touch targets and heading order on 8 pages at 375 px · asset weights.

**Not measured:** the remaining ~40 `foundations-*` and `programme-*` pages were sampled, not measured individually · no keyboard tab-order walkthrough · no console-error sweep · the `cp-hero` / `cp-chapter` gradient contrast hits flagged on `programme-engineering.html` were not visually verified — **treat those as unconfirmed**.

**Housekeeping (not a design issue):** `brixgate-prod.zip` (146 MB) sits in the working tree. Gitignored, so not in history, but it bloats the folder.

---

# Appendix A — `/community/` launch checklist

Measured 12 Nov 2026 at 375 px, 1024 px and 1440 px. **Console is clean. Zero horizontal overflow. One `h1`. `prefers-reduced-motion` honoured on both animations.** This is the cleanest page on the site — but three things must be fixed before it goes live.

## Blockers

### [P0] All 17 Programmes-dropdown links 404 from `/community/`
`nav-programmes.js` emits **relative** hrefs (`foundations.html`, `programme-engineering.html`, …). From a page served out of a subdirectory they resolve against that subdirectory:

```
/community/programme.html                        → 404
/community/foundations.html                      → 404
/community/professionals.html                    → 404
/community/foundations-software-engineering.html → 404
/community/programme-engineering.html            → 404
```

Verified with `curl` against all five. Every item in the mega-menu is dead on this page.

**Also affects** every other subdirectory page loading that script: `prompt-store/`, `prompt-store/pack/`, `program-access/`, `program-access/callback/`, `aiquiz/`.

**Fix:** make the hrefs in `nav-programmes.js` root-absolute (`/foundations.html`). One change, fixes six pages.

### [P0] No `og:image` / `twitter:image`
`og:title`, `og:description`, `og:url` and `twitter:card="summary_large_image"` are all present — the image is the one tag missing. `summary_large_image` with no image renders as a bare link.

This page's entire distribution channel is people pasting the link into WhatsApp. Right now that paste shows no preview card.

`https://brixgate.com/assets/og-brixgate.jpg` already exists and is used on `index.html` and `professionals.html`. Add the same two tags here, or make a community-specific card.

### [P0] No `<link rel="canonical">`
Absent on this page. `og:url` says `https://brixgate.com/community` (no trailing slash) while the page is served at `/community/`. Confirm which one production resolves to and set canonical to match, so the two don't get indexed separately.

## Should fix before launch

### [P1] Two page-specific contrast failures
| Element | Colour | Ratio | Needs |
|---|---|---|---|
| `span.cm-chip` "In 1 week" (11.5 px) | `#ff294e` on `#ffeaed` | **3.21:1** | 4.5:1 |
| `p.cm-note` "Dates may shift slightly…" (13.4 px) | `#7a8794` on `#f6f5f5` | **3.37:1** | 4.5:1 |

The chip is the page's one urgency signal and it's the weakest text on it. Darken the chip text to ~`#c4173a` and `cm-note` to ~`#5e6b7a`.

*(The other three failures on this page — Privacy Policy, Terms, © line — are the shared footer and are covered by the sitewide P0.)*

### [P1] "Cookie Policy" is a dead link
`community/index.html:573` — `<a href="#">Cookie Policy</a>`. Shared footer, but it ships with this page.

## Nice to have

- **[P2] Join buttons depend on JS.** `community/index.html:370` and `:504` ship as `href="#"` and are rewritten to the WhatsApp URL by script. If that script fails the two primary CTAs do nothing. Ship the real URL in the HTML and let the script only *override* it.
- **[P2] Footer legal links are 20 px tall** at 375 px (24 px minimum, WCAG 2.5.8). Sitewide.
- **[P3] `peer-review.jpg` is upscaled.** 800×600 source stretched to 1024–1440 px wide in `.cm-end-bg`. It's heavily dimmed behind the closing CTA so it reads acceptably, but a 1600 px source would be cleaner.
- **[P3] "In 1 week" for a 9-day gap.** `Math.round(days / 7)` at `community/index.html:630`. Defensible, slightly flattering. "In 9 days" would be truer.
- **[P3] `assets/twitter (1).png`** has a space and a `(1)` in the filename. Works, but worth renaming.

## Verified good

- Zero horizontal overflow at 375 px (the only page measured with none)
- No console errors
- `prefers-reduced-motion` handled on both `cm-pulse` consumers
- All content images carry meaningful `alt`; decorative avatars correctly carry empty `alt`
- Hero image `eager`, everything below the fold `lazy` — correct split
- Image weights sane (110–184 KB)
- WhatsApp links carry `target="_blank" rel="noopener"`
- Heading order clean; the single `h2→h5` skip comes from the shared footer
- The **More** dropdown renders correctly at 1024 px and is absent at 1440 px
