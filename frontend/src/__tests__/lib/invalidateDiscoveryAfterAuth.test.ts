import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import {
  discoveryQueriesNeedAuthRefetch,
  invalidateDiscoveryQueriesAfterAuth,
  propertySearchQueryKey,
  savedCheckQueryKey,
} from '@/lib/invalidateDiscoveryAfterAuth'
import { verdictAnalysisQueryKey } from '@/lib/verdictAnalysisQuery'

const ADDRESS = '7026 NW 21st Ave, Miami, FL 33147'

describe('invalidateDiscoveryQueriesAfterAuth', () => {
  it('drops property, verdict, and saved-check cache so a signed-in refetch is not the 403', () => {
    const queryClient = new QueryClient()
    const propertyKey = propertySearchQueryKey(ADDRESS)
    const verdictKey = verdictAnalysisQueryKey(ADDRESS)
    const savedKey = savedCheckQueryKey(ADDRESS)

    queryClient.setQueryData(propertyKey, { blocked: true })
    queryClient.setQueryData(verdictKey, { blocked: true })
    queryClient.setQueryData(savedKey, { is_saved: false })

    expect(queryClient.getQueryData(propertyKey)).toEqual({ blocked: true })
    expect(discoveryQueriesNeedAuthRefetch(queryClient, ADDRESS, 'anonymous')).toBe(true)
    expect(discoveryQueriesNeedAuthRefetch(queryClient, ADDRESS, 'free')).toBe(false)

    invalidateDiscoveryQueriesAfterAuth(queryClient, ADDRESS)

    expect(queryClient.getQueryData(propertyKey)).toBeUndefined()
    expect(queryClient.getQueryData(verdictKey)).toBeUndefined()
    expect(queryClient.getQueryData(savedKey)).toBeUndefined()
    expect(discoveryQueriesNeedAuthRefetch(queryClient, ADDRESS, null)).toBe(false)
  })

  it('refetches after a cached property-search error without a limitError flag', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let calls = 0
    await queryClient.fetchQuery({
      queryKey: propertySearchQueryKey(ADDRESS),
      queryFn: () => {
        calls += 1
        return Promise.reject(new Error('ANONYMOUS_LIMIT_REACHED'))
      },
    }).catch(() => undefined)

    expect(calls).toBe(1)
    expect(queryClient.getQueryState(propertySearchQueryKey(ADDRESS))?.status).toBe('error')
    expect(discoveryQueriesNeedAuthRefetch(queryClient, ADDRESS, null)).toBe(true)

    invalidateDiscoveryQueriesAfterAuth(queryClient, ADDRESS)

    await queryClient.fetchQuery({
      queryKey: propertySearchQueryKey(ADDRESS),
      queryFn: () => {
        calls += 1
        return Promise.resolve({ ok: true })
      },
    })

    expect(calls).toBe(2)
    expect(queryClient.getQueryData(propertySearchQueryKey(ADDRESS))).toEqual({ ok: true })
  })
})
