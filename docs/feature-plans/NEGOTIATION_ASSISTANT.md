# Negotiation Assistant — Feature Plan

A self-contained plan for evolving the **Four Paths** offer-presentation modal into an interactive **Negotiation Assistant** that scaffolds the user through a real seller call: pre-call prep → live-call companion → counter-offer triage → re-pitch → outcome capture.

> **Relationship to FOUR_PATHS:** Four Paths solved *"what offer should I make on this property?"* It is shipped (105 backend tests, 9 templates). The next user freeze is *"the seller pushed back — what now?"* This document specifies the system that solves that freeze. It builds on the existing engine, selector, and `PitchScriptModal`; it does not replace them.

> **Implementation status (2026-05-07):** N1 (pre-call checklist), N5 (24-hour recap email), and N6 (telemetry) shipped as the [ACTIVATION_ARC.md](./ACTIVATION_ARC.md) Phase 5 slice. N2 (live-call companion), N3 (counter-offer triage), and N4 (re-pitch endpoint) remain deferred until P5 engagement data justifies them. The detailed N2/N3/N4 design below is preserved as the shape of that future work.

---

## 0. Status snapshot

| Item | Status |
|---|---|
| FOUR_PATHS engine, selector, templates | ✅ shipped (see [FOUR_PATHS.md](./FOUR_PATHS.md)) |
| `PitchScriptModal` (one-shot script viewer) | ✅ shipped — [PitchScriptModal.tsx](../../frontend/src/components/iq-verdict/PitchScriptModal.tsx) |
| Negotiation Assistant (this plan) | 📝 planning — no tickets started |

Reference inputs synthesized for this plan:
- *Mastering the Art of the Deal: Advanced Negotiation Frameworks & Scripts* (PDF)
- *Residential Real Estate Investor Negotiation Framework* (DOCX)
- *real_estate_negotiation_wide_research.csv*

---

## 1. Strategic context

### 1.1 What the user actually does today

The shipped flow ends at: *"Click 'How to pitch this' → modal opens with script → user copies, prints, or emails it to themselves."* The script is a static, 2–4 page playbook. After that, the product goes silent. The user must:

- Make the call cold, with no live prompter.
- Improvise when the seller objects (every reference document confirms the seller will object).
- Decide on their own whether to abandon, hold, or pivot to a different structure.
- Re-derive a new offer manually if the original is rejected.
- Remember to follow up (the framework explicitly cites the 24-hour written recap as the highest-leverage post-call habit).

For DealGapIQ's primary audience — per `user_foreclosure_com_audience.md`, ~60% are curious/aspiring investors with a 3-month median tenure — this is exactly the freeze point Brad's bridge-positioning thesis targets. They have an analyzed property and a script. They've never run a creative-finance call before. Without scaffolding past the script, the path the engine engineered for them dies on the first objection.

### 1.2 What the reference documents converge on

All three references — written independently — converge on the same architecture. We did not have to choose between competing schools; the field has settled.

**Six-phase call architecture** (DOCX §7, restated in PDF §6.2 as the "preparation checklist"):

1. **Permission** — "Would it be okay if I asked a few questions before we discuss price?"
2. **Diagnosis** — Map four dimensions: timeline urgency, equity position, emotional attachment, post-sale needs (PDF §1.1, Brad Smotherman).
3. **Summary / mirroring** — "It sounds like speed matters more than the last few thousand dollars. Is that fair?"
4. **Offer frame** — Anchor on math, not opinion. Present three options, not one ultimatum (PDF §1.3, the Three-Offer Method).
5. **Silence** — After the offer, count to seven. Do not justify, soften, or explain (PDF §4.3, derived from Voss).
6. **Next step** — Convert interest into a concrete action (written offer, attorney intro, follow-up call).

**Universal objection matrix** (DOCX §9, PDF §4.2 Aikido method): every common seller pushback maps to one of seven categories with a pre-written calibrated response. The investor does not argue; they *redirect with a question.*

**Price–terms tradeoff** (DOCX §4, PDF §3, CSV row 3): "If you need cash, the price drops. If you need price, the terms have to support it." This is the single most-cited move and is the literal reason the existing **Blended Plan** (Path 4) exists in the engine — the engine already models the tradeoff numerically. Today, the user has to translate that into negotiation language alone.

