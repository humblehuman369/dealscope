'use client'

/**
 * Investor Benchmarks table.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import { tw } from '@/components/iq-verdict/verdict-design-tokens'
import { colors } from '../lib/shared'

export interface BenchmarkRow {
  metric: string
  value: string
  target: string
  status: string
}

export function BenchmarksSection({ benchmarks }: { benchmarks: BenchmarkRow[] }) {
  return (
    <section
      className="px-[1px] sm:px-5 py-8 border-t"
      style={{ borderColor: colors.ui.border }}
    >
      <div
        className="w-full rounded-[14px] p-5"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card-hover)',
        }}
      >
        <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>
          Investor Benchmarks
        </p>
        <h2
          className={tw.textHeading}
          style={{ color: colors.text.primary, marginBottom: 6 }}
        >
          How Does This Stack Up?
        </h2>
        <p
          className={tw.textBody}
          style={{ color: colors.text.body, marginBottom: 28, lineHeight: 1.55 }}
        >
          We compare this deal against the numbers experienced investors actually look for.
          Green means this deal meets or beats the benchmark.
        </p>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: colors.ui.border }}>
              <th
                className="text-left text-xs font-bold uppercase tracking-wide py-3"
                style={{ color: 'var(--text-heading)' }}
              >
                Metric
              </th>
              <th
                className="text-left text-xs font-bold uppercase tracking-wide py-3"
                style={{ color: 'var(--text-heading)' }}
              >
                This Deal
              </th>
              <th
                className="text-left text-xs font-bold uppercase tracking-wide py-3"
                style={{ color: 'var(--text-heading)' }}
              >
                Target
              </th>
              <th className="py-3"></th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b, i) => (
              <tr key={i} className="border-b" style={{ borderColor: colors.ui.border }}>
                <td
                  className="py-3 text-sm font-medium"
                  style={{ color: colors.text.primary }}
                >
                  {b.metric}
                </td>
                <td
                  className="py-3 text-sm font-semibold tabular-nums"
                  style={{ color: colors.text.primary }}
                >
                  {b.value}
                </td>
                <td
                  className="py-3 text-sm font-medium tabular-nums"
                  style={{ color: 'var(--text-body)' }}
                >
                  {b.target}
                </td>
                <td className="py-3 text-right">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                    style={{
                      color:
                        b.status === 'good' ? colors.status.positive : colors.status.negative,
                      background:
                        b.status === 'good' ? colors.accentBg.green : colors.accentBg.red,
                    }}
                  >
                    {b.status === 'good' ? 'Good' : 'Below'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
