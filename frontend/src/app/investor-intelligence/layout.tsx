import type { ReactNode } from 'react'
import Link from 'next/link'
import { investorIntelligenceNav } from '@/lib/investorIntelligence'

export default function InvestorIntelligenceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)]">
      <div className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[color:var(--surface-base)]/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-5 px-4 sm:px-6">
          <Link href="/investor-intelligence/" className="shrink-0 leading-none hover:no-underline">
            <span className="block font-bold tracking-tight text-[var(--text-heading)]">
              DealGap<span className="text-[var(--accent-sky)]">IQ</span>
            </span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text-label)]">
              Investor Intelligence
            </span>
          </Link>
          <nav
            className="ml-auto flex gap-5 overflow-x-auto py-4 text-sm text-[var(--text-secondary)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Investor Intelligence sections"
          >
            {investorIntelligenceNav.map((item) => (
              <Link key={item.label} href={item.href} className="whitespace-nowrap hover:text-[var(--accent-sky)]">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-section)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_2fr]">
          <div>
            <div className="font-bold text-[var(--text-heading)]">
              DealGap<span className="text-[var(--accent-sky)]">IQ</span>
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-label)]">
              Investor Intelligence
            </div>
            <p className="mt-4 max-w-sm text-sm text-[var(--text-secondary)]">
              Residential real estate research, data, analysis, and property-level investment intelligence.
            </p>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.12em] text-[var(--accent-sky)]">
              Find the gap. Find the deal.
            </p>
          </div>
          <nav className="flex flex-wrap content-start gap-x-5 gap-y-3 text-sm text-[var(--text-secondary)]" aria-label="Investor Intelligence footer">
            {investorIntelligenceNav.map((item) => (
              <Link key={item.label} href={item.href} className="hover:text-[var(--accent-sky)]">
                {item.label}
              </Link>
            ))}
            <Link href="/methodology" className="hover:text-[var(--accent-sky)]">Methodology</Link>
            <Link href="/about" className="hover:text-[var(--accent-sky)]">About DealGapIQ</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-10 text-xs leading-relaxed text-[var(--text-muted)] sm:px-6">
          Educational and informational only. DealGapIQ Investor Intelligence is not financial, legal, or tax advice. Property analysis reflects user-supplied and third-party data and assumptions. Verify every number independently before making an investment decision.
        </div>
      </footer>
    </div>
  )
}
