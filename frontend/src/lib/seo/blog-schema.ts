import type { BlogPost } from '@/lib/content'
import { getBlogCategory } from '@/lib/blog-categories'
import { buildFaqJsonLd } from '@/lib/seo/metadata'

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

const ORG_ID = `${SITE_URL}/#organization`
const PERSON_ID = `${SITE_URL}/about#brad-geisen`

export function blogPostUrl(slug: string): string {
  return `${SITE_URL}/blog/${slug}`
}

function authorRef(name: string | undefined) {
  if (!name || name === 'Brad Geisen') {
    return { '@type': 'Person', '@id': PERSON_ID, name: 'Brad Geisen', url: `${SITE_URL}/about` }
  }
  return { '@type': 'Person', name }
}

/**
 * One `@graph` per post: BlogPosting + BreadcrumbList (+ FAQPage when the post
 * declares `faq`). Entity ids point at the Organization/Person nodes emitted by
 * `SiteJsonLd` so search engines stitch them together.
 */
export function buildBlogPostJsonLd(post: BlogPost, ogImageUrl: string) {
  const fm = post.frontmatter
  const url = blogPostUrl(post.slug)
  const category = fm.category ? getBlogCategory(fm.category) : null
  const description = fm.meta_description || fm.subtitle || ''
  const image = fm.hero_image ? `${SITE_URL}${fm.hero_image}` : ogImageUrl

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: fm.title,
      description,
      image: [image],
      url,
      mainEntityOfPage: url,
      datePublished: fm.date_published,
      dateModified: fm.date_modified || fm.date_published,
      author: authorRef(fm.author),
      publisher: { '@id': ORG_ID },
      isPartOf: { '@type': 'Blog', '@id': `${SITE_URL}/blog#blog`, name: 'DealGapIQ Blog' },
      inLanguage: 'en-US',
      wordCount: fm.word_count,
      ...(category ? { articleSection: category.label } : {}),
      ...(fm.primary_keyword || fm.tags?.length
        ? { keywords: [fm.primary_keyword, ...(fm.secondary_keywords ?? []), ...(fm.tags ?? [])].filter(Boolean).join(', ') }
        : {}),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        ...(category
          ? [
              {
                '@type': 'ListItem',
                position: 3,
                name: category.label,
                item: `${SITE_URL}/blog/category/${category.slug}`,
              },
              { '@type': 'ListItem', position: 4, name: fm.title, item: url },
            ]
          : [{ '@type': 'ListItem', position: 3, name: fm.title, item: url }]),
      ],
    },
  ]

  if (fm.faq?.length) {
    const { '@context': _ctx, ...faq } = buildFaqJsonLd(fm.faq)
    void _ctx
    graph.push({ ...faq, '@id': `${url}#faq` })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

export function buildBlogCollectionJsonLd(options: {
  url: string
  name: string
  description: string
  posts: BlogPost[]
  breadcrumbs: { name: string; item: string }[]
}) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${options.url}#page`,
        url: options.url,
        name: options.name,
        description: options.description,
        isPartOf: { '@type': 'Blog', '@id': `${SITE_URL}/blog#blog`, name: 'DealGapIQ Blog' },
        publisher: { '@id': ORG_ID },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: options.posts.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: blogPostUrl(p.slug),
            name: p.frontmatter.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: options.breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.item,
        })),
      },
    ],
  }
}