**Influencer-attributed methods we should name in copy** (because users recognize and trust them):

| Method | Source | Status in DealGapIQ |
|---|---|---|
| Sub2 / Morby Method | Pace Morby | ✅ already a template (T3a, T10) |
| Three-Offer / Multi-option | Brad Smotherman, Casey Mericle | ✅ this is what FourPathsPanel already does |
| Tactical empathy, mirroring, calibrated questions, Ackerman ladder | Chris Voss, *Never Split the Difference* | ❌ not yet in product |
| Aikido objection method | Commercial RE training, residential adoption | ❌ not yet in product |
| 24-hour written recap | Multiple mentor curricula | ❌ not yet in product |

The competitive moat sharpens here. No competitor — Attom, Datatree, Redfin, Zillow, BiggerPockets calculators, even creative-finance specialist tools — currently offers an in-product, property-specific negotiation companion. They stop at "here is data" or "here is a calculator." DealGapIQ already crossed that line with Four Paths; the Negotiation Assistant is the natural second-mover advantage in the same direction.

### 1.3 Positioning constraint

Per `user_competitive_positioning_playbook.md` and `project_dealgapiq_bridge_positioning.md`: this is the **execution layer** between the dream (influencers) and the inventory (the property). The product framing must reinforce that. The Negotiation Assistant is **not** "AI that negotiates for you." It is "the prompter that turns your analysis into a real call." Important boundary because:

- Both reference documents repeatedly flag legal/ethical guardrails — no false urgency, no inflated estimates, no foreclosure-rescue claims, attorney review for any creative structure.
- The audience is largely first-time creative-finance buyers; over-claiming AI capability would attract bad-actor users and create regulatory exposure.
- The honest framing ("we prepare you, you make the call") is *more* differentiated than the dishonest one.

---

## 2. Workflow design

### 2.1 Five stages

