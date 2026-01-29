'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { 
  MapPin, Bed, Bath, Square, Calendar, Check, ChevronDown, 
  Target, DollarSign, Zap, RefreshCw, AlertCircle, Building2,
  CheckCircle, HelpCircle, AlertTriangle, Ruler, Clock
} from 'lucide-react'

// ============================================
// API SERVICE - Uses Next.js proxy to avoid CORS
// ============================================
async function fetchSimilarSold(params: { zpid?: string; url?: string; address?: string }) {
  // Use Next.js API route to proxy requests to Axesso (avoids CORS)
  const url = new URL('/api/v1/axesso/similar-sold', window.location.origin)
  
  if (params.zpid) url.searchParams.append('zpid', params.zpid)
  if (params.url) url.searchParams.append('url', params.url)
  if (params.address) url.searchParams.append('address', params.address)

  console.log('[SalesComps] Fetching from proxy:', url.toString())

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('[SalesComps] API Error:', data)
    throw new Error(data.error || `API Error ${response.status}`)
  }

  console.log('[SalesComps] Success, results:', data.results?.length || 0)
  return data
}

// ============================================
// UTILITIES
// ============================================
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

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

// Get freshness badge based on sale date
const getFreshnessBadge = (dateString: string): { label: string; color: string; bgColor: string } | null => {
  const daysAgo = getSaleDaysAgo(dateString)
  if (daysAgo < 0) return null
  if (daysAgo <= 30) return { label: 'Recent', color: '#10B981', bgColor: '#10B98115' }
  if (daysAgo > 90) return { label: 'Older sale', color: '#F59E0B', bgColor: '#F59E0B15' }
  return null
}

// Haversine formula for distance
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
interface CompProperty {
  id: number | string
  address: string
  city: string
  state: string
  zip: string
  salePrice: number
  pricePerSqft: number
  beds: number
  baths: number
  sqft: number
  lotSize: number
  yearBuilt: number
  saleDate: string
  distance: number
  image: string
  latitude: number
  longitude: number
  similarity: {
    overall: number
    location: number
    size: number
    bedBath: number
    age: number
    lot: number
  }
  adjustments: {
    size: number
    age: number
    lot: number
    total: number
  }
}

