/**
 * Event tracking — abstraction over Vercel Analytics (and future providers).
 * Use trackEvent() for key conversion and product events.
 * Respects cookie consent: events are only sent when user has accepted analytics.
 *
 * Three Paths (T0.5 / T14): `three_paths_rendered`, `path_pitch_opened`, `path_opened_in_strategy`,
 * `path_card_caveat_viewed`, `path_attorney_link_clicked`, `assumable_pv_displayed`,
 * `morby_method_substituted`.
 * Three Paths (T17): `path_family_dismissed` — fires when the user dismisses a card's
 *   family from the Four Paths panel; the selector applies a ranking penalty on subsequent
 *   verdict requests via the `dismissed_families` payload field.
 *
 * Activation Arc — Phase 0 (Conventional Headline Blend). See docs/feature-plans/ACTIVATION_ARC.md.
 *   `headline_structure_rendered` — fires once per verdict view when a `headline_structure`
 *     is non-null on the payload. Properties: `family` (always 'conventional_headline' in v1),
 *     `market_temperature` ('cold' | 'neutral' | 'hot' | 'unknown'),
 *     `price_ceiling_used` (number, e.g. 0.05), `has_cash_shortfall` (boolean).
 *   `headline_structure_null` — fires once per verdict view when no plausible conventional
 *     structure was found (engine returned None). Properties: `reason` (string —
 *     short machine-readable code, e.g. 'price_ceiling_exhausted', 'rent_floor_unreachable').
 *   `downpayment_reducer_promoted` — fires when a seller-financing-family card is elevated
 *     with a contextual "cut your down payment by $X" headline because the user has a
 *     cash shortfall against the headline structure. Properties: `from_family`
 *     ('financing' | 'strategy_switch'), `shortfall_pct` (number, 0–1).
 *
 * Activation Arc — Phase 2 (Build Your Deal sandbox).
 *   `sandbox_engaged` — first slider movement in a session. Properties:
 *     `started_from` ('headline' | 'baseline'), `entry_gap_pct` (number).
 *   `sandbox_slider_moved` — each slider commit. Properties: `slider`
 *     ('price' | 'monthlyRent' | 'downPaymentPct' | 'sellerCarryAmount'),
 *     `new_value` (string).
 *   `sandbox_gap_closed_to_tier` — fires when the recompute crosses a tier
 *     boundary. Properties: `from_tier`, `to_tier`, `gap_pct`.
 *   `sandbox_applied_in_strategy` — Apply-in-Strategy CTA tapped. Properties:
 *     `adjustments_count` (number).
 *
 * Activation Arc — Phase 3 (IQ Knowledge Base v1).
 *   `iq_chip_opened` — Ask IQ chip clicked. Properties: `from_panel`
 *     (e.g. 'four_paths').
 *   `iq_question_viewed` — a question's answer was rendered in the modal.
 *     Properties: `category` (IQCategory), `question_id` (stable ID from
 *     IQ_KNOWLEDGE_BASE).
 *   `iq_modal_closed` — modal dismissed. Properties: `questions_viewed_count`
 *     (number), `time_open_ms` (number).
 *
 * Activation Arc — Phase 5 (Negotiation slice). See NEGOTIATION_ASSISTANT.md.
 *   `negotiation_checklist_viewed` — pre-call checklist section opens
 *     in PitchScriptModal. Properties: `structure_id`, `family`.
 *   `negotiation_walkaway_set` — user committed a walk-away price in
 *     the checklist. Properties: `structure_id`, `walk_away_price`.
 *   `negotiation_outcome_logged` — user logged the call outcome.
 *     Properties: `structure_id`, `outcome` ('dead' | 'in_play' | 'under_contract').
 *   `negotiation_recap_drafted` — recap email auto-drafted for an in-play
 *     outcome. Properties: `structure_id`.
 */

import { track as vercelTrack } from '@vercel/analytics'
import { hasAnalyticsConsent } from '@/lib/cookieConsent'

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return
  if (!hasAnalyticsConsent()) return
  try {
    const filtered =
      props && Object.keys(props).length > 0
        ? Object.fromEntries(
            Object.entries(props).filter(
              ([, v]) => v !== undefined && v !== null,
            ) as [string, string | number | boolean][],
          )
        : undefined
    vercelTrack(name, filtered)
  } catch {
    // no-op if analytics not loaded or disabled
  }
}

/** Track a page view (path). Vercel Analytics does this automatically; use for SPA-style updates if needed. */
export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') return
  const p = path ?? window.location?.pathname
  if (p) trackEvent('page_view', { path: p })
}
