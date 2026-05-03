'use client'

import { useEffect, useState, useCallback } from 'react'
import { Home, Satellite } from 'lucide-react'
import { ImageGallery, ImageGallerySkeleton } from './ImageGallery'
import { PhotoLightbox } from './PhotoLightbox'
import { fetchPropertyPhotos, zillowListingUrl } from '@/services/photoService'

type GalleryState = 'loading' | 'loaded' | 'unavailable'

interface PropertyPhotoGalleryProps {
  zpid: string
  /** Initial images from server (usually empty when photos are fetched client-side) */
  initialImages?: string[]
  views?: number
  hideThumbnails?: boolean
  /** Used for Google Street View fallback when Zillow photos are unavailable */
  address?: string
  latitude?: number
  longitude?: number
}

/**
 * Non-blocking photo gallery: shows skeleton first, fetches photos in background,
 * then shows gallery or a clean fallback. Never blocks the page or shows technical errors.
 *
 * On desktop, clicking any image opens a full-screen PhotoLightbox for browsing.
 */
export function PropertyPhotoGallery({
  zpid,
  initialImages = [],
  views,
  hideThumbnails,
  address,
  latitude,
  longitude,
}: PropertyPhotoGalleryProps) {
  const [state, setState] = useState<GalleryState>(
    initialImages.length > 0 ? 'loaded' : 'loading'
  )
  const [photos, setPhotos] = useState<string[]>(initialImages)
  const [streetViewFailed, setStreetViewFailed] = useState(false)
  const [satelliteFailed, setSatelliteFailed] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    setStreetViewFailed(false)
    setSatelliteFailed(false)

    if (initialImages.length > 0) {
      setState('loaded')
      setPhotos(initialImages)
      return
    }
    if (!zpid) {
      setState('unavailable')
      return
    }

    let cancelled = false
    fetchPropertyPhotos(zpid)
      .then((result) => {
        if (cancelled) return
        if (result.status === 'success' && result.photos.length > 0) {
          setPhotos(result.photos)
          setState('loaded')
        } else {
          setState('unavailable')
        }
      })
      .catch(() => {
        if (!cancelled) setState('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [zpid, initialImages.length])

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  if (state === 'loading') {
    return <ImageGallerySkeleton />
  }

  if (state === 'unavailable') {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
    const hasCoords = latitude != null && longitude != null
    // Tiered fallback when Zillow has no listing photos (typical for
    // off-market properties): Street View → Satellite tile → text panel.
    // Investors care about the parcel context (lot size/shape, neighborhood,
    // pool/roof) even when no real photos exist — a satellite tile is far
    // more useful than a "Photos not available" message.
    let streetViewUrl: string | null = null
    let satelliteUrl: string | null = null
    if (apiKey && !streetViewFailed) {
      // return_error_code=true → Google returns HTTP 404 when no panorama
      // exists at the location instead of the gray "Sorry, we have no
      // imagery here" placeholder image (which loads as 200 OK and would
      // never trigger our <img onError>, leaving a near-white box in dark
      // mode for off-market properties in gated communities or rural areas).
      // source=outdoor avoids interior PhotoSpheres for residential homes.
      // See: https://developers.google.com/maps/documentation/streetview/request-streetview#no-imagery
      const sv = 'size=600x400&source=outdoor&return_error_code=true'
      if (hasCoords) {
        streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?${sv}&location=${latitude},${longitude}&key=${apiKey}`
      } else if (address) {
        streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?${sv}&location=${encodeURIComponent(address)}&key=${apiKey}`
      }
    }
    if (apiKey && hasCoords && !satelliteFailed) {
      // Satellite tile — exists for every lat/lng on Earth, so this
      // guarantees a useful image. zoom=19 frames the parcel; on urban
      // lots this shows the house, on rural lots it shows context.
      satelliteUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=19&size=600x400&maptype=satellite&key=${apiKey}`
    }

    if (streetViewUrl) {
      return (
        <div className="space-y-3">
          <div
            className="relative rounded-[14px] overflow-hidden"
            style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
          >
            <img
              src={streetViewUrl}
              alt={`Street view of ${address ?? 'property'}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setStreetViewFailed(true)}
            />
          </div>
        </div>
      )
    }

    if (satelliteUrl) {
      return (
        <div className="space-y-3">
          <div
            className="relative rounded-[14px] overflow-hidden"
            style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
          >
            <img
              src={satelliteUrl}
              alt={`Satellite view of ${address ?? 'property'}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setSatelliteFailed(true)}
            />
            {/* Source label so the user understands this is a satellite
                tile, not a real listing photo. Mirrors badge styling used
                by the in-gallery photo counter. */}
            <div className="absolute top-3 left-3">
              <div
                className="px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--surface-overlay)' }}
              >
                <Satellite size={12} style={{ color: 'var(--text-body)' }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-body)' }}
                >
                  Satellite view
                </span>
              </div>
            </div>
            {/* Zillow link in the corner so the off-market workflow ("see
                what little Zillow has") is still one tap away. */}
            <div className="absolute bottom-3 right-3">
              <a
                href={zillowListingUrl(zpid)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg backdrop-blur-md text-xs font-medium"
                style={{
                  backgroundColor: 'var(--surface-overlay)',
                  color: 'var(--accent-sky)',
                }}
              >
                View on Zillow →
              </a>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div
          className="relative rounded-[14px] overflow-hidden flex flex-col items-center justify-center gap-3"
          style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
        >
          <Home size={48} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Photos not available
          </span>
          <a
            href={zillowListingUrl(zpid)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent-sky)' }}
          >
            View on Zillow →
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <ImageGallery
        images={photos}
        totalPhotos={photos.length}
        views={views}
        hideThumbnails={hideThumbnails}
        onImageClick={openLightbox}
      />
      {lightboxIndex !== null && (
        <PhotoLightbox
          images={photos}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  )
}
