/**
 * Rehab budget API shapes — GET /api/v1/properties/saved/{id}/budget
 */

export interface RehabBudgetLineSummary {
  id: string
  category_id: string
  item_id: string
  label: string
  tier: string
  quantity: string
  unit_cost: string
  estimate_amount: string
  actual_amount: string
  variance: string
  variance_pct: string
  status: 'good' | 'warn' | 'bad'
}

export interface RehabBudgetSummary {
  budget_id: string
  saved_property_id: string
  contingency_pct: string
  lines_subtotal: string
  contingency_amount: string
  baseline_total: string
  baseline_locked_at: string | null
  actual_total: string
  unallocated_actual: string
  variance: string
  variance_pct: string
  lines: RehabBudgetLineSummary[]
  categories: Record<string, { estimate: string; actual: string }>
}
