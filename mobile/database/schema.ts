/**
 * Database schema definitions for expo-sqlite.
 * Defines table structures for offline storage.
 */

export const DATABASE_NAME = 'investiq.db';
export const DATABASE_VERSION = 2; // Incremented for new tables

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

-- Saved properties (synced from API)
CREATE TABLE IF NOT EXISTS saved_properties (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  list_price REAL,
  status TEXT DEFAULT 'watching',
  nickname TEXT,
  notes TEXT,
  color_label TEXT,
  is_priority INTEGER DEFAULT 0,
  tags TEXT,
  best_strategy TEXT,
  best_cash_flow REAL,
  best_coc_return REAL,
  deal_maker_id TEXT,
  last_analysis_at INTEGER,
  synced_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for saved properties status
CREATE INDEX IF NOT EXISTS idx_saved_status ON saved_properties(status);

-- Index for saved properties priority
CREATE INDEX IF NOT EXISTS idx_saved_priority ON saved_properties(is_priority DESC);

-- Index for saved properties date
CREATE INDEX IF NOT EXISTS idx_saved_date ON saved_properties(created_at DESC);

-- Search history cache
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  search_type TEXT NOT NULL,
  query TEXT,
  results_count INTEGER DEFAULT 0,
  source TEXT,
  location_city TEXT,
  location_state TEXT,
  property_types TEXT,
  price_range_min REAL,
  price_range_max REAL,
  synced_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for search history date
CREATE INDEX IF NOT EXISTS idx_search_date ON search_history(created_at DESC);

-- Documents cache
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  saved_property_id TEXT,
  document_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  description TEXT,
  synced_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for documents by property
CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(saved_property_id);

-- Deal maker records cache
CREATE TABLE IF NOT EXISTS deal_maker_records (
  id TEXT PRIMARY KEY,
  saved_property_id TEXT NOT NULL,
  initial_assumptions TEXT,
  cached_metrics TEXT,
  last_calculated_at INTEGER,
  synced_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (saved_property_id) REFERENCES saved_properties(id) ON DELETE CASCADE
);

-- Index for deal maker by property
CREATE INDEX IF NOT EXISTS idx_deal_maker_property ON deal_maker_records(saved_property_id);

-- LOI history cache
CREATE TABLE IF NOT EXISTS loi_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  saved_property_id TEXT,
  property_address TEXT NOT NULL,
  offer_price REAL NOT NULL,
  earnest_money REAL,
  inspection_days INTEGER,
  closing_days INTEGER,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  synced_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for LOI by property
CREATE INDEX IF NOT EXISTS idx_loi_property ON loi_history(saved_property_id);

-- Sync metadata for tracking last sync times
CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name TEXT PRIMARY KEY,
  last_synced_at INTEGER,
  last_sync_status TEXT,
  items_synced INTEGER DEFAULT 0
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

/**
 * Saved property from API cache.
 */
export interface CachedSavedProperty {
  id: string;
  user_id: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  list_price: number | null;
  status: string;
  nickname: string | null;
  notes: string | null;
  color_label: string | null;
  is_priority: number; // 0 or 1
  tags: string | null; // JSON array
  best_strategy: string | null;
  best_cash_flow: number | null;
  best_coc_return: number | null;
  deal_maker_id: string | null;
  last_analysis_at: number | null;
  synced_at: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * Search history entry from API cache.
 */
export interface CachedSearchHistory {
  id: string;
  user_id: string | null;
  search_type: string;
  query: string | null;
  results_count: number;
  source: string | null;
  location_city: string | null;
  location_state: string | null;
  property_types: string | null; // JSON array
  price_range_min: number | null;
  price_range_max: number | null;
  synced_at: number | null;
  created_at: number;
}

/**
 * Document metadata from API cache.
 */
export interface CachedDocument {
  id: string;
  user_id: string | null;
  saved_property_id: string | null;
  document_type: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  synced_at: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * Deal maker record from API cache.
 */
export interface CachedDealMakerRecord {
  id: string;
  saved_property_id: string;
  initial_assumptions: string | null; // JSON object
  cached_metrics: string | null; // JSON object
  last_calculated_at: number | null;
  synced_at: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * LOI history entry from API cache.
 */
export interface CachedLOIHistory {
  id: string;
  user_id: string | null;
  saved_property_id: string | null;
  property_address: string;
  offer_price: number;
  earnest_money: number | null;
  inspection_days: number | null;
  closing_days: number | null;
  status: string;
  pdf_url: string | null;
  synced_at: number | null;
  created_at: number;
}

/**
 * Sync metadata for tracking sync state.
 */
export interface SyncMetadata {
  table_name: string;
  last_synced_at: number | null;
  last_sync_status: string | null;
  items_synced: number;
}

