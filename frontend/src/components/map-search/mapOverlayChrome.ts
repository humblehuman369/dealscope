/**
 * Translucent surfaces for floating controls on top of map tiles.
 * Driven by **map** light/dark (`isDarkMap`), not the global app theme, so
 * chrome stays legible when users toggle only the map style.
 */

export type MapOverlayChrome = {
  backgroundColor: string
  borderColor: string
  primaryText: string
  secondaryText: string
}

export function getMapOverlaySurface(isDark: boolean): MapOverlayChrome {
  return {
    backgroundColor: isDark ? 'rgba(12, 18, 32, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
    primaryText: isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
    secondaryText: isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.7)',
  }
}

/**
 * Inner filter panel controls when the **map** is in light tile mode. Uses
 * explicit light surfaces so pills/inputs match the white panel even when
 * the global app theme is still dark (`--surface-elevated` would stay black).
 */
export const MAP_FILTER_LIGHT_CONTROLS = {
  idleBg: '#f3fafe',
  idleBorder: '1px solid rgba(24, 32, 28, 0.12)',
  idleText: 'rgba(24, 32, 28, 0.92)',
  sectionLabel: 'rgba(111, 117, 109, 1)',
  placeholder: 'rgba(111, 117, 109, 0.85)',
} as const

/** Distressed-deals callout — readable text on soft red (light map mode). */
export const MAP_FILTER_DISTRESSED_LIGHT = {
  boxBg: 'rgba(254, 226, 226, 0.65)',
  boxBorder: '1px solid rgba(239, 68, 68, 0.38)',
  heading: '#9f1239',
  body: '#991b1b',
} as const
