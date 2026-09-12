import type { MapSearchRequest } from '@/lib/api'

/**
 * Homepage map presets.
 *
 * A preset is a saved Search & Discover filter, nothing more. Each one maps to
 * the same `MapSearchRequest` fields the full map sends, so marketing can
 * reorder or rename the buttons here without touching the search code.
 *
 * `expensive` mirrors `isExpensiveSearch` in `hooks/useMapSearch.ts`: those
 * modes fan out to per-property provider calls, so the hero never runs them
 * on load or on pan — only when the visitor clicks the count prompt.
 */
export type HeroPresetId =
  | 'all'
  | 'foreclosures'
  | 'distress'
  | 'absentee'
  | 'expired'
  | 'preforeclosure'

export interface HeroPreset {
  id: HeroPresetId
  label: string
  /** Lowercase noun used in "See how many {noun} are in {city}". */
  noun: string
  request: Pick<
    MapSearchRequest,
    | 'listing_type'
    | 'listing_statuses'
    | 'owner_occupancy'
    | 'owner_records_availability'
    | 'owner_tenure_min_years'
  >
  expensive: boolean
}

export const HERO_PRESETS: HeroPreset[] = [
  {
    id: 'all',
    label: 'All deals',
    noun: 'deals',
    request: { listing_type: 'sale' },
    expensive: false,
  },
  {
    id: 'foreclosures',
    label: 'Foreclosures',
    noun: 'foreclosures',
    request: { listing_type: 'sale', listing_statuses: ['foreclosure', 'auction'] },
    expensive: true,
  },
  {
    id: 'distress',
    label: 'Distress deals',
    noun: 'distress deals',
    request: {
      listing_type: 'sale',
      listing_statuses: ['foreclosure', 'auction', 'pre-foreclosure'],
    },
    expensive: true,
  },
  {
    id: 'absentee',
    label: 'Absentee owners',
    noun: 'absentee owners',
    request: {
      listing_type: 'sale',
      owner_occupancy: 'absentee',
      owner_records_availability: 'any',
      owner_tenure_min_years: 10,
    },
    expensive: true,
  },
  {
    id: 'expired',
    label: 'Expired listings',
    noun: 'expired listings',
    request: { listing_type: 'sale', listing_statuses: ['expired'] },
    expensive: true,
  },
  {
    id: 'preforeclosure',
    label: 'Pre-foreclosures',
    noun: 'pre-foreclosures',
    request: { listing_type: 'sale', listing_statuses: ['pre-foreclosure'] },
    expensive: true,
  },
]

export const DEFAULT_HERO_PRESET = HERO_PRESETS[0]

/** Rotating search-bar prompts. Map still opens on the visitor's city. */
export const HERO_SEARCH_PROMPTS = [
  'Type any address to see the gap',
  'Type your next flip to see the numbers',
  'Type a tired FSBO to see if it pencils',
  'Type the deal you just got to see the gap',
  'Type a foreclosure to see how to close it',
]

export function findHeroPreset(id: HeroPresetId): HeroPreset {
  return HERO_PRESETS.find((p) => p.id === id) ?? DEFAULT_HERO_PRESET
}
