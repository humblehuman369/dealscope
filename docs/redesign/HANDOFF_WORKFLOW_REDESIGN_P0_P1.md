# HANDOFF: Workflow Redesign, Phase 0 and Phase 1

Date: September 13, 2026
Repo: ~/Projects/dealscope (GitHub humblehuman369/dealscope). Frontend is Next.js in `frontend/`, backend on Railway in `backend/`.
Runs in: Claude Code or Cursor, with the local repo. Read this whole file before touching code.
Owner: Brad Geisen. Questions go to Brad, not to guesses.

## 0. Ground rules

Think first. State your assumptions. If something is unclear, ask, and present the interpretations you see rather than picking one silently. If a simpler path exists, say so.

Simplicity. The minimum code that solves the task. No speculative features, no unrequested abstractions, no new libraries.

Surgical changes. Touch only what a task needs. Match the existing style. Do not refactor unrelated code. Remove only the orphans your own change created.

Goal-driven. Every task below has acceptance criteria. Say your plan for any multi-step task before you start it, and check the criteria before you call it done.

Product rules that override everything else in this file:

1. The Workbench calculation is the single source of truth. Every number on every new screen reads from the computed plan object the Workbench produces. Never copy the engine, never re-derive a number in a component. The JavaScript model inside the mockup file reproduces the worksheet formulas so the mockup can run; it is a reference for what screens should show, not code to port.
2. No fake data. Nothing ships with placeholder numbers, sample contacts, or invented statistics. Unfinished content gets a status pill (Updating, Coming Soon, In Development, Analysis in Progress).
3. Copy is locked once approved. Approved strings stay as they are. New strings in Section 5 are proposed and need Brad's approval before the flag goes past Brad's own account.
4. Everything in Phase 1 ships behind a flag. Nothing changes for users until Brad turns it on.

## 1. What we are building

One path with five stops: Find, Discovery, Plan, Work, Track. Each screen answers one question, says the answer first, puts the math one click below, and ends with the next move. Phase 1 builds the two stops that change most, Discovery and Plan, and renames the property tabs to Discovery, Plan, Math, Work. Phase 2 (a separate handoff) wires Deal Path into the Work stop.

## 2. Inputs to read before starting

1. `docs/redesign/WORKFLOW_REDESIGN_PLAN.md`: the full plan. Sections 4, 5.3, 5.4, 8, and 11 matter most for Phase 1.
2. `docs/redesign/MOCKUPS.html`: the clickable mockup. Open it in a browser. Screen 1 is Discovery, screen 2 is Plan with the Tune drawer, screen 3 is Work (Phase 2, reference only). Match the layout, the order of cards, and the copy. Match the type scale and shapes in Section 6 of this file, not pixel positions.
3. `docs/marketing/TRACKING_PLAN.md` and `frontend/src/lib/eventTracking.ts`: the event names and the fan-out. New events go in both.
4. `HANDOFF_AI_ACTION_PLAN.md` in `docs/`: Deal Path. Phase 1 does not call it, but the Plan page's Start working this deal button is where Phase 2 will.
5. The Sept 7 trust audit (`DealGapIQ_Trust_Conversion_Audit_v2.md` in the project files) if you need the history of why narrative numbers must equal worksheet numbers.

If any of these files is missing from `docs/redesign/`, Task P0-1 creates it. Brad supplies the plan and mockup files.

## 3. Phase 0: Ground (week 1)

### P0-1. Put the spec in the repo

Create `docs/redesign/` and add `WORKFLOW_REDESIGN_PLAN.md`, `MOCKUPS.html`, and this file as `HANDOFF_P0_P1.md`. Commit on a branch named `redesign/phase-0`.

Acceptance: the three files are in the repo, `MOCKUPS.html` opens from disk and all three screens click through, and the branch is pushed.

### P0-2. Funnel events

First confirm whether `feat/ga4-tracking` has been merged to `main`. On Sept 7 it had not. If it has not, tell Brad before adding events, because the new events should land on top of that branch's fan-out, not beside it.

Add these events to `eventTracking.ts` and to the table in `docs/marketing/TRACKING_PLAN.md`. Names are lowercase with underscores. Do not invent other names.

