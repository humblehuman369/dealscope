'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ScanLine, Smartphone } from 'lucide-react'
import { buildScanPath } from '@/lib/scanQr'
import { FOUNDER_NAME, HOME_UPDATED_AT } from '@/config/site'
import { PRO_MONTHLY_PRICE, SPEED_CLAIM } from '@/lib/claims'
import { formatContentDate } from '@/lib/content-dates'
import {
  AddressAutocomplete,
  type AddressComponents,
  type PlaceMetadata,
} from '@/components/AddressAutocomplete'
import { trackEvent } from '@/lib/eventTracking'
import { detectHeroLocation, type HeroLocation } from '@/components/map-search/mapUserLocation'
import {
  canonicalizeAddressForIdentity,
  classifyPlaceTypes,
  classifySearchInput,
  isLikelyFullAddress,
} from '@/utils/addressIdentity'
import './HomeHeroStatic.css'

const PILLS = [
  'Foreclosures',
  'Pre-foreclosures',
  'Expired listings',
  'Absentee owners',
  'Distressed sellers',
] as const

const PINS = [
  { price: '$189K', left: '16%', top: '30%' },
  { price: '$245K', left: '44%', top: '22%', glow: true },
  { price: '$312K', left: '72%', top: '34%' },
  { price: '$425K', left: '30%', top: '56%' },
  { price: '$198K', left: '64%', top: '62%' },
  { price: '$276K', left: '14%', top: '68%' },
] as const

const FORWARDED_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']

function withAttribution(params: URLSearchParams): URLSearchParams {
  params.set('source', 'home_hero')
  if (typeof window === 'undefined') return params
  const current = new URLSearchParams(window.location.search)
  for (const key of FORWARDED_PARAMS) {
    const v = current.get(key)
    if (v) params.set(key, v)
  }
  return params
}

