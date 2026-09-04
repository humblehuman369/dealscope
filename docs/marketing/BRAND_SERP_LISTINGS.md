# Brand SERP Listings — paste-ready copy

> Companion to [`DIRECT_RESPONSE_PLAYBOOK.md`](./DIRECT_RESPONSE_PLAYBOOK.md) §2.
> Goal: every page-one result for **"Deal Gap IQ"** is ours. Each listing below
> uses the spoken form *Deal Gap IQ* at least once so the search engines learn
> the two spellings are one entity, and every link carries a UTM so §6 can see
> which profile sends traffic.
>
> Everything here is copy and field values. Account creation and verification
> need the founder's logins; the checklist at the end tracks that. Character
> counts are noted where a platform enforces them; verify in the platform's own
> counter before saving.

**Canonical strings (do not vary):**

| Field | Value |
|---|---|
| Brand | `DealGapIQ` |
| Spoken / search form | `Deal Gap IQ` |
| Sign-off | `Google Deal Gap IQ. Know what to offer.` |
| One sentence | DealGapIQ turns any US property address into a 15-second verdict, four pre-built offer structures designed to close the gap, and the negotiation script for each. |
| Tagline (SEO) | Real estate deal analysis software that shows the Deal Gap, ranks six investment strategies, and turns property numbers into investor-ready offers. |
| Founder line | Founded by Brad Geisen, founder of Foreclosure.com and the technology behind Fannie Mae's HomePath and Freddie Mac's HomeSteps. |
| Logo | `frontend/public/brand/Logo/Social/Profile_Square_400x400.png` (square avatar) · `frontend/public/brand/AppIcon/iOS_AppStore/AppIcon_1024x1024.png` (1024 icon) |
| Link format | `https://dealgapiq.com/?utm_source=<platform>&utm_medium=profile&utm_campaign=brand` |

---

## 1. Google Business Profile

business.google.com → Add business. Choose **online business without a
storefront** (hide address; set a service area of United States).

| Field | Value |
|---|---|
| Business name | `DealGapIQ` |
| Primary category | Software company |
| Secondary category | Real estate agency software *(if offered; otherwise none — do not pick "Real estate consultant")* |
| Service area | United States |
| Website | `https://dealgapiq.com/?utm_source=google&utm_medium=gbp&utm_campaign=brand` |
| Hours | Open 24 hours (online) |
| Opening date | *(founding month/year)* |
| Phone | *(business line, optional)* |
| Attributes | Online appointments: No · Identifies as: *(as applicable)* |

**Description (750 max — below is 720):**

> DealGapIQ (Deal Gap IQ) is real estate deal analysis software for investors. Type any US property address and get a free verdict in 15 seconds: multi-source value and rent estimates, the price at which the property works as an investment, and the Deal Gap between that number and the asking price. Every property is scored across six strategies — long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale — and comes with four pre-built offer structures and the negotiation script for each, including creative-finance options like seller financing and subject-to. Free to start, no signup or card required for your first verdicts. Available on web, iOS, and Android. We analyze. You decide.

**First three Posts (one per week after verification):**

1. *Free verdict, no signup.* "Paste any US address at dealgapiq.com and get an investor verdict in 15 seconds. Free. No account. No card." → link `/answers/is-this-a-good-investment-property` with `utm_source=google&utm_medium=gbp&utm_campaign=post-1`
2. *Does this rental cash flow?* Agitate line from `problem-pages.ts` → `/answers/does-this-rental-cash-flow`
3. *Seller won't lower the price?* → `/answers/seller-wont-lower-the-price`

**Q&A seed (post these yourself as questions and answer them):**
- "Is DealGapIQ free?" — First verdicts are free with no signup. A free account adds saved properties; Pro adds editable assumptions, comps and exports.
- "Is Deal Gap IQ the same as DealGapIQ?" — Yes. Deal Gap IQ is how it is said; DealGapIQ is how it is written.
- "Does it give investment advice?" — No. It analyzes and shows its sources; you decide.

---

## 2. LinkedIn company page

| Field | Limit | Value |
|---|---|---|
| Name | 100 | `DealGapIQ (Deal Gap IQ)` |
| Tagline | 120 | `Real estate deal analysis software: the Deal Gap, six strategies, four offer structures, one free 15-second verdict.` (116) |
| Website | | `https://dealgapiq.com/?utm_source=linkedin&utm_medium=profile&utm_campaign=brand` |
| Industry | | Software Development |
| Company size | | 2–10 |
| Type | | Privately Held |
| Specialties | | Real estate investment analysis, Deal Gap, creative financing, BRRRR, fix and flip, wholesale, house hacking, seller financing, subject-to, investor negotiation scripts |
| Custom button | | Visit website |

**About (2,000 max):** use the *Long* boilerplate from `MARKETING_PLAYBOOK.md`
§5.2, then append:

> Search **Deal Gap IQ** to find us. Google Deal Gap IQ. Know what to offer.

The existing `LINKEDIN_COMPANY_PAGE_BLUEPRINT.md` covers everything else about
the page; only the name and the About closer change.

---

## 3. App Store and Google Play

Apple indexes name + subtitle + keyword field as one set and matches whole
words. `DealGapIQ` is a single token, so the spoken search *deal gap iq* only
matches "deal" today. Two low-cost ways to cover it; pick one:

- **Keyword field (preferred, no visible copy change):** swap `comps` for
  `gap,iq` → `foreclosure,preforeclosure,auction,rental,flip,brrrr,wholesale,investor,roi,cashflow,arv,gap,iq` (95/100). Recorded as an alternate in `frontend/public/app-store/connect/copy/keywords.md`.