| Event | Fires when | Properties |
|---|---|---|
| card_opened | A map-search property card opens | property_id, property_state, days_on_market, price_cuts |
| property_watched | Watch is pressed on a card or property | property_id, property_state, plan |
| verdict_viewed | Already exists. Confirm it fires when the new Verdict card renders, once per property per session | as today, plus call (worth_pursuing, only_with_terms, walk_away) |
| plan_built | An option, blend, or tuned plan is applied on the Plan page | property_id, option (1, 2, 3, 4, blend, custom), targets_met (0 to 4), plan |
| deal_started | Start working this deal creates a pipeline deal | property_id, deal_id, option, targets_met, plan |
| task_completed | A checklist task is checked (Phase 2 fires it; define now) | deal_id, task_id, stage, is_first_for_deal |
| draft_used | A Draft it drawer is opened (Phase 2) | deal_id, draft_kind |
| offer_sent | The Send the offer task completes (Phase 2) | deal_id, offer_price |
| deal_closed | A deal moves to Owned | deal_id, days_in_pipeline |
| alert_opened | A watchlist alert is opened (Phase 4) | alert_kind |
| digest_opened | A weekly digest email is opened (Phase 4) | area |

Rules: send `property_id` and `property_state`, never the street address. `plan` is the tier (starter, pro). Keep the GA4 renames from the tracking plan as they are; `verdict_viewed` still maps to `analysis_run` in GA4. Add unit tests in the same style as the existing ones.

Acceptance: a test session on preview shows `card_opened`, `property_watched`, `verdict_viewed`, and `plan_built` in PostHog's live events with the properties above. Events defined for later phases exist in code and the tracking plan but do not fire yet. Existing tests pass.

### P0-3. One number for each claim

Today the homepage shows $34.99 a month while the app stores show $39.99. Buyer counts show 2,812 in one place and 2,900 in another. Source counts show 5 and 6. Speed shows 15 seconds, 60 seconds, and "seconds."

Create one module, `frontend/src/lib/claims.ts` (or the nearest existing constants file if one already serves this purpose; do not create a second), that exports each claim from the system that owns it:

1. `BUYER_COUNT`: the row count of the cash buyer directory (`src/data/buyers.json` or wherever the directory reads from), formatted as the count itself, not a rounded marketing number.
2. `LENDER_COUNT`: same, from the lender directory.
3. `SOURCE_COUNT`: the length of the data-source list Discovery actually renders (5 in the Sept 13 screenshot).
4. `PRO_MONTHLY_PRICE`, `PRO_YEARLY_PRICE`: from the same config the checkout uses. If the checkout reads prices from Stripe, read from there. Brad confirms which price is right; the code must not carry two.
5. `SPEED_CLAIM`: one string. Proposed: "under 60 seconds," which is the promise Discovery already makes. Brad approves the phrase.

Then grep the frontend (including marketing pages, pricing, about, methodology, footer, and email templates) for every hardcoded variant: `2,812`, `2,900`, `2812`, `484`, `5 sources`, `6 live`, `six`, `15 seconds`, `60s`, `34.99`, `39.99`, `29.17`. Replace each with the claim module. App store listing copy is manual; list every place it needs to change in your summary so Brad can update it.

Acceptance: the grep finds no remaining hardcoded variants outside `claims.ts` and its tests. The homepage, pricing, about, and methodology pages render identical numbers. Your summary lists the app store copy that Brad must change by hand.

### P0-4. Baseline user test (Brad, not code)

Appendix A has the script. Five investors, one task, thirty minutes each, before Phase 1 ships. The agent does nothing for this task except leave the current product alone until it is done.

### P0-5. Font decision (Brad)

The brand guide names Inter as the app font and DM Sans for landing pages. The plan and mockup use DM Sans everywhere. Brad picks one for both the site and the app. If DM Sans, Task P1-9 changes the font tokens. If Inter, P1-9 leaves the family alone and only fixes where Space Mono is used. Do not start P1-9 until Brad answers.

## 4. Phase 1: Discovery and Plan (weeks 2 and 3)

Flag: `NEXT_PUBLIC_WORKFLOW_V1`. When it is unset or `false`, nothing in Phase 1 renders and all old routes work as today. When `true`, the new tabs, Discovery layout, and Plan layout render. Add a PostHog feature flag `workflow-v1` that the client checks after the env flag, so Brad can later open the redesign to a percentage of users without a deploy. Branch: `redesign/phase-1`.

### P1-1. Tabs and routes

Find the property tab bar (today: Discovery, Strategy, Comps, DealMaker, Estimator). Under the flag, render four tabs: Discovery, Plan, Math, Work.

