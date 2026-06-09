# DealGapIQ — Comprehensive Feature Audit

**Document type:** Product feature inventory and competitive differentiation analysis  
**Scope:** Observable capabilities in the DealGapIQ codebase (web, backend API, iOS/Android via Capacitor)  
**Product category:** Residential real estate investment analysis and deal-structuring SaaS

---

## Executive Summary

DealGapIQ is a U.S. residential real estate investment platform that converts any property address into a fast financial verdict, then extends analysis into offer structures, negotiation scripts, strategy-specific modeling, comps, pipeline management, and exportable diligence artifacts. The product's architectural center of gravity is a **synthesis layer**: moving investors from "Does this pencil?" to "How do I structure and pitch this deal?"

The platform ships as a single React/Next.js application deployed to web (`dealgapiq.com`), iOS, and Android through Capacitor. Financial calculations are backend-owned; the frontend renders validated API responses and preserves trust by showing data provenance and displaying **Unavailable** rather than fabricating missing values.

### Corrections to legacy materials (read before reusing old copy)

These items have appeared incorrectly in earlier decks, scripts, or store listings and are corrected throughout this document:

- **Free tier is 3 analyses/month** (and 3 saved properties), not 5.
- **Pro pricing is $39.99/mo monthly or $349.99/yr (~$29.17/mo effective)** with a 7-day trial — not "$29 / $39."
- **Mobile is Capacitor**, not Expo/React Native.
- **Category is residential real estate investment analysis**, not "deal intelligence / sales enablement."
- **The three user-facing metrics are Income Value, Target Buy, and Deal Gap.** A separate internal value, **Income Gap**, powers the Verdict engine and is not shown to users — keep it out of user-facing copy.

---

## 1. Hierarchical Feature Inventory

### 1.1 Property Discovery & Entry

**Purpose:** Reduce time-to-first-analysis and support multiple acquisition workflows (MLS, off-market, map-based hunting).

| Sub-feature | Description | User benefit |
|---|---|---|
| Address search | Google Places autocomplete with U.S. address validation (`/search`, `SearchPropertyModal`) | Fast, validated entry from any screen |
| Map Search entry | "Search on map" with geolocation or geocoded location query | Opens discovery in a geographic context instead of typing addresses |
| Camera / Point-and-Scan | Mobile camera capture to scan a property for instant lookup (`SearchPropertyModal` → scan flow, Capacitor); desktop shows an info dialog directing to address entry | Field workflow: scan a yard sign or listing without manual entry |
| Property detail shell | `/property/[zpid]` with photos, specs, motivated-seller signals | Lightweight property context before deep analysis |
| Analyzing interstitial | `/analyzing` loading state while backend fetches multi-source data | Sets expectation for ~15–60 second analysis window |

---

### 1.2 Discovery (IQ Verdict)

**Route:** `/discovery?address=...`  
**Purpose:** Deliver a plain-English investment verdict and ranked strategy recommendations in one screen.

#### 1.2.1 Core valuation & verdict metrics

| Sub-feature | Description | User benefit |
|---|---|---|
| Multi-source property value | IQ Estimate (proprietary blend), Zillow Zestimate, RentCast AVM, Redfin, Realtor.com | Cross-check listing price against several independent signals |
| Multi-source rent estimates | IQ Estimate, Zillow RentZestimate, RentCast, Redfin, Mashvisor (per-bedroom traditional rent) | Income-side validation with selectable sources |
| IQ Estimate Selector | User picks value/rent source; math recalculates instantly client-side | Trust-first transparency — "switch source, watch math change" |
| **Income Value** | Maximum price at which the property still produces positive cash flow under a given strategy (the income ceiling) | Grounds the deal in what income supports, not asking-price hype |
| **Target Buy** | Price at which the property meets return thresholds for the active strategy | Converts valuation into an actionable offer number |
| **Deal Gap** | Percentage distance between asking/market price and **Target Buy** (List Price − Target Buy) | Single headline metric for negotiation distance and deal quality |
| Deal Score & Grade | Backend-computed score/grade | Comparable ranking signal across properties |
| Deal Gap tiers + motivating labels | Six tiers (e.g., Cash-Flow Deal → Structured Deal → Reset Deal) with motivating headline above raw gap | Reframes negative gaps as structurable opportunities without hiding math |
| Sweet Spot Zone / Gap Guidance | Visual guidance for where asking price sits vs. targets | Reduces misinterpretation of negative gaps |
| Score Methodology sheet | Explains how scores are computed | Builds credibility; supports lender/partner conversations |

