/**
 * Typed access to the committed state outline geometry produced by
 * scripts/build-state-outlines.mjs. Server-only in practice: the JSON is
 * ~48 KB and only the markets server components read it.
 */

import outlines from '@/lib/geo/state-outlines.json'

export interface StateOutline {
  /** SVG path data in the shared 975x610 Albers USA space. */
  path: string
  /** viewBox that frames just this state. */
  viewBox: string
}

interface StateOutlinesFile {
  source: string
  us: { viewBox: string }
  states: Record<string, StateOutline>
}

const data = outlines as StateOutlinesFile

export const US_VIEWBOX = data.us.viewBox

export function getStateOutline(code: string): StateOutline {
  const outline = data.states[code.toUpperCase()]
  if (!outline) throw new Error(`No outline geometry for state "${code}"`)
  return outline
}

export function hasStateOutline(code: string): boolean {
  return code.toUpperCase() in data.states
}
