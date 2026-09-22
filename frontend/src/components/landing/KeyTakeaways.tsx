import { BUYER_COUNT, LENDER_COUNT, PRO_MONTHLY_PRICE, PRO_YEARLY_PER_MONTH } from '@/lib/claims'

const TAKEAWAYS: string[] = [
  'The "deal gap" is the difference between the list price and the target buy price that makes a property pencil for a chosen strategy.',
  'DealGapIQ scores any address, on-market or off-market, against six strategies: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale.',
  'Every analysis returns four paths plus a Blend to close the gap, each with an editable worksheet and a negotiation script.',
  `The free plan gives three discoveries a month with no card. Pro is ${PRO_MONTHLY_PRICE} a month or $${PRO_YEARLY_PER_MONTH} a month billed annually.`,
  `Pro adds directories of ${BUYER_COUNT} verified cash buyers and ${LENDER_COUNT} hard money lenders, plus comps, Excel proformas and PDF reports.`,
  'Built by Brad Geisen, who founded Foreclosure.com and whose team built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac.',
]

/** Answer-first summary under the hero. A real `<ul>` so engines can lift it verbatim. */
export function KeyTakeaways() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-10 pt-2" aria-labelledby="key-takeaways-heading">
      <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-card)] md:p-8">
        <p
          id="key-takeaways-heading"
          className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-sky)]"
        >
          Key takeaways
        </p>
        <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[15px] leading-relaxed text-[var(--text-body)] marker:text-[var(--accent-sky)]">
          {TAKEAWAYS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
