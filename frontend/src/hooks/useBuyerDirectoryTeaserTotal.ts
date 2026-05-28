'use client'

import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api-client'
import { BUYER_DIRECTORY_TOTAL_FALLBACK, formatBuyerDirectoryLabel } from '@/lib/directory-promo'
import type { BuyerStatsResponse } from '@/lib/buyers-api'
import { useSession } from '@/hooks/useSession'

/**
 * Live cash buyer count for marketing (homepage). Non–paid-Pro users receive
 * 401 PRO_REQUIRED with { total } — same as BuyerDirectory preview.
 */
export function useBuyerDirectoryTeaserTotal() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession()

  const query = useQuery({
    queryKey: ['buyer-directory-teaser-total'],
    queryFn: async (): Promise<number | null> => {
      try {
        const data = await api.get<BuyerStatsResponse>('/api/buyers/stats')
        return typeof data.total === 'number' ? data.total : null
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === 'PRO_REQUIRED' &&
          typeof error.detail?.total === 'number'
        ) {
          return error.detail.total
        }
        return null
      }
    },
    enabled: isAuthenticated && !sessionLoading,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const label = formatBuyerDirectoryLabel(query.data ?? null)

  return {
    buyerTotalLabel: query.isLoading && isAuthenticated ? BUYER_DIRECTORY_TOTAL_FALLBACK : label,
    buyerTotal: query.data,
    isLoading: query.isLoading && isAuthenticated,
  }
}