interface SubjectProperty {
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
const calculateSimilarity = (subject: SubjectProperty, comp: CompProperty) => {
  const locationScore = Math.max(0, 100 - (comp.distance * 20))
  const sizeScore = subject.sqft > 0 ? Math.max(0, 100 - Math.abs(subject.sqft - comp.sqft) / subject.sqft * 100) : 85
  const bedBathScore = (subject.beds === comp.beds && subject.baths === comp.baths) ? 100 :
    (subject.beds === comp.beds || subject.baths === comp.baths) ? 85 : 70
  const ageScore = subject.yearBuilt > 0 && comp.yearBuilt > 0 
    ? Math.max(0, 100 - Math.abs(subject.yearBuilt - comp.yearBuilt) * 2) : 85
  const lotScore = subject.lotSize > 0 && comp.lotSize > 0
    ? Math.max(0, 100 - Math.abs(subject.lotSize - comp.lotSize) / subject.lotSize * 100) : 85

  const overall = (locationScore * 0.25 + sizeScore * 0.25 + bedBathScore * 0.2 + ageScore * 0.15 + lotScore * 0.15)

  return {
    overall: Math.round(overall * 10) / 10,
    location: Math.round(locationScore),
    size: Math.round(sizeScore),
    bedBath: Math.round(bedBathScore),
    age: Math.round(ageScore),
    lot: Math.round(lotScore),
  }
}

const calculateAdjustments = (subject: SubjectProperty, comp: CompProperty) => {
  const pricePerSqft = comp.pricePerSqft || 500
  const sizeAdj = (subject.sqft - comp.sqft) * pricePerSqft * 0.1
  const ageAdj = (subject.yearBuilt - comp.yearBuilt) * 5000
  const lotAdj = (subject.lotSize - comp.lotSize) * 50000
  
  return {
    size: Math.round(sizeAdj),
    age: Math.round(ageAdj),
    lot: Math.round(lotAdj),
    total: Math.round(sizeAdj + ageAdj + lotAdj),
  }
}

const transformApiResponse = (apiData: any, subject: SubjectProperty): CompProperty[] => {
  const rawResults = apiData.results || apiData.data || []
  
  return rawResults.map((item: any, index: number) => {
    const comp = item.property || item
    const address = comp.address || {}
    
    let imageUrl = ''
    if (comp.compsCarouselPropertyPhotos?.length > 0) {
      const photoData = comp.compsCarouselPropertyPhotos[0]
      if (photoData.mixedSources?.jpeg?.length > 0) {
        imageUrl = photoData.mixedSources.jpeg[0].url
      }
    }
    
    let distance = 0
    if (subject.latitude && subject.longitude && comp.latitude && comp.longitude) {
      distance = calculateDistance(subject.latitude, subject.longitude, comp.latitude, comp.longitude)
    }
    
    const salePrice = parseFloat(comp.lastSoldPrice || comp.price || 0)
    const sqft = parseInt(comp.livingAreaValue || 0)
    
    let saleDateStr = ''
    if (comp.dateSold) {
      saleDateStr = new Date(comp.dateSold).toISOString().split('T')[0]
    }
    
    let lotSize = parseFloat(comp.lotAreaValue || 0)
    if (comp.lotAreaUnits === 'Square Feet' || comp.lotAreaUnits === 'sqft') {
      lotSize = lotSize / 43560
    }

    const transformedComp: CompProperty = {
      id: comp.zpid || index + 1,
      address: address.streetAddress || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zipcode || '',
      salePrice,
      pricePerSqft: sqft > 0 ? Math.round(salePrice / sqft) : 0,
      beds: parseInt(comp.bedrooms || 0),
      baths: parseFloat(comp.bathrooms || 0),
      sqft,
      lotSize: Math.round(lotSize * 100) / 100,
      yearBuilt: parseInt(comp.yearBuilt || 0),
      saleDate: saleDateStr,
      distance: Math.round(distance * 100) / 100,
      image: imageUrl,
      latitude: parseFloat(comp.latitude || 0),
      longitude: parseFloat(comp.longitude || 0),
      similarity: { overall: 0, location: 0, size: 0, bedBath: 0, age: 0, lot: 0 },
      adjustments: { size: 0, age: 0, lot: 0, total: 0 },
    }

    transformedComp.similarity = calculateSimilarity(subject, transformedComp)
    transformedComp.adjustments = calculateAdjustments(subject, transformedComp)

    return transformedComp
  })
}

// ============================================
// COMPONENTS
// ============================================
const CompCardSkeleton = () => (
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
          backgroundColor: value >= 90 ? '#0891B2' : value >= 75 ? '#0E7490' : '#F59E0B'
        }}
      />
    </div>
    <span className="text-xs font-semibold text-slate-700 w-8 text-right tabular-nums">{value}%</span>
  </div>
)

