'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { 
  MapPin, Bed, Bath, Square, Calendar, Check, ChevronDown, ChevronUp,
  Target, DollarSign, RefreshCw, AlertCircle, Home,
  TrendingUp, Lock, Unlock, RotateCcw, Info
} from 'lucide-react'
import {
  calculateRentAppraisalValues,
  calculateSimilarityScore,
  calculateRentAdjustments,
  type SubjectProperty,
  type CompProperty,
  type RentAppraisalResult,
  type CompAdjustment
} from '@/utils/appraisalCalculations'
import { formatCurrency } from '@/utils/formatters'

// ============================================
// API SERVICE - Uses Next.js proxy to avoid CORS
// ============================================
interface FetchParams {
  zpid?: string
  url?: string
  address?: string
  limit?: number
  offset?: number
  exclude_zpids?: string
}

async function fetchRentalComps(params: FetchParams) {
  const url = new URL('/api/v1/similar-rent', window.location.origin)
  
  if (params.zpid) url.searchParams.append('zpid', params.zpid)
  if (params.url) url.searchParams.append('url', params.url)
  if (params.address) url.searchParams.append('address', params.address)
  if (params.limit) url.searchParams.append('limit', params.limit.toString())
  if (params.offset) url.searchParams.append('offset', params.offset.toString())
  if (params.exclude_zpids) url.searchParams.append('exclude_zpids', params.exclude_zpids)

  console.log('[RentalComps] Fetching from proxy:', url.toString())

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('[RentalComps] API Error:', data)
    throw new Error(data.error || `API Error ${response.status}`)
  }

  console.log('[RentalComps] Success, results:', data.results?.length || 0)
  return data
}

// ============================================
// UTILITIES
// ============================================
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getListingAge = (dateString: string) => {
  if (!dateString) return ''
  const listDate = new Date(dateString)
  if (isNaN(listDate.getTime())) return ''
  const today = new Date()
  const diffTime = today.getTime() - listDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Coming'
  if (diffDays === 0) return 'Today'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 60) return '1mo ago'
  return `${Math.floor(diffDays / 30)}mo ago`
}

