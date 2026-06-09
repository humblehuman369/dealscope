# DealGapIQ — Product Feature Audit (Code-Grounded)

**Prepared for:** DealGapIQ product leadership (Brad Geisen, Founder & CEO)
**Basis:** Direct review of the application source at `~/IQ-Data/dealscope` (frontend `src/` routes, components, hooks, pricing/entitlement constants, and directory datasets)
**Document type:** Feature inventory + competitive differentiation analysis
**Audience:** Product, UX, Sales/Marketing, onboarding/training

---

## 0. Scope, Method, and Key Corrections

This audit reads the actual codebase rather than relying on positioning copy. A few corrections to commonly repeated facts are surfaced first, because they affect pricing, marketing, and training accuracy.

- **Category.** DealGapIQ is a **real estate investment analysis platform** for everyday investors (the in-app copy targets "aspiring investors, first-time buyers, and small portfolio owners, 1–20 units"). It is not a B2B "deal intelligence / sales enablement" product; the peer set is DealCheck, Mashvisor, PropStream, Zillow, BiggerPockets. The audit is written against that real category.
- **Free tier is 3 analyses/month, not 5.** Confirmed in `constants/subscriptions.ts` (`FREE_ANALYSES_PER_MONTH = 3`) and the pricing page. Starter also caps saved properties at **3**.
- **Pro pricing is $29.17/mo billed annually ($349.99/yr) or $39.99/mo billed monthly**, with a **7-day free trial** and a "Save 27%" annual incentive — not "$29 / $39." Confirmed in `PricingContent.tsx`.
- **Mobile is Capacitor, not Expo/React Native.** The iOS/Android apps wrap the Next.js web app via Capacitor 8, with RevenueCat for in-app purchases. Confirmed in `package.json` and `capacitor.config.ts`.
- **The product is much larger than a "three-metric analyzer."** The code contains map search, a camera property scanner, a rehab estimator, full comps (sale + rental + proximity map), a Market Consensus engine, multi-source estimate selection, a Letter-of-Intent generator, a Kanban deal pipeline with per-deal tasks/contacts/documents/activity, a portfolio view, PDF reports, and a content/SEO layer. These were absent from earlier summaries.
- **User-facing metrics are three** (Income Value, Target Buy, Deal Gap). A fourth, **Income Gap**, exists in internal logic that drives the Verdict; it is not presented to users and should stay out of user-facing copy.
- **Directory record counts (from the shipped data files):** Cash Buyer Directory = **2,812** records; Hard Money Lender Directory = **484** records.

**Confidence tags used below:** **[Live]** = wired and reachable in the running app; **[Pro]** / **[Paid Pro only]** = gated per the pricing matrix; **[In codebase, unsurfaced]** = present in source but not exposed in primary navigation or the pricing matrix (verify intended status before relying on it).

---

## 1. Feature Hierarchy at a Glance

1. **Search & Discovery** — address/MLS search, camera property scanner, map search, discovery cold-landing
2. **Property Intelligence** — property details, listing/owner/tax/price history, motivated-seller & seller-motivation signals
3. **The Analysis Workflow (5 tabs)** — Discovery · Strategy · Comps · DealMaker · Estimator
4. **Valuation & Metrics Engine** — IQ Estimate (multi-source), Income Value, Target Buy, Deal Gap, Deal Score/Verdict
5. **Strategy Modeling** — six strategies with editable worksheets and 10-year proformas
6. **Comps & Market** — sale comps, rental comps, proximity map, Market Consensus, nearby-ZIP comparisons
7. **Rehab Estimator** — quick + detailed regional cost estimation
8. **Deal Maker & Negotiation** — interactive worksheet, deal structures, paths, LOI generator
9. **Exports & Reporting** — Excel proformas, strategy worksheets, PDF reports
10. **Deal Management** — pipeline Kanban, per-deal workspace (tasks/contacts/documents/activity), portfolio, saved properties, search history, side-by-side comparison
11. **Investor Directories** — Cash Buyers, Hard Money Lenders, saved contacts
12. **Accounts, Billing & Platform** — auth, subscription/entitlement, web + Capacitor mobile, theming
13. **Content & SEO surface** — blog, glossary, learn, methodology, national averages, competitor-comparison pages
14. **Admin** — internal admin console

