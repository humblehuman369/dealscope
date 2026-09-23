'use client'

import { useEffect, useMemo, useState } from 'react'

import { PhotoLightbox } from '@/components/property-details/PhotoLightbox'
import { V1_UI_FONT } from '@/components/workflow/v1-style'
import { countLabel } from '@/lib/pluralize'
import { buildHeroPhotoCandidates } from '@/lib/streetView'
import { fetchPropertyPhotos } from '@/services/photoService'

export interface WorkflowPropertyHeaderProps {
  address: string
  city?: string
  state?: string
  zip?: string
  beds?: number
  baths?: number
  sqft?: number
  yearBuilt?: number
  listingStatus?: string
  daysOnMarket?: number | null
  pipelineStage?: string | null
  zpid?: string | number
  description?: string | null
  photoUrl?: string | null
  /** Same listing-photo array the flag-off gallery reads. */
  photos?: string[]
  propertyId?: string
  latitude?: number
  longitude?: number
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const sentence = cleaned.match(/^[^.!?]+[.!]?/)?.[0]?.trim() || cleaned
  return sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence
}

export function photoAltText(input: {
  address: string
  description?: string | null
  city?: string
  beds?: number
  baths?: number
}): string {
  const fromListing = input.description ? firstSentence(input.description) : ''
  if (fromListing) return `${input.address}. ${fromListing}`
  const bits: string[] = []
  if (input.beds) bits.push(`${input.beds}-bed`)
  if (input.baths) bits.push(`${input.baths}-bath`)
  if (input.city) bits.push(`in ${input.city}`)
  const fallback = bits.length > 0 ? `${bits.join(' ')} property` : 'Property listing photo'
  return `${input.address}. ${fallback}`
}

