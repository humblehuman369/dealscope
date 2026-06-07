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
 * ┌──────────────────────────────────────────────────────────────┐
 * │  [Logo]     [────── Search address ──────]  [Tools][☀][☰]  │  ← Brand bar
 * ├──────────────────────────────────────────────────────────────┤
 * │  Discovery | Strategy | Comps | DealMaker | Estimator        │  ← Analysis tabs
 * ├──────────────────────────────────────────────────────────────┤
 * │  🏠 1451 Sw 10th St, Boca Raton, FL 33486   ▼               │  ← Property bar (optional)
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAppPathname, useAppSearchParams } from '@/hooks/useAppNavigation'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Search,
  Menu,
  LogOut,
  UserCircle,
  ShieldCheck,
  History,
  Bookmark,
  CreditCard,
  Sun,
  Moon,
  X,
  Info,
  DollarSign,
  LayoutDashboard,
  Users,
  Landmark,
  Kanban,
  ChevronDown,
  MapPin,
} from 'lucide-react'
import { PropertyAddressBar } from '@/components/iq-verdict/PropertyAddressBar'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { useSession, useLogout } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSaveProperty } from '@/hooks/useSaveProperty'
import { buildRehabUrl } from '@/lib/rehabNavigation'
import { readDealMakerOverrides } from '@/utils/addressIdentity'
import { parseAddressString } from '@/utils/formatters'
import { useTheme } from '@/context/ThemeContext'

// ===================
// DESIGN TOKENS (synced with verdict-design-tokens.ts)
// ===================

const colors = {
  background: {
    /** Harmonized top strip — between pure white cards and sky canvas */
    deepNavy: 'var(--surface-chrome)',
    surface: 'var(--surface-chrome)',
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
    /** Tab rails — sky hairlines so strip matches chrome/canvas family */
    border: 'var(--border-chrome)',
  },
}

// ===================
// TYPES
// ===================

export type AppTab = 'analyze' | 'strategy' | 'price-checker' | 'deal-maker' | 'estimator'

interface PropertyInfo {
  address: string
  city: string
  state: string
  zip: string
  beds?: number
  baths?: number
  sqft?: number
  yearBuilt?: number
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
  { id: 'analyze', label: 'Discovery' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'price-checker', label: 'Comps' },
  { id: 'deal-maker', label: 'DealMaker' },
  { id: 'estimator', label: 'Estimator' },
]

// ===================
// ROUTE DETECTION
// ===================

// Pages where header should be completely hidden
// Verdict & strategy now use the same AppHeader as the rest of the platform
const HIDDEN_ROUTES = ['/', '/register', '/what-is-dealgapiq']

// Pages where property bar should NOT be shown
const NO_PROPERTY_BAR_ROUTES = [
  '/profile',
  '/search',
  '/billing',
  '/search-history',
  '/saved-properties',
  '/pipeline',
  '/national-averages',
  '/onboarding',
  '/verify-email',
  '/reset-password',
  '/forgot-password',
  '/admin',
  '/about',
  '/pricing',
  '/map-search',
  '/directory',
  '/lenders',
]

/** Analysis workflow routes — tab bar only appears on these (not dashboard, directory, etc.) */
const ANALYSIS_WORKFLOW_PREFIXES = [
  '/discovery',
  '/strategy',
  '/property',
  '/price-intel',
  '/compare',
  '/rental-comps',
  '/deal-maker',
  '/rehab',
] as const

