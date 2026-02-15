/**
 * Reports Service - Report generation and download
 *
 * Handles Excel, CSV, and financial statement report generation
 * for property analysis.
 */

import { api } from './apiClient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  ReportType,
  ReportDownloadResponse,
  REPORT_EXTENSIONS,
  REPORT_MIME_TYPES,
} from '../types';

// API Endpoints
const ENDPOINTS = {
  PROPERTY_EXCEL: '/api/v1/reports/property',
  SAVED_EXCEL: '/api/v1/reports/saved',
};

// ===========================================
// Report Generation Endpoints
// ===========================================

/**
 * Generate Excel report for a property
 */
export async function generatePropertyExcel(
  propertyId: string
): Promise<{ url: string; filename: string }> {
  return api.downloadFile(`${ENDPOINTS.PROPERTY_EXCEL}/${propertyId}/excel`);
}

/**
 * Generate financial statements report
 */
export async function generateFinancialStatements(
  propertyId: string
): Promise<{ url: string; filename: string }> {
  return api.downloadFile(`${ENDPOINTS.PROPERTY_EXCEL}/${propertyId}/financial-statements`);
}

/**
 * Generate CSV report
 */
export async function generateCSV(
  propertyId: string
): Promise<{ url: string; filename: string }> {
  return api.downloadFile(`${ENDPOINTS.PROPERTY_EXCEL}/${propertyId}/csv`);
}

/**
 * Generate Excel report for a saved property
 */
export async function generateSavedPropertyExcel(
  savedPropertyId: string
): Promise<{ url: string; filename: string }> {
  return api.downloadFile(`${ENDPOINTS.SAVED_EXCEL}/${savedPropertyId}/excel`);
}

// ===========================================
// Download & Share Functions
// ===========================================

/**
 * Download and save a report locally
 */
export async function downloadReport(
  reportType: ReportType,
  propertyId: string,
  filename?: string
): Promise<string> {
  let downloadResult: { url: string; filename: string };

  switch (reportType) {
    case 'excel':
      downloadResult = await generatePropertyExcel(propertyId);
      break;
    case 'financial_statements':
      downloadResult = await generateFinancialStatements(propertyId);
      break;
    case 'csv':
      downloadResult = await generateCSV(propertyId);
      break;
  }

  // Generate local filename
  const localFilename = filename || `report_${propertyId}${REPORT_EXTENSIONS[reportType]}`;
  const localUri = `${FileSystem.documentDirectory}${localFilename}`;

  // Download from blob URL to local file
  // Note: In a real implementation, you'd download from the API response
  // For now, we return the download URL
  return downloadResult.url;
}

/**
 * Share a report using the system share sheet
 */
export async function shareReport(
  reportType: ReportType,
  propertyId: string,
  title?: string
): Promise<void> {
  // Check if sharing is available
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  // Download the report
  const fileUri = await downloadReport(reportType, propertyId);

  // Share the file
  await Sharing.shareAsync(fileUri, {
    mimeType: REPORT_MIME_TYPES[reportType],
    dialogTitle: title || 'Share Report',
  });
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get report type display name
 */
export function getReportTypeName(type: ReportType): string {
  const names: Record<ReportType, string> = {
    excel: 'Excel Report',
    financial_statements: 'Financial Statements',
    csv: 'CSV Export',
  };
  return names[type];
}

/**
 * Get report type description
 */
export function getReportTypeDescription(type: ReportType): string {
  const descriptions: Record<ReportType, string> = {
    excel: 'Comprehensive analysis with all metrics, projections, and charts',
    financial_statements: 'NOI, DSCR, Pro Forma statements for professional use',
    csv: 'Simple data export for spreadsheet analysis',
  };
  return descriptions[type];
}

/**
 * Generate suggested filename for a report
 */
export function generateReportFilename(
  address: string,
  reportType: ReportType
): string {
  // Clean address for filename
  const cleanAddress = address
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  const date = new Date().toISOString().split('T')[0];
  const extension = REPORT_EXTENSIONS[reportType];

  return `DealGapIQ_${cleanAddress}_${date}${extension}`;
}

// ===========================================
// Export as reportsService object
// ===========================================
export const reportsService = {
  // Generation
  generatePropertyExcel,
  generateFinancialStatements,
  generateCSV,
  generateSavedPropertyExcel,

  // Download & Share
  downloadReport,
  shareReport,

  // Helpers
  getReportTypeName,
  getReportTypeDescription,
  generateReportFilename,
};

export default reportsService;
