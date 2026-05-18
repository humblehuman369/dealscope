import { buildHowToJsonLd, buildProductJsonLd } from '@/lib/seo/metadata'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

type StrategySchemaProps = {
  slug: string
  name: string
  description: string
  steps: { name: string; text: string }[]
}

export function StrategySchema({ slug, name, description, steps }: StrategySchemaProps) {
  const url = `${SITE_URL}/strategies/${slug}`
  const graph = [
    buildProductJsonLd({ name: `${name} — DealGapIQ`, description, url }),
    buildHowToJsonLd({ name: `How to evaluate a ${name} deal`, description, steps, url }),
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }}
    />
  )
}
