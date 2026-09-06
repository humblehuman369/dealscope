'use client'

/**
 * Strategy-first framing for the embedded workbench (R4/R7).
 * Keeps Strategy distinct from DealMaker: lead with "how to make this deal
 * work" before the raw worksheet, even when the backend returns no Options.
 */

import {
  WORKBENCH_BODY,
  WORKBENCH_CARD,
  WORKBENCH_CARD_STYLE,
  WORKBENCH_EYEBROW,
  WORKBENCH_TITLE,
} from '../lib/workbenchLayout'

export function WorkbenchGuidance({
  dealGapPct,
  optionCount,
  isAuthenticated,
  fromPlan = false,
  planLabel = null,
}: {
  dealGapPct: number
  optionCount: number
  isAuthenticated: boolean
  /** Arrived from the Make It Work wizard with a plan already chosen. */
  fromPlan?: boolean
  planLabel?: string | null
}) {
  const gapWorks = dealGapPct <= 0
  const gapClose = dealGapPct > 0 && dealGapPct <= 10
  const hasOptions = optionCount > 0

  let eyebrow: string
  let title: string
  let body: string

  if (fromPlan) {
    eyebrow = 'Your plan is loaded'
    title = planLabel ? `${planLabel} — tune it here` : 'Tune the numbers'
    body =
      'This is the structure from your plan. Drag a slider — cash flow updates instantly. We emailed a link so you can reopen this on any device.'
  } else if (hasOptions && !gapWorks) {
    eyebrow = 'How to make this deal work'
    title = `We found ${optionCount} Option${optionCount === 1 ? '' : 's'} that close the gap`
    body =
      'Pick an Option below — it pre-fills the worksheet with a real structure (price, financing, or income). Then tweak the sliders to fit your terms.'
  } else if (hasOptions && gapWorks) {
    eyebrow = 'Make a strong deal stronger'
    title = `${optionCount} Option${optionCount === 1 ? '' : 's'} to improve the numbers further`
    body =
      'The baseline already works. Apply an Option to model seller carry, different financing, or a strategy switch — then stress-test in the worksheet.'
  } else if (gapWorks) {
    eyebrow = 'The numbers work at Target Buy'
    title = 'Now prove it — then lock it in'
    body =
      'Stress-test rent, rate, and expenses in the worksheet below. Switch strategies from the picker if you want a different play. Save when the assumptions match your deal.'
  } else if (gapClose) {
    eyebrow = 'Close the remaining gap'
    title = 'Use the worksheet to find the angle'
    body =
      'This deal is close. Adjust buy price, down payment, rate, or rent below until cash flow and cash-on-cash clear your bar — then save the scenario.'
  } else {
    eyebrow = 'How to make this deal work'
    title = 'Change the structure — not just the price'
    body =
      'A price cut is only one lever. Use the worksheet to model better financing, more cash down, seller carry, verified rent, or tighter expenses until the Deal Gap closes.'
  }

  if (!fromPlan && !isAuthenticated && hasOptions) {
    body =
      'Sign in free to apply an Option to the live worksheet and watch cash flow update instantly.'
  } else if (!fromPlan && !isAuthenticated && !hasOptions) {
    body =
      'Sign in free to use the live worksheet — change rent, rate, or down payment and watch every metric update.'
  }

  return (
    <section className={WORKBENCH_CARD} style={WORKBENCH_CARD_STYLE}>
      <p className={WORKBENCH_EYEBROW} style={{ color: 'var(--accent-sky)' }}>
        {eyebrow}
      </p>
      <h3 className={`${WORKBENCH_TITLE} mt-1`} style={{ color: 'var(--text-heading)' }}>
        {title}
      </h3>
      <p className={`${WORKBENCH_BODY} mt-1.5`} style={{ color: 'var(--text-body)' }}>
        {body}
      </p>
    </section>
  )
}
