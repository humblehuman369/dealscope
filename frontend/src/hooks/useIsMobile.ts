'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to detect if the user is on a mobile device based on viewport width.
 * Default breakpoint is 1024px (standard tablet/desktop boundary).
 * 
 * @param breakpoint - The width threshold below which is considered mobile
 * @returns boolean indicating if viewport is below breakpoint
 */
export function useIsMobile(breakpoint: number = 1024): boolean {
  // Initialize with undefined to detect SSR
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [isClient, setIsClient] = useState<boolean>(false)

  const checkDevice = useCallback(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < breakpoint)
    }
  }, [breakpoint])

  useEffect(() => {
    // Mark that we're on the client
    setIsClient(true)
    
    // Initial check
    checkDevice()

    // Listen for resize events
    window.addEventListener('resize', checkDevice)
    
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [checkDevice])

  // During SSR or before hydration, assume desktop (false)
  // This prevents layout shift on most users (desktop majority)
  return isClient ? isMobile : false
}

/**
 * Hook to detect if the user is on a desktop device.
 * Inverse of useIsMobile.
 */
export function useIsDesktop(breakpoint: number = 1024): boolean {
  return !useIsMobile(breakpoint)
}

export default useIsMobile
