'use client'

import React from 'react'
import { BenchmarkStatus } from '../types'

/**
 * DesktopSpectrumBar Component
 * 
 * Enhanced desktop version of the spectrum bar with larger zones,
 * animated markers, and improved visual feedback.
 */

interface SpectrumZone {
  label: string
  range: string
}

interface DesktopSpectrumBarProps {
  /** Current value's position on the spectrum (0-100) */
  markerPosition: number
  /** Status determines marker color */
  status: BenchmarkStatus
  /** Whether lower values are better (inverts colors) */
  isInverted?: boolean
  /** Zone configuration */
  zones: {
    low: SpectrumZone
    average: SpectrumZone
    high: SpectrumZone
  }
}

export function DesktopSpectrumBar({
  markerPosition,
  status,
  isInverted = false,
  zones
}: DesktopSpectrumBarProps) {
  // Clamp marker position between 2 and 98 to keep it visible
  const clampedPosition = Math.min(98, Math.max(2, markerPosition))
  
  // Get marker CSS class based on status
  const getMarkerClass = () => {
    switch (status) {
      case 'high':
        return 'desktop-spectrum-marker high'
      case 'average':
        return 'desktop-spectrum-marker average'
      case 'low':
        return 'desktop-spectrum-marker low'
    }
  }

  return (
    <div className={`desktop-spectrum-bar ${isInverted ? 'inverted' : ''}`}>
      {/* Zone Labels */}
      <div className="desktop-spectrum-zones">
        {/* Low Zone (or High if inverted) */}
        <div className={`desktop-spectrum-zone ${isInverted ? 'high' : 'low'}`}>
          <div>
            {isInverted ? zones.high.label : zones.low.label}
            <span className="desktop-zone-range">
              {isInverted ? zones.high.range : zones.low.range}
            </span>
          </div>
        </div>

        {/* Average Zone */}
        <div className="desktop-spectrum-zone average">
          <div>
            {zones.average.label}
            <span className="desktop-zone-range">{zones.average.range}</span>
          </div>
        </div>

        {/* High Zone (or Low if inverted) */}
        <div className={`desktop-spectrum-zone ${isInverted ? 'low' : 'high'}`}>
          <div>
            {isInverted ? zones.low.label : zones.high.label}
            <span className="desktop-zone-range">
              {isInverted ? zones.low.range : zones.high.range}
            </span>
          </div>
        </div>
      </div>

      {/* Animated Marker */}
      <div
        className={getMarkerClass()}
        style={{ left: `${clampedPosition}%` }}
      />
    </div>
  )
}

/**
 * DesktopMiniSpectrum Component
 * 
 * Compact version for grid layouts on desktop.
 */
interface DesktopMiniSpectrumProps {
  markerPosition: number
  status: BenchmarkStatus
  isInverted?: boolean
}

export function DesktopMiniSpectrum({ 
  markerPosition, 
  status, 
  isInverted = false 
}: DesktopMiniSpectrumProps) {
  const clampedPosition = Math.min(95, Math.max(5, markerPosition))
  
  const getMarkerClass = () => {
    switch (status) {
      case 'high': return 'high'
      case 'average': return 'average'
      case 'low': return 'low'
    }
  }

  return (
    <div 
      className={`mini-spectrum ${isInverted ? 'inverted' : ''}`}
      style={{
        height: '8px',
        borderRadius: '4px',
        position: 'relative',
        background: isInverted
          ? 'linear-gradient(90deg, rgba(34,197,94,0.4) 0%, rgba(234,179,8,0.4) 50%, rgba(239,68,68,0.4) 100%)'
          : 'linear-gradient(90deg, rgba(239,68,68,0.4) 0%, rgba(234,179,8,0.4) 50%, rgba(34,197,94,0.4) 100%)'
      }}
    >
      <div 
        className={`mini-marker ${getMarkerClass()}`}
        style={{ 
          position: 'absolute',
          top: '50%',
          left: `${clampedPosition}%`,
          transform: 'translate(-50%, -50%)',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'white',
          border: '2px solid',
          borderColor: status === 'high' ? '#22c55e' : status === 'average' ? '#eab308' : '#ef4444',
          transition: 'left 0.4s ease-out'
        }}
      />
    </div>
  )
}

export default DesktopSpectrumBar
