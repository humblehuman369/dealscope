'use client'

import React, { useState } from 'react'

export interface SliderInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  format?: 'number' | 'currency' | 'percent'
  quickAdjust?: number[]
  benchmark?: number
}

export function SliderInput({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  format = 'number', 
  quickAdjust, 
  benchmark 
}: SliderInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const formatValue = (v: number): string => {
    if (format === 'currency') return `$${Math.round(v).toLocaleString()}`
    if (format === 'percent') return `${v.toFixed(1)}%`
    return v.toLocaleString()
  }

  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    const num = parseFloat(inputValue.replace(/[$,%]/g, ''))
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)))
    }
    setIsEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const startEditing = () => {
    setInputValue(value.toString())
    setIsEditing(true)
  }

  const formatQuickAdjust = (adj: number): string => {
    const prefix = adj > 0 ? '+' : ''
    if (format === 'currency') {
      if (Math.abs(adj) >= 1000) {
        return `${prefix}$${adj / 1000}k`
      }
      return `${prefix}$${adj}`
    }
    return `${prefix}${adj}`
  }
  
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-surface-500 dark:text-surface-400">{label}</label>
        <div className="flex items-center gap-3">
          {benchmark !== undefined && (
            <span className="text-xs text-surface-400 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded">
              Mkt: {formatValue(benchmark)}
            </span>
          )}
          {isEditing ? (
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              autoFocus
              className="w-28 text-right text-sm font-semibold num text-navy dark:text-white bg-surface-100 dark:bg-surface-700 border border-teal-600 dark:border-teal-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          ) : (
            <button
              onClick={startEditing}
              className="text-right text-sm font-semibold num text-navy dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              {formatValue(value)}
            </button>
          )}
        </div>
      </div>
      {/* InvestIQ Slider - 6px height, surface-200 track, teal fill */}
      <div className="relative">
        <div className="h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full">
          <div 
            className="h-full bg-teal-600 dark:bg-teal-400 rounded-full transition-all duration-100" 
            style={{ width: `${percentage}%` }} 
          />
        </div>
        {benchmark !== undefined && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-surface-400 dark:bg-white/50 rounded" 
            style={{ left: `${((benchmark - min) / (max - min)) * 100}%` }} 
          />
        )}
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))} 
          className="absolute inset-0 w-full h-6 -top-2 opacity-0 cursor-pointer" 
        />
      </div>
      {quickAdjust && (
        <div className="flex gap-1.5 mt-2">
          {quickAdjust.map((adj) => (
            <button 
              key={adj} 
              onClick={() => onChange(Math.max(min, Math.min(max, value + adj)))} 
              className="text-xs px-2.5 py-1 rounded-md bg-surface-100 dark:bg-surface-700 hover:bg-teal-600/10 dark:hover:bg-teal-400/10 text-surface-600 dark:text-surface-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium border border-surface-200 dark:border-transparent"
            >
              {formatQuickAdjust(adj)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
