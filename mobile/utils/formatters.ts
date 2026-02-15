/**
 * Canonical formatting utilities.
 *
 * All number / currency / date formatting lives here.
 * Import from 'utils/formatters' — do NOT duplicate in services or components.
 */

// ─── Currency ────────────────────────────────────────────────────────────────

/** Format as currency ($123,456) */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format as compact currency ($123K, $1.2M) */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }
  return formatCurrency(value);
}

/** Format as currency per month ($2,500/mo) */
export function formatMonthly(value: number): string {
  return `${formatCurrency(value)}/mo`;
}

/** Format number with sign (+$500, -$200) */
export function formatWithSign(
  value: number,
  formatter: (v: number) => string = formatCurrency,
): string {
  const formatted = formatter(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/** Format large numbers with abbreviation (no $ prefix) */
export function abbreviateNumber(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

// ─── Percentages ─────────────────────────────────────────────────────────────

/**
 * Format a percentage value for display (12.5%).
 * Expects the value as a whole number (12.5), NOT a decimal (0.125).
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a decimal ratio as a percentage (0.125 → "12.5%").
 * Use this when the source value is a decimal (e.g. API returns 0.08 for 8%).
 */
export function formatDecimalAsPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format as decimal (1.25) */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

// ─── Time ────────────────────────────────────────────────────────────────────

/** Format as years (30 yrs) */
export function formatYears(value: number): string {
  return `${value} yrs`;
}

/** Format as months (6 mo) */
export function formatMonths(value: number): string {
  return `${value} mo`;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Format date for display (January 2026) */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Format short date (Jan 14) */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// ─── Slider ──────────────────────────────────────────────────────────────────

/**
 * Format slider value based on type.
 *
 * Percentage values are expected as whole-number percentages (e.g. 7.25 for 7.25 %),
 * matching the frontend convention. No multiplication is needed.
 */
export function formatSliderValue(
  value: number,
  format: 'currency' | 'percentage' | 'years' | 'months' | 'decimal',
): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercent(value);
    case 'years':
      return formatYears(value);
    case 'months':
      return formatMonths(value);
    case 'decimal':
      return formatDecimal(value);
    default:
      return value.toString();
  }
}

// ─── Colors ──────────────────────────────────────────────────────────────────

/** Get color for value (green for positive, red for negative) */
export function getValueColor(value: number, isDark: boolean = true): string {
  if (value > 0) return '#22c55e';
  if (value < 0) return '#ef4444';
  return isDark ? '#ffffff' : '#07172e';
}

/** Get benchmark color (green if meets threshold, orange if not) */
export function getBenchmarkColor(
  value: number,
  threshold: number,
  comparison: 'above' | 'below' = 'above',
): string {
  const meets = comparison === 'above' ? value >= threshold : value <= threshold;
  return meets ? '#22c55e' : '#f97316';
}

/** Format percentage change with color indicator */
export function formatChange(
  current: number,
  base: number,
): { text: string; color: string; isPositive: boolean } {
  if (base === 0) return { text: '-', color: '#6b7280', isPositive: false };
  const change = ((current - base) / base) * 100;
  const isPositive = change > 0;
  return {
    text: `${isPositive ? '+' : ''}${change.toFixed(0)}%`,
    color: isPositive ? '#22c55e' : change < 0 ? '#ef4444' : '#6b7280',
    isPositive,
  };
}
