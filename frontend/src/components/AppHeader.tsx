'use client'

/**
 * AppHeader Component
 * 
 * Unified header for all pages in the DealMakerIQ app (except homepage).
 * Combines:
 * - Dark navy brand bar with DealMakerIQ logo and icons
 * - White tab bar with navigation tabs
 * - Optional property address bar (for property-specific pages)
 * 
 * Layout:
 * ┌─────────────────────────────────────────────────┐
 * │  DealMakerIQ          [🔍] [👤]                 │  ← Dark navy bar
 * │  by InvestIQ                                    │
 * ├─────────────────────────────────────────────────┤
 * │  [Analyze]  Details  Sale Comps  Rent Comps  Dashboard│  ← White tab bar
 * ├─────────────────────────────────────────────────┤
 * │  🏠 1451 Sw 10th St, Boca Raton, FL 33486   ▼  │  ← Property bar (optional)
 * └─────────────────────────────────────────────────┘
 */

import React, { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, User, ChevronDown, ChevronUp } from 'lucide-react'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

// ===================
// DESIGN TOKENS (synced with verdict-design-tokens.ts)
// ===================

const colors = {
  background: {
    deepNavy: '#0f1031',
    white: '#FFFFFF',
  },
  brand: {
    teal: '#0891B2',
    tealBright: '#0891B2',
  },
  text: {
    white: '#FFFFFF',
    primary: '#171717',
    secondary: '#525252',
  },
  ui: {
    border: '#E5E5E5',
  },
}

// ===================
// TYPES
// ===================

export type AppTab = 'analyze' | 'details' | 'sale-comps' | 'rent' | 'dashboard'

interface PropertyInfo {
  address: string
  city: string
  state: string
  zip: string
  beds?: number
  baths?: number
  sqft?: number
  price?: number
  zpid?: string
}

interface AppHeaderProps {
  /** Currently active tab */
  activeTab?: AppTab
  /** Whether to show the tab bar */
  showTabs?: boolean
  /** Whether to show the property address bar */
  showPropertyBar?: boolean
  /** Property information for the address bar */
  property?: PropertyInfo
  /** Full address string (alternative to property object) */
  propertyAddress?: string
}

// ===================
// TAB CONFIGURATION
// ===================

const TABS: { id: AppTab; label: string }[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'details', label: 'Details' },
  { id: 'sale-comps', label: 'Sale Comps' },
  { id: 'rent', label: 'Rent Comps' },
  { id: 'dashboard', label: 'Dashboard' },
]

// ===================
// ROUTE DETECTION
// ===================

// Pages where header should be completely hidden
const HIDDEN_ROUTES = ['/']

// Pages where property bar should NOT be shown
const NO_PROPERTY_BAR_ROUTES = [
  '/dashboard',
  '/profile',
  '/search',
  '/billing',
  '/search-history',
  '/national-averages',
  '/onboarding',
  '/verify-email',
  '/reset-password',
  '/forgot-password',
]

// Map routes to active tabs
function getActiveTabFromPath(pathname: string): AppTab {
  if (pathname.startsWith('/verdict')) return 'analyze'
  if (pathname.startsWith('/property/')) return 'details'
  if (pathname.startsWith('/compare')) return 'sale-comps'
  if (pathname.startsWith('/rental-comps')) return 'rent'
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/deal-maker')) return 'analyze'
  return 'analyze'
}

// ===================
// HELPER FUNCTIONS
// ===================

function formatShortPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`
  }
  return `$${(price / 1000).toFixed(0)}K`
}

// ===================
// COMPONENT
// ===================

export function AppHeader({
  activeTab: activeTabProp,
  showTabs = true,
  showPropertyBar: showPropertyBarProp,
  property,
  propertyAddress,
}: AppHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [isPropertyExpanded, setIsPropertyExpanded] = useState(false)

  // Determine if header should be hidden
  if (HIDDEN_ROUTES.includes(pathname || '')) {
    return null
  }

  // Determine active tab from prop or pathname
  const activeTab = activeTabProp || getActiveTabFromPath(pathname || '')

  // Determine if property bar should be shown
  const shouldShowPropertyBar = showPropertyBarProp !== undefined 
    ? showPropertyBarProp 
    : !NO_PROPERTY_BAR_ROUTES.some(route => pathname?.startsWith(route))

  // Get address from URL params if not provided
  // Use decodeURIComponent to handle any double-encoding that may have occurred
  const addressFromUrl = searchParams?.get('address') || ''
  const decodedAddressFromUrl = addressFromUrl ? decodeURIComponent(addressFromUrl) : ''
  const displayAddress = propertyAddress || decodedAddressFromUrl || (property 
    ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
    : '')

  // Navigation handlers
  const handleLogoClick = () => {
    router.push('/')
  }

  const handleSearchClick = () => {
    setShowSearchModal(true)
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  const handleTabChange = (tab: AppTab) => {
    // Build address params for navigation
    const encodedAddress = encodeURIComponent(displayAddress)
    
    // Check multiple possible sources for zpid/propertyId
    // 1. From property prop
    // 2. From URL params (zpid or propertyId)
    // 3. From pathname (e.g., /property/12345)
    // 4. From sessionStorage (set by verdict page after API fetch)
    let zpid = property?.zpid || searchParams?.get('zpid') || searchParams?.get('propertyId') || ''
    
    // Extract zpid from pathname if on property details page
    if (!zpid && pathname?.startsWith('/property/')) {
      const pathParts = pathname.split('/')
      if (pathParts.length >= 3 && pathParts[2]) {
        zpid = pathParts[2]
      }
    }
    
    // Fallback: check sessionStorage for current property zpid
    if (!zpid && typeof window !== 'undefined') {
      try {
        const sessionData = sessionStorage.getItem('dealMakerOverrides')
        if (sessionData) {
          const parsed = JSON.parse(sessionData)
          if (parsed.zpid) {
            zpid = String(parsed.zpid)
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    switch (tab) {
      case 'analyze':
        if (displayAddress) {
          router.push(`/verdict?address=${encodedAddress}`)
        } else {
          router.push('/search')
        }
        break
      case 'details':
        if (zpid && displayAddress) {
          router.push(`/property/${zpid}?address=${encodedAddress}`)
        } else if (displayAddress) {
          router.push(`/search?q=${encodedAddress}`)
        } else {
          router.push('/search')
        }
        break
      case 'sale-comps':
        if (displayAddress) {
          router.push(`/compare?address=${encodedAddress}`)
        } else {
          router.push('/search')
        }
        break
      case 'rent':
        if (displayAddress) {
          router.push(`/rental-comps?address=${encodedAddress}`)
        } else {
          router.push('/search')
        }
        break
      case 'dashboard':
        router.push('/dashboard')
        break
    }
  }

  const handlePropertyClick = () => {
    if (property?.zpid && displayAddress) {
      router.push(`/property/${property.zpid}?address=${encodeURIComponent(displayAddress)}`)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Brand Bar - Dark Navy */}
        <div 
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: colors.background.deepNavy }}
        >
          {/* Logo - Clickable to go home */}
          <button 
            onClick={handleLogoClick}
            className="flex flex-col cursor-pointer bg-transparent border-none hover:opacity-80 transition-opacity"
          >
            <div className="flex items-baseline">
              <span 
                className="text-lg font-bold tracking-tight"
                style={{ color: colors.text.white }}
              >
                DealMaker
              </span>
              <span 
                className="text-lg font-bold tracking-tight"
                style={{ color: colors.brand.teal }}
              >
                IQ
              </span>
            </div>
            <span 
              className="text-[12px] font-medium -mt-0.5 text-left"
              style={{ color: colors.text.white }}
            >
              by InvestIQ
            </span>
          </button>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSearchClick}
              className="p-2 rounded-full transition-colors hover:bg-white/10"
              aria-label="Search properties"
            >
              <Search 
                className="w-5 h-5" 
                style={{ color: colors.text.white }}
              />
            </button>
            <button
              onClick={handleProfileClick}
              className="p-2 rounded-full transition-colors hover:bg-white/10"
              aria-label="Profile"
            >
              <User 
                className="w-5 h-5" 
                style={{ color: colors.text.white }}
              />
            </button>
          </div>
        </div>

        {/* Tab Bar - White, rectangular tabs touching side by side */}
        {showTabs && (
          <div 
            className="flex items-stretch overflow-x-auto scrollbar-hide"
            style={{ 
              backgroundColor: colors.background.white,
              borderBottom: `1px solid ${colors.ui.border}`,
            }}
          >
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 px-4 py-[7px] text-sm font-medium 
                    transition-all whitespace-nowrap border-r last:border-r-0
                  `}
                  style={{
                    backgroundColor: isActive ? colors.background.deepNavy : 'transparent',
                    color: isActive ? colors.text.white : colors.text.secondary,
                    borderColor: colors.ui.border,
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Property Address Bar - Optional */}
        {shouldShowPropertyBar && displayAddress && (
          <div 
            className="bg-white border-b"
            style={{ borderColor: colors.ui.border }}
          >
            {/* Collapsed Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Analysis House Icon */}
                <svg 
                  viewBox="0 0 131.13 95.2" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 flex-shrink-0"
                  style={{ fill: colors.brand.tealBright }}
                >
                  <path d="m87.27 65.54c-8.76 0-17-3.41-23.18-9.59s-9.59-14.41-9.59-23.17 3.39-16.94 9.54-23.12l-8.2-8.21c-1.93-1.93-5.06-1.93-6.98 0l-16.31 16.33v-4.2c0-1.39-1.13-2.51-2.52-2.51h-11.09c-1.39 0-2.52 1.13-2.52 2.52v20.35l-15.33 15.33c-2.32 2.32-.7 6.29 2.58 6.33l9.46.09v37.13c0 1.32 1.07 2.38 2.38 2.38h23.44c1.32 0 2.38-1.07 2.38-2.38v-24.79h22.02v24.79c0 1.32 1.07 2.38 2.38 2.38h23.44c1.32 0 2.38-1.07 2.38-2.38v-27.6c-1.43.19-2.86.32-4.3.32z"/>
                  <path d="m115.85 53.34c-.88-.88-2.23-1.02-3.26-.43l-4.17-4.17c7.84-10.38 7.04-25.25-2.41-34.7-5-5-11.66-7.76-18.74-7.76s-13.73 2.76-18.74 7.76c-10.33 10.33-10.33 27.14 0 37.47 5.17 5.17 11.95 7.75 18.74 7.75 5.63 0 11.26-1.78 15.96-5.34l4.17 4.17c-.6 1.03-.45 2.38.43 3.26l13.63 13.63c2.21 2.21 5.8 2.21 8.02 0 2.21-2.21 2.21-5.8 0-8.02l-13.63-13.63zm-43.1-6.05c-8.01-8.01-8.01-21.03 0-29.04 3.88-3.88 9.03-6.01 14.52-6.01s10.64 2.14 14.52 6.01c8.01 8.01 8.01 21.03 0 29.04-4 4-9.26 6-14.52 6s-10.52-2-14.52-6z"/>
                </svg>
                <button
                  onClick={handlePropertyClick}
                  className="font-medium text-sm truncate hover:underline transition-colors text-left"
                  style={{ color: colors.text.primary }}
                  title="View property details"
                >
                  {displayAddress}
                </button>
              </div>
              {property && (
                <button
                  onClick={() => setIsPropertyExpanded(!isPropertyExpanded)}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors flex-shrink-0 ml-2"
                  aria-label={isPropertyExpanded ? 'Collapse details' : 'Expand details'}
                >
                  {isPropertyExpanded ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              )}
            </div>

            {/* Expanded Details - 4 columns */}
            {isPropertyExpanded && property && (
              <div 
                className="grid grid-cols-4 gap-2 px-4 pb-3 border-t"
                style={{ borderColor: colors.ui.border }}
              >
                {property.beds !== undefined && (
                  <div className="text-center pt-3">
                    <div className="text-xs text-neutral-500 mb-0.5">Beds</div>
                    <div className="font-semibold text-neutral-800">{property.beds}</div>
                  </div>
                )}
                {property.baths !== undefined && (
                  <div className="text-center pt-3">
                    <div className="text-xs text-neutral-500 mb-0.5">Baths</div>
                    <div className="font-semibold text-neutral-800">{property.baths}</div>
                  </div>
                )}
                {property.sqft !== undefined && (
                  <div className="text-center pt-3">
                    <div className="text-xs text-neutral-500 mb-0.5">Sqft</div>
                    <div className="font-semibold text-neutral-800">{property.sqft.toLocaleString()}</div>
                  </div>
                )}
                {property.price !== undefined && (
                  <div className="text-center pt-3">
                    <div className="text-xs text-neutral-500 mb-0.5">Price</div>
                    <div className="font-semibold text-neutral-800">{formatShortPrice(property.price)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Search Modal */}
      <SearchPropertyModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </>
  )
}

export default AppHeader
