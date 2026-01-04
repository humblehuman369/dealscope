'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Trash2, Search, Loader2, Building2, MapPin,
  TrendingUp, Award, ChevronDown, ChevronUp, BarChart3, ArrowLeft, X
} from 'lucide-react'
import {
  PropertyComparison,
  createPropertyComparison,
  savePropertyComparisons,
  loadPropertyComparisons,
} from '@/lib/projections'

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', 
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

const formatCompact = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return formatCurrency(value)
}

// ============================================
// DEMO PROPERTIES
// ============================================

const DEMO_PROPERTIES = [
  {
    address: '123 Palm Beach Way, West Palm Beach, FL',
    propertyType: 'Single Family',
    beds: 4, baths: 2.5, sqft: 2450,
    purchasePrice: 425000, monthlyRent: 2800, propertyTaxes: 4500
  },
  {
    address: '456 Ocean Drive, Miami Beach, FL',
    propertyType: 'Condo',
    beds: 2, baths: 2, sqft: 1200,
    purchasePrice: 550000, monthlyRent: 3500, propertyTaxes: 6000
  },
  {
    address: '789 Lake View Dr, Orlando, FL',
    propertyType: 'Single Family',
    beds: 3, baths: 2, sqft: 1800,
    purchasePrice: 350000, monthlyRent: 2200, propertyTaxes: 3800
  }
]

// ============================================
// COMPACT PROPERTY CARD (Mobile-First)
// ============================================

