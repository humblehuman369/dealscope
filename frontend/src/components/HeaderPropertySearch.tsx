'use client'

/**
 * Inline header address / MLS search — replaces the SearchPropertyModal
 * chooser for the AppHeader brand bar. Selecting a street address validates
 * and navigates to Discovery; city/state/zip opens Map Search.
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, AlertTriangle, AlertCircle } from 'lucide-react'
import {
  AddressAutocomplete,
  type AddressComponents,
  type PlaceMetadata,
} from '@/components/AddressAutocomplete'
import { trackEvent } from '@/lib/eventTracking'
import type { AddressValidationResult } from '@/types/address'
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env'
import {
  canonicalizeAddressForIdentity,
  isLikelyFullAddress,
  classifyPlaceTypes,
  classifySearchInput,
} from '@/utils/addressIdentity'

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'issues' | 'error' | 'unavailable'

async function geocodeLocationQuery(
  query: string,
): Promise<{ lat: number; lng: number; zoom: number } | null> {
  if (typeof window === 'undefined') return null
  const Geocoder = (window as Window & { google?: typeof google }).google?.maps?.Geocoder
  if (!Geocoder) return null
  try {
    const geocoder = new Geocoder()
    const { results } = await geocoder.geocode({
      address: query,
      componentRestrictions: { country: 'us' },
    })
    if (!results?.length) return null
    const r = results[0]
    const loc = r.geometry?.location
    if (!loc) return null
    const types: string[] = r.types || []
    let zoom = 12
    if (types.includes('postal_code')) zoom = 13
    else if (types.includes('locality') || types.includes('sublocality')) zoom = 12
    else if (types.includes('administrative_area_level_2')) zoom = 10
    else if (types.includes('administrative_area_level_1')) zoom = 7
    return { lat: loc.lat(), lng: loc.lng(), zoom }
  } catch {
    return null
  }
}

export function HeaderPropertySearch() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle')
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null)
  const [placeComponents, setPlaceComponents] = useState<AddressComponents | null>(null)

  const proceedToVerdict = (
    addressToUse: string,
    components?: { city?: string; state?: string; zipCode?: string } | null,
  ) => {
    trackEvent('property_searched', { source: 'header_search' })
    const canonicalAddress = canonicalizeAddressForIdentity(addressToUse)
    const params = new URLSearchParams({ address: canonicalAddress })
    if (components?.city) params.set('city', components.city)
    if (components?.state) params.set('state', components.state)
    if (components?.zipCode) params.set('zip_code', components.zipCode)
    setAddress('')
    setValidationStatus('idle')
    setValidationResult(null)
    setPlaceComponents(null)
    router.push(`/discovery?${params.toString()}`)
  }

  const submitAddress = async (rawInput: string) => {
    const raw = rawInput.trim()
    if (!raw || validationStatus === 'validating') return

    const classification = classifySearchInput(raw)
    if (classification !== 'address' && !isLikelyFullAddress(raw)) {
      trackEvent('property_searched', {
        source: 'header_search',
        type: classification === 'zip' ? 'zip' : 'location',
      })
      setValidationStatus('validating')
      const geocoded = await geocodeLocationQuery(raw)
      setValidationStatus('idle')
      const params = new URLSearchParams({ label: raw })
      if (geocoded) {
        params.set('lat', String(geocoded.lat))
        params.set('lng', String(geocoded.lng))
        params.set('zoom', String(geocoded.zoom))
      }
      setAddress('')
      router.push(`/map-search?${params.toString()}`)
      return
    }

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
        if (isLikelyFullAddress(raw)) {
          setValidationStatus('unavailable')
          proceedToVerdict(raw, placeComponents)
        } else {
          setValidationStatus('error')
        }
        return
      }

      if (!res.ok) {
        if (IS_CAPACITOR && isLikelyFullAddress(raw)) {
          setValidationStatus('unavailable')
          proceedToVerdict(raw, placeComponents)
        } else {
          setValidationStatus('error')
        }
        return
      }

      const result = data as AddressValidationResult
      setValidationResult(result)

      if (result.isValid) {
        setValidationStatus('valid')
        const stdAddr = result.standardizedAddress
        proceedToVerdict(result.formattedAddress || raw, {
          city: stdAddr?.city,
          state: stdAddr?.state,
          zipCode: stdAddr?.zipCode,
        })
        return
      }

      setValidationStatus('issues')
    } catch (err) {
      console.error('[HeaderPropertySearch] validate-address failed:', err)
      if (IS_CAPACITOR && isLikelyFullAddress(raw)) {
        setValidationStatus('unavailable')
        proceedToVerdict(raw, placeComponents)
      } else {
        setValidationStatus('error')
      }
    }
  }

  const handlePlaceSelect = (
    value: string,
    components?: AddressComponents,
    meta?: PlaceMetadata,
  ) => {
    const placeCategory = meta?.placeTypes
      ? classifyPlaceTypes(meta.placeTypes).category
      : 'unknown'

    if (placeCategory !== 'address' && placeCategory !== 'unknown' && meta?.location) {
      const { zoom } = classifyPlaceTypes(meta.placeTypes)
      trackEvent('property_searched', {
        source: 'header_search',
        type: placeCategory,
      })
      const params = new URLSearchParams({
        lat: String(meta.location.lat),
        lng: String(meta.location.lng),
        zoom: String(zoom),
        label: value,
      })
      setAddress('')
      router.push(`/map-search?${params.toString()}`)
      return
    }

    const canonical = canonicalizeAddressForIdentity(value)
    setAddress(canonical)
    setPlaceComponents(components ?? null)
    void submitAddress(canonical)
  }

  const acceptCorrection = () => {
    const formatted = validationResult?.formattedAddress?.trim()
    if (!formatted) return
    setAddress(formatted)
    setValidationStatus('idle')
    setValidationResult(null)
    void submitAddress(formatted)
  }

  const useAsEntered = () => {
    const entered = canonicalizeAddressForIdentity(address)
    if (!isLikelyFullAddress(entered)) {
      setValidationStatus('issues')
      return
    }
    proceedToVerdict(entered, placeComponents)
  }

  const showPanel = validationStatus === 'error' || validationStatus === 'issues'

  return (
    <div className="relative w-full max-w-[14rem] sm:max-w-xs md:max-w-sm min-w-0">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submitAddress(address)
        }}
        className="w-full"
      >
        <div
          className="w-full min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 rounded-full border flex items-center gap-2"
          style={{
            background: 'var(--surface-elevated)',
            borderColor: 'var(--border-default)',
          }}
        >
          <Search
            className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 pointer-events-none"
            style={{ color: 'var(--text-secondary)' }}
            aria-hidden
          />
          <AddressAutocomplete
            placeholder="Search address or MLS #…"
            value={address}
            onChange={(v) => {
              setAddress(v)
              if (validationStatus !== 'idle' && validationStatus !== 'validating') {
                setValidationStatus('idle')
                setValidationResult(null)
              }
            }}
            searchMode="location"
            onPlaceSelect={handlePlaceSelect}
            onManualSubmit={(text) => void submitAddress(text)}
            name="header-address"
            aria-label="Search properties by address or MLS number"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-medium truncate py-2"
            style={{ color: 'var(--text-heading)' }}
          />
          {validationStatus === 'validating' && (
            <Loader2
              className="w-4 h-4 shrink-0 animate-spin"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Validating address"
            />
          )}
        </div>
      </form>

      {showPanel && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-[60] rounded-xl p-3 space-y-2 shadow-lg"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
          role="alert"
        >
          {validationStatus === 'error' && (
            <>
              <p
                className="text-xs flex items-start gap-1.5"
                style={{ color: 'var(--status-negative)' }}
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden />
                Could not validate address.
              </p>
              <button
                type="button"
                onClick={useAsEntered}
                className="text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--surface-card)',
                  color: 'var(--text-heading)',
                  border: '1px solid var(--border-default)',
                }}
              >
                Use address as entered
              </button>
            </>
          )}
          {validationStatus === 'issues' && validationResult && (
            <>
              {validationResult.issues.length > 0 && (
                <ul className="text-xs space-y-1" style={{ color: 'var(--status-warning)' }}>
                  {validationResult.issues.slice(0, 2).map((issue, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" aria-hidden />
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              {validationResult.formattedAddress &&
                validationResult.formattedAddress.trim() !== address.trim() && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Did you mean:{' '}
                    <span className="font-medium" style={{ color: 'var(--text-heading)' }}>
                      {validationResult.formattedAddress}
                    </span>
                    ?
                  </p>
                )}
              <div className="flex flex-wrap gap-2">
                {validationResult.formattedAddress &&
                  validationResult.formattedAddress.trim() !== address.trim() && (
                    <button
                      type="button"
                      onClick={acceptCorrection}
                      className="text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors"
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
                  className="text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Use as entered
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
