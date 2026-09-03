import Link from 'next/link'
import type { BlogPost } from '@/lib/content'
import { getBlogCategory } from '@/lib/blog-categories'
import { formatContentDate } from '@/lib/content-dates'

interface PostCardProps {
  post: BlogPost
  headingLevel?: 'h2' | 'h3'
  featured?: boolean
}

export function PostCard({ post, headingLevel = 'h3', featured = false }: PostCardProps) {
  const fm = post.frontmatter
  const category = fm.category ? getBlogCategory(fm.category) : null
  const Heading = headingLevel
  const published = formatContentDate(fm.date_published)

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border p-6 transition-shadow hover:shadow-[var(--shadow-card)] ${
        featured ? 'sm:p-8' : ''
      }`}
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-label)' }}>
        {category && (
          <Link
            href={`/blog/category/${category.slug}`}
            className="font-mono font-bold uppercase tracking-[0.14em] hover:opacity-80"
            style={{ color: 'var(--accent-sky)' }}
          >
            {category.label}
          </Link>
        )}
        {published && <time dateTime={fm.date_published}>{published}</time>}
        <span>{fm.read_time}</span>
      </div>
      <Heading
        className={`font-semibold leading-tight ${featured ? 'text-2xl sm:text-3xl' : 'text-xl'}`}
        style={{ color: 'var(--text-heading)' }}
      >
        <Link href={`/blog/${post.slug}`} className="hover:opacity-80 transition-opacity">
          {fm.title}
        </Link>
      </Heading>
      {fm.meta_description && (
        <p
          className={`mt-3 leading-relaxed ${featured ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          {fm.meta_description}
        </p>
      )}
      <Link
        href={`/blog/${post.slug}`}
        className="mt-auto inline-block pt-4 text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ color: 'var(--accent-sky)' }}
        aria-label={`Read ${fm.title}`}
      >
        Read →
      </Link>
    </article>
  )
}
