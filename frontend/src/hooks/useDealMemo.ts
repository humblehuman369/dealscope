'use client'

/** Hooks for the per-property AI deal memo (generated on demand, persisted). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export interface DealMemo {
  text: string
  source: 'ai' | 'template'
  generated_at: string
}

interface MemoResponse {
  memo: DealMemo | null
}

const MEMO_KEYS = {
  forProperty: (propertyId: string) => ['deal-memo', propertyId] as const,
}

export function useDealMemo(propertyId: string) {
  return useQuery({
    queryKey: MEMO_KEYS.forProperty(propertyId),
    queryFn: () => api.get<MemoResponse>(`/api/v1/properties/saved/${propertyId}/memo`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useGenerateDealMemo(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<MemoResponse>(`/api/v1/properties/saved/${propertyId}/memo`, {}),
    onSuccess: (data) => {
      qc.setQueryData(MEMO_KEYS.forProperty(propertyId), data)
    },
  })
}
