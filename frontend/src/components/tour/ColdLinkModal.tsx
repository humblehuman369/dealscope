'use client'

import { useRouter } from 'next/navigation'
import { Camera, MapPin, Search } from 'lucide-react'
import { TourModal } from './TourModal'
import { trackEvent } from '@/lib/eventTracking'

interface ColdLinkModalProps {
  open: boolean
  onClose: () => void
  onStartTour: () => void
}

export function ColdLinkModal({ open, onClose, onStartTour }: ColdLinkModalProps) {
  const router = useRouter()

  const nav = (path: string, event: string) => {
    trackEvent(event)
    onClose()
    router.push(path)
  }

  return (
    <TourModal
      open={open}
      title="First time here?"
      onSkip={onClose}
      skipLabel="Dismiss"
    >
      <p className="mb-4">DealGapIQ analyzes any property in 15 seconds.</p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => nav('/', 'coldlink-scan')}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold text-left"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-heading)',
          }}
        >
          <Camera size={16} /> Scan a Property
        </button>
        <button
          type="button"
          onClick={() => nav('/search', 'coldlink-address')}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold text-left"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-heading)',
          }}
        >
          <Search size={16} /> Search by Address
        </button>
        <button
          type="button"
          onClick={() => nav('/map-search', 'coldlink-map')}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold text-left"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-heading)',
          }}
        >
          <MapPin size={16} /> Browse the Map
        </button>
      </div>
      <p className="mt-4 text-xs">
        Want a quick walkthrough first?{' '}
        <button
          type="button"
          onClick={() => {
            trackEvent('coldlink-tour-start')
            onClose()
            onStartTour()
          }}
          className="font-semibold hover:underline"
          style={{ color: 'var(--accent-sky)' }}
        >
          Take the 60-sec tour →
        </button>
      </p>
    </TourModal>
  )
}
