'use client'

import { useEffect, useState } from 'react'
import { Compass } from 'lucide-react'
import { hasSeenWorkbenchTour } from '@/lib/tourPreferences'
import { replayWorkbenchTour } from '@/components/tour'
import { trackEvent } from '@/lib/eventTracking'

export function DiscoveryTourReplayBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(hasSeenWorkbenchTour())
  }, [])

  if (!visible) return null

  return (
    <div className="mx-0 sm:mx-5 mt-4 px-3 sm:px-0">
      <button
        type="button"
        onClick={() => {
          trackEvent('tour-replay-requested', { source: 'discovery-banner' })
          replayWorkbenchTour()
        }}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
        }}
      >
        <Compass size={14} style={{ color: 'var(--accent-sky)' }} />
        Replay the 60-sec workbench tour
      </button>
    </div>
  )
}
