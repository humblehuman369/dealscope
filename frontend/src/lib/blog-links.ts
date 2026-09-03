import { getContent } from '@/lib/content'

export type ResolvedLink = { href: string; label: string; kind: 'glossary' | 'blog' | 'guide' }

const GUIDE_LABELS: Record<string, string> = {
  '/methodology': 'DealGapIQ methodology',
  '/national-averages': 'National investor benchmarks',
  '/lenders': 'Hard money lender directory',
  '/directory': 'Cash buyer directory',
  '/markets': 'Investor market data by state',
  '/strategies/long-term-rental': 'Long-term rental strategy guide',
  '/strategies/short-term-rental': 'Short-term rental strategy guide',
  '/strategies/brrrr': 'BRRRR strategy guide',
  '/strategies/fix-flip': 'Fix & flip strategy guide',
  '/strategies/house-hack': 'House hack strategy guide',
  '/strategies/wholesale': 'Wholesale strategy guide',
}

/** Frontmatter `internal_links` may carry trailing notes, e.g. `/glossary/x (G1)`. */
export function normalizeInternalLink(raw: string): string {
  return raw.trim().split(/\s+/)[0] ?? ''
}

/**
 * Turn frontmatter `internal_links` into labelled "Continue learning" links.
 * Tool routes like `/discovery` are skipped; they already have a dedicated CTA.
 */
export async function resolveInternalLinks(links: string[] | undefined): Promise<ResolvedLink[]> {
  if (!links?.length) return []
  const resolved = await Promise.all(
    links.map(async (raw): Promise<ResolvedLink | null> => {
      const href = normalizeInternalLink(raw)
      if (!href.startsWith('/')) return null
      if (href.startsWith('/glossary/')) {
        const term = await getContent('glossary', href.slice('/glossary/'.length))
        return term ? { href, label: term.frontmatter.title, kind: 'glossary' } : null
      }
      if (href.startsWith('/blog/')) {
        const post = await getContent('blog', href.slice('/blog/'.length))
        return post ? { href, label: post.frontmatter.title, kind: 'blog' } : null
      }
      const label = GUIDE_LABELS[href]
      return label ? { href, label, kind: 'guide' } : null
    }),
  )
  const seen = new Set<string>()
  return resolved.filter((l): l is ResolvedLink => {
    if (!l || seen.has(l.href)) return false
    seen.add(l.href)
    return true
  })
}