| Old | New home |
|---|---|
| Discovery | Discovery (same route, new layout per P1-4 to P1-7) |
| Strategy (the Strategy Workbench) | Plan (Plan view per P1-8, worksheet in the Tune drawer) |
| DealMaker | Plan. The DealMaker flows become part of the Tune drawer and the Share menu |
| Comps | Math |
| Estimator | Math |
| Data sources panel (on Discovery today) | Math, with a Show the math link from the Verdict card |
| The pipeline deal page | Work. If this property has a pipeline deal, the Work tab shows that deal's page. If not, it shows the No deal yet empty state (copy in Section 5) with one button, Go to the plan |

Old URLs must keep working. Add Next.js redirects (or client-side redirects if routes are dynamic) from the Strategy, Comps, DealMaker, and Estimator routes to the new tabs when the flag is on. List the exact route mappings in your plan message before you build them; Brad confirms.

Every product string that still says DealMaker (known ones: "Open DealMaker for offer scripts" in the Related links on Discovery, "edit in DealMaker" and "Edit financing terms in DealMaker" in the Key Insights) changes to point at Plan. Marketing pages and the glossary keep the DealMaker name in this phase; list where it appears so Brad can decide.

Acceptance: with the flag on, the four tabs render, each old route lands on its new tab, and nothing 404s. With the flag off, the five old tabs render exactly as before. Comps and Estimator content is unchanged inside Math.

### P1-2. Path stepper

Add a small component under the property header: Find › Discovery › Plan › Work › Track. The current step is lit from the route. Find links to the map search, Track links to the dashboard. Discovery and Math both light Discovery. Style per Section 6: 8px corners, not pills.

Acceptance: the stepper shows on all four tabs, the lit step matches the tab, keyboard focus moves through it, and each step has an accessible name.

### P1-3. Property header with photo

The header on all four tabs shows: a 128 by 96 pixel thumbnail of the first listing photo (88 by 66 on phones, `object-fit: cover`, 10px corners, alt text with the address and a one-line description), a "N photos" link under it that opens the existing gallery, the address as the page title, the facts line (city and zip, beds, baths, square feet, year built) in the UI font with tabular numerals, and the status pill (Listed and days on market, or the pipeline stage once a deal exists).

On Discovery, the full-width gallery block that opens the page today moves below the three verdict cards (after Why we think so). The gallery component itself does not change.

Acceptance: the thumbnail renders on all four tabs from the listing's first photo. No image is hardcoded. When a listing has no photos, the slot shows a neutral placeholder with the text "No photos," not a broken image.

### P1-4. Discovery: the Verdict card

The Verdict card is the first card on Discovery. Top to bottom:

1. A small label "The verdict" with a Why? link that toggles a one-paragraph explanation (copy in Section 5).
2. The verdict sentence, 22px, weight 500, from the template in Section 5. Every value in it comes from the Discovery result: list price, Target Buy, Deal Gap, and the seller read.
3. The existing Investment Overview strip (Market Price, Income Value, Target Buy) and the existing gap slider. Keep their components; change the label text under each number to the plain-word labels in Section 5. Market price red, Income Value yellow, Target Buy green, as today.
4. The first-run tips: three one-line tips under the numbers with a Got it button. Show them until the user dismisses them once. Store the dismissal in the user's preferences when signed in and in `localStorage` key `dgiq_tips_seen_v1` when not.
5. The call chip: Worth pursuing, Only with terms, or Walk away, set by the rules in Section 7, read from a config object, never hardcoded in the component. The chip shows an icon and text, never color alone. A Why? link next to it toggles one line naming the gap and the signals that set it.
6. Two buttons: Show the math (ghost, goes to the Math tab) and Build the plan (primary, goes to Plan).

The Verdict card replaces the existing Investment Overview strip, the existing gap slider, and the existing three-number block. It does not sit above them. When the flag is on, those old blocks are not rendered anywhere on Discovery. The gap slider inside the card positions its three markers by value, from the lowest of the three prices to the highest, because Income Value can sit above Market Price (110 Crosswinds Drive: $381,465 against $379,981). Labels must never overlap; when two markers are close, stack one label above the bar.

Acceptance: for 1766 Wandering Willow Way the card shows $625,999, $477,699, $453,814, Deal Gap -27.5%, and the sentence in Section 5 word for word. The old Investment Overview, old slider, and old three-number block do not render with the flag on. The tips show once and stay hidden after Got it, including after reload. The call chip reads its thresholds from config. `verdict_viewed` fires once with the `call` property.

### P1-5. Discovery: How this closes

