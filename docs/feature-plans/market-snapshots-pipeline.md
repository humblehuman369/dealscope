# Market Snapshots Pipeline — city pages for `/markets` (Phase B)

**Status:** design only. **Not started.** Gated on Phase A.
**Author:** SEO blog plan, Stage 8B, 2026-09-02
**Scope:** a `market_snapshots` table, a monthly refresh job, and
`/markets/[state]/[city]` pages that render only from stored snapshots.

---

## 0. The gate — read first

Phase A (`/markets` + `/markets/[state]`) shipped with the blog plan. It uses
only first-party data (`MARKET_ADJUSTMENTS`, lender counts, cash buyer counts)
and spends zero API credits.

Phase B starts **only when both are true**:

1. Google Search Console shows `/markets/[state]` URLs **indexed** (Pages
   report, "Indexed" bucket), not merely discovered or crawled. Programmatic
   pages that Google declines to index are a signal to stop, not to add more.
2. At least one `/markets/[state]` page has recorded impressions for a
   non-brand query in GSC over a 28-day window.

Until then, do not create the table, the job, or the route. A city page with no
snapshot behind it is thin content, and thin programmatic pages get demoted
site-wide — that is the risk this gate exists to prevent.

**Keyword targeting note (2026-09-03).** The state pages now target the search
intent "{State} investment properties" (title, H1, description) rather than
"investor market data", carry a server-rendered state outline map whose CTA
deep-links into `/map-search` framed on the state, link each top buyer city to
a city-labelled map search, and emit `FAQPage` + `WebPage`/`SearchAction`
schema. When Phase B ships, city pages should follow the same shape: target
"{City}, {ST} investment properties", link the map CTA to
`cityMapSearchHref()` in `frontend/src/lib/geo/map-search-links.ts`, and keep
"near me" out of every title — `/markets/near-me` is the single page for that
intent, with location resolved client-side only.

---

## 1. Why a snapshot table and not live calls

RentCast is the binding cost constraint (`docs/architecture/FINANCIAL_PROFORMA.md`
§ "RentCast (Binding Constraint)": 5,000 requests/month on the current plan,
$0.03 per overage request). City pages are crawled by bots far more often than
they are read by people, so rendering from live provider calls would burn the
quota on crawlers. The pipeline therefore:

- fetches each curated city **once a month**, writes a row, and
- renders pages **only** from rows, never from a live call at request time.

Budget: **~150 metros × 2 providers = ~300 calls/month**, or 6% of the RentCast
plan with Zillow on its own quota. No per-request spend.

---

## 2. Data model

New table `market_snapshots` (Alembic migration, `backend/alembic/versions/`).

| column | type | notes |
|---|---|---|
| `id` | bigserial PK | |
| `city` | text, not null | canonical `geo_cities.short_name` |
| `state` | char(2), not null | USPS code |
| `geoid` | text, not null | `geo_cities.geoid`, the join key to `app/data/geo/cities.json` |
| `source` | text, not null | `rentcast` \| `zillow` |
| `median_rent` | numeric, null | monthly, all bedrooms |
| `median_price` | numeric, null | sale, all property types |
| `median_dom` | integer, null | days on market |
| `active_sale_listings` | integer, null | |
| `active_rental_listings` | integer, null | |
| `raw` | jsonb, not null | full provider payload for audit and re-derivation |
| `fetched_at` | timestamptz, not null | |
| `created_at` | timestamptz, not null | |

Indexes: `(geoid, source, fetched_at desc)`; unique `(geoid, source, fetched_at::date)`
so a re-run on the same day is idempotent.

One row per provider per fetch. Nothing is averaged at write time — the
combination happens at read time so the rule can change without a backfill.

Read model (`markets_service.city_snapshot(geoid)`):

- take the newest row per source that is **under 60 days old**;
- `median_rent` / `median_price` = the **IQ Estimate rule** already used for
  properties (`api_clients.py :: _compute_iq_estimates`): average of in-range
  sources, single source if only one, `null` if none. Do not invent a third rule;