- **Subtitle variant (visible, run as an A/B cycle):** `Deal Gap IQ: every deal scored` (30/30). Recorded as alternate #6 in `frontend/public/app-store/connect/copy/subtitle.md`.

Google Play indexes the full description. `Deal Gap IQ` now leads the
"Search terms" line in `frontend/public/app-store/play-store/copy/description.md`;
paste that description into Play Console on the next update.

Store links for profiles: use the App Store and Play URLs directly (no UTMs
survive the store redirect); tag them in PostHog via the `GetTheAppButton`
`source` prop instead.

---

## 4. YouTube channel

| Field | Value |
|---|---|
| Channel name | `DealGapIQ` |
| Handle | `@dealgapiq` |
| Description (first line, shown in search) | `Deal Gap IQ: real estate deal analysis for investors. Free 15-second verdict on any US address at dealgapiq.com.` |
| Description (rest) | *Medium* boilerplate from `MARKETING_PLAYBOOK.md` §5.2 + `Google Deal Gap IQ. Know what to offer.` |
| Links | `https://dealgapiq.com/?utm_source=youtube&utm_medium=profile&utm_campaign=brand`, LinkedIn page, App Store, Play |
| Channel keywords | `deal gap iq, dealgapiq, real estate investing, rental property analysis, brrrr, fix and flip, wholesale, seller financing, subject to, creative finance` |

Every video description ends with the sign-off line. The existing 60-second
demo (`/videos/what-is-dealgapiq.mp4`) is the first upload; title it
**"What is Deal Gap IQ? Free 15-second investment property verdict"**.

---

## 5. Crunchbase

| Field | Value |
|---|---|
| Organization name | `DealGapIQ` |
| Also known as | `Deal Gap IQ` |
| Short description (≈ 60 words) | One sentence from the canonical table + founder line |
| Full description | *Press kit / About* paragraph from `MARKETING_PLAYBOOK.md` §5.2 |
| Industries | Real Estate, SaaS, PropTech, Software, Mobile Apps |
| Headquarters | *(city, state)* |
| Founder | Brad Geisen (link LinkedIn) |
| Website | `https://dealgapiq.com/?utm_source=crunchbase&utm_medium=profile&utm_campaign=brand` |

---

## 6. Product Hunt (listing only; a launch day is a separate decision)

| Field | Limit | Value |
|---|---|---|
| Name | | `DealGapIQ` |
| Tagline | 60 | `Free 15-second investor verdict on any US address` (49) |
| Description | 260 | `Paste an address, get the Deal Gap between asking price and what it's worth as an investment, six strategy scores, and four offer structures with scripts. Free, no signup. Search "Deal Gap IQ".` (193) |
| Topics | | Real Estate, SaaS, Fintech, Productivity |
| Link | | `https://dealgapiq.com/?utm_source=producthunt&utm_medium=profile&utm_campaign=brand` |

---

## 7. G2 and Capterra

Both require a vendor account and verification of domain ownership (a DNS TXT
record or an email at dealgapiq.com).

| Field | G2 | Capterra |
|---|---|---|
| Product name | `DealGapIQ` | `DealGapIQ` |
| Category | Real Estate Investment Management; Real Estate Analytics | Real Estate Investment Software; Real Estate Property Management (secondary) |
| Short description | Tagline (SEO) from the canonical table | same |
| Long description | *Press kit / About* paragraph, then: `Also known as Deal Gap IQ.` | same |
| Pricing | Free tier; Pro $34.99/mo or $349.99/yr; 7-day trial | same |
| Deployment | Web, iOS, Android | same |
| Link | `…?utm_source=g2&utm_medium=profile&utm_campaign=brand` | `…?utm_source=capterra&utm_medium=profile&utm_campaign=brand` |

**Review ask (send after the `activated` event, not at signup):**

> Subject: One question about your first DealGapIQ verdict
>
> You ran your first Four Paths this week. If it changed how you looked at
> that property, would you say so where other investors will see it? Two
> minutes on G2: <link>. If it didn't, reply and tell me why — that's more
> useful to me than a review. — Brad

Rules from the playbook §7 apply: never gate the ask on a positive answer,
never pay for reviews, never delete a bad one.

---

## 8. Everywhere else the brand appears

Add the sign-off line **Google Deal Gap IQ. Know what to offer.** to:

- Email signatures and the transactional email footer
- Podcast guest bios (`LAUNCH_MARKETING_PLAN.md` outreach template)
- Reddit and BiggerPockets profile bios
- The `/about` page closing paragraph
- Blog author box

---

## Checklist (founder logins required)

| # | Task | Owner | Done |
|---|---|---|---|
| 1 | Create Google Business Profile with §1 values; complete video/postcard verification | Brad | [ ] |
| 2 | Publish GBP Post 1; schedule 2 and 3 | Brad | [ ] |
| 3 | Rename LinkedIn page to `DealGapIQ (Deal Gap IQ)`; update tagline and About closer | Brad | [ ] |
| 4 | App Store Connect: apply keyword-field swap **or** subtitle #6 on the next release | Brad | [ ] |
| 5 | Play Console: paste the updated full description (search-terms line) | Brad | [ ] |
| 6 | YouTube: set description first line, keywords, links; upload demo with the §4 title | Brad | [ ] |
| 7 | Crunchbase profile with "Also known as" | Brad | [ ] |
| 8 | Product Hunt product page (no launch) | Brad | [ ] |
| 9 | G2 vendor account + listing; Capterra vendor account + listing | Brad | [ ] |
| 10 | Two weeks after 1–9: search "Deal Gap IQ" and "DealGapIQ" incognito; record which page-one results are not ours | Brad | [ ] |
