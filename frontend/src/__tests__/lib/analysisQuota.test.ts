import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api-client'
import {
  deriveQuotaExceeded,
  formatResetDate,
  isQuotaExceededError,
  isStarterQuotaExhausted,
  nextResetIso,
  quotaDetailFromError,
} from '@/lib/analysisQuota'

describe('deriveQuotaExceeded', () => {
  it('is the single used >= limit rule for starter', () => {
    expect(deriveQuotaExceeded({ plan: 'starter', used: 3, limit: 3 })).toBe(true)
    expect(deriveQuotaExceeded({ plan: 'starter', used: 2, limit: 3 })).toBe(false)
    expect(deriveQuotaExceeded({ plan: 'pro', used: 3, limit: 3 })).toBe(false)
    expect(deriveQuotaExceeded({ plan: 'starter', used: undefined, limit: 3 })).toBe(false)
    expect(deriveQuotaExceeded({ plan: 'starter', used: 3, limit: undefined })).toBe(false)
  })
})

describe('isStarterQuotaExhausted', () => {
  it('is true at the Starter cap', () => {
    expect(
      isStarterQuotaExhausted({
        tier: 'free',
        searches_used: 3,
        searches_limit: 3,
        searches_remaining: 0,
      }),
    ).toBe(true)
  })

  it('is false for Pro, remaining quota, or missing usage', () => {
    expect(isStarterQuotaExhausted(undefined)).toBe(false)
    expect(
      isStarterQuotaExhausted({
        tier: 'free',
        searches_used: 2,
        searches_limit: 3,
        searches_remaining: 1,
      }),
    ).toBe(false)
    expect(
      isStarterQuotaExhausted(
        {
          tier: 'free',
          searches_used: 3,
          searches_limit: 3,
          searches_remaining: 0,
        },
        { subscription_tier: 'pro' } as never,
      ),
    ).toBe(false)
    expect(
      isStarterQuotaExhausted({
        tier: 'pro',
        searches_used: 40,
        searches_limit: -1,
        searches_remaining: -1,
      }),
    ).toBe(false)
  })
})

describe('quota error helpers', () => {
  it('formats the reset as Month D in UTC', () => {
    expect(formatResetDate('2026-10-01T00:00:00.000Z')).toBe('October 1')
  })

  it('derives next reset from the last usage_reset_date', () => {
    expect(nextResetIso({ usage_reset_date: '2026-09-01T00:00:00.000Z' } as never)).toBe(
      '2026-10-01T00:00:00.000Z',
    )
  })

  it('reads 402 QUOTA_EXCEEDED and leftover 403 analyses as quota', () => {
    const quota = new ApiError('quota', 402, 'QUOTA_EXCEEDED', {
      code: 'QUOTA_EXCEEDED',
      plan: 'starter',
      limit: 3,
      used: 3,
      resets_at: '2026-10-01T00:00:00.000Z',
    })
    expect(isQuotaExceededError(quota)).toBe(true)
    expect(quotaDetailFromError(quota)).toEqual({
      plan: 'starter',
      used: 3,
      limit: 3,
      resetsAt: '2026-10-01T00:00:00.000Z',
    })

    const legacy = new ApiError('legacy', 403, 'SUBSCRIPTION_ERROR', { limit_type: 'analyses' })
    expect(isQuotaExceededError(legacy)).toBe(true)

    const rateLimit = new ApiError('Too many requests.', 429, 'RATE_LIMIT_EXCEEDED')
    expect(isQuotaExceededError(rateLimit)).toBe(false)
  })
})
