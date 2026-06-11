import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'
import {
  isListedStatus,
  resolveMarketPriceFromPropertyResponse,
} from '@/lib/resolveMarketPrice'

export { isListedStatus }

/**
 * Normalize an occupancy value of unknown convention to a 0-1 fraction.
 *
 * The backend has historically emitted `rentals.occupancy_rate` as a 0-1
 * fraction (e.g. 0.75, and AirROI injection stores 0-1), while some frontend
 * paths assumed percent and divided by 100 — corrupting 0.75 into 0.0075.
 * Values > 1 are treated as percent; 0 is preserved (legitimate 0% occupancy).
 */
export function toOccupancyFraction(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return value > 1 ? value / 100 : value
}

export interface VerdictSourceOverrides {
  price?: number
  monthlyRent?: number
  /** Appraiser / saved-deal market value override (highest priority for list_price) */
  marketValueOverride?: number | null
  monthlyRentOverride?: number | null
}

export interface VerdictPayloadBase {
  listPrice: number
  monthlyRent: number
  propertyTaxes: number
  insurance: number | null
  /**
   * Monthly HOA / condo association / co-op fee from `market.hoa_fees_monthly`.
   * Folded into operating expenses so Income Value reflects the real carrying
   * cost on condos, townhomes, and co-ops (where omitting it overstates
   * Income Value by HOA × 12 / mortgage-constant — often ~2x).
   */
  hoaFeesMonthly?: number | null
  bedrooms: number
  bathrooms: number
  sqft: number
  arv?: number | null
  averageDailyRate?: number | null
  occupancyRate?: number | null
  /**
   * Per-property monthly STR revenue from `str_market_stats.monthly_revenue_per_bed`
   * (AirROI estimate). When present, the backend STR strategy uses this × 12 as
   * canonical annual revenue instead of ADR × 365 × occupancy.
   */
  monthlyStrRevenue?: number | null
  isListed?: boolean
  zestimate?: number | null
  currentValueAvm?: number | null
  taxAssessedValue?: number | null
  listingStatus?: string
  daysOnMarket?: number | null
  sellerType?: string | null
  isForeclosure?: boolean
  isBankOwned?: boolean
  isFsbo?: boolean
  marketTemperature?: string | null
  /** Number of price reductions in the current listing cycle */
  priceReductions?: number
  /** Composite seller motivation score (0-100) from property search */
  sellerMotivationScore?: number | null
  /** Owner does not occupy the property */
  isAbsenteeOwner?: boolean | null
  /** Owner mailing-address state (out-of-state signal) */
  ownerState?: string | null
  /** Two-letter state code for regional investor discount probability */
  state?: string | null
  /** Last sale — drives Three Paths Sub2 heuristic when set */
  estimatedPurchaseYear?: number | null
  estimatedPurchasePrice?: number | null
  yearBuilt?: number | null
  /** 2–4 units → FHA house-hack template eligibility */
  unitCount?: number | null
  /** Owner-occ intent for house-hack path */
  isOwnerOccupied?: boolean | null
  /** T17 — families the user has dismissed; selector applies a ranking penalty */
  dismissedFamilies?: string[]
}

