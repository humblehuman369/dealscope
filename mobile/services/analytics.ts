/**
 * Analytics service for investment calculations.
 * Fetches and calculates investment metrics for properties.
 */

import axios from 'axios';
import { API_BASE_URL } from './apiClient';
import { validatePropertyResponse } from '../utils/validation';

// Track API health for better error messaging
let lastApiError: { timestamp: number; message: string } | null = null;
const API_ERROR_CACHE_MS = 60000; // Cache API errors for 1 minute

export interface StrategyResult {
  name: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: number;
  secondaryLabel: string;
  isProfit: boolean;
  // Additional fields for Fix & Flip
  flipMargin?: number;
  flipMarginPct?: number;
  passes70Rule?: boolean;
  maxPurchase70Rule?: number;
}

export interface InvestmentAnalytics {
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    yearBuilt: number;
    lotSize: number;
    propertyType: string;
  };
  pricing: {
    listPrice: number;
    estimatedValue: number;
    pricePerSqft: number;
    rentEstimate: number;
    strEstimate: number;
  };
  strategies: {
    longTermRental: StrategyResult;
    shortTermRental: StrategyResult;
    brrrr: StrategyResult;
    fixAndFlip: StrategyResult;
    houseHack: StrategyResult;
    wholesale: StrategyResult;
  };
  metrics: {
    capRate: number;
    cashOnCash: number;
    grossRentMultiplier: number;
    dscr: number;
    breakeven: number;
  };
  assumptions: {
    downPayment: number;
    interestRate: number;
    loanTerm: number;
    vacancyRate: number;
    managementFee: number;
    maintenance: number;
    rehabCost: number;
    arv: number;
  };
  // Market-specific adjustment data (when available)
  marketData?: {
    region: string;
    insuranceRate: number;
    propertyTaxRate: number;
    rentToPriceRatio: number;
    appreciationRate: number;
  };
}

/**
 * Check if the API appears to be healthy based on recent errors.
 */
export function isApiHealthy(): boolean {
  if (!lastApiError) return true;
  const now = Date.now();
  return now - lastApiError.timestamp > API_ERROR_CACHE_MS;
}

/**
 * Get the last API error message if recent.
 */
export function getLastApiError(): string | null {
  if (!lastApiError) return null;
  const now = Date.now();
  if (now - lastApiError.timestamp > API_ERROR_CACHE_MS) return null;
  return lastApiError.message;
}

/**
 * Fetch complete investment analytics for a property.
 * 
 * @param address - Full property address
 * @param parcelData - Optional parcel data for fallback estimates
 * @returns Investment analytics for all 6 strategies
 */
export async function fetchPropertyAnalytics(
  address: string,
  parcelData?: { city?: string; state?: string; zip?: string; lat?: number; lng?: number }
): Promise<InvestmentAnalytics> {
  if (__DEV__) console.log(`[Analytics] Fetching for: ${address}`);

  try {
    const searchResponse = await axios.post(
      `${API_BASE_URL}/api/v1/properties/search`,
      { address },
      { timeout: 30000 }
    );

    const propertyData = validatePropertyResponse(searchResponse.data);
    if (__DEV__) console.log('[Analytics] Property found:', propertyData.property_id);
    const analyticsResponse = await axios.post(
      `${API_BASE_URL}/api/v1/analytics/calculate`,
      { 
        property_id: propertyData.property_id,
        assumptions: {}
      },
      { timeout: 30000 }
    );

    const analytics = analyticsResponse.data;
    
    // Clear any previous API errors on success
    lastApiError = null;
    
    // Transform backend response to mobile app format
    return transformBackendResponse(propertyData, analytics);
  } catch (error) {
    console.error('[Analytics] Fetch error:', error);
    
    // Track the API error
    let errorMessage = 'Unknown error';
    let statusCode: number | undefined;
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status;
      errorMessage = error.response?.data?.detail || error.message;
      console.error(`[Analytics] API Error - Status: ${statusCode}, Message: ${errorMessage}`);
      
      // Log response data for debugging
      if (error.response?.data) {
        console.error('[Analytics] Response data:', JSON.stringify(error.response.data));
      }
    }
    
    lastApiError = {
      timestamp: Date.now(),
      message: errorMessage,
    };
    
    // Handle specific error cases
    if (statusCode === 404) {
      throw new Error('Property not found in our database. Try a different address.');
    }
    
    if (statusCode === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    
    if (statusCode === 500) {
      throw new Error('Analytics service error. Our team has been notified.');
    }
    
    throw new Error(`Unable to analyze property: ${errorMessage}`);
  }
}

