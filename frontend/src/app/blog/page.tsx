import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllContent } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Blog — DealGapIQ',
  description:
    'Real-estate investment analysis, creative-finance teardowns, and the pitch scripts that close the deal. Built for active investors who know the price tag isn\'t the deal — the structure is.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — DealGapIQ',
    description:
      'Real-estate investment analysis, creative-finance teardowns, and the pitch scripts that close the deal.',
    url: '/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — DealGapIQ',
    description: 'Deal teardowns, creative-finance breakdowns, and pitch scripts.',
  },
}

export default async function BlogIndex() {
  const posts = await getAllContent('blog')

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: 'var(--surface-base)' }}
    >
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{ color: 'var(--text-heading)' }}
          >
            Blog
          </h1>
          <p
            className="text-lg sm:text-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Deal teardowns, creative-finance breakdowns, and the pitch scripts that close the gap.
          </p>
        </header>

        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            No posts yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="pb-8"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block"
                >
                  <h2
                    className="text-2xl sm:text-3xl font-semibold mb-2 group-hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {post.frontmatter.title}
                  </h2>
                  {post.frontmatter.meta_description && (
                    <p
                      className="text-base sm:text-lg leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {post.frontmatter.meta_description}
                    </p>
                  )}
                  <span
                    className="inline-block mt-3 text-sm font-medium"
                    style={{ color: 'var(--accent-sky)' }}
                  >
                    Read →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
