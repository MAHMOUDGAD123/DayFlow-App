import { formatNumber } from '@/i18n/formatters';
import { type TFunction } from 'i18next';

export function formatDurationTextByMinHr(
  minutes: number,
  hours: number,
  currentLocale: string,
  t: TFunction,
  sep: string = ' ',
) {
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${formatNumber(hours ?? 0, currentLocale)} ${t('today.hours', 'hr')}`);
  }

  if (minutes > 0) {
    parts.push(`${formatNumber(minutes ?? 0, currentLocale)} ${t('today.minutes', 'min')}`);
  }

  return parts.join(sep);
}

export function getFreeHoursInfo(
  freeSlots: [number, number][] | null | undefined,
  currentLocale: string,
  t: TFunction,
) {
  if (!freeSlots) {
    return {
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
      hoursText: formatNumber(0, currentLocale),
      minutesText: formatNumber(0, currentLocale),
      fullDurationText: formatDurationTextByMinHr(0, 0, currentLocale, t),
    };
  }

  // Note: If slot[1] - slot[0] is in decimal hours (like 5.5), multiply by 60 here:
  // (sum, slot) => sum + (slot[1] - slot[0]) * 60
  const rawTotalMinutes = freeSlots.reduce((sum, slot) => sum + (slot[1] - slot[0]), 0);

  const totalMinutes = Math.round(rawTotalMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    hours,
    minutes,
    hoursText: formatNumber(hours, currentLocale),
    minutesText: formatNumber(minutes, currentLocale),
    fullDurationText: formatDurationTextByMinHr(minutes, hours, currentLocale, t),
  };
}

export function getSleepDurationInfo(
  sleepStart: number | undefined,
  sleepEnd: number | undefined,
  currentLocale: string,
  t: TFunction,
) {
  let diff = (sleepEnd ?? 0) - (sleepStart ?? 0);
  // Handle overnight sleep crossing midnight (1440 minutes = 24 hours)
  if (diff < 0) {
    diff += 1440;
  }

  const totalMinutes = Math.round(diff);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    hours,
    minutes,
    hoursText: formatNumber(hours, currentLocale),
    minutesText: formatNumber(minutes, currentLocale),
    fullDurationText: formatDurationTextByMinHr(minutes, hours, currentLocale, t),
  };
}

export function getSleepDurationText(
  sleepStart: number | undefined,
  sleepEnd: number | undefined,
  currentLocale: string,
  t: TFunction,
) {
  let diff = (sleepEnd ?? 0) - (sleepStart ?? 0);
  // Handle overnight sleep crossing midnight (1440 minutes = 24 hours)
  if (diff < 0) {
    diff += 1440;
  }

  const totalMinutes = Math.round(diff);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return formatDurationTextByMinHr(minutes, hours, currentLocale, t);
}
