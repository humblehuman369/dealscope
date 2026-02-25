/**
 * Sync Manager Service
 *
 * Handles synchronization between the local SQLite database and the backend API.
 * Provides offline-first capabilities with background sync.
 *
 * Sync flow:
 * - Push: On reconnect, processOfflineQueue() sends queued local changes (saved_properties
 *   create/update/delete, scanned_properties → save) to the API.
 * - Pull: syncAll() / syncSavedProperties(), syncSearchHistory(), syncDocuments(),
 *   syncLOIHistory() pull from the API into SQLite.
 * - Synced tables: saved_properties, search_history, documents, loi_history.
 *   Deal Maker data is online-only; no sync job populates deal_maker_records.
 */

import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { getDatabase, withTransaction } from '../database/db';
import {
  CachedSavedProperty,
  CachedSearchHistory,
  CachedDocument,
  CachedDealMakerRecord,
  CachedLOIHistory,
  SyncMetadata,
  OfflineQueueItem,
} from '../database/schema';
import { savedPropertiesService } from './savedPropertiesService';
import { searchHistoryService } from './searchHistoryService';
import { documentsService } from './documentsService';
import { loiService } from './loiService';

const MAX_QUEUE_ATTEMPTS = 5;
const QUEUE_WARNING_THRESHOLD = 200;
import type {
  SavedPropertySummary,
  SearchHistoryResponse,
  DocumentResponse,
  DealMakerRecord,
  LOIHistoryItem,
} from '../types';

// Sync status enum
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

// Sync result interface
export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  timestamp: number;
}

// Sync options
export interface SyncOptions {
  forceSync?: boolean;
  tables?: string[];
  onProgress?: (table: string, current: number, total: number) => void;
}

/**
 * Get current sync status for a table.
 */
export async function getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
  const db = await getDatabase();
  return db.getFirstAsync<SyncMetadata>(
    'SELECT * FROM sync_metadata WHERE table_name = ?',
    tableName
  );
}

/**
 * Update sync metadata for a table.
 */
export async function updateSyncMetadata(
  tableName: string,
  status: string,
  itemsSynced: number
): Promise<void> {
  const db = await getDatabase();
  const now = Math.floor(Date.now() / 1000);

  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (table_name, last_synced_at, last_sync_status, items_synced)
     VALUES (?, ?, ?, ?)`,
    tableName,
    now,
    status,
    itemsSynced
  );
}

/**
 * Check if device is online.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Sync saved properties from the API to local cache.
 */
export async function syncSavedProperties(
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  const errors: string[] = [];
  let itemsSynced = 0;

  try {
    const online = await isOnline();
    if (!online) {
      return { success: false, itemsSynced: 0, errors: ['Device is offline'], timestamp: Date.now() };
    }

    // Fetch from API outside the transaction to avoid holding it during network I/O
    const properties = await savedPropertiesService.getSavedProperties({ limit: 500 });
    const total = properties.length;

    await withTransaction(async (db) => {
      const now = Math.floor(Date.now() / 1000);

      for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO saved_properties 
             (id, user_id, address_street, address_city, address_state, address_zip, 
              list_price, status, nickname, notes, color_label, is_priority, tags,
              best_strategy, best_cash_flow, best_coc_return, deal_maker_id, 
              last_analysis_at, synced_at, last_modified_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            prop.id,
            null,
            prop.address_street,
            prop.address_city,
            prop.address_state,
            prop.address_zip,
            prop.list_price,
            prop.status,
            prop.nickname,
            prop.notes,
            prop.color_label,
            prop.is_priority ? 1 : 0,
            prop.tags ? JSON.stringify(prop.tags) : null,
            prop.best_strategy,
            prop.best_cash_flow,
            prop.best_coc_return,
            prop.deal_maker_id,
            prop.last_analysis_at ? new Date(prop.last_analysis_at).getTime() / 1000 : null,
            now,
            null,
            prop.created_at ? new Date(prop.created_at).getTime() / 1000 : now,
            prop.updated_at ? new Date(prop.updated_at).getTime() / 1000 : now
          );
          itemsSynced++;
          onProgress?.(i + 1, total);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Property ${prop.id}: ${msg}`);
        }
      }

      // Remove local properties that no longer exist on server,
      // but preserve any with pending local modifications.
      const serverIds = properties.map((p) => p.id);
      if (serverIds.length > 0) {
        const placeholders = serverIds.map(() => '?').join(',');
        await db.runAsync(
          `DELETE FROM saved_properties WHERE id NOT IN (${placeholders}) AND synced_at IS NOT NULL AND last_modified_at IS NULL`,
          ...serverIds
        );
      }

      await updateSyncMetadata('saved_properties', 'success', itemsSynced);
    });

    return { success: errors.length === 0, itemsSynced, errors, timestamp: Date.now() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateSyncMetadata('saved_properties', 'error', itemsSynced);
    return { success: false, itemsSynced, errors: [msg], timestamp: Date.now() };
  }
}