/** Display baths to the nearest half (2.5, 3). Never a tenth like 2.7. */
export function formatBathCount(baths: number): string {
  const rounded = Math.round(baths * 2) / 2
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatFactsLine(input: {
  city?: string
  zip?: string
  beds?: number
  baths?: number
  sqft?: number
  yearBuilt?: number
}): string {
  const parts: string[] = []
  const cityZip = [input.city, input.zip].filter(Boolean).join(' ')
  if (cityZip) parts.push(cityZip)
  if (input.beds != null && input.beds > 0) parts.push(`${input.beds} bd`)
  if (input.baths != null && input.baths > 0) {
    parts.push(`${formatBathCount(input.baths)} ba`)
  }
  if (input.sqft != null && input.sqft > 0) parts.push(`${input.sqft.toLocaleString('en-US')} sqft`)
  if (input.yearBuilt != null && input.yearBuilt > 0) parts.push(`Built ${input.yearBuilt}`)
  return parts.join(' · ')
}

export function formatStatusPill(input: {
  listingStatus?: string
  daysOnMarket?: number | null
  pipelineStage?: string | null
}): string | null {
  if (input.pipelineStage) return input.pipelineStage
  if (input.listingStatus == null || input.listingStatus === '') return null
  const listed =
    input.listingStatus === 'FOR_SALE' ||
    input.listingStatus === 'PENDING' ||
    input.listingStatus === 'FOR_RENT'
  if (!listed) return 'Off-market'
  if (input.daysOnMarket != null && input.daysOnMarket > 0) {
    return `Listed · ${countLabel(input.daysOnMarket, 'day')}`
  }
  return 'Listed'
}

export function WorkflowPropertyHeader({
  address,
  city,
  state,
  zip,
  beds,
  baths,
  sqft,
  yearBuilt,
  listingStatus,
  daysOnMarket,
  pipelineStage,
  zpid,
  description,
  photoUrl,
  photos: photosFromGallery,
  propertyId,
  latitude,
  longitude,
}: WorkflowPropertyHeaderProps) {
  const sharedPhotosKey = photosFromGallery ? photosFromGallery.join('\n') : null
  const [photos, setPhotos] = useState<string[]>(() => {
    if (photosFromGallery && photosFromGallery.length > 0) return photosFromGallery
    return photoUrl ? [photoUrl] : []
  })
  const [photosReady, setPhotosReady] = useState(!zpid || photosFromGallery != null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const locationQuery = [address, city, state, zip].filter(Boolean).join(', ')
  const candidates = useMemo(
    () =>
      buildHeroPhotoCandidates({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
        listingPhoto: photos[0] ?? photoUrl ?? null,
        address: locationQuery,
        latitude,
        longitude,
        size: '400x300',
      }),
    [photos, photoUrl, locationQuery, latitude, longitude],
  )
  const primaryCandidate = candidates[0] ?? null
  const [prevPrimary, setPrevPrimary] = useState<string | null>(primaryCandidate)
  if (prevPrimary !== primaryCandidate) {
    setPrevPrimary(primaryCandidate)
    setPhotoIndex(0)
  }
  const firstPhoto = candidates[photoIndex] ?? null

  useEffect(() => {
    setPhotoIndex(0)
    if (sharedPhotosKey != null) {
      setPhotos(sharedPhotosKey === '' ? [] : sharedPhotosKey.split('\n').filter(Boolean))
      setPhotosReady(true)
      return
    }
    if (photoUrl) setPhotos([photoUrl])
    if (!zpid) {
      setPhotos(photoUrl ? [photoUrl] : [])
      setPhotosReady(true)
      return
    }
    let cancelled = false
    setPhotosReady(false)
    fetchPropertyPhotos(String(zpid), propertyId ? { propertyId } : undefined).then((result) => {
      if (cancelled) return
      if (result.status === 'success' && result.photos.length > 0) {
        setPhotos(result.photos)
      } else {
        setPhotos(photoUrl ? [photoUrl] : [])
      }
      setPhotosReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [zpid, photoUrl, propertyId, sharedPhotosKey])

  const showPlaceholder = photosReady && !firstPhoto
  const isListingPhoto = Boolean(firstPhoto && photos[0] && firstPhoto === photos[0])
  const isGooglePhoto = Boolean(firstPhoto?.includes('maps.googleapis.com'))
  const facts = formatFactsLine({ city, zip, beds, baths, sqft, yearBuilt })
  const status = formatStatusPill({ listingStatus, daysOnMarket, pipelineStage })
  const alt = useMemo(
    () => photoAltText({ address, description, city, beds, baths }),
    [address, description, city, beds, baths],
  )

  return (
    <div
      role="region"
      aria-label="Property"
      className="w-full px-3 sm:px-6 py-3"
      style={{
        background: 'var(--surface-chrome)',
        borderBottom: '1px solid var(--border-subtle)',
        fontFamily: V1_UI_FONT,
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex flex-col items-center shrink-0 gap-1">
          <div
            className="overflow-hidden w-[88px] h-[66px] sm:w-[128px] sm:h-[96px]"
            style={{
              borderRadius: 10,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            {firstPhoto ? (
              <img
                src={firstPhoto}
                alt={
                  isListingPhoto
                    ? alt
                    : firstPhoto.includes('streetview')
                      ? `Street view of ${address}`
                      : `Satellite view of ${address}`
                }
                className="w-full h-full"
                style={{ objectFit: 'cover' }}
                referrerPolicy={isGooglePhoto ? undefined : 'no-referrer'}
                onError={() => setPhotoIndex((index) => index + 1)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[13px] text-center px-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showPlaceholder ? 'No photos' : ''}
              </div>
            )}
          </div>
          {isListingPhoto ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="min-h-11 text-[13px] bg-transparent border-0 px-1 underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--accent-sky)', outlineColor: 'var(--accent-sky)' }}
            >
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h1
            className="m-0 font-bold leading-tight text-[24px]"
            style={{ color: 'var(--text-heading)' }}
          >
            {address}
          </h1>
          {facts ? (
            <p
              className="m-0 mt-1 text-[13px] tabular-nums"
              style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {facts}
            </p>
          ) : null}
          {status ? (
          <p
            className="inline-flex items-center mt-2 mb-0 text-[13px] font-medium px-2 py-0.5"
            style={{
              color: 'var(--text-heading)',
              border:
                listingStatus === 'PENDING'
                  ? '1px dashed var(--border-strong)'
                  : '1px solid var(--border-default)',
              borderRadius: 6,
              background: 'var(--surface-elevated)',
            }}
          >
            {status}
          </p>
          ) : null}
        </div>
      </div>

      {lightboxOpen && photos.length > 0 ? (
        <PhotoLightbox images={photos} initialIndex={0} onClose={() => setLightboxOpen(false)} />
      ) : null}
    </div>
  )
}