/**
 * Transform backend API response to mobile app format.
 */
function transformBackendResponse(property: any, analytics: any): InvestmentAnalytics {
  return {
    property: {
      id: property.property_id || '',
      address: property.address?.street || '',
      city: property.address?.city || '',
      state: property.address?.state || '',
      zip: property.address?.zip_code || '',
      bedrooms: property.details?.bedrooms ?? 0,
      bathrooms: property.details?.bathrooms ?? 0,
      sqft: property.details?.square_footage ?? 0,
      yearBuilt: property.details?.year_built ?? 0,
      lotSize: property.details?.lot_size ?? 0,
      propertyType: property.details?.property_type || 'Single Family',
    },
    pricing: {
      listPrice: property.valuations?.market_price ?? property.valuations?.current_value_avm ?? 0,
      estimatedValue: property.valuations?.market_price ?? property.valuations?.current_value_avm ?? 0,
      pricePerSqft: property.details?.square_footage 
        ? Math.floor((property.valuations?.market_price ?? property.valuations?.current_value_avm ?? 0) / property.details.square_footage)
        : 0,
      rentEstimate: property.rentals?.monthly_rent_ltr ?? 0,
      strEstimate: property.rentals?.average_daily_rate ?? 0,
    },
    strategies: (() => {
      // Calculate Flip Margin for Fix & Flip (matching frontend)
      const purchasePrice = property.valuations?.market_price ?? property.valuations?.current_value_avm ?? 0;
      const rehabCost = 25000; // Default rehab estimate
      const arv = property.valuations?.arv ?? purchasePrice * 1.1;
      const flipMargin = arv - purchasePrice - rehabCost;
      const flipMarginPct = purchasePrice > 0 ? flipMargin / purchasePrice : 0;
      const maxPurchase70Rule = (arv * 0.70) - rehabCost;
      const passes70Rule = purchasePrice <= maxPurchase70Rule;

      return {
        longTermRental: {
          name: 'Long-Term Rental',
          primaryValue: analytics.ltr?.monthly_cash_flow ?? 0,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: analytics.ltr?.cash_on_cash_return ?? 0,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: (analytics.ltr?.monthly_cash_flow ?? 0) > 0,
        },
        shortTermRental: {
          name: 'Short-Term Rental',
          primaryValue: analytics.str?.monthly_cash_flow ?? 0,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: analytics.str?.cash_on_cash_return ?? 0,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: (analytics.str?.monthly_cash_flow ?? 0) > 0,
        },
        brrrr: {
          name: 'BRRRR',
          primaryValue: analytics.brrrr?.monthly_cash_flow ?? 0,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: analytics.brrrr?.cash_on_cash_return ?? 0,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: (analytics.brrrr?.monthly_cash_flow ?? 0) > 0,
        },
        fixAndFlip: {
          name: 'Fix & Flip',
          primaryValue: flipMargin,
          primaryLabel: 'Flip Margin',
          secondaryValue: flipMarginPct,
          secondaryLabel: 'Margin %',
          isProfit: flipMargin >= 20000,
          flipMargin,
          flipMarginPct,
          passes70Rule,
          maxPurchase70Rule,
        },
        houseHack: {
          name: 'House Hacking',
          primaryValue: analytics.house_hack?.savings_vs_renting_a ?? 0,
          primaryLabel: 'Monthly Savings',
          secondaryValue: analytics.house_hack?.net_housing_cost_scenario_a ?? 0,
          secondaryLabel: 'Net Housing Cost',
          isProfit: (analytics.house_hack?.savings_vs_renting_a ?? 0) > 0,
        },
        wholesale: {
          name: 'Wholesale',
          primaryValue: analytics.wholesale?.net_profit ?? 0,
          primaryLabel: 'Net Profit',
          secondaryValue: analytics.wholesale?.roi ?? 0,
          secondaryLabel: 'ROI',
          isProfit: (analytics.wholesale?.net_profit ?? 0) > 0,
        },
      };
    })(),
    metrics: {
      capRate: analytics.ltr?.cap_rate ?? 0,
      cashOnCash: analytics.ltr?.cash_on_cash_return ?? 0,
      grossRentMultiplier: analytics.ltr?.grm ?? 0,
      dscr: analytics.ltr?.dscr ?? 0,
      breakeven: analytics.str?.break_even_occupancy ?? 0,
    },
    assumptions: {
      downPayment: 0.20,
      interestRate: 0.075,
      loanTerm: 30,
      vacancyRate: 0.05,
      managementFee: 0.08,
      maintenance: 0.05,
      rehabCost: 25000,
      arv: property.valuations?.arv ?? 0,
    },
  };
}

