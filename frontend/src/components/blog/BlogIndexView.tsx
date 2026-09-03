import Link from 'next/link'
import type { BlogPost } from '@/lib/content'
import { BLOG_CATEGORIES, BLOG_CATEGORY_SLUGS, type BlogCategorySlug } from '@/lib/blog-categories'
import { PostCard } from '@/components/blog/PostCard'

export const BLOG_PAGE_SIZE = 12

export function paginate<T>(items: T[], page: number, size = BLOG_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * size
  return { items: items.slice(start, start + size), page: current, totalPages }
}

interface BlogIndexViewProps {
  title: string
  intro: string
  posts: BlogPost[]
  page: number
  totalPages: number
  /** Builds the href for a given page number (page 1 must be the canonical hub URL). */
  pageHref: (page: number) => string
  activeCategory?: BlogCategorySlug
  /** Show the newest post as a hero card. Only on page 1 of the main index. */
  showFeatured?: boolean
  eyebrow?: string
  pillar?: { href: string; label: string }
}

export function BlogIndexView({
  title,
  intro,
  posts,
  page,
  totalPages,
  pageHref,
  activeCategory,
  showFeatured = false,
  eyebrow,
  pillar,
}: BlogIndexViewProps) {
  const featured = showFeatured ? posts.find((p) => p.frontmatter.featured) ?? posts[0] : undefined
  const rest = featured ? posts.filter((p) => p.slug !== featured.slug) : posts

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: 'var(--surface-base)' }}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          {eyebrow && (
            <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-sky)' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="text-4xl font-bold sm:text-5xl" style={{ color: 'var(--text-heading)' }}>
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg sm:text-xl" style={{ color: 'var(--text-secondary)' }}>
            {intro}
          </p>
          {pillar && (
            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Start with the pillar guide:{' '}
              <Link href={pillar.href} className="font-medium underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
                {pillar.label}
              </Link>
            </p>
          )}
        </header>

        <nav aria-label="Blog categories" className="mb-10 flex flex-wrap gap-2">
          <CategoryChip href="/blog" label="All posts" active={!activeCategory} />
          {BLOG_CATEGORY_SLUGS.map((slug) => (
            <CategoryChip
              key={slug}
              href={`/blog/category/${slug}`}
              label={BLOG_CATEGORIES[slug].label}
              active={activeCategory === slug}
            />
          ))}
        </nav>

        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No posts here yet. Check back soon.</p>
        ) : (
          <>
            {featured && (
              <div className="mb-8">
                <PostCard post={featured} headingLevel="h2" featured />
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} headingLevel="h2" />
              ))}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} rel="prev" className="font-medium hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
                ← Newer posts
              </Link>
            ) : (
              <span />
            )}
            <span style={{ color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} rel="next" className="font-medium hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
                Older posts →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </main>
  )
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="rounded-full border px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
      style={{
        background: active ? 'var(--accent-sky)' : 'var(--surface-card)',
        color: active ? 'var(--surface-base)' : 'var(--text-body)',
        borderColor: active ? 'var(--accent-sky)' : 'var(--border-default)',
      }}
    >
      {label}
    </Link>
  )
}
