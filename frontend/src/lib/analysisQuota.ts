import { ApiError } from '@/lib/api-client'
import type { UserResponse } from '@/lib/api-client'

export const BILLING_USAGE_QUERY_KEY = ['billing', 'usage'] as const

export interface BillingUsage {
  tier: string
  searches_used: number
  searches_limit: number
  searches_remaining: number
  properties_saved?: number
  properties_limit?: number
  properties_remaining?: number
  usage_reset_date?: string | null
  days_until_reset?: number | null
}

export interface QuotaExceededDetail {
  plan: string
  used: number
  limit: number
  resetsAt: string
}

export function isProUser(user: UserResponse | null | undefined): boolean {
  return user?.subscription_tier === 'pro'
}

/**
 * Single quota-exceeded rule. Callers pass the already-resolved plan / used /
 * limit primitives — do not re-implement `used >= limit` elsewhere.
 * Missing used/limit is unknown, not "under the cap".
 */
export function deriveQuotaExceeded(input: {
  plan: string | undefined
  used: number | undefined
  limit: number | undefined
}): boolean {
  const { plan, used, limit } = input
  if (plan !== 'starter') return false
  if (typeof used !== 'number' || typeof limit !== 'number') return false
  if (limit <= 0) return false
  return used >= limit
}

export function planFromUsage(
  usage: BillingUsage | null | undefined,
  user?: UserResponse | null,
): 'starter' | 'pro' {
  if (isProUser(user) || usage?.tier === 'pro') return 'pro'
  return 'starter'
}

/** True when a signed-in Starter account has no analyses left this month. */
export function isStarterQuotaExhausted(
  usage: BillingUsage | null | undefined,
  user?: UserResponse | null,
): boolean {
  return deriveQuotaExceeded({
    plan: planFromUsage(usage, user),
    used: usage?.searches_used,
    limit: usage?.searches_limit,
  })
}

export function nextResetIso(usage: BillingUsage | null | undefined): string {
  if (usage?.usage_reset_date) {
    const last = new Date(usage.usage_reset_date)
    if (!Number.isNaN(last.getTime())) {
      last.setUTCDate(last.getUTCDate() + 30)
      return last.toISOString()
    }
  }
  if (usage?.days_until_reset != null && Number.isFinite(usage.days_until_reset)) {
    const next = new Date()
    next.setUTCDate(next.getUTCDate() + Math.max(0, usage.days_until_reset))
    return next.toISOString()
  }
  const fallback = new Date()
  fallback.setUTCDate(fallback.getUTCDate() + 30)
  return fallback.toISOString()
}

/** Month name + day, e.g. `October 1`. UTC so an ISO date does not shift a day. */
export function formatResetDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export function isQuotaExceededError(err: unknown): err is ApiError {
  if (!(err instanceof ApiError)) return false
  const code = err.code ?? (typeof err.detail?.code === 'string' ? err.detail.code : undefined)
  if (err.status === 402 && code === 'QUOTA_EXCEEDED') return true
  if (err.status === 403 && err.detail?.limit_type === 'analyses') return true
  return false
}

export function quotaDetailFromError(
  err: ApiError,
  usage?: BillingUsage | null,
): QuotaExceededDetail {
  const detail = err.detail ?? {}
  const limit = numOr(detail.limit, usage?.searches_limit, 0)
  const used = numOr(detail.used, detail.current, usage?.searches_used, limit)
  const resetsAt =
    typeof detail.resets_at === 'string' && detail.resets_at
      ? detail.resets_at
      : nextResetIso(usage)
  const plan = typeof detail.plan === 'string' && detail.plan ? detail.plan : 'starter'
  return { plan, used, limit, resetsAt }
}

export function quotaExceededApiError(usage: BillingUsage): ApiError {
  const detail = {
    code: 'QUOTA_EXCEEDED',
    plan: 'starter',
    limit: usage.searches_limit,
    used: usage.searches_used,
    resets_at: nextResetIso(usage),
  }
  return new ApiError(
    `You've used all ${usage.searches_limit} free analyses this month. Upgrade to Pro for unlimited.`,
    402,
    'QUOTA_EXCEEDED',
    detail,
  )
}

function numOr(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}
