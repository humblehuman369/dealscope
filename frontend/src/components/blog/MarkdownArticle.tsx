'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

interface MarkdownArticleProps {
  content: string
}

export function MarkdownArticle({ content }: MarkdownArticleProps) {
  return (
    <div className="markdown-prose" style={{ color: 'var(--text-body)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              className="mt-12 mb-6 text-3xl sm:text-4xl font-bold leading-tight"
              style={{ color: 'var(--text-heading)' }}
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="mt-10 mb-4 text-2xl sm:text-3xl font-semibold leading-tight"
              style={{ color: 'var(--text-heading)' }}
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="mt-8 mb-3 text-xl sm:text-2xl font-semibold"
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
          a: ({ href, children, ...rest }) => {
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
