'use client'

import { useEffect, useCallback, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Camera, ImageOff } from 'lucide-react'

interface PhotoLightboxProps {
  images: string[]
  initialIndex?: number
  onClose: () => void
}

/**
 * Full-screen photo lightbox with keyboard navigation, thumbnails,
 * and wrapping prev/next. Uses theme surface variables for consistency
 * with the dark fintech aesthetic.
 *
 * All <img> tags use referrerPolicy="no-referrer" to bypass Zillow CDN
 * hotlink protection (same as ImageGallery).
 */
export function PhotoLightbox({ images, initialIndex = 0, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  )
  const next = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length],
  )
  const handleImgError = useCallback(
    (idx: number) => setImgErrors((prev) => ({ ...prev, [idx]: true })),
    [],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const currentFailed = imgErrors[index]

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div
          className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2"
          style={{ backgroundColor: 'var(--surface-overlay)' }}
        >
          <Camera size={14} style={{ color: 'var(--text-secondary)' }} />
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}
          >
            {index + 1} / {images.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/15"
          style={{ backgroundColor: 'var(--surface-overlay)' }}
          aria-label="Close lightbox"
        >
          <X size={20} style={{ color: 'var(--text-heading)' }} />
        </button>
      </div>

      {/* Main image area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-4 sm:px-16">
        {currentFailed ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <ImageOff size={48} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Photo unavailable
            </span>
          </div>
        ) : (
          <img
            key={images[index]}
            src={images[index]}
            alt={`Property photo ${index + 1} of ${images.length}`}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => handleImgError(index)}
          />
        )}

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors hover:bg-white/15"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
              aria-label="Previous photo"
            >
              <ChevronLeft size={24} style={{ color: 'var(--text-heading)' }} />
            </button>
            <button
              onClick={next}
              className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors hover:bg-white/15"
              style={{ backgroundColor: 'var(--surface-overlay)' }}
              aria-label="Next photo"
            >
              <ChevronRight size={24} style={{ color: 'var(--text-heading)' }} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex-shrink-0 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto justify-center pb-1">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: i === index ? 'var(--accent-sky)' : 'transparent',
                  boxShadow: i === index ? '0 0 0 2px var(--color-sky-dim)' : 'none',
                  opacity: i === index ? 1 : 0.6,
                }}
              >
                {!imgErrors[i] ? (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => handleImgError(i)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff size={12} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
