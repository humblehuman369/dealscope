/**
 * Analytics service for investment calculations.
 * Fetches and calculates investment metrics for properties.
 */

import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// Disable mock data - use real API
const USE_MOCK_DATA_ON_ERROR = false;

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
}

/**
 * Generate mock analytics data for development/demo purposes.
 */
function generateMockAnalytics(address: string): InvestmentAnalytics {
  const listPrice = 250000 + Math.floor(Math.random() * 300000);
  const rentEstimate = Math.floor(listPrice * 0.007);
  const strEstimate = Math.floor(rentEstimate / 20);
  
  return {
    property: {
      address,
      city: 'Demo City',
      state: 'FL',
      zip: '33000',
      bedrooms: 3,
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
      vacancyRate: 0.05,
      managementFee: 0.08,
      maintenance: 0.05,
      rehabCost: 25000,
      arv: Math.floor(listPrice * 1.25),
    },
  };
}

/**
 * Fetch complete investment analytics for a property.
 * 
 * @param address - Full property address
 * @returns Investment analytics for all 6 strategies
 */
export async function fetchPropertyAnalytics(
  address: string
): Promise<InvestmentAnalytics> {
  // In development mode with mock parcel data, use mock analytics too
  // This ensures consistent mock data flow for testing
  if (USE_MOCK_DATA_ON_ERROR && address.includes('Demo City')) {
    console.log('Using mock analytics data for development (mock address detected)');
    return generateMockAnalytics(address);
  }

  try {
    // Step 1: Search for the property
    const searchResponse = await axios.post(
      `${API_BASE_URL}/api/v1/properties/search`,
      { address },
      { timeout: 30000 }
    );

    const propertyData = searchResponse.data;
    
    // Step 2: Calculate analytics
    const analyticsResponse = await axios.post(
      `${API_BASE_URL}/api/v1/analytics/calculate`,
      { 
        property_id: propertyData.property_id,
        assumptions: {}
      },
      { timeout: 30000 }
    );

    const analytics = analyticsResponse.data;
    
    // Transform backend response to mobile app format
    return transformBackendResponse(propertyData, analytics);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    
    // In development, return mock data when API is unreachable
    if (USE_MOCK_DATA_ON_ERROR) {
      console.log('Using mock analytics data for development');
      return generateMockAnalytics(address);
    }
    
    // If API fails, try to calculate locally with minimal data
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error('Property not found. Please verify the address.');
    }
    
    throw new Error('Unable to analyze property. Please try again.');
  }
}

/**
 * Transform backend API response to mobile app format.
 */
function transformBackendResponse(property: any, analytics: any): InvestmentAnalytics {
  return {
    property: {
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
  address: string,
  customAssumptions: Partial<InvestmentAnalytics['assumptions']>
): Promise<InvestmentAnalytics> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/analyze/recalculate`,
      {
        address,
        assumptions: customAssumptions,
      },
      { timeout: 15000 }
    );

    return response.data;
  } catch (error) {
    console.error('Recalculation error:', error);
    throw new Error('Unable to recalculate. Please try again.');
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

