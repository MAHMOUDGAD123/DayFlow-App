import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { NOTIFICATION_CHANNELS } from './types';

let initialized = false;

export async function setupNotificationChannels(): Promise<void> {
  if (initialized) return;

  try {
    // Set default foreground handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Don't play sound or alert aggressively for ongoing progress updates
        const isOngoing =
          notification.request.content.data?.channelId === NOTIFICATION_CHANNELS.ONGOING;
        return {
          shouldShowAlert: !isOngoing,
          shouldShowBanner: !isOngoing,
          shouldShowList: !isOngoing,
          shouldPlaySound: !isOngoing,
          shouldSetBadge: false,
        };
      },
    });

    if (Platform.OS === 'android') {
      // Helper to safely set each channel without aborting the entire setup
      const safeSetChannel = async (
        channelId: string,
        channelConfig: Notifications.NotificationChannelInput
      ) => {
        try {
          await Notifications.setNotificationChannelAsync(channelId, channelConfig);
        } catch (err) {
          console.warn(`[Notifications] Skipping channel "${channelId}" in this environment:`, err);
        }
      };

      // 1. Task Reminders Channel
      await safeSetChannel(NOTIFICATION_CHANNELS.TASKS, {
        name: 'Task Reminders',
        description: 'Alerts at the start of scheduled tasks and activities',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });

      // 2. Todo Reminders Channel
      await safeSetChannel(NOTIFICATION_CHANNELS.TODOS, {
        name: 'To-do Reminders',
        description: 'Reminders for daily to-dos and action items',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      // 3. Emergency Alerts Channel
      await safeSetChannel(NOTIFICATION_CHANNELS.EMERGENCIES, {
        name: 'Emergency Alerts',
        description: 'Critical notifications for active emergency events',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
      });

      // 4. Ongoing Progress Channel (Pinned notification)
      await safeSetChannel(NOTIFICATION_CHANNELS.ONGOING, {
        name: 'Active Routine & Progress',
        description: 'Pinned notification showing current task and day progress',
        importance: AndroidImportance.LOW,
        enableVibrate: false,
        showBadge: false,
      });
    }

    initialized = true;
  } catch (err) {
    console.warn('[Notifications] setupNotificationChannels error:', err);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Failed to request notification permissions:', err);
    return false;
  }
}
