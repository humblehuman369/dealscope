# GEO Remediation — Implementation Handoff

**Status:** Phases 1, 2.1 (Option A), 2.2, 3 (full), 4.1, 4.2, 4.3, and 4.4 are implemented on branch `claude/nervous-taussig-29e9a2`. Validated by `npm run typecheck` (clean), `npm run lint` on new files (clean), and `npm run build` (all 60+ routes generate including the new `/methodology` page and 13 glossary slug pages).

The diff is uncommitted — review and commit when you're ready.

**Round 2 additions (after the executive bio + Formula Glossary input):**
- `/about` page rewritten with verbatim executive-bio paragraphs (Option A) — named institutions: HUD 1991, Fannie Mae 2000 (HomePath.com), Freddie Mac (HomeSteps.com), Comerica Bank Boca Raton 2008. Stats grid (35+ years, 30+ years GSE, 1,000+ properties, 50+ projects)
- Person schema upgraded with `affiliation`, `hasOccupation`, `award`, `alumniOf`, structured biography description
- Organization schema gained `foundingDate: 2025`, `areaServed: United States`, expanded `knowsAbout`
- New `/methodology` page (~3,000 words, 12 sections, server-rendered with TechArticle schema + BreadcrumbList) — published verbatim from the Formula Glossary: Income Value/Target Buy formula, Deal Gap brackets, IQ Verdict score, Deal Opportunity Score weights, unified strategy performance formula, full P&L formulas for LTR/STR/BRRRR/Flip/HouseHack, 70% rule, Seller Motivation indicator framework, Market Temperature thresholds, default assumptions table, data sources
- Disclosures founder section strengthened with HUD 1991 / Fannie Mae / Freddie Mac references and explicit entity-distinction language
- 12 new glossary entries seeded as MDX in `frontend/content/glossary/`: cap-rate, noi, cash-on-cash-return, dscr, grm, arv, brrrr-method, seventy-percent-rule, one-percent-rule, hard-money-loan, seller-financing, vacancy-rate. Each ~600–900 words with frontmatter, formula, real-numbers example, "what's a good X", FAQ. `DefinedTermSet` schema on /glossary auto-iterates them.
- /methodology added to sitemap.ts and llms.txt

## What shipped

### Phase 1 — Critical infrastructure

| File | Change |
|---|---|
| [frontend/src/app/sitemap.ts](frontend/src/app/sitemap.ts) | NEW. Auto-generates `/sitemap.xml` from a static list of marketing routes. App routes excluded. |
| [frontend/src/app/robots.ts](frontend/src/app/robots.ts) | NEW. Auto-generates `/robots.txt` with explicit `Allow` for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Amazonbot. Disallows `/api/`, `/admin`, `/dashboard`, `/billing`, `/checkout`, `/onboarding`, `/profile`, `/saved-properties`, `/pipeline`, `/search-history`, `/app/`, and auth routes. Includes `Sitemap:` directive. |
| [frontend/public/llms.txt](frontend/public/llms.txt) | NEW. AI content map. Update when you add major new pages. |
| [frontend/src/app/disclosures/page.tsx](frontend/src/app/disclosures/page.tsx) | NEW. Restored the broken footer link. 9 sections: not financial advice, data sources & no-warranty, methodology, forward-looking, affiliates/conflicts, founder & operating entity, no fiduciary duty, updates, related docs. Mirror style of /privacy and /terms. **Brad: review the actual text — it's a reasonable default but you may want to refine specific clauses (especially affiliates and entity).** |
| [frontend/next.config.js](frontend/next.config.js) | Added 9 redirects: `/dealmaker → /deal-maker`, `/help-center → /help`, `/field-guide → /blog`, plus 7 query-aware redirects routing `/verdict?…`, `/strategy?…`, `/deal-maker?…` to `/app/*` so external/in-app links keep working through the architecture migration. |
| [frontend/next.config.js](frontend/next.config.js) | Removed deprecated `X-XSS-Protection` header. Added `Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self), interest-cohort=()`. |
| [vercel.json](vercel.json) | Removed redundant CSP header (next.config.js is now the single source of truth). |
| [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) | Added `metadataBase`, `alternates: { canonical: '/' }`, and a title `template: '%s | DealGapIQ'`. Removed `viewport.maximumScale: 1` (WCAG regression — disabled pinch-zoom). Wired in the new `<SiteStructuredData />`. |

### Phase 2.1 — Architecture (Option A: app routes moved to `/app/*`)

The three app routes (`/verdict`, `/strategy`, `/deal-maker`) were `'use client'` components that bailed out of SSR via `BAILOUT_TO_CLIENT_SIDE_RENDERING`. They were also the URLs marketing was sending crawlers to — incompatible.

