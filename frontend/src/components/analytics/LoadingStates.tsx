'use client'

import React from 'react'

/**
 * Loading States & Skeleton Components
 * 
 * Provides consistent loading indicators and skeleton screens
 * for the analytics components during data fetching.
 */

// ============================================
// SKELETON COMPONENTS
// ============================================

/**
 * SkeletonBox - Basic animated skeleton rectangle
 */
interface SkeletonBoxProps {
  className?: string
}

export function SkeletonBox({ className = 'h-4 w-full' }: SkeletonBoxProps) {
  return (
    <div 
      className={`bg-white/[0.08] rounded animate-pulse ${className}`}
    />
  )
}

/**
 * SkeletonText - Skeleton for text lines
 */
interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox 
          key={i} 
          className={`h-3 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard - Skeleton for card components
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <SkeletonBox className="h-4 w-1/2 mb-2" />
          <SkeletonBox className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

// ============================================
// ANALYTICS-SPECIFIC SKELETONS
// ============================================

/**
 * IQTargetHeroSkeleton - Loading state for IQ Target Hero
 */
export function IQTargetHeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-center mb-4 bg-gradient-to-br from-green-500/[0.08] to-teal/[0.05] border border-green-500/20">
      <div className="flex justify-center mb-3">
        <SkeletonBox className="h-6 w-32 rounded-full" />
      </div>
      <SkeletonBox className="h-4 w-40 mx-auto mb-2" />
      <SkeletonBox className="h-12 w-48 mx-auto mb-2" />
      <SkeletonBox className="h-4 w-32 mx-auto mb-3" />
      <SkeletonText lines={2} className="max-w-[280px] mx-auto" />
    </div>
  )
}

/**
 * PriceLadderSkeleton - Loading state for Price Ladder
 */
export function PriceLadderSkeleton() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 mb-4">
      <SkeletonBox className="h-4 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBox className="w-2.5 h-2.5 rounded-full" />
            <div className="flex-1">
              <SkeletonBox className="h-3.5 w-24" />
            </div>
            <SkeletonBox className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * ReturnsGridSkeleton - Loading state for Returns Grid
 */
export function ReturnsGridSkeleton() {
  return (
    <div className="bg-gradient-to-br from-green-500/[0.08] to-teal/[0.05] border border-green-500/20 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3.5">
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] rounded-xl p-3 text-center">
            <SkeletonBox className="h-6 w-16 mx-auto mb-1" />
            <SkeletonBox className="h-2.5 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * BenchmarksSkeleton - Loading state for Performance Benchmarks
 */
export function BenchmarksSkeleton() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-2 py-3 mb-4">
      <div className="px-2 mb-4">
        <SkeletonBox className="h-4 w-40 mb-1" />
        <SkeletonBox className="h-3 w-56" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-4">
            <div className="flex justify-between items-center mb-2 px-2">
              <SkeletonBox className="h-3 w-28" />
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-4 w-12" />
                <SkeletonBox className="h-5 w-10 rounded-full" />
              </div>
            </div>
            <SkeletonBox className="h-6 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * StrategySelectorSkeleton - Loading state for Strategy Pills
 */
export function StrategySelectorSkeleton() {
  return (
    <div className="mb-4">
      <SkeletonBox className="h-12 w-full rounded-xl mb-3.5" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
    </div>
  )
}

/**
 * PropertyMiniCardSkeleton - Loading state for Property Mini Card
 */
export function PropertyMiniCardSkeleton() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 flex gap-3 mb-4">
      <SkeletonBox className="w-20 h-20 rounded-xl flex-shrink-0" />
      <div className="flex-1">
        <SkeletonBox className="h-4 w-3/4 mb-2" />
        <SkeletonBox className="h-3 w-1/2 mb-3" />
        <SkeletonBox className="h-5 w-24 mb-1" />
        <SkeletonBox className="h-3 w-32" />
      </div>
    </div>
  )
}

// ============================================
// FULL PAGE SKELETON
// ============================================

/**
 * AnalyticsPageSkeleton - Full page loading skeleton
 */
export function AnalyticsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1426] to-[#091020] text-white p-4">
      <PropertyMiniCardSkeleton />
      <StrategySelectorSkeleton />
      
      {/* Sub-tabs skeleton */}
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-8 w-16 rounded-xl" />
        ))}
      </div>
      
      <IQTargetHeroSkeleton />
      <PriceLadderSkeleton />
      <ReturnsGridSkeleton />
      <BenchmarksSkeleton />
    </div>
  )
}

// ============================================
// LOADING SPINNERS
// ============================================

/**
 * LoadingSpinner - Animated loading spinner
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  }

  return (
    <div 
      className={`${sizeClasses[size]} border-teal/30 border-t-teal rounded-full animate-spin ${className}`}
    />
  )
}

/**
 * LoadingOverlay - Full-screen loading overlay
 */
interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message = 'Loading analytics...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-[#0b1426]/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-white/60 text-sm font-medium">{message}</p>
    </div>
  )
}

/**
 * CalculatingIndicator - Shows when calculations are running
 */
export function CalculatingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-teal/10 border border-teal/20 rounded-lg">
      <div className="flex gap-0.5">
        <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-teal text-xs font-medium">Calculating...</span>
    </div>
  )
}

// ============================================
// ERROR STATES
// ============================================

/**
 * ErrorCard - Display error messages
 */
interface ErrorCardProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorCard({ 
  title = 'Something went wrong', 
  message, 
  onRetry 
}: ErrorCardProps) {
  return (
    <div className="bg-red-500/[0.08] border border-red-500/20 rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-red-500">⚠️</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-500 mb-1">{title}</h4>
          <p className="text-xs text-white/60 mb-3">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-red-500/20 text-red-500 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * EmptyState - Display when no data is available
 */
interface EmptyStateProps {
  icon?: string
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ 
  icon = '📊', 
  title, 
  message, 
  actionLabel,
  onAction 
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-white/60 mb-4 max-w-[280px] mx-auto">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-teal text-white text-sm font-medium rounded-lg hover:bg-teal/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default AnalyticsPageSkeleton
