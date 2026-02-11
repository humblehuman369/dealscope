'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SlidersHorizontal, RefreshCw, Save, RotateCcw, Info } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

// ===========================================
// Admin Assumptions — Dark Fintech Theme
// ===========================================
// Amber accent for admin controls, sky-400 save action
// Inputs: white/4% bg, white/7% border, sky-400 focus
// Financial values: tabular-nums for alignment
// Tooltips: inverted (light on dark) for readability
// ===========================================

// ===========================================
// Types
// ===========================================

interface AdminAssumptionsResponse {
  assumptions: Record<string, any>
  updated_at?: string | null
  updated_by?: string | null
  updated_by_email?: string | null
}

// ===========================================
// System defaults — mirrors backend/app/core/defaults.py
// ===========================================

const SYSTEM_DEFAULTS: Record<string, any> = {
  financing: {
    down_payment_pct: 0.20,
    interest_rate: 0.06,
    loan_term_years: 30,
    closing_costs_pct: 0.03,
  },
  operating: {
    vacancy_rate: 0.01,
    property_management_pct: 0.00,
    maintenance_pct: 0.05,
    insurance_pct: 0.01,
    utilities_monthly: 100,
    landscaping_annual: 0,
    pest_control_annual: 200,
  },
  str: {
    platform_fees_pct: 0.15,
    str_management_pct: 0.10,
    cleaning_cost_per_turnover: 150,
    cleaning_fee_revenue: 75,
    avg_length_of_stay_days: 6,
    supplies_monthly: 100,
    additional_utilities_monthly: 0,
    furniture_setup_cost: 6000,
    str_insurance_pct: 0.01,
  },
  rehab: {
    renovation_budget_pct: 0.05,
    contingency_pct: 0.05,
    holding_period_months: 4,
    holding_costs_pct: 0.01,
  },
  brrrr: {
    buy_discount_pct: 0.05,
    refinance_ltv: 0.75,
    refinance_interest_rate: 0.06,
    refinance_term_years: 30,
    refinance_closing_costs_pct: 0.03,
    post_rehab_rent_increase_pct: 0.10,
  },
  flip: {
    hard_money_ltv: 0.90,
    hard_money_rate: 0.12,
    selling_costs_pct: 0.06,
    holding_period_months: 6,
    purchase_discount_pct: 0.20,
  },
  house_hack: {
    fha_down_payment_pct: 0.035,
    fha_interest_rate: 0.065,
    fha_mip_rate: 0.0085,
    units_rented_out: 2,
    buy_discount_pct: 0.05,
  },
  wholesale: {
    assignment_fee: 15000,
    marketing_costs: 500,
    earnest_money_deposit: 1000,
    days_to_close: 45,
    target_purchase_discount_pct: 0.30,
  },
  appreciation_rate: 0.05,
  rent_growth_rate: 0.05,
  expense_growth_rate: 0.03,
}

// ===========================================
// Field metadata — tooltips and display hints
// ===========================================

const FIELD_DESCRIPTIONS: Record<string, string> = {
  // Financing
  down_payment_pct: 'Standard down payment as a percentage of purchase price',
  interest_rate: 'Conventional mortgage interest rate',
  loan_term_years: 'Standard mortgage term in years',
  closing_costs_pct: 'Buyer closing costs as a percentage of purchase price',
  // Operating
  vacancy_rate: 'Expected vacancy loss as a percentage of gross rent',
  property_management_pct: 'Property management fee as a percentage of gross rent',
  maintenance_pct: 'Annual maintenance reserve as a percentage of gross rent',
  insurance_pct: 'Annual insurance as a percentage of purchase price',
  utilities_monthly: 'Estimated monthly utility cost in dollars',
  landscaping_annual: 'Annual landscaping cost in dollars',
  pest_control_annual: 'Annual pest control cost in dollars',
  // STR
  platform_fees_pct: 'Airbnb/VRBO platform fees as a percentage of revenue',
  str_management_pct: 'STR property management as a percentage of revenue',
  cleaning_cost_per_turnover: 'Cleaning cost per guest turnover in dollars',
  cleaning_fee_revenue: 'Cleaning fee charged to guests per booking in dollars',
  avg_length_of_stay_days: 'Average guest booking length in days',
  supplies_monthly: 'Monthly guest supplies cost in dollars',
  additional_utilities_monthly: 'Additional monthly utility cost for STR in dollars',
  furniture_setup_cost: 'One-time furniture and setup cost in dollars',
  str_insurance_pct: 'STR insurance as a percentage of purchase price',
  // Rehab
  renovation_budget_pct: 'Renovation budget as a percentage of ARV',
  contingency_pct: 'Contingency reserve as a percentage of rehab budget',
  holding_period_months: 'Expected rehab duration in months',
  holding_costs_pct: 'Annual holding costs as a percentage of purchase price',
  // BRRRR
  buy_discount_pct: 'Purchase discount below breakeven price',
  refinance_ltv: 'Refinance loan-to-value ratio',
  refinance_interest_rate: 'Refinance mortgage interest rate',
  refinance_term_years: 'Refinance mortgage term in years',
  refinance_closing_costs_pct: 'Refinance closing costs as a percentage of loan',
  post_rehab_rent_increase_pct: 'Expected rent increase after rehab',
  // Flip
  hard_money_ltv: 'Hard money loan-to-value ratio',
  hard_money_rate: 'Hard money loan annual interest rate',
  selling_costs_pct: 'Total selling costs (agent commissions, closing) as a percentage of sale price',
  purchase_discount_pct: 'Target purchase discount below ARV',
  // House Hack
  fha_down_payment_pct: 'FHA loan minimum down payment percentage',
  fha_interest_rate: 'FHA loan interest rate',
  fha_mip_rate: 'FHA mortgage insurance premium rate',
  units_rented_out: 'Number of units rented to tenants',
  // Wholesale
  assignment_fee: 'Default assignment fee in dollars',
  marketing_costs: 'Marketing/deal-finding costs in dollars',
  earnest_money_deposit: 'Earnest money deposit in dollars',
  days_to_close: 'Expected days to close the deal',
  target_purchase_discount_pct: 'Target discount below ARV for wholesale offer',
  // Growth
  appreciation_rate: 'Annual property value appreciation rate',
  rent_growth_rate: 'Annual rent growth rate',
  expense_growth_rate: 'Annual expense growth rate',
}

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  financing: 'Financing',
  operating: 'Operating Expenses',
  str: 'Short-Term Rental (STR)',
  rehab: 'Rehab / Renovation',
  brrrr: 'BRRRR Strategy',
  flip: 'Fix & Flip',
  house_hack: 'House Hack',
  wholesale: 'Wholesale',
}

