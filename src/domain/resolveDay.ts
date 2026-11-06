import {
  DomainTask,
  DomainTodo,
  DomainEmergency,
  DayPlan,
  ResolvedTaskSegment,
  ResolvedTodo,
  ItemStatus,
  Minute,
} from './types';
import { getWeekdayMaskBit, splitMidnightInterval } from './time';
import {
  getActiveEmergenciesForDate,
  computeEmergencyRanges,
  evaluateTaskSuspension,
  evaluateTodoSuspension,
} from './emergencies';
import { calculateFreeSlots } from './freeSlots';

export interface ResolveDayInput {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  activeProfile?: {
    id: string;
    title: string;
    daysMask: number;
    sleepStart?: number;
    sleepEnd?: number;
    tasks: DomainTask[];
    todos: DomainTodo[];
  } | null;
  yesterdayMidnightTask?: DomainTask | null; // task from yesterday that crosses midnight
  emergencies: DomainEmergency[];
  itemStates?: Record<string, ItemStatus>; // key: itemId, value: 'pending' | 'done' | 'skipped'
}

export function resolveDayPlan(input: ResolveDayInput): DayPlan {
  const {
    dateStr,
    dateObj,
    activeProfile,
    yesterdayMidnightTask,
    emergencies,
    itemStates = {},
  } = input;

  // 1. Check if profile is active on this weekday
  const weekdayBit = getWeekdayMaskBit(dateObj);
  const isProfileActive = activeProfile && (activeProfile.daysMask & weekdayBit) !== 0;

  // 2. Resolve emergencies for this date
  const activeEmergencies = getActiveEmergenciesForDate(emergencies, dateStr, dateObj);
  const emergencyRanges = computeEmergencyRanges(activeEmergencies);

  // 3. Resolve tasks
  const resolvedTasks: ResolvedTaskSegment[] = [];

  // 3a. Handle yesterday's spillover if any
  if (yesterdayMidnightTask && yesterdayMidnightTask.enabled) {
    const split = splitMidnightInterval(
      yesterdayMidnightTask.start.min,
      yesterdayMidnightTask.end.min,
    );
    if (split.tomorrowSpillover) {
      const suspension = evaluateTaskSuspension(
        split.tomorrowSpillover,
        yesterdayMidnightTask.flags.important,
        emergencyRanges,
      );
      const status = itemStates[`${yesterdayMidnightTask.id}_spillover`] || itemStates[yesterdayMidnightTask.id] || 'pending';

      resolvedTasks.push({
        task: yesterdayMidnightTask,
        segment: split.tomorrowSpillover,
        isSpilloverFromYesterday: true,
        crossesMidnight: true,
        isSuspended: suspension.isSuspended,
        suspendedBy: suspension.suspendedBy,
        status,
      });
    }
  }

  // 3b. Handle today's tasks
  if (isProfileActive && activeProfile) {
    for (const t of activeProfile.tasks) {
      if (!t.enabled) continue;
      const split = splitMidnightInterval(t.start.min, t.end.min);
      const suspension = evaluateTaskSuspension(
        split.todaySegment,
        t.flags.important,
        emergencyRanges,
      );
      const status = itemStates[t.id] || 'pending';

      resolvedTasks.push({
        task: t,
        segment: split.todaySegment,
        isSpilloverFromYesterday: false,
        crossesMidnight: split.crossesMidnight,
        isSuspended: suspension.isSuspended,
        suspendedBy: suspension.suspendedBy,
        status,
      });
    }
  }

  // 4. Resolve todos
  const resolvedTodos: ResolvedTodo[] = [];
  if (isProfileActive && activeProfile) {
    for (const todo of activeProfile.todos) {
      if (!todo.enabled) continue;
      const reminderMins = todo.reminders.map((r) => r.timeMinutes);
      const suspension = evaluateTodoSuspension(
        todo.flags.important,
        emergencyRanges,
        reminderMins,
      );
      const status = itemStates[todo.id] || 'pending';

      resolvedTodos.push({
        todo,
        isSuspended: suspension.isSuspended,
        suspendedBy: suspension.suspendedBy,
        status,
        activeReminders: suspension.activeReminders,
      });
    }
  }

  // 5. Calculate Free Slots (from non-suspended active task segments and sleep segments)
  const sleepSegments: [Minute, Minute][] = [];
  let sleepRange: { start: Minute; end: Minute } | null = null;

  if (isProfileActive && activeProfile && activeProfile.sleepStart != null && activeProfile.sleepEnd != null) {
    const sStart = activeProfile.sleepStart;
    const sEnd = activeProfile.sleepEnd;
    sleepRange = { start: sStart, end: sEnd };

    if (sEnd > sStart) {
      sleepSegments.push([sStart, sEnd]);
    } else if (sStart > sEnd) {
      // Midnight crossing (e.g. 23:00 to 07:00)
      if (sEnd > 0) {
        sleepSegments.push([0, sEnd]);
      }
      if (sStart < 1440) {
        sleepSegments.push([sStart, 1440]);
      }
    }
  }

  const activeTaskSegments = resolvedTasks
    .filter((rt) => !rt.isSuspended)
    .map((rt) => rt.segment);
  const occupiedSegments = [...activeTaskSegments, ...sleepSegments];
  const freeSlots = calculateFreeSlots(occupiedSegments);

  // 6. Collect Scheduled Reminders
  const scheduledReminders: DayPlan['scheduledReminders'] = [];

  // Task reminders (at start of segment)
  for (const rt of resolvedTasks) {
    if (!rt.isSuspended && rt.status !== 'done' && rt.status !== 'skipped') {
      scheduledReminders.push({
        atMinutes: rt.segment[0],
        kind: 'task',
        refId: rt.task.id,
        title: rt.task.title,
      });
    }
  }

  // Todo reminders
  for (const rTodo of resolvedTodos) {
    if (!rTodo.isSuspended && rTodo.status !== 'done') {
      for (const atMins of rTodo.activeReminders) {
        scheduledReminders.push({
          atMinutes: atMins,
          kind: 'todo',
          refId: rTodo.todo.id,
          title: rTodo.todo.title,
        });
      }
    }
  }

  // Emergency reminders
  for (const em of activeEmergencies) {
    for (const rem of em.reminders) {
      scheduledReminders.push({
        atMinutes: rem.timeMinutes,
        kind: 'emergency',
        refId: em.id,
        title: em.title,
      });
    }
  }

  // Sort reminders by time
  scheduledReminders.sort((a, b) => a.atMinutes - b.atMinutes);

  // 7. Calculate Progress Percentage
  const trackableTasks = resolvedTasks.filter((t) => !t.isSuspended);
  const trackableTodos = resolvedTodos.filter((t) => !t.isSuspended);
  const totalItems = trackableTasks.length + trackableTodos.length;

  let completedItems = 0;
  for (const t of trackableTasks) {
    if (t.status === 'done') completedItems++;
  }
  for (const todo of trackableTodos) {
    if (todo.status === 'done') completedItems++;
  }

  const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100) / 100;

  return {
    date: dateStr,
    profileId: isProfileActive && activeProfile ? activeProfile.id : null,
    sleepRange,
    sleepSegments,
    tasks: resolvedTasks,
    todos: resolvedTodos,
    emergencyRanges: emergencyRanges.map((er) => ({
      id: er.id,
      title: er.title,
      range: er.range,
    })),
    freeSlots,
    scheduledReminders,
    progress,
  };
}
