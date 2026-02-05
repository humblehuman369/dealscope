'use client'

/**
 * PriceCheckerIQ Screen
 * 
 * Unified comps page with Sale/Rent sub-tabs.
 * Features:
 * - Live API fetch with pagination and exclusion
 * - Dual valuation panel (Market Value + ARV, or Market Rent + Improved Rent)
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
  Target, DollarSign, RefreshCw, AlertCircle, Building2, Home,
  Pencil, TrendingUp, RotateCcw, Info
} from 'lucide-react'
import {
  calculateAppraisalValues,
  calculateRentAppraisalValues,
  calculateSimilarityScore,
  calculateSaleAdjustments,
  calculateRentAdjustments,
  formatCurrency,
  formatCompactCurrency,
  type SubjectProperty,
  type CompProperty,
  type AppraisalResult,
  type RentAppraisalResult,
  type CompAdjustment,
} from '@/utils/appraisalCalculations'

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
}

interface PriceCheckerIQScreenProps {
  property: PriceCheckerProperty
  initialView?: 'sale' | 'rent'
}

interface LocalComp {
  id: number | string
  zpid?: string
  address: string
  city: string
  state: string
  zip: string
  price: number          // sale price or monthly rent
  pricePerSqft: number   // $/sqft (sale) or $/sqft/mo (rent)
  beds: number
  baths: number
  sqft: number
  lotSize: number
  yearBuilt: number
  date: string           // sale date or listing date
  distance: number
  image: string
  latitude: number
  longitude: number
}

interface FetchParams {
  zpid?: string
  address?: string
  limit?: number
  offset?: number
  exclude_zpids?: string
}

// ============================================
// API SERVICES
// ============================================
async function fetchSimilarSold(params: FetchParams) {
  const url = new URL('/api/v1/axesso/similar-sold', window.location.origin)
  if (params.zpid) url.searchParams.append('zpid', params.zpid)
  if (params.address) url.searchParams.append('address', params.address)
  if (params.limit) url.searchParams.append('limit', params.limit.toString())
  if (params.offset) url.searchParams.append('offset', params.offset.toString())
  if (params.exclude_zpids) url.searchParams.append('exclude_zpids', params.exclude_zpids)
  const response = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `API Error ${response.status}`)
  return data
}

async function fetchSimilarRent(params: FetchParams) {
  const url = new URL('/api/v1/axesso/similar-rent', window.location.origin)
  if (params.zpid) url.searchParams.append('zpid', params.zpid)
  if (params.address) url.searchParams.append('address', params.address)
  if (params.limit) url.searchParams.append('limit', params.limit.toString())
  if (params.offset) url.searchParams.append('offset', params.offset.toString())
  if (params.exclude_zpids) url.searchParams.append('exclude_zpids', params.exclude_zpids)
  const response = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `API Error ${response.status}`)
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
  if (daysAgo <= 30) return { label: 'Recent', color: '#10B981', bgColor: '#10B98115' }
  if (daysAgo > 90) return { label: isSale ? 'Older sale' : 'Older listing', color: '#F59E0B', bgColor: '#F59E0B15' }
  return null
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3959
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ============================================
// DATA TRANSFORMATION
// ============================================
function transformSoldResponse(apiData: Record<string, unknown>, subjectLat: number, subjectLon: number): LocalComp[] {
  const rawResults = (apiData.results || apiData.data || []) as Record<string, unknown>[]
  return rawResults.map((item, index) => {
    const comp = (item.property || item) as Record<string, unknown>
    const addr = (comp.address || {}) as Record<string, unknown>
    let imageUrl = ''
    const photos = comp.compsCarouselPropertyPhotos as Record<string, unknown>[] | undefined
    if (photos?.length) {
      const ms = (photos[0].mixedSources || {}) as Record<string, unknown[]>
      if (ms.jpeg?.length) imageUrl = ((ms.jpeg[0] as Record<string, string>).url) || ''
    }
    const salePrice = parseFloat(String(comp.lastSoldPrice || comp.price || 0))
    const sqft = parseInt(String(comp.livingAreaValue || 0))
    let lotSize = parseFloat(String(comp.lotAreaValue || 0))
    if (comp.lotAreaUnits === 'Square Feet' || comp.lotAreaUnits === 'sqft') lotSize /= 43560
    let saleDateStr = ''
    if (comp.dateSold) saleDateStr = new Date(comp.dateSold as string).toISOString().split('T')[0]
    const lat = parseFloat(String(comp.latitude || 0))
    const lon = parseFloat(String(comp.longitude || 0))
    const distance = (subjectLat && subjectLon && lat && lon) ? haversineDistance(subjectLat, subjectLon, lat, lon) : 1
    return {
      id: (comp.zpid as string) || index + 1,
      zpid: comp.zpid as string,
      address: (addr.streetAddress as string) || '',
      city: (addr.city as string) || '',
      state: (addr.state as string) || '',
      zip: (addr.zipcode as string) || '',
      price: salePrice,
      pricePerSqft: sqft > 0 ? Math.round(salePrice / sqft) : 0,
      beds: parseInt(String(comp.bedrooms || 0)),
      baths: parseFloat(String(comp.bathrooms || 0)),
      sqft,
      lotSize: Math.round(lotSize * 100) / 100,
      yearBuilt: parseInt(String(comp.yearBuilt || 0)),
      date: saleDateStr,
      distance: Math.round(distance * 100) / 100,
      image: imageUrl,
      latitude: lat,
      longitude: lon,
    }
  })
}

function transformRentResponse(apiData: Record<string, unknown>, subjectLat: number, subjectLon: number): LocalComp[] {
  const rawResults = (apiData.rentalComps || apiData.results || apiData.data || apiData.rentals || []) as Record<string, unknown>[]
  return rawResults.map((item, index) => {
    const comp = (item.property || item) as Record<string, unknown>
    
    // Address can be an object or a string
    const addrRaw = comp.address
    const addr: Record<string, unknown> = (typeof addrRaw === 'object' && addrRaw !== null) ? addrRaw as Record<string, unknown> : {}
    const addrStr = typeof addrRaw === 'string' ? addrRaw : ''
    
    // Images -- try multiple formats
    let imageUrl = ''
    const photos = comp.compsCarouselPropertyPhotos as Record<string, unknown>[] | undefined
    if (photos?.length) {
      const ms = (photos[0].mixedSources || {}) as Record<string, unknown[]>
      if (ms.jpeg?.length) imageUrl = ((ms.jpeg[0] as Record<string, string>).url) || ''
    }
    // Fallback image sources
    // Fallback image sources
    const miniPhotos = comp.miniCardPhotos as Record<string, unknown>[] | undefined
    const miniPhotoUrl = miniPhotos?.[0]?.url as string | undefined
    if (!imageUrl) imageUrl = (comp.imgSrc as string) || (comp.imageUrl as string) || miniPhotoUrl || ''
    
    // Rent -- try many field names
    const units = comp.units as Record<string, unknown>[] | undefined
    const unitPrice = units?.[0]?.price
    const monthlyRent = parseFloat(String(
      comp.rent || comp.monthlyRent || comp.price || comp.listPrice || 
      comp.unformattedPrice || unitPrice || 0
    )) || 0
    
    // Sqft
    const sqft = parseInt(String(comp.livingAreaValue || comp.livingArea || comp.sqft || comp.area || 0)) || 0
    
    // Coordinates
    const latObj = comp.latLong as Record<string, number> | undefined
    const lat = parseFloat(String(comp.latitude || latObj?.latitude || 0)) || 0
    const lon = parseFloat(String(comp.longitude || latObj?.longitude || 0)) || 0
    const distance = (subjectLat && subjectLon && lat && lon) ? haversineDistance(subjectLat, subjectLon, lat, lon) : 1
    
    // Build address fields from object or string
    const streetAddress = (addr.streetAddress as string) || (comp.streetAddress as string) || addrStr || ''
    const city = (addr.city as string) || (comp.city as string) || ''
    const state = (addr.state as string) || (comp.state as string) || ''
    const zip = (addr.zipcode as string) || (comp.zipcode as string) || (comp.zip as string) || ''
    
    return {
      id: (comp.zpid as string) || (comp.id as string) || `rent-${index + 1}`,
      zpid: (comp.zpid as string) || undefined,
      address: streetAddress,
      city,
      state,
      zip,
      price: monthlyRent,
      pricePerSqft: sqft > 0 ? Math.round((monthlyRent / sqft) * 100) / 100 : 0,
      beds: parseInt(String(comp.bedrooms || comp.beds || 0)) || 0,
      baths: parseFloat(String(comp.bathrooms || comp.baths || 0)) || 0,
      sqft,
      lotSize: 0,
      yearBuilt: parseInt(String(comp.yearBuilt || 0)) || 0,
      date: (comp.listingDate as string) || (comp.seenDate as string) || (comp.datePosted as string) || (comp.dateSeen as string) || '',
      distance: Math.round(distance * 100) / 100,
      image: imageUrl,
      latitude: lat,
      longitude: lon,
    }
  })
}

const toCompProperty = (c: LocalComp): CompProperty => ({
  id: c.id, zpid: c.zpid, address: c.address, price: c.price, sqft: c.sqft,
  beds: c.beds, baths: c.baths, yearBuilt: c.yearBuilt, lotSize: c.lotSize,
  distance: c.distance, pricePerSqft: c.pricePerSqft,
})

// ============================================
// SUB-COMPONENTS
// ============================================
const CompCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
    <div className="flex gap-4">
      <div className="w-[100px] h-[80px] bg-slate-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
    </div>
  </div>
)

const SimilarityBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => {
  // Guard against NaN or invalid values
  const safeValue = isNaN(value) || !isFinite(value) ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
      <span className="text-xs text-slate-500 w-14">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${safeValue}%`, backgroundColor: safeValue >= 90 ? '#0891B2' : safeValue >= 75 ? '#0E7490' : '#F59E0B' }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right tabular-nums">{safeValue}%</span>
    </div>
  )
}

// Comp Card -- key metrics always visible, match score in expandable details
function CompCard({ comp, subject, isSale, isSelected, onToggle, isExpanded, onExpand, onRefreshComp, refreshing }: {
  comp: LocalComp; subject: SubjectProperty; isSale: boolean; isSelected: boolean
  onToggle: () => void; isExpanded: boolean; onExpand: () => void
  onRefreshComp: () => void; refreshing: boolean
}) {
  const compForCalc = toCompProperty(comp)
  const similarity = calculateSimilarityScore(subject, compForCalc)
  const saleAdj = isSale ? calculateSaleAdjustments(subject, compForCalc) : null
  const rentAdj = !isSale ? calculateRentAdjustments(subject, compForCalc) : null
  const freshness = getFreshnessBadge(comp.date, isSale)

  return (
    <div className={`relative rounded-xl border transition-all overflow-hidden ${
      isSelected ? 'bg-white ring-2 ring-teal-500/20 border-teal-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
    }`}>
      {/* Selection checkbox */}
      <button onClick={onToggle}
        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-300 hover:border-teal-500'
        }`}>
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Refresh button on unselected */}
      {!isSelected && (
        <button onClick={onRefreshComp} disabled={refreshing}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-teal-500 hover:border-teal-300 transition-colors disabled:opacity-50"
          title="Replace this comp">
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      )}

      <div className="flex">
        {/* Image + distance badge */}
        <div className="relative w-[100px] h-[80px] flex-shrink-0 bg-slate-100 rounded-l-xl overflow-hidden">
          {comp.image ? (
            <img src={comp.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-200">
              {isSale ? <Building2 className="w-5 h-5 text-slate-400" /> : <Home className="w-5 h-5 text-slate-400" />}
            </div>
          )}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] font-semibold text-teal-600 tabular-nums">{comp.distance.toFixed(2)} mi</span>
          </div>
        </div>

        {/* Details -- always visible: address, price, $/sqft, date, beds/baths/sqft */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 pl-4">
              <h4 className="text-sm font-semibold text-slate-800 truncate">{comp.address}</h4>
              <p className="text-xs text-slate-400 truncate">{comp.city}, {comp.state}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-slate-800 tabular-nums">
                {formatCurrency(comp.price)}
                {!isSale && <span className="text-xs font-normal text-slate-400">/mo</span>}
              </p>
              <p className="text-[11px] font-semibold text-teal-600 tabular-nums">
                ${comp.pricePerSqft}{isSale ? '' : '.00'}/sf{!isSale && '/mo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 pl-4">
            <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{comp.beds}</span>
            <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{comp.baths}</span>
            <span className="flex items-center gap-0.5 tabular-nums"><Square className="w-3 h-3" />{comp.sqft?.toLocaleString()}</span>
            {comp.yearBuilt > 0 && <span className="flex items-center gap-0.5 tabular-nums"><Calendar className="w-3 h-3" />{comp.yearBuilt}</span>}
          </div>

          <div className="flex items-center gap-1.5 pl-4">
            <span className="text-[10px] text-slate-400">{isSale ? 'Sold' : 'Listed'} {formatDate(comp.date)}</span>
            <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-500">{getDaysAgo(comp.date)}</span>
            {freshness && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: freshness.bgColor, color: freshness.color }}>
                {freshness.label}
              </span>
            )}
            <button onClick={onExpand} className="ml-auto text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-0.5">
              Details <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details: match score, similarity, adjustments */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-3 bg-slate-50/50">
          {/* Match Score header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Match Score:</span>
            <span className="text-lg font-bold tabular-nums" style={{
              color: similarity.overall >= 90 ? '#0891B2' : similarity.overall >= 75 ? '#0E7490' : '#F59E0B'
            }}>{similarity.overall}%</span>
          </div>
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
              <h5 className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Adjustments</h5>
              <div className="space-y-1">
                {isSale && saleAdj && [
                  { label: 'Size', value: saleAdj.size },
                  { label: 'Bedroom', value: saleAdj.bedroom },
                  { label: 'Bathroom', value: saleAdj.bathroom },
                  { label: 'Age', value: saleAdj.age },
                  { label: 'Lot', value: saleAdj.lot },
                ].map(adj => (
                  <div key={adj.label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{adj.label}</span>
                    <span className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
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
                    <span className="text-slate-500">{adj.label}</span>
                    <span className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                      {adj.value >= 0 ? '+' : ''}{formatCurrency(Math.round(adj.value))}/mo
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Adjusted</span>
                  <span className="font-bold text-teal-600 tabular-nums">
                    {formatCurrency(comp.price + Math.round(isSale ? (saleAdj?.total || 0) : (rentAdj?.total || 0)))}
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-teal-500" />
          <span className="text-sm font-semibold text-slate-700">Adjustment Breakdown</span>
          <span className="text-xs text-slate-400">({compAdjustments.length} comps)</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isExpanded && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Address</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">{isSale ? 'Base' : 'Rent'}</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Size</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Bed</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Bath</th>
                {isSale && <th className="px-3 py-2 text-right font-semibold text-slate-600">Age</th>}
                {isSale && <th className="px-3 py-2 text-right font-semibold text-slate-600">Lot</th>}
                <th className="px-3 py-2 text-right font-semibold text-teal-600">Adjusted</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Weight</th>
              </tr>
            </thead>
            <tbody>
              {compAdjustments.map((ca, idx) => (
                <tr key={ca.compId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 text-slate-700 truncate max-w-[140px]" title={ca.compAddress}>{ca.compAddress}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{isSale ? formatCompactCurrency(ca.basePrice) : `$${ca.basePrice}`}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ca.sizeAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {ca.sizeAdjustment >= 0 ? '+' : ''}{isSale ? formatCompactCurrency(ca.sizeAdjustment) : `$${ca.sizeAdjustment}`}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ca.bedroomAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {ca.bedroomAdjustment >= 0 ? '+' : ''}{isSale ? formatCompactCurrency(ca.bedroomAdjustment) : `$${ca.bedroomAdjustment}`}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ca.bathroomAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {ca.bathroomAdjustment >= 0 ? '+' : ''}{isSale ? formatCompactCurrency(ca.bathroomAdjustment) : `$${ca.bathroomAdjustment}`}
                  </td>
                  {isSale && <td className={`px-3 py-2 text-right tabular-nums ${ca.ageAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {ca.ageAdjustment >= 0 ? '+' : ''}{formatCompactCurrency(ca.ageAdjustment)}
                  </td>}
                  {isSale && <td className={`px-3 py-2 text-right tabular-nums ${ca.lotAdjustment >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {ca.lotAdjustment >= 0 ? '+' : ''}{formatCompactCurrency(ca.lotAdjustment)}
                  </td>}
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-teal-700">
                    {isSale ? formatCompactCurrency(ca.adjustedPrice) : `$${ca.adjustedPrice}/mo`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{(ca.weight * 100).toFixed(1)}%</td>
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

  // View state
  const [activeView, setActiveView] = useState<'sale' | 'rent'>(initialView)
  const isSale = activeView === 'sale'

  // Sale comps state
  const [saleComps, setSaleComps] = useState<LocalComp[]>([])
  const [saleSelected, setSaleSelected] = useState<Set<string | number>>(new Set())
  const [saleLoading, setSaleLoading] = useState(false)
  const [saleError, setSaleError] = useState<string | null>(null)
  const [saleOffset, setSaleOffset] = useState(0)
  const [saleOverrideMarket, setSaleOverrideMarket] = useState<number | null>(null)
  const [saleOverrideArv, setSaleOverrideArv] = useState<number | null>(null)

  // Rent comps state
  const [rentComps, setRentComps] = useState<LocalComp[]>([])
  const [rentSelected, setRentSelected] = useState<Set<string | number>>(new Set())
  const [rentLoading, setRentLoading] = useState(false)
  const [rentError, setRentError] = useState<string | null>(null)
  const [rentOffset, setRentOffset] = useState(0)
  const [rentOverrideMarket, setRentOverrideMarket] = useState<number | null>(null)
  const [rentOverrideImproved, setRentOverrideImproved] = useState<number | null>(null)

  // Original comps snapshot -- stored on initial fetch so user can reset
  const [originalSaleComps, setOriginalSaleComps] = useState<LocalComp[]>([])
  const [originalSaleSelected, setOriginalSaleSelected] = useState<Set<string | number>>(new Set())
  const [originalRentComps, setOriginalRentComps] = useState<LocalComp[]>([])
  const [originalRentSelected, setOriginalRentSelected] = useState<Set<string | number>>(new Set())

  // Shared state
  const [expandedComp, setExpandedComp] = useState<string | number | null>(null)
  const [recencyFilter, setRecencyFilter] = useState<'all' | '30' | '90'>('all')
  const [refreshingCompId, setRefreshingCompId] = useState<string | number | null>(null)
  const [showAdjGrid, setShowAdjGrid] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Active state shortcuts
  const comps = isSale ? saleComps : rentComps
  const selectedIds = isSale ? saleSelected : rentSelected
  const loading = isSale ? saleLoading : rentLoading
  const error = isSale ? saleError : rentError

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

  // Fetch helpers
  const buildParams = useCallback((offset = 0, excludeZpids: string[] = []): FetchParams => {
    const params: FetchParams = { limit: 10, offset }
    if (property.zpid) params.zpid = property.zpid
    else params.address = fullAddress
    if (excludeZpids.length > 0) params.exclude_zpids = excludeZpids.join(',')
    return params
  }, [property.zpid, fullAddress])

  const fetchSaleComps = useCallback(async (offset = 0, excludeZpids: string[] = []) => {
    setSaleLoading(true); setSaleError(null)
    try {
      const data = await fetchSimilarSold(buildParams(offset, excludeZpids))
      return transformSoldResponse(data, 0, 0) // lat/lon resolved by API
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Failed to fetch sale comps')
      return []
    } finally { setSaleLoading(false) }
  }, [buildParams])

  const fetchRentComps = useCallback(async (offset = 0, excludeZpids: string[] = []) => {
    setRentLoading(true); setRentError(null)
    try {
      const params = buildParams(offset, excludeZpids)
      const data = await fetchSimilarRent(params)
      const transformed = transformRentResponse(data, 0, 0)
      return transformed
    } catch (err) {
      setRentError(err instanceof Error ? err.message : 'Failed to fetch rental comps')
      return []
    } finally { setRentLoading(false) }
  }, [buildParams])

  // Initial fetch on mount -- store originals for reset
  useEffect(() => {
    if (!property.address) return
    const init = async () => {
      const [sold, rented] = await Promise.all([fetchSaleComps(), fetchRentComps()])
      setSaleComps(sold)
      setRentComps(rented)
      // Store originals for reset
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      const newComps = isSale ? await fetchSaleComps(currentOffset, excludeZpids) : await fetchRentComps(currentOffset, excludeZpids)
      if (newComps.length > 0) {
        if (isSale) {
          setSaleComps(prev => prev.map(c => c.id === compId ? newComps[0] : c))
          setSaleOffset(prev => prev + 1)
        } else {
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

  // Filtered comps
  const filteredComps = useMemo(() => comps.filter(c => {
    const daysAgo = getDaysAgoNum(c.date)
    if (recencyFilter === '30') return daysAgo <= 30
    if (recencyFilter === '90') return daysAgo <= 90
    return true
  }), [comps, recencyFilter])

  // Current appraisal result
  const appraisal = isSale ? saleAppraisal : null
  const rentResult = !isSale ? rentAppraisal : null

  // Display values with override
  const displayMarketValue = saleOverrideMarket ?? saleAppraisal.marketValue
  const displayArv = saleOverrideArv ?? saleAppraisal.arv
  const displayMarketRent = rentOverrideMarket ?? rentAppraisal.marketRent
  const displayImprovedRent = rentOverrideImproved ?? rentAppraisal.improvedRent

  return (
    <div className="min-h-screen bg-[#F1F5F9] max-w-[480px] mx-auto font-['Inter',sans-serif]">
      <main className="pb-6">
        {/* Page Header */}
        <div className="bg-white border-b border-[#E2E8F0] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-[#0A1628]">PriceChecker<span className="text-[#0891B2]">IQ</span></h1>
              <p className="text-xs text-[#64748B]">Comparable analysis for {property.address || 'property'}</p>
            </div>
            <div className="flex gap-1.5">
              {hasChangedFromOriginal && (
                <button onClick={handleResetToOriginal} disabled={loading}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1"
                  title="Restore original system-selected comps">
                  <RotateCcw className="w-3 h-3" />Reset
                </button>
              )}
              <button onClick={handleRefreshUnselected} disabled={loading || selectedIds.size === 0 || selectedIds.size === comps.length}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1"
                title="Replace unselected comps with new ones">
                <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />New
              </button>
              <button onClick={handleRefreshAll} disabled={loading}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1"
                title="Fetch all new comps from API">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />All
              </button>
            </div>
          </div>

          {/* Sub-tabs: Sale Comps | Rent Comps */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button onClick={() => { setActiveView('sale'); setShowAdjGrid(false); setExpandedComp(null) }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                isSale ? 'bg-white text-[#0A1628] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              Sale Comps
            </button>
            <button onClick={() => { setActiveView('rent'); setShowAdjGrid(false); setExpandedComp(null) }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                !isSale ? 'bg-white text-[#0A1628] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              Rent Comps
            </button>
          </div>
        </div>

        {/* Dual Valuation Panel */}
        <div className="mx-4 mt-4">
          <div className="bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-teal-500/10 rounded-xl p-4 border border-teal-200/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Target className="w-4.5 h-4.5 text-teal-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{isSale ? 'Appraisal Values' : 'Rental Appraisal'}</h3>
                  <p className="text-xs text-slate-500">From {selectedIds.size} selected comps</p>
                </div>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-white/60">
                <div className="text-base font-bold tabular-nums" style={{
                  color: (isSale ? saleAppraisal.confidence : rentAppraisal.confidence) >= 85 ? '#0891B2'
                    : (isSale ? saleAppraisal.confidence : rentAppraisal.confidence) >= 70 ? '#F59E0B' : '#EF4444'
                }}>
                  {loading ? '...' : `${isSale ? saleAppraisal.confidence : rentAppraisal.confidence}%`}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">Confidence</div>
              </div>
            </div>

            {/* Dual values */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Left: Market Value / Market Rent */}
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                    {isSale ? 'Est. Market Value' : 'Est. Market Rent'}
                  </span>
                  <button onClick={() => {
                    if (isSale) setSaleOverrideMarket(saleOverrideMarket !== null ? null : saleAppraisal.marketValue)
                    else setRentOverrideMarket(rentOverrideMarket !== null ? null : rentAppraisal.marketRent)
                  }} className={`p-0.5 rounded ${(isSale ? saleOverrideMarket : rentOverrideMarket) !== null ? 'text-amber-500' : 'text-slate-400'}`}>
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {(isSale ? saleOverrideMarket : rentOverrideMarket) !== null ? (
                  <input type="text" value={formatCurrency(isSale ? saleOverrideMarket! : rentOverrideMarket!)}
                    onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, '')); if (!isNaN(v)) isSale ? setSaleOverrideMarket(v) : setRentOverrideMarket(v) }}
                    className="text-lg font-bold text-slate-800 tabular-nums bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-full" />
                ) : (
                  <div className="text-lg font-bold text-slate-800 tabular-nums">
                    {loading ? '...' : formatCurrency(isSale ? displayMarketValue : displayMarketRent)}
                    {!isSale && <span className="text-xs font-normal text-slate-400">/mo</span>}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-0.5">As-Is Condition</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Range: {isSale 
                    ? `${formatCompactCurrency(saleAppraisal.rangeLow)} — ${formatCompactCurrency(saleAppraisal.rangeHigh)}`
                    : `$${rentAppraisal.rangeLow} — $${rentAppraisal.rangeHigh}`
                  }
                </div>
              </div>

              {/* Right: ARV / Improved Rent */}
              <div className="bg-white rounded-lg p-3 border border-teal-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">
                    {isSale ? 'Est. After Repair' : 'Improved Rent'}
                  </span>
                  <button onClick={() => {
                    if (isSale) setSaleOverrideArv(saleOverrideArv !== null ? null : saleAppraisal.arv)
                    else setRentOverrideImproved(rentOverrideImproved !== null ? null : rentAppraisal.improvedRent)
                  }} className={`p-0.5 rounded ${(isSale ? saleOverrideArv : rentOverrideImproved) !== null ? 'text-amber-500' : 'text-slate-400'}`}>
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {(isSale ? saleOverrideArv : rentOverrideImproved) !== null ? (
                  <input type="text" value={formatCurrency(isSale ? saleOverrideArv! : rentOverrideImproved!)}
                    onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, '')); if (!isNaN(v)) isSale ? setSaleOverrideArv(v) : setRentOverrideImproved(v) }}
                    className="text-lg font-bold text-teal-700 tabular-nums bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-full" />
                ) : (
                  <div className="text-lg font-bold text-teal-700 tabular-nums">
                    {loading ? '...' : formatCurrency(isSale ? displayArv : displayImprovedRent)}
                    {!isSale && <span className="text-xs font-normal text-slate-400">/mo</span>}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-0.5">Post-Rehab</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-medium text-green-600">{isSale ? '+15% rehab premium' : '+10% condition premium'}</span>
                </div>
              </div>
            </div>

            {/* Methodology + $/sqft */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3 px-0.5">
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>Weighted hybrid methodology</span>
              </div>
              <span className="tabular-nums font-medium">
                ${isSale ? saleAppraisal.weightedAveragePpsf : rentAppraisal.rentPerSqft}/sqft avg
              </span>
            </div>

            <button onClick={handleApplyValues}
              disabled={(isSale ? displayMarketValue : displayMarketRent) === 0}
              className="w-full px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
              Apply to Deal Analysis
            </button>
          </div>
        </div>

        {/* Adjustment Grid */}
        <div className="mx-4 mt-3">
          <AdjustmentGrid
            compAdjustments={isSale ? saleAppraisal.compAdjustments : rentAppraisal.compAdjustments}
            isExpanded={showAdjGrid}
            onToggle={() => setShowAdjGrid(!showAdjGrid)}
            isSale={isSale}
          />
        </div>

        {/* Filters + Controls */}
        <div className="px-4 mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter:</span>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {([['all', 'All'], ['30', '30 days'], ['90', '90 days']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setRecencyFilter(val)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    recencyFilter === val ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{selectedIds.size} of {filteredComps.length} {isSale ? 'comps' : 'rentals'} selected</span>
            <div className="flex gap-2">
              <button onClick={() => (isSale ? setSaleSelected : setRentSelected)(new Set(filteredComps.map(c => c.id)))}
                className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Select All</button>
              <button onClick={() => (isSale ? setSaleSelected : setRentSelected)(new Set())}
                className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Clear</button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && comps.length === 0 && (
          <div className="px-4 mt-3 space-y-3">
            {[1, 2, 3].map(i => <CompCardSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-500 w-8 h-8" />
            <h3 className="text-sm font-semibold text-red-800 mb-1">Failed to Load {isSale ? 'Sale' : 'Rental'} Comps</h3>
            <p className="text-xs text-red-600 mb-3">{error}</p>
            <button onClick={handleRefreshAll} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg">Try Again</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && comps.length === 0 && (
          <div className="mx-4 mt-3 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            {isSale ? <Building2 className="mx-auto mb-2 text-slate-400 w-8 h-8" /> : <Home className="mx-auto mb-2 text-slate-400 w-8 h-8" />}
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No {isSale ? 'Sale' : 'Rental'} Comps Found</h3>
            <p className="text-xs text-slate-500">Try refreshing or check the property address</p>
          </div>
        )}

        {/* Comp Cards */}
        {!loading && !error && comps.length > 0 && (
          <div className="px-4 mt-3 space-y-3">
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
              />
            ))}
          </div>
        )}

        {/* Location Quality */}
        {!loading && !error && comps.length > 0 && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{comps.filter(c => c.distance <= 0.5).length} of {comps.length} within 0.5 mi</span>
              <span className={`text-xs font-semibold ${
                comps.filter(c => c.distance <= 0.5).length >= 3 ? 'text-teal-600' : comps.filter(c => c.distance <= 1).length >= 3 ? 'text-amber-500' : 'text-slate-500'
              }`}>
                Location: {comps.filter(c => c.distance <= 0.5).length >= 3 ? 'EXCELLENT' : comps.filter(c => c.distance <= 1).length >= 3 ? 'GOOD' : 'FAIR'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {saveMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg z-50">
          {saveMessage}
        </div>
      )}
    </div>
  )
}

export default PriceCheckerIQScreen
