import { calculateDailyPrayerTimes, PrayerSettings } from '@/services/prayer';

describe('Prayer Times Calculation (Adhan)', () => {
  it('calculates chronological prayer times for given coordinates', () => {
    // Mecca coordinates
    const settings: PrayerSettings = {
      latitude: 21.4225,
      longitude: 39.8262,
      city: 'Mecca',
      country: 'Saudi Arabia',
      method: 'UmmAlQura',
      madhab: 'shafi',
    };

    const date = new Date(2026, 9, 17); // Oct 17, 2026
    const times = calculateDailyPrayerTimes(date, settings);

    // Verify all 6 prayer times are valid minutes
    expect(times.fajr).toBeGreaterThanOrEqual(0);
    expect(times.fajr).toBeLessThan(1440);

    // Verify chronological order: Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha
    expect(times.fajr).toBeLessThan(times.sunrise);
    expect(times.sunrise).toBeLessThan(times.dhuhr);
    expect(times.dhuhr).toBeLessThan(times.asr);
    expect(times.asr).toBeLessThan(times.maghrib);
    expect(times.maghrib).toBeLessThan(times.isha);
  });

  it('applies user minute offsets correctly', () => {
    const settings: PrayerSettings = {
      latitude: 30.0444,
      longitude: 31.2357,
      city: 'Cairo',
      country: 'Egypt',
      method: 'Egyptian',
      madhab: 'shafi',
      minuteOffsets: {
        fajr: 10,
        dhuhr: -5,
      },
    };

    const date = new Date(2026, 9, 17);
    const timesNoOffset = calculateDailyPrayerTimes(date, { ...settings, minuteOffsets: {} });
    const timesWithOffset = calculateDailyPrayerTimes(date, settings);

    expect(timesWithOffset.fajr).toBe((timesNoOffset.fajr + 10) % 1440);
    expect(timesWithOffset.dhuhr).toBe((timesNoOffset.dhuhr - 5 + 1440) % 1440);
  });
});
