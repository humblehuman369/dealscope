/**
 * Sync Manager for offline-first data synchronization.
 * Monitors network status and processes queued changes when online.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import axios from 'axios';
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  markQueueItemFailed,
  getOfflineQueueCount,
  OfflineQueueItem,
} from '../database';
import { getAccessToken } from './authService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';
const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

type SyncEventType = 'started' | 'completed' | 'failed' | 'progress' | 'network_change';
type SyncEventHandler = (event: SyncEvent) => void;

interface SyncEvent {
  type: SyncEventType;
  isOnline?: boolean;
  processed?: number;
  total?: number;
  error?: string;
}

class SyncManager {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;
  private eventHandlers: Set<SyncEventHandler> = new Set();
  private lastSyncTime: Date | null = null;

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
   * Trigger a manual sync.
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
      // Get pending items
      const queue = await getOfflineQueue();
      
      if (queue.length === 0) {
        console.log('[SyncManager] No pending changes');
        this.lastSyncTime = new Date();
        this.emit({ type: 'completed', processed: 0, total: 0 });
        return;
      }
      
      console.log(`[SyncManager] Processing ${queue.length} queued items`);
      
      let processed = 0;
      
      for (const item of queue) {
        // Skip items that have exceeded retry attempts
        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          console.log(`[SyncManager] Skipping item ${item.id}, max retries exceeded`);
          continue;
        }
        
        try {
          await this.processQueueItem(item);
          await removeFromOfflineQueue(item.id);
          processed++;
          
          this.emit({
            type: 'progress',
            processed,
            total: queue.length,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`[SyncManager] Failed to process item ${item.id}:`, errorMessage);
          await markQueueItemFailed(item.id, errorMessage);
        }
      }
      
      this.lastSyncTime = new Date();
      console.log(`[SyncManager] Sync completed, processed ${processed}/${queue.length}`);
      
      this.emit({
        type: 'completed',
        processed,
        total: queue.length,
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
   * Process a single queue item.
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
        await this.syncUpdate(item.table_name, item.record_id, payload, headers);
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
   * Sync an update action.
   */
  private async syncUpdate(
    tableName: string,
    recordId: string | null,
    payload: any,
    headers: Record<string, string>
  ): Promise<void> {
    const endpoint = this.getEndpoint(tableName);
    if (!endpoint || !recordId) return;
    
    await axios.patch(`${API_BASE_URL}${endpoint}/${recordId}`, payload, { headers });
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
    
    await axios.delete(`${API_BASE_URL}${endpoint}/${recordId}`, { headers });
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
          break;
        case 'completed':
        case 'failed':
          setIsSyncing(false);
          getOfflineQueueCount().then(setPendingChanges);
          if (event.type === 'completed') {
            setLastSyncTime(new Date());
          }
          break;
      }
    });

    return unsubscribe;
  }, []);

  const triggerSync = useCallback(() => {
    syncManager.sync();
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTime,
    triggerSync,
  };
}

// Initialize sync manager on import
// This will be called once when the module is first imported
syncManager.initialize().catch(console.error);