*Internal note:* a separate **Income Gap** value (List Price − Income Value) drives parts of the Verdict engine. It is intentionally not surfaced as a fourth user metric — the clean three-metric story (Income Value, Target Buy, Deal Gap) is a strategic asset.

#### 1.2.2 Strategy intelligence (Discovery-level)

| Sub-feature | Description | User benefit |
|---|---|---|
| Six strategy snapshots | LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale — ranked 0–100 with badges | Answers "Which strategy fits this property?" without running six spreadsheets |
| Opportunity & Return Factors | Structured positive/negative factor lists | Surfaces *why* a strategy ranked as it did |
| Seller Motivation indicator | Motivated-seller insights from listing/property signals | Negotiation leverage context at verdict time |
| Property photo gallery | Listing photos + Street View fallback | Visual confirmation without leaving the workflow |
| Save property | Persist deal to pipeline with snapshot metrics | Bridges analysis → portfolio workflow |
| Cold landing state | `DiscoveryColdLanding` when no address provided | Onboards new users into first search |

#### 1.2.3 Four Paths (offer structures)

**Purpose:** Turn a marginal or negative-gap property into pre-computed alternative deal structures — the product's primary differentiation.

| Sub-feature | Description | User benefit |
|---|---|---|
| Four Paths panel | Three single-lever paths + one Blended Plan | Always shows a path forward; avoids "dead deal" dead ends |
| Template library (backend) | Rent uplift, price negotiation, seller 0% 2nd/balloon, Sub-To, rate buydown, larger down payment, assumable mortgage, FHA house-hack, Morby Method, blended combination | Covers price, capital, financing, income, and strategy-switch levers |
| Honest gating | Templates return null when math cannot close the gap | Prevents weak or misleading structures |
| Listing-signal calibration | Regional calibration, dismissed-family penalty | Structures adapt to DOM, market, and user preferences |
| Path option cards | Monthly savings, lever summary, family taxonomy | Scannable comparison of structures |
| Dismiss / reset families | User can dismiss structure families; persisted in localStorage | Personalizes repeated analysis without breaking diversity rules |
| Open in Strategy | URL-based scenario handoff pre-loads chosen path's levers | Seamless verdict → deep modeling |
| Deal Structures narrative | Plain-English explanation of recommended structures | Accessible to investors who know terms but struggle to apply them |

#### 1.2.4 Negotiation Playbook

| Sub-feature | Description | User benefit |
|---|---|---|
| Pitch Script modal | Per-structure script: who to call, frame, opener, pitch, seller WIIFM, trial close | Closes the "I freeze on the phone" gap |
| Print / email / copy | Export script for meetings | Field-ready artifact for seller conversations |
| Structured script parsing | Section headings vs. body for readable layout | Professional presentation of generated scripts |

---

### 1.3 Strategy Analysis (Financial Deep-Dive)

**Route:** `/strategy?address=...`  
**Purpose:** Full pro-forma, benchmarks, and scenario modeling after Discovery flags a property worth investigating.

| Sub-feature | Description | User benefit |
|---|---|---|
| Six strategy pro-formas | Dedicated calculators per strategy (backend) | Strategy-accurate P&L instead of one-size-fits-all cash flow |
| Key metrics bar | Cash flow, NOI, cap rate, CoC, DSCR, GRM, etc. | Lender-grade summary metrics |
| 10-year projections | Long-horizon financial projections (Pro) | Hold/refi/exit planning |
| Sensitivity analysis | Stress tests for rent, vacancy, rates (Pro) | Risk awareness before offer |
| Market benchmarks | Local/national comparison context | Contextualizes whether metrics are strong or weak for the market |
| Data quality indicators | Surfaces completeness of underlying inputs | Reduces false confidence on thin data |
| Four Paths integration on Strategy | "Options" row applies structure templates per active strategy | Connects structure recommendations to full worksheet math |
| Scenario payload handoff | Path highlight fields | Visual continuity from chosen Four Path into editable model |
| Strategy selector dropdown | Color-coded strategy switcher | Low-noise navigation across six models |
| Save strategy worksheet | Persist strategy assumptions to saved property | Continuity across sessions |
| Strategy landing pages | SEO guides at `/strategies/*` | Education + acquisition for strategy-specific personas |