---

## 2. Primary Feature Inventory

### 2.1 Search & Discovery

The property search modal (`SearchPropertyModal`, reachable from the global header and `/search`) offers **three entry methods**: Scan Property, Enter Address, and Map Search.

- **Global address / MLS search — [Live].** Address or MLS-number entry with autocomplete (`AddressAutocomplete`) backed by Google Address Validation (`lib/address-validation.ts`, `api/validate-address`). Non-address inputs (city, state, ZIP) gracefully redirect into Map Search with a pre-geocoded viewport. *Benefit:* one clean entry point; validation reduces bad-address errors before any analysis runs.
- **Property Scanner — [Live · mobile].** One of the three primary search methods in the search modal. On phones and the Capacitor apps, "Scan Property" opens the camera to scan a property for instant lookup/analysis and routes into the scan flow (`/?scan=true`; `components/scanner/*`, `usePropertyScan`, `useGeolocation`, `useDeviceOrientation`). On desktop it shows an info dialog explaining it's a mobile feature and directs the user to address entry. *Benefit:* a fast, field-friendly entry point — point the phone at a house and get the numbers — that desktop-bound competitors don't offer, and a strong demo hook for the mobile apps.
- **Map Search — [Live · Pro].** A full map experience (`components/map-search/*`: `MapSearchView`, `FilterPanel`, `PropertyListView`, `NeighborhoodCard`, snapshot/export utilities) using Google Maps. *Benefit:* browse and analyze listings spatially, filter by criteria, and export results — closer to PropStream-style discovery than a single-address tool.
- **Discovery cold-landing — [Live].** `DiscoveryColdLanding` handles the first-touch discovery state for users arriving without a property selected.

### 2.2 Property Intelligence — [Live]

A rich property record assembled in `components/property-details/*`, including: image gallery/lightbox, key-facts grid, listing info, location map, nearby schools, owner info, price history, tax history, value trend, property features/description, and **Motivated Seller Signals** plus a **Seller Motivation indicator** (`MotivatedSellerSignals`, `SellerMotivationIndicator`, `lib/motivatedSellerInsights.ts`).
*Benefit:* the investor sees the full context behind the numbers in one place, and gets early signal on negotiating leverage (seller motivation) that generic calculators don't surface.

### 2.3 The Analysis Workflow — five tabs — [Live]

Confirmed in `AppHeader.tsx`. The workflow tabs and their routes:

| Tab | Route | Purpose |
|---|---|---|
| **Discovery** | `/discovery` | Deal score + plain-language verdict and the three core metrics |
| **Strategy** | `/strategy` | The property modeled across the six strategies |
| **Comps** | `/price-intel` | Sale & rental comparables, proximity map, market consensus |
| **DealMaker** | `/deal-maker` | Interactive negotiation/structuring worksheet |
| **Estimator** | `/rehab` | Rehab cost estimation |

*Benefit:* a coherent left-to-right underwriting flow (screen → strategy → validate → negotiate → cost) that mirrors how investors actually work a deal.

### 2.4 Valuation & Metrics Engine — [Live]

