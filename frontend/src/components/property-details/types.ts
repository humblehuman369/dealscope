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

// Market Temperature - buyer/seller market indicator
export type MarketTemperature = 'hot' | 'warm' | 'cold'

// Rent Trend - year-over-year rental market direction
export type RentTrend = 'up' | 'down' | 'stable'

/**
 * Market statistics for investment analysis.
 * Helps determine buyer/seller market conditions and negotiation leverage.
 */
export interface MarketStatistics {
  // Days on Market metrics - key indicator for negotiation power
  medianDaysOnMarket?: number
  avgDaysOnMarket?: number
  minDaysOnMarket?: number
  maxDaysOnMarket?: number
  
  // Listing inventory metrics
  totalListings?: number
  newListings?: number
  
  // Calculated metrics
  absorptionRate?: number      // new_listings / total_listings
  marketTemperature?: MarketTemperature  // 'hot' | 'warm' | 'cold'
  
  // Price metrics
  medianPrice?: number
  avgPricePerSqft?: number
}

/**
 * Rental market statistics for investment analysis.
 * Provides comprehensive rental data including proprietary IQ estimate.
 */
export interface RentalMarketStats {
  // Property-specific estimates
  rentcastEstimate?: number    // RentCast rent estimate
  zillowEstimate?: number      // Zillow rentZestimate
  iqEstimate?: number          // InvestIQ proprietary: avg of both
  
  // Estimate range
  estimateLow?: number
  estimateHigh?: number
  
  // Market-wide rental stats
  marketAvgRent?: number
  marketMedianRent?: number
  marketMinRent?: number
  marketMaxRent?: number
  marketRentPerSqft?: number
  
  // Rental market velocity
  rentalDaysOnMarket?: number
  rentalTotalListings?: number
  rentalNewListings?: number
  
  // Trend indicator
  rentTrend?: RentTrend        // 'up' | 'down' | 'stable'
  trendPctChange?: number      // Year-over-year percentage change
}

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
  
  // Market Statistics - buyer/seller market indicators
  marketStats?: MarketStatistics
  
  // Rental Market Statistics - rental investment analysis
  rentalStats?: RentalMarketStats
}

// API Response types
export interface PropertyAPIResponse {
  success: boolean
  data?: PropertyData
  error?: string
}