```
                      ┌─────────────────────────────────────────────────┐
                      │  Verdict page (existing)                        │
                      │  → motivating label, accurate Deal Gap %        │
                      │  → FourPathsPanel renders 3 + Blended           │
                      └─────────────────────────────────────────────────┘
                                          │
                          user clicks "How to pitch this"
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  STAGE 1 — Pre-call prep  (extends existing PitchScriptModal)           │
   │  • Existing static script: copy / print / email                         │
   │  • NEW: "Pre-call checklist" — BATNA, walk-away price (auto-filled),    │
   │    diagnosis questions, silence reminder, attorney disclaimer           │
   │  • NEW: "Start call mode" CTA                                           │
   └─────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  STAGE 2 — Live-call companion  (NEW — mobile-first)                    │
   │  • Step-by-step prompter through the six phases                         │
   │  • Quick-tap signal capture: timeline?  equity?  loan rate?  motivation?│
   │  • Visible 7-second silence timer after offer-delivery step             │
   │  • Aikido-style "if seller says X, try Y" inline cards                  │
   └─────────────────────────────────────────────────────────────────────────┘
                                          │
                              seller pushes back
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  STAGE 3 — Counter-offer triage  (NEW)                                  │
   │  Decision tree, 7 categories from the Aikido matrix:                    │
   │    • "Offer too low"                                                    │
   │    • "I need all cash"                                                  │
   │    • "I have another offer"                                             │
   │    • "I'll wait for a better one"                                       │
   │    • "I don't want to be a bank"                                        │
   │    • "I don't trust Sub2 / subject-to"                                  │
   │    • "Custom — type what they said"                                     │
   │  Each → calibrated response script + decision: HOLD or PIVOT            │
   └─────────────────────────────────────────────────────────────────────────┘
                                          │
                              user picks PIVOT
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  STAGE 4 — Re-pitch / restructure  (NEW)                                │
   │  • Engine re-runs with constraints from Stage 2/3 signals               │
   │    e.g. "seller needs ≥$X cash at closing" → re-rank Hybrid above Terms │
   │  • Returns alternative path with a NEW pitch script                     │
   │  • Surfaces price–terms tradeoff explicitly:                            │
   │    "We can hold your price at $410K if you carry $40K at 5% for 5 yrs"  │
   └─────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  STAGE 5 — Outcome capture & follow-up  (NEW)                           │
   │  • Logs: dead / in-play / under contract                                │
   │  • For "in-play": auto-drafts the 24-hour written recap email           │
   │  • For "dead today": schedules a 30/60/90-day follow-up reminder        │
   │  • Updates property's deal record so re-analyzing later picks up where  │
   │    the negotiation left off                                             │
   └─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Tactic → trigger map

This is the table that drives the Stage 2 / Stage 3 implementation. Every row is a documented tactic from the references; the trigger column says when the assistant surfaces it.

| Tactic | Source | Trigger | UI surface |
|---|---|---|---|
| Permission opener | DOCX §7 | First prompter step | Inline: *"Open with — 'Would it be okay if I asked a few questions before we discuss price?'"* |
| Four-dimension diagnosis | PDF §1.1 (Smotherman) | Diagnosis step | Four chip-buttons: timeline / equity / attachment / post-sale needs — each with 1–2 calibrated questions |
| Mirroring (last 1–3 words) | PDF §1.2 (Voss) | Stage 3, any objection | Auto-suggest: *"They said 'too low' → mirror: 'Too low?' Then wait."* |
| Calibrated questions | PDF §1.2 (Voss) | Stage 3, "won't budge" | Pre-written: *"What's the biggest challenge you're facing with the sale right now?"* |
| Ackerman 65/85/95/100 ladder | PDF §1.2 (Voss) | Cash-path Stage 1 only | Engine generates 4-step ladder from walk-away price; user reads each rung in turn |
| Three-Offer presentation | PDF §1.3 (Smotherman) | Already implemented | Surface a tooltip in Stage 1: *"This panel is the 'Three-Offer Method' — sellers self-select the option that works for you."* |
| 7-second silence | PDF §4.3 (Voss) | After offer-delivery step | On-screen 7-second countdown with text *"Do not talk. Let them respond first."* |
| Non-round anchor numbers | PDF §5.6 (Lesix) | Re-pitch generation | Engine rounds to non-round (e.g., $437,500 not $440,000) — change in `formatting.py` |
| Loss aversion / cost-of-waiting | PDF §2.3 step 4 | "I'll wait" objection | Generates monthly carry cost from property data: *"Every month at the current price costs them ~$X — share this."* |
| Price–terms tradeoff | DOCX §4, CSV row 3 | "Too low" or "need cash" objection | Auto-pivots to Hybrid path; surfaces side-by-side: *"$385K cash OR $410K with seller carry"* |
| Two-Company framing | PDF §3.4 | "I need all cash" objection | Pre-written script that re-frames cash-vs-terms as a seller choice, not an objection |
| Aikido response matrix | PDF §4.2 | Every objection category | Pre-written redirect questions per objection type |
| 24-hour written recap | DOCX §11, PDF §6.3 | Stage 5, outcome=in-play | Auto-drafts an email summarizing what was agreed, what's open, attorney intro, next step |
| BATNA discipline / walk-away | DOCX §1, PDF §6.2 | Stage 1 checklist | Pre-fills walk-away price from `target_buy_price`; user confirms in writing before starting Stage 2 |

### 2.3 Sample dialogue — counter-offer handling end-to-end

Property: $410K list, Deal Gap −12%. User picks Path 1 (Hybrid: $385K cash + $25K seller carry at 5% for 5yr). Calls the listing agent.

```
STAGE 1 (pre-call):  user reviews script, confirms walk-away = $390K, taps "Start call mode"

STAGE 2 (live):
  [Step 1: Permission]   Prompter: "Open with — 'Would it be okay if I asked a few
                         questions about the property before we get to numbers?'"
                         User taps NEXT after delivering line.

  [Step 2: Diagnosis]    Prompter shows 4 chips. User taps "timeline" + "equity".
                         Captures answers: "Seller relocating in 60 days, owns free-and-clear."
                         → Signal: high time pressure, no existing loan, all-equity.

  [Step 3: Anchor]       Prompter: "Deliver: 'Based on the comps and condition, my offer
                         is $385,000 cash plus $25,000 carried over 5 years at 5%.'"
                         User reads.

  [Step 4: Silence]      7-second countdown appears. "DO NOT TALK."

