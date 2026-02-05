/**
 * Saved Properties Service - Portfolio management
 *
 * Handles all saved property operations including CRUD,
 * bulk operations, deal maker, and adjustments.
 */

import { api } from './apiClient';
import {
  SavedPropertySummary,
  SavedPropertyResponse,
  SavedPropertyCreate,
  SavedPropertyUpdate,
  PropertyAdjustmentCreate,
  PropertyAdjustmentResponse,
  BulkStatusUpdate,
  BulkDeleteRequest,
  PortfolioStats,
  PropertyStatus,
  PaginatedResponse,
  SuccessMessage,
} from '../types';
import { DealMakerRecord, DealMakerRecordUpdate, DealMakerResponse } from '../types';

// API Endpoints
const ENDPOINTS = {
  BASE: '/api/v1/properties/saved',
  STATS: '/api/v1/properties/saved/stats',
  BULK_STATUS: '/api/v1/properties/saved/bulk/status',
  BULK_DELETE: '/api/v1/properties/saved/bulk',
};

// ===========================================
// Query Parameters
// ===========================================

export interface SavedPropertiesQueryParams {
  limit?: number;
  offset?: number;
  status?: PropertyStatus;
  tags?: string[];
  search?: string;
  order_by?: 'saved_at' | 'updated_at' | 'priority' | 'address_street' | 'best_coc_return';
  order_direction?: 'asc' | 'desc';
}

// ===========================================
// List & Query Endpoints
// ===========================================

/**
 * Get list of saved properties with filters
 */
export async function getSavedProperties(
  params?: SavedPropertiesQueryParams
): Promise<SavedPropertySummary[]> {
  const queryParams: Record<string, unknown> = {};

  if (params) {
    if (params.limit) queryParams.limit = params.limit;
    if (params.offset) queryParams.offset = params.offset;
    if (params.status) queryParams.status = params.status;
    if (params.tags?.length) queryParams.tags = params.tags.join(',');
    if (params.search) queryParams.search = params.search;
    if (params.order_by) queryParams.order_by = params.order_by;
    if (params.order_direction) queryParams.order_direction = params.order_direction;
  }

  return api.get<SavedPropertySummary[]>(ENDPOINTS.BASE, queryParams);
}

/**
 * Get portfolio statistics
 */
export async function getPortfolioStats(): Promise<PortfolioStats> {
  return api.get<PortfolioStats>(ENDPOINTS.STATS);
}

/**
 * Check save status for multiple properties
 */
export async function getBulkSaveStatus(
  propertyIds: string[]
): Promise<Record<string, boolean>> {
  return api.post<Record<string, boolean>>(`${ENDPOINTS.BASE}/bulk/status`, {
    property_ids: propertyIds,
  });
}

// ===========================================
// CRUD Endpoints
// ===========================================

/**
 * Save a new property to portfolio
 */
export async function saveProperty(
  data: SavedPropertyCreate
): Promise<SavedPropertyResponse> {
  return api.post<SavedPropertyResponse>(ENDPOINTS.BASE, data);
}

/**
 * Get a single saved property by ID
 */
export async function getSavedProperty(
  propertyId: string
): Promise<SavedPropertyResponse> {
  return api.get<SavedPropertyResponse>(`${ENDPOINTS.BASE}/${propertyId}`);
}

/**
 * Update a saved property
 */
export async function updateSavedProperty(
  propertyId: string,
  data: SavedPropertyUpdate
): Promise<SavedPropertyResponse> {
  return api.patch<SavedPropertyResponse>(`${ENDPOINTS.BASE}/${propertyId}`, data);
}

/**
 * Delete a saved property
 */
export async function deleteSavedProperty(propertyId: string): Promise<void> {
  return api.del(`${ENDPOINTS.BASE}/${propertyId}`);
}

// ===========================================
// Bulk Operations
// ===========================================

/**
 * Update status for multiple properties
 */
export async function bulkUpdateStatus(
  data: BulkStatusUpdate
): Promise<SuccessMessage> {
  return api.post<SuccessMessage>(ENDPOINTS.BULK_STATUS, data);
}

/**
 * Delete multiple properties
 */
export async function bulkDeleteProperties(
  data: BulkDeleteRequest
): Promise<SuccessMessage> {
  return api.delWithBody<SuccessMessage>(ENDPOINTS.BULK_DELETE, data);
}

// ===========================================
// Deal Maker Endpoints
// ===========================================

/**
 * Get deal maker record for a saved property
 */
export async function getDealMaker(
  propertyId: string
): Promise<DealMakerResponse> {
  return api.get<DealMakerResponse>(`${ENDPOINTS.BASE}/${propertyId}/deal-maker`);
}

/**
 * Update deal maker record
 */
export async function updateDealMaker(
  propertyId: string,
  data: DealMakerRecordUpdate
): Promise<DealMakerResponse> {
  return api.patch<DealMakerResponse>(`${ENDPOINTS.BASE}/${propertyId}/deal-maker`, data);
}

// ===========================================
// Adjustment History Endpoints
// ===========================================

/**
 * Get adjustment history for a property
 */
export async function getPropertyAdjustments(
  propertyId: string
): Promise<PropertyAdjustmentResponse[]> {
  return api.get<PropertyAdjustmentResponse[]>(
    `${ENDPOINTS.BASE}/${propertyId}/adjustments`
  );
}

/**
 * Create a new adjustment record
 */
export async function createPropertyAdjustment(
  propertyId: string,
  data: PropertyAdjustmentCreate
): Promise<PropertyAdjustmentResponse> {
  return api.post<PropertyAdjustmentResponse>(
    `${ENDPOINTS.BASE}/${propertyId}/adjustments`,
    data
  );
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Check if a property is saved by address
 */
export async function isPropertySaved(address: string): Promise<boolean> {
  try {
    const properties = await getSavedProperties({ search: address, limit: 1 });
    return properties.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get properties by status
 */
export async function getPropertiesByStatus(
  status: PropertyStatus
): Promise<SavedPropertySummary[]> {
  return getSavedProperties({ status });
}

/**
 * Quick save property from search
 */
export async function quickSaveProperty(
  address: string,
  propertyData: Record<string, unknown>
): Promise<SavedPropertyResponse> {
  return saveProperty({
    address_street: address,
    property_data_snapshot: propertyData,
    status: 'watching',
  });
}

// ===========================================
// Export as savedPropertiesService object
// ===========================================
export const savedPropertiesService = {
  // List & Query
  getSavedProperties,
  getPortfolioStats,
  getBulkSaveStatus,

  // CRUD
  saveProperty,
  getSavedProperty,
  updateSavedProperty,
  deleteSavedProperty,

  // Bulk Operations
  bulkUpdateStatus,
  bulkDeleteProperties,

  // Deal Maker
  getDealMaker,
  updateDealMaker,

  // Adjustments
  getPropertyAdjustments,
  createPropertyAdjustment,

  // Helpers
  isPropertySaved,
  getPropertiesByStatus,
  quickSaveProperty,
};

export default savedPropertiesService;
