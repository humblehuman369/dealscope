'use client'

import React from 'react'

/**
 * DealGapBar — proprietary brand visualization showing
 * Target Buy, Income Value, and Market Price as three points
 * on a cyan-blue tube, with bracket dimension lines marking
 * the DealGap (Target → Market) and PriceGap (Income → Market).
 *
 * Brand identity rules (locked):
 *  - Bar is a single cyan-blue gradient tube — no rainbow gradient
 *  - Dots have white inner ring + colored core for crisp contrast
 *  - Brackets are short, flat (12-13px verticals), architectural style
 *  - Labels TARGET / INCOME / MARKET sit tight to the bar
 *  - DEAL GAP / PRICE GAP labels sit tight to their bracket horizontals
 *
 * Color tokens (from globals.css):
 *  Target = --accent-sky        #0FA4E9
 *  Income = --status-income-value #FACC15
 *  Market = --status-negative   #f87171
 */

export interface DealGapBarProps {
  /** Target Buy price */
  target: number
  /** Income Value (break-even) */
  income: number
  /** Market Price (or list price) */
  market: number
  /** Visual size — controls SVG viewBox and font sizes */
  size?: 'compact' | 'full'
  /** Optional className for outer wrapper */
  className?: string
}

const TARGET_COLOR = '#0FA4E9'
const INCOME_COLOR = '#FACC15'
const MARKET_COLOR = '#f87171'

export function DealGapBar({
  target,
  income,
  market,
  size = 'full',
  className = '',
}: DealGapBarProps) {
  // Compute Income's position as a percentage between Target and Market
  // Always render Target at the left edge and Market at the right edge of the bar
  const range = market - target
  const incomePct = range > 0 ? (income - target) / range : 0.5

  // Compute display percentages
  const dealGap = market !== 0 ? ((target - market) / market) * 100 : 0
  const priceGap = market !== 0 ? ((income - market) / market) * 100 : 0

  if (size === 'compact') {
    return (
      <CompactBar
        incomePct={incomePct}
        dealGapPct={dealGap}
        priceGapPct={priceGap}
        className={className}
      />
    )
  }
  return (
    <FullBar
      incomePct={incomePct}
      dealGapPct={dealGap}
      priceGapPct={priceGap}
      className={className}
    />
  )
}

/* ---------- helpers ---------- */

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '−'
  return `${sign}${Math.abs(n).toFixed(1)}%`
}

/* ---------- FULL SIZE (500x220) ---------- */

interface InternalBarProps {
  incomePct: number // 0-1
  dealGapPct: number
  priceGapPct: number
  className?: string
}

