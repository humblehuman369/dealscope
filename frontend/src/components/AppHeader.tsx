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
 * │  [Analyze]  Details  PriceCheckerIQ  Dashboard         │  ← White tab bar
 * ├─────────────────────────────────────────────────┤
 * │  🏠 1451 Sw 10th St, Boca Raton, FL 33486   ▼  │  ← Property bar (optional)
 * └─────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, User, ChevronDown, ChevronUp, Heart } from 'lucide-react'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { useAuth } from '@/context/AuthContext'
import { getAccessToken, refreshAccessToken } from '@/lib/api'
import { toast } from '@/components/feedback'

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

export type AppTab = 'analyze' | 'details' | 'price-checker' | 'dashboard'

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
  { id: 'analyze', label: 'VerdictIQ' },
  { id: 'details', label: 'Details' },
  { id: 'price-checker', label: 'PriceCheckerIQ' },
  { id: 'dashboard', label: 'DealHubIQ' },
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
  if (pathname.startsWith('/price-intel')) return 'price-checker'
  if (pathname.startsWith('/compare')) return 'price-checker'
  if (pathname.startsWith('/rental-comps')) return 'price-checker'
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

function parseDisplayAddress(fullAddress: string): {
  streetAddress: string
  city: string
  state: string
  zipCode: string
} {
  const parts = fullAddress.split(',').map(s => s.trim()).filter(Boolean)
  const streetAddress = parts[0] || ''
  const city = parts.length > 1 ? parts[1] : ''
  const lastPart = parts.length > 2 ? parts[parts.length - 1] : ''
  const stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i)

  if (stateZipMatch) {
    return {
      streetAddress,
      city,
      state: stateZipMatch[1],
      zipCode: stateZipMatch[2],
    }
  }

  const stateMatch = lastPart.match(/^([A-Z]{2})/i)
  return {
    streetAddress,
    city,
    state: stateMatch ? stateMatch[1] : '',
    zipCode: '',
  }
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
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null)
  
  // Auth context for save functionality
  const { isAuthenticated, setShowAuthModal } = useAuth()

  // Helper to fully decode a URL-encoded string (handles double/triple encoding)
  const fullyDecode = (str: string): string => {
    if (!str) return str
    try {
      let decoded = str
      while (decoded.includes('%')) {
        const newDecoded = decodeURIComponent(decoded)
        if (newDecoded === decoded) break // No more decoding possible
        decoded = newDecoded
      }
      return decoded
    } catch {
      return str // If decoding fails, return original
    }
  }

  // Get address from URL params if not provided (needed before early return)
  // Decode explicitly to handle double-encoding issues
  const rawAddressFromUrl = searchParams?.get('address') || ''
  const addressFromUrl = fullyDecode(rawAddressFromUrl)
  
  // Also decode propertyAddress prop in case it's passed encoded
  const decodedPropertyAddress = fullyDecode(propertyAddress || '')
  
  const displayAddress = decodedPropertyAddress || addressFromUrl || (property 
    ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
    : '')

  const fetchExistingSavedProperty = useCallback(async (token: string) => {
    if (!displayAddress) return null
    const { streetAddress, city, state } = parseDisplayAddress(displayAddress)
    if (!streetAddress) return null

    try {
      // First, try to fetch all saved properties and filter by zpid if available
      // This is more reliable than search which may miss exact matches
      const response = await fetch(
        `/api/v1/properties/saved?limit=100`, 
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      )

      if (!response.ok) return null
      const data = await response.json()
      const properties = (data && Array.isArray(data))
        ? data 
        : (data?.properties || data?.items || [])

      // Normalize address components for comparison
      const normalizeAddress = (addr: string) => addr.toLowerCase().trim().replace(/\s+/g, ' ')
      const normalizeCity = (c: string) => c.toLowerCase().trim()
      const normalizeState = (s: string) => s.toUpperCase().trim()

      const targetStreet = normalizeAddress(streetAddress)
      const targetCity = normalizeCity(city || '')
      const targetState = normalizeState(state || '')

      // First priority: Match by zpid if both have it
      if (property?.zpid) {
        const zpidMatch = properties.find((p: { zpid?: string }) => 
          p?.zpid && String(p.zpid) === String(property.zpid)
        )
        if (zpidMatch) return zpidMatch
      }

      // Second priority: Exact address match (street + city + state)
      const exactMatch = properties.find((p: { 
        address_street?: string
        address_city?: string
        address_state?: string
      }) => {
        if (!p) return false
        const pStreet = normalizeAddress(p.address_street || '')
        const pCity = normalizeCity(p.address_city || '')
        const pState = normalizeState(p.address_state || '')
        
        const streetMatch = pStreet === targetStreet
        const cityMatch = !targetCity || !pCity || pCity === targetCity
        const stateMatch = !targetState || !pState || pState === targetState
        
        return streetMatch && cityMatch && stateMatch
      })
      
      if (exactMatch) return exactMatch

      // Third priority: Partial match (street + city only)
      const partialMatch = properties.find((p: { 
        address_street?: string
        address_city?: string
      }) => {
        if (!p) return false
        const pStreet = normalizeAddress(p.address_street || '')
        const pCity = normalizeCity(p.address_city || '')
        
        const streetMatch = pStreet === targetStreet
        const cityMatch = !targetCity || !pCity || pCity === targetCity
        
        return streetMatch && cityMatch
      })
      
      return partialMatch || null
    } catch (error) {
      console.error('Error fetching existing saved property:', error)
      return null
    }
  }, [displayAddress, property?.zpid])

  // Check if property is already saved on mount
  useEffect(() => {
    // Only check if authenticated and has address
    if (!isAuthenticated || !displayAddress) return
    
    // Use AbortController to cancel fetch on unmount
    const abortController = new AbortController()
    
    const checkIfSaved = async () => {
      try {
        // Get token, refreshing if needed
        let token = getAccessToken()
        if (!token) {
          const refreshed = await refreshAccessToken()
          if (refreshed) token = getAccessToken()
          if (!token) return // No token available, skip check
        }

        const savedProperty = await fetchExistingSavedProperty(token)
        if (savedProperty) {
          setIsSaved(true)
          setSavedPropertyId(savedProperty.id || null)
        } else {
          setIsSaved(false)
          setSavedPropertyId(null)
        }
      } catch (error) {
        // Ignore abort errors (expected on cleanup)
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('Error checking saved status:', error)
      }
    }
    
    checkIfSaved()
    
    // Cleanup: abort fetch request on unmount
    return () => {
      abortController.abort()
    }
  }, [displayAddress, isAuthenticated, fetchExistingSavedProperty])

  // Determine if header should be hidden - Moved to end of component to prevent React Hook errors
  // if (HIDDEN_ROUTES.includes(pathname || '')) {
  //   return null
  // }

  // Determine active tab from prop or pathname
  const activeTab = activeTabProp || getActiveTabFromPath(pathname || '')

  // Determine if property bar should be shown
  const shouldShowPropertyBar = showPropertyBarProp !== undefined 
    ? showPropertyBarProp 
    : !NO_PROPERTY_BAR_ROUTES.some(route => pathname?.startsWith(route))

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
      case 'price-checker':
        if (displayAddress) {
          router.push(`/price-intel?address=${encodedAddress}`)
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

  // Handle save property
  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      setShowAuthModal('login')
      return
    }

    if (isSaving || isSaved || !displayAddress) return

    // Get auth token - try refresh if not available
    let token = getAccessToken()
    if (!token) {
      // User is authenticated (via cookies/session) but no in-memory token.
      // Try to refresh to obtain a Bearer token.
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        token = getAccessToken()
      }
      if (!token) {
        setShowAuthModal('login')
        return
      }
    }

    setIsSaving(true)
    try {
      // Parse address for API
      const { streetAddress, city, state, zipCode } = parseDisplayAddress(displayAddress)

      const response = await fetch('/api/v1/properties/saved', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          address_street: streetAddress,
          address_city: city,
          address_state: state || '',
          address_zip: zipCode || '',
          full_address: displayAddress,
          zpid: property?.zpid || null,
          external_property_id: property?.zpid || null, // Use zpid as external ID if available
          status: 'watching',
          property_data_snapshot: {
            zpid: property?.zpid || null,
            street: streetAddress,
            city: city,
            state: state || '',
            zipCode: zipCode || '',
            listPrice: property?.price || null,
            bedrooms: property?.beds || null,
            bathrooms: property?.baths || null,
            sqft: property?.sqft || null,
          },
        }),
      })

      if (response.ok) {
        // 201 = created - capture the property ID from response
        const data = await response.json()
        setIsSaved(true)
        setSavedPropertyId(data.id || null)
        toast.success('Property saved to your portfolio')
      } else if (response.status === 409) {
        // Already exists - fetch existing ID for correct unsave behavior
        const existing = await fetchExistingSavedProperty(token)
        setIsSaved(true)
        setSavedPropertyId(existing?.id || null)
        toast.info('Property is already in your portfolio')
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
          const existing = await fetchExistingSavedProperty(token)
          setIsSaved(true)
          setSavedPropertyId(existing?.id || null)
          toast.info('Property is already in your portfolio')
        } else {
          toast.error(errorText || 'Failed to save property. Please try again.')
          console.error('Failed to save property:', response.status, errorText)
        }
      } else if (response.status === 401) {
        // Token expired - prompt login
        setShowAuthModal('login')
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
    } finally {
      setIsSaving(false)
    }
  }, [displayAddress, property, isAuthenticated, setShowAuthModal, isSaving, isSaved, fetchExistingSavedProperty])

  // Handle unsave property
  const handleUnsave = useCallback(async () => {
    if (!isAuthenticated || !savedPropertyId || isSaving) return

    let token = getAccessToken()
    if (!token) {
      const refreshed = await refreshAccessToken()
      if (refreshed) token = getAccessToken()
      if (!token) {
        setShowAuthModal('login')
        return
      }
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/v1/properties/saved/${savedPropertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok || response.status === 204) {
        setIsSaved(false)
        setSavedPropertyId(null)
        toast.success('Property removed from your portfolio')
      } else if (response.status === 401) {
        setShowAuthModal('login')
        toast.error('Please log in to manage saved properties')
      } else if (response.status === 404) {
        // Property already deleted or doesn't exist
        setIsSaved(false)
        setSavedPropertyId(null)
        toast.info('Property was already removed')
      } else {
        let errorData: { detail?: string; message?: string; code?: string } = { detail: 'Unknown error' }
        try {
          errorData = await response.json()
        } catch {
          // Response is not JSON, use default error
        }
        // Handle both FastAPI format (detail) and custom InvestIQ format (message)
        const errorMessage = errorData.detail || errorData.message || 'Failed to remove property. Please try again.'
        toast.error(errorMessage)
        console.error('Failed to unsave property:', response.status, errorData)
      }
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.')
      console.error('Failed to unsave property:', error)
    } finally {
      setIsSaving(false)
    }
  }, [savedPropertyId, isAuthenticated, setShowAuthModal, isSaving])

  // Determine if header should be hidden
  // Moved here to ensure all hooks (useCallback) are called before return
  if (HIDDEN_ROUTES.includes(pathname || '')) {
    return null
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
              
              {/* Right side actions */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {/* Save/Unsave Button */}
                <button
                  onClick={isSaved ? handleUnsave : handleSave}
                  disabled={isSaving}
                  className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                    isSaved 
                      ? 'text-[#0891B2] hover:text-red-500 hover:bg-red-50' 
                      : 'text-neutral-400 hover:text-[#0891B2] hover:bg-neutral-100'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={isSaved ? 'Unsave property' : 'Save property'}
                  title={isSaved ? 'Click to unsave' : 'Save property'}
                >
                  <Heart 
                    className="w-4 h-4" 
                    fill={isSaved ? 'currentColor' : 'none'}
                    strokeWidth={1.5}
                  />
                  <span className="text-xs font-medium">
                    {isSaving ? (isSaved ? 'Removing...' : 'Saving...') : isSaved ? 'Saved' : 'Save'}
                  </span>
                </button>

                {/* Expand/Collapse Button */}
                {property && (
                  <button
                    onClick={() => setIsPropertyExpanded(!isPropertyExpanded)}
                    className="p-1 hover:bg-neutral-100 rounded transition-colors"
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
