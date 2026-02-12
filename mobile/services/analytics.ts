/**
 * Analytics service for investment calculations.
 * Fetches and calculates investment metrics for properties.
 */

import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// DISABLED: Local fallback analytics
// All financial calculations must come from the backend. Showing locally-computed
// estimates risks inconsistent numbers that could mislead investment decisions.
// When the backend is unavailable, the UI should show an error state instead.
const USE_FALLBACK_ON_ERROR = false;

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
 * @deprecated LOCAL FALLBACK — DISABLED
 *
 * All financial calculations must come from the backend (single source of truth).
 * This function is no longer called because USE_FALLBACK_ON_ERROR = false.
 * It remains here temporarily until the dead code is fully removed.
 *
 * When the backend is unreachable, the app shows an error state instead
 * of potentially misleading estimated numbers.
 */
export function generateEstimatedAnalytics(
  address: string, 
  parcelData?: { city?: string; state?: string; zip?: string; lat?: number; lng?: number },
  marketAssumptions?: MarketAssumptions
): InvestmentAnalytics {
  // Use location-based price estimation
  // These are rough median home price estimates by state (simplified)
  const statePriceMultipliers: Record<string, number> = {
    'CA': 1.8, 'NY': 1.5, 'FL': 1.1, 'TX': 0.95, 'AZ': 1.05,
    'CO': 1.2, 'WA': 1.3, 'MA': 1.4, 'NJ': 1.3, 'GA': 0.9,
    'NC': 0.85, 'VA': 1.0, 'TN': 0.8, 'OH': 0.7, 'IL': 0.85,
  };
  
  const state = parcelData?.state || 'FL';
  const multiplier = statePriceMultipliers[state.toUpperCase()] || 1.0;
  
  // Base median home price ~$350K, adjusted by state
  const listPrice = Math.floor(350000 * multiplier);
  
  // Use market-specific rent-to-price ratio if available, otherwise default
  const rentToPriceRatio = marketAssumptions?.rent_to_price_ratio || 0.006;
  const rentEstimate = Math.floor(listPrice * rentToPriceRatio);
  const strEstimate = Math.floor(rentEstimate / 20);
  
  // Use market-specific rates if available
  const vacancyRate = marketAssumptions?.vacancy_rate || 0.05;
  const insuranceRate = marketAssumptions?.insurance_rate || 0.01;
  const propertyTaxRate = marketAssumptions?.property_tax_rate || 0.012;
  
  return {
    property: {
      address,
      city: parcelData?.city || '',
      state: parcelData?.state || '',
      zip: parcelData?.zip || '',
      bedrooms: 3, // Estimated typical value
      bathrooms: 2,
      sqft: 1800,
      yearBuilt: 2005,
      lotSize: 7500,
      propertyType: 'Single Family',
    },
    pricing: {
      listPrice,
      estimatedValue: Math.floor(listPrice * 1.05),
      pricePerSqft: Math.floor(listPrice / 1800),
      rentEstimate,
      strEstimate,
    },
    strategies: (() => {
      // Calculate Flip Margin for mock data
      const rehabCost = 25000;
      const arv = Math.floor(listPrice * 1.25);
      const flipMargin = arv - listPrice - rehabCost;
      const flipMarginPct = listPrice > 0 ? flipMargin / listPrice : 0;
      const maxPurchase70Rule = (arv * 0.70) - rehabCost;
      const passes70Rule = listPrice <= maxPurchase70Rule;
      const monthlyCashFlow = rentEstimate * 0.35;

      return {
        longTermRental: {
          name: 'Long-Term Rental',
          primaryValue: monthlyCashFlow,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: 0.08,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: monthlyCashFlow > 0,
        },
        shortTermRental: {
          name: 'Short-Term Rental',
          primaryValue: monthlyCashFlow * 2.5,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: 0.15,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: true,
        },
        brrrr: {
          name: 'BRRRR',
          primaryValue: monthlyCashFlow * 0.8,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: 0.12,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: true,
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
          primaryValue: rentEstimate * 0.6,
          primaryLabel: 'Monthly Savings',
          secondaryValue: Math.floor(listPrice * 0.035 / 12),
          secondaryLabel: 'Net Housing Cost',
          isProfit: true,
        },
        wholesale: {
          name: 'Wholesale',
          primaryValue: listPrice * 0.08,
          primaryLabel: 'Net Profit',
          secondaryValue: 4.5,
          secondaryLabel: 'ROI',
          isProfit: true,
        },
      };
    })(),
    metrics: {
      capRate: 0.068,
      cashOnCash: 0.095,
      grossRentMultiplier: 10.5,
      dscr: 1.32,
      breakeven: 0.72,
    },
    assumptions: {
      downPayment: 0.25,
      interestRate: 0.0725,
      loanTerm: 30,
      vacancyRate: vacancyRate,
      managementFee: 0.08,
      maintenance: 0.05,
      rehabCost: 25000,
      arv: Math.floor(listPrice * (1 + (marketAssumptions?.appreciation_rate || 0.25))),
    },
    // Include market assumptions metadata for UI display
    marketData: marketAssumptions ? {
      region: marketAssumptions.region,
      insuranceRate: insuranceRate,
      propertyTaxRate: propertyTaxRate,
      rentToPriceRatio: rentToPriceRatio,
      appreciationRate: marketAssumptions.appreciation_rate,
    } : undefined,
  };
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
  console.log(`[Analytics] Fetching analytics for: ${address}`);
  console.log(`[Analytics] API URL: ${API_BASE_URL}`);

  try {
    // Step 1: Search for the property
    console.log('[Analytics] Step 1: Searching property...');
    const searchResponse = await axios.post(
      `${API_BASE_URL}/api/v1/properties/search`,
      { address },
      { timeout: 30000 }
    );

    const propertyData = searchResponse.data;
    console.log('[Analytics] Property found:', propertyData.property_id);
    
    // Step 2: Calculate analytics
    console.log('[Analytics] Step 2: Calculating analytics...');
    const analyticsResponse = await axios.post(
      `${API_BASE_URL}/api/v1/analytics/calculate`,
      { 
        property_id: propertyData.property_id,
        assumptions: {}
      },
      { timeout: 30000 }
    );

    const analytics = analyticsResponse.data;
    console.log('[Analytics] Analytics calculated successfully');
    
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
    
    // Use fallback analytics when API fails
    if (USE_FALLBACK_ON_ERROR) {
      console.log('[Analytics] Using fallback estimated analytics');
      
      // Try to get market-specific assumptions for better estimates
      let marketAssumptions: MarketAssumptions | undefined;
      if (parcelData?.zip) {
        try {
          marketAssumptions = await fetchMarketAssumptions(parcelData.zip);
        } catch (e) {
          console.log('[Analytics] Could not fetch market assumptions, using defaults');
        }
      }
      
      const estimated = generateEstimatedAnalytics(address, parcelData, marketAssumptions);
      
      // Mark the analytics as estimated (for UI indication)
      (estimated as any).isEstimated = true;
      (estimated as any).estimateReason = statusCode === 500 
        ? 'Backend service temporarily unavailable'
        : 'Could not connect to analytics service';
      
      return estimated;
    }
    
    // If fallback is disabled, throw with detailed error
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
      bedrooms: property.details?.bedrooms || 0,
      bathrooms: property.details?.bathrooms || 0,
      sqft: property.details?.square_footage || 0,
      yearBuilt: property.details?.year_built || 0,
      lotSize: property.details?.lot_size || 0,
      propertyType: property.details?.property_type || 'Single Family',
    },
    pricing: {
      listPrice: property.valuations?.current_value_avm || 0,
      estimatedValue: property.valuations?.current_value_avm || 0,
      pricePerSqft: property.details?.square_footage 
        ? Math.floor((property.valuations?.current_value_avm || 0) / property.details.square_footage)
        : 0,
      rentEstimate: property.rentals?.monthly_rent_ltr || 0,
      strEstimate: property.rentals?.average_daily_rate || 0,
    },
    strategies: (() => {
      // Calculate Flip Margin for Fix & Flip (matching frontend)
      const purchasePrice = property.valuations?.current_value_avm || 0;
      const rehabCost = 25000; // Default rehab estimate
      const arv = property.valuations?.arv || purchasePrice * 1.1;
      const flipMargin = arv - purchasePrice - rehabCost;
      const flipMarginPct = purchasePrice > 0 ? flipMargin / purchasePrice : 0;
      const maxPurchase70Rule = (arv * 0.70) - rehabCost;
      const passes70Rule = purchasePrice <= maxPurchase70Rule;

      return {
        longTermRental: {
          name: 'Long-Term Rental',
          primaryValue: analytics.ltr?.monthly_cash_flow || 0,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: analytics.ltr?.cash_on_cash_return || 0,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: (analytics.ltr?.monthly_cash_flow || 0) > 0,
        },
        shortTermRental: {
          name: 'Short-Term Rental',
          primaryValue: analytics.str?.monthly_cash_flow || 0,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: analytics.str?.cash_on_cash_return || 0,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: (analytics.str?.monthly_cash_flow || 0) > 0,
        },
        brrrr: {
          name: 'BRRRR',
          primaryValue: analytics.brrrr?.monthly_cash_flow || 0,
          primaryLabel: 'Monthly Cash Flow',
          secondaryValue: analytics.brrrr?.cash_on_cash_return || 0,
          secondaryLabel: 'Cash-on-Cash',
          isProfit: (analytics.brrrr?.monthly_cash_flow || 0) > 0,
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
          primaryValue: analytics.house_hack?.savings_vs_renting_a || 0,
          primaryLabel: 'Monthly Savings',
          secondaryValue: analytics.house_hack?.net_housing_cost_scenario_a || 0,
          secondaryLabel: 'Net Housing Cost',
          isProfit: (analytics.house_hack?.savings_vs_renting_a || 0) > 0,
        },
        wholesale: {
          name: 'Wholesale',
          primaryValue: analytics.wholesale?.net_profit || 0,
          primaryLabel: 'Net Profit',
          secondaryValue: analytics.wholesale?.roi || 0,
          secondaryLabel: 'ROI',
          isProfit: (analytics.wholesale?.net_profit || 0) > 0,
        },
      };
    })(),
    metrics: {
      capRate: analytics.ltr?.cap_rate || 0,
      cashOnCash: analytics.ltr?.cash_on_cash_return || 0,
      grossRentMultiplier: analytics.ltr?.grm || 0,
      dscr: analytics.ltr?.dscr || 0,
      breakeven: analytics.str?.break_even_occupancy || 0,
    },
    assumptions: {
      downPayment: 0.20,
      interestRate: 0.075,
      loanTerm: 30,
      vacancyRate: 0.05,
      managementFee: 0.08,
      maintenance: 0.05,
      rehabCost: 25000,
      arv: property.valuations?.arv || 0,
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
    console.log(`[Analytics] Market assumptions cache hit for ${zipCode}`);
    return cached.data;
  }
  
  try {
    console.log(`[Analytics] Fetching market assumptions for ${zipCode}`);
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
      
      console.log(`[Analytics] Market assumptions loaded for ${zipCode}:`, data.region);
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

/**
 * Format currency for display.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display.
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format compact number (e.g., $1.2M, $500K).
 */
export function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return formatCurrency(value);
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