Second card. The paragraph is the existing "Most likely close" text the engine already writes; promote it out of the DealGap panel unchanged. Under it, the levers as expandable rows: the recommended path first and expanded, then Price, Terms, Income, Equity, collapsed. Each row shows the lever name and two tags instead of the single confidence tag used today:

Tag one, "Closes the gap": yes when the lever alone reaches Target Buy, partly when it does not. Read this from the engine's per-lever numbers (the "to close" amount); do not compute it in the component.

Tag two, "Sellers say yes" for Price and Terms, "Market says yes" for Income, and "You decide" for Equity: often, sometimes, or rarely, mapped from the engine's existing confidence field (Likely to often, Possible to sometimes, Long shot to rarely, Your call to You decide). Brad reviews the Terms value during copy approval; the Sept 7 audit flagged that "Likely" on a large seller carry reads as odds when it means the math closes.

Expanding a row shows the one-line detail the engine already writes ("Ask $172,185 less — buy at $453,814").

Acceptance: five rows, two tags each, values traceable to engine fields. The recommended row is open on load. The Blended Plan modal and option cards are not shown on Discovery anymore; they live on Plan.

### P1-6. Discovery: Why we think so

Third card. The three strongest signals from the existing Key Insights list, one line each, in this priority: days on market, price cuts, occupancy, then distress or expiry flags, then the rest. A "See N more signals" expander shows the remaining insights, including the calibrated-estimate line and the assumptions line, with their existing disclaimers. Numbers stay in the mono font; the explanation stays in the UI font.

Acceptance: exactly three rows visible on load, the rest behind the expander, no insight text changed except the plain-word rewrites Brad approves in Section 5.

### P1-7. Discovery: remove and move

Remove from the Discovery page under the flag: the "What is Discovery?" marketing block, the mid-page "See What Would Work" section (also shown as "This deal passed the screen / Now Prove It"), the second Build my plan button, the line "Sign in only if you want live sliders and saved assumptions," and the Related links row. Also remove, under the flag, the whole first-visit tour: the "Your first deal analysis is done" modal, the six-step walkthrough, and the closing "You've got the workbench. Now work a deal" modal. Do not mount any of the three. The three tips on the Verdict card are the only first-run guidance. The old DealGap panel with its single-tag levers and the old Key Insights list are replaced by P1-5 and P1-6 and must not render alongside them. Move to Math: the Data Sources panel with its source switcher (unchanged), Comps, and the Estimator. Replace the "Email me this Discovery" box with one slim bar after the Why we think so card, shown only to logged-out visitors, with the label and button in Section 5. The email flow behind it does not change.

Acceptance: with the flag on, Discovery is exactly this, top to bottom: header, path stepper, Verdict card, How this closes, Why we think so, the photo gallery, the logged-out email bar. Nothing else. A logged-in user sees no email bar. A logged-out user sees one bar and no sign-in prompt anywhere on Discovery. No modal or tour opens on first visit. The Math tab shows the data sources, comps, and estimator with identical behavior to today.

### P1-8. Plan page: Plan view and Tune drawer

Replace the Strategy Workbench page, under the flag, with a Plan view and a Tune drawer. Everything reads from the computed plan object.

Plan view, top to bottom:

1. "Your plan" card. Title "Your plan: {option name}". The plan sentence from the Section 5 template. Four numbers: Offer price, Cash you bring, Cash flow a month, Cash-on-cash return. A Tune the numbers button that opens the drawer. One line under the numbers: "Gap at asking {gap}%. Gap left: your plan price is {x}% above Target Buy" (or "at or below Target Buy"), with a "Why two gaps?" link and its explanation. This retires the second definition of Deal Gap that the Workbench uses today; the Workbench's own gap readout is relabeled "Gap left."
2. Guide card. Template text, not AI, in this phase. If the applied option is the best option, the card says it is the strongest plan and offers Start working this deal. If not, the card names the applied option's score, names the best option and its score, and offers an Apply button. Best means most targets met, then highest monthly cash flow. Copy in Section 5.
3. Options row. The existing four options plus the engine's blend as a fifth card, if the engine exposes the blend as a plan object (ask Brad if you cannot find it; the "Most likely close: a blend" text implies it exists). Each card shows the option name, its one-line lever, "Meets N of 4," and monthly cash flow. The best card carries a "Guide pick" mark. Tapping a card applies it. The applied card has the accent outline.
4. "Against your targets" table: cap rate, cash-on-cash, cash flow a month, DSCR. This plan, the target, and Meets or Below with a check or cross mark plus text. Targets come from the user's Investment Assumptions; defaults are 6.0%, 8.0%, $300, 1.25. Never color alone.
5. "If this closes" card, six cells from the plan object: purchase price with the amount under or over the list price, equity against the IQ Estimate, cash in, cash flow a month, cash-on-cash, and the seller-carried balance with its due year when there is one. One line under it with the source spread and the IQ Estimate.
6. "Next moves" card: three template lines (Section 5) and the Start working this deal button. In Phase 1 the button runs the existing add-to-pipeline action with stage Analyzing and then opens the Work tab. It does not call Deal Path and shows no meter; both arrive in Phase 2. Logged-out users get the existing magic-link flow first. Next to the button, a Share button that opens a menu with Full Report, Download Excel, and PDF, which are the existing downloads. The Pro trial pitch that sits above the worksheet today moves under this card.

