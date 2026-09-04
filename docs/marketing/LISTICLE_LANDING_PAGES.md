# DealGapIQ — Persona Listicle Landing Pages (`/for/*`)

> **Purpose:** the paid-social layer on top of `DIRECT_RESPONSE_PLAYBOOK.md`.
> That playbook sends search traffic (someone typed a problem) to `/answers/*`.
> This one sends social traffic (nobody typed anything) to `/for/*`: one
> listicle per investor persona, one ad set per page, headline on the ad
> equal to the H1 on the page.
>
> **Source material:** a transcript from an e-commerce marketer spending
> ~$1.5M/month on Meta. His system: AI-draft one "N reasons why" base page,
> generate ~20 persona variants that change only the headline and two or three
> reasons, run one ad per variant, scale the winners. It was built for
> $800 wake surfboards and coffee. Section 1 says what transfers and what
> does not.
>
> **Status:** Phase 1 (pages, attribution, pixel) shipped 2026-09. Phase 2
> (Meta spend) starts when the pixel ID is set in Vercel. **Owner:** Brad
> Geisen (brad@geisen.cc)

---

## 1. What transfers from the transcript, and what does not

| Transcript mechanic | Why it worked for them | DealGapIQ equivalent | Status |
|---|---|---|---|
| One AI-drafted base listicle, then persona variants | Producing 20 pages cost minutes, not weeks | `BASE_REASONS` pool + `PERSONA_PAGES` entries in `frontend/src/lib/seo/persona-pages.ts`; a variant is one config entry | Live (8 pages) |
| Change only the headline and two or three reasons per variant | Most of the page is the product; only the frame changes | `personaReasons` (2–4, rendered first) + `reasonIds` picked from the pool; test enforces the H1 count matches | Live |
| Listicle format ("11 reasons new boat owners…") | Native to how people read feeds; feels like content, not an ad | "N reasons [persona] [do the smart thing]" headlines, §3 | Live |
| Ad headline = page headline | Message match is where the conversion comes from | Ad copy rules in §5; `utm_campaign` = page slug | Rule |
| Offer section → product page → purchase | Physical product, one-step checkout | Offer block → second `AddressCtaForm` → free verdict → signup → Pro trial. The "purchase" is a free verdict. | Live |
| Export reviews, feed them to the AI per persona | Thousands of reviews to mine | Three consented quotes in `lib/testimonials.ts`. Reasons are product facts, not borrowed social proof. Do not fabricate reviews. | Constraint |
| 20 personas | Broad consumer product | 8 personas. Our segments are already defined; twenty before ad data is guesswork and starves each page of budget. Expansion list in §3. | Decision |
| Pages exist only as ad destinations | Nobody Googles a surfboard listicle | `indexable: false` on every entry. Variants share ~60% of their reasons and would be near-duplicate content. Promotion rule in §4. | Rule |
| Scale to $1M/month by repeating | Consumer margins, huge audience | Kill and scale rules in §5 sized to a $10/day ad set. | Rule |

**Channel split that results:** Google Search → `/answers/*`. Meta and
organic social → `/for/*`. Never send search traffic to a persona page or
social traffic to a problem page; the headline does a different job on each.

---

## 2. How a page is built

```
frontend/src/lib/seo/persona-pages.ts        config: BASE_REASONS + PERSONA_PAGES
frontend/src/components/landing/ListicleLandingPage.tsx   server template
frontend/src/app/for/[slug]/page.tsx         static route, robots from `indexable`
frontend/src/app/for/page.tsx                hub (noindex), exists for breadcrumbs and internal links
frontend/src/app/sitemap.ts                  only `indexable` pages are listed
frontend/src/__tests__/lib/persona-pages.test.ts   invariants
```

**Page anatomy, top to bottom** (same building blocks as `/answers`):

1. Breadcrumb, H1 (the listicle headline), one intro paragraph naming the
   persona's situation, `AddressCtaForm` with `source="for:<slug>"`, the
   guarantee line *Free verdict. No signup. No card.*, sample verdict card.
2. Numbered reasons. Persona reasons first (positions 1–N), then the picked
   base reasons. Each is a card: number, heading, one paragraph.
