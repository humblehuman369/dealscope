'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Trash2, Search, Loader2, Building2, Home, MapPin,
  TrendingUp, DollarSign, Percent, Target, Award, PiggyBank,
  X, ChevronDown, ChevronUp, BarChart3, ArrowRight
} from 'lucide-react'
import {
  PropertyComparison,
  createPropertyComparison,
  savePropertyComparisons,
  loadPropertyComparisons,
  getDefaultProjectionAssumptions,
  calculate10YearProjections
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
// PROPERTY SEARCH INPUT
// ============================================

function PropertySearchInput({
  onAdd,
  loading,
  setLoading
}: {
  onAdd: (property: PropertyComparison) => void
  loading: boolean
  setLoading: (v: boolean) => void
}) {
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
      
      if (!response.ok) {
        throw new Error('Property not found')
      }
      
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
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch property')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter property address..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          Search
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

// ============================================
// QUICK ADD DEMO PROPERTIES
// ============================================

const DEMO_PROPERTIES = [
  {
    address: '123 Palm Beach Way, West Palm Beach, FL 33486',
    propertyType: 'Single Family',
    beds: 4, baths: 2.5, sqft: 2450,
    purchasePrice: 425000, monthlyRent: 2800, propertyTaxes: 4500
  },
  {
    address: '456 Ocean Drive, Miami Beach, FL 33139',
    propertyType: 'Condo',
    beds: 2, baths: 2, sqft: 1200,
    purchasePrice: 550000, monthlyRent: 3500, propertyTaxes: 6000
  },
  {
    address: '789 Lake View Dr, Orlando, FL 32801',
    propertyType: 'Single Family',
    beds: 3, baths: 2, sqft: 1800,
    purchasePrice: 350000, monthlyRent: 2200, propertyTaxes: 3800
  }
]

// ============================================
// PROPERTY CARD
// ============================================

function PropertyCard({
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
  
  return (
    <div className={`bg-white rounded-2xl border-2 ${
      isWinner ? 'border-emerald-300 shadow-lg shadow-emerald-100' : 'border-gray-100'
    } overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 ${isWinner ? 'bg-emerald-50' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
              isWinner ? 'bg-emerald-500' : 'bg-gray-400'
            }`}>
              {isWinner ? <Award className="w-5 h-5" /> : `#${rank}`}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{property.address}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {property.propertyType} • {property.beds} bed • {property.baths} bath • {property.sqft.toLocaleString()} sqft
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium">Purchase Price</div>
            <div className="text-lg font-bold text-blue-700">{formatCompact(property.purchasePrice)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-medium">Monthly Rent</div>
            <div className="text-lg font-bold text-green-700">{formatCurrency(property.monthlyRent)}</div>
          </div>
        </div>
        
        {/* Cash Flow - Highlighted */}
        <div className={`rounded-xl p-4 ${
          property.monthlyCashFlow >= 0 
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200' 
            : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-600">Monthly Cash Flow</div>
              <div className={`text-2xl font-black ${
                property.monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {formatCurrency(property.monthlyCashFlow)}
              </div>
            </div>
            <TrendingUp className={`w-8 h-8 ${
              property.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`} />
          </div>
        </div>
        
        {/* Other Key Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Cash-on-Cash</span>
            <span className={`font-semibold ${property.cashOnCash >= 0.08 ? 'text-emerald-600' : 'text-gray-700'}`}>
              {formatPercent(property.cashOnCash)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Cap Rate</span>
            <span className={`font-semibold ${property.capRate >= 0.06 ? 'text-emerald-600' : 'text-gray-700'}`}>
              {formatPercent(property.capRate)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">1% Rule</span>
            <span className={`font-semibold ${property.onePercentRule >= 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatPercent(property.onePercentRule)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">DSCR</span>
            <span className={`font-semibold ${property.dscr >= 1.25 ? 'text-emerald-600' : 'text-gray-700'}`}>
              {property.dscr.toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* Expandable 10-Year Section */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          10-Year Projections
        </button>
        
        {expanded && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Cash Required</span>
              <span className="font-semibold">{formatCompact(property.totalCashRequired)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">10-Year Cash Flow</span>
              <span className="font-semibold text-emerald-600">{formatCompact(property.year10CashFlow)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">10-Year Equity</span>
              <span className="font-semibold text-blue-600">{formatCompact(property.year10Equity)}</span>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs text-purple-600 font-medium">Total Wealth (Year 10)</div>
              <div className="text-xl font-black text-purple-700">{formatCompact(property.year10TotalWealth)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// COMPARISON TABLE
// ============================================

function ComparisonTable({ properties }: { properties: PropertyComparison[] }) {
  if (properties.length < 2) return null
  
  // Find best for each metric
  const bestCashFlow = Math.max(...properties.map(p => p.monthlyCashFlow))
  const bestCoC = Math.max(...properties.map(p => p.cashOnCash))
  const bestWealth = Math.max(...properties.map(p => p.year10TotalWealth))
  
  const metrics = [
    { label: 'Purchase Price', key: 'purchasePrice', format: 'compact' },
    { label: 'Monthly Rent', key: 'monthlyRent', format: 'currency' },
    { label: 'Monthly Cash Flow', key: 'monthlyCashFlow', format: 'currency', highlight: true, best: bestCashFlow },
    { label: 'Cash-on-Cash', key: 'cashOnCash', format: 'percent', best: bestCoC },
    { label: 'Cap Rate', key: 'capRate', format: 'percent' },
    { label: '1% Rule', key: 'onePercentRule', format: 'percent' },
    { label: 'DSCR', key: 'dscr', format: 'number' },
    { label: 'Cash Required', key: 'totalCashRequired', format: 'compact' },
    { label: '10-Year Wealth', key: 'year10TotalWealth', format: 'compact', highlight: true, best: bestWealth },
  ]
  
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return formatCurrency(value)
      case 'compact': return formatCompact(value)
      case 'percent': return formatPercent(value)
      default: return value.toFixed(2)
    }
  }
  
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
              {properties.map((p, i) => (
                <th key={p.id} className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[140px]">
                  Property {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key} className={`border-b border-gray-100 ${m.highlight ? 'bg-emerald-50' : ''}`}>
                <td className={`py-3 px-4 ${m.highlight ? 'font-semibold' : ''}`}>{m.label}</td>
                {properties.map((p) => {
                  const value = p[m.key as keyof PropertyComparison] as number
                  const isBest = m.best !== undefined && value === m.best && properties.length > 1
                  return (
                    <td 
                      key={p.id} 
                      className={`py-3 px-4 text-right font-medium ${
                        isBest ? 'text-emerald-600 bg-emerald-100' : ''
                      }`}
                    >
                      {formatValue(value, m.format)}
                      {isBest && <span className="ml-1">★</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  
  // Auto-load property from URL parameter (when coming from property page)
  useEffect(() => {
    if (!initialLoadDone) return
    
    const addressParam = searchParams.get('address')
    if (!addressParam) return
    
    // Check if property already exists in comparison
    const alreadyExists = properties.some(p => 
      p.address.toLowerCase() === addressParam.toLowerCase()
    )
    if (alreadyExists) return
    
    // Fetch and add the property
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
        // Clear the URL parameter after loading
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
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Compare Properties</h1>
              <p className="text-gray-500">Analyze up to 4 properties side-by-side</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Search
            </button>
            {properties.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {/* Search Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Add Property by Address</h2>
          <PropertySearchInput
            onAdd={handleAddProperty}
            loading={loading}
            setLoading={setLoading}
          />
          
          {/* Quick Add Demo Properties */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">Or quickly add demo properties:</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_PROPERTIES.map((demo, i) => (
                <button
                  key={i}
                  onClick={() => handleAddDemo(demo)}
                  disabled={properties.length >= 4}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {demo.address.split(',')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Property Cards */}
        {properties.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {properties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  rank={sortedProperties.findIndex(p => p.id === property.id) + 1}
                  isWinner={property.id === winnerId && properties.length > 1}
                  onRemove={() => handleRemoveProperty(property.id)}
                />
              ))}
              
              {/* Add Property Placeholder */}
              {properties.length < 4 && (
                <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center min-h-[400px]">
                  <div className="text-center text-neutral-400">
                    <Plus className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-medium">Add Property</p>
                    <p className="text-sm">{4 - properties.length} slots remaining</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Comparison Table */}
            {properties.length >= 2 && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-4">Side-by-Side Comparison</h2>
                <ComparisonTable properties={properties} />
              </div>
            )}
            
            {/* Winner Summary */}
            {properties.length >= 2 && (
              <div className="bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-4">
                  <Award className="w-12 h-12" />
                  <div>
                    <h3 className="text-xl font-bold">Top Performing Property</h3>
                    <p className="text-emerald-100">{sortedProperties[0].address}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-3xl font-black">{formatCompact(sortedProperties[0].year10TotalWealth)}</div>
                    <div className="text-emerald-100">10-Year Total Wealth</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Properties Added</h2>
            <p className="text-gray-500 mb-6">Search for properties above or add demo properties to start comparing</p>
            <div className="flex justify-center gap-3">
              {DEMO_PROPERTIES.slice(0, 2).map((demo, i) => (
                <button
                  key={i}
                  onClick={() => handleAddDemo(demo)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add {demo.address.split(',')[0]}
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  )
}
