/**
 * Property Details Service - Enhanced property information
 *
 * Handles property photos, market data, and comparable properties.
 */

import { api } from './apiClient';

// ===========================================
// Types
// ===========================================

export interface PropertyPhoto {
  url: string;
  thumbnail_url?: string;
  caption?: string;
  order?: number;
}

export interface MarketData {
  median_home_value: number;
  median_rent: number;
  appreciation_1yr: number;
  appreciation_5yr: number;
  rent_growth_1yr: number;
  population_growth: number;
  unemployment_rate: number;
  median_income: number;
  rent_to_price_ratio: number;
  days_on_market: number;
  inventory_level: number;
}

export interface ComparableProperty {
  address: string;
  city: string;
  state: string;
  zip: string;
  distance_miles: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  year_built: number;
  property_type: string;
  // For rentals
  monthly_rent?: number;
  rent_per_sqft?: number;
  // For sales
  sale_price?: number;
  price_per_sqft?: number;
  sale_date?: string;
  days_on_market?: number;
}

export interface PropertyDetails {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lot_size: number;
  year_built: number;
  list_price: number;
  rent_estimate: number;
  zestimate?: number;
  rent_zestimate?: number;
  description?: string;
  features?: string[];
  hoa_fee?: number;
  property_tax?: number;
  photos: PropertyPhoto[];
  listing_status: string;
  days_on_market?: number;
  last_sold_date?: string;
  last_sold_price?: number;
}

// API Endpoints
const ENDPOINTS = {
  PROPERTY: '/api/v1/properties',
  PHOTOS: '/api/v1/photos',
  MARKET_DATA: '/api/v1/market-data',
  SIMILAR_RENT: '/api/v1/similar-rent',
  SIMILAR_SOLD: '/api/v1/similar-sold',
};

// ===========================================
// Property Details Endpoints
// ===========================================

/**
 * Get full property details by ID
 */
export async function getPropertyDetails(
  propertyId: string
): Promise<PropertyDetails> {
  return api.get<PropertyDetails>(`${ENDPOINTS.PROPERTY}/${propertyId}`);
}

/**
 * Get property photos
 */
export async function getPropertyPhotos(
  address: string
): Promise<PropertyPhoto[]> {
  return api.get<PropertyPhoto[]>(ENDPOINTS.PHOTOS, { address });
}

// ===========================================
// Market Data Endpoints
// ===========================================

/**
 * Get market data for an area
 */
export async function getMarketData(
  zipCode: string
): Promise<MarketData> {
  // TODO: Backend Needed - Endpoint expects City/State, we have Zip
  // return api.get<MarketData>(ENDPOINTS.MARKET_DATA, { zip_code: zipCode });
  throw new Error('Backend Needed: /api/v1/market-data requires location (City, State), but mobile has Zip.');
}

// ===========================================
// Comparable Properties Endpoints
// ===========================================

/**
 * Get similar rental properties
 */
export async function getSimilarRentals(
  address: string,
  radiusMiles: number = 1,
  limit: number = 10
): Promise<ComparableProperty[]> {
  return api.get<ComparableProperty[]>(ENDPOINTS.SIMILAR_RENT, {
    address,
    radius_miles: radiusMiles,
    limit,
  });
}

/**
 * Get similar sold properties
 */
export async function getSimilarSold(
  address: string,
  radiusMiles: number = 1,
  limit: number = 10
): Promise<ComparableProperty[]> {
  return api.get<ComparableProperty[]>(ENDPOINTS.SIMILAR_SOLD, {
    address,
    radius_miles: radiusMiles,
    limit,
  });
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Calculate average rent from comps
 */
export function calculateAvgRent(comps: ComparableProperty[]): number {
  const rents = comps
    .filter((c) => c.monthly_rent && c.monthly_rent > 0)
    .map((c) => c.monthly_rent!);

  if (rents.length === 0) return 0;
  return Math.round(rents.reduce((sum, r) => sum + r, 0) / rents.length);
}

/**
 * Calculate average sale price from comps
 */
export function calculateAvgSalePrice(comps: ComparableProperty[]): number {
  const prices = comps
    .filter((c) => c.sale_price && c.sale_price > 0)
    .map((c) => c.sale_price!);

  if (prices.length === 0) return 0;
  return Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
}

/**
 * Calculate ARV from sold comps
 */
export function calculateARV(
  comps: ComparableProperty[],
  subjectSqft: number
): number {
  const pricePerSqfts = comps
    .filter((c) => c.price_per_sqft && c.price_per_sqft > 0)
    .map((c) => c.price_per_sqft!);

  if (pricePerSqfts.length === 0) return 0;

  const avgPricePerSqft =
    pricePerSqfts.reduce((sum, p) => sum + p, 0) / pricePerSqfts.length;

  return Math.round(avgPricePerSqft * subjectSqft);
}

/**
 * Format comp distance
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return 'Nearby';
  if (miles < 1) return `${(miles * 5280).toFixed(0)} ft`;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Get photo thumbnail or placeholder
 */
export function getPhotoUrl(
  photo: PropertyPhoto | undefined,
  useThumbnail: boolean = false
): string {
  if (!photo) {
    return 'https://via.placeholder.com/400x300?text=No+Photo';
  }
  return useThumbnail && photo.thumbnail_url ? photo.thumbnail_url : photo.url;
}

/**
 * Sort comps by relevance (closest and most recent first)
 */
export function sortCompsByRelevance(
  comps: ComparableProperty[]
): ComparableProperty[] {
  return [...comps].sort((a, b) => {
    // First by distance
    const distDiff = a.distance_miles - b.distance_miles;
    if (Math.abs(distDiff) > 0.2) return distDiff;

    // Then by recency (for sold comps)
    if (a.sale_date && b.sale_date) {
      return new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime();
    }

    return 0;
  });
}

// ===========================================
// Export as propertyDetailsService object
// ===========================================
export const propertyDetailsService = {
  // Property Details
  getPropertyDetails,
  getPropertyPhotos,

  // Market Data
  getMarketData,

  // Comps
  getSimilarRentals,
  getSimilarSold,

  // Helpers
  calculateAvgRent,
  calculateAvgSalePrice,
  calculateARV,
  formatDistance,
  getPhotoUrl,
  sortCompsByRelevance,
};

export default propertyDetailsService;
