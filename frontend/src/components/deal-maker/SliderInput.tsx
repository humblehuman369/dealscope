'use client'

/**
 * SliderInput Component
 * 
 * Reusable slider input with formatted value display, 
 * gradient fill track, and custom thumb styling.
 */

import React from 'react'

export type PopupSliderFormat = 'currency' | 'currency-year' | 'currency-month' | 'percent' | 'percent-int' | 'years' | 'days'

interface SliderInputProps {
  label: string
  sublabel?: string
  value: number
  min: number
  max: number
  step: number
  format: PopupSliderFormat
  onChange: (value: number) => void
}

// Format value based on type
function formatValue(value: number, format: PopupSliderFormat): string {
  switch (format) {
    case 'currency':
      return `$${value.toLocaleString()}`
    case 'currency-year':
      return `$${value.toLocaleString()}/yr`
    case 'currency-month':
      return `$${value.toLocaleString()}/mo`
    case 'percent':
      return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`
    case 'percent-int':
      return `${Math.round(value)}%`
    case 'years':
      return `${value} years`
    case 'days':
      return `${value} day${value !== 1 ? 's' : ''}`
    default:
      return value.toString()
  }
}

// Format min/max for range labels
function formatMinMax(value: number, format: PopupSliderFormat): string {
  switch (format) {
    case 'currency':
    case 'currency-year':
    case 'currency-month':
      return `$${value.toLocaleString()}`
    case 'percent':
    case 'percent-int':
      return `${value}%`
    case 'years':
    case 'days':
      return `${value}`
    default:
      return value.toString()
  }
}

export function SliderInput({
  label,
  sublabel,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderInputProps) {
  // Calculate slider fill percentage
  const fillPercent = ((value - min) / (max - min)) * 100

  return (
    <div className="mb-5">
      {/* Header with label and value */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#F1F5F9]">{label}</span>
          {sublabel && (
            <span className="text-[11px] text-[#64748B] mt-0.5">{sublabel}</span>
          )}
        </div>
        <span className="text-lg font-bold text-[#38bdf8] tabular-nums">
          {formatValue(value, format)}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded appearance-none cursor-pointer outline-none
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#F1F5F9]
            [&::-webkit-slider-thumb]:border-[3px]
            [&::-webkit-slider-thumb]:border-[#0C1220]
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.25)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-105
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#F1F5F9]
            [&::-moz-range-thumb]:border-[3px]
            [&::-moz-range-thumb]:border-[#0C1220]
            [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.25)]
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #14B8A6 0%, #14B8A6 ${fillPercent}%, rgba(255,255,255,0.08) ${fillPercent}%, rgba(255,255,255,0.08) 100%)`
          }}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-[#64748B] tabular-nums">{formatMinMax(min, format)}</span>
        <span className="text-[11px] text-[#64748B] tabular-nums">{formatMinMax(max, format)}</span>
      </div>
    </div>
  )
}

export default SliderInput
