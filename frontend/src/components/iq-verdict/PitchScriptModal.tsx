'use client'

import { useEffect, useRef } from 'react'
import type { DealStructure } from '@/components/iq-verdict/ThreePathsPanel'
import { trackEvent } from '@/lib/eventTracking'

export interface PitchScriptModalProps {
  structure: DealStructure | null
  onClose: () => void
}

export function PitchScriptModal({ structure, onClose }: PitchScriptModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const trackedId = useRef<string | null>(null)

  useEffect(() => {
    if (!structure?.pitchScript) return
    if (trackedId.current === structure.id) return
    trackedId.current = structure.id
    trackEvent('path_pitch_opened', { structure_id: structure.id, family: structure.family })
  }, [structure])

  useEffect(() => {
    if (!structure?.pitchScript) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [structure, onClose])

  if (!structure?.pitchScript) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(structure.pitchScript ?? '')
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      ref={backdropRef}
      role="presentation"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.45)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pitch-script-title"
        className="max-w-lg w-full rounded-xl shadow-xl"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
          maxHeight: 'min(80vh, 520px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 id="pitch-script-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>
            {structure.headline}
          </h2>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          <pre
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              color: 'var(--text-body)',
            }}
          >
            {structure.pitchScript}
          </pre>
        </div>
        <div
          className="flex justify-end gap-2 flex-wrap"
          style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)' }}
        >
          <button
            type="button"
            onClick={copy}
            className="rounded-md px-4 py-2 text-[13px] font-semibold"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--surface-base, #fff)',
              border: 'none',
            }}
          >
            Copy to clipboard
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-[13px] font-semibold"
            style={{
              background: 'transparent',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
