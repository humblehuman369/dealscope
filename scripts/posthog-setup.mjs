#!/usr/bin/env node
/**
 * PostHog North-Star setup — creates the funnels, insights, and dashboard
 * described in docs/posthog-north-star-funnel.md via the PostHog management API.
 *
 * Idempotency: this CREATES new objects each run. Run once; re-running makes
 * duplicates. Pass --dry-run to print payloads without calling the API.
 *
 * Required env (management API — NOT the ingest host):
 *   POSTHOG_API_HOST         e.g. https://us.posthog.com (default) or https://eu.posthog.com
 *   POSTHOG_PROJECT_ID       numeric project id (PostHog → Settings → Project ID)
 *   POSTHOG_PERSONAL_API_KEY personal API key with insight + dashboard write scope
 *
 * Usage:
 *   POSTHOG_PROJECT_ID=12345 POSTHOG_PERSONAL_API_KEY=phx_xxx node scripts/posthog-setup.mjs
 *   node scripts/posthog-setup.mjs --dry-run
 */

const DRY_RUN = process.argv.includes('--dry-run')

const API_HOST = (process.env.POSTHOG_API_HOST || 'https://us.posthog.com').replace(/\/+$/, '')
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY

if (!DRY_RUN && (!PROJECT_ID || !API_KEY)) {
  console.error(
    'Missing env. Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY (and optionally POSTHOG_API_HOST).\n' +
      'Or run with --dry-run to preview the payloads.',
  )
  process.exit(1)
}

const CONVERSION_WINDOW_DAYS = 14
const DATE_FROM = '-30d'

const ev = (id, order) => ({ id, name: id, type: 'events', order })

/** Legacy `filters`-format insight definitions (stable across PostHog versions). */
const INSIGHTS = [
  {
    name: 'North-Star — Free → Paid',
    description: 'Signup → verdict → activation → checkout → paid. Headline north-star funnel.',
    filters: {
      insight: 'FUNNELS',
      funnel_viz_type: 'steps',
      funnel_window_interval: CONVERSION_WINDOW_DAYS,
      funnel_window_interval_unit: 'day',
      date_from: DATE_FROM,
      events: [
        ev('signup_completed', 0),
        ev('verdict_viewed', 1),
        ev('activated', 2),
        ev('checkout_started', 3),
        ev('checkout_completed', 4),
      ],
    },
  },
  {
    name: 'Activation — First Touch',
    description: 'Pre-signup allowed: search → verdict → activation. Top-of-funnel activation health.',
    filters: {
      insight: 'FUNNELS',
      funnel_viz_type: 'steps',
      funnel_window_interval: 1,
      funnel_window_interval_unit: 'day',
      date_from: DATE_FROM,
      events: [ev('property_searched', 0), ev('verdict_viewed', 1), ev('activated', 2)],
    },
  },
  {
    name: 'Activation rate (verdict → activated)',
    description: 'Share of analyzers who reach the "aha".',
    filters: {
      insight: 'FUNNELS',
      funnel_viz_type: 'steps',
      funnel_window_interval: 1,
      funnel_window_interval_unit: 'day',
      date_from: DATE_FROM,
      events: [ev('verdict_viewed', 0), ev('activated', 1)],
    },
  },
  {
    name: 'Activation source mix',
    description: 'activated broken down by source (four_paths | buyer_directory | lender_directory).',
    filters: {
      insight: 'TRENDS',
      display: 'ActionsBar',
      date_from: DATE_FROM,
      breakdown: 'source',
      breakdown_type: 'event',
      events: [{ ...ev('activated', 0), math: 'total' }],
    },
  },
  {
    name: 'Checkout drop-off',
    description: 'checkout_started → checkout_completed. Payment-step friction.',
    filters: {
      insight: 'FUNNELS',
      funnel_viz_type: 'steps',
      funnel_window_interval: CONVERSION_WINDOW_DAYS,
      funnel_window_interval_unit: 'day',
      date_from: DATE_FROM,
      events: [ev('checkout_started', 0), ev('checkout_completed', 1)],
    },
  },
  {
    name: 'Free-tier wall friction',
    description: 'analysis_limit_reached by kind (free_monthly | anonymous_daily). Watch around the free-tier change.',
    filters: {
      insight: 'TRENDS',
      display: 'ActionsLineGraph',
      date_from: DATE_FROM,
      breakdown: 'kind',
      breakdown_type: 'event',
      events: [{ ...ev('analysis_limit_reached', 0), math: 'total' }],
    },
  },
  {
    name: 'Plan mix (checkout_started)',
    description: 'checkout_started by plan (monthly | yearly). Validates the annual-lead strategy.',
    filters: {
      insight: 'TRENDS',
      display: 'ActionsBar',
      date_from: DATE_FROM,
      breakdown: 'plan',
      breakdown_type: 'event',
      events: [{ ...ev('checkout_started', 0), math: 'total' }],
    },
  },
  {
    name: 'Signups',
    description: 'signup_completed weekly. Watch vs activation when free tier changes.',
    filters: {
      insight: 'TRENDS',
      display: 'ActionsLineGraph',
      date_from: DATE_FROM,
      interval: 'week',
      events: [{ ...ev('signup_completed', 0), math: 'total' }],
    },
  },
  {
    name: 'Paid retention (first-renewal proxy)',
    description: 'Cohort by first checkout_completed; returning = verdict_viewed. Proxy for first-renewal survival.',
    filters: {
      insight: 'RETENTION',
      target_entity: { id: 'checkout_completed', name: 'checkout_completed', type: 'events' },
      returning_entity: { id: 'verdict_viewed', name: 'verdict_viewed', type: 'events' },
      retention_type: 'retention_first_time',
      period: 'Week',
      total_intervals: 8,
    },
  },
]

async function api(path, body) {
  const url = `${API_HOST}/api/projects/${PROJECT_ID}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${path} → ${res.status} ${res.statusText}\n${text}`)
  }
  return res.json()
}

async function main() {
  if (DRY_RUN) {
    console.log('--- DRY RUN: dashboard ---')
    console.log(JSON.stringify({ name: 'DealGapIQ — North Star' }, null, 2))
    for (const i of INSIGHTS) {
      console.log(`\n--- DRY RUN: insight "${i.name}" ---`)
      console.log(JSON.stringify(i.filters, null, 2))
    }
    console.log(`\n${INSIGHTS.length} insights would be created and pinned to the dashboard.`)
    return
  }

  console.log(`Creating dashboard on project ${PROJECT_ID} at ${API_HOST} ...`)
  const dashboard = await api('/dashboards/', {
    name: 'DealGapIQ — North Star',
    description:
      'Free→Paid north-star funnel, activation, checkout drop-off, plan mix, and retention. See docs/posthog-north-star-funnel.md.',
    pinned: true,
  })
  console.log(`✓ Dashboard #${dashboard.id}`)

  for (const insight of INSIGHTS) {
    const created = await api('/insights/', {
      name: insight.name,
      description: insight.description,
      filters: insight.filters,
      dashboards: [dashboard.id],
    })
    console.log(`✓ Insight #${created.id} — ${insight.name}`)
  }

  const dashUrl = `${API_HOST}/project/${PROJECT_ID}/dashboard/${dashboard.id}`
  console.log(`\nDone. Open the dashboard:\n  ${dashUrl}`)
  console.log('\nNext: accept analytics consent and run a discovery to validate `activated` fires (docs §7).')
}

main().catch((err) => {
  console.error('\nSetup failed:\n', err.message)
  process.exit(1)
})
