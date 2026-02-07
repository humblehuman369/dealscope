'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAccessToken } from '@/lib/api'
import {
  Building2, ArrowLeft, MapPin, Calendar, Tag, Edit2, Save, X,
  FileText, Download, Upload, Trash2, ExternalLink, ChevronDown,
  User, Mail, Phone, Home, DollarSign, TrendingUp, BarChart3,
  FileSpreadsheet, ClipboardList, Clock, StickyNote, FolderOpen,
  ChevronRight, Loader2, AlertCircle
} from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

// ===========================================
// Types
// ===========================================

interface PropertyFile {
  id: string
  external_property_id?: string
  zpid?: string
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  nickname?: string
  status: string
  tags?: string[]
  priority?: number
  notes?: string
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  estimated_value?: number
  custom_purchase_price?: number
  custom_monthly_rent?: number
  custom_arv?: number
  custom_rehab_cost?: number
  property_data_snapshot?: any
  saved_at: string
  updated_at: string
}

interface Document {
  id: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  document_type: string
  title?: string
  created_at: string
}

const statusOptions = [
  { value: 'watching', label: 'Watching', color: 'bg-blue-500' },
  { value: 'analyzing', label: 'Analyzing', color: 'bg-amber-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-purple-600' },
  { value: 'under_contract', label: 'Under Contract', color: 'bg-emerald-500' },
  { value: 'owned', label: 'Owned', color: 'bg-teal-600' },
  { value: 'passed', label: 'Passed', color: 'bg-slate-400' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
]

const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n.toFixed(0)}`
const fmtBytes = (b: number) => b >= 1_048_576 ? `${(b/1_048_576).toFixed(1)} MB` : `${(b/1_024).toFixed(0)} KB`

// ===========================================
// Component
// ===========================================

export default function PropertyFilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [property, setProperty] = useState<PropertyFile | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'documents' | 'exports'>('overview')
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getAccessToken()
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }, [])

  const fetchProperty = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/properties/saved/${id}`, { headers: headers(), credentials: 'include' })
      if (!res.ok) throw new Error('Property not found')
      const data = await res.json()
      setProperty(data)
      setNotes(data.notes || '')
    } catch (err) {
      setError('Property not found or you don\'t have access')
    }
  }, [id, headers])

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/documents?property_id=${id}`, { headers: headers(), credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.items || data || [])
      }
    } catch (err) {
      console.warn('Could not fetch documents')
    }
  }, [id, headers])

  useEffect(() => {
    Promise.all([fetchProperty(), fetchDocuments()]).finally(() => setIsLoading(false))
  }, [fetchProperty, fetchDocuments])

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/properties/saved/${id}`, {
        method: 'PATCH', headers: headers(), credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      setProperty(prev => prev ? { ...prev, status: newStatus } : null)
      setEditingStatus(false)
    } catch (err) { console.error('Failed to update status') }
  }

  const saveNotes = async () => {
    setIsSavingNotes(true)
    try {
      await fetch(`${API_BASE_URL}/api/v1/properties/saved/${id}`, {
        method: 'PATCH', headers: headers(), credentials: 'include',
        body: JSON.stringify({ notes })
      })
    } catch (err) { console.error('Failed to save notes') }
    finally { setIsSavingNotes(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const token = getAccessToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('property_id', id)
      formData.append('document_type', 'other')

      const res = await fetch(`${API_BASE_URL}/api/v1/documents`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData
      })
      if (res.ok) await fetchDocuments()
    } catch (err) { console.error('Upload failed') }
    finally { setIsUploading(false) }
  }

  const downloadReport = async (format: 'excel' | 'pdf') => {
    const token = getAccessToken()
    const propId = property?.external_property_id || property?.zpid || id
    const address = property?.address_street || ''
    const endpoint = format === 'excel'
      ? `${API_BASE_URL}/api/v1/proforma/property/${propId}/excel?address=${encodeURIComponent(address)}`
      : `${API_BASE_URL}/api/v1/proforma/property/${propId}/pdf?address=${encodeURIComponent(address)}`

    try {
      const res = await fetch(endpoint, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proforma-${address.replace(/\s+/g, '-')}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { console.error('Download failed:', err) }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Property Not Found</h2>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <Link href="/dashboard/properties" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
          Back to Properties
        </Link>
      </div>
    )
  }

  const snapshot = property.property_data_snapshot || {}
  const owner = snapshot.owner || {}
  const currentStatus = statusOptions.find(s => s.value === property.status)

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: Building2 },
    { key: 'notes' as const, label: 'Notes', icon: StickyNote },
    { key: 'documents' as const, label: 'Documents', icon: FolderOpen, count: documents.length },
    { key: 'exports' as const, label: 'Exports & LOI', icon: FileSpreadsheet },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back nav */}
      <button onClick={() => router.push('/dashboard/properties')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to Properties
      </button>

      {/* Property Header */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700 p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                {property.nickname || property.address_street}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                <MapPin size={12} />
                {property.address_street}, {property.address_city}, {property.address_state} {property.address_zip}
              </p>
              <div className="flex items-center gap-3 mt-3">
                {/* Status badge / selector */}
                <div className="relative">
                  <button
                    onClick={() => setEditingStatus(!editingStatus)}
                    className={`text-xs font-semibold uppercase px-3 py-1 rounded-full flex items-center gap-1.5 ${
                      currentStatus ? `${currentStatus.color} text-white` : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {property.status.replace('_', ' ')}
                    <ChevronDown size={10} />
                  </button>
                  {editingStatus && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl shadow-xl p-1 min-w-[160px]">
                      {statusOptions.map(s => (
                        <button
                          key={s.value}
                          onClick={() => updateStatus(s.value)}
                          className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                            property.status === s.value ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${s.color}`} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  Saved {new Date(property.saved_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {property.zpid && (
              <Link
                href={`/property/${property.zpid}`}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-navy-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:border-teal-300 transition-colors flex items-center gap-2"
              >
                <ExternalLink size={14} /> Full Analysis
              </Link>
            )}
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-navy-700">
          {[
            { label: 'Est. Value', value: property.estimated_value ? fmt(property.estimated_value) : 'N/A', icon: DollarSign },
            { label: 'Best Strategy', value: property.best_strategy?.toUpperCase() || 'N/A', icon: TrendingUp },
            { label: 'Cash Flow', value: property.best_cash_flow != null ? `$${property.best_cash_flow.toLocaleString()}/mo` : 'N/A', icon: BarChart3 },
            { label: 'CoC Return', value: property.best_coc_return != null ? `${(property.best_coc_return * 100).toFixed(1)}%` : 'N/A', icon: TrendingUp },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 dark:bg-navy-750 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{m.label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Owner Information (if available) */}
      {(owner.owner_name || snapshot.owner_occupied !== undefined) && (
        <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700 p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <User size={16} className="text-blue-500" />
            Owner Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {owner.owner_name && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Owner Name</p>
                <p className="text-sm font-medium text-slate-800 dark:text-white mt-1">{owner.owner_name}</p>
              </div>
            )}
            {owner.owner_type && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Owner Type</p>
                <p className="text-sm font-medium text-slate-800 dark:text-white mt-1 capitalize">{owner.owner_type}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Occupancy</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white mt-1">
                {snapshot.owner_occupied === true ? 'Owner Occupied' :
                 snapshot.owner_occupied === false ? 'Non-Owner Occupied (Absentee)' : 'Unknown'}
              </p>
            </div>
            {owner.owner_mailing_state && owner.owner_mailing_state !== property.address_state && (
              <div className="sm:col-span-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <MapPin size={10} /> Out-of-State Owner ({owner.owner_mailing_state})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-navy-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-navy-600 text-slate-500 font-bold">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Property Details</h3>
            {snapshot.details ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Property Type', value: snapshot.details.property_type },
                  { label: 'Bedrooms', value: snapshot.details.bedrooms },
                  { label: 'Bathrooms', value: snapshot.details.bathrooms },
                  { label: 'Square Footage', value: snapshot.details.square_footage?.toLocaleString() },
                  { label: 'Year Built', value: snapshot.details.year_built },
                  { label: 'Lot Size', value: snapshot.details.lot_size ? `${snapshot.details.lot_size.toLocaleString()} sqft` : undefined },
                ].filter(d => d.value).map(d => (
                  <div key={d.label}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{d.label}</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white mt-1 capitalize">{d.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No property details snapshot available. <Link href={`/property/${property.zpid || ''}`} className="text-teal-600 hover:text-teal-700 font-medium">View full analysis</Link> to see details.
              </p>
            )}

            {/* Tags */}
            {property.tags && property.tags.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {property.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-navy-700 text-xs text-slate-600 dark:text-slate-400">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Notes & Memos</h3>
              <button
                onClick={saveNotes}
                disabled={isSavingNotes}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Notes
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this property, your observations, deal terms, contact history, or anything you want to remember..."
              rows={12}
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-navy-750 border border-slate-200 dark:border-navy-700 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-y"
            />
            <p className="text-xs text-slate-400 mt-2">Your notes are saved privately and only visible to you.</p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Property Documents</h3>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium cursor-pointer transition-colors">
                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
              </label>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No documents uploaded yet</p>
                <p className="text-xs text-slate-400">Upload inspections, appraisals, contracts, or photos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-750 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{doc.title || doc.original_filename}</p>
                        <p className="text-xs text-slate-400">{fmtBytes(doc.file_size)} &middot; {doc.document_type} &middot; {new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <a
                      href={`${API_BASE_URL}/api/v1/documents/${doc.id}/download`}
                      className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'exports' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Generate Reports & Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => downloadReport('excel')}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet size={22} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">Excel Proforma</p>
                  <p className="text-xs text-slate-400 mt-0.5">10-year projections, cash flow analysis, amortization</p>
                </div>
              </button>

              <button
                onClick={() => downloadReport('pdf')}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={22} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">PDF Report</p>
                  <p className="text-xs text-slate-400 mt-0.5">Professional investment summary for lenders</p>
                </div>
              </button>

              <Link
                href={`/deal-maker/${encodeURIComponent(property.address_street)}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={22} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">Letter of Intent</p>
                  <p className="text-xs text-slate-400 mt-0.5">Generate professional LOI for this property</p>
                </div>
              </Link>

              {property.zpid && (
                <Link
                  href={`/worksheet/${property.zpid}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">Strategy Worksheet</p>
                    <p className="text-xs text-slate-400 mt-0.5">Deep dive analysis with editable assumptions</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