**Strategy-specific worksheets** (`/worksheet/[id]/[strategy]`):

| Strategy | Notable modeled outputs |
|---|---|
| Long-Term Rental | Operating expense breakdown, KPI row, buy-and-hold projections |
| Short-Term Rental | ADR/occupancy/Mashvisor revenue, STR-specific expenses |
| BRRRR | Refi timeline, equity capture, recycle capital math |
| Fix & Flip | ARV, rehab, holding costs, profit/ROI |
| House Hack | FHA scenarios, owner vs. tenant unit economics |
| Wholesale | Assignment fee, MAO, viability grading |

---

### 1.4 Deal Maker (Interactive Worksheet)

**Route:** `/deal-maker/[address]`  
**Purpose:** Real-time assumption editing with backend-recalculated metrics — the "Excel replacement" layer.

| Sub-feature | Description | User benefit |
|---|---|---|
| Strategy-specific state | Separate Deal Maker models for all six strategies | Accurate inputs per investment type |
| Accordion input sections | Buy price, financing, rehab, income, expenses | Organized editing without spreadsheet tabs |
| Interactive sliders | DealMakerSlider, SliderInput | Fast what-if tuning |
| Key metrics header | Buy price, cash needed, deal gap, annual profit, cap rate, CoC | At-a-glance deal health while editing |
| Backend calculation hook | useDealMakerBackendCalc — no client-side financial math | Single source of truth, consistent with Discovery/Strategy |
| DealMakerRecord persistence | Saved properties load/store via useDealSnapshot + optimistic PATCH | Assumptions survive across devices/sessions |
| Optimistic rollback | Failed saves revert with retry toast | Reliable editing under network friction |
| Rehab budget banner | Links estimator output into Deal Maker rehab fields | Closed loop: estimate → model → track |
| Excel export | exportDealMakerExcel, strategy-specific comprehensive export | Offline sharing, custom lender packages |
| Score badge | Visual deal quality indicator on worksheet | Quick validation while tuning |

---

### 1.5 Comps & Market Intelligence (Price Intel)

**Route:** `/price-intel?address=...&view=sale|rent`  
**Purpose:** Validate underwriting with professional sale and rental comparables.

| Sub-feature | Description | User benefit |
|---|---|---|
| Sale comps tab | Paginated sale comparables with exclusion controls | Evidence-based ARV/value support |
| Rent comps tab | Rental comparables for income verification | Supports rent-uplift negotiation paths |
| Dual valuation panel | Zestimate + ARV (sale) or RentCast + improved rent (rent) | Multiple valuation lenses on one screen |
| Weighted hybrid appraisal | calculateAppraisalValues, adjustment grid | Investor-facing comp synthesis |
| Adjustment breakdown | Expandable per-comp adjustments (size, beds, condition, etc.) | Auditable comp math |
| Manual override + lock | User can override comp weights/values | Handles edge cases the algorithm misses |
| Comps proximity map | Geographic comp visualization | Spatial confidence in comp selection |
| Selective comp refresh | Per-comp and bulk refresh of unselected comps | Efficient re-analysis |
| Market Consensus engine | buildSalesConsensus, buildRentalConsensus | Aggregated market signal rail |
| Appraisal report PDF | Downloadable comp report | Shareable diligence artifact |
| Apply to Deal | Push comp-derived values into saved property / Deal Maker | Eliminates re-entry |
| Comp photos modal | Photo review for individual comps | Visual comp verification |

---

### 1.6 Rehab Estimator & Budget Tracking

**Routes:** `/rehab`, deal workflow Budget tab, `/budget/[id]`

| Sub-feature | Description | User benefit |
|---|---|---|
| Quick Rehab Estimator | Property-driven presets using sqft, year built, ARV, ZIP | Fast rehab budget for flips/BRRRR without contractor quotes |
| Regional cost context | ZIP-level cost multipliers from API | Localized estimates vs. national averages |
| Preset tiers | Cosmetic / moderate / full gut style presets | Matches investor rehab vocabulary |
| Seed budget to saved property | POST budget seed links estimator → pipeline deal | One-click transition from estimate to tracking |
| Budget vs. Actual board | Analysis, budgeted, to-date, projected, variance by category | Active project cost control |
| Expense entry + receipt upload | Manual expenses with AI receipt parsing | Field expense logging with less admin |
| % complete per line | Progress tracking on budget lines | Rehab timeline visibility |
| Sync to Deal Maker | Budget updates can patch Deal Maker rehab assumptions | Model stays aligned with actual spend |

