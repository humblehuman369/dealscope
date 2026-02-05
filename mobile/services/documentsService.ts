/**
 * Documents Service - File upload and management
 *
 * Handles document upload, download, and metadata management
 * for property-related files.
 */

import { api } from './apiClient';
import {
  DocumentResponse,
  DocumentList,
  DocumentUploadRequest,
  DocumentUpdate,
  DocumentUrlResponse,
  DocumentTypeInfo,
  DocumentQueryParams,
  DocumentType,
  DOCUMENT_TYPE_LABELS,
} from '../types';

// API Endpoints
const ENDPOINTS = {
  BASE: '/api/v1/documents',
  TYPES: '/api/v1/documents/info/types',
};

// ===========================================
// List & Query Endpoints
// ===========================================

/**
 * Get list of documents with filters
 */
export async function getDocuments(
  params?: DocumentQueryParams
): Promise<DocumentList> {
  const queryParams: Record<string, unknown> = {};

  if (params) {
    if (params.limit) queryParams.limit = params.limit;
    if (params.offset) queryParams.offset = params.offset;
    if (params.property_id) queryParams.property_id = params.property_id;
    if (params.document_type) queryParams.document_type = params.document_type;
  }

  return api.get<DocumentList>(ENDPOINTS.BASE, queryParams);
}

/**
 * Get documents for a specific property
 */
export async function getPropertyDocuments(
  propertyId: string,
  limit: number = 50
): Promise<DocumentList> {
  return getDocuments({ property_id: propertyId, limit });
}

/**
 * Get available document types
 */
export async function getDocumentTypes(): Promise<DocumentTypeInfo[]> {
  return api.get<DocumentTypeInfo[]>(ENDPOINTS.TYPES);
}

// ===========================================
// CRUD Endpoints
// ===========================================

/**
 * Upload a new document
 */
export async function uploadDocument(
  request: DocumentUploadRequest,
  onProgress?: (progress: number) => void
): Promise<DocumentResponse> {
  const formData = new FormData();

  // Append file
  formData.append('file', {
    uri: request.file.uri,
    name: request.file.name,
    type: request.file.type,
  } as unknown as Blob);

  // Append metadata
  formData.append('document_type', request.document_type);
  if (request.property_id) {
    formData.append('property_id', request.property_id);
  }
  if (request.description) {
    formData.append('description', request.description);
  }

  return api.uploadFile<DocumentResponse>(ENDPOINTS.BASE, formData, onProgress);
}

/**
 * Get a single document by ID
 */
export async function getDocument(documentId: string): Promise<DocumentResponse> {
  return api.get<DocumentResponse>(`${ENDPOINTS.BASE}/${documentId}`);
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  data: DocumentUpdate
): Promise<DocumentResponse> {
  return api.patch<DocumentResponse>(`${ENDPOINTS.BASE}/${documentId}`, data);
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  return api.del(`${ENDPOINTS.BASE}/${documentId}`);
}

// ===========================================
// Download Endpoints
// ===========================================

/**
 * Get presigned download URL for a document
 */
export async function getDocumentUrl(
  documentId: string
): Promise<DocumentUrlResponse> {
  return api.get<DocumentUrlResponse>(`${ENDPOINTS.BASE}/${documentId}/url`);
}

/**
 * Download document (returns blob)
 */
export async function downloadDocument(
  documentId: string
): Promise<{ url: string; filename: string }> {
  return api.downloadFile(`${ENDPOINTS.BASE}/${documentId}/download`);
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get document type label
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

/**
 * Get file icon based on mime type
 */
export function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return 'file-document-outline';

  if (mimeType.startsWith('image/')) return 'file-image-outline';
  if (mimeType === 'application/pdf') return 'file-pdf-box';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return 'file-excel-outline';
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return 'file-word-outline';
  }

  return 'file-document-outline';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: { name: string; type: string; size: number },
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  // Check size
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check type
  const allowedTypes = [
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

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed',
    };
  }

  return { valid: true };
}

// ===========================================
// Export as documentsService object
// ===========================================
export const documentsService = {
  // List & Query
  getDocuments,
  getPropertyDocuments,
  getDocumentTypes,

  // CRUD
  uploadDocument,
  getDocument,
  updateDocument,
  deleteDocument,

  // Download
  getDocumentUrl,
  downloadDocument,

  // Helpers
  getDocumentTypeLabel,
  getFileIcon,
  formatFileSize,
  validateFile,
};

export default documentsService;
