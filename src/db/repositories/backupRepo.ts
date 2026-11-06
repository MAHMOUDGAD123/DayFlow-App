import { eq } from 'drizzle-orm';
import { db } from '../client';
import {
  categories,
  profiles,
  tasks,
  todos,
  todoReminders,
  emergencies,
  emergencyReminders,
  dayItemStates,
  daySubtasks,
  adhocItems,
  settings,
  backupMeta,
} from '../schema';
import { BackupData } from '@/services/backup/types';
import { mergeBackupData } from '@/services/backup/serializer';

const KEY_SAF_URI = 'saf_folder_uri';
const KEY_LAST_BACKUP = 'last_backup_time';

/**
 * Checks whether the database is currently empty (e.g. freshly installed).
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const profileList = await db.select().from(profiles).limit(1);
  return profileList.length === 0;
}

/**
 * Retrieves the stored SAF folder URI.
 */
export async function getBackupFolderUri(): Promise<string | null> {
  const res = await db.select().from(backupMeta).where(eq(backupMeta.key, KEY_SAF_URI));
  if (res.length === 0) return null;
  try {
    return JSON.parse(res[0].valueJson) as string;
  } catch {
    return null;
  }
}

/**
 * Persists the SAF folder URI.
 */
export async function setBackupFolderUri(uri: string): Promise<void> {
  const now = Date.now();
  await db
    .insert(backupMeta)
    .values({
      key: KEY_SAF_URI,
      valueJson: JSON.stringify(uri),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: backupMeta.key,
      set: {
        valueJson: JSON.stringify(uri),
        updatedAt: now,
      },
    });
}

/**
 * Retrieves the timestamp of the last successful backup.
 */
export async function getLastBackupTime(): Promise<string | null> {
  const res = await db.select().from(backupMeta).where(eq(backupMeta.key, KEY_LAST_BACKUP));
  if (res.length === 0) return null;
  try {
    return JSON.parse(res[0].valueJson) as string;
  } catch {
    return null;
  }
}

/**
 * Updates the timestamp of the last successful backup.
 */
export async function setLastBackupTime(isoTime: string): Promise<void> {
  const now = Date.now();
  await db
    .insert(backupMeta)
    .values({
      key: KEY_LAST_BACKUP,
      valueJson: JSON.stringify(isoTime),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: backupMeta.key,
      set: {
        valueJson: JSON.stringify(isoTime),
        updatedAt: now,
      },
    });
}

/**
 * Dumps all tables into a complete BackupData snapshot.
 */
export async function exportDatabaseData(): Promise<BackupData> {
  const [
    catRows,
    profRows,
    taskRows,
    todoRows,
    todoRemRows,
    emergRows,
    emergRemRows,
    dayItemRows,
    subtaskRows,
    adhocRows,
    settingsRows,
  ] = await Promise.all([
    db.select().from(categories),
    db.select().from(profiles),
    db.select().from(tasks),
    db.select().from(todos),
    db.select().from(todoReminders),
    db.select().from(emergencies),
    db.select().from(emergencyReminders),
    db.select().from(dayItemStates),
    db.select().from(daySubtasks),
    db.select().from(adhocItems),
    db.select().from(settings),
  ]);

  return {
    categories: catRows,
    profiles: profRows,
    tasks: taskRows,
    todos: todoRows,
    todoReminders: todoRemRows,
    emergencies: emergRows,
    emergencyReminders: emergRemRows,
    dayItemStates: dayItemRows,
    daySubtasks: subtaskRows,
    adhocItems: adhocRows,
    settings: settingsRows,
  };
}

/**
 * Imports backup data into the SQLite database.
 * Supports 'replace' (clean wipe & insert) or 'merge' (newer updatedAt wins).
 */
export async function importDatabaseData(
  incoming: BackupData,
  mode: 'replace' | 'merge'
): Promise<{ success: boolean; profilesCount: number; tasksCount: number }> {
  let finalData = incoming;

  if (mode === 'merge') {
    const current = await exportDatabaseData();
    finalData = mergeBackupData(current, incoming);
  }

  // Clear existing data (in dependency order)
  await db.delete(daySubtasks);
  await db.delete(adhocItems);
  await db.delete(dayItemStates);
  await db.delete(emergencyReminders);
  await db.delete(emergencies);
  await db.delete(todoReminders);
  await db.delete(todos);
  await db.delete(tasks);
  await db.delete(profiles);
  await db.delete(settings);

  // Categories: only delete non-system categories
  await db.delete(categories).where(eq(categories.isSystem, false));

  // Insert categories
  for (const cat of finalData.categories) {
    if (!cat.isSystem) {
      await db.insert(categories).values(cat).onConflictDoNothing();
    }
  }

  // Insert profiles
  for (const prof of finalData.profiles) {
    await db.insert(profiles).values(prof).onConflictDoNothing();
  }

  // Insert tasks
  for (const task of finalData.tasks) {
    await db.insert(tasks).values(task).onConflictDoNothing();
  }

  // Insert todos
  for (const todo of finalData.todos) {
    await db.insert(todos).values(todo).onConflictDoNothing();
  }

  // Insert todo reminders
  for (const rem of finalData.todoReminders) {
    await db.insert(todoReminders).values(rem).onConflictDoNothing();
  }

  // Insert emergencies
  for (const emerg of finalData.emergencies) {
    await db.insert(emergencies).values(emerg).onConflictDoNothing();
  }

  // Insert emergency reminders
  for (const rem of finalData.emergencyReminders) {
    await db.insert(emergencyReminders).values(rem).onConflictDoNothing();
  }

  // Insert day item states
  for (const itemState of finalData.dayItemStates) {
    await db.insert(dayItemStates).values(itemState).onConflictDoNothing();
  }

  // Insert subtasks
  for (const sub of finalData.daySubtasks) {
    await db.insert(daySubtasks).values(sub).onConflictDoNothing();
  }

  // Insert adhoc items
  for (const adhoc of finalData.adhocItems) {
    await db.insert(adhocItems).values(adhoc).onConflictDoNothing();
  }

  // Insert settings
  for (const sett of finalData.settings) {
    await db.insert(settings).values(sett).onConflictDoNothing();
  }

  return {
    success: true,
    profilesCount: finalData.profiles.length,
    tasksCount: finalData.tasks.length,
  };
}
