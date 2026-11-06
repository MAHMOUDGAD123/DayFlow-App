import { buildWidgetPayloads } from '@/widgets/widgetDataResolver';
import { resolveDayPlan } from '@/domain/resolveDay';
import { DomainTask } from '@/domain/types';

describe('Home Screen Widgets Data Resolver', () => {
  it('generates valid 24h timeline and active task props for empty day', () => {
    const emptyPlan = resolveDayPlan({
      dateStr: '2026-10-17',
      dateObj: new Date(2026, 9, 17, 14, 30),
      emergencies: [],
    });

    const data = buildWidgetPayloads(emptyPlan, new Date(2026, 9, 17, 14, 30));

    expect(data.timelineProps).toBeDefined();
    expect(data.timelineProps.hourlyOccupied).toHaveLength(24);
    expect(data.timelineProps.currentHour).toBe(14);
    expect(data.timelineProps.activeTaskTitle).toBe('Free Time');
    expect(data.timelineProps.progressPercent).toBe(0);

    expect(data.activeTaskProps).toBeDefined();
    expect(data.activeTaskProps.statusBadge).toBe('FREE TIME');
    expect(data.activeTaskProps.statusColor).toBe('#6B7280');
  });

  it('accurately marks occupied hours when an active task is running', () => {
    const studyTask: DomainTask = {
      id: 'task_study',
      profileId: 'prof_test_sat',
      title: 'Deep Work React',
      description: null,
      start: { min: 600 }, // 10:00
      end: { min: 840 }, // 14:00
      categoryId: 'study',
      color: '#3B82F6',
      flags: { important: true },
      enabled: true,
    };

    const dayPlan = resolveDayPlan({
      dateStr: '2026-10-17',
      dateObj: new Date(2026, 9, 17, 11, 30),
      activeProfile: {
        id: 'prof_test_sat',
        title: 'Saturday Study',
        daysMask: 1, // Saturday
        tasks: [studyTask],
        todos: [],
      },
      emergencies: [],
    });

    // Test at 11:30 AM (minute 690)
    const testDate = new Date(2026, 9, 17, 11, 30);
    const data = buildWidgetPayloads(dayPlan, testDate);

    // Hours 10, 11, 12, 13, 14 should be occupied
    expect(data.timelineProps.hourlyOccupied[10]).toBe(true);
    expect(data.timelineProps.hourlyOccupied[11]).toBe(true);
    expect(data.timelineProps.hourlyOccupied[12]).toBe(true);
    expect(data.timelineProps.hourlyOccupied[13]).toBe(true);
    expect(data.timelineProps.hourlyOccupied[14]).toBe(true);
    // Hour 9 and Hour 15 should be false
    expect(data.timelineProps.hourlyOccupied[9]).toBe(false);
    expect(data.timelineProps.hourlyOccupied[15]).toBe(false);

    // Active task widget should reflect active status
    expect(data.activeTaskProps.statusBadge).toBe('ACTIVE');
    expect(data.activeTaskProps.statusColor).toBe('#10B981');
    expect(data.activeTaskProps.taskTitle).toBe('Deep Work React');
    expect(data.activeTaskProps.remainingText).toBe('150m left'); // 840 - 690 = 150
  });
});
