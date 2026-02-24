/**
 * DealMakerRecord types — re-exported from @dealscope/shared.
 *
 * The shared package is the single source of truth for DealMakerRecord,
 * InitialAssumptions, CachedMetrics, and DealMakerResponse.
 *
 * Mobile-only types (DealMakerRecordCreate) are defined below.
 */

export type {
  InitialAssumptions,
  CachedMetrics,
  DealMakerRecord,
  DealMakerRecordUpdate,
  DealMakerResponse,
} from '@dealscope/shared';

// ===========================================
// Deal Maker Record Create (mobile-only convenience type)
// ===========================================
export interface DealMakerRecordCreate {
  list_price: number;
  rent_estimate: number;
  property_taxes?: number | null;
  insurance?: number | null;
  arv_estimate?: number | null;
  sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  property_type?: string | null;
  zip_code?: string | null;
  buy_price?: number | null;
  monthly_rent?: number | null;
}
