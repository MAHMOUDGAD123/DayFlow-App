import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportDatabaseData } from '@/db/repositories/backupRepo';
import { serializeBackup, deserializeAndValidateBackup } from './serializer';
import { DayflowBackup } from './types';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  backup?: DayflowBackup;
  error?: string;
}

/**
 * Creates a standalone .dayflow backup file and opens native share sheet.
 */
export async function exportBackupPackage(): Promise<ExportResult> {
  try {
    const data = await exportDatabaseData();
    const backupJson = await serializeBackup(data);

    const fileName = `dayflow_backup_${Date.now()}.dayflow`;
    const targetPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ''}${fileName}`;

    await FileSystem.writeAsStringAsync(targetPath, backupJson);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(targetPath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Dayflow Backup',
        UTI: 'public.json',
      });
    }

    return { success: true, filePath: targetPath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Prompts user to pick a .dayflow or .json backup file and validates its integrity.
 */
export async function pickAndValidateBackupFile(): Promise<ImportResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*',
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, error: 'File selection canceled.' };
    }

    const pickedFile = result.assets[0];
    const content = await FileSystem.readAsStringAsync(pickedFile.uri);

    const validation = await deserializeAndValidateBackup(content);
    if (!validation.valid || !validation.backup) {
      return { success: false, error: validation.error || 'Failed to validate backup file.' };
    }

    return { success: true, backup: validation.backup };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