- **IQ Estimate (multi-source) — [Live, free].** Blends Zillow (Zestimate & Rent Zestimate), RentCast (AVM & rental), Redfin, and Realtor.com, and lets the user **choose the preferred source** (`IQEstimateSelector`, `EstimatorConfidence`, `lib/iqTarget.ts`). *Benefit:* never relying on a single number; transparency builds trust.
- **Income Value, Target Buy, Deal Gap — [Live, free].** The three signature metrics, present on every property (`lib/dealGapIncomeValue.ts`, `utils/estimateIncomeValue.ts`, `hooks/useDealGap.ts`). *Benefit:* plain-language framing of "what it's worth on income," "what to pay," and "the gap" — the brand's core idea.
- **Deal Score / Verdict — [Live, free].** A scored verdict with takeaways and methodology disclosure (`iq-verdict/*`: `VerdictIQPage`, `DealScoreDisplay`, `OpportunityFactors`, `ReturnFactors`, `SweetSpotZone`, `VerdictGapGuidance`, `ScoreMethodologySheet`; internal `Income Gap` input). *Benefit:* delivers a judgment, not just a table.
- **Plain-language metric explanations — [Live, free].** Glossary-style explanations attached to metrics. *Benefit:* doubles as an education layer for newer investors.

### 2.5 Strategy Modeling — [Live]

- **Six strategies — [Live].** Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, Wholesale (`components/worksheet/{ltr,str,brrrr,flip,househack,wholesale}`, `config/strategyMetrics.ts`). Free users get **all six snapshots**; Pro unlocks the editable worksheets.
- **Editable worksheets & stress testing — [Pro].** Full recalculating worksheets with editable assumptions (`hooks/useWorksheetCalculator.ts`, `useStrWorksheetCalculator.ts`, `WorksheetShell`, `EditableField`).
- **10-year proforma projections — [Pro].** `lib/projections.ts`, `types/proforma.ts`.
- **Sensitivity analysis — [Pro].** `SensitivityAnalysis`, `ScenarioComparison`. *Benefit:* shows how returns move as rent, rate, and expense assumptions change.
- **STR specifics — [Live].** STR regulatory badge and confidence labeling (`STRRegulatoryBadge`, `STRConfidenceLabel`) — a thoughtful nod to the real risk that short-term-rental rules vary by jurisdiction.

### 2.6 Comps & Market — [Pro]

- **Sale & rental comps with adjusted valuation** (`components/sales-comps`, `components/rental-comps`, `lib/api/sale-comps.ts`, `rent-comps.ts`, `utils/comps-calculations.ts`).
- **Comps proximity map** (`CompsProximityMap`, `CompPhotosModal`).
- **Market Consensus engine** — aggregates across all data sources (`utils/marketConsensus.ts`, worksheet `consensus` module).
- **Nearby-ZIP market comparisons** and **national averages** (`/national-averages`, ACS-derived landlord-insurance dataset, BLS OEWS cost data).
*Benefit:* turns the valuation from a single estimate into a defensible, cross-checked range — the credibility layer.

### 2.7 Rehab Estimator — [Pro]

- **Quick and detailed rehab estimation with regional costs** (`RehabEstimator`, `QuickRehabEstimate`, `lib/rehabCostBook.ts`, `rehabIntelligence.ts`, `rehabBudgetSeed.ts`, `rehabPresetGenerator.ts`; budget tables in `components/budget`). *Benefit:* rehab is where flip/BRRRR deals are won or lost; regional cost intelligence makes the estimate credible instead of a guess.

### 2.8 Deal Maker & Negotiation — [Pro]

- **Interactive Deal Maker worksheet with real-time recalculation** (`UnifiedDealMaker`, `InlineDealMakerPanel`, `stores/dealMakerStore.ts`, `useDealMakerBackendCalc.ts`).
- **Deal structures & paths** — including seller-financing scenarios and multi-path options (`lib/dealStructures/*`, `iq-verdict/FourPathsPanel`, `ThreePathsPanel`, `PathOptionCard`, `lib/sellerFinancing.ts`).
- **Negotiation plan & pitch tools** (`NegotiationPlan`, `PriceLadder`, `PitchScriptModal`).
- **Letter of Intent generator (wholesale) — [Pro].** `GenerateLOIModal`. *Benefit:* this is the action bridge — it moves the user from "here's the gap" to "here's the offer/script," and is a concrete differentiator versus calculators that stop at the number.

