'use client'

import { ReactNode, useState } from 'react'
import { ChevronLeft, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { WorksheetTabNav } from './WorksheetTabNav'
import { WorksheetStrategyId } from '@/constants/worksheetStrategies'
import { SavedProperty, getShortAddress, getCityStateZip } from '@/types/savedProperty'

interface WorksheetShellProps {
  property: SavedProperty
  propertyId: string
  strategy: WorksheetStrategyId
  children: ReactNode
}

export function WorksheetShell({
  property,
  propertyId,
  strategy,
  children,
}: WorksheetShellProps) {
  const propertyData = property.property_data_snapshot || {}
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const shortAddress = getShortAddress(property)
  const cityStateZip = getCityStateZip(property)
  const details = `${propertyData.bedrooms || 0} BR • ${propertyData.bathrooms || 0} BA • ${(propertyData.sqft || 0).toLocaleString()} Sq.Ft.`
  const listPrice = propertyData.listPrice || 0

  return (
    <div className={`worksheet-container-v2 ${strategy}-strategy`}>
      {/* Top Navigation Bar - Responsive */}
      <header className="worksheet-topbar">
        {/* Left Section: Back + Property Info */}
        <div className="worksheet-topbar-left">
          <Link href="/dashboard" className="worksheet-back-link">
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          
          {/* Property Info - Responsive layout */}
          <div className="worksheet-property-info">
            <h1 className="worksheet-property-title" title={shortAddress}>
              {shortAddress}
            </h1>
            <p className="worksheet-property-subtitle">
              <span className="hidden md:inline">{cityStateZip} • {details}</span>
              <span className="md:hidden">{cityStateZip}</span>
            </p>
          </div>
        </div>

        {/* Right Section: Price Badge */}
        <div className="worksheet-topbar-right">
          <div className="worksheet-price-badge">
            ${listPrice.toLocaleString()}
          </div>
          
          {/* Mobile Menu Toggle - Only visible on small screens */}
          <button
            className="worksheet-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Horizontal Tab Navigation - With responsive handling */}
      <WorksheetTabNav 
        propertyId={propertyId} 
        strategy={strategy}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area - Full Width with responsive padding */}
      <div className="worksheet-main-area full-width">
        <main className="worksheet-content-area full-width">
          {children}
        </main>
      </div>
    </div>
  )
}
