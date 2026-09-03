export type BlogUtmMedium = 'post' | 'category' | 'inline' | 'index'

/**
 * Every blog CTA carries the same UTM shape so GSC/PostHog can attribute a
 * verdict run back to the post that earned it:
 *   utm_source=blog&utm_medium={post|category|inline|index}&utm_campaign={slug}
 */
export function withBlogUtm(href: string, medium: BlogUtmMedium, campaign: string): string {
  if (!href.startsWith('/')) return href
  const [path, existing = ''] = href.split('?')
  const params = new URLSearchParams(existing)
  params.set('utm_source', 'blog')
  params.set('utm_medium', medium)
  params.set('utm_campaign', campaign)
  return `${path}?${params.toString()}`
}
