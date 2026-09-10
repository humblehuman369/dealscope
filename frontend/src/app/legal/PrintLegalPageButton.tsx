'use client'

export function PrintLegalPageButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-heading)] hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
    >
      Print or save as PDF
    </button>
  )
}
