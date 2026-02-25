/**
 * useNetworkStatus — Browser network connectivity hook.
 *
 * Uses navigator.onLine + online/offline events.
 * Matches mobile/hooks/useNetworkStatus.ts API shape.
 */

import { useState, useEffect } from 'react'

export interface NetworkStatus {
  isConnected: boolean
  isChecking: boolean
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isChecking: true,
  })

  useEffect(() => {
    setStatus({ isConnected: navigator.onLine, isChecking: false })

    const goOnline = () => setStatus({ isConnected: true, isChecking: false })
    const goOffline = () => setStatus({ isConnected: false, isChecking: false })

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return status
}

export function useIsOnline(): boolean {
  const { isConnected, isChecking } = useNetworkStatus()
  if (isChecking) return true
  return isConnected
}

export default useNetworkStatus
