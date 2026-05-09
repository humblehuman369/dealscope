# GEO Audit Report: DealGapIQ

**Audit Date:** 2026-05-08
**URL:** https://dealgapiq.com
**Business Type:** SaaS (Real Estate Investor Analytics — YMYL)
**Pages Analyzed:** 12 confirmed live (`/`, `/pricing`, `/about`, `/verdict`, `/strategy`, `/deal-maker`, `/help`, `/glossary`, `/blog`, `/privacy`, `/terms`, `/disclosures`)

---

## Executive Summary

**Overall GEO Score: 35/100 (Critical)**

DealGapIQ is essentially invisible to AI search engines today. The product content itself is competent and the founder (Brad Geisen, founder of Foreclosure.com) carries strong industry authority — but none of the GEO infrastructure that lets AI engines find, parse, attribute, or cite this site exists yet. There is no robots.txt, no sitemap, no llms.txt, no JSON-LD on any page, no Open Graph tags, three core product pages are JS-rendered shells, the `/disclosures` link in the footer 404s, and the brand has zero corroboration on Wikipedia, Crunchbase, ProductHunt, Reddit, G2, Capterra, Trustpilot, or LinkedIn (Company Page). The good news: most of these are 1–5 day fixes, and the existing 12-page footprint is a strong base. A focused 2-week sprint should roughly double the score.

### Score Breakdown

| Category | Score | Weight | Weighted |
|---|---|---|---|
| AI Citability | 52/100 | 25% | 13.0 |
| Brand Authority | 5/100 | 20% | 1.0 |
| Content E-E-A-T | 47/100 | 20% | 9.4 |
| Technical GEO | 54/100 | 15% | 8.1 |
| Schema & Structured Data | 4/100 | 10% | 0.4 |
| Platform Optimization | 31/100 | 10% | 3.1 |
| **Overall GEO Score** | | | **35/100** |

---

## Critical Issues (Fix Immediately)

| # | Issue | Pages Affected | Why It's Critical |
|---|---|---|---|
| C1 | **No JSON-LD anywhere** (Organization, SoftwareApplication, Person, FAQPage, Article, BreadcrumbList — verified across `/`, `/pricing`, `/about`, `/blog`) | Sitewide | AI engines cannot identify DealGapIQ as an entity, cannot link the founder to the brand, and disqualify the site from product-comparison answers. Single biggest GEO gap. |
| C2 | **`/verdict`, `/strategy`, `/deal-maker` return JS shells to non-JS clients** (only nav + logo in raw HTML) | 3 core feature pages | GPTBot, ClaudeBot, PerplexityBot do not execute JS. The exact pages a buyer lands on from "what does DealGapIQ do?" are invisible to AI crawlers. |
| C3 | **`/disclosures` returns 404** despite being linked from the footer | Sitewide trust | Broken trust link on a YMYL financial tool. Quality raters and AI E-E-A-T scoring penalize this hard. |
| C4 | **No robots.txt + no sitemap.xml + no llms.txt** (all 404) | Sitewide | Permissive by accident, not by signal. No discovery file. No explicit AI-crawler allowlist. No content map. |
| C5 | **No Open Graph or Twitter Card tags anywhere** | Sitewide | Every shared link to LinkedIn, X, Slack, iMessage, Facebook renders as a bare URL. Direct conversion damage every time the brand is shared. |
| C6 | **Zero off-site brand corroboration** — no Wikipedia, no Crunchbase, no ProductHunt, no LinkedIn Company Page, no Reddit, no YouTube, no G2/Capterra/Trustpilot | External | AI models won't cite an entity they can't verify from a second source. Founder authority (Foreclosure.com, 24 years) is unconnected to DealGapIQ in any structured way. |
| C7 | **`/dealmaker` 404s; canonical is `/deal-maker`** | Internal-link integrity | URL inconsistency creates dead paths. Verify no internal references use the unhyphenated form. |

---

## High Priority Issues (Fix Within 1 Week)

