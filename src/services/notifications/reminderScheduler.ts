import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDayData } from '@/db/repositories/dayRepo';
import { getNotificationPreferences } from '@/db/repositories/settingsRepo';
import { NOTIFICATION_CHANNELS, NotificationChannelId } from './types';
import { setupNotificationChannels } from './notificationChannels';
import { formatTimeMinutes } from '@/i18n/formatters';

const ONGOING_NOTIFICATION_ID = 'dayflow_ongoing_status';

/**
 * Sync and schedule all reminders for a given date (defaults to today).
 * Clears old scheduled reminders and re-registers future alerts for active tasks,
 * todos, and emergencies.
 */
export async function scheduleAllDayReminders(dateStr?: string): Promise<number> {
  if (Platform.OS === 'web') return 0;

  const prefs = await getNotificationPreferences();
  if (!prefs.enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await dismissOngoingNotification();
    return 0;
  }

  try {
    await setupNotificationChannels();
  } catch (err) {
    console.warn('[Notifications] setupNotificationChannels failed:', err);
  }

  const now = new Date();
  let targetDate = now;
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    targetDate = new Date(y, m - 1, d, 12, 0, 0);
  }

  const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(
    targetDate.getDate()
  ).padStart(2, '0')}`;

  const { dayPlan } = await getDayData(targetDate);

  // Cancel non-ongoing scheduled reminders
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [year, month, day] = targetDateStr.split('-').map(Number);
  const nowMs = Date.now();
  let scheduledCount = 0;

  for (const rem of dayPlan.scheduledReminders) {
    if (rem.kind === 'task' && !prefs.taskReminders) continue;
    if (rem.kind === 'todo' && !prefs.todoReminders) continue;
    if (rem.kind === 'emergency' && !prefs.emergencyReminders) continue;

    const hours = Math.floor(rem.atMinutes / 60);
    const mins = rem.atMinutes % 60;
    const triggerDate = new Date(year, month - 1, day, hours, mins, 0, 0);
    const triggerMs = triggerDate.getTime();

    // Skip if reminder time has already passed (with 10-second grace window)
    if (triggerMs <= nowMs + 10000) continue;

    let channelId: NotificationChannelId = NOTIFICATION_CHANNELS.TASKS;
    let bodyText = '';

    if (rem.kind === 'task') {
      channelId = NOTIFICATION_CHANNELS.TASKS;
      bodyText = `Scheduled task starts at ${formatTimeMinutes(rem.atMinutes, false, 'en')}`;
    } else if (rem.kind === 'todo') {
      channelId = NOTIFICATION_CHANNELS.TODOS;
      bodyText = 'Reminder for your to-do item';
    } else {
      channelId = NOTIFICATION_CHANNELS.EMERGENCIES;
      bodyText = 'Active emergency alert';
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: rem.title,
          body: bodyText,
          sound: 'default',
          data: {
            refId: rem.refId,
            kind: rem.kind,
            channelId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId,
        },
      });
      scheduledCount++;
    } catch (err) {
      console.warn('Failed to schedule notification:', err);
    }
  }

  // Update or dismiss ongoing notification
  if (prefs.ongoingProgress) {
    await updateOngoingNotification(dayPlan, now);
  } else {
    await dismissOngoingNotification();
  }

  return scheduledCount;
}

/**
 * Updates the ongoing pinned notification showing current task or free time.
 */
export async function updateOngoingNotification(
  dayPlan: import('@/domain/types').DayPlan,
  nowDate: Date
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
    const progressPercent = Math.round(dayPlan.progress * 100);

    // 1. Check if an active emergency is suppressing the whole day
    const fullDayEmergency = dayPlan.emergencyRanges.find(
      (er) => er.range[0] === 0 && er.range[1] === 1440
    );
    if (fullDayEmergency) {
      await Notifications.scheduleNotificationAsync({
        identifier: ONGOING_NOTIFICATION_ID,
        content: {
          title: `Emergency: ${fullDayEmergency.title}`,
          body: 'Routine activities suspended (except Important items)',
          sticky: true,
          autoDismiss: false,
          data: { channelId: NOTIFICATION_CHANNELS.ONGOING },
        },
        trigger: null,
      });
      return;
    }

    // 2. Check for current active task
    const currentTask = dayPlan.tasks.find(
      (t) => !t.isSuspended && t.segment[0] <= nowMin && nowMin < t.segment[1]
    );

    if (currentTask) {
      const remainingMins = currentTask.segment[1] - nowMin;
      const startStr = formatTimeMinutes(currentTask.segment[0], false, 'en');
      const endStr = formatTimeMinutes(currentTask.segment[1], false, 'en');
      await Notifications.scheduleNotificationAsync({
        identifier: ONGOING_NOTIFICATION_ID,
        content: {
          title: `Active: ${currentTask.task.title}`,
          body: `${remainingMins}m remaining (${startStr} – ${endStr}) · ${progressPercent}% completed`,
          sticky: true,
          autoDismiss: false,
          data: { channelId: NOTIFICATION_CHANNELS.ONGOING },
        },
        trigger: null,
      });
      return;
    }

    // 3. Check for upcoming task
    const nextTask = dayPlan.tasks
      .filter((t) => !t.isSuspended && t.segment[0] > nowMin)
      .sort((a, b) => a.segment[0] - b.segment[0])[0];

    if (nextTask) {
      const startStr = formatTimeMinutes(nextTask.segment[0], false, 'en');
      const untilMins = nextTask.segment[0] - nowMin;
      await Notifications.scheduleNotificationAsync({
        identifier: ONGOING_NOTIFICATION_ID,
        content: {
          title: 'Free Time',
          body: `Next task "${nextTask.task.title}" in ${untilMins}m (at ${startStr}) · ${progressPercent}% completed`,
          sticky: true,
          autoDismiss: false,
          data: { channelId: NOTIFICATION_CHANNELS.ONGOING },
        },
        trigger: null,
      });
      return;
    }

    // 4. No more tasks today
    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_NOTIFICATION_ID,
      content: {
        title: 'Routine Completed',
        body: `All scheduled tasks done for today · ${progressPercent}% completed`,
        sticky: true,
        autoDismiss: false,
        data: { channelId: NOTIFICATION_CHANNELS.ONGOING },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Failed to update ongoing notification:', err);
  }
}

export async function dismissOngoingNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID);
  } catch {
    // Ignore if not present
  }
}

/**
 * Immediately triggers a test notification on the specified channel
 * for user feedback and verification.
 */
export async function sendTestNotification(
  channelId: NotificationChannelId = NOTIFICATION_CHANNELS.TASKS,
  title = 'Dayflow Notification Test',
  body = 'Notifications and alarms are working properly!'
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await setupNotificationChannels();
  } catch (err) {
    console.warn('[Notifications] setupNotificationChannels failed:', err);
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { channelId },
    },
    trigger: null,
  });
}

