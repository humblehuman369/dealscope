Generated from code on Sept 14, 2026. The Sept 7 narrative is to be merged in by hand.

Source of names: `frontend/src/lib/eventTracking.ts` (`trackEvent`, `SCAN_EVENTS`, `WORKFLOW_EVENTS`) and every `trackEvent(...)` call site. Fan-out is Vercel Analytics + PostHog; Meta Pixel receives only `verdict_viewed`, `signup_completed`, `checkout_started`, `checkout_completed`. Never send a street address. `plan` is the billing tier (`starter` | `pro`). `verdict_viewed` still maps to `analysis_run` in GA4.

## Scan events (`SCAN_EVENTS`)

| Event | Status | Fires when | Properties |
|---|---|---|---|
| `scan_started` | Firing | Camera opens on `/scan` (`HomeScannerIsland` when the video stream is ready) | `src` (`home_mobile` \| `header` \| `qr_home` \| `qr_dialog` \| `qr_getapp` \| `app`), `plan`, current-page `utm_*` when present |
| `scan_matched` | Defined, not firing | A property is matched (S-4) | `confidence`, `distance_m`, `used_map_picker` |
| `scan_verdict_viewed` | Defined, not firing | Field Card renders (S-4) | `call`, `gap_pct`, `listed_or_offmarket`, `plan` |
| `scan_saved` | Defined, not firing | Save for later succeeds (S-4) | `plan` |
| `scan_emailed` | Defined, not firing | Email report sent (S-4) | `plan` |
| `pro_tour_viewed` | Defined, not firing | Pro Tour starts (S-5) | `panels_seen` (1–4), `skipped`, `trigger` (`scan`) |
| `field_to_desk` | Defined, not firing | A scanned house is opened on a desktop within 7 days (S-6) | `days_since_scan` |

`src` is accepted on `/scan` (and preserved from `/?scan=true` redirects). QR codes encode `src` plus `utm_source=web&utm_medium=qr&utm_campaign=scan`. Never send a street address. `field_to_desk` per `scan_verdict_viewed` is the bridge metric; `trial_start` with `trigger: scan` is the tour metric.

## Workflow events (`WORKFLOW_EVENTS`)

| Event | Status | Fires when | Properties |
|---|---|---|---|
| `card_opened` | Firing | A map-search property card opens (`MapSearchView.openListingCard` → `trackCardOpened`). Same map card in both layouts. | `property_id`, `property_state`, `days_on_market`, `price_cuts`, `layout` (`v1` when the flag is loaded and true, else `legacy`) |
| `verdict_viewed` | Firing | Workflow v1: `VerdictCard` mount, once per property per session. Flag off: Discovery page when address or property id is present and call-rules inputs are ready. | `call` (`worth_pursuing` \| `only_with_terms` \| `walk_away`) in both layouts, `gap`, `signals`, `closes`, `property_id`, `property_state`, `layout` (`v1` or `legacy` from the screen that rendered). Flag off also sends `has_address`, `has_property_id`. |
| `plan_built` | Firing | V1 and old: `StrategyWorkbench.applyPathPatch` (Options 1–4 and the blend). V1 only: Tune drawer Done (`TuneDrawer` → `handleTuneDone` → `emitPlanBuilt('custom')`). Reset and the V1 Option 3 seed pass `{ track: false }` and do not fire. | `property_id`, `option` (`1` \| `2` \| `3` \| `4` \| `blend` \| `custom`), `targets_met` (0–4 from `scoreAgainstTargets` on the worksheet record), `plan`, `layout` |
| `deal_started` | Firing | V1: `StrategyWorkbench.handleStartDeal` on Plan (“Start working this deal”). Old: `SaveCtaSection` `onSave` → `save()` (plain DealVault save). Deduped once per `deal_id` per session so a session cannot fire twice for the same deal. If the old save has no plan applied, `option` and `targets_met` are omitted. | `property_id`, `deal_id`, `plan`, `layout`; `option` and `targets_met` when a plan was applied |
| `task_completed` | Defined, not firing | A checklist task is checked (Phase 2) | `deal_id`, `task_id`, `stage`, `is_first_for_deal` |
| `draft_used` | Defined, not firing | A Draft it drawer is opened (Phase 2) | `deal_id`, `draft_kind` |
| `offer_sent` | Defined, not firing | The Send the offer task completes (Phase 2) | `deal_id`, `offer_price` |
| `deal_closed` | Defined, not firing | A deal moves to Owned | `deal_id`, `days_in_pipeline` |
| `alert_opened` | Defined, not firing | A watchlist alert is opened (Phase 4) | `alert_kind` |
| `digest_opened` | Defined, not firing | A weekly digest email is opened (Phase 4) | `area` |

`verdict_viewed` is not a `WORKFLOW_EVENTS` key; it is a pre-existing `trackEvent` name. The `call` property is on both the Verdict card path and the old Discovery path. `layout` is the screen that rendered (`v1` or `legacy`), not the raw flag, except on `card_opened` which uses the loaded flag. Never send a street address.

