import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../client';
import { emergencies, emergencyReminders } from '../schema';
import { triggerAutoBackup } from '@/services/backup/autoBackup';

export interface EmergencyReminder {
  id: string;
  emergencyId: string;
  timeMinutes: number;
  prayer?: string | null;
}

export interface FullEmergency {
  id: string;
  title: string;
  description: string | null;
  scheduleType: 'dates' | 'weekdays';
  scheduleData: string[]; // dates array (YYYY-MM-DD) or weekday bitmask as string
  startMinutes: number | null; // null = all day
  endMinutes: number | null;
  reminders: EmergencyReminder[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export async function getAllEmergencies(): Promise<FullEmergency[]> {
  const rows = await db.select().from(emergencies).orderBy(desc(emergencies.createdAt));
  const list: FullEmergency[] = [];

  for (const r of rows) {
    const remRows = await db
      .select()
      .from(emergencyReminders)
      .where(eq(emergencyReminders.emergencyId, r.id));

    list.push({
      id: r.id,
      title: r.title,
      description: r.description,
      scheduleType: r.scheduleType as 'dates' | 'weekdays',
      scheduleData: JSON.parse(r.scheduleData),
      startMinutes: r.startMinutes,
      endMinutes: r.endMinutes,
      reminders: remRows.map((rem) => ({
        id: rem.id,
        emergencyId: rem.emergencyId,
        timeMinutes: rem.timeMinutes,
        prayer: rem.prayer,
      })),
      enabled: Boolean(r.enabled),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  return list;
}

export async function getEmergencyById(id: string): Promise<FullEmergency | null> {
  const rows = await db.select().from(emergencies).where(eq(emergencies.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  const remRows = await db
    .select()
    .from(emergencyReminders)
    .where(eq(emergencyReminders.emergencyId, r.id));

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    scheduleType: r.scheduleType as 'dates' | 'weekdays',
    scheduleData: JSON.parse(r.scheduleData),
    startMinutes: r.startMinutes,
    endMinutes: r.endMinutes,
    reminders: remRows.map((rem) => ({
      id: rem.id,
      emergencyId: rem.emergencyId,
      timeMinutes: rem.timeMinutes,
      prayer: rem.prayer,
    })),
    enabled: Boolean(r.enabled),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function saveEmergency(data: FullEmergency): Promise<void> {
  const now = Date.now();
  const existing = await db.select().from(emergencies).where(eq(emergencies.id, data.id)).limit(1);

  if (existing.length === 0) {
    await db.insert(emergencies).values({
      id: data.id,
      title: data.title,
      description: data.description,
      scheduleType: data.scheduleType,
      scheduleData: JSON.stringify(data.scheduleData),
      startMinutes: data.startMinutes,
      endMinutes: data.endMinutes,
      enabled: data.enabled,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(emergencies)
      .set({
        title: data.title,
        description: data.description,
        scheduleType: data.scheduleType,
        scheduleData: JSON.stringify(data.scheduleData),
        startMinutes: data.startMinutes,
        endMinutes: data.endMinutes,
        enabled: data.enabled,
        updatedAt: now,
      })
      .where(eq(emergencies.id, data.id));
  }

  // Replace reminders
  await db.delete(emergencyReminders).where(eq(emergencyReminders.emergencyId, data.id));
  const incomingReminderIds = data.reminders.map((r) => r.id);
  if (incomingReminderIds.length > 0) {
    await db.delete(emergencyReminders).where(inArray(emergencyReminders.id, incomingReminderIds));
  }

  for (const rem of data.reminders) {
    await db
      .insert(emergencyReminders)
      .values({
        id: rem.id,
        emergencyId: data.id,
        timeMinutes: rem.timeMinutes,
        prayer: rem.prayer || null,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: emergencyReminders.id,
        set: {
          emergencyId: data.id,
          timeMinutes: rem.timeMinutes,
          prayer: rem.prayer || null,
        },
      });
  }

  triggerAutoBackup();
  triggerReminderSync();
}

export async function toggleEmergencyEnabled(id: string, enabled: boolean): Promise<void> {
  await db
    .update(emergencies)
    .set({ enabled, updatedAt: Date.now() })
    .where(eq(emergencies.id, id));

  triggerAutoBackup();
  triggerReminderSync();
}

export async function deleteEmergency(id: string): Promise<void> {
  await db.delete(emergencyReminders).where(eq(emergencyReminders.emergencyId, id));
  await db.delete(emergencies).where(eq(emergencies.id, id));
  triggerAutoBackup();
  triggerReminderSync();
}

function triggerReminderSync() {
  import('@/services/notifications/reminderScheduler')
    .then((m) => m.scheduleAllDayReminders())
    .catch(() => {});
}
