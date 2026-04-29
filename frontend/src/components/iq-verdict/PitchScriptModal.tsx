'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DealStructure } from '@/components/iq-verdict/ThreePathsPanel'
import { trackEvent } from '@/lib/eventTracking'
import { IS_CAPACITOR } from '@/lib/env'

export interface PitchScriptModalProps {
  structure: DealStructure | null
  onClose: () => void
  /**
   * Optional human-readable property address ("123 Main St, Austin, TX 78701").
   * Included in print header and email subject/body when present so investors
   * can take a printed playbook into a meeting and know which property it's for.
   */
  propertyAddress?: string | null
}

/**
 * Heuristic detector for "section header" lines.
 *
 * Pitch scripts are authored with a consistent header pattern: an ALL-CAPS prefix
 * word (or short phrase) optionally followed by an em-dash/colon/hyphen and a
 * lower-case description. Examples that should match:
 *   - "WHO TO CALL"
 *   - "OPEN — discover before you ask"
 *   - "WHY IT'S A WIN FOR THE SELLER (lead with this)"
 *   - "ANCHOR — lead with math, not opinion"
 *   - "TRIAL CLOSE"
 *   - "TACTICS"
 *
 * Lines we must NOT mis-detect as headings:
 *   - quoted dialog ("Thanks for taking the call...")
 *   - bullet lines (• or 1.)
 *   - sentences starting with a single capitalized word (e.g. "FHA requires...")
 *   - any line ending with sentence punctuation (. ! ?)
 */
