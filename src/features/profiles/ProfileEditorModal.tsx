import { AppText } from '@/components/common/AppText';
import { AppTextInput } from '@/components/common/AppTextInput';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { SmartTimePicker } from '@/components/time/SmartTimePicker';
import { DayTimelineBar, TimelineSegment } from '@/components/timeline/DayTimelineBar';
import { discardDraftProfile, FullProfile, saveDraftProfile } from '@/db/repositories/profileRepo';
import { checkInternalTasksOverlap, findOverlappingTask } from '@/domain/conflicts';
import { DomainTask, DomainTodo, TimePoint } from '@/domain/types';
import { formatTimeMinutes, toArabicIndicNumerals } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { getNextAutomatedTaskColor, SLEEP_COLOR } from '@/utils/taskColors';
import { getSleepDurationText } from '@/utils/time';
import { AlertCircle, Bell, Clock, Edit3, Moon, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskEditorModal } from './TaskEditorModal';
import { TodoEditorModal } from './TodoEditorModal';

const WEEKDAYS = [
  { bit: 1, key: 'profiles.weekdays.sat' },
  { bit: 2, key: 'profiles.weekdays.sun' },
  { bit: 4, key: 'profiles.weekdays.mon' },
  { bit: 8, key: 'profiles.weekdays.tue' },
  { bit: 16, key: 'profiles.weekdays.wed' },
  { bit: 32, key: 'profiles.weekdays.thu' },
  { bit: 64, key: 'profiles.weekdays.fri' },
];

interface ProfileEditorModalProps {
  visible: boolean;
  initialProfile?: FullProfile | null;
  enabledProfiles: FullProfile[];
  categories: { id: string; nameKey: string | null; customName: string | null; color: string }[];
  onSave: (saved: FullProfile) => void;
  onCancel: () => void;
}

