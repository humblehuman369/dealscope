/**
 * DealMakerSlider - Deal Maker Pro slider component
 * EXACT implementation from design files
 * 
 * Design specs:
 * - Input label: 14px, font-weight 600, color #0A1628
 * - Input value: 16px, font-weight 700, color #0891B2
 * - Slider track: #E2E8F0
 * - Slider fill: #0891B2
 * - Range text: 11px, color #94A3B8
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { SliderFormat, DealMakerSliderProps } from './types'

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

export function DealMakerSlider({
  config,
  value,
  onChange,
  onChangeComplete,
}: DealMakerSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
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
  const fillPercent = ((localValue - config.min) / (config.max - config.min)) * 100

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Label and Value */}
      <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628' }}>
          {config.label}
        </span>
        <span 
          className="tabular-nums"
          style={{ fontSize: '16px', fontWeight: 700, color: '#0891B2' }}
        >
          {formattedValue}
        </span>
      </div>

      {/* Slider */}
      <div className="relative" style={{ height: '24px' }}>
        {/* Track background */}
        <div 
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full"
          style={{ height: '6px', background: '#E2E8F0' }}
        />
        
        {/* Filled track */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 left-0 rounded-full"
          style={{ 
            height: '6px', 
            width: `${fillPercent}%`,
            background: '#0891B2',
          }}
        />
        
        {/* Custom thumb */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-[#0891B2]"
          style={{ 
            left: `calc(${fillPercent}% - 8px)`,
            width: '16px',
            height: '16px',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'none',
          }}
        />
        
        {/* Hidden native input */}
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={localValue}
          onChange={handleValueChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={config.label}
        />
      </div>

      {/* Range Labels */}
      <div className="flex justify-between" style={{ marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          {formattedMin}
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          {formattedMax}
        </span>
      </div>
    </div>
  )
}

export default DealMakerSlider