// ===========================================
// Helpers
// ===========================================

const isPercentField = (key: string): boolean =>
  key.includes('pct') || key.includes('rate') || key === 'refinance_ltv' || key === 'hard_money_ltv'

const formatKeyLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\bpct\b/i, '%')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/** Convert a decimal (0.20) to display percentage (20) */
const toDisplayPercent = (value: number): number => Math.round(value * 10000) / 100

/** Convert a display percentage (20) back to decimal (0.20) */
const fromDisplayPercent = (value: number): number => value / 100

const getInputStep = (key: string) => {
  if (isPercentField(key)) return 0.1
  if (key.includes('months') || key.includes('years') || key.includes('units') || key.includes('days')) return 1
  return 1
}

const getInputMin = (key: string) => (isPercentField(key) ? 0 : undefined)
const getInputMax = (key: string) => (isPercentField(key) ? 100 : undefined)

const getInputSuffix = (key: string): string => {
  if (isPercentField(key)) return '%'
  if (key.includes('monthly') || key.includes('annual') || key.includes('cost') || key.includes('fee') || key.includes('revenue') || key.includes('deposit') || key.includes('assignment')) return '$'
  if (key.includes('years') || key.includes('term_years')) return 'yr'
  if (key.includes('months')) return 'mo'
  if (key.includes('days')) return 'days'
  return ''
}

/** Deep-compare two assumption objects to detect dirty state */
function isDirty(a: Record<string, any> | null, b: Record<string, any> | null): boolean {
  if (!a || !b) return false
  return JSON.stringify(a) !== JSON.stringify(b)
}

// ===========================================
// Component
// ===========================================

