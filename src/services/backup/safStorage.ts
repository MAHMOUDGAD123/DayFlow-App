import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { format } from 'date-fns';

const { StorageAccessFramework } = FileSystem;

export interface SafPermissionResult {
  granted: boolean;
  directoryUri?: string;
  error?: string;
}

/**
 * Requests directory access permission via Android Storage Access Framework (SAF).
 * On non-Android platforms, provides an app-internal fallback directory.
 */
export async function requestBackupFolderPermission(): Promise<SafPermissionResult> {
  if (Platform.OS === 'android' && StorageAccessFramework) {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        return { granted: true, directoryUri: permissions.directoryUri };
      }
      return { granted: false };
    } catch (err) {
      return { granted: false, error: (err as Error).message };
    }
  }

  // Non-android or test fallback
  const fallbackDir = `${FileSystem.documentDirectory || ''}dayflow_backup/`;
  return { granted: true, directoryUri: fallbackDir };
}

/**
 * Writes backup JSON to SAF directory (or fallback directory), with atomic write and daily snapshot rotation.
 */
export async function writeBackupToSaf(
  directoryUri: string,
  backupJson: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (Platform.OS === 'android' && StorageAccessFramework && directoryUri.startsWith('content://')) {
      // 1. SAF mode (Android)
      const files = await StorageAccessFramework.readDirectoryAsync(directoryUri);

      // Locate existing main backup file
      let targetFileUri = files.find((f) =>
        decodeURIComponent(f).endsWith('/dayflow_backup.json') || decodeURIComponent(f).endsWith('dayflow_backup.json')
      );

      if (targetFileUri) {
        // Overwrite existing file
        await StorageAccessFramework.writeAsStringAsync(targetFileUri, backupJson);
      } else {
        // Create new file
        targetFileUri = await StorageAccessFramework.createFileAsync(
          directoryUri,
          'dayflow_backup.json',
          'application/json'
        );
        await StorageAccessFramework.writeAsStringAsync(targetFileUri, backupJson);
      }

      // 2. Snapshot rotation (Keep last 7 daily snapshots)
      await handleDailySnapshotRotationSaf(directoryUri, files, backupJson);

      return { success: true };
    } else {
      // Fallback mode for non-Android / Sandbox filesystem
      const targetDir = directoryUri.endsWith('/') ? directoryUri : `${directoryUri}/`;
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }

      const mainFile = `${targetDir}dayflow_backup.json`;
      const tmpFile = `${targetDir}dayflow_backup.tmp`;

      // Atomic write
      await FileSystem.writeAsStringAsync(tmpFile, backupJson);
      await FileSystem.moveAsync({ from: tmpFile, to: mainFile });

      // Daily snapshot
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const snapshotFile = `${targetDir}dayflow_backup_${todayStr}.json`;
      const snapInfo = await FileSystem.getInfoAsync(snapshotFile);
      if (!snapInfo.exists) {
        await FileSystem.writeAsStringAsync(snapshotFile, backupJson);
      }

      return { success: true };
    }
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Reads the latest backup JSON from SAF or fallback directory.
 */
export async function readBackupFromSaf(directoryUri: string): Promise<string | null> {
  try {
    if (Platform.OS === 'android' && StorageAccessFramework && directoryUri.startsWith('content://')) {
      const files = await StorageAccessFramework.readDirectoryAsync(directoryUri);
      const targetFileUri = files.find((f) =>
        decodeURIComponent(f).endsWith('/dayflow_backup.json') || decodeURIComponent(f).endsWith('dayflow_backup.json')
      );
      if (!targetFileUri) return null;
      return await StorageAccessFramework.readAsStringAsync(targetFileUri);
    } else {
      const targetDir = directoryUri.endsWith('/') ? directoryUri : `${directoryUri}/`;
      const mainFile = `${targetDir}dayflow_backup.json`;
      const info = await FileSystem.getInfoAsync(mainFile);
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(mainFile);
    }
  } catch {
    return null;
  }
}

/**
 * Maintains rolling 7-day snapshots within SAF directory.
 */
async function handleDailySnapshotRotationSaf(
  directoryUri: string,
  existingFiles: string[],
  backupJson: string
): Promise<void> {
  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const snapshotFileName = `dayflow_backup_${todayStr}.json`;

    const existingTodaySnapshot = existingFiles.find((f) =>
      decodeURIComponent(f).includes(snapshotFileName)
    );

    if (!existingTodaySnapshot && StorageAccessFramework) {
      const newSnapUri = await StorageAccessFramework.createFileAsync(
        directoryUri,
        snapshotFileName,
        'application/json'
      );
      await StorageAccessFramework.writeAsStringAsync(newSnapUri, backupJson);
    }

    // List all snapshots and retain only the 7 most recent
    const snapshotFiles = existingFiles
      .filter((f) => {
        const decoded = decodeURIComponent(f);
        return /dayflow_backup_\d{4}-\d{2}-\d{2}\.json$/.test(decoded);
      })
      .sort((a, b) => decodeURIComponent(a).localeCompare(decodeURIComponent(b)));

    if (snapshotFiles.length > 7 && StorageAccessFramework) {
      const filesToDelete = snapshotFiles.slice(0, snapshotFiles.length - 7);
      for (const fileUri of filesToDelete) {
        await StorageAccessFramework.deleteAsync(fileUri).catch(() => {});
      }
    }
  } catch {
    // Non-fatal if snapshot rotation fails
  }
}
