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

  const fullAddress =
    typeof p.address?.full_address === 'string' ? p.address.full_address : ''
  const [streetFromFull = '', cityFromFull = '', stateZipFromFull = ''] =
    fullAddress.split(',').map((segment: string) => segment.trim())
  const stateZipMatch = stateZipFromFull.match(
    /^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/,
  )

  const streetAddress = p.address?.street || streetFromFull || ''
  const city = p.address?.city || cityFromFull || ''
  const state = p.address?.state || (stateZipMatch?.[1] ?? '')
  const zipcode = p.address?.zip_code || (stateZipMatch?.[2] ?? '')
  const price =
    p.valuations?.current_value_avm || p.valuations?.zestimate || 0
  const livingArea = p.details?.square_footage || 0

  const heating: string[] = []
  if (p.details?.heating_type) heating.push(p.details.heating_type)
  else if (p.details?.has_heating) heating.push('Forced Air')

  const cooling: string[] = []
  if (p.details?.cooling_type) cooling.push(p.details.cooling_type)
  else if (p.details?.has_cooling) cooling.push('Central A/C')

  const parking: string[] = []
  if (p.details?.garage_spaces)
    parking.push(`${p.details.garage_spaces} Car Garage`)
  else if (p.details?.has_garage) parking.push('Attached Garage')

  const interiorFeatures: string[] = [...(p.details?.features || [])]
  if (p.details?.has_fireplace) interiorFeatures.push('Fireplace')
  if (p.details?.heating_type)
    interiorFeatures.push(`${p.details.heating_type} Heating`)
  if (p.details?.cooling_type)
    interiorFeatures.push(`${p.details.cooling_type} Cooling`)
  if (p.details?.stories && p.details.stories > 1)
    interiorFeatures.push(`${p.details.stories} Stories`)
  if (livingArea > 2000) interiorFeatures.push('Open Floor Plan')
  if (p.details?.bathrooms && p.details.bathrooms >= 3)
    interiorFeatures.push('Multiple Bathrooms')

  const exteriorFeatures: string[] = []
  if (p.details?.exterior_type)
    exteriorFeatures.push(`${p.details.exterior_type} Exterior`)
  if (p.details?.roof_type)
    exteriorFeatures.push(`${p.details.roof_type} Roof`)
  if (p.details?.has_garage) exteriorFeatures.push('Garage')
  if (p.details?.has_pool) exteriorFeatures.push('Swimming Pool')
  if (p.details?.view_type)
    exteriorFeatures.push(`${p.details.view_type} View`)
  if (p.details?.lot_size && p.details.lot_size > 10000)
    exteriorFeatures.push('Large Lot')

  const construction: string[] = []
  if (p.details?.exterior_type) construction.push(p.details.exterior_type)
  if (p.details?.year_built)
    construction.push(`Built ${p.details.year_built}`)

  const appliances: string[] = []
  if (p.details?.has_cooling) appliances.push('Central Air')
  if (p.details?.has_heating) appliances.push('Furnace')
  appliances.push('Dishwasher', 'Range/Oven', 'Refrigerator')

  const listingStatus = (p.listing?.listing_status || 'OFF_MARKET') as any
  const isOffMarket =
    p.listing?.is_off_market ??
    (listingStatus === 'OFF_MARKET' || listingStatus === 'SOLD')
  const displayPrice = p.listing?.list_price || price

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
    daysOnMarket: p.listing?.days_on_market,
    timeOnMarket: p.listing?.time_on_market,
    brokerageName: p.listing?.brokerage_name,
    listingAgentName: p.listing?.listing_agent_name,
    mlsId: p.listing?.mls_id,
    bedrooms: p.details?.bedrooms || 0,
    bathrooms: p.details?.bathrooms || 0,
    livingArea,
    lotSize: p.details?.lot_size,
    lotSizeAcres: p.details?.lot_size
      ? Math.round((p.details.lot_size / 43560) * 100) / 100
      : undefined,
    yearBuilt: p.details?.year_built || 0,
    propertyType: p.details?.property_type || 'SINGLE_FAMILY',
    stories: p.details?.stories,
    zestimate: p.valuations?.zestimate,
    rentZestimate:
      p.valuations?.rent_zestimate || p.rentals?.monthly_rent_ltr,
    valueIqEstimate: p.valuations?.value_iq_estimate,
    rentalIqEstimate: p.rentals?.rental_stats?.iq_estimate,
    pricePerSqft:
      p.valuations?.price_per_sqft ||
      (livingArea ? Math.round(price / livingArea) : undefined),
    annualTax: p.market?.property_taxes_annual,
    taxAssessedValue: p.valuations?.tax_assessed_value,
    hoaFee: p.market?.hoa_fees_monthly,
    latitude: p.address?.latitude,
    longitude: p.address?.longitude,
    description:
      p.description ||
      `${p.details?.bedrooms || 0} bed, ${p.details?.bathrooms || 0} bath property in ${city}, ${state}.`,
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
    priceHistory: [],
    taxHistory: [],
    schools: [],
  }
}
