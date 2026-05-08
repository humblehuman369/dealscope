# Activation Arc — Feature Plan

A self-contained plan for the next product direction, derived from a brainstorm with the founder on what the Four Paths user signal actually means. This document is the headline plan; [NEGOTIATION_ASSISTANT.md](./NEGOTIATION_ASSISTANT.md) is re-sequenced as a downstream phase below.

> **The signal we're building from:** when shown Four Paths, aspiring/curious investors who hadn't engaged on first DealGapIQ visit instantly engaged with the worksheets and asked for more. That moment — *"this property has a deal in it and I have agency over it"* — is the activation point of the entire product.

> **The thesis:** the Deal Gap is not emotionally discouraging by nature. It is discouraging only at the price-only entry point. The fix is architectural — the engine should compute a *plausible-acceptance conventional structure* and present that as the headline, with the accurate gap retained as the transparency/credibility layer. Same competitive-positioning playbook as foreclosure.com vs Attom, applied at the math layer instead of the framing layer.

---

## 0. Status snapshot

> **Implementation status (2026-05-07):** P0–P5 shipped. Four phase-sliced commits land the engine work, the sandbox endpoint, the frontend activation arc, and an internal preview page. The plan below is preserved as design context. Open items now sit at the data layer (Sprint 2 calibration window, the IQ-engagement gate at C3/Step 20) and the explicitly deferred N2/N3/N4 live-call work.

| Item | Status |
|---|---|
| Four Paths engine, selector, templates, panel, pitch modal | ✅ shipped — see [FOUR_PATHS.md](./FOUR_PATHS.md) |
| Personalized assumptions per user profile | ✅ shipped — surfaced in verdict UI via A2 personalization line |
| `_apply_regional_calibration` + `ctx.market_temperature` | ✅ shipped — used by `price_negotiation`, `headline_conventional_blend`, and other templates |
| Conventional headline blend architecture | ✅ shipped (P0 / E1–E5) |
| Activation Arc (this plan) | ✅ shipped — P0, P1, P2, P3, P4, P5 all landed |
| Negotiation assistant (pre-call checklist + live companion + triage) | ✅ P5 slice shipped (N1 + N5 + N6); N2/N3/N4 deferred per §8 |
| "IQ" as labeled assistant voice | ✅ shipped — chip + KB (P3) and through-line (P4: D1 explanation, D2 sandbox nudges, D3 panel icon) |
| Sandbox name — **"Build Your Deal"** | ✅ shipped under this label |
| Lab / training mode | ❌ explicitly retired (audience entry-mood mismatch) |

---

## 1. The activation arc — the inversion

| Today | Activation Arc |
|---|---|
| Verdict opens with the price-only Deal Gap as the headline ("you need a 12% discount"). | Verdict opens with a **computed conventional structure** as the lede ("$385K price + market-validated rent + 25% down → cashflows at $150/mo"); accurate Deal Gap stays as the credibility chip. |
| Four Paths is the **answer**. The user receives it. | Four Paths becomes **examples of the move the user just made** (or alternatives to the headline structure). The user discovers them. |
| Seller financing presented alongside conventional levers as one of four options. | Seller financing reframes as an **optimization** — promoted contextually as *"cut your down payment by $40K with a small seller carry"* when the user has a real cash shortfall. |
| To play with the deal, the user must navigate to Strategy. | A focused mini-sandbox sits on the verdict page, **pre-set to the headline structure**; Strategy becomes the depth exit users *earn their way to*. |
| Personalization is invisible. | The user's own assumptions are visible in one line at the top of the verdict, and the headline blend uses their actual cash position. |
| The product goes silent after the script is copied. | A labeled assistant voice (IQ) carries continuity across the moments where users freeze. |

The four beats of the arc, in order:

1. **Computed conventional structure as the lede** — "Here's a deal that works on this property: $385K + 25% down + $2,150/mo rent → $150/mo cashflow." Uses only buyer-controllable + minor-price levers (price within market-aware ceiling, validated rent, larger down). The accurate Deal Gap stays as the transparency chip below.
2. **Mini-sandbox right on the verdict page**, pre-loaded with the headline structure's values. The user adjusts to fit their budget; the gap recomputes live.
3. **Four Paths reframed** — *"Four other ways investors close gaps like this — including how to lower your down payment with seller carry."* Same cards, different mental category.
4. **Strategy as the earned depth exit** — for users now hooked enough to want the full worksheet.

---

## 2. Phases at a glance

| Phase | What ships | Effort | Why this order |
|---|---|---|---|
| **P0 — Conventional Headline Blend** | New `headline_conventional_blend` template; payload-level `headline_structure` field; cash-shortfall detection that promotes seller-financing cards as downpayment reducers; verdict component that renders the headline above Four Paths | M (~3–5 days) | The architectural unlock everything else assumes. Without P0, P1's "frame fixes" are still copy-on-top-of-discouragement. With P0, the Deal Gap becomes a credibility layer below an actual deal. |
| **P1 — Frame fixes** | Surfaced personalization line; motivating-label audit; Four Paths header reframed contextually to the headline above | S (days) | Now that P0 has produced a real headline, the supporting copy reframes against it. |
| **P2 — Build Your Deal sandbox** | Inline slider component pre-set to the P0 headline structure; real-time gap recompute; "Apply in Strategy" handoff | M (~1 week) | The activation arc's core. Owns the *"user moves something and the gap closes"* feeling that turned the test users on. Materially better with P0 in place — sliders start at a working deal. |
| **P3 — IQ knowledge base v1** | "Ask IQ" chip on Four Paths panel; curated Q&A modal sourced from the three reference docs | S (days) | Lowest-risk way to test the IQ-as-character question. Ships fast, learns cheap. Curated content only — no freeform LLM. |
| **P4 — IQ as through-line** | IQ voice attached to motivating moment, sandbox nudges, Four Paths reframe | M (~1–2 weeks) | Gated on P3 engagement data. If users tap the chip, IQ earns the right to expand into the arc. If they don't, P3 stands alone as a useful FAQ. |
| **P5 — Negotiation assistant** | N1 (pre-call checklist) + N5 (outcome capture & 24-hr recap) from [NEGOTIATION_ASSISTANT.md](./NEGOTIATION_ASSISTANT.md). N2/N3/N4 deferred until P2 + P3 data justify. | M (~1 week for the slice) | Right-sized — the post-conviction tool, not the headline. IQ becomes the voice of these moments once P4 ships. |

