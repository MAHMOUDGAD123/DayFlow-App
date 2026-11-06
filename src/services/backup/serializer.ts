import { BackupData, DayflowBackup } from './types';
import { computeSha256 } from '@/utils/crypto';

export const CURRENT_BACKUP_VERSION = 1;

/**
 * Creates a serialized backup string with SHA-256 integrity checksum.
 */
export async function serializeBackup(
  data: BackupData,
  appVersion = '1.0.0'
): Promise<string> {
  const dataString = JSON.stringify(data);
  const checksum = await computeSha256(dataString);

  const backup: DayflowBackup = {
    version: CURRENT_BACKUP_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    checksum,
    data,
  };

  return JSON.stringify(backup, null, 2);
}

export interface ValidationResult {
  valid: boolean;
  backup?: DayflowBackup;
  error?: string;
}

/**
 * Validates and parses a backup JSON string, verifying schema version and SHA-256 checksum.
 */
export async function deserializeAndValidateBackup(
  jsonString: string
): Promise<ValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return {
      valid: false,
      error: `Invalid JSON syntax: ${(err as Error).message}`,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Backup root is not an object.' };
  }

  const candidate = parsed as Partial<DayflowBackup>;

  if (typeof candidate.version !== 'number') {
    return { valid: false, error: 'Missing or invalid backup version.' };
  }

  if (candidate.version > CURRENT_BACKUP_VERSION) {
    return {
      valid: false,
      error: `Backup version ${candidate.version} is newer than supported version ${CURRENT_BACKUP_VERSION}. Please update Dayflow.`,
    };
  }

  if (!candidate.checksum || typeof candidate.checksum !== 'string') {
    return { valid: false, error: 'Missing backup integrity checksum.' };
  }

  if (!candidate.data || typeof candidate.data !== 'object') {
    return { valid: false, error: 'Missing backup data payload.' };
  }

  // Verify SHA-256 integrity
  const dataString = JSON.stringify(candidate.data);
  const calculatedChecksum = await computeSha256(dataString);

  if (calculatedChecksum !== candidate.checksum) {
    return {
      valid: false,
      error: 'Integrity check failed: checksum mismatch. The backup file may be corrupted or altered.',
    };
  }

  return {
    valid: true,
    backup: candidate as DayflowBackup,
  };
}

/**
 * Merges incoming backup data into current local data.
 * Conflict resolution strategy:
 * - For versioned records (profiles, tasks, todos, emergencies, settings):
 *   the record with the newer `updatedAt` wins.
 * - Non-conflicting records are preserved.
 * - System categories are never removed.
 */