---

### 1.7 Map Search (Interactive Listing Discovery)

**Route:** `/map-search` (Pro-gated)

| Sub-feature | Description | User benefit |
|---|---|---|
| Google Maps canvas | Pan/zoom with advanced markers | Visual property hunting |
| Deal signal color coding | Markers colored by deal category | Prioritize map clicks by investment signal |
| Filter panel | Property type, price, beds/baths, listing type/status, owner tenure, occupancy | Target motivated sellers and specific inventory |
| Owner leads filters | Owner tenure + occupancy filters (RentCast-backed) | Off-market / long-hold owner targeting |
| Property preview card | Quick stats before full analysis | Faster map → verdict loop |
| List view toggle | Tabular alternative to map markers | Spreadsheet-minded scanning |
| Neighborhood card | ZIP/neighborhood overview on map | Market context while browsing |
| Off-market geocoded prompt | Analyze non-listed addresses clicked on map | Supports wholesaling and driving-for-dollars |
| CSV / Excel export | Export visible listings | CRM/spreadsheet workflows |
| Viewport snapshot restore | Session persistence of map position | Resume hunting without losing context |
| Map/list theme override | Independent light/dark map chrome | Usability in varying light conditions |

---

### 1.8 Pipeline, Deal Management & Collaboration

**Routes:** `/dashboard`, `/saved-properties`, `/deals/[id]`, `/compare`

| Sub-feature | Description | User benefit |
|---|---|---|
| Pipeline kanban | Stages: Analyzing → Pursuing → Negotiating → Under Contract → Owned | Visual deal flow management |
| Drag-and-drop status updates | PATCH saved property status | Low-friction CRM-like updates |
| Pipeline stats | Clickable stage filters on dashboard | Funnel visibility |
| Continue workflow banner | Resume last property / Deal Maker session | Reduces drop-off between sessions |
| Upcoming tasks widget | Cross-property task roll-up | Operational awareness |
| Saved contacts section | Directory contacts saved to dashboard | Centralizes buyer/lender relationships |
| Deal workflow page | Tabbed hub: Overview, Tasks, Budget, Documents, Contacts, Activity | Single property command center |
| Tasks panel | Task templates, due dates, completion | Execution tracking post-analysis |
| Documents panel | File upload/storage per deal | Due diligence organization |
| Contacts panel | Deal-specific contact associations | Links people to properties |
| Activity / timeline | Audit-style event stream | History for partners and self-review |
| Flip stage tracking | Post-acquisition flip lifecycle stages + sold price | Fix-and-flip operational tracking |
| Side-by-side deal comparison | `/compare` — multiple saved properties (Pro) | Portfolio-level prioritization |
| Deal report (print-to-PDF) | `/deals/[id]/report` — printable final profit statement | Close-out documentation |
| Search history | `/search-history` — past property lookups | Recall prior research |

---

### 1.9 Investor Directories (Pro, paid-active)

**Routes:** `/directory` (cash buyers), `/lenders` (hard money)

| Sub-feature | Description | User benefit |
|---|---|---|
| Cash Buyer Directory | ~2,800+ verified investor contacts by market (live count from `/api/buyers/stats`; marketing fallback when unavailable) | Wholesale exit strategy support |
| Hard Money Lender Directory | 484 verified lenders — fix & flip, BRRRR, bridge, DSCR products (`lenders.json`) | Financing partner discovery |
| Save directory contacts | Persist to dashboard saved contacts | Reusable rolodex inside platform |
| Non-Pro teaser | Total buyer count shown to free users to drive upgrade (`useBuyerDirectoryTeaserTotal`) | Conversion hook |

*Gating note:* directories require **paid Pro** (`isPaidPro`) — excluded from the 7-day trial. Trial users retain other Pro trial features but not directory contacts.

---

### 1.10 Export, Reporting & Wholesale Tools

