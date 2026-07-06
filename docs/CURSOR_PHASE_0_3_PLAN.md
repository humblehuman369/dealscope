# DealGapIQ — Phase 0 & Phase 3 Implementation Plan
## Instructions for Cursor

**Repo:** `/Users/bradgeisen/IQ-Data/dealscope/` (frontend at `frontend/src`)
**Date:** July 2026
**Status:** Phases 1–2 (homepage copy, founder section, comparison table,
number consistency) are DONE. This file covers only Phase 0 (bug fixes)
and Phase 3 (directory gating).

---

## Rules (read before touching code)

1. Work ONE phase at a time, in order. Phase 0 must be complete before
   Phase 3 begins, because export gating depends on a working billing pipe.
2. Make surgical changes. Touch only what each task names. No refactors
   of unrelated code. Match existing style.
3. If a task requires an assumption, STOP and state it. Present the
   options. Do not pick silently.
4. All gating, capping, and metering MUST be enforced server-side.
   Client-side checks are UX decoration only, never security.
5. Only remove orphan code that these changes create.

---

## PHASE 0 — P0 Bug Fixes

### Task 0.1 — Billing decimal error (HIGHEST PRIORITY)
The annual Pro price can display and/or charge $2,917/mo instead of
$29.17/mo. Find where the price is computed or formatted — likely a
cents-to-dollars conversion or a wrong Stripe price mapping. Fix the
display AND verify the actual charge. Check every surface where price
renders: pricing page, checkout, receipts, account/billing page.

**Accept when:** A test annual subscription shows $29.17/mo everywhere
and the Stripe dashboard shows the correct charge amount.

### Task 0.2 — Comps backend outage
The Comps feature returns errors. Diagnose the backend failure (API
route, data-provider call, or auth to the data source). Fix it, then
add a graceful error state so a future outage shows a friendly message
instead of a crash.

**Accept when:** Comps loads for 3 different addresses in 3 different
states, and killing the data source shows the friendly error state.

### Task 0.3 — Excel export kills the session
Downloading the Excel proforma logs the user out. Diagnose — likely the
download response clobbering auth cookies/headers, or a route conflict.
Fix so the file downloads and the session survives.

**Accept when:** Export a proforma, then visit 3 other pages while
still logged in. Repeat twice.

### Task 0.4 — Verify the Lake Worth homepage example
FINDING from homepage review: the "$2,719 2nd at 0%" figure is
HARDCODED marketing copy in the `paths` array inside `FeaturesSection`
in `frontend/src/components/landing/DealGapIQHomepageV4.tsx`. It is not
computed. A $2,719 second mortgage reads like a glitch to investors.
1. Run a real Discovery on 1014-16 N J St, Lake Worth, FL.
2. Compare the real Path 4 (Blended Creative) output to the homepage copy.
3. Update the hardcoded copy to match the real output. If the real
   output itself produces a tiny second like $2,719, report it — that
   is a Four Paths calculation issue, and it must be fixed in the
   engine, not the copy.

**Accept when:** Homepage example numbers match a real Discovery run
of that address, or the engine bug is documented and fixed.

---

## PHASE 3 — Directory Gating: View Free, Export Paid

**Business rule:** Trial users can search, filter, and VIEW directory
records. Downloading (CSV export, print-to-PDF) unlocks only after the
FIRST SUCCESSFUL CHARGE — not at trial start. This kills the
"sign up, download both directories, cancel" play while letting the
trial honestly show off the directories.

### Task 3.0 — Scope check (report findings BEFORE building)
KNOWN from review: buyer data is already behind an API. The hook
`useBuyerDirectoryTeaserTotal` calls `/api/buyers/stats`, which returns
401 PRO_REQUIRED with `{ total }` for non-Pro users. `buyers.json` is
no longer in `frontend/src/data/`. HOWEVER `frontend/src/data/lenders.json`
(484 lenders) still ships in the client bundle.
1. Audit all buyer API endpoints: confirm auth is required, responses
   are paginated (max 25/page), and NO endpoint returns the full set.
2. Confirm whether the directory "preview" for non-Pro users leaks
   full contact records. Report what it exposes.
3. Confirm `lenders.json` is reachable in the built client bundle.
Report all three findings before writing code.

### Task 3.1 — Move lender data behind the API
Mirror the buyer setup for lenders: authenticated, paginated search
and record-detail endpoints. Remove `lenders.json` from the client
bundle. The lender directory UI fetches from the API. Keep
`LENDER_DIRECTORY_TOTAL` in `lib/directory-promo.ts` working for
marketing copy (or switch it to a stats endpoint like buyers).

### Task 3.2 — Entitlement states
One server-side helper that resolves a user to `free`, `trial`, or
`paid`. Web: Stripe subscription status — `paid` requires at least one
settled charge; a trialing subscription with no settled charge is
`trial`. Mobile: RevenueCat entitlement, same rule. Every gate in
Tasks 3.3–3.4 calls this ONE helper. Do not scatter status logic.

### Task 3.3 — Access gates (server-enforced)
1. `free`: no directory access. API returns 403; UI shows existing
   ProGate upsell.
2. `trial`: full search/filter/view. Record-detail opens capped at
   25 per day per user, counted server-side. On cap: "Daily view
   limit reached — resets tomorrow."
3. `paid`: full view access, no daily cap.
4. CSV export and print-to-PDF: `paid` only, checked server-side
   before any file is generated. Trial sees locked buttons with copy:
   "Exports unlock with your first payment."

### Task 3.4 — Export metering for paid users
1. Each CSV export returns at most 200 records (current filtered set,
   capped).
2. Monthly ceiling: 1,000 exported records per paid user, counted
   server-side. On ceiling: "You've hit this month's export limit.
   It resets on your billing date."
3. Print-to-PDF follows the same caps.

### Task 3.5 — Copy updates (ONLY after gates are live)
These lines are currently TRUE and must not change until the gate ships:
1. `DealGapIQHomepageV4.tsx`, PricingSection fine print: replace the
   "not included in the 7-day trial" note with "Trial includes full
   directory access. Exports unlock with your first payment." Review
   `lockedFeatureIndices` on the Pro card — directories are now
   viewable in trial, so the lock icons may need rethinking.
2. `app/page.tsx`, HOME_FAQ: rewrite the "Does Pro include the Cash
   Buyer and Hard Money directories?" answer to match the new rule.
3. Pricing page (`app/pricing`): sweep for the same stale fine print.

**Phase 3 accept when (test with real accounts):**
1. Trial: views records, hits the 25/day wall cleanly, sees locked
   exports.
2. Paid: exports work, capped at 200 records.
3. Canceled: directory access drops on the next request.
4. Theft test: with dev tools open, a trial user cannot obtain either
   dataset — no bundle file, no bulk endpoint, no unauthenticated API
   response. Attempt it and document the attempt.

---

## Open decisions (ask Brad, do not guess)

1. Free-tier discovery count — homepage currently says 10/month;
   earlier materials said 3 or 5. Confirm the final number.
2. Trial view cap (default 25/day) and export meters (default
   200/export, 1,000/month). Confirm before building Task 3.3.
3. Founder photo asset — the homepage FounderTrustSection has a
   TODO(brad) initials placeholder.

## Sequencing

Task 0.1 (billing) blocks all of Phase 3 — do not build entitlement
logic on a broken billing pipe. Tasks 0.2, 0.3, 0.4 can run in any
order after 0.1. Phase 3 runs strictly in task order: 3.0 report,
then 3.1, 3.2, 3.3, 3.4, and 3.5 last.
