'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { DealGapChartProps, DealZoneLabel } from './types'
import { 
  useDealGap, 
  buyPriceFromSliderPosition, 
  sliderPositionFromBuyPrice 
} from '@/hooks/useDealGap'

/**
 * DealGapChart Component
 * 
 * A visual "price ladder" showing the relationship between List Price, 
 * Breakeven, and Buy Price with interactive brackets showing the deal gap.
 * 
 * Features:
 * - Vertical gradient ladder (red=loss → green=profit → blue=deep value)
 * - Deal Gap bracket showing discount from list
 * - Delta brackets showing position vs breakeven
 * - Interactive slider for what-if analysis
 * - Zone indicators (Loss Zone, Profit Zone, Deep Value, etc.)
 */

// Format currency
const formatUSD = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Color interpolation for ladder positions
function colorForPosition(p: number): string {
  const stops = [
    { p: 0.0, c: [239, 68, 68] },   // red
    { p: 0.36, c: [245, 158, 11] }, // orange
    { p: 0.50, c: [253, 216, 53] }, // yellow
    { p: 0.72, c: [34, 197, 94] },  // green
    { p: 1.0, c: [56, 189, 248] },  // blue
  ]
  const clampedP = Math.max(0, Math.min(1, p))
  let a = stops[0], b = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (clampedP >= stops[i].p && clampedP <= stops[i + 1].p) {
      a = stops[i]
      b = stops[i + 1]
      break
    }
  }
  const t = (clampedP - a.p) / (b.p - a.p || 1)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${mix(a.c[0], b.c[0])}, ${mix(a.c[1], b.c[1])}, ${mix(a.c[2], b.c[2])})`
}

// Get zone badge styles
function getZoneBadgeStyles(zone: DealZoneLabel): string {
  switch (zone) {
    case 'Deep Value':
      return 'bg-sky-500/20 text-sky-600 border-sky-500/30'
    case 'Profit Zone':
      return 'bg-green-500/20 text-green-600 border-green-500/30'
    case 'Breakeven / Negotiate':
      return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
    case 'High Risk':
      return 'bg-orange-500/20 text-orange-600 border-orange-500/30'
    case 'Loss Zone':
      return 'bg-red-500/20 text-red-600 border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-600 border-gray-500/30'
  }
}

// Metric chip component
interface ChipProps {
  label: string
  value: string
  sub: string
  accent: string
}

function Chip({ label, value, sub, accent }: ChipProps) {
  return (
    <div 
      className="relative p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
      style={{ '--chip-accent': accent } as React.CSSProperties}
    >
      {/* Accent bar */}
      <div 
        className="absolute left-2.5 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <div className="pl-2.5">
        <div 
          className="text-[15px] font-black tracking-wider uppercase"
          style={{ color: accent }}
        >
          {label}
        </div>
        <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
          {value}
        </div>
        <div className="text-[17px] font-semibold text-slate-500 dark:text-white/50">
          {sub}
        </div>
      </div>
    </div>
  )
}

export function DealGapChart({
  breakeven,
  listPrice,
  initialBuyPrice,
  thresholdPct = 10,
  showSlider = true,
  showHeader = true,
  onBuyPriceChange,
  className = '',
}: DealGapChartProps) {
  // Calculate initial slider position
  const initialPosition = useMemo(() => {
    const buyPrice = initialBuyPrice ?? Math.round(breakeven * 0.9)
    return sliderPositionFromBuyPrice(breakeven, buyPrice)
  }, [breakeven, initialBuyPrice])

  const [sliderPosition, setSliderPosition] = useState(initialPosition)

  // Bug fix: Sync slider state when initialPosition changes (e.g., when breakeven updates from backend)
  React.useEffect(() => {
    setSliderPosition(initialPosition)
  }, [initialPosition])

  // Calculate buy price from slider
  const buyPrice = useMemo(() => {
    return buyPriceFromSliderPosition(breakeven, sliderPosition)
  }, [breakeven, sliderPosition])

  // Get deal gap data
  const { data } = useDealGap({
    listPrice,
    breakevenPrice: breakeven,
    buyPrice,
  })

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = Number(e.target.value)
    setSliderPosition(newPosition)
    if (onBuyPriceChange) {
      const newBuyPrice = buyPriceFromSliderPosition(breakeven, newPosition)
      onBuyPriceChange(newBuyPrice)
    }
  }, [breakeven, onBuyPriceChange])

  // Fixed positions on ladder (0 = top, 1 = bottom)
  const listPosFixed = 0.15  // List price near top (red zone)
  const bePos = 0.50         // Breakeven at center
  
  // Buy position mapped from slider (0-100 → 0.20-0.80 on ladder)
  // Bug fix: Slider 50 must align with breakeven at 0.50
  // Formula: 0.20 + (position/100) * 0.60 gives: 0→0.20, 50→0.50, 100→0.80
  const buyPosOnLadder = useMemo(() => {
    return 0.20 + (sliderPosition / 100) * 0.60
  }, [sliderPosition])

  // Colors for each position
  const listAccent = colorForPosition(listPosFixed)
  const beAccent = colorForPosition(bePos)
  const buyAccent = colorForPosition(buyPosOnLadder)

  // Deal gap text
  const dealGapText = useMemo(() => {
    const pct = data.dealGapPercent
    return `${pct >= 0 ? '-' : '+'}${Math.abs(pct).toFixed(1)}%`
  }, [data.dealGapPercent])

  // Bracket positioning helper
  const bracketStyle = (pA: number, pB: number) => {
    const top = Math.min(pA, pB)
    const bottom = Math.max(pA, pB)
    return {
      top: `${top * 100}%`,
      height: `${Math.max((bottom - top) * 100, 2)}%`,
    }
  }

  // Glow effect when deal gap exceeds threshold
  const showGlow = data.dealGapPercent >= thresholdPct

  // Decision headline
  const decisionHeadline = useMemo(() => {
    if (buyPrice > breakeven) return 'Loss Zone'
    return data.zone
  }, [buyPrice, breakeven, data.zone])

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header - hidden when embedded in worksheet */}
      {showHeader && (
        <div className="flex items-center justify-between gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg">
          <div>
            <div className="text-xs font-black tracking-wider uppercase text-slate-700 dark:text-white">
              Price Ladder
            </div>
            <div className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5">
              Deal Gap (Buy vs List) + Delta brackets vs Breakeven
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg overflow-hidden">
        {/* Card Header */}
        <div className="px-3 py-2.5 flex items-start justify-between gap-2.5 border-b border-slate-100 dark:border-white/5 bg-gradient-to-b from-slate-50 dark:from-black/20 to-transparent">
          <div>
            <h2 className="text-lg font-black tracking-wider uppercase text-slate-700 dark:text-white">
              Decision Chart
            </h2>
            <p className="text-[17px] text-slate-500 dark:text-white/60 mt-0.5">
              Buy Price vs List Price + Breakeven
            </p>
          </div>
          <span className={`text-[15px] px-2 py-1 rounded-full border font-bold tracking-wide ${getZoneBadgeStyles(decisionHeadline as DealZoneLabel)}`}>
            {decisionHeadline}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-3">
          {/* Ladder + Chips Layout */}
          <div className="flex gap-4 items-stretch">
            {/* Left: Metric Chips */}
            <div className="flex flex-col justify-between h-[360px] py-0.5 gap-3 w-[160px] flex-shrink-0">
              <Chip
                label="List Price"
                value={formatUSD(listPrice)}
                sub={`${data.listVsBreakevenPercent >= 0 ? '+' : ''}${data.listVsBreakevenPercent.toFixed(0)}%`}
                accent={listAccent}
              />
              <Chip
                label="Breakeven"
                value={formatUSD(breakeven)}
                sub="$0 Cash Flow"
                accent={beAccent}
              />
              <Chip
                label="Buy Price"
                value={formatUSD(buyPrice)}
                sub={`${data.buyVsBreakevenPercent >= 0 ? '+' : ''}${data.buyVsBreakevenPercent.toFixed(1)}%`}
                accent={buyAccent}
              />
            </div>

            {/* Right: Gradient Ladder (centered in remaining space) */}
            <div className="flex-1 flex justify-center max-w-[180px] mx-auto">
              <div 
                className="h-[360px] w-8 rounded-2xl relative shadow-lg"
              style={{
                background: `linear-gradient(to bottom, 
                  #ef4444 0%, 
                  #f59e0b 36%, 
                  #fdd835 50%, 
                  #22c55e 72%, 
                  #38bdf8 100%)`
              }}
            >
              {/* Breakeven line */}
              <div 
                className="absolute left-[-18px] right-[-18px] h-0.5 opacity-90"
                style={{ 
                  top: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                }}
              />

              {/* Deal Gap Bracket (Left side) */}
              <div
                className={`absolute left-[-30px] w-[22px] border-l-2 border-slate-600 dark:border-white/60 ${showGlow ? 'animate-pulse' : ''}`}
                style={bracketStyle(listPosFixed, buyPosOnLadder)}
              >
                {/* Top tick */}
                <div className="absolute left-[-2px] top-0 w-3.5 border-t-2 border-slate-600 dark:border-white/60" />
                {/* Bottom tick */}
                <div className="absolute left-[-2px] bottom-0 w-3.5 border-t-2 border-slate-600 dark:border-white/60" />
                {/* Label */}
                <div className="absolute left-[-10px] top-1/2 -translate-x-full -translate-y-1/2 px-2 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-[17px] font-black whitespace-nowrap text-slate-700 dark:text-white">
                  {dealGapText}
                </div>
              </div>

              {/* List vs BE Bracket (Right side, upper) */}
              <div
                className="absolute right-[-18px] w-[22px] border-r-2 border-slate-400 dark:border-white/40 opacity-90"
                style={bracketStyle(listPosFixed, bePos)}
              >
                <div className="absolute right-[-2px] top-0 w-3.5 border-t-2 border-slate-400 dark:border-white/40" />
                <div className="absolute right-[-2px] bottom-0 w-3.5 border-t-2 border-slate-400 dark:border-white/40" />
                <div className="absolute right-[-2px] top-1/2 translate-x-full -translate-y-1/2 px-2 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-[17px] font-black whitespace-nowrap text-orange-500">
                  {`${data.listVsBreakevenPercent >= 0 ? '+' : ''}${data.listVsBreakevenPercent.toFixed(0)}%`}
                </div>
              </div>

              {/* Buy vs BE Bracket (Right side, lower) */}
              <div
                className="absolute right-[-18px] w-[22px] border-r-2 border-slate-400 dark:border-white/40 opacity-90"
                style={bracketStyle(bePos, buyPosOnLadder)}
              >
                <div className="absolute right-[-2px] top-0 w-3.5 border-t-2 border-slate-400 dark:border-white/40" />
                <div className="absolute right-[-2px] bottom-0 w-3.5 border-t-2 border-slate-400 dark:border-white/40" />
                <div className="absolute right-[-2px] top-1/2 translate-x-full -translate-y-1/2 px-2 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-[17px] font-black whitespace-nowrap text-green-500">
                  {`${data.buyVsBreakevenPercent >= 0 ? '+' : ''}${data.buyVsBreakevenPercent.toFixed(1)}%`}
                </div>
              </div>

              {/* Markers */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-600 opacity-95"
                style={{ top: `${listPosFixed * 100}%` }}
                title="List Price"
              />
              <div 
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-700 shadow-md"
                style={{ top: `${buyPosOnLadder * 100}%` }}
                title="Buy Price"
              />
              </div>
            </div>
          </div>

          {/* Deal Gap Summary Card */}
          <div className="mt-3 p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="text-[15px] font-black tracking-wider uppercase text-slate-500 dark:text-white/60">
                Deal Gap
              </div>
              <div className="text-[17px] font-semibold text-slate-500 dark:text-white/50 whitespace-nowrap overflow-hidden text-ellipsis">
                Buy Price vs List Price
              </div>
            </div>
            <div className="text-[27px] font-black text-orange-500">
              {dealGapText}
            </div>
          </div>

          {/* Footer text */}
          <p className="mt-2.5 text-[17px] text-slate-500 dark:text-white/60 leading-relaxed">
            Buy is{' '}
            <b className={data.buyVsBreakevenPercent <= 0 ? 'text-green-600' : 'text-red-500'}>
              {Math.abs(data.buyVsBreakevenPercent).toFixed(1)}%
            </b>{' '}
            {data.buyVsBreakevenPercent <= 0 ? 'below' : 'above'} breakeven → <b>{decisionHeadline}</b>. 
            Seller motivation: <b>{data.sellerMotivation}</b>.
          </p>
        </div>
      </div>

      {/* Slider Section */}
      {showSlider && (
        <div className="flex items-center justify-between gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg">
          <div>
            <label htmlFor="buyPosSlider" className="text-[17px] font-black tracking-wider uppercase text-slate-500 dark:text-white/60">
              Buy Price Position
            </label>
            <div className="text-[17px] text-slate-500 dark:text-white/50 mt-1">
              Slide to move Buy marker (Deal Gap pulses at ≥{thresholdPct}%).
            </div>
          </div>
          <input
            id="buyPosSlider"
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={handleSliderChange}
            className="w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for embedding in cards
 */
export function DealGapChartCompact({
  breakeven,
  listPrice,
  buyPrice,
}: {
  breakeven: number
  listPrice: number
  buyPrice: number
}) {
  const { data } = useDealGap({
    listPrice,
    breakevenPrice: breakeven,
    buyPrice,
  })

  const dealGapText = `${data.dealGapPercent >= 0 ? '-' : '+'}${Math.abs(data.dealGapPercent).toFixed(1)}%`

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
      {/* Mini ladder */}
      <div 
        className="w-3 h-16 rounded-full flex-shrink-0"
        style={{
          background: 'linear-gradient(to bottom, #ef4444 0%, #fdd835 50%, #22c55e 100%)'
        }}
      />
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-white">Deal Gap</span>
          <span className="text-sm font-black text-orange-500">{dealGapText}</span>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-white/50 mt-1">
          {formatUSD(buyPrice)} buy → {data.zone}
        </div>
      </div>

      {/* Zone badge */}
      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getZoneBadgeStyles(data.zone)}`}>
        {data.sellerMotivation}
      </span>
    </div>
  )
}

export default DealGapChart
