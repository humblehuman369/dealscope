# DealGapIQ — Direct-Response Traffic and Conversion Playbook

> **Purpose:** the direct-response layer on top of `LAUNCH_MARKETING_PLAN.md`.
> That plan covers channels (LinkedIn, YouTube organic, Reddit, BiggerPockets,
> podcast guesting). This one covers what happens when a click lands: where it
> lands, what it sees in the first ten seconds, the one action it is asked to
> take, and how we know which source paid for it.
>
> **Source material:** a transcript from a 25-year local-business marketer whose
> system is "traffic and conversion, everything else is fluff." His mechanics
> (own your search term, publish on a domain you own, send ads to a page about
> the exact problem, headline-proof-one-CTA above the fold, a 15-second search-
> term jingle on skippable pre-roll, reviews, networking) were built for
> plumbers and pest control. Each maps to a SaaS with a free, no-signup entry
> event. Where it does not map, this document says so.
>
> **Status:** Phase 1 shipped 2026-09 (on-site pieces). Phase 2 parked pending
> founder audio. **Owner:** Brad Geisen (brad@geisen.cc)

---

## 1. Method-to-DealGapIQ mapping

| Transcript mechanic | Why it worked for them | DealGapIQ equivalent | Status |
|---|---|---|---|
| Own a search term ("Google Pink Plumber") and say it everywhere | A phrase nobody else ranks for becomes a free, permanent front door | "Deal Gap IQ" as the sign-off on every asset; `alternateName` variants in site schema; brand SERP fully ours | Live (schema); ongoing (sign-off discipline) |
| Content on a domain you own, not a walled garden | Blog and podcast get indexed forever; social posts die in 48 hours | Blog (`/blog`, RSS), glossary, `/markets`, `/answers` | Live |
| "Name 50 problems your business solves" and make each one content | Owners froze on "write a blog post"; they never freeze on a problem they solve daily | The 50-problem list in §3 seeds `/answers/*` pages and the blog backlog | Live (list); rolling (pages) |
| Record and transcribe instead of writing | Shorter distance from brain to tongue than brain to hands | Parked: no founder audio yet. When it starts, one 20-minute recording per week = one podcast episode + one blog post + clips | Phase 2 |
| Ads land on a page about the exact problem, never the homepage | A leaky-toilet ad landing on a general plumbing page bounces | `/answers/[slug]` pages, one per problem, each with a single address CTA | Live (8 pages) |
| "Problem, agitate, next step" headline quadrupled ad CTR | People need to feel seen before they click | Every `/answers` H1 follows it; ad headlines mirror the page H1 | Live |
| "…or it's free" guarantee headline | Nobody claimed it; everybody felt safe | Ours is literally true: free verdict, no signup, no card. Say it in the first line | Live |
| Above the fold: headline, video, social proof, one CTA. Ten-second rule | People watch before they read; a bounce is anyone gone in under 10 seconds | Homepage hero: address input replaces the button, guarantee line under it, testimonials directly below the hero, existing 60-second demo stays one tap away | Live |
| Tap-to-call at the bottom of every mobile page | Baby boomers do not find hamburger menus | `MobileStickyCta` on `/`, `/answers/*`, `/markets/[state]` | Live |
| Track every source; 80/20 paid to organic; buy traffic only where it converts | "If it converts and makes money, don't care" | First-touch `utm_*`/`gclid`/referrer captured once per device and attached to every event, so `verdict_viewed` and `signup_completed` carry source | Live |
| Google Business Profile, reviews, "drown out, never delete" | Ignored profile signals an ignored business | GBP for the brand SERP, App Store prompt (already live), G2/Capterra listings | Operational, §7 |
| Networking one-to-ones | The owner does not know what he does not know | Coach and REI-meetup partner one-to-ones; borrowed traffic | Operational, §8 |
| 15-second search-term jingle, front-loaded on geo-targeted skippable YouTube pre-roll | The first 5 seconds are free; you want them to skip | Parked: needs audio. Spec in §9 so it is ready | Phase 2 |

---

## 2. SERP-term rules

