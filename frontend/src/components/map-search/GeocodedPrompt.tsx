'use client'

import { useRouter } from 'next/navigation'
import { MapPin, ArrowRight, X, Loader2 } from 'lucide-react'

interface GeocodedPromptProps {
  address: string | null
  isGeocoding: boolean
  onClose: () => void
}

export function GeocodedPrompt({ address, isGeocoding, onClose }: GeocodedPromptProps) {
  const router = useRouter()

  if (!isGeocoding && !address) return null

  const handleAnalyze = () => {
    if (!address) return
    router.push(`/verdict?address=${encodeURIComponent(address)}`)
  }

  return (
    <div
      className="rounded-xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        minWidth: 280,
        maxWidth: 380,
      }}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div
          className="flex-shrink-0 p-2 rounded-lg mt-0.5"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          {isGeocoding ? (
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-sky)' }} />
          ) : (
            <MapPin size={18} style={{ color: 'var(--accent-sky)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isGeocoding ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Looking up address...
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Property at this location
              </p>
              <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-heading)' }}>
                {address}
              </p>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity"
        >
          <X size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {address && !isGeocoding && (
        <div
          className="px-3.5 pb-3.5"
        >
          <button
            onClick={handleAnalyze}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            Analyze This Property <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
