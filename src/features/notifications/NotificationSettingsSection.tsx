import { AppText } from '@/components/common/AppText';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import {
    getNotificationPreferences,
    updateNotificationPreferences,
} from '@/db/repositories/settingsRepo';
import {
    requestNotificationPermissions,
    setupNotificationChannels,
} from '@/services/notifications/notificationChannels';
import {
    scheduleAllDayReminders,
    sendTestNotification,
} from '@/services/notifications/reminderScheduler';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NOTIFICATION_CHANNELS,
    NotificationPreferences,
} from '@/services/notifications/types';
import { useTheme } from '@/theme/ThemeContext';
import { Bell, CheckCircle, Pin, ShieldAlert, Volume2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, View } from 'react-native';

export function NotificationSettingsSection() {
  const { t } = useTranslation();
  const { colors, dirRow, textAlign, isRTL } = useTheme();

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getNotificationPreferences().then(setPrefs);
  }, []);

  const handleToggleGlobal = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          t('common.attention', 'Permission Required'),
          t(
            'notifications.permissionDenied',
            'Please enable notifications in system settings to receive reminders.',
          ),
        );
        return;
      }
      await setupNotificationChannels();
    }

    const updated = await updateNotificationPreferences({ enabled: value });
    setPrefs(updated);
    void scheduleAllDayReminders();
  };

  const handleToggleOption = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = await updateNotificationPreferences({ [key]: value });
    setPrefs(updated);
    void scheduleAllDayReminders();
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      await sendTestNotification(
        NOTIFICATION_CHANNELS.TASKS,
        t('notifications.testTitle', 'Dayflow Alarm Test'),
        t('notifications.testBody', 'Your task and to-do reminders are working properly!'),
      );
      Alert.alert(
        t('common.done', 'Success'),
        t('notifications.testSuccess', 'Test notification sent! Check your notification bar.'),
      );
    } catch (err) {
      console.warn('Failed to send test notification:', err);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card style={[styles.sectionCard]}>
      {/* Header */}
      <View style={[styles.sectionHeader, { flexDirection: dirRow }]}>
        <Bell color={colors.accent} size={20} />
        <AppText
          weight="bold"
          style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 8 }]}
        >
          {t('notifications.sectionTitle', 'Notifications & Alarms')}
        </AppText>
      </View>

      {/* Main Switch */}
      <View style={[styles.switchRow, { flexDirection: dirRow }]}>
        <View style={styles.textContainer}>
          <AppText style={[styles.label, { color: colors.text }]}>
            {t('notifications.enableAll', 'Allow Notifications')}
          </AppText>
          <AppText style={[styles.subLabel, { color: colors.textSecondary }]}>
            {t('notifications.enableAllDesc', 'Receive exact reminders for your scheduled routine')}
          </AppText>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={handleToggleGlobal}
          trackColor={{ false: colors.surfaceBorder, true: colors.accentLight }}
          thumbColor={prefs.enabled ? colors.accent : colors.surface}
          style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
        />
      </View>

      {/* Sub-options if enabled */}
      {prefs.enabled && (
        <View style={styles.subOptionsContainer}>
          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          {/* Task Start Reminders */}
          <View style={[styles.switchRow, { flexDirection: dirRow }]}>
            <View style={styles.iconPrefix}>
              <Volume2 size={20} color={colors.accent} />
            </View>
            <View style={styles.textContainer}>
              <AppText style={[styles.label, { color: colors.text }]}>
                {t('notifications.taskReminders', 'Task Start Reminders')}
              </AppText>
              <AppText style={[styles.subLabel, { color: colors.textSecondary }]}>
                {t('notifications.taskRemindersDesc', 'Alert when a task time block begins')}
              </AppText>
            </View>
            <Switch
              value={prefs.taskReminders}
              onValueChange={(val) => handleToggleOption('taskReminders', val)}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentLight }}
              thumbColor={prefs.taskReminders ? colors.accent : colors.surface}
              style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
            />
          </View>

          {/* To-do Reminders */}
          <View style={[styles.switchRow, { flexDirection: dirRow }]}>
            <View style={styles.iconPrefix}>
              <CheckCircle size={20} color={colors.success} />
            </View>
            <View style={styles.textContainer}>
              <AppText style={[styles.label, { color: colors.text }]}>
                {t('notifications.todoReminders', 'To-do Reminders')}
              </AppText>
              <AppText style={[styles.subLabel, { color: colors.textSecondary }]}>
                {t('notifications.todoRemindersDesc', 'Alert at scheduled to-do reminder times')}
              </AppText>
            </View>
            <Switch
              value={prefs.todoReminders}
              onValueChange={(val) => handleToggleOption('todoReminders', val)}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentLight }}
              thumbColor={prefs.todoReminders ? colors.accent : colors.surface}
              style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
            />
          </View>

          {/* Emergency Alerts */}
          <View style={[styles.switchRow, { flexDirection: dirRow }]}>
            <View style={styles.iconPrefix}>
              <ShieldAlert size={20} color={colors.danger} />
            </View>
            <View style={styles.textContainer}>
              <AppText style={[styles.label, { color: colors.text }]}>
                {t('notifications.emergencyAlerts', 'Emergency Alerts')}
              </AppText>
              <AppText style={[styles.subLabel, { color: colors.textSecondary }]}>
                {t(
                  'notifications.emergencyAlertsDesc',
                  'High-priority notifications for emergency events',
                )}
              </AppText>
            </View>
            <Switch
              value={prefs.emergencyReminders}
              onValueChange={(val) => handleToggleOption('emergencyReminders', val)}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentLight }}
              thumbColor={prefs.emergencyReminders ? colors.accent : colors.surface}
              style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
            />
          </View>

          {/* Ongoing Notification */}
          <View style={[styles.switchRow, { flexDirection: dirRow }]}>
            <View style={styles.iconPrefix}>
              <Pin size={20} color={colors.warning} />
            </View>
            <View style={styles.textContainer}>
              <AppText style={[styles.label, { color: colors.text, textAlign }]}>
                {t('notifications.ongoingProgress', 'Pinned Ongoing Notification')}
              </AppText>
              <AppText style={[styles.subLabel, { color: colors.textSecondary }]}>
                {t(
                  'notifications.ongoingProgressDesc',
                  'Show current task & countdown in notification bar',
                )}
              </AppText>
            </View>
            <Switch
              value={prefs.ongoingProgress}
              onValueChange={(val) => handleToggleOption('ongoingProgress', val)}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentLight }}
              thumbColor={prefs.ongoingProgress ? colors.accent : colors.surface}
              style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
            />
          </View>

          {/* Test Button */}
          <View
            style={[
              styles.buttonWrapper,
              { alignSelf: dirRow === 'row' ? 'flex-end' : 'flex-start' },
            ]}
          >
            <Button
              title={t('notifications.testBtn', 'Send Test Notification')}
              variant="outline"
              size="sm"
              loading={testing}
              onPress={handleSendTest}
              icon={<Bell size={20} color={colors.accent} />}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  iconPrefix: {
    marginEnd: 10,
  },
  textContainer: {
    flex: 1,
    marginEnd: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subLabel: {
    fontSize: 12,
  },
  subOptionsContainer: {
    marginTop: 6,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  buttonWrapper: {
    marginTop: 12,
  },
});