export function mergeBackupData(current: BackupData, incoming: BackupData): BackupData {
  // Categories: union custom categories, preserve current system categories
  const categoryMap = new Map<string, BackupData['categories'][0]>();
  for (const c of current.categories) {
    categoryMap.set(c.id, c);
  }
  for (const incomingCat of incoming.categories) {
    if (!categoryMap.has(incomingCat.id)) {
      categoryMap.set(incomingCat.id, incomingCat);
    }
  }

  // Profiles: higher updatedAt wins
  const profileMap = new Map<string, BackupData['profiles'][0]>();
  for (const p of current.profiles) {
    profileMap.set(p.id, p);
  }
  for (const inc of incoming.profiles) {
    const existing = profileMap.get(inc.id);
    if (!existing || inc.updatedAt > existing.updatedAt) {
      profileMap.set(inc.id, inc);
    }
  }

  // Tasks: higher updatedAt wins
  const taskMap = new Map<string, BackupData['tasks'][0]>();
  for (const t of current.tasks) {
    taskMap.set(t.id, t);
  }
  for (const inc of incoming.tasks) {
    const existing = taskMap.get(inc.id);
    if (!existing || inc.updatedAt > existing.updatedAt) {
      taskMap.set(inc.id, inc);
    }
  }

  // Todos: higher updatedAt wins
  const todoMap = new Map<string, BackupData['todos'][0]>();
  for (const t of current.todos) {
    todoMap.set(t.id, t);
  }
  for (const inc of incoming.todos) {
    const existing = todoMap.get(inc.id);
    if (!existing || inc.updatedAt > existing.updatedAt) {
      todoMap.set(inc.id, inc);
    }
  }

  // Todo reminders: union by id
  const todoReminderMap = new Map<string, BackupData['todoReminders'][0]>();
  for (const r of current.todoReminders) {
    todoReminderMap.set(r.id, r);
  }
  for (const inc of incoming.todoReminders) {
    if (!todoReminderMap.has(inc.id)) {
      todoReminderMap.set(inc.id, inc);
    }
  }

  // Emergencies: higher updatedAt wins
  const emergencyMap = new Map<string, BackupData['emergencies'][0]>();
  for (const e of current.emergencies) {
    emergencyMap.set(e.id, e);
  }
  for (const inc of incoming.emergencies) {
    const existing = emergencyMap.get(inc.id);
    if (!existing || inc.updatedAt > existing.updatedAt) {
      emergencyMap.set(inc.id, inc);
    }
  }

  // Emergency reminders: union by id
  const emergencyReminderMap = new Map<string, BackupData['emergencyReminders'][0]>();
  for (const r of current.emergencyReminders) {
    emergencyReminderMap.set(r.id, r);
  }
  for (const inc of incoming.emergencyReminders) {
    if (!emergencyReminderMap.has(inc.id)) {
      emergencyReminderMap.set(inc.id, inc);
    }
  }

  // Day item states: higher updatedAt wins
  const dayItemStateMap = new Map<string, BackupData['dayItemStates'][0]>();
  for (const s of current.dayItemStates) {
    dayItemStateMap.set(s.id, s);
  }
  for (const inc of incoming.dayItemStates) {
    const existing = dayItemStateMap.get(inc.id);
    if (!existing || inc.updatedAt > existing.updatedAt) {
      dayItemStateMap.set(inc.id, inc);
    }
  }

  // Day subtasks: union by id
  const daySubtaskMap = new Map<string, BackupData['daySubtasks'][0]>();
  for (const s of current.daySubtasks) {
    daySubtaskMap.set(s.id, s);
  }
  for (const inc of incoming.daySubtasks) {
    if (!daySubtaskMap.has(inc.id)) {
      daySubtaskMap.set(inc.id, inc);
    }
  }

  // Adhoc items: union by id
  const adhocItemMap = new Map<string, BackupData['adhocItems'][0]>();
  for (const a of current.adhocItems) {
    adhocItemMap.set(a.id, a);
  }
  for (const inc of incoming.adhocItems) {
    if (!adhocItemMap.has(inc.id)) {
      adhocItemMap.set(inc.id, inc);
    }
  }

  // Settings: higher updatedAt wins
  const settingsMap = new Map<string, BackupData['settings'][0]>();
  for (const s of current.settings) {
    settingsMap.set(s.key, s);
  }
  for (const inc of incoming.settings) {
    const existing = settingsMap.get(inc.key);
    if (!existing || inc.updatedAt > existing.updatedAt) {
      settingsMap.set(inc.key, inc);
    }
  }

  return {
    categories: Array.from(categoryMap.values()),
    profiles: Array.from(profileMap.values()),
    tasks: Array.from(taskMap.values()),
    todos: Array.from(todoMap.values()),
    todoReminders: Array.from(todoReminderMap.values()),
    emergencies: Array.from(emergencyMap.values()),
    emergencyReminders: Array.from(emergencyReminderMap.values()),
    dayItemStates: Array.from(dayItemStateMap.values()),
    daySubtasks: Array.from(daySubtaskMap.values()),
    adhocItems: Array.from(adhocItemMap.values()),
    settings: Array.from(settingsMap.values()),
  };
}
