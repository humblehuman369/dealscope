'use client'

import React, { useEffect, useRef, useState } from 'react'
import { WifiOff, CheckCircle } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

/**
 * OfflineBanner — Top banner shown when the browser loses connectivity.
 *
 * Auto-dismisses with a brief "Back Online" confirmation.
 * Mount once in the root layout.
 * Matches mobile/components/OfflineBanner.tsx behavior.
 */
export function OfflineBanner() {
  const { isConnected, isChecking } = useNetworkStatus()
  const [bannerState, setBannerState] = useState<'hidden' | 'offline' | 'reconnected'>('hidden')
  const wasOfflineRef = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOffline = !isChecking && !isConnected

  useEffect(() => {
    if (isChecking) return

    if (isOffline) {
      wasOfflineRef.current = true
      setBannerState('offline')
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false
      setBannerState('reconnected')

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => {
        setBannerState('hidden')
      }, 2500)
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isOffline, isChecking])

  if (bannerState === 'hidden') return null

  const isReconnected = bannerState === 'reconnected'

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium shadow-lg transition-colors duration-300 ${
        isReconnected ? 'bg-emerald-600' : 'bg-red-700'
      }`}
      role="alert"
      aria-live="assertive"
    >
      {isReconnected ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
      <span>{isReconnected ? 'Back Online' : 'No Internet Connection'}</span>
      {!isReconnected && (
        <span className="text-xs text-white/75 ml-1">— Showing cached data where available</span>
      )}
    </div>
  )
}

export default OfflineBanner
