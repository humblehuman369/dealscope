/**
 * Plain-language definitions for the workbench Key Metrics Bar (R7:
 * persona-adaptive density). Shown as inline popovers only for beginner
 * personas — experienced investors see the unadorned bar.
 *
 * Keys match the metric labels rendered in the Key Metrics Bar exactly.
 */

export const METRIC_GLOSSARY: Record<string, string> = {
  'Buy Price':
    'The purchase price this analysis assumes. Change it in the worksheet below and every metric updates.',
  'Cash Needed':
    'Total cash to close: down payment plus closing costs and any upfront rehab budget.',
  'Deal Gap':
    'The distance between the asking price and the price where this strategy pencils. A negative gap means you need that much of a discount; a positive gap means it already works at asking.',
  'Annual Profit':
    'Projected cash flow per year after operating expenses and the mortgage payment.',
  'CAP Rate':
    'Net operating income divided by purchase price. Measures the property’s return before financing — useful for comparing deals regardless of loan terms.',
  'COC Return':
    'Cash-on-cash return: annual cash flow divided by the cash you invested. The yield on the money you actually put in.',
}
