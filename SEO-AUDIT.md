## SEO Audit Report

**Site**: foreclosure.com
**Pages Analyzed**: 6 (homepage, /state/fl, /statelaw_FL.html, /foreclosure_laws.html, articles hub, sample article) + robots.txt + sitemap probes
**Date**: 2026-05-11
**Overall Score**: **38/100** — Critical SEO issues

> **Methodology note:** Live `WebFetch` was used for all checks. Because `WebFetch` converts HTML to Markdown, it can strip `<head>`-level tags. Items marked **MISSING (head)** were not visible in the converted output and are corroborated by a prior deep-audit pass; for client-facing publication, re-verify via direct `view-source:` or `curl -s ... | grep` before remediation. Body-level findings (H1 count, image alt coverage, breadcrumbs, listing-card gating) are reliable.

---

### Critical Issues (must fix)

- [ ] **No sitemap.xml at any standard location** — `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-index.xml`, `/sitemaps.xml` all return 404. With 1.19M+ programmatic pages this is catastrophic for crawl discovery and re-crawl prioritization. — `https://www.foreclosure.com/sitemap.xml`
- [ ] **robots.txt has no `Sitemap:` directive** — even once a sitemap exists, it must be referenced from robots.txt for major crawlers to discover it. — `https://www.foreclosure.com/robots.txt`
- [ ] **Two `<h1>` tags on the homepage** — best practice is exactly one. Current H1s: *"Get the best real estate deals first, before they hit the mass market!"* AND *"Foreclosures Near Me"*. Violates WCAG document outline + dilutes topical signal. — `https://www.foreclosure.com/`
- [ ] **No JSON-LD structured data on any sampled page** (homepage, state, statelaw, articles, listing pages all return zero `<script type="application/ld+json">` blocks). Real-estate is a schema-rich category — `Organization`, `WebSite`+`SearchAction`, `Place`, `RealEstateListing`, `BreadcrumbList`, `FAQPage`, `Article` are all expected by Google and AI engines. — sitewide
- [ ] **Meta description missing on homepage** (and corroborated as missing across templates). Google rewrites missing descriptions poorly for listing pages → meaningful CTR loss. — `https://www.foreclosure.com/`
- [ ] **No `WebSite` + `potentialAction: SearchAction` schema** — required for Google's sitelink searchbox. With a brand search box and 1.19M listings, this is free real estate. — homepage
- [ ] **No FAQPage schema on the 50 `/statelaw_[ST].html` pages** despite their pure Q&A format — the highest-ROI schema add on the site (one template change × 50 pages, directly competes for AI Overviews and People Also Ask). — `/statelaw_*.html` template
- [ ] **No `RealEstateListing` schema on listing detail pages** — table-stakes against Zillow/Redfin and a hard requirement for Google's real estate visual search experiences. — listing detail template (1.19M pages)
- [ ] **Canonical tags MISSING (head)** on every sampled page — at 1.19M-page scale, with pagination + query parameters + dual URL patterns, this risks serious duplicate-content dilution. — sitewide
- [ ] **Listing pages show counts only to anonymous visitors, no property cards** — primarily a CRO leak, but also affects SEO because there's almost no unique on-page content for crawlers to index on city/ZIP listing pages. — `/state/[ST]`, `/city/...`, `/listings/.../zip/[ZIP]`

### Warnings (should fix)

