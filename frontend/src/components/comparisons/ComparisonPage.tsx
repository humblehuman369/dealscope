import type { Metadata } from 'next'
import Link from 'next/link'
import { FaqJsonLd } from '@/components/seo/FaqJsonLd'
import type { FaqItem } from '@/lib/seo/metadata'

export type ComparisonPageConfig = {
  slug: string
  competitor: string
  metadata: Metadata
  headline: string
  summary: string
  dealgapiqStrengths: string[]
  competitorStrengths: string[]
  whenToUse: { dealgapiq: string; competitor: string }
  faq: FaqItem[]
}

export function ComparisonPage({ config }: { config: ComparisonPageConfig }) {
  return (
    <main className="min-h-screen bg-[var(--surface-base)] px-6 py-16 text-[var(--text-body)]">
      <FaqJsonLd items={config.faq} />
      <article className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--accent-sky)]">
          Comparisons
        </p>
        <h1 className="mb-6 text-3xl font-bold text-[var(--text-heading)] md:text-4xl">
          {config.headline}
        </h1>
        <p className="mb-10 text-lg leading-relaxed text-[var(--text-secondary)]">{config.summary}</p>

        <section className="mb-10 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
          <h2 className="mb-4 text-xl font-bold text-[var(--text-heading)]">Where DealGapIQ wins</h2>
          <ul className="list-disc space-y-2 pl-5">
            {config.dealgapiqStrengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
          <h2 className="mb-4 text-xl font-bold text-[var(--text-heading)]">
            Where {config.competitor} fits
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            {config.competitorStrengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
            <h3 className="mb-2 font-bold text-[var(--text-heading)]">Choose DealGapIQ when</h3>
            <p className="text-sm leading-relaxed">{config.whenToUse.dealgapiq}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
            <h3 className="mb-2 font-bold text-[var(--text-heading)]">Choose {config.competitor} when</h3>
            <p className="text-sm leading-relaxed">{config.whenToUse.competitor}</p>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/pricing"
            className="rounded-2xl bg-[var(--accent-sky)] px-6 py-3 text-sm font-bold text-[var(--text-inverse)]"
          >
            See pricing
          </Link>
          <Link
            href="/discovery"
            className="rounded-2xl border border-[var(--border-default)] px-6 py-3 text-sm font-bold text-[var(--text-heading)]"
          >
            Run Discovery free
          </Link>
        </div>

        <nav className="mt-12 border-t border-[var(--border-default)] pt-8 text-sm">
          <p className="mb-3 font-semibold text-[var(--text-muted)]">More comparisons</p>
          <div className="flex flex-wrap gap-4">
            {[
              { href: '/comparisons/dealgapiq-vs-dealcheck', label: 'vs DealCheck' },
              { href: '/comparisons/dealgapiq-vs-mashvisor', label: 'vs Mashvisor' },
              { href: '/comparisons/dealgapiq-vs-propstream', label: 'vs PropStream' },
            ]
              .filter((link) => link.href !== `/comparisons/${config.slug}`)
              .map((link) => (
                <Link key={link.href} href={link.href} className="text-[var(--accent-sky)] hover:underline">
                  {link.label}
                </Link>
              ))}
          </div>
        </nav>
      </article>
    </main>
  )
}
