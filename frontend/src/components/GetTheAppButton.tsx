'use client'

/**
 * Reusable "Get the App" CTA for the web marketing site.
 *
 * Links to the /get-app funnel, which detects the visitor's device and
 * redirects to the matching store (App Store / Play Store) or shows both on
 * desktop. Keeping the destination static (no client-only platform state)
 * avoids hydration churn and centralizes redirect logic in one place.
 *
 * Renders nothing inside the installed app (IS_CAPACITOR) — there is nothing
 * to install there. Fires `get_app_clicked` for funnel attribution.
 */

import { IS_CAPACITOR } from '@/lib/env'
import { detectWebPlatform } from '@/lib/appStore'
import { trackEvent } from '@/lib/eventTracking'

interface GetTheAppButtonProps {
  /** Surface that rendered the button, for attribution (e.g. 'hero', 'footer'). */
  source?: string
  label?: string
  className?: string
}

export function GetTheAppButton({
  source = 'unknown',
  label = 'Get the App',
  className,
}: GetTheAppButtonProps) {
  if (IS_CAPACITOR) return null

  return (
    <a
      href="/get-app"
      onClick={() => trackEvent('get_app_clicked', { source, platform: detectWebPlatform() })}
      className={
        className ??
        'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-sky)] px-6 py-3 text-[15px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-sky-light)]'
      }
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 12.04c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.44 2.5-.37 6.2 1.04 8.23.69.99 1.51 2.1 2.58 2.06 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.6.67 2.7.65 1.11-.02 1.82-1.01 2.5-2.01.79-1.15 1.11-2.27 1.13-2.33-.02-.01-2.17-.83-2.19-3.3zM15 6.13c.56-.68.94-1.62.84-2.57-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.39-1.13z" />
      </svg>
      {label}
    </a>
  )
}

export default GetTheAppButton