/**
 * Recalculate analytics with custom assumptions.
 * Used when user adjusts sliders in the app.
 */
export async function recalculateAnalytics(
  propertyId: string,
  customAssumptions: Partial<InvestmentAnalytics['assumptions']>
): Promise<InvestmentAnalytics> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/analytics/calculate`,
      {
        property_id: propertyId,
        assumptions: customAssumptions,
      },
      { timeout: 15000 }
    );

    // Transform the response to match mobile format if needed, 
    // or if the backend returns the same format as initial calculation
    // we might need to fetch property details again or assume they haven't changed.
    // For now, assuming backend returns full AnalyticsResponse which needs transformation.
    // However, we don't have the full property object here to pass to transformBackendResponse.
    // We might need to adjust the backend to return the full structure or 
    // adjust the mobile app to handle the AnalyticsResponse directly.
    
    // TEMPORARY FIX: Return the data as is, assuming the caller handles it 
    // or the backend returns what we expect. 
    // Ideally, we should unify the response types.
    return response.data;
  } catch (error) {
    console.error('Recalculation error:', error);
    throw new Error('Unable to recalculate. Please try again.');
  }
}

/**
 * Market assumptions returned from the backend.
 * These are location-specific adjustment factors.
 */
export interface MarketAssumptions {
  zip_code: string;
  region: string;
  insurance_rate: number;  // Annual rate as decimal (e.g., 0.015 = 1.5%)
  property_tax_rate: number;  // Annual rate as decimal
  rent_to_price_ratio: number;  // Monthly rent / price ratio (e.g., 0.008 = 0.8%)
  appreciation_rate: number;  // Annual appreciation rate
  vacancy_rate: number;  // Expected vacancy rate
}

// Cache for market assumptions to avoid redundant API calls
const marketAssumptionsCache = new Map<string, { data: MarketAssumptions; timestamp: number }>();
const MARKET_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch market-specific default assumptions based on zip code.
 * These help provide more accurate initial estimates without user research.
 * 
 * @param zipCode - Property zip code
 * @returns Market-specific assumption factors
 */
export async function fetchMarketAssumptions(zipCode: string): Promise<MarketAssumptions> {
  // Check cache first
  const cached = marketAssumptionsCache.get(zipCode);
  if (cached && (Date.now() - cached.timestamp) < MARKET_CACHE_TTL_MS) {
    if (__DEV__) console.log(`[Analytics] Market assumptions cache hit for ${zipCode}`);
    return cached.data;
  }
  
  try {
    if (__DEV__) console.log(`[Analytics] Fetching market assumptions for ${zipCode}`);
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/market/assumptions`,
      { 
        params: { zip_code: zipCode },
        timeout: 10000 
      }
    );

    if (response.data?.success && response.data?.data) {
      const data = response.data.data as MarketAssumptions;
      
      // Cache the result
      marketAssumptionsCache.set(zipCode, { data, timestamp: Date.now() });
      
      if (__DEV__) console.log(`[Analytics] Market assumptions loaded for ${zipCode}`);
      return data;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error(`[Analytics] Market assumptions error for ${zipCode}:`, error);
    
    // Return defaults if API unavailable
    return {
      zip_code: zipCode,
      region: 'DEFAULT',
      insurance_rate: 0.01,  // 1%
      property_tax_rate: 0.012,  // 1.2%
      rent_to_price_ratio: 0.008,  // 0.8% (near 1% rule)
      appreciation_rate: 0.04,  // 4%
      vacancy_rate: 0.07,  // 7%
    };
  }
}

/**
 * Get market data for a specific location.
 */