| # | Issue | Recommended Fix |
|---|---|---|
| H1 | About page hides the strongest authority signal: Brad Geisen = founder of Foreclosure.com (2002–present, 24+ years). Only the homepage byline mentions it. | Rewrite `/about` founder bio with named institutions, dates, named press citations. Add LinkedIn outbound link. Add Person schema with `sameAs` to LinkedIn, Foreclosure.com, ActiveRain, Wikidata. |
| H2 | No methodology page documenting how the Deal Gap, Target Buy, or VerdictIQ score is computed | Publish `/methodology` with formulas, default assumptions (vacancy %, opex %, mgmt %, capex reserve, DSCR threshold), data-source precedence. Cross-link from every FAQ and the Verdict UI. |
| H3 | Glossary has 1 visible term | Expand to 25–30 entries (Cap Rate, NOI, DSCR, Cash-on-Cash, GRM, BRRRR, Seller Financing, Wraparound, Hard Money, ARV, 70% Rule, 1% Rule, etc.). Add `DefinedTermSet` schema. |
| H4 | Only 2 blog posts — insufficient topical authority for YMYL | Publish 4 more posts in the Lake Worth Teardown template (real address, real Verdict screenshot, four-paths breakdown, outcome). Mix positive and negative verdicts for credibility. |
| H5 | 8 FAQs on `/pricing` are accordion-hidden HTML; no FAQPage schema | Render Q&A statically (visible in raw HTML even when collapsed) + add `FAQPage` JSON-LD. Same treatment for `/help`. |
| H6 | Testimonials are first-name + last-initial only ("Michael R., Tamara L., James K.") | Upgrade to full name + city + LinkedIn link + headshot for at least 3, OR migrate to a third-party platform (G2/Capterra/Trustpilot) and link out with `Review` + `AggregateRating` schema. |
| H7 | No publication or last-updated dates on blog posts | Add visible `datePublished` + `dateModified` plus `Article` schema with author byline. |
| H8 | No LinkedIn Company Page for DealGapIQ | Create page this week. Required for Bing/Copilot, ChatGPT, and Gemini entity-graph linking. |
| H9 | "How It Compares" homepage section is prose, not a comparison table | Convert to real `<table>` with DealGapIQ vs PropStream vs DealCheck columns. AI Overviews lift comparison tables verbatim. |

---

## Medium Priority Issues (Fix Within 1 Month)

| # | Issue | Fix |
|---|---|---|
| M1 | No `BreadcrumbList` schema on any deep page | Add to all `/blog/*`, `/glossary/*`, `/about`, `/pricing`. |
| M2 | No `WebSite` + `SearchAction` schema on homepage | Add (template provided in schema deliverable). |
| M3 | No security headers verifiable (HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP) | Add via `next.config.js` `headers()`. |
| M4 | No Wikidata entity for DealGapIQ or Brad Geisen | Create Wikidata Q-item (achievable; Wikipedia notability higher bar). Feeds ChatGPT entity recognition directly. |
| M5 | No YouTube channel | Launch with 5–10 short videos: one per glossary term ("What is Subject-To?"). Embed each on its glossary page — Gemini correlates YouTube + on-page strongly. |
| M6 | No Reddit / BiggerPockets footprint | Founder AMA on r/realestateinvesting + a "why I built this" post linking the glossary. Perplexity weights Reddit heavily for creative-finance queries. |
| M7 | Crunchbase + ProductHunt absent | Submit both this month. Both are heavily sampled by ChatGPT and Perplexity for SaaS entity recognition. |
| M8 | Press / Media page absent | Add `/press` even if empty, with founder email and Foreclosure.com legacy hook. Pitch 3 podcasts. |
| M9 | Content-Signal directive missing from robots.txt | Add `Content-Signal: search=yes, ai-train=yes, ai-retrieval=yes` per IETF draft. |

---

## Low Priority Issues (Optimize When Possible)

- L1 — No `speakable` property on Article schema (AI-assistant readiness signal)
- L2 — No PageSpeed Insights / CrUX field data retrievable; INP/LCP/CLS likely OK but unverified
- L3 — Internal-link graph is fine but anchor text could be more keyword-rich (e.g., link "the Deal Gap" to `/glossary/deal-gap` rather than generic CTAs)
- L4 — Consider 30-day money-back guarantee in addition to "cancel anytime" — high-leverage trust upgrade
- L5 — Missing physical address, phone, or named contact email in footer (entity name + email at minimum)
- L6 — Author card missing on blog posts (face + 1-line bio + link to /about)

---

## Category Deep Dives

### AI Citability (52/100)

| Block | Score | Note |
|---|---|---|
| Homepage hero | 38 | Punchy slogan, no quotable claim |
| Pricing FAQ pricing tiers | 78 | Concrete numbers, citation-ready |
| About founder bio | 32 | Vague — "thousands of properties," no agency names |
| Glossary (Subject-To) | 65 | Definitional but thin vs BiggerPockets/Investopedia |
| Lake Worth Teardown blog post | 70 | Strongest unique-perspective asset on the site |

**Strong content trapped behind weak structure.** The pricing FAQ and Lake Worth post are citation-grade; they just need FAQPage / Article schema and dates.

### Brand Authority (5/100)