Tune drawer: a right-side drawer on desktop and a full-screen sheet on phones, opened by Tune the numbers. It holds the whole existing worksheet, sliders and inputs unchanged, in four groups: What you'd pay, Your loan payment, What it costs, What you'd earn. All groups start collapsed except the one the applied option touches (price and seller financing for a price cut or creative finance, rent for a rent increase, down payment for more equity). A Reset to {applied option} button and a Done button at the bottom. Any change in the drawer sets the plan to "your own numbers" and re-renders every card above.

Two fixes ride along. The bottom line under the worksheet is computed from the targets table: if the plan meets 0 of 4, it says the plan misses your targets; it never says "the numbers work" when a target is missed. And the cap rate badge in the worksheet cannot show Good when net cash flow is negative.

Acceptance: for 1766 Wandering Willow Way with Option 3 applied, the Plan view shows offer $625,999, cash $143,980, $213 a month, 1.8%, Meets 0 of 4, and the Guide card recommends the blend. Applying the blend shows $500,000, $115,000, and a monthly cash flow and score that match the engine (the mockup computed $817 a month, Meets 4 of 4; if the engine differs, the engine wins and you report the difference). Every number on the Plan view equals the worksheet's number for the same input. The old five-tab Workbench renders unchanged with the flag off. `plan_built` fires on every apply; `deal_started` fires on Start working this deal.

### P1-9. Type and tokens (after P0-5)

If Brad chose DM Sans: set the app UI font to DM Sans in the font tokens (`globals.css` and the `next/font` setup in `layout.tsx`), keeping Inter only where a component explicitly needs it, and list those places. Either way: Space Mono is used only for money and rates. Remove it from dates, counts, bed and bath facts, meters, and labels on the touched screens; those use the UI font with `font-variant-numeric: tabular-nums`. Minimum text size on the touched screens is 13px. Tags and status chips use a 6px radius and colored text on a neutral border; buttons keep the full pill; path steps and people chips use 8px. Pending states are a grey dashed outline, not a yellow pill. No all-caps labels longer than one word.

Acceptance: a visual diff against `MOCKUPS.html` at 1280px and 390px for Discovery and Plan shows the same type scale, shapes, and card order. No text under 13px on the touched screens.

### P1-10. Accessibility on the touched screens

Visible labels on every input (no placeholder-only fields, including the email bar and the drawer inputs). `aria-label` on every icon-only button. Keyboard operation and a visible focus ring on tabs, the stepper, the lever rows, the option cards, and the drawer. Sliders keep their paired number inputs and announce their value. Contrast 4.5:1 or better for all text. Touch targets 44px on phones. `prefers-reduced-motion` disables the drawer slide and the slider fill animation. The gap slider has a text description for screen readers.

Acceptance: Lighthouse accessibility 90 or better on Discovery and Plan with the flag on. axe reports no serious or critical issues.

### P1-11. Tests

Unit tests for: the verdict sentence template, the call rules (each branch of Section 7), the option score function against the targets, the plan sentence template, and the claims module. Use the Sept 13 worksheet values for Option 3 as fixtures (annual cash flow $2,552, cap rate 4.84%, cash-on-cash 1.77%, DSCR 1.09). Keep the existing Workbench tests untouched.

Acceptance: all tests pass locally and in CI.

### P1-12. Rollout