export async function fetchMarketData(zipCode: string): Promise<{
  medianRent: number;
  medianPrice: number;
  appreciationRate: number;
  rentGrowth: number;
  vacancyRate: number;
  strOccupancy: number;
  strAdr: number;
}> {
  // TODO: Backend Needed - Endpoint expects City/State, we have Zip
  // The current backend endpoint is /api/v1/market-data?location=City, State
  // We cannot easily convert zip to city/state here without an external service.
  // Commenting out dead call to prevent 404s.
  
  /*
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/market/${zipCode}`,
      { timeout: 10000 }
    );

    return response.data;
  } catch (error) {
    console.error('Market data error:', error);
    
    // Return defaults if market data unavailable
    return {
      medianRent: 0,
      medianPrice: 0,
      appreciationRate: 0.03,
      rentGrowth: 0.02,
      vacancyRate: 0.05,
      strOccupancy: 0.65,
      strAdr: 150,
    };
  }
  */
  
  // Return defaults for now
  return {
    medianRent: 0,
    medianPrice: 0,
    appreciationRate: 0.03,
    rentGrowth: 0.02,
    vacancyRate: 0.05,
    strOccupancy: 0.65,
    strAdr: 150,
  };
}

/**
 * Check backend API health status.
 * Useful for debugging connectivity issues.
 */
export async function checkBackendHealth(): Promise<{
  healthy: boolean;
  url: string;
  latency?: number;
  error?: string;
  features?: Record<string, boolean>;
}> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 10000,
    });
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: response.data?.status === 'healthy',
      url: API_BASE_URL,
      latency,
      features: response.data?.features,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    let errorMessage = 'Unknown error';
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Server not found';
      } else if (error.response) {
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      healthy: false,
      url: API_BASE_URL,
      latency,
      error: errorMessage,
    };
  }
}

// ─── Missing endpoint parity (M6) ────────────────────────────────────────────

/**
 * Get quick analytics for a property (fast summary, no full calculation).
 * Matches frontend api.analytics.quick().
 */
export async function getQuickAnalytics(
  propertyId: string,
  params?: {
    purchase_price?: number;
    down_payment_pct?: number;
    interest_rate?: number;
  },
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams();
  if (params?.purchase_price != null) qs.set('purchase_price', String(params.purchase_price));
  if (params?.down_payment_pct != null) qs.set('down_payment_pct', String(params.down_payment_pct));
  if (params?.interest_rate != null) qs.set('interest_rate', String(params.interest_rate));
  const query = qs.toString();
  const url = `${API_BASE_URL}/api/v1/analytics/${propertyId}/quick${query ? `?${query}` : ''}`;
  const response = await axios.get(url, { headers: getAuthHeaders() });
  return response.data;
}

/**
 * Get property comparison data.
 * Matches frontend api.comparison.get().
 */
export async function getComparison(
  propertyId: string,
): Promise<Record<string, unknown>> {
  const url = `${API_BASE_URL}/api/v1/comparison/${propertyId}`;
  const response = await axios.get(url, { headers: getAuthHeaders() });
  return response.data;
}

/**
 * Run sensitivity analysis on a property.
 * Matches frontend api.sensitivity.analyze().
 */
export async function analyzeSensitivity(payload: {
  property_id: string;
  assumptions: Record<string, unknown>;
  variable: string;
  range_pct?: number;
}): Promise<Record<string, unknown>> {
  const url = `${API_BASE_URL}/api/v1/sensitivity/analyze`;
  const response = await axios.post(url, payload, { headers: getAuthHeaders() });
  return response.data;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Access token is managed by the apiClient interceptor for normal requests,
  // but these use raw axios to match the existing pattern in this file.
  try {
    const { getAccessToken } = require('./authService');
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch { /* auth not available */ }
  return headers;
}

// ─── Formatters (re-exported from canonical utils/formatters) ────────────────
// New code should import directly from 'utils/formatters'.

export { formatCurrency, formatCompact } from '../utils/formatters';
import { formatDecimalAsPercent } from '../utils/formatters';

/**
 * Format a decimal ratio as a percentage for display.
 * Takes a decimal (0.085) and returns "8.5%".
 *
 * NOTE: This wraps formatDecimalAsPercent to preserve the existing
 * public API where callers pass raw decimals from the backend.
 */
export function formatPercent(value: number): string {
  return formatDecimalAsPercent(value);
}

/**
 * Determine if a value represents profit or loss.
 */
export function isProfit(value: number): boolean {
  return value > 0;
}

/**
 * Get strategy display name.
 */
export function getStrategyDisplayName(strategyKey: string): string {
  const names: Record<string, string> = {
    longTermRental: 'Long-Term Rental',
    shortTermRental: 'Short-Term Rental',
    brrrr: 'BRRRR',
    fixAndFlip: 'Fix & Flip',
    houseHack: 'House Hacking',
    wholesale: 'Wholesale',
  };
  return names[strategyKey] || strategyKey;
}

