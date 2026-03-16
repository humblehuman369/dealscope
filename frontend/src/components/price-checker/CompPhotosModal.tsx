'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Camera, ImageOff, Loader2 } from 'lucide-react'
import { fetchPropertyPhotos, type PhotoResult } from '@/services/photoService'

interface CompPhotosModalProps {
  comp: { zpid: string; address: string }
  open: boolean
  onClose: () => void
}

export function CompPhotosModal({ comp, open, onClose }: CompPhotosModalProps) {
  const [photos, setPhotos] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})

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
    return () => { cancelled = true }
  }, [open, comp.zpid])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (status === 'success' && photos.length > 1) {
        if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + photos.length) % photos.length)
        if (e.key === 'ArrowRight') setIndex(i => (i + 1) % photos.length)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, status, photos.length])

  const prev = useCallback(() => setIndex(i => (i - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setIndex(i => (i + 1) % photos.length), [photos.length])
  const handleImgError = useCallback((idx: number) => setImgErrors(prev => ({ ...prev, [idx]: true })), [])

  if (!open) return null

  const currentFailed = imgErrors[index]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-[#0a0a0a] border border-[rgba(14,165,233,0.3)] shadow-[0_0_60px_rgba(14,165,233,0.12)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(14,165,233,0.2)]">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#F1F5F9] truncate">{comp.address}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/[0.07] text-[#F1F5F9] hover:text-white transition-colors"
            aria-label="Close photos"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative">
          {/* Loading */}
          {status === 'loading' && (
            <div className="h-72 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin" />
              <span className="text-sm text-[#F1F5F9]">Loading photos...</span>
            </div>
          )}

          {/* Empty / Error */}
          {(status === 'empty' || status === 'error') && (
            <div className="h-72 flex flex-col items-center justify-center gap-3">
              <ImageOff className="w-10 h-10 text-[#F1F5F9]" />
              <span className="text-sm text-[#F1F5F9]">{errorMsg || 'No photos available'}</span>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[#38bdf8] text-black text-xs font-semibold hover:bg-[#38bdf8]/90 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Carousel */}
          {status === 'success' && (
            <>
              <div className="relative h-72 bg-[var(--surface-base)]">
                {currentFailed ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <ImageOff className="w-8 h-8 text-[#F1F5F9]" />
                    <span className="text-xs text-[#F1F5F9]">Photo unavailable</span>
                  </div>
                ) : (
                  <img
                    key={photos[index]}
                    src={photos[index]}
                    alt={`Comp photo ${index + 1} of ${photos.length}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => handleImgError(index)}
                  />
                )}

                {/* Counter badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm flex items-center gap-1.5">
                  <Camera className="w-3 h-3 text-[#F1F5F9]" />
                  <span className="text-xs font-medium text-[#F1F5F9] tabular-nums">
                    {index + 1} / {photos.length}
                  </span>
                </div>

                {/* Prev / Next arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
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
                      onClick={() => setIndex(i)}
                      className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
                        i === index
                          ? 'border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