1. Flag on in Brad's account on preview. Screenshots of Discovery, Math, Plan (Option 3 and blend applied, drawer open and closed), and the Work empty state at 1280px and 390px, attached to the PR.
2. PostHog live events checked for `verdict_viewed` with `call`, `plan_built`, and `deal_started`.
3. Brad approves the Section 5 copy.
4. PostHog flag `workflow-v1` to 20% of signed-in users for two weeks. Compare `plan_built` per `verdict_viewed` and `deal_started` per `plan_built` between the two groups. Session replays on Discovery and Plan reviewed weekly.
5. 100% when the new group is not worse on either ratio and no P0 bugs are open.

## 5. Copy

Strings marked (approved) exist in the product today and do not change. Strings marked (new) need Brad's approval before rollout past his account.

Verdict sentence template (new):
"Listed at {list_price_short}. Worth about {target_buy_short} to you as a rental. That is a {gap}% gap. {seller_read}"
Example: "Listed at $626K. Worth about $454K to you as a rental. That is a 27.5% gap. After 10 price cuts and 224 days, this seller will most likely take a smaller price cut plus a small seller-carried second."
Off-market branch: when the property is not listed for sale, the first sentence is "Not for sale. Valued at {market_value_short}." instead of "Listed at {list_price_short}." and the red number's label reads "Market price. What it would likely sell for." (110 Crosswinds Drive is off-market; "Listed at $380K" is wrong there.)
`seller_read` is generated from the same signals and lever choice the engine uses for "Most likely close." Rule: name the two strongest signals, then the recommended path in plain words. If the engine recommends Price alone: "this seller will most likely take a real price cut." Terms alone: "this seller will most likely carry part of the price." Blend: as in the example. If there are no motivation signals: "This seller has shown no sign of moving yet."

Number labels (new): "Market price. What it is listed for." "Income value. The most you can pay and still break even." "Target buy. The price that pays you. Aim here."

First-run tips (new): "First time here? The red number is the market price." "The yellow number is where rent just covers the costs." "The green number is the price that pays you. A bigger gap means more room to make a deal." Footer: "These three tips show once." Button: "Got it".

Calls (new): "Worth pursuing" "Only with terms" "Walk away".

Why? on the verdict (new): "Target Buy is the price where this house pays you at the standard terms: 20% down, 6.0%, 30 years, 4% vacancy. The seller read comes from the signals below. Every number here is the worksheet's number."

How this closes paragraph (approved, from the engine): "Most likely close: a blend. 10 price cuts already: a modest price cut plus a small seller-carried second is the most probable close. Sellers concede a little on several things far more readily than a lot on one."

Lever tags (new): "Closes the gap: yes" "Closes the gap: partly" "Sellers say yes: often" "Sellers say yes: sometimes" "Sellers say yes: rarely" "Market says yes: rarely" "You decide".

Signals card title (new): "Why we think so". Expander: "See {n} more signals".

Email bar (new): "Save this verdict. Email me the numbers." Button: "Email me". Note under it: "One email. No account."

Buttons (new): "Show the math" "Build the plan" "Tune the numbers" "Start working this deal" "Share" "Apply the blend" "Apply option {n}" "Reset to {option}" "Done" "Go to the plan".

Plan sentence template (new): "{structure}. You bring {cash}. It pays you {cash_flow} a month. That meets {n} of your four targets."
Structures: Option 1 "You buy at {price} and prove a rent of {rent} a month." Option 2 "You negotiate the price down to {price}." Option 3 "Option 3 keeps the price at {price} and has the seller carry {seller} at {rate}%." Option 4 "You buy at {price} and put {down}% down." Blend "You buy at {price} with the seller carrying {seller} at {rate}%, paid in full in year {balloon_year}." Custom "Your own numbers: buy at {price}{ with the seller carrying {seller} at {rate}%}."
Negative cash flow: "You would feed it {amount} a month." Zero targets: "That misses all four of your targets." Four: "That meets all four of your targets."

Guide card (new): strong case "This is the strongest plan the levers make. It meets {n} of 4 targets and pays {cash_flow} a month. Start working it." Compare case "{applied} meets {n} of 4 targets. {best} meets {m} of 4: {best_lever}. That pays {cash_flow} a month, a {coc}% cash return." Link: "Where do these numbers come from?" with "Each option is run through the worksheet with your standard terms and scored against your Investment Assumptions. The Guide only reads the worksheet. It never adds a number the worksheet did not compute."

Options footer (new): "Scores use your Investment Assumptions: {cap}% cap rate, {coc}% cash-on-cash, {cf} a month, {dscr} DSCR. Change them in your profile and every score updates."

Targets table (new): "Against your targets" with columns Measure, This plan, Your target, Result; results "Meets" and "Below" with a check or cross.