STAGE 3 (objection):  Seller says "That's too low — I was hoping for $410."
                       User taps the "Offer too low" chip.

                       Prompter shows Aikido response:
                         "Mirror first: 'Too low?'  Then ask:
                          'Help me understand — is the concern the headline number,
                           or the cash you walk with at closing?'"

                       User reads it. Seller answers:
                         "Honestly, I just need at least $400K to make my next move work."

                       User taps "Captured: needs ≥$400K cash at closing."

STAGE 4 (re-pitch):    Engine re-runs with constraint: cash_floor = $400K.
                       Old Path 1 had $385K cash → fails.
                       Engine returns: $400K cash + $20K carry over 7 years at 5%.
                       Net to seller: $420K. Net to investor monthly: still cash-flows.

                       Prompter:
                         "Your number works if we adjust the structure. Try:
                          'Okay — what if I go to $400 cash and carry $20,000
                          for 7 years at 5%? You walk with $400 today and earn
                          interest on the back end. Same total, different shape.'"

                       Seller pauses, then: "Send me something in writing."

STAGE 5 (outcome):     User taps "In-play."
                       Assistant drafts a recap email with:
                         - what was agreed verbally
                         - the revised structure ($400K cash + $20K carry)
                         - attorney recommendation
                         - timeline to written offer
                       User reviews, edits, sends.
