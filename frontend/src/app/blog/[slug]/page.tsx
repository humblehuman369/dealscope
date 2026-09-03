import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllBlogPosts, getBlogPost, getRelatedPosts } from '@/lib/content'
import { getBlogCategory } from '@/lib/blog-categories'
import { extractHeadings } from '@/lib/markdown/headings'
import { resolveInternalLinks } from '@/lib/blog-links'
import { formatContentDate } from '@/lib/content-dates'
import { withBlogUtm } from '@/lib/blog-utm'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { blogPostUrl, buildBlogPostJsonLd, SITE_URL } from '@/lib/seo/blog-schema'
import { MarkdownArticle } from '@/components/blog/MarkdownArticle'
import { TableOfContents } from '@/components/blog/TableOfContents'
import { PostCard } from '@/components/blog/PostCard'
import { AuthorCard } from '@/components/blog/AuthorCard'
import { BlogCtaLink } from '@/components/blog/BlogCtaLink'
import { BlogViewTracker } from '@/components/blog/BlogViewTracker'
import { ArticleShare } from '@/components/investor-intelligence/ArticleShare'

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return {}
  const fm = post.frontmatter
  const title = fm.meta_title || fm.title
  const description = fm.meta_description || fm.subtitle
  const heroImages = fm.hero_image ? [{ url: fm.hero_image, alt: fm.hero_alt }] : undefined
  const category = fm.category ? getBlogCategory(fm.category) : null
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    robots: INDEXABLE_ROBOTS,
    keywords: [fm.primary_keyword, ...(fm.secondary_keywords ?? [])].filter(
      (k): k is string => Boolean(k),
    ),
    openGraph: {
      title,
      description,
      url: `/blog/${slug}`,
      type: 'article',
      publishedTime: fm.date_published,
      modifiedTime: fm.date_modified || fm.date_published,
      authors: fm.author ? [fm.author] : undefined,
      section: category?.label,
      tags: fm.tags,
      ...(heroImages ? { images: heroImages } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(fm.hero_image ? { images: [fm.hero_image] } : {}),
    },
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()

  const fm = post.frontmatter
  const category = fm.category ? getBlogCategory(fm.category) : null
  const [related, continueLinks] = await Promise.all([
    getRelatedPosts(slug, 3),
    resolveInternalLinks(fm.internal_links),
  ])
  const headings = extractHeadings(post.content)
  const canonicalUrl = blogPostUrl(slug)
  const published = formatContentDate(fm.date_published)
  const modified = formatContentDate(fm.date_modified)
  const author = fm.author || 'Brad Geisen'
  const jsonLd = buildBlogPostJsonLd(post, `${SITE_URL}/blog/${slug}/opengraph-image`)
  const endCtaHref = withBlogUtm('/discovery', 'post', slug)

  return (
    <main className="min-h-screen" style={{ background: 'var(--surface-base)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogViewTracker
        event="blog_post_viewed"
        slug={slug}
        category={fm.category}
        primaryKeyword={fm.primary_keyword}
      />

      <article>
        <header
          className="border-b"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'radial-gradient(ellipse at top, rgba(15,164,233,0.12), transparent 62%)',
          }}
        >
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <Link href="/blog" className="hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
                Blog
              </Link>
              {category && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <Link
                    href={`/blog/category/${category.slug}`}
                    className="hover:opacity-80"
                    style={{ color: 'var(--accent-sky)' }}
                  >
                    {category.label}
                  </Link>
                </>
              )}
            </nav>

            {fm.series && (
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-label)' }}>
                {fm.series}
              </p>
            )}

            <h1
              className="mt-4 max-w-4xl text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
              style={{ color: 'var(--text-heading)' }}
            >
              {fm.title}
            </h1>

            {fm.subtitle && (
              <p className="mt-5 max-w-3xl text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--text-secondary)' }}>
                {fm.subtitle}
              </p>
            )}

            <div
              className="mt-8 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  By{' '}
                  <Link href="/about" className="font-semibold hover:opacity-80" style={{ color: 'var(--text-heading)' }}>
                    {author}
                  </Link>
                </p>
                <p>
                  {published && <time dateTime={fm.date_published}>Published {published}</time>}
                  {modified && modified !== published && (
                    <>
                      {' · '}
                      <time dateTime={fm.date_modified}>Updated {modified}</time>
                    </>
                  )}
                  {' · '}
                  {fm.read_time}
                </p>
              </div>
              <ArticleShare title={fm.title} url={canonicalUrl} />
            </div>
          </div>
        </header>

        {fm.hero_image && (
          <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
            <div
              className="overflow-hidden rounded-2xl border"
              style={{ border: '1px solid var(--border-default)', background: 'var(--surface-elevated)' }}
            >
              <Image
                src={fm.hero_image}
                alt={fm.hero_alt || ''}
                width={1536}
                height={864}
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="h-auto w-full"
              />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12">
          <div className="min-w-0 max-w-3xl">
            <div className="lg:hidden">
              <TableOfContents headings={headings} variant="mobile" />
            </div>

            <MarkdownArticle content={post.content} trackingSlug={slug} />

            {fm.faq && fm.faq.length > 0 && (
              <section className="mt-14" aria-labelledby="faq-heading">
                <h2 id="faq-heading" className="text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--text-heading)' }}>
                  Frequently asked questions
                </h2>
                <dl className="mt-6 space-y-6">
                  {fm.faq.map((item) => (
                    <div key={item.question}>
                      <dt className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
                        {item.question}
                      </dt>
                      <dd className="mt-2 leading-relaxed" style={{ color: 'var(--text-body)' }}>
                        {item.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section
              className="mt-14 rounded-2xl border p-6 sm:p-8"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)' }}
            >
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-sky)' }}>
                DealGapIQ
              </p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-heading)' }}>
                Run these numbers on a real address.
              </h2>
              <p className="mt-3 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                Paste any listing. In about 60 seconds you get the Deal Gap, the target buy price, and the offer
                structures that close it — including the pitch script.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <BlogCtaLink
                  href={endCtaHref}
                  slug={slug}
                  position="end"
                  className="inline-flex rounded-full px-6 py-3 font-semibold transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent-sky)', color: 'var(--surface-base)' }}
                >
                  Run a free verdict →
                </BlogCtaLink>
                {category && (
                  <Link
                    href={category.pillarHref}
                    className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
                    style={{ color: 'var(--accent-sky)' }}
                  >
                    {category.pillarLabel}
                  </Link>
                )}
              </div>
            </section>

            {continueLinks.length > 0 && (
              <section className="mt-12" aria-labelledby="continue-heading">
                <h2
                  id="continue-heading"
                  className="font-mono text-xs font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--text-label)' }}
                >
                  Continue learning
                </h2>
                <ul className="mt-4 space-y-2">
                  {continueLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="underline underline-offset-2 hover:opacity-80"
                        style={{ color: 'var(--accent-sky)' }}
                      >
                        {link.label}
                      </Link>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {link.kind === 'glossary' ? 'Glossary' : link.kind === 'blog' ? 'Blog' : 'Guide'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <AuthorCard name={author} />
          </div>

          <aside className="hidden lg:block">
            <TableOfContents headings={headings} variant="desktop" />
          </aside>
        </div>

        {related.length > 0 && (
          <section
            className="border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
            aria-labelledby="related-heading"
          >
            <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
              <h2 id="related-heading" className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>
                Related reading
              </h2>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {related.map((p) => (
                  <PostCard key={p.slug} post={p} headingLevel="h3" />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </main>
  )
}
