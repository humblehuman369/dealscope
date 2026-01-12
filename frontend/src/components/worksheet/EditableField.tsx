'use client'

import { useState, useRef, useEffect } from 'react'
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
}

const formatValue = (value: number, format: FormatType, prefix?: string, suffix?: string): string => {
  let formatted: string
  
  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
      break
    case 'percent':
      formatted = `${(value * 100).toFixed(1)}%`
      break
    case 'years':
      formatted = `${value} years`
      break
    case 'number':
    default:
      formatted = value.toLocaleString()
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
  min,
  max,
  step = 1,
  disabled = false,
  className = '',
  isPositive,
  isNegative,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  const displayValue = formatValue(value, format, prefix, suffix)
  
  const valueClass = isPositive 
    ? 'text-[var(--ws-positive)]' 
    : isNegative 
      ? 'text-[var(--ws-negative)]' 
      : 'text-[var(--ws-text-primary)]'

  if (isEditing) {
    return (
      <div className="editable-field">
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
      className={`editable-field group cursor-pointer ${className}`}
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
    <span className={`data-value ${valueClass} ${className}`}>
      {displayValue}
    </span>
  )
}