**Canonical phrase:** `Deal Gap IQ` (three words when spoken or written for search).
**Product name in prose:** `DealGapIQ`.

The two differ on purpose. People search the way they hear it. "Deal Gap IQ"
is what a listener types after a podcast mention; "DealGapIQ" is what the logo
says. We own both.

**Sign-off line** (end every post, video description, bio, guest appearance,
email footer, podcast intro): *"Google Deal Gap IQ. Know what to offer."*

**Variants declared in site schema** (`frontend/src/components/seo/SiteJsonLd.tsx`,
`alternateName` on `Organization` and `WebSite`): `Deal Gap IQ`, `DealGap IQ`,
`Deal Gap`.

**Brand SERP checklist** (own every result on page one for the canonical phrase):

- [ ] Google Business Profile for DealGapIQ (category: Software Company), logo, description, link to `/`, posts monthly
- [ ] LinkedIn company page name includes "DealGapIQ (Deal Gap IQ)"
- [ ] App Store and Play listing subtitle contains "Deal Gap IQ"
- [ ] YouTube channel description opens with the canonical phrase
- [ ] Crunchbase / Product Hunt / G2 / Capterra listings created with the same one-line description from `MARKETING_PLAYBOOK.md` §5.2
- [ ] `/what-is-dealgapiq` remains the canonical "what is the Deal Gap" answer; do not create a second definition page

**Rule:** never put "near me" or a city name in a title to chase local
queries. Google resolves location on its own; one `/markets/near-me` page and
the 51 state pages are the location layer. See
`docs/feature-plans/market-snapshots-pipeline.md` §0.

---

## 3. The 50-problem list

The transcript's editorial engine: an owner who "cannot write a blog post" can
talk for an hour about a problem he solves. Ours is the same. Each row is a
problem an investor actually types or says, tagged with the persona, the Four
Paths lever or strategy it resolves to, and where it is answered.

Rules for using the list:

- A problem earns an `/answers/*` page only when it is a **distinct problem**,
  not a keyword variant of an existing one. Variants become H2s or FAQs on the
  parent page.
- Every remaining row is a blog post (`frontend/content/blog/`) with
  `intent: problem` and an inline `::cta` to the nearest `/answers` page.
- Answers must use the state assumptions and live estimates the product uses.
  No fabricated numbers; when a figure is unavailable, say "unavailable."

### 3.1 First-time and aspiring investors

| # | Problem as searched | Resolves to | Answered at |
|---|---|---|---|
| 1 | Is this a good investment property? | Verdict / Deal Gap | `/answers/is-this-a-good-investment-property` |
| 2 | Does this rental cash flow? | LTR strategy, Income Value | `/answers/does-this-rental-cash-flow` |
| 3 | What should I offer on this house? | Target Buy, Four Paths | `/answers/what-should-i-offer-on-this-house` |
| 4 | How much rent will this property get? | IQ rent estimate | `/answers/how-much-rent-will-this-property-get` |
| 5 | How do I know if I'm overpaying for a rental? | Deal Gap % | blog |
| 6 | What is a good cap rate for a rental property? | Methodology | blog (exists: keyword map) |
| 7 | How much cash do I need to buy my first rental? | Capital path | blog |
| 8 | Can I buy a rental with 5% down? | House-hack / FHA path | blog → `/answers/can-i-house-hack-this-property` |
| 9 | Is it better to buy a duplex or a single family for my first deal? | Strategy switch | blog |
| 10 | How do I estimate expenses on a rental I haven't bought yet? | Assumptions table | blog → `/markets/[state]` |

### 3.2 Active investors (1–50 doors)

