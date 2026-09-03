# DealGapIQ SEO Operations

Operational checklist for indexing recovery and ongoing search performance. Code changes ship via `frontend/`; this doc covers manual steps and content cadence.

## Vercel environment (verify after each deploy)

| Variable | Required value |
|----------|----------------|
| `NEXT_PUBLIC_APP_URL` | `https://dealgapiq.com` (no trailing slash) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console HTML tag token |

Verify in browser: View Source on production homepage → confirm `<meta name="google-site-verification" ...>` is present.

## Host canonicalization

- `https://www.dealgapiq.com/*` must **308** redirect to `https://dealgapiq.com/*` (edge: root `vercel.json`; app: `frontend/src/proxy.ts` + `next.config.js`).
- Test: `curl -sI https://www.dealgapiq.com/` → `location: https://dealgapiq.com/`
- In **Vercel → Project → Settings → Domains**, set `dealgapiq.com` as primary and enable **Redirect www to apex** if offered.

### “Alternate page with proper canonical tag” (usually `https://www.dealgapiq.com/`)

This is **not a broken page**. Google crawled `www`, saw `rel="canonical"` pointing at `https://dealgapiq.com/`, and correctly **did not index** the www URL. That is expected.

**Fix (already in code after deploy):** www must never return 200 HTML — only a 308 to apex. After deploy:

1. GSC → **Page indexing** → **Alternate page with proper canonical tag** → open `https://www.dealgapiq.com/`
2. **Test live URL** — confirm redirect to apex
3. **Validate fix** — Google recrawls; the row should drop within ~1–2 weeks

No change needed on apex pages. Do **not** remove the canonical tag.

### “Page with redirect” (usually `http://dealgapiq.com/`)

This is **not a broken page**. Google crawled the **HTTP** URL, received a **308** to `https://dealgapiq.com/`, and correctly **did not index** the HTTP URL. Only HTTPS apex should be indexed.

**Verify (one-hop redirect):**

```bash
curl -sI http://dealgapiq.com/ | grep -iE '^(HTTP|location:)'
# HTTP/1.0 308
# location: https://dealgapiq.com/
```

**After deploy:** GSC → **Page with redirect** → open `http://dealgapiq.com/` → **Test live URL** → **Validate fix**. Row clears after recrawl (~1–2 weeks).

Legacy app redirects (`/verdict` → `/discovery`, `/compare` → `/price-intel`, etc.) also appear in this bucket — that is expected; do not remove those redirects.

## “Crawled – currently not indexed” drilldown (May 2026)

If GSC lists only these URLs under that bucket, **no marketing page is broken** — Google crawled junk/duplicate URLs:

| URL | Cause | Fix |
|-----|--------|-----|
| `/_next/static/chunks/*.js` | JS asset, not a page | `robots.txt` disallows `/_next/` |
| `/?action=analyze` | Duplicate homepage (internal link) | Redirect → `/search`; CTA link fixed; `noindex` on `/?*` via `proxy.ts` |
| `http://www.dealgapiq.com/` | Non-canonical host | 308 `www` → apex in `proxy.ts` + `next.config.js` redirects |

After deploy: URL Inspection → **Validate fix** on each, or wait for recrawl. Indexed marketing URLs are a separate bucket (“Discovered – not indexed”).

## “Discovered – currently not indexed” (sitemap URLs, never crawled)

If GSC lists marketing URLs (`/about`, `/blog`, `/pricing`, `/strategies/*`, etc.) with **Last crawled: 1969-12-31**, Google **found them in the sitemap** but has **not crawled them yet** — common on new domains with low authority.

**Code mitigations (deployed):**

- [`/learn`](/learn) — HTML hub linking to every indexable page
- Homepage **Explore DealGapIQ** section + nav links to `/pricing` and `/learn`
- Sitemap uses content `date_modified` where available; `/learn` added
- RSS feed linked in root metadata (`/blog/feed.xml`)
- `robots: index, follow` on key marketing routes

**You must also (GSC):**

1. Ensure homepage `https://dealgapiq.com/` is indexed (request indexing if not).
2. Resubmit `https://dealgapiq.com/sitemap.xml`.
3. URL Inspection → request indexing for top pages: `/pricing`, `/about`, `/methodology`, `/strategies/brrrr`, `/glossary`, `/blog`.
4. Expect **2–6 weeks** for a new domain; indexing is not instant after fixes.

Publishing **1 glossary + 1 blog post per week** and **1–2 external backlinks** remains the highest-leverage follow-up.

## Google Search Console — post-deploy

