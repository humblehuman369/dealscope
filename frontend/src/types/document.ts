/**
 * Property-document types. Mirrors backend DocumentResponse + DocumentType.
 */

export type DocumentType =
  // Property Analysis
  | 'inspection_report'
  | 'appraisal'
  | 'title_report'
  | 'survey'
  // Financial
  | 'tax_records'
  | 'insurance'
  | 'mortgage_docs'
  | 'financial_statement'
  // Legal
  | 'contract'
  | 'lease'
  | 'disclosure'
  // Visual
  | 'photos'
  | 'floor_plan'
  // Renovation
  | 'renovation_estimate'
  | 'contractor_bid'
  | 'permits'
  // Reports
  | 'market_analysis'
  | 'comparable_sales'
  | 'rent_analysis'
  // Other
  | 'notes'
  | 'other'

export interface PropertyDocument {
  id: string
  user_id: string
  property_id: string | null
  document_type: DocumentType
  original_filename: string
  mime_type: string
  file_size: number
  description: string | null
  uploaded_at: string
}

export interface DocumentList {
  items: PropertyDocument[]
  total: number
  limit: number
  offset: number
}

/** Display labels for the type pill + select dropdown. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  inspection_report: 'Inspection',
  appraisal: 'Appraisal',
  title_report: 'Title',
  survey: 'Survey',
  tax_records: 'Tax',
  insurance: 'Insurance',
  mortgage_docs: 'Mortgage',
  financial_statement: 'Financial',
  contract: 'Contract',
  lease: 'Lease',
  disclosure: 'Disclosure',
  photos: 'Photos',
  floor_plan: 'Floor Plan',
  renovation_estimate: 'Reno Estimate',
  contractor_bid: 'Contractor Bid',
  permits: 'Permits',
  market_analysis: 'Market',
  comparable_sales: 'Comps',
  rent_analysis: 'Rent',
  notes: 'Notes',
  other: 'Other',
}

/** Ordered list for the upload-form dropdown. Matches the model's logical
 *  grouping so the menu reads naturally. */
export const DOCUMENT_TYPES_ORDERED: DocumentType[] = [
  'contract',
  'inspection_report',
  'appraisal',
  'disclosure',
  'mortgage_docs',
  'insurance',
  'title_report',
  'survey',
  'lease',
  'tax_records',
  'financial_statement',
  'photos',
  'floor_plan',
  'renovation_estimate',
  'contractor_bid',
  'permits',
  'market_analysis',
  'comparable_sales',
  'rent_analysis',
  'notes',
  'other',
]

/** Human-friendly file size: 1.2 MB / 320 KB / 4 B. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
