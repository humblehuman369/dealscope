/**
 * Database connection singleton for expo-sqlite.
 * Provides a single database instance across the app.
 */

import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, CREATE_TABLES_SQL, DATABASE_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Get or create the database instance.
 * Initializes tables on first call.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db && isInitialized) {
    return db;
  }

  // Open or create the database
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  
  // Initialize tables if needed
  await initializeDatabase(db);
  isInitialized = true;
  
  return db;
}

/**
 * Initialize database tables and run migrations.
 */
async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Enable foreign keys
    await database.execAsync('PRAGMA foreign_keys = ON;');
    
    // Create tables if they don't exist
    await database.execAsync(CREATE_TABLES_SQL);
    
    // Check and run migrations
    await runMigrations(database);
    
    if (__DEV__) console.log('Database initialized successfully');
  } catch (error) {
    if (__DEV__) console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Run any pending migrations.
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Get current version
  const result = await database.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM db_version'
  );
  
  const currentVersion = result?.version ?? 0;
  
  if (currentVersion < DATABASE_VERSION) {
    // Run migrations from currentVersion to DATABASE_VERSION
    for (let v = currentVersion + 1; v <= DATABASE_VERSION; v++) {
      await applyMigration(database, v);
    }
  }
}

/**
 * Apply a specific migration version.
 */
async function applyMigration(database: SQLite.SQLiteDatabase, version: number): Promise<void> {
  if (__DEV__) console.log(`Applying migration to version ${version}`);
  
  // Version 1 is the initial schema (already applied via CREATE_TABLES_SQL)
  // Future migrations would be added here as cases
  switch (version) {
    case 1:
      // Initial schema — no additional SQL needed
      break;

    case 2:
      // Added synced tables (saved_properties, search_history, documents, etc.)
      // These are created via CREATE TABLE IF NOT EXISTS, so no extra SQL here.
      break;

    case 3: {
      // Add last_modified_at for offline conflict detection.
      // NULL = clean (matches server). Non-NULL = local edit pending sync.
      // Each ALTER is separate + guarded because CREATE_TABLES_SQL already
      // includes the column for fresh installs — only upgrades need migration.
      const v3Tables = [
        'saved_properties',
        'search_history',
        'documents',
        'deal_maker_records',
        'loi_history',
      ];
      for (const table of v3Tables) {
        try {
          await database.execAsync(
            `ALTER TABLE ${table} ADD COLUMN last_modified_at INTEGER`
          );
        } catch {
          // Column already exists (fresh install) — safe to ignore.
        }
      }
      break;
    }

    case 4: {
      // Add retry backoff and status tracking to offline queue.
      // next_retry_at enables exponential backoff; status marks exhausted items.
      const v4Columns: [string, string][] = [
        ['next_retry_at', 'INTEGER'],
        ['status', "TEXT DEFAULT 'pending'"],
      ];
      for (const [col, type] of v4Columns) {
        try {
          await database.execAsync(
            `ALTER TABLE offline_queue ADD COLUMN ${col} ${type}`
          );
        } catch {
          // Column already exists (fresh install) — safe to ignore.
        }
      }
      break;
    }

    default:
      if (__DEV__) console.warn(`Unknown migration version: ${version}`);
  }
  
  // Record the migration
  await database.runAsync(
    'INSERT OR REPLACE INTO db_version (version) VALUES (?)',
    version
  );
}

/**
 * Close the database connection.
 * Call this when the app is closing or during cleanup.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    isInitialized = false;
    if (__DEV__) console.log('Database closed');
  }
}

/**
 * Delete the database file (for testing or reset).
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  if (__DEV__) console.log('Database deleted');
}

/**
 * Execute a transaction with multiple statements.
 */
export async function withTransaction<T>(
  callback: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const database = await getDatabase();
  
  try {
    await database.execAsync('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.execAsync('COMMIT');
    return result;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

