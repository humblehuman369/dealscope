'use client'

import { useState } from 'react'

export function ArticleShare({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be unavailable in embedded browsers; the direct share links still work.
    }
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Share this analysis">
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
      >
        LinkedIn
      </a>
      <a
        href={`https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
      >
        X
      </a>
      <a
        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
        className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
      >
        Email
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}
