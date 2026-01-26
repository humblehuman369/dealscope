/**
 * DealMakerSlider - Premium slider component with gradient track
 * Features: Larger touch target, gradient fill, refined thumb, smooth animations
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
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
}: DealMakerSliderProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isDragging, setIsDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    const rounded = Math.round(newValue / config.step) * config.step
    setLocalValue(rounded)
    onChange(rounded)
  }, [config.step, onChange])

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    const rounded = Math.round(localValue / config.step) * config.step
    onChangeComplete?.(rounded)
  }, [config.step, localValue, onChangeComplete])

  const formattedValue = formatSliderValue(localValue, config.format)
  const formattedMin = formatSliderValue(config.min, config.format)
  const formattedMax = formatSliderValue(config.max, config.format)
  const fillPercent = ((localValue - config.min) / (config.max - config.min)) * 100

  return (
    <div className="mb-5">
      {/* Header: Label and Value */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {config.label}
        </span>
        <span 
          className={`text-base font-bold tabular-nums transition-all duration-150 ${
            isDragging ? 'text-teal scale-105' : 'text-teal'
          }`}
        >
          {formattedValue}
        </span>
      </div>

      {/* Slider Track Container */}
      <div 
        ref={trackRef}
        className="relative h-10 flex items-center group cursor-pointer"
      >
        {/* Track background with subtle gradient */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-gradient-to-r from-slate-200 via-slate-200 to-slate-100 dark:from-slate-700 dark:via-slate-700 dark:to-slate-600" />
        
        {/* Filled track with gradient */}
        <div 
          className="absolute left-0 h-2 rounded-full transition-all duration-75"
          style={{ 
            width: `${fillPercent}%`,
            background: 'linear-gradient(90deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%)',
            boxShadow: isDragging ? '0 0 12px rgba(8, 145, 178, 0.5)' : 'none',
          }}
        />
        
        {/* Hidden native input for accessibility */}
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={localValue}
          onChange={handleValueChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label={config.label}
        />
        
        {/* Custom thumb */}
        <div 
          className={`absolute pointer-events-none z-10 transition-all duration-150 ${
            isDragging ? 'scale-125' : 'group-hover:scale-110'
          }`}
          style={{ 
            left: `calc(${fillPercent}% - 10px)`,
          }}
        >
          {/* Thumb outer glow */}
          <div 
            className={`absolute inset-0 rounded-full transition-opacity duration-150 ${
              isDragging ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: 20,
              height: 20,
              background: 'radial-gradient(circle, rgba(8, 145, 178, 0.4) 0%, transparent 70%)',
              transform: 'scale(2)',
            }}
          />
          {/* Thumb body */}
          <div 
            className="w-5 h-5 rounded-full bg-white border-[3px] border-teal shadow-lg"
            style={{
              boxShadow: isDragging 
                ? '0 2px 8px rgba(8, 145, 178, 0.5), 0 4px 16px rgba(0,0,0,0.15)'
                : '0 2px 6px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </div>

      {/* Range Labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
          {formattedMin}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
          {formattedMax}
        </span>
      </div>
    </div>
  )
}

export default DealMakerSlider
