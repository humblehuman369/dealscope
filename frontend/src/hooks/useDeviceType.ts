'use client'

import { useState, useEffect, useMemo } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type ViewMode = 'mobile' | 'desktop'

interface DeviceInfo {
  /** The specific device category */
  deviceType: DeviceType
  /** Simplified view mode for rendering (mobile or desktop) */
  viewMode: ViewMode
  /** Current viewport width */
  width: number
  /** Current viewport height */
  height: number
  /** Whether the device is in portrait orientation */
  isPortrait: boolean
  /** Whether this is a touch-capable device */
  isTouchDevice: boolean
  /** Whether hydration is complete (safe to use values) */
  isHydrated: boolean
}

interface DeviceBreakpoints {
  /** Width below which is considered mobile (default: 768) */
  mobile: number
  /** Width below which is considered tablet (default: 1024) */
  tablet: number
}

const DEFAULT_BREAKPOINTS: DeviceBreakpoints = {
  mobile: 768,
  tablet: 1024,
}

/**
 * Comprehensive device detection hook for responsive rendering.
 * 
 * Features:
 * - SSR-safe with hydration detection
 * - Detects mobile, tablet, and desktop
 * - Provides simplified viewMode for mobile/desktop switching
 * - Detects touch capability
 * - Tracks orientation
 * 
 * @param breakpoints - Custom breakpoint thresholds
 */
export function useDeviceType(
  breakpoints: Partial<DeviceBreakpoints> = {}
): DeviceInfo {
  const bp = { ...DEFAULT_BREAKPOINTS, ...breakpoints }
  
  const [state, setState] = useState<{
    width: number
    height: number
    isHydrated: boolean
  }>({
    width: 1200, // Default to desktop during SSR
    height: 800,
    isHydrated: false,
  })

  useEffect(() => {
    // Update with actual values on mount
    const updateDimensions = () => {
      setState({
        width: window.innerWidth,
        height: window.innerHeight,
        isHydrated: true,
      })
    }

    // Initial update
    updateDimensions()

    // Listen for changes
    window.addEventListener('resize', updateDimensions)
    window.addEventListener('orientationchange', updateDimensions)

    return () => {
      window.removeEventListener('resize', updateDimensions)
      window.removeEventListener('orientationchange', updateDimensions)
    }
  }, [])

  const deviceInfo = useMemo<DeviceInfo>(() => {
    const { width, height, isHydrated } = state

    // Determine device type based on width
    let deviceType: DeviceType
    if (width < bp.mobile) {
      deviceType = 'mobile'
    } else if (width < bp.tablet) {
      deviceType = 'tablet'
    } else {
      deviceType = 'desktop'
    }

    // For view mode, tablets get desktop view (they have enough space)
    // Mobile stays mobile
    const viewMode: ViewMode = width < bp.tablet ? 'mobile' : 'desktop'

    // Check for touch capability
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    return {
      deviceType,
      viewMode,
      width,
      height,
      isPortrait: height > width,
      isTouchDevice,
      isHydrated,
    }
  }, [state, bp.mobile, bp.tablet])

  return deviceInfo
}

/**
 * Simple hook that returns 'mobile' or 'desktop' view mode.
 * Use this when you just need to switch between two layouts.
 */
export function useViewMode(tabletBreakpoint: number = 1024): ViewMode {
  const { viewMode } = useDeviceType({ tablet: tabletBreakpoint })
  return viewMode
}

export default useDeviceType
