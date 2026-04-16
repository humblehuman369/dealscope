'use client'

import { Check, Waves } from 'lucide-react'

interface PropertyFeaturesProps {
  interiorFeatures: string[]
  exteriorFeatures: string[]
  appliances: string[]
  construction: string[]
  roof?: string
  foundation?: string
  isWaterfront?: boolean
  waterfrontFeatures?: string[]
}

/**
 * PropertyFeatures — Flat feature grid with checkmarks, matching the address-bar
 * detail panel. All feature categories are combined into one list (no tabs).
 * Construction / Roof / Foundation render as inline label-value pairs below.
 */
export function PropertyFeatures({
  interiorFeatures,
  exteriorFeatures,
  appliances,
  construction,
  roof,
  foundation,
  isWaterfront,
  waterfrontFeatures,
}: PropertyFeaturesProps) {
  const allFeatures = [
    ...interiorFeatures,
    ...exteriorFeatures,
    ...appliances,
  ]
  const uniqueFeatures = [...new Set(allFeatures)]

  const hasConstruction =
    (construction && construction.length > 0) || roof || foundation

  if (uniqueFeatures.length === 0 && !hasConstruction) return null

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--accent-sky)' }}
      >
        Features & Amenities
      </div>

      {uniqueFeatures.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
          {uniqueFeatures.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <Check
                size={13}
                className="flex-shrink-0"
                style={{ color: 'var(--status-positive)' }}
              />
              <span className="text-[13px]" style={{ color: 'var(--text-body)' }}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      )}

      {isWaterfront && waterfrontFeatures && waterfrontFeatures.length > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <Waves size={14} style={{ color: 'var(--accent-sky)' }} />
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--accent-sky)' }}
          >
            Waterfront: {waterfrontFeatures.join(', ')}
          </span>
        </div>
      )}

      {hasConstruction && (
        <div
          className="flex flex-wrap gap-x-8 gap-y-1 mt-3 pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {construction && construction.length > 0 && (
            <div className="flex items-baseline gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Construction
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-body)' }}
              >
                {construction.join(', ')}
              </span>
            </div>
          )}
          {roof && (
            <div className="flex items-baseline gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Roof
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-body)' }}
              >
                {roof}
              </span>
            </div>
          )}
          {foundation && (
            <div className="flex items-baseline gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Foundation
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-body)' }}
              >
                {foundation}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PropertyFeaturesSkeleton() {
  return (
    <div>
      <div
        className="h-3 w-32 rounded animate-pulse mb-3"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-5 rounded animate-pulse"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          />
        ))}
      </div>
    </div>
  )
}