The single largest drag on the overall score. Across Wikipedia, Wikidata, Crunchbase, ProductHunt, LinkedIn Company, G2, Capterra, Trustpilot, Reddit, YouTube, Twitter/X — DealGapIQ is absent from every one. Founder Brad Geisen has separate, robust authority (Foreclosure.com 24-year operating brand, LinkedIn, ActiveRain, ConnectedInvestors, prior WSJ/CNBC/NYT citations on foreclosure-market trends), and **none of it is connected to DealGapIQ via structured data or visible attribution.** Bridging that gap is the single highest-leverage move on the site.

### Content E-E-A-T (47/100)

| Dimension | Score | Notes |
|---|---|---|
| Experience | 16/25 | Lake Worth post is strong; only 2 blog posts overall; About bio is abstract |
| Expertise | 11/25 | No methodology page; glossary has 1 term; founder credentials thin |
| Authoritativeness | 7/25 | Critical: zero external validation; Foreclosure.com legacy not surfaced |
| Trustworthiness | 13/25 | `/disclosures` 404 is a critical hit; testimonials unverifiable; no dates on posts |

For a YMYL real-estate-investing tool, the Authoritativeness score is the most damaging — and the most fixable. One About-page rewrite + LinkedIn link + Person schema would move it from 7 to ~14 by itself.

### Technical GEO (54/100)

| Sub-category | Score | Status |
|---|---|---|
| Crawlability (robots/sitemap) | 35 | Critical — all 404 |
| Indexability (canonical, meta-robots) | 55 | Unverified at HTTP-header level; no obvious noindex |
| SSR / Rendering | 55 | High risk — three core pages JS-only |
| Performance (CWV inferred) | 70 | Next.js, responsive Image, no LCP preload |
| Mobile | 80 | Next.js defaults |
| Security headers | 50 | None visible |
| Internal linking | 70 | Tight graph but half destinations are JS shells |

**Stack:** Next.js (confirmed via `/_next/image`). All structural fixes (sitemap, OG, canonical, JSON-LD) ship as `metadata` exports + a `sitemap.ts` route — small surface, fast to implement.

`site:dealgapiq.com` returned zero Google results — consistent with a new, sparsely indexed domain. Sitemap submission to Google Search Console + Bing Webmaster Tools should resolve within 14 days.

### Schema & Structured Data (4/100)

Verified zero JSON-LD across `/`, `/pricing`, `/about`, `/blog`. Zero Microdata, zero RDFa, zero Open Graph, zero Twitter Card. The +4 reflects only that the site is live, crawlable, and has clean URLs and an HTML title.

**Production-ready JSON-LD blocks for Organization, SoftwareApplication, Person/Founder, FAQPage (8 questions, awaits real answers), BreadcrumbList, Article, WebSite/SearchAction, and DefinedTermSet are in the schema-audit deliverable.** All must be **server-rendered** — JavaScript-injected schema is invisible to GPTBot/ClaudeBot/PerplexityBot.

### Platform Optimization (31/100)

| Platform | Score | Strongest Lever |
|---|---|---|
| Google Gemini | 38 | YouTube channel + topic clusters; Google-Extended default-allowed |
| Google AI Overviews | 34 | FAQPage + DefinedTerm schema; comparison table on `/` |
| Perplexity AI | 32 | Reddit/BiggerPockets seeding + dated case studies |
| ChatGPT Web Search | 28 | Organization + Person schema with `sameAs`; Wikidata Q-item |
| Bing Copilot | 22 | LinkedIn Company Page + IndexNow + Bing Webmaster verification |

---

## Quick Wins (Implement This Week)

1. **Ship `robots.txt` + `app/sitemap.ts` + `public/llms.txt`** — 1 hour total. Templates in technical and visibility deliverables. Restores crawler discovery and explicitly allows GPTBot/ClaudeBot/PerplexityBot/Google-Extended.
2. **Fix SSR on `/verdict`, `/strategy`, `/deal-maker`** — remove `"use client"` from page-level components or split interactive widgets into client subcomponents while keeping prose server-rendered. Verify with `curl https://dealgapiq.com/verdict | grep -i "<h1\|<p"`.
3. **Fix `/disclosures` 404** — restore the page (or redirect target). Add disclaimer, no-warranty clause, conflict disclosures, last-updated date.
4. **Server-render Organization + SoftwareApplication + Person JSON-LD** on `/` and `/about`. Connect founder to brand via `sameAs` linking to LinkedIn + Foreclosure.com.
5. **Add Open Graph + Twitter Card meta** sitewide via Next.js `metadata` export. Every shared link improves immediately.

