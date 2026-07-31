'use client'

/**
 * Save CTA — property bookmark + worksheet persistence for the dashboard.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import { tw } from '@/components/iq-verdict/verdict-design-tokens'
import { colors } from '../lib/shared'

export interface SaveCtaSectionProps {
  isAuthenticated: boolean
  isSaved: boolean
  isSaving: boolean
  worksheetDirty: boolean
  isSavingWorksheet: boolean
  savedPropertyId: string | number | null | undefined
  onSave: () => void
  onSaveWorksheet: () => void
  onToggleSaved: () => void
  onRegister: () => void
}

export function SaveCtaSection({
  isAuthenticated,
  isSaved,
  isSaving,
  worksheetDirty,
  isSavingWorksheet,
  savedPropertyId,
  onSave,
  onSaveWorksheet,
  onToggleSaved,
  onRegister,
}: SaveCtaSectionProps) {
  return (
    <section
      className="px-[1px] sm:px-5 py-10 text-center border-t"
      style={{ borderColor: colors.ui.border }}
    >
      <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 12 }}>
        {!isAuthenticated
          ? 'You\u2019ve seen the gap.'
          : isSaved && worksheetDirty
            ? 'Almost there'
            : 'You screened it. You proved it.'}
      </p>
      <h2
        className="text-2xl font-extrabold mb-3"
        style={{ color: colors.text.primary, letterSpacing: '-0.5px', lineHeight: 1.25 }}
      >
        {!isAuthenticated
          ? 'Now see how to close it.'
          : isSaved && worksheetDirty
            ? 'Save Your Worksheet'
            : 'Now Save It.'}
      </h2>
      <p
        className="text-[15px] mb-7 mx-auto max-w-md"
        style={{ color: colors.text.body, lineHeight: 1.6 }}
      >
        {!isAuthenticated
          ? 'A free account unlocks your max offer price, the deal structures that close the gap, and the live worksheet. Pro members go further — with verified cash buyers and hard money lenders to exit the deal.'
          : isSaved && worksheetDirty
            ? 'Your slider changes are not in DealVault yet. Save the worksheet so your dashboard and deal pages reopen with these numbers.'
            : 'Save to your DealVaultIQ and we\u2019ll keep the numbers fresh and alert you if anything changes.'}
      </p>
      {isAuthenticated ? (
        <>
          {!isSaved ? (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: colors.brand.teal }}
            >
              {isSaving ? 'Saving…' : 'Save to DealVaultIQ'}
            </button>
          ) : worksheetDirty ? (
            <button
              type="button"
              onClick={onSaveWorksheet}
              disabled={isSavingWorksheet || !savedPropertyId}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: colors.brand.teal }}
            >
              {isSavingWorksheet ? 'Saving worksheet…' : 'Save worksheet to DealVault'}
            </button>
          ) : (
            <p
              className="text-sm font-semibold mb-4"
              style={{ color: colors.status.positive }}
            >
              Saved to DealVault ✓
            </p>
          )}
          {isSaved && (
            <p className="text-xs mb-4" style={{ color: 'var(--text-body)' }}>
              <a
                href="/dashboard"
                className="font-semibold underline underline-offset-2"
                style={{ color: colors.brand.teal }}
              >
                View in dashboard
              </a>
              {worksheetDirty ? (
                <>
                  {' '}
                  · or{' '}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2"
                    style={{ color: colors.brand.teal }}
                    onClick={onToggleSaved}
                  >
                    remove from DealVault
                  </button>
                </>
              ) : (
                <>
                  {' '}
                  ·{' '}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2"
                    style={{ color: colors.brand.teal }}
                    onClick={onToggleSaved}
                  >
                    remove from DealVault
                  </button>
                </>
              )}
            </p>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onRegister}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-4"
            style={{ background: colors.brand.teal }}
          >
            Show me how to close this deal →
          </button>
          <p className="text-xs" style={{ color: 'var(--text-body)' }}>
            Free forever · No credit card · Takes 30 seconds
          </p>
        </>
      )}
    </section>
  )
}
