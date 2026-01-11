'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useViewMode } from '@/hooks/useDeviceType'
import { AnalyticsPageSkeleton } from './LoadingStates'
import type { StrategyId } from './types'

// Dynamically import containers to reduce initial bundle size
const StrategyAnalyticsContainer = dynamic(
  () => import('./StrategyAnalyticsContainer').then(mod => ({ default: mod.StrategyAnalyticsContainer })),
  { loading: () => <AnalyticsPageSkeleton />, ssr: true }
)

const DesktopStrategyAnalyticsContainer = dynamic(
  () => import('./desktop/DesktopStrategyAnalyticsContainer').then(mod => ({ default: mod.DesktopStrategyAnalyticsContainer })),
  { loading: () => <AnalyticsPageSkeleton />, ssr: true }
)

/**
 * PropertyData interface for responsive container
 */
export interface PropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  listPrice: number
  monthlyRent: number
  averageDailyRate: number
  occupancyRate: number
  propertyTaxes: number
  insurance: number
  bedrooms: number
  bathrooms: number
  sqft: number
  arv?: number
  thumbnailUrl?: string
  photos?: string[]
  photoCount?: number
}

interface ResponsiveAnalyticsContainerProps {
  property: PropertyData
  onBack?: () => void
  /** Force a specific view mode (for testing) */
  forceViewMode?: 'mobile' | 'desktop'
  /** Initial strategy to display */
  initialStrategy?: StrategyId
}

/**
 * ResponsiveAnalyticsContainer
 * 
 * Automatically switches between mobile and desktop analytics views
 * based on viewport width. Uses 1024px as the breakpoint.
 * 
 * Features:
 * - SSR-safe with hydration detection
 * - Dynamic imports for code splitting
 * - Loading skeleton during transitions
 * - Optional forced view mode for testing
 */
export function ResponsiveAnalyticsContainer({
  property,
  onBack,
  forceViewMode,
  initialStrategy
}: ResponsiveAnalyticsContainerProps) {
  const detectedViewMode = useViewMode(1024)
  const viewMode = forceViewMode || detectedViewMode

  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      {viewMode === 'desktop' ? (
        <DesktopStrategyAnalyticsContainer
          property={property}
          onBack={onBack}
          initialStrategy={initialStrategy}
        />
      ) : (
        <StrategyAnalyticsContainer
          property={property}
          onBack={onBack}
          initialStrategy={initialStrategy}
        />
      )}
    </Suspense>
  )
}

/**
 * Hook to get the current view mode for conditional rendering
 * outside of the container
 */
export function useAnalyticsViewMode() {
  return useViewMode(1024)
}

export default ResponsiveAnalyticsContainer
