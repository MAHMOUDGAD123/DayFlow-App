import { splitMidnightInterval, durationMinutes, intervalsOverlap } from '@/domain/time';
import { checkProfileDaysConflict, checkInternalTasksOverlap } from '@/domain/conflicts';
import { calculateFreeSlots } from '@/domain/freeSlots';
import { evaluateTaskSuspension, evaluateTodoSuspension } from '@/domain/emergencies';
import { resolveDayPlan } from '@/domain/resolveDay';
import { DomainTask, DomainTodo } from '@/domain/types';
import { getNextAutomatedTaskColor, AUTOMATED_TASK_PALETTE } from '@/utils/taskColors';

describe('Day Engine - Time & Midnight Crossing', () => {
  it('splits standard daytime intervals without spillover', () => {
    // 09:00 (540) to 12:00 (720)
    const res = splitMidnightInterval(540, 720);
    expect(res.crossesMidnight).toBe(false);
    expect(res.todaySegment).toEqual([540, 720]);
    expect(res.tomorrowSpillover).toBeUndefined();
    expect(durationMinutes(540, 720)).toBe(180);
  });

  it('splits midnight-crossing intervals into today and spillover segments', () => {
    // 23:00 (1380) to 06:00 (360)
    const res = splitMidnightInterval(1380, 360);
    expect(res.crossesMidnight).toBe(true);
    expect(res.todaySegment).toEqual([1380, 1440]);
    expect(res.tomorrowSpillover).toEqual([0, 360]);
    expect(durationMinutes(1380, 360)).toBe(420); // 1h before midnight + 6h after = 7h = 420m
  });

  it('detects interval overlaps correctly', () => {
    expect(intervalsOverlap(100, 200, 150, 250)).toBe(true);
    expect(intervalsOverlap(100, 200, 200, 300)).toBe(false); // contiguous boundaries do not overlap
    expect(intervalsOverlap(100, 200, 50, 80)).toBe(false);
  });
});

describe('Day Engine - Conflict Detection', () => {
  it('detects strict profile weekday conflicts', () => {
    // Profile A: Sat(1) + Sun(2) = 3
    const candidate = { id: 'prof_a', daysMask: 3 };
    // Profile B: Sun(2) + Mon(4) = 6
    const existing = [{ id: 'prof_b', daysMask: 6 }];

    const conflict = checkProfileDaysConflict(candidate, existing);
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.conflictingProfileIds).toContain('prof_b');
    expect(conflict.overlappingMask).toBe(2); // Sunday overlaps
  });

  it('allows non-overlapping profile weekdays', () => {
    // Profile A: Sat(1) = 1
    const candidate = { id: 'prof_a', daysMask: 1 };
    // Profile B: Mon(4) + Tue(8) = 12
    const existing = [{ id: 'prof_b', daysMask: 12 }];

    const conflict = checkProfileDaysConflict(candidate, existing);
    expect(conflict.hasConflict).toBe(false);
    expect(conflict.conflictingProfileIds).toHaveLength(0);
  });

  it('detects internal task overlaps within a profile', () => {
    const tasks = [
      { id: 't1', start: 600, end: 720 }, // 10:00 - 12:00
      { id: 't2', start: 700, end: 800 }, // 11:40 - 13:20 (overlaps t1)
    ];
    const res = checkInternalTasksOverlap(tasks);
    expect(res.hasOverlap).toBe(true);
    expect(res.overlappingTaskPairs).toEqual([['t1', 't2']]);
  });
});

describe('Day Engine - Free Slots Calculation', () => {
  it('calculates full day free slot when no tasks exist', () => {
    expect(calculateFreeSlots([])).toEqual([[0, 1440]]);
  });

  it('calculates free slots before, between, and after tasks', () => {
    // Task 1: 10:00 (600) to 12:00 (720)
    // Task 2: 14:00 (840) to 16:00 (960)
    const free = calculateFreeSlots([
      [600, 720],
      [840, 960],
    ]);
    expect(free).toEqual([
      [0, 600],
      [720, 840],
      [960, 1440],
    ]);
  });
});