const PURE_ALL_CAPS_RE = /^[A-Z][A-Z0-9 '&/\-]+$/
const ALL_CAPS_PREFIX_DASH_RE = /^[A-Z][A-Z0-9 '&/\-]{1,40}\s*[—–:]\s+\S.*$/
const ALL_CAPS_PREFIX_PAREN_RE = /^[A-Z][A-Z0-9 '&/\-]{1,40}\s*\([^)]+\)\s*$/

interface PitchBlock {
  kind: 'heading' | 'body'
  text: string
}

function isSectionHeading(line: string): boolean {
  const t = line.trim()
  if (t.length < 3 || t.length > 100) return false
  if (/[.!?]$/.test(t)) return false
  return (
    PURE_ALL_CAPS_RE.test(t) ||
    ALL_CAPS_PREFIX_DASH_RE.test(t) ||
    ALL_CAPS_PREFIX_PAREN_RE.test(t)
  )
}

function parsePitch(raw: string): PitchBlock[] {
  const lines = raw.split('\n')
  const blocks: PitchBlock[] = []
  let buffer: string[] = []

  const flushBody = () => {
    if (buffer.length === 0) return
    const text = buffer.join('\n').trim()
    if (text) blocks.push({ kind: 'body', text })
    buffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (isSectionHeading(line)) {
      flushBody()
      blocks.push({ kind: 'heading', text: line.trim() })
    } else {
      buffer.push(line)
    }
  }
  flushBody()

  return blocks
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Build a self-contained HTML document for printing — black on white, generous
 * line-height, sized for letter paper. Triggers ``window.print()`` once loaded.
 *
 * Pitches typically run 2–4 pages. ``page-break-inside: avoid`` on each
 * section keeps headings with their body across page breaks; if a single
 * section is too long the browser will still split it (we don't try to
 * paginate manually).
 */
function buildPrintHtml(opts: {
  headline: string
  blocks: PitchBlock[]
  propertyAddress?: string | null
  familyLabel?: string | null
}): string {
  const { headline, blocks, propertyAddress, familyLabel } = opts
  const printedAt = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const sectionsHtml = blocks
    .map((block) => {
      if (block.kind === 'heading') {
        return `<h2 class="section">${escapeHtml(block.text)}</h2>`
      }
      return `<p class="body">${escapeHtml(block.text)}</p>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Negotiation playbook — ${escapeHtml(headline)}</title>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  body {
    padding: 40px 48px 56px;
    max-width: 720px;
    margin: 0 auto;
    line-height: 1.55;
    font-size: 13px;
  }
  .eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #0284c7;
    margin: 0 0 6px;
  }
  h1 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.25;
    color: #0f172a;
  }
  .meta {
    margin: 8px 0 0;
    font-size: 11.5px;
    color: #475569;
    line-height: 1.5;
  }
  .meta strong { color: #0f172a; font-weight: 600; }
  .divider {
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin: 22px 0 18px;
  }
  .section {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #0284c7;
    margin: 18px 0 8px;
    page-break-after: avoid;
    break-after: avoid;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
  }
  .section:first-of-type {
    border-top: 0;
    padding-top: 0;
    margin-top: 0;
  }
  .body {
    margin: 0 0 6px;
    color: #1f2937;
    white-space: pre-wrap;
    page-break-inside: avoid;
    break-inside: avoid;
    font-size: 13px;
    line-height: 1.6;
  }
  footer {
    margin-top: 40px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    font-size: 10.5px;
    color: #64748b;
    line-height: 1.5;
  }
  @media print {
    body { padding: 0.5in 0.6in 0.6in; max-width: none; }
    .no-print { display: none !important; }
    a { color: inherit; text-decoration: none; }
  }
  @page { margin: 0.5in; }
</style>
</head>
<body>
  <div class="eyebrow">Negotiation playbook${familyLabel ? ' — ' + escapeHtml(familyLabel) : ''}</div>
  <h1>${escapeHtml(headline)}</h1>
  <p class="meta">
    ${propertyAddress ? `<strong>Property:</strong> ${escapeHtml(propertyAddress)}<br>` : ''}
    <strong>Prepared:</strong> ${escapeHtml(printedAt)}
  </p>
  <hr class="divider">
  ${sectionsHtml}
  <footer>
    Built from your DealScope Verdict analysis. This script is a starting point — adapt it to the
    seller's situation as you learn more on the call. Always have a creative-finance attorney review
    any non-traditional offer before signing.
  </footer>
  <script>
    // Auto-trigger the print dialog once layout is stable.
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`
}

/** Plain-text email body. Includes property + path context for the recipient. */
function buildEmailBody(opts: {
  headline: string
  pitch: string
  propertyAddress?: string | null
  familyLabel?: string | null
}): string {
  const { headline, pitch, propertyAddress, familyLabel } = opts
  const lines: string[] = []
  lines.push('NEGOTIATION PLAYBOOK')
  if (familyLabel) lines.push(familyLabel)
  lines.push('')
  if (propertyAddress) lines.push(`Property: ${propertyAddress}`)
  lines.push(`Path: ${headline}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(pitch)
  lines.push('')
  lines.push('---')
  lines.push('Built from your DealScope Verdict analysis (https://dealgapiq.com).')
  return lines.join('\n')
}

export function PitchScriptModal({ structure, onClose, propertyAddress }: PitchScriptModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const trackedId = useRef<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!structure?.pitchScript) return
    if (trackedId.current === structure.id) return
    trackedId.current = structure.id
    setCopied(false)
    trackEvent('path_pitch_opened', { structure_id: structure.id, family: structure.family })
  }, [structure])

  useEffect(() => {
    if (!structure?.pitchScript) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [structure, onClose])

  const blocks = useMemo(() => {
    if (!structure?.pitchScript) return [] as PitchBlock[]
    return parsePitch(structure.pitchScript)
  }, [structure?.pitchScript])

  if (!structure?.pitchScript) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(structure.pitchScript ?? '')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
      trackEvent('path_pitch_copied', { structure_id: structure.id, family: structure.family })
    } catch {
      /* ignore */
    }
  }

  const print = () => {
    if (!structure?.pitchScript) return
    const html = buildPrintHtml({
      headline: structure.headline,
      blocks,
      propertyAddress,
      familyLabel: structure.familyLabel ?? null,
    })
    // Open the printable doc in a new window. If popup is blocked, fall back to
    // opening as a Blob URL in the current window so the user still gets the doc.
    let win: Window | null = null
    try {
      win = window.open('', '_blank', 'noopener,noreferrer,width=820,height=900')
    } catch {
      win = null
    }
    if (win && win.document) {
      win.document.open()
      win.document.write(html)
      win.document.close()
    } else {
      // Popup blocked — fall back to a Blob URL the user can open manually.
      try {
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        // Free the URL after a delay so the new tab has time to load it.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } catch {
        /* ignore */
      }
    }
    trackEvent('path_pitch_printed', { structure_id: structure.id, family: structure.family })
  }

  const email = () => {
    if (!structure?.pitchScript) return
    const subject = `Negotiation playbook: ${structure.headline}`
    const body = buildEmailBody({
      headline: structure.headline,
      pitch: structure.pitchScript,
      propertyAddress,
      familyLabel: structure.familyLabel ?? null,
    })
    // Some mail clients (notably Outlook and Gmail web) silently truncate
    // very long mailto bodies. Always copy the full script to clipboard
    // alongside opening the mail client so the user has a paste fallback.
    navigator.clipboard?.writeText(body).catch(() => {})
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = href
    trackEvent('path_pitch_emailed', { structure_id: structure.id, family: structure.family })
  }

  return (
    <div
      ref={backdropRef}
      role="presentation"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.55)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pitch-script-title"
        className="w-full rounded-xl shadow-2xl"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
          maxWidth: 720,
          maxHeight: 'min(86vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent-sky)',
              marginBottom: 4,
            }}
          >
            Negotiation playbook
          </div>
          <h2
            id="pitch-script-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'var(--text-heading)',
            }}
          >
            {structure.headline}
          </h2>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 12.5,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            A field-tested script you can adapt and use on the call. Read top to bottom — each
            section builds on the last. Copy it and rehearse out loud once before you dial.
          </p>
        </div>

        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {blocks.map((block, i) => {
            if (block.kind === 'heading') {
              return (
                <h3
                  key={`h-${i}`}
                  style={{
                    margin: '6px 0 0',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent-sky-light, var(--accent-sky))',
                    paddingTop: i === 0 ? 0 : 6,
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle, var(--border-default))',
                  }}
                >
                  {block.text}
                </h3>
              )
            }
            return (
              <p
                key={`b-${i}`}
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--text-body)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                }}
              >
                {block.text}
              </p>
            )
          })}
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-default)',
            justifyContent: 'flex-end',
          }}
        >
          {/*
            Print is a desktop-first feature. In the Capacitor WebView,
            window.open / browser print dialog are unreliable — hide it there.
            Email-via-mailto works on iOS/Android via the OS mail handler.
          */}
          {!IS_CAPACITOR && (
            <button
              type="button"
              onClick={print}
              aria-label="Print this script"
              className="rounded-md px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-[var(--surface-card)]"
              style={{
                background: 'transparent',
                color: 'var(--text-heading)',
                border: '1px solid var(--border-default)',
              }}
            >
              Print
            </button>
          )}
          <button
            type="button"
            onClick={email}
            aria-label="Email this script to yourself"
            className="rounded-md px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-[var(--surface-card)]"
            style={{
              background: 'transparent',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            Email to me
          </button>
          <button
            type="button"
            onClick={copy}
            className="rounded-md px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: copied ? 'var(--accent-positive, #16a34a)' : 'var(--accent-sky)',
              color: 'var(--surface-base, #fff)',
              border: 'none',
              minWidth: 150,
            }}
          >
            {copied ? 'Copied to clipboard' : 'Copy script'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-[13px] font-semibold"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: 'none',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
