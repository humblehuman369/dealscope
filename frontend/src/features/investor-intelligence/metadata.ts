import type { Metadata } from 'next'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'

export function iiMetadata(opts: {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
}): Metadata {
  const url = opts.path
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: url,
      types: { 'application/rss+xml': '/investor-intelligence/feed' },
    },
    robots: INDEXABLE_ROBOTS,
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: opts.type ?? 'website',
      siteName: 'DealGapIQ Investor Intelligence',
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
    },
  }
}