3. Offer block: persona-specific heading and body, a second
   `AddressCtaForm` with `source="for:<slug>:offer"`, then one honest line
   on free limits and Pro pricing rendered from `lib/planFeatures.ts`
   (`PRO_PRICE_MONTHLY`, `PRO_PRICE_ANNUAL`, `PRO_TRIAL_DAYS`,
   `DIRECTORY_ACCESS_NOTE`). Never type a price into the config.
4. `SocialProof compact` (the three consented testimonials).
5. FAQ, three or more items, emitted as `FAQPage` schema.
6. Related `/answers` pages and blog posts.
7. `MobileStickyCta`.

**Adding a persona = adding one entry.** Pick 4–6 ids from `BASE_REASONS`,
write 2–4 persona reasons, set the headline count to the total, write the
offer block and three FAQ items, link at least one `/answers` page, leave
`indexable: false`. Run `npm run test:run`; the config test fails on a
miscounted headline, an unknown reason id, a dead link or a title over 75
characters.

**Invariants the test enforces:** unique slugs; leading integer in the H1
equals `personaReasons.length + reasonIds.length`; 2–4 persona reasons; every
`reasonId` exists; no duplicate reason ids on one page; ≥3 FAQ; meta title
≤75 and description ≤170 characters; every related answer and blog slug
resolves; an `indexable` page has ≥4 persona reasons.

---

## 3. The personas

Headline form: *N reasons [persona] [do the smart thing before the costly
thing]*. Investor verbs (run, check, pull up, analyze). No "discover,"
"explore," "evaluate." The count is literal.

| Slug | Persona | Headline | Persona reasons |
|---|---|---|---|
| `first-time-investors` | first-time | 9 reasons first-time investors run the address before the showing | plain-English explanation; find out before the tour; ten free analyses a month |
| `house-hackers` | house-hacker | 8 reasons house hackers check the numbers before the FHA pre-approval | owner-occupied financing modeled; what the rented units cover; the exit on the same screen |
| `wholesalers` | wholesaler | 9 reasons wholesalers run a verdict before they make the call | what a cash buyer pays (MAO); the spread in dollars; assign vs hold vs flip; buyer directory (Pro) |
| `brrrr-investors` | brrrr | 8 reasons BRRRR investors stopped rebuilding the same spreadsheet | BRRRR vs straight rental on the same house; rehab estimator (Pro); editable refinance assumptions (Pro) |
| `creative-finance-buyers` | cold-market | 8 reasons creative-finance buyers pull up the Four Paths before they pitch | Sub2/carry/0% second/buydown modeled; "what's in it for the seller" written; blended plan; risk flagged |
| `out-of-state-investors` | out-of-state | 9 reasons out-of-state investors analyze from their phone before they fly | run before the flight; state tax/vacancy applied; lenders by state (Pro); save and compare across markets (Pro) |
| `portfolio-builders` | portfolio-builder | 9 reasons investors analyzing 30 properties a month quit Excel | 30 in 30 minutes; unlimited (Pro); pipeline not tabs; exports (Pro) |
| `dscr-borrowers` | dscr-borrower | 7 reasons DSCR borrowers run the ratio before they call the lender | DSCR on the LTR analysis; rent from more than one source; DSCR lenders by state (Pro) |

**Base reason pool** (ids in `BASE_REASONS`): `free-verdict`,
`three-sources`, `income-value`, `deal-gap`, `four-paths`, `scripts`,
`six-strategies`, `off-market`, `state-assumptions`, `phone-first`.

**Expansion candidates (week 6+, after data):** STR investors, agents who
invest, landlords adding a door, couples buying a first duplex.
**Deliberately excluded:** pure fix-and-flip. `POSITIONING.md` lists MLS
flippers chasing the 70% rule as a disqualifier; they need a comp tool.

**Copy truth checklist** (every reason must pass; sources in
`DEALGAPIQ_FEATURE_AUDIT.md` and `planFeatures.ts`):

- Free = 10 analyses a month and 10 saved properties. Not 3, not 5.
- Pro = `PRO_PRICE_MONTHLY` / `PRO_PRICE_ANNUAL`, `PRO_TRIAL_DAYS`-day trial. Rendered, never typed.
- Directories and exports unlock with the first payment. Never "in the trial."
- Pro-only features carry "(Pro)" in the heading.
- STR data may read "unavailable." Wraparounds and land contracts are not modeled.
- No advice language. *We analyze. You decide.*
- No competitor names in ad copy; category names only ("listing sites," "investor calculators").
- *Every property has more leverage than the asking price suggests.* Never "every property is a deal."
- No "trusted by N" or any count we cannot cite.