function FullBar({ incomePct, dealGapPct, priceGapPct, className = '' }: InternalBarProps) {
  // Bar geometry: spans x=10 to x=490, dots at x=60 (Target) and x=440 (Market)
  const TARGET_X = 60
  const MARKET_X = 440
  const INCOME_X = TARGET_X + incomePct * (MARKET_X - TARGET_X)
  const dotsRange = MARKET_X - TARGET_X

  // PriceGap bracket only valid if Income is meaningfully right of Target
  const showPriceGap = INCOME_X > TARGET_X + dotsRange * 0.05
  const priceGapBracketStartX = INCOME_X

  return (
    <svg
      viewBox="0 0 500 220"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
    >
      <defs>
        <linearGradient id="dgb-bar-full" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0F1E3C" stopOpacity="0.95" />
          <stop offset="25%" stopColor="#0064B4" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#00B4FF" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#0064B4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0F1E3C" stopOpacity="0.95" />
        </linearGradient>
        <filter id="dgb-glow-full" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* DEAL GAP top bracket + label */}
      <text
        x={220}
        y={68}
        textAnchor="middle"
        fill={TARGET_COLOR}
        fontSize={16}
        fontWeight={800}
        letterSpacing={2.5}
      >
        DEAL GAP
      </text>
      <text x={290} y={68} textAnchor="start" fill={TARGET_COLOR} fontSize={16} fontWeight={800}>
        {formatPct(dealGapPct)}
      </text>
      <path
        d={`M ${TARGET_X} 96 L ${TARGET_X} 83 Q ${TARGET_X} 78 ${TARGET_X + 5} 78 L ${MARKET_X - 5} 78 Q ${MARKET_X} 78 ${MARKET_X} 83 L ${MARKET_X} 96`}
        stroke={TARGET_COLOR}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.85}
      />

      {/* THE BAR */}
      <rect
        x={10}
        y={100}
        width={480}
        height={20}
        rx={10}
        ry={10}
        fill="url(#dgb-bar-full)"
        stroke="#1E3A5F"
        strokeWidth={1}
      />
      <rect x={12} y={102} width={476} height={6} rx={3} ry={3} fill="white" opacity={0.08} />

      {/* DOTS */}
      <Dot
        cx={TARGET_X}
        cy={110}
        color={TARGET_COLOR}
        r={9}
        innerR={5}
        coreR={3}
        glowId="dgb-glow-full"
      />
      <Dot
        cx={INCOME_X}
        cy={110}
        color={INCOME_COLOR}
        r={9}
        innerR={5}
        coreR={3}
        glowId="dgb-glow-full"
      />
      <Dot
        cx={MARKET_X}
        cy={110}
        color={MARKET_COLOR}
        r={9}
        innerR={5}
        coreR={3}
        glowId="dgb-glow-full"
      />

      {/* TARGET / INCOME / MARKET labels */}
      <text
        x={TARGET_X}
        y={138}
        textAnchor="middle"
        fill={TARGET_COLOR}
        fontSize={11}
        fontWeight={700}
        letterSpacing={2}
      >
        TARGET
      </text>
      <text
        x={INCOME_X}
        y={138}
        textAnchor="middle"
        fill={INCOME_COLOR}
        fontSize={11}
        fontWeight={700}
        letterSpacing={2}
      >
        INCOME
      </text>
      <text
        x={MARKET_X}
        y={138}
        textAnchor="middle"
        fill={MARKET_COLOR}
        fontSize={11}
        fontWeight={700}
        letterSpacing={2}
      >
        MARKET
      </text>

      {/* PRICE GAP bottom bracket + label */}
      {showPriceGap && (
        <>
          <path
            d={`M ${priceGapBracketStartX} 146 L ${priceGapBracketStartX} 159 Q ${priceGapBracketStartX} 164 ${priceGapBracketStartX + 5} 164 L ${MARKET_X - 5} 164 Q ${MARKET_X} 164 ${MARKET_X} 159 L ${MARKET_X} 146`}
            stroke={INCOME_COLOR}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            opacity={0.85}
          />
          <text
            x={(priceGapBracketStartX + MARKET_X) / 2 - 32}
            y={186}
            textAnchor="middle"
            fill={INCOME_COLOR}
            fontSize={16}
            fontWeight={800}
            letterSpacing={2.5}
          >
            PRICE GAP
          </text>
          <text
            x={(priceGapBracketStartX + MARKET_X) / 2 + 40}
            y={186}
            textAnchor="start"
            fill={INCOME_COLOR}
            fontSize={16}
            fontWeight={800}
          >
            {formatPct(priceGapPct)}
          </text>
        </>
      )}
    </svg>
  )
}

/* ---------- COMPACT (280x180) ---------- */