### 2.9 Exports & Reporting — [Pro]

- **Downloadable Excel proforma & strategy-specific worksheets** via ExcelJS (`features/strategy/exportComprehensiveExcel.ts`, `components/worksheet/WorksheetExport.tsx`, `scripts/generate_proforma.py`).
- **PDF property reports** (`DownloadReportButton`, `lib/api/appraisal-report.ts`, `app/api/report`).
*Benefit:* editable Excel (not a locked PDF) is the artifact lenders and partners actually want — a sharp upgrade trigger.

### 2.10 Deal Management — [Live]

Confirmed via `dashboard/page.tsx` and `deals/[id]`:

- **Pipeline Kanban — [Live].** Drag saved properties across pre- and post-purchase stages, with clickable stage filters (`PipelineKanban`, `PipelineStats`, `lib/lifecycleStages.ts`).
- **Per-deal workspace — [Live].** Each deal at `/deals/[id]` has tabs for **Tasks, Contacts, Documents, and Activity** (`components/deal/{TasksPanel,ContactsPanel,DocumentsPanel,ActivityPanel,BudgetPanel}`, `hooks/useTasks`, `useContacts`, `useDocuments`, `useTimeline`).
- **Upcoming-tasks roll-up — [Live].** "Due this week" across all deals, linking into the deal's Tasks tab (`UpcomingTasks`).
- **Portfolio — [Live].** `/portfolio`.
- **Saved properties, search history, side-by-side comparison** (`/saved-properties`, `/search-history`, `/compare`; `useSavedProperties`, `useSearchHistory`).
*Benefit:* this is a genuine light CRM/deal-tracker layer. It is materially more than the pricing page's "pipeline + comparison" line implies, and is a retention engine — but it is under-marketed (see §5).

### 2.11 Investor Directories — [Paid Pro only]

- **Cash Buyer Directory — 2,812 records.** Fields per record include company, owner, contact (phone/email/website), coverage area, deal count, years active, response time, strategies, and buyer type (`components/buyer-directory/BuyerDirectory.tsx`, `data/buyers.json`, `lib/buyers-api.ts`). A teaser total is shown to non-Pro users (`useBuyerDirectoryTeaserTotal`).
- **Hard Money Lender Directory — 484 records.** Segmented for fix & flip, BRRRR, bridge, and DSCR, with phone/email/web contacts and lender stats (`components/lender-directory/HardMoneyDirectory.tsx`, `data/lenders.json`).
- **Save directory contacts to dashboard — [Paid Pro only].** `SaveDirectoryContactButton`, `useSavedContacts`, surfaced as `SavedContactsSection` on the dashboard.
*Note:* directories are explicitly **"Paid Pro only"** in the pricing matrix — i.e., not included during the 7-day trial. Confirm this is intended, as it changes the trial value proposition.
*Benefit:* pairing verified buyers (exit) and lenders (entry) with the analyzer is the hardest part of the product to replicate with a calculator alone.

### 2.12 Accounts, Billing & Platform — [Live]

- **Auth & account** — register, login, forgot/reset password, email verification, profile, progressive profiling, defaults editor (`components/auth/*`, `app/profile`, `components/profile/*`).
- **Subscription & entitlement** — entitlement string `DealGapIQ Pro`; web billing via **Stripe**, mobile IAP via **RevenueCat** (`hooks/useSubscription.ts`, `useRevenueCat.ts`, `ProGate`, `UpgradeModal`, `UsageBar`). Usage metering enforces the 3/month free cap.
- **Mobile** — Capacitor 8 iOS/Android wrapper of the web app, deep links and native shell hooks (`useCapacitorShell`, `useCapacitorDeepLinks`).
- **Theming** — full light/dark theme system with sky-blue accent and semantic design tokens (`context/ThemeContext`, `theme/semantic-tokens.ts`).
- **Onboarding** — guided first-run (`app/onboarding`).

### 2.13 Content & SEO Surface — [Live]

