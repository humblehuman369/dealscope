/**
 * Database query functions for all tables.
 * Provides type-safe CRUD operations.
 */

import { getDatabase, withTransaction } from './db';
import {
  ScannedProperty,
  PortfolioProperty,
  OfflineQueueItem,
  Setting,
  PropertyData,
  AnalyticsData,
} from './schema';

// ============================================
// SCANNED PROPERTIES
// ============================================

/**
 * Generate a unique ID for new records.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate geohash for coordinates (simple implementation).
 * Precision 7 gives ~76m x 76m cells.
 */
function calculateGeohash(lat: number, lng: number, precision: number = 7): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isLng = !isLng;
    if (bit < 4) {
      bit++;
    } else {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/**
 * Save a scanned property to the database.
 * Automatically queues the property for server sync.
 */
export async function saveScannedProperty(
  address: string,
  city: string | null,
  state: string | null,
  zip: string | null,
  lat: number | null,
  lng: number | null,
  propertyData: PropertyData | null,
  analyticsData: AnalyticsData | null
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const geohash = lat && lng ? calculateGeohash(lat, lng) : null;

  await db.runAsync(
    `INSERT INTO scanned_properties 
     (id, address, city, state, zip, lat, lng, geohash, property_data, analytics_data, scanned_at, is_favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    address,
    city,
    state,
    zip,
    lat,
    lng,
    geohash,
    propertyData ? JSON.stringify(propertyData) : null,
    analyticsData ? JSON.stringify(analyticsData) : null,
    now,
    now,
    now
  );

  // Queue for server sync
  await queueOfflineAction('create', 'scanned_properties', id, {
    id,
    address,
    city,
    state,
    zip,
    lat,
    lng,
    geohash,
    property_data: propertyData,
    analytics_data: analyticsData,
    scanned_at: now,
    is_favorite: false,
    created_at: now,
    updated_at: now,
  });

  return id;
}

/**
 * Get all scanned properties, optionally filtered.
 */
export async function getScannedProperties(options?: {
  favoritesOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ScannedProperty[]> {
  const db = await getDatabase();
  
  let query = 'SELECT * FROM scanned_properties';
  const params: any[] = [];
  
  if (options?.favoritesOnly) {
    query += ' WHERE is_favorite = 1';
  }
  
  query += ' ORDER BY scanned_at DESC';
  
  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  if (options?.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  return db.getAllAsync<ScannedProperty>(query, ...params);
}

/**
 * Get scanned properties near a location.
 */
export async function getScannedPropertiesNearby(
  lat: number,
  lng: number,
  precision: number = 5 // Lower precision = larger area
): Promise<ScannedProperty[]> {
  const db = await getDatabase();
  const geohashPrefix = calculateGeohash(lat, lng, precision);
  
  return db.getAllAsync<ScannedProperty>(
    'SELECT * FROM scanned_properties WHERE geohash LIKE ? ORDER BY scanned_at DESC',
    `${geohashPrefix}%`
  );
}

/**
 * Get a single scanned property by ID.
 */
export async function getScannedPropertyById(id: string): Promise<ScannedProperty | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ScannedProperty>(
    'SELECT * FROM scanned_properties WHERE id = ?',
    id
  );
}

/**
 * Toggle favorite status for a scanned property.
 * Automatically queues the update for server sync.
 */
export async function togglePropertyFavorite(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = Math.floor(Date.now() / 1000);
  
  await db.runAsync(
    'UPDATE scanned_properties SET is_favorite = 1 - is_favorite, updated_at = ? WHERE id = ?',
    now,
    id
  );
  
  const result = await db.getFirstAsync<{ is_favorite: number }>(
    'SELECT is_favorite FROM scanned_properties WHERE id = ?',
    id
  );
  
  const isFavorite = result?.is_favorite === 1;
  
  // Queue for server sync
  await queueOfflineAction('update', 'scanned_properties', id, {
    is_favorite: isFavorite,
    updated_at: now,
  });
  
  return isFavorite;
}

/**
 * Update notes for a scanned property.
 * Automatically queues the update for server sync.
 */
export async function updatePropertyNotes(id: string, notes: string): Promise<void> {
  const db = await getDatabase();
  const now = Math.floor(Date.now() / 1000);
  
  await db.runAsync(
    'UPDATE scanned_properties SET notes = ?, updated_at = ? WHERE id = ?',
    notes,
    now,
    id
  );
  
  // Queue for server sync
  await queueOfflineAction('update', 'scanned_properties', id, {
    notes,
    updated_at: now,
  });
}

/**
 * Delete a scanned property.
 * Automatically queues the deletion for server sync.
 */
export async function deleteScannedProperty(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM scanned_properties WHERE id = ?', id);
  
  // Queue for server sync
  await queueOfflineAction('delete', 'scanned_properties', id, null);
}

/**
 * Get count of scanned properties.
 */
export async function getScannedPropertyCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM scanned_properties'
  );
  return result?.count ?? 0;
}

// ============================================
// PORTFOLIO PROPERTIES
// ============================================

/**
 * Add a property to the portfolio.
 * Automatically queues the property for server sync.
 */
export async function addPortfolioProperty(
  address: string,
  city: string | null,
  state: string | null,
  zip: string | null,
  purchasePrice: number | null,
  purchaseDate: number | null,
  strategy: string | null,
  propertyData: PropertyData | null
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.runAsync(
    `INSERT INTO portfolio_properties 
     (id, address, city, state, zip, purchase_price, purchase_date, strategy, property_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    address,
    city,
    state,
    zip,
    purchasePrice,
    purchaseDate,
    strategy,
    propertyData ? JSON.stringify(propertyData) : null,
    now,
    now
  );

  // Queue for server sync
  await queueOfflineAction('create', 'portfolio_properties', id, {
    id,
    address,
    city,
    state,
    zip,
    purchase_price: purchasePrice,
    purchase_date: purchaseDate,
    strategy,
    property_data: propertyData,
    created_at: now,
    updated_at: now,
  });

  return id;
}

/**
 * Get all portfolio properties.
 */
export async function getPortfolioProperties(): Promise<PortfolioProperty[]> {
  const db = await getDatabase();
  return db.getAllAsync<PortfolioProperty>(
    'SELECT * FROM portfolio_properties ORDER BY purchase_date DESC'
  );
}

/**
 * Get a single portfolio property by ID.
 */
export async function getPortfolioPropertyById(id: string): Promise<PortfolioProperty | null> {
  const db = await getDatabase();
  return db.getFirstAsync<PortfolioProperty>(
    'SELECT * FROM portfolio_properties WHERE id = ?',
    id
  );
}

/**
 * Update a portfolio property.
 * Automatically queues the update for server sync.
 */
export async function updatePortfolioProperty(
  id: string,
  updates: Partial<Omit<PortfolioProperty, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const db = await getDatabase();
  const now = Math.floor(Date.now() / 1000);
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'property_data' ? JSON.stringify(value) : value);
    }
  });
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  await db.runAsync(
    `UPDATE portfolio_properties SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
  
  // Queue for server sync
  await queueOfflineAction('update', 'portfolio_properties', id, {
    ...updates,
    updated_at: now,
  });
}

/**
 * Delete a portfolio property.
 * Automatically queues the deletion for server sync.
 */
export async function deletePortfolioProperty(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM portfolio_properties WHERE id = ?', id);
  
  // Queue for server sync
  await queueOfflineAction('delete', 'portfolio_properties', id, null);
}

/**
 * Get portfolio summary statistics.
 */
export async function getPortfolioSummary(): Promise<{
  totalProperties: number;
  totalValue: number;
  totalEquity: number;
  monthlyIncome: number;
}> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    count: number;
    total_value: number;
    total_cash_flow: number;
  }>(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(current_value), 0) as total_value,
      COALESCE(SUM(monthly_cash_flow), 0) as total_cash_flow
    FROM portfolio_properties
  `);
  
  return {
    totalProperties: result?.count ?? 0,
    totalValue: result?.total_value ?? 0,
    totalEquity: result?.total_value ?? 0, // Simplified - would need loan balances
    monthlyIncome: result?.total_cash_flow ?? 0,
  };
}

