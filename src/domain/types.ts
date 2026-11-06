export type Minute = number; // 0..1439
export type PrayerLabel = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface TimePoint {
  min: Minute;
  label?: PrayerLabel;
}

export type ItemStatus = 'pending' | 'done' | 'skipped';

export interface DomainTask {
  id: string;
  profileId: string;
  title: string;
  description?: string | null;
  start: TimePoint;
  end: TimePoint;
  categoryId: string;
  color: string;
  flags: {
    important: boolean;
  };
  enabled: boolean;
  sortOrder?: number;
}

export interface DomainTodo {
  id: string;
  profileId: string;
  title: string;
  description?: string | null;
  categoryId: string;
  flags: {
    important: boolean;
  };
  reminders: { id: string; timeMinutes: Minute; prayer?: PrayerLabel | null }[];
  enabled: boolean;
  sortOrder?: number;
}

export interface DomainEmergency {
  id: string;
  title: string;
  description?: string | null;
  scheduleType: 'dates' | 'weekdays';
  scheduleData: string[]; // dates array (YYYY-MM-DD) or weekday numbers
  startMinutes?: Minute | null; // null means full 24h
  endMinutes?: Minute | null;
  reminders: { id: string; timeMinutes: Minute; prayer?: PrayerLabel | null }[];
  enabled: boolean;
}

export interface ResolvedTaskSegment {
  task: DomainTask;
  segment: [Minute, Minute];
  isSpilloverFromYesterday?: boolean;
  crossesMidnight?: boolean;
  isSuspended: boolean;
  suspendedBy?: string[];
  status: ItemStatus;
}

export interface ResolvedTodo {
  todo: DomainTodo;
  isSuspended: boolean;
  suspendedBy?: string[];
  status: ItemStatus;
  activeReminders: Minute[];
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  profileId?: string | null;
  sleepRange?: { start: Minute; end: Minute } | null;
  sleepSegments?: [Minute, Minute][];
  tasks: ResolvedTaskSegment[];
  todos: ResolvedTodo[];
  emergencyRanges: { id: string; title: string; range: [Minute, Minute] }[];
  freeSlots: [Minute, Minute][];
  scheduledReminders: {
    atMinutes: Minute;
    kind: 'task' | 'todo' | 'emergency';
    refId: string;
    title: string;
  }[];
  progress: number; // 0..1
}
