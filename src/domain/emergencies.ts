import { Minute, DomainEmergency } from './types';
import { intervalsOverlap, getWeekdayMaskBit } from './time';

export interface EffectiveEmergencyRange {
  id: string;
  title: string;
  range: [Minute, Minute];
  isAllDay: boolean;
}

export function getActiveEmergenciesForDate(
  emergencies: DomainEmergency[],
  dateStr: string, // YYYY-MM-DD
  dateObj: Date,
): DomainEmergency[] {
  const weekdayBit = getWeekdayMaskBit(dateObj);

  return emergencies.filter((e) => {
    if (!e.enabled) return false;
    if (e.scheduleType === 'dates') {
      return e.scheduleData.includes(dateStr);
    }
    if (e.scheduleType === 'weekdays') {
      const bitmask = Number(e.scheduleData[0]) || 0;
      return (bitmask & weekdayBit) !== 0;
    }
    return false;
  });
}

export function computeEmergencyRanges(
  activeEmergencies: DomainEmergency[],
): EffectiveEmergencyRange[] {
  return activeEmergencies.map((e) => {
    const isAllDay = e.startMinutes == null || e.endMinutes == null;
    const range: [Minute, Minute] = isAllDay
      ? [0, 1440]
      : [Math.min(e.startMinutes!, e.endMinutes!), Math.max(e.startMinutes!, e.endMinutes!)];

    return {
      id: e.id,
      title: e.title,
      range,
      isAllDay,
    };
  });
}

export function evaluateTaskSuspension(
  taskSegment: [Minute, Minute],
  isImportant: boolean,
  emergencyRanges: EffectiveEmergencyRange[],
): { isSuspended: boolean; suspendedBy: string[] } {
  if (isImportant) {
    return { isSuspended: false, suspendedBy: [] };
  }

  const suspendedBy: string[] = [];
  for (const em of emergencyRanges) {
    if (intervalsOverlap(taskSegment[0], taskSegment[1], em.range[0], em.range[1])) {
      suspendedBy.push(em.id);
    }
  }

  return {
    isSuspended: suspendedBy.length > 0,
    suspendedBy,
  };
}

export function evaluateTodoSuspension(
  isImportant: boolean,
  emergencyRanges: EffectiveEmergencyRange[],
  reminders: Minute[],
): { isSuspended: boolean; activeReminders: Minute[]; suspendedBy: string[] } {
  if (isImportant) {
    return { isSuspended: false, activeReminders: reminders, suspendedBy: [] };
  }

  const allDayEm = emergencyRanges.find((e) => e.isAllDay);
  if (allDayEm) {
    return {
      isSuspended: true,
      activeReminders: [],
      suspendedBy: [allDayEm.id],
    };
  }

  // Time-ranged emergencies: filter out reminders inside the emergency ranges
  const activeReminders = reminders.filter((r) => {
    for (const em of emergencyRanges) {
      if (r >= em.range[0] && r < em.range[1]) {
        return false;
      }
    }
    return true;
  });

  return {
    isSuspended: false,
    activeReminders,
    suspendedBy: [],
  };
}