function isAnalysisWorkflowRoute(pathname: string): boolean {
  return ANALYSIS_WORKFLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

const MENU_ITEM_CLASS =
  'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:bg-[var(--hover-overlay)]'

// Map routes to active tabs
function getActiveTabFromPath(pathname: string): AppTab | undefined {
  // Homepage: no tab selected
  if (pathname === '/' || pathname === '') return undefined
  if (pathname.startsWith('/discovery')) return 'analyze'
  if (pathname.startsWith('/strategy')) return 'strategy'
  if (pathname.startsWith('/property')) return undefined
  if (pathname.startsWith('/price-intel')) return 'price-checker'
  if (pathname.startsWith('/compare')) return 'price-checker'
  if (pathname.startsWith('/rental-comps')) return 'price-checker'
  if (pathname.startsWith('/deal-maker')) return 'deal-maker'
  if (pathname.startsWith('/rehab')) return 'estimator'
  if (pathname.startsWith('/about')) return undefined
  if (pathname.startsWith('/pricing')) return undefined
  if (pathname.startsWith('/map-search')) return undefined
  if (pathname.startsWith('/directory')) return undefined
  if (pathname.startsWith('/lenders')) return undefined
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
  const parsed = parseAddressString(fullAddress)
  return {
    streetAddress: parsed.street,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zip,
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
  const pathname = useAppPathname()
  const searchParams = useAppSearchParams()

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const toolsMenuRef = useRef<HTMLDivElement>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileNavRef = useRef<HTMLDivElement>(null)
  const [scrolledPast, setScrolledPast] = useState(false)
  // Tracks the live property address bar height as a CSS variable so other
  // pages can stack additional sticky elements directly underneath it
  // (e.g. the Strategy page's Deal Gap bar).
  const addressBarObserverRef = useRef<ResizeObserver | null>(null)
  const addressBarRef = useCallback((node: HTMLDivElement | null) => {
    if (typeof window === 'undefined') return
    const root = document.documentElement
    if (addressBarObserverRef.current) {
      addressBarObserverRef.current.disconnect()
      addressBarObserverRef.current = null
    }
    if (!node) {
      root.style.setProperty('--app-address-bar-height', '0px')
      return
    }
    root.style.setProperty(
      '--app-address-bar-height',
      `${Math.round(node.getBoundingClientRect().height)}px`,
    )
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        root.style.setProperty(
          '--app-address-bar-height',
          `${Math.round(entry.contentRect.height)}px`,
        )
      }
    })
    observer.observe(node)
    addressBarObserverRef.current = observer
  }, [])

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

  // Close tools menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false)
      }
    }
    if (showToolsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showToolsMenu])

  // Close mobile nav on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
        setMobileNavOpen(false)
      }
    }
    if (mobileNavOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileNavOpen])

  // Collapse property details row on mobile after scrolling past the header
  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > 100)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
  const cityFromUrl = fullyDecode(searchParams?.get('city') || '')
  const stateFromUrl = fullyDecode(searchParams?.get('state') || '')
  const zipFromUrl = fullyDecode(searchParams?.get('zip_code') || '')

  // Also decode propertyAddress prop in case it's passed encoded
  const decodedPropertyAddress = fullyDecode(propertyAddress || '')

  const displayAddress =
    (property ? `${property.address}, ${property.city}, ${property.state} ${property.zip}` : '') ||
    decodedPropertyAddress ||
    addressFromUrl

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
          yearBuilt: toNumber(parsed.yearBuilt ?? parsed.year_built),
          price: displayPrice,
          zpid: typeof parsed.zpid === 'string' ? parsed.zpid : undefined,
          listingStatus:
            typeof parsed.listingStatus === 'string' ? parsed.listingStatus : undefined,
        })
        return
      }
    } catch {
      /* ignore */
    }
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

  const { isSaved, savedPropertyId, toggle: handleSaveToggle } = useSaveProperty({
    displayAddress: displayAddress || '',
    propertySnapshot: savePropertySnapshot,
  })

  // Close menus on navigation
  useEffect(() => {
    setMobileNavOpen(false)
    setShowToolsMenu(false)
    setShowProfileMenu(false)
  }, [pathname])

  // Determine if header should be hidden - Moved to end of component to prevent React Hook errors
  // if (HIDDEN_ROUTES.includes(pathname || '')) {
  //   return null
  // }

  // Determine active tab from prop or pathname
  const activeTab = activeTabProp ?? getActiveTabFromPath(pathname || '')
  const isInfoPage = pathname?.startsWith('/about') || pathname?.startsWith('/pricing')
  const isHomepage = !pathname || pathname === '/'

  const toolsNavActive =
    pathname?.startsWith('/directory') ||
    pathname?.startsWith('/lenders') ||
    pathname === '/dashboard' ||
    pathname === '/pipeline'

  const showAnalysisTabs =
    showTabs && !isInfoPage && !isHomepage && isAnalysisWorkflowRoute(pathname || '')

  const showMapSearchFab =
    isAnalysisWorkflowRoute(pathname || '') && !pathname?.startsWith('/map-search')

  // Determine if property bar should be shown
  const shouldShowPropertyBar =
    showPropertyBarProp !== undefined
      ? showPropertyBarProp
      : !NO_PROPERTY_BAR_ROUTES.some((route) => pathname?.startsWith(route))

  const signInUrl = `${pathname || '/'}?${(() => {
    const p = new URLSearchParams(searchParams?.toString() ?? '')
    p.set('auth', 'required')
    const fullPath = searchParams?.toString()
      ? `${pathname || '/'}?${searchParams.toString()}`
      : pathname || '/'
    p.set('redirect', fullPath)
    return p.toString()
  })()}`

  // Navigation handlers
  const handleLogoClick = () => {
    router.push('/')
  }

  const [searchModalOpen, setSearchModalOpen] = useState(false)

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
          router.push(`/discovery?address=${encodedAddress}`)
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
      case 'price-checker':
        if (displayAddress) {
          const compsQuery = new URLSearchParams({ address: displayAddress })
          if (zpid) compsQuery.set('zpid', String(zpid))
          if (resolvedProperty?.latitude != null)
            compsQuery.set('lat', String(resolvedProperty.latitude))
          if (resolvedProperty?.longitude != null)
            compsQuery.set('lng', String(resolvedProperty.longitude))
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
      case 'estimator':
        if (displayAddress) {
          router.push(
            buildRehabUrl({
              address: displayAddress,
              savedPropertyId: savedPropertyId ?? undefined,
              property: resolvedProperty
                ? {
                    square_footage: resolvedProperty.sqft,
                    year_built: resolvedProperty.yearBuilt,
                    zip_code: resolvedProperty.zip,
                    bedrooms: resolvedProperty.beds,
                    bathrooms: resolvedProperty.baths,
                    arv: resolvedProperty.price,
                  }
                : undefined,
            }),
          )
        } else {
          router.push('/rehab')
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

  return (
    <>
      {/* Top chrome: solid card surface; page canvas tint starts in LayoutWrapper below this stack */}
      <div className="relative z-50 bg-[var(--surface-chrome)]">
        {/* Fixed safe-area cover — prevents scrolling content from showing behind the device notch/status bar */}
        <div
          className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
          style={{
            height: 'env(safe-area-inset-top, 0px)',
            background: 'var(--surface-chrome)',
          }}
          aria-hidden="true"
        />

        <header className="relative z-50">
          {/* Brand Bar — logo | centered search | tools + theme + account */}
          <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 pt-safe-header">
            <button
              onClick={handleLogoClick}
              className="shrink-0 flex items-center cursor-pointer bg-transparent border-none hover:opacity-80 transition-opacity p-0"
              aria-label="DealGapIQ home"
            >
              <Image
                src={
                  mounted && theme === 'light'
                    ? '/DealGapIQ_Logo_Light.png'
                    : '/DealGapIQ_Logo_Dark_Header.png'
                }
                alt="DealGapIQ"
                width={1024}
                height={333}
                priority
                className="h-[36px] sm:h-[44px] w-auto select-none"
                draggable={false}
              />
            </button>

            <div className="flex-1 flex justify-center min-w-0 px-1 sm:px-2">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="w-full max-w-xl min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-2 rounded-full border transition-colors hover:opacity-90 flex items-center gap-2 justify-start"
                style={{
                  background: 'var(--surface-elevated)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-heading)',
                }}
                aria-label="Search properties by address"
              >
                <Search
                  className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="sm:hidden">Search address…</span>
                  <span className="hidden sm:inline">Search address or MLS #…</span>
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {isHomepage && (
                <>
                  <Link
                    href="/about"
                    className="hidden lg:inline text-sm font-semibold whitespace-nowrap transition-colors hover:text-[var(--text-heading)]"
                    style={{
                      color:
                        pathname === '/about' ? 'var(--text-heading)' : 'var(--text-secondary)',
                    }}
                    aria-current={pathname === '/about' ? 'page' : undefined}
                  >
                    About
                  </Link>
                  <Link
                    href="/pricing"
                    className="hidden lg:inline text-sm font-semibold whitespace-nowrap transition-colors hover:text-[var(--text-heading)]"
                    style={{
                      color:
                        pathname === '/pricing' ? 'var(--text-heading)' : 'var(--text-secondary)',
                    }}
                    aria-current={pathname === '/pricing' ? 'page' : undefined}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/blog"
                    className="hidden lg:inline text-sm font-semibold whitespace-nowrap transition-colors hover:text-[var(--text-heading)]"
                    style={{
                      color: pathname?.startsWith('/blog')
                        ? 'var(--text-heading)'
                        : 'var(--text-secondary)',
                    }}
                    aria-current={pathname?.startsWith('/blog') ? 'page' : undefined}
                  >
                    Blog
                  </Link>
                </>
              )}

              {/* Map Search — desktop nav entry */}
              {!pathname?.startsWith('/map-search') && (
                <Link
                  href="/map-search"
                  className="hidden sm:flex min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 rounded-full border transition-colors hover:bg-[var(--hover-overlay)] items-center gap-1.5 whitespace-nowrap"
                  style={{
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label="Map Search"
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold hidden md:inline">Map</span>
                </Link>
              )}

              {/* Tools — directories, dashboard, pipeline */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowToolsMenu((prev) => !prev)}
                  className="min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 rounded-full border transition-colors hover:bg-[var(--hover-overlay)] flex items-center gap-1 whitespace-nowrap"
                  style={{
                    borderColor: toolsNavActive ? colors.brand.teal : 'var(--border-default)',
                    color: toolsNavActive ? 'var(--text-heading)' : 'var(--text-secondary)',
                    background: 'transparent',
                  }}
                  aria-label="Tools and directories"
                  aria-expanded={showToolsMenu}
                  aria-haspopup="menu"
                >
                  <span className="text-sm font-semibold hidden sm:inline">Tools</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`}
                  />
                </button>
                {showToolsMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-lg py-1 z-50"
                    style={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <Link
                      href="/directory"
                      role="menuitem"
                      onClick={() => setShowToolsMenu(false)}
                      className={MENU_ITEM_CLASS}
                      style={{
                        color: pathname?.startsWith('/directory')
                          ? 'var(--text-heading)'
                          : 'var(--text-secondary)',
                        fontWeight: pathname?.startsWith('/directory') ? 600 : 400,
                      }}
                      aria-current={pathname?.startsWith('/directory') ? 'page' : undefined}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">Cash Buyers</span>
                    </Link>
                    <Link
                      href="/lenders"
                      role="menuitem"
                      onClick={() => setShowToolsMenu(false)}
                      className={MENU_ITEM_CLASS}
                      style={{
                        color: pathname?.startsWith('/lenders')
                          ? 'var(--text-heading)'
                          : 'var(--text-secondary)',
                        fontWeight: pathname?.startsWith('/lenders') ? 600 : 400,
                      }}
                      aria-current={pathname?.startsWith('/lenders') ? 'page' : undefined}
                    >
                      <Landmark className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">Hard Money</span>
                    </Link>
                    {isAuthenticated && (
                      <>
                        <div
                          className="my-1"
                          style={{ borderTop: '1px solid var(--border-default)' }}
                          role="separator"
                        />
                        <Link
                          href="/dashboard"
                          role="menuitem"
                          onClick={() => setShowToolsMenu(false)}
                          className={MENU_ITEM_CLASS}
                          style={{
                            color:
                              pathname === '/dashboard'
                                ? 'var(--text-heading)'
                                : 'var(--text-secondary)',
                            fontWeight: pathname === '/dashboard' ? 600 : 400,
                          }}
                          aria-current={pathname === '/dashboard' ? 'page' : undefined}
                        >
                          <LayoutDashboard className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Dashboard</span>
                        </Link>
                        <Link
                          href="/pipeline"
                          role="menuitem"
                          onClick={() => setShowToolsMenu(false)}
                          className={MENU_ITEM_CLASS}
                          style={{
                            color:
                              pathname === '/pipeline'
                                ? 'var(--text-heading)'
                                : 'var(--text-secondary)',
                            fontWeight: pathname === '/pipeline' ? 600 : 400,
                          }}
                          aria-current={pathname === '/pipeline' ? 'page' : undefined}
                        >
                          <Kanban className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Pipeline</span>
                        </Link>
                      </>
                    )}
                    {!isAuthenticated && (
                      <>
                        <div
                          className="my-1"
                          style={{ borderTop: '1px solid var(--border-default)' }}
                          role="separator"
                        />
                        <Link
                          href="/login"
                          role="menuitem"
                          onClick={() => setShowToolsMenu(false)}
                          className={MENU_ITEM_CLASS}
                          style={{ color: 'var(--accent-sky)', fontWeight: 600 }}
                        >
                          <UserCircle className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Log in</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className="flex min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 rounded-full transition-colors hover:bg-[var(--hover-overlay)] items-center justify-center"
                aria-label={
                  mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
                }
              >
                {mounted && theme === 'dark' ? (
                  <Sun className="w-5 h-5" style={{ color: 'var(--text-heading)' }} />
                ) : (
                  <Moon className="w-5 h-5" style={{ color: 'var(--text-heading)' }} />
                )}
              </button>

              {isAuthenticated ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={handleProfileClick}
                    className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 rounded-full transition-colors hover:bg-[var(--hover-overlay)] flex items-center justify-center"
                    aria-label="Account menu"
                    aria-expanded={showProfileMenu}
                    aria-haspopup="menu"
                  >
                    <Menu className="w-5 h-5" style={{ color: 'var(--text-heading)' }} />
                  </button>

                  {showProfileMenu && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-lg py-1 z-50"
                      style={{
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      {user && (
                        <div
                          className="px-3 py-2"
                          style={{ borderBottom: '1px solid var(--border-default)' }}
                        >
                          <div className="flex items-center gap-2">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: 'var(--text-heading)' }}
                            >
                              {user.full_name || 'User'}
                            </p>
                            <span
                              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                background: isPro
                                  ? 'rgba(15,164,233,0.15)'
                                  : 'rgba(148,163,184,0.15)',
                                color: isPro ? 'var(--accent-sky)' : 'var(--text-label)',
                              }}
                            >
                              {isPro ? 'Pro' : 'Starter'}
                            </span>
                          </div>
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {user.email}
                          </p>
                        </div>
                      )}
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/profile')
                        }}
                        className={MENU_ITEM_CLASS}
                        style={{ color: 'var(--text-heading)' }}
                      >
                        <UserCircle className="w-4 h-4" /> Profile
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/search-history')
                        }}
                        className={MENU_ITEM_CLASS}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <History className="w-4 h-4" /> Search History
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/saved-properties')
                        }}
                        className={MENU_ITEM_CLASS}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Bookmark className="w-4 h-4" /> Saved Properties
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/billing')
                        }}
                        className={MENU_ITEM_CLASS}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <CreditCard className="w-4 h-4" /> Billing
                      </button>
                      {isAdmin && (
                        <button
                          role="menuitem"
                          onClick={() => {
                            setShowProfileMenu(false)
                            router.push('/admin')
                          }}
                          className={MENU_ITEM_CLASS}
                          style={{ color: 'var(--accent-sky)' }}
                        >
                          <ShieldCheck className="w-4 h-4" /> Admin
                        </button>
                      )}
                      <div
                        className="mt-1 pt-1"
                        style={{ borderTop: '1px solid var(--border-default)' }}
                      >
                        <button
                          role="menuitem"
                          onClick={handleLogout}
                          disabled={logoutMutation.isPending}
                          className={MENU_ITEM_CLASS}
                          style={{ color: '#dc2626' }}
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`${isHomepage ? 'hidden sm:inline' : 'hidden min-[420px]:inline'} text-sm font-semibold transition-opacity hover:opacity-80 whitespace-nowrap`}
                    style={{ color: colors.brand.teal }}
                  >
                    Log in
                  </Link>
                  {isHomepage && (
                    <div className="sm:hidden relative" ref={mobileNavRef}>
                      <button
                        onClick={() => setMobileNavOpen((prev) => !prev)}
                        className="min-w-[40px] min-h-[40px] p-2 rounded-full transition-colors hover:bg-[var(--hover-overlay)] flex items-center justify-center"
                        aria-label="Navigation menu"
                        aria-expanded={mobileNavOpen}
                        aria-haspopup="true"
                      >
                        {mobileNavOpen ? (
                          <X className="w-5 h-5" style={{ color: 'var(--text-heading)' }} />
                        ) : (
                          <Menu className="w-5 h-5" style={{ color: 'var(--text-heading)' }} />
                        )}
                      </button>
                      {mobileNavOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg py-1 z-50"
                          style={{
                            background: 'var(--surface-elevated)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <Link
                            href="/about"
                            onClick={() => setMobileNavOpen(false)}
                            className={MENU_ITEM_CLASS}
                            style={{ color: 'var(--text-heading)' }}
                          >
                            <Info className="w-4 h-4" /> About
                          </Link>
                          <Link
                            href="/pricing"
                            onClick={() => setMobileNavOpen(false)}
                            className={MENU_ITEM_CLASS}
                            style={{ color: 'var(--text-heading)' }}
                          >
                            <DollarSign className="w-4 h-4" /> Pricing
                          </Link>
                          <Link
                            href="/blog"
                            onClick={() => setMobileNavOpen(false)}
                            className={MENU_ITEM_CLASS}
                            style={{ color: 'var(--text-heading)' }}
                          >
                            <Info className="w-4 h-4" /> Blog
                          </Link>
                          <div
                            style={{ borderTop: '1px solid var(--border-default)' }}
                            className="my-1"
                          />
                          <Link
                            href="/login"
                            onClick={() => setMobileNavOpen(false)}
                            className={MENU_ITEM_CLASS}
                            style={{ color: 'var(--accent-sky)', fontWeight: 600 }}
                          >
                            <UserCircle className="w-4 h-4" /> Log in
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Analysis workflow tabs — only on discovery/strategy/comps/deal-maker/rehab routes */}
          {showAnalysisTabs && (
            <div
              role="tablist"
              aria-label="Property analysis"
              className="flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-4 overflow-x-auto scrollbar-hide touch-pan-x"
              style={{
                borderTop: '1px solid var(--border-chrome)',
                borderBottom: '1px solid var(--border-chrome)',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleTabChange(tab.id)}
                    className="flex-1 min-w-0 px-2 sm:px-4 py-2.5 text-xs sm:text-base font-medium transition-colors whitespace-nowrap"
                    style={{
                      fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                      color: isActive ? 'var(--text-heading)' : 'var(--text-secondary)',
                      borderBottom: isActive
                        ? `2px solid ${colors.brand.teal}`
                        : '2px solid transparent',
                    }}
                  >
                    <span className="sm:hidden">
                      {tab.id === 'price-checker' ? 'Comps' : tab.label}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </header>
      </div>

      {/*
        Property Address Bar — rendered as a top-level sibling of the brand+tabs
        wrapper so its sticky containing block is the LayoutWrapper (which spans
        the entire page). Nested inside the brand+tabs wrapper, the bar would
        un-stick the moment the wrapper's bottom edge crossed the viewport top.
      */}
      {shouldShowPropertyBar &&
        displayAddress &&
        (() => {
          const addrParts = parseDisplayAddress(displayAddress)
          const p = resolvedProperty
          const barCity = p?.city || cityFromUrl || addrParts.city
          const barState = p?.state || stateFromUrl || addrParts.state
          const barZip = p?.zip || zipFromUrl || addrParts.zipCode
          return (
            <div
              ref={addressBarRef}
              className="sticky z-40"
              style={{ top: 'env(safe-area-inset-top, 0px)' }}
            >
              <PropertyAddressBar
                address={p?.address ?? addrParts.streetAddress}
                city={barCity}
                state={barState}
                zip={barZip}
                beds={p?.beds ?? 0}
                baths={p?.baths ?? 0}
                sqft={p?.sqft ?? 0}
                price={p?.price ?? 0}
                listingStatus={p?.listingStatus ?? 'OFF_MARKET'}
                zpid={p?.zpid}
                bookmarked={isSaved}
                onBookmarkClick={
                  isAuthenticated
                    ? () =>
                        handleSaveToggle().catch((err) => console.error('Save toggle failed:', err))
                    : () => router.push(signInUrl)
                }
                detailsCollapsed={scrolledPast}
                loading={!p}
              />
            </div>
          )
        })()}

      <SearchPropertyModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

      {/* Mobile Map Search FAB */}
      {showMapSearchFab && (
        <Link
          href="/map-search"
          className="sm:hidden fixed z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg pb-safe"
          style={{
            right: 'max(12px, env(safe-area-inset-right, 0px))',
            bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
            background: 'var(--accent-sky)',
            color: '#fff',
            border: '2px solid var(--surface-card)',
          }}
          aria-label="Map Search"
        >
          <MapPin className="w-5 h-5" />
        </Link>
      )}
    </>
  )
}

export default AppHeader
