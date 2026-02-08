'use client'

/**
 * SalesCompsScreen Component (Similar Sales)
 * 
 * Sales comparables page featuring:
 * - CompactHeader with strategy selector
 * - ARV estimate card with editable value
 * - Selectable comp cards with match scores
 * - Bottom action bar
 * 
 * Uses InvestIQ Universal Style Guide colors
 */

import React, { useState, useCallback } from 'react'
// Auth handled via httpOnly cookies (credentials: 'include')
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import { toast } from '@/components/feedback'
import { formatPrice, formatNumber } from '@/utils/formatters'
// Note: CompactHeader removed - now using global AppHeader from layout

// Types
export interface SalesCompProperty {
  id: number
  address: string
  city: string
  state: string
  beds: number
  baths: number
  sqft: number
  lotSize?: number
  price: number
  pricePerSqft: number
  soldDate: string
  timeAgo: string
  distance: number
  matchScore: number
  image?: string
}

export interface SalesCompsPropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  beds: number
  baths: number
  sqft: number
  yearBuilt?: number
  price: number
  rent?: number
  zpid?: string
  image?: string
}

interface SalesCompsScreenProps {
  property: SalesCompsPropertyData
  comps?: SalesCompProperty[]
  arvEstimate?: number
  arvRangeLow?: number
  arvRangeHigh?: number
  arvConfidence?: number
  initialStrategy?: string
}

// Default comps for demo
const DEFAULT_COMPS: SalesCompProperty[] = [
  {
    id: 0,
    address: '1149 SW 11th Street',
    city: 'Boca Raton',
    state: 'FL',
    beds: 3,
    baths: 2,
    sqft: 1756,
    lotSize: 0,
    price: 750000,
    pricePerSqft: 427,
    soldDate: 'Dec 14, 2025',
    timeAgo: '1mo ago',
    distance: 0.12,
    matchScore: 92,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
  },
  {
    id: 1,
    address: '1098 SW 2nd Street',
    city: 'Boca Raton',
    state: 'FL',
    beds: 3,
    baths: 2,
    sqft: 1862,
    lotSize: 0,
    price: 840000,
    pricePerSqft: 451,
    soldDate: 'Jan 8, 2026',
    timeAgo: '18d ago',
    distance: 0.25,
    matchScore: 90.5,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&h=150&fit=crop',
  },
  {
    id: 2,
    address: '1390 NW 4th Street',
    city: 'Boca Raton',
    state: 'FL',
    beds: 4,
    baths: 2,
    sqft: 1728,
    lotSize: 0,
    price: 880000,
    pricePerSqft: 509,
    soldDate: 'Oct 23, 2025',
    timeAgo: '3mo ago',
    distance: 0.31,
    matchScore: 95.4,
    image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=200&h=150&fit=crop',
  },
  {
    id: 3,
    address: '555 NW 15th Avenue',
    city: 'Boca Raton',
    state: 'FL',
    beds: 3,
    baths: 2,
    sqft: 1727,
    lotSize: 0,
    price: 840000,
    pricePerSqft: 486,
    soldDate: 'Nov 24, 2025',
    timeAgo: '2mo ago',
    distance: 0.45,
    matchScore: 92.4,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&h=150&fit=crop',
  },
  {
    id: 4,
    address: '121 SW 11th Ct',
    city: 'Boca Raton',
    state: 'FL',
    beds: 4,
    baths: 2,
    sqft: 2014,
    lotSize: 0,
    price: 798000,
    pricePerSqft: 396,
    soldDate: 'Sep 23, 2025',
    timeAgo: '4mo ago',
    distance: 0.52,
    matchScore: 91.3,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop',
  },
]

