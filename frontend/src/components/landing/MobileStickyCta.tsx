'use client'

/**
 * Bottom-anchored call to action for phones, shown once the element with
 * `watchId` (normally the hero) has scrolled out of view. Extracted from the
 * pricing page pattern; pricing keeps its own price-bearing variant.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/eventTracking'

interface Props {
  label: string
  href: string
  /** id of the element whose exit from the viewport reveals the bar. */
  watchId: string
  /** Recorded on `sticky_cta_clicked`. */
  source: string
  sublabel?: string
}

export function MobileStickyCta({ label, href, watchId, source, sublabel }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById(watchId)
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [watchId])

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t px-5 pt-3 transition-opacity duration-200 md:hidden"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--border-default)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden={!visible}
    >
      {sublabel ? (
        <p className="m-0 min-w-0 truncate text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {sublabel}
        </p>
      ) : (
        <span />
      )}
      <Link
        href={href}
        tabIndex={visible ? 0 : -1}
        onClick={() => trackEvent('sticky_cta_clicked', { source })}
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-bold no-underline"
        style={{
          background:
            'linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)',
          color: 'var(--text-inverse)',
        }}
      >
        {label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}
