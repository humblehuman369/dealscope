/**
 * Unit tests for utils/validation.ts (extracted from hooks/usePropertyData.ts)
 *
 * Tests finiteOrNull sanitization and validatePropertyResponse field-level
 * validation that prevents NaN/Infinity from reaching financial calculations.
 */

import { finiteOrNull, validatePropertyResponse } from '../../utils/validation';
import type { PropertyResponseCompat } from '../../utils/validation';

// ─── finiteOrNull ────────────────────────────────────────────────────────────

describe('finiteOrNull', () => {
  it('returns the value for finite numbers', () => {
    expect(finiteOrNull(350000)).toBe(350000);
    expect(finiteOrNull(0)).toBe(0);
    expect(finiteOrNull(-100.5)).toBe(-100.5);
  });

  it('returns null for NaN', () => {
    expect(finiteOrNull(NaN)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(finiteOrNull(Infinity)).toBeNull();
    expect(finiteOrNull(-Infinity)).toBeNull();
  });

  it('returns null for null and undefined', () => {
    expect(finiteOrNull(null)).toBeNull();
    expect(finiteOrNull(undefined)).toBeNull();
  });

  it('coerces valid numeric strings', () => {
    expect(finiteOrNull('350000')).toBe(350000);
    expect(finiteOrNull('0')).toBe(0);
  });

  it('returns null for non-numeric strings', () => {
    expect(finiteOrNull('abc')).toBeNull();
  });

  it('coerces empty string to 0 (Number("") === 0)', () => {
    expect(finiteOrNull('')).toBe(0);
  });
});

// ─── validatePropertyResponse ────────────────────────────────────────────────

describe('validatePropertyResponse', () => {
  function makeResponse(overrides?: Partial<PropertyResponseCompat>): PropertyResponseCompat {
    return {
      address: '123 Main St',
      valuations: {
        zestimate: 350000,
        current_value_avm: null,
        market_price: 340000,
        tax_assessed_value: 280000,
        value_iq_estimate: 345000,
        rentcast_avm: 348000,
        redfin_estimate: 342000,
      },
      rentals: {
        monthly_rent_ltr: 2500,
        rental_stats: {
          iq_estimate: 2500,
          zillow_estimate: 2400,
          rentcast_estimate: 2600,
          redfin_estimate: 2450,
        },
      },
      ...overrides,
    } as PropertyResponseCompat;
  }

  it('passes through valid numeric values', () => {
    const data = makeResponse();
    const result = validatePropertyResponse(data);
    expect(result.valuations.zestimate).toBe(350000);
    expect(result.valuations.value_iq_estimate).toBe(345000);
    expect(result.rentals.monthly_rent_ltr).toBe(2500);
  });

  it('sanitizes NaN in valuation fields', () => {
    const data = makeResponse({
      valuations: {
        zestimate: NaN,
        value_iq_estimate: 345000,
        rentcast_avm: Infinity,
        redfin_estimate: 342000,
      },
    } as any);

    const result = validatePropertyResponse(data);
    expect(result.valuations.zestimate).toBeNull();
    expect(result.valuations.rentcast_avm).toBeNull();
    expect(result.valuations.value_iq_estimate).toBe(345000);
  });

  it('sanitizes NaN in rental stats', () => {
    const data = makeResponse({
      rentals: {
        monthly_rent_ltr: NaN,
        rental_stats: {
          iq_estimate: Infinity,
          zillow_estimate: 2400,
          rentcast_estimate: NaN,
          redfin_estimate: 2450,
        },
      },
    } as any);

    const result = validatePropertyResponse(data);
    expect(result.rentals.monthly_rent_ltr).toBeNull();
    expect(result.rentals.rental_stats.iq_estimate).toBeNull();
    expect(result.rentals.rental_stats.zillow_estimate).toBe(2400);
    expect(result.rentals.rental_stats.rentcast_estimate).toBeNull();
  });

  it('handles missing valuations gracefully', () => {
    const data = makeResponse({ valuations: undefined } as any);
    const result = validatePropertyResponse(data);
    expect(result.valuations).toBeUndefined();
  });

  it('handles missing rentals gracefully', () => {
    const data = makeResponse({ rentals: undefined } as any);
    const result = validatePropertyResponse(data);
    expect(result.rentals).toBeUndefined();
  });

  it('handles missing rental_stats gracefully', () => {
    const data = makeResponse({
      rentals: { monthly_rent_ltr: 2500 },
    } as any);
    const result = validatePropertyResponse(data);
    expect(result.rentals.monthly_rent_ltr).toBe(2500);
  });

  it('preserves null values without converting them', () => {
    const data = makeResponse({
      valuations: {
        zestimate: null,
        value_iq_estimate: null,
        rentcast_avm: 348000,
        redfin_estimate: null,
      },
    } as any);

    const result = validatePropertyResponse(data);
    expect(result.valuations.zestimate).toBeNull();
    expect(result.valuations.value_iq_estimate).toBeNull();
    expect(result.valuations.rentcast_avm).toBe(348000);
  });
});
