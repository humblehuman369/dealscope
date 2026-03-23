'use client'

import { useEffect, useState } from 'react'
import { Home } from 'lucide-react'
import { ImageGallery, ImageGallerySkeleton } from './ImageGallery'
import { fetchPropertyPhotos, zillowListingUrl } from '@/services/photoService'

const GALLERY_HEIGHT_PX = 400

type GalleryState = 'loading' | 'loaded' | 'unavailable'

interface PropertyPhotoGalleryProps {
  zpid: string
  /** Initial images from server (usually empty when photos are fetched client-side) */
  initialImages?: string[]
  views?: number
  hideThumbnails?: boolean
}

/**
 * Non-blocking photo gallery: shows skeleton first, fetches photos in background,
 * then shows gallery or a clean fallback. Never blocks the page or shows technical errors.
 */
export function PropertyPhotoGallery({
  zpid,
  initialImages = [],
  views,
  hideThumbnails,
}: PropertyPhotoGalleryProps) {
  const [state, setState] = useState<GalleryState>(
    initialImages.length > 0 ? 'loaded' : 'loading'
  )
  const [photos, setPhotos] = useState<string[]>(initialImages)

  useEffect(() => {
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

  if (state === 'loading') {
    return <ImageGallerySkeleton />
  }

  if (state === 'unavailable') {
    return (
      <div className="space-y-3">
        <div
          className="relative rounded-[14px] overflow-hidden flex flex-col items-center justify-center gap-3"
          style={{ height: `${GALLERY_HEIGHT_PX}px`, backgroundColor: 'var(--surface-elevated)' }}
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
    <ImageGallery
      images={photos}
      totalPhotos={photos.length}
      views={views}
      hideThumbnails={hideThumbnails}
    />
  )
}
