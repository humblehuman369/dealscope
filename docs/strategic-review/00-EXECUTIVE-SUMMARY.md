# DealGapIQ — Executive Summary: Strategic & Technical Review

**Date:** June 10, 2026
**Companion documents:** `01-TECHNICAL-AUDIT.md` · `02-FEATURE-GAP-ANALYSIS.md` · `03-UX-RETENTION-EVALUATION.md` · `04-PRODUCT-ROADMAP.md` · `05-ANALYTICS-MODELS-VALIDATION.md`

---

## The One-Paragraph Verdict

DealGapIQ is a substantially built, genuinely differentiated product — the only tool in its competitive set that answers *"what should I offer and how do I structure it?"* rather than just *"what are the returns?"* The codebase contains more shipped capability than the funnel exposes, and more revenue infrastructure than is actually enforced. The path to profitability is not a feature race: it is **(1) a two-week stabilization of revenue enforcement, data integrity, and a live credential leak, (2) wiring together the conversion and retention machinery that already exists in code but is disconnected, and (3) promoting the unique negotiation engine from a buried feature to the brand.**

---

## Where the Business Stands

| Dimension | Assessment |
|-----------|-----------|
| **Differentiation** | Strong and real: Deal Gap/Target Buy framing, achievability scoring against investor-discount cohorts, Four Paths creative-finance engine with pitch scripts, 6-strategy simultaneous analysis, multi-source IQ Estimate. No benchmarked competitor (DealCheck, Mashvisor, PropStream, BiggerPockets) has the negotiation layer. |
| **Pricing** | $39.99/mo sits at BiggerPockets Pro level, 2× DealCheck. Defensible only after trust/data gaps close. A ~$19–24 mid-tier is a low-effort experiment (billing plumbing already supports it). |
| **Engineering** | Production-capable foundations (auth, sessions, webhooks, migrations, 640+ tests) undermined by zero CI, monolith files (3,800-line pages, 2,900-line services), and a designed-but-unadopted refactor. |
| **Trust integrity** | The product's core promise — never fabricate data — is violated in three places (property taxes, STR ADR, STR occupancy) that feed directly into the headline verdict. |
| **Funnel** | Best-in-class anonymous activation (~2 clicks to a verdict, no account). Conversion machinery beyond that point is built but unwired: orphaned onboarding, swallowed limit errors, dead push toggles, spec-only tour, no funnel analytics. |

---

## The Five Decisions That Matter

1. **Treat Week 1 as a security and revenue-integrity sprint.** A git-tracked file contains live production session tokens (rotate and scrub immediately). The 3-analyses/month free limit is enforceable only by client honor; multiple endpoints proxy paid data APIs with no auth; some billing writes likely don't persist. Every growth dollar spent before this is fixed subsidizes free riders.

2. **Restore the "never fake data" guarantee.** Replace fabricated taxes/ADR/occupancy with explicit "Unavailable" + user input prompts, and decide the STR data source (re-enable Mashvisor at ~$18–75/mo, integrate AirDNA, or visibly disable STR). Accuracy is the product; this is non-negotiable for retention.

3. **Make the 4th analysis the conversion moment.** Server-enforced limit + visible usage countdown + designed limit-reached upgrade screen. This single loop closes the largest revenue leak and the largest conversion leak simultaneously.

4. **Connect, don't build.** Onboarding, 20+ lifecycle email templates, alert templates, push backend, tour spec, and the Phase 2 state architecture all exist and are idle. Roughly one quarter of "wiring" work yields what would normally be two quarters of feature development.

5. **Lead with the Four Paths engine.** The most defensible asset gets no marketing surface. Combined with first-party outcome capture (calibrating the verdict score against deals users actually close), it builds a moat no competitor can copy with an API contract.

---

## Profitability & Retention Mechanics

| Lever | Mechanism | Status |
|-------|-----------|--------|
| Trial → paid | 7-day full-Pro trial; trial-ending email exists | Add in-trial activation choreography (Phase 1) |
| Annual mix | $349.99/yr (27% discount) | Push in-app at high-engagement moments; target ≥35% mix |
| Churn reduction | Alerts, watchlists, pipeline, push | Alerts/push: wire existing infra (Phase 2) |
| ARPU expansion | Mid-tier + team seats experiment | Phase 3 |
| CAC reduction | Shareable Deal Gap card, programmatic per-market SEO, existing comparison pages | Phases 2–4 |
| **North star** | **Weekly Analyzing Investors** (accounts running ≥1 verdict/week) | Instrument in Phase 1 |

**Targets (12 months):** trial→paid ≥40% · monthly logo churn ≤4–6% · annual mix ≥35% · LTV:CAC ≥3:1.

---

## Risk & Compliance Review

| Area | Status | Action |
|------|--------|--------|
| **Credential leak** | Live session cookies committed to git (`backend/cookies.txt`) | Immediate: revoke, scrub history, gitignore |
| **Privacy infrastructure** | Privacy/terms/disclosures pages, account deletion endpoint + UI, HMAC unsubscribe with List-Unsubscribe headers, cookie consent banner, Sentry PII scrubbing both ends | Solid baseline |
| **GDPR/CCPA specificity** | Generic "depending on jurisdiction" language; no CCPA "Do Not Sell," no legal-basis table; portability claimed in policy but **no data-export endpoint exists** | Add export API; counsel review of California-specific language |
| **Data licensing** | RentCast/AXESSO/Redfin/Realtor data redistributed in PDFs/exports | Verify each provider's redistribution terms cover branded client reports |
| **Financial-advice exposure** | Pitch scripts for Sub2/Morby/seller-finance structures border on transaction advice | Disclaimers exist (`/disclosures`); have counsel review the Four Paths narratives specifically |
| **Payments** | Stripe signature verification enforced; RevenueCat fails closed; idempotency partial | Extend idempotency (Phase 0) |
| **Operational** | No CI; manual backups; Sentry-only monitoring; deploy-time cache flush | CI in Phase 0; automated backup verification in Phase 2 |

---

## Sequenced Investment Summary

| Phase | Window | Theme | Headline outcome |
|-------|--------|-------|------------------|
| 0 | Weeks 1–3 | Stabilize | Paywall enforced server-side; zero fabricated inputs; CI live; leak remediated |
| 1 | Weeks 4–10 | Convert | Measurable funnel; limit-reached conversion loop; onboarding wired; IRR shipped |
| 2 | Weeks 10–20 | Retain | Alerts + push live; shareable verdict card; wholesale loop complete; debt paydown at 30% capacity |
| 3 | Months 5–9 | Expand | Real STR data; mid-tier experiment; Four Paths as hero; portfolio analytics |
| 4 | Months 9–12 | Scale | Programmatic SEO; referral loop; first-party outcome data moat |

New recurring spend required: one STR data API (~$20–75/mo) and a product-analytics tool (free tier viable). Everything else is engineering time against capability that largely already exists.
