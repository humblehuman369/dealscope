'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Eye, Camera, ImageOff, GalleryHorizontalEnd } from 'lucide-react'
import { formatNumber } from './utils'

interface ImageGalleryProps {
  images: string[]
  totalPhotos: number
  views?: number
  hideThumbnails?: boolean
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
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + rawImages.length) % rawImages.length)

  const handleImageError = (index: number) => {
    setImageError((prev) => ({ ...prev, [index]: true }))
  }

  if (isDesktop) {
    return <DesktopMosaic
      images={rawImages}
      totalPhotos={totalPhotos}
      views={views}
      imageError={imageError}
      onImageError={handleImageError}
      onImageClick={onImageClick}
    />
  }

  return (
    <div className="space-y-3">
      {/* Main Image Container */}
      <div
        className="relative rounded-[14px] overflow-hidden cursor-pointer"
        style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
        onClick={() => onImageClick?.(currentIndex)}
      >
        {currentVisible ? (
          <img
            src={rawImages[currentIndex]}
            alt={`Property photo ${currentIndex + 1}`}
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
          {hasImages && (
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
              onClick={(e) => { e.stopPropagation(); prevImage() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-card-hover)]"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} style={{ color: 'var(--text-heading)' }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage() }}
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
}

function DesktopMosaic({
  images,
  totalPhotos,
  views,
  imageError,
  onImageError,
  onImageClick,
}: DesktopMosaicProps) {
  const visibleCount = Math.min(images.length, 5)
  const remaining = totalPhotos - visibleCount

  return (
    <div
      className="grid grid-rows-2 gap-1.5 rounded-[14px] overflow-hidden"
      style={{
        height: 400,
        backgroundColor: 'var(--surface-elevated)',
        gridTemplateColumns: '3fr 1fr 1fr',
      }}
    >
      {/* Hero — left 60% (first column), full height (2 rows) */}
      <MosaicCell
        image={images[0]}
        index={0}
        failed={imageError[0]}
        onError={onImageError}
        onClick={onImageClick}
        className="row-span-2"
      >
        {/* Views badge */}
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

        {/* Photo count badge */}
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
      </MosaicCell>

      {/* Small cells — right 40% (1 col), 2 rows */}
      {[1, 2, 3, 4].map((i) => {
        if (i >= images.length) return null

        const isLastVisible = i === visibleCount - 1 && remaining > 0

        return (
          <MosaicCell
            key={i}
            image={images[i]}
            index={i}
            failed={imageError[i]}
            onError={onImageError}
            onClick={onImageClick}
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

      {/* Fill empty right-side cells when fewer than 5 images */}
      {images.length < 5 && Array.from({ length: 5 - images.length }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          <ImageOff size={20} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
        </div>
      ))}
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
}

function MosaicCell({ image, index, failed, onError, onClick, className = '', children }: MosaicCellProps) {
  return (
    <button
      type="button"
      className={`relative overflow-hidden group cursor-pointer ${className}`}
      onClick={() => onClick?.(index)}
      aria-label={`View photo ${index + 1}`}
    >
      {image && !failed ? (
        <img
          src={image}
          alt={`Property photo ${index + 1}`}
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
        style={{ height: 400, backgroundColor: 'var(--surface-elevated)', gridTemplateColumns: '3fr 1fr 1fr' }}
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