---

## 30-Day Action Plan

### Week 1 — Infrastructure & Trust Repairs
- [ ] Ship `robots.txt`, `sitemap.xml`, `llms.txt`
- [ ] Fix `/disclosures` 404 (CRITICAL — broken footer link on YMYL tool)
- [ ] Fix SSR on `/verdict`, `/strategy`, `/deal-maker`
- [ ] Reconcile `/dealmaker` vs `/deal-maker` (canonical is hyphenated; search internal references)
- [ ] Add `Organization` + `SoftwareApplication` JSON-LD on `/` (server-rendered)
- [ ] Add Open Graph + Twitter Card meta sitewide
- [ ] Submit sitemap to Google Search Console + Bing Webmaster Tools

### Week 2 — Authority Bridge & Schema Coverage
- [ ] Rewrite `/about` founder bio: name Foreclosure.com (2002–present), name agencies (HUD, Fannie Mae, Freddie Mac), name press citations (WSJ, CNBC, NYT — actual outlets), add LinkedIn outbound link, add headshot
- [ ] Add `Person` schema on `/about` with `sameAs` → LinkedIn, Foreclosure.com, Wikidata
- [ ] Add `FAQPage` schema on `/pricing` (render answers statically; paste real answer text into the 8 question slots)
- [ ] Add `Article` schema + visible dates + author byline on both blog posts
- [ ] Add `BreadcrumbList` to all deep pages
- [ ] Create LinkedIn Company Page + Wikidata Q-item

### Week 3 — Topical Authority Sprint
- [ ] Publish `/methodology` page documenting Deal Gap, Target Buy, VerdictIQ formulas + assumptions
- [ ] Expand `/glossary` from 1 to 12+ terms (priority: Cap Rate, NOI, DSCR, Cash-on-Cash, GRM, BRRRR, Seller Financing, Wraparound, Hard Money, ARV, 70% Rule, 1% Rule)
- [ ] Add `DefinedTermSet` + per-term `DefinedTerm` schema on `/glossary`
- [ ] Convert "How It Compares" on `/` to a real `<table>` with DealGapIQ vs PropStream vs DealCheck

### Week 4 — Experience Proof & Distribution
- [ ] Publish 2 new case-study posts (Lake Worth template; one positive verdict, one negative)
- [ ] Submit to ProductHunt + Crunchbase
- [ ] Launch YouTube channel; post first 3 glossary explainer videos; embed on glossary entries
- [ ] Founder AMA on r/realestateinvesting + post linking glossary
- [ ] Upgrade pricing testimonials to full provenance (3 minimum) or migrate to G2/Capterra
- [ ] Add `/press` page; pitch 3 real-estate podcasts using Foreclosure.com hook

---

## Appendix: Pages Analyzed

| URL | Status | GEO Issues |
|---|---|---|
| `/` | Live, SSR | No JSON-LD, no OG, "How It Compares" not a table |
| `/pricing` | Live, SSR | 8 FAQs without FAQPage schema, no Offer schema, weak testimonial provenance |
| `/about` | Live, SSR | Founder bio abstract; no Person schema; Foreclosure.com link absent |
| `/verdict` | **JS shell** | No SSR content visible to non-JS crawlers |
| `/strategy` | **JS shell** | No SSR content visible to non-JS crawlers |
| `/deal-maker` | **JS shell** | No SSR content visible to non-JS crawlers |
| `/dealmaker` | **404** | URL inconsistency; canonical is `/deal-maker` |
| `/help` | Live | No FAQ schema; help articles not surfaced as structured Q&A |
| `/glossary` | Live | Only 1 term visible; no DefinedTermSet schema |
| `/blog` | Live | Only 2 articles; no Article schema; no dates; no author bylines |
| `/privacy` | Live | (not deep-audited) |
| `/terms` | Live | (not deep-audited) |
| `/disclosures` | **404** | CRITICAL — footer link broken |
| `/robots.txt` | **404** | No crawler discovery file |
| `/sitemap.xml` | **404** | No XML sitemap |
| `/sitemap_index.xml` | **404** | — |
| `/llms.txt` | **404** | No AI content map |
| `/llms-full.txt` | **404** | — |
| `/field-guide` | **404** | Footer references this; verify intended path |
| `/help-center` | **404** | Use `/help` instead |

---

*Generated by GEO Audit Orchestrator — 5 specialized subagents (AI visibility, platform optimization, technical, content E-E-A-T, schema). Full per-agent findings (including production-ready JSON-LD blocks, robots.txt template, llms.txt template, and Next.js sitemap.ts) are available in the audit transcript.*
