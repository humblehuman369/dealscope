'use client'

/**
 * PropertyDetailsScreen Component
 * 
 * Mobile-first property details page featuring:
 * - CompactHeader with strategy selector
 * - Image gallery with thumbnails
 * - Property facts with key specs hero cards
 * - Features & amenities tabs
 * - Bottom action bar
 * 
 * Uses InvestIQ Universal Style Guide colors
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
// Note: CompactHeader removed - now using global AppHeader from layout
import { PropertyData } from './types'

// Helper functions
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

interface PropertyDetailsScreenProps {
  property: PropertyData
  initialStrategy?: string
}

export function PropertyDetailsScreen({ property, initialStrategy }: PropertyDetailsScreenProps) {
  const router = useRouter()
  // Auth context is used in global AppHeader for save functionality
  useSession()
  
  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Accordion state
  const [expandedSections, setExpandedSections] = useState({
    facts: true,
    features: false,
    location: false,
  })
  
  // Feature tabs state
  const [activeFeatureTab, setActiveFeatureTab] = useState<'interior' | 'exterior' | 'appliances'>('interior')
  
  // Strategy state
  const [currentStrategy, setCurrentStrategy] = useState(initialStrategy || 'Long-term')
  

  const fullAddress = `${property.address.streetAddress}, ${property.address.city}, ${property.address.state} ${property.address.zipcode}`

  // Note: Header is now handled by global AppHeader

  // Key specs for the hero row
  const keySpecs = [
    { label: 'Beds', value: property.bedrooms, icon: 'bed' },
    { label: 'Baths', value: property.bathrooms, icon: 'bath' },
    { label: 'Sqft', value: formatNumber(property.livingArea), icon: 'sqft' },
    { label: 'Built', value: property.yearBuilt || 'N/A', icon: 'calendar' },
  ]

  // Property facts
  const propertyFacts = [
    { label: 'PRICE/SQFT', value: property.livingArea ? `$${Math.round(property.price / property.livingArea)}` : 'N/A', icon: 'dollar' },
    { label: 'LOT SIZE', value: property.lotSize ? `${formatNumber(property.lotSize)} sqft` : 'N/A', subValue: property.lotSizeAcres ? `${property.lotSizeAcres} acres` : undefined, icon: 'grid' },
    { label: 'PROPERTY TYPE', value: property.propertyType || 'N/A', icon: 'home' },
    { label: 'STORIES', value: property.stories || 'N/A', icon: 'layers' },
    { label: 'ZESTIMATE®', value: property.zestimate ? formatPrice(property.zestimate) : 'N/A', icon: 'trending', highlight: true },
    { label: 'RENT ZESTIMATE®', value: property.rentZestimate ? `${formatPrice(property.rentZestimate)}/mo` : 'N/A', icon: 'rent', highlight: true },
    { label: 'HOA FEE', value: property.hoaFee ? `${formatPrice(property.hoaFee)}/mo` : 'None', icon: 'shield' },
    { label: 'ANNUAL TAX', value: property.annualTax ? formatPrice(property.annualTax) : 'N/A', icon: 'receipt' },
    { label: 'PARKING', value: property.parkingSpaces ? `${property.parkingSpaces} spaces` : (property.parking?.join(', ') || 'N/A'), icon: 'car' },
    { label: 'HEATING', value: property.heating?.join(', ') || 'N/A', icon: 'flame' },
    { label: 'COOLING', value: property.cooling?.join(', ') || 'N/A', icon: 'snowflake' },
    { label: 'MLS #', value: property.mlsId || 'N/A', icon: 'hash' },
  ]

  const toggleSection = (section: 'facts' | 'features' | 'location') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleStrategyChange = (strategy: string) => {
    setCurrentStrategy(strategy)
  }

  const handleBack = () => {
    router.back()
  }

  // Icon renderers
  const renderFactIcon = (iconType: string) => {
    const icons: Record<string, React.ReactNode> = {
      bed: <><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V18a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 18V7.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18v3H3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M5.5 12V9a2 2 0 012-2h2a2 2 0 012 2v3"/><path strokeLinecap="round" strokeLinejoin="round" d="M12.5 12V9a2 2 0 012-2h2a2 2 0 012 2v3"/><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5V21m15-1.5V21"/></>,
      bath: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16v5a3 3 0 01-3 3H7a3 3 0 01-3-3v-5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 12V5a2 2 0 012-2h1a2 2 0 012 2v1"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 20v1m12-1v1"/></>,
      sqft: <><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></>,
      calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>,
      dollar: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
      grid: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>,
      home: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>,
      layers: <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"/>,
      trending: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>,
      rent: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"/>,
      shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>,
      receipt: <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>,
      car: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>,
      flame: <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>,
      snowflake: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>,
      hash: <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5"/>,
    }
    return (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        {icons[iconType]}
      </svg>
    )
  }

  // Get features for current tab
  const getCurrentFeatures = () => {
    switch (activeFeatureTab) {
      case 'interior':
        return property.interiorFeatures || []
      case 'exterior':
        return property.exteriorFeatures || []
      case 'appliances':
        return property.appliances || []
      default:
        return []
    }
  }

  const images = property.images || []
  const currentFeatures = getCurrentFeatures()

  return (
    <div className="min-h-screen bg-[#F1F5F9] max-w-[480px] mx-auto relative font-['Inter',sans-serif]">
      {/* Header is now handled by global AppHeader in layout */}

      {/* Main Content */}
      <main className="pb-6">
        {/* Image Gallery */}
        <section className="bg-white border-b border-[#CBD5E1]">
          {/* Main Image */}
          <div className="relative w-full h-60 overflow-hidden">
            {images.length > 0 ? (
              <img
                className="w-full h-full object-cover"
                src={images[currentImageIndex]}
                alt={`Property view ${currentImageIndex + 1}`}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                <span className="text-slate-400">No images available</span>
              </div>
            )}
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                  onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                  disabled={currentImageIndex === 0}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                  onClick={() => setCurrentImageIndex(i => Math.min(images.length - 1, i + 1))}
                  disabled={currentImageIndex === images.length - 1}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute top-3 right-3 bg-[#0A1628]/70 text-white px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
              </svg>
              {currentImageIndex + 1}/{images.length}
            </div>
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
              {images.slice(0, 12).map((img, idx) => (
                <img
                  key={idx}
                  className={`w-12 h-9 rounded-md object-cover cursor-pointer flex-shrink-0 border-2 transition-all ${
                    idx === currentImageIndex 
                      ? 'opacity-100 border-[#0891B2]' 
                      : 'opacity-60 border-transparent hover:opacity-90'
                  }`}
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Property Facts Accordion */}
        <div className="bg-white border-b border-[#CBD5E1] overflow-hidden">
          <div 
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
            onClick={() => toggleSection('facts')}
          >
            <svg className="w-6 h-6 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
            </svg>
            <span className="flex-1 text-sm font-semibold text-[#0A1628] uppercase tracking-wide">Property Facts</span>
            <svg 
              className={`w-5 h-5 text-[#94A3B8] transition-transform ${expandedSections.facts ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          
          {expandedSections.facts && (
            <div className="px-4 pb-4">
              {/* Key Specs Hero Row */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {keySpecs.map((spec, idx) => (
                  <div 
                    key={idx} 
                    className="bg-gradient-to-br from-[#0A1628] to-[#1E293B] rounded-[10px] px-2 py-2.5 flex flex-col items-center gap-0.5"
                  >
                    <div className="text-lg font-bold text-white tabular-nums">{spec.value}</div>
                    <div className="text-[10px] font-medium text-[#00D4FF] uppercase tracking-wide">{spec.label}</div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-[#E2E8F0] mb-3" />

              {/* Property Details List */}
              <div className="flex flex-col">
                {propertyFacts.map((fact, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between py-2.5 ${idx < propertyFacts.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#F1F5F9] rounded-md flex items-center justify-center text-[#64748B]">
                        {renderFactIcon(fact.icon)}
                      </div>
                      <span className="text-[13px] font-medium text-[#64748B]">{fact.label}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-sm font-semibold tabular-nums ${fact.highlight ? 'text-[#0891B2]' : 'text-[#0A1628]'}`}>
                        {fact.value}
                      </span>
                      {fact.subValue && <span className="text-[11px] text-[#94A3B8]">{fact.subValue}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Features & Amenities Accordion */}
        <div className="bg-white border-b border-[#CBD5E1] overflow-hidden">
          <div 
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
            onClick={() => toggleSection('features')}
          >
            <svg className="w-6 h-6 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
            </svg>
            <span className="flex-1 text-sm font-semibold text-[#0A1628] uppercase tracking-wide">Features & Amenities</span>
            <svg 
              className={`w-5 h-5 text-[#94A3B8] transition-transform ${expandedSections.features ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          
          {expandedSections.features && (
            <div className="px-4 pb-4">
              {/* Feature Tabs */}
              <div className="flex gap-2 mb-3">
                {(['interior', 'exterior', 'appliances'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-medium transition-all border-none cursor-pointer ${
                      activeFeatureTab === tab 
                        ? 'bg-[#0891B2] text-white' 
                        : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                    }`}
                    onClick={() => setActiveFeatureTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Features Content */}
              <div className="p-4 bg-[#F8FAFC] rounded-lg">
                {currentFeatures.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2">
                    {currentFeatures.map((feature, idx) => (
                      <li key={idx} className="text-[13px] text-[#64748B] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-[13px] text-[#94A3B8]">
                    No {activeFeatureTab} features listed
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Location Accordion */}
        <div className="bg-white overflow-hidden">
          <div 
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
            onClick={() => toggleSection('location')}
          >
            <svg className="w-6 h-6 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
            <span className="flex-1 text-sm font-semibold text-[#0A1628] uppercase tracking-wide">Location</span>
            <svg 
              className={`w-5 h-5 text-[#94A3B8] transition-transform ${expandedSections.location ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          
          {expandedSections.location && (
            <div className="px-4 pb-4">
              <div className="h-36 bg-gradient-to-br from-[#E2E8F0] to-[#CBD5E1] rounded-lg flex flex-col items-center justify-center gap-2">
                <svg className="w-8 h-8 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                </svg>
                <div className="text-xs text-[#64748B] text-center px-4">{fullAddress}</div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CSS for tabular-nums */}
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>
    </div>
  )
}
