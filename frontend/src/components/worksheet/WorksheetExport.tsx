'use client'

import { useState } from 'react'
import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { Download, FileText, Table, Loader2, X, Check } from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

interface WorksheetExportProps {
  propertyId: string
  propertyAddress: string
}

export function WorksheetExport({ propertyId, propertyAddress }: WorksheetExportProps) {
  const { assumptions, projections, summary } = useWorksheetStore()
  const derived = useWorksheetDerived()
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsExporting(format)
    setError(null)

    try {
      // Build report data from worksheet state
      const reportData = {
        address: propertyAddress,
        property_data: {
          listPrice: assumptions.purchasePrice,
          monthlyRent: assumptions.monthlyRent,
          propertyTaxes: assumptions.propertyTaxes,
          insurance: assumptions.insurance,
          arv: assumptions.arv,
        },
        strategy_results: {
          ltr: {
            name: 'Long-Term Rental',
            annual_cash_flow: derived.annualCashFlow,
            monthly_cash_flow: derived.monthlyCashFlow,
            cash_on_cash: derived.cashOnCash,
            cap_rate: derived.capRate,
            noi: derived.noi,
            total_cash_needed: derived.totalCashNeeded,
            dscr: derived.dscr,
          },
        },
        assumptions: {
          ltr: {
            downPaymentPercent: assumptions.downPaymentPct * 100,
            interestRate: assumptions.interestRate * 100,
            loanTermYears: assumptions.loanTermYears,
            vacancyRate: assumptions.vacancyRate * 100,
            managementPercent: assumptions.managementPct * 100,
            maintenancePercent: assumptions.maintenancePct * 100,
            capexPercent: assumptions.capexReservePct * 100,
            annualAppreciation: assumptions.annualAppreciation * 100,
            annualRentGrowth: assumptions.annualRentGrowth * 100,
          },
        },
        projections: projections.map((p, i) => ({
          year: i + 1,
          grossRent: p.grossRent,
          noi: p.noi,
          cashFlow: p.cashFlow,
          propertyValue: p.propertyValue,
          equity: p.totalEquity,
          loanBalance: p.loanBalance,
        })),
      }

      const endpoint = format === 'excel' ? 'excel' : 'csv' // Using CSV as PDF is more complex
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      const csrfMatch = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))
      if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch.split('=')[1]

      const response = await fetch(`${API_BASE_URL}/api/v1/reports/${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(reportData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Export failed')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}_worksheet.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

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
          onClick={() => handleExport('pdf')}
          disabled={isExporting !== null}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--ws-negative)] hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isExporting === 'pdf' ? (
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

