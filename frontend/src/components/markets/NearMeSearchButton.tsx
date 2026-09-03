'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { nearMeMapSearchHref } from '@/lib/geo/map-search-links'

type Status = 'idle' | 'locating' | 'denied'

/**
 * Client island for /markets/near-me. Location is requested only on click and
 * only in the browser, so the server-rendered page is identical for every
 * visitor and crawler. On failure the surrounding page's state list is the
 * fallback, so this component never needs to render one itself.
 */
export function NearMeSearchButton() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('denied')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => router.push(nearMeMapSearchHref(pos.coords.latitude, pos.coords.longitude)),
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    )
  }, [router])

  return (
    <div>
      <button
        type="button"
        onClick={locate}
        disabled={status === 'locating'}
        className="inline-flex rounded-full px-6 py-3 font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--accent-sky)', color: 'var(--surface-base)' }}
      >
        {status === 'locating' ? 'Finding your location…' : 'Use my location →'}
      </button>
      {status === 'denied' && (
        <p role="status" className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          We could not read your location. Pick your state below to open the map there instead.
        </p>
      )}
    </div>
  )
}