export function SalesCompsScreen({ 
  property, 
  comps: propsComps,
  arvEstimate: initialArv,
  arvRangeLow = 737548,
  arvRangeHigh = 868695,
  arvConfidence = 97,
  initialStrategy 
}: SalesCompsScreenProps) {
  const router = useRouter()
  const { isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()
  
  // State
  const [currentStrategy, setCurrentStrategy] = useState(initialStrategy || 'Long-term')
  const [selectedComps, setSelectedComps] = useState<number[]>([0, 2, 3])
  const [expandedComp, setExpandedComp] = useState<number | null>(null)
  const [arvEstimate, setArvEstimate] = useState(initialArv || Math.round((arvRangeLow + arvRangeHigh) / 2))
  const [isEditingArv, setIsEditingArv] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const comps = propsComps || DEFAULT_COMPS
  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  // Note: Header is now handled by global AppHeader

  const handleStrategyChange = (strategy: string) => {
    setCurrentStrategy(strategy)
  }

  const handleArvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    const newValue = value ? parseInt(value) : 0
    setArvEstimate(newValue)
  }

  const handleArvBlur = () => {
    setIsEditingArv(false)
  }

  const handleArvKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingArv(false)
    }
  }

  const toggleCompSelection = (compId: number) => {
    setSelectedComps(prev => 
      prev.includes(compId)
        ? prev.filter(id => id !== compId)
        : [...prev, compId]
    )
  }

  const selectAllComps = () => {
    setSelectedComps(comps.map(c => c.id))
  }

  const clearComps = () => {
    setSelectedComps([])
  }

  const handleApplyArv = () => {
    // Could navigate to verdict with ARV or save it
    router.push(`/verdict?address=${encodeURIComponent(fullAddress)}&arv=${arvEstimate}`)
  }

  const handleRefresh = () => {
    // Refresh comps data
    console.log('Refreshing comps...')
  }

  // Handle save - saves property to user's saved list via API
  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }

    try {
      const response = await fetch('/api/v1/properties/saved', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_street: property.address,
          address_city: property.city,
          address_state: property.state,
          address_zip: property.zipCode,
          full_address: fullAddress,
          zpid: property.zpid || null,
          external_property_id: property.zpid || null, // Use zpid as external ID if available
          status: 'watching',
          property_data_snapshot: {
            zpid: property.zpid || null,
            street: property.address,
            city: property.city,
            state: property.state,
            zipCode: property.zipCode,
            listPrice: property.price || null,
            bedrooms: property.beds || null,
            bathrooms: property.baths || null,
            sqft: property.sqft || null,
            yearBuilt: property.yearBuilt || null,
          },
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        toast.success('Property saved to your portfolio')
        setSaveMessage('Saved!')
        setTimeout(() => setSaveMessage(null), 2000)
      } else if (response.status === 409) {
        setIsSaved(true)
        toast.info('Property is already in your portfolio')
        setSaveMessage('Already saved!')
        setTimeout(() => setSaveMessage(null), 2000)
      } else if (response.status === 400) {
        // Check if it's a duplicate error (backend may return 400 for duplicates)
        let errorData: { detail?: string }
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { detail: errorText }
        }
        const errorText = errorData.detail || JSON.stringify(errorData)
        if (errorText.includes('already in your saved list') || errorText.includes('already saved')) {
          setIsSaved(true)
          toast.info('Property is already in your portfolio')
          setSaveMessage('Already saved!')
          setTimeout(() => setSaveMessage(null), 2000)
        } else {
          toast.error(errorText || 'Failed to save property. Please try again.')
          console.error('Failed to save property:', response.status, errorText)
        }
      } else if (response.status === 401) {
        openAuthModal('login')
        toast.error('Please log in to save properties')
      } else {
        let errorData: { detail?: string; message?: string; code?: string } = { detail: 'Unknown error' }
        try {
          errorData = await response.json()
        } catch {
          // Response is not JSON, use default error
        }
        // Handle both FastAPI format (detail) and custom InvestIQ format (message)
        const errorMessage = errorData.detail || errorData.message || 'Failed to save property. Please try again.'
        toast.error(errorMessage)
        console.error('Failed to save property:', response.status, errorData)
      }
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.')
      console.error('Failed to save property:', error)
    }
  }, [isAuthenticated, openAuthModal, property, fullAddress])

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sales Comps - ${property.address}`,
          text: `Check out these sales comps for ${fullAddress}`,
          url: window.location.href
        })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setSaveMessage('Link copied!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  // Handle analyze
  const handleAnalyze = () => {
    router.push(`/verdict?address=${encodeURIComponent(fullAddress)}`)
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return '#0891B2'
    return '#64748B'
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] max-w-[480px] mx-auto font-['Inter',sans-serif]">
      {/* Header is now handled by global AppHeader in layout */}

      {/* Main Content */}
      <main className="pb-[100px]">
        {/* Section Header */}
        <div className="flex justify-between items-start p-4 bg-white border-b border-[#CBD5E1]">
          <div>
            <h2 className="text-lg font-bold text-[#0A1628]">Sales Comps & ARV</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Comparable sales for {property.address}</p>
          </div>
          <button 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#64748B] text-[13px] font-medium hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors"
            onClick={handleRefresh}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ARV Card */}
        <div className="bg-white p-4 border-b border-[#CBD5E1]">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-[#0A1628] to-[#1E293B] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#00D4FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
              </svg>
            </div>

            {/* ARV Details */}
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-[#0891B2] uppercase tracking-wider mb-0.5">IQ ARV Estimate</div>
              {isEditingArv ? (
                <input
                  type="text"
                  className="text-[26px] font-extrabold text-[#0A1628] tabular-nums border-2 border-[#0891B2] rounded-lg px-2 py-1 w-40 outline-none focus:ring-2 focus:ring-[#0891B2]/20 font-inherit"
                  value={arvEstimate}
                  onChange={handleArvChange}
                  onBlur={handleArvBlur}
                  onKeyDown={handleArvKeyDown}
                  autoFocus
                />
              ) : (
                <div
                  className="text-[26px] font-extrabold text-[#0A1628] tabular-nums flex items-center gap-2 cursor-pointer hover:text-[#0891B2] transition-colors"
                  onClick={() => setIsEditingArv(true)}
                  title="Click to edit"
                >
                  {formatPrice(arvEstimate)}
                  <svg className="w-4 h-4 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
                  </svg>
                </div>
              )}
              <div className="text-[11px] text-[#64748B] mt-0.5">
                Range: {formatPrice(arvRangeLow)} — {formatPrice(arvRangeHigh)}
              </div>
            </div>

            {/* Confidence & Apply */}
            <div className="flex flex-col items-end gap-2">
              <div className="text-center">
                <div className="text-[28px] font-bold text-[#0891B2] leading-none">{arvConfidence}</div>
                <div className="text-[9px] font-medium text-[#94A3B8] uppercase tracking-wide">Confidence</div>
              </div>
              <button 
                className="px-4 py-2.5 bg-[#0891B2] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0E7490] transition-colors"
                onClick={handleApplyArv}
              >
                Apply ARV
              </button>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-[#CBD5E1]">
          <div className="text-[13px] text-[#64748B]">
            <strong className="text-[#0A1628]">{selectedComps.length}</strong> of <strong className="text-[#0A1628]">{comps.length}</strong> comps selected
          </div>
          <div className="flex gap-4">
            <button className="text-[#0891B2] text-[13px] font-medium hover:text-[#0E7490]" onClick={selectAllComps}>
              Select All
            </button>
            <button className="text-[#0891B2] text-[13px] font-medium hover:text-[#0E7490]" onClick={clearComps}>
              Clear
            </button>
          </div>
        </div>

        {/* Comp Cards */}
        {comps.map((comp) => (
          <div
            key={comp.id}
            className={`bg-white border-b border-[#CBD5E1] border-l-[3px] overflow-hidden transition-all ${
              selectedComps.includes(comp.id) ? 'border-l-[#0891B2] bg-[#F0FDFA]' : 'border-l-transparent'
            }`}
          >
            <div className="flex p-4 gap-3">
              {/* Image Container */}
              <div className="relative w-[120px] h-[90px] flex-shrink-0">
                <img 
                  className="w-full h-full object-cover rounded-lg" 
                  src={comp.image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop'} 
                  alt={comp.address} 
                />
                {/* Checkbox */}
                <div
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    selectedComps.includes(comp.id) 
                      ? 'bg-[#0891B2] border-[#0891B2]' 
                      : 'bg-white border-2 border-[#CBD5E1]'
                  }`}
                  onClick={() => toggleCompSelection(comp.id)}
                >
                  <svg className={`w-3 h-3 text-white ${selectedComps.includes(comp.id) ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                {/* Distance Badge */}
                <div className="absolute bottom-1 left-1 bg-[#0891B2] text-white px-1.5 py-0.5 rounded text-[9px] font-semibold">
                  {comp.distance.toFixed(2)} mi
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#0A1628] truncate">{comp.address}</div>
                <div className="text-[11px] text-[#64748B] mb-1.5">{comp.city}, {comp.state}</div>
                <div className="flex gap-2 flex-wrap mb-1">
                  <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                    <svg className="w-3 h-3 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"/>
                    </svg>
                    {comp.beds}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                    <svg className="w-3 h-3 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {comp.baths}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                    <svg className="w-3 h-3 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z"/>
                    </svg>
                    {formatNumber(comp.sqft)}
                  </span>
                  {comp.lotSize !== undefined && (
                    <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                      <svg className="w-3 h-3 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25"/>
                      </svg>
                      {comp.lotSize}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#94A3B8]">
                  Sold {comp.soldDate} · <span className="text-[#0891B2]">{comp.timeAgo}</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="flex flex-col items-end gap-0.5">
                <div className="text-base font-bold text-[#0A1628] tabular-nums">{formatPrice(comp.price)}</div>
                <div className="text-[11px] text-[#64748B]">${comp.pricePerSqft}/sf</div>
                <div className="text-right mt-1">
                  <div 
                    className="text-[22px] font-bold tabular-nums leading-none"
                    style={{ color: getMatchScoreColor(comp.matchScore) }}
                  >
                    {comp.matchScore}
                  </div>
                  <div className="text-[9px] text-[#94A3B8] uppercase">% Match</div>
                </div>
              </div>
            </div>

            {/* Expand Button */}
            <button
              className={`flex items-center justify-center gap-1 py-2 w-full border-t border-[#F1F5F9] text-[#0891B2] text-xs font-medium hover:bg-[#F8FAFC] transition-colors`}
              onClick={() => setExpandedComp(expandedComp === comp.id ? null : comp.id)}
            >
              Details
              <svg 
                className={`w-3.5 h-3.5 transition-transform ${expandedComp === comp.id ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        ))}
      </main>

      {/* Toast Message */}
      {saveMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg z-50">
          {saveMessage}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 border-t border-[#E2E8F0] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Search Button */}
        <button 
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-transparent border-none cursor-pointer text-[#64748B] hover:text-[#0891B2] transition-colors"
          onClick={() => router.push('/search')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <span className="text-[10px] font-medium">Search</span>
        </button>

        {/* Save Button */}
        <button 
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-transparent border-none cursor-pointer transition-colors ${
            isSaved ? 'text-[#0891B2]' : 'text-[#64748B] hover:text-[#0891B2]'
          }`}
          onClick={handleSave}
        >
          <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
          </svg>
          <span className="text-[10px] font-medium">{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        {/* Analyze Property Button - Primary CTA */}
        <button 
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#0891B2] text-white border-none rounded-xl text-sm font-semibold cursor-pointer hover:bg-[#0E7490] transition-colors"
          onClick={handleAnalyze}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
          </svg>
          Analyze Property
        </button>

        {/* Share Button */}
        <button 
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-transparent border-none cursor-pointer text-[#64748B] hover:text-[#0891B2] transition-colors"
          onClick={handleShare}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
          </svg>
          <span className="text-[10px] font-medium">Share</span>
        </button>
      </div>

      {/* CSS for tabular-nums */}
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>
    </div>
  )
}

export default SalesCompsScreen
