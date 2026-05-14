'use client'

/**
 * Hooks for property documents. Wraps /api/v1/documents — the documents API
 * is global (not nested under a property), so we filter by property_id when
 * listing and pass it on upload.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { TIMELINE_KEYS } from '@/hooks/useTimeline'
import type { DocumentList, DocumentType, PropertyDocument } from '@/types/document'

export const DOCUMENTS_KEYS = {
  all: ['documents'] as const,
  forProperty: (propertyId: string) => [...DOCUMENTS_KEYS.all, 'property', propertyId] as const,
}

export function useDocuments(propertyId: string | null) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.forProperty(propertyId ?? ''),
    queryFn: () => api.get<DocumentList>(`/api/v1/documents?property_id=${propertyId}&limit=100`),
    enabled: !!propertyId,
    staleTime: 30_000,
  })
}

interface UploadInput {
  file: File
  document_type: DocumentType
  description?: string
}

/**
 * Upload via multipart/form-data. The Documents API uses ``Form()`` fields
 * rather than JSON, so we hand a FormData directly to fetch. Going around
 * ``api.post`` because that helper assumes JSON; the underlying auth +
 * cookie setup uses ``credentials: 'include'`` which fetch inherits via the
 * default ``RequestInit``.
 */
async function uploadDocument(propertyId: string, body: UploadInput): Promise<PropertyDocument> {
  const fd = new FormData()
  fd.append('file', body.file)
  fd.append('document_type', body.document_type)
  fd.append('property_id', propertyId)
  if (body.description) fd.append('description', body.description)

  const resp = await fetch('/api/v1/documents', {
    method: 'POST',
    body: fd,
    credentials: 'include',
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    let detail = text
    try {
      detail = (JSON.parse(text) as { detail?: string }).detail ?? text
    } catch {
      // Body wasn't JSON — keep it as raw text.
    }
    throw new Error(detail || `Upload failed (${resp.status})`)
  }
  return (await resp.json()) as PropertyDocument
}

export function useUploadDocument(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UploadInput) => uploadDocument(propertyId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: TIMELINE_KEYS.forProperty(propertyId) })
    },
  })
}

export function useDeleteDocument(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => api.delete<void>(`/api/v1/documents/${documentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: TIMELINE_KEYS.forProperty(propertyId) })
    },
  })
}
