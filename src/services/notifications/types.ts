export const NOTIFICATION_CHANNELS = {
  TASKS: 'dayflow_tasks',
  TODOS: 'dayflow_todos',
  EMERGENCIES: 'dayflow_emergencies',
  ONGOING: 'dayflow_ongoing',
} as const;

export type NotificationChannelKey = keyof typeof NOTIFICATION_CHANNELS;
export type NotificationChannelId = (typeof NOTIFICATION_CHANNELS)[NotificationChannelKey];

export interface NotificationPreferences {
  enabled: boolean;
  taskReminders: boolean;
  todoReminders: boolean;
  emergencyReminders: boolean;
  ongoingProgress: boolean;
  customSoundUri: string | null;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  taskReminders: true,
  todoReminders: true,
  emergencyReminders: true,
  ongoingProgress: true,
  customSoundUri: null,
};

export interface ScheduledReminderInfo {
  id: string;
  itemId: string;
  type: 'task' | 'todo' | 'emergency';
  title: string;
  body: string;
  channelId: NotificationChannelId;
  triggerTimeMs: number;
}
