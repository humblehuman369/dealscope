'use client'

import { useRouter } from 'next/navigation'
import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { useUIStore } from '@/stores'
import { WorksheetExport } from './WorksheetExport'
import {
  Edit3,
  Share2,
  Loader2,
  Check,
  ArrowLeft,
} from 'lucide-react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { PropertyStatusPills } from './PropertyStatusPills'
import { formatCurrency } from '@/utils/formatters'

interface WorksheetHeaderProps {
  property: SavedProperty
  propertyId: string
}

// Strategy definitions for display
const strategies = [
  { id: 'ltr', label: 'Long-term Rental' },
  { id: 'str', label: 'Short-term Rental' },
  { id: 'brrrr', label: 'BRRRR' },
  { id: 'flip', label: 'Fix & Flip' },
  { id: 'househack', label: 'House Hack' },
  { id: 'wholesale', label: 'Wholesale' },
]

export function WorksheetHeader({ property, propertyId }: WorksheetHeaderProps) {
  const router = useRouter()
  
  const { isDirty, isSaving, lastSaved, viewMode, setViewMode, isCalculating, calculationError, worksheetMetrics } =
    useWorksheetStore()
  const derived = useWorksheetDerived()
  const { activeStrategy } = useUIStore()

  // Get current strategy label
  const currentStrategy = strategies.find(s => s.id === activeStrategy) || strategies[0]

  const formatLastSaved = () => {
    if (!lastSaved) return null
    const diff = Date.now() - lastSaved.getTime()
    if (diff < 60000) return 'Saved just now'
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`
    return `Saved ${lastSaved.toLocaleTimeString()}`
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

  // Determine KPI card colors
  const getKpiColor = (type: string, value: number) => {
    switch (type) {
      case 'cashFlow':
        return value >= 0 ? 'default' : 'red'
      case 'cocReturn':
        return value >= 10 ? 'teal' : value < 0 ? 'red' : 'default'
      case 'dealScore':
        return value >= 7 ? 'teal' : value < 4 ? 'red' : 'default'
      default:
        return 'default'
    }
  }

  const kpiCards = [
    { label: 'LIST PRICE', value: formatCurrency(purchasePrice), color: 'teal' },
    { label: 'CASH NEEDED', value: formatCurrency(cashNeeded), color: 'default' },
    { label: 'ANNUAL PROFIT', value: formatCurrency(cashFlow), color: getKpiColor('cashFlow', cashFlow), subtitle: `${formatCurrency(monthlyCashFlow)}/mo` },
    { label: 'CAP RATE', value: `${capRate.toFixed(1)}%`, color: 'default' },
    { label: 'COC RETURN', value: `${cocReturn.toFixed(1)}%`, color: getKpiColor('cocReturn', cocReturn) },
    { label: 'DEAL SCORE', value: String(Math.round(dealScore)), color: getKpiColor('dealScore', dealScore) },
  ]

  return (
    <div className="worksheet-header-v2">
      {/* Page Title Row with Back Arrow + Status Pills + Strategy Switcher */}
      <div className="bg-white border-b border-[var(--ws-border)] px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back Arrow + Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-[var(--ws-bg-alt)] transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--ws-text-secondary)]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-[var(--ws-text-primary)] truncate">
                {currentStrategy.label} Analysis
              </h1>
              <p className="text-sm text-[var(--ws-text-secondary)] truncate">
                {getDisplayAddress(property)}
              </p>
            </div>
          </div>
          
          {/* Center: Status Pills (hidden on small screens) */}
          <div className="hidden lg:flex flex-shrink-0">
            <PropertyStatusPills
              listingStatus={property.property_data_snapshot?.listingStatus}
              isOffMarket={property.property_data_snapshot?.isOffMarket}
              listPrice={property.property_data_snapshot?.listPrice}
              zestimate={property.property_data_snapshot?.zestimate}
              sellerType={property.property_data_snapshot?.sellerType}
              isForeclosure={property.property_data_snapshot?.isForeclosure}
              isBankOwned={property.property_data_snapshot?.isBankOwned}
              isAuction={property.property_data_snapshot?.isAuction}
              isNewConstruction={property.property_data_snapshot?.isNewConstruction}
              daysOnMarket={property.property_data_snapshot?.daysOnMarket}
            />
          </div>
          
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
          {kpiCards.map((kpi, index) => (
            <div 
              key={index}
              className={`flex-1 min-w-[120px] rounded-lg px-3 sm:px-4 py-3 text-center ${
                kpi.color === 'teal' 
                  ? 'bg-[var(--ws-accent-bg)] border border-[var(--iq-teal-light)]' 
                  : kpi.color === 'red'
                  ? 'bg-[var(--ws-negative-light)] border border-red-200'
                  : 'bg-white border border-[var(--ws-border)]'
              }`}
            >
              <div className="text-[10px] sm:text-xs text-[var(--ws-text-muted)] font-medium tracking-wide">
                {kpi.label}
              </div>
              <div className={`text-base sm:text-lg font-semibold mt-0.5 ${
                kpi.color === 'teal' 
                  ? 'text-[var(--iq-teal)]' 
                  : kpi.color === 'red'
                  ? 'text-[var(--ws-negative)]'
                  : 'text-[var(--ws-text-primary)]'
              }`}>
                {kpi.value}
              </div>
              {kpi.subtitle && (
                <div className="text-[10px] text-[var(--ws-text-secondary)] mt-0.5">
                  {kpi.subtitle}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {calculationError && (
        <div className="px-4 sm:px-6 pb-2 text-sm text-[var(--ws-negative)]">
          Calculation error: {calculationError}
        </div>
      )}
      {isCalculating && !calculationError && (
        <div className="px-4 sm:px-6 pb-2 text-sm text-[var(--ws-text-secondary)]">
          Recalculating worksheet metrics...
        </div>
      )}
      
      {/* Actions Row */}
      <div className="flex items-center justify-between px-4 sm:px-6 pb-4">
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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Save indicator */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--ws-text-secondary)]">
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