| # | Problem as searched | Resolves to | Answered at |
|---|---|---|---|
| 11 | What is this property worth to an investor, not a homeowner? | Income Value | `/answers/what-is-this-property-worth-to-an-investor` |
| 12 | I analyze 30 properties to find one. How do I go faster? | 15-second verdict | blog |
| 13 | The seller won't lower the price. Is there another way? | Financing / capital paths | `/answers/seller-wont-lower-the-price` |
| 14 | How do I compare a BRRRR against a straight rental on the same house? | Six-strategy comparison | blog |
| 15 | What does a 1% rule property actually cash flow after taxes and vacancy? | Assumptions | blog → `/markets/[state]` |
| 16 | How do I stress-test a deal if rates go up 1%? | Sensitivity (Pro) | blog |
| 17 | What's my max offer if I need $200/door? | Target Buy | blog → `/answers/what-should-i-offer-on-this-house` |
| 18 | How do I read a Zestimate vs a rent estimate vs an AVM? | IQ Estimate methodology | blog / `/methodology` |
| 19 | How much should I hold in reserves per unit? | Assumptions | blog |
| 20 | Which markets still cash flow at today's prices? | `/markets` | `/markets` |

### 3.3 Wholesalers

| # | Problem as searched | Resolves to | Answered at |
|---|---|---|---|
| 21 | Should I wholesale this deal or keep it? | Wholesale strategy | `/answers/should-i-wholesale-this-deal` |
| 22 | How do I calculate an assignment fee? | Wholesale math | blog |
| 23 | What will a cash buyer actually pay for this house? | MAO / buyer directory | blog → `/directory` |
| 24 | How do I find cash buyers in my state? | Buyer directory | `/markets/[state]` → `/directory?state=` |
| 25 | How do I run comps on an off-market lead in 5 minutes? | Verdict on off-market | blog |
| 26 | Is the 70% rule still right in 2026? | Fix & Flip / Wholesale | blog |

### 3.4 House hackers

| # | Problem as searched | Resolves to | Answered at |
|---|---|---|---|
| 27 | Can I house hack this property? | House Hack strategy, FHA | `/answers/can-i-house-hack-this-property` |
| 28 | Will renting the other unit cover my mortgage? | House Hack P&L | blog |
| 29 | FHA vs conventional for a duplex I'll live in | Financing path | blog |
| 30 | How do I turn a house hack into a rental when I move out? | Strategy switch | blog |
| 31 | Can I Airbnb the spare room and still qualify? | STR / House Hack | blog |

### 3.5 Cold-market and creative-finance buyers

| # | Problem as searched | Resolves to | Answered at |
|---|---|---|---|
| 32 | Nothing cash flows in my market. Is investing even possible here? | Creative finance paths | blog → `/answers/seller-wont-lower-the-price` |
| 33 | How do I pitch seller financing without sounding like a scam? | Negotiation Playbook | blog / `/glossary/seller-carryback` |
| 34 | What is Subject-To and when does it make sense? | Sub2 path | `/glossary/subject-to-financing` |
| 35 | How does a 0% seller second change the numbers? | Blended plan | blog |
| 36 | Can I assume the seller's 3% mortgage? | Assumable path | blog |
| 37 | What is the Morby Method? | Glossary | `/glossary/morby-method` |
| 38 | A 6% price cut is a no. What three smaller asks equal the same math? | Blended plan | blog (Four Paths Friday) |
| 39 | How do I explain "what's in it for the seller"? | Playbook script | blog (Script of the Week) |
| 40 | Due-on-sale clause: how real is the risk? | Glossary | `/glossary/due-on-sale-clause-sub2` |

### 3.6 Cross-cutting

| # | Problem as searched | Resolves to | Answered at |
|---|---|---|---|
| 41 | What is the Deal Gap? | Definition | `/what-is-dealgapiq` |
| 42 | Zillow says one price, the rent says another. Which do I trust? | IQ Estimate | `/methodology` |
| 43 | How do I analyze a property from a Zillow link on my phone? | Scan / address entry | blog |
| 44 | Can I analyze a property that isn't listed? | Off-market verdict | blog |
| 45 | What property tax rate should I assume in [state]? | `/markets/[state]` | `/markets/[state]` |
| 46 | What vacancy rate is realistic in [state]? | `/markets/[state]` | `/markets/[state]` |
| 47 | How do I find hard money lenders in [state]? | `/lenders?state=` | `/markets/[state]` |
| 48 | What's the difference between DealGapIQ and DealCheck / Mashvisor / PropStream? | Comparisons | `/comparisons/*` |
| 49 | Is this software or advice? | "We analyze. You decide." | `/methodology`, footer |
| 50 | Where do I find investment properties near me? | `/markets/near-me` | `/markets/near-me` |

