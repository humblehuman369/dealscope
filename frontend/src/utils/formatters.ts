// ============================================
// InvestIQ Property Analytics — Canonical Formatters
// ============================================
//
// THIS IS THE SINGLE SOURCE OF TRUTH for all formatting.
// Do NOT define local formatPrice / formatCurrency / formatPercent /
// formatCompact / formatNumber functions in components.
// Import from '@/utils/formatters' instead.
//

/**
 * Format number as currency (e.g., 350000 → "$350,000")
 */
export const formatCurrency = (
  value: number,
  options?: {
    decimals?: number;
    compact?: boolean;
    showSign?: boolean;
  }
): string => {
  const { decimals = 0, compact = false, showSign = false } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    const absValue = Math.abs(value);
    let formatted: string;
    
    if (absValue >= 1000000) {
      formatted = `$${(absValue / 1000000).toFixed(1)}M`;
    } else {
      formatted = `$${(absValue / 1000).toFixed(0)}K`;
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
};

/**
 * Format number as percentage
 */
export const formatPercent = (
  value: number,
  options?: {
    decimals?: number;
    showSign?: boolean;
  }
): string => {
  const { decimals = 1, showSign = false } = options || {};
  
  const formatted = `${Math.abs(value).toFixed(decimals)}%`;
  
  if (value < 0) return `-${formatted}`;
  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
};

/**
 * Format number with commas
 */
export const formatNumber = (
  value: number,
  options?: {
    decimals?: number;
    compact?: boolean;
  }
): string => {
  const { decimals = 0, compact = false } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    return `${(value / 1000).toFixed(0)}K`;
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format decimal (like DSCR)
 */
export const formatDecimal = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

/**
 * Format date
 */
export const formatDate = (
  date: Date | string,
  options?: {
    format?: 'short' | 'medium' | 'long';
  }
): string => {
  const { format = 'medium' } = options || {};
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'numeric', year: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    default:
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
};

/**
 * Format years/months duration
 */
export const formatDuration = (months: number): string => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} years`;
  return `${years}y ${remainingMonths}m`;
};

/**
 * Format slider value based on type
 */
export const formatSliderValue = (
  value: number,
  format: 'currency' | 'percentage' | 'decimal' | 'years'
): string => {
  switch (format) {
    case 'currency':
      return formatCurrency(value, { compact: value >= 10000 });
    case 'percentage':
      return formatPercent(value);
    case 'decimal':
      return formatDecimal(value);
    case 'years':
      return `${value} yrs`;
    default:
      return String(value);
  }
};

/**
 * Format impact value (for sliders showing +/- cash flow)
 */
export const formatImpact = (value: number): string => {
  if (value === 0) return '$0/mo';
  const sign = value > 0 ? '+' : '-';
  return `${sign}$${Math.abs(Math.round(value))}/mo`;
};

/**
 * Format address for display
 */
export const formatAddress = (
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  },
  options?: {
    format?: 'short' | 'full';
  }
): string => {
  const { format = 'short' } = options || {};

  if (format === 'full') {
    return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  }

  return address.street;
};

/**
 * Parse address string into components
 * Handles formats like:
 * - "123 Main St, Austin, TX 78701"
 * - "123 Main St, Austin, TX"
 * - "123 Main St, Austin TX 78701"
 * - "123 Main St"
 * 
 * This is the canonical address parser - use this everywhere to avoid
 * inconsistent parsing that loses city/state/zip data.
 */
export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export const parseAddressString = (addressString: string): ParsedAddress => {
  if (!addressString) {
    return { street: '', city: '', state: '', zip: '' };
  }

  // Decode URI component in case it's URL encoded
  const decoded = decodeURIComponent(addressString).trim();
  
  // Split by comma to get parts
  const parts = decoded.split(',').map(p => p.trim()).filter(Boolean);
  
  if (parts.length === 0) {
    return { street: decoded, city: '', state: '', zip: '' };
  }

  // First part is always the street
  const street = parts[0];
  
  if (parts.length === 1) {
    // Only street address provided
    return { street, city: '', state: '', zip: '' };
  }

  if (parts.length === 2) {
    // Format: "street, city state zip" OR "street, city"
    const lastPart = parts[1];
    
    // Try to extract state and zip from the last part
    // Pattern: "Austin TX 78701" or "Austin, TX 78701" or "TX 78701" or just "Austin"
    const stateZipMatch = lastPart.match(/^(.+?)\s+([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i);
    
    if (stateZipMatch) {
      // Found pattern like "Austin TX 78701"
      return {
        street,
        city: stateZipMatch[1].trim(),
        state: stateZipMatch[2].toUpperCase(),
        zip: stateZipMatch[3] || '',
      };
    }
    
    // Try pattern without city: "TX 78701"
    const stateZipOnlyMatch = lastPart.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i);
    if (stateZipOnlyMatch) {
      return {
        street,
        city: '',
        state: stateZipOnlyMatch[1].toUpperCase(),
        zip: stateZipOnlyMatch[2] || '',
      };
    }
    
    // Just city name
    return { street, city: lastPart, state: '', zip: '' };
  }

  // parts.length >= 3
  // Format: "street, city, state zip" (most common from our app)
  const city = parts[1];
  const stateZipPart = parts.slice(2).join(', ').trim();
  
  // Parse state and zip from "TX 78701" or "TX" or "78701"
  const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i);
  
  if (stateZipMatch) {
    return {
      street,
      city,
      state: stateZipMatch[1].toUpperCase(),
      zip: stateZipMatch[2] || '',
    };
  }
  
  // Maybe it's just a zip code
  const zipOnlyMatch = stateZipPart.match(/^(\d{5}(?:-\d{4})?)$/);
  if (zipOnlyMatch) {
    return { street, city, state: '', zip: zipOnlyMatch[1] };
  }
  
  // Couldn't parse state/zip, treat everything after city as state
  return { street, city, state: stateZipPart, zip: '' };
};

/**
 * Pluralize a word
 */
export const pluralize = (count: number, singular: string, plural?: string): string => {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
};

/**
 * Format large number with abbreviation
 */
export const abbreviateNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(Math.round(value));
};

/**
 * Format ordinal number (1st, 2nd, 3rd, etc.)
 */
export const formatOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Round to specified precision
 */
export const roundTo = (value: number, precision: number): number => {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
};

/**
 * Format metric value based on metric type
 */
export const formatMetricValue = (
  value: number,
  metricType: 'cashFlow' | 'cashOnCash' | 'capRate' | 'dscr' | 'onePercent' | 'currency' | 'percentage'
): string => {
  switch (metricType) {
    case 'cashFlow':
      return formatCurrency(value);
    case 'cashOnCash':
    case 'capRate':
    case 'onePercent':
    case 'percentage':
      return formatPercent(value);
    case 'dscr':
      return formatDecimal(value, 2);
    case 'currency':
      return formatCurrency(value);
    default:
      return String(value);
  }
};

/**
 * Get color based on value relative to benchmark
 */
export const getValueColor = (
  value: number,
  benchmark: number,
  comparison: 'above' | 'below' | 'between',
  upperBenchmark?: number
): 'success' | 'warning' | 'error' | 'neutral' => {
  switch (comparison) {
    case 'above':
      if (value >= benchmark) return 'success';
      if (value >= benchmark * 0.7) return 'warning';
      return 'error';
    case 'below':
      if (value <= benchmark) return 'success';
      if (value <= benchmark * 1.3) return 'warning';
      return 'error';
    case 'between':
      if (upperBenchmark && value >= benchmark && value <= upperBenchmark) return 'success';
      return 'warning';
    default:
      return 'neutral';
  }
};

// ============================================
// Convenience Aliases
// ============================================
// These match the most common local function names found
// across the codebase. Import these instead of redefining.

/**
 * Alias for formatCurrency — matches the common `formatPrice` name
 * used in 40+ components.
 */
export const formatPrice = (value: number, decimals = 0): string =>
  formatCurrency(value, { decimals });

/**
 * Compact currency (e.g., 1500000 → "$1.5M", 250000 → "$250K")
 * Matches the common `formatCompact` / `formatCompactCurrency` pattern.
 */
export const formatCompactCurrency = (value: number): string =>
  formatCurrency(value, { compact: true });

/**
 * Format a decimal ratio as a percentage.
 * Many components pass a ratio (0.085) and expect "8.5%".
 * The base `formatPercent` expects a value already in percentage form (8.5).
 * Use this when your value is a ratio (0–1 scale).
 */
export const formatRatioAsPercent = (
  ratio: number,
  options?: { decimals?: number; showSign?: boolean }
): string => {
  const { decimals = 1, showSign = false } = options || {};
  return formatPercent(ratio * 100, { decimals, showSign });
};

/**
 * Safe currency formatter that handles null/undefined (returns "—")
 */
export const formatCurrencySafe = (
  value: number | null | undefined,
  options?: { decimals?: number; compact?: boolean }
): string => {
  if (value == null) return '—';
  return formatCurrency(value, options);
};

/**
 * Safe number formatter that handles null/undefined (returns "—")
 */
export const formatNumberSafe = (
  value: number | null | undefined,
  options?: { decimals?: number }
): string => {
  if (value == null) return '—';
  return formatNumber(value, options);
};
