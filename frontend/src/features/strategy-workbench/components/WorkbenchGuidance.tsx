'use client'

/**
 * Strategy-first framing for the embedded workbench (R4/R7).
 * Keeps Strategy distinct from DealMaker: lead with "how to make this deal
 * work" before the raw worksheet, even when the backend returns no Options.
 */

export function WorkbenchGuidance({
  dealGapPct,
  optionCount,
  isAuthenticated,
}: {
  dealGapPct: number
  optionCount: number
  isAuthenticated: boolean
}) {
  const gapWorks = dealGapPct <= 0
  const gapClose = dealGapPct > 0 && dealGapPct <= 10
  const hasOptions = optionCount > 0

  let eyebrow: string
  let title: string
  let body: string

  if (hasOptions && !gapWorks) {
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

  if (!isAuthenticated && hasOptions) {
    body =
      'Sign in free to apply an Option to the live worksheet and watch cash flow update instantly.'
  } else if (!isAuthenticated && !hasOptions) {
    body =
      'Sign in free to use the live worksheet — change rent, rate, or down payment and watch every metric update.'
  }

  return (
    <section className="px-[1px] sm:px-5 pt-3 pb-2">
      <div
        className="rounded-xl px-4 py-3.5 sm:px-5 sm:py-4"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-wider mb-1"
          style={{ color: 'var(--accent-sky)' }}
        >
          {eyebrow}
        </p>
        <h3
          className="text-base sm:text-lg font-bold leading-snug mb-1.5"
          style={{ color: 'var(--text-heading)' }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-body)' }}>
          {body}
        </p>
      </div>
    </section>
  )
}
