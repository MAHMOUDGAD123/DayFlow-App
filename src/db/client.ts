import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import { DB_NAME } from './constants';

export const sqlite = openDatabaseSync(DB_NAME);
try {
  sqlite.execSync('PRAGMA foreign_keys = ON;');
} catch {
  // Ignored in mock/testing environments
}

export const db = drizzle(sqlite, { schema });
export type Database = typeof db;

export async function ensureDatabaseReady(): Promise<void> {
  try {
    await sqlite.execAsync('PRAGMA foreign_keys = ON;');
  } catch {
    // Ignored in mock/testing environments
  }
}


