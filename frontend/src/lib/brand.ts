import type { ThemeMode } from '@/lib/theme/constants'

/**
 * Canonical DealGapIQ brand asset paths.
 *
 * Source of truth is `public/brand/` (see `public/brand/README.md`). The
 * transparent variants are derived from the pack by
 * `scripts/derive-brand-assets.py`; everything else is served verbatim.
 */
export const BRAND_ASSETS = {
  /** Wordmark, white + cyan, transparent — for dark surfaces. 1200×339. */
  logoOnDark: '/brand/Logo/Transparent/DealGapIQ_Logo_OnDark.png',
  /** Wordmark, black + cyan, transparent — for light surfaces. 1200×339. */
  logoOnLight: '/brand/Logo/Transparent/DealGapIQ_Logo_OnLight.png',
  /** Head + house mark, cyan + white, transparent — for dark surfaces. 512×512. */
  markOnDark: '/brand/AppIcon/Transparent/DealGapIQ_Mark_OnDark_512.png',
  /** Head + house mark, cyan + black, transparent — for light surfaces. 512×512. */
  markOnLight: '/brand/AppIcon/Transparent/DealGapIQ_Mark_OnLight_512.png',
  /** Full-bleed square app icon on black. 1024×1024. Used for JSON-LD logo/image. */
  appIcon: '/brand/AppIcon/iOS_AppStore/AppIcon_1024x1024.png',
} as const

export const BRAND_LOGO_SIZE = { width: 1200, height: 339 } as const

/**
 * Default social share card. Next.js does not deep-merge `openGraph`, so every
 * page that declares its own `openGraph` block must include this in `images`
 * (Twitter falls back to og:image automatically).
 */
export const BRAND_OG_IMAGE = {
  url: '/brand/Logo/Social/OpenGraph_Share_1200x630.png',
  width: 1200,
  height: 630,
  alt: 'DealGapIQ',
} as const

export function brandLogo(theme: ThemeMode): string {
  return theme === 'light' ? BRAND_ASSETS.logoOnLight : BRAND_ASSETS.logoOnDark
}

export function brandMark(theme: ThemeMode): string {
  return theme === 'light' ? BRAND_ASSETS.markOnLight : BRAND_ASSETS.markOnDark
}
