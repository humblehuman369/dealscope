/**
 * Phase 1.5 PR A — NEW COPY for Brad to approve before merge.
 * Do not scatter these strings.
 */
export const PHASE_15_COPY = {
  startingDeal: 'Starting…',
  fromThePlan: 'From the plan.',
  openTheDeal: 'Open the deal',
  seeTheVerdict: 'See the verdict',
} as const

export function formatPlanSourceCountLine(input: {
  answered: number
  total: number
  missingLabels: readonly string[]
  low: string
  high: string
}): string {
  if (input.answered < input.total && input.missingLabels.length > 0) {
    const missing = input.missingLabels.join(', ')
    return (
      `${input.answered} of ${input.total} sources value this house between ` +
      `${input.low} and ${input.high}. ${missing} did not answer.`
    )
  }
  return (
    `${input.total} sources value this house between ${input.low} and ${input.high}.`
  )
}
