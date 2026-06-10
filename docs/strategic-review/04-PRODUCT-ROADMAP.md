# DealGapIQ — Strategic Product Roadmap

**Date:** June 10, 2026
**Planning horizon:** 12 months, four phases
**Resource baseline assumption:** 1–2 full-stack engineers (or equivalent agent-assisted capacity) + founder product direction. Estimates scale accordingly; ranges assume the smaller team.

**Governing principle:** Revenue integrity and trust before growth. Several "new feature" candidates are actually *unwiring* work — the codebase contains substantial built-but-disconnected capability (onboarding, alerts, push, tour spec, Phase 2 state hooks). The cheapest roadmap wins come from connecting what exists.

---

## Phase 0 — Stabilize (Weeks 1–3) · "Stop the leaks"

*Goal: eliminate active security exposure, revenue leakage, and trust contradictions.*

| Workstream | Items (audit refs) | Estimate |
|------------|--------------------|----------|
| Security incident | Revoke leaked sessions, scrub `cookies.txt` from git history, cap session lifetime, gate `/docs` `/metrics` `/health/deep` (C1, H4, H8) | 2–3 days |
| Revenue enforcement | Server-side auth + `record_analysis` on all paid-API endpoints; fix `db.begin(): pass` commit bugs; webhook idempotency (C2, C3, C4, H5) | 1–1.5 weeks |
| Data integrity | Replace fabricated taxes/ADR/occupancy with `null` + "Unavailable"; decide STR data source (re-enable Mashvisor vs AirDNA vs visible "no STR data") (C5, H2) | 3–5 days |
| Trust copy | Fix `/help` "free beta", register trial claim, placeholder dashboard banner (UX P0) | Hours |
| CI safety net | GitHub Actions: pytest + ruff + typecheck + vitest + lint + theme:check + dependency audit; fix obsolete tier tests (C6, M12) | 2–3 days |

**Exit criteria:** No unauthenticated path reaches a paid API. Free-tier limit enforced server-side. All tests run on every PR. Zero fabricated financial inputs in the verdict pipeline.

---

## Phase 1 — Convert (Weeks 4–10) · "Make the funnel real"

*Goal: turn the strong anonymous activation funnel into measurable trial and paid conversion.*

| Workstream | Items | Estimate |
|------------|-------|----------|
| Funnel instrumentation | Product analytics with identity stitching (signup → verify → first verdict → trial → paid); define the metric baseline before shipping anything else in this phase | 1 week |
| Freemium conversion loop | Limit-reached in-app moment + usage countdown on Discovery/Strategy + upgrade modal handoff | 1 week |
| Onboarding activation | Post-signup routing to `/onboarding`; answers drive default strategy, market alerts, email segmentation | 1 week |
| Guided tour | Implement `tour-spec-v2.md` (react-joyride) for Discovery → Deal Maker | 1 week |
| Email verification enforcement | Apply `VerifiedUser` to write/paid routes (H3) | 2 days |
| Lifecycle email verification | Confirm Arq/cron actually fires digest, trial-ending, winback in production; add dead-man monitoring | 3 days |
| Quick analytical wins | IRR on existing proforma series; extend projections toward loan-term horizon (gap analysis Tier 1) | 1–2 weeks |

**KPIs to instrument and baseline this phase:**

| Metric | Definition | Initial target |
|--------|-----------|----------------|
| Activation rate | Visitors reaching first verdict | baseline → +20% |
| Signup conversion | First verdict → account | ≥ 15% |
| Trial start rate | Accounts → trial within 14 days | ≥ 10% |
| Trial → paid | 7-day trial conversion | ≥ 35% (industry 25–50%) |
| Limit-hit upgrade rate | Free users hitting cap → trial | ≥ 8% |

---

## Phase 2 — Retain (Weeks 10–20) · "Reasons to come back"

*Goal: build the habitual-return loop; cut early churn.*

