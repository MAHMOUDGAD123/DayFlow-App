import { AppText } from '@/components/common/AppText';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import {
  getBackupFolderUri,
  getLastBackupTime,
  importDatabaseData,
  setBackupFolderUri,
} from '@/db/repositories/backupRepo';
import { executeBackup } from '@/services/backup/autoBackup';
import { exportBackupPackage, pickAndValidateBackupFile } from '@/services/backup/exportImport';
import { requestBackupFolderPermission } from '@/services/backup/safStorage';
import { DayflowBackup } from '@/services/backup/types';
import { useTheme } from '@/theme/ThemeContext';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Folder,
  HardDrive,
  Save,
  Upload,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

export function BackupSettingsSection() {
  const { t } = useTranslation();
  const { colors, dirRow, textAlign, fonts } = useTheme();

  const [folderUri, setFolderUri] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importingBackup, setImportingBackup] = useState<DayflowBackup | null>(null);

  const loadBackupStatus = useCallback(async () => {
    const [uri, last] = await Promise.all([getBackupFolderUri(), getLastBackupTime()]);
    setFolderUri(uri);
    setLastBackup(last);
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getBackupFolderUri(), getLastBackupTime()]).then(([uri, last]) => {
      if (isMounted) {
        setFolderUri(uri);
        setLastBackup(last);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectFolder = async () => {
    try {
      const res = await requestBackupFolderPermission();
      if (res.granted && res.directoryUri) {
        await setBackupFolderUri(res.directoryUri);
        setFolderUri(res.directoryUri);
        // Trigger immediate backup to newly selected folder
        await executeBackup();
        await loadBackupStatus();
        Alert.alert(
          t('backup.folderSetTitle', 'Backup Folder Connected'),
          t(
            'backup.folderSetMsg',
            'Dayflow will automatically back up all routines and history to this folder.',
          ),
        );
      }
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), (err as Error).message);
    }
  };

  const handleManualBackup = async () => {
    setLoading(true);
    try {
      const res = await executeBackup();
      if (res.success) {
        await loadBackupStatus();
        Alert.alert(
          t('backup.backupSuccessTitle', 'Backup Complete'),
          t('backup.backupSuccessMsg', 'Your data has been securely saved.'),
        );
      } else {
        Alert.alert(t('common.error', 'Error'), res.error || 'Backup failed');
      }
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPackage = async () => {
    setLoading(true);
    try {
      const res = await exportBackupPackage();
      if (!res.success) {
        Alert.alert(t('common.error', 'Error'), res.error || 'Export failed');
      }
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImportFile = async () => {
    try {
      const res = await pickAndValidateBackupFile();
      if (res.success && res.backup) {
        setImportingBackup(res.backup);
      } else if (res.error && res.error !== 'File selection canceled.') {
        Alert.alert(t('backup.invalidBackup', 'Invalid Backup File'), res.error);
      }
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), (err as Error).message);
    }
  };

  const executeImport = async (mode: 'replace' | 'merge') => {
    if (!importingBackup) return;
    setLoading(true);
    try {
      const res = await importDatabaseData(importingBackup.data, mode);
      setImportingBackup(null);
      await loadBackupStatus();
      Alert.alert(
        t('backup.restoreSuccessTitle', 'Import Complete'),
        t(
          'backup.importSummaryMsg',
          'Successfully restored {{profiles}} profiles and {{tasks}} tasks.',
          {
            profiles: res.profilesCount,
            tasks: res.tasksCount,
          },
        ),
      );
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: dirRow }]}>
        <View style={[styles.titleRow, { flexDirection: dirRow }]}>
          <HardDrive size={20} color={colors.accent} />
          <AppText weight="bold" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('backup.sectionTitle', 'Data & Local Backup')}
          </AppText>
        </View>
        <Badge
          label={
            folderUri ? t('backup.connected', 'Connected') : t('backup.notConfigured', 'Not Set')
          }
          variant={folderUri ? 'success' : 'warning'}
        />
      </View>

      <Text
        style={[
          styles.description,
          { color: colors.textSecondary, textAlign, fontFamily: fonts.semiBold },
        ]}
      >
        {t(
          'backup.description',
          'Dayflow automatically keeps a persistent backup in your local "dayflow_backup" folder that survives app uninstallation.',
        )}
      </Text>

      {/* Folder status */}
      <View
        style={[styles.infoBox, { backgroundColor: colors.surfaceVariant, flexDirection: dirRow }]}
      >
        <View style={[styles.infoTextContainer]}>
          <Text
            style={[
              styles.infoLabel,
              { color: colors.textSecondary, textAlign, fontFamily: fonts.semiBold },
            ]}
          >
            {t('backup.folderLabel', 'Backup Folder:')}
          </Text>
          <Text
            style={[
              styles.infoValue,
              { color: colors.text, textAlign, fontFamily: fonts.semiBold },
            ]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {folderUri ? decodeURIComponent(folderUri) : t('backup.noFolder', 'None selected')}
          </Text>
        </View>
        <Folder size={18} color={folderUri ? colors.accent : colors.textMuted} />
      </View>

      {/* Last Backup Timestamp */}
      {lastBackup && (
        <View style={[styles.timestampRow, { flexDirection: dirRow }]}>
          <CheckCircle2 size={20} color={colors.success} />
          <Text
            style={[
              styles.timestampText,
              { color: colors.textSecondary, fontFamily: fonts.semiBold },
            ]}
          >
            {t('backup.lastBackupAt', 'Last backed up: {{time}}', {
              time: new Date(lastBackup).toLocaleString(),
            })}
          </Text>
        </View>
      )}

      {loading && <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title={
            folderUri
              ? t('backup.changeFolder', 'Change Backup Folder')
              : t('backup.setFolder', 'Choose Backup Folder')
          }
          variant="secondary"
          onPress={handleSelectFolder}
          icon={<Folder size={20} color={colors.text} />}
          style={styles.buttonStyle}
        />

        <Button
          title={t('backup.backupNow', 'Back Up Now')}
          variant="primary"
          onPress={handleManualBackup}
          icon={<Save size={20} color={colors.text} />}
          style={styles.buttonStyle}
        />

        <View style={styles.exportImportRow}>
          <View style={styles.flexOne}>
            <Button
              title={t('backup.exportBtn', 'Export .dayflow')}
              variant="secondary"
              onPress={handleExportPackage}
              icon={<Download size={20} color={colors.text} />}
              style={styles.buttonStyle}
            />
          </View>
          <View style={styles.flexOne}>
            <Button
              title={t('backup.importBtn', 'Import Backup')}
              variant="secondary"
              onPress={handlePickImportFile}
              icon={<Upload size={20} color={colors.text} />}
              style={styles.buttonStyle}
            />
          </View>
        </View>
      </View>

      {/* Import Confirmation Dialog */}
      {importingBackup && (
        <View
          style={[
            styles.importDialog,
            { borderColor: colors.accent, backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.importHeader}>
            <AlertCircle size={22} color={colors.accent} />
            <Text style={[styles.importTitle, { color: colors.text }]}>
              {t('backup.importDialogTitle', 'Import Backup Confirmation')}
            </Text>
          </View>
          <Text style={[styles.importDetails, { color: colors.textSecondary }]}>
            {t(
              'backup.importDialogDetails',
              'Backup created on {{date}} containing {{profiles}} profiles and {{tasks}} tasks.',
              {
                date: new Date(importingBackup.exportedAt).toLocaleDateString(),
                profiles: importingBackup.data.profiles.length,
                tasks: importingBackup.data.tasks.length,
              },
            )}
          </Text>

          <View style={styles.importButtons}>
            <Button
              title={t('backup.mergeOption', 'Merge with Local Data')}
              variant="primary"
              onPress={() => executeImport('merge')}
            />
            <Button
              title={t('backup.replaceOption', 'Replace All Data')}
              variant="danger"
              onPress={() => executeImport('replace')}
            />
            <Button
              title={t('common.cancel', 'Cancel')}
              variant="ghost"
              onPress={() => setImportingBackup(null)}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoBox: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
  },
  loader: {
    marginVertical: 4,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  exportImportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexOne: {
    flex: 1,
  },
  importDialog: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  importDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  importButtons: {
    gap: 8,
    marginTop: 4,
  },
  buttonStyle: {
    gap: 5,
  },
});
