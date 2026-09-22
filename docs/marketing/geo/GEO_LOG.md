# GEO_LOG

Action log for `DEALGAPIQ_GEO_AGENT_ACTION_PLAN.md`. One line per action: date, task, what was done, URL produced. Facts come only from `docs/brand/content-source-of-truth.md`; if a fact is missing, ask Brad.

Approved description (use everywhere):

> DealGapIQ is a real estate investment analysis tool that shows the gap between a property's asking price and the price at which it works for an investor, then gives four paths plus a Blend to close that gap. It analyzes six strategies across every U.S. market in under 60 seconds, starts free, and Pro costs $34.99 a month.

Approved founder line (use everywhere):

> Brad Geisen, Founder and CEO of DealGapIQ. Founded Foreclosure.com, built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. Author of The Deal Gap.

---

## Phase 1 — Inputs (answered from the content source of truth, 2026-09-22)

| # | Question | Answer | Source |
| --- | --- | --- | --- |
| 1 | Free-tier count | **3 discoveries a month** (3 saved properties, no card). Not "10 analyses". | SOT → Pricing & free tier; `claims.ts :: STARTER_VERDICTS_PER_MONTH` |
| 2 | Spelling | **"Deal Maker"** (two words) in user-facing copy; code identifiers stay `DealMaker`/`deal-maker`. | SOT → Spelling & naming rules |
| 3 | Beta go-live day | **2026-01-15** (`HOME_PUBLISHED_AT`). | SOT → Dates |
| 4 | Brad's LinkedIn | https://www.linkedin.com/in/bradgeisen/ | SOT → Founder |
| 5 | Amazon author page (The Deal Gap) | https://www.amazon.com/dp/B0HF3MJPLH | SOT → Founder |
| 6 | Launch post date | **2026-09-22**, slug `dealgapiq-launches-publicly` | SOT → Dates |
| 7 | Headshot + logo pack | Headshots: `frontend/public/press/brad-geisen*.{jpg,png}`. Logos: `frontend/public/brand/` (`BRAND_ASSETS` in `lib/brand.ts`). All downloadable from https://dealgapiq.com/press | `/press` page |

Success check: all seven filled. **PASS.** (Brad: confirm nothing above is stale; nothing here was guessed.)

Extra facts used in drafts (all from the SOT): company LinkedIn https://www.linkedin.com/company/dealgapiq/ · App Store https://apps.apple.com/app/id6759636866 (iOS + macOS, published Sep 20, 2026) · Google Play https://play.google.com/store/apps/details?id=com.dealgapiq.mobile (published Sep 19, 2026) · Pro annual $349.99/yr ($29.17/mo) · 5 data sources incl. Zillow, Redfin, Realtor.com, RentCast · 2,812 cash buyers, 484 hard money lenders · Lake Worth example: 1014-16 N J St, list $457,100, target buy $428,000 at 20% down, gap −6.4% (about $29,000).

---

## Phase 2 — Site readiness (agent, read-only) — run 2026-09-22 against https://dealgapiq.com

| # | Check | Result |
| --- | --- | --- |
| 1 | First `<p>` after H1 is the approved sentence; "Updated" date shows | **PASS.** H1 "Find a Great Deal & How to Close It."; lede matches; `Updated <time dateTime="2026-09-21">September 21, 2026</time>` |
| 2 | 11 `<h2>`; FAQ text in HTML | **PASS.** 11 H2s in the Step 3 order + "Frequently asked questions"; 8 `<h3>` FAQ questions present in raw HTML (no JS) |
| 3 | validator.schema.org + Rich Results Test: zero errors, FAQPage + Article found | **STRUCTURAL PASS.** Two `ld+json` blocks parse cleanly: site graph `Organization, WebSite, Person, SoftwareApplication`; page graph `Article` (datePublished 2026-01-15, dateModified 2026-09-21) + `FAQPage` (8 items). The browser-based validator/Rich Results runs are Brad's (SOT: "Rich Results / Search Console checks stay with Brad"). |
| 4 | robots.txt does not block GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, CCBot | **PASS.** Explicit `Allow: /` for GPTBot, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, CCBot, OAI-SearchBot, ChatGPT-User, Applebot-Extended; Bingbot falls under `User-Agent: *` → `Allow: /`. `curl -A GPTBot` returns 200 with the full lede. |
| 5 | /press and launch post load and are in sitemap.xml | **PASS.** Both 200. Sitemap (72 URLs) contains `/press` and `/blog/dealgapiq-launches-publicly`. Post emits `BlogPosting` + `BreadcrumbList`. |
| 6 | Zero "$39.99" | **PASS.** 0 hits in home HTML; 0 hits in repo (`rg 39\.99 frontend`). |

