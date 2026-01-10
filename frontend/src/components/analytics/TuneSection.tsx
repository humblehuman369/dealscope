'use client'

import React, { useState, useCallback } from 'react'
import { ChevronDown, Settings } from 'lucide-react'
import { SliderConfig, TuneGroup } from './types'

/**
 * TuneSection Component
 * 
 * A collapsible section for adjusting deal parameters ("Tune the Deal").
 * Contains grouped sliders for different categories like Financing, Rental, etc.
 * 
 * Features:
 * - Main collapsible container
 * - Nested collapsible groups
 * - Individual slider rows with real-time value display
 * - Change indicators (positive/negative)
 */

interface TuneSectionProps {
  /** Title for the section */
  title?: string
  /** Array of tune groups with sliders */
  groups: TuneGroup[]
  /** Always-visible slider (usually Purchase Price) */
  primarySlider?: SliderConfig
  /** Callback when any slider value changes */
  onSliderChange?: (sliderId: string, value: number) => void
  /** Initial open state */
  defaultOpen?: boolean
}

export function TuneSection({
  title = 'Tune the Deal',
  groups,
  primarySlider,
  onSliderChange,
  defaultOpen = false
}: TuneSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl mb-3 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-teal/[0.05] hover:bg-teal/[0.1] transition-colors duration-200 rounded-xl"
      >
        <div className="flex items-center gap-2 text-[0.78rem] font-semibold text-gray-800 dark:text-white">
          <Settings className="w-4 h-4 text-teal" />
          {title}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] text-teal font-medium">
            {isOpen ? 'Collapse' : 'Tap to adjust'}
          </span>
          <div 
            className={`w-6 h-6 bg-teal/15 border border-teal/30 rounded-md flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <ChevronDown className="w-3.5 h-3.5 text-teal" />
          </div>
        </div>
      </button>

      {/* Collapsible Body */}
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 pt-3.5">
          {/* Primary Slider (always visible in body) */}
          {primarySlider && (
            <SliderRow 
              slider={primarySlider} 
              onChange={onSliderChange}
            />
          )}

          {/* Nested Groups */}
          {groups.map((group) => (
            <TuneGroupComponent 
              key={group.id} 
              group={group}
              onSliderChange={onSliderChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface TuneGroupComponentProps {
  group: TuneGroup
  onSliderChange?: (sliderId: string, value: number) => void
}

function TuneGroupComponent({ group, onSliderChange }: TuneGroupComponentProps) {
  const [isOpen, setIsOpen] = useState(group.isOpen ?? false)

  return (
    <div className="bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-xl mt-3 overflow-hidden">
      {/* Group Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-white/[0.03] transition-colors duration-200"
      >
        <span className="text-[0.72rem] font-semibold text-gray-700 dark:text-white/70 uppercase tracking-wide">
          {group.title}
        </span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-gray-500 dark:text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Group Body */}
      <div className={`transition-all duration-200 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-3.5 pb-3.5">
          {group.sliders.map((slider) => (
            <SliderRow 
              key={slider.id} 
              slider={slider}
              onChange={onSliderChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface SliderRowProps {
  slider: SliderConfig
  onChange?: (sliderId: string, value: number) => void
}

function SliderRow({ slider, onChange }: SliderRowProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange?.(slider.id, newValue)
  }, [slider.id, onChange])

  return (
    <div className="mb-3.5 last:mb-0">
      {/* Header with label and value */}
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[0.78rem] font-semibold text-gray-700 dark:text-white/80">
          {slider.label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[0.85rem] font-bold text-teal">
            {slider.formattedValue}
          </span>
          {slider.suffix && (
            <span className="text-[0.72rem] text-gray-500 dark:text-white/40">
              {slider.suffix}
            </span>
          )}
          {slider.changeIndicator && (
            <span className={`text-[0.72rem] font-semibold ${slider.changeIndicator.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {slider.changeIndicator.value}
            </span>
          )}
        </span>
      </div>

      {/* Slider Track */}
      <div className="relative h-1.5 bg-gray-200 dark:bg-white/10 rounded-full">
        {/* Fill */}
        <div 
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ 
            width: `${slider.fillPercent}%`,
            background: 'linear-gradient(90deg, var(--color-teal) 0%, #0465f2 100%)'
          }}
        />
        {/* Thumb indicator (visual only, actual input covers the track) */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] bg-white border-2 border-teal rounded-full shadow-md pointer-events-none"
          style={{ 
            left: `${slider.fillPercent}%`,
            transform: `translateX(-50%) translateY(-50%)`
          }}
        />
        {/* Hidden range input */}
        <input
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={slider.value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}

/**
 * Standalone SliderRow component for use outside TuneSection
 */
export function StandaloneSlider({ slider, onChange }: SliderRowProps) {
  return <SliderRow slider={slider} onChange={onChange} />
}

/**
 * Helper function to create slider config
 */
export function createSliderConfig(
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  formatter: (value: number) => string,
  baseValue?: number,
  suffix?: string
): SliderConfig {
  const fillPercent = ((value - min) / (max - min)) * 100
  
  let changeIndicator: SliderConfig['changeIndicator'] | undefined
  if (baseValue !== undefined && baseValue !== 0) {
    const changePercent = ((value - baseValue) / baseValue) * 100
    if (Math.abs(changePercent) > 0.5) {
      changeIndicator = {
        value: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(0)}%`,
        isPositive: changePercent < 0 // Lower price is positive for investors
      }
    }
  }

  return {
    id,
    label,
    value,
    formattedValue: formatter(value),
    min,
    max,
    step,
    fillPercent: Math.min(100, Math.max(0, fillPercent)),
    changeIndicator,
    suffix
  }
}

/**
 * Common formatters
 */
export const formatters = {
  currency: (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value),
  
  percent: (value: number) => `${(value * 100).toFixed(1)}%`,
  
  percentWhole: (value: number) => `${Math.round(value * 100)}%`,
  
  years: (value: number) => `${value} years`,
  
  months: (value: number) => `${value} months`,
  
  rooms: (value: number) => `${value} of ${value + 1}`
}

/**
 * Preset tune groups by strategy
 */
export function createLTRTuneGroups(assumptions: {
  downPayment: number
  interestRate: number
  monthlyRent: number
  vacancyRate: number
  managementPct: number
  maintenancePct: number
}): TuneGroup[] {
  return [
    {
      id: 'financing',
      title: 'Financing',
      sliders: [
        createSliderConfig(
          'downPayment',
          'Down Payment',
          assumptions.downPayment,
          0.05,
          0.50,
          0.01,
          (v) => `${formatters.currency(v * 100000)}`,
          0.25,
          `(${(assumptions.downPayment * 100).toFixed(1)}%)`
        ),
        createSliderConfig(
          'interestRate',
          'Interest Rate',
          assumptions.interestRate,
          0.04,
          0.12,
          0.001,
          formatters.percent
        )
      ]
    },
    {
      id: 'rental',
      title: 'Rental',
      sliders: [
        createSliderConfig(
          'monthlyRent',
          'Monthly Rent',
          assumptions.monthlyRent,
          500,
          10000,
          50,
          formatters.currency
        ),
        createSliderConfig(
          'vacancyRate',
          'Vacancy Rate',
          assumptions.vacancyRate,
          0,
          0.20,
          0.01,
          formatters.percent
        ),
        createSliderConfig(
          'managementPct',
          'Management',
          assumptions.managementPct,
          0,
          0.15,
          0.01,
          formatters.percent
        ),
        createSliderConfig(
          'maintenancePct',
          'Maintenance',
          assumptions.maintenancePct,
          0.02,
          0.15,
          0.01,
          formatters.percent
        )
      ]
    }
  ]
}

export default TuneSection
