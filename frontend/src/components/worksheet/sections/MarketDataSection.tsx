'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { 
  TrendingUp, TrendingDown, Thermometer, MapPin, Building, 
  DollarSign, BarChart3, Activity, ChevronDown, ArrowUpRight, 
  ArrowDownRight, Home, Map, Zap, Target, RefreshCw, AlertCircle,
  Flame, Snowflake, Sun
} from 'lucide-react'

// ============================================
// AXESSO API CONFIGURATION
// ============================================
// API Request: GET https://api.axesso.de/zil/rental-market[?city][&state]
const API_CONFIG = {
  baseUrl: 'https://api.axesso.de',
  endpoints: {
    rentalMarket: '/zil/rental-market',
  },
  apiKey: process.env.NEXT_PUBLIC_AXESSO_API_KEY || '',
  apiKeyHeader: 'axesso-api-key',
}

// ============================================
// API SERVICE
// ============================================
async function fetchMarketData(params: { city?: string; state?: string; zipcode?: string }) {
  const url = new URL(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.rentalMarket}`)
  
  if (params.city) url.searchParams.append('city', params.city)
  if (params.state) url.searchParams.append('state', params.state)
  if (params.zipcode) url.searchParams.append('zipcode', params.zipcode)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      [API_CONFIG.apiKeyHeader]: API_CONFIG.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`API Error ${response.status}`)
  }

  return response.json()
}

// ============================================
// TYPES
// ============================================
interface MarketPageData {
  areaName: string
  areaType: string
  date: string
  marketTemperature: { temperature: string }
  medianRentPriceOverTime: {
    currentYear: { month: string; price: number; year: string }[]
    prevYear: { month: string; price: number; year: string }[]
  }
  nearByAreas: { areaId: number; areaType: string; city: string; name: string; state: string }[]
  nearbyAreaTrends: { areaName: string; date: string; medianRent: number; resourceId: string }[]
  rentCompare: { areaName: string; medianRent: number }
  rentHistogram: { minPrice: number; maxPrice: number; priceAndCount: { price: number; count: number }[] }
  summary: { availableRentals: number; medianRent: number; monthlyChange: number; yearlyChange: number }
  zipcodesInCity: { areaId: number; name: string; city: string; state: string }[]
}

// ============================================
// UTILITIES
// ============================================
const formatCurrency = (value: number) => {
  if (!value && value !== 0) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(value)
}

const formatPercent = (value: number) => {
  if (!value && value !== 0) return 'N/A'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

const formatNumber = (value: number) => {
  if (!value && value !== 0) return 'N/A'
  return new Intl.NumberFormat('en-US').format(value)
}

// ============================================
// MARKET TEMPERATURE GAUGE
// ============================================
const MarketTemperatureGauge = ({ temperature }: { temperature: string }) => {
  const temps: Record<string, { position: number; color: string; icon: React.ElementType; label: string; description: string }> = {
    'Cold': { position: 10, color: '#3B82F6', icon: Snowflake, label: 'Cold Market', description: "Buyer's market - prices declining" },
    'Cool': { position: 30, color: '#06B6D4', icon: Snowflake, label: 'Cool Market', description: 'Slight buyer advantage' },
    'Neutral': { position: 50, color: '#F59E0B', icon: Sun, label: 'Balanced Market', description: 'Even supply and demand' },
    'Warm': { position: 70, color: '#F97316', icon: Flame, label: 'Warm Market', description: 'Slight seller advantage' },
    'Hot': { position: 90, color: '#EF4444', icon: Flame, label: 'Hot Market', description: "Seller's market - high demand" },
  }

  const current = temps[temperature] || temps['Neutral']
  const Icon = current.icon

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-yellow-500 to-red-500 flex items-center justify-center">
          <Thermometer className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Market Temperature</h4>
          <p className="text-[10px] text-slate-400">Current conditions</p>
        </div>
      </div>

      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 mb-3">
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-lg transition-all duration-500"
          style={{ left: `calc(${current.position}% - 8px)`, borderColor: current.color }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 mb-3">
        <span>Cold</span>
        <span>Neutral</span>
        <span>Hot</span>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: `${current.color}15` }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${current.color}25` }}>
          <Icon className="w-4 h-4" style={{ color: current.color }} />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: current.color }}>{current.label}</div>
          <div className="text-[10px] text-slate-500">{current.description}</div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SUMMARY STATS
