'use client'

/**
 * RentalCompsScreen Component (Similar Rents)
 * 
 * Rental comparables page featuring:
 * - CompactHeader with strategy selector
 * - RentCast Estimate card with editable value
 * - Selectable rental comp cards with match scores
 * - Bottom action bar
 * 
 * Uses DealGapIQ Universal Style Guide colors
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { formatPrice, formatNumber } from '@/utils/formatters'
// Note: CompactHeader removed - now using global AppHeader from layout

// Types
export interface RentalCompProperty {
  id: number
  address: string
  city: string
  state: string
  beds: number
  baths: number
  sqft: number
  rent: number
  rentPerSqft: number
  listedDate: string
  timeAgo: string
  distance: number
  matchScore: number
  image?: string
}

export interface RentalCompsPropertyData {
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

interface RentalCompsScreenProps {
  property: RentalCompsPropertyData
  comps?: RentalCompProperty[]
  initialRentEstimate?: number
  rentRangeLow?: number
  rentRangeHigh?: number
  rentConfidence?: number
  estCapRate?: number
  initialStrategy?: string
}

// Default comps for demo
const DEFAULT_COMPS: RentalCompProperty[] = [
  {
    id: 0,
    address: '1149 SW 11th Street',
    city: 'Boca Raton',
    state: 'FL',
    beds: 3,
    baths: 2,
    sqft: 1756,
    rent: 3100,
    rentPerSqft: 1.77,
    listedDate: 'Dec 14, 2025',
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
    rent: 3400,
    rentPerSqft: 1.83,
    listedDate: 'Jan 8, 2026',
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
    rent: 3250,
    rentPerSqft: 1.88,
    listedDate: 'Oct 23, 2025',
    timeAgo: '3mo ago',
    distance: 0.34,
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
    rent: 3150,
    rentPerSqft: 1.82,
    listedDate: 'Nov 24, 2025',
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
    rent: 3500,
    rentPerSqft: 1.74,
    listedDate: 'Sep 23, 2025',
    timeAgo: '4mo ago',
    distance: 0.52,
    matchScore: 91.3,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop',
  },
]

export function RentalCompsScreen({ 
  property, 
  comps: propsComps,
  initialRentEstimate,
  rentRangeLow = 2850,
  rentRangeHigh = 3550,
  rentConfidence = 94,
  estCapRate = 4.7,
  initialStrategy 
}: RentalCompsScreenProps) {
  const router = useRouter()
  
  // State
  const [_currentStrategy] = useState(initialStrategy || 'Long-term')
  const [selectedComps, setSelectedComps] = useState<number[]>([0, 2, 3])
  const [expandedComp, setExpandedComp] = useState<number | null>(null)
  const [rentEstimate, setRentEstimate] = useState(initialRentEstimate || property.rent || 3200)
  const [isEditingRent, setIsEditingRent] = useState(false)

  const comps = propsComps || DEFAULT_COMPS
  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  const [shareMessage, setShareMessage] = useState<string | null>(null)

  // Calculated metrics
  const rentPerSqft = property.sqft > 0 ? (rentEstimate / property.sqft).toFixed(2) : '0.00'
  const annualGross = rentEstimate * 12
  const estNOI = Math.round(annualGross * 0.6) // 60% NOI ratio

  // Note: Header is now handled by global AppHeader

  const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    const newValue = value ? parseInt(value) : 0
    setRentEstimate(newValue)
  }

  const handleRentBlur = () => {
    setIsEditingRent(false)
  }

  const handleRentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingRent(false)
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

  const handleApplyRent = () => {
    // Navigate to verdict with rent estimate
    router.push(`/verdict?address=${encodeURIComponent(fullAddress)}&rent=${rentEstimate}`)
  }

  const handleRefresh = () => {
    // Refresh comps data
    console.warn('Refreshing rental comps...')
  }

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rental Comps - ${property.address}`,
          text: `Check out these rental comps for ${fullAddress}`,
          url: window.location.href
        })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setShareMessage('Link copied!')
      setTimeout(() => setShareMessage(null), 2000)
    }
  }

  // Handle analyze
  const handleAnalyze = () => {
    router.push(`/verdict?address=${encodeURIComponent(fullAddress)}`)
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'var(--accent-sky)'
    return 'var(--text-secondary)'
  }

  return (
    <div className="min-h-screen bg-[var(--surface-section)] max-w-[480px] mx-auto font-['Inter',sans-serif]">
      {/* Header is now handled by global AppHeader in layout */}

      {/* Main Content */}
      <main className="pb-[100px]">
        {/* Section Header */}
        <div className="flex justify-between items-start p-4 bg-[var(--surface-card)] border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-heading)]">Rental Comps & RentCast Estimate</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Comparable rentals for {property.address}</p>
          </div>
          <button 
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--surface-section)] hover:border-[var(--border-default)] transition-colors"
            onClick={handleRefresh}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Rent Estimate Card */}
        <div className="bg-[var(--surface-card)] p-4 border-b border-[var(--border-default)]">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-sky-dim)] to-[var(--surface-elevated)] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[var(--accent-sky)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
              </svg>
            </div>

            {/* Rent Details */}
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-[var(--accent-sky)] uppercase tracking-wider mb-0.5">RentCast Estimate</div>
              <div className="flex items-baseline gap-0.5">
                {isEditingRent ? (
                  <input
                    type="text"
                    className="text-[26px] font-extrabold text-[var(--text-heading)] tabular-nums border-2 border-[var(--accent-sky)] rounded-lg px-2 py-1 w-32 outline-none focus:ring-2 focus:ring-[var(--accent-sky)]/20 font-inherit"
                    value={rentEstimate}
                    onChange={handleRentChange}
                    onBlur={handleRentBlur}
                    onKeyDown={handleRentKeyDown}
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-[26px] font-extrabold text-[var(--text-heading)] tabular-nums cursor-pointer hover:text-[var(--accent-sky)] transition-colors"
                    onClick={() => setIsEditingRent(true)}
                    title="Click to edit"
                  >
                    {formatPrice(rentEstimate)}
                  </span>
                )}
                <span className="text-sm font-medium text-[var(--text-secondary)]">/mo</span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Range: {formatPrice(rentRangeLow)} — {formatPrice(rentRangeHigh)}
              </div>
            </div>

            {/* Metrics & Apply */}
            <div className="flex items-start gap-4 ml-auto">
              <div className="text-center">
                <div className="text-base font-bold text-[var(--text-heading)]">{estCapRate}%</div>
                <div className="text-[9px] font-medium text-[var(--text-label)] uppercase">Est. Cap Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[var(--accent-sky)]">{rentConfidence}</div>
                <div className="text-[9px] font-medium text-[var(--text-label)] uppercase">Confidence</div>
              </div>
              <button 
                className="px-4 py-2.5 bg-[var(--accent-sky)] text-[var(--text-inverse)] rounded-lg text-[13px] font-semibold hover:bg-[var(--accent-sky-light)] transition-colors"
                onClick={handleApplyRent}
              >
                Apply Rent
              </button>
            </div>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="bg-[var(--surface-section)] rounded-lg p-2.5 text-center">
              <div className="text-[9px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Rent/Sq.Ft.</div>
              <div className="text-base font-bold text-[var(--text-heading)] tabular-nums">${rentPerSqft}</div>
            </div>
            <div className="bg-[var(--surface-section)] rounded-lg p-2.5 text-center">
              <div className="text-[9px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Annual Gross</div>
              <div className="text-base font-bold text-[var(--accent-sky)] tabular-nums">{formatPrice(annualGross)}</div>
            </div>
            <div className="bg-[var(--surface-section)] rounded-lg p-2.5 text-center">
              <div className="text-[9px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Est. NOI (60%)</div>
              <div className="text-base font-bold text-[var(--text-heading)] tabular-nums">{formatPrice(estNOI)}</div>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="flex justify-between items-center px-4 py-3 bg-[var(--surface-card)] border-b border-[var(--border-default)]">
          <div className="text-[13px] text-[var(--text-secondary)]">
            <strong className="text-[var(--text-heading)]">{selectedComps.length}</strong> of <strong className="text-[var(--text-heading)]">{comps.length}</strong> rentals selected
          </div>
          <div className="flex gap-4">
            <button className="text-[var(--accent-sky)] text-[13px] font-medium hover:text-[var(--accent-sky-light)]" onClick={selectAllComps}>
              Select All
            </button>
            <button className="text-[var(--accent-sky)] text-[13px] font-medium hover:text-[var(--accent-sky-light)]" onClick={clearComps}>
              Clear
            </button>
          </div>
        </div>

        {/* Comp Cards */}
        {comps.map((comp) => (
          <div
            key={comp.id}
            className={`bg-[var(--surface-card)] border-b border-[var(--border-default)] border-l-[3px] overflow-hidden transition-all ${
              selectedComps.includes(comp.id) ? 'border-l-[var(--accent-sky)] bg-[var(--surface-section)]' : 'border-l-transparent'
            }`}
          >
            <div className="flex p-4 gap-3">
              {/* Image Container */}
              <div className="relative w-[120px] h-[90px] flex-shrink-0">
                <Image
                  className="w-full h-full object-cover rounded-lg" 
                  src={comp.image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop'} 
                  alt={comp.address} 
                  width={120}
                  height={90}
                  unoptimized
                />
                {/* Checkbox */}
                <div
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    selectedComps.includes(comp.id) 
                      ? 'bg-[var(--accent-sky)] border-[var(--accent-sky)]' 
                      : 'bg-[var(--surface-card)] border-2 border-[var(--border-default)]'
                  }`}
                  onClick={() => toggleCompSelection(comp.id)}
                >
                  <svg className={`w-3 h-3 text-[var(--text-inverse)] ${selectedComps.includes(comp.id) ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                {/* Distance Badge */}
                <div className="absolute bottom-1 left-1 bg-[var(--accent-sky)] text-[var(--text-inverse)] px-1.5 py-0.5 rounded text-[9px] font-semibold">
                  {comp.distance.toFixed(2)} mi
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--text-heading)] truncate">{comp.address}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mb-1.5">{comp.city}, {comp.state}</div>
                <div className="flex gap-2 flex-wrap mb-1">
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                    <svg className="w-3 h-3 text-[var(--text-label)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"/>
                    </svg>
                    {comp.beds}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                    <svg className="w-3 h-3 text-[var(--text-label)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {comp.baths}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                    <svg className="w-3 h-3 text-[var(--text-label)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z"/>
                    </svg>
                    {formatNumber(comp.sqft)}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-label)]">
                  Listed {comp.listedDate} · <span className="text-[var(--accent-sky)]">{comp.timeAgo}</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="flex flex-col items-end gap-0.5">
                <div className="text-base font-bold text-[var(--text-heading)] tabular-nums">
                  {formatPrice(comp.rent)}<span className="text-xs font-medium text-[var(--text-secondary)]">/mo</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">${comp.rentPerSqft}/sf</div>
                <div className="text-right mt-1">
                  <div 
                    className="text-[22px] font-bold tabular-nums leading-none"
                    style={{ color: getMatchScoreColor(comp.matchScore) }}
                  >
                    {comp.matchScore}
                  </div>
                  <div className="text-[9px] text-[var(--text-label)] uppercase">% Match</div>
                </div>
              </div>
            </div>

            {/* Expand Button */}
            <button
              className={`flex items-center justify-center gap-1 py-2 w-full border-t border-[var(--border-subtle)] text-[var(--accent-sky)] text-xs font-medium hover:bg-[var(--surface-section)] transition-colors`}
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
      {shareMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 bg-[var(--surface-base)] text-[var(--text-heading)] text-sm font-medium rounded-lg shadow-[var(--shadow-dropdown)] z-50 border border-[var(--border-default)]">
          {shareMessage}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[var(--surface-card)] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] shadow-[var(--shadow-dropdown)]">
        {/* Search Button */}
        <button 
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-transparent border-none cursor-pointer text-[var(--text-secondary)] hover:text-[var(--accent-sky)] transition-colors"
          onClick={() => router.push('/search')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <span className="text-[10px] font-medium">Search</span>
        </button>

        {/* Analyze Property Button - Primary CTA */}
        <button 
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[var(--accent-sky)] text-[var(--text-inverse)] border-none rounded-xl text-sm font-semibold cursor-pointer hover:bg-[var(--accent-sky-light)] transition-colors"
          onClick={handleAnalyze}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
          </svg>
          Analyze Property
        </button>

        {/* Share Button */}
        <button 
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-transparent border-none cursor-pointer text-[var(--text-secondary)] hover:text-[var(--accent-sky)] transition-colors"
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

export default RentalCompsScreen
