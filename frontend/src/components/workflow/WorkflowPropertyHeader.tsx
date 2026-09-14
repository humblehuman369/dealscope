'use client'

import { useEffect, useMemo, useState } from 'react'

import { PhotoLightbox } from '@/components/property-details/PhotoLightbox'
import { fetchPropertyPhotos } from '@/services/photoService'

export interface WorkflowPropertyHeaderProps {
  address: string
  city?: string
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
    const baths = Number.isInteger(input.baths) ? String(input.baths) : input.baths.toFixed(1)
    parts.push(`${baths} ba`)
  }
  if (input.sqft != null && input.sqft > 0) parts.push(`${input.sqft.toLocaleString('en-US')} sqft`)
  if (input.yearBuilt != null && input.yearBuilt > 0) parts.push(`Built ${input.yearBuilt}`)
  return parts.join(' · ')
}

export function formatStatusPill(input: {
  listingStatus?: string
  daysOnMarket?: number | null
  pipelineStage?: string | null
}): string {
  if (input.pipelineStage) return input.pipelineStage
  const listed =
    input.listingStatus === 'FOR_SALE' ||
    input.listingStatus === 'PENDING' ||
    input.listingStatus === 'FOR_RENT'
  if (!listed) return 'Off-market'
  if (input.daysOnMarket != null && input.daysOnMarket > 0) {
    return `Listed · ${input.daysOnMarket} days`
  }
  return 'Listed'
}

export function WorkflowPropertyHeader({
  address,
  city,
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
}: WorkflowPropertyHeaderProps) {
  const [photos, setPhotos] = useState<string[]>(photoUrl ? [photoUrl] : [])
  const [photosReady, setPhotosReady] = useState(!zpid)
  const [broken, setBroken] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    setBroken(false)
    if (photoUrl) setPhotos([photoUrl])
    if (!zpid) {
      setPhotos(photoUrl ? [photoUrl] : [])
      setPhotosReady(true)
      return
    }
    let cancelled = false
    setPhotosReady(false)
    fetchPropertyPhotos(String(zpid)).then((result) => {
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
  }, [zpid, photoUrl])

  const firstPhoto = !broken && photos[0] ? photos[0] : null
  const showPlaceholder = photosReady && !firstPhoto
  const facts = formatFactsLine({ city, zip, beds, baths, sqft, yearBuilt })
  const status = formatStatusPill({ listingStatus, daysOnMarket, pipelineStage })
  const alt = useMemo(
    () => photoAltText({ address, description, city, beds, baths }),
    [address, description, city, beds, baths],
  )

  return (
    <header
      className="w-full px-3 sm:px-6 py-3"
      style={{
        background: 'var(--surface-chrome)',
        borderBottom: '1px solid var(--border-subtle)',
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
                alt={alt}
                className="w-full h-full"
                style={{ objectFit: 'cover' }}
                referrerPolicy="no-referrer"
                onError={() => setBroken(true)}
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
          {firstPhoto ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="text-[13px] bg-transparent border-0 p-0 underline decoration-dotted underline-offset-4"
              style={{ color: 'var(--accent-sky)' }}
            >
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h1
            className="m-0 font-semibold leading-tight text-[24px]"
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
        </div>
      </div>

      {lightboxOpen && photos.length > 0 ? (
        <PhotoLightbox images={photos} initialIndex={0} onClose={() => setLightboxOpen(false)} />
      ) : null}
    </header>
  )
}