const getListingDaysAgo = (dateString: string): number => {
  if (!dateString) return 999
  const listDate = new Date(dateString)
  if (isNaN(listDate.getTime())) return 999
  const today = new Date()
  const diffTime = today.getTime() - listDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

const getFreshnessBadge = (dateString: string): { label: string; color: string; bgColor: string } | null => {
  const daysAgo = getListingDaysAgo(dateString)
  if (daysAgo < 0) return null
  if (daysAgo <= 30) return { label: 'Recent', color: '#10B981', bgColor: '#10B98115' }
  if (daysAgo > 90) return { label: 'Older listing', color: '#F59E0B', bgColor: '#F59E0B15' }
  return null
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3959
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ============================================
// TYPES
// ============================================
interface LocalRentalComp {
  id: number | string
  zpid?: string
  address: string
  city: string
  state: string
  zip: string
  monthlyRent: number
  rentPerSqft: number
  beds: number
  baths: number
  sqft: number
  yearBuilt: number
  listingDate: string
  distance: number
  image: string
  latitude: number
  longitude: number
}

interface LocalSubjectProperty {
  address: string
  city: string
  state: string
  zip: string
  price: number
  beds: number
  baths: number
  sqft: number
  lotSize: number
  yearBuilt: number
  latitude: number
  longitude: number
}

// ============================================
// DATA TRANSFORMATION
// ============================================
/** Extract first photo URL from a comp from various API response shapes */
function getCompImageUrl(comp: Record<string, unknown>): string {
  // Direct image fields (common from various providers)
  const direct = (comp.imgSrc || comp.imageUrl || comp.photo || comp.image || comp.thumbnail || comp.picture) as string | undefined
  if (direct && typeof direct === 'string' && direct.startsWith('http')) return direct

  // Zillow-style: compsCarouselPropertyPhotos[0].mixedSources.jpeg[0].url
  const photos = comp.compsCarouselPropertyPhotos as Record<string, unknown>[] | undefined
  if (photos?.length) {
    const photoData = photos[0] as Record<string, unknown>
    const mixedSources = photoData.mixedSources as Record<string, unknown[]> | undefined
    if (mixedSources?.jpeg?.length) {
      const url = (mixedSources.jpeg[0] as Record<string, string>)?.url
      if (url) return url
    }
    const url = photoData.url as string | undefined
    if (url) return url
  }

  // Array of photos: photos[0].url or photos[0]
  const photosArr = (comp.photos || comp.images) as Array<Record<string, unknown> | string> | undefined
  if (photosArr?.length) {
    const first = photosArr[0]
    if (typeof first === 'string' && first.startsWith('http')) return first
    if (first && typeof first === 'object' && (first as Record<string, string>).url) return (first as Record<string, string>).url
  }

  return ''
}

const transformRentalResponse = (apiData: Record<string, unknown>, subject: LocalSubjectProperty): LocalRentalComp[] => {
  const rawResults = (apiData.rentalComps || apiData.results || apiData.data || apiData.rentals || []) as Record<string, unknown>[]

  return rawResults.map((item: Record<string, unknown>, index: number) => {
    const comp = (item.property || item) as Record<string, unknown>
    const address = (comp.address || {}) as Record<string, unknown>
    
    const imageUrl = getCompImageUrl(comp)
    
    let distance = 0
    if (subject.latitude && subject.longitude && comp.latitude && comp.longitude) {
      distance = calculateDistance(
        subject.latitude, 
        subject.longitude, 
        comp.latitude as number, 
        comp.longitude as number
      )
    }
    
    const monthlyRent = parseFloat(String(comp.rent || comp.monthlyRent || comp.price || 0))
    const sqft = parseInt(String(comp.livingAreaValue || comp.livingArea || comp.sqft || 0))

    return {
      id: (comp.zpid as string) || index + 1,
      zpid: comp.zpid as string,
      address: (address.streetAddress as string) || (comp.streetAddress as string) || (comp.address as string) || '',
      city: (address.city as string) || (comp.city as string) || '',
      state: (address.state as string) || (comp.state as string) || '',
      zip: (address.zipcode as string) || (comp.zipcode as string) || (comp.zip as string) || '',
      monthlyRent,
      rentPerSqft: sqft > 0 ? Math.round((monthlyRent / sqft) * 100) / 100 : 0,
      beds: parseInt(String(comp.bedrooms || comp.beds || 0)),
      baths: parseFloat(String(comp.bathrooms || comp.baths || 0)),
      sqft,
      yearBuilt: parseInt(String(comp.yearBuilt || 0)),
      listingDate: (comp.listingDate as string) || (comp.seenDate as string) || (comp.datePosted as string) || '',
      distance: Math.round(distance * 100) / 100,
      image: imageUrl,
      latitude: parseFloat(String(comp.latitude || 0)),
      longitude: parseFloat(String(comp.longitude || 0)),
    }
  })
}

// Convert local comp to appraisal calculation format
const toCompProperty = (comp: LocalRentalComp): CompProperty => ({
  id: comp.id,
  zpid: comp.zpid,
  address: comp.address,
  price: comp.monthlyRent,
  sqft: comp.sqft,
  beds: comp.beds,
  baths: comp.baths,
  yearBuilt: comp.yearBuilt,
  lotSize: 0,
  distance: comp.distance,
  pricePerSqft: comp.rentPerSqft,
})

// ============================================
// COMPONENTS
// ============================================
const RentalCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
    <div className="flex gap-4">
      <div className="w-24 h-24 bg-slate-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
    </div>
  </div>
)

const SimilarityBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
    <span className="text-xs text-slate-500 w-14">{label}</span>
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          backgroundColor: value >= 90 ? '#0EA5E9' : value >= 75 ? '#0E7490' : '#F59E0B'
        }}
      />
    </div>
    <span className="text-xs font-semibold text-slate-700 w-8 text-right tabular-nums">{value}%</span>
  </div>
)

