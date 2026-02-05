/**
 * Search History types - matching backend schemas/search_history.py exactly
 */

import { SearchSource, PaginatedResponse } from './api';

// ===========================================
// Search Result Summary
// ===========================================
export interface SearchResultSummary {
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_footage?: number | null;
  estimated_value?: number | null;
  rent_estimate?: number | null;
  year_built?: number | null;
  thumbnail_url?: string | null;
}

// ===========================================
// Search History Create Request
// ===========================================
export interface SearchHistoryCreate {
  search_query: string;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  property_cache_id?: string | null;
  zpid?: string | null;
  result_summary?: SearchResultSummary | null;
  search_source?: SearchSource;
  was_successful?: boolean;
  error_message?: string | null;
}

// ===========================================
// Search History Response
// ===========================================
export interface SearchHistoryResponse {
  id: string;
  user_id: string | null;
  search_query: string;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  property_cache_id: string | null;
  zpid: string | null;
  result_summary: SearchResultSummary | null;
  search_source: SearchSource | null;
  was_successful: boolean;
  was_saved: boolean;
  searched_at: string; // ISO datetime
}

// ===========================================
// Search History List (paginated)
// ===========================================
export type SearchHistoryList = PaginatedResponse<SearchHistoryResponse>;

// ===========================================
// Top Market Entry
// ===========================================
export interface TopMarket {
  state: string;
  count: number;
}

// ===========================================
// Search History Stats
// ===========================================
export interface SearchHistoryStats {
  total_searches: number;
  successful_searches: number;
  saved_from_search: number;
  searches_this_week: number;
  searches_this_month: number;
  top_markets: TopMarket[];
  recent_searches: SearchHistoryResponse[];
}

// ===========================================
// Search History Query Params
// ===========================================
export interface SearchHistoryQueryParams {
  limit?: number;
  offset?: number;
  successful_only?: boolean;
  source?: SearchSource;
  search?: string;
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Format search display text
 */
export function getSearchDisplayText(entry: SearchHistoryResponse): string {
  if (entry.address_street) {
    const parts = [entry.address_street];
    if (entry.address_city) parts.push(entry.address_city);
    if (entry.address_state) parts.push(entry.address_state);
    return parts.join(', ');
  }
  return entry.search_query;
}

/**
 * Get relative time string for search
 */
export function getRelativeSearchTime(searchedAt: string): string {
  const date = new Date(searchedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
