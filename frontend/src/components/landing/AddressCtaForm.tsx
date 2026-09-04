'use client'

/**
 * The single call to action on direct-response landing pages (homepage hero,
 * /answers/*). One input, one button. A street address goes straight to the
 * free verdict at /discovery; a city or ZIP falls through to /map-search, the
 * same fork HeaderPropertySearch uses.
 *
 * The current page's utm_* / gclid / fbclid are forwarded onto the destination URL so
 * the source survives the hop (first-touch capture in lib/attribution.ts is
 * the durable record; this keeps the URL itself attributable when shared).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import {
  AddressAutocomplete,
  type AddressComponents,
  type PlaceMetadata,
} from '@/components/AddressAutocomplete'
import { trackEvent } from '@/lib/eventTracking'
import {
  canonicalizeAddressForIdentity,
  classifyPlaceTypes,
  classifySearchInput,
  isLikelyFullAddress,
} from '@/utils/addressIdentity'
import './hero-v5.css'

const FORWARDED_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']

interface Props {
  /** Recorded on `property_searched` and forwarded as `source=` (e.g. 'home_hero', 'answers:does-this-rental-cash-flow'). */
  source: string
  placeholder?: string
  buttonLabel?: string
  className?: string
}

function withAttribution(params: URLSearchParams, source: string): URLSearchParams {
  params.set('source', source)
  if (typeof window === 'undefined') return params
  const current = new URLSearchParams(window.location.search)
  for (const key of FORWARDED_PARAMS) {
    const v = current.get(key)
    if (v) params.set(key, v)
  }
  return params
}

export function AddressCtaForm({
  source,
  placeholder = 'Enter a property address',
  buttonLabel = 'Run free verdict',
  className = '',
}: Props) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [components, setComponents] = useState<AddressComponents | null>(null)
  const [error, setError] = useState<string | null>(null)

  const goToVerdict = (address: string, c: AddressComponents | null) => {
    trackEvent('property_searched', { source, type: 'address' })
    const params = new URLSearchParams({ address: canonicalizeAddressForIdentity(address) })
    if (c?.city) params.set('city', c.city)
    if (c?.state) params.set('state', c.state)
    if (c?.zipCode) params.set('zip_code', c.zipCode)
    router.push(`/discovery?${withAttribution(params, source).toString()}`)
  }

  const goToMap = (label: string, type: string, location?: { lat: number; lng: number; zoom: number }) => {
    trackEvent('property_searched', { source, type })
    const params = new URLSearchParams({ label })
    if (location) {
      params.set('lat', String(location.lat))
      params.set('lng', String(location.lng))
      params.set('zoom', String(location.zoom))
    }
    router.push(`/map-search?${withAttribution(params, source).toString()}`)
  }

  const submit = (raw: string) => {
    const text = raw.trim()
    if (!text) {
      setError('Enter an address, city or ZIP.')
      return
    }
    const kind = classifySearchInput(text)
    if (kind === 'address' || isLikelyFullAddress(text)) {
      goToVerdict(text, components)
      return
    }
    goToMap(text, kind === 'zip' ? 'zip' : 'location')
  }

  const handlePlaceSelect = (address: string, c?: AddressComponents, meta?: PlaceMetadata) => {
    const place = meta?.placeTypes ? classifyPlaceTypes(meta.placeTypes) : null
    if (place && place.category !== 'address' && place.category !== 'unknown' && meta?.location) {
      goToMap(address, place.category, { ...meta.location, zoom: place.zoom })
      return
    }
    const canonical = canonicalizeAddressForIdentity(address)
    setValue(canonical)
    setComponents(c ?? null)
    goToVerdict(canonical, c ?? null)
  }

  return (
    <form
      className={`address-cta ${className}`.trim()}
      onSubmit={(e) => {
        e.preventDefault()
        submit(value)
      }}
      noValidate
    >
      <div className="address-cta__row">
        <AddressAutocomplete
          value={value}
          onChange={(v) => {
            setValue(v)
            if (error) setError(null)
          }}
          searchMode="location"
          onPlaceSelect={handlePlaceSelect}
          onManualSubmit={submit}
          placeholder={placeholder}
          name="address"
          aria-label="Property address, city or ZIP"
          className="address-cta__input"
        />
        <button type="submit" className="hero-v5__cta-primary address-cta__button">
          {buttonLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {error && (
        <p role="alert" className="address-cta__error">
          {error}
        </p>
      )}
    </form>
  )
}
