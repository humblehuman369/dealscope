'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { apiRequest } from '@/lib/api-client'

/**
 * usePersona — read-only view of the onboarding/investor-profile answers
 * that let screens adapt to who the user is.
 *
 * Sources `/api/v1/users/me/profile` (the same record edited at
 * /profile?tab=investor and seeded by onboarding). Anonymous users get an
 * empty persona; screens must render identically to today when
 * `hasPersona` is false.
 */

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

interface InvestorProfilePayload {
  investment_experience?: string | null
  preferred_strategies?: string[] | null
}

/** Onboarding strategy ids → strategy-engine ids used by Discovery/Strategy. */
const STRATEGY_ID_MAP: Record<string, string> = {
  ltr: 'long-term-rental',
  str: 'short-term-rental',
  brrrr: 'brrrr',
  flip: 'fix-and-flip',
  house_hack: 'house-hack',
  wholesale: 'wholesale',
}

const EXPERIENCE_VALUES: ReadonlySet<string> = new Set([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
])

export interface Persona {
  /** Normalized experience level; null when unset or anonymous. */
  experience: ExperienceLevel | null
  /** True for 'beginner' — screens may add explanatory affordances. */
  isNovice: boolean
  /** Preferred strategies mapped to strategy-engine ids (e.g. 'fix-and-flip'). */
  preferredStrategyIds: string[]
  /** True once the profile loaded and contains at least one persona signal. */
  hasPersona: boolean
  isLoading: boolean
}

export function usePersona(): Persona {
  const { isAuthenticated } = useSession()

  const query = useQuery({
    queryKey: ['persona', 'investor-profile'],
    queryFn: () => apiRequest<InvestorProfilePayload>('/api/v1/users/me/profile'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const raw = query.data
  const experience =
    raw?.investment_experience && EXPERIENCE_VALUES.has(raw.investment_experience)
      ? (raw.investment_experience as ExperienceLevel)
      : null

  const preferredStrategyIds = (raw?.preferred_strategies ?? [])
    .map((id) => STRATEGY_ID_MAP[id])
    .filter((id): id is string => Boolean(id))

  return {
    experience,
    isNovice: experience === 'beginner',
    preferredStrategyIds,
    hasPersona: experience !== null || preferredStrategyIds.length > 0,
    isLoading: isAuthenticated && query.isLoading,
  }
}
