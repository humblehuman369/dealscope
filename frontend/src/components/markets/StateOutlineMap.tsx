import Link from 'next/link'
import type { UsState } from '@/lib/us-states'
import { getStateOutline } from '@/lib/geo/state-outlines'

/**
 * Server-rendered state silhouette that acts as the map CTA on a
 * /markets/[state] page. Inline SVG: no client JS, no map-tile billing when
 * crawlers load the page, and no layout shift.
 */
export function StateOutlineMap({ state, href }: { state: UsState; href: string }) {
  const outline = getStateOutline(state.code)
  const titleId = `state-map-title-${state.code.toLowerCase()}`
  const label = `Search ${state.name} investment properties on the map`

  return (
    <Link
      href={href}
      aria-label={label}
      className="group block rounded-2xl border p-4 transition-colors sm:p-6"
      style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}
    >
      <svg
        viewBox={outline.viewBox}
        role="img"
        aria-labelledby={titleId}
        className="mx-auto h-auto w-full max-h-72"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={titleId}>{label}</title>
        <path
          d={outline.path}
          fill="var(--accent-sky)"
          fillOpacity={0.85}
          stroke="var(--accent-sky)"
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="transition-opacity group-hover:opacity-100"
        />
      </svg>
      <p className="mt-3 text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Tap the map to open live {state.name} listings
      </p>
    </Link>
  )
}
