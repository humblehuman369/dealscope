'use client'

/**
 * /get-app — the marketing → app download funnel destination.
 *
 * Mobile web visitors are auto-redirected to the matching store (warm traffic,
 * least friction). Desktop visitors see both store links so they can install
 * on their phone. Inside the installed app (IS_CAPACITOR) we send the user
 * home — there is nothing to download.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IS_CAPACITOR } from '@/lib/env'
import { APP_STORE_URL, PLAY_STORE_URL, detectWebPlatform } from '@/lib/appStore'
import { trackEvent } from '@/lib/eventTracking'

const VALUE_PROPS = [
  'Score any property in 60 seconds',
  'See the Deal Gap between asking price and what works',
  'Six strategies analyzed at once — LTR, STR, BRRRR, Flip, House Hack, Wholesale',
  'Point & Scan: point your phone at any house and get the numbers',
]

export default function GetAppClient() {
  const router = useRouter()

  // Mobile visitors are redirected to the right store immediately; desktop
  // visitors stay and see both store links. Detection lives only here so the
  // rendered markup is hydration-stable (always the desktop card).
  useEffect(() => {
    if (IS_CAPACITOR) {
      router.replace('/')
      return
    }
    const detected = detectWebPlatform()
    if (detected === 'ios') {
      trackEvent('get_app_redirect', { platform: 'ios' })
      window.location.href = APP_STORE_URL
    } else if (detected === 'android') {
      trackEvent('get_app_redirect', { platform: 'android' })
      window.location.href = PLAY_STORE_URL
    }
  }, [router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-base)] px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-heading)]">Get DealGapIQ</h1>
        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
          Tap below to install on your phone.
        </p>

        <ul className="mt-6 space-y-3 text-left">
          {VALUE_PROPS.map((prop) => (
            <li key={prop} className="flex items-start gap-2.5 text-[14px] text-[var(--text-body)]">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-sky)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {prop}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <a
            href={APP_STORE_URL}
            onClick={() => trackEvent('get_app_clicked', { source: 'get_app_page', platform: 'ios' })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-sky)] px-6 py-3.5 text-[15px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-sky-light)]"
          >
            Download on the App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            onClick={() =>
              trackEvent('get_app_clicked', { source: 'get_app_page', platform: 'android' })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-6 py-3.5 text-[15px] font-semibold text-[var(--text-heading)] transition-colors hover:bg-[var(--surface-section)]"
          >
            Get it on Google Play
          </a>
        </div>
      </div>
    </main>
  )
}
