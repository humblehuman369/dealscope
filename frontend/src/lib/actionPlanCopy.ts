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
} as const

export type ActionPlanSource = 'user' | 'template' | 'ai'
