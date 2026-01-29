import { useEffect, useRef, useState } from 'react'
import { SavedProperty } from './useWorksheetProperty'
import { calculateInitialPurchasePrice } from '@/lib/iqTarget'

const WORKSHEET_API_URL = '/api/v1/worksheet/househack/calculate'
const CALC_DEBOUNCE_MS = 150

// =============================================================================
// FALLBACK DEFAULTS - Must match backend/app/core/defaults.py
// Components using this hook should ideally pass defaults from useDefaults()
// These values are used only when API-provided defaults are not available
// =============================================================================
const FALLBACK_INSURANCE_PCT = 0.01        // OPERATING.insurance_pct
const FALLBACK_FHA_DOWN_PAYMENT_PCT = 0.035 // HOUSE_HACK.fha_down_payment_pct
const FALLBACK_FHA_MIP_RATE = 0.0085       // HOUSE_HACK.fha_mip_rate
const FALLBACK_INTEREST_RATE = 0.06        // FINANCING.interest_rate
const FALLBACK_VACANCY_RATE = 0.01         // OPERATING.vacancy_rate
const FALLBACK_MAINTENANCE_PCT = 0.05      // OPERATING.maintenance_pct

export type PropertyTypeOption = '2' | '3' | '4' | '1' | 'rooms'

export interface HouseHackInputs {
  property_type: PropertyTypeOption
  purchase_price: number
  down_payment_pct: number
  closing_costs: number
  interest_rate: number
  loan_term_years: number
  pmi_rate: number
  unit2_rent: number
  unit3_rent: number
  unit4_rent: number
  vacancy_rate: number
  property_taxes_monthly: number
  insurance_monthly: number
  maintenance_pct: number
  capex_pct: number
  utilities_monthly: number
  owner_market_rent: number
  list_price: number
  fha_max_price: number
  loan_type: 'fha' | 'conventional' | 'va'
}

export interface HouseHackResult {
  your_housing_cost: number
  rental_income: number
  total_monthly_expenses: number
  savings_vs_renting: number
  full_rental_income: number
  full_rental_cash_flow: number
  full_rental_annual: number
  moveout_cap_rate: number
  loan_amount: number
  monthly_payment: number
  monthly_pmi: number
  monthly_piti: number
  down_payment: number
  closing_costs: number
  total_cash_needed: number
  monthly_taxes: number
  monthly_insurance: number
  maintenance_monthly: number
  capex_monthly: number
  utilities_monthly: number
  total_rent: number
  housing_offset: number
  coc_return: number
  deal_score: number
  list_price: number
  breakeven_price: number
  target_coc_price: number
  fha_max_price: number
}

const defaultInputs: HouseHackInputs = {
  property_type: '2',
  purchase_price: 425000,
  down_payment_pct: FALLBACK_FHA_DOWN_PAYMENT_PCT,
  closing_costs: 8625,
  interest_rate: FALLBACK_INTEREST_RATE,
  loan_term_years: 30,
  pmi_rate: FALLBACK_FHA_MIP_RATE,
  unit2_rent: 1800,
  unit3_rent: 1600,
  unit4_rent: 1500,
  vacancy_rate: FALLBACK_VACANCY_RATE,
  property_taxes_monthly: 354,
  insurance_monthly: (425000 * FALLBACK_INSURANCE_PCT) / 12,
  maintenance_pct: FALLBACK_MAINTENANCE_PCT,
  capex_pct: 0.05,
  utilities_monthly: 100,
  owner_market_rent: 2200,
  list_price: 449000,
  fha_max_price: 472030,
  loan_type: 'fha',
}

const getUnitsCount = (propertyType: PropertyTypeOption) => {
  if (propertyType === 'rooms') return 2
  return Number.parseInt(propertyType, 10)
}