Success check: six pass. **PASS** (check 3 pending Brad's browser validator run).

---

## Phase 3 — App stores and billing (HUMAN)

| # | Task | Status |
| --- | --- | --- |
| 1 | App Store Connect: Pro $34.99/mo; approved description as first paragraph; add "Publicly launched August 2026." | PENDING — Brad |
| 2 | Google Play Console: same | PENDING — Brad |
| 3 | RevenueCat: any $39.99 product → $34.99 | PENDING — Brad |
| 4 | Final store URLs to the agent | Already in SOT: App Store https://apps.apple.com/app/id6759636866 · Play https://play.google.com/store/apps/details?id=com.dealgapiq.mobile |

Success check: agent opens both store pages and confirms price, description, launch date. NOT RUN (waiting on 1–3).

**Wording debt found 2026-09-22 (not changed; needs a decision).** `rg -i "offer structures|four ways|offer paths" frontend/` still hits pre-existing content outside this plan's scope: `content/blog/lake-worth-teardown-four-offer-structures.md` (title, meta, body, slug), `how-to-make-an-offer-on-an-investment-property.md`, `subject-to-pitch-script-template.md`, `seller-financing-homes-for-sale.md` (meta description), `content/glossary/morby-method.md`, and the App Store / Play Store description drafts under `public/app-store/`. Sitewide copy, the launch post, comparison pages and every GEO draft use "four paths plus a Blend". Decide: sweep the six files (the blog slug is a URL and would need a redirect) or leave older posts as historical.

---

## Phase 4 — Outside profiles (agent drafts, HUMAN submits)

Drafts written 2026-09-22 in `profiles/`. Every draft uses the approved description, founder line, and the "Fields to copy" block.

| # | Site | Draft | Live URL | In `sameAs`? |
| --- | --- | --- | --- | --- |
| 1 | LinkedIn company page | `profiles/linkedin.md` | https://www.linkedin.com/company/dealgapiq/ (exists) — Brad: paste About text + first post | YES (already in `ORGANIZATION_SAME_AS`) |
| 2 | Crunchbase | `profiles/crunchbase.md` | PENDING — Brad | No (add after live) |
| 3 | Product Hunt | `profiles/product-hunt.md` | PENDING — Brad (launch on a Tuesday) | No (add after live) |
| 4a | G2 | `profiles/g2.md` | PENDING — Brad | No (add after live) |
| 4b | Capterra | `profiles/capterra.md` | PENDING — Brad | No (add after live) |
| 5 | Wikidata | `profiles/wikidata.md` (statements ready) | PENDING — needs a Wikidata login; plan rule 2 forbids creating accounts, so Brad creates or approves an account first | No (add after live) |
| 6 | `sameAs` PR | Add each live URL to `ORGANIZATION_SAME_AS` in `frontend/src/config/site.ts` and to the SOT "Schema / entity rules" row. | — | — |

Success check: six live URLs, all in `sameAs`. NOT YET (drafts done; submissions are Brad's).

---

## Phase 5 — Press and founder posts

Drafts written 2026-09-22 in `press/`.

| # | Item | Draft | Public URL |
| --- | --- | --- | --- |
| 1 | Press release (~400 words) | `press/press-release.md` | PENDING — Brad submits to PR Newswire / Business Wire (paid) |
| 2 | LinkedIn founder post (150 words) | `press/linkedin-founder-post.md` | PENDING — Brad posts |
| 3 | YouTube demo title, description, chapters | `press/youtube-demo.md` | PENDING — Brad records (~5 min) |
| 4a | BiggerPockets forum post | `press/biggerpockets-post.md` | PENDING — Brad posts |
| 4b | r/realestateinvesting post | `press/reddit-post.md` | PENDING — Brad posts (check the subreddit's self-promotion rule the day of posting) |

Success check: four public URLs logged. NOT YET.

---

## Phase 6 — Get on the lists

See `outreach/` (`README.md` index, one file per target, `podcasts.md`). Research and drafts dated 2026-09-22. Five list emails drafted (109–117 words each), ten podcasts listed with the qualifying founder episode and booking route, one pitch drafted.

Blocked on Brad (HUMAN): HonestCasa has no editor byline or editorial address — a recipient must be found before sending. Baselane (Saad Dar) and DealMachine (David Lecko) are reachable only via LinkedIn/Instagram; Wholesaling Inc has no producer contact. Three extra list pages surfaced during Phase 8 research (HouseCanary, AI Tools Bakery, Gitnux) are queued in `outreach/README.md` pending Phase 9 evidence that an engine cites them.

Reply tracking table:

| Target | Sent (date, from) | Reply | Follow-up (+10 days) |
| --- | --- | --- | --- |
| TheClose | | | |
| Baselane | | | |
| RentalRealEstate | | | |
| HonestCasa | | | |
| DealMachine blog | | | |

---

## Phase 7 — Original data post

Template: `data-posts/TEMPLATE.md`. Blocked on Brad supplying the 20-metro numbers for the current month (task 7.1, HUMAN). Do not publish with placeholders.

---

## Phase 8 — Comparison pages (Cursor built, 2026-09-22)

Routes: `/comparisons/dealgapiq-vs-dealcheck`, `/comparisons/dealgapiq-vs-propstream`, `/comparisons/dealgapiq-vs-dealmachine` (new), plus the pre-existing `/comparisons/dealgapiq-vs-mashvisor` moved to the same format. Each: one H1, question H2s with a direct first sentence, a comparison table, the footnote "Third-party prices from public review sites, September 2026; check each vendor." with a dated source list, `Article` + `FAQPage` JSON-LD, all in `sitemap.ts`. Config: `frontend/src/lib/seo/comparison-pages.ts`. Competitor facts recorded there with source URL and access date; nothing not found on a vendor page was included.

Success check (three pages live, in sitemap, one H1, Article schema): PENDING DEPLOY — re-run Phase 2 style curl checks after merge.

Independent fact-check (research agent, 2026-09-22) agreed with every competitor cell. Two vendor-side conflicts to watch at the Phase 10.4 monthly re-check: (1) Mashvisor Lite rendered **$49.99/mo** on a cached load and **$39.99/mo** on a live JS render of the same pricing page; the pages use the live figure. (2) Mashvisor's help center says platform plans have no free trial, but mashvisor.com/invest/investment-property/ still advertises a 14-day trial; the pages cite the help center. Also noted: PropStream prices are JS-rendered (a plain fetch shows no dollar figures), so the re-check must use a rendered load.

---

## Phase 9 — Weekly measurement

Template: `measurement/TEMPLATE.md`. First run: the first Monday after the launch post (2026-09-28). Requires a human or browsing agent with access to ChatGPT, Perplexity, Claude, Google AI Mode and Grok; this repo agent cannot query them.

---

## Phase 10 — Monthly upkeep

Starts one month after launch post (2026-10-22). Checklist lives in the action plan; log each month here.

---

## Action log

| Date | Task | Action | URL / file |
| --- | --- | --- | --- |
| 2026-09-22 | 1 | Filled Phase 1 from SOT | `GEO_LOG.md` |
| 2026-09-22 | 2 | Ran checks 1–6 against production; all pass (3 structural) | see table above |
| 2026-09-22 | 4 | Drafted six profiles | `profiles/*.md` |
| 2026-09-22 | 5 | Drafted press release, founder post, YouTube copy, two forum posts | `press/*.md` |
| 2026-09-22 | 6 | Researched list pages + podcasts; drafted five emails and podcast pitch | `outreach/*.md` |
| 2026-09-22 | 7 | Wrote data-post template | `data-posts/TEMPLATE.md` |
| 2026-09-22 | 8 | Rebuilt comparison pages, added DealMachine page | `frontend/src/lib/seo/comparison-pages.ts`, `frontend/src/components/comparisons/ComparisonPage.tsx` |
| 2026-09-22 | 9 | Wrote measurement template | `measurement/TEMPLATE.md` |
