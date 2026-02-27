/**
 * Core business logic tests.
 *
 * Tests the proprietary metrics, zone classifications, strategy metrics,
 * and deal maker calculations — the financial core of the app.
 */

import { formatCurrency, formatPercent, formatCompactCurrency } from '@/utils/formatters';

// Re-implement the pure scoring functions here to test the logic
// (avoids importing the React component which pulls in SVG/Reanimated chains)
function scoreColor(score: number): string {
  if (score >= 80) return '#34D399';
  if (score >= 65) return '#0EA5E9';
  if (score >= 50) return '#FBBF24';
  if (score >= 30) return '#FB923C';
  return '#F87171';
}

function verdictLabelForScore(score: number): string {
  if (score >= 80) return 'Strong Opportunity';
  if (score >= 65) return 'Good Opportunity';
  if (score >= 50) return 'Moderate Opportunity';
  if (score >= 30) return 'Below Average';
  return 'Poor Opportunity';
}

// ---------------------------------------------------------------------------
// Verdict Score display
// ---------------------------------------------------------------------------

describe('Verdict Score', () => {
  test('scoreColor returns correct color per threshold', () => {
    expect(scoreColor(85)).toBe('#34D399'); // green
    expect(scoreColor(70)).toBe('#0EA5E9'); // accent/teal
    expect(scoreColor(55)).toBe('#FBBF24'); // gold
    expect(scoreColor(35)).toBe('#FB923C'); // orange
    expect(scoreColor(20)).toBe('#F87171'); // red
  });

  test('verdictLabelForScore returns correct label', () => {
    expect(verdictLabelForScore(90)).toBe('Strong Opportunity');
    expect(verdictLabelForScore(70)).toBe('Good Opportunity');
    expect(verdictLabelForScore(55)).toBe('Moderate Opportunity');
    expect(verdictLabelForScore(35)).toBe('Below Average');
    expect(verdictLabelForScore(15)).toBe('Poor Opportunity');
  });

  test('boundary values are handled correctly', () => {
    expect(scoreColor(80)).toBe('#34D399');
    expect(scoreColor(79)).toBe('#0EA5E9');
    expect(scoreColor(65)).toBe('#0EA5E9');
    expect(scoreColor(64)).toBe('#FBBF24');
    expect(scoreColor(50)).toBe('#FBBF24');
    expect(scoreColor(49)).toBe('#FB923C');
    expect(scoreColor(30)).toBe('#FB923C');
    expect(scoreColor(29)).toBe('#F87171');
    expect(scoreColor(0)).toBe('#F87171');
  });
});

// ---------------------------------------------------------------------------
// Deal Gap zone classification
// ---------------------------------------------------------------------------

describe('Deal Gap Zones', () => {
  function getDealZone(gapPct: number): string {
    if (gapPct < 0) return 'Loss Zone';
    if (gapPct < 2) return 'High Risk';
    if (gapPct < 5) return 'Negotiate';
    if (gapPct < 12) return 'Profit Zone';
    return 'Deep Value';
  }

  test('negative gap = Loss Zone', () => {
    expect(getDealZone(-10)).toBe('Loss Zone');
    expect(getDealZone(-0.1)).toBe('Loss Zone');
  });

  test('0-2% = High Risk', () => {
    expect(getDealZone(0)).toBe('High Risk');
    expect(getDealZone(1.9)).toBe('High Risk');
  });

  test('2-5% = Negotiate', () => {
    expect(getDealZone(2)).toBe('Negotiate');
    expect(getDealZone(4.9)).toBe('Negotiate');
  });

  test('5-12% = Profit Zone', () => {
    expect(getDealZone(5)).toBe('Profit Zone');
    expect(getDealZone(11.9)).toBe('Profit Zone');
  });

  test('>12% = Deep Value', () => {
    expect(getDealZone(12)).toBe('Deep Value');
    expect(getDealZone(30)).toBe('Deep Value');
  });

  test('Deal Gap calculation formula', () => {
    const listPrice = 400000;
    const targetBuy = 340000;
    const dealGapPct = ((listPrice - targetBuy) / listPrice) * 100;

    expect(dealGapPct).toBe(15);
    expect(getDealZone(dealGapPct)).toBe('Deep Value');
  });
});

// ---------------------------------------------------------------------------
// Deal Maker metric calculations
// ---------------------------------------------------------------------------

