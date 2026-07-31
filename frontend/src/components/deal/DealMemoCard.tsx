'use client'

/**
 * Deal Memo card — an explainable, plain-language memo generated from the
 * deal's own worksheet numbers. Lives on the deal Overview tab. The memo is
 * persisted server-side, so regenerating is a deliberate action (it re-reads
 * the current numbers), not something that happens on every visit.
 */

import { FileText, RefreshCw, Sparkles } from 'lucide-react'
import { useDealMemo, useGenerateDealMemo } from '@/hooks/useDealMemo'

export function DealMemoCard({ propertyId }: { propertyId: string }) {
  const memoQuery = useDealMemo(propertyId)
  const generate = useGenerateDealMemo(propertyId)

  const memo = memoQuery.data?.memo ?? null
  const busy = generate.isPending

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 flex flex-col lg:col-span-2">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-heading)] inline-flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[var(--accent-sky)]" />
          Deal Memo
        </h3>
        {memo && (
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Regenerating…' : 'Regenerate'}
          </button>
        )}
      </header>

      {memoQuery.isLoading ? (
        <p className="text-sm text-[var(--text-label)]">Loading…</p>
      ) : memo ? (
        <div>
          <div className="text-sm leading-relaxed text-[var(--text-body)] whitespace-pre-wrap">
            {memo.text}
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wide text-[var(--text-label)]">
            {memo.source === 'ai' ? 'AI-generated' : 'Generated'} from your worksheet numbers ·{' '}
            {new Date(memo.generated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--text-label)]">
            Get a plain-language memo explaining what drives this deal&apos;s numbers — and what
            would change the verdict. Built only from your worksheet inputs, nothing invented.
          </p>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {busy ? 'Generating…' : 'Generate deal memo'}
          </button>
          {generate.isError && (
            <p className="text-xs text-[var(--status-negative)]">
              Couldn&apos;t generate the memo — try again.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
