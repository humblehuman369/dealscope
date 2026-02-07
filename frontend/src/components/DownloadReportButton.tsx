'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { getAccessToken } from '@/lib/api'
import { API_BASE_URL } from '@/lib/env'

interface DownloadReportButtonProps {
  propertyId: string
  propertyAddress?: string
  savedPropertyId?: string  // If downloading from a saved property
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

type ReportFormat = 'excel' | 'csv'

export default function DownloadReportButton({
  propertyId,
  propertyAddress,
  savedPropertyId,
  variant = 'secondary',
  size = 'md',
}: DownloadReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState<ReportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadReport = async (format: ReportFormat) => {
    setIsDownloading(format)
    setError(null)
    
    try {
      const token = getAccessToken()
      
      // Build URL based on whether it's a saved property or cached property
      let url: string
      if (savedPropertyId) {
        url = `${API_BASE_URL}/api/v1/reports/saved/${savedPropertyId}/excel`
      } else {
        url = `${API_BASE_URL}/api/v1/reports/property/${propertyId}/${format}`
      }
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to generate ${format.toUpperCase()} report`)
      }
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `InvestIQ_Report.${format === 'excel' ? 'xlsx' : 'csv'}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      // Download the file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      setIsOpen(false)
    } catch (err) {
      console.error('Download failed:', err)
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(null)
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  }

  const variantClasses = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white',
    secondary: 'bg-white dark:bg-navy-800 border border-neutral-200 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700',
    ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center font-medium rounded-lg transition-colors ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        <Download className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Download Report</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden z-20">
            <div className="p-2">
              <p className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Export Format
              </p>
              
              <button
                onClick={() => downloadReport('excel')}
                disabled={isDownloading !== null}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDownloading === 'excel' ? (
                  <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <p className="font-medium text-navy-900 dark:text-white">Excel Workbook</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Full analysis with all strategies
                  </p>
                </div>
              </button>
              
              <button
                onClick={() => downloadReport('csv')}
                disabled={isDownloading !== null || !!savedPropertyId}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDownloading === 'csv' ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <p className="font-medium text-navy-900 dark:text-white">CSV Summary</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Quick metrics comparison
                  </p>
                </div>
              </button>
            </div>
            
            {error && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