Blog, glossary (with per-term pages), learn, methodology, national averages, help, disclosures/terms/privacy, and **competitor-comparison landing pages** for `dealgapiq-vs-dealcheck`, `dealgapiq-vs-mashvisor`, and `dealgapiq-vs-propstream` (`app/comparisons/*`, `lib/seo/*`, JSON-LD schema components). *Benefit:* organic-acquisition and trust infrastructure; the comparison pages also encode the official competitive positioning (see §5).

### 2.14 Admin — [In codebase, internal]

An authenticated admin console (`app/admin`, `features/admin`). Internal tooling, not a user feature.

---

## 3. Free vs. Pro — Authoritative Matrix

Reproduced from the in-app pricing comparison (`PricingContent.tsx`), lightly condensed.

| Capability | Starter (Free) | Pro |
|---|---|---|
| Property search | ✓ | ✓ |
| Analyses / month | 3 | Unlimited |
| Discovery + Deal Score + plain-language | ✓ | ✓ |
| Income Value · Target Buy · Deal Gap | ✓ | ✓ |
| Multi-source IQ Estimates + source choice | ✓ | ✓ |
| All 6 strategy snapshots | ✓ | ✓ |
| Seller Motivation indicator | ✓ | ✓ |
| Full calculation breakdown | — | ✓ |
| Editable assumptions & stress testing | — | ✓ |
| Sensitivity analysis | — | ✓ |
| 10-year proforma | — | ✓ |
| Deal Maker worksheet | — | ✓ |
| Comps (sale/rental, adjusted) + proximity map | — | ✓ |
| Market Consensus engine | — | ✓ |
| Nearby-ZIP comparisons | — | ✓ |
| Quick Rehab Estimator | — | ✓ |
| Interactive Map Search | — | ✓ |
| Excel proforma + strategy worksheets | — | ✓ |
| PDF property reports | — | ✓ |
| LOI generator (wholesale) | — | ✓ |
| Save properties to pipeline | Up to 3 | Unlimited |
| Side-by-side deal comparison | — | ✓ |
| Search history | ✓ | ✓ |
| Cash Buyer Directory | — | Paid Pro only |
| Hard Money Lender Directory | — | Paid Pro only |
| Save directory contacts | — | Paid Pro only |

---

## 4. Data & Integration Stack (for context)

- **Valuation/listing data:** Zillow via AXESSO (`lib/api/axesso-client.ts`), RentCast, Redfin, Realtor.com; blended through the IQ Estimate and Market Consensus engine.
- **Cost/market reference data:** BLS OEWS (rehab/labor costs), ACS Census-derived landlord-insurance dataset (`data/DealGapIQ_Landlord_Insurance_Dataset.xlsx`).
- **Geo:** Google Address Validation + Google Maps (`@vis.gl/react-google-maps`).
- **Platform:** Next.js 16 / React 19, Tailwind, React Query, Zustand, Zod + react-hook-form, ExcelJS, Sentry; Stripe (web) + RevenueCat (mobile); Capacitor (iOS/Android); Vercel (web) + Railway (backend).

---

## 5. Unique Differentiators vs. the Peer Set

The repo's own comparison pages name the competitors, so positioning can be stated precisely.

### 5.1 Genuine product differentiators

- **A named, plain-language metric system (Deal Gap / Target Buy / Income Value).** Competitors express equivalent ideas as MAO, cap rate, and cash-on-cash. The **Deal Gap** — the single spread between asking price and income-supported value, across six strategies — is the memorable, ownable concept and the brand itself.
- **Verdict over spreadsheet.** A scored, plain-language judgment with disclosed methodology, versus a grid of numbers the user must interpret. For the stated audience (new and small investors), the interpretation *is* the product.
- **Camera property scanner.** "Point your phone at a house and get the numbers" is a field-native entry point most desktop-bound competitors don't offer — a strong, demo-able hook for the mobile apps.
- **Multi-source estimate with user-chosen source.** Blending Zillow/RentCast/Redfin/Realtor and letting the user pick the trusted source is more transparent than tools that quote a single AVM.
- **Analyzer + verified directories + deal workflow in one place.** Few competitors combine all three: pure analyzers (DealCheck) lack directories and CRM; data/lead tools (PropStream) lack the polished verdict and worksheets. DealGapIQ spans screen → underwrite → negotiate (LOI) → find buyer/lender → track to close.
- **Editable Excel proforma as the paid hook** (not a locked PDF) — the artifact lenders/partners actually use.
- **STR regulatory awareness** baked into the STR strategy — a small but credible signal of domain depth.

