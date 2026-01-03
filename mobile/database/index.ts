/**
 * Database module exports.
 * Import from here for all database operations.
 */

// Database connection
export { getDatabase, closeDatabase, deleteDatabase, withTransaction } from './db';

// Schema types
export type {
  ScannedProperty,
  PortfolioProperty,
  OfflineQueueItem,
  Setting,
  PropertyData,
  AnalyticsData,
} from './schema';

// Query functions
export {
  // Scanned properties
  saveScannedProperty,
  getScannedProperties,
  getScannedPropertiesNearby,
  getScannedPropertyById,
  togglePropertyFavorite,
  updatePropertyNotes,
  deleteScannedProperty,
  getScannedPropertyCount,
  
  // Portfolio
  addPortfolioProperty,
  getPortfolioProperties,
  getPortfolioPropertyById,
  updatePortfolioProperty,
  deletePortfolioProperty,
  getPortfolioSummary,
  
  // Offline queue
  queueOfflineAction,
  getOfflineQueue,
  removeFromOfflineQueue,
  markQueueItemFailed,
  getOfflineQueueCount,
  clearOfflineQueue,
  
  // Settings
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
  
  // Utilities
  getDatabaseStats,
  clearAllData,
} from './queries';

