'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { trackActivation, trackEvent } from '@/lib/eventTracking'
import {
  FourPathsPanel,
  type DealStructure,
  type DealStructuresPayload,
} from '@/components/iq-verdict/FourPathsPanel'
import { DealStructuresNarrative } from '@/components/iq-verdict/DealStructuresNarrative'
import { BreakevenAnalysis } from '@/components/iq-verdict/make-it-work/BreakevenAnalysis'
import type { FourWayFamily } from '@/components/iq-verdict/make-it-work/fourWays'

export interface FourWaysSectionProps {
  payload: DealStructuresPayload
  /** Full property address — keys the cached AI recommendation. */
  address: string
  propertyState?: string | null
  onMakeItWork: (family?: FourWayFamily) => void
  onOpenInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
}

/**
 * Breakeven Analysis first; the original four cards and the plain-English
 * narrative stay available behind a single expander for users who want the
 * full math.
 */
export function FourWaysSection({
  payload,
  address,
  propertyState,
  onMakeItWork,
  onOpenInStrategy,
  onShowPitch,
}: FourWaysSectionProps): ReactNode {
  const [detailOpen, setDetailOpen] = useState(false)
  const pathCount = payload.hasPaths ? payload.paths.length : 0

  // North-star activation: the section is the first place a user sees the
  // four ways, so it carries the milestone the collapsed FourPathsPanel used to.
  useEffect(() => {
    if (pathCount > 0) trackActivation('four_ways')
  }, [pathCount])

  if (pathCount === 0) return null

  const toggleDetail = () => {
    setDetailOpen((prev) => {
      const next = !prev
      if (next) {
        trackEvent('four_paths_detail_expanded', {
          path_count: payload.paths.length,
          state: propertyState ?? undefined,
        })
      }
      return next
    })
  }

  return (
    <div className="w-full min-w-0">
      <BreakevenAnalysis
        payload={payload}
        address={address}
        onMakeItWork={onMakeItWork}
        detailOpen={detailOpen}
        onToggleDetail={toggleDetail}
      />
      {detailOpen && (
        <div className="w-full min-w-0">
          <FourPathsPanel
            payload={payload}
            propertyState={propertyState}
            onOpenInStrategy={onOpenInStrategy}
            onShowPitch={onShowPitch}
          />
          <DealStructuresNarrative paragraphs={payload.narrativeParagraphs} />
        </div>
      )}
    </div>
  )
}
