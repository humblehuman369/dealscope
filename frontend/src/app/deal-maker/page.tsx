'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import { useRouter } from 'next/navigation'
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env'
import dynamic from 'next/dynamic'
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Camera,
  MapIcon,
  ArrowLeft,
} from 'lucide-react'
import type { DealMakerPropertyData } from '@/features/deal-maker/components/DealMakerScreen'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { InfoDialog } from '@/components/ui/ConfirmDialog'
import { AuthGate } from '@/components/auth/AuthGate'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { usePropertyData } from '@/hooks/usePropertyData'
import { parseAddressString } from '@/utils/formatters'
import { FALLBACK_PROPERTY } from '@/lib/constants/property-defaults'
import { resolveMarketPriceFromPropertyResponse } from '@/lib/resolveMarketPrice'
import { useSaveProperty } from '@/hooks/useSaveProperty'
import { useDealSnapshot } from '@/hooks/useDealSnapshot'
import { effectiveMarketValueFromRecord } from '@/lib/dealMakerOverrides'
import { trackEvent } from '@/lib/eventTracking'
import type { AddressValidationResult } from '@/types/address'
import {
  canonicalizeAddressForIdentity,
  isInitialOverrideEligible,
  readDealMakerOverrides,
} from '@/utils/addressIdentity'

const DealMakerScreen = dynamic(
  () =>
    import('@/features/deal-maker/components/DealMakerScreen').then((m) => ({
      default: m.DealMakerScreen,
    })),
  {
    loading: () => <IQLoadingLogo />,
  },
)

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'issues' | 'error' | 'unavailable'

/** Sky tint #0fa4e9 @ 8% canvas / card tints (matches search modal). */
const SEARCH_OPTION_CARD_BG =
  'linear-gradient(0deg, var(--sky-tint-fill, transparent), var(--sky-tint-fill, transparent)), var(--surface-card)'

