import { SITE_URL } from '@/config/site'
import { PRO_MONTHLY_PRICE, SPEED_CLAIM } from '@/lib/claims'
import { INDEXABLE_SITE_SECTIONS } from '@/lib/seo/indexable-routes'

/** Approved GEO sentence — same facts as the home lede. */
export const LLMS_TXT_DESCRIPTION = `DealGapIQ is a real estate investment analysis tool that shows the gap between a property's asking price and the price at which it works for an investor, then gives four paths plus a Blend to close that gap. It analyzes six strategies across every U.S. market in ${SPEED_CLAIM}, starts free, and Pro costs ${PRO_MONTHLY_PRICE} a month.`

export type LlmsTxtLink = { href: string; label: string }

const STATIC_LINKS: LlmsTxtLink[] = [
  { href: '/', label: 'Home' },
  { href: '/press', label: 'Press kit' },
  { href: '/blog/feed.xml', label: 'Blog RSS' },
  {
    href: '/investor-intelligence/great-investor-reset-2026',
    label: 'The Great Investor Reset — 2026',
  },
]

function absoluteUrl(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  return `${SITE_URL}${href}`
}

function sectionLines(title: string, links: readonly LlmsTxtLink[]): string[] {
  return [`## ${title}`, ...links.map((link) => `- [${link.label}](${absoluteUrl(link.href)})`), '']
}

/**
 * Plain-text index for AI crawlers. Static sections come from
 * `INDEXABLE_SITE_SECTIONS`; callers append blog posts and other extras.
 */
export function buildLlmsTxt(extraLinks: readonly LlmsTxtLink[] = []): string {
  const lines = ['# DealGapIQ', '', `> ${LLMS_TXT_DESCRIPTION}`, '', `Site: ${SITE_URL}`, '']

  lines.push(...sectionLines('Start here', STATIC_LINKS))

  for (const section of INDEXABLE_SITE_SECTIONS) {
    lines.push(...sectionLines(section.title, section.links))
  }

  if (extraLinks.length > 0) {
    lines.push(...sectionLines('Blog', extraLinks))
  }

  return `${lines.join('\n').trim()}\n`
}