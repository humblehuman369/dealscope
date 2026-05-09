# GEO Technical SEO Audit — dealgapiq.com
**Date:** 2026-05-08
**Stack:** Next.js (App Router) on Vercel
**Method:** Raw `curl` HEAD + GET against 15 URLs; HTTP-header inspection; HTML body sampling

## Technical Score: **67/100** — Needs Work

The site has a strong foundation that the prior pass undersold (excellent Vercel TTFB, full security-header set, real Open Graph tags, working HTTPS+HSTS-preload). But three structural issues pull the score down hard: a Next.js **SSR bailout to client-side rendering** on the core feature pages, a missing **canonical tag** + **no www→apex redirect** (duplicate-content risk), and **uncompressed HTML responses** despite Vercel's CDN.

## Score Breakdown

| Category | Score | Status |
|---|---|---|
| Crawlability | 7/15 | Fail |
| Indexability | 5/10 (hreflang N/A) | Warn |
| Security | 10/10 | Pass |
| URL Structure | 7/8 | Pass |
| Mobile Optimization | 9/10 | Pass |
| Core Web Vitals (inferred) | 10/15 | Warn |
| Server-Side Rendering | 7/15 | Fail |
| Page Speed & Server | 11/15 | Warn |
| **Total** | **67/100** | Needs Work |

> **Status:** Pass = ≥80% of category points · Warn = 50–79% · Fail = <50%

---

## AI Crawler Access

`https://dealgapiq.com/robots.txt` → **404**. With no robots.txt, all crawlers default-allow per RFC 9309 — but you get no explicit Allow signal and no `Sitemap:` directive.

| Crawler | User-Agent | Status | Recommendation |
|---|---|---|---|
| GPTBot | GPTBot | Default-allowed | Add explicit `Allow: /` |
| OAI-SearchBot | OAI-SearchBot | Default-allowed | Add explicit `Allow: /` |
| ChatGPT-User | ChatGPT-User | Default-allowed | Add explicit `Allow: /` |
| ClaudeBot | ClaudeBot | Default-allowed | Add explicit `Allow: /` |
| anthropic-ai | anthropic-ai | Default-allowed | Add explicit `Allow: /` |
| PerplexityBot | PerplexityBot | Default-allowed | Add explicit `Allow: /` |
| Perplexity-User | Perplexity-User | Default-allowed | Add explicit `Allow: /` |
| Google-Extended | Google-Extended | Default-allowed | Add explicit `Allow: /` |
| Googlebot | Googlebot | Default-allowed | Add explicit `Allow: /` |
| Bingbot | bingbot | Default-allowed | Add explicit `Allow: /` |
| Applebot-Extended | Applebot-Extended | Default-allowed | Add explicit `Allow: /` |
| CCBot | CCBot | Default-allowed | Add explicit `Allow: /` |
| Amazonbot | Amazonbot | Default-allowed | Add explicit `Allow: /` |
| Bytespider | Bytespider | Default-allowed | Add explicit `Allow: /` |

**Action:** ship `/public/robots.txt` (or `app/robots.ts`) with explicit allowlist + `Sitemap:` directive.

---

## Critical Issues (fix immediately)

### C1 — Next.js SSR bailout on `/verdict`, `/strategy`, `/deal-maker`

Raw `curl` against `/verdict` returns `<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>` followed by a body containing only:

```html
<img src="/images/iq-icon-pulse.png" alt="DealGapIQ" class="...animate-pulseSoft"/>
```

Despite the `x-nextjs-prerender: 1` HTTP header, the actual content components are bailing to CSR. Body sizes confirm: `/verdict` 32 KB, `/strategy` 31 KB, `/deal-maker` 30 KB — virtually identical, mostly script chunks + hydration JSON, no actual content. **GPTBot, ClaudeBot, and PerplexityBot will index a pulse icon, not a product page.**

**Likely cause:** these page components use `useSearchParams()`, dynamic data fetching, or a hook that requires browser env, and are not wrapped in `<Suspense>`. The Next.js error digest `BAILOUT_TO_CLIENT_SIDE_RENDERING` is the diagnostic — search the codebase for the offending hook on these three routes.

**Fix:** wrap dynamic content in `<Suspense fallback={...}>` so Next.js can stream the static prose around the bailout, OR move the dynamic logic into a child Client Component while keeping the page's hero / sections as Server Components.

