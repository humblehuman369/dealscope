/**
 * Property API Response Types — Single Source of Truth
 *
 * These types match the backend schemas/property.py exactly (snake_case).
 * Both frontend and mobile consume the same API response shape.
 *
 * All optional fields use `T | null` to match Pydantic's Optional[T] = None
 * serialization. Consumers should use nullish coalescing (??) not logical OR (||)
 * when chaining fallback values — a value of 0 is intentional.
 */

// =============================================================================
// ADDRESS
// =============================================================================

export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  full_address: string;
}

// =============================================================================
// PROPERTY DETAILS
// =============================================================================

export interface PropertyDetails {
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_footage?: number | null;
  lot_size?: number | null;
  year_built?: number | null;
  num_units?: number | null;
  stories?: number | null;
  features?: string[];
  heating_type?: string | null;
  cooling_type?: string | null;
  has_garage?: boolean | null;
  garage_spaces?: number | null;
  parking_type?: string | null;
  exterior_type?: string | null;
  roof_type?: string | null;
  foundation_type?: string | null;
  has_fireplace?: boolean | null;
  has_pool?: boolean | null;
}

// =============================================================================
// VALUATION DATA
// =============================================================================

export interface ValuationData {
  current_value_avm?: number | null;
  value_iq_estimate?: number | null;
  rentcast_avm?: number | null;
  value_range_low?: number | null;
  value_range_high?: number | null;
  price_confidence?: string | null;
  price_per_sqft?: number | null;
  tax_assessed_value?: number | null;
  tax_assessment_year?: number | null;
  last_sale_price?: number | null;
  last_sale_date?: string | null;
  arv?: number | null;
  arv_flip?: number | null;
  zestimate?: number | null;
  zestimate_high_pct?: number | null;
  zestimate_low_pct?: number | null;
  redfin_estimate?: number | null;
  market_price?: number | null;
}

// =============================================================================
// RENTAL MARKET STATISTICS
// =============================================================================

export interface RentalMarketStatistics {
  rentcast_estimate?: number | null;
  zillow_estimate?: number | null;
  redfin_estimate?: number | null;
  iq_estimate?: number | null;

  estimate_low?: number | null;
  estimate_high?: number | null;

  market_avg_rent?: number | null;
  market_median_rent?: number | null;
  market_min_rent?: number | null;
  market_max_rent?: number | null;
  market_rent_per_sqft?: number | null;

  rental_days_on_market?: number | null;
  rental_total_listings?: number | null;
  rental_new_listings?: number | null;

  rent_trend?: string | null;
  trend_pct_change?: number | null;
}

// =============================================================================
// RENTAL DATA
// =============================================================================

export interface RentalData {
  monthly_rent_ltr?: number | null;
  rent_range_low?: number | null;
  rent_range_high?: number | null;
  rent_confidence?: string | null;
  average_daily_rate?: number | null;
  occupancy_rate?: number | null;
  rent_per_sqft?: number | null;
  average_rent?: number | null;
  rental_stats?: RentalMarketStatistics | null;
}

// =============================================================================
// MARKET STATISTICS
// =============================================================================

export interface MarketStatistics {
  median_days_on_market?: number | null;
  avg_days_on_market?: number | null;
  min_days_on_market?: number | null;
  max_days_on_market?: number | null;
  total_listings?: number | null;
  new_listings?: number | null;
  absorption_rate?: number | null;
  market_temperature?: string | null;
  median_price?: number | null;
  avg_price_per_sqft?: number | null;
}

// =============================================================================
// MARKET DATA
// =============================================================================

export interface MarketData {
  market_health_score?: number | null;
  market_strength?: string | null;
  property_taxes_annual?: number | null;
  hoa_fees_monthly?: number | null;
  mortgage_rate_arm5?: number | null;
  mortgage_rate_30yr?: number | null;
  market_stats?: MarketStatistics | null;
}

// =============================================================================
// DATA QUALITY
// =============================================================================

export interface DataQuality {
  completeness_score: number;
  missing_fields: string[];
  stale_fields?: string[];
  conflict_fields: string[];
}

// =============================================================================
// LISTING INFO
// =============================================================================

export interface ListingInfo {
  listing_status?: string | null;
  is_off_market?: boolean | null;
  seller_type?: string | null;
  is_foreclosure?: boolean | null;
  is_bank_owned?: boolean | null;
  is_fsbo?: boolean | null;
  is_auction?: boolean | null;
  is_new_construction?: boolean | null;
  list_price?: number | null;
  days_on_market?: number | null;
  time_on_market?: string | null;
  last_sold_price?: number | null;
  date_sold?: string | null;
  brokerage_name?: string | null;
  listing_agent_name?: string | null;
  mls_id?: string | null;
}

// =============================================================================
// PROPERTY RESPONSE (full API response)
// =============================================================================

export interface PropertyResponse {
  property_id: string;
  zpid?: string | null;
  address: PropertyAddress;
  details: PropertyDetails;
  valuations: ValuationData;
  rentals: RentalData;
  market: MarketData;
  listing?: ListingInfo | null;
  data_quality: DataQuality;
  fetched_at: string;
}

// =============================================================================
// PROPERTY DATA SNAPSHOT (saved with SavedProperty, camelCase by convention)
// =============================================================================

export interface PropertyDataSnapshot {
  zpid?: string | number;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  listPrice?: number;
  monthlyRent?: number;
  propertyTaxes?: number;
  insurance?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
  arv?: number;
  estimatedValue?: number;
  averageDailyRate?: number;
  occupancyRate?: number;
  photos?: string[];
  listingStatus?: string;
  isOffMarket?: boolean;
  sellerType?: string;
  isForeclosure?: boolean;
  isBankOwned?: boolean;
  isAuction?: boolean;
  isNewConstruction?: boolean;
  daysOnMarket?: number;
  zestimate?: number;
}
