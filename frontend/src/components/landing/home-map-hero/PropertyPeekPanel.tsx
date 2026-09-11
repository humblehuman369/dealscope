'use client'

import { useRouter } from 'next/navigation'
import { X, Lock } from 'lucide-react'
import type { MapListing } from '@/lib/api'
import type { DealSignalResult } from '@/lib/dealSignal'
import { displayListingStatus } from '@/lib/dealSignal'
import { getZipRentScreen } from '@/components/map-search/zipRentScreen'
import { useListingPhoto } from '@/components/map-search/listingPhoto'
import { navigateToDiscoveryFromMap } from '@/components/map-search/mapDiscoveryNavigation'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import { trackEvent } from '@/lib/eventTracking'

interface Props {
  listing: MapListing | null
  signal?: DealSignalResult
  presetId: string
  onClose: () => void
}

function money(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function meta(l: MapListing): string {
  const parts: string[] = []
  if (l.bedrooms != null) parts.push(`${l.bedrooms} bd`)
  if (l.bathrooms != null) parts.push(`${l.bathrooms} ba`)
  if (l.sqft != null) parts.push(`${l.sqft.toLocaleString()} sq ft`)
  if (l.year_built != null) parts.push(`Built ${l.year_built}`)
  return parts.join(' · ')
}

function badgeFor(l: MapListing, signal?: DealSignalResult): string {
  if (l.delisted_date) return 'Expired listing'
  if (l.owner_occupied === false && l.owner_years != null) return `Absentee · owned ${Math.round(l.owner_years)} yrs`
  if (signal?.category === 'distressed') return displayListingStatus(l.listing_status)
  if (l.days_on_market != null && l.days_on_market >= 60) return `${l.days_on_market} days on market`
  return displayListingStatus(l.listing_status)
}

/**
 * Logged-out property peek for the homepage map.
 *
 * Shows only what the map search already returned — price, facts, status,
 * days on market, and the ZIP rent screen. It does no math of its own. The
 * Deal Gap comes from Discovery, which is where the primary button goes.
 */
export function PropertyPeekPanel({ listing, signal, presetId, onClose }: Props) {
  const open = listing != null
  return (
    <aside
      className={`home-hero__panel${open ? ' home-hero__panel--open' : ''}`}
      aria-hidden={!open}
      aria-label="Property preview"
    >
      {listing && (
        <PeekBody listing={listing} signal={signal} presetId={presetId} onClose={onClose} />
      )}
    </aside>
  )
}

function PeekBody({
  listing,
  signal,
  presetId,
  onClose,
}: Props & { listing: MapListing }) {
  const router = useRouter()
  const { isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()
  const photo = useListingPhoto(listing)
  const rent = getZipRentScreen(listing)

  const runAnalysis = () => {
    trackEvent('hero_cta_click', {
      cta: 'analysis',
      logged_in: isAuthenticated,
      preset_id: presetId,
      property_state: listing.state ?? undefined,
    })
    navigateToDiscoveryFromMap(router, listing)
  }

  const saveProperty = () => {
    trackEvent('hero_cta_click', {
      cta: 'save',
      logged_in: isAuthenticated,
      preset_id: presetId,
    })
    if (!isAuthenticated) {
      openAuthModal('register')
      return
    }
    navigateToDiscoveryFromMap(router, listing)
  }

  return (
    <>
          <div className="home-hero__panel-head">
            <span className="home-hero__panel-kicker">{signal?.label ?? 'Listing'}</span>
            <button
              type="button"
              className="home-hero__panel-close"
              onClick={onClose}
              aria-label="Close property preview"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="home-hero__photo"
            style={photo.src ? { backgroundImage: `url("${photo.src}")` } : undefined}
          >
            {photo.src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.src} alt="" onError={photo.handleError} style={{ display: 'none' }} />
            )}
            <span className="home-hero__badge">{badgeFor(listing, signal)}</span>
            <b>{money(listing.price)}</b>
          </div>

          <div className="home-hero__addr">
            <h3>{listing.address}</h3>
            <p>{meta(listing) || [listing.city, listing.state].filter(Boolean).join(', ')}</p>
          </div>

          <div className="home-hero__gap">
            <div className="home-hero__gap-k">Rent-to-price screen</div>
            <div className="home-hero__gap-v">{rent?.ratioLabel ?? '—'}</div>
            <div className="home-hero__gap-sub">
              {rent
                ? `${rent.rentLabel} ${rent.basisLabel} rent in ${listing.zip_code ?? 'this ZIP'}. A market screen, not this property's number.`
                : 'No rent screen for this ZIP yet. Run the analysis for the real rent and Deal Gap.'}
            </div>
          </div>

          <div className="home-hero__grid">
            <div className="home-hero__cell">
              <div className="home-hero__cell-k">Days on market</div>
              <div className="home-hero__cell-v">
                {listing.days_on_market != null ? listing.days_on_market : 'Off market'}
              </div>
            </div>
            <div className="home-hero__cell">
              <div className="home-hero__cell-k">Price per sq ft</div>
              <div className="home-hero__cell-v">
                {listing.price != null && listing.sqft
                  ? `$${Math.round(listing.price / listing.sqft)}`
                  : '—'}
              </div>
            </div>
            <div className="home-hero__cell">
              <div className="home-hero__cell-k">Type</div>
              <div className="home-hero__cell-v">{listing.property_type ?? '—'}</div>
            </div>
            <div className="home-hero__cell">
              <div className="home-hero__cell-k">Source</div>
              <div className="home-hero__cell-v">{listing.source}</div>
            </div>
          </div>

          <div className="home-hero__lock">
            <Lock size={15} aria-hidden="true" />
            <span>
              <b>The analysis shows the Deal Gap:</b> repaired value, repairs, rent, cash flow, and
              the best of six strategies for this address. Free to run.
            </span>
          </div>

          <div className="home-hero__cta">
            <button type="button" className="home-hero__btn-primary" onClick={runAnalysis}>
              Run the full analysis — free
            </button>
            <button type="button" className="home-hero__btn-outline" onClick={saveProperty}>
              Save this property
            </button>
            <small>No credit card. Takes about 60 seconds.</small>
          </div>
    </>
  )
}