1. **Sitemaps** → Submit `https://dealgapiq.com/sitemap.xml`
2. **URL Inspection** → Request indexing for:
   - `/`
   - `/pricing`
   - `/methodology`
   - `/what-is-dealgapiq`
   - `/strategies/long-term-rental`
   - `/strategies/brrrr`
   - `/strategies/fix-flip`
   - `/glossary`
   - `/blog`
   - `/about`
3. **Page indexing** → Open **Alternate page with proper canonical tag** → note the exact URL. If it is `www.` or a trailing-slash variant, confirm the redirect fix; otherwise no action.

## Weekly review (30 min)

| Metric | Where |
|--------|--------|
| Indexed / Not indexed counts | GSC → Pages |
| Impressions & clicks | GSC → Performance |
| Top queries | GSC → Performance → Queries |
| Crawl errors | GSC → Pages → Why pages aren’t indexed |
| Traffic & conversions | Vercel Analytics |
| Blog: queries per post vs `primary_keyword` | GSC → Performance → filter Page contains `/blog/` → Queries. If the post ranks for a query that is not its `primary_keyword`, either retitle toward the winning query or spin the query out as a new cluster post in `docs/marketing/blog-keyword-map.md`. |
| Blog: content-to-verdict funnel | PostHog funnel `blog_post_viewed` → `blog_cta_clicked` → `verdict_viewed` → `signup_completed`, broken down by `slug`. Posts with views but no CTA clicks need a stronger `::cta` placement; posts with clicks but no verdicts point at the Discovery landing, not the post. |

**Actions when “Crawled – currently not indexed” persists on a marketing URL:** expand on-page copy, add internal links from `/`, request re-indexing after deploy.

## Content cadence (target: 30+ long-form URLs by end of June)

| Week | Glossary (`frontend/content/glossary/`) | Blog (`frontend/content/blog/`) |
|------|----------------------------------------|----------------------------------|
| Every week | 1 new `.md` term | 1 new `.md` post |

After each publish: confirm slug appears in `/sitemap.xml`, link from `/glossary` or `/blog` index, and request indexing in GSC.

## Blog publishing standard

The keyword-to-URL plan and the editorial rules live in
`docs/marketing/blog-keyword-map.md`. Every post is a Markdown file in
`frontend/content/blog/` whose frontmatter is validated by
`frontend/src/lib/content-schema.ts`; a post that fails validation fails
`npm run build`, so nothing with broken metadata ships.

**Before you open the PR**

1. Pick the row in `blog-keyword-map.md`. The `primary_keyword` appears in the
   title, `meta_title`, `meta_description`, URL slug and the first 100 words.
2. Frontmatter: `status: published`, `category` from `lib/blog-categories.ts`,
   `date_published`, `author`, `meta_title` ≤ 60, `meta_description` ≤ 155,
   3+ `internal_links`, `faq[]` with the questions the row lists. No body H1.
3. One worked example with numbers computed by the DealGapIQ methodology; no
   market statistic without a linked source; no fabricated figures.
4. At least one `::cta[...]{href="/discovery"}` directive in the body. The page
   adds the UTM parameters (`utm_source=blog&utm_medium=post|inline&utm_campaign={slug}`).
5. Run `cd frontend && npm run content:check`. It validates the schema, checks
   every internal link resolves to a real route or content slug, confirms the
   hero image exists, and flags a body H1. CI runs the same check after
   `theme:check`.

**After the deploy**

6. Confirm the URL is in `/sitemap.xml` and renders with `BlogPosting` JSON-LD
   (Rich Results Test).
7. Request indexing in GSC (URL Inspection → Request indexing).
8. Mark the row in `blog-keyword-map.md` as published with the date, and add the
   new post to the `internal_links` of at least one existing post in the same
   cluster.
9. On any later edit that changes the substance, bump `date_modified`.

**Cadence:** one blog post and one glossary term per week (table above). A
week with no post is acceptable; a post that skips the checklist is not.

## Backlink targets (3–5 quality links)

- Founder LinkedIn/X posts linking to `/methodology`, `/what-is-dealgapiq`, or a strategy guide
- HARO / journalist queries on real estate investing tools
- Podcast show notes with a single deep link (not homepage-only)
- Guest post or comparison mention on investor blogs

Track in a simple spreadsheet: source URL, target page, date live, follow/nofollow.

## Comparisons hub

Live pages (linked from sitemap):

- `/comparisons/dealgapiq-vs-dealcheck`
- `/comparisons/dealgapiq-vs-mashvisor`
- `/comparisons/dealgapiq-vs-propstream`

Add internal links from `/pricing` or footer when traffic warrants.
