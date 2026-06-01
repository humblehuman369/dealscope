import type { PropertyData } from '@/components/property-details/types'

/**
 * Normalize a raw backend property API response into the frontend PropertyData shape.
 * Shared by PropertyPage (full page) and PropertyDetailsDropdown (header panel).
 */
export function normalizePropertyData(
  property: Record<string, unknown>,
  zpid: string,
): PropertyData {
  const p = property as any

  const fullAddress = typeof p.address?.full_address === 'string' ? p.address.full_address : ''
  const [streetFromFull = '', cityFromFull = '', stateZipFromFull = ''] = fullAddress
    .split(',')
    .map((segment: string) => segment.trim())
  const stateZipMatch = stateZipFromFull.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/)

  const streetAddress = p.address?.street || streetFromFull || ''
  const city = p.address?.city || cityFromFull || ''
  const state = p.address?.state || (stateZipMatch?.[1] ?? '')
  const zipcode = p.address?.zip_code || (stateZipMatch?.[2] ?? '')
  const price = p.valuations?.current_value_avm ?? p.valuations?.zestimate ?? 0
  const livingArea = p.details?.square_footage ?? 0

  const heating: string[] = []
  if (p.details?.heating_type) heating.push(p.details.heating_type)
  else if (p.details?.has_heating) heating.push('Forced Air')

  const cooling: string[] = []
  if (p.details?.cooling_type) cooling.push(p.details.cooling_type)
  else if (p.details?.has_cooling) cooling.push('Central A/C')

  const parking: string[] = []
  if (p.details?.garage_spaces) parking.push(`${p.details.garage_spaces} Car Garage`)
  else if (p.details?.has_garage) parking.push('Attached Garage')

  const interiorFeatures: string[] = [...(p.details?.features || [])]
  if (p.details?.has_fireplace) interiorFeatures.push('Fireplace')
  if (p.details?.heating_type) interiorFeatures.push(`${p.details.heating_type} Heating`)
  if (p.details?.cooling_type) interiorFeatures.push(`${p.details.cooling_type} Cooling`)
  if (p.details?.stories && p.details.stories > 1)
    interiorFeatures.push(`${p.details.stories} Stories`)
  if (livingArea > 2000) interiorFeatures.push('Open Floor Plan')
  if (p.details?.bathrooms && p.details.bathrooms >= 3) interiorFeatures.push('Multiple Bathrooms')

  const exteriorFeatures: string[] = []
  if (p.details?.exterior_type) exteriorFeatures.push(`${p.details.exterior_type} Exterior`)
  if (p.details?.roof_type) exteriorFeatures.push(`${p.details.roof_type} Roof`)
  if (p.details?.has_garage) exteriorFeatures.push('Garage')
  if (p.details?.has_pool) exteriorFeatures.push('Swimming Pool')
  if (p.details?.view_type) exteriorFeatures.push(`${p.details.view_type} View`)
  if (p.details?.lot_size && p.details.lot_size > 10000) exteriorFeatures.push('Large Lot')

  const construction: string[] = []
  if (p.details?.exterior_type) construction.push(p.details.exterior_type)
  if (p.details?.year_built) construction.push(`Built ${p.details.year_built}`)

  const appliances: string[] = []
  if (p.details?.has_cooling) appliances.push('Central Air')
  if (p.details?.has_heating) appliances.push('Furnace')
  appliances.push('Dishwasher', 'Range/Oven', 'Refrigerator')

  const listingStatus = (p.listing?.listing_status || 'OFF_MARKET') as any
  const isOffMarket =
    p.listing?.is_off_market ?? (listingStatus === 'OFF_MARKET' || listingStatus === 'SOLD')
  const displayPrice = p.listing?.list_price ?? price

  return {
    zpid: p.zpid || zpid,
    address: { streetAddress, city, state, zipcode },
    price: displayPrice,
    listingStatus,
    isOffMarket,
    sellerType: p.listing?.seller_type,
    isForeclosure: p.listing?.is_foreclosure,
    isBankOwned: p.listing?.is_bank_owned,
    isFsbo: p.listing?.is_fsbo,
    isAuction: p.listing?.is_auction,
    isNewConstruction: p.listing?.is_new_construction,
    isComingSoon: p.listing?.is_coming_soon,
    daysOnMarket: p.listing?.days_on_market,
    timeOnMarket: p.listing?.time_on_market,
    brokerageName: p.listing?.brokerage_name,
    listingAgentName: p.listing?.listing_agent_name,
    listingAgent: p.listing?.listing_agent_name
      ? {
          name: p.listing.listing_agent_name,
          phone: p.listing?.listing_agent_phone ?? undefined,
          email: p.listing?.listing_agent_email ?? undefined,
          brokerage: p.listing?.broker_name ?? p.listing?.brokerage_name ?? undefined,
          brokerPhone: p.listing?.broker_phone ?? undefined,
        }
      : undefined,
    mlsId: p.listing?.mls_id,
    lastSoldPrice: p.valuations?.last_sale_price ?? p.listing?.last_sold_price ?? undefined,
    lastSoldDate: p.valuations?.last_sale_date ?? p.listing?.date_sold ?? undefined,
    bedrooms: p.details?.bedrooms ?? 0,
    bathrooms: p.details?.bathrooms ?? 0,
    livingArea,
    lotSize: p.details?.lot_size,
    lotSizeAcres: p.details?.lot_size
      ? Math.round((p.details.lot_size / 43560) * 100) / 100
      : undefined,
    yearBuilt: p.details?.year_built ?? 0,
    propertyType: p.details?.property_type || 'SINGLE_FAMILY',
    stories: p.details?.stories,
    zestimate: p.valuations?.zestimate,
    rentZestimate: p.valuations?.rent_zestimate ?? p.rentals?.monthly_rent_ltr,
    valueIqEstimate: p.valuations?.value_iq_estimate,
    rentalIqEstimate: p.rentals?.rental_stats?.iq_estimate,
    pricePerSqft:
      p.valuations?.price_per_sqft ?? (livingArea ? Math.round(price / livingArea) : undefined),
    annualTax: p.market?.property_taxes_annual,
    taxAssessedValue: p.valuations?.tax_assessed_value,
    hoaFee: p.market?.hoa_fees_monthly,
    latitude: p.address?.latitude,
    longitude: p.address?.longitude,
    // Real listing comments only — never fabricate (data-consistency rule).
    description: p.listing?.description || p.description || undefined,
    motivatedKeywords: p.listing?.motivated_keywords ?? undefined,
    priceReductionCount: p.listing?.price_reduction_count ?? undefined,
    totalPriceReductionPct: p.listing?.total_price_reduction_pct ?? undefined,
    sellerMotivation: p.seller_motivation ?? undefined,
    images: [],
    totalPhotos: 0,
    heating,
    cooling,
    parking,
    parkingSpaces: p.details?.garage_spaces,
    interiorFeatures,
    exteriorFeatures,
    construction,
    roof: p.details?.roof_type,
    flooring: [],
    appliances,
    priceHistory: Array.isArray(p.listing?.price_history)
      ? p.listing.price_history
          .filter((e: any) => e && (e.price != null || e.event))
          .map((e: any) => ({
            date: e.date ?? '',
            event: e.event ?? '',
            price: e.price ?? 0,
            source: e.source ?? '',
            priceChangeRate:
              e.price_change_rate != null ? Math.round(e.price_change_rate * 1000) / 10 : undefined,
          }))
      : [],
    taxHistory: Array.isArray(p.tax_history)
      ? p.tax_history.map((row: any) => ({
          year: row.year,
          taxPaid: row.tax_paid,
          assessedValue: row.assessed_value,
          landValue: row.land_value ?? undefined,
          improvementValue: row.improvement_value ?? undefined,
        }))
      : [],
    schools: Array.isArray(p.nearby_schools)
      ? p.nearby_schools.map((s: any) => ({
          name: s.name,
          level: s.level,
          grades: s.grades,
          rating: s.rating,
          distance: s.distance,
          type: s.type,
          link: s.link ?? undefined,
        }))
      : [],
    walkScore: p.market?.walk_score ?? undefined,
    transitScore: p.market?.transit_score ?? undefined,
    bikeScore: p.market?.bike_score ?? undefined,
    parcelId: p.details?.parcel_id ?? undefined,
    zestimateHistory: Array.isArray(p.zestimate_history)
      ? p.zestimate_history.map((pt: any) => ({
          date: pt.date,
          value: pt.value,
        }))
      : undefined,
  }
}
