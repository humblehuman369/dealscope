/**
 * One column, one card, one type scale for the Strategy workbench.
 * Discovery verdict cards use `mx-0 sm:mx-5` (+ mobile px-3). Embedded
 * workbench must match that gutter — extra page padding is what made the
 * plan card, Pro strip, and worksheet look like different widths.
 */

export const WORKBENCH_PAGE_GUTTER = 'w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto'

export const WORKBENCH_EMBEDDED_GUTTER = 'mx-0 sm:mx-5 px-3 sm:px-0 mt-3'

export const WORKBENCH_STACK = 'flex flex-col gap-3 pb-10'

export const WORKBENCH_CARD = 'w-full rounded-xl px-4 py-4 sm:px-5'

export const WORKBENCH_CARD_STYLE = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-card)',
} as const

export const WORKBENCH_EYEBROW =
  'text-[11px] font-bold uppercase tracking-wider m-0'

export const WORKBENCH_TITLE = 'text-base sm:text-lg font-bold leading-snug m-0'

export const WORKBENCH_BODY = 'text-sm leading-relaxed m-0'
