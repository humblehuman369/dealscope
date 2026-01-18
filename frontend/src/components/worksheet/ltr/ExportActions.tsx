'use client'

import React from 'react'

interface ExportActionsProps {
  onExportExcel?: () => void
  onExportPDF?: () => void
  onShare?: () => void
}

export function ExportActions({ onExportExcel, onExportPDF, onShare }: ExportActionsProps) {
  return (
    <div className="flex items-center">
      <button 
        onClick={onExportExcel}
        className="px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium uppercase tracking-wider transition-colors"
      >
        Excel
      </button>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <button 
        onClick={onExportPDF}
        className="px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium uppercase tracking-wider transition-colors"
      >
        PDF
      </button>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <button 
        onClick={onShare}
        className="px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium uppercase tracking-wider transition-colors"
      >
        Share
      </button>
    </div>
  )
}
