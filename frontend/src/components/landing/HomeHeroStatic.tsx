'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/eventTracking'
import { detectHeroLocation, type HeroLocation } from '@/components/map-search/mapUserLocation'
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

export function HomeHeroStatic() {
  const router = useRouter()
  const [value, setValue] = useState('')
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

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = value.trim()
    trackEvent('search_started', { search_type: 'city', source: 'home_hero' })
    const params = new URLSearchParams()
    if (text) params.set('q', text)
    // Only attach GPS/IP coords when the field still matches the autofill.
    // Typing a different city/ZIP must geocode that query, not the old pin.
    if (
      detected &&
      text === detected.label &&
      detected.lat != null &&
      detected.lng != null
    ) {
      params.set('lat', String(detected.lat))
      params.set('lng', String(detected.lng))
      params.set('zoom', '12')
    }
    const qs = params.toString()
    router.push(qs ? `/map-search?${qs}` : '/map-search')
  }

  const detectedStillActive = !!detected && value.trim() === detected.label
  const cityName =
    detectedStillActive && detected.label !== 'Your location'
      ? detected.label.replace(/,.*$/, '')
      : null

  return (
    <section id="home-hero" className="home-hero-static" aria-labelledby="home-hero-heading">
      <div className="home-hero-static__grid">
        <div className="home-hero-static__copy">
          <p className="home-hero-static__eyebrow">
            <i aria-hidden="true" />
            Live in every U.S. market
          </p>
          <h1 id="home-hero-heading" className="home-hero-static__headline">
            Find a Great Deal <span>& How to Close it.</span>
          </h1>
          <p className="home-hero-static__lead">
            See the foreclosures, expired listings, and absentee owners in your market — then see
            the gap before you make an offer.
          </p>
          <form className="home-hero-static__cta" onSubmit={submit}>
            <label className="sr-only" htmlFor="home-hero-city">
              City or ZIP
            </label>
            <input
              id="home-hero-city"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="City or ZIP"
              autoComplete="off"
            />
            <button type="submit">See Now</button>
          </form>
          <p className="home-hero-static__fine">
            {cityName ? `Opens the live map for ${cityName}.` : 'Opens the live map for your area.'}
          </p>
          <ul className="home-hero-static__pills" aria-label="What you can find">
            {PILLS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>

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
          <stop offset="0%" stopColor="#0A1628" />
          <stop offset="100%" stopColor="#071018" />
        </linearGradient>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.72" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="46%" cy="28%" r="28%">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#hero-land)" />
      <path
        d="M410 40 C520 80 610 160 630 250 C640 330 580 430 470 470 L640 470 L640 0 Z"
        fill="#0B3A52"
        opacity="0.55"
      />
      <path
        d="M430 90 C510 120 580 190 600 260 C610 330 540 410 450 445 C500 400 560 320 540 240 C520 160 470 110 430 90 Z"
        fill="#0EA5E9"
        opacity="0.12"
      />
      <rect x="70" y="80" width="110" height="78" rx="18" fill="#14301F" />
      <rect x="300" y="300" width="128" height="86" rx="18" fill="#163424" />
      <g stroke="#1E3A4C" strokeWidth="6" fill="none">
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
      <g stroke="#334155" strokeWidth="2" fill="none" opacity="0.9">
        <path d="M0 165 H640" />
        <path d="M0 255 H640" />
        <path d="M0 345 H640" />
        <path d="M145 0 V480" />
        <path d="M265 0 V480" />
        <path d="M400 0 V480" />
        <path d="M510 0 V480" />
      </g>
      <circle cx="290" cy="130" r="120" fill="url(#hero-glow)" />
      <rect width="640" height="480" fill="url(#hero-fade)" />
    </svg>
  )
}