const CompCard = ({ 
  comp, 
  subject, 
  isSelected, 
  onToggle, 
  isExpanded, 
  onExpand,
  freshnessBadge
}: { 
  comp: CompProperty
  subject: SubjectProperty
  isSelected: boolean
  onToggle: () => void
  isExpanded: boolean
  onExpand: () => void
  freshnessBadge?: { label: string; color: string; bgColor: string } | null
}) => (
  <div className={`relative rounded-xl border transition-all overflow-hidden ${
    isSelected ? 'bg-white ring-2 ring-teal-500/20 border-teal-200' : 'bg-white border-slate-200 hover:border-slate-300'
  }`}>
    <button
      onClick={onToggle}
      className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        isSelected ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-300 hover:border-teal-500'
      }`}
    >
      {isSelected && <Check className="w-3 h-3 text-white" />}
    </button>

    <div className="flex">
      <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100">
        {comp.image ? (
          <img src={comp.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <MapPin className="w-5 h-5 text-slate-400" />
          </div>
        )}
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
          <span className="text-[10px] font-semibold text-teal-600 tabular-nums">{comp.distance?.toFixed(2)} mi</span>
        </div>
      </div>

      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 truncate">{comp.address}</h4>
            <p className="text-xs text-slate-400 truncate">{comp.city}, {comp.state}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-slate-800 tabular-nums">{formatCurrency(comp.salePrice)}</p>
            <p className="text-[10px] text-slate-400 tabular-nums">{formatCurrency(comp.pricePerSqft)}/sf</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{comp.beds}</span>
          <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{comp.baths}</span>
          <span className="flex items-center gap-0.5 tabular-nums"><Square className="w-3 h-3" />{comp.sqft?.toLocaleString()}</span>
          <span className="flex items-center gap-0.5 tabular-nums"><Calendar className="w-3 h-3" />{comp.yearBuilt}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Sold {formatDate(comp.saleDate)}</span>
            <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-500">{getDaysAgo(comp.saleDate)}</span>
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

      <div className="w-16 flex flex-col items-center justify-center bg-slate-50 border-l border-slate-100">
        <div className="text-xl font-bold tabular-nums" style={{ color: comp.similarity.overall >= 95 ? '#0891B2' : comp.similarity.overall >= 90 ? '#0E7490' : '#F59E0B' }}>
          {comp.similarity.overall}
        </div>
        <span className="text-[10px] text-slate-400">% Match</span>
      </div>
    </div>

    {isExpanded && (
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-2">Similarity</h5>
            <div className="space-y-1.5">
              <SimilarityBar label="Location" value={comp.similarity.location} icon={MapPin} />
              <SimilarityBar label="Size" value={comp.similarity.size} icon={Square} />
              <SimilarityBar label="Bed/Bath" value={comp.similarity.bedBath} icon={Bed} />
              <SimilarityBar label="Age" value={comp.similarity.age} icon={Calendar} />
              <SimilarityBar label="Lot" value={comp.similarity.lot} icon={Ruler} />
            </div>
          </div>
          <div>
            <h5 className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Adjustments</h5>
            <div className="space-y-1">
              {[
                { label: 'Size', value: comp.adjustments.size },
                { label: 'Age', value: comp.adjustments.age },
                { label: 'Lot', value: comp.adjustments.lot },
              ].map((adj) => (
                <div key={adj.label} className="flex justify-between text-xs">
                  <span className="text-slate-500">{adj.label}</span>
                  <span className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {adj.value >= 0 ? '+' : ''}{formatCurrency(adj.value)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                <span className="font-semibold text-slate-700">Adjusted</span>
                <span className="font-bold text-teal-600 tabular-nums">{formatCurrency(comp.salePrice + comp.adjustments.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)

// ============================================
// MAIN COMPONENT
// ============================================
export function SalesCompsSection() {
  const { propertyData, assumptions, updateAssumption } = useWorksheetStore()
  
  const [comps, setComps] = useState<CompProperty[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedComps, setSelectedComps] = useState<(number | string)[]>([])
  const [expandedComp, setExpandedComp] = useState<number | string | null>(null)
  const [recencyFilter, setRecencyFilter] = useState<'all' | '30' | '90'>('all')

  // Build subject property from worksheet data - use snapshot with fallback to top-level fields
  const snapshot = propertyData?.property_data_snapshot
  const subject: SubjectProperty = useMemo(() => ({
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

  // Get zpid from property data if available
  const zpid = propertyData?.zpid?.toString() || snapshot?.zpid?.toString() || ''

  const fetchComps = useCallback(async () => {
    if (!subject.address && !zpid) {
      setError('No property address or ID available')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Prefer zpid for more accurate results, fall back to address
      const params: { zpid?: string; address?: string } = {}
      if (zpid) {
        params.zpid = zpid
        console.log('[SalesComps] Using zpid:', zpid)
      } else {
        const fullAddress = `${subject.address}, ${subject.city}, ${subject.state} ${subject.zip}`.trim()
        params.address = fullAddress
        console.log('[SalesComps] Using address:', fullAddress)
      }
      
      const response = await fetchSimilarSold(params)
      const transformed = transformApiResponse(response, subject)
      setComps(transformed)
      
      // Auto-select first 3 comps
      if (transformed.length > 0) {
        setSelectedComps(transformed.slice(0, 3).map(c => c.id))
      }
    } catch (err) {
      console.error('[SalesComps] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch comps')
    } finally {
      setLoading(false)
    }
  }, [subject, zpid])

  useEffect(() => {
    if (subject.address) {
      fetchComps()
    }
  }, []) // Only fetch on mount

  const toggleComp = (id: number | string) => {
    setSelectedComps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  // Calculate ARV from selected comps
  const arvCalculation = useMemo(() => {
    const activeComps = comps.filter(c => selectedComps.includes(c.id))
    if (activeComps.length === 0) return { arv: 0, low: 0, high: 0, confidence: 0 }

    const adjustedPrices = activeComps.map(c => c.salePrice + c.adjustments.total)
    const avgAdjusted = adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length
    const low = Math.min(...adjustedPrices)
    const high = Math.max(...adjustedPrices)

    const avgSimilarity = activeComps.reduce((a, c) => a + c.similarity.overall, 0) / activeComps.length
    const compCountScore = Math.min(activeComps.length * 15, 40)
    const similarityScore = (avgSimilarity / 100) * 40
    const confidence = Math.round(compCountScore + similarityScore + 20)

    return { arv: Math.round(avgAdjusted), low: Math.round(low), high: Math.round(high), confidence }
  }, [selectedComps, comps])

  // Update worksheet ARV when calculation changes
  const handleApplyArv = () => {
    if (arvCalculation.arv > 0) {
      updateAssumption('arv', arvCalculation.arv)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Sales Comps & ARV</h2>
          <p className="text-sm text-slate-500">Comparable sales for {subject.address}</p>
          <p className="text-xs text-slate-400 mt-1">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchComps}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ARV Summary Card */}
      <div className="bg-gradient-to-r from-teal-500/10 to-teal-500/5 rounded-xl p-4 border border-teal-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Target className="w-6 h-6 text-teal-500" />
            </div>
            <div>
              <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide">IQ ARV Estimate</div>
              <div className="text-2xl font-bold text-slate-800 tabular-nums">
                {loading ? '...' : formatCurrency(arvCalculation.arv)}
              </div>
              <div className="text-xs text-slate-500">
                Range: {formatCurrency(arvCalculation.low)} — {formatCurrency(arvCalculation.high)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-400">Market trend:</span>
                <span className="text-[10px] font-semibold text-green-600">+8.2% YoY</span>
                <span className="text-[10px] text-teal-500">✓ ARV adjusted for appreciation</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums" style={{ color: arvCalculation.confidence >= 85 ? '#0891B2' : arvCalculation.confidence >= 70 ? '#F59E0B' : '#EF4444' }}>
                {arvCalculation.confidence}
              </div>
              <div className="text-[10px] text-slate-500 uppercase">Confidence</div>
            </div>
            <button
              onClick={handleApplyArv}
              disabled={arvCalculation.arv === 0}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply ARV
            </button>
          </div>
        </div>
      </div>

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
          {selectedComps.length} of {comps.filter(c => {
            const daysAgo = getSaleDaysAgo(c.saleDate)
            if (recencyFilter === '30') return daysAgo <= 30
            if (recencyFilter === '90') return daysAgo <= 90
            return true
          }).length} comps selected
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedComps(comps.map(c => c.id))}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedComps([])}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <CompCardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <AlertCircle className="mx-auto mb-2 text-red-500 w-8 h-8" />
          <h3 className="text-sm font-semibold text-red-800 mb-1">Failed to Load Comps</h3>
          <p className="text-xs text-red-600 mb-3">{error}</p>
          <button onClick={fetchComps} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg">
            Try Again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && comps.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <Building2 className="mx-auto mb-2 text-slate-400 w-8 h-8" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No Comparable Sales Found</h3>
          <p className="text-xs text-slate-500">Try refreshing or check the property address</p>
        </div>
      )}

      {/* Comps List */}
      {!loading && !error && comps.length > 0 && (
        <div className="space-y-3">
          {comps
            .filter(c => {
              const daysAgo = getSaleDaysAgo(c.saleDate)
              if (recencyFilter === '30') return daysAgo <= 30
              if (recencyFilter === '90') return daysAgo <= 90
              return true
            })
            .map(comp => {
              const freshnessBadge = getFreshnessBadge(comp.saleDate)
              return (
                <CompCard
                  key={comp.id}
                  comp={comp}
                  subject={subject}
                  isSelected={selectedComps.includes(comp.id)}
                  onToggle={() => toggleComp(comp.id)}
                  isExpanded={expandedComp === comp.id}
                  onExpand={() => setExpandedComp(expandedComp === comp.id ? null : comp.id)}
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
              Confidence: {
                comps.filter(c => c.distance <= 0.5).length >= 3 
                  ? 'HIGH' 
                  : comps.filter(c => c.distance <= 1).length >= 3 
                    ? 'MODERATE' 
                    : 'LOW'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
