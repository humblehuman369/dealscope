'use client'

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera,
  ImageOff,
  GalleryHorizontalEnd,
  MapPin,
} from 'lucide-react'
import { formatNumber } from './utils'

interface ImageGalleryProps {
  images: string[]
  totalPhotos: number
  views?: number
  hideThumbnails?: boolean
  /** When set, this index is a map tile that opens map search instead of the lightbox */
  mapTileIndex?: number
  onImageClick?: (index: number) => void
}

/**
 * Responsive image gallery.
 *
 * - Mobile (< md): single-image carousel with prev/next + thumbnail strip
 * - Desktop (md+, 768px): compact mosaic grid (1 hero + up to 4 smaller images)
 *   that opens a lightbox on click
 *
 * Uses referrerPolicy="no-referrer" on all <img> tags to bypass
 * Zillow CDN hotlink protection.
 */
export function ImageGallery({
  images: rawImages,
  totalPhotos,
  views,
  hideThumbnails,
  mapTileIndex,
  onImageClick,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState<Record<number, boolean>>({})
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const hasImages = rawImages.length > 0
  const currentFailed = hasImages && imageError[currentIndex]
  const currentVisible = hasImages && rawImages[currentIndex] && !currentFailed

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % rawImages.length)
  const prevImage = () =>
    setCurrentIndex((prev) => (prev - 1 + rawImages.length) % rawImages.length)

  const handleImageError = (index: number) => {
    setImageError((prev) => ({ ...prev, [index]: true }))
  }

  if (isDesktop) {
    return (
      <DesktopMosaic
        images={rawImages}
        totalPhotos={totalPhotos}
        views={views}
        imageError={imageError}
        onImageError={handleImageError}
        onImageClick={onImageClick}
        mapTileIndex={mapTileIndex}
      />
    )
  }

  const isMapSlide = mapTileIndex != null && currentIndex === mapTileIndex

  return (
    <div className="space-y-3">
      {/* Main Image Container */}
      <div
        className="relative rounded-[14px] overflow-hidden cursor-pointer"
        style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
        onClick={() => onImageClick?.(currentIndex)}
        role="button"
        tabIndex={0}
        aria-label={
          isMapSlide
            ? 'View property location on map search'
            : `View photo ${currentIndex + 1}`
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onImageClick?.(currentIndex)
          }
        }}
      >
        {currentVisible ? (
          <img
            src={rawImages[currentIndex]}
            alt={
              isMapSlide
                ? 'Property location map'
                : `Property photo ${currentIndex + 1}`
            }
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => handleImageError(currentIndex)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <ImageOff size={48} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Photo unavailable
            </span>
          </div>
        )}

        {isMapSlide && <MapTileBadge />}

        {/* Top Bar - Views & Photo Counter */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {views !== undefined && (
            <div
              className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
            >
              <Eye size={14} style={{ color: 'var(--text-secondary)' }} />
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatNumber(views)} views
              </span>
            </div>
          )}
          {hasImages && totalPhotos > 1 && (
            <div
              className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2 ml-auto"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
            >
              <Camera size={14} style={{ color: 'var(--text-secondary)' }} />
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}
              >
                {currentIndex + 1}/{totalPhotos}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {rawImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevImage()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-card-hover)]"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} style={{ color: 'var(--text-heading)' }} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextImage()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-card-hover)]"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
              aria-label="Next image"
            >
              <ChevronRight size={20} style={{ color: 'var(--text-heading)' }} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {!hideThumbnails && rawImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rawImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: i === currentIndex ? 'var(--accent-sky)' : 'transparent',
                boxShadow: i === currentIndex ? '0 0 0 2px var(--color-sky-dim)' : 'none',
              }}
            >
              {img && !imageError[i] ? (
                <img
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => handleImageError(i)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
              )}
            </button>
          ))}
          {totalPhotos > rawImages.length && (
            <button
              className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center text-sm font-semibold border-2 border-transparent transition-colors hover:bg-[var(--surface-card-hover)]"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            >
              +{totalPhotos - rawImages.length}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Desktop Mosaic                                                     */
/* ------------------------------------------------------------------ */

interface DesktopMosaicProps {
  images: string[]
  totalPhotos: number
  views?: number
  imageError: Record<number, boolean>
  onImageError: (index: number) => void
  onImageClick?: (index: number) => void
  mapTileIndex?: number
}

/**
 * Reusable hero badges (views + total photo count). Hidden when there's only
 * one photo because "1 photo" is noise — the count is self-evident.
 */
function HeroBadges({ views, totalPhotos }: { views?: number; totalPhotos: number }) {
  return (
    <>
      {views !== undefined && (
        <div className="absolute top-4 left-4 z-10">
          <div
            className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2"
            style={{ backgroundColor: 'var(--surface-overlay)' }}
          >
            <Eye size={14} style={{ color: 'var(--text-secondary)' }} />
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatNumber(views)} views
            </span>
          </div>
        </div>
      )}
      {totalPhotos > 1 && (
        <div className="absolute top-4 right-4 z-10">
          <div
            className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2"
            style={{ backgroundColor: 'var(--surface-overlay)' }}
          >
            <Camera size={14} style={{ color: 'var(--text-secondary)' }} />
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}
            >
              {totalPhotos} photos
            </span>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Desktop layout adapts to the photo count so we never render empty
 * placeholder cells (which look broken). Layouts:
 *   1 photo   → single full-width hero (height 400)
 *   2 photos  → hero (2/3) + side image (1/3), full height
 *   3 photos  → hero (2/3) + 2 stacked thumbnails (1/3)
 *   4 photos  → hero (3/5) + 2 stacked thumbnails + 1 wide bottom cell
 *   5+ photos → original mosaic with "+N more" overlay on the 5th cell
 */
function DesktopMosaic({
  images,
  totalPhotos,
  views,
  imageError,
  onImageError,
  onImageClick,
  mapTileIndex,
}: DesktopMosaicProps) {
  const containerStyle = {
    height: 400,
    backgroundColor: 'var(--surface-elevated)',
  } as const
  const containerClass = 'grid gap-1.5 rounded-[14px] overflow-hidden'

  // When a map tile is appended and there are many listing photos, pin the
  // map in the last mosaic slot so it stays visible instead of hiding
  // behind "+N more".
  if (
    mapTileIndex != null &&
    mapTileIndex < images.length &&
    images.length > 5
  ) {
    const listingPhotos = images.slice(0, mapTileIndex)
    const mapImage = images[mapTileIndex]
    const hiddenPhotoCount = Math.max(0, listingPhotos.length - 4)

    return (
      <div
        className={`${containerClass} grid-rows-2`}
        style={{ ...containerStyle, gridTemplateColumns: '3fr 1fr 1fr' }}
      >
        <MosaicCell
          image={listingPhotos[0]}
          index={0}
          failed={imageError[0]}
          onError={onImageError}
          onClick={onImageClick}
          className="row-span-2"
          mapTileIndex={mapTileIndex}
        >
          <HeroBadges views={views} totalPhotos={totalPhotos} />
        </MosaicCell>
        {[1, 2].map((i) => (
          <MosaicCell
            key={i}
            image={listingPhotos[i]}
            index={i}
            failed={imageError[i]}
            onError={onImageError}
            onClick={onImageClick}
            mapTileIndex={mapTileIndex}
          />
        ))}
        <MosaicCell
          image={listingPhotos[3]}
          index={3}
          failed={imageError[3]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        >
          {hiddenPhotoCount > 0 && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 z-10">
              <GalleryHorizontalEnd size={20} style={{ color: 'var(--text-heading)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                +{hiddenPhotoCount} more
              </span>
            </div>
          )}
        </MosaicCell>
        <MosaicCell
          image={mapImage}
          index={mapTileIndex}
          failed={imageError[mapTileIndex]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        />
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className={containerClass} style={containerStyle}>
        <MosaicCell
          image={images[0]}
          index={0}
          failed={imageError[0]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        >
          <HeroBadges views={views} totalPhotos={totalPhotos} />
        </MosaicCell>
      </div>
    )
  }

  if (images.length === 2) {
    return (
      <div className={containerClass} style={{ ...containerStyle, gridTemplateColumns: '2fr 1fr' }}>
        <MosaicCell
          image={images[0]}
          index={0}
          failed={imageError[0]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        >
          <HeroBadges views={views} totalPhotos={totalPhotos} />
        </MosaicCell>
        <MosaicCell
          image={images[1]}
          index={1}
          failed={imageError[1]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        />
      </div>
    )
  }

  if (images.length === 3) {
    return (
      <div
        className={`${containerClass} grid-rows-2`}
        style={{ ...containerStyle, gridTemplateColumns: '2fr 1fr' }}
      >
        <MosaicCell
          image={images[0]}
          index={0}
          failed={imageError[0]}
          onError={onImageError}
          onClick={onImageClick}
          className="row-span-2"
          mapTileIndex={mapTileIndex}
        >
          <HeroBadges views={views} totalPhotos={totalPhotos} />
        </MosaicCell>
        <MosaicCell
          image={images[1]}
          index={1}
          failed={imageError[1]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        />
        <MosaicCell
          image={images[2]}
          index={2}
          failed={imageError[2]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        />
      </div>
    )
  }

  if (images.length === 4) {
    return (
      <div
        className={`${containerClass} grid-rows-2`}
        style={{ ...containerStyle, gridTemplateColumns: '3fr 1fr 1fr' }}
      >
        <MosaicCell
          image={images[0]}
          index={0}
          failed={imageError[0]}
          onError={onImageError}
          onClick={onImageClick}
          className="row-span-2"
          mapTileIndex={mapTileIndex}
        >
          <HeroBadges views={views} totalPhotos={totalPhotos} />
        </MosaicCell>
        <MosaicCell
          image={images[1]}
          index={1}
          failed={imageError[1]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        />
        <MosaicCell
          image={images[2]}
          index={2}
          failed={imageError[2]}
          onError={onImageError}
          onClick={onImageClick}
          mapTileIndex={mapTileIndex}
        />
        <MosaicCell
          image={images[3]}
          index={3}
          failed={imageError[3]}
          onError={onImageError}
          onClick={onImageClick}
          className="col-span-2"
          mapTileIndex={mapTileIndex}
        />
      </div>
    )
  }

  const visibleCount = Math.min(images.length, 5)
  const remaining = totalPhotos - visibleCount

  return (
    <div
      className={`${containerClass} grid-rows-2`}
      style={{ ...containerStyle, gridTemplateColumns: '3fr 1fr 1fr' }}
    >
      <MosaicCell
        image={images[0]}
        index={0}
        failed={imageError[0]}
        onError={onImageError}
        onClick={onImageClick}
        className="row-span-2"
        mapTileIndex={mapTileIndex}
      >
        <HeroBadges views={views} totalPhotos={totalPhotos} />
      </MosaicCell>
      {[1, 2, 3, 4].map((i) => {
        const isLastVisible = i === visibleCount - 1 && remaining > 0
        return (
          <MosaicCell
            key={i}
            image={images[i]}
            index={i}
            failed={imageError[i]}
            onError={onImageError}
            onClick={onImageClick}
            mapTileIndex={mapTileIndex}
          >
            {isLastVisible && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 z-10">
                <GalleryHorizontalEnd size={20} style={{ color: 'var(--text-heading)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  +{remaining} more
                </span>
              </div>
            )}
          </MosaicCell>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Map tile badge                                                     */
/* ------------------------------------------------------------------ */

function MapTileBadge() {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-3 pointer-events-none z-10">
      <div
        className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5"
        style={{ backgroundColor: 'var(--surface-overlay)' }}
      >
        <MapPin size={14} style={{ color: 'var(--accent-sky)' }} aria-hidden />
        <span className="text-xs font-semibold" style={{ color: 'var(--accent-sky)' }}>
          View on map
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MosaicCell                                                         */
/* ------------------------------------------------------------------ */

interface MosaicCellProps {
  image?: string
  index: number
  failed?: boolean
  onError: (index: number) => void
  onClick?: (index: number) => void
  className?: string
  children?: React.ReactNode
  mapTileIndex?: number
}

function MosaicCell({
  image,
  index,
  failed,
  onError,
  onClick,
  className = '',
  children,
  mapTileIndex,
}: MosaicCellProps) {
  const isMapTile = mapTileIndex != null && index === mapTileIndex

  return (
    <button
      type="button"
      className={`relative overflow-hidden group cursor-pointer ${className}`}
      onClick={() => onClick?.(index)}
      aria-label={
        isMapTile ? 'View property location on map search' : `View photo ${index + 1}`
      }
    >
      {image && !failed ? (
        <img
          src={image}
          alt={isMapTile ? 'Property location map' : `Property photo ${index + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={() => onError(index)}
        />
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          <ImageOff size={24} style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}
      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      {children}
      {isMapTile && <MapTileBadge />}
    </button>
  )
}

/**
 * ImageGallerySkeleton
 * Loading state — matches mosaic on desktop, carousel on mobile.
 */
export function ImageGallerySkeleton() {
  return (
    <>
      {/* Mobile skeleton (hidden on md+) */}
      <div className="space-y-3 md:hidden">
        <div
          className="relative rounded-[14px] overflow-hidden animate-pulse"
          style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <ImageOff size={48} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading property photos...
            </span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-16 h-16 rounded-lg animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
          ))}
        </div>
      </div>

      {/* Desktop skeleton (hidden below md) */}
      <div
        className="hidden md:grid grid-rows-2 gap-1.5 rounded-[14px] overflow-hidden animate-pulse"
        style={{
          height: 400,
          backgroundColor: 'var(--surface-elevated)',
          gridTemplateColumns: '3fr 1fr 1fr',
        }}
      >
        <div className="row-span-2" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <ImageOff size={48} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading property photos...
            </span>
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ backgroundColor: 'var(--surface-card)' }} />
        ))}
      </div>
    </>
  )
}