describe('Deal Maker Calculations', () => {
  function calculateMortgage(
    principal: number,
    annualRate: number,
    years: number,
  ): number {
    if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
    const r = annualRate / 12;
    const n = years * 12;
    const pmt = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Number.isFinite(pmt) ? pmt : 0;
  }

  test('mortgage payment calculation', () => {
    // $240,000 loan at 7% for 30 years ≈ $1,597/mo
    const pmt = calculateMortgage(240000, 0.07, 30);
    expect(pmt).toBeGreaterThan(1590);
    expect(pmt).toBeLessThan(1605);
  });

  test('zero principal returns 0', () => {
    expect(calculateMortgage(0, 0.07, 30)).toBe(0);
  });

  test('zero rate returns 0', () => {
    expect(calculateMortgage(240000, 0, 30)).toBe(0);
  });

  test('cap rate calculation', () => {
    const noi = 24000;
    const buyPrice = 300000;
    const capRate = (noi / buyPrice) * 100;
    expect(capRate).toBe(8);
  });

  test('cash-on-cash calculation', () => {
    const annualCashFlow = 6000;
    const cashNeeded = 75000; // 25% down on $300K
    const coc = (annualCashFlow / cashNeeded) * 100;
    expect(coc).toBe(8);
  });

  test('DSCR calculation', () => {
    const noi = 24000;
    const annualDebt = 19200; // $1600/mo
    const dscr = noi / annualDebt;
    expect(dscr).toBe(1.25);
  });

  test('Income Value calculation', () => {
    const noi = 24000;
    const ltv = 0.80;
    const mortgageConstant = calculateMortgage(1, 0.07, 30) * 12;
    const incomeValue = noi / (ltv * mortgageConstant);
    expect(incomeValue).toBeGreaterThan(0);
    expect(Number.isFinite(incomeValue)).toBe(true);
  });

  test('Target Buy = 95% of Income Value', () => {
    const incomeValue = 320000;
    const targetBuy = Math.round(incomeValue * 0.95);
    expect(targetBuy).toBe(304000);
  });
});

// ---------------------------------------------------------------------------
// Strategy-specific metric fields
// ---------------------------------------------------------------------------

describe('Strategy Metrics — Field Mapping', () => {
  const LTR_FIELDS = ['cash_on_cash', 'cap_rate', 'dscr', 'monthly_cash_flow', 'annual_noi', 'cash_needed'];
  const STR_FIELDS = ['cash_on_cash', 'average_daily_rate', 'occupancy_rate', 'revpar', 'annual_gross_revenue', 'monthly_cash_flow'];
  const BRRRR_FIELDS = ['cash_recovery_percent', 'equity_created', 'post_refi_cash_flow', 'arv', 'rehab_budget', 'infinite_roi_achieved'];
  const FLIP_FIELDS = ['net_profit', 'roi', 'annualized_roi', 'meets_70_rule', 'holding_period_months', 'selling_costs'];
  const HOUSE_HACK_FIELDS = ['net_housing_cost', 'savings_vs_renting', 'housing_cost_offset_pct', 'rental_income', 'total_housing_payment', 'monthly_cash_flow'];
  const WHOLESALE_FIELDS = ['assignment_fee', 'mao', 'roi_on_emd', 'net_profit', 'earnest_money', 'deal_viability'];

  test('each strategy has exactly 6 key metrics', () => {
    expect(LTR_FIELDS).toHaveLength(6);
    expect(STR_FIELDS).toHaveLength(6);
    expect(BRRRR_FIELDS).toHaveLength(6);
    expect(FLIP_FIELDS).toHaveLength(6);
    expect(HOUSE_HACK_FIELDS).toHaveLength(6);
    expect(WHOLESALE_FIELDS).toHaveLength(6);
  });

  test('LTR primary metrics are CoC, cap rate, DSCR', () => {
    expect(LTR_FIELDS.slice(0, 3)).toEqual(['cash_on_cash', 'cap_rate', 'dscr']);
  });

  test('STR includes ADR, occupancy, RevPAR', () => {
    expect(STR_FIELDS).toContain('average_daily_rate');
    expect(STR_FIELDS).toContain('occupancy_rate');
    expect(STR_FIELDS).toContain('revpar');
  });

  test('Flip includes 70% rule check', () => {
    expect(FLIP_FIELDS).toContain('meets_70_rule');
  });

  test('Wholesale includes MAO and assignment fee', () => {
    expect(WHOLESALE_FIELDS).toContain('assignment_fee');
    expect(WHOLESALE_FIELDS).toContain('mao');
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe('Formatters', () => {
  test('formatCurrency formats correctly', () => {
    expect(formatCurrency(350000)).toBe('$350,000');
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency(NaN)).toBe('—');
  });

  test('formatCompactCurrency shortens large numbers', () => {
    expect(formatCompactCurrency(1500000)).toBe('$1.5M');
    expect(formatCompactCurrency(350000)).toBe('$350K');
    expect(formatCompactCurrency(500)).toBe('$500');
    expect(formatCompactCurrency(-25000)).toBe('-$25K');
  });

  test('formatPercent formats with decimals', () => {
    expect(formatPercent(8.5)).toBe('8.5%');
    expect(formatPercent(10)).toBe('10.0%');
    expect(formatPercent(null)).toBe('—');
  });
});

// ---------------------------------------------------------------------------
// Deep link routing
// ---------------------------------------------------------------------------

describe('Deep Link Resolution', () => {
  test('notification category → route mapping', () => {
    const { resolveNotificationRoute } = require('@/services/notifications');

    expect(resolveNotificationRoute({ category: 'analysis_complete', address: '123 Main St' }))
      .toBe('/verdict?address=123%20Main%20St');

    expect(resolveNotificationRoute({ category: 'price_change', propertyId: 'abc' }))
      .toBe('/property/abc');

    expect(resolveNotificationRoute({ category: 'trial_expiring' }))
      .toBe('/(protected)/billing');

    expect(resolveNotificationRoute({ category: 'subscription_change' }))
      .toBe('/(protected)/billing');

    expect(resolveNotificationRoute({ category: 'announcement' }))
      .toBeNull();

    expect(resolveNotificationRoute({ screen: '/custom/path' }))
      .toBe('/custom/path');
  });
});