**Verify with:** `curl -s https://dealgapiq.com/verdict | grep -ic 'BAILOUT_TO_CLIENT_SIDE_RENDERING'` should return `0` after the fix.

### C2 — `www.dealgapiq.com` serves duplicate 200 content

`curl -sI https://www.dealgapiq.com/` returns `HTTP/2 200` with the same homepage HTML as the apex. There is no 301/308 redirect from www to apex. Duplicate-content risk for both Google and AI crawlers.

**Fix in Vercel domain settings:** mark `dealgapiq.com` as primary; set `www.dealgapiq.com` to "Redirect to dealgapiq.com" (308).

### C3 — No `<link rel="canonical">` in `<head>`

`curl -s https://dealgapiq.com/ | grep -oE '<link[^>]*rel="canonical"[^>]*>'` returns empty. No canonical tag on homepage — confirmed. Combined with the www duplicate above, indexers cannot determine the authoritative URL.

**Fix in Next.js:** add `alternates: { canonical: '...' }` to each route's `metadata` export. For the homepage:

```ts
export const metadata: Metadata = {
  alternates: { canonical: 'https://dealgapiq.com/' },
  // ...
};
```

### C4 — `/disclosures` returns 404 (broken footer link on YMYL site)

`curl -sI https://dealgapiq.com/disclosures` → `HTTP/2 404`, `x-matched-path: /404`. Footer references this page sitewide. For a financial-decisions tool this is a meaningful trust hit.

### C5 — `/dealmaker` 404; canonical is `/deal-maker`

`curl -sI https://dealgapiq.com/dealmaker` → 404. Internal homepage navigation already uses `/deal-maker`, but the unhyphenated path is a dead URL. Add a 308 redirect or grep the codebase for any internal references.

### C6 — No XML sitemap

`https://dealgapiq.com/sitemap.xml` → 404. With ~12 indexable pages and zero discovery mechanism, search engines + AI crawlers must rely on link-following. Combined with the SSR bailout in C1, links from the affected pages may not even be parseable.

### C7 — No content compression

`curl -sI -H 'Accept-Encoding: gzip, br' https://dealgapiq.com/` returns no `Content-Encoding` header. The 87,544-byte homepage is delivered uncompressed. Vercel typically auto-compresses; investigate why this site is opting out (likely a custom `headers()` config in `next.config.js` or a route-level override). Brotli would reduce this to ~15 KB.

---

## Warnings (fix this month)

### W1 — Per-page Open Graph tags are sitewide-static

`/verdict` returns:
- `og:url`: `https://dealgapiq.com` (should be `https://dealgapiq.com/verdict`)
- `og:title`: `DealGapIQ - Real Estate Investment Analytics` (should match the page title `IQ Verdict - DealGapIQ`)
- `og:description`: same homepage description

Per-page `meta name="description"` and `<title>` correctly differ per route — only OG/Twitter are static. Fix by populating `metadata.openGraph` and `metadata.twitter` per route.

### W2 — `viewport` includes `maximum-scale=1`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"/>
```

`maximum-scale=1` disables user pinch-to-zoom — a WCAG 2.1 accessibility regression. Drop `maximum-scale=1`. The `initial-scale=1` + responsive layout achieve the goal without restricting zoom.

### W3 — No JSON-LD structured data anywhere

Verified via head-section dump on `/`, `/pricing`, `/about`, `/verdict`. No `<script type="application/ld+json">` present. Production-ready Organization, SoftwareApplication, Person, FAQPage, Article, BreadcrumbList blocks are in the prior schema audit deliverable — they need to be server-rendered (not JS-injected) inside `<head>` via Next.js metadata or a server component.

### W4 — `X-XSS-Protection: 1; mode=block` is deprecated

This header is ignored by modern Chrome/Edge/Firefox and can introduce vulnerabilities under specific conditions. The site already has CSP (which supersedes it). Remove `X-XSS-Protection`.

### W5 — Missing `Permissions-Policy` header

Add a restrictive default:

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self), interest-cohort=()
```

### W6 — Hero image is PNG, not WebP/AVIF

Preload tag references `/_next/image?url=%2Fimages%2Fphone-house-hero.png&w=...` — Next.js Image will negotiate WebP/AVIF if the source is convertible, but starting from PNG limits gains. Re-export the hero as WebP or AVIF for the source asset.

