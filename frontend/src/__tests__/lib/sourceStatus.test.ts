import { describe, expect, it } from 'vitest'

import type { IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'
import { formatSourceStatusLine, summarizeSourceStatus } from '@/lib/sourceStatus'

const full: IQEstimateSources = {
  value: { iq: 1, zillow: 2, rentcast: 3, redfin: 4, realtor: 5 },
  rent: { iq: 1, zillow: 2, rentcast: 3, redfin: 4 },
}

describe('summarizeSourceStatus', () => {
  it('counts the Math-tab roster of 5 and what answered', () => {
    expect(summarizeSourceStatus(full)).toEqual({
      answered: 5,
      total: 5,
      missingLabels: [],
    })
    expect(formatSourceStatusLine(summarizeSourceStatus(full))).toBe('Based on 5 of 5 sources.')
  })

  it('names a missing provider the way the Math tab labels it', () => {
    const missingZillow: IQEstimateSources = {
      value: { iq: 1, zillow: null, rentcast: 3, redfin: 4, realtor: 5 },
      rent: { iq: 1, zillow: null, rentcast: 3, redfin: 4 },
    }
    const summary = summarizeSourceStatus(missingZillow)
    expect(summary).toEqual({
      answered: 4,
      total: 5,
      missingLabels: ['Zillow'],
    })
    expect(formatSourceStatusLine(summary)).toBe('Based on 4 of 5 sources. Zillow unavailable.')
  })

  it('names Redfin and Realtor.com when those two providers are null', () => {
    const missingProviders: IQEstimateSources = {
      value: { iq: 1, zillow: 2, rentcast: 3, redfin: null, realtor: null },
      rent: { iq: 1, zillow: 2, rentcast: 3, redfin: null },
    }
    const summary = summarizeSourceStatus(missingProviders)
    expect(summary).toEqual({
      answered: 3,
      total: 5,
      missingLabels: ['Redfin', 'Realtor.com'],
    })
    expect(formatSourceStatusLine(summary)).toBe(
      'Based on 3 of 5 sources. Redfin, Realtor.com unavailable.',
    )
  })
})
