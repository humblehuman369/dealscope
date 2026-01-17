'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Pencil } from 'lucide-react'

type FormatType = 'currency' | 'percent' | 'number' | 'years'

interface EditableFieldProps {
  value: number
  onChange: (value: number) => void
  format?: FormatType
  suffix?: string
  prefix?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  isPositive?: boolean
  isNegative?: boolean
  /** Show slider control */
  showSlider?: boolean
  /** Secondary display value (e.g., dollar amount for percentage) - shown on SAME line */
  secondaryValue?: string
  /** Whether secondary value is negative */
  secondaryNegative?: boolean
}

const formatValue = (value: number, format: FormatType, prefix?: string, suffix?: string): string => {
  // Guard against invalid numbers
  if (!Number.isFinite(value)) {
    return format === 'currency' ? '$0' : '0'
  }
  
  // Clamp extremely large values to prevent display issues
  const maxValue = 1e12 // 1 trillion max
  const clampedValue = Math.abs(value) > maxValue 
    ? (value > 0 ? maxValue : -maxValue) 
    : value
  
  let formatted: string
  
  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(clampedValue)
      break
    case 'percent':
      formatted = `${(clampedValue * 100).toFixed(1)}%`
      break
    case 'years':
      formatted = `${Math.round(clampedValue)} years`
      break
    case 'number':
    default:
      formatted = clampedValue.toLocaleString()
  }
  
  if (prefix && format !== 'currency') {
    formatted = prefix + formatted
  }
  if (suffix) {
    formatted = formatted + suffix
  }
  
  return formatted
}

const parseValue = (input: string, format: FormatType): number => {
  // Remove all non-numeric characters except decimal point and minus
  let cleaned = input.replace(/[^0-9.-]/g, '')
  let value = parseFloat(cleaned) || 0
  
  // Convert percent input back to decimal
  if (format === 'percent') {
    value = value / 100
  }
  
  return value
}

export function EditableField({
  value,
  onChange,
  format = 'number',
  suffix,
  prefix,
  min = 0,
  max,
  step = 1,
  disabled = false,
  className = '',
  isPositive,
  isNegative,
  showSlider = true,
  secondaryValue,
  secondaryNegative,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const sliderRef = useRef<HTMLInputElement>(null)

  // Calculate slider min/max if not provided - use FIXED fallbacks to prevent runaway
  const sliderMin = min
  // IMPORTANT: Don't base max on current value or it creates feedback loop!
  const sliderMax = max ?? (format === 'percent' ? 1 : format === 'years' ? 30 : 1000000)
  const sliderStep = step ?? (format === 'percent' ? 0.01 : format === 'years' ? 1 : 1000)

  // Calculate fill percentage for slider
  const fillPercent = Math.min(100, Math.max(0, ((value - sliderMin) / (sliderMax - sliderMin)) * 100))

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    if (disabled) return
    
    // Set initial input value based on format
    if (format === 'percent') {
      setInputValue((value * 100).toFixed(1))
    } else {
      setInputValue(value.toString())
    }
    setIsEditing(true)
  }

  const handleEndEdit = () => {
    let newValue = parseValue(inputValue, format)
    
    // Clamp value
    if (min !== undefined) newValue = Math.max(min, newValue)
    if (max !== undefined) newValue = Math.min(max, newValue)
    
    onChange(newValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEndEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }, [onChange])

  const displayValue = formatValue(value, format, prefix, suffix)
  
  const valueClass = isPositive 
    ? 'text-[var(--ws-positive)]' 
    : isNegative 
      ? 'text-[var(--ws-negative)]' 
      : 'text-[var(--ws-text-primary)]'

  // Slider-enabled layout - INLINE: slider then value (right-aligned)
  if (showSlider && !disabled) {
    return (
      <div className={`flex items-center gap-3 w-full ${className}`}>
        {/* Slider Track - takes most of the space */}
        <div className="flex-1 min-w-[60px] max-w-[300px]">
          <input
            ref={sliderRef}
            type="range"
            className="slider-input w-full"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={value}
            onChange={handleSliderChange}
            style={{
              background: `linear-gradient(to right, var(--iq-teal, #007ea7) 0%, var(--iq-teal, #007ea7) ${fillPercent}%, #e2e8f0 ${fillPercent}%, #e2e8f0 100%)`
            }}
            aria-label={`Adjust value`}
          />
        </div>
        
        {/* Value display - right-aligned with percentage and dollar on SAME line */}
        <div className="flex items-center gap-2 ml-auto text-right flex-shrink-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleEndEdit}
              onKeyDown={handleKeyDown}
              className="slider-value-input text-right"
            />
          ) : (
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={handleStartEdit}
            >
              {/* Primary value (percentage or currency) */}
              <span className={`text-sm font-semibold whitespace-nowrap ${valueClass}`}>
                {displayValue}
              </span>
              
              {/* Secondary value (dollar amount for percentage) - SAME LINE */}
              {secondaryValue && (
                <span className={`text-sm whitespace-nowrap ${secondaryNegative ? 'text-[var(--ws-negative)]' : 'text-[var(--ws-text-muted)]'}`}>
                  {secondaryValue}
                </span>
              )}
              
              <Pencil className="w-3 h-3 text-[var(--iq-teal)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Text-only editing (no slider)
  if (isEditing) {
    return (
      <div className="editable-field ml-auto text-right">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleEndEdit}
          onKeyDown={handleKeyDown}
          className={`text-right ${className}`}
        />
      </div>
    )
  }

  return (
    <div 
      className={`editable-field group cursor-pointer ml-auto text-right ${className}`}
      onClick={handleStartEdit}
    >
      <span className={`data-value ${valueClass}`}>
        {displayValue}
        {!disabled && (
          <Pencil className="edit-icon opacity-0 group-hover:opacity-100" />
        )}
      </span>
    </div>
  )
}

// Display-only field (for calculated values)
interface DisplayFieldProps {
  value: number
  format?: FormatType
  suffix?: string
  prefix?: string
  isPositive?: boolean
  isNegative?: boolean
  className?: string
}

export function DisplayField({
  value,
  format = 'number',
  suffix,
  prefix,
  isPositive,
  isNegative,
  className = '',
}: DisplayFieldProps) {
  const displayValue = formatValue(value, format, prefix, suffix)
  
  const valueClass = isPositive 
    ? 'text-[var(--ws-positive)]' 
    : isNegative 
      ? 'text-[var(--ws-negative)]' 
      : 'text-[var(--ws-text-primary)]'

  return (
    <span className={`data-value ml-auto text-right ${valueClass} ${className}`}>
      {displayValue}
    </span>
  )
}