/**
 * Sync search history from the API to local cache.
 */
export async function syncSearchHistory(
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  const errors: string[] = [];
  let itemsSynced = 0;

  try {
    const online = await isOnline();
    if (!online) {
      return { success: false, itemsSynced: 0, errors: ['Device is offline'], timestamp: Date.now() };
    }

    const historyList = await searchHistoryService.getSearchHistory({ limit: 100 });
    const total = historyList.items.length;

    await withTransaction(async (db) => {
      const now = Math.floor(Date.now() / 1000);

      for (let i = 0; i < historyList.items.length; i++) {
        const entry = historyList.items[i];
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO search_history 
             (id, user_id, search_type, query, results_count, source, 
              location_city, location_state, property_types, 
              price_range_min, price_range_max, synced_at, last_modified_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            entry.id,
            null,
            entry.search_type,
            entry.query,
            entry.results_count,
            entry.source,
            entry.location?.city,
            entry.location?.state,
            entry.property_types ? JSON.stringify(entry.property_types) : null,
            entry.price_range?.min,
            entry.price_range?.max,
            now,
            null,
            entry.created_at ? new Date(entry.created_at).getTime() / 1000 : now
          );
          itemsSynced++;
          onProgress?.(i + 1, total);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Search ${entry.id}: ${msg}`);
        }
      }

      await updateSyncMetadata('search_history', 'success', itemsSynced);
    });

    return { success: errors.length === 0, itemsSynced, errors, timestamp: Date.now() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateSyncMetadata('search_history', 'error', itemsSynced);
    return { success: false, itemsSynced, errors: [msg], timestamp: Date.now() };
  }
}

/**
 * Sync documents from the API to local cache.
 */
export async function syncDocuments(
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  const errors: string[] = [];
  let itemsSynced = 0;

  try {
    const online = await isOnline();
    if (!online) {
      return { success: false, itemsSynced: 0, errors: ['Device is offline'], timestamp: Date.now() };
    }

    const docsList = await documentsService.getDocuments({ limit: 200 });
    const total = docsList.items.length;

    await withTransaction(async (db) => {
      const now = Math.floor(Date.now() / 1000);

      for (let i = 0; i < docsList.items.length; i++) {
        const doc = docsList.items[i];
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO documents 
             (id, user_id, saved_property_id, document_type, original_filename, 
              file_size, mime_type, description, synced_at, last_modified_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            doc.id,
            null,
            doc.saved_property_id,
            doc.document_type,
            doc.original_filename,
            doc.file_size,
            doc.mime_type,
            doc.description,
            now,
            null,
            doc.created_at ? new Date(doc.created_at).getTime() / 1000 : now,
            doc.updated_at ? new Date(doc.updated_at).getTime() / 1000 : now
          );
          itemsSynced++;
          onProgress?.(i + 1, total);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Document ${doc.id}: ${msg}`);
        }
      }

      await updateSyncMetadata('documents', 'success', itemsSynced);
    });

    return { success: errors.length === 0, itemsSynced, errors, timestamp: Date.now() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateSyncMetadata('documents', 'error', itemsSynced);
    return { success: false, itemsSynced, errors: [msg], timestamp: Date.now() };
  }
}

/**
 * Sync LOI history from the API to local cache.
 */
export async function syncLOIHistory(
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  const errors: string[] = [];
  let itemsSynced = 0;

  try {
    const online = await isOnline();
    if (!online) {
      return { success: false, itemsSynced: 0, errors: ['Device is offline'], timestamp: Date.now() };
    }

    const loiHistory = await loiService.getHistory();
    const total = loiHistory.length;

    await withTransaction(async (db) => {
      const now = Math.floor(Date.now() / 1000);

      for (let i = 0; i < loiHistory.length; i++) {
        const loi = loiHistory[i];
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO loi_history 
             (id, user_id, saved_property_id, property_address, offer_price, 
              earnest_money, inspection_days, closing_days, status, pdf_url, 
              synced_at, last_modified_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            loi.id,
            null,
            loi.saved_property_id,
            loi.property_address,
            loi.offer_price,
            loi.earnest_money,
            loi.inspection_days,
            loi.closing_days,
            loi.status,
            loi.pdf_url,
            now,
            null,
            loi.created_at ? new Date(loi.created_at).getTime() / 1000 : now
          );
          itemsSynced++;
          onProgress?.(i + 1, total);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`LOI ${loi.id}: ${msg}`);
        }
      }

      await updateSyncMetadata('loi_history', 'success', itemsSynced);
    });

    return { success: errors.length === 0, itemsSynced, errors, timestamp: Date.now() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateSyncMetadata('loi_history', 'error', itemsSynced);
    return { success: false, itemsSynced, errors: [msg], timestamp: Date.now() };
  }
}