### 5.2 Positioning strengths (brand/trust, not features)

- **"Know your number before you make the offer" / numbers-over-narratives** messaging matches actual product behavior.
- **Founder data heritage** (Foreclosure.com, HomePath, HomeSteps) — a credibility asset; present it as provenance, not a feature.

### 5.3 Competitor comparison

| Capability | DealGapIQ | DealCheck | Mashvisor | PropStream | Zillow |
|---|---|---|---|---|---|
| Plain-language metric framework (Deal Gap) | **Yes (signature)** | Jargon metrics | Market metrics | Raw data | Zestimate only |
| Single scored verdict | **Yes** | Offer calc | Partial | No | No |
| Six strategies, one property | **Yes** | Several calculators | LTR vs STR focus | No | No |
| Camera property scanner | **Yes (mobile)** | No | No | No | No |
| Multi-source estimate + source choice | **Yes** | Single import | Own data | Own data | Single |
| Comps + proximity map + consensus | **Yes (Pro)** | Comps | Comps | Strong data | Basic |
| Rehab estimator (regional) | **Yes (Pro)** | Rehab calc | No | Add-ons | No |
| LOI / negotiation tooling | **Yes (Pro)** | No | No | Marketing tools | No |
| Verified buyer directory | **Yes (2,812)** | No | No | Lists (different model) | No |
| Verified lender directory | **Yes (484)** | No | No | Partial | No |
| Pipeline + per-deal tasks/docs | **Yes** | Light | Light | CRM add-ons | No |
| Editable Excel export | **Yes (Pro)** | PDF | Reports | Exports | No |
| Free entry tier | 3/mo | Yes | Limited | Limited | Free |

*Competitor columns reflect general public positioning and should be re-verified before publication.*

---

## 6. Findings & Recommendations for Leadership

- **Marketing under-sells the product.** The deal-management layer (pipeline Kanban, per-deal tasks/contacts/documents/activity, portfolio) and the LOI generator are real and reachable, yet barely appear in the pricing story. These are retention and differentiation assets — surface them.
- **Feature the camera scanner in mobile marketing.** It's a live, distinctive entry point ("scan any property for instant analysis") presented in the search modal, but it's absent from the pricing matrix and most marketing. A "point your phone at any house" capability is a strong, demo-able hook for the App Store / Play listings — lead with it there.
- **Reconcile the directory/trial rule.** Directories are "Paid Pro only" (excluded from the 7-day trial). If they are a primary reason to upgrade, gating them out of the trial may suppress conversion. Decide deliberately.
- **Fix stale external facts.** Anywhere "5 free analyses" or "$29/$39" appears in decks, scripts, or app-store copy, correct to **3/month** and **$29.17 annual ($349.99/yr) / $39.99 monthly**. Update "Expo" references to **Capacitor**.
- **Keep Income Gap internal.** It should never surface as a fourth user metric; the clean three-metric story is a strategic asset.
- **Lead with the verdict and the Deal Gap, then the bundle.** The defensible story is "a plain-language buy number and verdict, plus the comps, the rehab math, the negotiation tools, the buyers/lenders, and a place to track the deal" — not "another calculator."

---

*Audit grounded in `~/IQ-Data/dealscope` source as reviewed. Re-verify any [In codebase, ...] items and external-facing numbers before distribution.*
