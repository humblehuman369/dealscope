'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/eventTracking'

export function AnalyzePropertyLink({
  href,
  placement,
  article,
  className,
  children,
}: {
  href: string
  placement: string
  article?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackEvent('ii_analyze_property_click', {
          source: 'investor-intelligence',
          placement,
          article: article ?? '',
        })
      }
    >
      {children}
    </Link>
  )
}