| Sub-feature | Description | User benefit |
|---|---|---|
| PDF property reports | Strategy worksheets, property reports (Pro) | Lender/partner-ready packages |
| Excel proforma download | Full financial proforma export | Spreadsheet-compatible diligence |
| Strategy-specific Excel worksheets | Per-strategy export formats (LTR, STR, BRRRR, etc.) | Matches how investors actually model |
| Letter of Intent generator | Wholesale LOI with buyer/seller/terms blocks | Speeds contract-ready wholesale offers |
| Appraisal/comp PDF | From Price Intel comp workflow | Third-party validation artifact |
| Map listing export | CSV/Excel from map search | Lead list extraction |

---

### 1.11 Account, Authentication & Monetization

| Sub-feature | Description | User benefit |
|---|---|---|
| Email registration / login | Standard auth with verify-email flow | Account persistence |
| Password reset | Forgot/reset password pages | Self-service recovery |
| Onboarding wizard | Experience, strategies, financing, goals, markets | Personalized defaults and faster time-to-value |
| Profile — Account | Name, avatar, contact info | Identity management |
| Profile — Business | Business entity details for LOI/report headers | Professional outbound documents |
| Profile — Investor | Strategy/market preferences | Tailored product experience |
| Profile — Preferences | Notifications and app preferences | User control |
| Billing page | Plan management, upgrade paths | Self-serve subscription |
| Stripe checkout (web) | Pro monthly ($39.99) / annual ($349.99, ~$29.17/mo effective) | Web monetization |
| RevenueCat IAP (iOS/Android) | Native in-app purchases via Capacitor; entitlement `DealGapIQ Pro` | Mobile monetization |
| 7-day Pro trial | Documented on pricing page | Low-risk upgrade path |
| Usage limits (Starter) | 3 analyses/month, 3 saved properties, 50 API calls/month | Free tier for acquisition |
| ProGate component | Inline/section/modal gating for Pro features | Clear upgrade prompts at point of need |

---

### 1.12 Admin & Platform Configuration

**Route:** `/admin` (admin role required)

| Sub-feature | Description | User benefit |
|---|---|---|
| Platform stats overview | Usage and health metrics | Operator visibility |
| Default assumptions editor | Global operating/financing defaults | Central control of model behavior |
| Metrics formula glossary | Documents every computed metric | Internal alignment + support reference |
| User management | Grant/revoke Pro, view tiers | Support and beta access control |

---

### 1.13 Educational, SEO & Trust Content

| Sub-feature | Description | User benefit |
|---|---|---|
| Methodology page | IQ Estimate blending, Deal Gap math, explicit non-modeling boundaries | Transparency builds trust |
| National Averages reference | 8 metric definitions with national benchmarks | Investor education |
| Creative finance glossary | Per-term SEO pages | Acquisition + education compound |
| Blog | Deal teardowns, structure explainers | Content marketing |
| Strategy guides | Six `/strategies/*` landing pages | Persona-targeted entry |
| Competitor comparison pages | vs. DealCheck, Mashvisor, PropStream | Conversion support |
| Learn hub / site map | `/learn` index of public pages | Navigation for new users |
| Help, About, Disclosures, Privacy, Terms | Legal and support surfaces | Compliance and trust |
| Find Attorney | Adjacent resource (not legal advice) | Adjacent resource link |

---

### 1.14 Mobile & Cross-Platform Delivery

| Sub-feature | Description | User benefit |
|---|---|---|
| Capacitor iOS/Android apps | Same React app in native WebView | One codebase, three surfaces |
| Deep link handling | useCapacitorDeepLinks | Marketing links open directly in app |
| Native shell UX | Status bar, splash, external link handling | Polished mobile experience |
| Camera scan on mobile | Primary entry on phone vs. address entry on desktop | Field-acquisition workflow |
| Push notification infrastructure | Backend push_notification_service, device registration | Re-engagement (infrastructure present) |

---

### 1.15 Analysis Workflow Navigation

The authenticated analysis shell exposes five primary tabs (AppHeader):

1. **Discovery** — verdict  
2. **Strategy** — deep-dive  
3. **Comps** — price intel  
4. **DealMaker** — interactive worksheet  
5. **Estimator** — rehab  

This tab bar appears only on analysis workflow routes, keeping marketing/dashboard pages uncluttered.

