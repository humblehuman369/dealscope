/**
 * Property Analytics Formatters
 * Consistent formatting utilities
 */

/**
 * Format as currency ($123,456)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format as compact currency ($123K, $1.2M)
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return formatCurrency(value);
}

/**
 * Format as percentage (12.5%)
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format as decimal (1.25)
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format number with sign (+$500, -$200)
 */
export function formatWithSign(value: number, formatter: (v: number) => string = formatCurrency): string {
  const formatted = formatter(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format as currency per month ($2,500/mo)
 */
export function formatMonthly(value: number): string {
  return `${formatCurrency(value)}/mo`;
}

/**
 * Format as years (30 yrs)
 */
export function formatYears(value: number): string {
  return `${value} yrs`;
}

/**
 * Format as months (6 mo)
 */
export function formatMonths(value: number): string {
  return `${value} mo`;
}

/**
 * Format slider value based on type
 */
export function formatSliderValue(
  value: number,
  format: 'currency' | 'percentage' | 'years' | 'months' | 'decimal'
): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercent(value * 100);
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

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format short date
 */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Get color for value (green for positive, red for negative)
 */
export function getValueColor(value: number, isDark: boolean = true): string {
  if (value > 0) return '#22c55e'; // success green
  if (value < 0) return '#ef4444'; // error red
  return isDark ? '#ffffff' : '#07172e'; // neutral
}

/**
 * Get benchmark color (green if meets, orange if not)
 */
export function getBenchmarkColor(
  value: number,
  threshold: number,
  comparison: 'above' | 'below' = 'above'
): string {
  const meets = comparison === 'above' ? value >= threshold : value <= threshold;
  return meets ? '#22c55e' : '#f97316';
}

/**
 * Format percentage change with color indicator
 */
export function formatChange(current: number, base: number): {
  text: string;
  color: string;
  isPositive: boolean;
} {
  if (base === 0) return { text: '-', color: '#6b7280', isPositive: false };
  
  const change = ((current - base) / base) * 100;
  const isPositive = change > 0;
  
  return {
    text: `${isPositive ? '+' : ''}${change.toFixed(0)}%`,
    color: isPositive ? '#22c55e' : change < 0 ? '#ef4444' : '#6b7280',
    isPositive,
  };
}

/**
 * Format large numbers with abbreviation
 */
export function abbreviateNumber(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

