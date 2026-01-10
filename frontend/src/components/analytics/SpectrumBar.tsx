'use client'

import React from 'react'
import { BenchmarkStatus } from './types'

/**
 * SpectrumBar Component
 * 
 * A visual spectrum/gauge showing where a value falls within Low/Average/High zones.
 * Used for performance benchmarks like Cash-on-Cash, Cap Rate, DSCR, etc.
 * 
 * Features:
 * - Three color-coded zones (red/yellow/green)
 * - Animated marker that slides to position
 * - Inverted mode for metrics where lower is better
 * - Zone labels with range indicators
 */

interface SpectrumZone {
  label: string
  range: string
}

interface SpectrumBarProps {
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
  /** Height variant */
  size?: 'default' | 'compact'
}

export function SpectrumBar({
  markerPosition,
  status,
  isInverted = false,
  zones,
  size = 'default'
}: SpectrumBarProps) {
  // Clamp marker position between 2 and 98 to keep it visible
  const clampedPosition = Math.min(98, Math.max(2, markerPosition))
  
  // Get marker color based on status
  const getMarkerClasses = () => {
    switch (status) {
      case 'high':
        return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]'
      case 'average':
        return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.7)]'
      case 'low':
        return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]'
    }
  }

  // For inverted spectrums, swap the zone colors
  const leftZoneColor = isInverted
    ? 'bg-green-500/[0.15] text-green-500/70'
    : 'bg-red-500/[0.15] text-red-500/70'
  
  const rightZoneColor = isInverted
    ? 'bg-red-500/[0.15] text-red-500/70'
    : 'bg-green-500/[0.15] text-green-500/70'

  const heightClass = size === 'compact' ? 'h-5' : 'h-6'

  return (
    <div className={`relative ${heightClass} rounded-xl overflow-visible`}>
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 rounded-xl"
        style={{
          background: isInverted
            ? 'linear-gradient(90deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.2) 25%, rgba(234,179,8,0.2) 35%, rgba(234,179,8,0.3) 50%, rgba(234,179,8,0.2) 65%, rgba(239,68,68,0.2) 75%, rgba(239,68,68,0.3) 100%)'
            : 'linear-gradient(90deg, rgba(239,68,68,0.3) 0%, rgba(239,68,68,0.2) 25%, rgba(234,179,8,0.2) 35%, rgba(234,179,8,0.3) 50%, rgba(234,179,8,0.2) 65%, rgba(34,197,94,0.2) 75%, rgba(34,197,94,0.3) 100%)'
        }}
      />

      {/* Zone Labels */}
      <div className="absolute inset-0 flex rounded-xl overflow-hidden">
        {/* Low Zone (or High if inverted) */}
        <div 
          className={`flex-1 flex flex-col items-center justify-center border-r border-gray-300 dark:border-white/10 ${leftZoneColor}`}
        >
          <span className="text-[0.55rem] font-semibold uppercase tracking-wide leading-none">
            {isInverted ? zones.high.label : zones.low.label}
          </span>
          <span className="text-[0.5rem] opacity-80 leading-tight mt-0.5">
            {isInverted ? zones.high.range : zones.low.range}
          </span>
        </div>

        {/* Average Zone */}
        <div 
          className="flex-[1.2] flex flex-col items-center justify-center border-r border-gray-300 dark:border-white/10 bg-yellow-500/[0.1] text-yellow-500/70"
        >
          <span className="text-[0.55rem] font-semibold uppercase tracking-wide leading-none">
            {zones.average.label}
          </span>
          <span className="text-[0.5rem] opacity-80 leading-tight mt-0.5">
            {zones.average.range}
          </span>
        </div>

        {/* High Zone (or Low if inverted) */}
        <div 
          className={`flex-1 flex flex-col items-center justify-center ${rightZoneColor}`}
        >
          <span className="text-[0.55rem] font-semibold uppercase tracking-wide leading-none">
            {isInverted ? zones.low.label : zones.high.label}
          </span>
          <span className="text-[0.5rem] opacity-80 leading-tight mt-0.5">
            {isInverted ? zones.low.range : zones.high.range}
          </span>
        </div>
      </div>

      {/* Animated Marker */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-sm ${getMarkerClasses()} transition-all duration-500 ease-out z-10`}
        style={{ 
          left: `${clampedPosition}%`,
          transform: `translateX(-50%) translateY(-50%)`
        }}
      />
    </div>
  )
}

/**
 * MiniSpectrum Component
 * 
 * A compact version of the spectrum for grid layouts.
 * Shows just a thin bar with a circular marker.
 */

interface MiniSpectrumProps {
  markerPosition: number
  status: BenchmarkStatus
  isInverted?: boolean
}

export function MiniSpectrum({ markerPosition, status, isInverted = false }: MiniSpectrumProps) {
  const clampedPosition = Math.min(95, Math.max(5, markerPosition))
  
  const getMarkerBorder = () => {
    switch (status) {
      case 'high': return 'border-green-500'
      case 'average': return 'border-yellow-500'
      case 'low': return 'border-red-500'
    }
  }

  return (
    <div className="h-1.5 rounded-full relative" 
      style={{
        background: isInverted
          ? 'linear-gradient(90deg, rgba(34,197,94,0.4) 0%, rgba(234,179,8,0.4) 50%, rgba(239,68,68,0.4) 100%)'
          : 'linear-gradient(90deg, rgba(239,68,68,0.4) 0%, rgba(234,179,8,0.4) 50%, rgba(34,197,94,0.4) 100%)'
      }}
    >
      <div 
        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 ${getMarkerBorder()} transition-all duration-500 ease-out`}
        style={{ 
          left: `${clampedPosition}%`,
          transform: `translateX(-50%) translateY(-50%)`
        }}
      />
    </div>
  )
}

export default SpectrumBar
