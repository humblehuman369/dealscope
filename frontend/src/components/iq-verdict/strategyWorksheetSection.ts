/** Deep-link targets for Strategy worksheet sections (URL ?section=). */
export type StrategyWorksheetSection = 'purchase' | 'financing' | 'income' | 'rehab' | 'costs'

export const STRATEGY_WORKSHEET_SECTIONS: readonly StrategyWorksheetSection[] = [
  'purchase',
  'financing',
  'income',
  'rehab',
  'costs',
] as const

export function parseStrategyWorksheetSection(raw: string | null): StrategyWorksheetSection | null {
  if (!raw) return null
  return STRATEGY_WORKSHEET_SECTIONS.includes(raw as StrategyWorksheetSection)
    ? (raw as StrategyWorksheetSection)
    : null
}

export function strategyWorksheetAnchorId(section: StrategyWorksheetSection): string {
  return `strategy-worksheet-${section}`
}
