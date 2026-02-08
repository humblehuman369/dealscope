'use client'

import { useState, useRef, useCallback } from 'react'
import { 
  Upload, File, FileText, Image, Trash2, Download, 
  Loader2, X, Check, Folder, Eye
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { API_BASE_URL } from '@/lib/env'

// ===========================================
// Types
// ===========================================

interface Document {
  id: string
  user_id: string
  property_id?: string
  document_type: string
  original_filename: string
  mime_type: string
  file_size: number
  description?: string
  uploaded_at: string
}

interface DocumentUploadProps {
  propertyId?: string  // Optional property to link documents to
  onUploadComplete?: (document: Document) => void
  maxFiles?: number
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.xlsx', '.xls', '.docx', '.doc', '.txt', '.csv']
const MAX_FILE_SIZE_MB = 10

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'photo', label: 'Property Photo' },
  { value: 'financial', label: 'Financial Document' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'loi', label: 'Letter of Intent' },
  { value: 'other', label: 'Other' },
]

// ===========================================
// Helper Functions
// ===========================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="w-5 h-5 text-purple-500" />
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileText className="w-5 h-5 text-green-500" />
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileText className="w-5 h-5 text-blue-500" />
  }
  return <File className="w-5 h-5 text-gray-500" />
}

// ===========================================
// Main Component
// ===========================================

export default function DocumentUpload({
  propertyId,
  onUploadComplete,
  maxFiles = 10,
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedType, setSelectedType] = useState('other')
  const [description, setDescription] = useState('')
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch existing documents
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      let url = `/api/v1/documents?limit=50`
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }

      const data = await api.get<{ items: Document[] }>(url)
      setDocuments(data.items || [])
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setIsLoading(false)
    }
  }, [propertyId])

  // Upload file
  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE_MB} MB limit`)
      }

      // Validate file type
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(`File type ${ext} is not allowed`)
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', selectedType)
      if (propertyId) {
        formData.append('property_id', propertyId)
      }
      if (description) {
        formData.append('description', description)
      }

      const headers: Record<string, string> = {}
      const csrfMatch = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))
      if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch.split('=')[1]

      const response = await fetch(`${API_BASE_URL}/api/v1/documents`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Upload failed')
      }

      const uploadedDoc = await response.json()
      setDocuments(prev => [uploadedDoc, ...prev])
      setDescription('')
      
      if (onUploadComplete) {
        onUploadComplete(uploadedDoc)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Download document
  const downloadDocument = async (doc: Document) => {
    try {
      const headers: Record<string, string> = {}
      const csrfMatch = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))
      if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch.split('=')[1]

      const response = await fetch(`${API_BASE_URL}/api/v1/documents/${doc.id}/download`, {
        headers,
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.original_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  // Delete document
  const deleteDocument = async (docId: string) => {
    if (!confirm('Delete this document?')) return

    try {
      await api.delete(`/api/v1/documents/${docId}`)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragActive
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-navy-900 dark:text-white mb-1">
              Drag and drop a file here
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              or click to browse
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Select File
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Max {MAX_FILE_SIZE_MB} MB • {ALLOWED_EXTENSIONS.join(', ')}
            </p>
          </>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Document Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description..."
            className="w-full px-3 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Uploaded Documents ({documents.length})
          </h4>
          
          <div className="bg-gray-50 dark:bg-navy-700/50 rounded-xl divide-y divide-neutral-200 dark:divide-neutral-600">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {getFileIcon(doc.mime_type)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 dark:text-white truncate">
                    {doc.original_filename}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(doc.file_size)} • {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    {doc.description && ` • ${doc.description}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => downloadDocument(doc)}
                    className="p-2 text-gray-400 hover:text-brand-500 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

