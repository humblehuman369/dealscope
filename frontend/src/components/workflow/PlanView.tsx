'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { PlanViewModel } from '@/lib/dealStructures/planSnapshot'
import { PLAN_WHY_TWO_GAPS } from '@/lib/planCopy'
import { V1_CARD, V1_NUM, v1Tile } from '@/components/workflow/v1-style'

export interface PlanViewProps {
  model: PlanViewModel
  onTune: () => void
  onApply: (structureId: string) => void
  onStartDeal: () => void
  startingDeal?: boolean
  onShareFullReport?: () => void
  onShareExcel?: () => void
  onSharePdf?: () => void
  trialPitch?: ReactNode
  /** Test-only: throw inside this card so the V1 Plan boundary can catch it. */
  debugThrow?: boolean
}

const CARD: CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-card)',
}

const HERO: CSSProperties = {
  ...CARD,
  background:
    'radial-gradient(120% 120% at 0% 0%, rgba(14,165,233,0.09), transparent 60%), var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  boxShadow: 'var(--shadow-card)',
}

function WhyToggle({ id, label, text }: { id: string; label: string; text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        className="min-h-11 text-[13px] underline-offset-2 hover:underline bg-transparent border-0 px-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: 'var(--accent-sky)', outlineColor: 'var(--accent-sky)' }}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((prev) => !prev)}
      >
        {label}
      </button>
      {open ? (
        <p id={id} className="m-0 mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {text}
        </p>
      ) : null}
    </div>
  )
}

