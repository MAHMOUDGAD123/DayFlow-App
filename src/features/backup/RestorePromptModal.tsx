import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { requestBackupFolderPermission, readBackupFromSaf } from '@/services/backup/safStorage';
import { deserializeAndValidateBackup } from '@/services/backup/serializer';
import { importDatabaseData, setBackupFolderUri, setLastBackupTime } from '@/db/repositories/backupRepo';
import { DayflowBackup } from '@/services/backup/types';
import { FolderCheck, RefreshCw, Sparkles } from 'lucide-react-native';

interface RestorePromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  onRestored: () => void;
}

export function RestorePromptModal({ visible, onDismiss, onRestored }: RestorePromptModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [foundBackup, setFoundBackup] = useState<DayflowBackup | null>(null);

  const handleSelectFolder = async () => {
    setLoading(true);
    try {
      const perm = await requestBackupFolderPermission();
      if (!perm.granted || !perm.directoryUri) {
        setLoading(false);
        return;
      }

      await setBackupFolderUri(perm.directoryUri);
      const jsonContent = await readBackupFromSaf(perm.directoryUri);

      if (!jsonContent) {
        Alert.alert(
          t('backup.noBackupTitle', 'No Backup Found'),
          t(
            'backup.noBackupMsg',
            'No existing dayflow_backup.json file was found in the selected folder. Dayflow will use this folder for future backups.'
          ),
          [{ text: t('common.ok', 'OK'), onPress: onDismiss }]
        );
        setLoading(false);
        return;
      }

      const validation = await deserializeAndValidateBackup(jsonContent);
      if (!validation.valid || !validation.backup) {
        Alert.alert(
          t('backup.invalidBackup', 'Invalid Backup File'),
          validation.error || t('backup.corruptMsg', 'The backup file could not be read.')
        );
        setLoading(false);
        return;
      }

      setFoundBackup(validation.backup);
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!foundBackup) return;
    setLoading(true);
    try {
      await importDatabaseData(foundBackup.data, 'replace');
      await setLastBackupTime(foundBackup.exportedAt);
      Alert.alert(
        t('backup.restoreSuccessTitle', 'Restore Complete'),
        t('backup.restoreSuccessMsg', 'Your profiles and activities have been successfully restored!'),
        [{ text: t('common.ok', 'OK'), onPress: onRestored }]
      );
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <FolderCheck size={36} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {foundBackup
              ? t('backup.backupFoundTitle', 'Backup Found!')
              : t('backup.welcomeRestoreTitle', 'Welcome to Dayflow')}
          </Text>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {foundBackup
              ? t(
                  'backup.backupFoundDesc',
                  'Found a backup with {{profiles}} profiles and {{tasks}} tasks from {{date}}.',
                  {
                    profiles: foundBackup.data.profiles.length,
                    tasks: foundBackup.data.tasks.length,
                    date: new Date(foundBackup.exportedAt).toLocaleDateString(),
                  }
                )
              : t(
                  'backup.welcomeRestoreDesc',
                  'Did you previously use Dayflow? Select your local dayflow_backup folder to restore all your profiles and routines automatically.'
                )}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
          ) : foundBackup ? (
            <View style={styles.buttonGroup}>
              <Button
                title={t('backup.restoreNow', 'Restore Backup')}
                variant="primary"
                onPress={handleConfirmRestore}
                icon={<RefreshCw size={18} color="#FFFFFF" />}
              />
              <Button
                title={t('backup.startFresh', 'Ignore & Start Fresh')}
                variant="ghost"
                onPress={onDismiss}
              />
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <Button
                title={t('backup.selectFolderBtn', 'Select Backup Folder')}
                variant="primary"
                onPress={handleSelectFolder}
                icon={<FolderCheck size={18} color="#FFFFFF" />}
              />
              <Button
                title={t('backup.startFresh', 'Start Fresh')}
                variant="secondary"
                onPress={onDismiss}
                icon={<Sparkles size={18} color={colors.text} />}
              />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 16,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
});
