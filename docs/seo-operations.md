# DealGapIQ SEO Operations

Operational checklist for indexing recovery and ongoing search performance. Code changes ship via `frontend/`; this doc covers manual steps and content cadence.

## Vercel environment (verify after each deploy)

| Variable | Required value |
|----------|----------------|
| `NEXT_PUBLIC_APP_URL` | `https://dealgapiq.com` (no trailing slash) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console HTML tag token |

Verify in browser: View Source on production homepage → confirm `<meta name="google-site-verification" ...>` is present.

## Host canonicalization

- `https://www.dealgapiq.com/*` must 308 redirect to `https://dealgapiq.com/*` (handled in `frontend/src/proxy.ts`).
- Test: `curl -sI https://www.dealgapiq.com/ | head -5`

## “Crawled – currently not indexed” drilldown (May 2026)

If GSC lists only these URLs under that bucket, **no marketing page is broken** — Google crawled junk/duplicate URLs:

| URL | Cause | Fix |
|-----|--------|-----|
| `/_next/static/chunks/*.js` | JS asset, not a page | `robots.txt` disallows `/_next/` |
| `/?action=analyze` | Duplicate homepage (internal link) | Redirect → `/search`; CTA link fixed; `noindex` on `/?*` via `proxy.ts` |
| `http://www.dealgapiq.com/` | Non-canonical host | 308 `www` → apex in `proxy.ts` + `next.config.js` redirects |

After deploy: URL Inspection → **Validate fix** on each, or wait for recrawl. Indexed marketing URLs are a separate bucket (“Discovered – not indexed”).

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

**Actions when “Crawled – currently not indexed” persists on a marketing URL:** expand on-page copy, add internal links from `/`, request re-indexing after deploy.

## Content cadence (target: 30+ long-form URLs by end of June)

| Week | Glossary (`frontend/content/glossary/`) | Blog (`frontend/content/blog/`) |
|------|----------------------------------------|----------------------------------|
| Every week | 1 new `.md` term | 1 new `.md` post |

After each publish: confirm slug appears in `/sitemap.xml`, link from `/glossary` or `/blog` index, and request indexing in GSC.

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