function CompactPropertyCard({
  property,
  rank,
  isWinner,
  onRemove
}: {
  property: PropertyComparison
  rank: number
  isWinner: boolean
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPositive = property.monthlyCashFlow >= 0
  
  return (
    <div className={`bg-white dark:bg-navy-800 rounded-xl border-2 transition-all ${
      isWinner 
        ? 'border-brand-500 shadow-lg' 
        : 'border-gray-200 dark:border-navy-600'
    }`}>
      {/* Winner Badge */}
      {isWinner && (
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold px-3 py-1.5 flex items-center justify-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          BEST DEAL
        </div>
      )}
      
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {/* Rank Badge */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
              isWinner ? 'bg-brand-500' : 'bg-gray-400 dark:bg-navy-500'
            }`}>
              #{rank}
            </div>
            
            {/* Address */}
            <div className="min-w-0">
              <h3 className="font-bold text-navy-900 dark:text-white text-sm leading-tight truncate">
                {property.address.split(',')[0]}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {property.address.split(',').slice(1).join(',')}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {property.beds} bd • {property.baths} ba • {property.sqft.toLocaleString()} sqft
              </p>
            </div>
          </div>
          
          {/* Remove Button */}
          <button
            onClick={onRemove}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
        
        {/* Key Metrics Grid - Compact 3-column */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-gray-50 dark:bg-navy-700 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Price</div>
            <div className="text-sm font-bold text-navy-900 dark:text-white">{formatCompact(property.purchasePrice)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-navy-700 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Rent</div>
            <div className="text-sm font-bold text-navy-900 dark:text-white">{formatCurrency(property.monthlyRent)}</div>
          </div>
          <div className={`rounded-lg p-2 text-center ${
            isPositive 
              ? 'bg-green-50 dark:bg-green-900/20' 
              : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Cash Flow</div>
            <div className={`text-sm font-bold ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>{formatCurrency(property.monthlyCashFlow)}</div>
          </div>
        </div>
        
        {/* Secondary Metrics Row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-navy-600 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400">CoC: <span className="font-semibold text-navy-900 dark:text-white">{formatPercent(property.cashOnCash)}</span></span>
            <span className="text-gray-500 dark:text-gray-400">Cap: <span className="font-semibold text-navy-900 dark:text-white">{formatPercent(property.capRate)}</span></span>
            <span className="text-gray-500 dark:text-gray-400">DSCR: <span className="font-semibold text-navy-900 dark:text-white">{property.dscr.toFixed(2)}</span></span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-brand-500 dark:text-brand-400 font-medium flex items-center gap-0.5"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        {/* Expandable Details */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-navy-600 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">1% Rule</span>
              <span className={`font-semibold ${property.onePercentRule >= 0.01 ? 'text-green-600 dark:text-green-400' : 'text-amber-600'}`}>
                {formatPercent(property.onePercentRule)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Cash Required</span>
              <span className="font-semibold text-navy-900 dark:text-white">{formatCompact(property.totalCashRequired)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">10-Year Wealth</span>
              <span className="font-bold text-brand-500 dark:text-brand-400">{formatCompact(property.year10TotalWealth)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// ADD PROPERTY SECTION (Collapsible)
// ============================================

function AddPropertySection({
  onAdd,
  onAddDemo,
  loading,
  setLoading,
  propertyCount
}: {
  onAdd: (property: PropertyComparison) => void
  onAddDemo: (demo: typeof DEMO_PROPERTIES[0]) => void
  loading: boolean
  setLoading: (v: boolean) => void
  propertyCount: number
}) {
  const [expanded, setExpanded] = useState(propertyCount === 0)
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const handleSearch = async () => {
    if (!address.trim() || loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/properties/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() })
      })
      
      if (!response.ok) throw new Error('Property not found')
      
      const data = await response.json()
      
      const comparison = createPropertyComparison({
        address: data.address.full_address,
        propertyType: data.details.property_type || 'Single Family',
        beds: data.details.bedrooms || 3,
        baths: data.details.bathrooms || 2,
        sqft: data.details.square_footage || 1500,
        purchasePrice: data.valuations.current_value_avm || 400000,
        monthlyRent: data.rentals.monthly_rent_ltr || 2000,
        propertyTaxes: data.market.property_taxes_annual || 4000
      })
      
      onAdd(comparison)
      setAddress('')
      setExpanded(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch property')
    } finally {
      setLoading(false)
    }
  }
  
  if (propertyCount >= 4) return null
  
  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-gray-200 dark:border-navy-600 overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-semibold text-navy-900 dark:text-white text-sm">Add Property</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({4 - propertyCount} remaining)</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      
      {/* Expandable Content */}
      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter address..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-navy-700 text-navy-900 dark:text-white placeholder-gray-400"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !address.trim()}
              className="px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
          
          {error && <p className="text-xs text-red-500">{error}</p>}
          
          {/* Demo Properties */}
          <div className="pt-2 border-t border-gray-100 dark:border-navy-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick add demo:</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_PROPERTIES.map((demo, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onAddDemo(demo)
                    setExpanded(false)
                  }}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-navy-600 rounded-full text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {demo.address.split(',')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPARE PAGE CONTENT
// ============================================

function ComparePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState<PropertyComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  
  // Load saved comparisons on mount
  useEffect(() => {
    const saved = loadPropertyComparisons()
    if (saved.length > 0) {
      setProperties(saved)
    }
    setInitialLoadDone(true)
  }, [])
  
  // Auto-load property from URL parameter
  useEffect(() => {
    if (!initialLoadDone) return
    
    const addressParam = searchParams.get('address')
    if (!addressParam) return
    
    const alreadyExists = properties.some(p => 
      p.address.toLowerCase() === addressParam.toLowerCase()
    )
    if (alreadyExists) return
    
    const loadPropertyFromUrl = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/v1/properties/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addressParam })
        })
        
        if (response.ok) {
          const data = await response.json()
          const comparison = createPropertyComparison({
            address: data.address.full_address,
            propertyType: data.details.property_type || 'Single Family',
            beds: data.details.bedrooms || 3,
            baths: data.details.bathrooms || 2,
            sqft: data.details.square_footage || 1500,
            purchasePrice: data.valuations.current_value_avm || 400000,
            monthlyRent: data.rentals.monthly_rent_ltr || 2000,
            propertyTaxes: data.market.property_taxes_annual || 4000
          })
          setProperties(prev => [...prev, comparison])
        }
      } catch (err) {
        console.error('Failed to load property from URL:', err)
      } finally {
        setLoading(false)
        router.replace('/compare', { scroll: false })
      }
    }
    
    loadPropertyFromUrl()
  }, [initialLoadDone, searchParams, properties, router])
  
  // Save when properties change
  useEffect(() => {
    savePropertyComparisons(properties)
  }, [properties])
  
  const handleAddProperty = (property: PropertyComparison) => {
    if (properties.length >= 4) {
      alert('Maximum 4 properties for comparison')
      return
    }
    setProperties([...properties, property])
  }
  
  const handleRemoveProperty = (id: string) => {
    setProperties(properties.filter(p => p.id !== id))
  }
  
  const handleAddDemo = (demo: typeof DEMO_PROPERTIES[0]) => {
    if (properties.length >= 4) return
    const comparison = createPropertyComparison(demo)
    setProperties([...properties, comparison])
  }
  
  const handleClearAll = () => {
    setProperties([])
  }
  
  // Sort by total wealth to determine winner
  const sortedProperties = [...properties].sort((a, b) => b.year10TotalWealth - a.year10TotalWealth)
  const winnerId = sortedProperties[0]?.id
  
  return (
    <div className="min-h-screen bg-[#e8eeef] dark:bg-slate-950 transition-colors duration-300">
      {/* Compact Header */}
      <div className="bg-white dark:bg-navy-800 border-b border-gray-200 dark:border-navy-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-navy-900 dark:text-white">Compare</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{properties.length}/4 properties</p>
              </div>
            </div>
          </div>
          
          {properties.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-4 space-y-3">
        {/* Add Property Section */}
        <AddPropertySection
          onAdd={handleAddProperty}
          onAddDemo={handleAddDemo}
          loading={loading}
          setLoading={setLoading}
          propertyCount={properties.length}
        />
        
        {/* Property Cards */}
        {properties.length > 0 ? (
          <div className="space-y-3">
            {sortedProperties.map((property, index) => (
              <CompactPropertyCard
                key={property.id}
                property={property}
                rank={index + 1}
                isWinner={property.id === winnerId && properties.length > 1}
                onRemove={() => handleRemoveProperty(property.id)}
              />
            ))}
            
            {/* Winner Summary - Only show with 2+ properties */}
            {properties.length >= 2 && (
              <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 font-medium">Top Performer</p>
                    <p className="font-bold text-sm truncate">{sortedProperties[0].address.split(',')[0]}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-white/70">10-Yr Wealth</p>
                    <p className="text-lg font-black">{formatCompact(sortedProperties[0].year10TotalWealth)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-navy-800 rounded-xl border border-gray-200 dark:border-navy-600 p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <h2 className="text-lg font-bold text-navy-900 dark:text-white mb-1">No Properties Yet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add properties to compare their investment potential</p>
            <div className="flex flex-wrap justify-center gap-2">
              {DEMO_PROPERTIES.slice(0, 2).map((demo, i) => (
                <button
                  key={i}
                  onClick={() => handleAddDemo(demo)}
                  className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-1.5 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {demo.address.split(',')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// EXPORT
// ============================================

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#e8eeef] dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  )
}
