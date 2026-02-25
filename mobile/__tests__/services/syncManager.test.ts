/**
 * Unit tests for services/syncManager.ts
 *
 * Tests offline queue processing, retry behavior with exponential backoff,
 * dead letter handling, and offline detection.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockDbRows: Record<string, unknown[]> = {
  offline_queue: [],
};

const mockDb = {
  getAllAsync: jest.fn(async (query: string, ..._args: unknown[]) => {
    if (query.includes('offline_queue')) return mockDbRows.offline_queue;
    return [];
  }),
  getFirstAsync: jest.fn(async (query: string, ..._args: unknown[]) => {
    if (query.includes('COUNT')) {
      const pending = mockDbRows.offline_queue.filter(
        (i: any) => i.status === 'pending'
      );
      return { cnt: pending.length };
    }
    return null;
  }),
  runAsync: jest.fn(async () => undefined),
  execAsync: jest.fn(async () => undefined),
};

jest.mock('../../database/db', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockDb)),
  withTransaction: jest.fn(async (fn: (db: typeof mockDb) => Promise<void>) => {
    await fn(mockDb);
  }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../../services/savedPropertiesService', () => ({
  savedPropertiesService: {
    getSavedProperties: jest.fn(() => Promise.resolve([])),
    saveProperty: jest.fn(() => Promise.resolve({ id: 'new-1' })),
    updateSavedProperty: jest.fn(() => Promise.resolve()),
    deleteSavedProperty: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../services/searchHistoryService', () => ({
  searchHistoryService: {
    getSearchHistory: jest.fn(() => Promise.resolve({ items: [] })),
  },
}));

jest.mock('../../services/documentsService', () => ({
  documentsService: {
    getDocuments: jest.fn(() => Promise.resolve({ items: [] })),
  },
}));

jest.mock('../../services/loiService', () => ({
  loiService: {
    getHistory: jest.fn(() => Promise.resolve([])),
  },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import {
  isOnline,
  getQueueSize,
  processOfflineQueue,
  syncSavedProperties,
} from '../../services/syncManager';
import { savedPropertiesService } from '../../services/savedPropertiesService';

beforeEach(() => {
  mockDbRows.offline_queue = [];
  jest.clearAllMocks();
  (NetInfo.fetch as jest.Mock).mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  });
});

// ─── Offline detection ───────────────────────────────────────────────────────

describe('isOnline', () => {
  it('returns true when connected and reachable', async () => {
    expect(await isOnline()).toBe(true);
  });

  it('returns false when not connected', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });
    expect(await isOnline()).toBe(false);
  });

  it('returns true when isInternetReachable is null (unknown)', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: null,
    });
    expect(await isOnline()).toBe(true);
  });
});

// ─── Queue size ──────────────────────────────────────────────────────────────

describe('getQueueSize', () => {
  it('returns 0 for empty queue', async () => {
    expect(await getQueueSize()).toBe(0);
  });

  it('counts pending items', async () => {
    mockDbRows.offline_queue = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'pending' },
      { id: '3', status: 'failed' },
    ];
    expect(await getQueueSize()).toBe(2);
  });
});

// ─── processOfflineQueue ─────────────────────────────────────────────────────

describe('processOfflineQueue', () => {
  it('returns early when offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });
    const result = await processOfflineQueue();
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Device is offline');
  });

  it('processes saved_properties create action', async () => {
    mockDbRows.offline_queue = [
      {
        id: 'q1',
        table_name: 'saved_properties',
        action: 'create',
        record_id: null,
        payload: JSON.stringify({ address_street: '123 Main' }),
        attempts: 0,
        status: 'pending',
        created_at: 1000,
        next_retry_at: null,
      },
    ];

    const result = await processOfflineQueue();
    expect(result.itemsSynced).toBe(1);
    expect(savedPropertiesService.saveProperty).toHaveBeenCalled();
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'DELETE FROM offline_queue WHERE id = ?',
      'q1'
    );
  });

  it('increments attempts and applies exponential backoff on failure', async () => {
    (savedPropertiesService.saveProperty as jest.Mock).mockRejectedValueOnce(
      new Error('Server error')
    );

    mockDbRows.offline_queue = [
      {
        id: 'q2',
        table_name: 'saved_properties',
        action: 'create',
        record_id: null,
        payload: JSON.stringify({ address_street: '456 Oak' }),
        attempts: 1,
        status: 'pending',
        created_at: 1000,
        next_retry_at: null,
      },
    ];

    const result = await processOfflineQueue();
    expect(result.errors.length).toBe(1);

    // Should set exponential backoff: 2^(1+1) = 4 seconds
    const updateCall = mockDb.runAsync.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && (call[0] as string).includes('next_retry_at')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toBe(2); // new attempts = 2
  });

  it('marks items as failed after MAX_QUEUE_ATTEMPTS', async () => {
    (savedPropertiesService.saveProperty as jest.Mock).mockRejectedValueOnce(
      new Error('Persistent error')
    );

    mockDbRows.offline_queue = [
      {
        id: 'q3',
        table_name: 'saved_properties',
        action: 'create',
        record_id: null,
        payload: JSON.stringify({ address_street: '789 Elm' }),
        attempts: 4, // At 4, next failure = 5 = MAX_QUEUE_ATTEMPTS
        status: 'pending',
        created_at: 1000,
        next_retry_at: null,
      },
    ];

    await processOfflineQueue();

    const failCall = mockDb.runAsync.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && (call[0] as string).includes("status = 'failed'")
    );
    expect(failCall).toBeDefined();
  });

  it('logs Sentry warning when queue exceeds threshold', async () => {
    // Make getFirstAsync return a large count
    mockDb.getFirstAsync.mockResolvedValueOnce({ cnt: 250 });

    await processOfflineQueue();

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'sync',
        level: 'warning',
      })
    );
  });

  it('processes empty queue successfully', async () => {
    const result = await processOfflineQueue();
    expect(result.success).toBe(true);
    expect(result.itemsSynced).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── syncSavedProperties ─────────────────────────────────────────────────────

describe('syncSavedProperties', () => {
  it('returns offline error when disconnected', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });
    const result = await syncSavedProperties();
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Device is offline');
  });

  it('syncs properties from API to local DB', async () => {
    (savedPropertiesService.getSavedProperties as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p1',
        address_street: '123 Main',
        address_city: 'Denver',
        address_state: 'CO',
        address_zip: '80202',
        list_price: 350000,
        status: 'active',
        nickname: null,
        notes: null,
        color_label: null,
        is_priority: false,
        tags: null,
        best_strategy: 'ltr',
        best_cash_flow: 500,
        best_coc_return: 0.08,
        deal_maker_id: null,
        last_analysis_at: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ]);

    const result = await syncSavedProperties();
    expect(result.success).toBe(true);
    expect(result.itemsSynced).toBe(1);
  });

  it('calls progress callback', async () => {
    (savedPropertiesService.getSavedProperties as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p1', address_street: '1', address_city: 'C', address_state: 'S',
        address_zip: '1', list_price: 1, status: 'active', nickname: null,
        notes: null, color_label: null, is_priority: false, tags: null,
        best_strategy: null, best_cash_flow: null, best_coc_return: null,
        deal_maker_id: null, last_analysis_at: null, created_at: null, updated_at: null,
      },
    ]);

    const progress = jest.fn();
    await syncSavedProperties(progress);
    expect(progress).toHaveBeenCalledWith(1, 1);
  });
});