**Moves (via `mv` — full file contents preserved):**
- `frontend/src/app/verdict/` → `frontend/src/app/app/verdict/`
- `frontend/src/app/strategy/` → `frontend/src/app/app/strategy/`
- `frontend/src/app/deal-maker/` → `frontend/src/app/app/deal-maker/`

**Layouts updated** with `robots: { index: false, follow: false }` on each (`/app/verdict/layout.tsx`, `/app/strategy/layout.tsx`, new `/app/deal-maker/layout.tsx`) so the JS shells stop polluting search results.

**New SSR marketing pages** (~400-500 words each, structured for AI citability — H1, named H2 sections, bulleted feature lists, CTAs to `/` for the address-input flow):
- [frontend/src/app/verdict/page.tsx](frontend/src/app/verdict/page.tsx)
- [frontend/src/app/strategy/page.tsx](frontend/src/app/strategy/page.tsx)
- [frontend/src/app/deal-maker/page.tsx](frontend/src/app/deal-maker/page.tsx)

**Internal references updated** (~35 sites in 25+ files). Patterns:
- All `'/verdict?…'`, `'/strategy?…'`, `'/deal-maker?…'` → `'/app/…?…'` via bulk `sed`.
- All `pathname.startsWith('/verdict')` etc. updated in `AppHeader.tsx`.
- All `pathname === '/verdict'` etc. updated in `AnalysisNav.tsx`.
- Hidden-on-page list in `UsageBar.tsx` updated.
- `FourPathsPanel.tsx` SUMMARY_LINKS updated.
- `checkout/success/page.tsx` `isAddressDependentPath` updated.
- `legal/find-attorney/page.tsx` Back link updated to `/app/verdict`.
- `analyzing/page.tsx` no-query fallback updated to `/app/verdict`.
- `AppHeader.tsx` no-query fallback updated to `/app/deal-maker`.
- The 3 marketing footer Links in `DealGapIQHomepageV3.tsx` (lines 1191–1193) **kept as `/verdict`, `/strategy`, `/deal-maker`** — those go to the new marketing pages.

### Phase 2.2 — Per-route metadata

Added `alternates: { canonical }`, full `openGraph` (with per-page `url`), and `twitter` cards to:
- [frontend/src/app/pricing/page.tsx](frontend/src/app/pricing/page.tsx)
- [frontend/src/app/about/page.tsx](frontend/src/app/about/page.tsx)
- [frontend/src/app/blog/page.tsx](frontend/src/app/blog/page.tsx)
- [frontend/src/app/glossary/page.tsx](frontend/src/app/glossary/page.tsx)
- [frontend/src/app/what-is-dealgapiq/page.tsx](frontend/src/app/what-is-dealgapiq/page.tsx)
- [frontend/src/app/blog/[slug]/page.tsx](frontend/src/app/blog/[slug]/page.tsx) — via `generateMetadata`
- [frontend/src/app/glossary/[slug]/page.tsx](frontend/src/app/glossary/[slug]/page.tsx) — via `generateMetadata`

Created new `layout.tsx` with metadata for Client Component pages:
- [frontend/src/app/help/layout.tsx](frontend/src/app/help/layout.tsx) — NEW
- [frontend/src/app/deal-gap/layout.tsx](frontend/src/app/deal-gap/layout.tsx) — NEW

Added metadata exports to:
- [frontend/src/app/privacy/page.tsx](frontend/src/app/privacy/page.tsx)
- [frontend/src/app/terms/page.tsx](frontend/src/app/terms/page.tsx)

### Phase 3 — Schema (server-rendered JSON-LD)

| File | Schema types |
|---|---|
| [frontend/src/components/seo/StructuredData.tsx](frontend/src/components/seo/StructuredData.tsx) | NEW. `Organization`, `WebSite`+`SearchAction`, `SoftwareApplication` with both pricing tiers. Rendered in root `<head>`. |
| [frontend/src/components/seo/Breadcrumbs.tsx](frontend/src/components/seo/Breadcrumbs.tsx) | NEW. `BreadcrumbsJsonLd` helper. Reusable across deep pages. |
| [frontend/src/app/about/page.tsx](frontend/src/app/about/page.tsx) | `Person` (Brad Geisen) with `sameAs` to LinkedIn + Foreclosure.com, `worksFor` linked to Organization, `knowsAbout` (7 topics). |
| [frontend/src/app/glossary/page.tsx](frontend/src/app/glossary/page.tsx) | `DefinedTermSet` — auto-iterates every term. |
| [frontend/src/app/glossary/[slug]/page.tsx](frontend/src/app/glossary/[slug]/page.tsx) | `DefinedTerm` per term + `BreadcrumbList`. |
| [frontend/src/app/blog/[slug]/page.tsx](frontend/src/app/blog/[slug]/page.tsx) | `Article` (with `author`/`publisher` refs, optional `datePublished` from frontmatter) + `BreadcrumbList`. |
| [frontend/src/lib/content.ts](frontend/src/lib/content.ts) | Extended `Frontmatter` type with `date`, `datePublished`, `dateModified` so blog posts can opt into Article schema dates. |

