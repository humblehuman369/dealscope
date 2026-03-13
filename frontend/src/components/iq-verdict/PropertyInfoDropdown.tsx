'use client'

/**
 * PropertyInfoDropdown Component
 * 
 * Clean property address dropdown with:
 * - "PROPERTY" label
 * - Single-line full address with expand chevron
 * - 2x3 stat grid when expanded (Beds/Baths/Sqft on top, Value/Rent/Status on bottom)
 */

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronUp, Home } from 'lucide-react'

interface PropertyInfoDropdownProps {
  address: string
  city: string
  state: string
  zip: string
  beds: number
  baths: number
  sqft: number
  estimatedValue: number
  estimatedRent: number
  status: string
  imageUrl?: string
  defaultOpen?: boolean
}

// Format currency
function formatCurrency(value: number): string {
  return '$' + Math.round(value).toLocaleString()
}

// Format number with commas
function formatNumber(value: number): string {
  return value.toLocaleString()
}

export function PropertyInfoDropdown({
  address,
  city,
  state,
  zip,
  beds,
  baths,
  sqft,
  estimatedValue,
  estimatedRent,
  status,
  imageUrl,
  defaultOpen = false,
}: PropertyInfoDropdownProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])
  
  const fullAddress = `${address}, ${city}, ${state} ${zip}`
  const displayStatus = status === 'OFF_MARKET' || status === 'OFF-MARKET' ? 'Off-Market' : status

  return (
    <div className="bg-[var(--surface-card)] border-b border-[var(--border-subtle)]">
      {/* Clickable Header */}
      <button 
        className="w-full flex items-center justify-between px-5 py-3 bg-transparent border-none cursor-pointer hover:bg-[var(--surface-section)] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {/* Pin Icon */}
          <div className="w-6 h-6 rounded-full border-2 border-[var(--accent-sky)] flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-sky)]" />
          </div>
          
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-[var(--accent-sky)] uppercase tracking-wide font-semibold">
              Property
            </span>
            <span className="text-sm text-[var(--text-heading)] font-medium">
              {fullAddress}
            </span>
          </div>
        </div>
        
        <ChevronUp 
          className={`w-5 h-5 text-[var(--text-label)] transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}
        />
      </button>

      {/* Expandable Content */}
      {isOpen && (
        <div className="px-5 pb-4">
          <div className="flex gap-4">
            {/* Property Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface-elevated)]">
              {imageUrl && !imageFailed ? (
                <Image
                  src={imageUrl}
                  alt="Property"
                  className="w-full h-full object-cover"
                  width={64}
                  height={64}
                  unoptimized
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-6 h-6 text-[var(--text-label)]" />
                </div>
              )}
            </div>

            {/* 2x3 Stats Grid */}
            <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-2">
              {/* Top Row: Beds, Baths, Sqft */}
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--text-heading)]">{beds}</span>
                <span className="text-[10px] text-[var(--text-label)] uppercase tracking-wide">Beds</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--text-heading)]">{baths}</span>
                <span className="text-[10px] text-[var(--text-label)] uppercase tracking-wide">Baths</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--text-heading)]">{formatNumber(sqft)}</span>
                <span className="text-[10px] text-[var(--text-label)] uppercase tracking-wide">Sqft</span>
              </div>

              {/* Bottom Row: Est. Value, Est. Rent, Status */}
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--accent-sky)]">{formatCurrency(estimatedValue)}</span>
                <span className="text-[10px] text-[var(--text-label)] uppercase tracking-wide">Est. Value</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--accent-sky)]">{formatCurrency(estimatedRent)}</span>
                <span className="text-[10px] text-[var(--text-label)] uppercase tracking-wide">Est. Rent</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--text-heading)]">{displayStatus}</span>
                <span className="text-[10px] text-[var(--text-label)] uppercase tracking-wide">Status</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyInfoDropdown
