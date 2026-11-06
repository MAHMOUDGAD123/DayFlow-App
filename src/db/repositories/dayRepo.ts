import { eq, asc } from 'drizzle-orm';
import { db } from '../client';
import { dayItemStates, daySubtasks, adhocItems, emergencies, emergencyReminders } from '../schema';
import { getAllProfiles, FullProfile } from './profileRepo';
import { resolveDayPlan } from '@/domain/resolveDay';
import { getWeekdayMaskBit } from '@/domain/time';
import { DayPlan, DomainEmergency, DomainTask, ItemStatus } from '@/domain/types';
import { triggerAutoBackup } from '@/services/backup/autoBackup';

export interface DaySubtask {
  id: string;
  date: string;
  taskId: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
  createdAt: number;
}

export interface DayScreenData {
  dayPlan: DayPlan;
  activeProfile: FullProfile | null;
  subtasks: DaySubtask[];
}

/**
 * Loads all data required to render the Today (Preview) screen for a given date.
 */
export async function getDayData(targetDate: Date): Promise<DayScreenData> {
  const dateStr = targetDate.toISOString().slice(0, 10);
  const weekdayBit = getWeekdayMaskBit(targetDate);

  // 1. Fetch all profiles and identify today's active profile
  const allProfiles = await getAllProfiles();
  const activeProfile = allProfiles.find((p) => p.enabled && (p.daysMask & weekdayBit) !== 0) || null;

  // 2. Check yesterday's active profile for midnight crossing task spillover
  const yesterday = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayWeekdayBit = getWeekdayMaskBit(yesterday);
  const yesterdayProfile = allProfiles.find((p) => p.enabled && (p.daysMask & yesterdayWeekdayBit) !== 0);

  let yesterdayMidnightTask: DomainTask | null = null;
  if (yesterdayProfile) {
    yesterdayMidnightTask = yesterdayProfile.tasks.find((t) => t.enabled && t.end.min < t.start.min) || null;
  }

  // 3. Fetch emergencies
  const emergencyRows = await db.select().from(emergencies).where(eq(emergencies.enabled, true));
  const domainEmergencies: DomainEmergency[] = [];

  for (const row of emergencyRows) {
    const remRows = await db.select().from(emergencyReminders).where(eq(emergencyReminders.emergencyId, row.id));
    domainEmergencies.push({
      id: row.id,
      title: row.title,
      description: row.description,
      scheduleType: row.scheduleType as 'dates' | 'weekdays',
      scheduleData: JSON.parse(row.scheduleData),
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
      reminders: remRows.map((r) => ({ id: r.id, timeMinutes: r.timeMinutes, prayer: (r.prayer as any) || undefined })),
      enabled: row.enabled,
    });
  }

  // 4. Fetch item states for this date
  const itemStateRows = await db.select().from(dayItemStates).where(eq(dayItemStates.date, dateStr));
  const itemStates: Record<string, ItemStatus> = {};
  for (const s of itemStateRows) {
    itemStates[s.itemId] = s.status as ItemStatus;
  }

  // 5. Fetch subtasks for this date
  const subtaskRows = await db
    .select()
    .from(daySubtasks)
    .where(eq(daySubtasks.date, dateStr))
    .orderBy(asc(daySubtasks.sortOrder), asc(daySubtasks.createdAt));

  const subtasks: DaySubtask[] = subtaskRows.map((s) => ({
    id: s.id,
    date: s.date,
    taskId: s.taskId,
    title: s.title,
    isDone: Boolean(s.isDone),
    sortOrder: s.sortOrder,
    createdAt: s.createdAt,
  }));

  // 6. Fetch ad-hoc items for this date
  const adhocRows = await db.select().from(adhocItems).where(eq(adhocItems.date, dateStr));
  const adhocTasks: DomainTask[] = [];
  const adhocTodos: any[] = [];

  for (const adhoc of adhocRows) {
    try {
      const payload = JSON.parse(adhoc.payloadJson);
      if (adhoc.itemType === 'task') {
        adhocTasks.push(payload);
      } else {
        adhocTodos.push(payload);
      }
    } catch {
      // Ignore malformed adhoc JSON
    }
  }

  // Merge adhoc tasks/todos into active profile copy for the day resolver
  const profileWithAdhocs = activeProfile
    ? {
        id: activeProfile.id,
        title: activeProfile.title,
        daysMask: activeProfile.daysMask,
        sleepStart: activeProfile.sleepStart,
        sleepEnd: activeProfile.sleepEnd,
        tasks: [...activeProfile.tasks, ...adhocTasks],
        todos: [...activeProfile.todos, ...adhocTodos],
      }
    : adhocTasks.length > 0 || adhocTodos.length > 0
    ? {
        id: 'adhoc_day_profile',
        title: 'Ad-hoc Activities',
        daysMask: weekdayBit,
        tasks: adhocTasks,
        todos: adhocTodos,
      }
    : null;

  // 7. Resolve full DayPlan
  const dayPlan = resolveDayPlan({
    dateStr,
    dateObj: targetDate,
    activeProfile: profileWithAdhocs,
    yesterdayMidnightTask,
    emergencies: domainEmergencies,
    itemStates,
  });

  return {
    dayPlan,
    activeProfile,
    subtasks,
  };
}

/**
 * Updates status of a task or todo for a specific date (pending / done / skipped).
 */
export async function setItemStatus(
  dateStr: string,
  itemId: string,
  itemType: 'task' | 'todo',
  status: ItemStatus
): Promise<void> {
  const id = `${dateStr}_${itemId}`;
  const now = Date.now();

  await db
    .insert(dayItemStates)
    .values({
      id,
      date: dateStr,
      itemId,
      itemType,
      status,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dayItemStates.id,
      set: {
        status,
        updatedAt: now,
      },
    });

  triggerAutoBackup();
  triggerReminderSync(dateStr);
}

function triggerReminderSync(dateStr?: string) {
  import('@/services/notifications/reminderScheduler')
    .then((m) => m.scheduleAllDayReminders(dateStr))
    .catch(() => {});
}

/**
 * Adds a subtask under a specific task for the current day only.
 */
export async function addSubtask(
  dateStr: string,
  taskId: string,
  title: string
): Promise<DaySubtask> {
  const id = `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = Date.now();

  const newSubtask: DaySubtask = {
    id,
    date: dateStr,
    taskId,
    title,
    isDone: false,
    sortOrder: 0,
    createdAt: now,
  };

  await db.insert(daySubtasks).values({
    id,
    date: dateStr,
    taskId,
    title,
    isDone: false,
    sortOrder: 0,
    createdAt: now,
  });

  triggerAutoBackup();
  return newSubtask;
}

/**
 * Toggles a subtask's completion state.
 */
export async function toggleSubtask(id: string, isDone: boolean): Promise<void> {
  await db.update(daySubtasks).set({ isDone }).where(eq(daySubtasks.id, id));
  triggerAutoBackup();
}

/**
 * Deletes a subtask.
 */
export async function deleteSubtask(id: string): Promise<void> {
  await db.delete(daySubtasks).where(eq(daySubtasks.id, id));
  triggerAutoBackup();
}

/**
 * Adds a one-off adhoc task or todo for today only.
 */
export async function addAdhocItem(
  dateStr: string,
  itemType: 'task' | 'todo',
  payload: any
): Promise<void> {
  const id = payload.id || `adhoc_${Date.now()}`;
  await db.insert(adhocItems).values({
    id,
    date: dateStr,
    itemType,
    payloadJson: JSON.stringify(payload),
    createdAt: Date.now(),
  });

  triggerAutoBackup();
  triggerReminderSync(dateStr);
}

/**
 * Updates an adhoc item payload.
 */
export async function updateAdhocItem(
  id: string,
  payload: any
): Promise<void> {
  const existing = await db.select().from(adhocItems).where(eq(adhocItems.id, id));
  if (existing.length > 0) {
    await db
      .update(adhocItems)
      .set({
        payloadJson: JSON.stringify(payload),
      })
      .where(eq(adhocItems.id, id));
  } else {
    // If not found by direct id (e.g. legacy id mismatch), find by matching JSON id
    const allAdhoc = await db.select().from(adhocItems);
    const matched = allAdhoc.find((row) => {
      try {
        const p = JSON.parse(row.payloadJson);
        return p.id === id;
      } catch {
        return false;
      }
    });
    if (matched) {
      await db
        .update(adhocItems)
        .set({
          payloadJson: JSON.stringify(payload),
        })
        .where(eq(adhocItems.id, matched.id));
    }
  }
  triggerAutoBackup();
  triggerReminderSync();
}

/**
 * Deletes an adhoc item.
 */
export async function deleteAdhocItem(id: string): Promise<void> {
  await db.delete(adhocItems).where(eq(adhocItems.id, id));
  // Fallback to match JSON id
  const allAdhoc = await db.select().from(adhocItems);
  for (const row of allAdhoc) {
    try {
      const p = JSON.parse(row.payloadJson);
      if (p.id === id) {
        await db.delete(adhocItems).where(eq(adhocItems.id, row.id));
      }
    } catch {
      // ignore
    }
  }
  triggerAutoBackup();
  triggerReminderSync();
}
