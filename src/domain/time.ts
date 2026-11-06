import { Minute } from './types';

export function clampMinute(value: number): Minute {
  return Math.max(0, Math.min(1439, Math.floor(value)));
}

export function durationMinutes(start: Minute, end: Minute): number {
  if (end >= start) {
    return end - start;
  }
  // Crosses midnight
  return 1440 - start + end;
}

export function intervalsOverlap(
  aStart: Minute,
  aEnd: Minute,
  bStart: Minute,
  bEnd: Minute,
): boolean {
  // Checks overlap on interval [start, end)
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export interface SplitIntervalResult {
  todaySegment: [Minute, Minute];
  tomorrowSpillover?: [Minute, Minute];
  crossesMidnight: boolean;
}

export function splitMidnightInterval(start: Minute, end: Minute): SplitIntervalResult {
  const s = clampMinute(start);
  const e = clampMinute(end);

  if (e > s) {
    return {
      todaySegment: [s, e],
      crossesMidnight: false,
    };
  }

  // Crosses midnight:
  // Today's portion: from s to 1440 (midnight)
  // Tomorrow's spillover: from 0 to e
  return {
    todaySegment: [s, 1440],
    tomorrowSpillover: e > 0 ? [0, e] : undefined,
    crossesMidnight: true,
  };
}

export function getWeekdayMaskBit(date: Date): number {
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  switch (day) {
    case 6: // Saturday
      return 1;
    case 0: // Sunday
      return 2;
    case 1: // Monday
      return 4;
    case 2: // Tuesday
      return 8;
    case 3: // Wednesday
      return 16;
    case 4: // Thursday
      return 32;
    case 5: // Friday
      return 64;
    default:
      return 1;
  }
}
