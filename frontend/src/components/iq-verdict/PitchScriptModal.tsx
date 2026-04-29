'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DealStructure } from '@/components/iq-verdict/ThreePathsPanel'
import { trackEvent } from '@/lib/eventTracking'

export interface PitchScriptModalProps {
  structure: DealStructure | null
  onClose: () => void
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

export function PitchScriptModal({ structure, onClose }: PitchScriptModalProps) {
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
          className="flex justify-end gap-2 flex-wrap"
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <button
            type="button"
            onClick={copy}
            className="rounded-md px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: copied ? 'var(--accent-positive, #16a34a)' : 'var(--accent-sky)',
              color: 'var(--surface-base, #fff)',
              border: 'none',
              minWidth: 160,
            }}
          >
            {copied ? 'Copied to clipboard' : 'Copy script'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-[13px] font-semibold"
            style={{
              background: 'transparent',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
