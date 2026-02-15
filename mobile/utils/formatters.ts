/**
 * Canonical formatting utilities — matches frontend/src/utils/formatters.ts
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for all formatting.
 * Import from 'utils/formatters' — do NOT duplicate in services or components.
 */

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Format number as currency ($123,456).
 *
 * Accepts an optional second argument:
 * - Omit for default 0-decimal formatting (backward-compatible)
 * - Pass an options object to control decimals, compact mode, and sign
 *
 * Matches frontend `formatCurrency(value, { decimals, compact, showSign })`.
 */
export function formatCurrency(
  value: number,
  options?: {
    decimals?: number;
    compact?: boolean;
    showSign?: boolean;
  },
): string {
  const { decimals = 0, compact = false, showSign = false } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    const absValue = Math.abs(value);
    let formatted: string;

    if (absValue >= 1_000_000) {
      formatted = `$${(absValue / 1_000_000).toFixed(1)}M`;
    } else {
      formatted = `$${(absValue / 1_000).toFixed(0)}K`;
    }

    if (value < 0) formatted = `-${formatted}`;
    else if (showSign && value > 0) formatted = `+${formatted}`;
    return formatted;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  if (value < 0) return `-${formatted}`;
  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
}

/** Format as compact currency ($123K, $1.2M) */
export function formatCompact(value: number): string {
  return formatCurrency(value, { compact: true });
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
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}

// ─── Percentages ─────────────────────────────────────────────────────────────

/**
 * Format a percentage value for display (12.5%).
 * Expects the value as a whole number (12.5), NOT a decimal (0.125).
 *
 * Second argument can be a number (backward-compatible decimals) or
 * an options object matching the frontend signature.
 */
export function formatPercent(
  value: number,
  optionsOrDecimals?: number | { decimals?: number; showSign?: boolean },
): string {
  let decimals = 1;
  let showSign = false;

  if (typeof optionsOrDecimals === 'number') {
    decimals = optionsOrDecimals;
  } else if (optionsOrDecimals) {
    decimals = optionsOrDecimals.decimals ?? 1;
    showSign = optionsOrDecimals.showSign ?? false;
  }

  const formatted = `${Math.abs(value).toFixed(decimals)}%`;
  if (value < 0) return `-${formatted}`;
  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
}

/**
 * Format a decimal ratio as a percentage (0.125 → "12.5%").
 * Use this when the source value is a decimal (e.g. API returns 0.08 for 8%).
 * Alias: formatRatioAsPercent (matches frontend naming).
 */
export function formatDecimalAsPercent(value: number, decimals: number = 1): string {
  return formatPercent(value * 100, decimals);
}

/** Alias matching frontend naming convention */
export const formatRatioAsPercent = (
  ratio: number,
  options?: { decimals?: number; showSign?: boolean },
): string => {
  const { decimals = 1, showSign = false } = options || {};
  return formatPercent(ratio * 100, { decimals, showSign });
};

/** Format as decimal (1.25) */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format number with commas (matches frontend formatNumber).
 */