describe('Day Engine - Emergency Suspension Rules', () => {
  it('suspends non-important tasks overlapping emergency ranges', () => {
    const emergencyRanges = [
      { id: 'em1', title: 'Car Breakdown', range: [600, 800] as [number, number], isAllDay: false },
    ];

    // Non-important task overlapping [600, 800]
    const taskA = evaluateTaskSuspension([650, 750], false, emergencyRanges);
    expect(taskA.isSuspended).toBe(true);
    expect(taskA.suspendedBy).toContain('em1');

    // IMPORTANT task overlapping [600, 800] MUST NOT BE SUSPENDED
    const taskB = evaluateTaskSuspension([650, 750], true, emergencyRanges);
    expect(taskB.isSuspended).toBe(false);
  });

  it('suspends all non-important todos when all-day emergency is active', () => {
    const emergencyRanges = [
      { id: 'em_sick', title: 'Sick Day', range: [0, 1440] as [number, number], isAllDay: true },
    ];

    const normalTodo = evaluateTodoSuspension(false, emergencyRanges, [600, 900]);
    expect(normalTodo.isSuspended).toBe(true);

    const importantTodo = evaluateTodoSuspension(true, emergencyRanges, [600, 900]);
    expect(importantTodo.isSuspended).toBe(false);
    expect(importantTodo.activeReminders).toEqual([600, 900]);
  });
});

describe('Day Engine - Complete resolveDayPlan', () => {
  it('resolves day plan with tasks, todos, spillover, free slots and progress', () => {
    const sampleTask: DomainTask = {
      id: 'task_study',
      profileId: 'p1',
      title: 'Study Web Dev',
      start: { min: 600 }, // 10:00
      end: { min: 720 }, // 12:00
      categoryId: 'cat_study',
      color: '#3B82F6',
      flags: { important: false },
      enabled: true,
    };

    const sampleTodo: DomainTodo = {
      id: 'todo_call',
      profileId: 'p1',
      title: 'Call Client',
      categoryId: 'cat_work',
      flags: { important: true },
      reminders: [{ id: 'r1', timeMinutes: 800 }],
      enabled: true,
    };

    const saturdayDate = new Date(2026, 9, 17); // Oct 17 2026 is Saturday (bit 1)

    const plan = resolveDayPlan({
      dateStr: '2026-10-17',
      dateObj: saturdayDate,
      activeProfile: {
        id: 'p1',
        title: 'Weekend Profile',
        daysMask: 1, // Saturday
        tasks: [sampleTask],
        todos: [sampleTodo],
      },
      emergencies: [],
      itemStates: {
        task_study: 'done',
      },
    });

    expect(plan.profileId).toBe('p1');
    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0].status).toBe('done');
    expect(plan.todos).toHaveLength(1);
    expect(plan.freeSlots).toEqual([
      [0, 600],
      [720, 1440],
    ]);
    expect(plan.progress).toBe(0.5); // 1 done out of 2 total
  });

  it('incorporates profile sleep interval into free slots and does not treat sleep as a task', () => {
    const saturdayDate = new Date(2026, 9, 17);

    const task: DomainTask = {
      id: 'task_work',
      profileId: 'p1',
      title: 'Work Session',
      start: { min: 600 }, // 10:00
      end: { min: 720 }, // 12:00
      categoryId: 'cat_work',
      color: '#3B82F6',
      flags: { important: true },
      enabled: true,
    };

    const plan = resolveDayPlan({
      dateStr: '2026-10-17',
      dateObj: saturdayDate,
      activeProfile: {
        id: 'p1',
        title: 'Sleep Test Profile',
        daysMask: 1, // Saturday
        sleepStart: 1380, // 23:00
        sleepEnd: 420, // 07:00
        tasks: [task],
        todos: [],
      },
      emergencies: [],
    });

    // Sleep is NOT in tasks list
    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0].task.id).toBe('task_work');

    // Sleep segments are populated
    expect(plan.sleepRange).toEqual({ start: 1380, end: 420 });
    expect(plan.sleepSegments).toEqual([
      [0, 420],
      [1380, 1440],
    ]);

    // Free slots exclude both sleep ([0, 420] & [1380, 1440]) and task ([600, 720])
    expect(plan.freeSlots).toEqual([
      [420, 600],
      [720, 1380],
    ]);
  });
});

describe('Day Engine - Automated Task Colors', () => {
  it('automatically selects distinct unused colors for consecutive tasks', () => {
    const tasks: { color: string }[] = [];
    const assignedColors: string[] = [];

    for (let i = 0; i < 5; i++) {
      const color = getNextAutomatedTaskColor(tasks);
      expect(assignedColors).not.toContain(color);
      assignedColors.push(color);
      tasks.push({ color });
    }

    expect(assignedColors).toEqual(AUTOMATED_TASK_PALETTE.slice(0, 5));
  });
});
