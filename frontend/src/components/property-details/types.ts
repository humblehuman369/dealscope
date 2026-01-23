/**
 * Property Details Types
 * 
 * Type definitions for the property details page,
 * aligned with AXESSO API response structure.
 */

// Listing Status Types - determines price label display
export type ListingStatus = 'FOR_SALE' | 'FOR_RENT' | 'OFF_MARKET' | 'SOLD' | 'PENDING' | 'OTHER'

// Seller Type - identifies listing source
export type SellerType = 'Agent' | 'FSBO' | 'Foreclosure' | 'BankOwned' | 'Auction' | 'NewConstruction' | 'Unknown'

export interface PropertyAddress {
  streetAddress: string
  city: string
  state: string
  zipcode: string
  neighborhood?: string
  county?: string
}

export interface PropertyListingAgent {
  name: string
  phone?: string
  brokerage?: string
}

export interface PriceHistoryItem {
  date: string
  event: string
  price: number
  source: string
  priceChangeRate?: number
}

export interface TaxHistoryItem {
  year: number
  taxPaid: number
  assessedValue: number
  landValue?: number
  improvementValue?: number
}

export interface SchoolInfo {
  name: string
  level: 'Elementary' | 'Middle' | 'High' | 'Private' | string
  grades: string
  rating: number
  distance: number
  type: 'Public' | 'Private' | string
  link?: string
}

export interface PropertyData {
  // Core Property Info
  zpid: number | string
  address: PropertyAddress
  price: number
  
  // Listing Status - Critical for price display
  listingStatus: ListingStatus
  isOffMarket: boolean
  sellerType?: SellerType
  listPrice?: number           // Actual asking price if actively listed
  
  // Seller type flags
  isForeclosure?: boolean
  isBankOwned?: boolean
  isFsbo?: boolean
  isAuction?: boolean
  isNewConstruction?: boolean
  
  // Timing
  daysOnMarket?: number
  timeOnMarket?: string
  dateSold?: string
  
  // Legacy fields (still used)
  daysOnZillow?: number
  views?: number
  saves?: number
  
  // Property Specs
  bedrooms: number
  bathrooms: number
  livingArea: number
  lotSize?: number
  lotSizeAcres?: number
  yearBuilt: number
  propertyType: string
  stories?: number
  
  // Pricing
  zestimate?: number
  rentZestimate?: number
  pricePerSqft?: number
  
  // Tax Info
  annualTax?: number
  taxAssessedValue?: number
  taxYear?: number
  
  // HOA
  hoaFee?: number
  hoaFrequency?: string
  
  // Features
  heating?: string[]
  cooling?: string[]
  parking?: string[]
  parkingSpaces?: number
  flooring?: string[]
  appliances?: string[]
  
  // Interior Features
  interiorFeatures?: string[]
  
  // Exterior Features
  exteriorFeatures?: string[]
  
  // Construction
  construction?: string[]
  roof?: string
  foundation?: string
  
  // Waterfront
  isWaterfront?: boolean
  waterfrontFeatures?: string[]
  waterAccess?: string
  
  // Location
  latitude?: number
  longitude?: number
  
  // Description
  description?: string
  
  // Images
  images: string[]
  totalPhotos?: number
  
  // Listing Info
  listingAgent?: PropertyListingAgent
  mlsId?: string
  listDate?: string
  brokerageName?: string
  listingAgentName?: string
  lastSoldPrice?: number
  
  // History
  priceHistory?: PriceHistoryItem[]
  taxHistory?: TaxHistoryItem[]
  
  // Schools
  schools?: SchoolInfo[]
}

// API Response types
export interface PropertyAPIResponse {
  success: boolean
  data?: PropertyData
  error?: string
}