export function buildVerdictAnalysisPayload(
  base: VerdictPayloadBase,
  overrides: Record<string, any> | null = null,
  sourceOverrides: VerdictSourceOverrides = {},
): Record<string, any> {
  let listPrice = base.listPrice
  let monthlyRent = base.monthlyRent
  let propertyTaxes = base.propertyTaxes
  let insurance = base.insurance
  let hoaFeesMonthly = base.hoaFeesMonthly ?? null
  let arv = base.arv ?? null

  if (sourceOverrides.price != null) listPrice = sourceOverrides.price
  if (sourceOverrides.monthlyRent != null) monthlyRent = sourceOverrides.monthlyRent

  if (overrides?.listPrice != null) listPrice = overrides.listPrice
  if (overrides?.monthlyRent != null) monthlyRent = overrides.monthlyRent
  if (overrides?.propertyTaxes != null) propertyTaxes = overrides.propertyTaxes
  if (overrides?.insurance !== undefined) insurance = overrides.insurance
  if (overrides?.monthlyHoa != null) hoaFeesMonthly = overrides.monthlyHoa
  if (overrides?.arv != null) arv = overrides.arv

  // Appraiser / saved-deal overrides apply only when the worksheet did not set the field
  // (e.g. Three Paths Option 1 must not lose to a stale monthly_rent_override).
  if (overrides?.listPrice == null && sourceOverrides.marketValueOverride != null && sourceOverrides.marketValueOverride > 0) {
    listPrice = sourceOverrides.marketValueOverride
  }
  if (
    overrides?.monthlyRent == null &&
    sourceOverrides.monthlyRentOverride != null &&
    sourceOverrides.monthlyRentOverride > 0
  ) {
    monthlyRent = sourceOverrides.monthlyRentOverride
  }

  const payload: Record<string, any> = {
    list_price: listPrice,
    monthly_rent: monthlyRent,
    property_taxes: propertyTaxes,
    insurance,
    hoa_fees_monthly: hoaFeesMonthly ?? undefined,
    bedrooms: base.bedrooms,
    bathrooms: base.bathrooms,
    sqft: base.sqft,
    arv: arv ?? undefined,
    average_daily_rate: base.averageDailyRate ?? undefined,
    occupancy_rate: toOccupancyFraction(base.occupancyRate) ?? undefined,
    mashvisor_monthly_str_revenue: base.monthlyStrRevenue ?? undefined,
    is_listed: base.isListed ?? undefined,
    zestimate: base.zestimate ?? undefined,
    current_value_avm: base.currentValueAvm ?? undefined,
    tax_assessed_value: base.taxAssessedValue ?? undefined,
    listing_status: base.listingStatus ?? undefined,
    days_on_market: base.daysOnMarket ?? undefined,
    seller_type: base.sellerType ?? undefined,
    is_foreclosure: base.isForeclosure ?? false,
    is_bank_owned: base.isBankOwned ?? false,
    is_fsbo: base.isFsbo ?? false,
    market_temperature: base.marketTemperature ?? undefined,
    price_reductions: base.priceReductions ?? undefined,
    seller_motivation_score: base.sellerMotivationScore ?? undefined,
    is_absentee_owner: base.isAbsenteeOwner ?? undefined,
    owner_state: base.ownerState ?? undefined,
    state: base.state ?? undefined,
    estimated_purchase_year: base.estimatedPurchaseYear ?? undefined,
    estimated_purchase_price: base.estimatedPurchasePrice ?? undefined,
    year_built: base.yearBuilt ?? undefined,
    unit_count: base.unitCount ?? undefined,
    is_owner_occupied: base.isOwnerOccupied ?? undefined,
    dismissed_families:
      base.dismissedFamilies && base.dismissedFamilies.length > 0
        ? base.dismissedFamilies
        : undefined,
  }

  if (overrides) {
    if (overrides.purchasePrice != null || overrides.buyPrice != null) {
      payload.purchase_price = overrides.purchasePrice ?? overrides.buyPrice
    }
    // Bank Loan is the financing source of truth when set: derive the down payment % from it
    // (Down Payment = Buy Price − Bank Loan − Seller Financing). Otherwise use downPayment.
    if (overrides.bankLoanAmount != null) {
      const buyP = (overrides.purchasePrice ?? overrides.buyPrice ?? listPrice) as number
      const sellerAmt =
        overrides.sellerFinancingAmount != null && overrides.sellerFinancingAmount >= 0
          ? (overrides.sellerFinancingAmount as number)
          : 0
      if (buyP > 0) {
        const dp = (buyP - overrides.bankLoanAmount - sellerAmt) / buyP
        payload.down_payment_pct = Math.max(-1, Math.min(1, dp))
      }
    } else if (overrides.downPayment != null) {
      payload.down_payment_pct = overrides.downPayment / 100
    }
    if (overrides.closingCosts != null) payload.closing_costs_pct = overrides.closingCosts / 100
    if (overrides.interestRate != null && overrides.interestRate > 0) {
      const raw = overrides.interestRate
      payload.interest_rate = raw <= 1 ? raw : raw / 100
    }
    if (overrides.loanTerm != null) payload.loan_term_years = overrides.loanTerm
    if (overrides.vacancyRate != null) payload.vacancy_rate = overrides.vacancyRate / 100
    if (overrides.managementRate != null) payload.management_pct = overrides.managementRate / 100
    if (overrides.maintenanceRate != null) {
      const raw = overrides.maintenanceRate as number
      payload.maintenance_pct = raw <= 1 ? raw : raw / 100
    }
    if (overrides.capexRate != null) {
      const raw = overrides.capexRate as number
      payload.capex_pct = raw <= 1 ? raw : raw / 100
    }
    if (overrides.utilitiesMonthly != null) payload.utilities_monthly = overrides.utilitiesMonthly
    if (overrides.pestControlAnnual != null) {
      payload.pest_control_annual = overrides.pestControlAnnual
    }
    if (overrides.rehabBudget != null) payload.rehab_cost = overrides.rehabBudget
    if (overrides.sellerFinancingAmount != null && overrides.sellerFinancingAmount >= 0) {
      payload.seller_carry_amount = overrides.sellerFinancingAmount
    }
    if (overrides.sellerInterestRate != null) {
      const raw = overrides.sellerInterestRate as number
      payload.seller_carry_rate = raw <= 1 ? raw : raw / 100
    }
    if (overrides.sellerTermYears != null) {
      payload.seller_carry_term_years = overrides.sellerTermYears
    }
    const sellerIO = overrides.sellerInterestOnly ?? overrides.seller_carry_interest_only
    if (sellerIO != null) {
      payload.seller_carry_interest_only = !!sellerIO
    }
  }

  return payload
}

