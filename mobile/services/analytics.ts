/**
 * Analytics service for investment calculations.
 * Fetches and calculates investment metrics for properties.
 */

import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// Enable mock data in development when API is unreachable
const USE_MOCK_DATA_ON_ERROR = __DEV__;

export interface StrategyResult {
  name: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: number;
  secondaryLabel: string;
  isProfit: boolean;
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
    strategies: {
      longTermRental: {
        name: 'Long-Term Rental',
        primaryValue: rentEstimate * 12 * 0.4,
        primaryLabel: 'Annual Cash Flow',
        secondaryValue: rentEstimate,
        secondaryLabel: 'Monthly Rent',
        isProfit: true,
      },
      shortTermRental: {
        name: 'Short-Term Rental',
        primaryValue: strEstimate * 200 * 0.55,
        primaryLabel: 'Annual Revenue',
        secondaryValue: strEstimate,
        secondaryLabel: 'Avg. Nightly Rate',
        isProfit: true,
      },
      brrrr: {
        name: 'BRRRR',
        primaryValue: listPrice * 0.15,
        primaryLabel: 'Equity Created',
        secondaryValue: rentEstimate * 0.35,
        secondaryLabel: 'Monthly Cash Flow',
        isProfit: true,
      },
      fixAndFlip: {
        name: 'Fix & Flip',
        primaryValue: listPrice * 0.18,
        primaryLabel: 'Projected Profit',
        secondaryValue: listPrice * 0.12,
        secondaryLabel: 'ROI',
        isProfit: true,
      },
      houseHack: {
        name: 'House Hacking',
        primaryValue: rentEstimate * 0.6,
        primaryLabel: 'Rental Income',
        secondaryValue: Math.floor(listPrice * 0.035 / 12),
        secondaryLabel: 'Net Housing Cost',
        isProfit: true,
      },
      wholesale: {
        name: 'Wholesale',
        primaryValue: listPrice * 0.08,
        primaryLabel: 'Assignment Fee',
        secondaryValue: listPrice * 0.75,
        secondaryLabel: 'MAO',
        isProfit: true,
      },
    },
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
    strategies: {
      longTermRental: {
        name: 'Long-Term Rental',
        primaryValue: analytics.ltr?.annual_cash_flow || 0,
        primaryLabel: 'Annual Cash Flow',
        secondaryValue: analytics.ltr?.monthly_cash_flow || 0,
        secondaryLabel: 'Monthly Cash Flow',
        isProfit: (analytics.ltr?.annual_cash_flow || 0) > 0,
      },
      shortTermRental: {
        name: 'Short-Term Rental',
        primaryValue: analytics.str?.annual_cash_flow || 0,
        primaryLabel: 'Annual Cash Flow',
        secondaryValue: analytics.str?.monthly_cash_flow || 0,
        secondaryLabel: 'Monthly Cash Flow',
        isProfit: (analytics.str?.annual_cash_flow || 0) > 0,
      },
      brrrr: {
        name: 'BRRRR',
        primaryValue: analytics.brrrr?.equity_position || 0,
        primaryLabel: 'Equity Position',
        secondaryValue: analytics.brrrr?.cash_left_in_deal || 0,
        secondaryLabel: 'Cash Left in Deal',
        isProfit: analytics.brrrr?.infinite_roi_achieved || false,
      },
      fixAndFlip: {
        name: 'Fix & Flip',
        primaryValue: analytics.flip?.net_profit_before_tax || 0,
        primaryLabel: 'Net Profit',
        secondaryValue: (analytics.flip?.roi || 0) * 100,
        secondaryLabel: 'ROI %',
        isProfit: (analytics.flip?.net_profit_before_tax || 0) > 0,
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
        secondaryValue: (analytics.wholesale?.roi || 0) * 100,
        secondaryLabel: 'ROI %',
        isProfit: (analytics.wholesale?.net_profit || 0) > 0,
      },
    },
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