---

## 4. Indexing rule

Every page ships `indexable: false` → `NOINDEX_FOLLOW`, absent from the
sitemap. The `/for` hub is noindex too. This is deliberate: eight pages
sharing most of a reason pool are near-duplicate content, and these pages
earn their keep from ads, not rankings.

A page is promoted to `indexable: true` when **all** of these hold:

1. It has at least four persona-specific reasons (the test enforces this).
2. Its FAQ answers questions only that persona asks.
3. It has held paid or organic-social traffic for at least four weeks, so
   there is engagement data to justify the crawl budget.

Do not flip the flag to chase a ranking. If a persona deserves a search
presence, the search intent almost certainly belongs to an `/answers` page
or a blog post instead.

---

## 5. Paid Meta test (Phase 2)

Prerequisite: `NEXT_PUBLIC_META_PIXEL_ID` set in Vercel (Production). The
paste-ready campaign, ad copy and PostHog definitions for the launch are in
`LISTICLE_META_LAUNCH_KIT.md`; this section holds the rules. The
pixel is consent-gated and lazy-loaded (`lib/metaPixel.ts`); it forwards
exactly four events as Meta standard events and nothing else:

| Our event | Meta standard event | Meaning |
|---|---|---|
| `verdict_viewed` | `Lead` | The free verdict rendered |
| `signup_completed` | `CompleteRegistration` | Free account created |
| `checkout_started` | `StartTrial` | Pro trial initiated |
| `checkout_completed` | `Subscribe` | Paid |

**Structure**

- One campaign. One ad set per persona page. Two ads per ad set:
  **hook A** headline = the page H1; **hook B** headline = the strongest
  persona reason's heading. Primary text = the page intro paragraph.
- Creative: a real product screenshot (the verdict card, the Four Paths) or
  a 15-second screen recording of a verdict running on a real address.
  No stock imagery, no lifestyle shots, no clickbait arrows
  (`POSITIONING.md` §4).
- Destination:
  `/for/<slug>?utm_source=meta&utm_medium=paid_social&utm_campaign=<slug>&utm_content=<hookA|hookB>`.
  Never `/`. Meta appends `fbclid`; first-touch capture stores it.
- Name the Meta ad set exactly `<slug>` so the join to PostHog
  `ft_utm_campaign` is by eye.

**Optimization**

- Start on landing-page views. Switch an ad set to Leads optimization once
  it has produced ~50 `Lead` events in a week; earlier and Meta's learning
  phase never exits.
- Audiences: interest stacks per persona to start (real estate investing,
  BiggerPockets, Pace Morby, FHA loan, DSCR, house hacking). Move a page to
  Advantage+ broad once it has ≥50 verdicts.

**Budget**

- $10/day per ad set. Launch four: `house-hackers`, `wholesalers`,
  `out-of-state-investors`, `creative-finance-buyers` (the sharpest
  identities). About $1,200 for weeks 1–4.
- The other four rotate in as the kill rule frees budget.

