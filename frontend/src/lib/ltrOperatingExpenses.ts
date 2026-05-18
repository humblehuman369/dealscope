/**
 * LTR operating expenses — aligned with backend `compute_noi` (gross-rent % basis).
 * Vacancy is an income adjustment, not included here.
 */

import {
  DEFAULT_OPERATING_CAPEX_PCT,
  DEFAULT_OPERATING_LANDSCAPING_ANNUAL,
  DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
  DEFAULT_OPERATING_UTILITIES_MONTHLY,
} from '@/lib/operatingExpenseDefaults'

export interface LtrOperatingExpenseInputs {
  annualPropertyTax: number
  annualInsurance: number
  monthlyHoa: number
  managementRate: number
  maintenanceRate: number
  /** Annual gross rent (before vacancy). */
  annualGrossRent: number
  capexPct?: number | null
  utilitiesMonthly?: number | null
  pestControlAnnual?: number | null
  landscapingAnnual?: number | null
}

export interface LtrOperatingExpenseBreakdown {
  propertyTax: number
  insurance: number
  hoa: number
  management: number
  maintenance: number
  reserves: number
  utilities: number
  otherAnnual: number
  total: number
}

function pickFinite(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function computeLtrOperatingExpenseBreakdown(
  inputs: LtrOperatingExpenseInputs,
): LtrOperatingExpenseBreakdown {
  const annualGross = Math.max(0, inputs.annualGrossRent)
  const capexPct = pickFinite(inputs.capexPct, DEFAULT_OPERATING_CAPEX_PCT)
  const utilitiesAnnual =
    pickFinite(inputs.utilitiesMonthly, DEFAULT_OPERATING_UTILITIES_MONTHLY) * 12
  const pest = pickFinite(inputs.pestControlAnnual, DEFAULT_OPERATING_PEST_CONTROL_ANNUAL)
  const landscaping = pickFinite(inputs.landscapingAnnual, DEFAULT_OPERATING_LANDSCAPING_ANNUAL)

  const propertyTax = Math.max(0, inputs.annualPropertyTax)
  const insurance = Math.max(0, inputs.annualInsurance)
  const hoa = Math.max(0, inputs.monthlyHoa) * 12
  const management = annualGross * Math.max(0, inputs.managementRate ?? 0)
  const maintenance = annualGross * Math.max(0, inputs.maintenanceRate)
  const reserves = annualGross * capexPct
  const otherAnnual = pest + landscaping

  return {
    propertyTax,
    insurance,
    hoa,
    management,
    maintenance,
    reserves,
    utilities: utilitiesAnnual,
    otherAnnual,
    total:
      propertyTax +
      insurance +
      hoa +
      management +
      maintenance +
      reserves +
      utilitiesAnnual +
      otherAnnual,
  }
}
