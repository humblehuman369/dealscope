import type { UsState } from '@/lib/us-states'
import { getStateOutline, hasStateOutline, US_VIEWBOX } from '@/lib/geo/state-outlines'

export interface UsStatesMapEntry {
  state: UsState
  /** Whether the state page is indexable; drives fill and whether it links. */
  indexable: boolean
}

/**
 * Clickable US map for the /markets hub. Server-rendered inline SVG; each
 * indexable state is an <a> so the map doubles as crawlable internal linking.
 * Non-indexable states stay visible but dimmed and unlinked, matching the
 * sitemap rule.
 */
export function UsStatesMap({ entries }: { entries: UsStatesMapEntry[] }) {
  return (
    <svg
      viewBox={US_VIEWBOX}
      role="img"
      aria-label="Map of the United States. Select a state to see its investment property page."
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {entries.map(({ state, indexable }) => {
        if (!hasStateOutline(state.code)) return null
        const outline = getStateOutline(state.code)
        const path = (
          <path
            d={outline.path}
            fill="var(--accent-sky)"
            stroke="var(--surface-base)"
            strokeWidth={1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={indexable ? 'opacity-80 transition-opacity hover:opacity-100' : 'opacity-20'}
          />
        )
        if (!indexable) {
          return (
            <g key={state.code}>
              <title>{`${state.name} (market profile coming soon)`}</title>
              {path}
            </g>
          )
        }
        return (
          <a key={state.code} href={`/markets/${state.slug}`} aria-label={`${state.name} investment properties`}>
            <title>{`${state.name} investment properties`}</title>
            {path}
          </a>
        )
      })}
    </svg>
  )
}
