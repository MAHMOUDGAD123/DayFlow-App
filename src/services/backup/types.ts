export interface CategoryRow {
  id: string;
  nameKey: string | null;
  customName: string | null;
  color: string;
  icon: string;
  isSystem: boolean;
  createdAt: number;
}

export interface ProfileRow {
  id: string;
  title: string;
  description: string | null;
  daysMask: number;
  enabled: boolean;
  sleepStartMinutes?: number;
  sleepEndMinutes?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskRow {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  startMinutes: number;
  endMinutes: number;
  startPrayer: string | null;
  endPrayer: string | null;
  categoryId: string;
  color: string;
  isImportant: boolean;
  isFocus: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodoRow {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  categoryId: string;
  isImportant: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodoReminderRow {
  id: string;
  todoId: string;
  timeMinutes: number;
  prayer: string | null;
  createdAt: number;
}

export interface EmergencyRow {
  id: string;
  title: string;
  description: string | null;
  scheduleType: string;
  scheduleData: string;
  startMinutes: number | null;
  endMinutes: number | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EmergencyReminderRow {
  id: string;
  emergencyId: string;
  timeMinutes: number;
  prayer: string | null;
  createdAt: number;
}

export interface DayItemStateRow {
  id: string;
  date: string;
  itemId: string;
  itemType: string;
  status: string;
  updatedAt: number;
}

export interface DaySubtaskRow {
  id: string;
  date: string;
  taskId: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
  createdAt: number;
}

export interface AdhocItemRow {
  id: string;
  date: string;
  itemType: string;
  payloadJson: string;
  createdAt: number;
}

export interface SettingRow {
  key: string;
  valueJson: string;
  updatedAt: number;
}

export interface BackupData {
  categories: CategoryRow[];
  profiles: ProfileRow[];
  tasks: TaskRow[];
  todos: TodoRow[];
  todoReminders: TodoReminderRow[];
  emergencies: EmergencyRow[];
  emergencyReminders: EmergencyReminderRow[];
  dayItemStates: DayItemStateRow[];
  daySubtasks: DaySubtaskRow[];
  adhocItems: AdhocItemRow[];
  settings: SettingRow[];
}

export interface DayflowBackup {
  version: number;
  appVersion: string;
  exportedAt: string;
  checksum: string;
  data: BackupData;
}