---

## 2. Subscription Tier Matrix (Observable)

| Capability | Starter (Free) | Pro |
|---|:---:|:---:|
| Property search | Yes | Yes |
| Analyses per month | 3 | Unlimited |
| Discovery + deal score + Deal Gap | Yes | Yes |
| Income Value · Target Buy · Deal Gap | Yes | Yes |
| Four Paths + pitch scripts on Discovery | Yes | Yes |
| Multi-source IQ estimates + source selector | Yes | Yes |
| Six strategy snapshots | Yes | Yes |
| Seller Motivation indicator | Yes | Yes |
| Full calculation breakdown | No | Yes |
| Editable assumptions + sensitivity | No | Yes |
| 10-year projections | No | Yes |
| Deal Maker worksheet | No | Yes |
| Comps (sale + rent) + proximity map | No | Yes |
| Market Consensus engine | No | Yes |
| Rehab Estimator + regional costs | No | Yes |
| Map Search | No | Yes |
| Excel/PDF exports + LOI | No | Yes |
| Saved properties | Up to 3 | Unlimited |
| Side-by-side comparison | No | Yes |
| Buyer/Lender directories | No | Paid Pro only |
| Search history | Yes | Yes |

*Sources: `PricingContent.tsx` comparison table; `TIER_LIMITS` in `backend/app/models/subscription.py`; `FREE_ANALYSES_PER_MONTH` in `frontend/src/constants/subscriptions.ts`.*

*Enforcement note:* this matrix reflects published pricing policy. UI gating uses a mix of `ProGate`, `AuthGate` (sign-in only), and backend usage limits — not every Pro-marketed feature is wrapped in `ProGate`. Verify before legal or commercial commitments.

---

## 3. Unique Differentiators vs. Typical Competitor Offerings

### 3.1 The synthesis layer (primary moat)

Most tools in this category stop at **finding** properties (listing portals) or **confirming** cash-flow math (investor calculators). DealGapIQ extends the workflow:

Address → Verdict → Four Paths → Pitch Script → Strategy/Deal Maker → Comps → Pipeline → Export

**Competitor typical stop point:** "Cap rate is 4.2% — pass."  
**DealGapIQ continuation:** "Here are four ways to close the gap, the phone script for each, and a pre-loaded worksheet to refine the structure."

This is implemented end-to-end: backend deal_structures engine → FourPathsPanel → PitchScriptModal → Strategy scenario handoff → DealMakerRecord persistence.

---

### 3.2 Four Paths + Blended Plan (category-defining)

| Capability | Listing sites | Investor calculators | DealGapIQ |
|---|:---:|:---:|:---:|
| Multi-source valuation | Partial | Partial | Yes |
| Deal Gap verdict | — | Partial | Yes |
| Pre-built offer structures (4/property) | — | — | Yes |
| Creative finance modeling | — | — | Yes |
| Per-structure negotiation script | — | — | Yes |
| Blended multi-lever plan | — | — | Yes |

The **Blended Plan** specifically models real-world negotiation (several small concessions vs. one large price cut) — not observed in standard calculator products.

---

### 3.3 Trust-first data architecture

| Differentiator | Mechanism | Why it matters |
|---|---|---|
| No fabricated data | Missing API fields → null → UI "Unavailable" | Avoids false precision common in demo calculators |
| IQ Estimate transparency | Median ± 20% outlier filtering when 3+ sources; single-source fallback | Defensible blended estimate |
| Selectable sources with instant recalc | IQEstimateSelector on Discovery + Strategy | User sees provenance, not black box |
| Backend-owned math | Discovery, Strategy, Deal Maker call API calculators | Eliminates client/server drift |
| Methodology publication | Public /methodology page | Supports "show the work" positioning |

---

### 3.4 Structure-aware negotiation enablement

| Differentiator | Evidence |
|---|---|
| Pitch scripts generated per structure | PitchScriptModal with print/email/copy |
| Seller Motivation at verdict | Listing signal analysis + map-search motivated seller filters |
| Plain-English narrative | Structure copy readable at ~5th-grade level |
| Open in Strategy with highlighted levers | Path → worksheet continuity |

Typical competitors provide education *about* Subject-To; DealGapIQ generates **property-specific** scripts and pre-loaded financial scenarios.

---

