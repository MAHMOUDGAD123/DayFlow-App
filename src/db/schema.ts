import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  nameKey: text('name_key'), // translation key for default categories, null for custom
  customName: text('custom_name'), // user-entered name for custom categories
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  daysMask: integer('days_mask').notNull().default(0), // Bitmask: Sat=1, Sun=2, Mon=4, Tue=8, Wed=16, Thu=32, Fri=64
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  sleepStartMinutes: integer('sleep_start_minutes').notNull().default(1380), // default 23:00 (1380 mins)
  sleepEndMinutes: integer('sleep_end_minutes').notNull().default(420), // default 07:00 (420 mins)
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startMinutes: integer('start_minutes').notNull(), // 0..1439
  endMinutes: integer('end_minutes').notNull(), // 0..1439 (if endMinutes < startMinutes => crosses midnight)
  startPrayer: text('start_prayer'), // optional display reference
  endPrayer: text('end_prayer'), // optional display reference
  categoryId: text('category_id').notNull().references(() => categories.id),
  color: text('color').notNull(),
  isImportant: integer('is_important', { mode: 'boolean' }).notNull().default(false),
  isFocus: integer('is_focus', { mode: 'boolean' }).notNull().default(false),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  categoryId: text('category_id').notNull().references(() => categories.id),
  isImportant: integer('is_important', { mode: 'boolean' }).notNull().default(false),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const todoReminders = sqliteTable('todo_reminders', {
  id: text('id').primaryKey(),
  todoId: text('todo_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
  timeMinutes: integer('time_minutes').notNull(), // 0..1439
  prayer: text('prayer'), // optional display label
  createdAt: integer('created_at').notNull(),
});

export const emergencies = sqliteTable('emergencies', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  scheduleType: text('schedule_type').notNull().default('dates'), // 'dates' | 'weekdays'
  scheduleData: text('schedule_data').notNull(), // JSON array of dates or days mask
  startMinutes: integer('start_minutes'), // null means all day (0..1439)
  endMinutes: integer('end_minutes'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const emergencyReminders = sqliteTable('emergency_reminders', {
  id: text('id').primaryKey(),
  emergencyId: text('emergency_id').notNull().references(() => emergencies.id, { onDelete: 'cascade' }),
  timeMinutes: integer('time_minutes').notNull(),
  prayer: text('prayer'),
  createdAt: integer('created_at').notNull(),
});

export const dayItemStates = sqliteTable('day_item_states', {
  id: text('id').primaryKey(), // `${date}_${itemId}`
  date: text('date').notNull(),
  itemId: text('itemId').notNull(),
  itemType: text('item_type').notNull(), // 'task' | 'todo'
  status: text('status').notNull().default('pending'), // 'pending' | 'done' | 'skipped'
  updatedAt: integer('updated_at').notNull(),
});

export const daySubtasks = sqliteTable('day_subtasks', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  taskId: text('task_id').notNull(),
  title: text('title').notNull(),
  isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const adhocItems = sqliteTable('adhoc_items', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  itemType: text('item_type').notNull(), // 'task' | 'todo'
  payloadJson: text('payload_json').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const drafts = sqliteTable('drafts', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(), // 'profile' | 'emergency'
  targetId: text('target_id'), // null for new, id for editing existing
  payloadJson: text('payload_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const backupMeta = sqliteTable('backup_meta', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
