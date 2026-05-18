import { buildFaqJsonLd, type FaqItem } from '@/lib/seo/metadata'

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(items)) }}
    />
  )
}
