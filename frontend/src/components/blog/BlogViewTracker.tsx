'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/eventTracking'

type BlogViewEvent =
  | { event: 'blog_post_viewed'; slug: string; category?: string; primaryKeyword?: string }
  | { event: 'blog_category_viewed'; category: string }

/** Fires one blog view event per mount; renders nothing. */
export function BlogViewTracker(props: BlogViewEvent) {
  const { event } = props
  const slug = props.event === 'blog_post_viewed' ? props.slug : undefined
  const category = props.category
  const primaryKeyword = props.event === 'blog_post_viewed' ? props.primaryKeyword : undefined

  useEffect(() => {
    switch (event) {
      case 'blog_post_viewed':
        trackEvent(event, { slug, category, primary_keyword: primaryKeyword })
        break
      case 'blog_category_viewed':
        trackEvent(event, { category })
        break
      default: {
        const _exhaustive: never = event
        void _exhaustive
      }
    }
  }, [event, slug, category, primaryKeyword])

  return null
}
