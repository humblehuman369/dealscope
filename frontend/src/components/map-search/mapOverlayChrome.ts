import { DISTRESSED_MARKER_COLOR, DISTRESSED_MARKER_COLOR_DARK } from '@/lib/dealSignal'

/**
 * Translucent surfaces for floating controls on top of map tiles.
 * Driven by **map** light/dark (`isDarkMap`), not the global app theme, so
 * chrome stays legible when users toggle only the map style.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

/** Panel callout tints derived from the distressed map-pin palette in dealSignal.ts. */
function motivatedSellerPanelChrome(lightMap: boolean) {
  const markerHex = lightMap ? DISTRESSED_MARKER_COLOR : DISTRESSED_MARKER_COLOR_DARK
  const { r, g, b } = hexToRgb(markerHex)
  if (lightMap) {
    return {
      boxBg: `rgba(${r}, ${g}, ${b}, 0.14)`,
      boxBorder: `1px solid rgba(${r}, ${g}, ${b}, 0.48)`,
      heading: markerHex,
      body: '#991b1b',
    }
  }
  return {
    boxBg: '#000000',
    boxBorder: `1px solid rgba(${r}, ${g}, ${b}, 0.58)`,
    heading: markerHex,
    body: 'rgba(254, 226, 226, 0.94)',
  }
}

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
  idleBg: '#ecf8fd',
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

export type MapFilterPanelOpenChrome = {
  panelBackground: string
  panelBorder: string
  panelShadow: string
  headerBackground: string
  headerBorder: string
  headerIconColor: string
  sectionLabel: string
  placeholder: string
  controlIdleBg: string
  controlIdleText: string
  controlIdleBorder: string
  motivatedSeller: { boxBg: string; boxBorder: string; heading: string; body: string }
  ownerLeads: { boxBg: string; boxBorder: string; heading: string; body: string }
  distressed: { boxBg: string; boxBorder: string; heading: string; body: string }
  expired: { boxBg: string; boxBorder: string; heading: string; body: string }
}

/** High-contrast open panel chrome — draws attention over map tiles. */
export function getMapFilterPanelOpenChrome(lightMap: boolean): MapFilterPanelOpenChrome {
  if (lightMap) {
    return {
      panelBackground: '#ffffff',
      panelBorder: '2px solid rgba(15, 164, 233, 0.55)',
      panelShadow:
        '0 14px 44px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 164, 233, 0.14), 0 0 30px rgba(15, 164, 233, 0.24)',
      headerBackground:
        'linear-gradient(135deg, rgba(15, 164, 233, 0.2) 0%, rgba(56, 189, 248, 0.1) 100%)',
      headerBorder: '1px solid rgba(15, 164, 233, 0.4)',
      headerIconColor: '#0284c7',
      sectionLabel: '#0369a1',
      placeholder: 'rgba(3, 105, 161, 0.8)',
      controlIdleBg: '#dff4fc',
      controlIdleText: 'rgba(15, 23, 42, 0.94)',
      controlIdleBorder: '1px solid rgba(15, 164, 233, 0.38)',
      motivatedSeller: motivatedSellerPanelChrome(true),
      ownerLeads: {
        boxBg: 'rgba(224, 242, 254, 0.95)',
        boxBorder: '1px solid rgba(15, 164, 233, 0.5)',
        heading: '#0369a1',
        body: '#075985',
      },
      distressed: {
        boxBg: 'rgba(254, 226, 226, 0.9)',
        boxBorder: '1px solid rgba(239, 68, 68, 0.5)',
        heading: '#b91c1c',
        body: '#991b1b',
      },
      expired: {
        boxBg: 'rgba(237, 233, 254, 0.95)',
        boxBorder: '1px solid rgba(139, 92, 246, 0.5)',
        heading: '#6d28d9',
        body: '#5b21b6',
      },
    }
  }

  return {
    panelBackground: '#000000',
    panelBorder: '2px solid rgba(56, 189, 248, 0.58)',
    panelShadow:
      '0 18px 52px rgba(0, 0, 0, 0.58), 0 0 0 1px rgba(56, 189, 248, 0.22), 0 0 36px rgba(15, 164, 233, 0.32)',
    headerBackground: '#000000',
    headerBorder: '1px solid rgba(56, 189, 248, 0.45)',
    headerIconColor: '#38bdf8',
    sectionLabel: '#7dd3fc',
    placeholder: 'rgba(125, 211, 252, 0.88)',
    controlIdleBg: 'rgba(30, 52, 78, 0.94)',
    controlIdleText: 'rgba(255, 255, 255, 0.96)',
    controlIdleBorder: '1px solid rgba(56, 189, 248, 0.38)',
    motivatedSeller: motivatedSellerPanelChrome(false),
    ownerLeads: {
      boxBg: '#000000',
      boxBorder: '1px solid rgba(56, 189, 248, 0.58)',
      heading: '#7dd3fc',
      body: 'rgba(224, 242, 254, 0.94)',
    },
    distressed: {
      boxBg: '#000000',
      boxBorder: '1px solid rgba(248, 113, 113, 0.58)',
      heading: '#fca5a5',
      body: 'rgba(254, 226, 226, 0.94)',
    },
    expired: {
      boxBg: '#000000',
      boxBorder: '1px solid rgba(167, 139, 250, 0.58)',
      heading: '#c4b5fd',
      body: 'rgba(237, 233, 254, 0.94)',
    },
  }
}
