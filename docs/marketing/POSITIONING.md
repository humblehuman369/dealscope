# DealGapIQ — Positioning (internal)

> One-page positioning for investors, partners, advisors, and new hires: what we do, who buys it, and why the structure of the offer — not the price tag — is the product.  
> This document merges the former `DEALGAPIQ_OVERVIEW.md` and `BRAND_CONTENT_TEMPLATE.md`. Update when positioning, pricing, or persona definitions change.

---

## At a glance (company overview)

### In one sentence

DealGapIQ is a real-estate investment SaaS that turns any US property address into a 15-second verdict, four pre-built offer structures designed to close the gap, and the negotiation script for each.

### In one paragraph

Listing sites end at price. Investor calculators end at cash flow. Neither tells an investor *how to actually close a marginal deal*. DealGapIQ is the synthesis layer: either scan property with phone camera, enter an address, or search by map to get a multi-source verdict (IQ Estimate, Zillow, RentCast, Redfin, public records), see the four ways the deal could close — price cut, capital, financing, income re-verification, or a blended creative-finance plan — and get a printable pitch script for each one. The tool the investor used to keep in Excel, packaged so 30 properties take 30 minutes instead of 30 weekends.

### The core flow

1. **Verdict** — One address in, multi-source valuation out. A Deal Gap % (verified value vs. asking) and a plain-English explanation a 5th grader could read.
2. **Four Paths** — Three single-lever offers (price, capital, income re-verification) plus one Blended Plan that combines smaller asks. The "structure investors miss" layer.
3. **Negotiation Playbook** — Per-structure pitch script: who to call, the frame, the opener, the ask, what's in it for the seller. Print, email, or copy-to-clipboard.
4. **Strategy worksheet** — Pre-loaded with the chosen path's levers, ready to refine across six investment strategies (LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale).

### What's under the hood

| Capability | What it is |
|---|---|
| Multi-source valuation | IQ Estimate (proprietary blend), Zillow Zestimate, RentCast AVM, Redfin, public records |
| Creative-finance modeling | Subject-To, seller carrybacks, 0% 2nds, rate buydowns, assumable mortgages, FHA house-hack, the Morby Method |
| Six strategy calculators | LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale — full P&L per strategy |
| Trust-first design | Every metric shows its data source. Switch the source, watch the math change. Nothing is fabricated; missing data shows as "Unavailable." |
| Mobile + web | One codebase deployed to web, iOS, and Android via Capacitor |
| Exportable reports | PDF, Excel, CSV for due diligence |

### What we deliberately don't do

- We don't give financial, legal, or investment advice. *We analyze. You decide.*
- We don't model wraparound mortgages or land contracts (deferred pending state-by-state legal review).
- We don't claim every property is a deal. Only that **every property has more leverage than the asking price suggests.**

### Who buys it (summary)

**Primary persona — the active investor:** A residential real-estate investor analyzing **20–100 properties to close 1–3 per year**, typically owning **1–50 doors** or actively working toward their first acquisition.

**Why they buy**

| Pain they feel today | What DealGapIQ replaces |
|---|---|
| "I analyzed 30 properties this month to find one candidate." | Excel templates rebuilt per property |
| "Listing sites tell me the price; nobody tells me if it pencils." | Zillow / Redfin / Realtor.com (where their search ends) |
| "Calculators confirm the math doesn't work — but not how to make it work." | DealCheck, BiggerPockets calc, Mashvisor (where their analysis ends) |
| "I know what Sub2 is. I freeze when it's time to pitch it on the phone." | Coaching programs and forum threads (where execution stalls) |

The willingness-to-pay driver isn't analysis — investors can analyze. It's **synthesis under time pressure**: turning a marginal listing into a credible offer script before someone else does.

**Secondary segments**

| Segment | What they care about |
|---|---|
| **Wholesalers** | Fast verdicts on off-market leads; assignment-fee math |
| **House hackers** | First-time buyers running FHA scenarios; the strategy_switch path |
| **Cold-market buy-and-hold investors** | Price negotiation + seller-financing structures (the only way deals pencil in their market) |
| **Coaches and educators** *(channel partners, not end users)* | A live tool that proves their teaching curriculum on real properties |

### How we're different

The competitive moat is the **synthesis layer** — turning a verdict into actionable, structure-aware offers with a script.

