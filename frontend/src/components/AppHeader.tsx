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
import { Search, Menu, LogOut, UserCircle, ShieldCheck, History, Bookmark, CreditCard, Sun, Moon } from 'lucide-react'
import { PropertyAddressBar } from '@/components/iq-verdict/PropertyAddressBar'
import { useSession, useLogout } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSaveProperty } from '@/hooks/useSaveProperty'
import { readDealMakerOverrides } from '@/utils/addressIdentity'
import { useTheme } from '@/context/ThemeContext'

// ===================
// DESIGN TOKENS (synced with verdict-design-tokens.ts)
// ===================

const colors = {
  background: {
    deepNavy: 'var(--surface-base)',
    surface: 'var(--surface-card)',
    elevated: 'var(--surface-elevated)',
  },
  brand: {
    teal: 'var(--accent-sky)',
    tealBright: 'var(--accent-sky-light)',
  },
  text: {
    white: 'var(--text-heading)',
    primary: 'var(--text-heading)',
    secondary: 'var(--text-secondary)',
    tertiary: 'var(--text-label)',
  },
  ui: {
    border: 'var(--border-subtle)',
  },
}

// ===================
// TYPES
// ===================

export type AppTab = 'analyze' | 'strategy' | 'details' | 'price-checker' | 'deal-maker'

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
  latitude?: number
  longitude?: number
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
  { id: 'deal-maker', label: 'DealMaker' },
]

// ===================
// ROUTE DETECTION
// ===================

// Pages where header should be completely hidden
// Verdict & strategy now use the same AppHeader as the rest of the platform
const HIDDEN_ROUTES = ['/register', '/what-is-dealgapiq']

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
  '/about',
  '/pricing',
]

// Map routes to active tabs
function getActiveTabFromPath(pathname: string): AppTab | undefined {
  // Homepage: no tab selected
  if (pathname === '/' || pathname === '') return undefined
  if (pathname.startsWith('/verdict')) return 'analyze'
  if (pathname.startsWith('/strategy')) return 'strategy'
  if (pathname.startsWith('/property')) return 'details'
  if (pathname.startsWith('/price-intel')) return 'price-checker'
  if (pathname.startsWith('/compare')) return 'price-checker'
  if (pathname.startsWith('/rental-comps')) return 'price-checker'
  if (pathname.startsWith('/deal-maker')) return 'deal-maker'
  if (pathname.startsWith('/about')) return undefined
  if (pathname.startsWith('/pricing')) return undefined
  return 'analyze'
}