Options 1, 3, 4, and the blend aim at break-even plus $25 a month by design, so most plans show $25 a month and 0 of 4 on cash flow; a low `deal_started` per `plan_built` may be investors reading that correctly, not a bug.

## Helpers on `eventTracking.ts`

| Event | Status | Fires when | Properties |
|---|---|---|---|
| `page_view` | Firing | `trackPageView` (SPA path updates) | `path` |
| `activated` | Firing | `trackActivation` the first time a device hits an aha (Four Paths or a directory). Deduped via `dgiq_activated_v1` | `source` |

## Other events that call `trackEvent`

| Event | Fires when | Properties |
|---|---|---|
| `signup_completed` | `RegisterForm`, `RegistrationContent` | `method`, `requires_verification`; page path also sends `plan` |
| `checkout_started` | `UpgradeModal` | checkout context |
| `checkout_completed` | `/checkout/success` | checkout context |
| `property_searched` | Header search, search modal, address CTA, Deal Maker | `source`, sometimes `type` |
| `search_started` | Home hero city search | `search_type`, `source` |
| `verdict_email_captured` | `VerdictEmailCapture` | none (Meta event id) |
| `analysis_limit_reached` | Discovery | `kind` (`free_monthly` \| `anonymous_daily`) |
| `email_verified` | `/verify-email` | none |
| `magic_link_consumed` | `/auth/magic` | none |
| `onboarding_completed` / `onboarding_skipped` | `useOnboarding` | onboarding context |
| `get_app_clicked` | `GetTheAppButton`, `/get-app` | `source`, `platform` |
| `get_app_redirect` | `/get-app` | `platform` |
| `review_prompt_requested` | `useReviewPrompt` | `trigger` |
| `sticky_cta_clicked` | `MobileStickyCta` | `source` |
| `homepage_directory_buyers_click` / `homepage_directory_lenders_click` | `DirectoriesPromoSection` | none |
| `coldlink-scan` / `coldlink-address` / `coldlink-map` / `coldlink-tour` | `DiscoveryColdLanding` | none |
| `map_search_opened` | Location map, photo gallery, location modal | map context |
| `property_map_opened` | `KeyFactsGrid` | map context |
| `property_location_map_opened` | `PropertyAddressBar` | map context |
| `blog_post_viewed` | `BlogViewTracker` | `slug`, `category`, `primary_keyword` |
| `blog_category_viewed` | `BlogViewTracker` | `category` |
| `blog_cta_clicked` | `BlogCtaLink` | `slug`, `cta_position`, `href` |
| `three_paths_rendered` | `VerdictGapGuidance` | path context |
| `three_paths_rendered_in_strategy` | `StrategyWorkbench` | path context |
| `path_opened_in_strategy` | Discovery → Plan handoff | `structure_id`, `family` |
| `path_applied_in_strategy` / `path_cleared_in_strategy` | `StrategyWorkbench` | path context |
| `path_family_dismissed` | `FourPathsPanel` | family context |
| `path_pitch_opened` / `path_pitch_copied` / `path_pitch_printed` / `path_pitch_emailed` | `PitchScriptModal` | `structure_id`, `family` |
| `path_attorney_link_clicked` | `PathOptionCard` | attorney context |
| `assumable_pv_displayed` / `morby_method_substituted` | `FourPathsPanel` | path context |
| `make_it_work_opened` | `MakeItWorkWizard` | `source`, `focus_family?`, `save_only` |
| `make_it_work_step` | `useMakeItWork` | `step`, `answer` |
| `make_it_work_plan_viewed` | `useMakeItWork` | `recommended_family`, `recommended_id`, `path_count`, `cash`, `priority`, `terms` |
| `make_it_work_alternative_selected` | `useMakeItWork` | `family`, `structure_id` |
| `four_paths_detail_expanded` | `FourWaysSection` | `path_count`, `state?` |
| `breakeven_row_expanded` | `BreakevenAnalysis` | `family` |
| `breakeven_narrative_loaded` | `BreakevenAnalysis` | `source`, `way_count` |
| `plan_save_submitted` | `SavePlanForm` | `mode`, `family?` |
| `plan_save_email_sent` / `plan_save_signed_in` | Save / magic-link claim | `family?` |
| `plan_worksheet_opened` | `MakeItWorkWizard` | `family?`, `signed_in` |
| `plan_pro_cta_shown` | `StrategyWorkbench` | `family?` |
| `action_plan_run` | `ActionPlanSlideOver` | `case`, `model`, `searches`, `cost` |
| `tour_shown` / `tour_step_reached` / `tour_skipped` / `tour_completed` | `workbenchTour` | `step` on reach/skip |
| `save_from_close` / `scan_from_close` / `mapsearch_from_close` | `trackTourCloseCta` | none |
| `estimator_preset_selected` / `estimator_line_item_added` / `estimator_line_item_edited` / `estimator_line_item_removed` / `estimator_contingency_changed` / `estimator_condition_changed` / `estimator_tier_changed` / `estimator_mode_switched` / `estimator_estimate_accepted` | `estimatorTracking.ts` | per-helper payload (`preset_id`, `zip_code`, …) |
