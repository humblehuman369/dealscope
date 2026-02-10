'use client'

import { TaxHistoryItem } from './types'
import { formatCurrency } from './utils'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

interface TaxHistoryProps {
  history: TaxHistoryItem[]
}

/**
 * TaxHistory Component
 * 
 * Table display of property tax history. Tax paid uses red (expense/negative),
 * all financial columns use tabular-nums for clean column alignment.
 */
export function TaxHistory({ history }: TaxHistoryProps) {
  const cardStyle = {
    backgroundColor: colors.background.card,
    border: `1px solid ${colors.ui.border}`,
    boxShadow: colors.shadow.card,
  }

  if (!history || history.length === 0) {
    return (
      <div className="rounded-[14px] p-5" style={cardStyle}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
          Tax History
        </div>
        <p className="text-sm text-center py-4" style={{ color: colors.text.tertiary }}>
          No tax history available
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
        Tax History
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.ui.border}` }}>
              <th className="text-left py-2 text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: colors.text.tertiary }}>
                Year
              </th>
              <th className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: colors.text.tertiary }}>
                Tax Paid
              </th>
              <th className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: colors.text.tertiary }}>
                Assessed Value
              </th>
              <th className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: colors.text.tertiary }}>
                Land
              </th>
              <th className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: colors.text.tertiary }}>
                Improvements
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${colors.ui.border}` }}>
                <td className="py-3 text-sm font-semibold" style={{ color: colors.text.primary }}>
                  {item.year}
                </td>
                <td
                  className="py-3 text-sm font-semibold text-right"
                  style={{ color: colors.status.negative, fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCurrency(item.taxPaid)}
                </td>
                <td
                  className="py-3 text-sm text-right"
                  style={{ color: colors.text.body, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                >
                  {formatCurrency(item.assessedValue)}
                </td>
                <td
                  className="py-3 text-sm text-right"
                  style={{ color: colors.text.body, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                >
                  {item.landValue ? formatCurrency(item.landValue) : 'N/A'}
                </td>
                <td
                  className="py-3 text-sm text-right"
                  style={{ color: colors.text.body, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                >
                  {item.improvementValue ? formatCurrency(item.improvementValue) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * TaxHistorySkeleton
 * Loading state for the tax history
 */
export function TaxHistorySkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: colors.background.card, border: `1px solid ${colors.ui.border}` }}
    >
      <div className="h-3 w-20 rounded animate-pulse mb-4" style={{ backgroundColor: colors.background.cardUp }} />
      <div className="space-y-3">
        <div className="flex justify-between pb-2" style={{ borderBottom: `1px solid ${colors.ui.border}` }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