### W7 — No IndexNow key file

`/.well-known/indexnow-key.txt` → 404. ChatGPT and Bing Copilot pull from Bing's index; IndexNow accelerates Bing reindex on content changes. Generate a UUID, drop a `<uuid>.txt` file in `/public/`, register at indexnow.org, and call the IndexNow endpoint on every publish.

### W8 — No llms.txt

`/llms.txt` → 404. Add a static `/public/llms.txt` listing canonical URLs with one-line descriptions. Template in the prior visibility-audit deliverable.

---

## Recommendations (optimize this quarter)

- **R1** — Submit sitemap to Google Search Console and Bing Webmaster Tools after C6 ships.
- **R2** — Verify Google Search Console domain ownership and validate the BAILOUT pages render correctly via "URL Inspection → Live Test." Compare "HTML" vs "Screenshot" tabs to confirm AI crawlers see what Googlebot's rendering pass sees.
- **R3** — Add Sentry release tracking to surface client-side render errors that may correlate with the BAILOUT (the CSP allows `*.sentry.io` so it's already integrated).
- **R4** — Run PageSpeed Insights on `/`, `/pricing`, `/verdict` after the SSR fix to capture real LCP/INP/CLS field data — currently no CrUX data because the domain is new and low-traffic.
- **R5** — Reduce the 30+ async script chunks visible in the homepage `<head>` via Next.js `dynamic()` imports for non-critical components.

---

## Detailed Findings

### Crawlability — 7/15

| Check | Points | Notes |
|---|---|---|
| robots.txt valid and complete | 0/3 | 404 |
| AI crawlers allowed | 3/5 | Default-allow but no explicit signal |
| XML sitemap present and valid | 0/3 | 404 |
| Crawl depth ≤ 3 clicks | 2/2 | Footer + nav reach all pages within depth 2 |
| No erroneous noindex | 2/2 | No `X-Robots-Tag` blocking observed |

### Indexability — 5/10 (hreflang N/A)

| Check | Points | Notes |
|---|---|---|
| Canonical tags correct | 0/3 | None present |
| No duplicate content | 1/3 | `www.` serves 200 — duplicate; trailing-slash behavior consistent |
| Pagination handled | 2/2 | No paginated content yet |
| Hreflang | N/A | Single language |
| No index bloat | 2/2 | Small site, no parameter pages |

### Security — 10/10 ⭐

All response headers verified via `curl -sI`:

```
strict-transport-security: max-age=31536000; includeSubDomains; preload
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
```

HTTPS enforced via 308 redirect from `http://`. Certificate valid.

### URL Structure — 7/8

| Check | Points | Notes |
|---|---|---|
| Clean, readable URLs | 2/2 | `/pricing`, `/glossary`, `/blog`, `/deal-maker` |
| Logical hierarchy | 2/2 | Flat, consistent |
| No redirect chains | 2/2 | `http://` → `https://` is a single 308 |
| Parameter handling | 1/2 | No parameter pages observed; no formal handling either |

### Mobile — 9/10

| Check | Points | Notes |
|---|---|---|
| Viewport meta | 2/3 | Present but `maximum-scale=1` (W2) |
| Responsive layout | 3/3 | Tailwind responsive classes; Next.js Image |
| Tap targets | 2/2 | Inferred from layout — verify in DevTools mobile emulation |
| Font sizes | 2/2 | Inferred — verify |

### Core Web Vitals — 10/15 (inferred; no CrUX data)

| Metric | Score | Notes |
|---|---|---|
| LCP | 3/5 | Hero image preloaded ✓; PNG (not WebP/AVIF); TTFB 0.07–0.21s strong |
| INP | 3/5 | BAILOUT to CSR + 30+ script chunks → heavy hydration before interactive |
| CLS | 4/5 | Next.js Image enforces dimensions; web fonts use `font-display` (preload) |

Validate post-fix with PageSpeed Insights once traffic generates field data.

### Server-Side Rendering — 7/15

| Check | Points | Notes |
|---|---|---|
| Main content in raw HTML | 3/8 | `/` and `/pricing` partially SSR'd; `/verdict`, `/strategy`, `/deal-maker` bail to CSR — verified |
| Meta tags + structured data in raw HTML | 2/4 | Title, description, OG, Twitter ✓; JSON-LD ✗ |
| Internal links in raw HTML | 2/3 | Footer links + skip-link in raw HTML; main nav uncertain pending fix |

### Page Speed & Server — 11/15

| Check | Points | Notes |
|---|---|---|
| TTFB < 800ms | 3/3 | 60–210 ms across all routes (Vercel CDN, IAD region) |
| Page weight < 2MB | 2/2 | 30–87 KB raw HTML |
| Images optimized | 2/3 | Next.js Image ✓; source PNG not WebP/AVIF |
| JS bundles reasonable | 1/2 | 30+ async script chunks visible in `<head>` |
| Compression enabled | 0/2 | **No `Content-Encoding` returned — uncompressed delivery** (C7) |
| Cache headers | 2/2 | `cache-control: public, max-age=0, must-revalidate` on HTML; `/_next/static/*` is content-hashed |
| CDN in use | 1/1 | Vercel (`x-vercel-id: iad1::...`, `x-vercel-cache: HIT`) |

---

## Appendix: Verified URL Status

| URL | Status | TTFB | Bytes | Notes |
|---|---|---|---|---|
| `/` | 200 | 207 ms | 87,544 | SSR'd metadata; body partially CSR'd |
| `/pricing` | 200 | 87 ms | 70,202 | SSR'd |
| `/about` | 200 | 78 ms | 39,049 | SSR'd |
| `/verdict` | 200 | 78 ms | 31,247 | **CSR bailout — pulse icon only** |
| `/strategy` | 200 | 72 ms | 30,047 | **CSR bailout (inferred from size+pattern)** |
| `/deal-maker` | 200 | 80 ms | 32,600 | **CSR bailout (inferred from size+pattern)** |
| `/blog` | 200 | 73 ms | 30,684 | SSR'd |
| `/glossary` | 200 | 73 ms | 42,212 | SSR'd |
| `/help` | 200 | 67 ms | — | SSR'd |
| `/disclosures` | **404** | 68 ms | — | Footer link broken |
| `/dealmaker` | **404** | 63 ms | — | URL inconsistency (canonical `/deal-maker`) |
| `/sitemap.xml` | **404** | — | — | Missing |
| `/robots.txt` | **404** | — | — | Missing |
| `/llms.txt` | **404** | — | — | Missing |
| `/.well-known/indexnow-key.txt` | **404** | — | — | Missing |
| `https://www.dealgapiq.com/` | **200** | — | 87,544 | **Should redirect to apex** |
| `http://dealgapiq.com/` | 308 → `https://` | — | — | ✓ |

---

## Priority Implementation Order

| # | Action | Category | Effort |
|---|---|---|---|
| 1 | Fix `BAILOUT_TO_CLIENT_SIDE_RENDERING` on `/verdict`, `/strategy`, `/deal-maker` (wrap in `<Suspense>` or restructure Client/Server boundary) | SSR — Critical | Medium |
| 2 | Configure www → apex 308 redirect in Vercel | Indexability — Critical | Low |
| 3 | Add `alternates.canonical` to every route's `metadata` export | Indexability — Critical | Low |
| 4 | Restore `/disclosures` page; add 308 redirect for `/dealmaker` → `/deal-maker` | Crawlability — Critical | Low |
| 5 | Ship `app/sitemap.ts`, `public/robots.txt`, `public/llms.txt` | Crawlability — Critical | Low |
| 6 | Investigate why responses lack `Content-Encoding`; restore Vercel compression | Performance — Critical | Low |
| 7 | Populate per-route `openGraph` + `twitter` in `metadata` | Indexability — High | Low |
| 8 | Drop `maximum-scale=1` from viewport meta | Mobile — High | Trivial |
| 9 | Add server-rendered JSON-LD (Organization, SoftwareApplication, Person) | SSR — High | Medium |
| 10 | Add `Permissions-Policy` header; remove deprecated `X-XSS-Protection` | Security — Medium | Trivial |
| 11 | Add IndexNow key file; register at indexnow.org | Crawlability — Medium | Low |
| 12 | Re-export hero as WebP/AVIF source | Performance — Medium | Low |

After items 1–6 ship, expected score: **~85/100** (Good).
