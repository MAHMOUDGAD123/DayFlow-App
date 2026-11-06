import { Minute } from './types';

export function calculateFreeSlots(
  occupiedSegments: [Minute, Minute][],
): [Minute, Minute][] {
  if (occupiedSegments.length === 0) {
    return [[0, 1440]];
  }

  // Normalize and sort segments by start time
  const sorted = occupiedSegments
    .map(([s, e]): [Minute, Minute] => [
      Math.max(0, Math.min(1440, s)),
      Math.max(0, Math.min(1440, e)),
    ])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  if (sorted.length === 0) {
    return [[0, 1440]];
  }

  // Merge overlapping or contiguous occupied intervals
  const merged: [Minute, Minute][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  // Invert merged intervals across [0, 1440] to find free gaps
  const freeSlots: [Minute, Minute][] = [];
  let currentHead = 0;

  for (const [s, e] of merged) {
    if (s > currentHead) {
      freeSlots.push([currentHead, s]);
    }
    currentHead = Math.max(currentHead, e);
  }

  if (currentHead < 1440) {
    freeSlots.push([currentHead, 1440]);
  }

  return freeSlots;
}
