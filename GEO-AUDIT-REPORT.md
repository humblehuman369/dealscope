# GEO Audit Report: DealGapIQ

**Audit Date:** 2026-05-10
**URL:** https://dealgapiq.com
**Business Type:** SaaS (residential real estate investment analytics)
**Pages Analyzed:** 12 (full nav set + key glossary detail)

---

## Executive Summary

**Overall GEO Score: 31/100 (Critical)**

DealGapIQ has good content bones — Next.js with SSR on the marketing pages, a 1,379-word definition-style glossary article that is genuinely citation-ready, and a founder (Brad Geisen, ex-Foreclosure.com) with rare authority in the niche. But every machine-readable signal layer above the raw HTML is missing: zero JSON-LD on every page, no robots.txt / sitemap.xml / llms.txt, four broken navigation links (`/help/{slug}`, `/field-guide`, `/disclosures`), and the three flagship product pages (`/verdict`, `/strategy`, `/deal-maker`) ship 8–10 server-rendered words each — they are effectively invisible to GPTBot, ClaudeBot, and PerplexityBot. The fix list is mostly low-effort configuration and schema work, not content rewrites. Realistic 90-day target: **31 → 70+**.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 52/100 | 25% | 13.0 |
| Brand Authority | 8/100 | 20% | 1.6 |
| Content E-E-A-T | 31/100 | 20% | 6.2 |
| Technical GEO | 54/100 | 15% | 8.1 |
| Schema & Structured Data | 3/100 | 10% | 0.3 |
| Platform Optimization | 22/100 | 10% | 2.2 |
| **Overall GEO Score** | | | **31/100** |

---

## Critical Issues (Fix Immediately)

1. **`/verdict`, `/strategy`, `/deal-maker` ship 8–10 SSR words.** The flagship product pages render only a Next.js app shell to crawlers — AI assistants asked "what does DealGapIQ's verdict do?" find nothing to cite. Convert each `app/<route>/page.tsx` to a Server Component that renders 300–600 words of explanatory copy *above* the `'use client'` interactive child. Same URLs, no inbound-link loss.

2. **`/help/{slug}` returns 404.** The `/help` index lists question titles, but article detail pages aren't routed at all. FAQ-style content is the format AI quotes verbatim — losing this surface entirely is the second-biggest citability hit. Build `app/help/[slug]/page.tsx` as a Server Component with `generateStaticParams()`.

