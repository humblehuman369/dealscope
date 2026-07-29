# Directory Restructure Plan — Lenders + Cash Buyers

**Status:** Stage 1 (paid-only enforcement), Stage 2 (lenders → Postgres) and
Stage 3 (`directory_service_area`, `geo_cities`, buyer coverage matching) are
**implemented**. Stage 4 and the rest of Stage 5 remain proposed.
**Author:** architecture review, 2026-07-29
**Scope:** `/api/lenders`, `/api/buyers`, and the two frontend directories

---

## 1. Why

Lenders and cash buyers are one product feature — *find a counterparty who covers this
deal's location, then contact them* — implemented twice on two different foundations.

| | Lenders | Cash Buyers |
|---|---|---|
| Storage | `app/data/lenders.json`, 484 entries, `@lru_cache` | Postgres `cash_buyers`, ~2,800 rows |
| Filtering | Python loop in `_matches()` | SQL `WHERE` |
| Pagination | Python list slice | SQL `OFFSET`/`LIMIT` |
| Free-text search | `q` over name + domain | none |
| County filter | impossible | `coverage[]` substring `ILIKE` |
| Stats | frozen in the JSON `stats` block | live SQL |

The gating layer is already shared and well built (`directory_gates`,
`directory_usage`, `directory_export`, `entitlements`), and
`saved_directory_contacts` is already polymorphic on `entity_type`. The divergence
is entirely below that line.

**The reason to change is capability, not performance.** Scanning 484 objects in
memory is free and will stay free. But a JSON file cannot join to `geo_counties`,
cannot be filtered by county no matter what data is added to it, cannot carry an
admin-editable verification flag, and has no real primary keys.

---

## 2. Findings that drive the design

### 2.1 Lender IDs are positionally assigned and will shift

`lenders.json` ids are a shuffled permutation of 1–484; file order begins
`66, 220, 255, 330, 344, 141, …`. Nothing anchors an id to a company.

`saved_directory_contacts.entity_id` stores those integers, with no FK and — unlike
buyers — no existence check:

```python
# app/services/saved_directory_contact_service.py:89
if data.entity_type == DirectoryEntityType.BUYER.value:
    if not await self._buyer_exists(db, data.entity_id):
        raise ValueError("buyer not found")
```

Regenerating the lender dataset therefore silently repoints every saved lender at a
different company, and the stored `snapshot` JSONB makes the row still look valid.

**This is why the Postgres move must precede the lender dataset regeneration.**

### 2.2 `domain` is a clean natural key

484/484 populated, 484 unique, 0 duplicates. `website` is equally unique but less
normalized. `company_name` has 5 duplicates and `phone` has 12, so neither works.

Consequence: seed Postgres **preserving the current integer ids** so existing saved
contacts keep resolving, and add `UNIQUE(domain)` so every future refresh matches on
domain instead of position. One migration retires the orphan risk permanently.

### 2.3 Buyer county matching cannot work as written

```python
# app/services/buyers_service.py:27
def _coverage_ilike(pattern: str):
    return text(
        "EXISTS ("
        "  SELECT 1 FROM unnest(cash_buyers.coverage) AS cov(entry) "
        "  WHERE lower(cov.entry) ILIKE :cov_pattern"
        ")"
    ).bindparams(cov_pattern=pattern)
```

`coverage[]` is free text, the pattern is `%name%`, and a leading wildcard makes the
GIN index useless. `geo_counties` (3,230 rows, FIPS-keyed) now makes a real fix possible.

### 2.4 Both directories are paid-only, and the code does not enforce it

**Product policy (confirmed 2026-07-29): neither directory is part of the free trial.
Access requires a paid subscription.**

The code implements an older spec. `require_view_access` admits `TRIAL` alongside
`PAID`, and only `FREE` gets a 403:

```python
# app/services/directory_gates.py:37
"""Trial and paid may view; free gets 403 with the upgrade teaser."""
entitlement, _ = await resolve_entitlement_with_subscription(db, user.id)
if entitlement == Entitlement.FREE:
    raise HTTPException(status_code=403, …)
return entitlement
```

`Entitlement.TRIAL` is reachable: `billing_service.py:695` and `:791` set
`trial_period_days = 7`, and a trialing subscription without a settled charge resolves
to `TRIAL` (`entitlements.py:93`).

