/**
 * Comps API types — shared by sale comps, rent comps, and hooks.
 */

// === Identifier for comps requests (zpid preferred, fallback address/url) ===
export interface CompsIdentifier {
  zpid?: string
  address?: string
  url?: string
  limit?: number
  offset?: number
  exclude_zpids?: string
}

// === Subject Property (for distance + similarity calculations) ===
export interface SubjectProperty {
  zpid: string
  address: string
  city: string
  state: string
  zip: string
  beds: number
  baths: number
  sqft: number
  yearBuilt: number
  propertyType: string
  listPrice: number
  zestimate: number | null
  rentZestimate: number | null
  latitude: number
  longitude: number
}

// === Sale Comp ===
export interface SaleComp {
  id: string
  zpid: string
  address: string
  city: string
  state: string
  zip: string
  salePrice: number
  pricePerSqft: number
  beds: number
  baths: number
  sqft: number
  yearBuilt: number
  saleDate: string
  daysAgo: number
  distanceMiles: number
  similarityScore: number
  propertyType: string
  latitude: number
  longitude: number
  imageUrl: string | null
  zillowUrl: string | null
  lotSize?: number
}

// === Rent Comp ===
export interface RentComp {
  id: string
  zpid: string
  address: string
  city: string
  state: string
  zip: string
  monthlyRent: number
  rentPerSqft: number
  beds: number
  baths: number
  sqft: number
  yearBuilt: number
  listingDate: string
  daysAgo: number
  distanceMiles: number
  similarityScore: number
  propertyType: string
  latitude: number
  longitude: number
  imageUrl: string | null
  zillowUrl: string | null
  lotSize?: number
}

// === Calculated Estimates ===
export interface ARVEstimate {
  arv: number
  arvPerSqft: number
  low: number
  high: number
  compCount: number
  confidence: number
}

export interface RentEstimate {
  monthlyRent: number
  rentPerSqft: number
  annualGross: number
  low: number
  high: number
  capRate: number
  compCount: number
  confidence: number
}

// === Hook Return Types ===
export interface CompsState<T> {
  data: T[]
  loading: boolean
  error: string | null
  status: 'idle' | 'loading' | 'success' | 'error'
  attempts: number
  retry: () => void
  lastFetched: Date | null
}