// ===================
// HELPER FUNCTIONS
// ===================

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
  
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  
  // Auth context
  const { isAuthenticated, user, isAdmin } = useSession()
  const { isPro } = useSubscription()
  const { openAuthModal } = useAuthModal()
  const logoutMutation = useLogout()
  const { theme, toggleTheme, mounted } = useTheme()

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
  
  const displayAddress = (property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
    : '') || decodedPropertyAddress || addressFromUrl

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
      const parsed = readDealMakerOverrides(displayAddress)
      if (parsed && (parsed.beds || parsed.baths || parsed.sqft || parsed.price)) {
        const toNumber = (value: unknown): number | undefined => {
          if (typeof value === 'number' && Number.isFinite(value)) return value
          if (typeof value === 'string') {
            const n = Number(value)
            if (Number.isFinite(n)) return n
          }
          return undefined
        }

        const addrParts = parseDisplayAddress(displayAddress)
        const listPrice = toNumber(parsed.listPrice)
        const price = toNumber(parsed.price)
        // Display list/market price in bar, never target buy: prefer listPrice when set
        const displayPrice = listPrice != null && listPrice > 0 ? listPrice : price

        setResolvedProperty({
          address: addrParts.streetAddress,
          city: addrParts.city,
          state: addrParts.state,
          zip: addrParts.zipCode,
          beds: toNumber(parsed.beds),
          baths: toNumber(parsed.baths),
          sqft: toNumber(parsed.sqft),
          price: displayPrice,
          zpid: typeof parsed.zpid === 'string' ? parsed.zpid : undefined,
          listingStatus: typeof parsed.listingStatus === 'string' ? parsed.listingStatus : undefined,
        })
        return
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

  const { isSaved, toggle: handleSaveToggle } = useSaveProperty({
    displayAddress: displayAddress || '',
    propertySnapshot: savePropertySnapshot,
  })

  // Determine if header should be hidden - Moved to end of component to prevent React Hook errors
  // if (HIDDEN_ROUTES.includes(pathname || '')) {
  //   return null
  // }

  // Determine active tab from prop or pathname
  const activeTab = activeTabProp ?? getActiveTabFromPath(pathname || '')
  const isInfoPage = pathname?.startsWith('/about') || pathname?.startsWith('/pricing')
  const isHomepage = !pathname || pathname === '/'

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
    
    // Check multiple possible sources for zpid
    // 1. From property prop
    // 2. From URL params (zpid only)
    // 3. From pathname (e.g., /property/12345)
    // 4. From sessionStorage (set by verdict page after API fetch)
    let zpid = property?.zpid || searchParams?.get('zpid') || ''
    
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
        const parsed = readDealMakerOverrides(displayAddress)
        if (parsed?.zpid) {
          zpid = String(parsed.zpid)
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
          if (resolvedProperty?.latitude != null) compsQuery.set('lat', String(resolvedProperty.latitude))
          if (resolvedProperty?.longitude != null) compsQuery.set('lng', String(resolvedProperty.longitude))
          router.push(`/price-intel?${compsQuery.toString()}`)
        } else {
          router.push('/search')
        }
        break
      case 'deal-maker':
        if (displayAddress) {
          router.push(`/deal-maker?address=${encodedAddress}`)
        } else {
          router.push('/deal-maker')
        }
        break
    }
  }

  // Determine if header should be hidden
  // Moved here to ensure all hooks (useCallback) are called before return
  const isHiddenRoute = HIDDEN_ROUTES.includes(pathname || '')
  if (isHiddenRoute) {
    return null
  }

  // Header and toolbar theme-aware background
  const headerBg = 'var(--surface-base)'

  return (
    <>
      <header className="relative z-50">
        {/* Brand Bar - pure black (scrolls away) */}
        <div 
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: 'var(--surface-base)' }}
        >
          {/* Left: Logo */}
          <button 
            onClick={handleLogoClick}
            className="flex items-baseline cursor-pointer bg-transparent border-none hover:opacity-80 transition-opacity"
          >
            <span 
              className="text-[21px] sm:text-[25px] font-bold tracking-tight"
              style={{ color: colors.text.white }}
            >
              DealGap
            </span>
            <span 
              className="text-[21px] sm:text-[25px] font-bold tracking-tight"
              style={{ color: colors.brand.teal }}
            >
              IQ
            </span>
          </button>

          {/* Right: About, Pricing, Search, Profile/Login */}
          <div className="flex items-center gap-5">
            <Link
              href="/about"
              className="text-[14px] sm:text-[18px] font-medium transition-opacity hover:opacity-80"
              style={{
                color: 'var(--text-heading)',
                borderBottom: pathname === '/about' ? `2px solid ${colors.brand.teal}` : '2px solid transparent',
                paddingBottom: 2,
              }}
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="text-[14px] sm:text-[18px] font-medium transition-opacity hover:opacity-80"
              style={{
                color: 'var(--text-heading)',
                borderBottom: pathname === '/pricing' ? `2px solid ${colors.brand.teal}` : '2px solid transparent',
                paddingBottom: 2,
              }}
            >
              Pricing
            </Link>
            <button
              onClick={handleSearchClick}
              className="min-w-[44px] min-h-[44px] p-2 rounded-full transition-colors hover:bg-white/10 flex items-center justify-center"
              aria-label="Search properties"
            >
              <Search 
                className="w-5 h-5 sm:w-6 sm:h-6" 
                style={{ color: 'var(--text-heading)' }}
              />
            </button>
            <button
              onClick={toggleTheme}
              className="min-w-[44px] min-h-[44px] p-2 rounded-full transition-colors hover:bg-white/10 flex items-center justify-center"
              aria-label={mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mounted && theme === 'dark' ? (
                <Sun className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--text-heading)' }} />
              ) : (
                <Moon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--text-heading)' }} />
              )}
            </button>
            {isAuthenticated ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={handleProfileClick}
                  className="min-w-[44px] min-h-[44px] p-2 rounded-full transition-colors hover:bg-white/10 flex items-center justify-center"
                  aria-label="Menu"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="true"
                >
                  <Menu 
                    className="w-5 h-5 sm:w-6 sm:h-6" 
                    style={{ color: 'var(--text-heading)' }}
                  />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-navy-900 rounded-lg shadow-lg border border-slate-200 dark:border-navy-700 py-1 z-50">
                    {user && (
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-navy-700">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] sm:text-[18px] font-medium text-slate-700 dark:text-slate-300 truncate">{user.full_name || 'User'}</p>
                          <span
                            className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] sm:text-[14px] font-semibold uppercase tracking-wide"
                            style={{
                              background: isPro ? 'rgba(14,165,233,0.15)' : 'rgba(148,163,184,0.15)',
                              color: isPro ? 'var(--accent-sky)' : 'var(--text-label)',
                            }}
                          >
                            {isPro ? 'Pro' : 'Starter'}
                          </span>
                        </div>
                        <p className="text-[12px] sm:text-[16px] text-slate-400 truncate">{user.email}</p>
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
            ) : (
              <Link
                href="/login"
                className="text-[14px] sm:text-[18px] font-semibold transition-opacity hover:opacity-80 whitespace-nowrap"
                style={{ color: colors.brand.teal }}
              >
                Login / Register
              </Link>
            )}
          </div>
        </div>

        {/* Tab Bar - pure black, hidden on info pages */}
        {showTabs && !isInfoPage && !isHomepage && (
          <div
            className="flex items-stretch overflow-x-auto scrollbar-hide touch-pan-x"
            style={{
              background: 'radial-gradient(ellipse at 40% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 90% 100%, var(--color-teal-dim) 0%, transparent 70%), var(--surface-base)',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
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
                    flex-1 px-4 py-[7px] text-[16px] sm:text-[20px] font-medium 
                    transition-all whitespace-nowrap border-r last:border-r-0
                  `}
                  style={{
                    backgroundColor: 'transparent',
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    color: 'var(--text-link)',
                    borderColor: colors.ui.border,
                    borderBottom: isActive ? `2px solid ${colors.brand.teal}` : '2px solid transparent',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

      </header>

      {/* Property Address Bar — rendered OUTSIDE <header> so sticky works against the
          viewport/body scroll, not the header's own bounds. */}
      {shouldShowPropertyBar && displayAddress && (() => {
        const addrParts = parseDisplayAddress(displayAddress)
        const p = resolvedProperty
        return (
          <div
            className="sticky top-0 z-40"
            style={{ backgroundColor: 'var(--surface-base)' }}
          >
            <PropertyAddressBar
              address={p?.address ?? addrParts.streetAddress}
              city={p?.city ?? addrParts.city}
              state={p?.state ?? addrParts.state}
              zip={p?.zip ?? addrParts.zipCode}
              beds={p?.beds ?? 0}
              baths={p?.baths ?? 0}
              sqft={p?.sqft ?? 0}
              price={p?.price ?? 0}
              listingStatus={p?.listingStatus ?? 'OFF_MARKET'}
              zpid={p?.zpid}
              bookmarked={isSaved}
              onBookmarkClick={isAuthenticated
                ? () => handleSaveToggle().catch((err) => console.error('Save toggle failed:', err))
                : () => router.push(signInUrl)}
            />
          </div>
        )
      })()}
    </>
  )
}

export default AppHeader
