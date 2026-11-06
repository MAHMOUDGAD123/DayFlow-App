import { eq } from 'drizzle-orm';
import { db } from '../client';
import { settings } from '../schema';

const KEY_ONBOARDING = 'has_completed_onboarding';

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (rows.length === 0) return defaultValue;
  try {
    return JSON.parse(rows[0].valueJson) as T;
  } catch {
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const now = Date.now();
  await db
    .insert(settings)
    .values({
      key,
      valueJson: JSON.stringify(value),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        valueJson: JSON.stringify(value),
        updatedAt: now,
      },
    });
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return getSetting<boolean>(KEY_ONBOARDING, false);
}

export async function markOnboardingCompleted(): Promise<void> {
  await setSetting<boolean>(KEY_ONBOARDING, true);
}

const KEY_NOTIFICATION_PREFS = 'notification_preferences';

export async function getNotificationPreferences(): Promise<import('@/services/notifications/types').NotificationPreferences> {
  const { DEFAULT_NOTIFICATION_PREFERENCES } = await import('@/services/notifications/types');
  return getSetting(KEY_NOTIFICATION_PREFS, DEFAULT_NOTIFICATION_PREFERENCES);
}

export async function updateNotificationPreferences(
  partial: Partial<import('@/services/notifications/types').NotificationPreferences>
): Promise<import('@/services/notifications/types').NotificationPreferences> {
  const current = await getNotificationPreferences();
  const updated = { ...current, ...partial };
  await setSetting(KEY_NOTIFICATION_PREFS, updated);
  return updated;
}

