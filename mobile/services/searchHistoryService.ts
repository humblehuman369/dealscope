/**
 * Search History Service - Track and manage property searches
 *
 * Handles search history CRUD operations and statistics.
 */

import { api } from './apiClient';
import {
  SearchHistoryResponse,
  SearchHistoryList,
  SearchHistoryStats,
  SearchHistoryQueryParams,
  SearchSource,
  SuccessMessage,
} from '../types';

// API Endpoints
const ENDPOINTS = {
  BASE: '/api/v1/search-history',
  RECENT: '/api/v1/search-history/recent',
  STATS: '/api/v1/search-history/stats',
};

// ===========================================
// List & Query Endpoints
// ===========================================

/**
 * Get paginated search history
 */
export async function getSearchHistory(
  params?: SearchHistoryQueryParams
): Promise<SearchHistoryList> {
  const queryParams: Record<string, unknown> = {};

  if (params) {
    if (params.limit) queryParams.limit = params.limit;
    if (params.offset) queryParams.offset = params.offset;
    if (params.successful_only !== undefined) queryParams.successful_only = params.successful_only;
    if (params.source) queryParams.source = params.source;
    if (params.search) queryParams.search = params.search;
  }

  return api.get<SearchHistoryList>(ENDPOINTS.BASE, queryParams);
}

/**
 * Get recent searches (shortcut for quick access)
 */
export async function getRecentSearches(
  limit: number = 10
): Promise<SearchHistoryResponse[]> {
  return api.get<SearchHistoryResponse[]>(ENDPOINTS.RECENT, { limit });
}

/**
 * Get search history statistics
 */
export async function getSearchStats(): Promise<SearchHistoryStats> {
  return api.get<SearchHistoryStats>(ENDPOINTS.STATS);
}

// ===========================================
// Delete Endpoints
// ===========================================

/**
 * Delete a single search history entry
 */
export async function deleteSearchEntry(entryId: string): Promise<void> {
  return api.del(`${ENDPOINTS.BASE}/${entryId}`);
}

/**
 * Clear all search history
 */
export async function clearAllHistory(): Promise<SuccessMessage> {
  return api.del<SuccessMessage>(ENDPOINTS.BASE);
}

/**
 * Clear history older than a date
 */
export async function clearHistoryBefore(
  beforeDate: Date
): Promise<SuccessMessage> {
  return api.del<SuccessMessage>(ENDPOINTS.BASE, {
    params: { before: beforeDate.toISOString() },
  });
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get searches by source
 */
export async function getSearchesBySource(
  source: SearchSource,
  limit: number = 50
): Promise<SearchHistoryList> {
  return getSearchHistory({ source, limit });
}

/**
 * Get only successful searches
 */
export async function getSuccessfulSearches(
  limit: number = 50
): Promise<SearchHistoryList> {
  return getSearchHistory({ successful_only: true, limit });
}

/**
 * Search in history
 */
export async function searchInHistory(
  query: string,
  limit: number = 20
): Promise<SearchHistoryList> {
  return getSearchHistory({ search: query, limit });
}

// ===========================================
// Export as searchHistoryService object
// ===========================================
export const searchHistoryService = {
  // List & Query
  getSearchHistory,
  getRecentSearches,
  getSearchStats,

  // Delete
  deleteSearchEntry,
  clearAllHistory,
  clearHistoryBefore,

  // Helpers
  getSearchesBySource,
  getSuccessfulSearches,
  searchInHistory,
};

export default searchHistoryService;
