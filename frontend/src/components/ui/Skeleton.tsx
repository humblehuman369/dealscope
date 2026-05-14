'use client'

/**
 * Skeleton — themeable loading placeholder.
 *
 * Replaces ad-hoc `animate-pulse bg-[var(--surface-elevated)]` divs scattered
 * across the app (analytics/LoadingStates, property-details/*Skeleton, inline
 * `CompCardSkeleton` in PriceCheckerIQScreen, etc.). One primitive, one
 * animation timing, one surface token.
 *
 * Variants:
 *   - `text` (default) — narrow rounded rectangle, sized for a line of text
 *   - `rect`           — generic rectangular block; pass `width` / `height`
 *   - `circle`         — perfect circle, sized by `size` (or width=height)
 *
 * SSR-safe: rendered HTML is identical on server and client (no random
 * widths / Date.now / Math.random). If you need varied widths in a list,
 * pass them deterministically (index-keyed array).
 */

import type { CSSProperties } from 'react'

type SkeletonVariant = 'text' | 'rect' | 'circle'

export interface SkeletonProps {
  variant?: SkeletonVariant
  /** CSS width — string (`'80%'`, `'12rem'`) or number (px). */
  width?: string | number
  /** CSS height — string or number (px). Defaults vary by variant. */
  height?: string | number
  /** Convenience: sets both width and height for `circle`. */
  size?: string | number
  /** Border radius override; defaults to variant-appropriate value. */
  radius?: string | number
  /** Disable the pulse animation (e.g. when paused on reduced-motion). */
  noAnimate?: boolean
  className?: string
  style?: CSSProperties
}

function toCss(value: string | number | undefined): string | undefined {
  if (value == null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const DEFAULT_HEIGHT_BY_VARIANT: Record<SkeletonVariant, string> = {
  text: '0.875rem', // ≈ leading-5 line-height; reads as "one line of body text"
  rect: '1rem',
  circle: '2.5rem', // 40px — a sensible avatar default
}

const DEFAULT_RADIUS_BY_VARIANT: Record<SkeletonVariant, string> = {
  text: '0.25rem',
  rect: '0.375rem',
  circle: '9999px',
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  size,
  radius,
  noAnimate = false,
  className = '',
  style,
}: SkeletonProps) {
  const resolvedWidth = variant === 'circle' && size != null ? size : width
  const resolvedHeight =
    variant === 'circle' && size != null ? size : (height ?? DEFAULT_HEIGHT_BY_VARIANT[variant])

  const resolvedRadius = radius ?? DEFAULT_RADIUS_BY_VARIANT[variant]

  return (
    <div
      role="status"
      aria-hidden="true"
      className={`${noAnimate ? '' : 'animate-pulse'} ${className}`.trim()}
      style={{
        width: toCss(resolvedWidth),
        height: toCss(resolvedHeight),
        borderRadius: toCss(resolvedRadius),
        background: 'var(--surface-elevated)',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

export default Skeleton