So a trial user currently gets full search and filtering of both directories plus 25
contact reveals per day — up to 175 full lender/buyer contacts across a 7-day trial,
pooled across the two directories. Exports and saved contacts are correctly blocked to
paid, so the leak is confined to viewing and revealing.

Correcting this **removes** work rather than adding it:

| Becomes dead once directories are paid-only | Location |
|---|---|
| `enforce_detail_view_cap` (trial-only by definition) | `directory_gates.py:51` |
| `KIND_DETAIL_VIEW` counters and the 25/day limit | `directory_usage.py:26,30` |
| `_redact_lender` / `_redact_buyer` and `contactsRedacted` | `routers/lenders.py:51`, `routers/buyers.py:50` |
| The per-record "View contact info" reveal flow | both frontend components |
| The `contactsRedacted` field on both list responses | `schemas/lenders.py:62`, `schemas/buyers.py` |

The pooled-cap question raised in review therefore disappears: with no trial access
there is no view cap to dimension. Export metering (200/export, 1,000/cycle) is
unaffected because it was always paid-only.

---

## 3. Guiding decisions

1. **Two tables, not one polymorphic table.** Lenders and buyers share a workflow, not
   a shape. Max LTV, ARV, points and credit policy have nothing to do with
   deals-per-year, hold strategy and response time. A shared JSONB attribute bag would
   trade real columns and type safety for symmetry with no payoff.
2. **Unify the pipeline, not the entities.** Gating, pagination, reveal, export and
   metering are genuinely identical and belong in shared code. Schemas and result cards
   stay domain-specific.
3. **Normalize coverage into one table.** Both directories answer "who covers this
   location?"; today they answer it two incompatible ways and neither can use the
   ZIP→county resolution already in `zip_geo.py`.
4. **Consolidate last.** Abstracting an in-memory service and a SQL service into one
   interface means designing around a difference Stage 2 deletes.

---

## 4. Stages

Each stage ships independently and leaves the product working.

### Stage 0 — Pre-flight (no code)

Answer before starting Stage 2:

```sql
-- How many saved lender contacts exist? Determines whether id preservation
-- is load-bearing or merely tidy.
SELECT entity_type, count(*) FROM saved_directory_contacts GROUP BY entity_type;

-- Do any reference an id outside 1..484 already?
SELECT count(*) FROM saved_directory_contacts
WHERE entity_type = 'lender' AND (entity_id < 1 OR entity_id > 484);
```

Run via the documented pattern in `backend/scripts/diag_prod_schema.sh`:
`railway run --service Postgres -- …` (the Postgres service exposes
`DATABASE_PUBLIC_URL`; the app service only has the unreachable internal URL).

**Verify:** counts known and recorded in this document before Stage 2 begins.

**Superseded for Stage 2 (2026-07-29), still worth running.** Stage 2 shipped taking
the id-preserving path unconditionally, which is correct under either answer — the
counts would only have told us whether preservation could be *relaxed*, and it was
not needed. Run it anyway to confirm no saved lender contact references an id outside
1–484, which would indicate drift predating this work.

---

### Stage 1 — Enforce paid-only access (closes a revenue leak) — DONE 2026-07-29

**Goal:** make the code match the policy in §2.4. Highest priority — it was live revenue
leakage, independent of every other stage, and it deleted code rather than adding it.

Confirmation that paid-only was always the intent: both components already passed
`paidOnlyFeature` to `UpgradeModal`, which sets `skip_trial: true` at checkout and
renders "requires a paid Pro subscription. Billing starts today." Only the server-side
view gate was left behind.

