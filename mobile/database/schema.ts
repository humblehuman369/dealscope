/**
 * Database schema definitions for expo-sqlite.
 * Defines table structures for offline storage.
 */

export const DATABASE_NAME = 'investiq.db';
export const DATABASE_VERSION = 1;

/**
 * SQL statements to create all tables.
 */
export const CREATE_TABLES_SQL = `
-- Scanned properties cache
CREATE TABLE IF NOT EXISTS scanned_properties (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat REAL,
  lng REAL,
  geohash TEXT,
  property_data TEXT,
  analytics_data TEXT,
  scanned_at INTEGER NOT NULL,
  is_favorite INTEGER DEFAULT 0,
  notes TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for geohash queries (nearby properties)
CREATE INDEX IF NOT EXISTS idx_scanned_geohash ON scanned_properties(geohash);

-- Index for favorites filter
CREATE INDEX IF NOT EXISTS idx_scanned_favorite ON scanned_properties(is_favorite);

-- Index for date sorting
CREATE INDEX IF NOT EXISTS idx_scanned_date ON scanned_properties(scanned_at DESC);

-- Portfolio properties (user-owned investments)
CREATE TABLE IF NOT EXISTS portfolio_properties (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  purchase_price REAL,
  purchase_date INTEGER,
  current_value REAL,
  strategy TEXT,
  property_data TEXT,
  monthly_cash_flow REAL,
  notes TEXT,
  synced_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Offline sync queue for changes made while offline
CREATE TABLE IF NOT EXISTS offline_queue (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  payload TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT
);

-- Index for processing queue in order
CREATE INDEX IF NOT EXISTS idx_queue_created ON offline_queue(created_at ASC);

-- User settings and preferences
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Database version tracking for migrations
CREATE TABLE IF NOT EXISTS db_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER DEFAULT (strftime('%s', 'now'))
);
`;

/**
 * TypeScript interfaces matching database tables.
 */
export interface ScannedProperty {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  geohash: string | null;
  property_data: string | null; // JSON string
  analytics_data: string | null; // JSON string
  scanned_at: number;
  is_favorite: number; // 0 or 1
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface PortfolioProperty {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  purchase_price: number | null;
  purchase_date: number | null;
  current_value: number | null;
  strategy: string | null;
  property_data: string | null; // JSON string
  monthly_cash_flow: number | null;
  notes: string | null;
  synced_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface OfflineQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string | null;
  payload: string | null; // JSON string
  created_at: number;
  attempts: number;
  last_error: string | null;
}

export interface Setting {
  key: string;
  value: string | null;
  updated_at: number;
}

/**
 * Parsed property data from JSON blob.
 */
export interface PropertyData {
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: string;
}

/**
 * Parsed analytics data from JSON blob.
 */
export interface AnalyticsData {
  listPrice?: number;
  estimatedValue?: number;
  rentEstimate?: number;
  strEstimate?: number;
  strategies?: {
    longTermRental?: StrategyResult;
    shortTermRental?: StrategyResult;
    brrrr?: StrategyResult;
    fixAndFlip?: StrategyResult;
    houseHack?: StrategyResult;
    wholesale?: StrategyResult;
  };
}

interface StrategyResult {
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: number;
  secondaryLabel: string;
  isProfit: boolean;
}

