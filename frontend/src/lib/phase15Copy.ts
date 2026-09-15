/**
 * Phase 1.5 PR A — NEW COPY for Brad to approve before merge.
 * Do not scatter these strings.
 */
export const PHASE_15_COPY = {
  startingDeal: 'Starting…',
  fromThePlan: 'From the plan.',
  openTheDeal: 'Open the deal',
  seeTheVerdict: 'See the verdict',
  couldNotSaveProperty: 'Could not save property',
} as const

export function formatPlanSourceCountLine(input: {
  answered: number
  total: number
  missingLabels: readonly string[]
  low: string
  high: string
  iqEstimate: string
}): string {
  const iqSentence = `The IQ Estimate is ${input.iqEstimate}. Tap any number for its source.`
  if (input.answered < input.total) {
    const missing =
      input.missingLabels.length > 0
        ? ` ${input.missingLabels.join(', ')} did not answer.`
        : ''
    return (
      `${input.answered} of ${input.total} sources value this house between ` +
      `${input.low} and ${input.high}.${missing} ${iqSentence}`
    )
  }
  return (
    `${input.total} sources value this house between ${input.low} and ${input.high}. ${iqSentence}`
  )
}
