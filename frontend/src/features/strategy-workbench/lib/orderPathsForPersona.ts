import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'
import type { ExperienceLevel } from '@/hooks/usePersona'

/**
 * R7 (persona-adaptive density): experienced investors see creative deal
 * structures (seller carry, subject-to, strategy switches…) before the
 * conventional price-reduction path; the backend's ranking order is kept
 * within each group. Everyone else keeps the backend order untouched.
 */
export function orderPathsForPersona(
  paths: DealStructure[],
  experience: ExperienceLevel | null,
): DealStructure[] {
  if (experience !== 'advanced' && experience !== 'expert') return paths

  const creative = paths.filter((p) => p.family !== 'price')
  if (creative.length === 0 || creative.length === paths.length) return paths

  return [...creative, ...paths.filter((p) => p.family === 'price')]
}
