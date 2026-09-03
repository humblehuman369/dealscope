'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { trackEvent } from '@/lib/eventTracking'

export type BlogCtaPosition = 'inline' | 'end' | 'related' | 'header' | 'index'

interface BlogCtaLinkProps {
  href: string
  slug?: string
  position: BlogCtaPosition
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}

/**
 * Link that records `blog_cta_clicked` before navigating. Every blog CTA goes
 * through here so the PostHog funnel blog_post_viewed -> verdict_viewed has a
 * click step in between.
 */
export function BlogCtaLink({ href, slug, position, className, style, children }: BlogCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => trackEvent('blog_cta_clicked', { slug, cta_position: position, href })}
    >
      {children}
    </Link>
  )
}