| Workstream | Items | Estimate |
|------------|-------|----------|
| Alerts pipeline | Price/status change alerts on saved properties (template exists); daily/weekly cadence per onboarding prefs | 2 weeks |
| Push notifications | Capacitor client wiring → existing Expo backend; overdue tasks + alerts | 1 week |
| Resume-last-deal | Real recent-activity surface on dashboard (replace placeholder) | 3 days |
| Watchlist/markets | Followed ZIP/city with weekly market-temperature digest (RentCast market stats already integrated) | 2–3 weeks |
| Shareable Deal Gap card | Public read-only verdict snapshot with signup CTA | 1–2 weeks |
| Wholesale loop completion | LOI persistence (4 TODOs), buyer-match flow from verdict → directory | 2 weeks |
| Engineering debt (parallel track, ~30% capacity) | Complete Phase 2 decomposition: wire `useDealSnapshot`/`useAssumptions`, split strategy/discovery pages, fix `\|\|`→`??` payload defects, offload PDF/Excel to Arq, dependency upgrades (H1, H6, H7, M9) | continuous |

**KPIs:**

| Metric | Target |
|--------|--------|
| Week-4 retention (paid) | ≥ 60% |
| Monthly logo churn | ≤ 6% (path to ≤ 4%) |
| WAU/MAU | ≥ 0.35 |
| Alert CTR → session | ≥ 25% |

---

## Phase 3 — Expand (Months 5–9) · "Defend the price, widen the wedge"

*Goal: justify and grow ARPU; open a second tier; deepen the moat.*

| Workstream | Items | Rationale |
|------------|-------|-----------|
| STR parity | Real ADR/occupancy source live (decision from Phase 0); STR vs LTR side-by-side per address as a marketed feature | Neutralizes Mashvisor/AirDNA objection |
| Mid-tier pricing experiment | ~$19–24/mo: unlimited analyses, no directories/exports; `TIER_LIMITS` + Stripe plumbing already support it | Captures DealCheck-price-sensitive segment without cannibalizing Pro (directories + Deal Maker + exports stay Pro) |
| Four Paths as hero | Marketing surface, demo video, pitch-script samples on landing; possibly a free "one path" teaser | The unique asset, currently buried |
| Portfolio analytics | Post-close tracking on held deals (the pipeline already has Sold/Held stages) | Increases switching cost; counters Stessa |
| Annual-plan push | In-app annual upgrade prompts at high-engagement moments; winback emails exist | Annual mix ≥ 35% is the single biggest LTV lever |
| Team seats (exploratory) | `TEAM_SHARE` stub → 2–5 seat plan for partnerships/small funds | ARPU expansion; validate demand first |

**KPIs:** ARPU ≥ $32; annual plan mix ≥ 35%; LTV:CAC ≥ 3:1; trial→paid ≥ 40%.

---

## Phase 4 — Scale (Months 9–12) · "Compounding"

- **Public API / integrations** for power users (Zapier, sheets export) — power-user lock-in.
- **Programmatic SEO** at scale: per-market Deal Gap index pages built on data already flowing (market temp, DOM, median discount) — compounds the existing comparison-page strategy.
- **Referral loop** on the shareable card.
- **Data moat investment:** accumulate first-party outcomes (did the user close? at what discount?) to recalibrate the investor-discount brackets with proprietary data — converts the scoring methodology from "published cohort data" to "our data," which is uncopyable.

---

## Resource & Sequencing Notes

- Phases 0–1 are **sequential and non-negotiable** — shipping growth features on top of a bypassable paywall and unmeasurable funnel wastes the work.
- Phase 2 retention and the engineering-debt track run in parallel at roughly 70/30 capacity split.
- The debt track is not optional: the 3,800-line strategy page and dual state systems are the main drag on every future feature's velocity; the decomposition is already designed and partially built.
- Total new-spend signals: STR data source (~$20–75/mo API), product analytics (PostHog free tier viable), no other material infra cost.

## North-Star Metric

**Weekly Analyzing Investors (WAI):** accounts running ≥1 verdict per week. Every phase rolls up to it — activation grows the top, conversion monetizes it, retention mechanics keep it, expansion raises its value.
