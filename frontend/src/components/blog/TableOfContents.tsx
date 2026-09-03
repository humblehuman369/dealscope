import type { Heading } from '@/lib/markdown/headings'

/** Posts with fewer headings than this get no TOC; it would be noise. */
const MIN_HEADINGS = 3

interface TableOfContentsProps {
  headings: Heading[]
  variant: 'mobile' | 'desktop'
}

function TocList({ headings }: { headings: Heading[] }) {
  return (
    <ol className="space-y-2 text-sm leading-snug">
      {headings.map((h) => (
        <li key={h.id} className={h.depth === 3 ? 'pl-4' : ''}>
          <a
            href={`#${h.id}`}
            className="block transition-opacity hover:opacity-80"
            style={{ color: h.depth === 2 ? 'var(--text-body)' : 'var(--text-secondary)' }}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  )
}

/**
 * Server-rendered TOC. The mobile variant is a collapsed `<details>` so it
 * costs no JS; the desktop variant is a sticky rail beside the article.
 */
export function TableOfContents({ headings, variant }: TableOfContentsProps) {
  if (headings.length < MIN_HEADINGS) return null

  if (variant === 'mobile') {
    return (
      <details
        className="mb-8 rounded-2xl border p-4"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)' }}
      >
        <summary
          className="cursor-pointer font-mono text-xs font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--text-label)' }}
        >
          In this article
        </summary>
        <nav aria-label="Table of contents" className="mt-4">
          <TocList headings={headings} />
        </nav>
      </details>
    )
  }

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto"
    >
      <p
        className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--text-label)' }}
      >
        In this article
      </p>
      <TocList headings={headings} />
    </nav>
  )
}
