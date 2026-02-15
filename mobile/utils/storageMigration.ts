/**
 * One-time AsyncStorage key migration (rebrand: investiq → dealgapiq).
 *
 * Zustand persist and raw AsyncStorage.setItem both use a string key.
 * Renaming that key orphans previously-saved data.  This utility copies
 * old-key data to the new key (if the new key is empty) and removes the
 * old entry so the migration is idempotent.
 *
 * Call `migrateAsyncStorageKeys()` once during app startup — before stores
 * hydrate.  It is intentionally fire-and-forget safe.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// ─── Key Migrations ──────────────────────────────────────────────────────────

const KEY_MIGRATIONS: [string, string][] = [
  // Zustand persist stores
  ['investiq-assumptions', 'dealgapiq-assumptions'],
  ['investiq-property', 'dealgapiq-property'],
  ['investiq-deal-maker', 'dealgapiq-deal-maker'],
  ['investiq-worksheets', 'dealgapiq-worksheets'],
  // Theme preference
  ['@realvestiq_theme_mode', '@dealgapiq_theme_mode'],
  // Raw AsyncStorage keys
  ['investiq-progressive-profile', 'dealgapiq-progressive-profile'],
  ['investiq_defaults', 'dealgapiq_defaults'],
  ['investiq_defaults_timestamp', 'dealgapiq_defaults_timestamp'],
  ['investiq-scenarios', 'dealgapiq-scenarios'],
  ['investiq-comparisons', 'dealgapiq-comparisons'],
];

// Prefix-based keys (DealMaker per-property state)
const PREFIX_MIGRATIONS: [string, string][] = [
  ['investiq-dm-state::', 'dealgapiq-dm-state::'],
];

// ─── SQLite Database Migration ───────────────────────────────────────────────

const OLD_DB_NAME = 'investiq.db';
const NEW_DB_NAME = 'dealgapiq.db';

/**
 * Migrate all AsyncStorage keys and the SQLite database file.
 * Safe to call multiple times — only migrates data that hasn't moved yet.
 */
export async function migrateAsyncStorageKeys(): Promise<void> {
  try {
    // 1. Migrate simple key→key pairs
    const allOldKeys = KEY_MIGRATIONS.map(([old]) => old);
    const allNewKeys = KEY_MIGRATIONS.map(([, newK]) => newK);

    const [oldValues, newValues] = await Promise.all([
      AsyncStorage.multiGet(allOldKeys),
      AsyncStorage.multiGet(allNewKeys),
    ]);

    const toSet: [string, string][] = [];
    const toRemove: string[] = [];

    for (let i = 0; i < KEY_MIGRATIONS.length; i++) {
      const [oldKey, newKey] = KEY_MIGRATIONS[i];
      const oldVal = oldValues[i][1];
      const newVal = newValues[i][1];

      if (oldVal !== null && newVal === null) {
        toSet.push([newKey, oldVal]);
        toRemove.push(oldKey);
      }
    }

    if (toSet.length > 0) {
      await AsyncStorage.multiSet(toSet);
      await AsyncStorage.multiRemove(toRemove);
    }

    // 2. Migrate prefix-based keys (investiq-dm-state::*)
    const allKeys = await AsyncStorage.getAllKeys();
    for (const [oldPrefix, newPrefix] of PREFIX_MIGRATIONS) {
      const prefixKeys = allKeys.filter((k) => k.startsWith(oldPrefix));
      if (prefixKeys.length === 0) continue;

      const entries = await AsyncStorage.multiGet(prefixKeys);
      const prefixToSet: [string, string][] = [];
      const prefixToRemove: string[] = [];

      for (const [key, value] of entries) {
        if (value === null) continue;
        const newKey = newPrefix + key.slice(oldPrefix.length);
        prefixToSet.push([newKey, value]);
        prefixToRemove.push(key);
      }

      if (prefixToSet.length > 0) {
        await AsyncStorage.multiSet(prefixToSet);
        await AsyncStorage.multiRemove(prefixToRemove);
      }
    }

    // 3. Migrate SQLite database file
    await migrateSQLiteDatabase();
  } catch (error) {
    // Migration failures should never crash the app — users simply start
    // with fresh defaults, which is the same pre-migration behavior.
    if (__DEV__) {
      console.warn('[storageMigration] Migration error (non-fatal):', error);
    }
  }
}

/**
 * Rename the SQLite database file from old name to new name.
 * Only runs if the old file exists and the new file does not.
 */
async function migrateSQLiteDatabase(): Promise<void> {
  if (!FileSystem.documentDirectory) return;

  const oldPath = `${FileSystem.documentDirectory}SQLite/${OLD_DB_NAME}`;
  const newPath = `${FileSystem.documentDirectory}SQLite/${NEW_DB_NAME}`;

  const [oldInfo, newInfo] = await Promise.all([
    FileSystem.getInfoAsync(oldPath),
    FileSystem.getInfoAsync(newPath),
  ]);

  if (oldInfo.exists && !newInfo.exists) {
    // Move main database file
    await FileSystem.moveAsync({ from: oldPath, to: newPath });

    // Also move WAL and SHM journal files if they exist
    for (const suffix of ['-wal', '-shm']) {
      const oldJournal = oldPath + suffix;
      const newJournal = newPath + suffix;
      const journalInfo = await FileSystem.getInfoAsync(oldJournal);
      if (journalInfo.exists) {
        await FileSystem.moveAsync({ from: oldJournal, to: newJournal });
      }
    }
  }
}
