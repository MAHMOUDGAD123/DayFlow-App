import {
  checkProfileDaysConflict,
  checkInternalTasksOverlap,
  doTaskIntervalsOverlap,
  findOverlappingTask,
  getIntervalSegments,
} from '../conflicts';

describe('Profile Days Conflict Detection', () => {
  const WEEKDAYS = {
    SAT: 1,
    SUN: 2,
    MON: 4,
    TUE: 8,
    WED: 16,
    THU: 32,
    FRI: 64,
  };

  it('detects conflict when candidate shares active days with an enabled profile', () => {
    const candidate = { id: 'profile_active_1', daysMask: WEEKDAYS.MON | WEEKDAYS.TUE };
    const enabledProfiles = [
      { id: 'profile_active_2', daysMask: WEEKDAYS.TUE | WEEKDAYS.WED },
    ];

    const result = checkProfileDaysConflict(candidate, enabledProfiles);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingProfileIds).toEqual(['profile_active_2']);
    expect(result.overlappingMask).toBe(WEEKDAYS.TUE);
  });

  it('does not detect conflict when days do not overlap', () => {
    const candidate = { id: 'profile_active_1', daysMask: WEEKDAYS.MON };
    const enabledProfiles = [
      { id: 'profile_active_2', daysMask: WEEKDAYS.TUE | WEEKDAYS.WED },
    ];

    const result = checkProfileDaysConflict(candidate, enabledProfiles);
    expect(result.hasConflict).toBe(false);
    expect(result.conflictingProfileIds).toEqual([]);
    expect(result.overlappingMask).toBe(0);
  });

  it('ignores the candidate profile itself when present in enabledProfiles list', () => {
    const candidate = { id: 'profile_active_1', daysMask: WEEKDAYS.MON | WEEKDAYS.TUE };
    const enabledProfiles = [
      { id: 'profile_active_1', daysMask: WEEKDAYS.MON | WEEKDAYS.TUE },
    ];

    const result = checkProfileDaysConflict(candidate, enabledProfiles);
    expect(result.hasConflict).toBe(false);
    expect(result.conflictingProfileIds).toEqual([]);
    expect(result.overlappingMask).toBe(0);
  });

  it('detects multiple conflicts across several enabled profiles', () => {
    const candidate = {
      id: 'profile_candidate',
      daysMask: WEEKDAYS.MON | WEEKDAYS.WED | WEEKDAYS.FRI,
    };
    const enabledProfiles = [
      { id: 'profile_1', daysMask: WEEKDAYS.MON },
      { id: 'profile_2', daysMask: WEEKDAYS.TUE },
      { id: 'profile_3', daysMask: WEEKDAYS.FRI },
    ];

    const result = checkProfileDaysConflict(candidate, enabledProfiles);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingProfileIds).toEqual(['profile_1', 'profile_3']);
    expect(result.overlappingMask).toBe(WEEKDAYS.MON | WEEKDAYS.FRI);
  });
});

describe('Task Intervals and Overlap Detection', () => {
  it('correctly returns interval segments for standard and midnight intervals', () => {
    expect(getIntervalSegments(600, 720)).toEqual([[600, 720]]);
    // Midnight crossing
    expect(getIntervalSegments(1380, 120)).toEqual([
      [1380, 1440],
      [0, 120],
    ]);
    // Zero duration
    expect(getIntervalSegments(600, 600)).toEqual([]);
  });

  it('detects overlap for standard daytime intervals', () => {
    // 10:00 - 14:00 (600, 840) vs 11:00 - 16:00 (660, 960)
    expect(doTaskIntervalsOverlap(600, 840, 660, 960)).toBe(true);
    expect(doTaskIntervalsOverlap(660, 960, 600, 840)).toBe(true);

    // Contained interval
    expect(doTaskIntervalsOverlap(600, 900, 650, 750)).toBe(true);
  });

  it('does not detect overlap for consecutive / touching intervals', () => {
    // 10:00 - 14:00 (600, 840) and 14:00 - 16:00 (840, 960)
    expect(doTaskIntervalsOverlap(600, 840, 840, 960)).toBe(false);
    expect(doTaskIntervalsOverlap(840, 960, 600, 840)).toBe(false);
  });

  it('does not detect overlap for disjoint intervals', () => {
    // 09:00 - 10:00 (540, 600) and 11:00 - 12:00 (660, 720)
    expect(doTaskIntervalsOverlap(540, 600, 660, 720)).toBe(false);
  });

  it('detects overlap when one task crosses midnight into the early morning of another', () => {
    // Task A: 23:00 - 02:00 (1380, 120)
    // Task B: 01:00 - 03:00 (60, 180)
    expect(doTaskIntervalsOverlap(1380, 120, 60, 180)).toBe(true);
    expect(doTaskIntervalsOverlap(60, 180, 1380, 120)).toBe(true);
  });

  it('detects overlap when one task crosses midnight and another is late evening', () => {
    // Task A: 23:00 - 02:00 (1380, 120)
    // Task B: 22:00 - 23:30 (1320, 1410)
    expect(doTaskIntervalsOverlap(1380, 120, 1320, 1410)).toBe(true);
  });

  it('detects overlap when two tasks both cross midnight', () => {
    // Task A: 22:00 - 02:00 (1320, 120)
    // Task B: 23:00 - 03:00 (1380, 180)
    expect(doTaskIntervalsOverlap(1320, 120, 1380, 180)).toBe(true);
  });

  it('does not detect overlap when touching at midnight boundary', () => {
    // Task A: 22:00 - 02:00 (1320, 120)
    // Task B: 02:00 - 04:00 (120, 240)
    expect(doTaskIntervalsOverlap(1320, 120, 120, 240)).toBe(false);
  });

  it('checkInternalTasksOverlap detects all conflicting pairs in task list', () => {
    const tasks = [
      { id: 't1', start: 600, end: 840 }, // 10:00 - 14:00
      { id: 't2', start: 660, end: 960 }, // 11:00 - 16:00 (overlaps t1)
      { id: 't3', start: 1000, end: 1100 }, // 16:40 - 18:20 (disjoint)
    ];

    const result = checkInternalTasksOverlap(tasks);
    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingTaskPairs).toEqual([['t1', 't2']]);
  });

  it('findOverlappingTask identifies conflicting task metadata', () => {
    const existing = [
      {
        id: 'task_work',
        title: 'Focus Work',
        start: { min: 600 },
        end: { min: 840 },
        enabled: true,
      },
    ];

    const conflict = findOverlappingTask({ start: 660, end: 900 }, existing as any);
    expect(conflict).toBeDefined();
    expect(conflict?.id).toBe('task_work');
    expect(conflict?.title).toBe('Focus Work');

    const noConflict = findOverlappingTask({ start: 840, end: 900 }, existing as any);
    expect(noConflict).toBeUndefined();
  });
});