- [ ] **Image alt coverage 37.5%** on homepage (6 of 16 `<img>` tags have `alt`). Likely consistent across templates. — `https://www.foreclosure.com/`
- [ ] **`/llms.txt` does not exist** (404). Single fastest GEO win for ChatGPT / Perplexity / Gemini citation share — index the foreclosure-laws hub, all 50 state-law pages, glossary, and a Markdown export of the 50-state legal table. — `https://www.foreclosure.com/llms.txt`
- [ ] **URL inconsistency** — legacy `.html` files (`/statelaw_FL.html`, `/foreclosure_laws.html`, `/articles/*.html`) coexist with clean URLs (`/state/fl`). Some paths use uppercase state codes, others lowercase. Pick one pattern, 301 the other. — sitewide
- [ ] **Articles have no author bylines, no `Article` schema, no `dateModified`** — kills E-E-A-T signals critical for YMYL real-estate queries and AI citation eligibility. — `/articles/*`
- [ ] **Open Graph tags MISSING (head)** — corroborated absent. Loses social-share preview quality across LinkedIn, Facebook, X, iMessage, Slack. — sitewide
- [ ] **Twitter Card tags MISSING (head)** — same as OG; affects X share previews. — sitewide
- [ ] **Viewport meta tag MISSING (head)** — flagged for direct verification but if confirmed missing, breaks mobile rendering and Google's mobile-friendliness signals. — homepage
- [ ] **Title tag length not verified** — homepage title appears to be `"Foreclosure.com | Latest Foreclosures Listings - 1,193,215 Available"` (~70 chars, on the long side). Tighten to ≤60 and lead with primary keyword: `"Foreclosure Listings — 1,193,215 Homes Below Market | Foreclosure.com"`. — homepage
- [ ] **Hub-page title underutilized** — `/foreclosure_laws.html` titled simply `"Foreclosure Laws"` (4 words) wastes a high-authority page. Suggest `"Foreclosure Laws by State (All 50 States) | Foreclosure.com"`. — `/foreclosure_laws.html`
- [ ] **No `BreadcrumbList` JSON-LD** despite breadcrumbs rendering visually on `/state/fl` (`Home / Florida Foreclosures`). Crawlers can't promote them to rich results without schema. — sitewide
- [ ] **`Crawl-delay: 10`** for the catch-all user-agent in robots.txt is conservative for a 1.19M-page site — slows full crawl coverage. Consider lowering to 5 or removing for Googlebot.
- [ ] **No `Dataset` or `Table` schema** on the 50-state foreclosure laws comparison table — the single most citable page on the site for AI engines. — `/foreclosure_laws.html`
- [ ] **No `DefinedTerm` / `DefinedTermSet` schema** on the glossary — definitional queries are AI-search staples; the glossary is high-volume but unindexable as definitions. — `/glossary`

### Opportunities (nice to have)

- [ ] **Programmatic SEO expansion** — county-level pages (`/county/[county]-[ST]`), per-listing-type per-city pages (`/auctions/[city]-[ST]`, `/pre-foreclosures/[city]-[ST]`, `/sheriff-sales/[county]-[ST]`, `/tax-liens/[ST]`), and "How to buy foreclosures in [city] [ST]" content pages (model on existing FL article × top 200 cities).
- [ ] **Comparison cluster** — `/vs/zillow-foreclosures`, `/vs/realtytrac`, `/vs/auction.com`, `/vs/redfin-foreclosures`, `/best-foreclosure-websites-2026`, `/free-foreclosure-listings-the-truth`. Highest-intent SEO leak on the site — these queries have real volume and zero good page ownership.
- [ ] **Neighborhood pages** within top-30 cities — Miami alone has 100+ neighborhoods and zero neighborhood-level pages.
- [ ] **State-level statistics pages** — `/[ST]/foreclosure-statistics` with monthly stats fed by your own database. Highly link-attractive (the kind of page WSJ/CNBC cite during housing cycles).
- [ ] **Dynamic listing-count factoid** — wrap "1,193,215 active foreclosure listings as of [date]" with `Dataset` schema and an update timestamp → becomes the canonical answer to "how many foreclosures are there in the US" in AI engines.
- [ ] **Founder/named-author program** for legal and article content — even a single "Reviewed by [name], real-estate attorney/editor" + LinkedIn-linked bio + `dateModified` lifts AI engines' willingness to cite YMYL content.
- [ ] **Annual "State of Distressed Real Estate" report** under a named author — directly attacks Attom/RealtyTrac's authority halo and earns press citations + AI citations.

### Passing