// ============================================
const SummaryStats = ({ summary }: { summary: MarketPageData['summary'] }) => {
  const stats = [
    { label: 'Median Rent', value: formatCurrency(summary.medianRent), sub: '/mo', icon: DollarSign, color: 'teal' },
    { label: 'Monthly Change', value: formatCurrency(summary.monthlyChange), icon: summary.monthlyChange >= 0 ? TrendingUp : TrendingDown, color: summary.monthlyChange >= 0 ? 'teal' : 'red' },
    { label: 'Yearly Change', value: formatPercent(summary.yearlyChange), icon: summary.yearlyChange >= 0 ? ArrowUpRight : ArrowDownRight, color: summary.yearlyChange >= 0 ? 'teal' : 'red' },
    { label: 'Available', value: formatNumber(summary.availableRentals), sub: 'listings', icon: Home, color: 'slate' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <stat.icon className={`w-3.5 h-3.5 ${stat.color === 'teal' ? 'text-teal-500' : stat.color === 'red' ? 'text-red-500' : 'text-slate-400'}`} />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold tabular-nums ${stat.color === 'teal' ? 'text-teal-600' : stat.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>
              {stat.value}
            </span>
            {stat.sub && <span className="text-[10px] text-slate-400">{stat.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// RENT TREND CHART
// ============================================
const RentTrendChart = ({ currentYear, prevYear }: { currentYear: MarketPageData['medianRentPriceOverTime']['currentYear']; prevYear: MarketPageData['medianRentPriceOverTime']['prevYear'] }) => {
  const allPrices = [...currentYear.map(d => d.price), ...prevYear.map(d => d.price)]
  const maxPrice = Math.max(...allPrices)
  const minPrice = Math.min(...allPrices)
  const range = maxPrice - minPrice
  const padding = range * 0.1

  const getY = (price: number) => 100 - ((price - minPrice + padding) / (range + padding * 2)) * 100

  const createPath = (data: typeof currentYear) => {
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = getY(d.price)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  const lastCurrentPrice = currentYear[currentYear.length - 1]?.price || 0
  const lastPrevPrice = prevYear[prevYear.length - 1]?.price || 0
  const yoyChange = ((lastCurrentPrice - lastPrevPrice) / lastPrevPrice) * 100

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Rent Trends</h4>
            <p className="text-[10px] text-slate-400">YoY comparison</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 rounded-full bg-teal-500" /><span className="text-slate-500">{currentYear[0]?.year}</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 rounded-full bg-slate-300" /><span className="text-slate-500">{prevYear[0]?.year}</span></div>
        </div>
      </div>

      <div className="relative h-32 mb-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {[0, 25, 50, 75, 100].map((y) => (<line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#E2E8F0" strokeWidth="0.2" />))}
          <path d={createPath(prevYear)} fill="none" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2,2" />
          <path d={createPath(currentYear)} fill="none" stroke="#0891B2" strokeWidth="1" />
          <path d={`${createPath(currentYear)} L 100 100 L 0 100 Z`} fill="url(#tealGradient)" />
          <defs>
            <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0891B2" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 mb-3">
        {currentYear.filter((_, i) => i % 3 === 0).map((d, i) => (<span key={i}>{d.month}</span>))}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">Year-over-Year</span>
        <div className={`flex items-center gap-1 ${yoyChange >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
          {yoyChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span className="text-sm font-bold tabular-nums">{formatPercent(yoyChange)}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// RENT HISTOGRAM
// ============================================
const RentHistogram = ({ histogram, medianRent }: { histogram: MarketPageData['rentHistogram']; medianRent: number }) => {
  const maxCount = Math.max(...histogram.priceAndCount.map(d => d.count))
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center">
          <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Rent Distribution</h4>
          <p className="text-[10px] text-slate-400">Price range breakdown</p>
        </div>
      </div>

      <div className="flex items-end gap-0.5 h-24 mb-2">
        {histogram.priceAndCount.map((item, i) => {
          const height = (item.count / maxCount) * 100
          const isMedian = Math.abs(item.price - medianRent) < 250
          return (
            <div key={i} className="flex-1 group">
              <div
                className={`w-full rounded-t transition-all ${isMedian ? 'bg-teal-500' : 'bg-slate-200 group-hover:bg-teal-300'}`}
                style={{ height: `${height}%`, minHeight: '4px' }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 mb-3">
        <span className="tabular-nums">{formatCurrency(histogram.minPrice)}</span>
        <span className="tabular-nums">{formatCurrency(histogram.maxPrice)}</span>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">Median Rent</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
          <span className="text-sm font-bold text-teal-600 tabular-nums">{formatCurrency(medianRent)}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// NEARBY AREAS COMPARISON
// ============================================
const NearbyAreasComparison = ({ nearbyTrends, currentMedian, areaName }: { nearbyTrends: MarketPageData['nearbyAreaTrends']; currentMedian: number; areaName: string }) => {
  const sortedAreas = [...nearbyTrends].sort((a, b) => b.medianRent - a.medianRent)
  const maxRent = Math.max(...sortedAreas.map(a => a.medianRent), currentMedian)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center">
          <Map className="w-3.5 h-3.5 text-teal-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Nearby Areas</h4>
          <p className="text-[10px] text-slate-400">vs {areaName}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-teal-700">{areaName}</span>
              <span className="text-xs font-bold text-teal-600 tabular-nums">{formatCurrency(currentMedian)}</span>
            </div>
            <div className="h-1.5 bg-teal-200 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(currentMedian / maxRent) * 100}%` }} />
            </div>
          </div>
        </div>

        {sortedAreas.slice(0, 4).map((area, i) => {
          const diff = ((area.medianRent - currentMedian) / currentMedian) * 100
          return (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                <Building className="w-3 h-3 text-slate-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{area.areaName}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${diff > 0 ? 'text-amber-600' : 'text-teal-600'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                    </span>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{formatCurrency(area.medianRent)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: `${(area.medianRent / maxRent) * 100}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// IQ MARKET SCORE
// ============================================
const IQMarketScore = ({ summary, temperature }: { summary: MarketPageData['summary']; temperature: string }) => {
  const tempScores: Record<string, number> = { 'Hot': 90, 'Warm': 75, 'Neutral': 50, 'Cool': 35, 'Cold': 20 }
  const tempScore = tempScores[temperature] || 50
  const yoyScore = Math.min(100, Math.max(0, 50 + summary.yearlyChange * 3))
  const supplyScore = summary.availableRentals > 1000 ? 70 : summary.availableRentals > 500 ? 50 : 30
  const overallScore = Math.round((tempScore * 0.4 + yoyScore * 0.4 + supplyScore * 0.2))

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Strong Growth', color: '#0891B2' }
    if (score >= 60) return { label: 'Moderate Growth', color: '#0E7490' }
    if (score >= 40) return { label: 'Stable', color: '#F59E0B' }
    return { label: 'Declining', color: '#EF4444' }
  }

  const scoreInfo = getScoreLabel(overallScore)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-teal-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">IQ Market Score</h4>
          <p className="text-[10px] text-slate-400">Composite health</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scoreInfo.color} strokeWidth="3" strokeDasharray={`${overallScore}, 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-800 tabular-nums">{overallScore}</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-base font-bold mb-2" style={{ color: scoreInfo.color }}>{scoreInfo.label}</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Demand</span>
              <span className="font-semibold text-slate-700">{temperature}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">YoY Growth</span>
              <span className="font-semibold text-teal-600 tabular-nums">{formatPercent(summary.yearlyChange)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Supply</span>
              <span className="font-semibold text-slate-700 tabular-nums">{formatNumber(summary.availableRentals)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// LOADING SKELETON
// ============================================
const MarketDataSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-4 gap-3">
      {[1,2,3,4].map(i => (<div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-20"><div className="h-3 bg-slate-200 rounded w-1/2 mb-2" /><div className="h-6 bg-slate-200 rounded w-3/4" /></div>))}
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 h-48" />
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 h-48" />
    </div>
  </div>
)

// ============================================
// MAIN COMPONENT
// ============================================
export function MarketDataSection() {
  const { propertyData } = useWorksheetStore()
  
  const [marketData, setMarketData] = useState<MarketPageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const property = propertyData?.property_data_snapshot
  const city = property?.city || ''
  const state = property?.state || ''

  const fetchData = useCallback(async () => {
    if (!city) {
      setError('No city information available')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetchMarketData({ city, state })
      const data = response.data?.marketPage || response.marketPage || response
      setMarketData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data')
    } finally {
      setLoading(false)
    }
  }, [city, state])

  useEffect(() => {
    if (city) {
      fetchData()
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Rental Market Data</h2>
          <p className="text-sm text-slate-500">{city ? `${city}, ${state}` : 'Market analysis'}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && <MarketDataSkeleton />}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <AlertCircle className="mx-auto mb-2 text-red-500 w-8 h-8" />
          <h3 className="text-sm font-semibold text-red-800 mb-1">Failed to Load Market Data</h3>
          <p className="text-xs text-red-600 mb-3">{error}</p>
          <button onClick={fetchData} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg">
            Try Again
          </button>
        </div>
      )}

      {/* Market Data Content */}
      {!loading && !error && marketData && (
        <>
          {/* Summary Stats */}
          <SummaryStats summary={marketData.summary} />

          {/* Main Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <IQMarketScore summary={marketData.summary} temperature={marketData.marketTemperature?.temperature || 'Neutral'} />
              <MarketTemperatureGauge temperature={marketData.marketTemperature?.temperature || 'Neutral'} />
            </div>

            {/* Right Column */}
            <div className="col-span-2 space-y-4">
              <RentTrendChart 
                currentYear={marketData.medianRentPriceOverTime?.currentYear || []}
                prevYear={marketData.medianRentPriceOverTime?.prevYear || []}
              />
              <div className="grid grid-cols-2 gap-4">
                <RentHistogram histogram={marketData.rentHistogram || { minPrice: 0, maxPrice: 0, priceAndCount: [] }} medianRent={marketData.summary?.medianRent || 0} />
                <NearbyAreasComparison 
                  nearbyTrends={marketData.nearbyAreaTrends || []}
                  currentMedian={marketData.summary?.medianRent || 0}
                  areaName={marketData.areaName || city}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && !marketData && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <BarChart3 className="mx-auto mb-2 text-slate-400 w-8 h-8" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No Market Data Available</h3>
          <p className="text-xs text-slate-500">Click Refresh to load market data for this area</p>
        </div>
      )}
    </div>
  )
}
