import type { DataSourceId, IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'
import { ALL_SOURCE_IDS } from '@/utils/propertySourceMapper'

/** Labels as the Math tab's IQEstimateSelector renders them. */
const SOURCE_LABELS: Record<DataSourceId, string> = {
  iq: 'IQ Estimate',
  zillow: 'Zillow',
  rentcast: 'RentCast',
  redfin: 'Redfin',
  realtor: 'Realtor.com',
  my_value: 'My Value',
  my_rent: 'My Rent',
}

export interface SourceStatusSummary {
  answered: number
  total: number
  missingLabels: string[]
}

/** A source answered when value or rent is present — same rule as Discovery's Math count. */
export function sourceAnswered(sources: IQEstimateSources, id: DataSourceId): boolean {
  return sources.value[id] != null || sources.rent[id] != null
}

/**
 * Roster is the five sources this property's Math tab lists (IQ + providers).
 * Count is how many of those returned a value.
 */
export function summarizeSourceStatus(sources: IQEstimateSources): SourceStatusSummary {
  const missingLabels = ALL_SOURCE_IDS.filter((id) => !sourceAnswered(sources, id)).map(
    (id) => SOURCE_LABELS[id],
  )
  return {
    answered: ALL_SOURCE_IDS.length - missingLabels.length,
    total: ALL_SOURCE_IDS.length,
    missingLabels,
  }
}

export function formatSourceStatusLine(summary: SourceStatusSummary): string {
  const base = `Based on ${summary.answered} of ${summary.total} sources.`
  if (summary.missingLabels.length === 0) return base
  return `${base} ${summary.missingLabels.join(', ')} unavailable.`
}
