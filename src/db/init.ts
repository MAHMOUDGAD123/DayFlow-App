import { sqlite, db, ensureDatabaseReady } from './client';
import { categories } from './schema';
import { sql } from 'drizzle-orm';

const DEFAULT_CATEGORIES = [
  { id: 'cat_work', nameKey: 'categories.work', customName: null, color: '#3B82F6', icon: 'briefcase', isSystem: true },
  { id: 'cat_study', nameKey: 'categories.study', customName: null, color: '#8B5CF6', icon: 'book-open', isSystem: true },
  { id: 'cat_reading', nameKey: 'categories.reading', customName: null, color: '#EC4899', icon: 'bookmark', isSystem: true },
  { id: 'cat_health', nameKey: 'categories.health', customName: null, color: '#10B981', icon: 'activity', isSystem: true },
  { id: 'cat_worship', nameKey: 'categories.worship', customName: null, color: '#F59E0B', icon: 'sun', isSystem: true },
  { id: 'cat_personal', nameKey: 'categories.personal', customName: null, color: '#06B6D4', icon: 'user', isSystem: true },
];

export async function initDatabase(): Promise<void> {
  await ensureDatabaseReady();

  try {
    await sqlite.execAsync('PRAGMA foreign_keys = ON;');
  } catch {
    // Ignored in mock/testing environments
  }

  // Execute schema definitions
  await sqlite.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name_key TEXT,
      custom_name TEXT,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      days_mask INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 0,
      sleep_start_minutes INTEGER NOT NULL DEFAULT 1380,
      sleep_end_minutes INTEGER NOT NULL DEFAULT 420,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      start_minutes INTEGER NOT NULL,
      end_minutes INTEGER NOT NULL,
      start_prayer TEXT,
      end_prayer TEXT,
      category_id TEXT NOT NULL REFERENCES categories(id),
      color TEXT NOT NULL,
      is_important INTEGER NOT NULL DEFAULT 0,
      is_focus INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category_id TEXT NOT NULL REFERENCES categories(id),
      is_important INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todo_reminders (
      id TEXT PRIMARY KEY NOT NULL,
      todo_id TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      time_minutes INTEGER NOT NULL,
      prayer TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergencies (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      schedule_type TEXT NOT NULL DEFAULT 'dates',
      schedule_data TEXT NOT NULL,
      start_minutes INTEGER,
      end_minutes INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_reminders (
      id TEXT PRIMARY KEY NOT NULL,
      emergency_id TEXT NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
      time_minutes INTEGER NOT NULL,
      prayer TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_item_states (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      itemId TEXT NOT NULL,
      item_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_subtasks (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adhoc_items (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      item_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      target_id TEXT,
      payload_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    DELETE FROM todo_reminders WHERE todo_id NOT IN (SELECT id FROM todos);
    DELETE FROM emergency_reminders WHERE emergency_id NOT IN (SELECT id FROM emergencies);
  `);

  try {
    await sqlite.execAsync('ALTER TABLE profiles ADD COLUMN sleep_start_minutes INTEGER NOT NULL DEFAULT 1380;');
  } catch {
    // Column already exists
  }
  try {
    await sqlite.execAsync('ALTER TABLE profiles ADD COLUMN sleep_end_minutes INTEGER NOT NULL DEFAULT 420;');
  } catch {
    // Column already exists
  }

  // Seed default categories if empty
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(categories);
  const count = countResult[0]?.count ?? 0;

  if (count === 0) {
    const now = Date.now();
    for (const cat of DEFAULT_CATEGORIES) {
      await db.insert(categories).values({
        ...cat,
        createdAt: now,
      });
    }
  }
}
