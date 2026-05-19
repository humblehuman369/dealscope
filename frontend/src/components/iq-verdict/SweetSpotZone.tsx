'use client'

import React from 'react'

export interface SweetSpotZoneProps {
  /** Left edge of the zone as % of the bar width */
  leftPercent: number
  /** Width of the zone as % of the bar width */
  widthPercent: number
}

function SweetSpotSparkle() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      aria-hidden
      className="sweet-spot-sparkle shrink-0"
    >
      <path
        d="M5 0.5L5.9 3.6L9 4.5L5.9 5.4L5 8.5L4.1 5.4L1 4.5L4.1 3.6L5 0.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Highlighted "desired range" segment on the Target / Market / Income bar.
 * Vibrant green glow + shimmer — the investor's goal zone.
 */
export function SweetSpotZone({ leftPercent, widthPercent }: SweetSpotZoneProps) {
  if (widthPercent <= 0) return null

  const showFullLabel = widthPercent >= 16
  const showCompactLabel = widthPercent >= 9 && widthPercent < 16

  return (
    <div
      className="sweet-spot-zone"
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      aria-hidden
    >
      <span className="sweet-spot-shimmer" />
      <span className="sweet-spot-glass" />
      <div className="sweet-spot-content">
        {showFullLabel && (
          <>
            <SweetSpotSparkle />
            <span className="sweet-spot-label">SWEET SPOT</span>
            <SweetSpotSparkle />
          </>
        )}
        {showCompactLabel && <span className="sweet-spot-label sweet-spot-label--compact">SPOT</span>}
      </div>
    </div>
  )
}
