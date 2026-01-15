export type WorksheetStrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'househack' | 'wholesale'

export interface WorksheetStrategy {
  id: WorksheetStrategyId
  name: string
  shortName: string
}

export const WORKSHEET_STRATEGIES: WorksheetStrategy[] = [
  { id: 'ltr', name: 'Long-Term Rental', shortName: 'LTR Worksheet' },
  { id: 'str', name: 'Short-Term Rental', shortName: 'STR Worksheet' },
  { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR Worksheet' },
  { id: 'flip', name: 'Fix & Flip', shortName: 'Fix & Flip' },
  { id: 'househack', name: 'House Hack', shortName: 'House Hack' },
  { id: 'wholesale', name: 'Wholesale', shortName: 'Wholesale' },
]
