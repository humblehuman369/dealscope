'use client'

import Link from 'next/link'
import { AlertTriangle, Loader2, TrendingUp, X } from 'lucide-react'
import type { BulkAnalyzeResult } from '@/lib/api'
import type { BulkAnalyzeProgress } from '@/hooks/useBulkAnalyze'

/**
 * Ranked results from a bulk analyze run.
 *
 * The one number that decides anything here is Deal Gap: how far below asking
 * the property has to trade before the numbers work. So it is the largest
 * thing on each row, and the list is ordered by it — the investor's question
 * is "which of these thirty is worth an hour of my time", and the answer is
 * the top of this list.
 *
 * Two honesty requirements shape the rest:
 *
 * Results stream in as the queue drains, and the header says how far along it
 * is. A progress count is not decoration — each analysis costs the user
 * quota, so they are entitled to see what they are spending it on as it
 * happens.
 *
 * Properties that could not be priced are shown, below the ranked ones, with
 * the reason. Dropping them silently would leave the investor believing a pin
 * they selected simply had no deal.
 */

interface OverlayChrome {
  backgroundColor: string
  borderColor: string
  primaryText: string
  secondaryText: string
}

interface BulkAnalyzePanelProps {
  progress: BulkAnalyzeProgress
  onClose: () => void
  onCancel: () => void
  onOpenProperty: (address: string) => void
  overlayChrome: OverlayChrome
}

function formatMoney(value: number | null): string {
  if (value == null) return '—'
  return `$${Math.round(value).toLocaleString()}`
}

/**
 * Colour the gap by how achievable the discount is.
 *
 * A deal that works at or near list is the rare one worth acting on today; a
 * 25%-plus discount is a long negotiation at best. Three coarse bands, since
 * a single-property estimate does not support finer distinctions.
 */
function gapColor(gapPercent: number): string {
  if (gapPercent <= 0) return 'var(--status-positive)'
  if (gapPercent <= 10) return 'var(--accent-sky)'
  if (gapPercent <= 25) return 'var(--status-warning)'
  return 'var(--text-secondary)'
}

function gapLabel(gapPercent: number): string {
  if (gapPercent <= 0) return 'Works at list'
  return `${gapPercent.toFixed(1)}% below list`
}

function ResultRow({
  result,
  rank,
  onOpen,
  chrome,
}: {
  result: BulkAnalyzeResult
  rank: number | null
  onOpen: () => void
  chrome: OverlayChrome
}) {
  const rankable = result.status === 'analyzed' && result.deal_gap_percent != null

  if (!rankable) {
    return (
      <div className="px-3 py-2" style={{ borderTop: `1px solid ${chrome.borderColor}` }}>
        <p className="text-[11px] truncate" style={{ color: chrome.secondaryText }}>
          {result.address}
        </p>
        <p className="text-[10px] leading-snug mt-0.5" style={{ color: chrome.secondaryText }}>
          {result.reason ?? 'Could not be analyzed.'}
        </p>
      </div>
    )
  }

  const gap = result.deal_gap_percent as number

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left px-3 py-2 transition-opacity hover:opacity-80"
      style={{ borderTop: `1px solid ${chrome.borderColor}` }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold w-4 shrink-0" style={{ color: chrome.secondaryText }}>
          {rank}
        </span>
        <span className="text-[13px] font-extrabold" style={{ color: gapColor(gap) }}>
          {gapLabel(gap)}
        </span>
      </div>
      <p className="text-[11px] truncate mt-0.5 pl-6" style={{ color: chrome.primaryText }}>
        {result.address}
      </p>
      <p className="text-[10px] mt-0.5 pl-6" style={{ color: chrome.secondaryText }}>
        List {formatMoney(result.list_price)} · Target buy {formatMoney(result.target_buy_price)}
        {result.monthly_rent ? ` · Rent ${formatMoney(result.monthly_rent)}/mo` : ''}
      </p>
    </button>
  )
}

export function BulkAnalyzePanel({
  progress,
  onClose,
  onCancel,
  onOpenProperty,
  overlayChrome,
}: BulkAnalyzePanelProps) {
  const { results, pending, total, isRunning, quotaExhausted, notice } = progress
  const done = total - pending

  let rankCounter = 0

  return (
    <div
      className="w-[19rem] max-w-[calc(100vw-1.5rem)] rounded-xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: overlayChrome.backgroundColor,
        color: overlayChrome.primaryText,
        border: `1px solid ${overlayChrome.borderColor}`,
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isRunning ? (
            <Loader2 size={12} className="animate-spin shrink-0" aria-hidden />
          ) : (
            <TrendingUp size={12} className="shrink-0" aria-hidden />
          )}
          <span className="text-[11px] font-bold tracking-wide uppercase truncate">
            {isRunning ? `Analyzing ${done} of ${total}` : `Ranked ${results.length}`}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isRunning && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: overlayChrome.secondaryText }}
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ranked results"
            className="transition-opacity hover:opacity-70"
          >
            <X size={13} aria-hidden />
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="h-0.5" style={{ backgroundColor: overlayChrome.borderColor }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${total > 0 ? (done / total) * 100 : 0}%`,
              backgroundColor: 'var(--accent-sky)',
            }}
          />
        </div>
      )}

      {notice && (
        <div
          className="flex items-start gap-1.5 px-3 py-2 text-[10px] leading-snug"
          style={{
            borderTop: `1px solid ${overlayChrome.borderColor}`,
            color: overlayChrome.secondaryText,
          }}
        >
          <AlertTriangle size={11} className="mt-0.5 shrink-0" aria-hidden />
          <span>{notice}</span>
        </div>
      )}

      {quotaExhausted && (
        <div className="px-3 py-2" style={{ borderTop: `1px solid ${overlayChrome.borderColor}` }}>
          <Link
            href="/pricing"
            className="flex items-center justify-center w-full px-2 py-1.5 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            Upgrade for unlimited analyses
          </Link>
        </div>
      )}

      <div className="max-h-[22rem] overflow-y-auto">
        {results.length === 0 && !isRunning ? (
          <p
            className="px-3 py-3 text-[11px] leading-snug"
            style={{
              borderTop: `1px solid ${overlayChrome.borderColor}`,
              color: overlayChrome.secondaryText,
            }}
          >
            Nothing to rank yet.
          </p>
        ) : (
          results.map((result) => {
            const rankable = result.status === 'analyzed' && result.deal_gap_percent != null
            if (rankable) rankCounter += 1
            return (
              <ResultRow
                key={result.address}
                result={result}
                rank={rankable ? rankCounter : null}
                onOpen={() => onOpenProperty(result.address)}
                chrome={overlayChrome}
              />
            )
          })
        )}
      </div>

      <p
        className="px-3 py-2 text-[9px] leading-snug"
        style={{
          borderTop: `1px solid ${overlayChrome.borderColor}`,
          color: overlayChrome.secondaryText,
        }}
      >
        Deal Gap is the discount off asking each deal needs to work at your
        assumptions. Open a property for the full analysis.
      </p>
    </div>
  )
}
