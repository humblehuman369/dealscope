'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Satellite, Eye } from 'lucide-react'
import { ImageGallery, ImageGallerySkeleton } from './ImageGallery'
import { PhotoLightbox } from './PhotoLightbox'
import { fetchPropertyPhotos, zillowListingUrl } from '@/services/photoService'
import {
  buildSatelliteUrl,
  buildStreetViewUrl,
  resolveBestStreetView,
  type StreetViewParams,
} from '@/lib/streetView'
import { trackEvent } from '@/lib/eventTracking'

const PROPERTY_MAP_ZOOM = 15

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
  const router = useRouter()
  const [state, setState] = useState<GalleryState>(initialImages.length > 0 ? 'loaded' : 'loading')
  const [photos, setPhotos] = useState<string[]>(initialImages)
  const [streetViewFailed, setStreetViewFailed] = useState(false)
  const [satelliteFailed, setSatelliteFailed] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // Resolved Street View framing — pano id + heading computed via the
  // Maps JS StreetViewService so the camera faces the building. Null while
  // the resolution promise is in flight or when no outdoor pano exists.
  const [smartStreetView, setSmartStreetView] = useState<StreetViewParams | null>(null)

  useEffect(() => {
    setStreetViewFailed(false)
    setSatelliteFailed(false)
    setSmartStreetView(null)

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

  // Once we know we'll be falling back to Street View (zillow had no real
  // photos), kick off a one-shot resolve of the *best* framing — nearest
  // outdoor pano with a heading computed toward the parcel — and upgrade
  // the static URL when it lands. The address-first quick path renders
  // first paint, so this is purely a quality-of-image upgrade.
  useEffect(() => {
    if (state !== 'unavailable') return
    if (smartStreetView) return
    if (streetViewFailed) return
    if (latitude == null || longitude == null) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
    if (!apiKey) return

    let cancelled = false
    resolveBestStreetView(apiKey, latitude, longitude).then((params) => {
      if (cancelled) return
      if (params) setSmartStreetView(params)
    })
    return () => {
      cancelled = true
    }
  }, [state, smartStreetView, streetViewFailed, latitude, longitude])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const displayPhotos = useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
    if (!apiKey || latitude == null || longitude == null) return photos
    const mapUrl =
      `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}` +
      `&zoom=15&size=640x427&scale=2&maptype=roadmap` +
      `&markers=color:red%7C${latitude},${longitude}&key=${apiKey}`
    return [...photos, mapUrl]
  }, [photos, latitude, longitude])

  const mapTileIndex =
    displayPhotos.length > photos.length && latitude != null && longitude != null
      ? photos.length
      : undefined

  const openMapSearch = useCallback(() => {
    trackEvent('map_search_opened', {
      source: 'property_photo_gallery_map_tile',
      has_coordinates: latitude != null && longitude != null,
    })

    const params = new URLSearchParams()
    if (latitude != null && longitude != null) {
      params.set('lat', String(latitude))
      params.set('lng', String(longitude))
      params.set('zoom', String(PROPERTY_MAP_ZOOM))
      params.set('focus', 'property')
      if (address) params.set('label', address)
    } else if (address) {
      params.set('label', address)
    }

    const qs = params.toString()
    router.push(qs ? `/map-search?${qs}` : '/map-search')
  }, [address, latitude, longitude, router])

  const handleImageClick = useCallback(
    (index: number) => {
      if (mapTileIndex != null && index === mapTileIndex) {
        openMapSearch()
        return
      }
      setLightboxIndex(index)
    },
    [mapTileIndex, openMapSearch],
  )

  if (state === 'loading') {
    return <ImageGallerySkeleton />
  }

  if (state === 'unavailable') {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
    const hasCoords = latitude != null && longitude != null
    // Tiered fallback when Zillow has no listing photos (typical for
    // off-market properties): satellite first, then Street View only after
    // the camera is aimed at the parcel. Address-first Street View often
    // faces the road (hedge, sidewalk) instead of the house.
    let streetViewUrl: string | null = null
    let satelliteUrl: string | null = null
    if (apiKey && !streetViewFailed && smartStreetView) {
      streetViewUrl = buildStreetViewUrl({
        apiKey,
        size: '600x400',
        params: smartStreetView,
      })
    }
    if (apiKey && hasCoords && latitude != null && longitude != null && !satelliteFailed) {
      satelliteUrl = buildSatelliteUrl({
        apiKey,
        latitude,
        longitude,
        size: '600x400',
      })
    }

    // Address-first Street View often faces the road (hedge, sidewalk,
    // a pedestrian) instead of the house. Only show Street View after
    // StreetViewService has a pano + heading toward the parcel.
    if (streetViewUrl && smartStreetView) {
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
            {/* Source badge so users understand this is Street View, not a
                real listing photo — matches the badge Zillow shows when they
                use the same fallback. */}
            <div className="absolute top-3 left-3">
              <div
                className="px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--surface-overlay)' }}
              >
                <Eye size={12} style={{ color: 'var(--text-body)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-body)' }}>
                  Street View
                </span>
              </div>
            </div>
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
                <span className="text-xs font-medium" style={{ color: 'var(--text-body)' }}>
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
        images={displayPhotos}
        totalPhotos={photos.length}
        views={views}
        hideThumbnails={hideThumbnails}
        mapTileIndex={mapTileIndex}
        onImageClick={handleImageClick}
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
