/**
 * Reports types - for report generation endpoints
 */

// ===========================================
// Report Types
// ===========================================
export type ReportType = 'excel' | 'financial_statements' | 'csv';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  excel: 'Excel Report',
  financial_statements: 'Financial Statements',
  csv: 'CSV Export',
};

export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  excel: 'Comprehensive analysis with all metrics and projections',
  financial_statements: 'NOI, DSCR, and Pro Forma statements',
  csv: 'Simple data export for spreadsheet analysis',
};

// ===========================================
// Report Request
// ===========================================
export interface ReportRequest {
  property_id: string;
  report_type: ReportType;
  include_sensitivity?: boolean;
  include_projections?: boolean;
}

// ===========================================
// Report Download Response
// ===========================================
export interface ReportDownloadResponse {
  download_url: string;
  filename: string;
  file_size_bytes: number;
  expires_at: string;
  content_type: string;
}

// ===========================================
// Saved Property Report Request
// ===========================================
export interface SavedPropertyReportRequest {
  saved_property_id: string;
  report_type: ReportType;
}

// ===========================================
// Report Generation Status
// ===========================================
export type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed';

export interface ReportGenerationStatus {
  status: ReportStatus;
  progress?: number; // 0-100
  message?: string;
  download_url?: string;
  error?: string;
}

// ===========================================
// File MIME Types for Reports
// ===========================================
export const REPORT_MIME_TYPES: Record<ReportType, string> = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  financial_statements: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
};

// ===========================================
// File Extensions for Reports
// ===========================================
export const REPORT_EXTENSIONS: Record<ReportType, string> = {
  excel: '.xlsx',
  financial_statements: '.xlsx',
  csv: '.csv',
};
