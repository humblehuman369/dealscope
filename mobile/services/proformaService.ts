/**
 * Proforma Service - Financial proforma generation
 *
 * Handles proforma generation, preview, and export
 * for detailed investment analysis.
 */

import { api } from './apiClient';
import {
  ProformaRequest,
  FinancialProforma,
  ProformaExportResponse,
  ProformaFormat,
  StrategyType,
} from '../types';

// API Endpoints
const ENDPOINTS = {
  GENERATE: '/api/v1/proforma/generate',
  SAVED: '/api/v1/proforma/saved',
};

// ===========================================
// Generation Endpoints
// ===========================================

/**
 * Generate a financial proforma
 */
export async function generateProforma(
  request: ProformaRequest
): Promise<FinancialProforma> {
  return api.post<FinancialProforma>(ENDPOINTS.GENERATE, request);
}

/**
 * Generate proforma with default settings
 */
export async function generateQuickProforma(
  propertyId: string,
  address: string,
  strategy: StrategyType = 'ltr',
  purchasePrice?: number,
  monthlyRent?: number
): Promise<FinancialProforma> {
  return generateProforma({
    property_id: propertyId,
    address,
    strategy,
    purchase_price: purchasePrice,
    monthly_rent: monthlyRent,
    land_value_percent: 0.20,
    marginal_tax_rate: 0.24,
    capital_gains_tax_rate: 0.15,
    hold_period_years: 10,
    format: 'json',
  });
}

// ===========================================
// Saved Proforma Endpoints
// ===========================================

/**
 * Get proforma for a saved property
 */
export async function getSavedProforma(
  savedPropertyId: string
): Promise<FinancialProforma> {
  return api.get<FinancialProforma>(`${ENDPOINTS.SAVED}/${savedPropertyId}`);
}

/**
 * Download proforma for a saved property
 */
export async function downloadSavedProforma(
  savedPropertyId: string,
  format: ProformaFormat = 'xlsx'
): Promise<ProformaExportResponse> {
  return api.get<ProformaExportResponse>(
    `${ENDPOINTS.SAVED}/${savedPropertyId}/download`,
    { format }
  );
}

/**
 * Get proforma preview data
 */
export async function getProformaPreview(
  savedPropertyId: string
): Promise<FinancialProforma> {
  return api.get<FinancialProforma>(`${ENDPOINTS.SAVED}/${savedPropertyId}/preview`);
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Format currency for proforma display
 */
export function formatProformaCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for proforma display
 */
export function formatProformaPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Get IRR color based on value
 */
export function getIRRColor(irr: number): string {
  if (irr >= 0.15) return '#10b981'; // green
  if (irr >= 0.10) return '#22c55e'; // light green
  if (irr >= 0.05) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}

/**
 * Get cash-on-cash color based on value
 */
export function getCoCColor(coc: number): string {
  if (coc >= 0.12) return '#10b981'; // green
  if (coc >= 0.08) return '#22c55e'; // light green
  if (coc >= 0.05) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}

/**
 * Calculate equity buildup from projections
 */
export function calculateEquityBuildup(
  projections: FinancialProforma['projections']
): number[] {
  return projections.equity_positions.map((equity, index) => {
    if (index === 0) return 0;
    return equity - projections.equity_positions[index - 1];
  });
}

/**
 * Get cash flow trend (increasing, decreasing, stable)
 */
export function getCashFlowTrend(
  projections: FinancialProforma['projections']
): 'increasing' | 'decreasing' | 'stable' {
  const cashFlows = projections.annual_projections.map((p) => p.pre_tax_cash_flow);

  if (cashFlows.length < 2) return 'stable';

  let increases = 0;
  let decreases = 0;

  for (let i = 1; i < cashFlows.length; i++) {
    if (cashFlows[i] > cashFlows[i - 1]) increases++;
    else if (cashFlows[i] < cashFlows[i - 1]) decreases++;
  }

  if (increases > decreases * 1.5) return 'increasing';
  if (decreases > increases * 1.5) return 'decreasing';
  return 'stable';
}

/**
 * Summarize key proforma metrics
 */
export function summarizeProforma(proforma: FinancialProforma): {
  totalReturn: number;
  avgCashFlow: number;
  totalCashFlow: number;
  equityGrowth: number;
} {
  const projections = proforma.projections.annual_projections;
  const totalCashFlow = projections.reduce((sum, p) => sum + p.pre_tax_cash_flow, 0);
  const avgCashFlow = totalCashFlow / projections.length;

  const initialEquity = proforma.projections.equity_positions[0] || 0;
  const finalEquity =
    proforma.projections.equity_positions[proforma.projections.equity_positions.length - 1] || 0;
  const equityGrowth = finalEquity - initialEquity;

  const totalReturn = totalCashFlow + equityGrowth + (proforma.exit?.after_tax_proceeds || 0);

  return {
    totalReturn,
    avgCashFlow,
    totalCashFlow,
    equityGrowth,
  };
}

// ===========================================
// Export as proformaService object
// ===========================================
export const proformaService = {
  // Generation
  generateProforma,
  generateQuickProforma,

  // Saved Proforma
  getSavedProforma,
  downloadSavedProforma,
  getProformaPreview,

  // Helpers
  formatProformaCurrency,
  formatProformaPercentage,
  getIRRColor,
  getCoCColor,
  calculateEquityBuildup,
  getCashFlowTrend,
  summarizeProforma,
};

export default proformaService;
