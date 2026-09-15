import { STARTER_VERDICTS_PER_MONTH } from '@/lib/claims'

/**
 * NEW COPY for Phase 1.5 PR B follow-up (`fix/funnel-limits-and-stale-gate`).
 * Brad approves these strings before merge.
 * The Starter count is interpolated from claims.ts so copy cannot drift
 * from the published monthly limit.
 */

export const ANON_FUNNEL_COPY = {
  gateTitle: 'That was your free look for today.',
  gateBody: `A free account gives you ${STARTER_VERDICTS_PER_MONTH} more verdicts, the plan that makes each one work, and a place to work the deal. No credit card.`,
  gatePrimary: 'Create a free account',
  signIn: 'Sign in',
  gateFootnote: 'Or come back tomorrow for another free verdict.',
  buildPlanCta: 'Create a free account to build the plan',
  emailNote: 'One email. We will not sign you up for anything.',
} as const

/** v1 Starter-limit card. Flag-off DiscoveryQuotaGate keeps the old screen. */
export const STARTER_LIMIT_COPY = {
  title: `That was your ${STARTER_VERDICTS_PER_MONTH} free verdicts this month.`,
  body: 'Pro gives you unlimited verdicts, Deal Path research and drafts, the buyer and lender directories, and exports.',
  primary: 'Upgrade to Pro',
  footnote: 'Your plans and deals are still here. Resets on the 1st.',
} as const
