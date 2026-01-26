/**
 * DealMakerSlider - Reusable slider component for Deal Maker worksheet
 * Features: Label, value display, range indicators
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { SliderFormat, DealMakerSliderProps } from './types'

// =============================================================================
// FORMATTERS
// =============================================================================

export function formatSliderValue(value: number, format: SliderFormat): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    
    case 'currencyPerMonth':
      return `${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)}/mo`
    
    case 'currencyPerYear':
      return `${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)}/yr`
    
    case 'percentage':
      return `${(value * 100).toFixed(value < 0.1 ? 2 : 1)}%`
    
    case 'years':
      return `${value} yr`
    
    default:
      return String(value)
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DealMakerSlider({
  config,
  value,
  onChange,
  onChangeComplete,
  isDark = false,
}: DealMakerSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    // Round to step
    const rounded = Math.round(newValue / config.step) * config.step
    setLocalValue(rounded)
    onChange(rounded)
  }, [config.step, onChange])

  const handleMouseUp = useCallback(() => {
    const rounded = Math.round(localValue / config.step) * config.step
    onChangeComplete?.(rounded)
  }, [config.step, localValue, onChangeComplete])

  const formattedValue = formatSliderValue(localValue, config.format)
  const formattedMin = formatSliderValue(config.min, config.format)
  const formattedMax = formatSliderValue(config.max, config.format)

  // Calculate fill percentage for the track
  const fillPercent = ((localValue - config.min) / (config.max - config.min)) * 100

  return (
    <div className="mb-4">
      {/* Header: Label and Value */}
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
          {config.label}
        </span>
        <span className={`text-base font-bold ${isDark ? 'text-cyan-400' : 'text-teal'}`}>
          {formattedValue}
        </span>
      </div>

      {/* Slider Track */}
      <div className="py-2 px-0">
        <div className="relative h-6 flex items-center">
          {/* Track background */}
          <div className={`absolute inset-x-0 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          
          {/* Filled track */}
          <div 
            className={`absolute left-0 h-1.5 rounded-full transition-all ${isDark ? 'bg-cyan-400' : 'bg-teal'}`}
            style={{ width: `${fillPercent}%` }}
          />
          
          {/* Native range input */}
          <input
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={localValue}
            onChange={handleValueChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          
          {/* Custom thumb */}
          <div 
            className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none transition-transform hover:scale-110 ${isDark ? 'bg-cyan-400' : 'bg-teal'}`}
            style={{ 
              left: `calc(${fillPercent}% - 8px)`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </div>
      </div>

      {/* Range Labels */}
      <div className="flex justify-between mt-0">
        <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
          {formattedMin}
        </span>
        <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
          {formattedMax}
        </span>
      </div>
    </div>
  )
}

export default DealMakerSlider
