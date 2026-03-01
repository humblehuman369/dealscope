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
 * │  by DealGapIQ                                    │
 * ├─────────────────────────────────────────────────┤
 * │  [Analyze]  Details  PriceCheckerIQ  Dashboard         │  ← White tab bar
 * ├─────────────────────────────────────────────────┤
 * │  🏠 1451 Sw 10th St, Boca Raton, FL 33486   ▼  │  ← Property bar (optional)
 * └─────────────────────────────────────────────────┘
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, User, ChevronDown, ChevronUp, LogOut, UserCircle, ShieldCheck, History, Heart, Bookmark, CreditCard } from 'lucide-react'
import { useSession, useLogout } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSaveProperty } from '@/hooks/useSaveProperty'
import { api } from '@/lib/api-client'

// ===================
// DESIGN TOKENS (synced with verdict-design-tokens.ts)
// ===================

const colors = {
  background: {
    deepNavy: '#0f1031',
    surface: '#0F172A',
    elevated: '#1E293B',
  },
  brand: {
    teal: '#0EA5E9',
    tealBright: '#0EA5E9',
  },
  text: {
    white: '#FFFFFF',
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    tertiary: '#64748B',
  },
  ui: {
    border: '#1E293B',
  },
}

// ===================
// TYPES
// ===================

export type AppTab = 'analyze' | 'strategy' | 'details' | 'price-checker'

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
  listingStatus?: string
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
  { id: 'analyze', label: 'Verdict' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'details', label: 'Property' },
  { id: 'price-checker', label: 'Comps' },
]

// ===================
// ROUTE DETECTION
// ===================

// Pages where header should be completely hidden
// Verdict & strategy now use the same AppHeader as the rest of the platform
const HIDDEN_ROUTES = ['/pricing', '/register', '/what-is-dealgapiq']

// Pages where property bar should NOT be shown
const NO_PROPERTY_BAR_ROUTES = [
  '/profile',
  '/search',
  '/billing',
  '/search-history',
  '/saved-properties',
  '/national-averages',
  '/onboarding',
  '/verify-email',
  '/reset-password',
  '/forgot-password',
  '/admin',
]

