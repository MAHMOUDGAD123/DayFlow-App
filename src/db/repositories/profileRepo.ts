import { db } from '../client';
import { profiles, tasks, todos, todoReminders, drafts, categories } from '../schema';
import { eq, asc, desc, inArray } from 'drizzle-orm';
import { DomainTask, DomainTodo } from '@/domain/types';
import { checkProfileDaysConflict } from '@/domain/conflicts';
import { triggerAutoBackup } from '@/services/backup/autoBackup';

export interface FullProfile {
  id: string;
  title: string;
  description: string | null;
  daysMask: number;
  enabled: boolean;
  sleepStart: number; // default 1380 (23:00)
  sleepEnd: number; // default 420 (07:00)
  tasks: DomainTask[];
  todos: DomainTodo[];
  createdAt: number;
  updatedAt: number;
}

export async function getAllProfiles(): Promise<FullProfile[]> {
  const profileRows = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
  const fullProfiles: FullProfile[] = [];

  for (const p of profileRows) {
    const taskRows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.profileId, p.id))
      .orderBy(asc(tasks.sortOrder), asc(tasks.startMinutes));

    const todoRows = await db
      .select()
      .from(todos)
      .where(eq(todos.profileId, p.id))
      .orderBy(asc(todos.sortOrder), asc(todos.createdAt));

    const domainTasks: DomainTask[] = taskRows.map((t) => ({
      id: t.id,
      profileId: t.profileId,
      title: t.title,
      description: t.description,
      start: { min: t.startMinutes, label: (t.startPrayer as any) || undefined },
      end: { min: t.endMinutes, label: (t.endPrayer as any) || undefined },
      categoryId: t.categoryId,
      color: t.color,
      flags: {
        important: Boolean(t.isImportant),
      },
      enabled: Boolean(t.enabled),
      sortOrder: t.sortOrder,
    }));

    const domainTodos: DomainTodo[] = [];
    for (const td of todoRows) {
      const remRows = await db
        .select()
        .from(todoReminders)
        .where(eq(todoReminders.todoId, td.id));

      domainTodos.push({
        id: td.id,
        profileId: td.profileId,
        title: td.title,
        description: td.description,
        categoryId: td.categoryId,
        flags: {
          important: Boolean(td.isImportant),
        },
        enabled: Boolean(td.enabled),
        sortOrder: td.sortOrder,
        reminders: remRows.map((r) => ({
          id: r.id,
          timeMinutes: r.timeMinutes,
          prayer: (r.prayer as any) || null,
        })),
      });
    }

    fullProfiles.push({
      id: p.id,
      title: p.title,
      description: p.description,
      daysMask: p.daysMask,
      enabled: Boolean(p.enabled),
      sleepStart: p.sleepStartMinutes ?? 1380,
      sleepEnd: p.sleepEndMinutes ?? 420,
      tasks: domainTasks,
      todos: domainTodos,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });
  }

  return fullProfiles;
}

