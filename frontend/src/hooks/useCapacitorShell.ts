'use client'

/**
 * One-time setup for the Capacitor native shell:
 * - Adds `capacitor` CSS class to <html> for safe-area and platform-specific styling
 * - Configures status bar (light text on dark background)
 * - Dismisses native splash screen once the page is interactive
 * - Intercepts external links to open in system browser
 */

import { useEffect, useRef } from 'react'
import { IS_CAPACITOR } from '@/lib/env'

export function useCapacitorShell() {
  const didRun = useRef(false)

  useEffect(() => {
    if (!IS_CAPACITOR || didRun.current) return
    didRun.current = true

    document.documentElement.classList.add('capacitor')

    async function setup() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setOverlaysWebView({ overlay: true })
      } catch { /* simulator may not support */ }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 300 })
      } catch { /* best effort */ }
    }

    setup()

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
      } catch { /* not a valid URL, let it pass through */ }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
}