If this closes (new): "If this closes"; cells "Purchase price, {amount} under the list price." "Equity on day one, against the IQ Estimate of {value}." "Cash in: down payment and closing costs." "A month, after every cost and the loan." "Cash-on-cash return in year one." "Owed to the seller in year {n}. Plan the refinance or the payoff now." Footer: "Five sources value this house between {low} and {high}. The IQ Estimate is {value}. Tap any number for its source."

Next moves (new): "Call the listing agent. Confirm the seller's situation and float a seller-carried second of {seller} at {rate}%. Script ready." (or, with no seller carry, "Call the listing agent. Confirm the seller's situation before you write the offer at {price}. Script ready.") "Verify the rent. The plan needs {rent} a month. Two local property managers should agree." "Get pre-approval for a {loan} loan. {saved_lender} is already in your contacts. Request drafted." (with no saved lender: "Get pre-approval for a {loan} loan.") "Script ready" and "Request drafted" appear only once Phase 2 ships; in Phase 1 omit those two sentences.

Bottom line (new, replaces the current "The numbers work" line when targets are missed): "This plan meets {n} of your four targets." and when zero: "This plan misses your targets."

Work empty state (new): title "No deal yet"; body "This house is not in your pipeline. Build the plan, then start working it. The checklist, the people, and your next move fill in from the plan."; button "Go to the plan".

## 6. Type scale and shapes

| Element | Size and weight | Font |
|---|---|---|
| Page title (address) | 24px, 600 | DM Sans (heading) |
| Verdict and plan sentence | 21px desktop, 18px phone, 500, line-height 1.4 | Inter |
| Three-number strip | 22px, 600 | Inter, tabular numerals |
| Four-number strip on Plan | 20px, 600 | Inter, tabular numerals |
| Card titles | 16px, 600 | DM Sans (heading) |
| Body | 14px, 400, line-height 1.5 | Inter |
| Secondary lines | 13px | Inter |
| Labels, tags, captions | 13px minimum | Inter, tabular numerals |
| Money and rates anywhere else | inherit size | Inter, tabular numerals |

Fonts decided Sept 16: Inter for all UI and numbers on v1, DM Sans on headings only, Space Mono not used on v1. Sizes and weights reduced so rendered height matches the DM Sans and Space Mono version.

Shapes: buttons are full pills; tags, status chips, and source chips have 6px corners; path steps and people chips 8px; cards 16px; nested tiles 12px. Colored tags use colored text on the neutral border. One glowing card per screen (the Verdict card on Discovery, Your plan on Plan), nothing else glows.

Colors are the existing tokens: `--surface-base #000000`, `--surface-elevated #0C1220`, `--accent-sky #0EA5E9`, `--status-positive #34d399`, `--status-income-value #FACC15`, `--status-negative #f87171`, `--status-warning #fbbf24`, borders `#334155`, text heading `#F1F5F9`, body `#CBD5E1`, secondary `#94A3B8`. Do not use `--text-muted #64748B` for text smaller than 18px; it fails contrast on black.

## 7. Call rules (proposed values; Brad sets the numbers)

Inputs: `gap` (list price versus Target Buy, as a positive percent above Target Buy; 0 or negative means the list price is at or below Target Buy), `signals` (count of: days on market 90 or more, 3 or more price cuts, not owner-occupied, distress flag, expired or withdrawn listing), and `closes` (whether any single lever alone reaches Target Buy).

| Condition | Call |
|---|---|
| list price at or below Income Value (the deal breaks even or better at asking) | Worth pursuing |
| gap at or below 10% | Worth pursuing. A normal negotiation closes it, signals or not |
| gap between 10% and 35% and signals 1 or more | Worth pursuing |
| gap between 10% and 35% and signals 0 | Only with terms |
| gap 35% or more and signals 2 or more | Only with terms |
| gap 35% or more and signals under 2 | Walk away |

Check: 110 Crosswinds Drive (list $379,981, Income Value $381,465, gap 4.6%, no signals) is Worth pursuing. The first build called it Only with terms while the page below said the deal passed the screen. One page, one call.

Keep these in one config object, `verdictRules`, with the thresholds as named constants, so Brad can change 35 and the signal definitions without touching components. Log the inputs with `verdict_viewed` so the rule can be tuned from real data.

## 8. Questions to ask Brad before starting

