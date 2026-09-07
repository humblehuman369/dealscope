'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

// ===========================================
// Traffic board — data layer
// ===========================================
// Mirrors backend/app/schemas/traffic.py. One read, cached server-side for
// five minutes; `refresh` bypasses that cache.
// ===========================================

export type TrafficWindow = 7 | 14 | 28

export interface TrafficOverview {
  visitors: number | null
  views: number | null
  sessions: number | null
  session_duration_s: number | null
  bounce_rate_pct: number | null
}

export interface TrafficSeries {
  name: string
  days: string[]
  data: number[]
  total: number
}

export interface TrafficSource {
  source: string
  medium: string
  campaign: string
  tagged: boolean
  visitors: number | null
  views: number | null
  share_pct: number | null
}

export interface TrafficBoard {
  days: number
  configured: boolean
  cached: boolean
  generated_at: string
  overview: TrafficOverview
  series: TrafficSeries[]
  sources: TrafficSource[]
  error: string | null
}

export const trafficKeys = {
  board: (days: number) => ['admin', 'traffic', days] as const,
}

export function useTrafficBoard(days: TrafficWindow) {
  return useQuery({
    queryKey: trafficKeys.board(days),
    queryFn: () => api.get<TrafficBoard>(`/api/v1/admin/traffic?days=${days}`),
    staleTime: 60_000,
  })
}

export function useRefreshTrafficBoard(days: TrafficWindow) {
  const qc = useQueryClient()
  return async () => {
    const fresh = await api.get<TrafficBoard>(`/api/v1/admin/traffic?days=${days}&refresh=true`)
    qc.setQueryData(trafficKeys.board(days), fresh)
    return fresh
  }
}
