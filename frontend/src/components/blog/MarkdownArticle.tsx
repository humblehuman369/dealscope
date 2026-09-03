import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'
import {
  isCalloutType,
  remarkDirectiveComponents,
  type CalloutType,
} from '@/lib/markdown/remark-directive-components'
import { BlogCtaLink } from '@/components/blog/BlogCtaLink'
import { withBlogUtm } from '@/lib/blog-utm'

interface MarkdownArticleProps {
  content: string
  /** When set, `::cta` directives get UTM params and click tracking for this post. */
  trackingSlug?: string
}

type DirectiveDivProps = ComponentPropsWithoutRef<'div'> & {
  'data-directive'?: string
  'data-href'?: string
  'data-type'?: string
  'data-title'?: string
}

const CALLOUT_LABEL: Record<CalloutType, string> = {
  tip: 'Tip',
  warning: 'Watch out',
  example: 'Worked example',
  note: 'Note',
}

function calloutLabel(type: string | undefined): string {
  return isCalloutType(type) ? CALLOUT_LABEL[type] : CALLOUT_LABEL.note
}

function Callout({ type, title, children }: { type?: string; title?: string; children: React.ReactNode }) {
  const accent = type === 'warning' ? 'var(--status-warning)' : 'var(--accent-sky)'
  return (
    <aside
      className="my-8 rounded-2xl border p-5 sm:p-6"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <p
        className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.14em]"
        style={{ color: accent }}
      >
        {title || calloutLabel(type)}
      </p>
      <div className="callout-body text-base leading-relaxed" style={{ color: 'var(--text-body)' }}>
        {children}
      </div>
    </aside>
  )
}

function InlineCta({
  href,
  trackingSlug,
  children,
}: {
  href: string
  trackingSlug?: string
  children: React.ReactNode
}) {
  const target = trackingSlug ? withBlogUtm(href, 'inline', trackingSlug) : href
  return (
    <div
      className="my-10 flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)' }}
    >
      <p className="m-0 text-base font-medium" style={{ color: 'var(--text-heading)' }}>
        Run these numbers on a real property.
      </p>
      <BlogCtaLink
        href={target}
        slug={trackingSlug}
        position="inline"
        className="inline-flex shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent-sky)', color: 'var(--surface-base)' }}
      >
        {children}
      </BlogCtaLink>
    </div>
  )
}

export function MarkdownArticle({ content, trackingSlug }: MarkdownArticleProps) {
  return (
    <div className="markdown-prose" style={{ color: 'var(--text-body)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkDirectiveComponents]}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'append',
              properties: { className: ['heading-anchor'], ariaHidden: true, tabIndex: -1 },
              content: { type: 'text', value: '#' },
            },
          ],
        ]}
        components={{
          div: (props: DirectiveDivProps) => {
            const {
              'data-directive': directive,
              'data-href': href,
              'data-type': type,
              'data-title': title,
              children,
              ...rest
            } = props
            if (directive === 'cta') {
              return (
                <InlineCta href={href || '/discovery'} trackingSlug={trackingSlug}>
                  {children}
                </InlineCta>
              )
            }
            if (directive === 'callout') {
              return (
                <Callout type={type} title={title}>
                  {children}
                </Callout>
              )
            }
            return <div {...rest}>{children}</div>
          },
          h1: (props) => (
            <h1
              className="mt-12 mb-6 text-3xl sm:text-4xl font-bold leading-tight"
              style={{ color: 'var(--text-heading)' }}
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="group mt-10 mb-4 scroll-mt-24 text-2xl sm:text-3xl font-semibold leading-tight"
              style={{ color: 'var(--text-heading)' }}
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="group mt-8 mb-3 scroll-mt-24 text-xl sm:text-2xl font-semibold"
              style={{ color: 'var(--text-heading)' }}
              {...props}
            />
          ),
          p: (props) => (
            <p
              className="my-5 text-base sm:text-lg leading-relaxed"
              style={{ color: 'var(--text-body)' }}
              {...props}
            />
          ),
          a: ({ href, children, className, ...rest }) => {
            if (typeof className === 'string' && className.includes('heading-anchor')) {
              return (
                <a
                  href={href}
                  className="ml-2 no-underline opacity-0 transition-opacity group-hover:opacity-60"
                  style={{ color: 'var(--text-muted)' }}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  #
                </a>
              )
            }
            const isInternal = href?.startsWith('/')
            if (isInternal && href) {
              return (
                <Link
                  href={href}
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--accent-sky)' }}
                >
                  {children}
                </Link>
              )
            }
            return (
              <a
                href={href}
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--accent-sky)' }}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                {...rest}
              >
                {children}
              </a>
            )
          },
          ul: (props) => (
            <ul
              className="my-5 ml-6 list-disc space-y-2 text-base sm:text-lg leading-relaxed"
              style={{ color: 'var(--text-body)' }}
              {...props}
            />
          ),
          ol: (props) => (
            <ol
              className="my-5 ml-6 list-decimal space-y-2 text-base sm:text-lg leading-relaxed"
              style={{ color: 'var(--text-body)' }}
              {...props}
            />
          ),
          li: (props) => <li className="pl-2" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="my-6 pl-5 italic text-base sm:text-lg"
              style={{
                borderLeft: '3px solid var(--accent-sky)',
                color: 'var(--text-body)',
              }}
              {...props}
            />
          ),
          code: ({ children, ...rest }) => (
            <code
              className="px-1.5 py-0.5 rounded text-sm"
              style={{
                background: 'var(--surface-elevated)',
                color: 'var(--text-heading)',
              }}
              {...rest}
            >
              {children}
            </code>
          ),
          pre: (props) => (
            <pre
              className="my-6 p-4 rounded-lg overflow-x-auto text-sm"
              style={{
                background: 'var(--surface-elevated)',
                color: 'var(--text-heading)',
                border: '1px solid var(--border-subtle)',
              }}
              {...props}
            />
          ),
          table: (props) => (
            <div className="my-6 overflow-x-auto">
              <table
                className="w-full text-sm sm:text-base"
                style={{
                  borderCollapse: 'collapse',
                  border: '1px solid var(--border-default)',
                }}
                {...props}
              />
            </div>
          ),
          thead: (props) => <thead style={{ background: 'var(--surface-elevated)' }} {...props} />,
          th: (props) => (
            <th
              className="px-4 py-2 text-left font-semibold"
              style={{
                color: 'var(--text-heading)',
                borderBottom: '1px solid var(--border-default)',
              }}
              {...props}
            />
          ),
          td: (props) => (
            <td
              className="px-4 py-2"
              style={{
                color: 'var(--text-body)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
              {...props}
            />
          ),
          hr: () => (
            <hr
              className="my-10"
              style={{ border: '0', borderTop: '1px solid var(--border-subtle)' }}
            />
          ),
          strong: (props) => (
            <strong className="font-semibold" style={{ color: 'var(--text-heading)' }} {...props} />
          ),
          em: (props) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
