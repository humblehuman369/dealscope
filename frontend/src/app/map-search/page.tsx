'use client'

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MapSearchView } from '@/components/map-search/MapSearchView'

// SSR-safe layout effect — falls back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Map search page.
 *
 * The map needs to fill the viewport exactly so the bottom-edge controls
 * (Marker Color legend, Map/Satellite toggle, hint chips) stay visible.
 * A static `calc(100vh - 64px)` only accounts for the AppHeader and clips
 * below the fold whenever LayoutWrapper renders extra chrome above the
 * page (e.g. the Starter UsageBar). We measure the container's actual
 * top offset and subtract it from the viewport height every time the
 * surrounding layout reflows.
 */
export default function MapSearchPage() {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<string>('calc(100dvh - 64px)')

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const compute = () => {
      const top = el.getBoundingClientRect().top
      const viewport = window.visualViewport?.height ?? window.innerHeight
      const available = Math.max(0, viewport - top)
      setHeight(`${available}px`)
    }

    compute()
    window.addEventListener('resize', compute)
    window.visualViewport?.addEventListener('resize', compute)

    // Track layout shifts above the page (e.g. UsageBar mounting after auth).
    const ro = new ResizeObserver(compute)
    ro.observe(document.body)

    return () => {
      window.removeEventListener('resize', compute)
      window.visualViewport?.removeEventListener('resize', compute)
      ro.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden"
      style={{ height, backgroundColor: 'var(--surface-base)' }}
    >
      {/*
        MapSearchView calls useSearchParams() — wrap in Suspense per Next 16+
        requirements so static rendering / partial prerendering doesn't bail.
      */}
      <Suspense
        fallback={
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-base)' }}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--accent-sky)' }}
            />
          </div>
        }
      >
        <MapSearchView />
      </Suspense>
    </div>
  )
}
