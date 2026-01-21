/**
 * Property Details Types
 * 
 * Type definitions for the property details page,
 * aligned with AXESSO API response structure.
 */

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
  listingStatus?: string
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
