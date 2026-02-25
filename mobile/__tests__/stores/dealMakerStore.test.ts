/**
 * Unit tests for stores/dealMakerStore.ts
 *
 * Tests store initialization, field updates, computed helpers,
 * reset, price target switching, and debounced save behavior.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  },
}));

const mockGet = jest.fn();
const mockPatch = jest.fn();

jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

import { useDealMakerStore } from '../../stores/dealMakerStore';
import type { DealMakerRecord, CachedMetrics } from '../../types/dealMaker';

function makeRecord(overrides?: Partial<DealMakerRecord>): DealMakerRecord {
  return {
    id: 'dm-1',
    saved_property_id: 'sp-1',
    list_price: 350000,
    rent_estimate: 2500,
    buy_price: 330000,
    monthly_rent: 2500,
    down_payment_pct: 0.20,
    interest_rate: 0.06,
    loan_term_years: 30,
    closing_costs_pct: 0.03,
    vacancy_rate: 0.05,
    property_management_pct: 0.08,
    maintenance_pct: 0.01,
    insurance_annual: 1800,
    property_tax_annual: 4200,
    hoa_monthly: 0,
    arv: 400000,
    rehab_budget: 25000,
    strategy: 'ltr',
    cached_metrics: makeMetrics(),
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  } as DealMakerRecord;
}

function makeMetrics(overrides?: Partial<CachedMetrics>): CachedMetrics {
  return {
    loan_amount: 264000,
    down_payment: 66000,
    total_cash_needed: 75900,
    monthly_payment: 1582,
    ltv: 0.80,
    gross_income: 30000,
    vacancy_loss: 1500,
    total_expenses: 12000,
    noi: 16500,
    annual_cash_flow: -2484,
    monthly_cash_flow: -207,
    cap_rate: 0.05,
    cash_on_cash: -0.033,
    dscr: 0.87,
    one_percent_rule: 0.76,
    grm: 11.0,
    equity: 20000,
    equity_after_rehab: 45000,
    deal_gap_pct: -0.06,
    breakeven_price: 310000,
    income_value: 325000,
    ...overrides,
  } as CachedMetrics;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useDealMakerStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Initialization ──────────────────────────────────────────────────────────

describe('store initialization', () => {
  it('starts with null record', () => {
    const state = useDealMakerStore.getState();
    expect(state.record).toBeNull();
    expect(state.propertyId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isDirty).toBe(false);
  });

  it('defaults to targetBuy price target', () => {
    expect(useDealMakerStore.getState().activePriceTarget).toBe('targetBuy');
  });
});

// ─── loadRecord ──────────────────────────────────────────────────────────────

describe('loadRecord', () => {
  it('fetches and stores record from API', async () => {
    const record = makeRecord();
    mockGet.mockResolvedValueOnce({ record });

    await useDealMakerStore.getState().loadRecord('sp-1');

    const state = useDealMakerStore.getState();
    expect(state.propertyId).toBe('sp-1');
    expect(state.record?.id).toBe('dm-1');
    expect(state.isLoading).toBe(false);
  });

  it('sets error on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await useDealMakerStore.getState().loadRecord('sp-1');

    const state = useDealMakerStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoading).toBe(false);
    expect(state.record).toBeNull();
  });

  it('skips fetch when data is fresh', async () => {
    const record = makeRecord();
    mockGet.mockResolvedValueOnce({ record });

    await useDealMakerStore.getState().loadRecord('sp-1');
    mockGet.mockClear();

    await useDealMakerStore.getState().loadRecord('sp-1');
    expect(mockGet).not.toHaveBeenCalled();
  });
});

// ─── updateField ─────────────────────────────────────────────────────────────

describe('updateField', () => {
  it('updates a single field and marks dirty', () => {
    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
    });

    useDealMakerStore.getState().updateField('buy_price', 300000);

    const state = useDealMakerStore.getState();
    expect(state.record?.buy_price).toBe(300000);
    expect(state.isDirty).toBe(true);
    expect(state.pendingUpdates.buy_price).toBe(300000);
  });

  it('does nothing when no record loaded', () => {
    useDealMakerStore.getState().updateField('buy_price', 300000);
    expect(useDealMakerStore.getState().isDirty).toBe(false);
  });
});

// ─── updateMultipleFields ────────────────────────────────────────────────────

describe('updateMultipleFields', () => {
  it('updates multiple fields at once', () => {
    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
    });

    useDealMakerStore.getState().updateMultipleFields({
      buy_price: 310000,
      monthly_rent: 2800,
    });

    const state = useDealMakerStore.getState();
    expect(state.record?.buy_price).toBe(310000);
    expect(state.record?.monthly_rent).toBe(2800);
    expect(state.isDirty).toBe(true);
  });
});

// ─── Computed helpers ────────────────────────────────────────────────────────

describe('computed helpers', () => {
  beforeEach(() => {
    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
    });
  });

  it('getMetrics returns cached metrics', () => {
    const metrics = useDealMakerStore.getState().getMetrics();
    expect(metrics).not.toBeNull();
    expect(metrics?.cap_rate).toBe(0.05);
  });

  it('getCashNeeded returns total_cash_needed', () => {
    expect(useDealMakerStore.getState().getCashNeeded()).toBe(75900);
  });

  it('getDealGap returns deal_gap_pct', () => {
    expect(useDealMakerStore.getState().getDealGap()).toBe(-0.06);
  });

  it('getCapRate returns cap_rate', () => {
    expect(useDealMakerStore.getState().getCapRate()).toBe(0.05);
  });

  it('returns 0 when no record loaded', () => {
    useDealMakerStore.getState().reset();
    expect(useDealMakerStore.getState().getCashNeeded()).toBe(0);
    expect(useDealMakerStore.getState().getDealGap()).toBe(0);
    expect(useDealMakerStore.getState().getCapRate()).toBe(0);
  });
});

// ─── getActivePriceValue ─────────────────────────────────────────────────────

describe('getActivePriceValue', () => {
  beforeEach(() => {
    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
    });
  });

  it('returns buy_price for targetBuy', () => {
    useDealMakerStore.getState().setActivePriceTarget('targetBuy');
    expect(useDealMakerStore.getState().getActivePriceValue()).toBe(330000);
  });

  it('returns income_value for breakeven', () => {
    useDealMakerStore.getState().setActivePriceTarget('breakeven');
    expect(useDealMakerStore.getState().getActivePriceValue()).toBe(325000);
  });

  it('returns 70% of income_value for wholesale', () => {
    useDealMakerStore.getState().setActivePriceTarget('wholesale');
    expect(useDealMakerStore.getState().getActivePriceValue()).toBe(Math.round(325000 * 0.70));
  });

  it('returns 0 when no record', () => {
    useDealMakerStore.getState().reset();
    expect(useDealMakerStore.getState().getActivePriceValue()).toBe(0);
  });
});

// ─── saveToBackend ───────────────────────────────────────────────────────────

describe('saveToBackend', () => {
  it('sends pending updates via PATCH', async () => {
    const updatedRecord = makeRecord({ buy_price: 310000 });
    mockPatch.mockResolvedValueOnce({ record: updatedRecord });

    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
      isDirty: true,
      pendingUpdates: { buy_price: 310000 },
    });

    await useDealMakerStore.getState().saveToBackend();

    const state = useDealMakerStore.getState();
    expect(state.isDirty).toBe(false);
    expect(state.pendingUpdates).toEqual({});
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/v1/properties/saved/sp-1/deal-maker',
      { buy_price: 310000 }
    );
  });

  it('skips save when not dirty', async () => {
    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
      isDirty: false,
      pendingUpdates: {},
    });

    await useDealMakerStore.getState().saveToBackend();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('sets error on save failure', async () => {
    mockPatch.mockRejectedValueOnce(new Error('Save failed'));

    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
      isDirty: true,
      pendingUpdates: { buy_price: 310000 },
    });

    await useDealMakerStore.getState().saveToBackend();
    expect(useDealMakerStore.getState().error).toBe('Save failed');
  });
});

// ─── reset ───────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears all state to initial values', () => {
    useDealMakerStore.setState({
      record: makeRecord(),
      propertyId: 'sp-1',
      isDirty: true,
      error: 'Some error',
    });

    useDealMakerStore.getState().reset();

    const state = useDealMakerStore.getState();
    expect(state.record).toBeNull();
    expect(state.propertyId).toBeNull();
    expect(state.isDirty).toBe(false);
    expect(state.error).toBeNull();
  });
});