- `median_dom` and listing counts are reported **per source**, not averaged
  (they measure different inventories).

---

## 3. Curated metro list

`backend/app/data/geo/market_metros.json` — ~150 entries of `{ geoid, city, state }`
chosen by hand from `cities.json`. Selection criteria, in order:

1. the 100 most populous U.S. cities (Census 2020 list; `cities.json` has no
   population field, so this is a one-time manual step, cite the source in the
   file header);
2. every city that appears in `market_snapshots`'s sibling data with ≥ 10 strict
   cash buyers (`buyer_cities_for_state` already computes this);
3. fill to 150 with investor-heavy secondary markets from the Sun Belt and
   Midwest cohorts in `app/core/regions.py`.

The list is versioned in git. Adding a city is a PR, not a config change, so the
monthly spend is always reviewable.

---

## 4. Refresh job

Register in `app/tasks/scheduler.py` next to the existing cron jobs:

```python
_scheduler.add_job(
    with_heartbeat("refresh_market_snapshots", refresh_market_snapshots),
    CronTrigger(day=1, hour=6, minute=0),   # monthly, after RentCast's UTC quota reset
    id="refresh_market_snapshots",
    replace_existing=True,
)
```

`app/tasks/market_snapshots.py :: refresh_market_snapshots()`:

1. load `market_metros.json`;
2. for each metro, call `RentCastClient.get_market_statistics(city=, state=)`
   and `ZillowClient.get_market_data(f"{city}, {state}")`, sequentially with the
   existing client rate limiting;
3. normalise each payload into the columns above; store the payload in `raw`;
4. **hard cap** the run at `len(metros) × 2` calls. If a provider returns 429 or
   the cap is reached, stop and log — never retry into the next month's quota;
5. record the run in the job heartbeat table like the other jobs
   (`tests/test_job_heartbeats.py` shows the pattern);
6. after a successful run, invalidate the `markets:*` Redis keys so the
   state-page hub reflects the new snapshot count.

There is no backfill and no "fetch on miss". A city without a row shows no
numbers.

---

## 5. Pages and the noindex rule

`frontend/src/app/markets/[state]/[city]/page.tsx`, ISR with the same
`revalidate = 86400` as the state pages and `dynamicParams = false` over the
curated list.

A city page is **indexable** only when a snapshot for it is under 60 days old and
carries at least `median_rent` **and** `median_price`. Otherwise it renders under
`NOINDEX_FOLLOW` with the state assumptions and directory counts it inherits, and
is left out of `sitemap.ts` — the same shape as the state guard in
`markets_service.assemble_state_market`.

What the page may say:

- the snapshot figures with the fetch date and source names shown;
- the derived rent-to-price ratio for the city **from the snapshot**, next to the
  state assumption, so the reader sees where the city sits;
- the DealGapIQ methodology applied to the city medians as a **worked example**,
  labelled as such.

What it must not say:

- any figure derived from a state average presented as a city figure;
- trend language ("rents are rising") unless two snapshots ≥ 90 days apart exist
  and the page shows both numbers;
- population, school, crime or employment data — we do not hold it.

Structured data: `Dataset` + `Place` + `BreadcrumbList` as on the state pages,
with `temporalCoverage` set to the snapshot month.

---

## 6. Tests to ship with it

- snapshot normaliser: RentCast and Zillow fixtures → columns; missing fields →
  `null`, never a default;
- read model: two fresh sources average, one stale source is dropped, no fresh
  source → `null`; the 60-day boundary;
- job: call cap is enforced; a 429 stops the run; a re-run on the same day is a
  no-op;
- indexability: fresh + both medians → indexable; missing price → noindex.

---

## 7. Out of scope

ZIP-level pages, neighbourhood pages, historical charts, user-facing "market
score", and any third source beyond RentCast and Zillow.