### 3.5 Six-strategy unified platform

| Differentiator | Benefit |
|---|---|
| Single property analyzed across LTR, STR, BRRRR, Flip, House Hack, Wholesale simultaneously | Eliminates six separate spreadsheets/tools |
| Strategy-specific Deal Maker + worksheet exports | Depth without switching products |
| Wholesale LOI generator | Extends through contract-ready artifact — rare in analysis-only tools |

---

### 3.6 Operational loop (analysis → execution)

Many calculators end at the report. DealGapIQ includes:

- Pipeline kanban with lifecycle stages  
- Per-deal tasks, documents, contacts, activity  
- Rehab budget seeding + receipt parsing + variance tracking  
- Flip stage tracking post-acquisition  
- Investor directory (~2,800+ cash buyers) and lender directory (484 hard money lenders) for exit/finance partners  

This moves the product toward **deal execution infrastructure**, not just analysis.

---

### 3.7 Distribution model differentiation

| Surface | Approach |
|---|---|
| Web | Free verdict as conversion event; Stripe Pro |
| iOS/Android | Same app via Capacitor; RevenueCat IAP |
| SEO/content | Glossary + strategy guides + methodology |
| Map Search + owner-lead filters | Pro-gated hunting tools vs. free verdict hook |

---

## 4. Feature Comparison Matrix (Selected Categories)

| Feature area | Zillow / Redfin | DealCheck / BP Calc | Mashvisor | PropStream / data tools | DealGapIQ |
|---|:---:|:---:|:---:|:---:|:---:|
| Find/list properties | Yes | — | Partial | Yes | Partial (map search) |
| Multi-source AVM/rent | Partial | Partial | Yes | Partial | Yes (IQ + 5 sources) |
| 6-strategy modeling | — | Partial | Partial | — | Yes |
| Deal Gap / target prices | — | Partial | Partial | — | Yes |
| Offer structure engine | — | — | — | — | Yes (Four Paths) |
| Negotiation scripts | — | — | — | — | Yes |
| Creative finance templates | — | — | — | — | Yes |
| Professional comps + appraisal PDF | — | Partial | Partial | Yes | Yes (Pro) |
| Pipeline + rehab budget tracking | — | — | — | Partial | Yes |
| Wholesale LOI | — | — | — | — | Yes (Pro) |
| Mobile camera entry | — | — | — | — | Yes |

*Partial = some capability exists but not at the same depth or synthesis level.*

---

## 5. Explicit Product Boundaries (Documented, Not Speculative)

These are **observable out-of-scope statements** from product docs:

- **Not financial, legal, or investment advice** — analysis only  
- **Wraparound mortgages and land contracts** — not modeled (deferred pending legal review)  
- **Does not claim every property is a deal** — emphasizes structure over price tag  
- **No syndication/REIT/passive investing tooling**  
- **Admin assumptions and regional defaults** — global formulas, not per-user bespoke models for free tier  

---

## 6. Strategic Observations for Product Leadership

1. **Highest defensible value** sits in the Discovery → Four Paths → Pitch Script chain. Marketing, onboarding, and Pro gates should consistently reinforce this sequence.  
2. **Free tier is deliberately generous on verdict + strategy snapshots** to drive acquisition; Pro monetizes depth (Deal Maker, comps, exports, map hunt, directories).  
3. **Pipeline + rehab tracking** differentiates against pure calculators but is secondary to the synthesis layer in positioning.  
4. **Trust architecture** (source selector, Unavailable states, methodology page) is a feature, not polish — it supports conversion with skeptical investors.  
5. **Mobile camera + Capacitor** align with field-acquisition personas (wholesalers, driving-for-dollars) but the core moat is structure + scripts, not scan novelty alone.
6. **Fix stale external facts before reuse.** Correct any "5 free analyses," "$29/$39," or "Expo" references in decks, scripts, and store listings to 3/month, $39.99 monthly / $349.99 annual (~$29.17/mo), and Capacitor.
7. **Keep Income Gap internal.** Present only Income Value, Target Buy, and Deal Gap to users; do not conflate Deal Gap with Income Value or Income Gap in user-facing copy.

---

*This audit reflects codebase and internal documentation as of the current repository state. Feature availability may vary by subscription status, environment configuration (Stripe/RevenueCat keys), and data partner availability.*
