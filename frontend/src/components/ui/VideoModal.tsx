'use client'

import { useEffect, useRef } from 'react'
import { Modal } from './Modal'

export interface VideoModalProps {
  open: boolean
  onClose: () => void
  src: string
  title?: string
}

/**
 * VideoModal — embedded video player in a modal shell.
 *
 * Built on top of <Modal> (P2.4 primitive), which provides backdrop click,
 * Escape, focus trap, return-focus and body scroll lock. This component
 * only owns the video-specific concerns:
 *   - Pause + reset playback when the modal closes (so reopening starts fresh)
 *   - Larger panel size (`xl` ≈ 800px max-width) appropriate for 16:9 video
 *   - Letterbox background via the `--surface-media-letterbox` token
 *   - The `<video>` element is the autofocus target so keyboard controls
 *     work immediately
 */
export function VideoModal({ open, onClose, src, title }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Reset playback when the modal closes so reopening doesn't resume
  // mid-video at the previous timestamp.
  useEffect(() => {
    if (open) return
    const v = videoRef.current
    if (v) {
      v.pause()
      v.currentTime = 0
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      aria-label={title ?? 'Video'}
      hideCloseButton
      fullBleed
      initialFocusRef={videoRef as React.RefObject<HTMLElement | null>}
    >
      {/*
        Custom close button overlaid on the video. Default Modal close button
        is hidden because it sits inside a normal padded header — we want a
        floating control over the video frame instead.
      */}
      <button
        type="button"
        onClick={onClose}
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
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
        style={{ aspectRatio: '16/9', background: 'var(--surface-media-letterbox)' }}
      />
    </Modal>
  )
}
