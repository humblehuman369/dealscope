'use client'

/**
 * Native in-app review prompt.
 *
 * Fires the OS-native App Store / Play Store rating sheet at the peak
 * satisfaction moment — immediately after a user receives their first verdict.
 *
 * - No-op on web (the rating sheet is a native-only surface). The plugin is
 *   dynamically imported so it never lands in the web bundle and never throws
 *   when the native side hasn't been synced yet.
 * - Requested at most once per device (localStorage flag). Apple/Google
 *   additionally throttle how often the sheet actually renders, so a request
 *   is never guaranteed to show a dialog — that is expected and correct.
 */

import { useCallback } from 'react'
import { IS_CAPACITOR } from '@/lib/env'
import { trackEvent } from '@/lib/eventTracking'

const REVIEW_PROMPTED_FLAG = 'dgiq_review_prompted_v1'

export function useReviewPrompt() {
  return useCallback(async () => {
    if (!IS_CAPACITOR) return

    try {
      if (localStorage.getItem(REVIEW_PROMPTED_FLAG)) return
      localStorage.setItem(REVIEW_PROMPTED_FLAG, String(Date.now()))
    } catch {
      // localStorage unavailable (private mode) — fall through; the OS still
      // throttles, so we won't spam the user.
    }

    try {
      // Let the verdict finish painting before interrupting with the sheet.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const { InAppReview } = await import('@capacitor-community/in-app-review')
      await InAppReview.requestReview()
      trackEvent('review_prompt_requested', { trigger: 'first_verdict' })
    } catch {
      // Plugin unavailable (web / sync pending) or OS declined — never block UX.
    }
  }, [])
}
