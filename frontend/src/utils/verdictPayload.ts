import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'

export interface VerdictSourceOverrides {
  price?: number
  monthlyRent?: number
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

  if (overrides?.listPrice != null) listPrice = overrides.listPrice
  if (overrides?.monthlyRent != null) monthlyRent = overrides.monthlyRent
  if (overrides?.propertyTaxes != null) propertyTaxes = overrides.propertyTaxes
  if (overrides?.insurance !== undefined) insurance = overrides.insurance
  if (overrides?.monthlyHoa != null) hoaFeesMonthly = overrides.monthlyHoa
  if (overrides?.arv != null) arv = overrides.arv

  if (sourceOverrides.price != null) listPrice = sourceOverrides.price
  if (sourceOverrides.monthlyRent != null) monthlyRent = sourceOverrides.monthlyRent

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
    occupancy_rate: base.occupancyRate ?? undefined,
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
    if (overrides.downPayment != null) payload.down_payment_pct = overrides.downPayment / 100
    if (overrides.closingCosts != null) payload.closing_costs_pct = overrides.closingCosts / 100
    if (overrides.interestRate != null && overrides.interestRate > 0) {
      const raw = overrides.interestRate
      payload.interest_rate = raw <= 1 ? raw : raw / 100
    }
    if (overrides.loanTerm != null) payload.loan_term_years = overrides.loanTerm
    if (overrides.vacancyRate != null) payload.vacancy_rate = overrides.vacancyRate / 100
    if (overrides.managementRate != null) payload.management_pct = overrides.managementRate / 100
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
  }

  return payload
}

export function isListedStatus(listingStatus?: string | null): boolean {
  if (!listingStatus) return false
  return !['OFF_MARKET', 'SOLD', 'FOR_RENT', 'OTHER'].includes(String(listingStatus))
}

export function buildVerdictBaseFromPropertyResponse(
  data: any,
  options?: { condition?: number | null; location?: number | null },
): VerdictPayloadBase {
  const listingStatus = data?.listing?.listing_status
  const listed = isListedStatus(listingStatus)

  const iqValueEstimate = data?.valuations?.value_iq_estimate ?? null
  const zestimate = data?.valuations?.zestimate ?? null
  const currentAvm = data?.valuations?.current_value_avm ?? null
  const taxAssessed = data?.valuations?.tax_assessed_value ?? null
  const listPrice = data?.listing?.list_price ?? null
  const apiMarketPrice = data?.valuations?.market_price ?? null

  let resolvedPrice =
    (listed && listPrice != null && listPrice > 0 ? listPrice : null) ??
    (iqValueEstimate != null && iqValueEstimate > 0 ? iqValueEstimate : null) ??
    (apiMarketPrice != null && apiMarketPrice > 0 ? apiMarketPrice : null) ??
    (zestimate != null && zestimate > 0 ? zestimate : null) ??
    (currentAvm != null && currentAvm > 0 ? currentAvm : null) ??
    (taxAssessed != null && taxAssessed > 0 ? Math.round(taxAssessed / 0.75) : null) ??
    1

  let resolvedRent = data?.rentals?.monthly_rent_ltr ?? 0
  if (options?.condition != null) {
    resolvedPrice += getConditionAdjustment(Number(options.condition)).pricePremium
  }
  if (options?.location != null) {
    resolvedRent = Math.round(
      resolvedRent * getLocationAdjustment(Number(options.location)).rentMultiplier,
    )
  }

  return {
    listPrice: Math.round(resolvedPrice),
    monthlyRent: resolvedRent,
    propertyTaxes: data?.market?.property_taxes_annual ?? 0,
    insurance: data?.market?.insurance_annual ?? null,
    hoaFeesMonthly: data?.market?.hoa_fees_monthly ?? null,
    bedrooms: data?.details?.bedrooms || 3,
    bathrooms: data?.details?.bathrooms || 2,
    sqft: data?.details?.square_footage || 1500,
    arv: data?.valuations?.arv ?? null,
    averageDailyRate: data?.rentals?.average_daily_rate ?? null,
    occupancyRate: data?.rentals?.occupancy_rate != null ? data.rentals.occupancy_rate / 100 : null,
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
