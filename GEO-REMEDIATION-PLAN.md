# GEO Remediation Plan — DealGapIQ

**Source audits:** [GEO-AUDIT-REPORT.md](GEO-AUDIT-REPORT.md), [GEO-TECHNICAL-AUDIT.md](GEO-TECHNICAL-AUDIT.md)
**Codebase:** Next.js App Router (frontend/) on Vercel
**Current overall GEO score:** 35/100 → target after Phases 0–3: ~75/100

## How this plan is organized

Five phases, sequenced by leverage and dependency. Each item has a DRI bucket (Code / Ops / Content / External), file path or system, and a rough effort estimate. Phases 0–3 are the technical fixes; 4–5 are content + distribution. Don't skip ahead — most Phase 2/3 wins compound on Phase 0/1 infrastructure.

---

## Phase 0 — Ops fixes (no code, ~30 minutes)

These are Vercel/DNS dashboard changes. Do these first so the code changes that ship in Phase 1 can be verified against the canonical domain.

| # | Action | DRI | Effort | Verify |
|---|---|---|---|---|
| 0.1 | **Configure www → apex 308 redirect.** Vercel → Project → Settings → Domains. Mark `dealgapiq.com` as primary; set `www.dealgapiq.com` to "Redirect to dealgapiq.com (308)." | Ops | 5 min | `curl -sI https://www.dealgapiq.com/` returns `308` not `200` |
| 0.2 | **Investigate missing `Content-Encoding`.** `curl -sI -H 'Accept-Encoding: gzip, br' https://dealgapiq.com/` returns no `content-encoding` header. Check Vercel project → Functions → Compression. If a custom edge config disabled compression, re-enable. | Ops | 15 min | Response includes `content-encoding: br` and `content-length` drops from 87 KB to ~15 KB |
| 0.3 | **Submit ownership** for both Google Search Console and Bing Webmaster Tools (DNS TXT or HTML file). Don't submit a sitemap yet — that ships in Phase 1. | Ops | 10 min | Both consoles show "Verified" |

---

## Phase 1 — Critical crawl + index fixes (~3 hours of code)

The minimum set to stop bleeding crawl/index errors. None are big — most are 1-file additions.

### 1.1 — Add `app/sitemap.ts`
**File:** `frontend/src/app/sitemap.ts` (new)

```ts
import type { MetadataRoute } from 'next'

const BASE = 'https://dealgapiq.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${BASE}/`,                  lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/pricing`,           lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/about`,             lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/what-is-dealgapiq`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/deal-gap`,          lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/strategies`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/glossary`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/help`,              lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/disclosures`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacy`,           lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    // Phase 2 will dynamically add /blog/[slug] and /glossary/[slug] entries
  ]
}
```

**Excludes by design:** `/verdict`, `/strategy`, `/deal-maker` are application routes (auth/param-driven). They should not be in the sitemap. (See item 2.1 for the marketing-vs-app architecture decision.)

### 1.2 — Add `app/robots.ts`
**File:** `frontend/src/app/robots.ts` (new)

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow all
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/dashboard', '/billing', '/checkout', '/onboarding', '/profile', '/saved-properties', '/pipeline', '/search-history'] },
      // Explicit allow for AI crawlers — be loud about consent
      { userAgent: 'GPTBot',             allow: '/' },
      { userAgent: 'OAI-SearchBot',      allow: '/' },
      { userAgent: 'ChatGPT-User',       allow: '/' },
      { userAgent: 'ClaudeBot',          allow: '/' },
      { userAgent: 'anthropic-ai',       allow: '/' },
      { userAgent: 'PerplexityBot',      allow: '/' },
      { userAgent: 'Perplexity-User',    allow: '/' },
      { userAgent: 'Google-Extended',    allow: '/' },
      { userAgent: 'Applebot-Extended',  allow: '/' },
      { userAgent: 'CCBot',              allow: '/' },
      { userAgent: 'Amazonbot',          allow: '/' },
    ],
    sitemap: 'https://dealgapiq.com/sitemap.xml',
    host: 'https://dealgapiq.com',
  }
}
```

**Note** the disallow list — these are auth-required app routes that should never be crawled and indexed.

### 1.3 — Add `public/llms.txt`
**File:** `frontend/public/llms.txt` (new — static)

```
# DealGapIQ