3. **Zero JSON-LD on every page.** No Organization, no SoftwareApplication, no Article, no Person, no DefinedTerm, no BreadcrumbList. Adding the 7 priority schemas in the [Schema deep dive](#schema--structured-data-3100) moves Schema score from 3 → 78–85 alone.

4. **`/disclosures` returns 404 while linked from main nav.** For a financial-decision tool, a broken disclosures link is a severe Trust failure (and a likely compliance issue). Build it this week or remove the nav link until it ships.

5. **`/field-guide` returns 404 while linked from main nav.** Same broken-site signal hits Google AI Overviews and Gemini quality scoring. Either build it as the `/glossary/*` hub page or remove from nav.

## High Priority Issues

6. **No `robots.txt`, no `sitemap.xml`, no `llms.txt`.** AI crawlers default-allow but get zero structural signal. PerplexityBot and CCBot lean heavily on sitemaps. See [paste-ready files](#stub-robotstxt) below.

7. **Canonical link tags missing on most pages.** Duplicate-content risk, especially with `/pricing` reusing the homepage OG block.

8. **Per-page meta descriptions missing.** Only `/about` has its own — `/`, `/pricing`, `/glossary`, `/help` all inherit the homepage description, which causes Bing deduplication and weakens AI Overview snippets.

9. **No author bylines or dates on glossary content.** The Subject-To article is expert-level but anonymous and undated — AI engines can't verify recency or attribute authority.

10. **Brad Geisen's Foreclosure.com lineage is invisible to crawlers.** Single biggest unsurfaced authority asset on the site. `/about` mentions "large-scale real estate disposition programs" without naming Foreclosure.com, with no LinkedIn link, no headshot, no Person schema, no `sameAs`.

## Medium Priority Issues

11. **`/pricing` OG title/description duplicates the homepage** — Bing will deduplicate or downrank it.
12. **`/help` index ships 163 SSR words; `/glossary` index 65 words.** Indexes should SSR the full list of articles/terms with one-line descriptions.
13. **No methodology page.** A `/methodology` explaining how IQ Estimate, Target Buy, and Deal Gap are calculated would consolidate Trust signals AND give AI engines a citable "how it works" surface.
14. **No third-party social proof anywhere.** No reviews, testimonials, customer logos, press mentions.
15. **No Wikipedia/Wikidata entity** for DealGapIQ or Brad Geisen — closest entity anchor is a (likely-existing) Wikipedia entry for Foreclosure.com.
16. **Viewport meta uses `maximum-scale=1`** — accessibility issue (zoom blocked); not GEO-critical but easy to fix.

## Low Priority Issues

17. **No `x-robots-tag` HTTP header** as belt-and-suspenders against accidental noindex regressions.
18. **No IndexNow integration** — Vercel offers this; missing it slows Bing/Copilot freshness pings.
19. **No Google Search Console / Bing Webmaster Tools verification meta** observed on homepage.
20. **No FAQ schema** on `/help` (semantic value for AI parsing even though Google removed the rich result).

---

## Category Deep Dives

### AI Citability (52/100)

**Best in class:** [`/glossary/subject-to-financing`](https://dealgapiq.com/glossary/subject-to-financing) — 1,379 SSR words, definition-first structure, numbered example with real dollar figures, explicit risk list. Block-level citability ~78. This is the template every other long-form page should follow.

**Solid (60–70 range):** `/` (1,091w), `/about` (885w), `/pricing` (898w). All three are server-rendered with substantive text and clear value propositions.

**Citation-invisible:**
| Page | SSR Words | Issue |
|---|---|---|
| `/verdict` | 8 | CSR-only Next.js shell |
| `/strategy` | 8 | CSR-only |
| `/deal-maker` | 10 | CSR-only |
| `/help/{slug}` | — | 404 (not routed) |
| `/field-guide` | — | 404 (broken nav link) |
| `/disclosures` | — | 404 (broken nav link) |
| `/help` (index) | 163 | titles only |
| `/glossary` (index) | 65 | thin shell |

Only ~5 of ~12 advertised routes carry meaningful indexable surface. Fixing the CSR pages (Critical Issue #1) and routing help articles (#2) doubles your effective citation surface.

### Brand Authority (8/100)

DealGapIQ launched ~10 days ago (May 2026), so a low score here is expected — but the asset to fix it already exists: **Brad Geisen, founder of Foreclosure.com (1999, 24 years operating)** is plausibly an entity LLMs can resolve via the Foreclosure.com Wikipedia/Wikidata trail. It's the highest-leverage move available.

| Platform | Inferred Status | Action |
|---|---|---|
| Wikipedia (DealGapIQ) | Absent (too new) | Defer 6+ months until notability |
| Wikipedia (Brad Geisen) | Likely absent | **High-ROI:** create stub citing Foreclosure.com founding |
| Wikipedia (Foreclosure.com) | Likely present | Verify; add "DealGapIQ" mention if appropriate |
| LinkedIn company page | Verify | Should exist, complete profile, link from `/about` |
| Reddit (r/realestateinvesting, r/RealEstate) | Absent | Plan organic seeding via Brad's own AMA |
| YouTube | Founder-only | Brad-channel walk-throughs of the tool |
| Industry press (Inman, HousingWire) | Absent | Founder-led launch piece is a single phone call |
| BiggerPockets | Absent | Brad guest essay on "the Deal Gap" |

### Content E-E-A-T (31/100)

| Sub-pillar | Score | Driver |
|---|---|---|
| Experience | 28 | Brad's hands-on history is gold but barely surfaced; /about copy reads like generic-consultant boilerplate |
| Expertise | 42 | Subject-To glossary entry is genuinely expert-level — but anonymous, undated, uncited |
| Authoritativeness | 22 | No press, no data-partner badges, no author entity pages, no sameAs anywhere |
| Trustworthiness | 31 | `/disclosures` 404 is a -15 critical hit; no methodology, no reviews, no team page |

**E-E-A-T moats DealGapIQ has and competitors (Mashvisor, DealCheck, Privy) don't:**

1. **Operator-founder with 24-year quantified track record** in the exact adjacent category. Surface on /about hero, homepage footer, glossary bylines, press hook.
2. **Proprietary buyer-behavior dataset** from Foreclosure.com (48–52% trial→paid held for 24 years). Publish a quarterly "State of the Real Estate Buyer" report — citation magnet + press flywheel.
3. **Six named data sources blended transparently** (Zillow, RentCast, Redfin, Realtor.com, Mashvisor, IQ Estimate). Convert the homepage mention into a methodology page + visible badge row.

### Technical GEO (54/100)

| Layer | Status |
|---|---|
| HTTPS + HSTS preload | ✓ |
| Security headers (CSP, X-Frame-Options, X-Content-Type-Options) | ✓ |
| Vercel + Next.js (good substrate) | ✓ |
| SSR on marketing pages | ✓ |
| **SSR on product pages** | ✗ (8–10 words) |
| **robots.txt** | ✗ (404) |
| **sitemap.xml** | ✗ (404) |
| **llms.txt** | ✗ (404) |
| **Per-page canonical tags** | ✗ (missing on most) |
| **Per-page meta descriptions** | ✗ (only /about) |
| Broken nav routes | ✗ (3 confirmed 404s) |
| Mobile viewport (`maximum-scale=1`) | a11y issue |

Fix #1 (SSR the product pages) alone moves the technical score from 54 → ~78.

### Schema & Structured Data (3/100)

Effective zero. The 3 points reflect that OG/Twitter meta tags exist (adjacent semantic signal), but no Schema.org structured data exists anywhere. The 7 priority schemas to add, ranked by AI-visibility impact:

1. **Organization + WebSite** (root layout) — entity anchor for ChatGPT/Claude/Perplexity panels
2. **SoftwareApplication + Offer** (`/`, `/pricing`) — AI pricing-comparison cites
3. **Person — Brad Geisen** (`/about`) — E-E-A-T author signal
4. **DefinedTerm + Article + speakable** (every `/glossary/[slug]`) — DealGapIQ's biggest single citation opportunity
5. **DefinedTermSet** (`/glossary` index)
6. **BreadcrumbList** (all nested pages)
7. **FAQPage** (`/help` — inline answers; do not link to 404 pages)

**Skip for now:** Review/AggregateRating (no real reviews → policy violation risk), HowTo (deprecated for rich results), Course/Event/Product (wrong types).

Realistic post-implementation Schema score: **78–85/100**.

Full ready-to-paste JSON-LD blocks are in [Appendix B](#appendix-b-ready-to-paste-json-ld-stubs).

### Platform Optimization (22/100)

| Platform | Score | Biggest Driver |
|---|---|---|
| Google AI Overviews | 18 | Zero schema + broken nav routes + no dates |
| ChatGPT Web Search | 28 | Bing-indexable substrate, but no entity resolution for founder lineage |
| Perplexity | 22 | Has citable passages but no schema/dates → no freshness preference vs. Investopedia |
| Gemini (Google-Extended) | 20 | No Knowledge Graph anchor; broken nav suppresses AIO eligibility |
| Bing Copilot | 25 | Most forgiving; still missing IndexNow and msvalidate.01 |

**Two biggest opportunity gaps to close:**

- **Google AI Overviews (18 → realistic 65):** Ship the schema bundle + fix broken nav + add dates/bylines to glossary. The Subject-To page becomes a legitimate AIO citation candidate within 4–8 weeks.
- **ChatGPT Web Search (28 → realistic 70):** Ship Organization + Person schema with `sameAs` linking Brad to Foreclosure.com / LinkedIn. ChatGPT's entity layer specifically rewards founder-led brands with verifiable lineage — DealGapIQ has the lineage, just not in machine-readable form.

---

## Quick Wins (Implement This Week)

1. **Ship `robots.txt`, `sitemap.xml`, `llms.txt`** (paste-ready stubs in Appendix A). Crawler Access score 55 → ~85. ~1 hour.
2. **Add `Organization` + `WebSite` JSON-LD to `app/layout.tsx`** (Appendix B). Schema score 3 → ~25 immediately. ~30 minutes.
3. **Remove `/field-guide` and `/disclosures` from main nav** (or build minimum-viable versions today). Eliminates the broken-site signal.
4. **Add `generateMetadata` with self-canonical and unique description to every route.** Fixes Issues #7, #8 in one sweep. ~2 hours.
5. **SSR a 300-word "What is the IQ Verdict?" block on `/verdict`** above the existing `'use client'` component. Same pattern for `/strategy` and `/deal-maker`. Single biggest content-side lever.

---

## 30-Day Action Plan

### Week 1 — Foundation files & emergency patches
- [ ] Add `public/robots.txt`, `app/sitemap.ts` (or `public/sitemap.xml`), `public/llms.txt`
- [ ] Add `Organization` + `WebSite` JSON-LD to `app/layout.tsx`
- [ ] Remove broken nav links to `/field-guide` and `/disclosures` (or ship MVP pages)
- [ ] Build `app/disclosures/page.tsx` as static SSR (compliance must-have)
- [ ] Add `alternates: { canonical }` and unique descriptions via `generateMetadata` to every route
- [ ] Verify Google Search Console + Bing Webmaster Tools, submit sitemap
- [ ] Remove `maximum-scale=1` from viewport meta

### Week 2 — Make the product pages discoverable
- [ ] Refactor `app/verdict/page.tsx` to Server Component with 400–600 SSR words above `'use client'` child
- [ ] Same for `app/strategy/page.tsx` and `app/deal-maker/page.tsx`
- [ ] Add `SoftwareApplication` + `Offer` JSON-LD to `/` and `/pricing`
- [ ] Build `app/help/[slug]/page.tsx` with `generateStaticParams` over MDX/CMS
- [ ] Add `FAQPage` JSON-LD to `/help` (inline answers)

### Week 3 — Surface Brad's authority
- [ ] Rewrite `/about` with the founder bio block (see EEAT recommendations)
- [ ] Add Brad headshot, LinkedIn link, `Person` JSON-LD with `sameAs`
- [ ] Add author bylines + `datePublished`/`dateModified` to every `/glossary/*` page
- [ ] Add `Article` + `DefinedTerm` + `speakable` JSON-LD to `/glossary/subject-to-financing`
- [ ] Add `DefinedTermSet` JSON-LD to `/glossary` index; SSR full term list
- [ ] Build `/methodology` page (~900 words) explaining IQ Estimate, Target Buy, Deal Gap

### Week 4 — Build authority surface area
- [ ] Add data-source trust strip to homepage with link to `/methodology`
- [ ] Draft Wikipedia stub for Brad Geisen (verify Foreclosure.com page exists; add reference)
- [ ] Pitch single launch piece to Inman or HousingWire
- [ ] Plan first quarterly "State of the Real Estate Buyer" report using Foreclosure.com dataset
- [ ] Add 5–10 more `/glossary/[slug]` entries at the same depth as Subject-To
- [ ] Set up IndexNow via Vercel integration

---

## Appendix A — Stub Files

### `public/robots.txt`
```
# DealGapIQ — robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /account/
Disallow: /dashboard/

# Explicit AI crawler allow-list
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: https://dealgapiq.com/sitemap.xml
```

### `app/sitemap.ts` (Next.js App Router preferred over static XML)
```ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://dealgapiq.com';
  const today = new Date().toISOString();
  const staticRoutes = [
    { path: '/', priority: 1.0 },
    { path: '/verdict', priority: 0.9 },
    { path: '/strategy', priority: 0.9 },
    { path: '/deal-maker', priority: 0.9 },
    { path: '/pricing', priority: 0.9 },
    { path: '/about', priority: 0.7 },
    { path: '/glossary', priority: 0.6 },
    { path: '/help', priority: 0.5 },
    { path: '/methodology', priority: 0.6 },
    { path: '/disclosures', priority: 0.4 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
  ];
  // TODO: enumerate /glossary/[slug] and /help/[slug] from your content source
  return staticRoutes.map(r => ({
    url: `${base}${r.path}`,
    lastModified: today,
    changeFrequency: 'monthly',
    priority: r.priority,
  }));
}
```

### `public/llms.txt`
```
# DealGapIQ

> DealGapIQ is a residential real estate deal analysis platform that scores investment properties across six acquisition strategies (long-term rental, short-term rental, BRRRR, fix & flip, house hack, wholesale) and surfaces the Deal Gap — the distance between the asking price and the price an investor should actually offer.

Founded by Brad Geisen, founder of Foreclosure.com (1999), DealGapIQ blends data from Zillow, RentCast, Redfin, Realtor.com, and Mashvisor with its own IQ Estimate model.

## Canonical entry points
- [Homepage](https://dealgapiq.com/): product overview
- [About](https://dealgapiq.com/about): founder story and methodology philosophy
- [Pricing](https://dealgapiq.com/pricing): Free and Pro ($29.17/mo annual / $39.99/mo monthly, 7-day trial)
- [Methodology](https://dealgapiq.com/methodology): how IQ Estimate, Target Buy, and Deal Gap are calculated

## Glossary
- [Subject-To Financing](https://dealgapiq.com/glossary/subject-to-financing)

## Optional
- [Privacy Policy](https://dealgapiq.com/privacy)
- [Terms of Service](https://dealgapiq.com/terms)
```

---

## Appendix B — Ready-to-Paste JSON-LD Stubs

(Replace `[REPLACE: …]` placeholders with real values. All blocks go inside `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />` in Server Components — never inside `'use client'`.)

### Organization + WebSite (in `app/layout.tsx`)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://dealgapiq.com/#organization",
      "name": "DealGapIQ",
      "legalName": "DealGapIQ",
      "url": "https://dealgapiq.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://dealgapiq.com/[REPLACE: logo path]",
        "width": 512,
        "height": 512
      },
      "description": "Residential real estate deal analysis platform that scores investment properties across six acquisition strategies and surfaces the Deal Gap.",
      "founder": { "@id": "https://dealgapiq.com/about#brad-geisen" },
      "foundingDate": "[REPLACE: YYYY-MM-DD]",
      "sameAs": [
        "[REPLACE: LinkedIn company URL]",
        "[REPLACE: X URL]",
        "[REPLACE: YouTube channel URL]"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://dealgapiq.com/#website",
      "url": "https://dealgapiq.com",
      "name": "DealGapIQ",
      "publisher": { "@id": "https://dealgapiq.com/#organization" }
    }
  ]
}
```

### SoftwareApplication + Offer (in `app/page.tsx` and `app/pricing/page.tsx`)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://dealgapiq.com/#software",
  "name": "DealGapIQ",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Real Estate Investment Analysis",
  "operatingSystem": "Web",
  "url": "https://dealgapiq.com",
  "publisher": { "@id": "https://dealgapiq.com/#organization" },
  "featureList": [
    "Six-strategy deal scoring (LTR, STR, BRRRR, Flip, House Hack, Wholesale)",
    "Deal Gap analysis",
    "IQ Estimate (multi-source valuation blend)",
    "Subject-To and creative financing modeling",
    "Investor verdict and four-paths offer guidance"
  ],
  "offers": [
    { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "category": "Free" },
    { "@type": "Offer", "name": "Pro (Annual)", "price": "29.17", "priceCurrency": "USD", "category": "subscription" },
    { "@type": "Offer", "name": "Pro (Monthly)", "price": "39.99", "priceCurrency": "USD", "category": "subscription" }
  ]
}
```

### Person — Brad Geisen (in `app/about/page.tsx`)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://dealgapiq.com/about#brad-geisen",
  "name": "Brad Geisen",
  "url": "https://dealgapiq.com/about",
  "jobTitle": "Founder",
  "worksFor": { "@id": "https://dealgapiq.com/#organization" },
  "knowsAbout": [
    "Residential real estate investing",
    "Foreclosure markets",
    "Creative financing",
    "Subject-To acquisitions",
    "Real estate SaaS"
  ],
  "sameAs": [
    "[REPLACE: Brad's LinkedIn URL]",
    "[REPLACE: Foreclosure.com founder bio URL]",
    "[REPLACE: Brad's X URL]"
  ]
}
```

### Article + DefinedTerm + Speakable (in `app/glossary/[slug]/page.tsx`)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "DefinedTerm",
      "@id": "https://dealgapiq.com/glossary/subject-to-financing#term",
      "name": "Subject-To Financing",
      "description": "A real estate acquisition strategy where the buyer takes title to a property subject to the existing mortgage, which remains in the seller's name while the buyer makes the payments.",
      "termCode": "subject-to-financing",
      "url": "https://dealgapiq.com/glossary/subject-to-financing",
      "inDefinedTermSet": "https://dealgapiq.com/glossary#termset"
    },
    {
      "@type": "Article",
      "@id": "https://dealgapiq.com/glossary/subject-to-financing#article",
      "headline": "What Is Subject-To Financing? A Plain-English Guide With Examples",
      "url": "https://dealgapiq.com/glossary/subject-to-financing",
      "wordCount": 1379,
      "datePublished": "[REPLACE: YYYY-MM-DD]",
      "dateModified": "[REPLACE: YYYY-MM-DD]",
      "author": { "@id": "https://dealgapiq.com/about#brad-geisen" },
      "publisher": { "@id": "https://dealgapiq.com/#organization" },
      "mainEntityOfPage": "https://dealgapiq.com/glossary/subject-to-financing",
      "about": { "@id": "https://dealgapiq.com/glossary/subject-to-financing#term" },
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": ["h1", ".definition-summary"]
      }
    }
  ]
}
```

### BreadcrumbList (per nested page)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dealgapiq.com/" },
    { "@type": "ListItem", "position": 2, "name": "Glossary", "item": "https://dealgapiq.com/glossary" },
    { "@type": "ListItem", "position": 3, "name": "Subject-To Financing", "item": "https://dealgapiq.com/glossary/subject-to-financing" }
  ]
}
```

### FAQPage (in `app/help/page.tsx` — inline answers, do NOT link to 404 detail pages)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "url": "https://dealgapiq.com/help",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is DealGapIQ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[REPLACE: 2–3 sentence answer inline]"
      }
    }
  ]
}
```