| | Listing sites *(Zillow, Redfin)* | Investor calculators *(DealCheck, BP, Mashvisor)* | **DealGapIQ** |
|---|:---:|:---:|:---:|
| Find properties | ✓ | — | ✓ |
| Multi-source valuation | partial | partial | ✓ |
| Cash-flow analysis | — | ✓ | ✓ |
| Deal Gap verdict (verified vs. asking) | — | partial | ✓ |
| Pre-built offer structures (four per property) | — | — | ✓ |
| Creative-finance modeling (Sub2, seller carry, 0% 2nds) | — | — | ✓ |
| Per-structure negotiation script | — | — | ✓ |
| Off-market property analysis | — | partial | ✓ |

**The one-line moat:** *That's where most tools stop. DealGapIQ keeps going.*

### Market & monetization

- **Pricing posture:** Free verdict, no signup, no credit card for the entry analysis. Paid tier(s) gate strategy worksheets, negotiation scripts, exports, and saved properties. Mobile IAP via RevenueCat; web checkout via Stripe.
- **Acquisition motion:** SEO (creative-finance glossary pages), founder-led content in the BiggerPockets / Subto orbit, free verdict as the conversion event, lead magnet (Creative Finance Field Guide PDF) for top-of-funnel.
- **Distribution surfaces:** Web (`dealgapiq.com`), iOS, Android — all rendering the same React app.

---

## 1. What products or services do we offer?

**Primary offering:**
- **DealGapIQ** — a real-estate investment SaaS that takes any US property address and returns a verdict in 15 seconds, plus four pre-built offer structures designed to close the gap.

**One-line description (the elevator pitch):**
> Paste a Zillow URL or street address. In 15 seconds you get a multi-source verdict, four ways to structure the deal, and the negotiation script for each.

**Core problem we solve:**
- Listing sites end at price. Investor calculators end at cash flow. Neither tells you *how to actually close a marginal deal*. Beginner investors see a negative Deal Gap and assume there are no deals — when really, the deal just needs to be structured.

