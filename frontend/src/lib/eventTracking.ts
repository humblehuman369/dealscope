/**
 * Event tracking — abstraction over Vercel Analytics (and future providers).
 * Use trackEvent() for key conversion and product events.
 * Respects cookie consent: events are only sent when user has accepted analytics.
 *
 * Three Paths (T0.5 / T14): `three_paths_rendered`, `path_pitch_opened`, `path_opened_in_strategy`,
 * `path_attorney_link_clicked`, `assumable_pv_displayed`, `morby_method_substituted`.
 * (Note: `path_card_caveat_viewed` was retired when the caveat became always-visible
 * on path cards instead of an expandable disclosure.)
 * Three Paths (T17): `path_family_dismissed` — fires when the user dismisses a card's
 *   family from the Four Paths panel; the selector applies a ranking penalty on subsequent
 *   verdict requests via the `dismissed_families` payload field.
 *
 * Make It Work wizard (`components/iq-verdict/make-it-work/*`):
 *   `make_it_work_opened`        {source: tile|cta|save_tile, focus_family?, save_only}
 *   `make_it_work_step`          {step: cash|priority|terms|occupancy, answer}
 *   `make_it_work_plan_viewed`   {recommended_family, recommended_id, path_count, cash, priority, terms}
 *   `make_it_work_alternative_selected` {family, structure_id}
 *   `four_paths_detail_expanded` {path_count, state?} — "See the full math"
 *   `breakeven_row_expanded`     {family: price|income|financing|capital_stack} — a way opened
 *   `breakeven_narrative_loaded` {source: ai|template, way_count} — "Your move" arrived
   *   `plan_save_submitted`        {mode: email|authenticated, family?} — the free hook
   *   `plan_save_email_sent`       {family?} — claim accepted (202)
   *   `plan_save_signed_in`        {family?} — claim returned a session for this tab
   *   `plan_worksheet_opened`      {family?, signed_in} — wizard closed into the loaded worksheet
   *   `plan_pro_cta_shown`         {family?} — immediate next-move + trial CTA on first paint
   *   `magic_link_consumed`        — /auth/magic signed the user in (also captured server-side)
 * `activated` fires with `source: 'four_ways'` when the strip renders, replacing the
 * `four_paths` source now that the full panel is collapsed by default.
 *
 * NORTH-STAR FUNNEL (free → paid). Define this funnel in PostHog using these events,
 * in order. Free-to-paid conversion is the north-star metric:
 *   1. `signup_completed`   — account created
 *   2. `verdict_viewed`     — first analysis result seen
 *   3. `activated`          — first "aha": Four Paths viewed or a directory engaged
 *                             (fired once per device via trackActivation(); `source` prop)
 *   4. `checkout_started`   — Pro trial / purchase initiated
 *   5. `checkout_completed` — paid conversion
 * `activated` is the activation milestone the strategic plan calls for; it is the
 * step most predictive of conversion and the primary lever for first-week activation work.
 *
 * META PIXEL: `verdict_viewed`, `signup_completed`, `checkout_started` and
 * `checkout_completed` are also forwarded as Meta standard events (Lead,
 * CompleteRegistration, StartTrial, Subscribe) when the pixel is configured and
 * consented, so paid-social ad sets can optimize on them. See `lib/metaPixel.ts`.
 *
 * BLOG / SEO CONTENT FUNNEL (fired from `components/blog/*`):
 *   `blog_post_viewed`     {slug, category, primary_keyword} — once per post mount
 *   `blog_category_viewed` {category}
 *   `blog_cta_clicked`     {slug, cta_position: inline|end|related|header|index, href}
 * Every blog CTA carries `utm_source=blog&utm_medium=…&utm_campaign={slug}` (see
 * `lib/blog-utm.ts`), so the PostHog funnel blog_post_viewed -> blog_cta_clicked ->
 * verdict_viewed -> signup_completed attributes verdict runs to the post that earned them.
 */

import { track as vercelTrack } from '@vercel/analytics'
import { hasAnalyticsConsent } from '@/lib/cookieConsent'
import { capturePostHog } from '@/lib/posthog'
import { captureMetaPixel, META_STANDARD_EVENTS } from '@/lib/metaPixel'
import { firstTouchEventProps, getMetaClickIds } from '@/lib/attribution'
import { API_BASE_URL } from '@/lib/env'

/** localStorage key marking that the activation milestone already fired for this device. */
const ACTIVATION_FLAG = 'dgiq_activated_v1'

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | undefined>,
  eventId?: string,
): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (!hasAnalyticsConsent()) return undefined
  try {
    // First-touch source (ft_*) rides on every event so conversion events
    // are attributable without touching their call sites. See lib/attribution.ts.
    const merged = { ...firstTouchEventProps(), ...props }
    const filtered =
      Object.keys(merged).length > 0
        ? Object.fromEntries(
            Object.entries(merged).filter(([, v]) => v !== undefined && v !== null) as [
              string,
              string | number | boolean,
            ][],
          )
        : undefined
    vercelTrack(name, filtered)
    // Fan out to PostHog for identity-stitched funnel analysis.
    capturePostHog(name, filtered)
    // Meta Pixel receives only the four funnel events, as standard events,
    // with a shared eventID for CAPI dedupe. See lib/metaPixel.ts.
    const id = captureMetaPixel(name, eventId)
    if (id) mirrorCapiEvent(name, id)
    return id
  } catch {
    // no-op if analytics not loaded or disabled
    return undefined
  }
}

/** POST the same event_id to CAPI so Meta can dedupe browser + server. Never throws. */
function mirrorCapiEvent(name: string, eventId: string): void {
  if (!META_STANDARD_EVENTS[name] || typeof fetch !== 'function') return
  try {
    const ids = getMetaClickIds()
    void fetch(`${API_BASE_URL}/api/v1/leads/capi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: name,
        event_id: eventId,
        event_source_url: window.location.href,
        analytics_consent: true,
        fbp: ids.fbp,
        fbc: ids.fbc,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // no-op
  }
}

/** Track a page view (path). Vercel Analytics does this automatically; use for SPA-style updates if needed. */
export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') return
  const p = path ?? window.location?.pathname
  if (p) trackEvent('page_view', { path: p })
}

/**
 * Fire the `activated` north-star milestone the first time a user reaches an
 * "aha" moment (Four Paths viewed or a directory engaged). Deduped per device
 * so PostHog sees one activation per user. `source` records which surface
 * triggered it (e.g. 'four_paths', 'buyer_directory', 'lender_directory').
 */
export function trackActivation(source: string): void {
  if (typeof window === 'undefined') return
  // Gate on consent BEFORE setting the dedup flag. Otherwise a user without
  // analytics consent would set the flag while trackEvent() silently drops the
  // event — and granting consent later would never record activation because
  // the flag is already present.
  if (!hasAnalyticsConsent()) return
  try {
    if (window.localStorage.getItem(ACTIVATION_FLAG)) return
    window.localStorage.setItem(ACTIVATION_FLAG, '1')
  } catch {
    // localStorage unavailable (e.g. private mode) — fall through and let the
    // event fire; PostHog can still dedupe to first-touch per identified user.
  }
  trackEvent('activated', { source })
}