export function formatNumber(
  value: number,
  options?: { decimals?: number; compact?: boolean },
): string {
  const { decimals = 0, compact = false } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    return `${(value / 1_000).toFixed(0)}K`;
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
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

/**
 * Format years/months duration (matches frontend formatDuration).
 * 18 → "1y 6m", 12 → "1 years", 3 → "3 months"
 */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} years`;
  return `${years}y ${remainingMonths}m`;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/**
 * Format date for display.
 * Accepts optional format: 'short' | 'medium' | 'long' (matches frontend).
 */
export function formatDate(
  date: Date | string,
  options?: { format?: 'short' | 'medium' | 'long' },
): string {
  const { format = 'medium' } = options || {};
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'numeric', year: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    default:
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}

/** Format short date (Jan 14) */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

// ─── Address ─────────────────────────────────────────────────────────────────

/**
 * Format address for display (matches frontend formatAddress).
 */
export function formatAddress(
  address: { street: string; city: string; state: string; zip: string },
  options?: { format?: 'short' | 'full' },
): string {
  const { format = 'short' } = options || {};
  if (format === 'full') {
    return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  }
  return address.street;
}

/**
 * Parse an address string into components (matches frontend parseAddressString).
 * Handles: "123 Main St, Austin, TX 78701" and many variant formats.
 */
export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export function parseAddressString(addressString: string): ParsedAddress {
  if (!addressString) return { street: '', city: '', state: '', zip: '' };

  const decoded = decodeURIComponent(addressString).trim();
  const parts = decoded.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) return { street: decoded, city: '', state: '', zip: '' };

  const street = parts[0];

  if (parts.length === 1) return { street, city: '', state: '', zip: '' };

  if (parts.length === 2) {
    const lastPart = parts[1];
    const stateZipMatch = lastPart.match(
      /^(.+?)\s+([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i,
    );
    if (stateZipMatch) {
      return {
        street,
        city: stateZipMatch[1].trim(),
        state: stateZipMatch[2].toUpperCase(),
        zip: stateZipMatch[3] || '',
      };
    }
    const stateZipOnlyMatch = lastPart.match(
      /^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i,
    );
    if (stateZipOnlyMatch) {
      return {
        street,
        city: '',
        state: stateZipOnlyMatch[1].toUpperCase(),
        zip: stateZipOnlyMatch[2] || '',
      };
    }
    return { street, city: lastPart, state: '', zip: '' };
  }

  // parts.length >= 3
  const city = parts[1];
  const stateZipPart = parts.slice(2).join(', ').trim();
  const stateZipMatch = stateZipPart.match(
    /^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i,
  );
  if (stateZipMatch) {
    return {
      street,
      city,
      state: stateZipMatch[1].toUpperCase(),
      zip: stateZipMatch[2] || '',
    };
  }
  const zipOnlyMatch = stateZipPart.match(/^(\d{5}(?:-\d{4})?)$/);
  if (zipOnlyMatch) return { street, city, state: '', zip: zipOnlyMatch[1] };
  return { street, city, state: stateZipPart, zip: '' };
}

// ─── Slider ──────────────────────────────────────────────────────────────────

/**
 * Format slider value based on type.
 * Percentage values are expected as whole-number percentages (e.g. 7.25 for 7.25 %),
 * matching the frontend convention. No multiplication is needed.
 */
export function formatSliderValue(
  value: number,
  format: 'currency' | 'percentage' | 'years' | 'months' | 'decimal',
): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value, { compact: value >= 10_000 });
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

/**
 * Format impact value for sliders showing +/- cash flow (matches frontend).
 */
export function formatImpact(value: number): string {
  if (value === 0) return '$0/mo';
  const sign = value > 0 ? '+' : '-';
  return `${sign}$${Math.abs(Math.round(value))}/mo`;
}

// ─── Metric Formatting ──────────────────────────────────────────────────────

/**
 * Format metric value based on metric type (matches frontend).
 */
export function formatMetricValue(
  value: number,
  metricType:
    | 'cashFlow'
    | 'cashOnCash'
    | 'capRate'
    | 'dscr'
    | 'onePercent'
    | 'currency'
    | 'percentage',
): string {
  switch (metricType) {
    case 'cashFlow':
    case 'currency':
      return formatCurrency(value);
    case 'cashOnCash':
    case 'capRate':
    case 'onePercent':
    case 'percentage':
      return formatPercent(value);
    case 'dscr':
      return formatDecimal(value, 2);
    default:
      return String(value);
  }
}

// ─── Safe Formatters (null-tolerant) ────────────────────────────────────────

/** Safe currency formatter — returns "—" for null/undefined (matches frontend). */
export function formatCurrencySafe(
  value: number | null | undefined,
  options?: { decimals?: number; compact?: boolean },
): string {
  if (value == null) return '—';
  return formatCurrency(value, options);
}

/** Safe number formatter — returns "—" for null/undefined. */
export function formatNumberSafe(
  value: number | null | undefined,
  options?: { decimals?: number },
): string {
  if (value == null) return '—';
  return formatNumber(value, options);
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
  const meets =
    comparison === 'above' ? value >= threshold : value <= threshold;
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

// ─── Utility Functions ──────────────────────────────────────────────────────

/** Clamp a value between min and max (matches frontend). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to specified precision (matches frontend). */
export function roundTo(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/** Pluralize a word (matches frontend). */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}

/** Format ordinal number — 1st, 2nd, 3rd, etc. (matches frontend). */
export function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Convenience Aliases (match frontend naming) ────────────────────────────

/** Alias for formatCurrency — matches the common `formatPrice` name. */
export const formatPrice = (value: number, decimals = 0): string =>
  formatCurrency(value, { decimals });

/** Compact currency alias (matches frontend `formatCompactCurrency`). */
export const formatCompactCurrency = (value: number): string =>
  formatCurrency(value, { compact: true });