export default function DealMakerIndexPage() {
  const searchParams = useAppSearchParams()
  const router = useRouter()
  const { fetchProperty } = usePropertyData()

  const addressParam = searchParams.get('address') || ''
  const fromParam = searchParams.get('from') || ''
  const initialStrategy = searchParams.get('strategy') || undefined
  const urlMarketValue = searchParams.get('marketValue')

  const { savedPropertyId } = useSaveProperty({ displayAddress: addressParam })
  const { record: dealRecord } = useDealSnapshot(savedPropertyId)

  const [propertyData, setPropertyData] = useState<DealMakerPropertyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchAddress, setSearchAddress] = useState('')
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle')
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null)
  const [showAddressInput, setShowAddressInput] = useState(false)
  const [showScanInfo, setShowScanInfo] = useState(false)

  const loadProperty = useCallback(
    async (address: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchProperty(address)

        const monthlyRent = data.rentals?.monthly_rent_ltr || 0

        let price = resolveMarketPriceFromPropertyResponse(data, {
          marketValueOverride: dealRecord?.market_value_override,
        })
        const persistedMarket = effectiveMarketValueFromRecord(dealRecord)
        if (persistedMarket != null && persistedMarket > 0) {
          price = Math.round(persistedMarket)
        }

        const canonical = canonicalizeAddressForIdentity(data.address?.full_address || address)
        try {
          const stored = readDealMakerOverrides(canonical)
          if (stored && isInitialOverrideEligible(stored)) {
            if (typeof stored.listPrice === 'number' && stored.listPrice > 0) {
              price = Math.round(stored.listPrice)
            } else if (typeof stored.price === 'number' && stored.price > 0) {
              price = Math.round(stored.price)
            }
          }
        } catch {
          /* ignore */
        }

        if (urlMarketValue) {
          const fromUrl = parseFloat(urlMarketValue)
          if (Number.isFinite(fromUrl) && fromUrl > 0) price = Math.round(fromUrl)
        }

        const propertyTaxes = data.market?.property_taxes_annual ?? null
        const insurance = data.market?.insurance_annual ?? null

        const parsedAddress = parseAddressString(address)

        const property: DealMakerPropertyData = {
          address: data.address?.street || parsedAddress.street || address,
          city: data.address?.city || parsedAddress.city || '',
          state: data.address?.state || parsedAddress.state || FALLBACK_PROPERTY.state,
          zipCode: data.address?.zip_code || parsedAddress.zip || FALLBACK_PROPERTY.zipCode,
          beds: data.details?.bedrooms || FALLBACK_PROPERTY.beds,
          baths: data.details?.bathrooms || FALLBACK_PROPERTY.baths,
          sqft: data.details?.square_footage || FALLBACK_PROPERTY.sqft,
          yearBuilt: data.details?.year_built ?? undefined,
          price,
          rent: monthlyRent || undefined,
          zpid: data.zpid ? String(data.zpid) : undefined,
          propertyTax: propertyTaxes ?? undefined,
          insurance: insurance ?? undefined,
        }

        setPropertyData(property)
      } catch (err) {
        console.error('Error loading property for DealMaker:', err)
        setError(err instanceof Error ? err.message : 'Failed to load property data')
      } finally {
        setIsLoading(false)
      }
    },
    [fetchProperty, urlMarketValue, dealRecord?.market_value_override],
  )

  useEffect(() => {
    if (addressParam) {
      loadProperty(addressParam)
    }
  }, [addressParam, loadProperty])

  const proceedWithAddress = (addr: string) => {
    trackEvent('property_searched', { source: 'deal_maker' })
    router.push(`/deal-maker?address=${encodeURIComponent(addr)}`)
  }

  const handleMapSearch = () => {
    trackEvent('property_searched', { source: 'deal_maker', type: 'map_search' })

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const params = new URLSearchParams({
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude),
            zoom: '9',
          })
          router.push(`/map-search?${params.toString()}`)
        },
        () => router.push('/map-search'),
        { timeout: 3000 },
      )
    } else {
      router.push('/map-search')
    }
  }

  const handleScanProperty = () => {
    if (IS_CAPACITOR) {
      router.push('/?scan=true')
      return
    }

    // Mobile/tablet detection — iPadOS reports a Mac user agent, so we also
    // check for touch + maxTouchPoints. A width cap prevents Windows
    // touchscreen laptops from being misidentified as mobile.
    const isMobile =
      typeof window !== 'undefined' &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && navigator.maxTouchPoints > 1 && window.innerWidth < 1400))

    if (isMobile) {
      router.push('/?scan=true')
      return
    }

    setShowScanInfo(true)
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = searchAddress.trim()
    if (!raw) return

    setValidationStatus('validating')
    setValidationResult(null)

    try {
      const validateUrl = IS_CAPACITOR
        ? `${WEB_BASE_URL}/api/validate-address`
        : '/api/validate-address'
      const res = await fetch(validateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: raw }),
      })
      const data = await res.json()

      if (res.status === 503 || (res.ok === false && data?.code === 'VALIDATION_UNAVAILABLE')) {
        setValidationStatus('unavailable')
        proceedWithAddress(raw)
        return
      }

      if (!res.ok) {
        setValidationStatus('error')
        return
      }

      const result = data as AddressValidationResult
      setValidationResult(result)

      if (result.isValid) {
        setValidationStatus('valid')
        proceedWithAddress(result.formattedAddress || raw)
        return
      }

      setValidationStatus('issues')
    } catch {
      setValidationStatus('error')
    }
  }

  const acceptCorrection = () => {
    const formatted = validationResult?.formattedAddress?.trim()
    if (formatted) {
      setSearchAddress(formatted)
      setValidationStatus('idle')
      setValidationResult(null)
    }
  }

  const useAsEntered = () => {
    proceedWithAddress(searchAddress.trim())
  }

  const backTo = fromParam
    ? {
        label:
          fromParam === 'discovery' || fromParam === 'verdict'
            ? 'Discovery'
            : fromParam === 'strategy'
              ? 'Strategy'
              : 'Property',
        href: `/${fromParam}?address=${encodeURIComponent(addressParam)}`,
      }
    : undefined

  if (addressParam && isLoading) {
    return <IQLoadingLogo />
  }

  if (addressParam && error) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center px-4 sm:px-6">
        <div className="text-center w-full max-w-md">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--color-red-dim)' }}
          >
            <AlertCircle className="w-7 h-7 text-[var(--status-negative)]" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-heading)] mb-2">
            Unable to Load Property
          </h2>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base mb-6">{error}</p>
          <button
            onClick={() => loadProperty(addressParam)}
            className="px-8 py-3 rounded-lg text-[var(--text-inverse)] font-medium text-sm sm:text-base transition-all hover:scale-[1.02]"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (addressParam && propertyData) {
    return (
      <AuthGate feature="adjust deal inputs" mode="section">
        <DealMakerScreen
          property={propertyData}
          listPrice={propertyData.price}
          initialStrategy={initialStrategy}
          backTo={backTo}
        />
      </AuthGate>
    )
  }

  return (
    <AuthGate feature="deal maker" mode="section">
      <div className="min-h-screen bg-[var(--surface-base)] px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-heading)] mb-2">
              Deal Maker IQ
            </h1>
            <p className="text-[var(--text-secondary)] text-sm sm:text-base">
              Search for a property to start building your deal
            </p>
          </div>

          {!showAddressInput && (
            <div className="space-y-4">
              {/* Scan Property Option */}
              <button
                type="button"
                onClick={handleScanProperty}
                className="w-full flex items-center gap-5 rounded-xl border transition-all duration-150 text-left p-5
                  border-[color:var(--sky-tint-border)] shadow-[var(--shadow-card)]
                  hover:border-[color:var(--border-focus)] hover:shadow-[var(--shadow-card-hover)]
                  active:scale-[0.99]"
                style={{ background: SEARCH_OPTION_CARD_BG }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-sky)' }}
                >
                  <Camera size={28} className="text-[var(--text-inverse)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
                    Scan Property
                  </h3>
                  <p className="text-sm leading-snug" style={{ color: 'var(--text-body)' }}>
                    Point your phone camera to scan any property for quick lookup
                  </p>
                </div>
              </button>

              {/* Enter Address Option */}
              <button
                type="button"
                onClick={() => setShowAddressInput(true)}
                className="w-full flex items-center gap-5 rounded-xl border transition-all duration-150 text-left p-5
                  border-[color:var(--sky-tint-border)] shadow-[var(--shadow-card)]
                  hover:border-[color:var(--border-focus)] hover:shadow-[var(--shadow-card-hover)]
                  active:scale-[0.99]"
                style={{ background: SEARCH_OPTION_CARD_BG }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-sky)' }}
                >
                  <Search size={28} className="text-[var(--text-inverse)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
                    Enter Address or search
                  </h3>
                  <p className="text-sm leading-snug" style={{ color: 'var(--text-body)' }}>
                    Type or paste any residential address, city, state or zipcode
                  </p>
                </div>
              </button>

              {/* Map Search Option */}
              <button
                type="button"
                onClick={handleMapSearch}
                className="w-full flex items-center gap-5 rounded-xl border transition-all duration-150 text-left p-5
                  border-[color:var(--sky-tint-border)] shadow-[var(--shadow-card)]
                  hover:border-[color:var(--border-focus)] hover:shadow-[var(--shadow-card-hover)]
                  active:scale-[0.99]"
                style={{ background: SEARCH_OPTION_CARD_BG }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-sky)' }}
                >
                  <MapIcon size={28} className="text-[var(--text-inverse)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
                    Map Search
                  </h3>
                  <p className="text-sm leading-snug" style={{ color: 'var(--text-body)' }}>
                    Browse an area on the map with filters to find the best deals
                  </p>
                </div>
              </button>
            </div>
          )}

          {showAddressInput && (
            <div
              className="rounded-xl p-5 sm:p-6"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-card-hover)',
              }}
            >
              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--accent-sky)] pointer-events-none z-10"
                  />
                  <AddressAutocomplete
                    placeholder="Enter property address..."
                    value={searchAddress}
                    onChange={setSearchAddress}
                    onPlaceSelect={setSearchAddress}
                    autoFocus
                    className="w-full pl-12 pr-12 py-4 rounded-xl placeholder-[var(--text-label)] outline-none transition-colors text-sm sm:text-base"
                    style={{
                      background: 'var(--surface-input)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-heading)',
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                    {validationStatus === 'validating' && (
                      <Loader2 size={20} className="text-[var(--text-label)] animate-spin" />
                    )}
                    {validationStatus === 'valid' && (
                      <CheckCircle2 size={20} className="text-[var(--status-positive)]" />
                    )}
                    {validationStatus === 'issues' && (
                      <AlertTriangle size={20} className="text-[var(--status-warning)]" />
                    )}
                    {validationStatus === 'error' && (
                      <AlertCircle size={20} className="text-[var(--status-negative)]" />
                    )}
                  </div>
                </div>

                {validationStatus === 'error' && (
                  <p className="text-sm text-[var(--status-negative)]">
                    Could not validate address. You can try again or use the address as entered.
                  </p>
                )}
                {validationStatus === 'issues' && validationResult && (
                  <div
                    className="rounded-xl p-3 sm:p-4 space-y-3"
                    style={{
                      background: 'var(--color-sky-dim)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    {validationResult.issues.length > 0 && (
                      <ul className="text-xs sm:text-sm text-[var(--status-warning)] space-y-1">
                        {validationResult.issues.slice(0, 3).map((issue, i) => (
                          <li key={i}>{issue.message}</li>
                        ))}
                      </ul>
                    )}
                    {validationResult.formattedAddress &&
                      validationResult.formattedAddress.trim() !== searchAddress.trim() && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Did you mean:{' '}
                          <span className="font-medium text-[var(--text-heading)]">
                            {validationResult.formattedAddress}
                          </span>
                          ?
                        </p>
                      )}
                    <div className="flex flex-wrap gap-2">
                      {validationResult.formattedAddress &&
                        validationResult.formattedAddress.trim() !== searchAddress.trim() && (
                          <button
                            type="button"
                            onClick={acceptCorrection}
                            className="text-sm py-2 px-4 rounded-lg font-medium transition-colors"
                            style={{
                              background: 'var(--accent-sky)',
                              color: 'var(--text-inverse)',
                            }}
                          >
                            Accept correction
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={useAsEntered}
                        className="text-sm py-2 px-4 rounded-lg font-medium text-[var(--text-secondary)] hover:text-[var(--text-heading)] transition-colors"
                      >
                        Use as entered
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressInput(false)
                      setSearchAddress('')
                      setValidationStatus('idle')
                      setValidationResult(null)
                    }}
                    className="flex items-center justify-center gap-2 py-4 px-5 rounded-xl font-semibold text-base transition-colors"
                    style={{
                      background: 'var(--surface-input)',
                      color: 'var(--text-body)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <ArrowLeft size={18} />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!searchAddress.trim() || validationStatus === 'validating'}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                    style={{
                      color: 'var(--text-inverse)',
                      background: 'var(--accent-sky)',
                    }}
                  >
                    {validationStatus === 'validating' ? (
                      <>
                        <Loader2 size={18} className="animate-spin text-[var(--text-inverse)]" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Search size={18} className="text-[var(--text-inverse)]" />
                        Search Property
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <InfoDialog
        open={showScanInfo}
        onClose={() => setShowScanInfo(false)}
        title="Scan is a Mobile Feature"
        description="Point your phone camera at any property for instant analysis. On desktop, use 'Enter Address' to search by location."
      />
    </AuthGate>
  )
}
