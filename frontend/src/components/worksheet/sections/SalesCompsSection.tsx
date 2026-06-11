'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorksheetStore } from '@/stores/worksheetStore'
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  DollarSign,
  RefreshCw,
  Info,
  Building2,
  Lock,
  Unlock,
  Ruler,
  TrendingUp,
  RotateCcw,
  FileDown,
  Loader2,
} from 'lucide-react'
import {
  calculateAppraisalValues,
  calculateSimilarityScore,
  calculateSaleAdjustments,
  type SubjectProperty as AppraisalSubjectProperty,
  type CompProperty,
  type AppraisalResult,
  type CompAdjustment,
} from '@/utils/appraisalCalculations'
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters'
import { fetchSaleComps } from '@/lib/api/sale-comps'
import { buildAppraisalPayload, downloadAppraisalReportPDF } from '@/lib/api/appraisal-report'
import type { SaleComp, SubjectProperty as CompsSubjectProperty } from '@/lib/api/types'
import { usePropertyData } from '@/hooks/usePropertyData'
import { mapPropertyToIQSources } from '@/utils/propertySourceMapper'
import { buildSalesConsensus, type UnderwritingMode } from '@/utils/marketConsensus'
import { MarketConsensusRail } from '@/components/worksheet/consensus/MarketConsensusRail'
import type { IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'

// ============================================
// UTILITIES
// ============================================
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getDaysAgo = (dateString: string) => {
  if (!dateString) return ''
  const saleDate = new Date(dateString)
  if (isNaN(saleDate.getTime())) return ''
  const today = new Date()
  const diffTime = today.getTime() - saleDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Pending'
  if (diffDays === 0) return 'Today'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 60) return '1mo ago'
  return `${Math.floor(diffDays / 30)}mo ago`
}

const getSaleDaysAgo = (dateString: string): number => {
  if (!dateString) return 999
  const saleDate = new Date(dateString)
  if (isNaN(saleDate.getTime())) return 999
  const today = new Date()
  const diffTime = today.getTime() - saleDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

const getFreshnessBadge = (
  dateString: string,
): { label: string; color: string; bgColor: string } | null => {
  const daysAgo = getSaleDaysAgo(dateString)
  if (daysAgo < 0) return null
  if (daysAgo <= 30) return { label: 'Recent', color: '#10B981', bgColor: '#10B98115' }
  if (daysAgo > 90) return { label: 'Older sale', color: '#F59E0B', bgColor: '#F59E0B15' }
  return null
}

// Convert SaleComp to appraisal calculation format
function toCompProperty(comp: SaleComp): CompProperty {
  return {
    id: comp.id,
    zpid: comp.zpid,
    address: comp.address,
    price: comp.salePrice,
    sqft: comp.sqft,
    beds: comp.beds,
    baths: comp.baths,
    yearBuilt: comp.yearBuilt,
    lotSize: comp.lotSize ?? 0,
    distance: comp.distanceMiles,
    pricePerSqft: comp.pricePerSqft,
  }
}

// ============================================
// COMPONENTS
// ============================================
const CompCardSkeleton = () => (
  <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-default)] p-4 animate-pulse">
    <div className="flex gap-4">
      <div className="w-24 h-24 bg-[var(--chart-grid)] rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[var(--chart-grid)] rounded w-3/4" />
        <div className="h-3 bg-[var(--chart-grid)] rounded w-1/2" />
        <div className="h-3 bg-[var(--chart-grid)] rounded w-1/3" />
      </div>
    </div>
  </div>
)

const SimilarityBar = ({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ElementType
}) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
    <span className="text-xs text-[var(--text-secondary)] w-14">{label}</span>
    <div className="flex-1 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          backgroundColor: value >= 90 ? 'var(--accent-sky)' : value >= 75 ? '#0E7490' : '#F59E0B',
        }}
      />
    </div>
    <span className="text-xs font-semibold text-[var(--text-body)] w-8 text-right tabular-nums">
      {value}%
    </span>
  </div>
)

