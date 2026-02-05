/**
 * Document types - matching backend routers/documents.py schemas
 */

import { DocumentType, PaginatedResponse } from './api';

// ===========================================
// Document Response
// ===========================================
export interface DocumentResponse {
  id: string;
  user_id: string;
  property_id: string | null;
  document_type: DocumentType;
  original_filename: string;
  mime_type: string | null;
  file_size: number | null; // in bytes
  description: string | null;
  uploaded_at: string; // ISO datetime
}

// ===========================================
// Document List (paginated)
// ===========================================
export type DocumentList = PaginatedResponse<DocumentResponse>;

// ===========================================
// Document Upload Request (form data)
// ===========================================
export interface DocumentUploadRequest {
  file: {
    uri: string;
    name: string;
    type: string;
  };
  document_type: DocumentType;
  property_id?: string | null;
  description?: string | null;
}

// ===========================================
// Document Update Request
// ===========================================
export interface DocumentUpdate {
  description?: string | null;
  document_type?: DocumentType;
}

// ===========================================
// Document Download URL Response
// ===========================================
export interface DocumentUrlResponse {
  url: string;
  expires_at: string;
}

// ===========================================
// Document Type Info
// ===========================================
export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  description: string;
  allowed_extensions: string[];
}

// ===========================================
// Document Query Params
// ===========================================
export interface DocumentQueryParams {
  limit?: number;
  offset?: number;
  property_id?: string;
  document_type?: DocumentType;
}

// ===========================================
// Constants
// ===========================================

// Maximum file size in bytes (10 MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

// Document type labels
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Contract',
  inspection: 'Inspection Report',
  appraisal: 'Appraisal',
  photos: 'Photos',
  other: 'Other',
};

// ===========================================
// Helper Functions
// ===========================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Check if file size is within limit
 */
export function isFileSizeAllowed(bytes: number): boolean {
  return bytes <= MAX_FILE_SIZE;
}