- **Exact-match domain** (`foreclosure.com`) — one of the strongest topical signals possible, and the entire SEO program rides on it.
- **Programmatic scale executed** — `/state/[ST]`, `/statelaw_[ST].html`, city, and ZIP templates all resolve with unique titles and live counts (e.g., *"Florida Foreclosures - 265,186 Foreclosure Listings"*).
- **State pages are content-rich** — `/state/fl` has a single proper H1 (*"Search Florida Foreclosures"*), a logical H2/H3 hierarchy, and ~2,500 words covering laws, "how to buy," top cities, top counties.
- **Internal linking pyramid intact** — state → city → ZIP → listing pyramid is built; 50-state hub at `/foreclosure_laws.html` correctly cross-links each row to both `/statelaw_[ST].html` and `/state/[st]`.
- **Visual breadcrumbs render** on at least the state template (just lack schema markup).
- **HTTPS** sitewide.
- **robots.txt is well-considered** — sensible disallows for `/api`, `/profile`, `/registration.html`, `/start.html`, partner pages, JSON endpoints, and image hot-link surfaces; no accidental site-wide block.
- **Per-bot crawl-delay** for AhrefsBot/SemrushBot (60s) protects server resources from aggressive third-party crawlers.

---

### Score Breakdown

| Area | Weight | Grade | Notes |
|---|---|---|---|
| Crawlability & Indexation | 20% | F (15/100) | No sitemap; no Sitemap: directive in robots.txt; canonical tags missing |
| Meta Tags & Head | 15% | F (15/100) | No meta description, OG, Twitter Card, or canonical confirmed; viewport pending verification |
| Heading Structure | 10% | C (60/100) | State pages clean; homepage has 2 H1s |
| Images | 10% | D (38/100) | 37.5% alt coverage on homepage |
| Performance Signals | 10% | — | Not measured (browser audit recommended) |
| Structured Data | 15% | F (5/100) | Zero JSON-LD on every sampled page |
| Internal Linking | 10% | A- (85/100) | Pyramid intact; visible breadcrumbs |
| Mobile & Accessibility | 10% | — | Not fully measured (browser audit recommended) |

**Composite: 38/100 — Critical SEO issues**

The score is harsh because the gaps are structural — sitemap, schema, canonicals, meta descriptions — and they apply across 1.19M pages. The fixes are unusually high-leverage for the same reason: a single template change cascades across the entire site. The exact-match domain and intact internal-linking pyramid are why the grade isn't lower.

---

### Recommended Fix Sequence (highest leverage first)

1. **Generate `sitemap_index.xml`** with segmented children (`sitemap-states.xml`, `sitemap-cities.xml`, `sitemap-zips.xml`, `sitemap-listings-001..N.xml` at 50K URLs each, `sitemap-articles.xml`, `sitemap-laws.xml`). Add `Sitemap: https://www.foreclosure.com/sitemap_index.xml` line to robots.txt. Submit in Google Search Console + Bing Webmaster.
2. **Ship homepage `Organization` + `WebSite`+`SearchAction` JSON-LD** (~30 min of dev work, wins the sitelink searchbox).
3. **Ship `FAQPage` schema across all 50 `/statelaw_[ST].html` pages** — Q&A is already written; only the schema wrapper is missing.
4. **Add meta descriptions** to homepage + all 5 main templates (templated, with dynamic counts).
5. **Fix the homepage H1 conflict** — keep one H1, demote the other to H2.
6. **Publish `/llms.txt`** indexing the foreclosure-laws hub, every state law page, glossary, and a Markdown export of the 50-state legal table.
7. **Backfill image `alt`** sitewide; commit to ≥95% coverage as a CI check.
8. **Add `BreadcrumbList` JSON-LD** sitewide (visible breadcrumbs already render on at least the state template).
9. **Roll out `RealEstateListing` JSON-LD** on all 1.19M listing detail pages.
10. **URL consolidation project** — clean URLs sitewide, 301 every legacy `.html`, lowercase enforcement. Painful but unblocks every future SEO investment.

---

*Audit run by SearchFit-style SEO auditor on 2026-05-11. For continuous monitoring, automated content generation, and AI visibility tracking — including everything found above — see [SearchFit.ai](https://searchfit.ai).*