// ============================================
// OFFLINE QUEUE
// ============================================

/**
 * Add an action to the offline queue.
 */
export async function queueOfflineAction(
  action: 'create' | 'update' | 'delete',
  tableName: string,
  recordId: string | null,
  payload: any
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.runAsync(
    `INSERT INTO offline_queue (id, action, table_name, record_id, payload, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    id,
    action,
    tableName,
    recordId,
    JSON.stringify(payload),
    now
  );

  return id;
}

/**
 * Get all pending offline queue items.
 */
export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<OfflineQueueItem>(
    'SELECT * FROM offline_queue ORDER BY created_at ASC'
  );
}

/**
 * Mark a queue item as processed (delete it).
 */
export async function removeFromOfflineQueue(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM offline_queue WHERE id = ?', id);
}

/**
 * Increment attempt count and record error for a queue item.
 */
export async function markQueueItemFailed(id: string, error: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE offline_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
    error,
    id
  );
}

/**
 * Get count of pending offline actions.
 */
export async function getOfflineQueueCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_queue'
  );
  return result?.count ?? 0;
}

/**
 * Clear the offline queue.
 */
export async function clearOfflineQueue(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM offline_queue');
}

// ============================================
// SETTINGS
// ============================================

/**
 * Get a setting value.
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Setting>(
    'SELECT * FROM settings WHERE key = ?',
    key
  );
  return result?.value ?? null;
}

/**
 * Set a setting value.
 */
export async function setSetting(key: string, value: string | null): Promise<void> {
  const db = await getDatabase();
  const now = Math.floor(Date.now() / 1000);
  
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
    key,
    value,
    now
  );
}

/**
 * Get all settings.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const results = await db.getAllAsync<Setting>('SELECT * FROM settings');
  
  const settings: Record<string, string> = {};
  results.forEach(row => {
    if (row.value !== null) {
      settings[row.key] = row.value;
    }
  });
  
  return settings;
}

/**
 * Delete a setting.
 */
export async function deleteSetting(key: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM settings WHERE key = ?', key);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get database statistics for debugging/settings.
 */
export async function getDatabaseStats(): Promise<{
  scannedCount: number;
  portfolioCount: number;
  queueCount: number;
  settingsCount: number;
}> {
  const db = await getDatabase();
  
  const [scanned, portfolio, queue, settings] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM scanned_properties'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM portfolio_properties'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM offline_queue'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM settings'),
  ]);
  
  return {
    scannedCount: scanned?.count ?? 0,
    portfolioCount: portfolio?.count ?? 0,
    queueCount: queue?.count ?? 0,
    settingsCount: settings?.count ?? 0,
  };
}

/**
 * Clear all data from the database (factory reset).
 */
export async function clearAllData(): Promise<void> {
  return withTransaction(async (db) => {
    await db.runAsync('DELETE FROM scanned_properties');
    await db.runAsync('DELETE FROM portfolio_properties');
    await db.runAsync('DELETE FROM offline_queue');
    await db.runAsync('DELETE FROM settings');
  });
}