export function buildVerdictBaseFromPropertyResponse(
  data: any,
  options?: {
    condition?: number | null
    location?: number | null
    marketValueOverride?: number | null
    monthlyRentOverride?: number | null
  },
): VerdictPayloadBase {
  const listingStatus = data?.listing?.listing_status
  const listed = isListedStatus(listingStatus)

  const conditionPremium =
    options?.condition != null
      ? getConditionAdjustment(Number(options.condition)).pricePremium
      : 0
  const resolvedPrice = resolveMarketPriceFromPropertyResponse(data, {
    fallback: 1,
    conditionPremium,
    marketValueOverride: options?.marketValueOverride,
  })
  const zestimate = data?.valuations?.zestimate ?? null
  const currentAvm = data?.valuations?.current_value_avm ?? null
  const taxAssessed = data?.valuations?.tax_assessed_value ?? null

  let resolvedRent = data?.rentals?.monthly_rent_ltr ?? 0
  if (options?.monthlyRentOverride != null && options.monthlyRentOverride > 0) {
    resolvedRent = options.monthlyRentOverride
  } else if (options?.location != null) {
    resolvedRent = Math.round(
      resolvedRent * getLocationAdjustment(Number(options.location)).rentMultiplier,
    )
  }

  return {
    listPrice: resolvedPrice,
    monthlyRent: resolvedRent,
    propertyTaxes: data?.market?.property_taxes_annual ?? 0,
    insurance: data?.market?.insurance_annual ?? null,
    hoaFeesMonthly: data?.market?.hoa_fees_monthly ?? null,
    bedrooms: data?.details?.bedrooms || 3,
    bathrooms: data?.details?.bathrooms || 2,
    sqft: data?.details?.square_footage || 1500,
    arv: data?.valuations?.arv ?? null,
    averageDailyRate: data?.rentals?.average_daily_rate ?? null,
    occupancyRate: toOccupancyFraction(data?.rentals?.occupancy_rate),
    monthlyStrRevenue: data?.rentals?.str_market_stats?.monthly_revenue_per_bed ?? null,
    isListed: listed,
    zestimate,
    currentValueAvm: currentAvm,
    taxAssessedValue: taxAssessed,
    listingStatus: listingStatus ?? undefined,
    daysOnMarket: data?.listing?.days_on_market ?? undefined,
    sellerType: data?.listing?.seller_type ?? undefined,
    isForeclosure: data?.listing?.is_foreclosure || false,
    isBankOwned: data?.listing?.is_bank_owned || false,
    isFsbo: data?.listing?.is_fsbo || false,
    marketTemperature: data?.market?.market_stats?.market_temperature || undefined,
    priceReductions: data?.listing?.price_reduction_count ?? 0,
    sellerMotivationScore: data?.seller_motivation?.score ?? undefined,
    isAbsenteeOwner: data?.listing?.is_absentee_owner ?? undefined,
    ownerState: data?.listing?.owner_state ?? data?.owner_state ?? undefined,
    state: data?.state ?? data?.details?.state ?? undefined,
    estimatedPurchaseYear: (() => {
      const raw = data?.listing?.date_sold
      if (!raw || typeof raw !== 'string') return undefined
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return undefined
      return d.getFullYear()
    })(),
    estimatedPurchasePrice: data?.listing?.last_sold_price ?? undefined,
    yearBuilt: data?.details?.year_built ?? undefined,
    unitCount: data?.details?.num_units ?? data?.num_units ?? undefined,
    isOwnerOccupied: undefined,
  }
}
