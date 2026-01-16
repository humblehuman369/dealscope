'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { WorksheetExport } from './WorksheetExport'
import {
  Edit3,
  Share2,
  Loader2,
  Check,
} from 'lucide-react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'

interface WorksheetHeaderProps {
  property: SavedProperty
  propertyId: string
}

export function WorksheetHeader({ property, propertyId }: WorksheetHeaderProps) {
  const { isDirty, isSaving, lastSaved, viewMode, setViewMode, isCalculating, calculationError, worksheetMetrics } =
    useWorksheetStore()
  const derived = useWorksheetDerived()

  const formatLastSaved = () => {
    if (!lastSaved) return null
    const diff = Date.now() - lastSaved.getTime()
    if (diff < 60000) return 'Saved just now'
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`
    return `Saved ${lastSaved.toLocaleTimeString()}`
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate key metrics
  const { assumptions } = useWorksheetStore()
  const purchasePrice = assumptions.purchasePrice || 0
  const cashNeeded = derived.totalCashNeeded || 0
  const cashFlow = derived.annualCashFlow || 0
  const monthlyCashFlow = derived.monthlyCashFlow || 0
  const capRate = derived.capRate || 0
  const cocReturn = derived.cashOnCash || 0
  const dealScore = worksheetMetrics?.deal_score ?? 0

  return (
    <div className="worksheet-header-v2">
      {/* Summary Cards Row */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">Purchase Price</div>
          <div className="summary-card-value">{formatCurrency(purchasePrice)}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Cash Needed</div>
          <div className="summary-card-value">{formatCurrency(cashNeeded)}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Cash Flow</div>
          <div className={`summary-card-value ${cashFlow >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(cashFlow)}
          </div>
          <div className="summary-card-subtitle">{formatCurrency(monthlyCashFlow)}/mo</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Cap Rate</div>
          <div className="summary-card-value">{capRate.toFixed(1)}%</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">CoC Return</div>
          <div className={`summary-card-value ${cocReturn >= 10 ? 'positive' : ''}`}>
            {cocReturn.toFixed(1)}%
          </div>
        </div>

        <div className="summary-card highlight">
          <div className="summary-card-label">Deal Score</div>
          <div className="summary-card-value highlight">{Math.round(dealScore)}</div>
        </div>
      </div>

      {calculationError && (
        <div className="mt-3 text-sm text-[var(--ws-negative)]">
          Calculation error: {calculationError}
        </div>
      )}
      {isCalculating && !calculationError && (
        <div className="mt-3 text-sm text-[var(--ws-text-secondary)]">
          Recalculating worksheet metrics...
        </div>
      )}
      
      {/* Actions Row */}
      <div className="flex items-center justify-between">
        {/* View Toggle */}
        <div className="toggle-group">
          <button 
            className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'yearly' ? 'active' : ''}`}
            onClick={() => setViewMode('yearly')}
          >
            Yearly
          </button>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Save indicator */}
          <div className="flex items-center gap-2 text-sm text-[var(--ws-text-secondary)]">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--ws-warning)]" />
                <span>Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="w-4 h-4 text-[var(--ws-positive)]" />
                <span>{formatLastSaved()}</span>
              </>
            ) : null}
          </div>
          
          {/* Edit Property */}
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--ws-text-secondary)] bg-[var(--ws-bg-alt)] hover:bg-[var(--ws-border)] rounded-lg transition-colors">
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Property</span>
          </button>
          
          {/* Export */}
          <WorksheetExport 
            propertyId={propertyId}
            propertyAddress={getDisplayAddress(property)}
          />
          
          {/* Share */}
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--ws-accent)] hover:bg-[var(--ws-accent-hover)] rounded-lg transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
    </div>
  )
}
