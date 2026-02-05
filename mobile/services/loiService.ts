/**
 * LOI Service - Letter of Intent generation
 *
 * Handles LOI generation, templates, preferences, and history
 * for wholesale deals.
 */

import { api } from './apiClient';
import {
  GenerateLOIRequest,
  QuickGenerateLOIRequest,
  LOIDocument,
  LOITemplateInfo,
  LOIUserPreferences,
  LOIHistoryItem,
  LOIFormat,
} from '../types';

// API Endpoints
const ENDPOINTS = {
  GENERATE: '/api/v1/loi/generate',
  GENERATE_PDF: '/api/v1/loi/generate/pdf',
  GENERATE_FROM_ANALYSIS: '/api/v1/loi/generate/from-analysis',
  QUICK_GENERATE: '/api/v1/loi/quick-generate',
  TEMPLATES: '/api/v1/loi/templates',
  PREFERENCES: '/api/v1/loi/preferences',
  HISTORY: '/api/v1/loi/history',
};

// ===========================================
// Generation Endpoints
// ===========================================

/**
 * Generate a full LOI document
 */
export async function generateLOI(
  request: GenerateLOIRequest
): Promise<LOIDocument> {
  return api.post<LOIDocument>(ENDPOINTS.GENERATE, request);
}

/**
 * Generate LOI as PDF
 */
export async function generateLOIPdf(
  request: GenerateLOIRequest
): Promise<LOIDocument> {
  return api.post<LOIDocument>(ENDPOINTS.GENERATE_PDF, {
    ...request,
    format: 'pdf',
  });
}

/**
 * Generate LOI from saved property analysis
 */
export async function generateLOIFromAnalysis(
  savedPropertyId: string,
  offerPrice: number,
  format: LOIFormat = 'pdf'
): Promise<LOIDocument> {
  return api.post<LOIDocument>(ENDPOINTS.GENERATE_FROM_ANALYSIS, {
    saved_property_id: savedPropertyId,
    offer_price: offerPrice,
    format,
  });
}

/**
 * Quick generate LOI with minimal inputs
 */
export async function quickGenerateLOI(
  request: QuickGenerateLOIRequest
): Promise<LOIDocument> {
  return api.post<LOIDocument>(ENDPOINTS.QUICK_GENERATE, request);
}

// ===========================================
// Templates Endpoints
// ===========================================

/**
 * Get available LOI templates
 */
export async function getTemplates(): Promise<LOITemplateInfo[]> {
  return api.get<LOITemplateInfo[]>(ENDPOINTS.TEMPLATES);
}

// ===========================================
// Preferences Endpoints
// ===========================================

/**
 * Get user's LOI preferences
 */
export async function getPreferences(): Promise<LOIUserPreferences> {
  return api.get<LOIUserPreferences>(ENDPOINTS.PREFERENCES);
}

/**
 * Save user's LOI preferences
 */
export async function savePreferences(
  preferences: LOIUserPreferences
): Promise<LOIUserPreferences> {
  return api.post<LOIUserPreferences>(ENDPOINTS.PREFERENCES, preferences);
}

// ===========================================
// History Endpoints
// ===========================================

/**
 * Get LOI history
 */
export async function getHistory(
  limit: number = 20
): Promise<LOIHistoryItem[]> {
  return api.get<LOIHistoryItem[]>(ENDPOINTS.HISTORY, { limit });
}

/**
 * Get a specific LOI from history
 */
export async function getHistoryItem(loiId: string): Promise<LOIDocument> {
  return api.get<LOIDocument>(`${ENDPOINTS.HISTORY}/${loiId}`);
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Calculate default earnest money (typically 1% of offer)
 */
export function calculateDefaultEarnestMoney(offerPrice: number): number {
  const earnest = offerPrice * 0.01;
  // Round to nearest 500
  return Math.round(earnest / 500) * 500 || 1000;
}

/**
 * Calculate offer expiration date
 */
export function calculateExpirationDate(days: number = 3): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Format LOI for display
 */
export function formatLOIAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get LOI status label and color
 */
export function getLOIStatusInfo(status: string): { label: string; color: string } {
  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#6b7280' },
    sent: { label: 'Sent', color: '#3b82f6' },
    accepted: { label: 'Accepted', color: '#10b981' },
    countered: { label: 'Countered', color: '#f59e0b' },
    rejected: { label: 'Rejected', color: '#ef4444' },
    expired: { label: 'Expired', color: '#6b7280' },
  };

  return statusMap[status] || { label: status, color: '#6b7280' };
}

// ===========================================
// Export as loiService object
// ===========================================
export const loiService = {
  // Generation
  generateLOI,
  generateLOIPdf,
  generateLOIFromAnalysis,
  quickGenerateLOI,

  // Templates
  getTemplates,

  // Preferences
  getPreferences,
  savePreferences,

  // History
  getHistory,
  getHistoryItem,

  // Helpers
  calculateDefaultEarnestMoney,
  calculateExpirationDate,
  formatLOIAmount,
  getLOIStatusInfo,
};

export default loiService;
