/**
 * App Store / Play Store config and install-link resolution for the
 * marketing-site → mobile-app download funnel.
 *
 * The Apple numeric App ID is environment-driven (NEXT_PUBLIC_APPLE_APP_ID)
 * because it is not derivable from the bundle id — find it in App Store
 * Connect → App Information → Apple ID. Until it is set, iOS links fall back
 * to an App Store brand search so the funnel still resolves somewhere sensible.
 *
 * NOTE: distinct from NATIVE_PLATFORM in `lib/env.ts`. That describes the
 * Capacitor shell the app is running *inside*; this module detects the device
 * of a *web* visitor so we can send them to the right store.
 */

/** Android application id (Capacitor `appId`). */
export const ANDROID_PACKAGE = 'com.dealgapiq.mobile'

const APPLE_APP_ID = (process.env.NEXT_PUBLIC_APPLE_APP_ID || '').trim()

/** Tagged so installs from the web funnel are attributable in Play Console. */
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&referrer=utm_source%3Dweb%26utm_medium%3Dget_app`

export const APP_STORE_URL = APPLE_APP_ID
  ? `https://apps.apple.com/app/id${APPLE_APP_ID}`
  : 'https://apps.apple.com/search?term=dealgapiq'

export type WebPlatform = 'ios' | 'android' | 'desktop'

/**
 * Detect the visiting browser's device. SSR-safe (returns 'desktop' on the
 * server / before hydration). iPadOS 13+ masquerades as macOS, so we
 * disambiguate via touch support.
 */
export function detectWebPlatform(): WebPlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document) {
    return 'ios'
  }
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