export function AdminAssumptionsSection() {
  const [assumptions, setAssumptions] = useState<Record<string, any> | null>(null)
  const [draft, setDraft] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Pick<AdminAssumptionsResponse, 'updated_at' | 'updated_by' | 'updated_by_email'>>({})
  const [hoveredField, setHoveredField] = useState<string | null>(null)

  const hasChanges = useMemo(() => isDirty(assumptions, draft), [assumptions, draft])

  const fetchAssumptions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.get<AdminAssumptionsResponse>('/api/v1/admin/assumptions')
      setAssumptions(data.assumptions)
      setDraft(data.assumptions)
      setMeta({
        updated_at: data.updated_at,
        updated_by: data.updated_by,
        updated_by_email: data.updated_by_email,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assumptions')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssumptions()
  }, [fetchAssumptions])

  const handleUpdate = (category: string, key: string, rawValue: number) => {
    const value = isPercentField(key) ? fromDisplayPercent(rawValue) : rawValue
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value,
        },
      }
    })
  }

  const handleUpdateGeneral = (key: string, rawValue: number) => {
    const value = isPercentField(key) ? fromDisplayPercent(rawValue) : rawValue
    setDraft((prev) => {
      if (!prev) return prev
      return { ...prev, [key]: value }
    })
  }

  const handleSave = async () => {
    if (!draft) return
    try {
      setIsSaving(true)
      setError(null)
      const data = await api.put<AdminAssumptionsResponse>('/api/v1/admin/assumptions', draft)
      setAssumptions(data.assumptions)
      setDraft(data.assumptions)
      setMeta({
        updated_at: data.updated_at,
        updated_by: data.updated_by,
        updated_by_email: data.updated_by_email,
      })
      toast.success('Default assumptions saved successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save assumptions'
      setError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (assumptions) {
      setDraft(assumptions)
      toast.info('Changes reverted to last saved values')
    }
  }

  const handleResetToSystemDefaults = () => {
    setDraft(SYSTEM_DEFAULTS)
    toast.info('Reset to system defaults — save to apply')
  }

  // ── Loading ──────────────────────────────────

  if (isLoading) {
    return (
      <div className="bg-[#0C1220] rounded-xl border border-white/[0.07] p-6">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
        </div>
      </div>
    )
  }

  // ── Data layout ──────────────────────────────

  const generalKeys = ['appreciation_rate', 'rent_growth_rate', 'expense_growth_rate']
  const general = draft
    ? generalKeys.reduce((acc, key) => ({ ...acc, [key]: draft[key] }), {} as Record<string, number>)
    : {}

  const categories = draft
    ? Object.entries(draft).filter(([key]) => !generalKeys.includes(key) && typeof draft[key] === 'object')
    : []

  // ── Shared input classes ─────────────────────

  const inputClass =
    'w-full rounded-lg border border-white/[0.07] bg-white/[0.04] text-slate-100 px-2.5 py-1.5 text-sm pr-8 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors'

  // ── Render ───────────────────────────────────

  return (
    <div className="bg-[#0C1220] rounded-xl border border-white/[0.07] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            Default Assumptions
            {hasChanges && (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full">
                Unsaved
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            These defaults apply to all new calculations platform-wide. Users can override them in their profile.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchAssumptions}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-white/[0.07] rounded-lg text-slate-400 hover:text-slate-300 hover:border-white/[0.14] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-white/[0.07] rounded-lg text-slate-400 hover:text-slate-300 hover:border-white/[0.14] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Undo Changes
          </button>
          <button
            onClick={handleResetToSystemDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-amber-400/30 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
            title="Reset all values to the hardcoded system defaults from the backend"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            System Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Meta */}
      {(meta.updated_at || meta.updated_by) && (
        <p className="text-xs text-slate-500 mb-5 tabular-nums">
          Last updated {meta.updated_at ? formatDate(meta.updated_at) : '—'}
          {meta.updated_by ? ` by ${meta.updated_by}` : ''}
          {meta.updated_by_email ? ` (${meta.updated_by_email})` : ''}
        </p>
      )}

      {/* Category grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map(([category, values]) => (
          <div key={category} className="border border-white/[0.07] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">
              {CATEGORY_LABELS[category] || formatKeyLabel(category)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(values as Record<string, number>).map(([key, value]) => {
                const isPct = isPercentField(key)
                const displayValue = isPct ? toDisplayPercent(Number(value ?? 0)) : Number(value ?? 0)
                const suffix = getInputSuffix(key)
                const fieldKey = `${category}.${key}`
                const description = FIELD_DESCRIPTIONS[key]

                return (
                  <div key={key} className="relative">
                    <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      {formatKeyLabel(key)}
                      {description && (
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                          onMouseEnter={() => setHoveredField(fieldKey)}
                          onMouseLeave={() => setHoveredField(null)}
                          aria-label={`Info: ${description}`}
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      )}
                    </label>
                    {/* Tooltip — inverted for readability on dark */}
                    {hoveredField === fieldKey && description && (
                      <div className="absolute z-10 bottom-full left-0 mb-1 px-2.5 py-1.5 text-[11px] bg-slate-100 text-slate-900 rounded-md shadow-lg max-w-[220px] leading-tight pointer-events-none">
                        {description}
                      </div>
                    )}
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step={getInputStep(key)}
                        min={getInputMin(key)}
                        max={getInputMax(key)}
                        value={displayValue}
                        onChange={(e) => handleUpdate(category, key, Number(e.target.value))}
                        className={inputClass}
                        style={{ colorScheme: 'dark' }}
                      />
                      {suffix && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 pointer-events-none">
                          {suffix}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Growth / General Assumptions */}
        <div className="border border-white/[0.07] rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">
            Growth Rates
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(general).map(([key, value]) => {
              const isPct = isPercentField(key)
              const displayValue = isPct ? toDisplayPercent(Number(value ?? 0)) : Number(value ?? 0)
              const suffix = getInputSuffix(key)
              const fieldKey = `general.${key}`
              const description = FIELD_DESCRIPTIONS[key]

              return (
                <div key={key} className="relative">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    {formatKeyLabel(key)}
                    {description && (
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        onMouseEnter={() => setHoveredField(fieldKey)}
                        onMouseLeave={() => setHoveredField(null)}
                        aria-label={`Info: ${description}`}
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    )}
                  </label>
                  {hoveredField === fieldKey && description && (
                    <div className="absolute z-10 bottom-full left-0 mb-1 px-2.5 py-1.5 text-[11px] bg-slate-100 text-slate-900 rounded-md shadow-lg max-w-[220px] leading-tight pointer-events-none">
                      {description}
                    </div>
                  )}
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step={getInputStep(key)}
                      min={getInputMin(key)}
                      max={getInputMax(key)}
                      value={displayValue}
                      onChange={(e) => handleUpdateGeneral(key, Number(e.target.value))}
                      className={inputClass}
                      style={{ colorScheme: 'dark' }}
                    />
                    {suffix && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 pointer-events-none">
                        {suffix}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