**Key features / capabilities:**
- **Verdict engine** — multi-source valuation (IQ Estimate, Zillow Zestimate, RentCast, Redfin, public records) with a Deal Gap % and a plain-English explanation.
- **Four Paths** — three single-lever offer structures (price, capital, financing, income, or strategy switch) plus one Blended Plan that combines smaller asks. The "structure investors miss" layer.
- **Creative-finance modeling** — Subject-To, seller carrybacks, 0% 2nds, rate buydowns, assumable mortgages, FHA house-hack, the Morby Method.
- **Negotiation Playbook** — per-structure pitch script (who to call, the frame, the opener, the pitch, what's in it for the seller). Print, email, or copy-to-clipboard.
- **Strategy worksheet** — pre-loaded with the chosen path's levers, ready to refine. Six investment strategies modeled (LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale).
- **Trust-first design** — every metric shows its data source. Switch the source, watch the math change.

**What we don't do (out of scope):**
- We do not give financial, legal, or investment advice. *We analyze. You decide.*
- We don't surface wraparound mortgages or land-contract structures (deferred pending state-by-state legal review).
- We don't promise that every property is a deal — only that every property has more leverage than the asking price suggests.

**Pricing model:**
- *Free verdict, no signup, no credit card* for the entry analysis. Paid tier(s) — TBD; record here once finalized.

---

## 2. Describe our ideal customers

**Primary persona — the active investor:**
- Role / title: Active real-estate investor (1–50 doors) or aspiring investor running their first 10 analyses.
- Industry / segment: Residential real estate — SFH, small multifamily (2–4 unit), occasionally STR markets.
- Deal volume: Analyzing 20–100 properties to close 1–3 per year.
- Experience level: Knows what *Subject-To*, *seller carry*, and *0% 2nd* mean — or wants to. Recognizes Pace Morby. Has bought at least one property or is within 6 months of doing so.

**What they're trying to accomplish:**
- Find or construct deals that pencil in a market where retail listings rarely cash-flow.
- Move from "scrolling Zillow" to "structuring offers" without spending a weekend in Excel per property.

**Pain points they feel today:**
- Analysis fatigue — 30 properties analyzed to find one candidate, and that's after manually rebuilding the same spreadsheet 30 times.
- "Good deals don't show up in a feed" — the realization that listing sites end where the actual work begins.
- Knowing the structure (Sub2, seller carry) isn't enough; they freeze at the *pitch on the phone* step.

**What they've tried before (and why it falls short):**
- **Listing sites** (Zillow, Redfin, Realtor.com): help find properties; silent on whether they pencil.
- **Investor calculators** (DealCheck, BiggerPockets calc, Mashvisor): help analyze; silent on how to construct the offer when the math doesn't work at standard terms.
- **Custom Excel models**: accurate but slow — not a job, an obstacle.

**Where they hang out:**
- BiggerPockets forums, REI subreddits, Pace Morby's audience, Subto / Gator / Sub2 communities, local meetups, real-estate Twitter / X, niche YouTube (Pace Morby, Jerry Norton, Chandler David Smith).

**Secondary personas:**
- **Wholesalers** — need fast verdicts on off-market leads; care about the assignment-fee math.
- **House hackers** — first-time buyers running FHA scenarios; care most about the strategy_switch path.
- **Buy-and-hold cash-flow investors** in cold markets — care most about price negotiation and seller-financing structures.

**Disqualifiers — who we are NOT for:**
- Spreadsheet warriors who already have their own bespoke model and don't want a tool's opinion.
- Passive investors looking for syndications or REITs (we don't do those).
- Pure flippers chasing only the 70% rule on MLS — they're better served by a comp tool, not a structure tool.
- Anyone looking for financial / legal / investment *advice* (we explicitly decline that role).

---

## 3. What do we post about?

**Content pillars:**
1. **Named structures, demystified.** Subject-To, seller carrybacks, 0% 2nds, wraparounds, rate buydowns, the Morby Method, FHA house-hack. Each one explained at a 5th-grade reading level with a real dollar example.
2. **The pitch on the phone.** What investors actually say to a seller — the frame, the opener, the "what's in it for them" reasons. Pull quotes from real DealGapIQ-generated scripts.
3. **Deal teardowns.** Walk through a real listing, show the verdict, show the four paths, show which path actually closes. Always anonymize unless the property is already public.
4. **The structure beats the price tag.** The manifesto. Examples of properties that look bad on price and pencil on structure (and vice versa).
5. **Show the work.** Methodology posts — how the verdict is computed, how data sources are blended, how to read the numbers. The transparency layer.

**Tone & voice:**
- We sound like: a senior investor at a meetup whiteboarding a deal — direct, specific, dollar-numbered, non-condescending. *"Stop scrolling. Start hunting."* energy.
- We never sound like: a guru course pitch, a CRM marketing email, an MLS site, a financial-advice column. Avoid "evaluate," "consider," "explore," "discover," "let us help you" — these neuter the investor.

**Voice rules (apply to every post):**
- Investors *hunt* properties, *close* deals, *make* offers, *structure* terms.
- Specificity over abstraction: *"$2,719 seller-carry 2nd at 0%"* beats *"flexible structure."*
- No magic-wand claims: never imply "every property is a deal." Say *every property has more leverage than the asking price suggests.*
- The investor is the hero; DealGapIQ is the partner.
- Five-to-seven-word manifesto pieces. Easy to remember, easy to screenshot.

**Three repeating motifs (use across channels, at least once each per month):**
- *"Stop scrolling listings. Start hunting real deals."*
- *"That's where most tools stop. DealGapIQ keeps going."*
- *"The price tag isn't the deal. The structure is."*

**Recurring formats / series:**
- **"Four Paths Friday"** — one real-ish property, four structures, which one closes.
- **"Script of the Week"** — one pitch script pulled from DealGapIQ, annotated.
- **"Glossary Drop"** — one creative-finance term, one diagram, one example. SEO compounders.
- **"Run Your Zip"** — short clip showing a verdict on a viewer-suggested address.

**Hooks & angles that work for us:**
- "The $X listing the math says is dead until you look at the structure."
- "Three things every Sub2 pitch needs (and one that kills the deal)."
- "A 6% price cut is a no. A 2% cut + seller carry + verified rent is the same math, three smaller asks, and a yes."
- "Your tool stops at cap rate. Here's what comes next."

**Call-to-action defaults:**
- Primary CTA: **Run a Free Verdict** (links to `/verdict` or the homepage entry input).
- Secondary CTA: **See the Four Paths** (anchor scroll on the homepage) or **Email me the Creative Finance Field Guide** (lead magnet).

**Topics to avoid:**
- Anything that reads as financial / legal / investment *advice*. Always frame as analysis.
- Wraparound and land-contract structures (until legal review clears them by state).
- Stock-photo "investor lifestyle" posts. Investors smell them.
- Unverifiable trust claims ("Trusted by 10,000+ investors" — don't unless true and substantiable).
- Direct competitor name calls in display ads (use category names: "listing sites," "investor calculators"). Product names are fine in the on-domain comparison table.

**Posting cadence by channel:**
- LinkedIn: 2–3×/week — deal teardowns, methodology posts, founder POV.
- X / Twitter: 5–7×/week — short manifesto pieces, glossary drops, quote pulls from scripts.
- Email / newsletter: 1×/week — one teardown + lead-magnet reminder.
- Blog / SEO: 2×/month longform + the Glossary of Creative Finance Terms (each term = its own page, SEO compounding).
- YouTube / short-form video: aspirational — TBD; defer until cadence on the above is locked.

---

## 4. Brand Visuals *(optional)*

**Logo files:**
- `frontend/public/favicon.png` (and the `favicon.png` at repo root). Master logo files — *TBD, add link once Brad provides.*

**Color palette** (from `frontend/src/app/globals.css`):
- **Primary brand blue:** `#0465F2` (`--accent-brand-blue` / `--accent-gradient-from`)
- **Accent sky / cyan:** `#0FA4E9` (`--accent-sky`, also used as `dg-pacific-teal`)
- **Accent sky light:** `#38bdf8` (`--accent-sky-light`, used as `dg-electric-cyan`)
- **Gradient:** `#0465F2 → #0FA4E9`
- **Neutrals — text:** heading + body tokens (`--text-heading`, `--text-body`, `--text-secondary: #94A3B8` dark / `#334155` light)

**Typography:**
- Primary typeface: **Inter** (with system fallbacks: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`). Used for both headlines and body.
- For the founder note treatment specifically, the homepage plan calls for a serif "personal letter" feel — *TBD, pick a serif once that section ships.*

**Imagery style:**
- **Product screenshots first.** The Lake Worth four-card verdict, the Strategy worksheet, the Negotiation Playbook modal — these are the hero images, not stock photography.
- Tight crops, legible at thumbnail / mobile size. Cards must read on a 375px viewport.
- Charts and numbers over lifestyle photography. Investors trust receipts, not vibes.
- When humans appear: real users, real founder, no stock.

**Things to avoid visually:**
- ❌ Red Xs in comparison tables (looks aggressive, invites legal exposure — use `—` or "partial" instead).
- ❌ Stock photos of "investors at laptops."
- ❌ Influencer thumbnails / clickbait arrows.
- ❌ Carousels on mobile (hide options, tank engagement). Stack vertically.
- ❌ Decorative motion that ignores `prefers-reduced-motion`.

---

## 5. Brand documents & downstream artifacts

Link or attach as each becomes available.

- **Brand guidelines / style guide:** [`BRAND_AND_STYLE_GUIDE.md`](./BRAND_AND_STYLE_GUIDE.md)
- **Messaging framework / homepage copy spec:** [`HOMEPAGE_PLAN.md`](./HOMEPAGE_PLAN.md)
- **Product / engineering plan (Four Paths):** [`../feature-plans/FOUR_PATHS.md`](../feature-plans/FOUR_PATHS.md)
- **Agency-facing campaign guide:** [`MARKETING_GUIDE.md`](./MARKETING_GUIDE.md)
- **Zero-budget launch plan:** [`LAUNCH_MARKETING_PLAN.md`](./LAUNCH_MARKETING_PLAN.md)
- **Boilerplate / "About us" copy:** *TBD — draft once founder-note signing decision (Section 5b of homepage plan) is made.*
- **Press kit:** *TBD.*
- **Customer case studies:** *Not in v1 — homepage plan deliberately omits stock testimonials. Add real, written-consent case studies as users opt in.*
- **Competitive battlecards:** see the Section 4 comparison table in [`HOMEPAGE_PLAN.md`](./HOMEPAGE_PLAN.md). Quarterly refresh required to stay credible.
- **FAQ / objection-handling doc:** *TBD — start with the top 5 from support / sales calls once they exist.*
- **Lead magnet — Creative Finance Field Guide (PDF):** *Needs to be written.* One page front/back covering Subject-To, seller carrybacks, 0% 2nds, rate buydowns, assumable-mortgage play.
- **Glossary of Creative Finance Terms:** SEO play; one page per term (Subject-To, Wraparound, Seller Carry, 2-1 Buydown, Assumable, Morby Method, FHA House-Hack, Blended Plan).
- **Legal disclosures:** *"We analyze. You decide."* footer line + the standard "not financial / legal / investment advice" disclosure. Required on every public-facing page.

---

## The manifesto

> The price tag isn't the deal. The structure is.
>
> Built for the investor who knows that good deals don't show up in a feed — they're constructed.
>
> *We analyze. You decide.*

---

*Last updated: 2026-05-03*  
*Owner: Brad Geisen (brad@geisen.cc)*