---

## Appendix C — Pages Analyzed

| URL | Status | SSR Words | JSON-LD | Issues |
|---|---|---|---|---|
| `/` | 200 | 1091 | 0 | No schema, no canonical, shared OG |
| `/about` | 200 | 885 | 0 | No Person schema, no LinkedIn, no FCom mention |
| `/pricing` | 200 | 898 | 0 | No Product/Offer schema, OG duplicates homepage |
| `/verdict` | 200 | **8** | 0 | **CSR-only — AI-invisible** |
| `/strategy` | 200 | **8** | 0 | **CSR-only — AI-invisible** |
| `/deal-maker` | 200 | **10** | 0 | **CSR-only — AI-invisible** |
| `/help` | 200 | 163 | 0 | Thin index; detail pages 404 |
| `/glossary` | 200 | 65 | 0 | Thin index; no DefinedTermSet |
| `/glossary/subject-to-financing` | 200 | 1379 | 0 | Strong content; no Article schema, no byline, no date |
| `/privacy` | 200 | 618 | 0 | OK |
| `/terms` | 200 | 587 | 0 | OK |
| `/disclosures` | **404** | — | — | **Broken nav link — critical for financial tool** |
| `/field-guide` | **404** | — | — | **Broken nav link** |
| `/help/{slug}` | **404** | — | — | **Articles never routed** |
| `/robots.txt` | **404** | — | — | **Missing** |
| `/sitemap.xml` | **404** | — | — | **Missing** |
| `/llms.txt` | **404** | — | — | **Missing** |

---

*Audit produced by /geo-audit. Full subagent transcripts available in the audit working directory.*
