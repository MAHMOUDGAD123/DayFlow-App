import { Minute, DomainTask } from './types';
import { intervalsOverlap, clampMinute } from './time';

export interface ProfileConflictResult {
  hasConflict: boolean;
  conflictingProfileIds: string[];
  overlappingMask: number;
}

export function checkProfileDaysConflict(
  candidate: { id: string; daysMask: number },
  enabledProfiles: { id: string; daysMask: number }[],
): ProfileConflictResult {
  const conflictingProfileIds: string[] = [];
  let overlappingMask = 0;

  for (const p of enabledProfiles) {
    if (p.id === candidate.id) continue;
    const common = candidate.daysMask & p.daysMask;
    if (common !== 0) {
      conflictingProfileIds.push(p.id);
      overlappingMask |= common;
    }
  }

  return {
    hasConflict: conflictingProfileIds.length > 0,
    conflictingProfileIds,
    overlappingMask,
  };
}

/**
 * Returns the 1 or 2 [start, end) interval segments for a task within a 24-hour cycle.
 * If start === end, duration is 0 (returns []).
 * If end > start, returns [[start, end]].
 * If start > end, crosses midnight: returns [[start, 1440], [0, end]] (if end > 0).
 */
export function getIntervalSegments(start: Minute, end: Minute): [Minute, Minute][] {
  const s = clampMinute(start);
  const e = clampMinute(end);

  if (s === e) {
    return [];
  }

  if (e > s) {
    return [[s, e]];
  }

  // Crosses midnight
  const segments: [Minute, Minute][] = [[s, 1440]];
  if (e > 0) {
    segments.push([0, e]);
  }
  return segments;
}

/**
 * Checks whether two time intervals overlap anywhere in the 24-hour cycle,
 * correctly handling midnight crossing intervals.
 */
export function doTaskIntervalsOverlap(
  startA: Minute,
  endA: Minute,
  startB: Minute,
  endB: Minute,
): boolean {
  const segsA = getIntervalSegments(startA, endA);
  const segsB = getIntervalSegments(startB, endB);

  for (const [sA, eA] of segsA) {
    for (const [sB, eB] of segsB) {
      if (intervalsOverlap(sA, eA, sB, eB)) {
        return true;
      }
    }
  }

  return false;
}

export interface TaskOverlapResult {
  hasOverlap: boolean;
  overlappingTaskPairs: [string, string][];
}

export function checkInternalTasksOverlap(
  tasks: { id: string; start: Minute; end: Minute; enabled?: boolean }[],
): TaskOverlapResult {
  const activeTasks = tasks.filter((t) => t.enabled !== false);
  const overlappingTaskPairs: [string, string][] = [];

  for (let i = 0; i < activeTasks.length; i++) {
    for (let j = i + 1; j < activeTasks.length; j++) {
      const taskA = activeTasks[i];
      const taskB = activeTasks[j];

      if (doTaskIntervalsOverlap(taskA.start, taskA.end, taskB.start, taskB.end)) {
        overlappingTaskPairs.push([taskA.id, taskB.id]);
      }
    }
  }

  return {
    hasOverlap: overlappingTaskPairs.length > 0,
    overlappingTaskPairs,
  };
}

export interface OverlappingTaskInfo {
  id: string;
  title: string;
  start: Minute;
  end: Minute;
}

/**
 * Finds the first enabled task in the list that overlaps with the given candidate interval.
 */
export function findOverlappingTask(
  candidate: { id?: string; start: Minute; end: Minute },
  tasks: (DomainTask | { id: string; title: string; start: { min: Minute }; end: { min: Minute }; enabled?: boolean })[],
): OverlappingTaskInfo | undefined {
  for (const t of tasks) {
    if (t.enabled === false) continue;
    if (candidate.id && t.id === candidate.id) continue;
    if (doTaskIntervalsOverlap(candidate.start, candidate.end, t.start.min, t.end.min)) {
      return {
        id: t.id,
        title: t.title,
        start: t.start.min,
        end: t.end.min,
      };
    }
  }
  return undefined;
}
