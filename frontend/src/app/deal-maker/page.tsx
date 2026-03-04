'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Search, Loader2, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import type { DealMakerPropertyData } from '@/components/deal-maker/DealMakerScreen'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { AuthGate } from '@/components/auth/AuthGate'
import { usePropertyData } from '@/hooks/usePropertyData'
import { parseAddressString } from '@/utils/formatters'
import { FALLBACK_PROPERTY } from '@/lib/constants/property-defaults'
import { trackEvent } from '@/lib/eventTracking'
import type { AddressValidationResult } from '@/types/address'

const DealMakerScreen = dynamic(
  () => import('@/components/deal-maker/DealMakerScreen').then(m => ({ default: m.DealMakerScreen })),
  {
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400" />
      </div>
    ),
  },
)

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'issues' | 'error' | 'unavailable'

export default function DealMakerIndexPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { fetchProperty } = usePropertyData()

  const addressParam = searchParams.get('address') || ''
  const fromParam = searchParams.get('from') || ''
  const initialStrategy = searchParams.get('strategy') || undefined

  const [propertyData, setPropertyData] = useState<DealMakerPropertyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchAddress, setSearchAddress] = useState('')
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle')
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null)

  const loadProperty = useCallback(async (address: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchProperty(address)

      const monthlyRent = data.rentals?.monthly_rent_ltr || 0

      const isListed =
        data.listing?.listing_status &&
        data.listing.listing_status !== 'OFF_MARKET' &&
        data.listing.listing_status !== 'SOLD' &&
        data.listing.listing_status !== 'FOR_RENT' &&
        data.listing.listing_status !== 'OTHER'
      const zestimate = data.valuations?.zestimate ?? null
      const currentAvm = data.valuations?.current_value_avm ?? null
      const taxAssessed = data.valuations?.tax_assessed_value ?? null
      const listPrice = data.listing?.list_price ?? null
      const apiMarketPrice = data.valuations?.market_price ?? null

      const price =
        (isListed && listPrice != null && listPrice > 0 ? listPrice : null) ??
        (apiMarketPrice != null && apiMarketPrice > 0 ? apiMarketPrice : null) ??
        (zestimate != null && zestimate > 0 ? zestimate : null) ??
        (currentAvm != null && currentAvm > 0 ? currentAvm : null) ??
        (taxAssessed != null && taxAssessed > 0 ? Math.round(taxAssessed / 0.75) : null) ??
        FALLBACK_PROPERTY.price

      const propertyTaxes = data.taxes?.annual_tax_amount
        || data.taxes?.tax_amount
        || null
      const insurance = data.expenses?.insurance_annual || null

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
        price: Math.round(price),
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
  }, [fetchProperty])

  useEffect(() => {
    if (addressParam) {
      loadProperty(addressParam)
    }
  }, [addressParam, loadProperty])

  const proceedWithAddress = (addr: string) => {
    trackEvent('property_searched', { source: 'deal_maker' })
    router.push(`/deal-maker?address=${encodeURIComponent(addr)}`)
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = searchAddress.trim()
    if (!raw) return

    setValidationStatus('validating')
    setValidationResult(null)

    try {
      const res = await fetch('/api/validate-address', {
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
        label: fromParam === 'verdict' ? 'Verdict' : fromParam === 'strategy' ? 'Strategy' : 'Property',
        href: `/${fromParam}?address=${encodeURIComponent(addressParam)}`,
      }
    : undefined

  if (addressParam && isLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading property data...</p>
        </div>
      </div>
    )
  }

  if (addressParam && error) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Unable to Load Property</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => loadProperty(addressParam)}
            className="px-6 py-2 rounded-lg text-white font-medium text-sm"
            style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)' }}
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
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Deal Maker IQ</h1>
            <p className="text-slate-400 text-sm">
              Search for a property to start building your deal
            </p>
          </div>

          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
              />
              <AddressAutocomplete
                placeholder="Enter property address..."
                value={searchAddress}
                onChange={setSearchAddress}
                onPlaceSelect={setSearchAddress}
                autoFocus
                className="w-full pl-12 pr-12 py-4 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                {validationStatus === 'validating' && (
                  <Loader2 size={20} className="text-gray-400 animate-spin" />
                )}
                {validationStatus === 'valid' && (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                )}
                {validationStatus === 'issues' && (
                  <AlertTriangle size={20} className="text-amber-400" />
                )}
                {validationStatus === 'error' && (
                  <AlertCircle size={20} className="text-red-400" />
                )}
              </div>
            </div>

            {validationStatus === 'error' && (
              <p className="text-sm text-red-400">
                Could not validate address. You can try again or use the address as entered.
              </p>
            )}
            {validationStatus === 'issues' && validationResult && (
              <div
                className="rounded-xl p-3 space-y-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {validationResult.issues.length > 0 && (
                  <ul className="text-xs text-amber-200/90 space-y-1">
                    {validationResult.issues.slice(0, 3).map((issue, i) => (
                      <li key={i}>{issue.message}</li>
                    ))}
                  </ul>
                )}
                {validationResult.formattedAddress &&
                  validationResult.formattedAddress.trim() !== searchAddress.trim() && (
                    <p className="text-sm text-gray-300">
                      Did you mean:{' '}
                      <span className="font-medium text-white">
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
                        className="text-sm py-2 px-3 rounded-lg font-medium transition-colors"
                        style={{ background: 'rgba(14, 165, 233, 0.3)', color: '#FFFFFF' }}
                      >
                        Accept correction
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={useAsEntered}
                    className="text-sm py-2 px-3 rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    Use as entered
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!searchAddress.trim() || validationStatus === 'validating'}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  searchAddress.trim() && validationStatus !== 'validating'
                    ? 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)'
                    : 'rgba(14, 165, 233, 0.3)',
              }}
            >
              {validationStatus === 'validating' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Search Property
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AuthGate>
  )
}