1. Font: DM Sans app-wide, or Inter (P0-5)?
2. Does the engine expose the blend as a plan object that can be applied like the four options? If not, Phase 1 shows four options and the Guide card describes the blend in words.
3. Where do Investment Assumptions live today, and are the defaults 6.0%, 8.0%, $300 a month, and 1.25?
4. Exact old routes for Strategy, Comps, DealMaker, and Estimator, and whether a server redirect or a client redirect is preferred.
5. The Terms tag value: keep the engine's current confidence mapping, or set Terms to "sometimes" as the mockup shows?
6. Is moving the photo gallery below the verdict cards acceptable, with the header thumbnail always visible?
7. Which price is right, $34.99 or $39.99 monthly, and which system should the claims module read it from?
8. The speed phrase to keep everywhere.

## 9. Out of scope for this handoff

Deal Path wiring, the filled checklist, drafts, the meter on Start working this deal (Phase 2). The Today card and reminders (Phase 3). The Find chip row, card, watchlist, alerts, digest, and homepage trim (Phase 4). Accessibility beyond the touched screens, onboarding beyond the three tips, light-mode token audit (Phase 5). Return loops (Phase 6). Do not start any of these, even if they look adjacent to a Phase 1 task.

## 10. Definition of done

Phase 0: the three docs are in the repo, the events fire on preview, the claims module is the only place a claim number lives, and Brad has the baseline test results.

Phase 1: with the flag on, Discovery, Math, Plan, and the Work empty state match the mockup in order, copy, type scale, and shapes; every number on Discovery and Plan equals the worksheet's number; the old routes redirect; tests pass; Lighthouse accessibility is 90 or better; `verdict_viewed`, `plan_built`, and `deal_started` show in PostHog; screenshots are on the PR; and with the flag off, nothing has changed for users.

## 11. Review of the first V1 build (preview frontend-cs6sprtc1, Sept 13, 2:21 PM)

Read this before continuing. The build added the Verdict card on top of the old Discovery page. Everything else in Phase 1 is still open. The page is now longer than before, which is the opposite of the goal.

| Task | Status | What the preview shows |
|---|---|---|
| P1-1 Tabs and routes | Not done | The five old tabs render (Discovery, Strategy, Comps, DealMaker, Estimator). DealMaker strings remain in Key Insights and the Related links. |
| P1-2 Path stepper | Not done | None. |
| P1-3 Header photo, gallery moved | Not done | The full gallery still opens the page above the verdict. No thumbnail. |
| P1-4 Verdict card | Partly done | Sentence, three numbers, tips, call chip, Show the math, and Build the plan are present and the copy matches Section 5. Missing: the gap slider inside the card (the old slider still sits lower on the page). The call was wrong for this property (Section 7 is corrected). The sentence says "Listed at" for an off-market home (Section 5 has the branch). Show the math has no Math tab to go to yet. |
| P1-5 How this closes | Not done | The old DealGap panel with the old single tags (LIKELY, POSSIBLE, Skip) still renders below the email box. |
| P1-6 Why we think so | Not done | The old Key Insights list renders in full. |
| P1-7 Remove and move | Not done | The email box, the old slider, the data sources panel, the "This deal passed the screen / Now Prove It" block, "What is Discovery?", and the Related links are all still on the page. The old first-visit tour and both of its modals still run, on top of the three new tips. |
| P1-8 Plan page | Not reviewed | No screenshot yet. Send Plan with Option 3 applied, with the blend applied, and with the Tune drawer open. |
| P1-9 Type and tokens | Not done | Old tab bar and old panels unchanged. |
| P1-10, P1-11, P1-12 | Not reviewed | Need the PR: tests, Lighthouse, PostHog events, screenshots. |

Order to finish: P1-7 first (remove and move, including the tour), then P1-5 and P1-6 so the page reads as three cards, then P1-1 and P1-2, then P1-3, then P1-8, then P1-9 and P1-10, then P1-11 and P1-12. After P1-7, send a full-page screenshot of Discovery before doing anything else; it should be three cards, the gallery, and the email bar.

## Appendix A. Baseline user test script (Brad)

Recruit five investors who have not used DealGapIQ. Record the screen and audio. One task: "Find a deal in Wellington, Florida, and tell me what you would offer and what you would do first." Do not help. Note the time from the first search to the moment they say an offer price, whether they reach a plan, whether they can name a first move, and every place they stop, scroll back, or ask a question. Afterward, ask the ten System Usability Scale questions and score them. Write up each session in five lines. The same task and questions run again on the redesign, with five new investors, after Phase 1 is at 100%.
