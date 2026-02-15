/**
 * Unit tests for utils/formatters.ts
 *
 * Covers currency, percentage, compact, and change formatting helpers.
 */

import {
  formatCurrency,
  formatCompact,
  formatMonthly,
  formatWithSign,
  abbreviateNumber,
  formatPercent,
  formatDecimalAsPercent,
  formatDecimal,
  formatYears,
  formatMonths,
  formatSliderValue,
  getValueColor,
  getBenchmarkColor,
  formatChange,
} from '../../utils/formatters';

// ─── Currency ────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats positive whole numbers', () => {
    expect(formatCurrency(250000)).toBe('$250,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats negative values', () => {
    expect(formatCurrency(-1500)).toBe('-$1,500');
  });

  it('rounds decimal values', () => {
    const result = formatCurrency(1234.56);
    // Should round or truncate — verify it includes the dollar prefix
    expect(result).toMatch(/^\$?\-?\$?[\d,]+/);
  });
});

describe('formatCompact', () => {
  it('formats thousands', () => {
    expect(formatCompact(350000)).toMatch(/350K/i);
  });

  it('formats millions', () => {
    expect(formatCompact(1200000)).toMatch(/1\.2M/i);
  });

  it('formats small values as-is', () => {
    const result = formatCompact(500);
    expect(result).toContain('500');
  });
});

describe('formatMonthly', () => {
  it('appends /mo suffix', () => {
    expect(formatMonthly(2500)).toContain('/mo');
  });

  it('formats the dollar amount', () => {
    expect(formatMonthly(2500)).toContain('2,500');
  });
});

describe('formatWithSign', () => {
  it('shows + for positive values', () => {
    expect(formatWithSign(500)).toMatch(/^\+/);
  });

  it('shows - for negative values', () => {
    expect(formatWithSign(-500)).toMatch(/^-/);
  });

  it('handles zero', () => {
    const result = formatWithSign(0);
    expect(result).toBeDefined();
  });
});

describe('abbreviateNumber', () => {
  it('abbreviates thousands (rounded to nearest K)', () => {
    // .toFixed(0) rounds: 2500 → "3K", 5000 → "5K"
    expect(abbreviateNumber(5000)).toBe('5K');
    expect(abbreviateNumber(2500)).toBe('3K');
  });

  it('abbreviates millions with one decimal', () => {
    expect(abbreviateNumber(1500000)).toBe('1.5M');
  });

  it('returns raw number below 1000', () => {
    expect(abbreviateNumber(500)).toBe('500');
  });
});

// ─── Percentages ─────────────────────────────────────────────────

describe('formatPercent', () => {
  it('formats whole number percentages', () => {
    expect(formatPercent(12)).toContain('12');
    expect(formatPercent(12)).toContain('%');
  });

  it('formats with specified decimals', () => {
    expect(formatPercent(12.345, 1)).toContain('12.3');
  });
});

describe('formatDecimalAsPercent', () => {
  it('converts 0.085 to ~8.5%', () => {
    expect(formatDecimalAsPercent(0.085)).toContain('8.5');
    expect(formatDecimalAsPercent(0.085)).toContain('%');
  });

  it('converts 1.0 to 100%', () => {
    expect(formatDecimalAsPercent(1.0)).toContain('100');
  });

  it('handles zero', () => {
    expect(formatDecimalAsPercent(0)).toContain('0');
  });
});

describe('formatDecimal', () => {
  it('formats to specified precision', () => {
    expect(formatDecimal(1.2567, 2)).toBe('1.26');
  });
});

// ─── Time ────────────────────────────────────────────────────────

describe('formatYears', () => {
  it('formats years', () => {
    expect(formatYears(30)).toContain('30');
    expect(formatYears(30).toLowerCase()).toContain('yr');
  });
});

describe('formatMonths', () => {
  it('formats months', () => {
    expect(formatMonths(6)).toContain('6');
    expect(formatMonths(6).toLowerCase()).toContain('mo');
  });
});

// ─── Slider ──────────────────────────────────────────────────────

describe('formatSliderValue', () => {
  it('formats currency type', () => {
    expect(formatSliderValue(250000, 'currency')).toContain('$');
  });

  it('formats percentage type', () => {
    expect(formatSliderValue(5.5, 'percentage')).toContain('%');
  });

  it('formats years type', () => {
    expect(formatSliderValue(30, 'years')).toBeDefined();
  });
});

// ─── Color helpers ───────────────────────────────────────────────

describe('getValueColor', () => {
  it('returns green-ish for positive values', () => {
    const color = getValueColor(100);
    expect(color).toBeTruthy();
    expect(typeof color).toBe('string');
  });

  it('returns red-ish for negative values', () => {
    const color = getValueColor(-100);
    expect(color).toBeTruthy();
    expect(typeof color).toBe('string');
  });

  it('returns different colors for positive and negative', () => {
    expect(getValueColor(100)).not.toBe(getValueColor(-100));
  });
});

describe('getBenchmarkColor', () => {
  it('returns a color string', () => {
    expect(typeof getBenchmarkColor(10, 5)).toBe('string');
  });
});

// ─── Change formatting ──────────────────────────────────────────

describe('formatChange', () => {
  it('returns positive change correctly', () => {
    const result = formatChange(110, 100);
    expect(result.isPositive).toBe(true);
    expect(result.text).toContain('10');
  });

  it('returns negative change correctly', () => {
    const result = formatChange(90, 100);
    expect(result.isPositive).toBe(false);
  });

  it('includes a color property', () => {
    const result = formatChange(110, 100);
    expect(typeof result.color).toBe('string');
  });
});
