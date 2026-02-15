/**
 * Re-exports from canonical utils/formatters.ts
 *
 * Kept for backward compatibility with existing imports.
 * New code should import directly from 'utils/formatters'.
 */
export {
  formatCurrency,
  formatCompact,
  formatPercent,
  formatDecimal,
  formatWithSign,
  formatMonthly,
  formatYears,
  formatMonths,
  formatSliderValue,
  formatDate,
  formatShortDate,
  getValueColor,
  getBenchmarkColor,
  formatChange,
  abbreviateNumber,
  formatDecimalAsPercent,
} from '../../utils/formatters';
