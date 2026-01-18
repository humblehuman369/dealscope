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
    if (format === 'currency') return `$${v.toLocaleString()}`
    if (format === 'percent') return `${v.toFixed(2)}%`
    return v.toLocaleString()
  }

  const percentage = ((value - min) / (max - min)) * 100

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
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm text-slate-700 dark:text-slate-200 font-medium">{label}</label>
        <div className="flex items-center gap-3">
          {benchmark !== undefined && (
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
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
              className="w-28 text-right text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border border-cyan-500 dark:border-cyan-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          ) : (
            <button
              onClick={startEditing}
              className="w-28 text-right text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors"
            >
              {formatValue(value)}
            </button>
          )}
        </div>
      </div>
      <div className="relative h-2.5">
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-600 rounded-full" />
        <div 
          className="absolute h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-200" 
          style={{ width: `${percentage}%` }} 
        />
        {benchmark !== undefined && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-slate-400 dark:bg-white/50 rounded" 
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
      {quickAdjust && (
        <div className="flex gap-1.5">
          {quickAdjust.map((adj) => (
            <button 
              key={adj} 
              onClick={() => onChange(Math.max(min, Math.min(max, value + adj)))} 
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium border border-slate-200 dark:border-transparent"
            >
              {formatQuickAdjust(adj)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
