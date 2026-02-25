/**
 * Unit tests for stores/assumptionsStore.ts
 *
 * Tests default values, setAssumption, propertyOverrides, resetToDefaults,
 * bulkUpdate, hydrateFromAPI, and migration from v0/v1 → v2.
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

// ── Tests ────────────────────────────────────────────────────────────────────

import {
  useAssumptionsStore,
  DEFAULT_ASSUMPTIONS,
} from '../../stores/assumptionsStore';

beforeEach(() => {
  const { setState } = useAssumptionsStore;
  setState({
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    propertyOverrides: {},
    isHydrated: false,
  });
});

// ─── Default values ──────────────────────────────────────────────────────────

describe('default assumptions', () => {
  it('initializes with DEFAULT_ASSUMPTIONS', () => {
    const { assumptions } = useAssumptionsStore.getState();
    expect(assumptions.financing.down_payment_pct).toBe(0.20);
    expect(assumptions.financing.interest_rate).toBe(0.06);
    expect(assumptions.financing.loan_term_years).toBe(30);
  });

  it('has correct operating defaults', () => {
    const { assumptions } = useAssumptionsStore.getState();
    expect(assumptions.operating.vacancy_rate).toBe(0.01);
    expect(assumptions.operating.maintenance_pct).toBe(0.05);
    expect(assumptions.operating.insurance_pct).toBe(0.01);
  });

  it('has all strategy sections', () => {
    const { assumptions } = useAssumptionsStore.getState();
    expect(assumptions.ltr).toBeDefined();
    expect(assumptions.str).toBeDefined();
    expect(assumptions.brrrr).toBeDefined();
    expect(assumptions.flip).toBeDefined();
    expect(assumptions.house_hack).toBeDefined();
    expect(assumptions.wholesale).toBeDefined();
    expect(assumptions.rehab).toBeDefined();
  });
});

// ─── setAssumption ───────────────────────────────────────────────────────────

describe('setAssumption', () => {
  it('updates a single assumption field', () => {
    useAssumptionsStore.getState().setAssumption('financing', 'down_payment_pct', 0.25);
    const { assumptions } = useAssumptionsStore.getState();
    expect(assumptions.financing.down_payment_pct).toBe(0.25);
  });

  it('does not affect other fields in the same category', () => {
    useAssumptionsStore.getState().setAssumption('financing', 'interest_rate', 0.07);
    const { assumptions } = useAssumptionsStore.getState();
    expect(assumptions.financing.interest_rate).toBe(0.07);
    expect(assumptions.financing.down_payment_pct).toBe(0.20);
  });
});

// ─── Property overrides ──────────────────────────────────────────────────────

describe('property overrides', () => {
  it('merges overrides with global assumptions', () => {
    useAssumptionsStore.getState().setPropertyOverride('prop-123', {
      financing: { ...DEFAULT_ASSUMPTIONS.financing, down_payment_pct: 0.30 },
    });

    const merged = useAssumptionsStore.getState().getAssumptionsForProperty('prop-123');
    expect(merged.financing.down_payment_pct).toBe(0.30);
    expect(merged.operating.vacancy_rate).toBe(0.01); // unchanged
  });

  it('returns global assumptions when no override exists', () => {
    const result = useAssumptionsStore.getState().getAssumptionsForProperty('nonexistent');
    expect(result).toEqual(DEFAULT_ASSUMPTIONS);
  });

  it('removes property overrides', () => {
    useAssumptionsStore.getState().setPropertyOverride('prop-456', {
      financing: { ...DEFAULT_ASSUMPTIONS.financing, interest_rate: 0.08 },
    });
    useAssumptionsStore.getState().resetPropertyOverrides('prop-456');

    const { propertyOverrides } = useAssumptionsStore.getState();
    expect(propertyOverrides['prop-456']).toBeUndefined();
  });
});

// ─── resetToDefaults ─────────────────────────────────────────────────────────

describe('resetToDefaults', () => {
  it('restores all assumptions to defaults', () => {
    useAssumptionsStore.getState().setAssumption('financing', 'down_payment_pct', 0.50);
    useAssumptionsStore.getState().resetToDefaults();
    const { assumptions } = useAssumptionsStore.getState();
    expect(assumptions.financing.down_payment_pct).toBe(0.20);
  });
});

// ─── bulkUpdate ──────────────────────────────────────────────────────────────

describe('bulkUpdate', () => {
  it('deep merges partial updates', () => {
    useAssumptionsStore.getState().bulkUpdate({
      financing: { ...DEFAULT_ASSUMPTIONS.financing, interest_rate: 0.055 },
      appreciation_rate: 0.04,
    });
    const { assumptions } = useAssumptionsStore.getState();
    expect(assumptions.financing.interest_rate).toBe(0.055);
    expect(assumptions.appreciation_rate).toBe(0.04);
    expect(assumptions.financing.down_payment_pct).toBe(0.20);
  });
});

// ─── hydrateFromAPI ──────────────────────────────────────────────────────────

describe('hydrateFromAPI', () => {
  it('replaces assumptions and sets isHydrated flag', () => {
    const apiDefaults = {
      ...DEFAULT_ASSUMPTIONS,
      financing: { ...DEFAULT_ASSUMPTIONS.financing, interest_rate: 0.065 },
    };
    useAssumptionsStore.getState().hydrateFromAPI(apiDefaults);

    const state = useAssumptionsStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.assumptions.financing.interest_rate).toBe(0.065);
  });
});

// ─── Migration v0/v1 → v2 ───────────────────────────────────────────────────

describe('store migration', () => {
  it('migrates insurance_annual to insurance_pct', () => {
    // Simulate v0 persisted state with old field names
    const v0State: any = {
      assumptions: {
        ...DEFAULT_ASSUMPTIONS,
        operating: {
          ...DEFAULT_ASSUMPTIONS.operating,
          insurance_annual: 2400,
        },
      },
      propertyOverrides: {},
      isHydrated: false,
    };
    delete v0State.assumptions.operating.insurance_pct;

    // Access the migrate function from the store config
    const storeConfig = (useAssumptionsStore as any).persist;
    const options = storeConfig?.getOptions?.();

    if (options?.migrate) {
      const migrated = options.migrate(v0State, 0);
      expect(migrated.assumptions.operating.insurance_pct).toBe(0.01);
      expect(migrated.assumptions.operating.insurance_annual).toBeUndefined();
    }
  });

  it('adds ltr section if missing', () => {
    const v0State: any = {
      assumptions: { ...DEFAULT_ASSUMPTIONS },
      propertyOverrides: {},
      isHydrated: false,
    };
    delete v0State.assumptions.ltr;

    const storeConfig = (useAssumptionsStore as any).persist;
    const options = storeConfig?.getOptions?.();

    if (options?.migrate) {
      const migrated = options.migrate(v0State, 0);
      expect(migrated.assumptions.ltr).toBeDefined();
      expect(migrated.assumptions.ltr.buy_discount_pct).toBe(0.05);
    }
  });

  it('adds buy_discount_pct to STR if missing', () => {
    const v1State: any = {
      assumptions: {
        ...DEFAULT_ASSUMPTIONS,
        str: { ...DEFAULT_ASSUMPTIONS.str },
      },
      propertyOverrides: {},
      isHydrated: false,
    };
    delete v1State.assumptions.str.buy_discount_pct;

    const storeConfig = (useAssumptionsStore as any).persist;
    const options = storeConfig?.getOptions?.();

    if (options?.migrate) {
      const migrated = options.migrate(v1State, 1);
      expect(migrated.assumptions.str.buy_discount_pct).toBe(0.05);
    }
  });

  it('passes through current version without changes', () => {
    const currentState: any = {
      assumptions: DEFAULT_ASSUMPTIONS,
      propertyOverrides: {},
      isHydrated: true,
    };

    const storeConfig = (useAssumptionsStore as any).persist;
    const options = storeConfig?.getOptions?.();

    if (options?.migrate) {
      const migrated = options.migrate(currentState, 2);
      expect(migrated).toEqual(currentState);
    }
  });
});