---

## 3. Phase 0 — Conventional Headline Blend

The architectural reframe. The engine produces a *probable-acceptance* conventional structure as the headline of every verdict, computed deterministically from buyer-side and minor-price levers. The Deal Gap doesn't disappear — it becomes the transparency chip below the headline.

**Founder-locked decisions:**
- Implementation as a **new template** (not a constrained mode of `blended_plan`).
- Price-cut ceiling is **market-temperature-aware** using the existing `_apply_regional_calibration` and `ctx.market_temperature` infrastructure. **Fallback if regional data is unavailable for a property: flat 5% ceiling.**

### E1 — `headline_conventional_blend` template

**Effort:** M
**Files:**
- New: `backend/app/services/deal_structures/templates/headline_conventional_blend.py`
- Modified: `backend/app/services/deal_structures/templates/__init__.py` — NOT added to `ALL_TEMPLATES` (this template is run separately, see E2)
- Modified: `backend/app/schemas/deal_structures.py` — add `family: Literal['conventional_headline']` to the `StructureLever` family enum

**Locked levers (v1) — three only:**
1. **Price** — buyer's offer at or above `list_price × (1 - price_ceiling)`, where `price_ceiling` is market-aware: cold = 0.08, neutral = 0.05, hot = 0.03, unknown = 0.05.
2. **Rent** — validated to comp range, capped by the same bounds the existing `rent_uplift` template uses (do not invent rent — reuse that template's heuristic so the user sees consistent numbers).
3. **Down payment** — sized up from the user's `cash_available` profile field (cap at 50% of price; floor at 20%, the existing baseline).

**Algorithm:**
```
solve(ctx) -> DealStructure | None:
  for ceiling in [base_ceiling, base_ceiling + 0.03]:   # base, then expanded
    price = list_price * (1 - ceiling)
    rent = clamp(rent_uplift_template(ctx).new_rent, market_floor, market_ceiling)
    for dp_pct in [user_dp_pct or 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]:
      cashflow = compute_cashflow(price, rent, dp_pct, ctx.interest_rate)
      if cashflow > 0:
        return DealStructure(
          family='conventional_headline',
          headline=f"Conventional terms — {fmt_pct(ceiling)} off, {fmt_pct(dp_pct)} down, ${rent}/mo rent",
          selection_reason="Smallest set of conventional moves that makes this property cashflow",
          ...
        )
  return None
```

**Card copy template:**
- Headline: `Conventional terms — {price_ask}, {dp_pct} down, ${rent}/mo rent`
- Family label: `Conventional headline`
- Realism label: `Most likely seller-acceptable`
- Selection reason: `Shown because this is the smallest set of conventional moves that makes the property cashflow on this listing.`
- Caveat: `Headline assumes seller accepts a price negotiation within {ceiling}% of list. Confirm comps support the rent assumption before pitching.`

**Acceptance criteria:**
- Pure function of `StructureContext`. No I/O, no `datetime.now()`.
- Returns `None` cleanly when no `(price, rent, dp_pct)` combination cashflows within the expanded ceiling.
- Test coverage: per-template test file with cases covering cold/neutral/hot markets, low/high rent properties, profile cash floor, and the `None` failure case.
- Numbers match what the existing `rent_uplift` and a manual price-negotiation calc would produce given the same inputs (no drift between templates).

### E2 — Engine integration

**Effort:** S
**Files:**
- Modified: `backend/app/services/deal_structures/engine.py` — `compute_deal_structures` now also runs `headline_conventional_blend` independently of the selector cascade.
- Modified: `backend/app/schemas/deal_structures.py` — `DealStructuresPayload` gains:
  - `headline_structure: DealStructure | None` — the conventional headline (or null when no plausible conventional structure)
  - `cash_shortfall: float | None` — gap between buyer's profile cash and what the headline requires (see E3)

**Behavior:**
- The new template runs first, separately from the existing 4-path selector. Output attaches to `payload.headline_structure`.
- The existing 4-path selector continues to run unchanged — the cards are the alternatives.
- When `headline_structure` is `None`, the existing motivating-label tier (`Reset Deal`, etc.) takes over the verdict — honest "no plausible conventional structure" fallback. Same gating doctrine as the existing engine.

**Acceptance criteria:**
- Every property that today shows the `Reset Deal` tier still shows `Reset Deal` in the new system (no regression in honest gating).
- Properties that today show a negative gap with no conventional path now produce a `headline_structure` when one mathematically exists.
- Properties where no conventional structure works fall back cleanly to the existing tier system.

### E3 — Cash-shortfall detection + seller-financing-as-optimizer

**Effort:** S
**Files:**
- Modified: `backend/app/services/deal_structures/engine.py` — computes `cash_shortfall = headline.dp_required - ctx.user_cash_available` (clamped to ≥0)
- Modified: `backend/app/services/deal_structures/selector.py` — when `cash_shortfall > 0`, the selector elevates one seller-financing-family card with a contextually-overridden headline.
- Modified: financing-family templates (`seller_second_zero_balloon.py`, `sub2.py`, `morby_method.py`) — add a `as_downpayment_reducer(ctx, shortfall) -> DealStructure | None` helper that returns the existing structure with `headline` and `selection_reason` overridden:
  - Headline override: `Cut your down payment by ${shortfall} with a small seller carry`
  - Selection reason override: `Promoted because the conventional headline needs ${headline.dp} but your profile has ${ctx.user_cash_available}`

**Behavior:**
- When the user has the cash for the headline blend, seller-financing cards render with their existing copy (creative-finance framing).
- When the user is short, one seller-financing card gets the downpayment-reducer headline. The card's actual structure (math) is unchanged — only the copy reframes.
- The promotion is contextual to the user, not the property — same property, different user, different framing.

**Acceptance criteria:**
- A user with sufficient cash sees the standard Sub2/seller-second cards.
- A user with `cash_available = $40K` viewing a property whose headline needs $80K down sees one financing card promoted as *"Cut your down payment by $40K with a small seller carry"*.
- Math is identical between the two presentations — only copy differs.

### E4 — Verdict component renders the headline

**Effort:** S
**Files:**
- New: `frontend/src/components/iq-verdict/HeadlineStructureCard.tsx`
- Modified: [VerdictGapGuidance.tsx](../../frontend/src/components/iq-verdict/VerdictGapGuidance.tsx) — renders the headline above the Four Paths panel
- Modified: [verdict/page.tsx](../../frontend/src/app/verdict/page.tsx) — read `payload.headline_structure` and pass through

**Layout (top to bottom):**
1. Motivating tier label ("Potential Deal · structure makes it work" — existing)
2. **NEW: Headline structure card** — the conventional blend's structure summary in the same visual style as the Four Paths cards, but visually distinguished (slightly larger, full-width on mobile, accent-bordered)
3. Personalization line (P1)
4. Mini-sandbox (P2)
5. Four Paths panel — header reframed to *"Other ways to close this gap on this property"*
6. Deal Gap % chip — credibility/transparency layer below

**Honest-gating UX:** when `headline_structure` is `None`, the headline-card region collapses entirely and the existing motivating-tier behavior renders. No empty state, no fabricated card. The user gets the same honest "Reset Deal" or "Structured Deal" framing they would have gotten before.

**Acceptance criteria:**
- Mobile (375px): headline card is visually the hero; everything else stacks below.
- Desktop: headline card prominent; Four Paths cards visually subordinate.
- When `headline_structure` is null, the page looks identical to today (no broken layout, no empty card).

### E5 — Telemetry

**Effort:** XS
**Files:** [eventTracking.ts](../../frontend/src/lib/eventTracking.ts)

**Events:**
- `headline_structure_rendered` — `{ family: 'conventional_headline' | null, market_temperature, price_ceiling_used, has_cash_shortfall }`
- `headline_structure_null` — fired when no plausible conventional structure is found, with a `reason` field. Useful as a calibration signal.
- `downpayment_reducer_promoted` — `{ from_family, shortfall_pct }` — fires when E3 promotes a financing card with the contextual headline.

---

## 4. Phase 1 — Frame fixes

Three small tickets that re-cast the supporting UI now that P0 has produced a real headline structure. With the headline in place, these copy/layout fixes shift from "reframing discouragement" to "framing alternatives against the headline."

### A1 — Reframe the Four Paths panel header

**Effort:** XS
**Files:** [FourPathsPanel.tsx](../../frontend/src/components/iq-verdict/FourPathsPanel.tsx)

**Change:** Panel header copy moves from answer-framed to alternatives-framed, contextual to the P0 headline above.
- Today (implicit): "Four ways to make this deal work."
- New: "Other ways to close this gap on this property."

When `headline_structure` is null (the honest-fallback case), the header reverts to: "Four ways investors approach properties like this." The header copy logic is small and lives entirely in `FourPathsPanel.tsx`.

**Acceptance:** copy reviewed against existing doctrine (5th-grade reading level, no advisory voice). Header swaps based on `headline_structure` presence.

### A2 — Surface personalization in one line

**Effort:** S
**Files:** [VerdictGapGuidance.tsx](../../frontend/src/components/iq-verdict/VerdictGapGuidance.tsx); [verdict/page.tsx](../../frontend/src/app/verdict/page.tsx) for the read of user assumptions.

**Change:** One sentence above the Four Paths panel that names the user's actual assumptions:
> *"Showing paths that fit your $40K cash budget and 6.5% rate."*

Pull from the existing user-profile / custom-assumption store (already wired through to the engine). When the user has not customized:
> *"Showing paths based on standard 20%-down / 6.5% / 30-yr assumptions. [Customize]"*

**Acceptance:** sentence renders only with values that match what the engine actually used (no drift between displayed assumption and computed result). Customize link routes to existing profile UI.

### A3 — Motivating-label audit

**Effort:** XS
**Files:** [verdict/page.tsx](../../frontend/src/app/verdict/page.tsx), [types.ts](../../frontend/src/components/iq-verdict/types.ts)

**Scope:** Confirm the motivating label still renders correctly above the new headline-structure card, and the Deal Gap % renders below as the credibility chip. Audit on mobile (375px) and desktop after E4 ships.

**Acceptance:** screenshot review; no engineering changes if the doctrine still holds.

---

## 5. Phase 2 — Build Your Deal sandbox

The activation arc's core. Three to four sliders on the verdict page that let the user adjust the headline structure to fit their budget. The component is labeled **"Build Your Deal"** in the UI. Sliders open pre-set to the P0 headline values, not at baseline — the user starts at a working deal and adjusts, rather than starting at a broken deal and trying to fix it.

### B1 — Sandbox slider component

**Effort:** M
**Files:**
- New: `frontend/src/components/iq-verdict/DealSandbox.tsx`
- New: `frontend/src/components/iq-verdict/sandboxState.ts` — typed adjustment state
- Modified: [VerdictGapGuidance.tsx](../../frontend/src/components/iq-verdict/VerdictGapGuidance.tsx) — sandbox renders below the headline structure card, above Four Paths cards.

**Sliders (v1, locked) — initial values from the P0 headline structure:**
1. **Price** — initial = `headline_structure.price`. Range: list price down to baseline `target_buy_price` × 0.85.
2. **Monthly rent** — initial = `headline_structure.rent`. Range: ±25% of `monthly_rent`.
3. **Down payment %** — initial = `headline_structure.dp_pct`. Range: 5%–50%.
4. **Seller carry amount** — initial = 0. Range: 0 to 30% of price (zero by default; the user pulls this slider to *manually* explore the seller-financing-as-optimizer flow that E3 surfaces automatically when relevant).

**Live-update behavior:**
- Each slider move recomputes the Deal Gap and the motivating-label tier via the B2 endpoint.
- As the gap closes, the headline progresses through the existing `DealGapTier` rungs (Reset → Structured → Potential → Near → Negotiable → Cash-Flow).
- A "Reset to headline" link clears all adjustments back to the P0 headline values (not back to baseline list price — back to the *recommended* starting point).

### B2 — Backend sandbox endpoint

**Effort:** M
**Files:**
- New: `backend/app/routers/sandbox.py` — `POST /api/v1/analysis/sandbox`
- New: `backend/app/services/sandbox.py` — pure function `recompute_gap(ctx, adjustments)`

**Constraint:** per existing doctrine ("Backend owns all calculations"), the sandbox math is server-side. The frontend cannot recompute the gap locally. To keep slider response real-time, the endpoint must be ≤100ms p95 — pure recompute over a small payload, achievable with no DB read on the recompute path.

**Acceptance:** dragging a slider produces a smooth label transition with no perceptible lag at 4G mobile latency. Math result is identical to what Strategy would produce given the same adjustments.

### B3 — "Apply this in Strategy" handoff

**Effort:** S
**Files:**
- Modified: existing `frontend/src/lib/dealStructures/scenarioPayload.ts` — extend `ScenarioPayloadV1` to carry sandbox adjustments verbatim
- Modified: [DealSandbox.tsx](../../frontend/src/components/iq-verdict/DealSandbox.tsx) — "Apply in Strategy" CTA appears only after the user has moved at least one slider (i.e., made it their own — not just used the headline starting position).

**Behavior:** the user has just *built* their version of the deal. The CTA carries those exact adjustments through to Strategy via the existing URL-payload transport. Strategy opens already populated.

**Acceptance:** clicking the CTA after moving sliders opens Strategy with the same numbers. No drift between sandbox state and Strategy initial state.

### B4 — Persisted sandbox session per property

**Effort:** S
**Files:** [userPreferences.ts](../../frontend/src/lib/dealStructures/userPreferences.ts) — extend pattern

**Behavior:** when the user returns to a property they previously sandboxed, their adjustments are restored. localStorage-only in v1 (matches existing dismissal-state pattern, 30-day TTL). The verdict opens already in their adjusted state; a small chip says *"Resumed your scenario from {date}"* with a "reset to headline" affordance.

### B5 — Sandbox naming (locked)

**Decision: "Build Your Deal."** Used as the section label on the verdict page, the button that scrolls to or expands the sandbox, and any marketing references to the feature.

Why this and not the alternatives:
- Preserves the agency-action energy of the founder's original "Make it a Deal" framing without the game-show edge.
- *"Build"* is what investors actually do and say. The verb signals construction, not adjustment, and it pairs cleanly with the P0 headline above (*"Here's a deal — now build your version"*).
- *"Your"* anchors personalization. The headline structure is the deal that works on this property; the sandbox is the user's own version that fits their budget and risk tolerance.

The seriousness concern that originally tabled "Make it a Deal" is addressed by visual treatment — a clean slider UI in the existing design language reads as professional regardless of the playful action verb.

---

## 6. Phase 3 — IQ knowledge base v1

The lowest-risk way to test the IQ-as-character idea. Curated content, no freeform LLM. Ships in days. If users engage, IQ earns expansion (P4). If they don't, P3 stands alone as a useful FAQ that improved the Four Paths panel.

### C1 — "Ask IQ" chip on Four Paths panel

**Effort:** S
**Files:**
- New: `frontend/src/components/iq-verdict/AskIQ.tsx`
- New: `frontend/src/lib/iq/knowledgeBase.ts` — typed Q&A index, content locked in code
- New: `frontend/src/lib/iq/iqIcon.tsx` — small reusable IQ icon component (reuses the existing brand mark — head/house/brain)
- Modified: [FourPathsPanel.tsx](../../frontend/src/components/iq-verdict/FourPathsPanel.tsx) — chip renders below the cards on the panel

**Behavior:**
- Chip with the IQ icon and label *"Ask IQ"*.
- Click opens a modal with categorized pre-canned questions (no free text in v1).
- Each question links to a vetted answer (4–8 sentences, 5th-grade level, with a single-line attribution: *"Based on principles taught by Brad Smotherman / Chris Voss / etc."*).
- Closes back to the Four Paths panel.

**Curation source:** the three reference documents (Mastering the Art of the Deal PDF, Residential RE Investor Negotiation Framework DOCX, real_estate_negotiation_wide_research CSV). Each Q&A's answer must be sourceable to a paragraph in those documents — no LLM-generated paraphrase passes review without that traceability.

### C2 — Initial Q&A content set (v1, locked)

**Effort:** S
**Files:** `frontend/src/lib/iq/knowledgeBase.ts` (data only)

**Categories and seed questions:**

*Bringing up creative finance*
- "How do I bring up Sub2 without sounding shady?"
- "How do I introduce seller financing without sounding salesy?"
- "What if the seller has never heard of these structures?"

*Handling objections*
- "What do I say when the seller says my offer is too low?"
- "What if the seller insists on all cash?"
- "What if they say they have another offer coming?"

*Reading the seller*
- "How do I figure out the seller's real motivation?"
- "What four things should I learn before talking price?"
- "What's the price-vs-terms tradeoff and how do I bring it up?"

*Tactics that work*
- "Why should I stay silent after I make my offer?"
- "When should I use a non-round number?"
- "What's the 24-hour recap email and why does it matter?"

**Acceptance:** every Q&A reviewed against existing copy doctrine (5th-grade, no jargon, no advisory voice). Each answer has its source attribution. Total content fits in one file — no DB schema for v1.

### C3 — Telemetry to validate IQ engagement

**Effort:** XS
**Files:** [eventTracking.ts](../../frontend/src/lib/eventTracking.ts)

**Events:**
- `iq_chip_opened` — `{ from_panel, structure_count_visible }`
- `iq_question_viewed` — `{ category, question_id }`
- `iq_modal_closed` — `{ questions_viewed_count, time_open_ms }`

**Decision rule for P4:** if ≥15% of users who view the Four Paths panel open IQ within 30 days of P3 launch, P4 (IQ as through-line) is justified. Below that, P3 stands alone — which is still useful.

---

## 7. Phase 4 — IQ as through-line

Gated on P3 engagement signal. Only ships if users tap the chip. Adds the IQ voice to the moments where users freeze across the activation arc. The brand-mark icon (already designed) becomes the through-line; no face, no body, no cute personality. Just a labeled voice attached to specific UI moments.

### D1 — IQ voice on the motivating moment

**Effort:** S
**Files:** [VerdictGapGuidance.tsx](../../frontend/src/components/iq-verdict/VerdictGapGuidance.tsx) or wherever the motivating-label hero renders.

**Change:** the headline structure card gets a small IQ chip beside it that, on tap, opens an IQ explanation:
> *"This property looks like a 'no' if you only look at price. Here's the conventional structure that actually makes it work — and why."*

Followed by a 3-bullet plain-English explanation of the headline structure's reasoning. This is the moment that converts the user from "rejecting on price" to "engaging with structure."

### D2 — IQ nudges in the sandbox

**Effort:** S
**Files:** [DealSandbox.tsx](../../frontend/src/components/iq-verdict/DealSandbox.tsx)

**Change:** when the user dwells on the sandbox without moving anything for >8 seconds, an IQ chip nudges:
> *"Try bumping rent $75. Watch the gap close."*

Or, if the gap is already partially closed:
> *"You're $40/mo of rent away from a Cash-Flow Deal."*

Or, if cash shortfall is detected:
> *"You're $20K short on the down payment. Want to see how seller carry can close that?"*

Nudges are pulled from a small set of templated prompts keyed off the current state (gap distance, which sliders the user has touched, cash shortfall amount). No LLM in v1 — just a state-triggered phrase library.

### D3 — IQ reframe on the Four Paths cards

**Effort:** XS
**Files:** [FourPathsPanel.tsx](../../frontend/src/components/iq-verdict/FourPathsPanel.tsx)

**Change:** the panel header gets a small IQ icon that visually attributes the cards to IQ:
> *"IQ found other ways to close this gap."*

Tiny copy change, but with the through-line established it reads as *"the same guide who explained the headline is now showing me real alternatives."* Continuity is the point.

### D4 — Founder review gate before each D-ticket

**Process, not engineering:** D1, D2, and D3 each ship behind a feature flag. Founder approves visual treatment per ticket. The "too gimmicky" risk lives entirely in how cartoonish IQ feels — that's a design choice the founder fully controls. The flag-gated rollout means each D-ticket can be reverted in seconds if the visual feedback isn't right.

---

## 8. Phase 5 — Negotiation assistant (re-sequenced)

The previous plan in [NEGOTIATION_ASSISTANT.md](./NEGOTIATION_ASSISTANT.md) is now correctly positioned as the *post-conviction tool* — what users reach for after the activation arc has hooked them and they're already going to make an offer. Higher value per use, lower frequency, narrower audience. The earlier plan's six tickets (N1–N6) are re-sequenced as follows:

| Ticket | New status |
|---|---|
| **N1 — Pre-call checklist** | ✅ Promoted into P5. Ships alongside or right after P3. Standalone valuable. |
| **N5 — Outcome capture + 24-hr recap email** | ✅ Promoted into P5. Ships with N1 as a paired release ("better script + follow-up"). |
| **N6 — Telemetry events** | ✅ Promoted; ships before N1 so launch metrics are captured. |
| **N2 — Live-call companion (full prompter)** | ⏸ Deferred. Reconsider after P2 + P3 data show whether users want depth or breadth at this moment. |
| **N3 — Counter-offer triage** | ⏸ Deferred with N2. |
| **N4 — Re-pitch backend endpoint** | ⏸ Deferred with N2. |

**Why the re-sequence:** the original plan front-loaded the heavy live-call companion (~3 weeks of work) before validating that users wanted in-product help during the call vs. after. The activation arc tells us that the upstream freeze (engagement at first verdict view) is bigger than the downstream freeze (mid-call pivoting). Solve the upstream first; let downstream demand tell us if the live companion is actually wanted.

**IQ as the negotiation voice:** once P4 has shipped and IQ is established as the through-line, the pre-call checklist (N1) and the recap email (N5) are voiced as IQ. *"IQ's pre-call checklist."* *"IQ's recap email."* This is why P5 sits after P4 in the sequence — P4 establishes the brand, P5 inherits it.

---

## 9. Explicit non-goals

Listed so future scope creep is easy to spot.

- **No creative-finance in the headline.** Seller financing, Sub2, wraparound, Morby Method, and similar major-cooperation structures never appear as the P0 headline. They surface as Four Paths cards or as contextual downpayment-reducers (E3) — never as the recommended primary structure. Reason: these structures have low seller-acceptance probability; presenting them as the primary recommendation hides that friction behind math.
- **No lab / training / course mode.** Aspiring investors show up wanting hope, not training. Lab misreads the entry mood.
- **No freeform LLM in IQ v1.** Curated, traceable Q&A only. Freeform answers introduce regulatory exposure (creative finance + first-time investors is a sensitive combination) and undermine the source-attribution that makes IQ trustworthy.
- **No call recording, microphone access, or transcription** in any negotiation feature. The product never listens to the seller.
- **No "negotiate for me" or autopilot mode.** The user always speaks the words.
- **No new offer structures invented by IQ or by P0.** The engine has 9 templates plus the new conventional-headline blend; IQ explains and pivots between them.
- **No fabricated headline.** When `headline_structure` is `None`, we say so. We do not invent a deal that doesn't mathematically work.
- **No predictive claims about seller psychology.** Marketing voice can be aspirational; product copy says *"this is the smallest set of conventional moves that makes the math work"*, not *"the seller will accept this."*
- **No cartoon IQ mascot.** The existing brand-mark icon, a small chip, and a labeled voice. No face, no body, no first-person feelings.

---

## 10. Code conventions (link to existing doctrine)

All work in this plan follows the conventions defined in [FOUR_PATHS.md §4](./FOUR_PATHS.md). Critical reminders:

- **Backend owns all calculations.** The headline blend (E1) and sandbox math (B2) are server-side; the frontend renders pre-computed numbers.
- **Pure functions for templates and recompute paths.** No I/O, no `datetime.now()`. The `headline_conventional_blend` template is held to the same standard as the shipped 9.
- **5th-grade copy doctrine.** Every IQ answer, sandbox label, headline-card copy, and reframe header passes the same test as Four Paths narrative.
- **Mobile-first stack order.** Headline card and sandbox are mobile-thumb-friendly; large tap targets; vertical column under 768px.
- **Honest gating.** When the headline blend or a sandbox configuration produces no viable structure, say so. No fabricated paths.
- **Attorney disclaimer on financing/strategy_switch/blended families** — preserved on every Four Paths card and in any IQ answer that names those structures. The conventional-headline family does **not** require the disclaimer (it's a price-negotiation + larger-down + rent-validation blend; nothing requires the seller to do anything beyond a normal contract).
- **Telemetry naming.** All events follow the `<area>_<verb>` pattern in [eventTracking.ts](../../frontend/src/lib/eventTracking.ts).

---

## 11. Telemetry & KPIs

### 11.1 New events

| Event | Phase | Properties |
|---|---|---|
| `headline_structure_rendered` | P0 | `family`, `market_temperature`, `price_ceiling_used`, `has_cash_shortfall` |
| `headline_structure_null` | P0 | `reason` |
| `downpayment_reducer_promoted` | P0 | `from_family`, `shortfall_pct` |
| `sandbox_engaged` | P2 | `started_from: 'headline' | 'baseline'`, `entry_gap_pct` |
| `sandbox_slider_moved` | P2 | `slider`, `direction`, `gap_after` |
| `sandbox_gap_closed_to_tier` | P2 | `from_tier`, `to_tier` |
| `sandbox_applied_in_strategy` | P2 | `adjustments_count`, `final_gap_pct` |
| `iq_chip_opened` | P3 | `from_panel` |
| `iq_question_viewed` | P3 | `category`, `question_id` |
| `iq_modal_closed` | P3 | `questions_viewed_count`, `time_open_ms` |
| (P4 events scoped per D-ticket) | P4 | — |
| (P5 events from NEGOTIATION_ASSISTANT N6) | P5 | — |

### 11.2 The activation funnel

| Stage | Metric | What we learn |
|---|---|---|
| Verdict view | % of users who reach a verdict page | Top-of-funnel; existing |
| Headline rendered | % of verdicts where `headline_structure` is non-null | How often does the engine actually find a conventional path? Calibration signal — too low means the ceiling needs widening or the rent heuristic needs work. |
| Sandbox engagement | % of verdict views where ≥1 slider moves | Did the inversion work? Are users moving from "verdict" to "agency"? |
| Gap closed in sandbox | % of sandbox sessions that reach a tier of "Near Deal" or better | Did they feel the win? |
| Apply in Strategy | % of sandbox sessions that hand off to Strategy | Did the win convert to depth engagement? |
| Downpayment-reducer engagement | % of cash-shortfall users who tap the promoted financing card | Is the seller-financing-as-optimization reframe actually landing? |
| IQ opened | % of Four Paths views with IQ chip opened | Is IQ wanted? (P4 gate) |
| Pitch script opened | (existing) | Existing Four Paths conversion metric — re-baseline against the new flow |

### 11.3 Calibration signals worth watching

- **`headline_structure_null` rate.** Above ~25% means the ceiling or rent heuristic is too tight; widening would surface more deals honestly. Below ~5% means we may be over-promising — sanity-check the math against real properties.
- **Sandbox `started_from: 'headline'` vs. `'baseline'` engagement.** Direct test of the architectural reframe: do users engage more when they start at a working deal?
- **Pitch-script open rate before vs. after P0.** The headline-card prominence may pull attention away from the Four Paths cards. Re-baseline so we can tell if Four Paths engagement actually *improves* (because users now see the cards as alternatives to a working deal) or *drops* (because users feel the headline is enough).

### 11.4 The qualitative signal that justifies P4

The decision rule is in C3: ≥15% IQ engagement within 30 days unlocks P4. Below 5% retires the IQ-character idea entirely (P3 stays as a useful FAQ; P4/P5-as-IQ-voiced get cut). 5–15% is a "iterate on content first" zone.

---

## 12. Concept-to-action summary

| Concept from brainstorm | Actionable item | Phase |
|---|---|---|
| Motivating conclusion = computed conventional structure (not just framing) | E1 `headline_conventional_blend` template + E2 engine integration + E4 verdict component | P0 |
| Headline must use only buyer-side + minor-price levers (price, rent, larger down) | E1 locked-lever set | P0 |
| Price-cut ceiling is market-aware, with 5% flat fallback | E1 algorithm using `ctx.market_temperature` | P0 |
| Seller financing reframes from basis to optimization | E3 cash-shortfall detector + downpayment-reducer copy override | P0 |
| Honest gating: no plausible structure → no headline | E2 `headline_structure: None` fallback to existing tier system | P0 |
| Deal Gap is discouraging at the *price-only entry*, not by nature | P0 supersedes — the entry now leads with a structure, not a price gap. A3 audits the result. | P0 + P1 |
| Four Paths reframes from "answer" to "alternatives to the headline" | A1 (header copy, contextual to E2 headline presence) | P1 |
| Personalization is built but invisible | A2 surfaced personalization line | P1 |
| User-driven micro-adjustments close the gap | B1–B5 mini-sandbox on verdict, **pre-set to the headline structure** | P2 |
| Strategy stays as earned depth, not the next click | B3 "Apply in Strategy" CTA, gated on slider movement | P2 |
| Founder's "Make it a Deal" gamification — keep the motion, decide the label | B5 naming decision | P2 |
| IQ as labeled voice attached to specific moments | C1–C3 then D1–D4 | P3 → P4 |
| Knowledge base is the lowest-risk first IQ test | C1–C3 curated Q&A from the three reference docs | P3 |
| Negotiation assistant is post-conviction, not headline | P5 promotes N1 + N5; defers N2/N3/N4 | P5 |
| Lab / training mode is not the right shape for this audience | Listed in §9 non-goals | n/a |
| Gimmicky risk is real for marketing, not for product | D4 founder review gate per D-ticket; §9 non-goals lock the visual constraints | P4 |

---

## 13. Execution roadmap — step by step

The order to actually do this. Each step is a discrete unit of work. Dependencies and parallel tracks are noted. Effort estimates are rough engineering days assuming one focused engineer; calendar time will run longer.

### Sprint 1 — P0 architectural foundation (~5 engineering days)

**Goal:** every verdict view leads with a computed conventional structure when one exists. Telemetry captures the rendered/null rate from day one.

1. **Wire up telemetry scaffolding** *(XS, ~½ day)*
   Add `headline_structure_rendered`, `headline_structure_null`, `downpayment_reducer_promoted` event names to [eventTracking.ts](../../frontend/src/lib/eventTracking.ts) with their property schemas. Empty implementations are fine — handlers fire from later steps.
   *Why first:* baseline metrics captured from the moment user-visible work ships.

2. **Build the `headline_conventional_blend` template (E1)** *(M, ~1.5 days)*
   New file: `backend/app/services/deal_structures/templates/headline_conventional_blend.py`. Locked three-lever algorithm with market-aware ceiling using existing `ctx.market_temperature`. Pure function; follows the existing template conventions exactly.
   *Dependency:* none.

3. **Test the template** *(S, ~½ day)*
   New file: `backend/tests/test_headline_conventional_blend.py`. Cases: cold/neutral/hot markets, low/high rent, profile cash variations, the `None` failure case. Numbers must match what `rent_uplift` and a manual price-negotiation calc produce given the same inputs.
   *Dependency:* step 2.

4. **Engine integration (E2)** *(S, ~1 day)*
   Add `headline_structure: DealStructure | None` and `cash_shortfall: float | None` to `DealStructuresPayload`. Modify `compute_deal_structures` in `engine.py` to run the new template separately from the existing selector cascade. Existing 4-path selector continues unchanged.
   *Dependency:* steps 2, 3. *Acceptance:* every existing engine test still passes.

5. **Cash-shortfall + downpayment-reducer copy override (E3)** *(S, ~1 day)*
   Add `as_downpayment_reducer(ctx, shortfall)` helper to `seller_second_zero_balloon.py`, `sub2.py`, `morby_method.py`. Selector elevates one financing card with overridden headline/selection-reason copy when `cash_shortfall > 0`. Math identical in both modes; only copy differs.
   *Dependency:* step 4.

6. **Frontend `HeadlineStructureCard` component (E4)** *(S, ~1 day)*
   New component: `frontend/src/components/iq-verdict/HeadlineStructureCard.tsx`. Wire into [VerdictGapGuidance.tsx](../../frontend/src/components/iq-verdict/VerdictGapGuidance.tsx) above the Four Paths panel. Honest-fallback: when `headline_structure` is null, the card region collapses and existing tier behavior renders unchanged.
   *Dependency:* step 4. *Acceptance:* mobile (375px) and desktop both treat the headline card as the visual hero.

7. **Reframe Four Paths header (A1)** *(XS, ~1 hour)*
   Single conditional line of copy in [FourPathsPanel.tsx](../../frontend/src/components/iq-verdict/FourPathsPanel.tsx). With headline present: *"Other ways to close this gap on this property."* With headline null: *"Four ways investors approach properties like this."*
   *Dependency:* step 6.

8. **Layout audit (A3)** *(XS, ~½ day)*
   Screenshot review on mobile + desktop. Confirm motivating label is hero, headline card prominent, Deal Gap chip renders below as the credibility layer. No engineering changes if doctrine holds.
   *Dependency:* step 7.

### Sprint 2 — Calibration window (1–2 weeks of data, not engineering)

**Goal:** validate P0 is honest before stacking more on top.

9. **Monitor `headline_structure_null` rate.**
   - ≥25% null → ceilings too tight; widen and redeploy. *Action:* edit the constants in `headline_conventional_blend.py`, ship, re-measure.
   - ≤5% null → may be over-promising. *Action:* hand-check the math on ~10 properties Brad knows well. Sanity-confirm before continuing.
   - 10–20% null is the honest-gating sweet spot.

10. **Monitor pitch-script open rate vs. pre-P0 baseline.**
    Did the headline pull attention away from Four Paths cards, or did users engage *more* with alternatives once they saw a working deal? Either answer is informative — it shapes the framing emphasis in Sprint 3.

### Sprint 3 — Activation layer: P1 + P2 (~5 engineering days)

**Goal:** users land on a working deal, adjust it to fit their budget, optionally hand off to Strategy.

11. **Personalization line (A2)** *(S, ~1 day)*
    Surface user-profile assumptions above the Four Paths panel. Honest fallback when not customized; route "Customize" to existing profile UI.
    *Dependency:* none. Could also ship during Sprint 1 if bandwidth allows.

12. **Sandbox naming (B5)** *(decided — "Build Your Deal")*
    Component is labeled "Build Your Deal" in the UI and any marketing references. No further action; flagged here so the design lock is unambiguous.

13. **Backend sandbox endpoint (B2)** *(M, ~2 days)*
    `POST /api/v1/analysis/sandbox` — pure function `recompute_gap(ctx, adjustments)`. Target ≤100ms p95.
    *Dependency:* step 4 (engine integration).

14. **Sandbox slider component (B1)** *(M, ~2 days)*
    New component, mobile-first, four sliders **pre-set to the headline structure values**. Live tier transition as gap closes. "Reset to headline" affordance (not "reset to original").
    *Dependency:* steps 6, 13.

15. **Apply-in-Strategy handoff (B3)** *(S, ~1 day)*
    Extend existing `scenarioPayload.ts` to carry sandbox adjustments. CTA appears only after slider movement.
    *Dependency:* step 14.

16. **Persisted sandbox session (B4)** *(S, ~½ day)*
    localStorage, 30-day TTL, matches existing dismissal-state pattern.
    *Dependency:* step 14.

### Sprint 4 — IQ knowledge base (P3) (~3 engineering days + ~3 days content work)

**Goal:** lowest-risk test of the IQ-as-character idea. Can run in parallel with Sprint 3 (no engineering dependencies on the sandbox).

17. **Curate Q&A content set (C2)** *(content work, ~2–3 days)*
    Pull answers from the three reference docs. 5th-grade reading-level pass. Source attribution per answer. This is the slow part — content, not code.
    *Can start any time, including during Sprint 1.*

18. **Ask IQ chip + modal (C1)** *(S, ~1 day)*
    New component + knowledge-base file. Reuses existing brand-mark icon. Renders below Four Paths cards.
    *Dependency:* step 17 ready.

19. **IQ telemetry (C3)** *(XS, ~½ day)*
    `iq_chip_opened`, `iq_question_viewed`, `iq_modal_closed`.
    *Dependency:* step 18.

### Decision gate — IQ engagement review (30 days after Sprint 4)

20. **Review IQ engagement data.**
    - ≥15% of Four Paths viewers opened IQ → proceed to Sprint 5 (P4).
    - 5–15% → iterate on the Q&A content set; re-evaluate gate in 30 more days.
    - <5% → retire the IQ-character expansion. P3 stays as a useful FAQ. Skip Sprint 5 entirely.

### Sprint 5 — IQ as through-line (P4) [conditional, ~3 engineering days]

**Goal only if step 20 passes:** IQ becomes the labeled voice across the activation arc's freeze points.

21. **Set up D4 founder-review feature flags.**
    Each D-ticket ships behind its own flag; founder approves visual treatment per ticket; revertable in seconds.

22. **IQ on the motivating moment (D1)** *(S, ~1 day)*
    Chip beside headline structure card; opens explanation with 3-bullet reasoning.

23. **IQ nudges in the sandbox (D2)** *(S, ~1 day)*
    State-triggered phrase library; no LLM. Includes the cash-shortfall nudge.

24. **IQ reframe on Four Paths header (D3)** *(XS, ~1 hour)*
    Add IQ icon to existing header copy.

### Sprint 6 — Negotiation assistant slice (P5) (~3 engineering days)

**Goal:** post-conviction tools — pre-call prep + recap email. Independent of the IQ gate; could ship in parallel with Sprint 4 if bandwidth allows.

25. **Negotiation telemetry (N6)** *(XS, ~½ day)*
    Ship before N1 to capture launch window cleanly.

26. **Pre-call checklist (N1)** *(S, ~1.5 days)*
    Extend [PitchScriptModal.tsx](../../frontend/src/components/iq-verdict/PitchScriptModal.tsx) with a checklist section: walk-away price pre-fill, diagnosis questions, attorney-review reminder on creative-finance families.

27. **Outcome capture + 24-hr recap email (N5)** *(M, ~2 days)*
    Outcome chip selector. Auto-drafted recap email body via existing `mailto:` flow. Schema additions to the property's `DealMakerRecord` to persist negotiation state. Integration with existing `UpcomingTasks` for the "schedule 30/60/90-day follow-up" path.

### Sprint 7+ — Re-evaluation

28. **Decide on N2/N3/N4 (deferred live-call work).**
    After P5 has run 4+ weeks, look at: pitch-script repeat-open rate, recap-email engagement, and any qualitative feedback. Only build the live-call companion if data shows users want in-product help *during* the call. The activation funnel should answer this without guessing.

---

### Total scope at a glance

| Sprint | Engineering days | Calendar time | Dependency on prior |
|---|---|---|---|
| 1 — P0 foundation | ~5 days | ~1–1.5 weeks | none |
| 2 — Calibration | 0 | 1–2 weeks (data) | Sprint 1 shipped |
| 3 — Activation | ~5 days | ~1–1.5 weeks | Sprint 1 |
| 4 — IQ KB | ~3 eng + ~3 content | ~1 week | none (parallelizable with 3) |
| Gate — IQ engagement | 0 | 30 days (data) | Sprint 4 shipped |
| 5 — IQ through-line *(conditional)* | ~3 days | ~1 week | Sprint 4 + gate passed |
| 6 — Negotiation slice | ~3 days | ~1 week | none (parallelizable with 4) |

**Realistic total to ship P0 + P1 + P2 + P3 + P5:** ~16 engineering days over 4–6 calendar weeks (with calibration windows). P4 adds ~3 more days if the gate passes.
