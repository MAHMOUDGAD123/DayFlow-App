import { AppState, AppStateStatus } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  exportDatabaseData,
  getBackupFolderUri,
  setLastBackupTime,
} from '@/db/repositories/backupRepo';
import { serializeBackup } from './serializer';
import { writeBackupToSaf } from './safStorage';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isBackingUp = false;
let pendingBackup = false;

/**
 * Triggers a debounced auto-backup (3-second debounce window).
 */
export function triggerAutoBackup(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void executeBackup();
  }, 3000);
}

/**
 * Immediately flushes any pending debounced backup or executes a backup right now.
 * Useful on app backgrounding or before closing.
 */
export async function flushAutoBackupImmediate(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await executeBackup();
}

/**
 * Executes a full backup:
 * 1. Reads current DB state
 * 2. Serializes with SHA-256 integrity checksum
 * 3. Writes to user-configured SAF folder (if set)
 * 4. Writes to internal app sandbox backup copy
 * 5. Updates last backup timestamp in DB
 */
export async function executeBackup(): Promise<{ success: boolean; error?: string }> {
  if (isBackingUp) {
    pendingBackup = true;
    return { success: true };
  }

  isBackingUp = true;
  try {
    const data = await exportDatabaseData();
    const backupJson = await serializeBackup(data);

    // 1. Write to user's SAF folder if configured
    const safUri = await getBackupFolderUri();
    if (safUri) {
      await writeBackupToSaf(safUri, backupJson);
    }

    // 2. Always persist an internal sandbox backup copy as well
    if (FileSystem.documentDirectory) {
      const sandboxFile = `${FileSystem.documentDirectory}dayflow_backup.json`;
      await FileSystem.writeAsStringAsync(sandboxFile, backupJson);
    }

    const nowIso = new Date().toISOString();
    await setLastBackupTime(nowIso);

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  } finally {
    isBackingUp = false;
    if (pendingBackup) {
      pendingBackup = false;
      void executeBackup();
    }
  }
}

/**
 * Registers AppState listener to automatically flush backup when the user switches away from the app.
 */
export function initAutoBackupListener(): () => void {
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      void flushAutoBackupImmediate();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => {
    subscription.remove();
  };
}