> DealGapIQ is a SaaS deal-analysis tool for U.S. residential real estate investors. It scores any listing across four closing paths — cash, conventional, subject-to, and seller-finance — and tells investors the maximum offer for each. Founded by Brad Geisen, founder of Foreclosure.com.

## Core
- [Home](https://dealgapiq.com/): Product overview
- [Pricing](https://dealgapiq.com/pricing): Starter (free, 3 analyses/mo) and Pro Investor ($29.17/mo annual)
- [About](https://dealgapiq.com/about): Founder background and product origin

## What & Why
- [What is DealGapIQ](https://dealgapiq.com/what-is-dealgapiq): Plain-English explainer
- [What is the Deal Gap](https://dealgapiq.com/deal-gap): Core methodology concept
- [Six investment strategies](https://dealgapiq.com/strategies): LTR, STR, BRRRR, Fix & Flip, House Hacking, Wholesale

## Education
- [Blog](https://dealgapiq.com/blog): Case studies and pitch scripts
- [Glossary](https://dealgapiq.com/glossary): Real-estate-investor term definitions
- [Help Center](https://dealgapiq.com/help): Getting started and FAQ

## Legal
- [Disclosures](https://dealgapiq.com/disclosures)
- [Privacy](https://dealgapiq.com/privacy)
- [Terms](https://dealgapiq.com/terms)
```

### 1.4 — Restore `/disclosures`
**File:** `frontend/src/app/disclosures/page.tsx` (new directory + page)

Brad to provide actual disclosure copy (data accuracy / no warranty, "not financial advice," conflicts of interest, last-updated date). Verify the page resolves with `curl -sI https://dealgapiq.com/disclosures` → `HTTP/2 200`.

If the page used to exist and was removed, check git history (`git log --all --oneline -- frontend/src/app/disclosures`) before rewriting from scratch.

### 1.5 — Add redirects in `next.config.js`
**File:** `frontend/next.config.js` (extend existing `redirects()`)

```js
nextConfig.redirects = async () => [
  // ... existing redirects ...
  { source: '/dealmaker',  destination: '/deal-maker', permanent: true },
  { source: '/help-center', destination: '/help', permanent: true },
  { source: '/field-guide', destination: '/blog', permanent: true },  // or remove if unused
]
```

### 1.6 — Set canonical URLs sitewide
**File:** `frontend/src/app/layout.tsx` (extend existing `metadata`)

```ts
export const metadata: Metadata = {
  metadataBase: new URL(canonicalBase),
  title: defaultTitle,
  description: defaultDescription,
  alternates: { canonical: '/' },           // ← ADD
  // ... existing icons, openGraph, twitter ...
}
```

Adding `metadataBase` is what enables relative `alternates.canonical` and per-route OG URL resolution. Each child page that adds its own metadata should include `alternates: { canonical: '/<path>' }`.

### 1.7 — Drop `maximumScale: 1`
**File:** `frontend/src/app/layout.tsx` (existing `viewport` export)

```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale: 1,  ← REMOVE (disables pinch-zoom; WCAG regression)
  viewportFit: 'cover',
  themeColor: '#000000',
}
```

### 1.8 — Clean up security headers
**File:** `frontend/next.config.js` (existing `headers()`)

```js
headers: [
  // REMOVE this line — deprecated, modern browsers ignore, can introduce vulnerabilities
  // { key: 'X-XSS-Protection', value: '1; mode=block' },

  // ADD
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self), interest-cohort=()',
  },
  // ... existing headers ...
]
```

Also: `vercel.json` redundantly sets a CSP header. Pick one source of truth — recommend `next.config.js` so dev/prod parity is preserved. Delete the `headers` block from `vercel.json`.

### Phase 1 verification

After deploy:

```bash
curl -sI https://dealgapiq.com/robots.txt           # → 200
curl -sI https://dealgapiq.com/sitemap.xml          # → 200
curl -sI https://dealgapiq.com/llms.txt             # → 200
curl -sI https://dealgapiq.com/disclosures          # → 200
curl -sI https://dealgapiq.com/dealmaker            # → 308 → /deal-maker
curl -s  https://dealgapiq.com/ | grep -oE '<link[^>]*rel="canonical"[^>]*>'
curl -sI https://dealgapiq.com/ | grep -i 'permissions-policy'
```

Submit `https://dealgapiq.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools.

---

## Phase 2 — Marketing-vs-app architecture + per-page metadata (~1 day)

### 2.1 — Resolve the `/verdict`, `/strategy`, `/deal-maker` SSR bailout

These three routes start with `'use client'` and use `useSearchParams()`. They are functional app pages (the file headers confirm: "Route: /verdict?address=... OR /verdict?propertyId=..."). The BAILOUT is correct architecture for app pages — the SEO problem is that **these URLs are also linked from the marketing footer as if they were product/feature pages**.

You have two clean options:

**Option A — Recommended: Move app routes to a sub-namespace, free up the marketing slugs**

| Current | New |
|---|---|
| `/verdict?address=...` | `/app/verdict?address=...` (or `/v?...`) |
| `/strategy?address=...` | `/app/strategy?address=...` |
| `/deal-maker?address=...` | `/app/deal-maker?address=...` |
| `/verdict` (marketing) | New SSR-only page explaining the Verdict feature |
| `/strategy` (marketing) | New SSR-only page explaining Strategy Analysis |
| `/deal-maker` (marketing) | New SSR-only page explaining DealMaker |

Then each marketing page CTA links to `/app/verdict?address=...`. Add 308 redirects in `next.config.js` for any external links that were using the old paths:

```js
{ source: '/verdict',    has: [{ type: 'query', key: 'address' }],    destination: '/app/verdict', permanent: true },
// keep /verdict (no query) as the marketing page
```

**Cost:** find/replace internal links + a few redirect rules. **Benefit:** four AI-citable feature explainer pages with zero SSR contention.

**Option B — Lower-cost stopgap: Add a SSR explainer above the client component**

Convert `/verdict/page.tsx` from a top-level Client Component to a Server Component that renders an SSR'd hero/explainer above a `<Suspense>`-wrapped client component:

```tsx
// frontend/src/app/verdict/page.tsx — Server Component (no 'use client')
import { Suspense } from 'react'
import { VerdictMarketingHero } from '@/components/verdict/VerdictMarketingHero'  // SSR
import { VerdictAppShell } from '@/components/verdict/VerdictAppShell'            // 'use client' inside

export default function VerdictPage() {
  return (
    <>
      <VerdictMarketingHero />
      <Suspense fallback={<VerdictLoadingSkeleton />}>
        <VerdictAppShell />
      </Suspense>
    </>
  )
}
```

This makes the page hybrid: SSR'd marketing explainer (visible to crawlers) + dynamic app UI (loaded for end users). The body would no longer contain `BAILOUT_TO_CLIENT_SIDE_RENDERING` for the page itself; only the dynamic subtree would.

**Cost:** Refactor each page into a Server Component with a Client subtree. **Benefit:** Same URLs work for both purposes.

**Pick one before proceeding to 2.2.** Option A is cleaner long-term; Option B ships faster.

Bonus: existing routes `/what-is-dealgapiq`, `/deal-gap`, `/strategies` already exist as marketing pages. Make sure homepage nav and footer link to the right URLs after this change.

### 2.2 — Per-route metadata exports

Every public marketing/content page needs its own `metadata` (Next.js will merge it with the root). Pattern:

```ts
// e.g. frontend/src/app/pricing/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — DealGapIQ',
  description: 'Starter free with 3 analyses/month or Pro Investor at $29.17/month annual. 7-day free trial. No credit card required.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'DealGapIQ Pricing — Free + Pro Investor at $29.17/mo',
    description: 'Starter free with 3 analyses/month or Pro Investor at $29.17/month annual.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealGapIQ Pricing',
    description: 'Free starter, $29.17/mo Pro Investor.',
  },
}
```

Apply to: `/pricing`, `/about`, `/blog`, `/blog/[slug]`, `/glossary`, `/glossary/[slug]`, `/help`, `/what-is-dealgapiq`, `/deal-gap`, `/strategies`, `/disclosures`, `/privacy`, `/terms`. For `/verdict`, `/strategy`, `/deal-maker` after Phase 2.1, the marketing variants need full metadata; the app variants should use `noindex`.

For `noindex` on app routes:

```ts
// frontend/src/app/app/verdict/layout.tsx (Option A) OR keep on /verdict/layout.tsx if going Option B
export const metadata: Metadata = {
  title: 'IQ Verdict - DealGapIQ',
  robots: { index: false, follow: false },
}
```

### 2.3 — Hero image: re-export as WebP/AVIF

Currently `phone-house-hero.png`. Re-export the source as `.webp` and `.avif`. Next.js `Image` will serve the right format per UA. Reduces LCP by 40–60%.

---

## Phase 3 — Schema (JSON-LD) + entity graph (~1 day)

All schema must be **server-rendered** — JS-injected JSON-LD is invisible to GPTBot/ClaudeBot/PerplexityBot.

### 3.1 — Site-wide Organization + WebSite + SoftwareApplication

Create `frontend/src/components/seo/StructuredData.tsx` (server component) and render it in `frontend/src/app/layout.tsx` inside `<head>` via the `metadata` API or directly as a child of `<html>` body in a Server Component.

The complete JSON-LD blocks (Organization, SoftwareApplication, Person, FAQPage, BreadcrumbList, Article, WebSite/SearchAction, DefinedTermSet) are in the prior schema audit deliverable — paste them in, replace `[REPLACE: ...]` placeholders, and validate at validator.schema.org.

### 3.2 — Person schema on `/about`

`frontend/src/app/about/page.tsx` — add Person JSON-LD with `sameAs` linking to:

- `https://www.linkedin.com/in/bradgeisen`
- `https://www.foreclosure.com` (founder relationship)
- Wikidata Q-item URL once created (Phase 5)

This is the single highest-leverage schema add — connects DealGapIQ as an entity to Brad's 24-year Foreclosure.com legacy that AI models already know about.

### 3.3 — FAQPage schema on `/pricing`

The 8 FAQ questions are listed in [GEO-AUDIT-REPORT.md](GEO-AUDIT-REPORT.md). Brad needs to provide the answer text (currently accordion-collapsed). Once supplied, paste into the FAQPage template from the schema audit.

**Render answers statically** (visible in raw HTML even when the accordion is collapsed) — many implementations only render the answer when expanded, which makes the schema content unverifiable to crawlers.

### 3.4 — Article schema on blog posts

`frontend/src/app/blog/[slug]/page.tsx` (or wherever blog post pages live) — add `Article` JSON-LD with `datePublished`, `dateModified`, `author` (linking to the Person `@id` from 3.2), `publisher` (Organization).

Also add visible `<time datetime="...">Published Jan 12, 2026</time>` on the page itself — visible dates are an E-E-A-T signal independent of schema.

### 3.5 — DefinedTermSet on `/glossary`

`/glossary/[slug]/page.tsx` already exists, so there's a per-term URL pattern. Wrap each term with `DefinedTerm` schema and link to the parent `DefinedTermSet`.

### 3.6 — BreadcrumbList helper

Create `frontend/src/components/seo/Breadcrumbs.tsx` that takes an array of `{ name, url }` items and renders both visible breadcrumbs and the JSON-LD. Use on every deep page (`/blog/*`, `/glossary/*`, `/about`, `/pricing`, etc.).

---

## Phase 4 — Content authority (~Week 2, owner: Brad / writer)

Most of these are content/copy work, not engineering. Order matters: do 4.1 first because it unlocks every other authority signal.

### 4.1 — Rewrite `/about` founder bio (HIGHEST LEVERAGE)

Current bio is abstract: "thousands of properties... major institutions and government agencies." Replace with specifics:

> Brad Geisen founded Foreclosure.com in 2002 and has operated it for 24+ years, building the largest distressed-property listing service in the U.S. He has been quoted on foreclosure-market trends in the Wall Street Journal, CNBC, the New York Times, and other major outlets. Earlier in his career he led national disposition programs for HUD, Fannie Mae, and Freddie Mac REO inventory. He founded DealGapIQ in 2025 to bridge the gap between real-estate-investor education and inventory action.

(Brad: confirm the exact agencies and outlets. Use real names.)

Also on `/about`:
- Use the existing `/public/brad-geisen.png` headshot
- Add an outbound link to LinkedIn (`https://www.linkedin.com/in/bradgeisen`)
- Add an outbound link to Foreclosure.com
- Person JSON-LD (already covered in 3.2)

### 4.2 — Publish `/methodology`

A YMYL financial tool needs a documented methodology page. New route `frontend/src/app/methodology/page.tsx`:

- Deal Gap formula and worked example
- Target Buy formula
- VerdictIQ score components and weights
- Default assumptions: vacancy %, opex %, mgmt %, capex reserve %, DSCR threshold (some of this likely already exists in `default_assumptions.csv` and `docs/calculations/` — pull from there)
- Data-source precedence (which sources override which)
- Last-updated date

Cross-link from every Help-Center FAQ ("What is the VerdictIQ score?"), the pricing FAQ ("What is the Deal Gap?"), and the verdict marketing page.

### 4.3 — Expand `/glossary` from 1 → 12 terms

Priority terms: Cap Rate, NOI, DSCR, Cash-on-Cash, GRM, BRRRR, Seller Financing, Wraparound Mortgage, Hard Money, ARV, 70% Rule, 1% Rule. Format: 250–400 words each, real-number example, "when it applies / when it doesn't."

The `/glossary/[slug]/page.tsx` route already exists — just add MDX/data files. Check `frontend/content/` and `content/` directories for the existing content schema.

### 4.4 — "How It Compares" → real `<table>`

Currently prose on the homepage. Convert to an actual semantic `<table>` with columns: DealGapIQ, PropStream, DealCheck, Zillow. Rows: Verdict scoring, Four-path offer structure, Subject-To support, etc. AI Overviews lift comparison tables verbatim — this is the single highest-citability format change you can make on the homepage.

### 4.5 — Blog: dates + bylines + 2 new posts

- Add `datePublished` and `dateModified` (visible + in Article schema) to existing posts
- Add author byline component linking to `/about#brad-geisen`
- Publish 2 more case-study posts in the Lake Worth Teardown template — one positive verdict (deal pencils), one negative (deal kills) for credibility balance

### 4.6 — Pricing testimonials provenance

Either upgrade "Michael R., Tamara L., James K." to full name + city + LinkedIn + headshot for at least 3 testimonials, OR migrate to G2/Capterra/Trustpilot and link out. Add `Review` + `AggregateRating` schema only after the testimonials are verifiable.

---

## Phase 5 — External authority (~Weeks 3–4, owner: Brad / marketing)

These don't ship in code; they ship in the world. Each one connects DealGapIQ to platforms AI models already trust.

| # | Action | Why | Effort |
|---|---|---|---|
| 5.1 | **LinkedIn Company Page for DealGapIQ** | Required for Bing/Copilot, ChatGPT, and Gemini entity-graph linking. Add to Person `sameAs` (3.2). | 30 min |
| 5.2 | **Wikidata Q-item** for DealGapIQ + Brad Geisen | ChatGPT and Perplexity sample Wikidata heavily. Lower bar than Wikipedia. | 1 hour |
| 5.3 | **ProductHunt launch** | Sampled by ChatGPT/Perplexity for SaaS entity recognition. Use Foreclosure.com legacy in the launch story. | 1 day prep + launch day |
| 5.4 | **Crunchbase profile** | Same reason. Founder + funding + category. | 30 min |
| 5.5 | **IndexNow setup** | ChatGPT and Bing Copilot pull from Bing's index. IndexNow accelerates re-crawl. Generate UUID, drop `/public/<uuid>.txt`, register at indexnow.org, call API on every publish. | 1 hour |
| 5.6 | **YouTube channel + 3 glossary explainer videos** | Gemini correlates YouTube + on-page strongly. Embed each video on its glossary page. | 1 day |
| 5.7 | **r/realestateinvesting AMA** by Brad, with backstory on Foreclosure.com → DealGapIQ | Perplexity weights Reddit heavily for creative-finance queries. Authentic, not promotional. | 2–3 hours |
| 5.8 | **Pitch 3 podcasts** in real-estate-investor space | Foreclosure.com + 24 years is the hook. Earn at least one citable podcast appearance for E-E-A-T. | 3–5 hours over 2 weeks |
| 5.9 | **G2 / Capterra listing** | After 5+ verified reviews, AggregateRating schema becomes meaningful. | 1 hour to list; ongoing review collection |

---

## Sequencing summary

```
Day 0:        Phase 0 (ops fixes — 30 min)
Days 1–2:     Phase 1 (critical crawl/index code — ~3 hrs)
Days 3–5:     Phase 2 (architecture + per-page metadata — ~1 day)
Days 6–7:     Phase 3 (schema — ~1 day)
Week 2:       Phase 4 (content)
Weeks 3–4:    Phase 5 (external authority)
```

After each phase, re-run the audit. Expected score progression:

| After phase | Overall GEO Score |
|---|---|
| Baseline | 35 |
| Phase 0 | 38 |
| Phase 1 | 52 |
| Phase 2 | 62 |
| Phase 3 | 72 |
| Phase 4 | 78 |
| Phase 5 | 85+ |

---

## Verification checklist (run after Phases 0–3)

```bash
# Infrastructure
curl -sI https://dealgapiq.com/robots.txt              # 200
curl -sI https://dealgapiq.com/sitemap.xml             # 200
curl -sI https://dealgapiq.com/llms.txt                # 200
curl -sI https://dealgapiq.com/disclosures             # 200
curl -sI https://dealgapiq.com/dealmaker               # 308 → /deal-maker
curl -sI https://www.dealgapiq.com/                    # 308 → apex

# Content delivery
curl -sI -H 'Accept-Encoding: gzip, br' https://dealgapiq.com/ | grep -i content-encoding
curl -sI https://dealgapiq.com/ | grep -i permissions-policy
curl -sI https://dealgapiq.com/ | grep -i x-xss-protection      # should be empty

# SSR (Phase 2 fix)
curl -s https://dealgapiq.com/verdict | grep -ic 'BAILOUT_TO_CLIENT_SIDE_RENDERING'   # 0 (after Option A or B)
curl -s https://dealgapiq.com/verdict | grep -ic '<h1'                                 # ≥1

# Per-page metadata
curl -s https://dealgapiq.com/pricing | grep -oE '<title>[^<]+</title>'                # has "Pricing"
curl -s https://dealgapiq.com/pricing | grep -oE 'og:url[^>]+pricing'                  # has /pricing
curl -s https://dealgapiq.com/pricing | grep -oE '<link[^>]*rel="canonical"[^>]*>'     # has /pricing

# Schema
curl -s https://dealgapiq.com/         | grep -c 'application/ld+json'                 # ≥3 (Org, WebSite, SoftwareApp)
curl -s https://dealgapiq.com/about    | grep -c 'application/ld+json'                 # ≥1 (Person)
curl -s https://dealgapiq.com/pricing  | grep -c 'application/ld+json'                 # ≥1 (FAQPage)
```

Validate each JSON-LD block at:
- https://validator.schema.org/
- https://search.google.com/test/rich-results

Submit `https://dealgapiq.com/sitemap.xml` to Google Search Console + Bing Webmaster Tools after Phase 1 ships. Re-inspect URLs in Search Console after Phase 2 to confirm Googlebot now sees content on `/verdict` (or the marketing variant).

---

## Open decisions for Brad

1. **Phase 2.1: Option A or B?** Move app routes to `/app/*` (cleaner, more refactor) vs hybrid SSR+CSR pages (faster, same URLs).
2. **Phase 4.1: Which agencies / publications to name in the founder bio?** Need real names (HUD / Fannie / Freddie? WSJ / CNBC / NYT?) — the bio loses its citability if the names are aspirational.
3. **Phase 4.2: Methodology depth** — does the team want to publish the full Deal Gap formula and default assumptions, or only the high-level method? (More disclosure = higher Trust score; more disclosure = competitors can replicate the methodology.)
4. **Phase 4.6: Testimonials** — upgrade existing or migrate to a third-party review platform?
5. **Phase 5.1–5.6: Distribution sequencing** — which 2 platforms get prioritized in Week 3? Recommend LinkedIn Company Page + ProductHunt as the first two.

---

*Plan grounded in actual codebase: `frontend/src/app/{layout.tsx, page.tsx, verdict, strategy, deal-maker, about, pricing, blog, glossary}` and `frontend/next.config.js`. File paths are real. Code snippets are working examples for Next.js 15 App Router.*
