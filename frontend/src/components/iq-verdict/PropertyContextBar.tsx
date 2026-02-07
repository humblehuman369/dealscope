'use client'

/**
 * PropertyContextBar Component - Decision-Grade UI
 * 
 * Displays property photo, address, status, and key details.
 * Per DealMakerIQ Design System - high contrast, legibility-first.
 */

import React from 'react'
import Image from 'next/image'
import { Home } from 'lucide-react'
import { formatPrice } from '@/utils/formatters'

interface PropertyContextBarProps {
  address: string
  city?: string
  state?: string
  zip?: string
  beds: number
  baths: number
  sqft: number
  price: number
  status?: 'active' | 'pending' | 'off-market' | 'sold'
  imageUrl?: string
}

export function PropertyContextBar({
  address,
  city,
  state,
  zip,
  beds,
  baths,
  sqft,
  price,
  status = 'off-market',
  imageUrl,
}: PropertyContextBarProps) {
  const cityStateZip = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  
  const statusLabel = {
    'active': 'Active',
    'pending': 'Pending',
    'off-market': 'Off-Market',
    'sold': 'Sold',
  }[status] || 'Off-Market'
  
  return (
    <div className="dg-property-context">
      {/* Property Photo */}
      <div className="dg-property-photo">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={address}
            width={56}
            height={56}
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <Home className="w-6 h-6" style={{ color: 'var(--dg-border-strong)' }} />
        )}
      </div>
      
      {/* Property Info */}
      <div className="dg-property-info">
        <div className="dg-property-address-row">
          <div>
            <div className="dg-property-street">{address}</div>
            {cityStateZip && <div className="dg-property-city">{cityStateZip}</div>}
          </div>
          <span className={`dg-property-status ${status}`}>
            <span className="dg-status-dot" />
            {statusLabel}
          </span>
        </div>
        <div className="dg-property-details">
          <span>{beds} Beds</span>
          <span className="separator">|</span>
          <span>{baths} Baths</span>
          <span className="separator">|</span>
          <span>{sqft.toLocaleString()} SqFt</span>
          <span className="separator">|</span>
          <span className="dg-property-price">{formatPrice(price)}</span>
        </div>
      </div>
    </div>
  )
}

export default PropertyContextBar
