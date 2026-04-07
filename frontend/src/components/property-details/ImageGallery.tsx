'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Camera, ImageOff } from 'lucide-react'
import { formatNumber } from './utils'

interface ImageGalleryProps {
  images: string[]
  totalPhotos: number
  views?: number
  hideThumbnails?: boolean
}

/**
 * ImageGallery Component
 *
 * Full-width responsive image gallery with navigation, thumbnails,
 * and photo/view counters. Active thumbnail uses sky blue ring.
 *
 * Uses referrerPolicy="no-referrer" on all <img> tags to bypass
 * Zillow CDN hotlink protection (crossOrigin="anonymous" must NOT be
 * used — Zillow's CDN doesn't serve CORS headers, so it breaks loading).
 * When no photos or all fail to load, shows an empty "Photo unavailable"
 * state (no demo/placeholder images).
 */
export function ImageGallery({ images: rawImages, totalPhotos, views, hideThumbnails }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState<Record<number, boolean>>({})

  const hasImages = rawImages.length > 0
  const currentFailed = hasImages && imageError[currentIndex]
  const currentVisible = hasImages && rawImages[currentIndex] && !currentFailed

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % rawImages.length)
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + rawImages.length) % rawImages.length)

  const handleImageError = (index: number) => {
    setImageError(prev => ({ ...prev, [index]: true }))
  }

  return (
    <div className="space-y-3">
      {/* Main Image Container */}
      <div
        className="relative rounded-[14px] overflow-hidden"
        style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
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
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Photo unavailable</span>
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
              <span className="text-sm font-medium" style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>
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
              <span className="text-sm font-medium" style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>
                {currentIndex + 1}/{totalPhotos}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {rawImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-card-hover)]"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} style={{ color: 'var(--text-heading)' }} />
            </button>
            <button
              onClick={nextImage}
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
                boxShadow: i === currentIndex ? `0 0 0 2px var(--color-sky-dim)` : 'none',
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

/**
 * ImageGallerySkeleton
 * Loading state for the image gallery
 */
export function ImageGallerySkeleton() {
  return (
    <div className="space-y-3">
      <div
        className="relative rounded-[14px] overflow-hidden animate-pulse"
        style={{ aspectRatio: '3/2', backgroundColor: 'var(--surface-elevated)' }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <ImageOff size={48} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading property photos...</span>
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
  )
}
