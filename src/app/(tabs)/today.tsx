import { AppText } from '@/components/common/AppText';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { DayTimelineBar, TimelineSegment } from '@/components/timeline/DayTimelineBar';
import {
  addAdhocItem,
  addSubtask,
  DayScreenData,
  deleteAdhocItem,
  deleteSubtask,
  getDayData,
  setItemStatus,
  toggleSubtask,
  updateAdhocItem,
} from '@/db/repositories/dayRepo';
import { getCategories } from '@/db/repositories/profileRepo';
import { DomainTodo, ItemStatus, Minute, ResolvedTaskSegment, ResolvedTodo } from '@/domain/types';
import { AdhocItemModal } from '@/features/today/AdhocItemModal';
import { SubtasksList } from '@/features/today/SubtasksList';
import { TaskDetailModal } from '@/features/today/TaskDetailModal';
import { TodoDetailModal } from '@/features/today/TodoDetailModal';
import { formatNumber, formatTimeMinutes, toArabicIndicNumerals } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { SLEEP_COLOR } from '@/utils/taskColors';
import { getFreeHoursInfo, getSleepDurationText } from '@/utils/time';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Coffee,
  ListTodo,
  Moon,
  Play,
  Plus,
  Sparkles,
  Square,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

type AgendaItem =
  | { type: 'task'; taskSegment: ResolvedTaskSegment; startMin: number; endMin: number }
  | { type: 'free'; slot: [Minute, Minute]; startMin: number; endMin: number };

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isRTL, dirRow, textAlign } = useTheme();
  const router = useRouter();
  const currentLocale = i18n.language || 'en';

  const [screenData, setScreenData] = useState<DayScreenData | null>(null);
  const [categoriesList, setCategoriesList] = useState<
    { id: string; nameKey: string | null; customName: string | null; color: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Live now-pointer minute
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Modals state
  const [selectedTaskSegment, setSelectedTaskSegment] = useState<ResolvedTaskSegment | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<ResolvedTodo | null>(null);
  const [editingAdhocTodo, setEditingAdhocTodo] = useState<DomainTodo | null>(null);
  const [adhocModalVisible, setAdhocModalVisible] = useState(false);
  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<string, boolean>>({});
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [isTasksFolded, setIsTasksFolded] = useState(true);
  const [isTodosFolded, setIsTodosFolded] = useState(true);
  const [subtaskToDelete, setSubtaskToDelete] = useState<{ id: string; title: string } | null>(
    null,
  );

  // 1. Clock timer updating nowMinutes every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Load today's data & categories
  const loadData = useCallback(async () => {
    try {
      const [data, cats] = await Promise.all([getDayData(new Date()), getCategories()]);
      setScreenData(data);
      setCategoriesList(cats);
    } catch (err) {
      console.warn('Failed to load today data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Status handlers
  const handleTaskStatusChange = async (
    taskSegment: ResolvedTaskSegment,
    newStatus: ItemStatus,
  ) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    await setItemStatus(todayStr, taskSegment.task.id, 'task', newStatus);
    if (selectedTaskSegment) {
      setSelectedTaskSegment({
        ...selectedTaskSegment,
        status: newStatus,
      });
    }
    await loadData();
  };

  const handleToggleTodo = async (todoItem: ResolvedTodo) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextStatus: ItemStatus = todoItem.status === 'done' ? 'pending' : 'done';
    await setItemStatus(todayStr, todoItem.todo.id, 'todo', nextStatus);
    if (selectedTodo) {
      setSelectedTodo({
        ...selectedTodo,
        status: nextStatus,
      });
    }
    await loadData();
  };

  // Subtask handlers
  const handleAddSubtask = async (taskId: string, title: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    await addSubtask(todayStr, taskId, title);
    await loadData();
  };

  const handleToggleSubtask = async (subtaskId: string, isDone: boolean) => {
    await toggleSubtask(subtaskId, isDone);
    await loadData();
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const sub = screenData?.subtasks.find((s) => s.id === subtaskId);
    setSubtaskToDelete({ id: subtaskId, title: sub?.title || '' });
  };

  // Adhoc Todo handler
  const handleSaveAdhocTodo = async (todoPayload: DomainTodo) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (editingAdhocTodo) {
      await updateAdhocItem(todoPayload.id, todoPayload);
    } else {
      await addAdhocItem(todayStr, 'todo', todoPayload);
    }
    setEditingAdhocTodo(null);
    await loadData();
  };

  // Navigate to Profiles page to edit
  const handleEditInProfile = (_profileId: string, _itemId: string) => {
    setSelectedTaskSegment(null);
    setSelectedTodo(null);
    router.push('/(tabs)/profiles');
  };

  // 3. Prepare timeline segments
  const timelineSegments: TimelineSegment[] = useMemo(() => {
    if (!screenData) return [];
    const segs: TimelineSegment[] = [];

    // Sleeping schedule shown in fixed yellow
    if (
      screenData.activeProfile?.sleepStart != null &&
      screenData.activeProfile?.sleepEnd != null
    ) {
      segs.push({
        start: screenData.activeProfile.sleepStart,
        end: screenData.activeProfile.sleepEnd,
        color: SLEEP_COLOR,
      });
    }

    for (const t of screenData.dayPlan.tasks) {
      segs.push({
        start: t.segment[0],
        end: t.segment[1],
        color: t.isSuspended ? '#EF4444' : t.task.color,
        isEmergency: t.isSuspended,
      });
    }

    return segs;
  }, [screenData]);

  // Total free hours & minutes info
  const freeHoursInfo = useMemo(() => {
    return getFreeHoursInfo(screenData?.dayPlan.freeSlots, currentLocale, t);
  }, [screenData, currentLocale, t]);

  const sleepDurationText = useMemo(() => {
    return getSleepDurationText(
      screenData?.activeProfile?.sleepStart,
      screenData?.activeProfile?.sleepEnd,
      currentLocale,
      t,
    );
  }, [screenData, currentLocale, t]);

  // Current active activity (sleeping / task / free)
  const currentActivity = useMemo(() => {
    if (!screenData) return null;
    const { activeProfile, dayPlan } = screenData;

    // 1. Check if currently in Sleep window
    if (activeProfile?.sleepStart != null && activeProfile?.sleepEnd != null) {
      const sStart = activeProfile.sleepStart;
      const sEnd = activeProfile.sleepEnd;
      let isSleeping = false;
      if (sStart < sEnd) {
        isSleeping = nowMinutes >= sStart && nowMinutes < sEnd;
      } else {
        isSleeping = nowMinutes >= sStart || nowMinutes < sEnd;
      }
      if (isSleeping) {
        let remaining = 0;
        if (nowMinutes >= sStart) {
          remaining = 1440 - nowMinutes + sEnd;
        } else {
          remaining = sEnd - nowMinutes;
        }
        return {
          type: 'sleep' as const,
          title: t('profiles.sleeping'),
          startMin: sStart,
          endMin: sEnd,
          remainingMinutes: remaining,
        };
      }
    }

    // 2. Check if currently in an active task
    const runningTask = dayPlan.tasks.find(
      (t) => !t.isSuspended && t.segment[0] <= nowMinutes && nowMinutes < t.segment[1],
    );
    if (runningTask) {
      const remaining = runningTask.segment[1] - nowMinutes;
      return {
        type: 'task' as const,
        taskSegment: runningTask,
        remainingMinutes: remaining,
      };
    }

    // 3. Free time
    const nextTask = dayPlan.tasks
      .filter((t) => !t.isSuspended && t.segment[0] > nowMinutes)
      .sort((a, b) => a.segment[0] - b.segment[0])[0];

    return {
      type: 'free' as const,
      nextTask,
    };
  }, [screenData, nowMinutes, t]);

  // Timeline color legend items
  const timelineLegendItems = useMemo(() => {
    if (!screenData) return [];
    const items: { key: string; color: string; label: string; time: string }[] = [];

    if (
      screenData.activeProfile?.sleepStart != null &&
      screenData.activeProfile?.sleepEnd != null
    ) {
      items.push({
        key: 'legend_sleep',
        color: SLEEP_COLOR,
        label: t('profiles.sleeping'),
        time: `${formatTimeMinutes(screenData.activeProfile.sleepStart, false, currentLocale)} – ${formatTimeMinutes(screenData.activeProfile.sleepEnd, false, currentLocale)}`,
      });
    }

    for (const rt of screenData.dayPlan.tasks) {
      items.push({
        key: `legend_task_${rt.task.id}_${rt.segment[0]}`,
        color: rt.isSuspended ? colors.danger : rt.task.color,
        label: rt.task.title,
        time: `${formatTimeMinutes(rt.segment[0], false, currentLocale)} – ${formatTimeMinutes(rt.segment[1], false, currentLocale)}`,
      });
    }

    for (const em of screenData.dayPlan.emergencyRanges) {
      items.push({
        key: `legend_em_${em.id}`,
        color: colors.danger,
        label: em.title,
        time: `${formatTimeMinutes(em.range[0], false, currentLocale)} – ${formatTimeMinutes(em.range[1], false, currentLocale)}`,
      });
    }

    return items;
  }, [screenData, currentLocale, t, colors.danger]);

  // 4. Prepare chronological Agenda items (tasks & free slots)
  const agendaItems: AgendaItem[] = useMemo(() => {
    if (!screenData) return [];
    const items: AgendaItem[] = [];

    for (const t of screenData.dayPlan.tasks) {
      items.push({
        type: 'task',
        taskSegment: t,
        startMin: t.segment[0],
        endMin: t.segment[1],
      });
    }

    for (const f of screenData.dayPlan.freeSlots) {
      items.push({
        type: 'free',
        slot: f,
        startMin: f[0],
        endMin: f[1],
      });
    }

    return items.sort((a, b) => a.startMin - b.startMin);
  }, [screenData]);

  // 5. Separate pending and completed todos
  const pendingTodos = useMemo(() => {
    if (!screenData) return [];
    return screenData.dayPlan.todos.filter((td) => td.status !== 'done');
  }, [screenData]);

  const completedTodos = useMemo(() => {
    if (!screenData) return [];
    return screenData.dayPlan.todos.filter((td) => td.status === 'done');
  }, [screenData]);

  // Today Date String
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const str = d.toLocaleDateString(currentLocale.startsWith('ar') ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return currentLocale.startsWith('ar') ? toArabicIndicNumerals(str) : str;
  }, [currentLocale]);

  if (loading && !screenData) {
    return (
      <ScreenContainer style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenContainer>
    );
  }

  const dayPlan = screenData?.dayPlan;
  const subtasks = screenData?.subtasks || [];
  const activeProfile = screenData?.activeProfile;

  const totalTasks = activeProfile?.tasks.length!;
  const totalItems = (dayPlan?.tasks.length || 0) + (dayPlan?.todos.length || 0);
  const completedItems =
    (dayPlan?.tasks.filter((t) => t.status === 'done').length || 0) +
    (dayPlan?.todos.filter((td) => td.status === 'done').length || 0);
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Header Section */}
        <View style={[styles.header, { flexDirection: dirRow }]}>
          <View style={styles.headerInfo}>
            <View style={[styles.dateBadgeRow, { flexDirection: dirRow }]}>
              <Calendar size={13} color={colors.textSecondary} />
              <AppText style={[styles.dateText, { color: colors.textSecondary }]}>
                {todayFormatted}
              </AppText>
            </View>
            <AppText weight="bold" style={[styles.mainTitle, { color: colors.text, textAlign }]}>
              {activeProfile
                ? activeProfile.title
                : t('today.noActiveProfile', 'No Active Profile')}
            </AppText>
          </View>

          {/* Quick Add To-do Button */}
          <Pressable
            style={[styles.quickAddButton, { backgroundColor: colors.accent }]}
            onPress={() => setAdhocModalVisible(true)}
            hitSlop={8}
          >
            <Plus size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Daily Progress Card & Metrics */}
        <View
          style={[
            styles.progressCard,
            { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceBorder },
          ]}
        >
          <View style={[styles.progressHeader, { flexDirection: dirRow }]}>
            <AppText weight="bold" style={[styles.progressLabel, { color: colors.text }]}>
              {t('today.dailyProgress', 'Daily Progress')}
            </AppText>
            <View style={[styles.percentBadge, { backgroundColor: colors.accentLight }]}>
              <View style={{ flexDirection: dirRow }}>
                <AppText weight="bold" style={styles.progressPercent}>
                  {formatNumber(progressPercent, currentLocale)}
                </AppText>
                <AppText>%</AppText>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.surfaceBorder, flexDirection: dirRow },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: colors.accent, width: `${progressPercent}%` },
              ]}
            />
          </View>

          <View style={{ flexDirection: dirRow, alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {totalItems > 0 ? (
              t('today.progressDetails', '{{done}} of {{total}} activities completed', {
                done: completedItems,
                total: totalItems,
              })
                .trim()
                .split(/\s+/) // Splits cleanly even if there are multiple spaces
                .map((txt, i) => {
                  const isNumber = txt !== '' && !Number.isNaN(Number(txt));

                  return (
                    <AppText
                      key={i}
                      style={[
                        styles.progressSubtext,
                        { color: isNumber ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {isNumber ? formatNumber(Number(txt), currentLocale) : txt}
                    </AppText>
                  );
                })
            ) : (
              <AppText>{t('today.emptyProgress')}</AppText>
            )}
          </View>

          {/* Quick Metrics Bar: Free Hours & Sleep Schedule */}
          <View
            style={[
              styles.metricsRow,
              { borderTopColor: colors.surfaceBorder, flexDirection: dirRow },
            ]}
          >
            <View
              style={[
                styles.metricPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  flexDirection: dirRow,
                },
              ]}
            >
              <Coffee size={20} color={colors.accent} />
              <AppText style={[styles.metricText, { color: colors.textSecondary }]}>
                {t('today.freeHours', 'Free Time')}
                {' — '}(
                <AppText weight="bold" style={{ color: colors.text }}>
                  {freeHoursInfo.fullDurationText}
                </AppText>
                )
              </AppText>
            </View>

            {activeProfile?.sleepStart != null && activeProfile?.sleepEnd != null && (
              <View
                style={[
                  styles.metricPill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    flexDirection: dirRow,
                  },
                ]}
              >
                <Moon size={20} color="#FEF08A" />
                <AppText style={[styles.metricText, { color: colors.textSecondary }]}>
                  {t('profiles.sleeping', 'Sleeping')}
                  {' — '}(
                  <AppText weight="bold" style={{ color: colors.text }}>
                    {sleepDurationText}
                  </AppText>
                  )
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Current Active Activity Card */}
        {currentActivity && (
          <View style={styles.currentActivityContainer}>
            {currentActivity.type === 'sleep' ? (
              <Card
                style={[
                  styles.activeCard,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: '#FACC15',
                    borderLeftWidth: isRTL ? 1 : 5,
                    borderRightWidth: isRTL ? 5 : 1,
                  },
                ]}
              >
                <View style={[styles.activeCardRow, { flexDirection: dirRow }]}>
                  <View style={[styles.activeIconBox, { backgroundColor: '#FEF08A' }]}>
                    <Moon size={22} color="#FEF08A" />
                  </View>
                  <View
                    style={[
                      styles.activeCardContent,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                    ]}
                  >
                    <View style={[styles.activeBadgeRow, { flexDirection: dirRow }]}>
                      <Badge label={t('today.sleepingNow', 'Sleeping')} variant="warning" />
                    </View>
                    <AppText
                      weight="bold"
                      style={[styles.activeTitle, { color: colors.text, textAlign }]}
                    >
                      {t('profiles.sleeping', 'Sleeping')}
                    </AppText>
                    <AppText
                      style={[styles.activeSubtext, { color: colors.textSecondary, textAlign }]}
                    >
                      {formatTimeMinutes(currentActivity.startMin, false, currentLocale)} –{' '}
                      {formatTimeMinutes(currentActivity.endMin, false, currentLocale)} (
                      {t('today.timeRemaining', '{{time}} remaining', {
                        time: `${isRTL ? toArabicIndicNumerals(Math.round(currentActivity.remainingMinutes)) : Math.round(currentActivity.remainingMinutes)} ${t('today.minutes', 'mins')}`,
                      })}
                      )
                    </AppText>
                  </View>
                </View>
              </Card>
            ) : currentActivity.type === 'task' ? (
              <Card
                style={[
                  styles.activeCard,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: currentActivity.taskSegment.task.color,
                    borderLeftWidth: isRTL ? 1 : 5,
                    borderRightWidth: isRTL ? 5 : 1,
                  },
                ]}
              >
                <Pressable
                  onPress={() => setSelectedTaskSegment(currentActivity.taskSegment)}
                  style={styles.activeCardTouchable}
                >
                  <View style={[styles.activeCardRow, { flexDirection: dirRow }]}>
                    <View
                      style={[
                        styles.activeIconBox,
                        { backgroundColor: `${currentActivity.taskSegment.task.color}20` },
                      ]}
                    >
                      <Play size={20} color={currentActivity.taskSegment.task.color} />
                    </View>
                    <View
                      style={[
                        styles.activeCardContent,
                        { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                      ]}
                    >
                      <View style={[styles.activeBadgeRow, { flexDirection: dirRow }]}>
                        <Badge label={t('today.currentTask', 'Current Task')} variant="accent" />
                        {currentActivity.taskSegment.task.flags?.important && (
                          <Badge
                            label={t('profiles.important', 'Important')}
                            variant="warning"
                            style={{ marginHorizontal: 4 }}
                          />
                        )}
                      </View>
                      <AppText
                        weight="bold"
                        style={[styles.activeTitle, { color: colors.text, textAlign }]}
                      >
                        {currentActivity.taskSegment.task.title}
                      </AppText>
                      <AppText
                        style={[styles.activeSubtext, { color: colors.textSecondary, textAlign }]}
                      >
                        {formatTimeMinutes(
                          currentActivity.taskSegment.segment[0],
                          false,
                          currentLocale,
                        )}{' '}
                        –{' '}
                        {formatTimeMinutes(
                          currentActivity.taskSegment.segment[1],
                          false,
                          currentLocale,
                        )}{' '}
                        (
                        {t('today.timeRemaining', '{{time}} remaining', {
                          time: `${formatNumber(currentActivity.remainingMinutes, currentLocale)} ${t('common.min', 'min')}`,
                        })}
                        )
                      </AppText>
                    </View>
                    <Pressable
                      style={styles.activeDoneBtn}
                      onPress={() =>
                        handleTaskStatusChange(
                          currentActivity.taskSegment,
                          currentActivity.taskSegment.status === 'done' ? 'pending' : 'done',
                        )
                      }
                      hitSlop={8}
                    >
                      {currentActivity.taskSegment.status === 'done' ? (
                        <CheckCircle2 size={26} color={colors.success} />
                      ) : (
                        <Circle size={26} color={colors.accent} />
                      )}
                    </Pressable>
                  </View>
                </Pressable>
              </Card>
            ) : null}
          </View>
        )}

        {/* 24-Hour Timeline Bar & Legend */}
        <View style={styles.timelineSection}>
          <View style={[styles.sectionTitleRow, { flexDirection: dirRow }]}>
            <Clock size={20} color={colors.accent} />
            <AppText weight="bold" style={[styles.sectionTitle, { color: colors.text }]}>
              {t('today.timelineTitle', 'Day Timeline')}
            </AppText>
          </View>
          <DayTimelineBar
            segments={timelineSegments}
            showNowPointer={true}
            nowMinute={nowMinutes}
            showHourTicks={true}
          />

          {/* Timeline Color Legend */}
          {timelineLegendItems.length > 0 && (
            <View style={styles.legendContainer}>
              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.legendScroll,
                  {
                    flexDirection: dirRow,
                    flexGrow: 1,
                    justifyContent: isRTL ? 'flex-start' : 'flex-end',
                  },
                ]}
              >
                {timelineLegendItems.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.legendChip,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.surfaceBorder,
                        flexDirection: dirRow,
                      },
                    ]}
                  >
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <AppText weight="medium" style={[styles.legendLabel, { color: colors.text }]}>
                      {item.label}
                    </AppText>
                    <AppText style={[styles.legendTime, { color: colors.textMuted }]}>
                      {item.time}
                    </AppText>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Foldable Agenda Activities Section */}
        <View style={styles.agendaSection}>
          <Pressable
            style={[
              styles.foldableHeader,
              {
                flexDirection: dirRow,
                backgroundColor: isTasksFolded ? colors.card : `${colors.accentLight}E1`,
              },
            ]}
            onPress={() => setIsTasksFolded(!isTasksFolded)}
          >
            <View style={[styles.sectionTitleRow, { flexDirection: dirRow }]}>
              <Sparkles size={20} color={colors.accent} />
              <AppText weight="bold" style={[styles.sectionTitle, { color: colors.text }]}>
                {t('today.agendaTitle', 'Today Agenda')}
              </AppText>
            </View>
            <View style={[styles.CounterIconCounter, { flexDirection: dirRow }]}>
              {totalTasks > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                  <AppText weight="bold" style={[styles.countBadgeText, { color: colors.text }]}>
                    {formatNumber(totalTasks, currentLocale)}
                  </AppText>
                </View>
              )}
              {isTasksFolded ? (
                <ChevronDown size={20} color={colors.textSecondary} />
              ) : (
                <ChevronUp size={20} color={colors.textSecondary} />
              )}
            </View>
          </Pressable>

          {!isTasksFolded &&
            (agendaItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <AppText
                  style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center' }]}
                >
                  {t(
                    'today.noActivitiesToday',
                    'No scheduled activities for today. Tap "+" to add a task or configure a profile.',
                  )}
                </AppText>
              </Card>
            ) : (
              agendaItems.map((item, idx) => {
                if (item.type === 'free') {
                  return (
                    <View
                      key={`free_${item.startMin}_${idx}`}
                      style={[
                        styles.freeSlotCard,
                        {
                          borderColor: colors.surfaceBorder,
                          backgroundColor: colors.background,
                          flexDirection: dirRow,
                        },
                      ]}
                    >
                      <Coffee size={20} color={colors.textSecondary} />
                      <AppText style={[styles.freeSlotText, { color: colors.textSecondary }]}>
                        {t('today.freeTime', 'Free Time')}
                        {'  —  '}
                        {formatTimeMinutes(item.startMin, false, currentLocale)}
                        {' - '}
                        {formatTimeMinutes(item.endMin, false, currentLocale)} (
                        <AppText weight="bold">
                          {getSleepDurationText(item.startMin, item.endMin, currentLocale, t)}
                        </AppText>
                        )
                      </AppText>
                    </View>
                  );
                }

                const { taskSegment } = item;
                const isDone = taskSegment.status === 'done';
                const isSkipped = taskSegment.status === 'skipped';
                const taskSubtasks = subtasks.filter((s) => s.taskId === taskSegment.task.id);
                const isExpanded = expandedTaskSubtasks[taskSegment.task.id];

                return (
                  <Card
                    key={`task_${taskSegment.task.id}_${item.startMin}`}
                    style={[
                      styles.taskCard,
                      isRTL
                        ? {
                            borderRightWidth: 5,
                            borderRightColor: taskSegment.task.color,
                            borderLeftWidth: 0,
                          }
                        : {
                            borderLeftWidth: 5,
                            borderLeftColor: taskSegment.task.color,
                            borderRightWidth: 0,
                          },
                      taskSegment.isSuspended &&
                        (isRTL
                          ? { borderRightColor: colors.danger }
                          : { borderLeftColor: colors.danger }),
                    ]}
                  >
                    <Pressable
                      onPress={() => setSelectedTaskSegment(taskSegment)}
                      style={styles.taskCardMain}
                    >
                      <View style={[styles.taskCardHeader, { flexDirection: dirRow }]}>
                        {/* Status toggle checkbox */}
                        <Pressable
                          style={styles.taskStatusButton}
                          onPress={() =>
                            handleTaskStatusChange(taskSegment, isDone ? 'pending' : 'done')
                          }
                          hitSlop={8}
                        >
                          {isDone ? (
                            <CheckCircle2 size={22} color={colors.success} />
                          ) : isSkipped ? (
                            <AlertTriangle size={22} color={colors.warning} />
                          ) : (
                            <Circle size={22} color={colors.textSecondary} />
                          )}
                        </Pressable>

                        {/* Title & Time */}
                        <View style={styles.taskTitleGroup}>
                          <AppText
                            weight="bold"
                            style={[
                              styles.taskTitle,
                              { color: colors.text, textAlign },
                              isDone && styles.strikethrough,
                            ]}
                            numberOfLines={1}
                          >
                            {taskSegment.task.title}
                          </AppText>
                          <AppText
                            style={[
                              styles.taskTimeRange,
                              { color: colors.textSecondary, textAlign },
                            ]}
                          >
                            {formatTimeMinutes(taskSegment.segment[0], false, currentLocale)} –{' '}
                            {formatTimeMinutes(taskSegment.segment[1], false, currentLocale)}
                          </AppText>
                        </View>

                        {/* Important Badge */}
                        {taskSegment.task.flags?.important && (
                          <Badge
                            style={{ alignSelf: 'center' }}
                            label={t('profiles.important', 'Important')}
                            variant="warning"
                          />
                        )}
                      </View>
                    </Pressable>

                    {/* Subtasks expander toggle */}
                    <View style={[styles.subtasksToggleRow, { flexDirection: dirRow }]}>
                      <Pressable
                        style={[styles.subtasksToggle, { flexDirection: dirRow }]}
                        onPress={() =>
                          setExpandedTaskSubtasks({
                            ...expandedTaskSubtasks,
                            [taskSegment.task.id]: !isExpanded,
                          })
                        }
                      >
                        <AppText
                          weight="semiBold"
                          style={[styles.subtaskCountText, { color: colors.accent }]}
                        >
                          {t('today.subtasksCount', '{{count}} subtasks', {
                            count: formatNumber(
                              taskSubtasks.length,
                              currentLocale,
                            ) as unknown as number,
                          })}
                        </AppText>
                        {isExpanded ? (
                          <ChevronUp size={20} color={colors.accent} />
                        ) : (
                          <ChevronDown size={20} color={colors.accent} />
                        )}
                      </Pressable>
                    </View>

                    {/* Expanded Subtasks List */}
                    {isExpanded && (
                      <SubtasksList
                        taskId={taskSegment.task.id}
                        subtasks={subtasks}
                        onAddSubtask={(title) => handleAddSubtask(taskSegment.task.id, title)}
                        onToggleSubtask={handleToggleSubtask}
                        onDeleteSubtask={handleDeleteSubtask}
                      />
                    )}
                  </Card>
                );
              })
            ))}
        </View>

        {/* Foldable pending Todos Section */}
        <View style={styles.todosSection}>
          <Pressable
            style={[
              styles.foldableHeader,
              {
                flexDirection: dirRow,
                backgroundColor: isTodosFolded ? colors.card : `${colors.accentLight}E1`,
              },
            ]}
            onPress={() => setIsTodosFolded(!isTodosFolded)}
          >
            <View style={[styles.sectionTitleRow, { flexDirection: dirRow }]}>
              <ListTodo size={20} color={colors.accent} />
              <AppText weight="bold" style={[styles.sectionTitle, { color: colors.text }]}>
                {t('today.todosTitle', 'Today Todos')}
              </AppText>
            </View>
            <View style={[styles.CounterIconCounter, { flexDirection: dirRow }]}>
              {pendingTodos.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                  <AppText weight="bold" style={[styles.countBadgeText, { color: colors.text }]}>
                    {formatNumber(pendingTodos.length, currentLocale)}
                  </AppText>
                </View>
              )}
              {isTodosFolded ? (
                <ChevronDown size={20} color={colors.textSecondary} />
              ) : (
                <ChevronUp size={20} color={colors.textSecondary} />
              )}
            </View>
          </Pressable>

          {!isTodosFolded && (
            <>
              {pendingTodos.length === 0 && completedTodos.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <AppText
                    style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center' }]}
                  >
                    {t('today.noTodosToday', 'No todos for today')}
                  </AppText>
                </Card>
              ) : pendingTodos.length === 0 &&
                completedTodos.length === activeProfile?.todos.length ? (
                <Card style={styles.emptyCard}>
                  <AppText
                    style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center' }]}
                  >
                    {t('today.todosDone', 'All done')}
                  </AppText>
                </Card>
              ) : (
                pendingTodos.map((td) => (
                  <Card key={td.todo.id} style={styles.todoCard}>
                    <View style={[styles.todoRow, { flexDirection: dirRow }]}>
                      {/* Checkbox ONLY toggles completion */}
                      <Pressable
                        style={styles.todoCheckbox}
                        onPress={() => handleToggleTodo(td)}
                        hitSlop={8}
                      >
                        <Square size={22} color={colors.textSecondary} />
                      </Pressable>

                      {/* Tapping body opens details modal, displays only to-do title */}
                      <Pressable style={styles.todoBody} onPress={() => setSelectedTodo(td)}>
                        <AppText
                          weight="semiBold"
                          style={[styles.todoTitle, { color: colors.text, textAlign }]}
                          numberOfLines={2}
                        >
                          {td.todo.title}
                        </AppText>
                      </Pressable>

                      {/* Important badge if flagged */}
                      {td.todo.flags?.important && (
                        <Badge
                          style={{ alignSelf: 'center' }}
                          label={t('profiles.important', 'Important')}
                          variant="warning"
                        />
                      )}
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </View>

        {/* Foldable Completed Todos Accordion */}
        {completedTodos.length > 0 && (
          <View style={styles.completedSection}>
            <Pressable
              style={[
                styles.completedHeader,
                {
                  flexDirection: dirRow,
                  backgroundColor: !showCompletedTodos ? colors.card : `${colors.accentLight}E1`,
                },
              ]}
              onPress={() => setShowCompletedTodos(!showCompletedTodos)}
            >
              <View style={[styles.sectionTitleRow, { flexDirection: dirRow }]}>
                <CheckSquare size={20} color={colors.accent} />
                <AppText weight="bold" style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('today.completedTodos', 'Completed')}
                </AppText>
              </View>
              <View style={[styles.CounterIconCounter, { flexDirection: dirRow }]}>
                <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                  <AppText weight="bold" style={[styles.countBadgeText, { color: colors.text }]}>
                    {formatNumber(completedTodos.length, currentLocale)}
                  </AppText>
                </View>
                {showCompletedTodos ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </View>
            </Pressable>

            {showCompletedTodos &&
              completedTodos.map((td) => (
                <Card key={`completed_${td.todo.id}`} style={styles.todoCard}>
                  <View style={[styles.todoRow, { flexDirection: dirRow }]}>
                    {/* Checkbox ONLY toggles completion */}
                    <Pressable
                      style={styles.todoCheckbox}
                      onPress={() => handleToggleTodo(td)}
                      hitSlop={8}
                    >
                      <CheckSquare size={22} color={colors.success} />
                    </Pressable>

                    {/* Body tap opens details */}
                    <Pressable style={styles.todoBody} onPress={() => setSelectedTodo(td)}>
                      <AppText
                        style={[
                          styles.todoTitle,
                          { color: colors.textMuted, textAlign },
                          styles.strikethrough,
                        ]}
                        numberOfLines={2}
                      >
                        {td.todo.title}
                      </AppText>
                    </Pressable>
                  </View>
                </Card>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Task Details Centered Pop-up Modal */}
      <TaskDetailModal
        visible={Boolean(selectedTaskSegment)}
        taskSegment={selectedTaskSegment}
        onClose={() => setSelectedTaskSegment(null)}
        onStatusChange={(status) => {
          if (selectedTaskSegment) {
            void handleTaskStatusChange(selectedTaskSegment, status);
          }
        }}
        onEditInProfile={handleEditInProfile}
      />

      {/* Todo Details Centered Pop-up Modal */}
      <TodoDetailModal
        visible={Boolean(selectedTodo)}
        todoItem={selectedTodo}
        onClose={() => setSelectedTodo(null)}
        onToggleStatus={() => {
          if (selectedTodo) {
            void handleToggleTodo(selectedTodo);
          }
        }}
        onEditInProfile={handleEditInProfile}
        onEditAdhocTodo={(item) => {
          setSelectedTodo(null);
          setEditingAdhocTodo(item.todo);
          setAdhocModalVisible(true);
        }}
        onDeleteAdhocTodo={async (id) => {
          setSelectedTodo(null);
          await deleteAdhocItem(id);
          await loadData();
        }}
      />

      {/* Adhoc Quick Add/Edit To-do Modal */}
      <AdhocItemModal
        key={editingAdhocTodo ? editingAdhocTodo.id : 'new'}
        visible={adhocModalVisible}
        initialTodo={editingAdhocTodo}
        categories={categoriesList}
        onClose={() => {
          setAdhocModalVisible(false);
          setEditingAdhocTodo(null);
        }}
        onSave={handleSaveAdhocTodo}
      />

      {/* Delete Subtask Confirmation Modal */}
      <ConfirmModal
        visible={!!subtaskToDelete}
        title={t('today.deleteSubtaskTitle', 'Delete Sub-task')}
        message={t('today.deleteSubtaskConfirm', 'Are you sure you want to delete "{{title}}"?', {
          title: subtaskToDelete?.title || '',
        })}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        onConfirm={async () => {
          if (subtaskToDelete) {
            await deleteSubtask(subtaskToDelete.id);
            setSubtaskToDelete(null);
            await loadData();
          }
        }}
        onCancel={() => setSubtaskToDelete(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  dateBadgeRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  quickAddButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  progressCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
    gap: 10,
  },
  progressHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressSubtext: {
    fontSize: 15,
  },
  metricsRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
    flexWrap: 'wrap',
  },
  metricPill: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricText: {
    fontSize: 14,
  },
  timelineSection: {
    marginBottom: 20,
    gap: 10,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  agendaSection: {
    marginBottom: 20,
    gap: 10,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  freeSlotCard: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 3,
  },
  freeSlotText: {
    fontSize: 13,
    fontWeight: '500',
  },
  taskCard: {
    borderLeftWidth: 5,
    borderRadius: 14,
    padding: 14,
    marginVertical: 4,
  },
  taskCardMain: {
    width: '100%',
  },
  taskCardHeader: {
    alignItems: 'center',
    gap: 10,
  },
  taskStatusButton: {
    padding: 2,
  },
  taskTitleGroup: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  taskTimeRange: {
    fontSize: 12,
    marginTop: 2,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  subtasksToggleRow: {
    marginTop: 8,
  },
  subtasksToggle: {
    alignItems: 'center',
    gap: 4,
  },
  subtaskCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todosSection: {
    marginBottom: 20,
    gap: 8,
  },
  todoCard: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 3,
  },
  todoRow: {
    alignItems: 'center',
    gap: 10,
  },
  todoCheckbox: {
    padding: 2,
  },
  todoBody: {
    flex: 1,
    paddingVertical: 4,
  },
  todoTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  todoEditBtn: {
    padding: 4,
  },
  completedSection: {
    gap: 6,
  },
  completedHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  completedHeaderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  currentActivityContainer: {
    marginBottom: 16,
  },
  activeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  activeCardTouchable: {
    width: '100%',
  },
  activeCardRow: {
    alignItems: 'center',
    gap: 12,
  },
  activeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCardContent: {
    flex: 1,
  },
  activeBadgeRow: {
    marginBottom: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  activeTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  activeSubtext: {
    fontSize: 12,
  },
  activeDoneBtn: {
    padding: 4,
  },
  legendContainer: {
    marginTop: 10,
  },
  legendScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  legendChip: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
  },
  legendTime: {
    fontSize: 10,
  },
  foldableHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    marginStart: 8,
  },
  countBadgeText: {
    fontSize: 15,
  },
  CounterIconCounter: {
    alignItems: 'center',
    gap: 5,
  },
  foldText: {
    fontSize: 12,
  },
});