export async function getProfileById(id: string): Promise<FullProfile | null> {
  const profileRow = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (profileRow.length === 0) return null;

  const p = profileRow[0];
  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.profileId, p.id))
    .orderBy(asc(tasks.sortOrder), asc(tasks.startMinutes));

  const todoRows = await db
    .select()
    .from(todos)
    .where(eq(todos.profileId, p.id))
    .orderBy(asc(todos.sortOrder), asc(todos.createdAt));

  const domainTasks: DomainTask[] = taskRows.map((t) => ({
    id: t.id,
    profileId: t.profileId,
    title: t.title,
    description: t.description,
    start: { min: t.startMinutes, label: (t.startPrayer as any) || undefined },
    end: { min: t.endMinutes, label: (t.endPrayer as any) || undefined },
    categoryId: t.categoryId,
    color: t.color,
    flags: {
      important: Boolean(t.isImportant),
    },
    enabled: Boolean(t.enabled),
    sortOrder: t.sortOrder,
  }));

  const domainTodos: DomainTodo[] = [];
  for (const td of todoRows) {
    const remRows = await db
      .select()
      .from(todoReminders)
      .where(eq(todoReminders.todoId, td.id));

    domainTodos.push({
      id: td.id,
      profileId: td.profileId,
      title: td.title,
      description: td.description,
      categoryId: td.categoryId,
      flags: {
        important: Boolean(td.isImportant),
      },
      enabled: Boolean(td.enabled),
      sortOrder: td.sortOrder,
      reminders: remRows.map((r) => ({
        id: r.id,
        timeMinutes: r.timeMinutes,
        prayer: (r.prayer as any) || null,
      })),
    });
  }

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    daysMask: p.daysMask,
    enabled: Boolean(p.enabled),
    sleepStart: p.sleepStartMinutes ?? 1380,
    sleepEnd: p.sleepEndMinutes ?? 420,
    tasks: domainTasks,
    todos: domainTodos,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function saveProfile(
  profileData: Omit<FullProfile, 'createdAt' | 'updatedAt'>,
): Promise<void> {
  if (profileData.enabled) {
    const all = await getAllProfiles();
    const enabledOthers = all.filter((p) => p.enabled && p.id !== profileData.id);
    const conflict = checkProfileDaysConflict(
      { id: profileData.id, daysMask: profileData.daysMask },
      enabledOthers.map((p) => ({ id: p.id, daysMask: p.daysMask })),
    );
    if (conflict.hasConflict) {
      throw new Error('Cannot save active profile with days occupied by another active profile');
    }
  }

  const now = Date.now();
  const existing = await db.select().from(profiles).where(eq(profiles.id, profileData.id)).limit(1);

  if (existing.length === 0) {
    await db.insert(profiles).values({
      id: profileData.id,
      title: profileData.title,
      description: profileData.description,
      daysMask: profileData.daysMask,
      enabled: profileData.enabled,
      sleepStartMinutes: profileData.sleepStart ?? 1380,
      sleepEndMinutes: profileData.sleepEnd ?? 420,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(profiles)
      .set({
        title: profileData.title,
        description: profileData.description,
        daysMask: profileData.daysMask,
        enabled: profileData.enabled,
        sleepStartMinutes: profileData.sleepStart ?? 1380,
        sleepEndMinutes: profileData.sleepEnd ?? 420,
        updatedAt: now,
      })
      .where(eq(profiles.id, profileData.id));
  }

  // Replace tasks
  await db.delete(tasks).where(eq(tasks.profileId, profileData.id));
  for (let i = 0; i < profileData.tasks.length; i++) {
    const t = profileData.tasks[i];
    await db
      .insert(tasks)
      .values({
        id: t.id,
        profileId: profileData.id,
        title: t.title,
        description: t.description || null,
        startMinutes: t.start.min,
        endMinutes: t.end.min,
        startPrayer: t.start.label || null,
        endPrayer: t.end.label || null,
        categoryId: t.categoryId,
        color: t.color,
        isImportant: t.flags.important,
        isFocus: false,
        enabled: t.enabled,
        sortOrder: i,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          profileId: profileData.id,
          title: t.title,
          description: t.description || null,
          startMinutes: t.start.min,
          endMinutes: t.end.min,
          startPrayer: t.start.label || null,
          endPrayer: t.end.label || null,
          categoryId: t.categoryId,
          color: t.color,
          isImportant: t.flags.important,
          isFocus: false,
          enabled: t.enabled,
          sortOrder: i,
          updatedAt: now,
        },
      });
  }

  // Replace todos and their reminders
  // 1. Delete all existing reminders for any todos currently belonging to this profile
  const existingTodos = await db
    .select({ id: todos.id })
    .from(todos)
    .where(eq(todos.profileId, profileData.id));
  const existingTodoIds = existingTodos.map((td) => td.id);
  if (existingTodoIds.length > 0) {
    await db.delete(todoReminders).where(inArray(todoReminders.todoId, existingTodoIds));
  }

  // 2. Also delete any reminders by id if any of the incoming reminders exist (cleans orphans)
  const incomingReminderIds = profileData.todos.flatMap((td) => td.reminders.map((r) => r.id));
  if (incomingReminderIds.length > 0) {
    await db.delete(todoReminders).where(inArray(todoReminders.id, incomingReminderIds));
  }

  // 3. Delete existing todos for this profile
  await db.delete(todos).where(eq(todos.profileId, profileData.id));

  // 4. Insert todos and their reminders with onConflict handling
  for (let i = 0; i < profileData.todos.length; i++) {
    const td = profileData.todos[i];
    await db
      .insert(todos)
      .values({
        id: td.id,
        profileId: profileData.id,
        title: td.title,
        description: td.description || null,
        categoryId: td.categoryId,
        isImportant: td.flags.important,
        enabled: td.enabled,
        sortOrder: i,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: todos.id,
        set: {
          profileId: profileData.id,
          title: td.title,
          description: td.description || null,
          categoryId: td.categoryId,
          isImportant: td.flags.important,
          enabled: td.enabled,
          sortOrder: i,
          updatedAt: now,
        },
      });

    for (const rem of td.reminders) {
      await db
        .insert(todoReminders)
        .values({
          id: rem.id,
          todoId: td.id,
          timeMinutes: rem.timeMinutes,
          prayer: rem.prayer || null,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: todoReminders.id,
          set: {
            todoId: td.id,
            timeMinutes: rem.timeMinutes,
            prayer: rem.prayer || null,
          },
        });
    }
  }

  triggerAutoBackup();
  triggerReminderSync();
}

export async function toggleProfileEnabled(
  profileId: string,
  enable: boolean,
): Promise<{ success: boolean; conflictingProfiles?: FullProfile[] }> {
  if (!enable) {
    await db.update(profiles).set({ enabled: false, updatedAt: Date.now() }).where(eq(profiles.id, profileId));
    triggerAutoBackup();
    triggerReminderSync();
    return { success: true };
  }

  const target = await getProfileById(profileId);
  if (!target) return { success: false };

  const all = await getAllProfiles();
  const enabledOthers = all.filter((p) => p.enabled && p.id !== profileId);

  const conflict = checkProfileDaysConflict(
    { id: target.id, daysMask: target.daysMask },
    enabledOthers.map((p) => ({ id: p.id, daysMask: p.daysMask })),
  );

  if (conflict.hasConflict) {
    const conflicting = all.filter((p) => conflict.conflictingProfileIds.includes(p.id));
    return {
      success: false,
      conflictingProfiles: conflicting,
    };
  }

  await db.update(profiles).set({ enabled: true, updatedAt: Date.now() }).where(eq(profiles.id, profileId));
  triggerAutoBackup();
  triggerReminderSync();
  return { success: true };
}

export async function duplicateProfile(id: string, newTitleSuffix = ' (Copy)'): Promise<string | null> {
  const original = await getProfileById(id);
  if (!original) return null;

  const newId = `profile_${Date.now()}`;
  const now = Date.now();

  const clonedTasks = original.tasks.map((t, idx) => ({
    ...t,
    id: `task_${now}_${idx}`,
    profileId: newId,
  }));

  const clonedTodos = original.todos.map((td, idx) => ({
    ...td,
    id: `todo_${now}_${idx}`,
    profileId: newId,
    reminders: td.reminders.map((r, rIdx) => ({
      ...r,
      id: `rem_${now}_${idx}_${rIdx}`,
    })),
  }));

  await saveProfile({
    id: newId,
    title: `${original.title}${newTitleSuffix}`,
    description: original.description,
    daysMask: 0, // Cloned profile starts with inactive days to prevent immediate conflict
    enabled: false,
    sleepStart: original.sleepStart ?? 1380,
    sleepEnd: original.sleepEnd ?? 420,
    tasks: clonedTasks,
    todos: clonedTodos,
  });

  return newId;
}

export async function deleteProfile(id: string): Promise<void> {
  const existingTodos = await db.select({ id: todos.id }).from(todos).where(eq(todos.profileId, id));
  const existingTodoIds = existingTodos.map((td) => td.id);
  if (existingTodoIds.length > 0) {
    await db.delete(todoReminders).where(inArray(todoReminders.todoId, existingTodoIds));
  }
  await db.delete(todos).where(eq(todos.profileId, id));
  await db.delete(tasks).where(eq(tasks.profileId, id));
  await db.delete(profiles).where(eq(profiles.id, id));
  triggerAutoBackup();
  triggerReminderSync();
}

export async function getDraftProfile(id?: string | null): Promise<FullProfile | null> {
  const draftId = id || 'new_profile_draft';
  const row = await db.select().from(drafts).where(eq(drafts.id, draftId)).limit(1);
  if (row.length === 0) return null;
  try {
    return JSON.parse(row[0].payloadJson) as FullProfile;
  } catch {
    return null;
  }
}

export async function saveDraftProfile(draftProfile: FullProfile): Promise<void> {
  const draftId = draftProfile.id || 'new_profile_draft';
  await db
    .insert(drafts)
    .values({
      id: draftId,
      kind: 'profile',
      targetId: draftProfile.id || null,
      payloadJson: JSON.stringify(draftProfile),
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: drafts.id,
      set: {
        payloadJson: JSON.stringify(draftProfile),
        updatedAt: Date.now(),
      },
    });
}

export async function discardDraftProfile(id?: string | null): Promise<void> {
  const draftId = id || 'new_profile_draft';
  await db.delete(drafts).where(eq(drafts.id, draftId));
}

export async function getCategories() {
  return db.select().from(categories);
}

function triggerReminderSync() {
  import('@/services/notifications/reminderScheduler')
    .then((m) => m.scheduleAllDayReminders())
    .catch(() => {});
}