### Phase 4.4 — Comparison table

[frontend/src/components/landing/DealGapIQHomepageV3.tsx](frontend/src/components/landing/DealGapIQHomepageV3.tsx) — `ComparisonTable` and `CompCell` rewritten from `<div class="grid">` to semantic `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` with `<caption>` and `<colgroup>`. Visual styling preserved. AI Overviews can now lift this table verbatim. Added `aria-hidden` on icons + `sr-only` text labels for accessibility.

---

## Verification done

```
npm install               ✓
npm run typecheck         ✓ no errors
npm run lint (new files)  ✓ exit 0, no warnings
npm run build             ✓ all 60 routes prerender

# Routes confirmed in build output:
○ /sitemap.xml          ← new
○ /robots.txt           ← new
○ /disclosures          ← restored
○ /verdict              ← new SSR marketing
○ /strategy             ← new SSR marketing
○ /deal-maker           ← new SSR marketing
○ /app/verdict          ← moved app
○ /app/strategy         ← moved app
○ /app/deal-maker       ← moved app
● /app/deal-maker/[address]  ← moved app subroute
● /blog/[slug]          ← Article schema added
● /glossary/[slug]      ← DefinedTerm + BreadcrumbList added
```

---

## Verification I could NOT do

- Browser-level UI verification of the new marketing pages on the dev server (they're Server Components, so the build output is the strongest signal). When you spin up `npm run dev` locally, eyeball the three new pages and the homepage comparison table.
- Live `curl` against the deployed site (not deployed yet from this branch).
- Real PageSpeed/CrUX measurement (no field data; will arrive after deploy + traffic).

---

## What's left for you

### A) Vercel/DNS (can't be done in code)

1. **www → apex 308 redirect** — Vercel → Project → Settings → Domains. Mark `dealgapiq.com` as primary; set `www.dealgapiq.com` to "Redirect to dealgapiq.com (308)."
2. **Compression investigation** — production responses are missing `Content-Encoding`. Check Vercel project → Functions/Compression settings. Vercel typically auto-compresses.
3. **After deploy: submit `https://dealgapiq.com/sitemap.xml`** to Google Search Console and Bing Webmaster Tools. Verify domain ownership first.

### B) Content I can't write without your input

1. **`/about` founder bio rewrite** ([prior plan §4.1](GEO-REMEDIATION-PLAN.md)) — this is the single highest-leverage authority lever. I added the Person schema with `sameAs` to LinkedIn + Foreclosure.com, but the page copy still doesn't surface "founder of Foreclosure.com (24 years)" prominently. I need real names from you:
   - Real founding year for Foreclosure.com (mentioned as "2002" in disclosures and 2000 in plan — pick one)
   - Real agency names (HUD? Fannie Mae? Freddie Mac?) for the disposition-program claim
   - Real outlets that have cited you (WSJ, CNBC, NYT confirmed in search but verify the ones to name)
   - Real founding year for DealGapIQ
2. **`/methodology` page** ([prior plan §4.2](GEO-REMEDIATION-PLAN.md)) — needs your actual Deal Gap formula, default assumptions (pull from `default_assumptions.csv` and `docs/calculations/`), and decision on how much to disclose.
3. **Glossary expansion** — content infrastructure works (auto-discovers MDX files, schema auto-generates). You just need to add markdown files in `content/glossary/` for the 12 priority terms (Cap Rate, NOI, DSCR, Cash-on-Cash, GRM, BRRRR, Seller Financing, Wraparound, Hard Money, ARV, 70% Rule, 1% Rule).
4. **2 new blog case studies** — same content infrastructure, drop into `content/blog/`.
5. **Pricing FAQPage schema** — I left this for last because the 8 FAQ answers are accordion-collapsed (not in static HTML). Two paths: (a) you give me the answer text and I add only the schema; (b) refactor the accordion to render answers statically (better — accessibility + AI citability). Recommend (b).
6. **Testimonials provenance** — strategic call: upgrade the existing first-name+initial testimonials to full attribution (full name + city + LinkedIn + headshot for ≥3) OR migrate to G2/Capterra/Trustpilot.

### C) Schema `sameAs` URLs to fill in (post-create)

Once you create accounts, add these URLs to:

- **Organization** in [frontend/src/components/seo/StructuredData.tsx](frontend/src/components/seo/StructuredData.tsx) (search for `// TODO Brad`):
  - LinkedIn Company Page URL
  - Twitter/X handle URL
- **Person** in [frontend/src/app/about/page.tsx](frontend/src/app/about/page.tsx) (search for `// TODO Brad`):
  - Twitter/X handle (if Brad has one for DealGapIQ)
  - Wikidata Q-item URL (if/when created)

### D) External authority (Phase 5 — your work)

All listed in [GEO-REMEDIATION-PLAN.md](GEO-REMEDIATION-PLAN.md) §Phase 5. Top-priority pair I'd recommend going first: **LinkedIn Company Page** + **ProductHunt launch** (immediate AI-entity-recognition lift, low effort).

### E) Hero image — re-export as WebP/AVIF

`frontend/public/images/phone-house-hero.png` is the LCP image. Re-export the source as WebP (or AVIF). Next.js `Image` will negotiate the best format per UA, but starting from PNG limits the gains.

### F) Five strategic decisions still open

From the original plan §"Open decisions for Brad":

1. ~~Phase 2.1 architecture: Option A or B?~~ ✓ **Option A done**
2. Real agency / publication names for the bio (above, B.1)
3. Methodology disclosure depth (above, B.2)
4. Testimonial strategy (above, B.6)
5. Phase 5 distribution sequencing — recommend LinkedIn Company Page + ProductHunt first

---

## Quick post-deploy verification

After this branch merges and Vercel deploys:

```bash
# Infrastructure
curl -sI https://dealgapiq.com/robots.txt           # 200, x-nextjs-prerender: 1
curl -sI https://dealgapiq.com/sitemap.xml          # 200
curl -sI https://dealgapiq.com/llms.txt             # 200
curl -sI https://dealgapiq.com/disclosures          # 200
curl -sI https://dealgapiq.com/dealmaker            # 308 → /deal-maker
curl -sI https://dealgapiq.com/help-center          # 308 → /help
curl -sI https://dealgapiq.com/field-guide          # 308 → /blog
curl -sI 'https://dealgapiq.com/verdict?address=foo'  # 308 → /app/verdict?address=foo

# Marketing pages now SSR'd (the prior BAILOUT marker is gone)
curl -s https://dealgapiq.com/verdict     | grep -ic 'BAILOUT_TO_CLIENT_SIDE_RENDERING'  # 0
curl -s https://dealgapiq.com/verdict     | grep -ic '<h1'                                # ≥1
curl -s https://dealgapiq.com/strategy    | grep -ic 'Strategy Analysis'                  # ≥1
curl -s https://dealgapiq.com/deal-maker  | grep -ic 'four paths'                         # ≥1

# Schema
curl -s https://dealgapiq.com/         | grep -c 'application/ld+json'   # ≥3 (Org, WebSite, SoftwareApp)
curl -s https://dealgapiq.com/about    | grep -c 'application/ld+json'   # ≥1 (Person)
curl -s https://dealgapiq.com/glossary | grep -c 'application/ld+json'   # ≥1 (DefinedTermSet)
curl -s https://dealgapiq.com/glossary/subject-to-financing | grep -c 'application/ld+json'  # ≥2 (DefinedTerm + Breadcrumb)

# Per-route OG
curl -s https://dealgapiq.com/pricing  | grep -oE 'og:url[^>]+pricing'   # has /pricing
curl -s https://dealgapiq.com/about    | grep -oE 'og:url[^>]+about'     # has /about
curl -s https://dealgapiq.com/verdict  | grep -oE 'og:url[^>]+verdict'   # has /verdict (not homepage anymore)

# Headers
curl -sI https://dealgapiq.com/ | grep -i x-xss-protection      # empty (removed)
curl -sI https://dealgapiq.com/ | grep -i permissions-policy    # present
```

Validate every JSON-LD block at https://validator.schema.org/ and https://search.google.com/test/rich-results.

---

## Expected score impact

Per the plan's projection table:

| Phase complete | Expected GEO score |
|---|---|
| Baseline (audit) | 35 |
| **+ Phase 1, 2.1, 2.2, 3, 4.4** (this delivery) | **~70** |
| + Phase 4 content (your work) | ~78 |
| + Phase 5 external (your work) | ~85+ |

The largest remaining lever is **Phase 4.1** (the About bio rewrite + named institutions/outlets). One copy edit moves the Authoritativeness score from 7 to ~14 by itself.
