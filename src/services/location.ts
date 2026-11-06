import * as Location from 'expo-location';
import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PrayerSettings } from './prayer';

const LOCATION_SETTINGS_KEY = 'prayer_location_settings';

export function suggestCalculationMethod(countryCode?: string | null, countryName?: string | null): string {
  const code = (countryCode || '').toUpperCase();
  const name = (countryName || '').toLowerCase();

  if (code === 'SA' || name.includes('saudi')) return 'UmmAlQura';
  if (code === 'EG' || name.includes('egypt')) return 'Egyptian';
  if (code === 'AE' || name.includes('emirates') || name.includes('dubai')) return 'Dubai';
  if (code === 'QA' || name.includes('qatar')) return 'Qatar';
  if (code === 'KW' || name.includes('kuwait')) return 'Kuwait';
  if (code === 'PK' || code === 'IN' || code === 'BD' || name.includes('pakistan')) return 'Karachi';
  if (code === 'US' || code === 'CA' || name.includes('united states') || name.includes('canada')) return 'NorthAmerica';

  return 'MuslimWorldLeague';
}

export async function getSavedPrayerSettings(): Promise<PrayerSettings | null> {
  try {
    const row = await db.select().from(settings).where(eq(settings.key, LOCATION_SETTINGS_KEY)).limit(1);
    if (row.length > 0 && row[0].valueJson) {
      return JSON.parse(row[0].valueJson) as PrayerSettings;
    }
  } catch (err) {
    console.error('Failed to load prayer settings:', err);
  }
  return null;
}

export async function savePrayerSettings(config: PrayerSettings): Promise<void> {
  await db
    .insert(settings)
    .values({
      key: LOCATION_SETTINGS_KEY,
      valueJson: JSON.stringify(config),
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        valueJson: JSON.stringify(config),
        updatedAt: Date.now(),
      },
    });
}

export async function detectAndSaveLocation(): Promise<PrayerSettings | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  let city: string | null = null;
  let country: string | null = null;
  let countryCode: string | null = null;

  try {
    const reverse = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (reverse.length > 0) {
      city = reverse[0].city || reverse[0].subregion || reverse[0].region || null;
      country = reverse[0].country || null;
      countryCode = reverse[0].isoCountryCode || null;
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }

  const existing = await getSavedPrayerSettings();
  const method = existing?.method || suggestCalculationMethod(countryCode, country);
  const madhab = existing?.madhab || 'shafi';

  const newConfig: PrayerSettings = {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    city,
    country,
    method,
    madhab,
    minuteOffsets: existing?.minuteOffsets || {},
  };

  await savePrayerSettings(newConfig);
  return newConfig;
}
