'use client'

import { useRouter } from 'next/navigation'
import { Camera, MapPin, Search, Compass } from 'lucide-react'
import { trackEvent } from '@/lib/eventTracking'
import { replayWorkbenchTour } from '@/components/tour'

interface DiscoveryColdLandingProps {
  /** When true, show the workbench tour replay link (returning users). */
  showTourReplay?: boolean
}

export function DiscoveryColdLanding({ showTourReplay = false }: DiscoveryColdLandingProps) {
  const router = useRouter()

  const nav = (path: string, event: string) => {
    trackEvent(event)
    router.push(path)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--surface-base)' }}
    >
      <div className="w-full max-w-md text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Compass size={28} style={{ color: 'var(--accent-sky)' }} />
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold mb-3"
          style={{ color: 'var(--text-heading)' }}
        >
          First time here?
        </h1>
        <p className="text-sm sm:text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
          DealGapIQ analyzes any property in 15 seconds — then shows Target Buy, six strategies,
          comps, and more.
        </p>

        <div className="flex flex-col gap-3 text-left">
          <button
            type="button"
            onClick={() => nav('/', 'coldlink-scan')}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-heading)',
            }}
          >
            <Camera size={18} style={{ color: 'var(--accent-sky)' }} />
            Scan a Property
          </button>
          <button
            type="button"
            onClick={() => nav('/search', 'coldlink-address')}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-heading)',
            }}
          >
            <Search size={18} style={{ color: 'var(--accent-sky)' }} />
            Search by Address
          </button>
          <button
            type="button"
            onClick={() => nav('/map-search', 'coldlink-map')}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-heading)',
            }}
          >
            <MapPin size={18} style={{ color: 'var(--accent-sky)' }} />
            Browse the Map
          </button>
        </div>

        <p className="mt-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {showTourReplay ? (
            <>
              Want a refresher?{' '}
              <button
                type="button"
                onClick={() => {
                  trackEvent('tour-replay-requested', { source: 'discovery-cold-landing' })
                  replayWorkbenchTour()
                }}
                className="font-semibold hover:underline"
                style={{ color: 'var(--accent-sky)' }}
              >
                Replay the 60-sec workbench tour →
              </button>
            </>
          ) : (
            <>
              Want a quick walkthrough first?{' '}
              <button
                type="button"
                onClick={() => {
                  trackEvent('coldlink-tour-start')
                  replayWorkbenchTour()
                }}
                className="font-semibold hover:underline"
                style={{ color: 'var(--accent-sky)' }}
              >
                Take the 60-sec tour →
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
