import {
  NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/services/notifications/types';
import { resolveDayPlan } from '@/domain/resolveDay';
import { DomainTask, DomainTodo, DomainEmergency } from '@/domain/types';

describe('Notification and Reminder System', () => {
  it('defines valid Android notification channels', () => {
    expect(NOTIFICATION_CHANNELS.TASKS).toBe('dayflow_tasks');
    expect(NOTIFICATION_CHANNELS.TODOS).toBe('dayflow_todos');
    expect(NOTIFICATION_CHANNELS.EMERGENCIES).toBe('dayflow_emergencies');
    expect(NOTIFICATION_CHANNELS.ONGOING).toBe('dayflow_ongoing');
  });

  it('provides comprehensive default notification preferences', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.enabled).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.taskReminders).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.todoReminders).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.emergencyReminders).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.ongoingProgress).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.customSoundUri).toBeNull();
  });

  it('respects emergency suppression for task and todo reminders', () => {
    const normalTask: DomainTask = {
      id: 'task_regular',
      profileId: 'prof_1',
      title: 'Coding Session',
      start: { min: 600 },
      end: { min: 720 },
      flags: { important: false },
      enabled: true,
      categoryId: 'work',
      color: '#3B82F6',
    };

    const importantTask: DomainTask = {
      id: 'task_critical',
      profileId: 'prof_1',
      title: 'Medical Appointment',
      start: { min: 780 },
      end: { min: 840 },
      flags: { important: true },
      enabled: true,
      categoryId: 'health',
      color: '#EF4444',
    };

    const normalTodo: DomainTodo = {
      id: 'todo_regular',
      profileId: 'prof_1',
      title: 'Buy Groceries',
      categoryId: 'errands',
      reminders: [{ id: 'rem_1', timeMinutes: 660 }],
      flags: { important: false },
      enabled: true,
    };

    const importantTodo: DomainTodo = {
      id: 'todo_critical',
      profileId: 'prof_1',
      title: 'Take Medicine',
      categoryId: 'health',
      reminders: [{ id: 'rem_2', timeMinutes: 700 }],
      flags: { important: true },
      enabled: true,
    };

    // All-day emergency
    const allDayEmergency: DomainEmergency = {
      id: 'em_sick',
      title: 'Sick Leave',
      scheduleType: 'dates',
      scheduleData: ['2026-10-17'],
      startMinutes: null,
      endMinutes: null,
      reminders: [{ id: 'rem_3', timeMinutes: 540 }],
      enabled: true,
    };

    const plan = resolveDayPlan({
      dateStr: '2026-10-17',
      dateObj: new Date(2026, 9, 17, 12, 0, 0),
      activeProfile: {
        id: 'prof_1',
        title: 'Workday',
        daysMask: 127,
        tasks: [normalTask, importantTask],
        todos: [normalTodo, importantTodo],
      },
      emergencies: [allDayEmergency],
    });

    // Verify tasks suppression: regular task is suppressed, important task is NOT
    const resolvedRegular = plan.tasks.find((t) => t.task.id === 'task_regular');
    const resolvedImportant = plan.tasks.find((t) => t.task.id === 'task_critical');
    expect(resolvedRegular?.isSuspended).toBe(true);
    expect(resolvedImportant?.isSuspended).toBe(false);

    // Verify scheduledReminders: normal task and todo are NOT scheduled
    const regularTaskReminder = plan.scheduledReminders.find((r) => r.refId === 'task_regular');
    const importantTaskReminder = plan.scheduledReminders.find((r) => r.refId === 'task_critical');
    const regularTodoReminder = plan.scheduledReminders.find((r) => r.refId === 'todo_regular');
    const importantTodoReminder = plan.scheduledReminders.find((r) => r.refId === 'todo_critical');
    const emergencyReminder = plan.scheduledReminders.find((r) => r.refId === 'em_sick');

    expect(regularTaskReminder).toBeUndefined();
    expect(regularTodoReminder).toBeUndefined();

    // Important task, important todo, and emergency must remain scheduled
    expect(importantTaskReminder).toBeDefined();
    expect(importantTaskReminder?.atMinutes).toBe(780);

    expect(importantTodoReminder).toBeDefined();
    expect(importantTodoReminder?.atMinutes).toBe(700);

    expect(emergencyReminder).toBeDefined();
    expect(emergencyReminder?.atMinutes).toBe(540);
  });
});