export function HomeHeroStatic({ scanQr }: { scanQr?: ReactNode }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [components, setComponents] = useState<AddressComponents | null>(null)
  const [detected, setDetected] = useState<HeroLocation | null>(null)

  useEffect(() => {
    let cancelled = false
    detectHeroLocation()
      .then((loc) => {
        if (cancelled || !loc) return
        setDetected(loc)
        setValue(loc.label)
      })
      .catch(() => {
        // GPS denied / local: keep the placeholder.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goToDiscovery = (address: string, c: AddressComponents | null) => {
    trackEvent('property_searched', { source: 'home_hero', type: 'address' })
    const params = new URLSearchParams({ address: canonicalizeAddressForIdentity(address) })
    if (c?.city) params.set('city', c.city)
    if (c?.state) params.set('state', c.state)
    if (c?.zipCode) params.set('zip_code', c.zipCode)
    router.push(`/discovery?${withAttribution(params).toString()}`)
  }

  const goToMap = (
    label: string,
    type: string,
    location?: { lat: number; lng: number; zoom: number },
  ) => {
    trackEvent('property_searched', { source: 'home_hero', type })
    const params = new URLSearchParams()
    if (label) params.set('q', label)
    if (location) {
      params.set('lat', String(location.lat))
      params.set('lng', String(location.lng))
      params.set('zoom', String(location.zoom))
    }
    const qs = withAttribution(params).toString()
    router.push(qs ? `/map-search?${qs}` : '/map-search')
  }

  const submitText = (raw: string) => {
    const text = raw.trim()
    if (!text) {
      trackEvent('search_started', { search_type: 'city', source: 'home_hero' })
      router.push('/map-search')
      return
    }
    if (detected && text === detected.label) {
      const location =
        detected.lat != null && detected.lng != null
          ? { lat: detected.lat, lng: detected.lng, zoom: 12 }
          : undefined
      goToMap(text, 'city', location)
      return
    }
    const kind = classifySearchInput(text)
    if (kind === 'address' || isLikelyFullAddress(text)) {
      goToDiscovery(text, components)
      return
    }
    goToMap(text, kind === 'zip' ? 'zip' : 'location')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    submitText(value)
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
    goToDiscovery(canonical, c ?? null)
  }

  return (
    <section id="home-hero" className="home-hero-static" aria-labelledby="home-hero-heading">
      <div className="home-hero-static__grid">
        <div className="home-hero-static__copy">
          <p className="home-hero-static__eyebrow">
            <i aria-hidden="true" />
            Live in every U.S. market
          </p>
          <h1 id="home-hero-heading" className="home-hero-static__headline">
            Find a Great Deal <span className="home-hero-static__amp">&amp;</span>
            <br />
            How to Close It.
          </h1>
          <p className="home-hero-static__lead">
            DealGapIQ is a real estate investment analysis tool that shows the gap between a
            property&apos;s asking price and the price at which it works for an investor, then gives
            four paths plus a Blend to close that gap. It analyzes six strategies across every U.S.
            market in {SPEED_CLAIM}, starts free, and Pro costs {PRO_MONTHLY_PRICE} a month.
          </p>
          <p className="home-hero-static__updated">
            By{' '}
            <Link href="/about#brad-geisen">{FOUNDER_NAME}</Link>
            {' · '}
            Updated <time dateTime={HOME_UPDATED_AT}>{formatContentDate(HOME_UPDATED_AT)}</time>
          </p>
          <form className="home-hero-static__cta" onSubmit={submit}>
            <label className="sr-only" htmlFor="home-hero-address">
              Property address, city or ZIP
            </label>
            <AddressAutocomplete
              id="home-hero-address"
              value={value}
              onChange={(next) => {
                setValue(next)
                setComponents(null)
              }}
              searchMode="location"
              onPlaceSelect={handlePlaceSelect}
              onManualSubmit={submitText}
              placeholder="Address, city, or ZIP"
              name="address"
              aria-label="Property address, city or ZIP"
            />
            <button type="submit">See Now</button>
          </form>
          {/* Phone/tablet (<768px): open the camera. Hidden by CSS on wider viewports. */}
          <div className="home-hero-static__mobile-scan">
            <Link href={buildScanPath('home_mobile')} className="home-hero-static__scan-btn">
              <ScanLine aria-hidden className="home-hero-static__scan-icon" />
              Scan a house
            </Link>
            <p className="home-hero-static__scan-prompt">
              What&apos;s the deal? Point phone at house and find out.
            </p>
          </div>
          <ul className="home-hero-static__pills" aria-label="What you can find">
            {PILLS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          {/* Desktop (≥768px): QR to hand off to the phone. Hidden by CSS below that. */}
          {scanQr ? (
            <>
              <div className="home-hero-static__divider" role="separator" />
              <div className="home-hero-static__scan-module">
                <div className="home-hero-static__scan-tile">{scanQr}</div>
                <div className="home-hero-static__scan-copy">
                  <p className="home-hero-static__scan-label">
                    <Smartphone aria-hidden className="home-hero-static__scan-phone" />
                    Point &amp; Scan
                  </p>
                  <p className="home-hero-static__scan-headline">
                    What&apos;s the deal? Point phone at house and find out.
                  </p>
                  <p className="home-hero-static__scan-caption">
                    Scan the code with your phone camera. Works with or without the app.
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="home-dark-bloom">
          <div className="home-hero-static__visual" aria-hidden="true">
          <div className="home-hero-static__card">
            <IllustratedMap />
            {PINS.map((pin) => (
              <div
                key={pin.price}
                className={`home-hero-static__pin${'glow' in pin && pin.glow ? ' home-hero-static__pin--glow' : ''}`}
                style={{ left: pin.left, top: pin.top }}
              >
                <span>{pin.price}</span>
                <i />
              </div>
            ))}
            <div className="home-hero-static__callout">
              <span className="home-hero-static__callout-k">Deal gap</span>
              <strong>$96,500</strong>
              <span>Foreclosure · Fix and flip</span>
            </div>
            <ul className="home-hero-static__legend">
              <li>
                <i className="home-hero-static__swatch home-hero-static__swatch--foreclosure" />
                Foreclosure
              </li>
              <li>
                <i className="home-hero-static__swatch home-hero-static__swatch--absentee" />
                Absentee
              </li>
              <li>
                <i className="home-hero-static__swatch home-hero-static__swatch--deal" />
                Strong deal
              </li>
            </ul>
          </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function IllustratedMap() {
  return (
    <svg
      className="home-hero-static__svg"
      viewBox="0 0 640 480"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
    >
      <defs>
        <linearGradient id="hero-land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#12324A" />
          <stop offset="100%" stopColor="#0C2234" />
        </linearGradient>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="72%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="46%" cy="26%" r="36%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#0EA5E9" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-glow-core" cx="46%" cy="24%" r="14%">
          <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#hero-land)" />
      <path
        d="M410 40 C520 80 610 160 630 250 C640 330 580 430 470 470 L640 470 L640 0 Z"
        fill="#0E7490"
        opacity="0.42"
      />
      <path
        d="M430 90 C510 120 580 190 600 260 C610 330 540 410 450 445 C500 400 560 320 540 240 C520 160 470 110 430 90 Z"
        fill="#38BDF8"
        opacity="0.28"
      />
      <rect x="70" y="80" width="110" height="78" rx="18" fill="#1D4A32" />
      <rect x="300" y="300" width="128" height="86" rx="18" fill="#1F5338" />
      <g stroke="#4A7A96" strokeWidth="6" fill="none">
        <path d="M0 120 H640" />
        <path d="M0 210 H640" />
        <path d="M0 300 H640" />
        <path d="M0 390 H640" />
        <path d="M90 0 V480" />
        <path d="M200 0 V480" />
        <path d="M330 0 V480" />
        <path d="M460 0 V480" />
        <path d="M560 0 V480" />
      </g>
      <g stroke="#7BA4BB" strokeWidth="2" fill="none" opacity="0.85">
        <path d="M0 165 H640" />
        <path d="M0 255 H640" />
        <path d="M0 345 H640" />
        <path d="M145 0 V480" />
        <path d="M265 0 V480" />
        <path d="M400 0 V480" />
        <path d="M510 0 V480" />
      </g>
      <circle cx="290" cy="125" r="150" fill="url(#hero-glow)" />
      <circle cx="282" cy="108" r="70" fill="url(#hero-glow-core)" />
      <rect width="640" height="480" fill="url(#hero-fade)" />
    </svg>
  )
}