// Map routes to active tabs
function getActiveTabFromPath(pathname: string): AppTab {
  if (pathname.startsWith('/verdict')) return 'analyze'
  if (pathname.startsWith('/strategy')) return 'strategy'
  if (pathname.startsWith('/property')) return 'details'
  if (pathname.startsWith('/price-intel')) return 'price-checker'
  if (pathname.startsWith('/compare')) return 'price-checker'
  if (pathname.startsWith('/rental-comps')) return 'price-checker'
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
  
  const [isPropertyExpanded, setIsPropertyExpanded] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  
  // Auth context
  const { isAuthenticated, user, isAdmin } = useSession()
  const { isPro } = useSubscription()
  const { openAuthModal } = useAuthModal()
  const logoutMutation = useLogout()

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

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

  // Resolve property details — use prop if available, otherwise read from sessionStorage.
  // Uses multiple strategies to stay in sync:
  // 1. Custom event from the Verdict page after it writes to sessionStorage
  // 2. Re-read when the dropdown expands (covers missed events)
  // 3. Poll every 2s while details are missing (covers race conditions)
  const [resolvedProperty, setResolvedProperty] = useState<PropertyInfo | undefined>(undefined)

  const readPropertyFromStorage = useCallback(() => {
    if (property) {
      setResolvedProperty(property)
      return
    }
    if (typeof window === 'undefined') return
    try {
      const stored = sessionStorage.getItem('dealMakerOverrides')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.beds || parsed.baths || parsed.sqft || parsed.price) {
          const addrParts = parseDisplayAddress(displayAddress)
          setResolvedProperty({
            address: addrParts.streetAddress,
            city: addrParts.city,
            state: addrParts.state,
            zip: addrParts.zipCode,
            beds: parsed.beds,
            baths: parsed.baths,
            sqft: parsed.sqft,
            price: parsed.price,
            zpid: parsed.zpid,
            listingStatus: parsed.listingStatus,
          })
          return
        }
      }
    } catch { /* ignore */ }
    setResolvedProperty(undefined)
  }, [property, displayAddress])

  // Read on mount + listen for custom event from Verdict page
  useEffect(() => {
    readPropertyFromStorage()

    window.addEventListener('dealMakerOverridesUpdated', readPropertyFromStorage)
    return () => window.removeEventListener('dealMakerOverridesUpdated', readPropertyFromStorage)
  }, [readPropertyFromStorage])

  // Poll sessionStorage every 2s while we have an address but no property details.
  // Stops automatically once details are found.
  useEffect(() => {
    if (resolvedProperty || !displayAddress) return
    const interval = setInterval(readPropertyFromStorage, 2000)
    return () => clearInterval(interval)
  }, [resolvedProperty, displayAddress, readPropertyFromStorage])

  // Re-read when dropdown expands (in case event was missed)
  useEffect(() => {
    if (isPropertyExpanded) {
      readPropertyFromStorage()
    }
  }, [isPropertyExpanded, readPropertyFromStorage])

  const savePropertySnapshot = React.useMemo(() => {
    if (!resolvedProperty || !displayAddress) return undefined
    const addrParts = parseDisplayAddress(displayAddress)
    return {
      street: addrParts.streetAddress,
      city: addrParts.city,
      state: addrParts.state,
      zipCode: addrParts.zipCode,
      bedrooms: resolvedProperty.beds,
      bathrooms: resolvedProperty.baths,
      sqft: resolvedProperty.sqft,
      listPrice: resolvedProperty.price,
      zpid: resolvedProperty.zpid,
    }
  }, [resolvedProperty, displayAddress])

  const { isSaved, savedPropertyId, isSaving, toggle: handleSaveToggle } = useSaveProperty({
    displayAddress: displayAddress || '',
    propertySnapshot: savePropertySnapshot,
  })

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

  const signInUrl = `${pathname || '/'}?${(() => {
    const p = new URLSearchParams(searchParams?.toString() ?? '')
    p.set('auth', 'required')
    const fullPath = searchParams?.toString() ? `${pathname || '/'}?${searchParams.toString()}` : pathname || '/'
    p.set('redirect', fullPath)
    return p.toString()
  })()}`

  // Navigation handlers
  const handleLogoClick = () => {
    router.push('/')
  }

  const handleSearchClick = () => {
    router.push('/search')
  }

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    setShowProfileMenu((prev) => !prev)
  }

  const handleLogout = () => {
    setShowProfileMenu(false)
    logoutMutation.mutate()
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
      case 'strategy':
        if (displayAddress) {
          router.push(`/strategy?address=${encodedAddress}`)
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
          const compsQuery = new URLSearchParams({ address: displayAddress })
          if (zpid) compsQuery.set('zpid', String(zpid))
          router.push(`/price-intel?${compsQuery.toString()}`)
        } else {
          router.push('/search')
        }
        break
    }
  }

  const handlePropertyClick = () => {
    if (resolvedProperty?.zpid && displayAddress) {
      router.push(`/property/${resolvedProperty.zpid}?address=${encodeURIComponent(displayAddress)}`)
    }
  }

  // Determine if header should be hidden
  // Moved here to ensure all hooks (useCallback) are called before return
  const isHiddenRoute = HIDDEN_ROUTES.includes(pathname || '')
  const isHomepageUnauthenticated = (pathname || '') === '/' && !isAuthenticated
  if (isHiddenRoute || isHomepageUnauthenticated) {
    return null
  }

  // Analyzing page: pure black background per CURSOR-UNIFY-COLOR-SYSTEM
  const isAnalyzingPage = pathname?.startsWith('/analyzing')
  const headerBg = isAnalyzingPage ? '#000000' : colors.background.deepNavy

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Brand Bar - Dark Navy (pure black on /analyzing) */}
        <div 
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: headerBg }}
        >
          {/* Logo - Dynamic per page, clickable to go home */}
          <button 
            onClick={handleLogoClick}
            className="flex items-baseline cursor-pointer bg-transparent border-none hover:opacity-80 transition-opacity"
          >
            <span 
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.text.white }}
            >
              DealGap
            </span>
            <span 
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.brand.teal }}
            >
              IQ
            </span>
          </button>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSearchClick}
              className="min-w-[44px] min-h-[44px] p-2 rounded-full transition-colors hover:bg-white/10 flex items-center justify-center"
              aria-label="Search properties"
            >
              <Search 
                className="w-5 h-5" 
                style={{ color: colors.text.white }}
              />
            </button>
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={handleProfileClick}
                className="min-w-[44px] min-h-[44px] p-2 rounded-full transition-colors hover:bg-white/10 flex items-center justify-center"
                aria-label="Profile"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <User 
                  className="w-5 h-5" 
                  style={{ color: colors.text.white }}
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-navy-900 rounded-lg shadow-lg border border-slate-200 dark:border-navy-700 py-1 z-50">
                  {user && (
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-navy-700">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{user.full_name || 'User'}</p>
                        <span
                          className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: isPro ? 'rgba(14,165,233,0.15)' : 'rgba(148,163,184,0.15)',
                            color: isPro ? '#0ea5e9' : '#64748b',
                          }}
                        >
                          {isPro ? 'Pro' : 'Starter'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  )}
                  <button
                    onClick={() => { setShowProfileMenu(false); router.push('/profile') }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <UserCircle className="w-4 h-4" /> Profile
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); router.push('/search-history') }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <History className="w-4 h-4" /> Search History
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); router.push('/saved-properties') }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <Bookmark className="w-4 h-4" /> Saved Properties
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); router.push('/billing') }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" /> Billing
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setShowProfileMenu(false); router.push('/admin') }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" /> Admin Dashboard
                    </button>
                  )}
                  <div className="border-t border-slate-100 dark:border-navy-700 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Bar - Dark surface (pure black on /analyzing) */}
        {showTabs && (
          <div 
            className="flex items-stretch overflow-x-auto scrollbar-hide touch-pan-x"
            style={{
              backgroundColor: isAnalyzingPage ? '#000000' : colors.background.surface,
              borderBottom: `1px solid ${colors.ui.border}`,
              WebkitOverflowScrolling: 'touch',
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
                    backgroundColor: isActive ? headerBg : 'transparent',
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

        {/* Property Address Bar - Optional (pure black on /analyzing) */}
        {shouldShowPropertyBar && displayAddress && (
          <div 
            className="border-b"
            style={{ backgroundColor: isAnalyzingPage ? '#000000' : colors.background.surface, borderColor: colors.ui.border }}
            onMouseEnter={() => setIsPropertyExpanded(true)}
            onMouseLeave={() => setIsPropertyExpanded(false)}
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
                <div className="min-w-0">
                  <button
                    onClick={handlePropertyClick}
                    className="font-medium text-sm truncate hover:underline transition-colors text-left block w-full"
                    style={{ color: colors.text.primary }}
                    title="View property details"
                  >
                    {displayAddress}
                  </button>
                </div>
              </div>
              
              {/* Right side actions */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {/* Save Property Button — auth required (free & pro) */}
                {isAuthenticated ? (
                  <button
                    onClick={() => handleSaveToggle().catch((err) => console.error('Save toggle failed:', err))}
                    disabled={isSaving}
                    aria-label={isSaved ? 'Unsave property' : 'Save property'}
                    className={`min-w-[44px] min-h-[44px] p-1.5 rounded transition-all flex items-center justify-center ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'
                    }`}
                    title={isSaved ? 'Saved — click to remove' : 'Save property'}
                  >
                    <Bookmark
                      className={`w-4 h-4 transition-colors ${isSaved ? 'fill-current' : ''}`}
                      style={{ color: isSaved ? colors.brand.tealBright : colors.text.tertiary }}
                    />
                  </button>
                ) : (
                  <Link
                    href={signInUrl}
                    className="p-1.5 rounded transition-all hover:bg-white/10"
                    title="Sign in to save property"
                    aria-label="Sign in to save property"
                  >
                    <Bookmark className="w-4 h-4" style={{ color: colors.text.tertiary }} />
                  </Link>
                )}
                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setIsPropertyExpanded(!isPropertyExpanded)}
                  className="min-w-[44px] min-h-[44px] p-1 hover:bg-white/5 rounded transition-colors flex items-center justify-center"
                  aria-label={isPropertyExpanded ? 'Collapse details' : 'Expand details'}
                >
                  {isPropertyExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: colors.text.tertiary }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: colors.text.tertiary }} />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Details - 5 columns */}
            {isPropertyExpanded && (
              resolvedProperty ? (
                <div 
                  className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-4 pb-3 border-t"
                  style={{ borderColor: colors.ui.border }}
                >
                  {resolvedProperty.beds !== undefined && (
                    <div className="text-center pt-3">
                      <div className="text-xs mb-0.5" style={{ color: colors.text.tertiary }}>Beds</div>
                      <div className="font-semibold" style={{ color: colors.text.primary }}>{resolvedProperty.beds}</div>
                    </div>
                  )}
                  {resolvedProperty.baths !== undefined && (
                    <div className="text-center pt-3">
                      <div className="text-xs mb-0.5" style={{ color: colors.text.tertiary }}>Baths</div>
                      <div className="font-semibold" style={{ color: colors.text.primary }}>{resolvedProperty.baths}</div>
                    </div>
                  )}
                  {resolvedProperty.sqft !== undefined && (
                    <div className="text-center pt-3">
                      <div className="text-xs mb-0.5" style={{ color: colors.text.tertiary }}>Sqft</div>
                      <div className="font-semibold" style={{ color: colors.text.primary }}>{resolvedProperty.sqft.toLocaleString()}</div>
                    </div>
                  )}
                  {resolvedProperty.price !== undefined && (
                    <div className="text-center pt-3">
                      <div className="text-xs mb-0.5" style={{ color: colors.text.tertiary }}>Price</div>
                      <div className="font-semibold" style={{ color: colors.text.primary }}>{formatShortPrice(resolvedProperty.price)}</div>
                    </div>
                  )}
                  <div className="text-center pt-3">
                    <div className="text-xs mb-0.5" style={{ color: colors.text.tertiary }}>Status</div>
                    <div className="font-semibold" style={{ color: colors.text.primary }}>
                      {resolvedProperty.listingStatus === 'FOR_SALE' ? 'Listed' : 'Off-Market'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 border-t" style={{ borderColor: colors.ui.border }}>
                  <p className="text-xs" style={{ color: colors.text.tertiary }}>
                    Property details not yet available
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </header>

    </>
  )
}

export default AppHeader