```

This is the full loop. Every pivot is grounded in the seller's actual words and the engine's actual numbers — no AI-generated improvisation, no manipulative tactics, no claims the engine can't substantiate.

---

## 3. Engineering plan

Tickets follow the same conventions as [FOUR_PATHS.md](./FOUR_PATHS.md) §4: backend owns calculations, pure-function templates, camel-case at API boundary, 5th-grade narrative, mobile-first, attorney disclaimer on financing/strategy_switch families.

### N1 — Pre-call checklist (Stage 1 enhancement)

**Effort:** S
**Files:**
- Modified: [PitchScriptModal.tsx](../../frontend/src/components/iq-verdict/PitchScriptModal.tsx)
- Modified: [eventTracking.ts](../../frontend/src/lib/eventTracking.ts) — add `pitch_checklist_viewed`, `pitch_callmode_started`

**Scope:** Insert a checklist section above the existing script body:
- Walk-away price (pre-filled from `structure.preLoadedRecord.custom_purchase_price` or `ctx.target_buy_price`)
- Four diagnosis questions (boilerplate, no per-property variation in v1)
- Attorney-review reminder (only on financing/strategy_switch/blended families — reuse existing disclaimer logic)
- "Start call mode" CTA (visually primary; opens Stage 2)

**Acceptance criteria:**
- Modal renders checklist above script, collapsible to keep script printable.
- Walk-away price field is editable and writes back to localStorage so it persists across sessions.
- "Start call mode" is hidden behind a feature flag (`NEGOTIATION_ASSISTANT`) until N2 is ready.

### N2 — Live-call companion (Stage 2)

**Effort:** L
**Files:**
- New: `frontend/src/components/iq-verdict/CallModeCompanion.tsx`
- New: `frontend/src/lib/negotiation/sellerSignals.ts` — typed signal capture, localStorage-persisted per `structureId`
- Modified: [PitchScriptModal.tsx](../../frontend/src/components/iq-verdict/PitchScriptModal.tsx) — opens companion when "Start call mode" pressed

**Scope:** Mobile-first full-screen companion that walks the user through the six phases. Each phase = one screen. Big tap targets; one prompt at a time; back button always available; entire state local to the device (no server roundtrip during the call).

**Critical UX rules (must honor):**
- No call recording. No microphone access. No transcription. We are a prompter, not a surveillance tool.
- The 7-second silence step must be a real countdown that the user cannot skip — it is the entire point of that phase.
- Mobile vertical-stack only; do not waste screen real estate on multi-column layouts a user is glancing at while on a call.
- Respect `prefers-reduced-motion` per existing doctrine.

**Signal capture (typed — feeds Stage 4 re-pitch):**
```ts
export interface SellerSignals {
  timelineDays?: number              // captured from "they need to close in X days"
  hasExistingLoan?: boolean
  estimatedLoanRate?: number
  cashFloor?: number                 // "needs at least $X at closing"
  emotionalAnchor?: 'inheritance' | 'long-term-home' | 'improvements' | 'none'
  competingOfferAmount?: number
  capturedAt: string                 // ISO timestamp
}
```

**Acceptance criteria:**
- Companion is reachable only via the N1 "Start call mode" CTA.
- Six phases render in order; back navigation works without losing captured signals.
- Signal capture writes to `localStorage.negotiationSignals.<structureId>` and survives page refresh.
- 7-second silence countdown is non-skippable.
- Closes cleanly back to Stage 1 modal with signals persisted.

### N3 — Counter-offer triage (Stage 3)

**Effort:** M
**Files:**
- New: `frontend/src/components/iq-verdict/ObjectionTriage.tsx`
- New: `frontend/src/lib/negotiation/objectionMatrix.ts` — typed mapping, all copy locked in code (5th-grade reading level per existing doctrine)

**Scope:** Decision tree with 7 objection chips (per the Aikido matrix in section 2.2). Each chip → calibrated response card → "HOLD" or "PIVOT" choice.

**Objection categories (locked):**
1. `too_low` — pivots to Hybrid or Terms re-pitch
2. `need_all_cash` — pivots to Cash path with the Two-Company script
3. `another_offer` — holds; suggests calibrated question to compare terms
4. `wait_for_better` — holds; surfaces cost-of-waiting from carrying cost
5. `not_a_bank` — pivots away from straight Seller Financing toward Sub2 or Cash
6. `dont_trust_sub2` — pivots away from Sub2 toward financing or cash; preserves attorney disclaimer
7. `custom` — text input; logs the verbatim objection but does not auto-pivot (v1 escape hatch)

**Acceptance criteria:**
- Each chip surfaces its Aikido response in under 200ms (no roundtrip).
- "PIVOT" routes into N4 with the captured objection as input.
- "HOLD" returns to Stage 2 with the response logged.
- All copy reviewed against 5th-grade reading level (run through existing copy doctrine).

### N4 — Re-pitch endpoint (Stage 4 — backend)

**Effort:** L
**Files:**
- Modified: `backend/app/services/deal_structures/context.py` — add `negotiation_constraints: NegotiationConstraints | None`
- Modified: `backend/app/services/deal_structures/selector.py` — `_apply_negotiation_constraints` step, runs before existing diversity rule
- New: `backend/app/services/deal_structures/repitch.py` — `compute_repitch(ctx, signals, objection)` — takes the original `StructureContext`, the captured signals, and the objection that triggered the pivot; returns a fresh `DealStructuresPayload` with re-ranked paths and a fresh pitch script
- New: `backend/app/routers/repitch.py` — `POST /api/v1/analysis/repitch` — thin wrapper

**`NegotiationConstraints` schema:**
```python
class NegotiationConstraints(BaseModel):
    cash_floor: float | None = None              # "seller needs ≥$X cash at closing"
    seller_excluded_families: tuple[str, ...] = ()  # e.g. ("financing",) when seller said "I don't want to be a bank"
    seller_timeline_days: int | None = None
    seller_emotional_anchor: Literal['inheritance','long-term-home','improvements','none'] | None = None