Pages exist for the eight problems marked `/answers/*`. The config that renders
them is `frontend/src/lib/seo/problem-pages.ts`; adding a problem is adding an
entry there.

---

## 4. Landing page formula

Every `/answers/[slug]` page renders the same shape from config. The order is
the transcript's above-the-fold formula with the video slot replaced by the
worked example until Phase 2 supplies video.

1. **Headline block: Problem → Agitate → Next step.**
   *"Does this rental cash flow?"* → *"Most listings don't, once taxes,
   vacancy and reserves come off the top. You need the number before you tour."*
   → *"Paste the address. The verdict runs free in 15 seconds."*
2. **Guarantee line**, always the same words: *Free verdict. No signup. No card.*
3. **One CTA:** the address input (`AddressCtaForm`). A street address goes
   straight to `/discovery?address=…`; a city or ZIP goes to `/map-search`.
   No second button above the fold.
4. **What happens next** — three steps, one sentence each.
5. **Worked example** — the sample verdict card (`HeroSampleResult`), labelled
   as a sample.
6. **Social proof** — the three consented testimonials from `SocialProof.tsx`.
   Do not add more until they are real and consented.
7. **FAQ** — three to five questions, emitted as `FAQPage` schema.
8. **Related answers and reading** — the hub-and-spoke links that keep a
   10-second visitor on-site.
9. **Sticky mobile CTA** — appears once the hero scrolls off.

Copy rules: dollar-numbered specifics over adjectives; investor verbs (hunt,
offer, close, structure); never "evaluate," "explore," "let us help." No stock
imagery. No claims about every property being a deal — the line is *every
property has more leverage than the asking price suggests.*

---

## 5. Paid search plan (Phase 1 spend, small)

The transcript's split was roughly 80% paid and social, 20–30% organic, and
the rule was "buy traffic if it converts." We start narrow.

- **One ad group per `/answers` page.** Keywords are the problem phrasing in
  exact and phrase match (e.g. `[does this rental cash flow]`,
  `"rental property cash flow"`), plus the persona's obvious variants from §3.
- **Headline 1 = page H1.** Headline 2 = the guarantee line. Description = the
  Agitate sentence. Message match is the whole point.
- **Final URL** carries `utm_source=google&utm_medium=cpc&utm_campaign=<slug>`.
  Never send an ad to `/`.
- **Budget:** $10/day per group to start; raise only on a converting group.
- **Kill rule:** 200 clicks with zero `verdict_viewed` carrying that
  `ft_utm_campaign` → pause and rewrite, do not raise bids.
- **Scale rule:** a group whose `verdict_viewed → signup_completed` rate beats
  the site average for two consecutive weeks gets the budget from the killed
  groups.
- **No YouTube spend in Phase 1.** Pre-roll without a jingle wastes the free
  five seconds. See §9.

---

## 6. Attribution

- `frontend/src/lib/attribution.ts` captures `utm_source`, `utm_medium`,
  `utm_campaign`, `utm_term`, `utm_content`, `gclid`, and the referrer host on
  the first page load per device and stores them once in `localStorage`
  (`dgiq_first_touch_v1`). Later visits do not overwrite: this is first touch.
- `trackEvent()` merges those as `ft_*` properties onto **every** event, so
  `property_searched`, `verdict_viewed`, `signup_completed`,
  `checkout_started` and `checkout_completed` all carry source without
  changing their call sites.
- Capture is allowed before analytics consent (no PII, nothing sent); sending
  still respects the consent gate in `trackEvent`.
- Landing pages also forward the live `utm_*` onto the `/discovery` URL so the
  server logs and any share of that URL keep the source.

**Weekly review (PostHog):** breakdown `verdict_viewed` and `signup_completed`
by `ft_utm_campaign`, then by `ft_referrer_host` for organic. The two numbers
that matter per source are verdict rate (events ÷ landing sessions) and
signup rate (signups ÷ verdicts). Everything else is fluff.