**Kill rule.** 300 link clicks with a verdict rate under 5% → pause. Rewrite
the headline first (that is where the transcript's own 4x came from), not
the bids, not the audience.

**Scale rule.** An ad set whose `verdict_viewed → signup_completed` rate beats
the site average two weeks running inherits the killed budget.

**Organic reuse.** Every listicle also ships as a LinkedIn carousel or X
thread through the existing publisher queue
(`docs/marketing/linkedin/README.md`), linking with
`utm_source=linkedin&utm_medium=<founder|company_page>&utm_campaign=<slug>&utm_content=carousel`
(the medium keeps the LinkedIn batch convention; the campaign is the slug so
it joins to the paid rows). Carousel PDFs are generated from the page config
by `scripts/build_listicle_carousels.py`, so slides and page never drift.
Free distribution, and an organic baseline to compare paid against.

---

## 6. Measurement

Extends the **Direct Response** PostHog dashboard from
`DIRECT_RESPONSE_PLAYBOOK.md` §6.1. Property names are exact.

- **DR-B** (landing sessions): add `OR properties.$pathname LIKE '/for/%'`
  to the `WHERE`.
- **DR-C** (per-page funnel): one funnel per launched persona page.
  1. `property_searched` where `source` starts with `for:<slug>` (the hero
     input records `for:<slug>`, the offer block records `for:<slug>:offer`;
     both are the page).
  2. `verdict_viewed` where `ft_landing_path = /for/<slug>`
  3. `signup_completed` where `ft_landing_path = /for/<slug>`
  4. `checkout_completed` where `ft_landing_path = /for/<slug>`
  Conversion window 14 days. Breakdown by `ft_utm_campaign`, then by
  `ft_utm_content` to read hook A against hook B.
- **DR-F** (persona scoreboard): the DR-A SQL with
  `AND properties.ft_landing_path LIKE '/for/%'` added and
  `properties.ft_utm_content` added to the `SELECT` and `GROUP BY`.
- Hero vs offer: if `property_searched` with `source = for:<slug>:offer`
  exceeds `source = for:<slug>` for a page, the reasons are doing the
  selling and the hero copy is not. Rewrite the intro.

**Targets** (social traffic is colder than search; these sit below the
`/answers` targets on purpose):

| Metric | Definition | Target |
|---|---|---|
| Address-submit rate | `property_searched` with `source LIKE 'for:<slug>%'` ÷ landing sessions | 10% |
| Verdict rate | `verdict_viewed` with `ft_landing_path = /for/<slug>` ÷ landing sessions | 8% |
| Signup rate | `signup_completed` ÷ `verdict_viewed`, same landing path | 8% |
| Paid cost per verdict | Meta spend ÷ `verdict_viewed` with `ft_utm_medium = paid_social` | under $6 |

Weekly review Monday, alongside the DR-A subscription. A page below target
for three weeks gets its headline rewritten before anything else is touched.

**Caveats.** Both the pixel and PostHog are consent-gated: absolute counts
are the consenting share, ratios between ad sets are valid. Meta's own
reported conversions will be lower than Ads Manager expects for the same
reason; judge ad sets on PostHog verdict and signup rates, use Meta's
numbers for its optimizer only. If the undercount starts to hurt the
optimizer (learning phase never exits at a budget that should support it),
the fix is the Conversions API from the backend on `signup_completed` and
`checkout_completed`, which is Phase 3 and not started.

---

## 7. Phasing

| Phase | When | What | Done when |
|---|---|---|---|
| 1. Build | Weeks 1–2 | Config, template, routes, `fbclid`, pixel, tests, this doc | `typecheck`, `test:run`, `theme:check`, `lint`, `build` clean; pages live under noindex |
| 2. Launch | Week 3 | Pixel ID in Vercel; DR-B/C/F updated; 4 ad sets at $10/day; LinkedIn carousels queued | First week of DR-F data |
| 3. Read | Weeks 4–6 | Kill/scale weekly; rewrite losing headlines; rotate remaining 4 personas in | Every persona has 4 weeks of data |
| 4. Expand | Week 6+ | Promote qualifying pages to `indexable`; add expansion personas; CAPI if the optimizer needs it | Judged by signup rate per persona |

---

## 8. Risks

- **Consent undercount.** Covered in §6. Ratios steer; counts do not.
- **Thin content.** Neutralized by noindex-by-default and the promotion rule in §4.
- **Testimonial scarcity.** Three quotes, none persona-specific. Cannot be fixed with copy. Ask for a persona-tagged, consented quote in the email that follows `activated` (`DIRECT_RESPONSE_PLAYBOOK.md` §7). Add to `lib/testimonials.ts` only when real and consented.
- **Copy drift.** Prices and limits render from `planFeatures.ts`. Feature claims are checked against `DEALGAPIQ_FEATURE_AUDIT.md` before a new entry ships.
- **Ad fatigue.** Two hooks per ad set is the floor. When frequency passes 3 on a winning ad set, add a third hook from a different persona reason before raising budget.

---

## Changelog

| Date | Change |
|---|---|
| 2026-09-04 | v1. Phase 1 shipped: 8 `/for/*` pages (noindex), `/for` hub, `fbclid` first-touch capture, consent-gated Meta Pixel with four standard events, CSP allowance for `connect.facebook.net`, config tests. Phase 2 pending pixel ID. |
