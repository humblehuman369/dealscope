'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface SectionHelpTooltipProps {
  label: string
  content: string
  mapLightChrome?: boolean
}

export function SectionHelpTooltip({ label, content, mapLightChrome }: SectionHelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Help: ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-0.5 rounded-full hover:opacity-80 transition-opacity"
        style={{
          color: mapLightChrome ? 'var(--text-secondary)' : 'var(--text-label)',
        }}
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg px-3 py-2 text-[11px] leading-snug shadow-lg"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
