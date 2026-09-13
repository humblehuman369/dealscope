import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api-client'

export const TIPS_SEEN_STORAGE_KEY = 'dgiq_tips_seen_v1'

type DashboardLayout = {
  tips_seen_v1?: boolean
  [key: string]: unknown
}

function readLocalSeen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(TIPS_SEEN_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeLocalSeen(): void {
  try {
    window.localStorage.setItem(TIPS_SEEN_STORAGE_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function useDiscoveryTipsSeen(isAuthenticated: boolean): {
  showTips: boolean
  dismissTips: () => void
} {
  const [seen, setSeen] = useState(readLocalSeen)

  useEffect(() => {
    if (seen || !isAuthenticated) return
    let cancelled = false
    void api
      .get<{ dashboard_layout?: DashboardLayout }>('/api/v1/users/me/profile')
      .then((profile) => {
        if (cancelled) return
        if (profile.dashboard_layout?.tips_seen_v1) {
          writeLocalSeen()
          setSeen(true)
        }
      })
      .catch(() => {
        /* localStorage is enough */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, seen])

  const dismissTips = useCallback(() => {
    setSeen(true)
    writeLocalSeen()
    if (!isAuthenticated) return
    void api
      .get<{ dashboard_layout?: DashboardLayout }>('/api/v1/users/me/profile')
      .then((profile) =>
        api.patch('/api/v1/users/me/profile', {
          dashboard_layout: { ...(profile.dashboard_layout ?? {}), tips_seen_v1: true },
        }),
      )
      .catch(() => {
        /* localStorage already wrote */
      })
  }, [isAuthenticated])

  return { showTips: !seen, dismissTips }
}
