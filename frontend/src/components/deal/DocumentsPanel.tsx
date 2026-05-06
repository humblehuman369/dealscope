'use client'

/**
 * Documents panel — list + drag-drop file upload + tap-to-view/download.
 */

import { useRef, useState } from 'react'
import { Download, Eye, FileText, Trash2, Upload } from 'lucide-react'
import {
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
} from '@/hooks/useDocuments'
import {
  DOCUMENT_TYPES_ORDERED,
  DOCUMENT_TYPE_LABELS,
  formatFileSize,
  type DocumentType,
  type PropertyDocument,
} from '@/types/document'

export function DocumentsPanel({ propertyId }: { propertyId: string }) {
  const docs = useDocuments(propertyId)
  const upload = useUploadDocument(propertyId)
  const del = useDeleteDocument(propertyId)

  const [docType, setDocType] = useState<DocumentType>('contract')
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const items = docs.data?.items ?? []

  function uploadFiles(files: FileList | File[]) {
    for (const f of Array.from(files)) {
      upload.mutate({ file: f, document_type: docType })
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {docs.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : docs.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load documents.{' '}
            <button onClick={() => docs.refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--text-label)] text-center py-8 px-4">
            No documents yet — drop a contract, inspection report, or photos below.
          </p>
        ) : (
          items.map((d) => (
            <DocumentRow key={d.id} doc={d} onDelete={() => del.mutate(d.id)} />
          ))
        )}
      </div>

      <div className="border-t border-[var(--border-default)] px-3 py-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            aria-label="Document type"
            className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-2 text-sm text-[var(--text-heading)]"
          >
            {DOCUMENT_TYPES_ORDERED.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={onPickFile}
            className="hidden"
          />
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!isDraggingFile) setIsDraggingFile(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setIsDraggingFile(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDraggingFile(false)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              uploadFiles(e.dataTransfer.files)
            }
          }}
          className={`rounded-lg border border-dashed px-3 py-3 text-center text-xs transition-colors ${
            isDraggingFile
              ? 'border-[var(--accent-sky)] bg-[var(--color-sky-dim)] text-[var(--accent-sky)]'
              : 'border-[var(--border-default)] text-[var(--text-label)]'
          }`}
        >
          {upload.isPending
            ? 'Uploading…'
            : upload.isError
            ? `Upload failed: ${(upload.error as Error)?.message ?? 'unknown error'}`
            : 'Drop files here or click Upload'}
        </div>
      </div>
    </div>
  )
}

function DocumentRow({
  doc,
  onDelete,
}: {
  doc: PropertyDocument
  onDelete: () => void
}) {
  return (
    <div className="group flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-[var(--hover-overlay)]">
      <span className="shrink-0 mt-0.5 w-7 h-7 rounded inline-flex items-center justify-center bg-[var(--surface-elevated)] text-[var(--accent-sky)]">
        <FileText className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-heading)] truncate">
          {doc.original_filename}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--color-sky-dim)] text-[var(--accent-sky)]">
            {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
          </span>
          <span className="text-[11px] text-[var(--text-label)] tabular-nums">
            {formatFileSize(doc.file_size)}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`/api/v1/documents/${doc.id}/view`}
          target="_blank"
          rel="noreferrer"
          aria-label="View document"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          <Eye className="w-3.5 h-3.5" />
        </a>
        <a
          href={`/api/v1/documents/${doc.id}/download`}
          aria-label="Download document"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete document"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
