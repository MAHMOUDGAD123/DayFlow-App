import {
  serializeBackup,
  deserializeAndValidateBackup,
  mergeBackupData,
} from '@/services/backup/serializer';
import { BackupData } from '@/services/backup/types';

describe('Backup Serializer & Merger', () => {
  const sampleData: BackupData = {
    categories: [
      {
        id: 'cat_work',
        nameKey: 'categories.work',
        customName: null,
        color: '#3B82F6',
        icon: 'briefcase',
        isSystem: true,
        createdAt: 1000,
      },
    ],
    profiles: [
      {
        id: 'prof_1',
        title: 'Workday Routine',
        description: 'Daily flow for week days',
        daysMask: 31,
        enabled: true,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ],
    tasks: [
      {
        id: 'task_1',
        profileId: 'prof_1',
        title: 'Deep Work',
        description: 'Coding projects',
        startMinutes: 540,
        endMinutes: 720,
        startPrayer: null,
        endPrayer: null,
        categoryId: 'cat_work',
        color: '#3B82F6',
        isImportant: true,
        isFocus: false,
        enabled: true,
        sortOrder: 0,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ],
    todos: [
      {
        id: 'todo_1',
        profileId: 'prof_1',
        title: 'Submit daily review',
        description: null,
        categoryId: 'cat_work',
        isImportant: false,
        enabled: true,
        sortOrder: 0,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ],
    todoReminders: [
      {
        id: 'rem_1',
        todoId: 'todo_1',
        timeMinutes: 1020,
        prayer: 'Asr',
        createdAt: 1000,
      },
    ],
    emergencies: [],
    emergencyReminders: [],
    dayItemStates: [],
    daySubtasks: [],
    adhocItems: [],
    settings: [
      {
        key: 'theme_mode',
        valueJson: JSON.stringify('dark'),
        updatedAt: 2000,
      },
    ],
  };

  it('serializes backup data and verifies valid checksum', async () => {
    const jsonStr = await serializeBackup(sampleData, '1.0.0');
    expect(typeof jsonStr).toBe('string');

    const result = await deserializeAndValidateBackup(jsonStr);
    expect(result.valid).toBe(true);
    expect(result.backup).toBeDefined();
    expect(result.backup?.version).toBe(1);
    expect(result.backup?.appVersion).toBe('1.0.0');
    expect(result.backup?.data.profiles).toHaveLength(1);
    expect(result.backup?.data.profiles[0].id).toBe('prof_1');
  });

  it('detects tampering and rejects invalid checksum', async () => {
    const jsonStr = await serializeBackup(sampleData, '1.0.0');
    const parsed = JSON.parse(jsonStr);

    // Tamper with data without updating checksum
    parsed.data.profiles[0].title = 'Hacked Routine Title';
    const tamperedJson = JSON.stringify(parsed);

    const result = await deserializeAndValidateBackup(tamperedJson);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/integrity check failed/i);
  });

  it('rejects unsupported future version', async () => {
    const jsonStr = await serializeBackup(sampleData, '1.0.0');
    const parsed = JSON.parse(jsonStr);
    parsed.version = 999;
    const futureJson = JSON.stringify(parsed);

    const result = await deserializeAndValidateBackup(futureJson);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/newer than supported/i);
  });

  it('merges incoming data where newer updatedAt wins', () => {
    const localData: BackupData = {
      ...sampleData,
      profiles: [
        {
          id: 'prof_1',
          title: 'Local Version Title',
          description: 'Local description',
          daysMask: 31,
          enabled: true,
          createdAt: 1000,
          updatedAt: 3000, // Newer than incoming
        },
        {
          id: 'prof_2',
          title: 'Only in Local',
          description: null,
          daysMask: 64,
          enabled: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      settings: [
        {
          key: 'theme_mode',
          valueJson: JSON.stringify('dark'),
          updatedAt: 1000, // Older than incoming
        },
      ],
    };

    const incomingData: BackupData = {
      ...sampleData,
      profiles: [
        {
          id: 'prof_1',
          title: 'Incoming Version Title',
          description: 'Incoming description',
          daysMask: 1,
          enabled: false,
          createdAt: 1000,
          updatedAt: 2000, // Older than local
        },
        {
          id: 'prof_3',
          title: 'New Incoming Profile',
          description: null,
          daysMask: 2,
          enabled: true,
          createdAt: 2000,
          updatedAt: 2000,
        },
      ],
      settings: [
        {
          key: 'theme_mode',
          valueJson: JSON.stringify('light'),
          updatedAt: 5000, // Newer than local
        },
      ],
    };

    const merged = mergeBackupData(localData, incomingData);

    // prof_1 should keep local version because local updatedAt (3000) > incoming (2000)
    const prof1 = merged.profiles.find((p) => p.id === 'prof_1');
    expect(prof1?.title).toBe('Local Version Title');
    expect(prof1?.updatedAt).toBe(3000);

    // prof_2 should be kept (from local)
    expect(merged.profiles.find((p) => p.id === 'prof_2')).toBeDefined();

    // prof_3 should be added (from incoming)
    expect(merged.profiles.find((p) => p.id === 'prof_3')).toBeDefined();

    // theme_mode setting should take incoming because incoming updatedAt (5000) > local (1000)
    const themeSetting = merged.settings.find((s) => s.key === 'theme_mode');
    expect(themeSetting?.valueJson).toBe(JSON.stringify('light'));
  });
});