export function PlanView({
  model,
  onTune,
  onApply,
  onStartDeal,
  startingDeal = false,
  onShareFullReport,
  onShareExcel,
  onSharePdf,
  trialPitch,
  debugThrow = false,
}: PlanViewProps) {
  if (debugThrow) throw new Error('workflow-v1 plan card')
  const titleId = useId()
  const whyGapsId = useId()
  const whyGuideId = useId()
  const shareMenuId = useId()
  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)
  const shareBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!shareOpen) return
    const onPointer = (event: MouseEvent) => {
      if (!shareRef.current?.contains(event.target as Node)) setShareOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShareOpen(false)
        shareBtnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [shareOpen])

  return (
    <div className="flex flex-col gap-4">
      <article aria-labelledby={titleId} className="px-4 sm:px-5 py-6" style={HERO}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <h2
            id={titleId}
            className="m-0 text-[16px] font-semibold"
            style={{ color: 'var(--text-heading)' }}
          >
            {model.title}
          </h2>
          <button
            type="button"
            onClick={onTune}
            className="inline-flex items-center justify-center min-h-11 px-4 text-[14px] font-semibold rounded-full border bg-transparent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--text-body)', borderColor: 'var(--border-strong)', outlineColor: 'var(--accent-sky)' }}
          >
            Tune the numbers
          </button>
        </div>
        <p
          className="m-0 mb-5 text-[19px] sm:text-[22px] font-medium leading-[1.4]"
          style={{ color: 'var(--text-heading)' }}
        >
          {model.sentence}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              [model.offerPrice, 'Offer price'],
              [model.cashNeeded, 'Cash you bring'],
              [model.monthlyCashFlow, 'Cash flow a month'],
              [model.cashOnCash, 'Cash-on-cash return'],
            ] as const
          ).map(([value, label], index) => (
            <div
              key={label}
              className="rounded-xl px-3 py-3"
              style={
                index === 2 && model.cashFlowNegative
                  ? v1Tile('var(--status-negative)')
                  : V1_CARD
              }
            >
              <div
                className="text-[20px] font-bold leading-tight"
                style={{
                  ...V1_NUM,
                  color:
                    index === 2 && model.cashFlowNegative
                      ? 'var(--status-negative)'
                      : 'var(--text-heading)',
                }}
              >
                {value}
              </div>
              <div
                className="mt-1 text-xs font-bold uppercase tracking-wide"
                style={{ color: 'var(--text-heading)' }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <p className="m-0 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {model.gapLine}
          </p>
          <WhyToggle id={whyGapsId} label="Why two gaps?" text={PLAN_WHY_TWO_GAPS} />
        </div>
      </article>

      <article className="px-4 sm:px-5 py-6" style={CARD}>
        <h2
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold m-0 mb-3"
          style={{ color: 'var(--accent-sky)' }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
          </svg>
          Guide
        </h2>
        <p className="m-0 mb-4 text-[15px] leading-relaxed" style={{ color: 'var(--text-heading)' }}>
          {model.guideText}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center min-h-11 px-5 text-[14px] font-semibold rounded-full border-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)', outlineColor: 'var(--accent-sky)' }}
            onClick={() => {
              if (model.guideApplyKind === 'start') onStartDeal()
              else if (model.guideApplyStructureId) onApply(model.guideApplyStructureId)
            }}
            disabled={model.guideApplyKind === 'start' && startingDeal}
          >
            {model.guideApplyKind === 'start' && startingDeal ? 'Starting…' : model.guideApplyLabel}
          </button>
          <WhyToggle id={whyGuideId} label="Where do these numbers come from?" text={model.guideWhy} />
        </div>
      </article>

      <article className="px-4 sm:px-5 py-6" style={CARD}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="m-0 text-[16px] font-semibold" style={{ color: 'var(--text-heading)' }}>
            Four levers, one blend
          </h2>
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Tap one to apply it
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {model.options.map((option) => (
            <button
              key={option.structureId}
              type="button"
              aria-pressed={option.isApplied}
              onClick={() => onApply(option.structureId)}
              className="text-left rounded-xl px-3 py-3 min-h-11 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: 'var(--surface-card)',
                boxShadow: 'var(--shadow-card)',
                border: option.isApplied
                  ? '2px solid var(--accent-sky)'
                  : '1px solid var(--border-default)',
                outlineColor: 'var(--accent-sky)',
              }}
            >
              <div className="text-[14px] font-semibold" style={{ color: 'var(--text-heading)' }}>
                {option.title}
              </div>
              <div className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                {option.lever}
              </div>
              <div className="mt-2 flex flex-col gap-0.5 text-[13px]" style={{ color: 'var(--text-body)' }}>
                <span className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {option.meetsLabel}
                </span>
                <span style={V1_NUM}>{option.cashFlowLabel}</span>
              </div>
              {option.isBest ? (
                <span
                  className="inline-block mt-2 text-[13px] font-semibold"
                  style={{
                    color: 'var(--accent-sky)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 9999,
                    padding: '2px 8px',
                  }}
                >
                  Guide pick
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="m-0 mt-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {model.optionsFooter}
        </p>
      </article>

      <article className="px-4 sm:px-5 py-6" style={CARD}>
        <h2 className="m-0 mb-3 text-[16px] font-semibold" style={{ color: 'var(--text-heading)' }}>
          Against your targets
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th className="text-left font-medium py-2 pr-3">Measure</th>
                <th className="text-left font-medium py-2 pr-3">This plan</th>
                <th className="text-left font-medium py-2 pr-3">Your target</th>
                <th className="text-left font-medium py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {model.targetRows.map((row) => (
                <tr key={row.measure}>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-body)' }}>
                    {row.measure}
                  </td>
                  <td className="py-2 pr-3" style={{ ...V1_NUM, color: 'var(--text-heading)' }}>
                    {row.plan}
                  </td>
                  <td className="py-2 pr-3" style={{ ...V1_NUM, color: 'var(--text-secondary)' }}>
                    {row.target}
                  </td>
                  <td
                    className="py-2"
                    style={{ color: row.meets ? 'var(--status-positive)' : 'var(--status-negative)' }}
                  >
                    {row.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="px-4 sm:px-5 py-6" style={CARD}>
        <h2 className="m-0 mb-3 text-[16px] font-semibold" style={{ color: 'var(--text-heading)' }}>
          If this closes
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {model.closeCells.map((cell) => (
            <div
              key={cell.caption}
              className="rounded-xl px-3 py-3"
              style={V1_CARD}
            >
              <div className="text-[20px] font-bold leading-tight" style={{ ...V1_NUM, color: 'var(--text-heading)' }}>
                {cell.value}
              </div>
              <div
                className="mt-1 text-xs font-bold uppercase tracking-wide"
                style={{ color: 'var(--text-heading)' }}
              >
                {cell.caption}
              </div>
            </div>
          ))}
        </div>
        <p className="m-0 mt-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {model.sourceLine}
        </p>
      </article>

      <article className="px-4 sm:px-5 py-6" style={CARD}>
        <h2 className="m-0 mb-3 text-[16px] font-semibold" style={{ color: 'var(--text-heading)' }}>
          Next moves
        </h2>
        <ol className="m-0 mb-4 pl-5 text-[15px] leading-relaxed" style={{ color: 'var(--text-body)' }}>
          {model.nextMoves.map((line) => (
            <li key={line} className="mb-2">
              {line}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStartDeal}
            disabled={startingDeal}
            className="inline-flex items-center justify-center min-h-11 px-5 text-[15px] font-semibold rounded-full border-0 cursor-pointer disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)', outlineColor: 'var(--accent-sky)' }}
          >
            {startingDeal ? 'Starting…' : 'Start working this deal'}
          </button>
          <div className="relative" ref={shareRef}>
            <button
              ref={shareBtnRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={shareOpen}
              aria-controls={shareMenuId}
              onClick={() => setShareOpen((prev) => !prev)}
              className="inline-flex items-center justify-center min-h-11 px-5 text-[15px] font-semibold rounded-full border bg-transparent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--text-body)', borderColor: 'var(--border-strong)', outlineColor: 'var(--accent-sky)' }}
            >
              Share
            </button>
            {shareOpen ? (
              <div
                id={shareMenuId}
                role="menu"
                className="absolute left-0 bottom-full mb-2 min-w-[11rem] rounded-xl py-1 z-20 motion-reduce:transition-none transition-opacity duration-150"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {(
                  [
                    ['Full Report', onShareFullReport],
                    ['Download Excel', onShareExcel],
                    ['PDF', onSharePdf],
                  ] as const
                ).map(([label, action]) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShareOpen(false)
                      shareBtnRef.current?.focus()
                      action?.()
                    }}
                    className="block w-full text-left min-h-11 px-4 text-[14px] bg-transparent border-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: 'var(--text-heading)', outlineColor: 'var(--accent-sky)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
      {trialPitch}
    </div>
  )
}