export function ProfileEditorModal({
  visible,
  initialProfile,
  enabledProfiles,
  categories,
  onSave,
  onCancel,
}: ProfileEditorModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, isRTL, dirRow, textAlign } = useTheme();
  const insets = useSafeAreaInsets();
  const currentLocale = i18n.language || 'en';

  const [id] = useState(() => initialProfile?.id || `profile_${Date.now()}`);
  const [title, setTitle] = useState(initialProfile?.title || '');
  const [description, setDescription] = useState(initialProfile?.description || '');
  const [daysMask, setDaysMask] = useState(initialProfile?.daysMask || 0);
  const [sleepStart, setSleepStart] = useState<TimePoint>(() => ({
    min: initialProfile?.sleepStart ?? 1380, // default 23:00
  }));
  const [sleepEnd, setSleepEnd] = useState<TimePoint>(() => ({
    min: initialProfile?.sleepEnd ?? 420, // default 07:00
  }));
  const [activeSleepPicker, setActiveSleepPicker] = useState<'start' | 'end' | null>(null);

  const [tasks, setTasks] = useState<DomainTask[]>(initialProfile?.tasks || []);
  const [todos, setTodos] = useState<DomainTodo[]>(initialProfile?.todos || []);

  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<DomainTask | null>(null);

  const [todoModalVisible, setTodoModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<DomainTodo | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'task' | 'todo';
    id: string;
    title: string;
  } | null>(null);

  // Autosave draft on change (only when creating a new profile)
  useEffect(() => {
    const isNew = !initialProfile || initialProfile.id === 'new_profile_draft';
    if (visible && isNew && title.trim()) {
      void saveDraftProfile({
        id: 'new_profile_draft',
        title: title.trim(),
        description: description.trim() || null,
        daysMask,
        enabled: false,
        sleepStart: sleepStart.min,
        sleepEnd: sleepEnd.min,
        tasks,
        todos,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }, [visible, title, description, daysMask, sleepStart, sleepEnd, tasks, todos, initialProfile]);

  const isProfileActive = Boolean(initialProfile?.enabled);

  // Calculate sleep duration in hours
  const sleepDurationText = useMemo(() => {
    return getSleepDurationText(sleepStart.min, sleepEnd.min, currentLocale, t);
  }, [sleepStart.min, sleepEnd.min, currentLocale, t]);

  // Which weekdays are claimed by other enabled profiles
  const takenDaysMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const p of enabledProfiles) {
      if (initialProfile && p.id === initialProfile.id) continue;
      for (const w of WEEKDAYS) {
        if ((p.daysMask & w.bit) !== 0) {
          map[w.bit] = p.title;
        }
      }
    }
    return map;
  }, [enabledProfiles, initialProfile]);

  // Which days in this profile conflict with other enabled profiles (only relevant if this profile is active)
  const conflictingDays = useMemo(() => {
    if (!isProfileActive) return [];
    const list: { bit: number; key: string; profileTitle: string }[] = [];
    for (const w of WEEKDAYS) {
      if ((daysMask & w.bit) !== 0 && takenDaysMap[w.bit]) {
        list.push({
          bit: w.bit,
          key: w.key,
          profileTitle: takenDaysMap[w.bit],
        });
      }
    }
    return list;
  }, [isProfileActive, daysMask, takenDaysMap]);

  const hasActiveDayConflict = conflictingDays.length > 0;

  // Convert tasks and sleeping to TimelineSegments for live DayTimelineBar
  const timelineSegments = useMemo<TimelineSegment[]>(() => {
    const list: TimelineSegment[] = [];

    // Sleeping interval shown with fixed yellow color
    list.push({
      start: sleepStart.min,
      end: sleepEnd.min,
      color: SLEEP_COLOR,
    });

    for (const t of tasks) {
      if (t.enabled) {
        list.push({
          start: t.start.min,
          end: t.end.min,
          color: t.color,
        });
      }
    }

    return list;
  }, [sleepStart.min, sleepEnd.min, tasks]);

  const toggleWeekday = (bit: number) => {
    setDaysMask((prev) => prev ^ bit);
  };

  const handleSaveTask = (savedTask: DomainTask) => {
    // Overlap validation safety check
    const otherTasks = tasks.filter((t) => t.id !== savedTask.id);
    const overlap = findOverlappingTask(
      { id: savedTask.id, start: savedTask.start.min, end: savedTask.end.min },
      otherTasks,
    );
    if (overlap) {
      Alert.alert(
        t('profiles.taskOverlapTitle', 'Task Overlap Detected'),
        t('profiles.taskOverlapError', {
          title: overlap.title,
          from: formatTimeMinutes(overlap.start, false, currentLocale),
          to: formatTimeMinutes(overlap.end, false, currentLocale),
        }),
      );
      return;
    }

    if (editingTask) {
      setTasks(tasks.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } else {
      setTasks([...tasks, savedTask]);
    }
    setTaskModalVisible(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    setItemToDelete({
      type: 'task',
      id: taskId,
      title: task?.title || '',
    });
  };

  const handleSaveTodo = (savedTodo: DomainTodo) => {
    if (editingTodo) {
      setTodos(todos.map((td) => (td.id === savedTodo.id ? savedTodo : td)));
    } else {
      setTodos([...todos, savedTodo]);
    }
    setTodoModalVisible(false);
    setEditingTodo(null);
  };

  const handleDeleteTodo = (todoId: string) => {
    const todo = todos.find((td) => td.id === todoId);
    setItemToDelete({
      type: 'todo',
      id: todoId,
      title: todo?.title || '',
    });
  };

  const handleFinalSave = async () => {
    if (!title.trim()) return;

    if (hasActiveDayConflict) {
      const details = conflictingDays.map((c) => `${t(c.key)} (${c.profileTitle})`).join(', ');
      Alert.alert(
        t('profiles.activeDayConflictTitle', 'Active Day Conflict'),
        t(
          'profiles.activeDayConflictMessage',
          'This profile is currently active, but the following days are already occupied by another active profile: {{details}}. You cannot save an active profile with conflicting days.',
          { details },
        ),
      );
      return;
    }

    // Ensure zero internal task overlaps
    const internalOverlap = checkInternalTasksOverlap(
      tasks.map((t) => ({ id: t.id, start: t.start.min, end: t.end.min, enabled: t.enabled })),
    );
    if (internalOverlap.hasOverlap) {
      Alert.alert(
        t('profiles.cannotSaveOverlapTitle', 'Overlapping Tasks'),
        t(
          'profiles.cannotSaveOverlapMessage',
          'Profiles cannot contain overlapping tasks. Please resolve overlaps before saving.',
        ),
      );
      return;
    }

    const profileId =
      initialProfile && initialProfile.id !== 'new_profile_draft'
        ? initialProfile.id
        : id && id !== 'new_profile_draft'
          ? id
          : `profile_${Date.now()}`;

    const full: FullProfile = {
      id: profileId,
      title: title.trim(),
      description: description.trim() || null,
      daysMask,
      enabled: initialProfile?.enabled ?? false,
      sleepStart: sleepStart.min,
      sleepEnd: sleepEnd.min,
      tasks: tasks.map((t) => ({ ...t, profileId })),
      todos: todos.map((td) => ({ ...td, profileId })),
      createdAt: initialProfile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await discardDraftProfile('new_profile_draft');
    if (profileId !== 'new_profile_draft') {
      await discardDraftProfile(profileId);
    }
    onSave(full);
  };

  if (!visible) return null;

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0,
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.surfaceBorder,
              paddingTop: topInset + 8,
              flexDirection: dirRow,
            },
          ]}
        >
          <Pressable onPress={onCancel} style={styles.closeBtn}>
            <X size={25} color={colors.text} />
          </Pressable>
          <AppText
            weight="bold"
            style={[styles.headerTitle, { color: colors.text, textAlign: 'center' }]}
          >
            {initialProfile ? t('profiles.editProfile') : t('profiles.create')}
          </AppText>
          <Button
            title={t('common.save')}
            size="sm"
            onPress={handleFinalSave}
            disabled={!title.trim() || hasActiveDayConflict}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          contentContainerStyle={styles.scroll}
        >
          {/* Live Day Timeline Preview */}
          <Card style={styles.timelineCard}>
            <AppText
              weight="bold"
              style={[styles.sectionHeading, { color: colors.textMuted, textAlign }]}
            >
              {t('profiles.timelinePreview')}
            </AppText>
            <DayTimelineBar segments={timelineSegments} height={32} showHourTicks />
          </Card>

          {/* Title & Description Form */}
          <Card style={styles.formCard}>
            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign }]}
            >
              {t('profiles.titleLabel')}
            </AppText>
            <AppTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('profiles.titlePlaceholder')}
            />

            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign, marginTop: 12 }]}
            >
              {t('profiles.descLabel')}
            </AppText>
            <AppTextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('profiles.descPlaceholder')}
              multiline
              numberOfLines={2}
              style={styles.textArea}
            />
          </Card>

          {/* Weekdays Selector */}
          <Card style={styles.formCard}>
            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign }]}
            >
              {t('profiles.activeDays')}
            </AppText>
            <View style={[styles.weekdaysRow, { flexDirection: dirRow }]}>
              {WEEKDAYS.map((w) => {
                const isSelected = (daysMask & w.bit) !== 0;
                const isOccupiedByOther = Boolean(takenDaysMap[w.bit]);
                const isConflict = isSelected && isOccupiedByOther && isProfileActive;
                const isTaken = !isSelected && isOccupiedByOther;

                return (
                  <Pressable
                    key={w.bit}
                    onPress={() => toggleWeekday(w.bit)}
                    style={[
                      styles.weekdayChip,
                      {
                        backgroundColor: isConflict
                          ? colors.dangerLight
                          : isSelected
                            ? colors.accentLight
                            : colors.surfaceVariant,
                        borderColor: isConflict
                          ? colors.danger
                          : isSelected
                            ? colors.accent
                            : colors.surfaceBorder,
                      },
                    ]}
                  >
                    <AppText
                      weight="bold"
                      style={[
                        styles.weekdayText,
                        {
                          color: isConflict
                            ? colors.danger
                            : isSelected
                              ? colors.accent
                              : colors.text,
                        },
                      ]}
                    >
                      {t(w.key)}
                    </AppText>
                    {isConflict ? (
                      <AppText
                        numberOfLines={1}
                        style={[styles.takenLabel, { color: colors.danger }]}
                      >
                        {takenDaysMap[w.bit]}
                      </AppText>
                    ) : isTaken ? (
                      <AppText
                        numberOfLines={1}
                        style={[styles.takenLabel, { color: colors.warning }]}
                      >
                        {takenDaysMap[w.bit]}
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {hasActiveDayConflict ? (
              <View
                style={[
                  styles.conflictBanner,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    flexDirection: dirRow,
                  },
                ]}
              >
                <AlertCircle size={20} color={colors.danger} style={{ marginTop: 2 }} />
                <View style={styles.conflictBannerText}>
                  <AppText
                    weight="bold"
                    style={[styles.conflictBannerTitle, { color: colors.danger, textAlign }]}
                  >
                    {t('profiles.activeDayConflictTitle', 'Active Day Conflict')}
                  </AppText>
                  <AppText style={[styles.conflictBannerMsg, { color: colors.text, textAlign }]}>
                    {t(
                      'profiles.activeDayConflictMessage',
                      'This profile is currently active, but the following days are already occupied by another active profile: {{details}}. You cannot save an active profile with conflicting days.',
                      {
                        details: conflictingDays
                          .map((c) => `${t(c.key)} (${c.profileTitle})`)
                          .join(', '),
                      },
                    )}
                  </AppText>
                </View>
              </View>
            ) : null}
          </Card>

          {/* Mandatory Sleeping Configuration */}
          <Card style={styles.formCard}>
            <View style={[styles.sectionHeadingRow, { flexDirection: dirRow }]}>
              {/* <View style={[styles.headingIconBox, { backgroundColor: '#FEF08A' }]}> */}
              <Moon size={30} color="#FEF08A" />
              {/* </View> */}
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <AppText
                  weight="bold"
                  style={[styles.fieldLabel, { color: colors.textMuted, fontSize: 20 }]}
                >
                  {t('profiles.sleeping')}
                </AppText>
              </View>
            </View>

            <AppText style={[styles.fieldSubLabel, { color: colors.textMuted }]}>
              {t('profiles.sleepMandatoryDesc')}
            </AppText>

            <View style={[styles.timeDurationBox, { backgroundColor: colors.accentLight }]}>
              <AppText weight="bold" style={{ fontSize: 20, color: colors.text }}>
                {sleepDurationText}
              </AppText>
            </View>

            <View style={[styles.timeRow, { flexDirection: dirRow, marginTop: 12 }]}>
              <Pressable
                onPress={() => setActiveSleepPicker('start')}
                style={[
                  styles.timeBox,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceBorder },
                ]}
              >
                <AppText
                  style={[styles.timeBoxLabel, { color: colors.textMuted, textAlign: 'center' }]}
                >
                  {t('profiles.from')}
                </AppText>
                <View style={[styles.timeValRow, { flexDirection: dirRow }]}>
                  <Clock size={20} color={colors.accent} />
                  <AppText
                    weight="bold"
                    style={[styles.timeBoxVal, { color: colors.text, marginHorizontal: 4 }]}
                  >
                    {formatTimeMinutes(sleepStart.min, false, currentLocale)}
                  </AppText>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setActiveSleepPicker('end')}
                style={[
                  styles.timeBox,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceBorder },
                ]}
              >
                <AppText
                  style={[styles.timeBoxLabel, { color: colors.textMuted, textAlign: 'center' }]}
                >
                  {t('profiles.to')}
                </AppText>
                <View style={[styles.timeValRow, { flexDirection: dirRow }]}>
                  <Clock size={20} color={colors.accent} />
                  <AppText
                    weight="bold"
                    style={[styles.timeBoxVal, { color: colors.text, marginHorizontal: 4 }]}
                  >
                    {formatTimeMinutes(sleepEnd.min, false, currentLocale)}
                  </AppText>
                </View>
              </Pressable>
            </View>
          </Card>

          {/* Tasks Section */}
          <View style={[styles.sectionHeaderRow, { flexDirection: dirRow }]}>
            <AppText weight="bold" style={[styles.sectionTitle, { color: colors.text }]}>
              {t('profiles.tasks')} ({isRTL ? toArabicIndicNumerals(tasks.length) : tasks.length})
            </AppText>
            <Button
              title={t('profiles.addTask')}
              size="sm"
              variant="outline"
              onPress={() => {
                setEditingTask(null);
                setTaskModalVisible(true);
              }}
              icon={<Plus size={14} color={colors.accent} />}
            />
          </View>

          {tasks.length === 0 ? (
            <Card style={styles.emptyCard}>
              <AppText style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center' }]}>
                {t('profiles.noTasksYet')}
              </AppText>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} style={styles.itemCard}>
                <View style={[styles.itemRow, { flexDirection: dirRow }]}>
                  <View style={[styles.colorStrip, { backgroundColor: task.color }]} />
                  <View
                    style={[styles.itemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
                  >
                    <AppText
                      weight="bold"
                      style={[styles.itemTitle, { color: colors.text, textAlign }]}
                    >
                      {task.title}
                    </AppText>
                    <View style={[styles.itemMetaRow, { flexDirection: dirRow }]}>
                      <Clock size={12} color={colors.textMuted} />
                      <AppText
                        style={[
                          styles.itemMetaText,
                          { color: colors.textMuted, marginHorizontal: 4 },
                        ]}
                      >
                        {formatTimeMinutes(task.start.min, false, currentLocale)} -{' '}
                        {formatTimeMinutes(task.end.min, false, currentLocale)}
                      </AppText>
                      {task.flags.important ? (
                        <Badge
                          label={t('profiles.important')}
                          variant="danger"
                          style={{ marginHorizontal: 4 }}
                        />
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.itemActions, { flexDirection: dirRow }]}>
                    <Pressable
                      onPress={() => {
                        setEditingTask(task);
                        setTaskModalVisible(true);
                      }}
                      style={styles.actionIcon}
                    >
                      <Edit3 size={20} color={colors.accent} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteTask(task.id)} style={styles.actionIcon}>
                      <Trash2 size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}

          {/* Todos Section */}
          <View style={[styles.sectionHeaderRow, { marginTop: 24, flexDirection: dirRow }]}>
            <AppText weight="bold" style={[styles.sectionTitle, { color: colors.text }]}>
              {t('profiles.todos')} ({isRTL ? toArabicIndicNumerals(todos.length) : todos.length})
            </AppText>
            <Button
              title={t('profiles.addTodo')}
              size="sm"
              variant="outline"
              onPress={() => {
                setEditingTodo(null);
                setTodoModalVisible(true);
              }}
              icon={<Plus size={14} color={colors.accent} />}
            />
          </View>

          {todos.length === 0 ? (
            <Card style={styles.emptyCard}>
              <AppText style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center' }]}>
                {t('profiles.noTodosYet')}
              </AppText>
            </Card>
          ) : (
            todos.map((todo) => (
              <Card key={todo.id} style={styles.itemCard}>
                <View style={[styles.itemRow, { flexDirection: dirRow }]}>
                  <View
                    style={[styles.itemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
                  >
                    <AppText
                      weight="bold"
                      style={[styles.itemTitle, { color: colors.text, textAlign }]}
                    >
                      {todo.title}
                    </AppText>
                    <View style={[styles.itemMetaRow, { flexDirection: dirRow }]}>
                      <Bell size={12} color={colors.accent} />
                      <AppText
                        style={[
                          styles.itemMetaText,
                          { color: colors.textMuted, marginHorizontal: 4 },
                        ]}
                      >
                        {isRTL
                          ? toArabicIndicNumerals(todo.reminders.length)
                          : todo.reminders.length}{' '}
                        {t('settings.notifications')}
                      </AppText>
                      {todo.flags.important ? (
                        <Badge
                          label={t('profiles.important')}
                          variant="danger"
                          style={{ marginHorizontal: 4 }}
                        />
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.itemActions, { flexDirection: dirRow }]}>
                    <Pressable
                      onPress={() => {
                        setEditingTodo(todo);
                        setTodoModalVisible(true);
                      }}
                      style={styles.actionIcon}
                    >
                      <Edit3 size={20} color={colors.accent} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteTodo(todo.id)} style={styles.actionIcon}>
                      <Trash2 size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </View>

      {/* Task Editor Modal */}
      {taskModalVisible && (
        <TaskEditorModal
          key={editingTask ? editingTask.id : 'new'}
          visible={taskModalVisible}
          initialTask={editingTask}
          existingTasks={tasks.filter((t) => t.id !== editingTask?.id)}
          suggestedColor={getNextAutomatedTaskColor(tasks)}
          categories={categories}
          onSave={handleSaveTask}
          onCancel={() => {
            setTaskModalVisible(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Todo Editor Modal */}
      {todoModalVisible && (
        <TodoEditorModal
          key={editingTodo ? editingTodo.id : 'new'}
          visible={todoModalVisible}
          initialTodo={editingTodo}
          categories={categories}
          onSave={handleSaveTodo}
          onCancel={() => {
            setTodoModalVisible(false);
            setEditingTodo(null);
          }}
        />
      )}

      {/* Sleep Time Picker Modal */}
      <SmartTimePicker
        visible={activeSleepPicker !== null}
        initialTime={activeSleepPicker === 'start' ? sleepStart : sleepEnd}
        onConfirm={(tp) => {
          if (activeSleepPicker === 'start') setSleepStart(tp);
          if (activeSleepPicker === 'end') setSleepEnd(tp);
          setActiveSleepPicker(null);
        }}
        onCancel={() => setActiveSleepPicker(null)}
        title={
          activeSleepPicker === 'start'
            ? `${t('profiles.sleeping')} - ${t('profiles.from')}`
            : `${t('profiles.sleeping')} - ${t('profiles.to')}`
        }
      />

      {/* Delete Task/Todo Confirmation Modal */}
      <ConfirmModal
        visible={!!itemToDelete}
        title={
          itemToDelete?.type === 'task'
            ? t('profiles.deleteTaskTitle', 'Delete Task')
            : t('profiles.deleteTodoTitle', 'Delete To-do')
        }
        message={
          itemToDelete?.type === 'task'
            ? t('profiles.deleteTaskConfirm', 'Are you sure you want to delete "{{title}}"?', {
                title: itemToDelete?.title || '',
              })
            : t('profiles.deleteTodoConfirm', 'Are you sure you want to delete "{{title}}"?', {
                title: itemToDelete?.title || '',
              })
        }
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        onConfirm={() => {
          if (itemToDelete) {
            if (itemToDelete.type === 'task') {
              setTasks((prev) => prev.filter((t) => t.id !== itemToDelete.id));
            } else {
              setTodos((prev) => prev.filter((td) => td.id !== itemToDelete.id));
            }
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  timelineCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeading: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  formCard: {
    marginBottom: 16,
  },
  fieldLabel: {
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  textArea: {
    minHeight: 60,
  },
  weekdaysRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  weekdayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 44,
  },
  weekdayText: {
    fontSize: 13,
  },
  takenLabel: {
    fontSize: 9,
    marginTop: 2,
    maxWidth: 55,
  },
  sectionHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  itemCard: {
    padding: 12,
    marginBottom: 8,
  },
  itemRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorStrip: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
  },
  itemMetaRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  itemMetaText: {
    fontSize: 12,
  },
  itemActions: {
    gap: 12,
    paddingHorizontal: 4,
    justifyContent: 'flex-end',
  },
  actionIcon: {
    padding: 4,
  },
  conflictBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    alignItems: 'flex-start',
  },
  conflictBannerText: {
    flex: 1,
  },
  conflictBannerTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  conflictBannerMsg: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeadingRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  headingIconBox: {
    width: 45,
    height: 45,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  timeRow: {
    gap: 12,
  },
  timeBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timeValRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxVal: {
    fontSize: 15,
  },
  timeDurationBox: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBlock: 15,
    borderRadius: 10,
  },
});
