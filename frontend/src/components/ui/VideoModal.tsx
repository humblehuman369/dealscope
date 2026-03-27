'use client'

import { useCallback, useEffect, useRef } from 'react'

export interface VideoModalProps {
  open: boolean
  onClose: () => void
  src: string
  title?: string
}

export function VideoModal({ open, onClose, src, title }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      const v = videoRef.current
      if (v) {
        v.pause()
        v.currentTime = 0
      }
    }
  }, [open])

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(6px)' }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Video'}
    >
      <div
        ref={panelRef}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 800,
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
      >
        <button
          onClick={onClose}
          autoFocus
          className="absolute top-3 right-3 z-10 flex items-center justify-center rounded-full transition-colors"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(0,0,0,0.55)',
            border: 'none',
            color: '#fff',
          }}
          aria-label="Close video"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          playsInline
          className="w-full block"
          style={{ aspectRatio: '16/9', background: '#000' }}
        />
      </div>
    </div>
  )
}