// Dual Valuation Panel Component
const DualValuationPanel = ({
  appraisalResult,
  isMarketValueOverridden,
  isArvOverridden,
  manualMarketValue,
  manualArv,
  onMarketValueChange,
  onArvChange,
  onToggleMarketValueOverride,
  onToggleArvOverride,
  onApplyValues,
  onDownloadReport,
  downloadingReport,
  loading,
  selectedCount,
}: {
  appraisalResult: AppraisalResult
  isMarketValueOverridden: boolean
  isArvOverridden: boolean
  manualMarketValue: number
  manualArv: number
  onMarketValueChange: (value: number) => void
  onArvChange: (value: number) => void
  onToggleMarketValueOverride: () => void
  onToggleArvOverride: () => void
  onApplyValues: () => void
  onDownloadReport: () => void
  downloadingReport: boolean
  loading: boolean
  selectedCount: number
}) => {
  const displayMarketValue = isMarketValueOverridden
    ? manualMarketValue
    : appraisalResult.marketValue
  const displayArv = isArvOverridden ? manualArv : appraisalResult.arv

  return (
    <div className="bg-gradient-to-r from-[var(--accent-sky)]/10 via-[var(--accent-brand-blue)]/5 to-[var(--accent-sky)]/10 rounded-xl p-4 border border-[rgba(4, 101, 242,0.25)]/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-card)] shadow-sm flex items-center justify-center">
            <Target className="w-5 h-5 text-[var(--accent-sky)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Appraisal Values</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              From {selectedCount} selected comps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-center px-3 py-1 rounded-lg bg-[var(--surface-card)]/60">
            <div
              className="text-lg font-bold tabular-nums"
              style={{
                color:
                  appraisalResult.confidence >= 85
                    ? 'var(--accent-sky)'
                    : appraisalResult.confidence >= 70
                      ? '#F59E0B'
                      : '#EF4444',
              }}
            >
              {loading ? '...' : appraisalResult.confidence}%
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase">Confidence</div>
          </div>
        </div>
      </div>

      {/* Dual Value Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Zestimate */}
        <div className="bg-[var(--surface-card)] rounded-lg p-3 border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Zestimate
            </span>
            <button
              onClick={onToggleMarketValueOverride}
              className={`p-1 rounded transition-colors ${isMarketValueOverridden ? 'text-amber-500 bg-amber-50' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              title={
                isMarketValueOverridden ? 'Value overridden - click to reset' : 'Click to override'
              }
            >
              {isMarketValueOverridden ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {isMarketValueOverridden ? (
            <input
              type="text"
              value={formatCurrency(manualMarketValue)}
              onChange={(e) => {
                const val = parseInt(e.target.value.replace(/[^0-9]/g, ''))
                if (!isNaN(val)) onMarketValueChange(val)
              }}
              className="text-xl font-bold text-[var(--text-heading)] tabular-nums bg-amber-50 border border-amber-200 rounded px-2 py-1 w-full"
            />
          ) : (
            <div className="text-xl font-bold text-[var(--text-heading)] tabular-nums">
              {loading ? '...' : formatCurrency(displayMarketValue)}
            </div>
          )}
          <div className="text-[10px] text-[var(--text-muted)] mt-1">As-Is Condition</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Range: {formatCompactCurrency(appraisalResult.rangeLow)} —{' '}
            {formatCompactCurrency(appraisalResult.rangeHigh)}
          </div>
        </div>

        {/* ARV */}
        <div className="bg-[var(--surface-card)] rounded-lg p-3 border border-[rgba(4, 101, 242,0.25)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--accent-sky)] uppercase tracking-wide">
              Est. After Repair Value
            </span>
            <button
              onClick={onToggleArvOverride}
              className={`p-1 rounded transition-colors ${isArvOverridden ? 'text-amber-500 bg-amber-50' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              title={isArvOverridden ? 'Value overridden - click to reset' : 'Click to override'}
            >
              {isArvOverridden ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {isArvOverridden ? (
            <input
              type="text"
              value={formatCurrency(manualArv)}
              onChange={(e) => {
                const val = parseInt(e.target.value.replace(/[^0-9]/g, ''))
                if (!isNaN(val)) onArvChange(val)
              }}
              className="text-xl font-bold text-[var(--accent-sky-light)] tabular-nums bg-amber-50 border border-amber-200 rounded px-2 py-1 w-full"
            />
          ) : (
            <div className="text-xl font-bold text-[var(--accent-sky-light)] tabular-nums">
              {loading ? '...' : formatCurrency(displayArv)}
            </div>
          )}
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Post-Rehab (+15% premium)</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-medium text-green-600">
              Includes appreciation adjustment
            </span>
          </div>
        </div>
      </div>

      {/* Methodology Info */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-3 px-1">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Weighted hybrid: Adjusted prices (40%) + $/sqft (40%) + blend (20%)</span>
        </div>
        <span className="tabular-nums">${appraisalResult.weightedAveragePpsf}/sqft avg</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onApplyValues}
          disabled={displayMarketValue === 0 && displayArv === 0}
          className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply Values to Deal Analysis
        </button>
        <button
          onClick={onDownloadReport}
          disabled={selectedCount === 0 || downloadingReport}
          className="px-3 py-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          title="Download appraisal report as PDF"
        >
          {downloadingReport ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          PDF
        </button>
      </div>
    </div>
  )
}

// Adjustment Grid Component
const AdjustmentGrid = ({
  compAdjustments,
  isExpanded,
  onToggle,
}: {
  compAdjustments: CompAdjustment[]
  isExpanded: boolean
  onToggle: () => void
}) => {
  if (compAdjustments.length === 0) return null

  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-default)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--surface-elevated)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--accent-sky)]" />
          <span className="text-sm font-semibold text-[var(--text-body)]">
            Adjustment Breakdown
          </span>
          <span className="text-xs text-[var(--text-muted)]">({compAdjustments.length} comps)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface-elevated)]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">
                    Comp Address
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Base
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Size
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Bed
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Bath
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Age
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Lot
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--accent-sky)]">
                    Adjusted
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Weight
                  </th>
                </tr>
              </thead>
              <tbody>
                {compAdjustments.map((ca, idx) => (
                  <tr
                    key={ca.compId}
                    className={
                      idx % 2 === 0 ? 'bg-[var(--surface-card)]' : 'bg-[var(--surface-elevated)]/50'
                    }
                  >
                    <td
                      className="px-3 py-2 text-[var(--text-body)] truncate max-w-[150px]"
                      title={ca.compAddress}
                    >
                      {ca.compAddress}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                      {formatCompactCurrency(ca.basePrice)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.sizeAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.sizeAdjustment >= 0 ? '+' : ''}
                      {formatCompactCurrency(ca.sizeAdjustment)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.bedroomAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.bedroomAdjustment >= 0 ? '+' : ''}
                      {formatCompactCurrency(ca.bedroomAdjustment)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.bathroomAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.bathroomAdjustment >= 0 ? '+' : ''}
                      {formatCompactCurrency(ca.bathroomAdjustment)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.ageAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.ageAdjustment >= 0 ? '+' : ''}
                      {formatCompactCurrency(ca.ageAdjustment)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.lotAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.lotAdjustment >= 0 ? '+' : ''}
                      {formatCompactCurrency(ca.lotAdjustment)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--accent-sky-light)]">
                      {formatCompactCurrency(ca.adjustedPrice)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                      {(ca.weight * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Comp Card
const CompCard = ({
  comp,
  subject,
  isSelected,
  onToggle,
  isExpanded,
  onExpand,
  onRefreshComp,
  refreshing,
  freshnessBadge,
}: {
  comp: SaleComp
  subject: {
    address: string
    city: string
    state: string
    zip: string
    sqft: number
    beds: number
    baths: number
    yearBuilt: number
    lotSize: number
    latitude: number
    longitude: number
  }
  isSelected: boolean
  onToggle: () => void
  isExpanded: boolean
  onExpand: () => void
  onRefreshComp: () => void
  refreshing: boolean
  freshnessBadge?: { label: string; color: string; bgColor: string } | null
}) => {
  // Calculate similarity and adjustments for this comp
  const subjectForCalc: AppraisalSubjectProperty = {
    sqft: subject.sqft,
    beds: subject.beds,
    baths: subject.baths,
    yearBuilt: subject.yearBuilt,
    lotSize: subject.lotSize,
  }
  const compForCalc = toCompProperty(comp)
  const similarity = calculateSimilarityScore(subjectForCalc, compForCalc)
  const adjustments = calculateSaleAdjustments(subjectForCalc, compForCalc)

  return (
    <div
      className={`relative rounded-xl border transition-all overflow-hidden ${
        isSelected
          ? 'bg-[var(--surface-card)] ring-2 ring-[var(--accent-sky)]/20 border-[rgba(4, 101, 242,0.25)]'
          : 'bg-[var(--surface-elevated)] border-[var(--border-default)] hover:border-[var(--border-default)]'
      }`}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-[var(--accent-sky)] border-[var(--accent-sky)]'
            : 'bg-[var(--surface-card)] border-[var(--border-default)] hover:border-[var(--accent-sky)]'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Refresh button for unselected comps */}
      {!isSelected && (
        <button
          onClick={onRefreshComp}
          disabled={refreshing}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--accent-sky)] hover:border-[rgba(4, 101, 242,0.4)] transition-colors disabled:opacity-50"
          title="Replace this comp with a new one"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      )}

      <div className="flex">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0 bg-[var(--surface-elevated)]">
          {comp.imageUrl ? (
            <img
              src={comp.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--chart-grid)]">
              <MapPin className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-[var(--surface-card)]/90 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] font-semibold text-[var(--accent-sky)] tabular-nums">
              {comp.distanceMiles?.toFixed(2)} mi
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 pl-4">
              <h4 className="text-sm font-semibold text-[var(--text-heading)] truncate">
                {comp.address}
              </h4>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {comp.city}, {comp.state}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-[var(--text-heading)] tabular-nums">
                {formatCurrency(comp.salePrice)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                ${comp.pricePerSqft}/sf
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1 pl-4">
            <span className="flex items-center gap-0.5">
              <Bed className="w-3 h-3" />
              {comp.beds}
            </span>
            <span className="flex items-center gap-0.5">
              <Bath className="w-3 h-3" />
              {comp.baths}
            </span>
            <span className="flex items-center gap-0.5 tabular-nums">
              <Square className="w-3 h-3" />
              {comp.sqft?.toLocaleString()} sq ft
            </span>
            <span className="flex items-center gap-0.5 tabular-nums">
              Year Built {comp.yearBuilt}
            </span>
          </div>

          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--text-muted)]">
                Sold {formatDate(comp.saleDate)}
              </span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                {getDaysAgo(comp.saleDate)}
              </span>
              {freshnessBadge && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: freshnessBadge.bgColor, color: freshnessBadge.color }}
                >
                  {freshnessBadge.label}
                </span>
              )}
            </div>
            <button
              onClick={onExpand}
              className="text-xs text-[var(--accent-sky)] hover:text-[var(--accent-sky-light)] font-medium flex items-center gap-0.5"
            >
              Details{' '}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Match Score */}
        <div className="w-16 flex flex-col items-center justify-center bg-[var(--surface-elevated)] border-l border-[var(--border-subtle)]">
          <div
            className="text-xl font-bold tabular-nums"
            style={{
              color:
                similarity.overall >= 95
                  ? 'var(--accent-sky)'
                  : similarity.overall >= 90
                    ? '#0E7490'
                    : '#F59E0B',
            }}
          >
            {similarity.overall}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">% Match</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] p-3 bg-[var(--surface-elevated)]/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-[10px] font-semibold text-[var(--accent-sky)] uppercase tracking-wide mb-2">
                Similarity
              </h5>
              <div className="space-y-1.5">
                <SimilarityBar label="Location" value={similarity.location} icon={MapPin} />
                <SimilarityBar label="Size" value={similarity.size} icon={Square} />
                <SimilarityBar label="Bed/Bath" value={similarity.bedBath} icon={Bed} />
                <SimilarityBar label="Age" value={similarity.age} icon={Calendar} />
                <SimilarityBar label="Lot" value={similarity.lot} icon={Ruler} />
              </div>
            </div>
            <div>
              <h5 className="text-[10px] font-semibold text-[var(--text-body)] uppercase tracking-wide mb-2">
                Adjustments
              </h5>
              <div className="space-y-1">
                {[
                  { label: 'Size', value: adjustments.size },
                  { label: 'Bedroom', value: adjustments.bedroom },
                  { label: 'Bathroom', value: adjustments.bathroom },
                  { label: 'Age', value: adjustments.age },
                  { label: 'Lot', value: adjustments.lot },
                ].map((adj) => (
                  <div key={adj.label} className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{adj.label}</span>
                    <span
                      className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {adj.value >= 0 ? '+' : ''}
                      {formatCurrency(adj.value)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-[var(--border-default)]">
                  <span className="font-semibold text-[var(--text-body)]">Adjusted</span>
                  <span className="font-bold text-[var(--accent-sky)] tabular-nums">
                    {formatCurrency(comp.salePrice + adjustments.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export function SalesCompsSection() {
  const { propertyData, assumptions, updateAssumption } = useWorksheetStore()

  const [comps, setComps] = useState<SaleComp[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedCompIds, setSelectedCompIds] = useState<Set<string | number>>(new Set())
  const [expandedComp, setExpandedComp] = useState<number | string | null>(null)
  const [recencyFilter, setRecencyFilter] = useState<'all' | '30' | '90'>('all')
  const [refreshingCompId, setRefreshingCompId] = useState<string | number | null>(null)
  const [showAdjustmentGrid, setShowAdjustmentGrid] = useState(false)
  const [fetchOffset, setFetchOffset] = useState(0)

  // Override state
  const [isMarketValueOverridden, setIsMarketValueOverridden] = useState(false)
  const [isArvOverridden, setIsArvOverridden] = useState(false)
  const [manualMarketValue, setManualMarketValue] = useState(0)
  const [manualArv, setManualArv] = useState(0)
  const [downloadingReport, setDownloadingReport] = useState(false)

  // Market consensus state
  const { fetchProperty } = usePropertyData()
  const [iqSources, setIqSources] = useState<IQEstimateSources>({
    value: { iq: null, zillow: null, rentcast: null, redfin: null, realtor: null },
    rent: { iq: null, zillow: null, rentcast: null, redfin: null },
  })
  const [activeUnderwriteMode, setActiveUnderwriteMode] = useState<UnderwritingMode | null>(null)

  // Build subject property from worksheet data
  const snapshot = propertyData?.property_data_snapshot
  const subject = useMemo(
    () => ({
      address:
        snapshot?.street ||
        snapshot?.streetAddress ||
        snapshot?.address ||
        propertyData?.address_street ||
        '',
      city: snapshot?.city || propertyData?.address_city || '',
      state: snapshot?.state || propertyData?.address_state || '',
      zip: snapshot?.zipCode || snapshot?.zipcode || propertyData?.address_zip || '',
      price: assumptions.purchasePrice || snapshot?.listPrice || 0,
      beds: snapshot?.bedrooms || 0,
      baths: snapshot?.bathrooms || 0,
      sqft: snapshot?.sqft || snapshot?.livingArea || 0,
      lotSize: snapshot?.lotSize || 0,
      yearBuilt: snapshot?.yearBuilt || 0,
      latitude: snapshot?.latitude ?? null,
      longitude: snapshot?.longitude ?? null,
      rehabCost: assumptions.rehabCosts || 0,
    }),
    [snapshot, propertyData, assumptions.purchasePrice, assumptions.rehabCosts],
  )

  const zpid = propertyData?.zpid?.toString() || snapshot?.zpid?.toString() || ''

  const subjectForComps: CompsSubjectProperty | undefined = useMemo(
    () =>
      subject.address || zpid
        ? {
            zpid: zpid || '',
            address: subject.address,
            city: subject.city,
            state: subject.state,
            zip: subject.zip,
            beds: subject.beds,
            baths: subject.baths,
            sqft: subject.sqft,
            yearBuilt: subject.yearBuilt,
            propertyType: '',
            listPrice: subject.price,
            zestimate: null,
            rentZestimate: null,
            latitude: subject.latitude,
            longitude: subject.longitude,
          }
        : undefined,
    [subject, zpid],
  )

  // Calculate appraisal values from selected comps
  const appraisalResult = useMemo(() => {
    const selectedComps = comps.filter((c) => selectedCompIds.has(c.id)).map(toCompProperty)

    const subjectForCalc: AppraisalSubjectProperty = {
      sqft: subject.sqft,
      beds: subject.beds,
      baths: subject.baths,
      yearBuilt: subject.yearBuilt,
      lotSize: subject.lotSize,
      rehabCost: subject.rehabCost,
    }

    return calculateAppraisalValues(subjectForCalc, selectedComps)
  }, [selectedCompIds, comps, subject])

  // Fetch comps (non-blocking; never blocks core analysis)
  const fetchComps = useCallback(
    async (offset = 0, excludeZpids: string[] = []) => {
      setLoading(true)
      setLoadFailed(false)

      const identifier = {
        zpid: zpid || undefined,
        address: subject.address
          ? `${subject.address}, ${subject.city}, ${subject.state} ${subject.zip}`.trim()
          : undefined,
        limit: 10,
        offset,
        exclude_zpids: excludeZpids.length > 0 ? excludeZpids.join(',') : undefined,
        subject_lat: subject.latitude ?? undefined,
        subject_lon: subject.longitude ?? undefined,
      }

      const result = await fetchSaleComps(identifier, subjectForComps ?? undefined)

      setLoading(false)
      if (result.ok && result.data) {
        setComps(result.data)
        setLoadFailed(false)
        return result.data
      }
      setLoadFailed(true)
      setComps([])
      return []
    },
    [subject, zpid, subjectForComps],
  )

  // Initial fetch when we have an identifier (runs when zpid/address becomes available)
  useEffect(() => {
    if (!subject.address && !zpid) return
    const doFetch = async () => {
      const fetched = await fetchComps()
      if (fetched.length > 0) {
        setSelectedCompIds(new Set(fetched.slice(0, 3).map((c) => c.id)))
      }
    }
    doFetch()
  }, [zpid, subject.address, subject.city, subject.state, subject.zip, fetchComps])

  // Load source estimates from shared property cache for consensus rail
  useEffect(() => {
    if (!subject.address) return
    const fullAddr = [subject.address, subject.city, subject.state, subject.zip]
      .filter(Boolean)
      .join(', ')
    fetchProperty(fullAddr, {
      city: subject.city || undefined,
      state: subject.state || undefined,
      zip_code: subject.zip || undefined,
    })
      .then((data) => setIqSources(mapPropertyToIQSources(data)))
      .catch(() => {
        /* sources unavailable — consensus rail hides gracefully */
      })
  }, [subject.address, subject.city, subject.state, subject.zip, fetchProperty])

  // Compute consensus from sources + comp appraisal
  const consensus = useMemo(
    () => buildSalesConsensus(iqSources, appraisalResult),
    [iqSources, appraisalResult],
  )

  // Refresh all comps
  const handleRefreshAll = async () => {
    const fetched = await fetchComps()
    setComps(fetched)
    setFetchOffset(0)
    if (fetched.length > 0) {
      setSelectedCompIds(new Set(fetched.slice(0, 3).map((c) => c.id)))
    }
  }

  // Refresh only unselected comps
  const handleRefreshUnselected = async () => {
    setLoading(true)
    try {
      const selectedZpids = comps
        .filter((c) => selectedCompIds.has(c.id))
        .map((c) => c.zpid || String(c.id))
        .filter(Boolean)

      const unselectedCount = comps.filter((c) => !selectedCompIds.has(c.id)).length
      const newOffset = fetchOffset + unselectedCount

      const newComps = await fetchComps(newOffset, selectedZpids)

      // Keep selected comps, replace unselected
      const selectedComps = comps.filter((c) => selectedCompIds.has(c.id))
      setComps([...selectedComps, ...newComps.slice(0, unselectedCount)])
      setFetchOffset(newOffset)
    } finally {
      setLoading(false)
    }
  }

  // Refresh single comp
  const handleRefreshComp = async (compId: string | number) => {
    setRefreshingCompId(compId)
    try {
      const excludeZpids = comps
        .filter((c) => c.id !== compId)
        .map((c) => c.zpid || String(c.id))
        .filter(Boolean)

      const newComps = await fetchComps(fetchOffset, excludeZpids)

      if (newComps.length > 0) {
        setComps((prev) => prev.map((c) => (c.id === compId ? newComps[0] : c)))
        setFetchOffset((prev) => prev + 1)
      }
    } finally {
      setRefreshingCompId(null)
    }
  }

  const toggleComp = (id: number | string) => {
    setSelectedCompIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Apply values to worksheet
  const handleApplyValues = () => {
    const marketValue = isMarketValueOverridden ? manualMarketValue : appraisalResult.marketValue
    const arv = isArvOverridden ? manualArv : appraisalResult.arv

    if (arv > 0) {
      updateAssumption('arv', arv)
    }
  }

  // Apply consensus underwriting mode
  const handleApplyConsensusMode = (mode: UnderwritingMode, value: number) => {
    setActiveUnderwriteMode(mode)
    if (value > 0) {
      setIsMarketValueOverridden(true)
      setManualMarketValue(value)
    }
  }

  // Override handlers
  const handleToggleMarketValueOverride = () => {
    if (isMarketValueOverridden) {
      setIsMarketValueOverridden(false)
      setManualMarketValue(0)
    } else {
      setIsMarketValueOverridden(true)
      setManualMarketValue(appraisalResult.marketValue)
    }
  }

  const handleToggleArvOverride = () => {
    if (isArvOverridden) {
      setIsArvOverridden(false)
      setManualArv(0)
    } else {
      setIsArvOverridden(true)
      setManualArv(appraisalResult.arv)
    }
  }

  const handleDownloadReport = async () => {
    if (selectedCompIds.size === 0) return
    setDownloadingReport(true)
    try {
      const fullAddress = [subject.address, subject.city, subject.state, subject.zip]
        .filter(Boolean)
        .join(', ')
      const payload = buildAppraisalPayload({
        appraisalResult,
        comps,
        selectedIds: selectedCompIds,
        subject: {
          address: fullAddress,
          beds: subject.beds,
          baths: subject.baths,
          sqft: subject.sqft,
          yearBuilt: subject.yearBuilt,
          lotSize: subject.lotSize,
          rehabCost: subject.rehabCost,
          price: subject.price,
        },
        overrideMarketValue: isMarketValueOverridden ? manualMarketValue : null,
        overrideArv: isArvOverridden ? manualArv : null,
        propertyData: propertyData?.property_data_snapshot
          ? {
              details: {
                property_type: snapshot?.propertyType || snapshot?.property_type,
                stories: snapshot?.stories,
                heating_type: snapshot?.heatingType || snapshot?.heating_type,
                cooling_type: snapshot?.coolingType || snapshot?.cooling_type,
                has_garage: snapshot?.hasGarage || snapshot?.has_garage,
                garage_spaces: snapshot?.garageSpaces || snapshot?.garage_spaces,
                exterior_type: snapshot?.exteriorType || snapshot?.exterior_type,
                roof_type: snapshot?.roofType || snapshot?.roof_type,
                foundation_type: snapshot?.foundationType || snapshot?.foundation_type,
                has_fireplace: snapshot?.hasFireplace || snapshot?.has_fireplace,
                has_pool: snapshot?.hasPool || snapshot?.has_pool,
              },
            }
          : null,
      })
      await downloadAppraisalReportPDF(payload)
    } catch (err) {
      console.error('Failed to download appraisal report:', err)
    } finally {
      setDownloadingReport(false)
    }
  }

  // Filter comps by recency
  const filteredComps = useMemo(() => {
    return comps.filter((c) => {
      const daysAgo = getSaleDaysAgo(c.saleDate)
      if (recencyFilter === '30') return daysAgo <= 30
      if (recencyFilter === '90') return daysAgo <= 90
      return true
    })
  }, [comps, recencyFilter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-heading)]">Appraisal Toolkit</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Comparable sales for {subject.address}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Last updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshUnselected}
            disabled={loading || selectedCompIds.size === 0}
            className="px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] disabled:opacity-50 flex items-center gap-1.5"
            title="Get new comps for unselected items"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Unselected
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        </div>
      </div>

      {/* Dual Valuation Panel */}
      <DualValuationPanel
        appraisalResult={appraisalResult}
        isMarketValueOverridden={isMarketValueOverridden}
        isArvOverridden={isArvOverridden}
        manualMarketValue={manualMarketValue}
        manualArv={manualArv}
        onMarketValueChange={setManualMarketValue}
        onArvChange={setManualArv}
        onToggleMarketValueOverride={handleToggleMarketValueOverride}
        onToggleArvOverride={handleToggleArvOverride}
        onApplyValues={handleApplyValues}
        onDownloadReport={handleDownloadReport}
        downloadingReport={downloadingReport}
        loading={loading}
        selectedCount={selectedCompIds.size}
      />

      {/* Market Consensus Rail */}
      <MarketConsensusRail
        consensus={consensus}
        mode="value"
        onApplyMode={handleApplyConsensusMode}
        activeMode={activeUnderwriteMode}
      />

      {/* Adjustment Grid */}
      <AdjustmentGrid
        compAdjustments={appraisalResult.compAdjustments}
        isExpanded={showAdjustmentGrid}
        onToggle={() => setShowAdjustmentGrid(!showAdjustmentGrid)}
      />

      {/* Recency Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)]">Filter by:</span>
        <div className="flex rounded-lg bg-[var(--surface-elevated)] p-0.5">
          {[
            { value: 'all' as const, label: 'All' },
            { value: '30' as const, label: 'Last 30 days' },
            { value: '90' as const, label: 'Last 90 days' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setRecencyFilter(filter.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                recencyFilter === filter.value
                  ? 'bg-[var(--surface-card)] text-[var(--accent-sky)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-body)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">
          {selectedCompIds.size} of {filteredComps.length} comps selected
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCompIds(new Set(filteredComps.map((c) => c.id)))}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-lg"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedCompIds(new Set())}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-lg"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && comps.length === 0 && !loadFailed && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CompCardSkeleton key={i} />
          ))}
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Loading comparable sales...
          </p>
        </div>
      )}

      {/* Unavailable (friendly fallback — no raw errors) */}
      {loadFailed && !loading && (
        <div className="rounded-xl border border-[var(--border-default)] p-6 text-center bg-[var(--surface-elevated)]/80">
          <Info className="mx-auto mb-3 text-[var(--text-muted)] w-10 h-10" aria-hidden />
          <h3 className="text-sm font-semibold text-[var(--text-body)] mb-1">
            Comparable sales temporarily unavailable
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-sm mx-auto">
            Your deal analysis and scores above are complete. Comps will appear here when the data
            source is back online.
          </p>
          <button
            type="button"
            onClick={() => handleRefreshAll()}
            className="px-4 py-2 text-sm font-medium text-[var(--text-body)] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-elevated)]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty (success but no comps found) */}
      {!loading && !loadFailed && comps.length === 0 && (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl p-6 text-center">
          <Building2 className="mx-auto mb-2 text-[var(--text-muted)] w-8 h-8" />
          <h3 className="text-sm font-semibold text-[var(--text-body)] mb-1">
            No Comparable Sales Found
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Try refreshing or check the property address
          </p>
        </div>
      )}

      {/* Comps List */}
      {!loading && !loadFailed && comps.length > 0 && (
        <div className="space-y-3">
          {filteredComps.map((comp) => {
            const freshnessBadge = getFreshnessBadge(comp.saleDate)
            return (
              <CompCard
                key={comp.id}
                comp={comp}
                subject={subject}
                isSelected={selectedCompIds.has(comp.id)}
                onToggle={() => toggleComp(comp.id)}
                isExpanded={expandedComp === comp.id}
                onExpand={() => setExpandedComp(expandedComp === comp.id ? null : comp.id)}
                onRefreshComp={() => handleRefreshComp(comp.id)}
                refreshing={refreshingCompId === comp.id}
                freshnessBadge={freshnessBadge}
              />
            )
          })}
        </div>
      )}

      {/* Distance-based confidence indicator */}
      {!loading && !loadFailed && comps.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              {comps.filter((c) => c.distanceMiles <= 0.5).length} of {comps.length} comps within
              0.5 mi
            </span>
            <span
              className={`text-xs font-semibold ${
                comps.filter((c) => c.distanceMiles <= 0.5).length >= 3
                  ? 'text-[var(--accent-sky)]'
                  : comps.filter((c) => c.distanceMiles <= 1).length >= 3
                    ? 'text-amber-500'
                    : 'text-[var(--text-secondary)]'
              }`}
            >
              Location Quality:{' '}
              {comps.filter((c) => c.distanceMiles <= 0.5).length >= 3
                ? 'EXCELLENT'
                : comps.filter((c) => c.distanceMiles <= 1).length >= 3
                  ? 'GOOD'
                  : 'FAIR'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