---

## 7. Reviews and the business profile

SaaS does not have a Google Maps pin, but the mechanics transfer.

- **Google Business Profile:** create as a Software Company at the registered
  business address; it owns a large block of the brand SERP and is where
  "Deal Gap IQ reviews" will resolve. Respond to every review within 48 hours.
- **App Store / Play:** the native rating sheet already fires after the first
  verdict (`useReviewPrompt`). Leave it.
- **G2 and Capterra:** claim the listings; ask for a review in the email that
  follows the `activated` event, not at signup. A review request before the
  "aha" produces three-star reviews.
- **Drown out, never delete.** Bad reviews stay. Volume of good ones is the
  only fix. Never pay for reviews or gate the ask on a positive answer.
- **Schema:** do not add `AggregateRating` until a real count exists on a
  platform we can cite. Unverifiable trust claims are forbidden
  (`POSITIONING.md` §3).

---

## 8. Borrowed traffic and networking

The transcript's guest closed every client from one-to-ones. Ours are with
people who already have an audience of investors.

- **Coaches and course operators** (channel partners, not end users): offer a
  co-branded `/answers` page or a `/markets/[state]` link for their students
  and a Pro-access code. The pitch: *"Your students freeze at the pitch on the
  phone. Here is the script generator that proves your curriculum on a live
  address."*
- **REI meetup organizers:** a 10-minute live "run your ZIP" demo is the
  networking one-to-one at scale. Bring the QR code to `/markets/near-me`.
- **Affiliate terms:** placeholder until Stripe affiliate tooling is chosen.
  Track partners with `utm_source=partner&utm_campaign=<partner>` now so the
  history exists when the program does.

---

## 9. Phase 2 (parked): audio and video

Unlocks when either is true: the founder commits to one 20-minute recording a
week, or a paid `/answers` page sustains a 5% verdict-to-signup rate (paid
traffic is then worth amplifying).

1. **Record and transcribe.** One recording answers three to five problems
   from §3. Transcript → blog post (`frontend/content/blog/`), audio → podcast
   episode, RSS submitted to YouTube. Add `audio_url` / `video_url` frontmatter
   and a `::media` directive to the markdown renderer at that time, not before.
2. **SERP-term jingle.** 15 seconds, generated in Suno from a founder-written
   melody prompt. Structure: the phrase *Deal Gap IQ* inside the first five
   seconds, then the positioning statement (*Know what to offer*), then the
   phrase again. It opens every podcast episode and every video.
3. **Skippable YouTube pre-roll.** 15–30 seconds, jingle front-loaded so the
   skip does the work. Geo-target the investor-heavy metros from
   `/markets` buyer-city data; let the algorithm pick the person. Budget starts
   at $250/month. Success is brand-search lift for "Deal Gap IQ," not view
   rate.
4. **Voice clone.** ElevenLabs from a one-time sample to read §3 answers in
   the founder's voice when recording time is short. Disclose AI narration in
   the episode notes.

---

## 10. KPIs

Per `/answers` page and for `/`, weekly:

| Metric | Definition | Target |
|---|---|---|
| 10-second bounce | Sessions leaving in under 10s with no interaction | under 60% |
| Address-submit rate | `property_searched` with matching `source` ÷ sessions | 15% |
| Verdict rate | `verdict_viewed` ÷ sessions | 12% |
| Signup rate | `signup_completed` ÷ `verdict_viewed` | 8% |
| Paid CPV | spend ÷ `verdict_viewed` with `ft_utm_medium=cpc` | under $4 |

Report by `ft_utm_campaign`. A page below target for three weeks gets its
headline rewritten before anything else is touched; the headline is where the
transcript's 4x came from.

---

## Changelog

| Date | Change |
|---|---|
| 2026-09-03 | v1. Phase 1 on-site pieces shipped: `/answers/*` (8 pages), `AddressCtaForm` in the homepage hero, `MobileStickyCta`, first-touch attribution, `alternateName` schema. Phase 2 parked. |