// Dual Rent Valuation Panel Component
const DualRentValuationPanel = ({ 
  appraisalResult,
  isMarketRentOverridden,
  isImprovedRentOverridden,
  manualMarketRent,
  manualImprovedRent,
  onMarketRentChange,
  onImprovedRentChange,
  onToggleMarketRentOverride,
  onToggleImprovedRentOverride,
  onApplyRent,
  loading,
  selectedCount,
  purchasePrice,
}: {
  appraisalResult: RentAppraisalResult
  isMarketRentOverridden: boolean
  isImprovedRentOverridden: boolean
  manualMarketRent: number
  manualImprovedRent: number
  onMarketRentChange: (value: number) => void
  onImprovedRentChange: (value: number) => void
  onToggleMarketRentOverride: () => void
  onToggleImprovedRentOverride: () => void
  onApplyRent: () => void
  loading: boolean
  selectedCount: number
  purchasePrice: number
}) => {
  const displayMarketRent = isMarketRentOverridden ? manualMarketRent : appraisalResult.marketRent
  const displayImprovedRent = isImprovedRentOverridden ? manualImprovedRent : appraisalResult.improvedRent

  // Calculate metrics
  const annualGross = displayMarketRent * 12
  const estimatedNOI = annualGross * 0.6
  const capRate = purchasePrice > 0 ? (estimatedNOI / purchasePrice) * 100 : 0

  return (
    <div className="bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-teal-500/10 rounded-xl p-4 border border-teal-200/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Rental Appraisal</h3>
            <p className="text-xs text-slate-500">From {selectedCount} selected comps</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-3 py-1 rounded-lg bg-white/60">
            <div className="text-lg font-bold text-teal-600 tabular-nums">{capRate.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500 uppercase">Est. Cap Rate</div>
          </div>
          <div className="text-center px-3 py-1 rounded-lg bg-white/60">
            <div className="text-lg font-bold tabular-nums" style={{ 
              color: appraisalResult.confidence >= 85 ? '#0EA5E9' : appraisalResult.confidence >= 70 ? '#F59E0B' : '#EF4444' 
            }}>
              {loading ? '...' : appraisalResult.confidence}%
            </div>
            <div className="text-[10px] text-slate-500 uppercase">Confidence</div>
          </div>
        </div>
      </div>

      {/* Dual Rent Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Market Rent */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Est. Market Rent</span>
            <button
              onClick={onToggleMarketRentOverride}
              className={`p-1 rounded transition-colors ${isMarketRentOverridden ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-slate-600'}`}
              title={isMarketRentOverridden ? 'Value overridden - click to reset' : 'Click to override'}
            >
              {isMarketRentOverridden ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
          {isMarketRentOverridden ? (
            <div className="flex items-baseline">
              <input
                type="text"
                value={formatCurrency(manualMarketRent)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/[^0-9]/g, ''))
                  if (!isNaN(val)) onMarketRentChange(val)
                }}
                className="text-xl font-bold text-slate-800 tabular-nums bg-amber-50 border border-amber-200 rounded px-2 py-1 w-24"
              />
              <span className="text-sm font-normal text-slate-400 ml-1">/mo</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-800 tabular-nums">
              {loading ? '...' : formatCurrency(displayMarketRent)}
              <span className="text-sm font-normal text-slate-400">/mo</span>
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-1">As-Is Condition</div>
          <div className="text-xs text-slate-500 mt-1">
            Range: ${appraisalResult.rangeLow} — ${appraisalResult.rangeHigh}
          </div>
        </div>

        {/* Improved Rent */}
        <div className="bg-white rounded-lg p-3 border border-teal-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Improved Rent</span>
            <button
              onClick={onToggleImprovedRentOverride}
              className={`p-1 rounded transition-colors ${isImprovedRentOverridden ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-slate-600'}`}
              title={isImprovedRentOverridden ? 'Value overridden - click to reset' : 'Click to override'}
            >
              {isImprovedRentOverridden ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
          {isImprovedRentOverridden ? (
            <div className="flex items-baseline">
              <input
                type="text"
                value={formatCurrency(manualImprovedRent)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/[^0-9]/g, ''))
                  if (!isNaN(val)) onImprovedRentChange(val)
                }}
                className="text-xl font-bold text-teal-700 tabular-nums bg-amber-50 border border-amber-200 rounded px-2 py-1 w-24"
              />
              <span className="text-sm font-normal text-slate-400 ml-1">/mo</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-teal-700 tabular-nums">
              {loading ? '...' : formatCurrency(displayImprovedRent)}
              <span className="text-sm font-normal text-slate-400">/mo</span>
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-1">Post-Rehab (+10% premium)</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-medium text-green-600">Updated condition premium</span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-slate-500 uppercase">Rent/Sq.Ft.</div>
          <div className="text-sm font-semibold text-slate-800 tabular-nums">${appraisalResult.rentPerSqft}</div>
        </div>
        <div className="bg-white/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-slate-500 uppercase">Annual Gross</div>
          <div className="text-sm font-semibold text-teal-600 tabular-nums">{formatCurrency(annualGross)}</div>
        </div>
        <div className="bg-white/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-slate-500 uppercase">Est. NOI (60%)</div>
          <div className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(estimatedNOI)}</div>
        </div>
      </div>

      {/* Methodology Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Weighted hybrid: Adjusted rents (50%) + $/sqft (50%)</span>
        </div>
        <span className="tabular-nums">${appraisalResult.rentPerSqft}/sqft avg</span>
      </div>

      {/* Apply Button */}
      <button
        onClick={onApplyRent}
        disabled={displayMarketRent === 0}
        className="w-full px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Apply Rent to Deal Analysis
      </button>
    </div>
  )
}

// Rent Adjustment Grid Component
const RentAdjustmentGrid = ({ 
  compAdjustments,
  isExpanded,
  onToggle 
}: { 
  compAdjustments: CompAdjustment[]
  isExpanded: boolean
  onToggle: () => void
}) => {
  if (compAdjustments.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-teal-500" />
          <span className="text-sm font-semibold text-slate-700">Rent Adjustment Breakdown</span>
          <span className="text-xs text-slate-400">({compAdjustments.length} comps)</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Comp Address</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Base Rent</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Size</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Bed</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Bath</th>
                  <th className="px-3 py-2 text-right font-semibold text-teal-600">Adjusted</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Weight</th>
                </tr>
              </thead>
              <tbody>
                {compAdjustments.map((ca, idx) => (
                  <tr key={ca.compId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-3 py-2 text-slate-700 truncate max-w-[150px]" title={ca.compAddress}>
                      {ca.compAddress}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      ${ca.basePrice}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${ca.sizeAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                      {ca.sizeAdjustment >= 0 ? '+' : ''}${ca.sizeAdjustment}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${ca.bedroomAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                      {ca.bedroomAdjustment >= 0 ? '+' : ''}${ca.bedroomAdjustment}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${ca.bathroomAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                      {ca.bathroomAdjustment >= 0 ? '+' : ''}${ca.bathroomAdjustment}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-teal-700">
                      ${ca.adjustedPrice}/mo
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
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

// Enhanced Rental Comp Card
const RentalCompCard = ({ 
  comp, 
  subject, 
  isSelected, 
  onToggle, 
  isExpanded, 
  onExpand,
  onRefreshComp,
  refreshing,
  freshnessBadge
}: { 
  comp: LocalRentalComp
  subject: LocalSubjectProperty
  isSelected: boolean
  onToggle: () => void
  isExpanded: boolean
  onExpand: () => void
  onRefreshComp: () => void
  refreshing: boolean
  freshnessBadge?: { label: string; color: string; bgColor: string } | null
}) => {
  // Calculate similarity and adjustments for this comp
  const subjectForCalc: SubjectProperty = {
    sqft: subject.sqft,
    beds: subject.beds,
    baths: subject.baths,
    yearBuilt: subject.yearBuilt,
    lotSize: subject.lotSize,
  }
  const compForCalc = toCompProperty(comp)
  const similarity = calculateSimilarityScore(subjectForCalc, compForCalc)
  const adjustments = calculateRentAdjustments(subjectForCalc, compForCalc)

  return (
    <div className={`relative rounded-xl border transition-all overflow-hidden ${
      isSelected 
        ? 'bg-white ring-2 ring-teal-500/20 border-teal-200' 
        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
    }`}>
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-300 hover:border-teal-500'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Refresh button for unselected comps */}
      {!isSelected && (
        <button
          onClick={onRefreshComp}
          disabled={refreshing}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-teal-500 hover:border-teal-300 transition-colors disabled:opacity-50"
          title="Replace this comp with a new one"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      )}

      <div className="flex">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100">
          {comp.image ? (
            <img 
              src={comp.image} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-200">
              <Home className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] font-semibold text-teal-600 tabular-nums">{comp.distance?.toFixed(2)} mi</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 pl-4">
              <h4 className="text-sm font-semibold text-slate-800 truncate">{comp.address}</h4>
              <p className="text-xs text-slate-400 truncate">{comp.city}, {comp.state}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-teal-600 tabular-nums">
                {formatCurrency(comp.monthlyRent)}
                <span className="text-xs font-normal text-slate-400">/mo</span>
              </p>
              <p className="text-[10px] text-slate-400 tabular-nums">${comp.rentPerSqft?.toFixed(2)}/sf</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 pl-4">
            <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{comp.beds}</span>
            <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{comp.baths}</span>
            <span className="flex items-center gap-0.5 tabular-nums"><Square className="w-3 h-3" />{comp.sqft?.toLocaleString()}</span>
            <span className="flex items-center gap-0.5 tabular-nums"><Calendar className="w-3 h-3" />{comp.yearBuilt || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Listed {formatDate(comp.listingDate)}</span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-500">{getListingAge(comp.listingDate)}</span>
              {freshnessBadge && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: freshnessBadge.bgColor, color: freshnessBadge.color }}
                >
                  {freshnessBadge.label}
                </span>
              )}
            </div>
            <button onClick={onExpand} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-0.5">
              Details <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Match Score */}
        <div className="w-16 flex flex-col items-center justify-center bg-slate-50 border-l border-slate-100">
          <div className="text-xl font-bold tabular-nums" style={{ 
            color: similarity.overall >= 90 ? '#0EA5E9' : similarity.overall >= 75 ? '#0E7490' : '#F59E0B' 
          }}>
            {similarity.overall}
          </div>
          <span className="text-[10px] text-slate-400">% Match</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-3 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-2">Similarity</h5>
              <div className="space-y-1.5">
                <SimilarityBar label="Location" value={similarity.location} icon={MapPin} />
                <SimilarityBar label="Size" value={similarity.size} icon={Square} />
                <SimilarityBar label="Bed/Bath" value={similarity.bedBath} icon={Bed} />
                <SimilarityBar label="Age" value={similarity.age} icon={Calendar} />
              </div>
            </div>
            <div>
              <h5 className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Rent Adjustments</h5>
              <div className="space-y-1">
                {[
                  { label: 'Size', value: adjustments.size },
                  { label: 'Bedroom', value: adjustments.bedroom },
                  { label: 'Bathroom', value: adjustments.bathroom },
                ].map((adj) => (
                  <div key={adj.label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{adj.label}</span>
                    <span className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                      {adj.value >= 0 ? '+' : ''}{formatCurrency(adj.value)}/mo
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Adjusted</span>
                  <span className="font-bold text-teal-600 tabular-nums">{formatCurrency(comp.monthlyRent + adjustments.total)}/mo</span>
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
export function RentalCompsSection() {
  const { propertyData, assumptions, updateAssumption } = useWorksheetStore()
  
  const [comps, setComps] = useState<LocalRentalComp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCompIds, setSelectedCompIds] = useState<Set<string | number>>(new Set())
  const [expandedComp, setExpandedComp] = useState<number | string | null>(null)
  const [recencyFilter, setRecencyFilter] = useState<'all' | '30' | '90'>('all')
  const [refreshingCompId, setRefreshingCompId] = useState<string | number | null>(null)
  const [showAdjustmentGrid, setShowAdjustmentGrid] = useState(false)
  const [fetchOffset, setFetchOffset] = useState(0)
  
  // Override state
  const [isMarketRentOverridden, setIsMarketRentOverridden] = useState(false)
  const [isImprovedRentOverridden, setIsImprovedRentOverridden] = useState(false)
  const [manualMarketRent, setManualMarketRent] = useState(0)
  const [manualImprovedRent, setManualImprovedRent] = useState(0)

  // Build subject property from worksheet data
  const snapshot = propertyData?.property_data_snapshot
  const subject: LocalSubjectProperty = useMemo(() => ({
    address: snapshot?.street || snapshot?.streetAddress || snapshot?.address || propertyData?.address_street || '',
    city: snapshot?.city || propertyData?.address_city || '',
    state: snapshot?.state || propertyData?.address_state || '',
    zip: snapshot?.zipCode || snapshot?.zipcode || propertyData?.address_zip || '',
    price: assumptions.purchasePrice || snapshot?.listPrice || 0,
    beds: snapshot?.bedrooms || 0,
    baths: snapshot?.bathrooms || 0,
    sqft: snapshot?.sqft || snapshot?.livingArea || 0,
    lotSize: snapshot?.lotSize || 0,
    yearBuilt: snapshot?.yearBuilt || 0,
    latitude: snapshot?.latitude || 0,
    longitude: snapshot?.longitude || 0,
  }), [snapshot, propertyData, assumptions.purchasePrice])

  const zpid = propertyData?.zpid?.toString() || snapshot?.zpid?.toString() || ''

  // Calculate rent appraisal values from selected comps
  const appraisalResult = useMemo(() => {
    const selectedComps = comps
      .filter(c => selectedCompIds.has(c.id))
      .map(toCompProperty)
    
    const subjectForCalc: SubjectProperty = {
      sqft: subject.sqft,
      beds: subject.beds,
      baths: subject.baths,
      yearBuilt: subject.yearBuilt,
      lotSize: subject.lotSize,
    }
    
    return calculateRentAppraisalValues(subjectForCalc, selectedComps)
  }, [selectedCompIds, comps, subject])

  // Fetch comps
  const fetchComps = useCallback(async (offset = 0, excludeZpids: string[] = []) => {
    if (!subject.address && !zpid) {
      setError('No property address or ID available')
      return []
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const params: FetchParams = { limit: 10, offset }
      if (zpid) {
        params.zpid = zpid
      } else {
        params.address = `${subject.address}, ${subject.city}, ${subject.state} ${subject.zip}`.trim()
      }
      if (excludeZpids.length > 0) {
        params.exclude_zpids = excludeZpids.join(',')
      }
      
      const response = await fetchRentalComps(params)
      const transformed = transformRentalResponse(response, subject)
      return transformed
    } catch (err) {
      console.error('[RentalComps] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch rental comps')
      return []
    } finally {
      setLoading(false)
    }
  }, [subject, zpid])

  // Initial fetch
  useEffect(() => {
    const doFetch = async () => {
      const fetched = await fetchComps()
      setComps(fetched)
      if (fetched.length > 0) {
        setSelectedCompIds(new Set(fetched.slice(0, 3).map(c => c.id)))
      }
    }
    if (subject.address) {
      doFetch()
    }
  }, []) // Only fetch on mount

  // When comps have zpid but no image, fetch photos from /api/v1/photos and set first photo as image
  const compsNeedingPhotos = comps.filter((c) => c.zpid && !(c.image && c.image.startsWith('http')))
  useEffect(() => {
    if (compsNeedingPhotos.length === 0) return

    let cancelled = false
    const photoByZpid: Record<string, string> = {}

    Promise.allSettled(
      compsNeedingPhotos.map(async (c) => {
        const res = await fetch(`${window.location.origin}/api/v1/photos?zpid=${encodeURIComponent(c.zpid!)}`, {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const url = data?.photos?.[0]?.url
        if (url) photoByZpid[c.zpid!] = url
      })
    ).then(() => {
      if (cancelled || Object.keys(photoByZpid).length === 0) return
      setComps((prev) =>
        prev.map((c) => {
          const url = c.zpid ? photoByZpid[c.zpid] : null
          return url ? { ...c, image: url } : c
        })
      )
    })

    return () => {
      cancelled = true
    }
  }, [comps.length, compsNeedingPhotos.length])

  // Refresh all comps
  const handleRefreshAll = async () => {
    const fetched = await fetchComps()
    setComps(fetched)
    setFetchOffset(0)
    if (fetched.length > 0) {
      setSelectedCompIds(new Set(fetched.slice(0, 3).map(c => c.id)))
    }
  }

  // Refresh only unselected comps
  const handleRefreshUnselected = async () => {
    setLoading(true)
    try {
      const selectedZpids = comps
        .filter(c => selectedCompIds.has(c.id))
        .map(c => c.zpid || String(c.id))
        .filter(Boolean)
      
      const unselectedCount = comps.filter(c => !selectedCompIds.has(c.id)).length
      const newOffset = fetchOffset + unselectedCount
      
      const newComps = await fetchComps(newOffset, selectedZpids)
      
      const selectedComps = comps.filter(c => selectedCompIds.has(c.id))
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
        .filter(c => c.id !== compId)
        .map(c => c.zpid || String(c.id))
        .filter(Boolean)
      
      const newComps = await fetchComps(fetchOffset, excludeZpids)
      
      if (newComps.length > 0) {
        setComps(prev => prev.map(c => c.id === compId ? newComps[0] : c))
        setFetchOffset(prev => prev + 1)
      }
    } finally {
      setRefreshingCompId(null)
    }
  }

  const toggleComp = (id: number | string) => {
    setSelectedCompIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Apply rent to worksheet
  const handleApplyRent = () => {
    const rent = isMarketRentOverridden ? manualMarketRent : appraisalResult.marketRent
    if (rent > 0) {
      updateAssumption('monthlyRent', rent)
    }
  }

  // Override handlers
  const handleToggleMarketRentOverride = () => {
    if (isMarketRentOverridden) {
      setIsMarketRentOverridden(false)
      setManualMarketRent(0)
    } else {
      setIsMarketRentOverridden(true)
      setManualMarketRent(appraisalResult.marketRent)
    }
  }

  const handleToggleImprovedRentOverride = () => {
    if (isImprovedRentOverridden) {
      setIsImprovedRentOverridden(false)
      setManualImprovedRent(0)
    } else {
      setIsImprovedRentOverridden(true)
      setManualImprovedRent(appraisalResult.improvedRent)
    }
  }

  // Filter comps by recency
  const filteredComps = useMemo(() => {
    return comps.filter(c => {
      const daysAgo = getListingDaysAgo(c.listingDate)
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
          <h2 className="text-lg font-bold text-slate-800">Rental Appraisal Toolkit</h2>
          <p className="text-sm text-slate-500">Comparable rentals for {subject.address}</p>
          <p className="text-xs text-slate-400 mt-1">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshUnselected}
            disabled={loading || selectedCompIds.size === 0}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
            title="Get new comps for unselected items"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Unselected
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        </div>
      </div>

      {/* Dual Rent Valuation Panel */}
      <DualRentValuationPanel
        appraisalResult={appraisalResult}
        isMarketRentOverridden={isMarketRentOverridden}
        isImprovedRentOverridden={isImprovedRentOverridden}
        manualMarketRent={manualMarketRent}
        manualImprovedRent={manualImprovedRent}
        onMarketRentChange={setManualMarketRent}
        onImprovedRentChange={setManualImprovedRent}
        onToggleMarketRentOverride={handleToggleMarketRentOverride}
        onToggleImprovedRentOverride={handleToggleImprovedRentOverride}
        onApplyRent={handleApplyRent}
        loading={loading}
        selectedCount={selectedCompIds.size}
        purchasePrice={subject.price}
      />

      {/* Adjustment Grid */}
      <RentAdjustmentGrid
        compAdjustments={appraisalResult.compAdjustments}
        isExpanded={showAdjustmentGrid}
        onToggle={() => setShowAdjustmentGrid(!showAdjustmentGrid)}
      />

      {/* Recency Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Filter by:</span>
        <div className="flex rounded-lg bg-slate-100 p-0.5">
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
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {selectedCompIds.size} of {filteredComps.length} rentals selected
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCompIds(new Set(filteredComps.map(c => c.id)))}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedCompIds(new Set())}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && comps.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <RentalCardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <AlertCircle className="mx-auto mb-2 text-red-500 w-8 h-8" />
          <h3 className="text-sm font-semibold text-red-800 mb-1">Failed to Load Rental Comps</h3>
          <p className="text-xs text-red-600 mb-3">{error}</p>
          <button onClick={handleRefreshAll} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg">
            Try Again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && comps.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <Home className="mx-auto mb-2 text-slate-400 w-8 h-8" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No Rental Comps Found</h3>
          <p className="text-xs text-slate-500">Try refreshing or check the property address</p>
        </div>
      )}

      {/* Rental Comps List */}
      {!loading && !error && comps.length > 0 && (
        <div className="space-y-3">
          {filteredComps.map(comp => {
            const freshnessBadge = getFreshnessBadge(comp.listingDate)
            return (
              <RentalCompCard
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
      {!loading && !error && comps.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {comps.filter(c => c.distance <= 0.5).length} of {comps.length} comps within 0.5 mi
            </span>
            <span className={`text-xs font-semibold ${
              comps.filter(c => c.distance <= 0.5).length >= 3 
                ? 'text-teal-600' 
                : comps.filter(c => c.distance <= 1).length >= 3 
                  ? 'text-amber-500' 
                  : 'text-slate-500'
            }`}>
              Location Quality: {
                comps.filter(c => c.distance <= 0.5).length >= 3 
                  ? 'EXCELLENT' 
                  : comps.filter(c => c.distance <= 1).length >= 3 
                    ? 'GOOD' 
                    : 'FAIR'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