/**
 * Get the number of pending items in the offline queue.
 */
export async function getQueueSize(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM offline_queue WHERE status = 'pending'"
  );
  return result?.cnt ?? 0;
}

/**
 * Process the offline queue - push local changes to server.
 *
 * Items are retried up to MAX_QUEUE_ATTEMPTS times with exponential backoff
 * (2^attempts seconds). Exhausted items are marked status='failed' and
 * excluded from future processing.
 */
export async function processOfflineQueue(): Promise<SyncResult> {
  const errors: string[] = [];
  let itemsSynced = 0;

  try {
    const online = await isOnline();
    if (!online) {
      return { success: false, itemsSynced: 0, errors: ['Device is offline'], timestamp: Date.now() };
    }

    const db = await getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Monitor queue health
    const queueSize = await getQueueSize();
    if (queueSize > QUEUE_WARNING_THRESHOLD) {
      Sentry.addBreadcrumb({
        category: 'sync',
        message: `Offline queue has ${queueSize} pending items`,
        level: 'warning',
      });
    }

    // Only fetch items that are pending, under the retry limit, and past their backoff window
    const queueItems = await db.getAllAsync<OfflineQueueItem>(
      `SELECT * FROM offline_queue
       WHERE status = 'pending'
         AND attempts < ?
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY created_at ASC
       LIMIT 50`,
      MAX_QUEUE_ATTEMPTS,
      now
    );

    for (const item of queueItems) {
      try {
        const payload = item.payload ? JSON.parse(item.payload) : null;

        if (item.table_name === 'saved_properties') {
          await processSavedPropertyAction(item.action, item.record_id, payload);
        } else if (item.table_name === 'scanned_properties') {
          if (item.action === 'create' && payload) {
            await savedPropertiesService.saveProperty({
              address_street: payload.address,
              address_city: payload.city,
              address_state: payload.state,
              address_zip: payload.zip,
            });
          }
        }

        // Remove from queue on success
        await db.runAsync('DELETE FROM offline_queue WHERE id = ?', item.id);
        itemsSynced++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Queue item ${item.id}: ${message}`);

        const newAttempts = item.attempts + 1;
        if (newAttempts >= MAX_QUEUE_ATTEMPTS) {
          // Exhausted — mark as failed so it stops retrying
          await db.runAsync(
            "UPDATE offline_queue SET attempts = ?, last_error = ?, status = 'failed' WHERE id = ?",
            newAttempts,
            message,
            item.id
          );
        } else {
          // Exponential backoff: 2s, 4s, 8s, 16s
          const backoffSeconds = Math.pow(2, newAttempts);
          await db.runAsync(
            'UPDATE offline_queue SET attempts = ?, last_error = ?, next_retry_at = ? WHERE id = ?',
            newAttempts,
            message,
            now + backoffSeconds,
            item.id
          );
        }
      }
    }

    return { success: errors.length === 0, itemsSynced, errors, timestamp: Date.now() };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, itemsSynced, errors: [message], timestamp: Date.now() };
  }
}

/**
 * Process a saved property action from offline queue.
 */
async function processSavedPropertyAction(
  action: string,
  recordId: string | null,
  payload: any
): Promise<void> {
  switch (action) {
    case 'create':
      if (payload) {
        await savedPropertiesService.saveProperty(payload);
      }
      break;
    case 'update':
      if (recordId && payload) {
        await savedPropertiesService.updateSavedProperty(recordId, payload);
      }
      break;
    case 'delete':
      if (recordId) {
        await savedPropertiesService.deleteSavedProperty(recordId);
      }
      break;
  }
}

/**
 * Run a full sync of all tables.
 */
export async function syncAll(options?: SyncOptions): Promise<{
  savedProperties: SyncResult;
  searchHistory: SyncResult;
  documents: SyncResult;
  loiHistory: SyncResult;
  offlineQueue: SyncResult;
}> {
  const tables = options?.tables || ['saved_properties', 'search_history', 'documents', 'loi_history'];

  const results = {
    savedProperties: { success: true, itemsSynced: 0, errors: [] as string[], timestamp: Date.now() },
    searchHistory: { success: true, itemsSynced: 0, errors: [] as string[], timestamp: Date.now() },
    documents: { success: true, itemsSynced: 0, errors: [] as string[], timestamp: Date.now() },
    loiHistory: { success: true, itemsSynced: 0, errors: [] as string[], timestamp: Date.now() },
    offlineQueue: { success: true, itemsSynced: 0, errors: [] as string[], timestamp: Date.now() },
  };

  // First, process offline queue to push local changes
  results.offlineQueue = await processOfflineQueue();

  // Then pull from server
  if (tables.includes('saved_properties')) {
    results.savedProperties = await syncSavedProperties(
      options?.onProgress ? (c, t) => options.onProgress!('saved_properties', c, t) : undefined
    );
  }

  if (tables.includes('search_history')) {
    results.searchHistory = await syncSearchHistory(
      options?.onProgress ? (c, t) => options.onProgress!('search_history', c, t) : undefined
    );
  }

  if (tables.includes('documents')) {
    results.documents = await syncDocuments(
      options?.onProgress ? (c, t) => options.onProgress!('documents', c, t) : undefined
    );
  }

  if (tables.includes('loi_history')) {
    results.loiHistory = await syncLOIHistory(
      options?.onProgress ? (c, t) => options.onProgress!('loi_history', c, t) : undefined
    );
  }

  return results;
}

/**
 * Get cached saved properties from local database.
 */
export async function getCachedSavedProperties(options?: {
  status?: string;
  priorityOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<CachedSavedProperty[]> {
  const db = await getDatabase();

  let query = 'SELECT * FROM saved_properties';
  const conditions: string[] = [];
  const params: any[] = [];

  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }

  if (options?.priorityOnly) {
    conditions.push('is_priority = 1');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY is_priority DESC, created_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options?.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  return db.getAllAsync<CachedSavedProperty>(query, ...params);
}

/**
 * Get cached search history from local database.
 */
export async function getCachedSearchHistory(limit: number = 20): Promise<CachedSearchHistory[]> {
  const db = await getDatabase();
  return db.getAllAsync<CachedSearchHistory>(
    'SELECT * FROM search_history ORDER BY created_at DESC LIMIT ?',
    limit
  );
}

/**
 * Get cached documents from local database.
 */
export async function getCachedDocuments(propertyId?: string): Promise<CachedDocument[]> {
  const db = await getDatabase();

  if (propertyId) {
    return db.getAllAsync<CachedDocument>(
      'SELECT * FROM documents WHERE saved_property_id = ? ORDER BY created_at DESC',
      propertyId
    );
  }

  return db.getAllAsync<CachedDocument>('SELECT * FROM documents ORDER BY created_at DESC');
}

/**
 * Get cached LOI history from local database.
 */
export async function getCachedLOIHistory(propertyId?: string): Promise<CachedLOIHistory[]> {
  const db = await getDatabase();

  if (propertyId) {
    return db.getAllAsync<CachedLOIHistory>(
      'SELECT * FROM loi_history WHERE saved_property_id = ? ORDER BY created_at DESC',
      propertyId
    );
  }

  return db.getAllAsync<CachedLOIHistory>('SELECT * FROM loi_history ORDER BY created_at DESC');
}

/**
 * Get sync status summary for synced tables.
 * Deal Maker data is online-only; deal_maker_records is not synced.
 */
export async function getSyncStatus(): Promise<{
  [table: string]: SyncMetadata | null;
}> {
  const tables = ['saved_properties', 'search_history', 'documents', 'loi_history'];
  const status: { [table: string]: SyncMetadata | null } = {};

  for (const table of tables) {
    status[table] = await getSyncMetadata(table);
  }

  return status;
}

/**
 * Clear all cached data.
 */
export async function clearCache(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM saved_properties WHERE synced_at IS NOT NULL');
  await db.runAsync('DELETE FROM search_history WHERE synced_at IS NOT NULL');
  await db.runAsync('DELETE FROM documents WHERE synced_at IS NOT NULL');
  await db.runAsync('DELETE FROM loi_history WHERE synced_at IS NOT NULL');
  await db.runAsync('DELETE FROM sync_metadata');
}

export const syncManager = {
  isOnline,
  getSyncMetadata,
  getQueueSize,
  syncSavedProperties,
  syncSearchHistory,
  syncDocuments,
  syncLOIHistory,
  processOfflineQueue,
  syncAll,
  getCachedSavedProperties,
  getCachedSearchHistory,
  getCachedDocuments,
  getCachedLOIHistory,
  getSyncStatus,
  clearCache,
};