function CompactBar({ incomePct, dealGapPct, priceGapPct, className = '' }: InternalBarProps) {
  const TARGET_X = 36
  const MARKET_X = 244
  const INCOME_X = TARGET_X + incomePct * (MARKET_X - TARGET_X)
  const showPriceGap = INCOME_X > TARGET_X + (MARKET_X - TARGET_X) * 0.05

  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
    >
      <defs>
        <linearGradient id="dgb-bar-compact" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0F1E3C" stopOpacity="0.95" />
          <stop offset="25%" stopColor="#0064B4" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#00B4FF" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#0064B4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0F1E3C" stopOpacity="0.95" />
        </linearGradient>
        <filter id="dgb-glow-compact" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <text
        x={120}
        y={52}
        textAnchor="middle"
        fill={TARGET_COLOR}
        fontSize={12}
        fontWeight={800}
        letterSpacing={1.8}
      >
        DEAL GAP
      </text>
      <text x={172} y={52} textAnchor="start" fill={TARGET_COLOR} fontSize={12} fontWeight={800}>
        {formatPct(dealGapPct)}
      </text>
      <path
        d={`M ${TARGET_X} 78 L ${TARGET_X} 66 Q ${TARGET_X} 62 ${TARGET_X + 4} 62 L ${MARKET_X - 4} 62 Q ${MARKET_X} 62 ${MARKET_X} 66 L ${MARKET_X} 78`}
        stroke={TARGET_COLOR}
        strokeWidth={1.25}
        fill="none"
        strokeLinecap="round"
        opacity={0.85}
      />

      <rect
        x={8}
        y={82}
        width={264}
        height={16}
        rx={8}
        ry={8}
        fill="url(#dgb-bar-compact)"
        stroke="#1E3A5F"
        strokeWidth={1}
      />
      <rect x={10} y={84} width={260} height={5} rx={2.5} ry={2.5} fill="white" opacity={0.08} />

      <Dot
        cx={TARGET_X}
        cy={90}
        color={TARGET_COLOR}
        r={7}
        innerR={3.5}
        coreR={2}
        glowId="dgb-glow-compact"
      />
      <Dot
        cx={INCOME_X}
        cy={90}
        color={INCOME_COLOR}
        r={7}
        innerR={3.5}
        coreR={2}
        glowId="dgb-glow-compact"
      />
      <Dot
        cx={MARKET_X}
        cy={90}
        color={MARKET_COLOR}
        r={7}
        innerR={3.5}
        coreR={2}
        glowId="dgb-glow-compact"
      />

      <text
        x={TARGET_X}
        y={113}
        textAnchor="middle"
        fill={TARGET_COLOR}
        fontSize={9}
        fontWeight={700}
        letterSpacing={1.5}
      >
        TARGET
      </text>
      <text
        x={INCOME_X}
        y={113}
        textAnchor="middle"
        fill={INCOME_COLOR}
        fontSize={9}
        fontWeight={700}
        letterSpacing={1.5}
      >
        INCOME
      </text>
      <text
        x={MARKET_X}
        y={113}
        textAnchor="middle"
        fill={MARKET_COLOR}
        fontSize={9}
        fontWeight={700}
        letterSpacing={1.5}
      >
        MARKET
      </text>

      {showPriceGap && (
        <>
          <path
            d={`M ${INCOME_X} 120 L ${INCOME_X} 132 Q ${INCOME_X} 136 ${INCOME_X + 4} 136 L ${MARKET_X - 4} 136 Q ${MARKET_X} 136 ${MARKET_X} 132 L ${MARKET_X} 120`}
            stroke={INCOME_COLOR}
            strokeWidth={1.25}
            fill="none"
            strokeLinecap="round"
            opacity={0.85}
          />
          <text
            x={(INCOME_X + MARKET_X) / 2 - 22}
            y={155}
            textAnchor="middle"
            fill={INCOME_COLOR}
            fontSize={12}
            fontWeight={800}
            letterSpacing={1.8}
          >
            PRICE GAP
          </text>
          <text
            x={(INCOME_X + MARKET_X) / 2 + 26}
            y={155}
            textAnchor="start"
            fill={INCOME_COLOR}
            fontSize={12}
            fontWeight={800}
          >
            {formatPct(priceGapPct)}
          </text>
        </>
      )}
    </svg>
  )
}

/* ---------- shared dot renderer ---------- */

interface DotProps {
  cx: number
  cy: number
  color: string
  r: number
  innerR: number
  coreR: number
  glowId: string
}

function Dot({ cx, cy, color, r, innerR, coreR, glowId }: DotProps) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={color} filter={`url(#${glowId})`} />
      <circle cx={cx} cy={cy} r={innerR} fill="#FFFFFF" />
      <circle cx={cx} cy={cy} r={coreR} fill={color} />
    </>
  )
}
