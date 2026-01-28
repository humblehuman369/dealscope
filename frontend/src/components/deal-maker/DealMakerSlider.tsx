/**
 * DealMakerSlider - Deal Maker IQ slider component
 * EXACT implementation from design files
 * 
 * Design specs:
 * - Input label: 14px, font-weight 600, color #0A1628
 * - Input value: 16px, font-weight 700, color #0891B2 (clickable to edit)
 * - Slider track: #E2E8F0
 * - Slider fill: #0891B2
 * - Range text: 11px, color #94A3B8
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
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

// Parse input string back to number based on format
function parseInputValue(input: string, format: SliderFormat): number | null {
  // Remove currency symbols, commas, %, /mo, /yr, yr
  const cleaned = input
    .replace(/[$,]/g, '')
    .replace(/\/mo$/i, '')
    .replace(/\/yr$/i, '')
    .replace(/\s*yr$/i, '')
    .replace(/%$/g, '')
    .trim()
  
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  
  // Convert percentage back to decimal
  if (format === 'percentage') {
    return num / 100
  }
  
  return num
}

export function DealMakerSlider({
  config,
  value,
  onChange,
  onChangeComplete,
}: DealMakerSliderProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const [inputText, setInputText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleValueClick = useCallback(() => {
    // Set initial input text based on format
    let initialText = ''
    if (config.format === 'percentage') {
      initialText = (localValue * 100).toFixed(localValue < 0.1 ? 2 : 1)
    } else if (config.format === 'years') {
      initialText = String(localValue)
    } else {
      initialText = String(Math.round(localValue))
    }
    setInputText(initialText)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 50)
  }, [localValue, config.format])

  const handleInputSubmit = useCallback(() => {
    const parsed = parseInputValue(inputText, config.format)
    if (parsed !== null) {
      // Clamp to min/max
      const clamped = Math.max(config.min, Math.min(config.max, parsed))
      // Round to step
      const rounded = Math.round(clamped / config.step) * config.step
      setLocalValue(rounded)
      onChange(rounded)
      onChangeComplete?.(rounded)
    }
    setIsEditing(false)
  }, [inputText, config, onChange, onChangeComplete])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }, [handleInputSubmit])

  const handleInputBlur = useCallback(() => {
    handleInputSubmit()
  }, [handleInputSubmit])

  const formattedValue = formatSliderValue(localValue, config.format)
  const formattedMin = formatSliderValue(config.min, config.format)
  const formattedMax = formatSliderValue(config.max, config.format)
  const fillPercent = ((localValue - config.min) / (config.max - config.min)) * 100

  // Determine input type
  const inputType = config.format === 'percentage' ? 'number' : 'number'

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Label and Value */}
      <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628' }}>
          {config.label}
        </span>
        
        {isEditing ? (
          <div 
            className="flex items-center"
            style={{ 
              backgroundColor: '#F1F5F9',
              borderRadius: '6px',
              padding: '4px 8px',
              border: '1px solid #0891B2',
            }}
          >
            {(config.format === 'currency' || config.format === 'currencyPerMonth' || config.format === 'currencyPerYear') && (
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0891B2', marginRight: '2px' }}>$</span>
            )}
            <input
              ref={inputRef}
              type={inputType}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              autoFocus
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#0891B2',
                width: '80px',
                textAlign: 'right',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            {config.format === 'percentage' && (
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', marginLeft: '2px' }}>%</span>
            )}
            {config.format === 'currencyPerMonth' && (
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', marginLeft: '2px' }}>/mo</span>
            )}
            {config.format === 'currencyPerYear' && (
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', marginLeft: '2px' }}>/yr</span>
            )}
            {config.format === 'years' && (
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', marginLeft: '2px' }}>yr</span>
            )}
          </div>
        ) : (
          <button
            onClick={handleValueClick}
            className="tabular-nums hover:bg-slate-100 rounded px-2 py-1 transition-colors cursor-pointer"
            style={{ fontSize: '16px', fontWeight: 700, color: '#0891B2', background: 'transparent', border: 'none' }}
            title="Click to edit value directly"
          >
            {formattedValue}
          </button>
        )}
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

      {/* Source Attribution */}
      {config.sourceLabel && (
        <div 
          className="flex items-center gap-1 mt-2"
          title={config.isEstimate ? 'This is an estimate - verify with local data' : 'Based on verified data source'}
        >
          {config.isEstimate ? (
            <svg className="w-3 h-3" style={{ color: '#F59E0B' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" style={{ color: '#10B981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span style={{ fontSize: '10px', color: '#94A3B8' }}>
            {config.sourceLabel}
          </span>
        </div>
      )}
    </div>
  )
}

export default DealMakerSlider
