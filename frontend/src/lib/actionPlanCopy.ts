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
  verifiedBadge: 'Verified',
  unverifiedBadge: 'Unverified',
  researchingSteps: [
    'Checking listing history',
    'Checking court records',
    'Looking up who to call',
  ],
  findingsHeading: 'What we found',
  notFoundHeading: 'Could not find',
  conflictsHeading: 'Conflicts',
  firstCallHeading: 'Best first call',
} as const

export type ActionPlanSource = 'user' | 'template' | 'ai'

const RESEARCH_STEP_MS = [15_000, 45_000] as const

export function researchProgressLabel(createdAt: string, now = Date.now()): string {
  const elapsed = now - new Date(createdAt).getTime()
  if (elapsed < RESEARCH_STEP_MS[0]) return ACTION_PLAN_COPY.researchingSteps[0]
  if (elapsed < RESEARCH_STEP_MS[1]) return ACTION_PLAN_COPY.researchingSteps[1]
  return ACTION_PLAN_COPY.researchingSteps[2]
}
