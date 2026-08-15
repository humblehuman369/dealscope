import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarkdownArticle } from '@/components/blog/MarkdownArticle'
import { ArticleShare } from '@/components/investor-intelligence/ArticleShare'
import { getAllContent, getContent } from '@/lib/content'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

export async function generateStaticParams() {
  const posts = await getAllContent('investor-intelligence')
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getContent('investor-intelligence', slug)
  if (!post) return {}

  const title = post.frontmatter.meta_title || post.frontmatter.title
  const description = post.frontmatter.meta_description || post.frontmatter.subtitle
  const image = post.frontmatter.hero_image

  return {
    title,
    description,
    alternates: { canonical: `/investor-intelligence/${slug}/` },
    robots: INDEXABLE_ROBOTS,
    openGraph: {
      title,
      description,
      url: `/investor-intelligence/${slug}/`,
      type: 'article',
      publishedTime: post.frontmatter.date_published,
      modifiedTime: post.frontmatter.date_modified,
      authors: post.frontmatter.author ? [post.frontmatter.author] : undefined,
      images: image ? [{ url: image, alt: post.frontmatter.hero_alt }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

function formatDate(raw?: string) {
  if (!raw) return null
  const date = new Date(`${raw}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export default async function InvestorIntelligenceArticle({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getContent('investor-intelligence', slug)
  if (!post) notFound()

  const canonicalUrl = `${BASE_URL}/investor-intelligence/${slug}/`
  const published = formatDate(post.frontmatter.date_published)
  const modified = formatDate(post.frontmatter.date_modified)
  const image = post.frontmatter.hero_image

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.frontmatter.title,
    description: post.frontmatter.meta_description || post.frontmatter.subtitle,
    image: image ? [`${BASE_URL}${image}`] : undefined,
    datePublished: post.frontmatter.date_published,
    dateModified: post.frontmatter.date_modified || post.frontmatter.date_published,
    author: {
      '@type': 'Person',
      name: post.frontmatter.author || 'DealGapIQ Investor Intelligence',
      url: `${BASE_URL}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'DealGapIQ',
      url: BASE_URL,
    },
    mainEntityOfPage: canonicalUrl,
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DealGapIQ', item: `${BASE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Investor Intelligence',
        item: `${BASE_URL}/investor-intelligence/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.frontmatter.title,
        item: canonicalUrl,
      },
    ],
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article>
        <header className="border-b border-[var(--border-subtle)] bg-[radial-gradient(ellipse_at_top,rgba(15,164,233,0.14),transparent_62%)]">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <Link
              href="/investor-intelligence/"
              className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)] hover:opacity-80"
            >
              ← Investor Intelligence
            </Link>

            {post.frontmatter.series && (
              <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-label)]">
                {post.frontmatter.series}
              </p>
            )}
            {post.frontmatter.category && (
              <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">
                {post.frontmatter.category}
              </p>
            )}

            <h1 className="mt-4 max-w-4xl font-[var(--font-dm-sans)] text-4xl font-bold leading-[1.06] tracking-tight text-[var(--text-heading)] sm:text-5xl lg:text-6xl">
              {post.frontmatter.title}
            </h1>

            {post.frontmatter.subtitle && (
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl">
                {post.frontmatter.subtitle}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-5 border-t border-[var(--border-subtle)] pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-sm leading-relaxed text-[var(--text-secondary)]">
                <p>
                  By <span className="font-semibold text-[var(--text-heading)]">{post.frontmatter.author || 'DealGapIQ Investor Intelligence'}</span>
                </p>
                <p>
                  {published ? `Published ${published}` : null}
                  {modified && modified !== published ? ` · Updated ${modified}` : ''}
                  {post.frontmatter.read_time ? ` · ${post.frontmatter.read_time}` : ''}
                </p>
              </div>
              <ArticleShare title={post.frontmatter.title} url={canonicalUrl} />
            </div>
          </div>
        </header>

        {image && (
          <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
              <Image
                src={image}
                alt={post.frontmatter.hero_alt || ''}
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 1200px) 100vw, 1152px"
                className="h-auto w-full"
              />
            </div>
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
              DealGapIQ Investor Intelligence · The Great Investor Reset — 2026
            </p>
          </div>
        )}

        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <MarkdownArticle content={post.content} />

          <section className="mt-16 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-section)] p-6 sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">
              DealGapIQ
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text-heading)] sm:text-3xl">
              Understand the market. Then analyze the property.
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">
              Market intelligence shows where conditions are moving. DealGapIQ helps you test whether the individual property works at the price, income, financing, and return assumptions that matter to you.
            </p>
            <Link
              href="/search?source=investor-intelligence&utm_campaign=great-investor-reset-2026"
              className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,var(--accent-brand-blue),var(--accent-sky-light))] px-6 py-3 font-semibold text-white shadow-[0_4px_14px_rgba(4,101,242,0.25)] hover:no-underline hover:opacity-95"
            >
              Analyze a Property →
            </Link>
          </section>
        </div>
      </article>
    </main>
  )
}
