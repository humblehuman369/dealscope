import { OG_CONTENT_TYPE, OG_SIZE, renderBlogCard } from '@/lib/og/blog-card'

export const alt = 'DealGapIQ Blog — Deal analysis and creative finance for real estate investors'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderBlogCard({
    title: 'Deal analysis, creative finance, and the scripts that close the gap.',
    eyebrow: 'Blog',
  })
}
