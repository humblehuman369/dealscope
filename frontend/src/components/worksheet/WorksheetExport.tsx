'use client'

import { useState } from 'react'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { FileText, Table, Loader2, X, Check } from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

interface WorksheetExportProps {
  propertyId: string
  propertyAddress: string
}

export function WorksheetExport({ propertyId, propertyAddress }: WorksheetExportProps) {
  const { assumptions } = useWorksheetStore()
  const [isExporting, setIsExporting] = useState<'csv' | 'excel' | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(format)
    setError(null)

    try {
      const headers: Record<string, string> = {}
      const csrfMatch = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))
      if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch.split('=')[1]

      let url: string

      if (format === 'excel') {
        const params = new URLSearchParams({
          address: propertyAddress,
          strategy: 'ltr',
        })
        if (assumptions.purchasePrice > 0) params.set('purchase_price', String(assumptions.purchasePrice))
        if (assumptions.monthlyRent > 0) params.set('monthly_rent', String(assumptions.monthlyRent))
        if (assumptions.interestRate > 0) params.set('interest_rate', String(assumptions.interestRate * 100))
        if (assumptions.downPaymentPct > 0) params.set('down_payment_pct', String(assumptions.downPaymentPct * 100))
        if (assumptions.propertyTaxes > 0) params.set('property_taxes', String(assumptions.propertyTaxes))
        if (assumptions.insurance > 0) params.set('insurance', String(assumptions.insurance))
        if (assumptions.landValuePercent > 0) params.set('land_value_percent', String(assumptions.landValuePercent))
        url = `${API_BASE_URL}/api/v1/proforma/property/${propertyId}/excel?${params}`
      } else {
        url = `${API_BASE_URL}/api/v1/reports/property/${propertyId}/csv`
      }

      const response = await fetch(url, { headers, credentials: 'include' })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const detail = typeof errorData.detail === 'string' ? errorData.detail : ''
        if (response.status === 401) throw new Error('Please sign in to download.')
        if (response.status === 403) throw new Error('Pro subscription required to export.')
        throw new Error(detail || 'Export failed')
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const addressSlug = propertyAddress.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) || 'property'
      let filename = `DealGapIQ_Worksheet_${addressSlug}.${format === 'excel' ? 'xlsx' : 'csv'}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleExport('excel')}
          disabled={isExporting !== null}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--ws-positive)] hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isExporting === 'excel' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Table className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Excel</span>
        </button>
        
        <button
          onClick={() => handleExport('csv')}
          disabled={isExporting !== null}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--ws-negative)] hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isExporting === 'csv' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">CSV</span>
        </button>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="absolute top-full right-0 mt-2 px-4 py-2 bg-[var(--ws-positive)] text-white text-sm rounded-lg flex items-center gap-2 shadow-lg z-50">
          <Check className="w-4 h-4" />
          Downloaded successfully!
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute top-full right-0 mt-2 px-4 py-2 bg-[var(--ws-negative)] text-white text-sm rounded-lg flex items-center gap-2 shadow-lg z-50">
          <X className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:opacity-80">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

