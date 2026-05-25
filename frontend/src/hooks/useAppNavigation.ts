'use client'

import { useParams, usePathname, useSearchParams } from 'next/navigation'
import type { ReadonlyURLSearchParams } from 'next/navigation'

const EMPTY_SEARCH_PARAMS = new URLSearchParams() as unknown as ReadonlyURLSearchParams

/** Non-null wrapper — Next.js 16 types allow null during SSR edge cases. */
export function useAppSearchParams(): ReadonlyURLSearchParams {
  return useSearchParams() ?? EMPTY_SEARCH_PARAMS
}

export function useAppParams<
  T extends Record<string, string | string[] | undefined> = Record<string, string>,
>(): T {
  return (useParams() ?? {}) as T
}

export function useAppPathname(): string {
  return usePathname() ?? '/'
}
