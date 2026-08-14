'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/eventTracking'

export function ShareButtons({
  url,
  title,
  article,
}: {
  url: string
  title: string
  article?: string
}) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  function track(channel: string) {
    trackEvent('ii_share', { channel, article: article ?? '' })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      track('copy')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="ii-article__share" role="group" aria-label="Share">
      <a
        className="ii-sharebtn"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('linkedin')}
      >
        LinkedIn
      </a>
      <a
        className="ii-sharebtn"
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('x')}
      >
        X
      </a>
      <a
        className="ii-sharebtn"
        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
        onClick={() => track('email')}
      >
        Email
      </a>
      <button type="button" className="ii-sharebtn" onClick={copyLink}>
        {copied ? 'Copied' : 'Copy Link'}
      </button>
    </div>
  )
}
