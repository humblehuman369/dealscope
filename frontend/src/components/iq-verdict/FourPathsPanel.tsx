'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { trackEvent, trackActivation } from '@/lib/eventTracking'
import {
  dismissFamily,
  dismissedCount,
  getDismissedFamilies,
  resetDismissedFamilies,
} from '@/lib/dealStructures/userPreferences'
import {
  PathOptionCard,
  type DealStructure,
  type DealStructuresPayload,
  type StructureFamily,
} from '@/components/iq-verdict/PathOptionCard'

export type { DealStructure, DealStructureLever, DealStructuresPayload, StructureFamily } from '@/components/iq-verdict/PathOptionCard'

interface FourPathsPanelProps {
  payload: DealStructuresPayload
  /** Two-letter state for analytics context (T14). */
  propertyState?: string | null
  onOpenInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
  /** T17 — fired when a card is dismissed (after localStorage write).
   *  Use to refetch / re-render so the next verdict has the lower ranking applied. */
  onDismissFamily?: (family: StructureFamily) => void
}

function pathCountWords(): { lead: string; tail: string } {
  return { lead: 'Ways', tail: 'to Make This Work' }
}

export function FourPathsPanel({
  payload,
  propertyState,
  onOpenInStrategy,
  onShowPitch,
  onDismissFamily,
}: FourPathsPanelProps): ReactNode {
  const lastAssumableSigRef = useRef('')
  const lastMorbySigRef = useRef('')

  const [sessionDismissed, setSessionDismissed] = useState<string[]>([])
  useEffect(() => {
    setSessionDismissed(getDismissedFamilies())
  }, [])

  const visiblePaths = useMemo(
    () => payload.paths.filter((p) => !sessionDismissed.includes(p.family)),
    [payload.paths, sessionDismissed],
  )

  const handleDismiss = (s: DealStructure) => {
    dismissFamily(s.family)
    const next = getDismissedFamilies()
    setSessionDismissed(next)
    trackEvent('path_family_dismissed', {
      family: s.family,
      structure_id: s.id,
      dismissed_count: dismissedCount(s.family),
      state: propertyState ?? undefined,
    })
    onDismissFamily?.(s.family)
  }

  const handleReset = () => {
    resetDismissedFamilies()
    setSessionDismissed([])
  }

  const pathsSig = visiblePaths.map((p) => p.id).join('|')

  // North-star activation: first time a user actually sees the Four Paths
  // structures — the creative-finance "aha" available on the free tier.
  useEffect(() => {
    if (visiblePaths.length > 0) trackActivation('four_paths')
  }, [visiblePaths.length])

  useEffect(() => {
    if (visiblePaths.length === 0) return
    const hasAssumable = visiblePaths.some((p) => p.id === 'assumable')
    if (!hasAssumable) return
    const dedupe = `${pathsSig}|${propertyState ?? ''}`
    if (lastAssumableSigRef.current === dedupe) return
    lastAssumableSigRef.current = dedupe
    trackEvent('assumable_pv_displayed', {
      path_count: visiblePaths.length,
      state: propertyState ?? undefined,
    })
  }, [visiblePaths, pathsSig, propertyState])

  useEffect(() => {
    if (visiblePaths.length === 0) return
    const hasMorby = visiblePaths.some((p) => p.id === 'morby-method')
    if (!hasMorby) return
    const dedupe = `${pathsSig}|${propertyState ?? ''}`
    if (lastMorbySigRef.current === dedupe) return
    lastMorbySigRef.current = dedupe
    trackEvent('morby_method_substituted', {
      path_count: visiblePaths.length,
      state: propertyState ?? undefined,
    })
  }, [visiblePaths, pathsSig, propertyState])

  if (!payload.hasPaths || visiblePaths.length === 0) {
    return null
  }

  return (
    <div
      className="w-full min-w-0"
      style={{
        marginTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        {(() => {
          const { lead, tail } = pathCountWords()
          return (
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
                color: 'var(--text-heading)',
              }}
            >
              <span style={{ color: 'var(--text-heading)' }}>{lead}</span> {tail}
            </p>
          )
        })()}
        {sessionDismissed.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
            style={{
              color: 'var(--accent-sky)',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
          >
            Reset preferences ({sessionDismissed.length})
          </button>
        )}
      </div>
      <div
        className="w-full min-w-0"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 10,
          alignItems: 'stretch',
        }}
      >
        {visiblePaths.map((path, idx) => (
          <PathOptionCard
            key={path.id}
            structure={path}
            index={idx}
            propertyState={propertyState}
            onOpenInStrategy={onOpenInStrategy}
            onShowPitch={onShowPitch}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  )
}
