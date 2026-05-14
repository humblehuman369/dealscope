'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Camera, ImageOff, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { fetchPropertyPhotos, type PhotoResult } from '@/services/photoService'

interface CompPhotosModalProps {
  comp: { zpid: string; address: string }
  open: boolean
  onClose: () => void
}

/**
 * CompPhotosModal — comparable-property photo gallery.
 *
 * Migrated to the shared <Modal> primitive (P2.4). Inherits backdrop click,
 * Escape, focus trap, and body scroll lock from the primitive; this
 * component only owns the gallery-specific behaviour:
 *   - Fetch photos on open via fetchPropertyPhotos
 *   - Keyboard left/right arrows to advance the carousel
 *   - Per-image error fallback to "Photo unavailable"
 *
 * As a side benefit, the previously hardcoded `bg-[#0a0a0a]` panel is now
 * `var(--surface-card)` (theme-token compliant).
 */
export function CompPhotosModal({ comp, open, onClose }: CompPhotosModalProps) {
  const [photos, setPhotos] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})

  // Reset state + fetch on open. Cancellation flag avoids late
  // resolutions overwriting state after the modal closes.
  useEffect(() => {
    if (!open) return
    setPhotos([])
    setStatus('loading')
    setErrorMsg(null)
    setIndex(0)
    setImgErrors({})

    let cancelled = false
    fetchPropertyPhotos(comp.zpid).then((result: PhotoResult) => {
      if (cancelled) return
      if (result.status === 'success' && result.photos.length > 0) {
        setPhotos(result.photos)
        setStatus('success')
      } else if (result.photos.length === 0) {
        setStatus('empty')
        setErrorMsg(result.error ?? 'No photos available')
      } else {
        setStatus('error')
        setErrorMsg(result.error ?? 'Failed to load photos')
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, comp.zpid])

  // Carousel keyboard navigation. Modal handles Escape itself.
  useEffect(() => {
    if (!open || status !== 'success' || photos.length <= 1) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, status, photos.length])

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length],
  )
  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length])
  const handleImgError = useCallback(
    (idx: number) => setImgErrors((prev) => ({ ...prev, [idx]: true })),
    [],
  )

  const currentFailed = imgErrors[index]

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      aria-label={`Photos for ${comp.address}`}
      hideCloseButton
      fullBleed
    >
      {/* Custom header — single-line address with a close button. */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-heading)] truncate">
            {comp.address}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-[var(--surface-card-hover)] text-[var(--text-heading)] transition-colors"
          aria-label="Close photos"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="relative">
        {status === 'loading' && (
          <div className="h-72 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--accent-sky)] animate-spin" />
            <span className="text-sm text-[var(--text-heading)]">Loading photos...</span>
          </div>
        )}

        {(status === 'empty' || status === 'error') && (
          <div className="h-72 flex flex-col items-center justify-center gap-3">
            <ImageOff className="w-10 h-10 text-[var(--text-heading)]" />
            <span className="text-sm text-[var(--text-heading)]">
              {errorMsg || 'No photos available'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--accent-sky)] text-[var(--text-inverse)] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="relative h-72 bg-[var(--surface-media-letterbox)]">
              {currentFailed ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <ImageOff className="w-8 h-8 text-[var(--text-heading)]" />
                  <span className="text-xs text-[var(--text-heading)]">Photo unavailable</span>
                </div>
              ) : (
                <img
                  key={photos[index]}
                  src={photos[index]}
                  alt={`Comp photo ${index + 1} of ${photos.length}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => handleImgError(index)}
                />
              )}

              {/* Counter badge */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-white" />
                <span className="text-xs font-medium text-white tabular-nums">
                  {index + 1} / {photos.length}
                </span>
              </div>

              {/* Prev / Next arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-1.5 p-3 overflow-x-auto scrollbar-hide">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
                      i === index
                        ? 'border-[var(--accent-sky)] shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    aria-label={`Show photo ${i + 1}`}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
