import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  Madhab,
} from 'adhan';
import { Minute, PrayerLabel } from '@/domain/types';

export interface PrayerSettings {
  latitude: number;
  longitude: number;
  city?: string | null;
  country?: string | null;
  method: string; // 'UmmAlQura' | 'Egyptian' | 'MuslimWorldLeague' | 'NorthAmerica' | 'Karachi' | 'Dubai' | 'Qatar' | 'Kuwait'
  madhab: 'shafi' | 'hanafi';
  minuteOffsets?: Partial<Record<PrayerLabel, number>>;
}

export function getCalculationParameters(methodName: string, madhabName: 'shafi' | 'hanafi'): CalculationParameters {
  let params: CalculationParameters;

  switch (methodName) {
    case 'UmmAlQura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'Egyptian':
      params = CalculationMethod.Egyptian();
      break;
    case 'MuslimWorldLeague':
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case 'NorthAmerica':
      params = CalculationMethod.NorthAmerica();
      break;
    case 'Dubai':
      params = CalculationMethod.Dubai();
      break;
    case 'Qatar':
      params = CalculationMethod.Qatar();
      break;
    case 'Kuwait':
      params = CalculationMethod.Kuwait();
      break;
    case 'Karachi':
      params = CalculationMethod.Karachi();
      break;
    default:
      params = CalculationMethod.UmmAlQura();
      break;
  }

  params.madhab = madhabName === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export interface DayPrayerTimes {
  fajr: Minute;
  sunrise: Minute;
  dhuhr: Minute;
  asr: Minute;
  maghrib: Minute;
  isha: Minute;
}

function dateToMinutes(d: Date): Minute {
  return d.getHours() * 60 + d.getMinutes();
}

export function calculateDailyPrayerTimes(
  date: Date,
  settings: PrayerSettings,
): DayPrayerTimes {
  const coordinates = new Coordinates(settings.latitude, settings.longitude);
  const params = getCalculationParameters(settings.method, settings.madhab);

  const times = new PrayerTimes(coordinates, date, params);

  const offsets = settings.minuteOffsets || {};

  return {
    fajr: (dateToMinutes(times.fajr) + (offsets.fajr || 0) + 1440) % 1440,
    sunrise: (dateToMinutes(times.sunrise) + (offsets.sunrise || 0) + 1440) % 1440,
    dhuhr: (dateToMinutes(times.dhuhr) + (offsets.dhuhr || 0) + 1440) % 1440,
    asr: (dateToMinutes(times.asr) + (offsets.asr || 0) + 1440) % 1440,
    maghrib: (dateToMinutes(times.maghrib) + (offsets.maghrib || 0) + 1440) % 1440,
    isha: (dateToMinutes(times.isha) + (offsets.isha || 0) + 1440) % 1440,
  };
}
