'use client'

/**
 * useDirectoryList — the paged-fetch + access-gate block shared by the lender
 * and cash buyer directories.
 *
 * Both directories are paid-only and the server enforces it; the flags returned
 * here only decide what the client bothers to request and what it blurs.
 */

import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api-client'
import { useSubscription } from './useSubscription'

/**
 * The pagination envelope every directory list response carries — the frontend
 * mirror of `DirectoryListResponse` in backend/app/schemas/directory.py. The
 * records themselves live under a per-directory key (`lenders` / `buyers`),
 * which is why `selectRecords` is a caller-supplied accessor.
 */
export interface DirectoryPageEnvelope {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UseDirectoryListOptions<TPage extends DirectoryPageEnvelope, TRecord> {
  queryKey: readonly unknown[]
  buildPath: (page: number) => string
  /** Declare at module scope: an inline arrow re-flattens every render. */
  selectRecords: (page: TPage) => TRecord[]
}

export function useDirectoryList<TPage extends DirectoryPageEnvelope, TRecord>({
  queryKey,
  buildPath,
  selectRecords,
}: UseDirectoryListOptions<TPage, TRecord>) {
  const { isPaidPro, isTrialing, isAuthenticated, isLoading: subscriptionLoading } =
    useSubscription()

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<TPage>(buildPath(pageParam)),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: isAuthenticated && !subscriptionLoading && isPaidPro,
    retry: false,
  })

  const records = useMemo(
    () => query.data?.pages.flatMap(selectRecords) ?? [],
    [query.data, selectRecords],
  )

  const viewForbidden =
    query.error instanceof ApiError &&
    (query.error.code === 'PRO_REQUIRED' ||
      query.error.code === 'DIRECTORY_PAID_ONLY' ||
      query.error.status === 401 ||
      query.error.status === 403)

  return {
    records,
    /** Server-reported match count for the current filters. */
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    viewForbidden,
    /** Viewing and exporting share one gate: paid Pro, not refused by the API. */
    hasAccess: isPaidPro && !viewForbidden,
    isPaidPro,
    isTrialing,
    isAuthenticated,
    subscriptionLoading,
  }
}
