/**
 * Unit tests for services/analytics.ts
 *
 * Tests the public pure functions exported from the analytics service.
 */

import {
  formatCurrency,
  formatCompact,
  formatPercent,
  isProfit,
  getStrategyDisplayName,
} from '../../services/analytics';

// ─── formatCurrency (re-exported) ────────────────────────────────

describe('analytics.formatCurrency', () => {
  it('formats a typical home price', () => {
    expect(formatCurrency(350000)).toContain('350,000');
    expect(formatCurrency(350000)).toContain('$');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toContain('$');
  });
});

// ─── formatCompact (re-exported) ─────────────────────────────────

describe('analytics.formatCompact', () => {
  it('compacts thousands', () => {
    expect(formatCompact(250000)).toMatch(/250K/i);
  });

  it('compacts millions', () => {
    expect(formatCompact(2500000)).toMatch(/2\.5M/i);
  });
});

// ─── formatPercent ───────────────────────────────────────────────

describe('analytics.formatPercent', () => {
  it('formats a decimal ratio as a percentage', () => {
    // analytics.formatPercent takes a decimal (0.085) and returns "8.5%"
    const result = formatPercent(0.085);
    expect(result).toContain('%');
    expect(result).toContain('8.5');
  });

  it('handles zero', () => {
    const result = formatPercent(0);
    expect(result).toContain('0');
    expect(result).toContain('%');
  });

  it('handles 1.0 (100%)', () => {
    const result = formatPercent(1.0);
    expect(result).toContain('100');
  });
});

// ─── isProfit ────────────────────────────────────────────────────

describe('isProfit', () => {
  it('returns true for positive values', () => {
    expect(isProfit(100)).toBe(true);
  });

  it('returns false for negative values', () => {
    expect(isProfit(-100)).toBe(false);
  });

  it('returns false for zero', () => {
    expect(isProfit(0)).toBe(false);
  });
});

// ─── getStrategyDisplayName ──────────────────────────────────────

describe('getStrategyDisplayName', () => {
  it('maps longTermRental to Long-Term Rental', () => {
    expect(getStrategyDisplayName('longTermRental')).toBe('Long-Term Rental');
  });

  it('maps shortTermRental to Short-Term Rental', () => {
    expect(getStrategyDisplayName('shortTermRental')).toBe('Short-Term Rental');
  });

  it('maps brrrr correctly', () => {
    expect(getStrategyDisplayName('brrrr')).toBe('BRRRR');
  });

  it('maps fixAndFlip correctly', () => {
    expect(getStrategyDisplayName('fixAndFlip')).toBe('Fix & Flip');
  });

  it('maps wholesale correctly', () => {
    expect(getStrategyDisplayName('wholesale')).toBe('Wholesale');
  });

  it('returns the key for unknown strategies', () => {
    expect(getStrategyDisplayName('unknown_strategy')).toBe('unknown_strategy');
  });
});
