import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';
import { DB_NAME } from './constants';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _sqlite: SQLiteDatabase | null = null;
let _db: DrizzleDb | null = null;
let _initPromise: Promise<void> | null = null;

export async function ensureDatabaseReady(): Promise<void> {
  if (_sqlite && _db) return;
  if (!_initPromise) {
    _initPromise = (async () => {
      _sqlite = await openDatabaseAsync(DB_NAME);
      _db = drizzle(_sqlite, { schema });
    })();
  }
  await _initPromise;
}

export const sqlite: SQLiteDatabase = new Proxy({} as SQLiteDatabase, {
  get(target, prop, receiver) {
    if (!_sqlite) {
      throw new Error(
        'Database not initialized yet on web. Call and await ensureDatabaseReady() or initDatabase() first.'
      );
    }
    const val = Reflect.get(_sqlite, prop, receiver);
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(_sqlite);
    }
    return val;
  },
});

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(target, prop, receiver) {
    if (!_db) {
      throw new Error(
        'Database not initialized yet on web. Call and await ensureDatabaseReady() or initDatabase() first.'
      );
    }
    const val = Reflect.get(_db, prop, receiver);
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(_db);
    }
    return val;
  },
});

export type Database = DrizzleDb;
