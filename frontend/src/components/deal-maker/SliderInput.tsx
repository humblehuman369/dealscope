'use client'

/**
 * SliderInput Component
 * 
 * Reusable slider input with formatted value display, 
 * gradient fill track, and custom thumb styling.
 */

import React from 'react'

export type SliderFormat = 'currency' | 'currency-year' | 'percent' | 'percent-int' | 'years'

interface SliderInputProps {
  label: string
  sublabel?: string
  value: number
  min: number
  max: number
  step: number
  format: SliderFormat
  onChange: (value: number) => void
}

// Format value based on type
function formatValue(value: number, format: SliderFormat): string {
  switch (format) {
    case 'currency':
      return `$${value.toLocaleString()}`
    case 'currency-year':
      return `$${value.toLocaleString()}/yr`
    case 'percent':
      return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`
    case 'percent-int':
      return `${Math.round(value)}%`
    case 'years':
      return `${value} years`
    default:
      return value.toString()
  }
}

// Format min/max for range labels
function formatMinMax(value: number, format: SliderFormat): string {
  switch (format) {
    case 'currency':
    case 'currency-year':
      return `$${value.toLocaleString()}`
    case 'percent':
    case 'percent-int':
      return `${value}%`
    case 'years':
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
          <span className="text-sm font-medium text-[#0A1628]">{label}</span>
          {sublabel && (
            <span className="text-[11px] text-[#94A3B8] mt-0.5">{sublabel}</span>
          )}
        </div>
        <span className="text-lg font-bold text-[#0891B2]">
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
            [&::-webkit-slider-thumb]:bg-[#0A1628]
            [&::-webkit-slider-thumb]:border-[3px]
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(10,22,40,0.3)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-105
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#0A1628]
            [&::-moz-range-thumb]:border-[3px]
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(10,22,40,0.3)]
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0891B2 0%, #0891B2 ${fillPercent}%, #E2E8F0 ${fillPercent}%, #E2E8F0 100%)`
          }}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-[#94A3B8]">{formatMinMax(min, format)}</span>
        <span className="text-[11px] text-[#94A3B8]">{formatMinMax(max, format)}</span>
      </div>
    </div>
  )
}

export default SliderInput