Trialing users now get a distinct gate ("not included in the free trial" / "Start paid
Pro") instead of the free tier's "upgrade" copy, since they have already chosen a plan.

| File | Change |
|---|---|
| `app/services/directory_gates.py` | `require_view_access`: 403 unless `PAID`. Trial gets `EXPORTS_PAID_ONLY`-style copy ("unlocks with your first payment") rather than the generic upgrade teaser — a trialing user already chose a plan and needs different words than a free user |
| `app/services/directory_gates.py` | delete `enforce_detail_view_cap` |
| `app/services/directory_usage.py` | delete `record_detail_view`, `KIND_DETAIL_VIEW`, `DAILY_DETAIL_VIEW_LIMIT`, `VIEW_LIMIT_MESSAGE`, `daily_period_key` |
| `app/routers/lenders.py`, `app/routers/buyers.py` | drop the detail-view cap call, the redact helpers, and `contactsRedacted` |
| `app/schemas/lenders.py`, `app/schemas/buyers.py` | drop `contactsRedacted` |
| `HardMoneyDirectory.tsx`, `BuyerDirectory.tsx` | gate on `isPaidPro` only; delete the reveal flow, `revealedContacts`, `viewLimitNotice`, `revealingId` |
| `src/lib/lenders-api.ts`, `src/lib/buyers-api.ts` | drop `contactsRedacted` |
| `backend/tests/test_lenders_api.py`, `test_buyers_api.py` | trial must now 403 on list, detail, and export |
| `frontend/.../BuyerDirectory.test.tsx` | replace the trial-reveal and view-limit tests with a trial-is-blocked test |

Leave `directory_usage_counters` in place — the table still meters exports. Only the
`detail_view` rows become vestigial; they age out by period key on their own.

**Decide before implementing:** does a trialing user see the gate with upgrade copy, or
should `/lenders` and `/directory` be hidden from navigation during a trial? The first
is honest and can convert; the second avoids advertising something they can't use.

**Verify:**
- A trialing user receives 403 on `GET /api/lenders`, `/api/buyers`, both detail
  endpoints, and both export endpoints.
- A paid user's responses no longer contain `contactsRedacted` and contacts are never
  blanked.
- No remaining references to `KIND_DETAIL_VIEW` or `contactsRedacted` anywhere.

---

### Stage 2 — Lenders into Postgres (the unblocking stage) — DONE 2026-07-29

**Goal:** lender parity with buyers, stable identity, joinable geography.

Shipped as specified except for three points where the data contradicted the plan.
All three were found by profiling `lenders.json` before writing the migration.

**1. Rates and ratios are `DOUBLE PRECISION`, not `NUMERIC(5,2)`.** The plan assumed
these were percentages (`75.00`). They are fractions: `max_ltv` `0.925` means 92.5%,
and `min_interest_rate` carries up to 6 decimal places. `NUMERIC(5,2)` would have
silently rounded **188 values** (126 `min_interest_rate`, 59 `max_interest_rate`,
3 `max_ltv`) and **overflowed** on `max_arv = 500000.0`, failing the seed outright.
These fields are only displayed and filtered, never summed, so float is safe here.

**2. Unfiltered result order changed, deliberately.** The old order was `lenders.json`
file order — a shuffled accident of dataset generation, with no meaning. It is now
`ORDER BY id`. Result **sets** are identical for all 26 verified filter combinations,
and every **state-filtered** combination preserves its exact previous ordering, since
locality ranking is the only ordering that carried intent. 14 unfiltered/non-state
combinations return the same rows in a different sequence. Freezing the old shuffle
would have required a `sort_order` column existing solely to preserve an accident.
*Open question: unfiltered browsing may be better served alphabetically by
`company_name` than by `id`. Not changed here — it is a product decision, not a
migration one.*

**3. `stats.byCreditPolicy` maps NULL to `"unknown"`.** The frozen block counted the
141 lenders with no stated policy under `unknown`; a naive `GROUP BY` dropped them.
The live aggregate now coalesces, so the response shape is unchanged.

Two pre-existing data-quality bugs surfaced and were **left as-is** rather than
silently corrected, since the dataset is regenerated offline:

| Lender | Field | Value | Problem |
|---|---|---|---|
| `oakwoodlending.com` (id 446) | `max_arv` | `500000.0` | dollar amount in a ratio field (others are 0.5–0.95) |
| one record | `year_founded` | `25` | not a plausible year |

Also added beyond the plan: `_lender_exists()` is wired into `save_contact`, closing
the asymmetry where only buyers were validated. And `LIKE` metacharacters (`%`, `_`)
are escaped in the search filter — the in-memory predicate used Python `in`, where
they are literal, so passing them through unescaped would have turned a user's search
string into a pattern.

**Verified:** 484/484 records field-identical to the pre-migration JSON responses;
identical result sets across 26 filter combinations and 15 pagination cases; stats
identical; migration applies and rolls back cleanly; a from-empty database runs
35 migrations then both seeds; full backend suite 603 passed.

#### Migration `20260730_0001_add_lenders.py` (down_revision `20260729_0001`)

```sql
CREATE TABLE lenders (
  id                  INTEGER PRIMARY KEY,          -- preserved from lenders.json
  domain              TEXT NOT NULL UNIQUE,         -- natural key for all future refreshes
  company_name        TEXT NOT NULL,
  website             TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  contact_type        TEXT NOT NULL,
  city                TEXT,
  state               CHAR(2),
  nationwide          BOOLEAN NOT NULL DEFAULT FALSE,
  states_served       TEXT[] NOT NULL DEFAULT '{}', -- kept until Stage 3 backfill lands
  loan_products       TEXT[] NOT NULL DEFAULT '{}',
  description         TEXT,
  min_loan_amount     INTEGER,
  max_loan_amount     INTEGER,
  max_ltv             NUMERIC(5,2),
  max_arv             NUMERIC(5,2),
  min_interest_rate   NUMERIC(5,2),
  max_interest_rate   NUMERIC(5,2),
  min_points          NUMERIC(4,2),
  max_points          NUMERIC(4,2),
  min_term_months     INTEGER,
  max_term_months     INTEGER,
  interest_only       BOOLEAN,
  display             JSONB NOT NULL DEFAULT '{}',  -- 6 pre-formatted strings; see note
  nmls_id             TEXT,
  aapl_member         BOOLEAN,
  year_founded        INTEGER,
  credit_check_policy TEXT,
  min_credit_score    INTEGER,
  no_credit_check     BOOLEAN,
  source              TEXT,                          -- provenance: 'brave_search'
  is_active           BOOLEAN NOT NULL DEFAULT TRUE, -- retire a lender without deleting saved refs
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_lenders_state_active   ON lenders (state) WHERE is_active;
CREATE INDEX ix_lenders_states_gin     ON lenders USING GIN (states_served);
CREATE INDEX ix_lenders_products_gin   ON lenders USING GIN (loan_products);
CREATE INDEX ix_lenders_company_lower  ON lenders (lower(company_name));
CREATE INDEX ix_lenders_max_loan       ON lenders (max_loan_amount);
```

`states_served_count` is dropped — it is `cardinality(states_served)` and storing it
invites drift. Compute it in the response model.

`display` stays JSONB for now: it is a generated presentation cache and moving it into
the frontend is a separate, avoidable API change. Flagged for later retirement.

Note `NUMERIC` for rates rather than float: the current schema types these as `float`,
which is wrong for money-adjacent display values and costs nothing to fix here.

#### Files

| File | Change |
|---|---|
| `app/models/lender.py` | **new** — `Lender` model, mirroring `cash_buyer.py` style |
| `app/models/__init__.py` | register `Lender` for Alembic autodiscovery |
| `backend/scripts/seed_lenders.py` | **new** — idempotent upsert **on `domain`**, preserving `id` on first load; follow `seed_geo_counties.py` |
| `backend/railway.toml` | append to `preDeployCommand` chain |
| `app/services/lenders_service.py` | rewrite: `_matches()` → `_apply_filters(stmt, …)`; `list_lenders_page` → SQL count + page; `get_lender_by_id` → `db.get()`; delete `_load_lenders_file`, keep `_locality_rank` as SQL `CASE` ordering |
| `app/routers/lenders.py` | inject `DbSession`; endpoints become `async` over SQL |
| `app/schemas/lenders.py` | `LenderOut.model_config = ConfigDict(from_attributes=True)`; `states_served_count` becomes computed |
| `app/services/saved_directory_contact_service.py` | add `_lender_exists()`, mirroring `_buyer_exists()` |
| `app/data/lenders.json` | retained as the seed source, no longer read at runtime |

#### Stats

The precomputed `stats` block becomes SQL aggregates:

```sql
SELECT state, count(*) FROM lenders WHERE is_active GROUP BY state;
SELECT p, count(*) FROM lenders, unnest(loan_products) AS p
WHERE is_active GROUP BY p;
```

`LenderStatsResponse` shape is unchanged, so the frontend needs no edit.

#### Locality ranking in SQL

```python
locality = case(
    (Lender.state == state, 0),
    (Lender.nationwide.is_(False), 1),
    else_=2,
)
stmt = stmt.order_by(locality, Lender.company_name)
```

**Verify:**
- `backend/tests/test_lenders_api.py` passes unchanged — it already asserts the
  locality ordering and filter semantics, making it the regression harness for this
  rewrite. Convert fixtures from JSON to DB rows; keep every assertion.
- Row count is 484 and `SELECT count(DISTINCT domain) = 484`.
- Every id present in `lenders.json` exists in the table with the same `domain`.
- `/api/lenders` responses are byte-identical to pre-migration for a fixed set of
  filter combinations (capture before/after).

**Rollback:** `alembic downgrade -1` plus reverting the service; `lenders.json` is
untouched, so the in-memory path is restorable in one revert.

---

### Stage 3 — `directory_service_area` and real county matching — DONE 2026-07-29

**Goal:** one indexed answer to "who covers this location?" for both directories.

**Shipped:** the table, the lender state backfill (7,093 rows: 7,014 state + 79
nationwide), `geo_cities`, the buyer coverage backfill (11,166 rows), and the buyer
city/county query path. A state lookup through the table is exactly equivalent to
the old `states_served` array filter — asserted across all 51 states, in a test,
not just once by hand.

**The buyer half needed `geo_city` first.** Measurement, not assumption,
established that: of 9,871 `cash_buyers.coverage[]` strings only **59.6%** resolved
against counties alone, and the unmatched third was not noise — it was San Antonio,
Fort Worth, Orlando, Tampa, Atlanta, Charlotte, Nashville, Chicago, Seattle,
Cleveland, the largest markets in the directory. Backfilling only 59.6% and
repointing the query would have silently dropped buyers the old `coverage[]` ILIKE
search still found. `geo_cities` (31,909 Census places) plus the matching fixes
below took resolution to **90.6%**:

| Outcome | Before | Now |
|---|---:|---:|
| resolved to county/ies | 5,541 (56.1%) | **8,601 (87.1%)** |
| state-wide markers (`All of CA`, `58 CA Counties`) | 344 (3.5%) | 332 (3.4%) |
| nationwide (`All of US`) | — | 7 (0.1%) |
| ambiguous | 96 (1.0%) | **14 (0.1%)** |
| unmatched | 3,890 (39.4%) | 917 (9.3%) |
| **resolvable** | **59.6%** | **90.6%** |

The residual 9.3% is dominated by three things that resolving would mean *guessing*:
buyers with no state on the record (the lookup cannot be scoped), counties in a
neighbouring state (a Memphis buyer covering "DeSoto", which is in Mississippi), and
metro nicknames with no legal geography ("Hampton Roads"). Full worklist:
`docs/geo/coverage-unmatched.csv` (746 distinct strings, ranked by occurrence),
regenerated by `scripts/report_buyer_coverage_gaps.py`.

**Matching lives in one module.** `app/services/geo_matching.py` is the only place
that decides what a coverage string means; the backfill and the gap report both call
it, so the report is exactly the set of strings that did not become rows. Four rules
in it are load-bearing and each has a test:

- *An explicit suffix wins.* "Baltimore County" → 24005, "Baltimore City" → 24510.
  Previously both were ambiguous, which is how 96 ambiguous strings became 14.
- *A bare shared name covers both.* "Baltimore" alone → {24005, 24510}. Either
  reading puts the buyer in that metro, and the union cannot exclude the area meant.
- *`" city"` is stripped only as a last resort*, after the literal name has failed as
  both a county and a Census place. Stripping it first sends "Jefferson City" to
  Jefferson County, 100 miles from Missouri's capital.
- *Punctuation is folded on both sides* — `Prince George’s` / `Prince George's`,
  `Winston-Salem` / `Winston Salem`, `St. Louis` / `St Louis`. Folding happens in
  Python rather than SQL specifically so the read path cannot fold differently from
  the write path, which would return nothing and look like missing data.

Plus three NYC borough aliases (Brooklyn → Kings, Staten Island → Richmond,
Manhattan → New York): no Census record connects them, and every buyer in the five
boroughs writes the borough name.

**The query unions, it does not replace.** `buyers_service` ORs the service-area
match with the original coverage-text match. With 9.3% of strings still unresolved,
replacing the text match would drop buyers who are reachable today, so recall can
only go up — verified per-place in `test_buyer_place_search.py`. Measured effect:

| Search | Text only | Union |
|---|---:|---:|
| Hillsborough | 40 | **90** |
| Jefferson | 63 | **146** |
| Maricopa | 17 | **48** |
| Tampa (city, FL) | 37 | **56** |

Precision is unchanged for now — a "county" search still text-matches, so
"Orange" still catches "Orangeburg". That is fixable only once the frontend sends a
FIPS instead of a name, at which point the text branch can be dropped. Deferred
deliberately rather than done half-way.

**`cash_buyers` had no seed script.** It was populated by hand, so a fresh database
came up empty and `buyer_directory_service` silently fell back to reading
`buyers.json` in-process. That fallback cannot support this stage — service-area
rows key on `cash_buyers.id` — so `scripts/seed_cash_buyers.py` now exists, keyed on
`phone` (the one unique constraint) with the same id-stability rules as
`seed_lenders`. The full `preDeployCommand` chain was verified on an empty database:
migrations, four seeds, backfill, 11 seconds, and idempotent on a second run.

**Two corrections to the design below.**

*The primary key as specified is invalid.* Postgres will not accept NULL in a
primary key, and both `state` and `county_fips` are null by design. Shipped as a
surrogate `id` plus a unique index over COALESCE'd columns, which behaves the same
on every server version — unlike `UNIQUE NULLS NOT DISTINCT`, which needs PG15+.
Two CHECK constraints now make an inconsistent scope/state/county combination
impossible to insert rather than merely discouraged.

*Nationwide lenders get explicit state rows too*, not just the marker. The plan said
"one row per entry in `states_served`, **or** a single nationwide row"; all 79
nationwide lenders already enumerate 51 states, so writing the rows out makes a
state lookup exactly equivalent to the old filter instead of leaving equivalence
dependent on a nationwide special case at query time. The marker is retained for
badging. Rows also carry a `source` tag so the future city pass can refresh only
its own rows.

*Connecticut only works because retired counties were kept.* CT replaced its
counties with planning regions in 2022, but buyers still write "Hartford" and
"New Haven". Matching against current geographies alone scores **0 of 145** CT
strings; including the retired counties recovers 91. Any future matching pass must
keep doing this.

#### Migration `20260731_0001_add_directory_service_area.py`

```sql
CREATE TABLE directory_service_area (
  entity_type TEXT    NOT NULL,          -- 'lender' | 'buyer', matching DirectoryEntityType
  entity_id   INTEGER NOT NULL,
  scope       TEXT    NOT NULL,          -- 'nationwide' | 'state' | 'county'
  state       CHAR(2),                   -- null only when scope='nationwide'
  county_fips CHAR(5) REFERENCES geo_counties(fips),  -- non-null only when scope='county'
  PRIMARY KEY (entity_type, entity_id, scope, state, county_fips)
);

CREATE INDEX ix_dsa_state  ON directory_service_area (state, entity_type);
CREATE INDEX ix_dsa_county ON directory_service_area (county_fips, entity_type);
```

Deliberately mirrors the `(entity_type, entity_id)` convention already in
`saved_directory_contacts` — no FK, because the two source tables differ.

#### Backfill, in order of payoff

1. **Lender state coverage** — one row per entry in `states_served`, or a single
   `nationwide` row. Mechanical, no new data.
2. **Buyer coverage** — normalize `cash_buyers.coverage[]` against
   `geo_counties.short_name` scoped by `cash_buyers.state`. Emit `county` rows for
   confident matches. **Log unmatched strings; never guess.** The six known
   `short_name` collisions (Baltimore, St. Louis, and four in Virginia) are genuinely
   ambiguous and must be reported, not silently resolved.
3. **Lender county coverage** — deferred until the regenerated lender dataset carries
   `counties_served`. No schema change needed when it arrives.

#### Query shape

```python
location = resolve_zip(zip_code)          # existing app/services/zip_geo.py
# covers = nationwide OR state match OR any county of this ZIP
```

**Verify:**
- Backfill match rate reported per state, with the unmatched list written to
  `docs/geo/coverage-unmatched.csv` for review.
- A buyer whose `coverage` says "Palm Beach" is returned for ZIP 33460 via
  `county_fips = '12099'`.
- Lender results are unchanged for state-only searches (`states_served` and the new
  rows must agree — assert equivalence across all 52 states).

---

### Stage 4 — Consolidate the backend pipeline

Only now is the code on both sides genuinely the same.

| File | Change |
|---|---|
| `app/services/directory_pipeline.py` | **new** — shared list/export/meter flow: `require_view_access` → page → respond; and the ~70-line export block currently duplicated in both routers |
| `app/schemas/directory.py` | **new** — generic `DirectoryListResponse[T]`; `LenderListResponse`/`BuyerListResponse` become aliases so the wire format is unchanged |
| `app/routers/lenders.py`, `app/routers/buyers.py` | shrink to filter parsing + a pipeline call |
| `app/services/buyer_directory_service.py` | **delete**; move `row_to_buyer_record` to `buyers_service.py`. It is dead except that one helper and carries a stale 2,812-row JSON fallback |
| `MAX_PAGE_SIZE` | single definition (currently in `lenders_service.py` **and** `routers/buyers.py:47`) |

The redaction inconsistency noted in review (lenders blank to `None`, buyers to `""`)
needs no reconciliation here — Stage 1 deletes both paths.

**Verify:** both directories' API tests pass with zero response-shape diffs.

---

### Stage 5 — Consolidate the frontend

Two components, ~950 and ~1,000 lines, roughly 70% parallel.

| File | Change |
|---|---|
| `src/hooks/useDirectoryList.ts` | **new** — the shared `useInfiniteQuery` + access-flag block (duplicated at `HardMoneyDirectory.tsx:217` and `BuyerDirectory.tsx:342`) |
| ~~`src/hooks/useRevealContact.ts`~~ | not needed — Stage 1 deletes the reveal flow from both components |
| `src/components/directory/DirectoryField.tsx` | **new** — replaces the two local `Field` components (lender's has a `hint` prop, buyer's does not) |
| `src/components/directory/DirectoryGate.tsx` | **new** — shared gate shell; bullets stay per-directory |
| `src/lib/buyers-api.ts` | export a real `Buyer` type; today it declares `buyers: unknown[]` while the component keeps a private interface |
| `src/components/buyer-directory/BuyerDirectory.tsx` | delete lines ~59–259, unused Florida county/city/ZIP maps superseded by the geo API |

UX divergences to settle, not silently preserve:

- **Done (2026-07-29):** the buyer `Tampa, FL` default is removed; the first view is
  nationwide, matching lenders' empty-filter behaviour. An "All states" option was
  added to the state select so nationwide is selectable again after a search.
- Buyers still require a **Search** click while lenders filter live. Open question.
- Buyers show skeleton cards while loading; lenders show a text line.
- Grid min-width 300px vs 320px; subtitle max-width 640px vs 720px.

**Verify:** `npm run typecheck`, `npm run test:run`, `npm run theme:check`,
`npm run build` per `AGENTS.md` §9. Add a `HardMoneyDirectory.test.tsx` — buyers have
tests, lenders have none.

---

## 5. Sequencing constraint

```
Stage 2 (lenders → Postgres)  MUST precede  the lender dataset regeneration
```

Regenerating first means migrating ids twice and reconciling saved contacts against a
file whose ids have already moved.

Stage 1 is independent of everything and should go first: it is live revenue leakage,
and every later stage gets smaller once the trial-viewing paths are deleted. Stage 3
depends on Stage 2 for lender rows, and — as it turned out — on `geo_cities` for the
buyer half. Stages 4 and 5 depend on Stage 2.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Saved lender contacts break | **Closed by Stage 2.** Ids preserved on seed, `UNIQUE(domain)` added, refreshes update by domain and never touch a stored id, and a new-domain id collision aborts the seed instead of guessing |
| Lender API behaviour drifts in the rewrite | **Closed by Stage 2.** Responses were captured from the JSON implementation before the rewrite and diffed after: 484/484 records field-identical, 26 filter combinations and 15 pagination cases identical |
| Buyer coverage backfill mismatches | Never guess; log unmatched and ambiguous names for review |
| Seed failure blocks deploys | It already can — the seed is chained into `preDeployCommand`. Keep seeds idempotent and validate the data file in CI |
| Local verification is limited | **Closed 2026-07-29.** `backend/.venv` now runs Python 3.11 (matching CI), and `make test-db-up` provides a Postgres mirroring CI's, so the full suite runs locally |

## 7. Explicitly out of scope

- Merging lenders and buyers into one table or one endpoint.
- Lender **county** filtering — needs `counties_served` in the dataset. A geo database
  says which counties exist; it cannot say where a lender will lend.
- Fuzzy/trigram search, radius search, `geo_city`, `geo_state` (see
  `docs/geo/geo-data-spec.csv`).
