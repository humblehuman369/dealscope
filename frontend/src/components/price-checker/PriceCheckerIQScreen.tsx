'use client'

/**
 * PriceCheckerIQ Screen
 * 
 * Unified comps page with Sale/Rent sub-tabs.
 * Features:
 * - Live API fetch with pagination and exclusion
 * - Dual valuation panel (Zestimate + ARV, or RentCast Estimate + Improved Rent)
 * - Weighted hybrid appraisal calculations
 * - Selective comp refresh (per-comp and bulk unselected)
 * - Expandable adjustment breakdown grid
 * - Manual override with lock/unlock
 * - Bottom action bar (Search, Save, Analyze, Share)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Bed, Bath, Square, Calendar, Check, ChevronDown, ChevronUp,
  Target, DollarSign, RefreshCw, Building2, Home,
  Pencil, TrendingUp, RotateCcw, Info, Camera, FileDown, Loader2
} from 'lucide-react'
import { fetchSaleComps as fetchSaleCompsApi } from '@/lib/api/sale-comps'
import { fetchRentComps as fetchRentCompsApi } from '@/lib/api/rent-comps'
import { CompsProximityMap } from './CompsProximityMap'
import { CompPhotosModal } from './CompPhotosModal'
import type { SaleComp, RentComp, CompsIdentifier, SubjectProperty as CompsSubjectProperty } from '@/lib/api/types'
import {
  calculateAppraisalValues,
  calculateRentAppraisalValues,
  calculateSimilarityScore,
  calculateSaleAdjustments,
  calculateRentAdjustments,
  type SubjectProperty,
  type CompProperty,
  type AppraisalResult,
  type RentAppraisalResult,
  type CompAdjustment,
} from '@/utils/appraisalCalculations'
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters'
import { buildAppraisalPayload, downloadAppraisalReportPDF } from '@/lib/api/appraisal-report'

// ============================================
// TYPES
// ============================================
export interface PriceCheckerProperty {
  address: string
  city: string
  state: string
  zipCode: string
  zpid?: string
  beds?: number
  baths?: number
  sqft?: number
  yearBuilt?: number
  lotSize?: number
  price?: number
  latitude?: number
  longitude?: number
}

interface PriceCheckerIQScreenProps {
  property: PriceCheckerProperty
  initialView?: 'sale' | 'rent'
}

// Sale and rent comps use API types SaleComp and RentComp

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
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Pending'
  if (diffDays === 0) return 'Today'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 60) return '1mo ago'
  return `${Math.floor(diffDays / 30)}mo ago`
}

const getDaysAgoNum = (dateString: string): number => {
  if (!dateString) return 999
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return 999
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

const getFreshnessBadge = (dateString: string, isSale: boolean) => {
  const daysAgo = getDaysAgoNum(dateString)
  if (daysAgo < 0) return null
  if (daysAgo <= 30) return { label: 'Recent', color: 'var(--status-positive)', bgColor: 'rgba(52,211,153,0.12)' }
  if (daysAgo > 90) return { label: isSale ? 'Older sale' : 'Older listing', color: 'var(--status-warning)', bgColor: 'rgba(251,191,36,0.12)' }
  return null
}

// ============================================
// DATA TRANSFORMATION
// ============================================
// Map SaleComp or RentComp to CompProperty for appraisal calculations
function toCompProperty(c: SaleComp | RentComp): CompProperty {
  const price = 'salePrice' in c ? c.salePrice : c.monthlyRent
  const pricePerSqft = 'pricePerSqft' in c ? c.pricePerSqft : c.rentPerSqft
  return {
    id: c.id,
    zpid: c.zpid,
    address: c.address,
    price,
    sqft: c.sqft,
    beds: c.beds,
    baths: c.baths,
    yearBuilt: c.yearBuilt,
    lotSize: c.lotSize ?? 0,
    distance: c.distanceMiles,
    pricePerSqft,
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================
// Card border/glow from color system: small card default
const cardBorderGlow = 'border border-[var(--border-subtle)] shadow-[var(--shadow-card)]'
const cardBorderGlowHover = 'hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-card-hover)]'
const largeCardBorderGlow = 'border border-[var(--border-subtle)] shadow-[var(--shadow-card)]'

const CompCardSkeleton = () => (
  <div className={`bg-[var(--surface-base)] rounded-xl p-4 animate-pulse ${cardBorderGlow}`}>
    <div className="flex gap-4">
      <div className="w-[100px] h-[80px] bg-[var(--surface-elevated)] rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[var(--surface-elevated)] rounded w-3/4" />
        <div className="h-3 bg-[var(--surface-elevated)] rounded w-1/2" />
        <div className="h-3 bg-[var(--surface-elevated)] rounded w-1/3" />
      </div>
    </div>
  </div>
)

const SimilarityBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => {
  // Guard against NaN or invalid values
  const safeValue = isNaN(value) || !isFinite(value) ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-[var(--text-heading)] flex-shrink-0" />
      <span className="text-xs text-[var(--text-heading)] w-14">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${safeValue}%`, backgroundColor: safeValue >= 90 ? 'var(--accent-sky-light)' : safeValue >= 75 ? 'var(--accent-sky)' : 'var(--status-warning)' }} />
      </div>
      <span className="text-xs font-semibold text-[var(--text-body)] w-8 text-right tabular-nums">{safeValue}%</span>
    </div>
  )
}

// Comp Card -- key metrics always visible, match score in expandable details
function CompCard({ comp, subject, isSale, isSelected, onToggle, isExpanded, onExpand, onRefreshComp, refreshing, onViewPhotos }: {
  comp: SaleComp | RentComp; subject: SubjectProperty; isSale: boolean; isSelected: boolean
  onToggle: () => void; isExpanded: boolean; onExpand: () => void
  onRefreshComp: () => void; refreshing: boolean; onViewPhotos?: () => void
}) {
  const compForCalc = toCompProperty(comp)
  const similarity = calculateSimilarityScore(subject, compForCalc)
  const saleAdj = isSale ? calculateSaleAdjustments(subject, compForCalc) : null
  const rentAdj = !isSale ? calculateRentAdjustments(subject, compForCalc) : null
  const compDate = isSale ? (comp as SaleComp).saleDate : (comp as RentComp).listingDate
  const freshness = getFreshnessBadge(compDate, isSale)

  return (
    <div className={`relative rounded-xl transition-all overflow-hidden bg-[var(--surface-base)] ${
      isSelected
        ? 'border border-[var(--border-focus)] shadow-[var(--shadow-card-hover)]'
        : `${cardBorderGlow} ${cardBorderGlowHover}`
    }`}>
      {/* Selection checkbox — 44px tap target for mobile */}
      <button onClick={onToggle}
        className={`absolute top-2 left-2 z-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all ${
          isSelected ? 'bg-[var(--color-sky-dim)] border-2 border-[var(--accent-sky-light)]' : 'bg-[var(--surface-base)] border-2 border-[var(--text-heading)] hover:border-[var(--accent-sky-light)]'
        }`}
        aria-label={isSelected ? 'Deselect comp' : 'Select comp'}>
        <span className={`rounded-full flex items-center justify-center w-5 h-5 ${isSelected ? 'bg-[var(--accent-sky-light)]' : ''}`}>
          {isSelected && <Check className="w-3 h-3 text-[var(--text-inverse)]" />}
        </span>
      </button>

      {/* Refresh button on unselected */}
      {!isSelected && (
        <button onClick={onRefreshComp} disabled={refreshing}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-heading)] hover:text-[var(--accent-sky-light)] hover:border-[var(--border-focus)] transition-colors disabled:opacity-50"
          title="Replace this comp">
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      )}

      <div
        className="flex cursor-pointer"
        onClick={onExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(); } }}
        aria-label="Expand comp details"
      >
        {/* Image + distance badge + View Photos */}
        <div className="flex flex-col w-[100px] flex-shrink-0">
          <div className="relative h-[80px] bg-[var(--surface-elevated)] rounded-tl-xl overflow-hidden">
            {comp.imageUrl ? (
              <img src={comp.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--surface-elevated)]">
                {isSale ? <Building2 className="w-5 h-5 text-[var(--text-heading)]" /> : <Home className="w-5 h-5 text-[var(--text-heading)]" />}
              </div>
            )}
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-[var(--accent-sky-light)] tabular-nums">{comp.distanceMiles.toFixed(2)} mi</span>
            </div>
          </div>
          {comp.zpid && onViewPhotos && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewPhotos(); }}
              className="flex items-center justify-center gap-1 py-1.5 w-full bg-[var(--accent-sky-light)] hover:opacity-90 text-[var(--text-inverse)] text-[10px] font-medium transition-colors"
            >
              <Camera className="w-3 h-3" />
              Photos
            </button>
          )}
        </div>

        {/* Details -- always visible: address, price, $/sqft, date, beds/baths/sqft */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 pl-4">
              <h4 className="text-sm font-semibold text-[var(--text-heading)] truncate">{comp.address}</h4>
              <p className="text-xs text-[var(--text-heading)] truncate">{comp.city}, {comp.state}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-[var(--text-heading)] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(isSale ? (comp as SaleComp).salePrice : (comp as RentComp).monthlyRent)}
                {!isSale && <span className="text-xs font-normal text-[var(--text-heading)]">/mo</span>}
              </p>
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <p className="text-[13px] font-semibold text-[var(--accent-sky-light)] tabular-nums">
                  ${Number(isSale ? (comp as SaleComp).pricePerSqft : (comp as RentComp).rentPerSqft).toFixed(2)}/sf{!isSale && '/mo'}
                </p>
                {comp.yearBuilt > 0 && (
                  <span className="flex items-center gap-0.5 text-[13px] text-[var(--text-heading)] tabular-nums">
                    <Calendar className="w-3 h-3 text-[var(--text-heading)]" aria-hidden />
                    Yr Built {comp.yearBuilt}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-[var(--text-heading)] mb-1.5 pl-4">
            <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{comp.beds}</span>
            <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{comp.baths}</span>
            <span className="flex items-center gap-0.5 tabular-nums"><Square className="w-3 h-3" />{comp.sqft?.toLocaleString()} sq ft</span>
            {comp.yearBuilt != null && comp.yearBuilt > 0 && (
              <span className="flex items-center gap-0.5 tabular-nums">Year Built {comp.yearBuilt}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pl-4">
            <span className="text-[12px] text-[var(--text-heading)]">{isSale ? 'Sold' : 'Listed'} {formatDate(compDate)}</span>
            <span className="text-[12px] px-1 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--text-heading)]">{getDaysAgo(compDate)}</span>
            {freshness && (
              <span className="text-[12px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: freshness.bgColor, color: freshness.color }}>
                {freshness.label}
              </span>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); onExpand(); }} className="ml-auto text-[14px] text-[var(--accent-sky-light)] hover:opacity-80 font-medium flex items-center gap-0.5">
              Details <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details: match score, similarity, adjustments */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] p-3 bg-[var(--surface-elevated)]/50">
          {/* Match Score header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-[var(--text-heading)] uppercase">Match Score:</span>
            <span className="text-lg font-bold tabular-nums" style={{
              color: similarity.overall >= 90 ? 'var(--accent-sky-light)' : similarity.overall >= 75 ? 'var(--accent-sky)' : 'var(--status-warning)'
            }}>{similarity.overall}%</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-[10px] font-semibold text-[var(--accent-sky-light)] uppercase tracking-wide mb-2">Similarity</h5>
              <div className="space-y-1.5">
                <SimilarityBar label="Location" value={similarity.location} icon={MapPin} />
                <SimilarityBar label="Size" value={similarity.size} icon={Square} />
                <SimilarityBar label="Bed/Bath" value={similarity.bedBath} icon={Bed} />
                <SimilarityBar label="Age" value={similarity.age} icon={Calendar} />
              </div>
            </div>
            <div>
              <h5 className="text-[10px] font-semibold text-[var(--text-body)] uppercase tracking-wide mb-2">Adjustments</h5>
              <div className="space-y-1">
                {isSale && saleAdj && [
                  { label: 'Size', value: saleAdj.size },
                  { label: 'Bedroom', value: saleAdj.bedroom },
                  { label: 'Bathroom', value: saleAdj.bathroom },
                  { label: 'Age', value: saleAdj.age },
                  { label: 'Lot', value: saleAdj.lot },
                ].map(adj => (
                  <div key={adj.label} className="flex justify-between text-xs">
                    <span className="text-[var(--text-heading)]">{adj.label}</span>
                    <span className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                      {adj.value >= 0 ? '+' : ''}{formatCurrency(Math.round(adj.value))}
                    </span>
                  </div>
                ))}
                {!isSale && rentAdj && [
                  { label: 'Size', value: rentAdj.size },
                  { label: 'Bedroom', value: rentAdj.bedroom },
                  { label: 'Bathroom', value: rentAdj.bathroom },
                ].map(adj => (
                  <div key={adj.label} className="flex justify-between text-xs">
                    <span className="text-[var(--text-heading)]">{adj.label}</span>
                    <span className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                      {adj.value >= 0 ? '+' : ''}{formatCurrency(Math.round(adj.value))}/mo
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-[var(--border-subtle)]">
                  <span className="font-semibold text-[var(--text-body)]">Adjusted</span>
                  <span className="font-bold text-[var(--accent-sky-light)] tabular-nums">
                    {formatCurrency((isSale ? (comp as SaleComp).salePrice : (comp as RentComp).monthlyRent) + Math.round(isSale ? (saleAdj?.total || 0) : (rentAdj?.total || 0)))}
                    {!isSale && '/mo'}
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

// Adjustment Grid
function AdjustmentGrid({ compAdjustments, isExpanded, onToggle, isSale }: {
  compAdjustments: CompAdjustment[]; isExpanded: boolean; onToggle: () => void; isSale: boolean
}) {
  if (compAdjustments.length === 0) return null
  return (
    <div className={`bg-[var(--surface-base)] rounded-xl overflow-hidden ${largeCardBorderGlow}`}>
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--surface-elevated)] transition-colors">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--accent-sky-light)]" />
          <span className="text-sm font-semibold text-[var(--text-heading)]">Adjustment Breakdown</span>
          <span className="text-xs text-[var(--text-heading)]">({compAdjustments.length})</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-heading)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-heading)]" />}
      </button>
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--surface-elevated)]/50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-[var(--text-heading)]">Address</th>
                <th className="px-3 py-2 text-right font-semibold text-[var(--text-heading)]">{isSale ? 'Base' : 'Rent'}</th>
                <th className="px-3 py-2 text-right font-semibold text-[var(--text-heading)]">Size</th>
                <th className="px-3 py-2 text-right font-semibold text-[var(--text-heading)]">Bed</th>
                <th className="px-3 py-2 text-right font-semibold text-[var(--text-heading)]">Bath</th>
                {isSale && <th className="px-3 py-2 text-right font-semibold text-[var(--text-heading)]">Age</th>}
                {isSale && <th className="px-3 py-2 text-right font-semibold text-[var(--text-heading)]">Lot</th>}
                <th className="px-3 py-2 text-right font-semibold text-[var(--accent-sky-light)]">Adjusted</th>
                <th className="px-3 py-2 text-right font-semibold text-[var(--text-heading)]">Weight</th>
              </tr>
            </thead>
            <tbody>
              {compAdjustments.map((ca, idx) => (
                <tr key={ca.compId} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--surface-elevated)]/30'}>
                  <td className="px-3 py-2 text-[var(--text-body)] truncate max-w-[140px]" title={ca.compAddress}>{ca.compAddress}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-body)]">{isSale ? formatCompactCurrency(ca.basePrice) : `$${ca.basePrice}`}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ca.sizeAdjustment >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                    {ca.sizeAdjustment >= 0 ? '+' : ''}{isSale ? formatCompactCurrency(ca.sizeAdjustment) : `$${ca.sizeAdjustment}`}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ca.bedroomAdjustment >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                    {ca.bedroomAdjustment >= 0 ? '+' : ''}{isSale ? formatCompactCurrency(ca.bedroomAdjustment) : `$${ca.bedroomAdjustment}`}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ca.bathroomAdjustment >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                    {ca.bathroomAdjustment >= 0 ? '+' : ''}{isSale ? formatCompactCurrency(ca.bathroomAdjustment) : `$${ca.bathroomAdjustment}`}
                  </td>
                  {isSale && <td className={`px-3 py-2 text-right tabular-nums ${ca.ageAdjustment >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                    {ca.ageAdjustment >= 0 ? '+' : ''}{formatCompactCurrency(ca.ageAdjustment)}
                  </td>}
                  {isSale && <td className={`px-3 py-2 text-right tabular-nums ${ca.lotAdjustment >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                    {ca.lotAdjustment >= 0 ? '+' : ''}{formatCompactCurrency(ca.lotAdjustment)}
                  </td>}
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--accent-sky-light)]">
                    {isSale ? formatCompactCurrency(ca.adjustedPrice) : `$${ca.adjustedPrice}/mo`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-heading)]">{(ca.weight * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export function PriceCheckerIQScreen({ property, initialView = 'sale' }: PriceCheckerIQScreenProps) {
  const router = useRouter()
  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`.trim()
  // Align with buildParams: valid if zpid OR usable fullAddress (same length check buildParams uses)
  const hasValidSubject = Boolean(property.zpid || (fullAddress && fullAddress.replace(/,|\s/g, '').length > 2))
  // Stable key for effect deps so changing property (e.g. navigate A → B) triggers re-fetch
  const subjectKey = `${property.zpid ?? ''}|${fullAddress}`

  // View state
  const [activeView, setActiveView] = useState<'sale' | 'rent'>(initialView)
  const isSale = activeView === 'sale'

  // Sale comps state
  const [saleComps, setSaleComps] = useState<SaleComp[]>([])
  const [saleSelected, setSaleSelected] = useState<Set<string | number>>(new Set())
  const [saleLoading, setSaleLoading] = useState(false)
  const [saleLoadFailed, setSaleLoadFailed] = useState(false)
  const [saleOffset, setSaleOffset] = useState(0)
  const [saleOverrideMarket, setSaleOverrideMarket] = useState<number | null>(null)
  const [saleOverrideArv, setSaleOverrideArv] = useState<number | null>(null)

  // Rent comps state
  const [rentComps, setRentComps] = useState<RentComp[]>([])
  const [rentSelected, setRentSelected] = useState<Set<string | number>>(new Set())
  const [rentLoading, setRentLoading] = useState(false)
  const [rentLoadFailed, setRentLoadFailed] = useState(false)
  const [rentOffset, setRentOffset] = useState(0)
  const [rentOverrideMarket, setRentOverrideMarket] = useState<number | null>(null)
  const [rentOverrideImproved, setRentOverrideImproved] = useState<number | null>(null)

  // Original comps snapshot -- stored on initial fetch so user can reset
  const [originalSaleComps, setOriginalSaleComps] = useState<SaleComp[]>([])
  const [originalSaleSelected, setOriginalSaleSelected] = useState<Set<string | number>>(new Set())
  const [originalRentComps, setOriginalRentComps] = useState<RentComp[]>([])
  const [originalRentSelected, setOriginalRentSelected] = useState<Set<string | number>>(new Set())

  // Shared state
  const [expandedComp, setExpandedComp] = useState<string | number | null>(null)
  const [recencyFilter, setRecencyFilter] = useState<'all' | '30' | '90'>('all')
  const [refreshingCompId, setRefreshingCompId] = useState<string | number | null>(null)
  const [photoModalComp, setPhotoModalComp] = useState<SaleComp | RentComp | null>(null)
  const [showAdjGrid, setShowAdjGrid] = useState(true)
  const [showProximityMap, setShowProximityMap] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [downloadingReport, setDownloadingReport] = useState(false)

  // Active state shortcuts
  const comps = isSale ? saleComps : rentComps
  const selectedIds = isSale ? saleSelected : rentSelected
  const loading = isSale ? saleLoading : rentLoading
  const loadFailed = isSale ? saleLoadFailed : rentLoadFailed

  // Subject property for calculations -- infer from comps average if not provided
  const subject: SubjectProperty = useMemo(() => {
    // If subject data not provided, infer from the median of loaded comps
    const allComps = [...saleComps, ...rentComps]
    const inferSqft = allComps.length > 0 ? Math.round(allComps.reduce((s, c) => s + c.sqft, 0) / allComps.length) : 1500
    const inferYear = allComps.length > 0 ? Math.round(allComps.reduce((s, c) => s + c.yearBuilt, 0) / allComps.filter(c => c.yearBuilt > 0).length) || 2000 : 2000
    const inferBeds = allComps.length > 0 ? Math.round(allComps.reduce((s, c) => s + c.beds, 0) / allComps.length) : 3
    const inferBaths = allComps.length > 0 ? Math.round(allComps.reduce((s, c) => s + c.baths, 0) / allComps.length) : 2

    return {
    sqft: property.sqft || inferSqft,
    beds: property.beds || inferBeds,
    baths: property.baths || inferBaths,
    yearBuilt: property.yearBuilt || inferYear,
    lotSize: property.lotSize || 0.25,
  }}, [property, saleComps, rentComps])

  // Appraisal calculations
  const saleAppraisal = useMemo(() => {
    const selected = saleComps.filter(c => saleSelected.has(c.id)).map(toCompProperty)
    return calculateAppraisalValues(subject, selected)
  }, [saleSelected, saleComps, subject])

  const rentAppraisal = useMemo(() => {
    const selected = rentComps.filter(c => rentSelected.has(c.id)).map(toCompProperty)
    return calculateRentAppraisalValues(subject, selected)
  }, [rentSelected, rentComps, subject])

  // Fetch helpers (non-blocking; use compsService with retries and timeout)
  const subjectForComps: CompsSubjectProperty | undefined = useMemo(() => (fullAddress || property.zpid) ? {
    zpid: property.zpid ?? '',
    address: property.address ?? '',
    city: property.city ?? '',
    state: property.state ?? '',
    zip: property.zipCode ?? '',
    beds: property.beds ?? 0,
    baths: property.baths ?? 0,
    sqft: property.sqft ?? 0,
    yearBuilt: property.yearBuilt ?? 0,
    propertyType: '',
    listPrice: property.price ?? 0,
    zestimate: null,
    rentZestimate: null,
    latitude: property.latitude ?? null,
    longitude: property.longitude ?? null,
  } : undefined, [fullAddress, property])

  const buildIdentifier = useCallback((offset = 0, excludeZpids: string[] = []): CompsIdentifier => {
    const id: CompsIdentifier = { limit: 10, offset }
    if (property.zpid) id.zpid = property.zpid
    else if (fullAddress && fullAddress.replace(/,|\s/g, '').length > 2) id.address = fullAddress
    if (excludeZpids.length > 0) id.exclude_zpids = excludeZpids.join(',')
    if (property.latitude != null) id.subject_lat = property.latitude
    if (property.longitude != null) id.subject_lon = property.longitude
    return id
  }, [property.zpid, fullAddress, property.latitude, property.longitude])

  const fetchSaleComps = useCallback(async (offset = 0, excludeZpids: string[] = []) => {
    setSaleLoading(true)
    setSaleLoadFailed(false)
    const identifier = buildIdentifier(offset, excludeZpids)
    const result = await fetchSaleCompsApi(identifier, subjectForComps ?? undefined)
    setSaleLoading(false)
    if (result.ok && result.data) {
      setSaleComps(result.data)
      setSaleLoadFailed(false)
      return result.data
    }
    setSaleLoadFailed(true)
    setSaleComps([])
    return []
  }, [buildIdentifier, subjectForComps])

  const fetchRentComps = useCallback(async (offset = 0, excludeZpids: string[] = []) => {
    setRentLoading(true)
    setRentLoadFailed(false)
    const identifier = buildIdentifier(offset, excludeZpids)
    const result = await fetchRentCompsApi(identifier, subjectForComps ?? undefined)
    setRentLoading(false)
    if (result.ok && result.data) {
      setRentComps(result.data)
      setRentLoadFailed(false)
      return result.data
    }
    setRentLoadFailed(true)
    setRentComps([])
    return []
  }, [buildIdentifier, subjectForComps])

  // Initial fetch when we have a valid subject; re-run when property identity changes (e.g. navigate A → B)
  useEffect(() => {
    if (!hasValidSubject) return
    const init = async () => {
      const [sold, rented] = await Promise.all([fetchSaleComps(), fetchRentComps()])
      setSaleComps(sold)
      setRentComps(rented)
      setOriginalSaleComps(sold)
      setOriginalRentComps(rented)
      const saleIds = sold.length > 0 ? new Set(sold.slice(0, 3).map(c => c.id)) : new Set<string | number>()
      const rentIds = rented.length > 0 ? new Set(rented.slice(0, 3).map(c => c.id)) : new Set<string | number>()
      setSaleSelected(saleIds)
      setRentSelected(rentIds)
      setOriginalSaleSelected(saleIds)
      setOriginalRentSelected(rentIds)
    }
    init()
  }, [hasValidSubject, subjectKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh all -- fetches brand new comps from the API
  const handleRefreshAll = async () => {
    if (isSale) {
      const fetched = await fetchSaleComps()
      setSaleComps(fetched); setSaleOffset(0)
      if (fetched.length > 0) setSaleSelected(new Set(fetched.slice(0, 3).map(c => c.id)))
      setSaleOverrideMarket(null); setSaleOverrideArv(null)
    } else {
      const fetched = await fetchRentComps()
      setRentComps(fetched); setRentOffset(0)
      if (fetched.length > 0) setRentSelected(new Set(fetched.slice(0, 3).map(c => c.id)))
      setRentOverrideMarket(null); setRentOverrideImproved(null)
    }
  }

  // Reset to original -- restores the initial comps and system-selected choices
  const handleResetToOriginal = () => {
    if (isSale) {
      setSaleComps(originalSaleComps)
      setSaleSelected(new Set(originalSaleSelected))
      setSaleOffset(0)
      setSaleOverrideMarket(null)
      setSaleOverrideArv(null)
    } else {
      setRentComps(originalRentComps)
      setRentSelected(new Set(originalRentSelected))
      setRentOffset(0)
      setRentOverrideMarket(null)
      setRentOverrideImproved(null)
    }
    setSaveMessage('Restored original comps')
    setTimeout(() => setSaveMessage(null), 2000)
  }

  // Check if current state differs from original
  const hasChangedFromOriginal = useMemo(() => {
    if (isSale) {
      if (saleComps.length !== originalSaleComps.length) return true
      return saleComps.some((c, i) => c.id !== originalSaleComps[i]?.id) ||
        [...saleSelected].sort().join(',') !== [...originalSaleSelected].sort().join(',')
    } else {
      if (rentComps.length !== originalRentComps.length) return true
      return rentComps.some((c, i) => c.id !== originalRentComps[i]?.id) ||
        [...rentSelected].sort().join(',') !== [...originalRentSelected].sort().join(',')
    }
  }, [isSale, saleComps, originalSaleComps, saleSelected, originalSaleSelected, rentComps, originalRentComps, rentSelected, originalRentSelected])

  // Refresh unselected
  const handleRefreshUnselected = async () => {
    const currentComps = isSale ? saleComps : rentComps
    const currentSelected = isSale ? saleSelected : rentSelected
    const currentOffset = isSale ? saleOffset : rentOffset

    const selectedZpids = currentComps.filter(c => currentSelected.has(c.id)).map(c => c.zpid || String(c.id)).filter(Boolean)
    const unselectedCount = currentComps.filter(c => !currentSelected.has(c.id)).length
    const newOffset = currentOffset + unselectedCount

    if (isSale) {
      setSaleLoading(true)
      try {
        const newComps = await fetchSaleComps(newOffset, selectedZpids)
        const kept = saleComps.filter(c => saleSelected.has(c.id))
        setSaleComps([...kept, ...newComps.slice(0, unselectedCount)])
        setSaleOffset(newOffset)
      } finally { setSaleLoading(false) }
    } else {
      setRentLoading(true)
      try {
        const newComps = await fetchRentComps(newOffset, selectedZpids)
        const kept = rentComps.filter(c => rentSelected.has(c.id))
        setRentComps([...kept, ...newComps.slice(0, unselectedCount)])
        setRentOffset(newOffset)
      } finally { setRentLoading(false) }
    }
  }

  // Refresh single comp
  const handleRefreshComp = async (compId: string | number) => {
    setRefreshingCompId(compId)
    const currentComps = isSale ? saleComps : rentComps
    const excludeZpids = currentComps.filter(c => c.id !== compId).map(c => c.zpid || String(c.id)).filter(Boolean)
    const currentOffset = isSale ? saleOffset : rentOffset
    try {
      if (isSale) {
        const newComps = await fetchSaleComps(currentOffset, excludeZpids)
        if (newComps.length > 0) {
          setSaleComps(prev => prev.map(c => c.id === compId ? newComps[0] : c))
          setSaleOffset(prev => prev + 1)
        }
      } else {
        const newComps = await fetchRentComps(currentOffset, excludeZpids)
        if (newComps.length > 0) {
          setRentComps(prev => prev.map(c => c.id === compId ? newComps[0] : c))
          setRentOffset(prev => prev + 1)
        }
      }
    } finally { setRefreshingCompId(null) }
  }

  // Toggle comp selection
  const toggleComp = (id: string | number) => {
    const setter = isSale ? setSaleSelected : setRentSelected
    setter(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // Apply values
  const handleApplyValues = () => {
    const params = new URLSearchParams({ address: fullAddress })
    if (isSale) {
      const arv = saleOverrideArv ?? saleAppraisal.arv
      const mv = saleOverrideMarket ?? saleAppraisal.marketValue
      if (arv > 0) params.append('arv', String(arv))
      if (mv > 0) params.append('marketValue', String(mv))
    } else {
      const rent = rentOverrideMarket ?? rentAppraisal.marketRent
      if (rent > 0) params.append('rent', String(rent))
    }
    router.push(`/verdict?${params.toString()}`)
  }

  // Share handler (used by toast messages)
  const handleShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: `PriceCheckerIQ - ${property.address}`, url: window.location.href }) } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(window.location.href); setSaveMessage('Link copied!'); setTimeout(() => setSaveMessage(null), 2000) }
  }

  const handleDownloadReport = async () => {
    if (!isSale || saleSelected.size === 0) return
    setDownloadingReport(true)
    try {
      const payload = buildAppraisalPayload({
        appraisalResult: saleAppraisal,
        comps: saleComps,
        selectedIds: saleSelected,
        subject: {
          address: fullAddress,
          beds: subject.beds,
          baths: subject.baths,
          sqft: subject.sqft,
          yearBuilt: subject.yearBuilt,
          lotSize: subject.lotSize,
          price: property.price ?? undefined,
        },
        overrideMarketValue: saleOverrideMarket,
        overrideArv: saleOverrideArv,
      })
      await downloadAppraisalReportPDF(payload)
      setSaveMessage('Report downloaded')
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (err) {
      console.error('Failed to download appraisal report:', err)
      setSaveMessage('Download failed')
      setTimeout(() => setSaveMessage(null), 2000)
    } finally {
      setDownloadingReport(false)
    }
  }

  // Filtered comps
  const filteredComps = useMemo(() => comps.filter(c => {
    const dateStr = 'saleDate' in c ? c.saleDate : c.listingDate
    const daysAgo = getDaysAgoNum(dateStr)
    if (recencyFilter === '30') return daysAgo <= 30
    if (recencyFilter === '90') return daysAgo <= 90
    return true
  }), [comps, recencyFilter])

  const mapComps = useMemo(() => filteredComps.map(c => ({
    id: c.id,
    latitude: c.latitude,
    longitude: c.longitude,
    address: c.address,
  })), [filteredComps])

  // Current appraisal result
  const appraisal = isSale ? saleAppraisal : null
  const rentResult = !isSale ? rentAppraisal : null

  // Display values with override
  const displayMarketValue = saleOverrideMarket ?? saleAppraisal.marketValue
  const displayArv = saleOverrideArv ?? saleAppraisal.arv
  const displayMarketRent = rentOverrideMarket ?? rentAppraisal.marketRent
  const displayImprovedRent = rentOverrideImproved ?? rentAppraisal.improvedRent

  return (
    <div className="min-h-screen bg-black font-['Inter',sans-serif]">
      <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto pb-6">
        {/* Dual Valuation Panel: header scrolls away; cards row freezes at top */}
        <div className="mx-4 mt-4">
          {/* Header — scrolls up and out of view */}
          <div className={`relative rounded-t-xl p-4 overflow-hidden bg-black ${largeCardBorderGlow}`}
            style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(14,165,233,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(14,165,233,0.06) 0%, transparent 50%), #000000' }}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-black border border-[rgba(14,165,233,0.3)] flex items-center justify-center">
                  <Target className="w-4.5 h-4.5 text-[#38bdf8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F1F5F9]">{isSale ? 'Appraisal Values' : 'Rental Appraisal'}</h3>
                  <p className="text-xs text-[#F1F5F9]">From {selectedIds.size} selected</p>
                </div>
              </div>
              <div className="flex rounded-xl bg-black/50 border border-[rgba(14,165,233,0.2)] p-1 justify-self-center">
                <button onClick={() => { setActiveView('sale'); setShowAdjGrid(false); setExpandedComp(null) }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isSale ? 'bg-black text-[#38bdf8] border border-[rgba(14,165,233,0.3)] shadow-[0_0_20px_rgba(14,165,233,0.08)]' : 'text-[#F1F5F9] hover:text-[#CBD5E1]'
                  }`}>
                  Sale Comps
                </button>
                <button onClick={() => { setActiveView('rent'); setShowAdjGrid(false); setExpandedComp(null) }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    !isSale ? 'bg-black text-[#38bdf8] border border-[rgba(14,165,233,0.3)] shadow-[0_0_20px_rgba(14,165,233,0.08)]' : 'text-[#F1F5F9] hover:text-[#CBD5E1]'
                  }`}>
                  Rent Comps
                </button>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-black border border-[rgba(14,165,233,0.25)]">
                <div className="text-base font-bold tabular-nums" style={{
                  color: (isSale ? saleAppraisal.confidence : rentAppraisal.confidence) >= 85 ? '#38bdf8'
                    : (isSale ? saleAppraisal.confidence : rentAppraisal.confidence) >= 70 ? '#fbbf24' : '#f87171'
                }}>
                  {loading ? '...' : `${isSale ? saleAppraisal.confidence : rentAppraisal.confidence}%`}
                </div>
                <div className="text-[9px] text-[#F1F5F9] uppercase">Confidence</div>
              </div>
            </div>
          </div>

          {/* Comp Appraisal + Est. After Repair row — sticky: stops here and freezes */}
          <div className="sticky top-[152px] z-40 overflow-hidden rounded-b-xl">
            <div className={`relative rounded-b-xl px-3 py-2 overflow-hidden bg-black ${largeCardBorderGlow}`}
              style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(14,165,233,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(14,165,233,0.06) 0%, transparent 50%), #000000' }}>
            <div className="grid grid-cols-2 gap-2.5 mb-2">
              {/* Left: Comp Appraisal / RentCast Estimate */}
              <div className="bg-black rounded-lg px-2.5 py-2 border border-[rgba(14,165,233,0.25)]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold text-[#F1F5F9] uppercase tracking-wide">
                    {isSale ? 'Comp Appraisal' : 'RentCast Estimate'}
                  </span>
                  <button onClick={() => {
                    if (isSale) setSaleOverrideMarket(saleOverrideMarket !== null ? null : saleAppraisal.marketValue)
                    else setRentOverrideMarket(rentOverrideMarket !== null ? null : rentAppraisal.marketRent)
                  }} className={`p-0.5 rounded ${(isSale ? saleOverrideMarket : rentOverrideMarket) !== null ? 'text-[#fbbf24]' : 'text-[#F1F5F9]'}`}>
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {(isSale ? saleOverrideMarket : rentOverrideMarket) !== null ? (
                  <input type="text" value={formatCurrency(isSale ? saleOverrideMarket! : rentOverrideMarket!)}
                    onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, '')); if (!isNaN(v)) isSale ? setSaleOverrideMarket(v) : setRentOverrideMarket(v) }}
                    className="text-lg font-bold text-[#F1F5F9] tabular-nums bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded px-1.5 py-0.5 w-full" />
                ) : (
                  <div className="text-lg font-bold text-[#F1F5F9] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {loading ? '...' : formatCurrency(isSale ? displayMarketValue : displayMarketRent)}
                    {!isSale && <span className="text-xs font-normal text-[#F1F5F9]">/mo</span>}
                  </div>
                )}
                <div className="text-[10px] text-[#F1F5F9] mt-0.5">As-Is Condition</div>
                <div className="text-[10px] text-[#F1F5F9]">
                  Range: {isSale 
                    ? `${formatCompactCurrency(saleAppraisal.rangeLow)} — ${formatCompactCurrency(saleAppraisal.rangeHigh)}`
                    : `$${rentAppraisal.rangeLow} — $${rentAppraisal.rangeHigh}`
                  }
                </div>
                <div className="-mt-2 flex justify-end">
                  <button
                    onClick={handleApplyValues}
                    disabled={(isSale ? displayMarketValue : displayMarketRent) === 0}
                    className="px-2.5 py-[2.5px] rounded-full bg-black border border-[#38bdf8] hover:border-[#38bdf8]/80 text-[#38bdf8] text-[12.5px] font-semibold disabled:opacity-50 transition-colors"
                  >
                    Apply to Deal
                  </button>
                </div>
              </div>

              {/* Right: ARV / Improved Rent */}
              <div className="bg-black rounded-lg px-2.5 py-2 border border-[rgba(14,165,233,0.3)]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold text-[#38bdf8] uppercase tracking-wide">
                    {isSale ? 'Est. After Repair' : 'Improved Rent'}
                  </span>
                  <button onClick={() => {
                    if (isSale) setSaleOverrideArv(saleOverrideArv !== null ? null : saleAppraisal.arv)
                    else setRentOverrideImproved(rentOverrideImproved !== null ? null : rentAppraisal.improvedRent)
                  }} className={`p-0.5 rounded ${(isSale ? saleOverrideArv : rentOverrideImproved) !== null ? 'text-[#fbbf24]' : 'text-[#F1F5F9]'}`}>
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {(isSale ? saleOverrideArv : rentOverrideImproved) !== null ? (
                  <input type="text" value={formatCurrency(isSale ? saleOverrideArv! : rentOverrideImproved!)}
                    onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, '')); if (!isNaN(v)) isSale ? setSaleOverrideArv(v) : setRentOverrideImproved(v) }}
                    className="text-lg font-bold text-[#38bdf8] tabular-nums bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded px-1.5 py-0.5 w-full" />
                ) : (
                  <div className="text-lg font-bold text-[#38bdf8] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {loading ? '...' : formatCurrency(isSale ? displayArv : displayImprovedRent)}
                    {!isSale && <span className="text-xs font-normal text-[#F1F5F9]">/mo</span>}
                  </div>
                )}
                <div className="text-[10px] text-[#F1F5F9] mt-0.5">Post-Rehab</div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[#34d399]" />
                  <span className="text-[10px] font-medium text-[#34d399]">{isSale ? '+15% rehab premium' : '+10% condition premium'}</span>
                </div>
                <div className="-mt-2 flex justify-end">
                  <button
                    onClick={handleApplyValues}
                    disabled={(isSale ? displayArv : displayImprovedRent) === 0}
                    className="px-2.5 py-[2.5px] rounded-full bg-black border border-[#38bdf8] hover:border-[#38bdf8]/80 text-[#38bdf8] text-[12.5px] font-semibold disabled:opacity-50 transition-colors"
                  >
                    Apply to Deal
                  </button>
                </div>
              </div>
            </div>

            {/* Methodology + Download button + $/sqft */}
            <div className="flex items-center justify-between text-[10px] text-[#F1F5F9] mb-1 px-0.5 gap-3">
              <div className="flex items-center gap-1 flex-shrink-0">
                <Info className="w-3 h-3" />
                <span>Weighted hybrid methodology</span>
              </div>
              {isSale && (
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={saleSelected.size === 0 || downloadingReport}
                  className="flex items-center justify-center gap-1.5 py-2 px-5 rounded-full bg-black border border-[#38bdf8] hover:border-[#38bdf8]/90 text-[#38bdf8] text-[14px] font-semibold uppercase tracking-wide disabled:opacity-50 transition-colors flex-shrink-0"
                  title="Download appraisal report as PDF"
                >
                  {downloadingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                  DOWNLOAD APPRAISAL REPORT
                </button>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="tabular-nums font-medium text-[#F1F5F9]">
                  ${isSale ? saleAppraisal.weightedAveragePpsf : rentAppraisal.rentPerSqft}/sqft avg
                </span>
              </div>
            </div>

            </div>
          </div>
        </div>

        {/* Proximity Map (accordion, loads closed; legend in header) */}
        {hasValidSubject && !loading && !loadFailed && comps.length > 0 && (
          <div className="mx-4 mt-3">
            <div className={`bg-black rounded-xl overflow-hidden ${largeCardBorderGlow}`}>
              <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                <button
                  type="button"
                  onClick={() => setShowProximityMap(!showProximityMap)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <MapPin className="w-4 h-4 text-[#38bdf8] flex-shrink-0" />
                  <span className="text-sm font-semibold text-[#F1F5F9]">Proximity Map</span>
                </button>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {isSale && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDownloadReport(); }}
                      disabled={saleSelected.size === 0 || downloadingReport}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-black border border-[rgba(14,165,233,0.4)] hover:border-[#38bdf8] text-[#38bdf8] text-[10px] font-medium disabled:opacity-50 transition-colors"
                      title="Download appraisal report as PDF"
                    >
                      {downloadingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                      Download report
                    </button>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-[#F1F5F9]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335] inline-block" />
                      Subject
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: isSale ? '#0EA5E9' : '#38bdf8' }}
                      />
                      {isSale ? 'Sale' : 'Rent'} Comps ({mapComps.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProximityMap(!showProximityMap)}
                    className="p-0.5 text-[#F1F5F9]"
                    aria-label={showProximityMap ? 'Collapse map' : 'Expand map'}
                  >
                    {showProximityMap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {showProximityMap && (
                <div className="border-t border-[rgba(14,165,233,0.25)]">
                  <CompsProximityMap
                    subject={{ latitude: property.latitude, longitude: property.longitude, address: fullAddress }}
                    comps={mapComps}
                    activeView={activeView}
                    hideHeader
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Adjustment Grid (accordion, loads open) */}
        <div className="mx-4 mt-3">
          <AdjustmentGrid
            compAdjustments={isSale ? saleAppraisal.compAdjustments : rentAppraisal.compAdjustments}
            isExpanded={showAdjGrid}
            onToggle={() => setShowAdjGrid(!showAdjGrid)}
            isSale={isSale}
          />
        </div>

        {/* Controls + Filters */}
        <div className="px-4 mt-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-[#F1F5F9] flex-shrink-0">{selectedIds.size} of {filteredComps.length} selected</span>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide min-w-0">
            {/* New / All / Reset */}
            <button onClick={handleRefreshUnselected} disabled={loading || selectedIds.size === 0 || selectedIds.size === comps.length}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-black border border-[rgba(14,165,233,0.25)] text-[11px] font-medium text-[#CBD5E1] hover:border-[rgba(14,165,233,0.55)] disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
              title="Replace unselected comps with new ones">
              <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />New
            </button>
            <button onClick={handleRefreshAll} disabled={loading}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-black border border-[rgba(14,165,233,0.25)] text-[11px] font-medium text-[#CBD5E1] hover:border-[rgba(14,165,233,0.55)] disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
              title="Fetch all new comps from API">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />All
            </button>
            {hasChangedFromOriginal && (
              <button onClick={handleResetToOriginal} disabled={loading}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-[11px] font-medium text-[#fbbf24] hover:bg-[#fbbf24]/15 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                title="Restore original system-selected comps">
                <RotateCcw className="w-3 h-3" />Reset
              </button>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-[rgba(14,165,233,0.2)] flex-shrink-0" />

            {/* Recency filter */}
            <div className="flex rounded-lg bg-black/50 border border-[rgba(14,165,233,0.2)] p-0.5 flex-shrink-0">
              {([['all', 'All'], ['30', '30 days'], ['90', '90 days']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setRecencyFilter(val)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[44px] sm:min-h-0 ${
                    recencyFilter === val ? 'bg-black text-[#38bdf8] border border-[rgba(14,165,233,0.3)]' : 'text-[#F1F5F9] hover:text-[#F1F5F9]'
                  }`}>{label}</button>
              ))}
            </div>

            <div className="w-px h-5 bg-[rgba(14,165,233,0.2)] flex-shrink-0" />

            <div className="flex items-center gap-2">
              <button onClick={() => (isSale ? setSaleSelected : setRentSelected)(new Set(filteredComps.map(c => c.id)))}
                className="flex-shrink-0 min-h-[44px] px-3 py-2 sm:py-1 text-xs font-medium text-[#CBD5E1] hover:bg-white/[0.05] rounded-lg whitespace-nowrap">Select All</button>
              <button onClick={() => (isSale ? setSaleSelected : setRentSelected)(new Set())}
                className="flex-shrink-0 min-h-[44px] px-3 py-2 sm:py-1 text-xs font-medium text-[#CBD5E1] hover:bg-white/[0.05] rounded-lg whitespace-nowrap">Clear</button>
            </div>
            </div>
          </div>
        </div>

        {/* No property (landed without address or zpid) */}
        {!hasValidSubject && (
          <div className={`mx-4 mt-3 rounded-xl p-6 text-center bg-black ${cardBorderGlow}`}>
            <MapPin className="mx-auto mb-3 text-[#F1F5F9] w-10 h-10" aria-hidden />
            <h3 className="text-sm font-semibold text-[#CBD5E1] mb-1">Enter a property to view comps</h3>
            <p className="text-xs text-[#F1F5F9] mb-4 max-w-md mx-auto">
              Open a property from Verdict or search, then use the Comps tab to see comparable sales and rentals.
            </p>
            <button
              type="button"
              onClick={() => router.push('/search')}
              className="px-4 py-2 text-sm font-medium text-[#CBD5E1] bg-black border border-[rgba(14,165,233,0.3)] rounded-lg hover:border-[rgba(14,165,233,0.55)]"
            >
              Search for a property
            </button>
          </div>
        )}

        {/* Loading */}
        {hasValidSubject && loading && comps.length === 0 && !loadFailed && (
          <div className="px-4 mt-3 space-y-3">
            {[1, 2, 3].map(i => <CompCardSkeleton key={i} />)}
            <p className="text-xs text-[#F1F5F9] text-center">
              Loading comparable {isSale ? 'sales' : 'rentals'}...
            </p>
          </div>
        )}

        {/* Unavailable (friendly fallback — no raw errors) */}
        {hasValidSubject && loadFailed && !loading && (
          <div className={`mx-4 mt-3 rounded-xl p-6 text-center bg-black ${cardBorderGlow}`}>
            <Info className="mx-auto mb-3 text-[#F1F5F9] w-10 h-10" aria-hidden />
            <h3 className="text-sm font-semibold text-[#CBD5E1] mb-1">
              Comparable {isSale ? 'sales' : 'rentals'} temporarily unavailable
            </h3>
            <p className="text-xs text-[#F1F5F9] mb-4 max-w-md mx-auto">
              Your deal analysis and scores above are complete. Comps will appear here when the data source is back online.
            </p>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="px-4 py-2 text-sm font-medium text-[#CBD5E1] bg-black border border-[rgba(14,165,233,0.3)] rounded-lg hover:border-[rgba(14,165,233,0.55)]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty (success but no comps found) */}
        {hasValidSubject && !loading && !loadFailed && comps.length === 0 && (
          <div className={`mx-4 mt-3 bg-black rounded-xl p-6 text-center ${cardBorderGlow}`}>
            {isSale ? <Building2 className="mx-auto mb-2 text-[#F1F5F9] w-8 h-8" /> : <Home className="mx-auto mb-2 text-[#F1F5F9] w-8 h-8" />}
            <h3 className="text-sm font-semibold text-[#CBD5E1] mb-1">No {isSale ? 'Sale' : 'Rental'} Comps Found</h3>
            <p className="text-xs text-[#F1F5F9]">Try refreshing or check the property address</p>
          </div>
        )}

        {/* Comp Cards */}
        {hasValidSubject && !loading && !loadFailed && comps.length > 0 && (
          <div className="w-full min-w-0 px-4 mt-3 space-y-3">
            {filteredComps.map(comp => (
              <CompCard
                key={comp.id}
                comp={comp}
                subject={subject}
                isSale={isSale}
                isSelected={selectedIds.has(comp.id)}
                onToggle={() => toggleComp(comp.id)}
                isExpanded={expandedComp === comp.id}
                onExpand={() => setExpandedComp(expandedComp === comp.id ? null : comp.id)}
                onRefreshComp={() => handleRefreshComp(comp.id)}
                refreshing={refreshingCompId === comp.id}
                onViewPhotos={comp.zpid ? () => setPhotoModalComp(comp) : undefined}
              />
            ))}
          </div>
        )}

        {/* Location Quality */}
        {!loading && !loadFailed && comps.length > 0 && (
          <div className={`mx-4 mt-4 p-3 rounded-lg bg-black ${cardBorderGlow}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#F1F5F9]">{comps.filter(c => c.distanceMiles <= 0.5).length} of {comps.length} within 0.5 mi</span>
              <span className={`text-xs font-semibold ${
                comps.filter(c => c.distanceMiles <= 0.5).length >= 3 ? 'text-[#34d399]' : comps.filter(c => c.distanceMiles <= 1).length >= 3 ? 'text-[#fbbf24]' : 'text-[#F1F5F9]'
              }`}>
                Location: {comps.filter(c => c.distanceMiles <= 0.5).length >= 3 ? 'EXCELLENT' : comps.filter(c => c.distanceMiles <= 1).length >= 3 ? 'GOOD' : 'FAIR'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {saveMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#F1F5F9] text-black text-sm font-medium rounded-lg shadow-lg shadow-black/40 z-50">
          {saveMessage}
        </div>
      )}

      {/* Comp Photos Modal */}
      {photoModalComp && (
        <CompPhotosModal
          comp={{ zpid: photoModalComp.zpid, address: photoModalComp.address }}
          open={!!photoModalComp}
          onClose={() => setPhotoModalComp(null)}
        />
      )}
    </div>
  )
}

export default PriceCheckerIQScreen
