/**
 * Sync Manager for offline-first data synchronization.
 * Monitors network status and processes queued changes when online.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import axios, { AxiosError } from 'axios';
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  markQueueItemFailed,
  getOfflineQueueCount,
  OfflineQueueItem,
  getSetting,
  setSetting,
} from '../database';
import { getDatabase } from '../database/db';
import { getAccessToken } from './authService';

// Types for pull sync response
interface SyncRecord {
  id: string;
  table_name: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, any> | null;
  updated_at: number;
  created_at: number;
}

interface PullSyncResponse {
  scanned_properties: SyncRecord[];
  portfolio_properties: SyncRecord[];
  settings: SyncRecord[];
  server_time: number;
  has_more: boolean;
  next_since?: number;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';
const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

type SyncEventType = 'started' | 'completed' | 'failed' | 'progress' | 'network_change' | 'conflict';
type SyncEventHandler = (event: SyncEvent) => void;

interface ConflictInfo {
  recordId: string;
  tableName: string;
  localTimestamp: number;
  serverTimestamp: number;
  resolution: 'local_wins' | 'server_wins';
}

interface SyncEvent {
  type: SyncEventType;
  isOnline?: boolean;
  processed?: number;
  total?: number;
  error?: string;
  conflict?: ConflictInfo;
}

class SyncManager {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;
  private eventHandlers: Set<SyncEventHandler> = new Set();
  private lastSyncTime: Date | null = null;
  private lastPullTimestamp: number = 0; // Unix timestamp of last successful pull

  /**
   * Initialize the sync manager.
   * Call this when the app starts.
   */
  async initialize(): Promise<void> {
    // Subscribe to network state changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleNetworkChange);
    
    // Get initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Do initial sync if online
    if (this.isOnline) {
      this.sync();
    }
    
    console.log('[SyncManager] Initialized, online:', this.isOnline);
  }

  /**
   * Clean up resources.
   * Call this when the app is closing.
   */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    
    this.stopPeriodicSync();
    this.eventHandlers.clear();
    
    console.log('[SyncManager] Destroyed');
  }

  /**
   * Subscribe to sync events.
   */
  addEventListener(handler: SyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit an event to all handlers.
   */
  private emit(event: SyncEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.warn('[SyncManager] Event handler error:', error);
      }
    });
  }

  /**
   * Handle network state changes.
   */
  private handleNetworkChange = (state: NetInfoState): void => {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
    
    if (wasOnline !== this.isOnline) {
      console.log('[SyncManager] Network changed, online:', this.isOnline);
      this.emit({ type: 'network_change', isOnline: this.isOnline });
      
      // Sync when coming back online
      if (this.isOnline && !wasOnline) {
        this.sync();
      }
    }
  };

  /**
   * Start periodic sync interval.
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, SYNC_INTERVAL_MS);
  }

  /**
   * Stop periodic sync interval.
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get current sync status.
   */
  getStatus(): {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    pendingChanges: Promise<number>;
  } {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingChanges: getOfflineQueueCount(),
    };
  }

  /**
   * Trigger a manual sync (bidirectional).
   * First pushes local changes, then pulls server changes.
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncManager] Already syncing, skipping');
      return;
    }
    
    if (!this.isOnline) {
      console.log('[SyncManager] Offline, cannot sync');
      return;
    }
    
    this.isSyncing = true;
    this.emit({ type: 'started' });
    
    try {
      // PHASE 1: Push local changes to server
      const queue = await getOfflineQueue();
      let pushProcessed = 0;
      
      if (queue.length > 0) {
        console.log(`[SyncManager] Phase 1: Pushing ${queue.length} local changes`);
        
        for (const item of queue) {
          // Skip items that have exceeded retry attempts
          if (item.attempts >= MAX_RETRY_ATTEMPTS) {
            console.log(`[SyncManager] Skipping item ${item.id}, max retries exceeded`);
            continue;
          }
          
          try {
            await this.processQueueItem(item);
            await removeFromOfflineQueue(item.id);
            pushProcessed++;
            
            this.emit({
              type: 'progress',
              processed: pushProcessed,
              total: queue.length,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`[SyncManager] Failed to process item ${item.id}:`, errorMessage);
            await markQueueItemFailed(item.id, errorMessage);
          }
        }
        
        console.log(`[SyncManager] Push completed: ${pushProcessed}/${queue.length}`);
      }
      
      // PHASE 2: Pull changes from server
      console.log('[SyncManager] Phase 2: Pulling server changes');
      const pullCount = await this.pullFromServer();
      console.log(`[SyncManager] Pull completed: ${pullCount} records merged`);
      
      this.lastSyncTime = new Date();
      
      this.emit({
        type: 'completed',
        processed: pushProcessed + pullCount,
        total: queue.length + pullCount,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      console.error('[SyncManager] Sync error:', error);
      
      this.emit({
        type: 'failed',
        error: errorMessage,
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Pull changes from server and merge into local database.
   * Uses last pull timestamp to fetch only new/modified records.
   */
  async pullFromServer(): Promise<number> {
    try {
      const token = await getAccessToken();
      // #region agent log
      console.log('[DEBUG-H2,H4] pullFromServer:entry:', JSON.stringify({hasToken:!!token,tokenLength:token?.length||0,apiBaseUrl:API_BASE_URL}));
      // #endregion
      if (!token) {
        console.log('[SyncManager] No auth token, skipping pull');
        return 0;
      }
      
      // Load last pull timestamp from settings
      const lastPullStr = await getSetting('sync_last_pull_timestamp');
      this.lastPullTimestamp = lastPullStr ? parseInt(lastPullStr, 10) : 0;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      // #region agent log
      console.log('[DEBUG-H4,H5] pullFromServer:headers:', JSON.stringify({authHeaderPrefix:headers.Authorization?.substring(0,30),fullUrl:`${API_BASE_URL}/api/v1/sync/pull`}));
      
      let totalMerged = 0;
      let hasMore = true;
      let since = this.lastPullTimestamp;
      
      // Paginate through all changes
      while (hasMore) {
        const response = await axios.post<PullSyncResponse>(
          `${API_BASE_URL}/api/v1/sync/pull`,
          {
            since: since > 0 ? since : null,
            tables: ['scanned_properties', 'portfolio_properties'],
            limit: 100,
          },
          { headers, timeout: 30000 }
        );
        
        const data = response.data;
        
        // Merge scanned properties
        for (const record of data.scanned_properties) {
          await this.mergeRecord('scanned_properties', record);
          totalMerged++;
        }
        
        // Merge portfolio properties
        for (const record of data.portfolio_properties) {
          await this.mergeRecord('portfolio_properties', record);
          totalMerged++;
        }
        
        hasMore = data.has_more;
        since = data.next_since || data.server_time;
        
        // Update last pull timestamp
        this.lastPullTimestamp = data.server_time;
      }
      
      // Save last pull timestamp
      await setSetting('sync_last_pull_timestamp', String(this.lastPullTimestamp));
      
      return totalMerged;
    } catch (error: any) {
      // #region agent log
      console.log('[DEBUG-H1,H4] pullFromServer:error:', JSON.stringify({errorStatus:error?.response?.status,errorMessage:error?.response?.data?.detail||error?.message,errorName:error?.name,errorUrl:error?.config?.url}));
      // #endregion
      console.error('[SyncManager] Pull sync error:', error);
      // Don't throw - pull errors shouldn't fail the entire sync
      return 0;
    }
  }

  /**
   * Merge a single record from server into local database.
   * Uses last-write-wins strategy based on updated_at timestamp.
   */
  private async mergeRecord(tableName: string, record: SyncRecord): Promise<void> {
    const db = await getDatabase();
    
    if (record.action === 'delete') {
      // Delete the local record
      await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, record.id);
      console.log(`[SyncManager] Deleted ${tableName}/${record.id}`);
      return;
    }
    
    // Check if local record exists and its timestamp
    const localRecord = await db.getFirstAsync<{ id: string; updated_at: number }>(
      `SELECT id, updated_at FROM ${tableName} WHERE id = ?`,
      record.id
    );
    
    if (localRecord) {
      // Record exists - check timestamps (last-write-wins)
      if (record.updated_at > localRecord.updated_at) {
        // Server is newer - update local
        await this.updateLocalRecord(tableName, record);
        console.log(`[SyncManager] Updated ${tableName}/${record.id} from server`);
      } else {
        console.log(`[SyncManager] Skipping ${tableName}/${record.id} - local is newer`);
      }
    } else {
      // Record doesn't exist - insert
      await this.insertLocalRecord(tableName, record);
      console.log(`[SyncManager] Inserted ${tableName}/${record.id} from server`);
    }
  }

  /**
   * Insert a new record from server into local database.
   */
  private async insertLocalRecord(tableName: string, record: SyncRecord): Promise<void> {
    if (!record.data) return;
    
    const db = await getDatabase();
    const data = record.data;
    
    if (tableName === 'scanned_properties') {
      await db.runAsync(
        `INSERT OR REPLACE INTO scanned_properties 
         (id, address, city, state, zip, lat, lng, geohash, property_data, analytics_data, scanned_at, is_favorite, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        record.id,
        data.address || '',
        data.city || null,
        data.state || null,
        data.zip || null,
        data.lat || null,
        data.lng || null,
        data.geohash || null,
        data.property_data ? JSON.stringify(data.property_data) : null,
        data.analytics_data ? JSON.stringify(data.analytics_data) : null,
        data.scanned_at || record.created_at,
        data.is_favorite ? 1 : 0,
        record.created_at,
        record.updated_at
      );
    } else if (tableName === 'portfolio_properties') {
      await db.runAsync(
        `INSERT OR REPLACE INTO portfolio_properties 
         (id, address, city, state, zip, purchase_price, purchase_date, current_value, strategy, property_data, monthly_cash_flow, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        record.id,
        data.address || '',
        data.city || null,
        data.state || null,
        data.zip || null,
        data.purchase_price || null,
        data.purchase_date || null,
        data.current_value || null,
        data.strategy || null,
        data.property_data ? JSON.stringify(data.property_data) : null,
        data.monthly_cash_flow || null,
        data.notes || null,
        record.created_at,
        record.updated_at
      );
    }
  }

  /**
   * Update an existing local record with server data.
   */
  private async updateLocalRecord(tableName: string, record: SyncRecord): Promise<void> {
    // Use the same logic as insert with REPLACE
    await this.insertLocalRecord(tableName, record);
  }

  /**
   * Process a single queue item with conflict resolution.
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const payload = item.payload ? JSON.parse(item.payload) : null;
    
    switch (item.action) {
      case 'create':
        await this.syncCreate(item.table_name, payload, headers);
        break;
        
      case 'update':
        await this.syncUpdateWithConflictResolution(item.table_name, item.record_id, payload, headers, item);
        break;
        
      case 'delete':
        await this.syncDelete(item.table_name, item.record_id, headers);
        break;
        
      default:
        console.warn(`[SyncManager] Unknown action: ${item.action}`);
    }
  }

  /**
   * Sync a create action.
   */
  private async syncCreate(
    tableName: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<void> {
    const endpoint = this.getEndpoint(tableName);
    if (!endpoint) return;
    
    await axios.post(`${API_BASE_URL}${endpoint}`, payload, { headers });
  }

  /**
   * Sync an update action with last-write-wins conflict resolution.
   * Fetches server timestamp and compares with local timestamp.
   */
  private async syncUpdateWithConflictResolution(
    tableName: string,
    recordId: string | null,
    payload: any,
    headers: Record<string, string>,
    queueItem: OfflineQueueItem
  ): Promise<void> {
    const endpoint = this.getEndpoint(tableName);
    if (!endpoint || !recordId) return;
    
    const localTimestamp = payload?.updated_at || queueItem.created_at;
    
    try {
      // First, try to get the server's current version to check for conflicts
      const serverResponse = await axios.get(
        `${API_BASE_URL}${endpoint}/${recordId}`,
        { headers, validateStatus: (status) => status < 500 }
      );
      
      if (serverResponse.status === 200) {
        const serverData = serverResponse.data;
        const serverTimestamp = serverData?.updated_at || serverData?.created_at || 0;
        
        // Check for conflict: server was modified after local change was queued
        if (serverTimestamp > localTimestamp) {
          // Conflict detected - server has newer data
          // Using last-write-wins: local wins since user explicitly made this change
          console.log(`[SyncManager] Conflict detected for ${tableName}/${recordId}. Local timestamp: ${localTimestamp}, Server timestamp: ${serverTimestamp}. Applying local changes (last-write-wins).`);
          
          this.emit({
            type: 'conflict',
            conflict: {
              recordId,
              tableName,
              localTimestamp,
              serverTimestamp,
              resolution: 'local_wins',
            },
          });
        }
      }
      
      // Apply the local update (last-write-wins)
      await axios.patch(`${API_BASE_URL}${endpoint}/${recordId}`, payload, { headers });
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        // 404 means record doesn't exist on server - create it instead
        if (axiosError.response?.status === 404) {
          console.log(`[SyncManager] Record ${recordId} not found on server, creating instead of updating`);
          await this.syncCreate(tableName, { id: recordId, ...payload }, headers);
          return;
        }
        
        // 409 Conflict - server explicitly reports conflict
        if (axiosError.response?.status === 409) {
          const serverData = axiosError.response?.data as any;
          const serverTimestamp = serverData?.updated_at || 0;
          
          console.log(`[SyncManager] Server reported conflict for ${tableName}/${recordId}. Resolving with last-write-wins.`);
          
          this.emit({
            type: 'conflict',
            conflict: {
              recordId,
              tableName,
              localTimestamp,
              serverTimestamp,
              resolution: 'local_wins',
            },
          });
          
          // Force update with local data (add conflict resolution header)
          await axios.patch(
            `${API_BASE_URL}${endpoint}/${recordId}`,
            payload,
            { 
              headers: { 
                ...headers, 
                'X-Force-Update': 'true',
                'X-Local-Timestamp': String(localTimestamp),
              } 
            }
          );
          return;
        }
      }
      
      throw error;
    }
  }

  /**
   * Sync a delete action.
   */
  private async syncDelete(
    tableName: string,
    recordId: string | null,
    headers: Record<string, string>
  ): Promise<void> {
    const endpoint = this.getEndpoint(tableName);
    if (!endpoint || !recordId) return;
    
    try {
      await axios.delete(`${API_BASE_URL}${endpoint}/${recordId}`, { headers });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Already deleted on server - not an error
        console.log(`[SyncManager] Record ${recordId} already deleted on server`);
        return;
      }
      throw error;
    }
  }

  /**
   * Get API endpoint for a table.
   */
  private getEndpoint(tableName: string): string | null {
    const endpoints: Record<string, string> = {
      'portfolio_properties': '/api/v1/saved-properties',
      'scanned_properties': '/api/v1/scan-history',
      'settings': '/api/v1/user/settings',
    };
    
    return endpoints[tableName] || null;
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// React hook for sync status
import { useState, useEffect, useCallback } from 'react';

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const [lastConflict, setLastConflict] = useState<ConflictInfo | null>(null);

  useEffect(() => {
    // Get initial status
    const status = syncManager.getStatus();
    setIsOnline(status.isOnline);
    setIsSyncing(status.isSyncing);
    setLastSyncTime(status.lastSyncTime);
    status.pendingChanges.then(setPendingChanges);

    // Subscribe to sync events
    const unsubscribe = syncManager.addEventListener((event) => {
      switch (event.type) {
        case 'network_change':
          setIsOnline(event.isOnline ?? true);
          break;
        case 'started':
          setIsSyncing(true);
          setConflictCount(0); // Reset conflict count on new sync
          break;
        case 'completed':
        case 'failed':
          setIsSyncing(false);
          getOfflineQueueCount().then(setPendingChanges);
          if (event.type === 'completed') {
            setLastSyncTime(new Date());
          }
          break;
        case 'conflict':
          if (event.conflict) {
            setConflictCount(prev => prev + 1);
            setLastConflict(event.conflict);
          }
          break;
      }
    });

    return unsubscribe;
  }, []);

  const triggerSync = useCallback(() => {
    syncManager.sync();
  }, []);

  const clearConflicts = useCallback(() => {
    setConflictCount(0);
    setLastConflict(null);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTime,
    triggerSync,
    conflictCount,
    lastConflict,
    clearConflicts,
  };
}

// Initialize sync manager on import
// This will be called once when the module is first imported
syncManager.initialize().catch(console.error);

