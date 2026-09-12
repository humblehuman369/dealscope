/**
 * Placeholder copy for the Action Plan feature.
 * Button label, feature name, and badge text are not locked until approved.
 */

export const ACTION_PLAN_COPY = {
  featureName: 'Deal Path',
  buttonLabel: 'Plan my next move',
  applyLabel: 'Apply to tasks',
  applyingLabel: 'Applying…',
  loadingLabel: 'Building your plan…',
  sourceBadge: {
    user: 'You',
    template: 'Template',
    ai: 'AI',
  },
  verifiedBadge: 'VERIFIED',
  unverifiedBadge: 'UNVERIFIED',
  researchingLabel: 'Looking up listing history and public records…',
  findingsHeading: 'What we found',
  notFoundHeading: 'Could not find',
  conflictsHeading: 'Conflicts',
  firstCallHeading: 'Best first call',
  moveToPursuingLabel: 'Move this deal to Pursuing',
  moveToPursuingDone: 'Moved to Pursuing',
  remainingNone: 'No plans left this month',
  remainingOne: '1 plan left this month',
  remainingMany: (n: number) => `${n} plans left this month`,
  limitReached:
    "You've used all your action plans this month. Upgrade to Pro for 30 per month.",
} as const

export type ActionPlanSource = 'user' | 'template' | 'ai'

export function remainingPlansLabel(remaining: number | null | undefined): string | null {
  if (remaining == null) return null
  if (remaining === 0) return ACTION_PLAN_COPY.remainingNone
  if (remaining === 1) return ACTION_PLAN_COPY.remainingOne
  return ACTION_PLAN_COPY.remainingMany(remaining)
}
