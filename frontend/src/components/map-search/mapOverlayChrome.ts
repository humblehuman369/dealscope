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