export function useHouseHackWorksheetCalculator(property: SavedProperty | null) {
  const [inputs, setInputs] = useState<HouseHackInputs>(defaultInputs)
  const [result, setResult] = useState<HouseHackResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!property || hasInitialized.current) return

    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaultInputs.purchase_price
    const bedrooms = data.bedrooms ?? 3 // Default to 3 bedrooms if not provided
    const monthlyRent = data.monthlyRent ?? defaultInputs.unit2_rent
    const propertyTaxes = data.propertyTaxes ?? (defaultInputs.property_taxes_monthly * 12)
    
    // Calculate insurance as 1% of purchase price annually
    const insuranceAnnual = data.insurance ?? (listPrice * FALLBACK_INSURANCE_PCT)
    const insuranceMonthly = insuranceAnnual / 12
    
    // Calculate room rent: (monthlyRent / bedrooms) * units_rented_out
    // Default units_rented_out = 2
    const rentPerRoom = monthlyRent / bedrooms
    const roomRentMonthly = rentPerRoom * 2 // 2 units rented out by default
    
    // Owner unit market rent = monthlyRent / bedrooms (rent per room)
    const ownerUnitMarketRent = rentPerRoom
    
    // Calculate initial purchase price as 95% of estimated breakeven
    const initialPurchasePrice = calculateInitialPurchasePrice({
      monthlyRent: roomRentMonthly,  // Use rental income from rented units
      propertyTaxes: propertyTaxes,
      insurance: insuranceAnnual,
      listPrice: listPrice,
      vacancyRate: 0.01,
      maintenancePct: 0.05,
      managementPct: 0,
      downPaymentPct: 0.035,   // FHA down payment
      interestRate: 0.06,
      loanTermYears: 30,
    })

    setInputs((prev) => ({
      ...prev,
      purchase_price: initialPurchasePrice,
      list_price: listPrice * 1.056,
      property_taxes_monthly: propertyTaxes / 12,
      insurance_monthly: insuranceMonthly,
      unit2_rent: roomRentMonthly,
      owner_market_rent: ownerUnitMarketRent,
    }))

    hasInitialized.current = true
  }, [property])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const unitCount = getUnitsCount(inputs.property_type)

    const payload = {
      purchase_price: inputs.purchase_price,
      unit_rents: [
        inputs.unit2_rent,
        unitCount >= 3 ? inputs.unit3_rent : 0,
        unitCount >= 4 ? inputs.unit4_rent : 0,
      ],
      owner_market_rent: inputs.owner_market_rent,
      list_price: inputs.list_price,
      fha_max_price: inputs.fha_max_price,
      property_taxes_annual: inputs.property_taxes_monthly * 12,
      insurance_annual: inputs.insurance_monthly * 12,
      down_payment_pct: inputs.down_payment_pct,
      interest_rate: inputs.interest_rate,
      loan_term_years: inputs.loan_term_years,
      closing_costs: inputs.closing_costs,
      pmi_rate: inputs.pmi_rate,
      vacancy_rate: inputs.vacancy_rate,
      maintenance_pct: inputs.maintenance_pct,
      capex_pct: inputs.capex_pct,
      maintenance_monthly: 0,
      capex_monthly: 0,
      utilities_monthly: inputs.utilities_monthly,
      loan_type: inputs.loan_type,
    }

    timer = setTimeout(async () => {
      setIsCalculating(true)
      setError(null)
      try {
        const response = await fetch(WORKSHEET_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'Failed to calculate House Hack worksheet metrics')
        }
        setResult(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to calculate House Hack worksheet metrics'
        setError(message)
      } finally {
        setIsCalculating(false)
      }
    }, CALC_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [inputs])

  const updateInput = <K extends keyof HouseHackInputs>(key: K, value: HouseHackInputs[K]) => {
    setInputs((prev) => {
      if (key === 'loan_type') {
        const minDown = value === 'fha' ? 0.035 : value === 'va' ? 0 : 0.05
        return {
          ...prev,
          loan_type: value as HouseHackInputs['loan_type'],
          down_payment_pct: Math.max(minDown, prev.down_payment_pct),
        }
      }
      return {
        ...prev,
        [key]: value,
      }
    })
  }

  return {
    inputs,
    updateInput,
    result,
    isCalculating,
    error,
  }
}
