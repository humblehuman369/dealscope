'use client'

/**
 * Capacitor native shell:
 * - Adds `capacitor` CSS class to <html> for safe-area and platform-specific styling
 * - Configures status bar style from active theme (dark glyphs on light canvas; light glyphs on dark)
 * - Dismisses native splash screen once the page is interactive
 * - Intercepts external links to open in system browser
 */

import { useEffect, useRef } from 'react'
import { IS_CAPACITOR } from '@/lib/env'
import { useTheme } from '@/context/ThemeContext'

export function useCapacitorShell() {
  const didRun = useRef(false)
  const { theme } = useTheme()

  useEffect(() => {
    if (!IS_CAPACITOR || didRun.current) return
    didRun.current = true

    document.documentElement.classList.add('capacitor')

    async function hideSplash() {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 300 })
      } catch {
        /* simulator may not support */
      }
    }

    hideSplash()

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return

      try {
        const url = new URL(href, window.location.origin)
        const isInternal =
          url.hostname === window.location.hostname ||
          url.hostname.endsWith('.dealgapiq.com')
        if (!isInternal && url.protocol.startsWith('http')) {
          e.preventDefault()
          import('@capacitor/browser').then(({ Browser }) =>
            Browser.open({ url: href }),
          )
        }
      } catch {
        /* not a valid URL, let it pass through */
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  useEffect(() => {
    if (!IS_CAPACITOR) return

    let cancelled = false
    ;(async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        if (cancelled) return
        await StatusBar.setStyle({
          style: theme === 'light' ? Style.Light : Style.Dark,
        })
        await StatusBar.setOverlaysWebView({ overlay: true })
      } catch {
        /* simulator may not support */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [theme])
}
