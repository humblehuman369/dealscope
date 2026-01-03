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
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
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
  console.log(`Applying migration to version ${version}`);
  
  // Version 1 is the initial schema (already applied via CREATE_TABLES_SQL)
  // Future migrations would be added here as cases
  switch (version) {
    case 1:
      // Initial schema - no additional SQL needed
      break;
    // Add future migrations here:
    // case 2:
    //   await database.execAsync('ALTER TABLE scanned_properties ADD COLUMN new_field TEXT');
    //   break;
    default:
      console.warn(`Unknown migration version: ${version}`);
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
    console.log('Database closed');
  }
}

/**
 * Delete the database file (for testing or reset).
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  console.log('Database deleted');
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