```

**Selector behavior:**
- A path that violates `cash_floor` or includes a seller-excluded family is filtered out before ranking — not penalized, *removed*. Honesty doctrine: never present a path the seller has already rejected.
- The Blended Plan auto-rebalances: if Sub2 was excluded but Hybrid is still allowed, Blended drops Sub2 and recombines from the surviving templates.
- If filtering produces zero valid paths, return an empty payload with a `reason: 'no_viable_structure_after_constraints'` field — frontend renders an honest "the seller's constraints have closed the path on this property; recommend walking" message. We do NOT fabricate a path that the math doesn't support.

**Acceptance criteria:**
- 100% of re-pitch responses are pure functions of `(ctx, signals, objection)`. No I/O, no `datetime.now()`.
- Endpoint returns in <200ms p95 (templates are already pure and fast — this is achievable).
- A signal of `cash_floor=$400K` against a $385K cash path filters that path entirely; does not return it with a warning.
- Re-pitch script differs from original — explicitly references the seller's stated constraint ("Since you mentioned needing $400K at closing, here's how the structure shifts").
- Test coverage parallel to existing engine tests (pattern: `test_repitch_*.py`).

### N5 — Outcome capture & follow-up (Stage 5)

**Effort:** M
**Files:**
- New: `frontend/src/components/iq-verdict/NegotiationOutcome.tsx`
- New: `frontend/src/lib/negotiation/recapEmail.ts` — pure email-body generator from signals + outcome
- Modified: existing `DealMakerRecord` (TBD which exact file) — add `negotiation_state` enum field + `last_negotiated_at`

**Scope:**
- Outcome chip selector: `dead | in_play | under_contract`
- For `in_play`: auto-drafts recap email body from captured signals; opens via existing `mailto:` flow used by current modal (lines 369–381 of [PitchScriptModal.tsx](../../frontend/src/components/iq-verdict/PitchScriptModal.tsx)).
- For `dead`: surfaces "schedule follow-up in 30/60/90 days" — uses existing `UpcomingTasks` component (per recent commit `e022e654`).
- All outcomes write back to the property's `DealMakerRecord` so the next time the user opens this property's verdict, the panel shows "You negotiated this on {date}, status: {state}" and offers a "Resume negotiation" CTA.

**Acceptance criteria:**
- Recap email includes only what was captured during the call — no fabrication.
- Email subject includes property address and headline of the path that was actually pitched (not just first path).
- Persisted state survives across devices iff user is signed in (otherwise localStorage-only).

### N6 — Telemetry & KPI instrumentation

**Effort:** S
**Files:**
- Modified: [eventTracking.ts](../../frontend/src/lib/eventTracking.ts)

**New events** (follow existing naming pattern):
- `negotiation_callmode_started` — `{ structure_id, family, walk_away_price }`
- `negotiation_phase_advanced` — `{ structure_id, from_phase, to_phase }`
- `negotiation_signal_captured` — `{ structure_id, signal_type }` (no PII; signal *types*, not values)
- `objection_logged` — `{ structure_id, objection_category, original_family }`
- `path_pivoted` — `{ structure_id, from_family, to_family, trigger_objection }`
- `repitch_returned_empty` — `{ structure_id, reason }` — fires when constraints leave no viable structure
- `recap_email_drafted` — `{ structure_id, outcome }`
- `negotiation_outcome_logged` — `{ structure_id, outcome, days_in_negotiation }`

---

## 4. Modular offer-structure templates the assistant can pivot to

These already exist in the engine. The assistant does not invent new structures; it re-ranks and re-explains the shipped ones based on captured signals. Listed here so the Stage 4 routing logic is unambiguous.

| Template (engine id) | Family | Pivots TO when… | Pivots AWAY when… |
|---|---|---|---|
| `price_negotiation` | price | Seller needs cash, no openness to terms | Seller has cash floor > offer |
| `seller_second_zero_balloon` | financing | Seller has equity, wants headline price | Seller said "not a bank" |
| `rent_uplift` | income | Property has comp rent upside | Seller doesn't care about post-sale story |
| `sub2` (heuristic) | financing | Seller has low-rate loan from 2019–2021 | Seller said "don't trust Sub2" or REO/foreclosure |
| `rate_buydown` | financing | Seller motivated, has ~$7K to give back at closing | Cash-required seller |
| `larger_down` | capital | Investor has cash; wants monthly relief | n/a (investor-side lever) |
| `assumable` (T9) | financing | Existing assumable loan present | Lender approval timeline >60d but seller needs <30d |
| `fha_house_hack` | strategy_switch | Owner-occupant path is plausible for the user | Investment-only investor |
| `morby_method` | financing (post-substitute) | Sub2 + seller second both viable | Either piece blocked |
| `blended_plan` | blended (Path 4) | Multiple small concessions easier than one big one | Seller insists on a single clean structure |

The Blended Plan is the assistant's default Stage 4 fallback when the original single-lever path is rejected: per all three reference documents, sellers who reject one big concession will often accept three small ones that net to the same math.

---

## 5. KPIs and optimization framework

### 5.1 Top-line negotiation funnel

This is a new, *real* funnel — it does not exist today, and it becomes both a product KPI and a marketing claim once we have data.

| Stage | Metric | What it tells us |
|---|---|---|
| 1 → 2 | % of pitches where user starts call mode | Did the script give them enough confidence to actually dial? |
| 2 → 3 | % of call-mode sessions that hit at least one objection | Sanity check: are real calls getting real pushback? |
| 3 → 4 | % of objections where user pivots vs. holds | Is the assistant actually re-routing, or just reading? |
| 4 → 5 | % of pivots that produce a viable re-pitch | Is the engine actually solving for the constraint? |
| 5 outcome | % of negotiations reaching `under_contract` | The bottom-line claim. |

### 5.2 Quality signals (not just funnel)

- **Objection distribution.** Are we seeing the seven categories at the rates the references predict, or is one category dominating? A category we underweighted in code is the highest-leverage area to add depth.
- **Pivot success rate by `from_family → to_family`.** If Sub2 → Hybrid is the most successful pivot, surface that as the default fallback. If Cash → Terms never works, the engine is recommending Cash on the wrong properties.
- **`repitch_returned_empty` rate.** Above ~5% means the constraint logic is too aggressive; the user gets a dead end where they should have gotten a Blended option. This is the canary for honesty-vs-helpfulness calibration.
- **Time from first script open to outcome logged.** Long times mean the user is using us across multiple calls (good — sticky); very short times mean they're not actually using the tool, just touching it (bad).

### 5.3 Feedback loop

- Weekly: dashboard auto-summary of objection-category distribution + pivot success matrix.
- Monthly: review the `custom` objection text bucket. Anything that recurs ≥3 times becomes a candidate 8th category.
- Quarterly: replace the heuristic Aikido scripts with versions tested against actual outcome data (which response-script flavor produces the highest `path_pivoted → under_contract` rate?).

---

## 6. What this plan deliberately does NOT do

Listed so future scope creep is easier to spot:

- **No call recording, transcription, or microphone access.** The assistant never listens to the seller. We are a prompter.
- **No AI-generated negotiation copy in v1.** Every script line ships in code, reviewed, locked, and 5th-grade-tested. LLM-generated rephrasing is a future ticket only after we have outcome data on the locked versions.
- **No "negotiate for me" mode.** We do not auto-respond. The user always speaks the words.
- **No new offer structures.** The engine already has 9 templates; the assistant pivots between them, it does not invent new ones.
- **No legal advice.** Every financing/strategy_switch/blended path keeps the existing attorney disclaimer; the recap email auto-includes an "attorney review recommended" line on creative-finance outcomes.
- **No price-anchoring tricks the references explicitly call out as ethically borderline** (false urgency, inflated repair estimates, foreclosure-rescue claims). The Aikido matrix uses only the documented respectful redirects.

---

## 7. Executive summary

**Strategic benefit.** The shipped Four Paths feature solved the "what should I offer?" freeze. It does not solve the "the seller pushed back — what now?" freeze, which all three reference documents identify as the dominant failure mode for first-time creative-finance investors — DealGapIQ's primary audience. The Negotiation Assistant closes this loop in-product, using the engine that already exists.

**User impact.** A user who today opens a script, makes one call, gets pushback, and abandons the property would, with the Assistant, be guided through the standard six-phase call architecture, given calibrated responses to the seven highest-frequency objections, and offered a re-pitched alternative structure that mathematically respects the seller's stated constraint. The 24-hour written-recap habit (cited as the highest-leverage post-call habit across all three references) becomes one click.

**Competitive position.** No competitor offers in-product, property-specific negotiation guidance. Attom and Datatree provide raw data; Redfin and Zillow stop at list price; BiggerPockets calculators stop at the math; even creative-finance specialist tools stop at the structure. Four Paths already crossed the synthesis line; the Assistant extends DealGapIQ's category-defining lead by another step.

**Scope discipline.** Every script line is locked in code, sourced to one of three well-vetted reference frameworks, and reviewed against the existing copy doctrine. The Assistant is a prompter, not an autonomous agent. The accurate Deal Gap stays visible per the existing transparency-as-credibility doctrine.

**Sequencing.** Tickets N1–N6 are independently shippable. N1 + N5 alone would be a meaningful release ("better script, with follow-up"). N2 + N3 + N4 are the core of the live-call companion and ship together. N6 is non-blocking but should land before N2 so we measure the launch window.
