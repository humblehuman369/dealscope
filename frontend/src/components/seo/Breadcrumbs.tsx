/**
 * BreadcrumbList JSON-LD helper.
 *
 * Server component — renders inline <script type="application/ld+json"> with the BreadcrumbList
 * structured data. Pair with a visible breadcrumb trail in the page UI for accessibility +
 * E-E-A-T benefit.
 *
 * Usage:
 *   <BreadcrumbsJsonLd
 *     items={[
 *       { name: 'Home', url: '/' },
 *       { name: 'Glossary', url: '/glossary' },
 *       { name: 'Subject-To Financing', url: '/glossary/subject-to-financing' },
 *     ]}
 *   />
 */

const BASE = 'https://dealgapiq.com'

export interface BreadcrumbItem {
  name: string
  /** Either a relative path starting with `/` or a fully-qualified URL. */
  url: string
}

export function BreadcrumbsJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
