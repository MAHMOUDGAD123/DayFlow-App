import { AppText } from '@/components/common/AppText';
import { AppTextInput } from '@/components/common/AppTextInput';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { SmartTimePicker } from '@/components/time/SmartTimePicker';
import { DayTimelineBar, TimelineSegment } from '@/components/timeline/DayTimelineBar';
import { EmergencyReminder, FullEmergency } from '@/db/repositories/emergencyRepo';
import { TimePoint } from '@/domain/types';
import { formatTimeMinutes } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { AlertTriangle, Bell, Calendar, Clock, Plus, Repeat, Trash2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WEEKDAYS = [
  { bit: '1', key: 'profiles.weekdays.sat' },
  { bit: '2', key: 'profiles.weekdays.sun' },
  { bit: '4', key: 'profiles.weekdays.mon' },
  { bit: '8', key: 'profiles.weekdays.tue' },
  { bit: '16', key: 'profiles.weekdays.wed' },
  { bit: '32', key: 'profiles.weekdays.thu' },
  { bit: '64', key: 'profiles.weekdays.fri' },
];

interface EmergencyEditorModalProps {
  visible: boolean;
  initialEmergency?: FullEmergency | null;
  onSave: (saved: FullEmergency) => void;
  onCancel: () => void;
}

export function EmergencyEditorModal({
  visible,
  initialEmergency,
  onSave,
  onCancel,
}: EmergencyEditorModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, dirRow, textAlign, isRTL } = useTheme();
  const insets = useSafeAreaInsets();
  const currentLocale = i18n.language || 'en';

  const [id] = useState(() => initialEmergency?.id || `emg_${Date.now()}`);
  const [title, setTitle] = useState(initialEmergency?.title || '');
  const [description, setDescription] = useState(initialEmergency?.description || '');
  const [enabled, setEnabled] = useState(initialEmergency?.enabled ?? false);

  // Schedule type: 'dates' vs 'weekdays'
  const [scheduleType, setScheduleType] = useState<'dates' | 'weekdays'>(
    initialEmergency?.scheduleType || 'dates',
  );

  const [datesList, setDatesList] = useState<string[]>(() => {
    if (initialEmergency?.scheduleType === 'dates' && initialEmergency.scheduleData.length > 0) {
      return initialEmergency.scheduleData;
    }
    const today = new Date();
    const dStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;
    return [dStr];
  });

  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(() => {
    if (initialEmergency?.scheduleType === 'weekdays' && initialEmergency.scheduleData.length > 0) {
      return initialEmergency.scheduleData;
    }
    return ['1', '2', '4', '8', '16', '32', '64'];
  });

  // Time Range
  const [isAllDay, setIsAllDay] = useState(
    initialEmergency
      ? (initialEmergency.startMinutes === null && initialEmergency.endMinutes === null) ||
          (initialEmergency.startMinutes === 0 && initialEmergency.endMinutes === 1440)
      : true,
  );
  const [startMin, setStartMin] = useState(initialEmergency?.startMinutes ?? 480);
  const [endMin, setEndMin] = useState(initialEmergency?.endMinutes ?? 1020);

  // Reminders list
  const [reminders, setReminders] = useState<EmergencyReminder[]>(() => {
    if (initialEmergency && initialEmergency.reminders.length > 0) {
      return initialEmergency.reminders;
    }
    return [
      {
        id: `rem_${Date.now()}`,
        emergencyId: initialEmergency?.id || `emg_${Date.now()}`,
        timeMinutes: 480,
      },
    ];
  });

  // Picker States
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | 'reminder'>('start');

  const handleToggleWeekday = (bitStr: string) => {
    if (selectedWeekdays.includes(bitStr)) {
      if (selectedWeekdays.length === 1) {
        Alert.alert(
          t('common.error', 'Error'),
          t('emergencies.minOneDayAlert', 'At least one day must be chosen.'),
        );
        return;
      }
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== bitStr));
    } else {
      setSelectedWeekdays([...selectedWeekdays, bitStr]);
    }
  };

  const handleAddReminder = (tp: TimePoint) => {
    setReminders([
      ...reminders,
      {
        id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        emergencyId: id,
        timeMinutes: tp.min,
        prayer: tp.label,
      },
    ]);
  };

  const handleDeleteReminder = (remId: string) => {
    if (reminders.length <= 1) {
      Alert.alert(
        t('common.warning', 'Warning'),
        t(
          'emergencies.minOneReminderAlert',
          'At least one reminder is required for emergency events.',
        ),
      );
      return;
    }
    setReminders(reminders.filter((r) => r.id !== remId));
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert(
        t('common.error', 'Error'),
        t('emergencies.titleRequiredAlert', 'Please enter an event title.'),
      );
      return;
    }

    if (reminders.length === 0) {
      Alert.alert(
        t('common.error', 'Error'),
        t(
          'emergencies.minOneReminderAlert',
          'At least one reminder is required for emergency events.',
        ),
      );
      return;
    }

    const full: FullEmergency = {
      id,
      title: title.trim(),
      description: description.trim() || null,
      scheduleType,
      scheduleData: scheduleType === 'dates' ? datesList : selectedWeekdays,
      startMinutes: isAllDay ? null : startMin,
      endMinutes: isAllDay ? null : endMin,
      enabled,
      createdAt: initialEmergency?.createdAt || Date.now(),
      updatedAt: Date.now(),
      reminders: reminders.map((r) => ({ ...r, emergencyId: id })),
    };

    onSave(full);
  };

  const previewSegments = useMemo<TimelineSegment[]>(() => {
    if (isAllDay) {
      return [{ start: 0, end: 1440, color: colors.danger, isEmergency: true }];
    }
    return [{ start: startMin, end: endMin, color: colors.danger, isEmergency: true }];
  }, [isAllDay, startMin, endMin, colors.danger]);

  if (!visible) return null;

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0,
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.surfaceBorder,
              paddingTop: topInset + 8,
              flexDirection: dirRow,
            },
          ]}
        >
          <Pressable onPress={onCancel} hitSlop={10}>
            <X size={25} color={colors.textSecondary} />
          </Pressable>
          <AppText
            weight="bold"
            style={[styles.headerTitle, { color: colors.text, textAlign: 'center' }]}
          >
            {initialEmergency
              ? t('emergencies.editTitle', 'Edit Emergency')
              : t('emergencies.create', 'Add Emergency Event')}
          </AppText>
          <Button
            title={t('common.save', 'Save')}
            variant="primary"
            size="sm"
            onPress={handleSave}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Timeline Visual Banner */}
          <Card style={styles.previewCard}>
            <View style={[styles.previewHeader, { flexDirection: dirRow }]}>
              <AlertTriangle size={18} color={colors.danger} />
              <AppText weight="bold" style={[styles.previewLabel, { color: colors.text }]}>
                {t('emergencies.timelinePreview', 'Emergency Alteration Range')}
              </AppText>
            </View>
            <DayTimelineBar segments={previewSegments} height={26} showHourTicks={true} />
            <AppText style={[styles.previewSubtext, { color: colors.textSecondary, textAlign }]}>
              {isAllDay
                ? t(
                    'emergencies.allDayAlertMsg',
                    'Red band covers the full 24 hours. Only tasks and todos marked "Important" will remain active.',
                  )
                : t(
                    'emergencies.timeRangeAlertMsg',
                    'Red band alters only tasks and todos falling within this time window.',
                  )}
            </AppText>
          </Card>

          {/* Title & Description */}
          <Card style={styles.formCard}>
            <View style={styles.field}>
              <AppText
                weight="bold"
                style={[styles.label, { color: colors.textSecondary, textAlign }]}
              >
                {t('emergencies.fieldTitle', 'Event Title')} *
              </AppText>
              <AppTextInput
                placeholder={t(
                  'emergencies.titlePlaceholder',
                  'e.g. Travel, Illness, Urgent Family Matter',
                )}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.field}>
              <AppText
                weight="bold"
                style={[styles.label, { color: colors.textSecondary, textAlign }]}
              >
                {t('emergencies.fieldDesc', 'Optional Description')}
              </AppText>
              <AppTextInput
                placeholder={t('emergencies.descPlaceholder', 'Add details or context...')}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />
            </View>
          </Card>

          {/* Schedule Selection */}
          <Card style={styles.formCard}>
            <AppText
              weight="bold"
              style={[styles.sectionHeading, { color: colors.text, textAlign }]}
            >
              {t('emergencies.scheduleHeading', 'Active Schedule')}
            </AppText>

            <View
              style={[
                styles.tabSelector,
                { backgroundColor: colors.surfaceVariant, flexDirection: dirRow },
              ]}
            >
              <Pressable
                style={[
                  styles.tabBtn,
                  scheduleType === 'dates' && { backgroundColor: colors.accent },
                  { flexDirection: dirRow },
                ]}
                onPress={() => setScheduleType('dates')}
              >
                <Calendar
                  size={15}
                  color={scheduleType === 'dates' ? '#FFFFFF' : colors.textSecondary}
                />
                <AppText
                  weight="bold"
                  style={[
                    styles.tabText,
                    {
                      color: scheduleType === 'dates' ? '#FFFFFF' : colors.textSecondary,
                      marginHorizontal: 4,
                    },
                  ]}
                >
                  {t('emergencies.datesType', 'Specific Dates')}
                </AppText>
              </Pressable>
              <Pressable
                style={[
                  styles.tabBtn,
                  scheduleType === 'weekdays' && { backgroundColor: colors.accent },
                  { flexDirection: dirRow },
                ]}
                onPress={() => setScheduleType('weekdays')}
              >
                <Repeat
                  size={15}
                  color={scheduleType === 'weekdays' ? '#FFFFFF' : colors.textSecondary}
                />
                <AppText
                  weight="bold"
                  style={[
                    styles.tabText,
                    {
                      color: scheduleType === 'weekdays' ? '#FFFFFF' : colors.textSecondary,
                      marginHorizontal: 4,
                    },
                  ]}
                >
                  {t('emergencies.weekdaysType', 'Repeating Weekdays')}
                </AppText>
              </Pressable>
            </View>

            {scheduleType === 'dates' ? (
              <View style={styles.datesContainer}>
                <AppText style={[styles.subLabel, { color: colors.textSecondary, textAlign }]}>
                  {t('emergencies.selectedDates', 'Active for Date: {{date}}', {
                    date: datesList[0] || 'Today',
                  })}
                </AppText>
                <AppTextInput
                  placeholder="YYYY-MM-DD"
                  value={datesList[0]}
                  onChangeText={(val) => setDatesList([val])}
                />
              </View>
            ) : (
              <View style={[styles.weekdaysRow, { flexDirection: dirRow }]}>
                {WEEKDAYS.map((w) => {
                  const isSelected = selectedWeekdays.includes(w.bit);
                  return (
                    <Pressable
                      key={w.bit}
                      style={[
                        styles.weekdayChip,
                        { borderColor: colors.surfaceBorder },
                        isSelected && {
                          backgroundColor: colors.accent,
                          borderColor: colors.accent,
                        },
                      ]}
                      onPress={() => handleToggleWeekday(w.bit)}
                    >
                      <AppText
                        weight="bold"
                        style={[
                          styles.weekdayText,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {t(w.key)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Time Range Selector */}
          <Card style={styles.formCard}>
            <View style={[styles.switchRow, { flexDirection: dirRow }]}>
              <View style={styles.switchTextGroup}>
                <AppText
                  weight="bold"
                  style={[styles.switchLabel, { color: colors.text, textAlign }]}
                >
                  {t('emergencies.allDaySwitch', 'Alters Entire Day (24 Hours)')}
                </AppText>
                <AppText style={[styles.switchDesc, { color: colors.textSecondary, textAlign }]}>
                  {isAllDay
                    ? t('emergencies.allDayActive', 'Suspends all regular tasks for the full day.')
                    : t(
                        'emergencies.customRangeActive',
                        'Only suspends tasks overlapping the time range.',
                      )}
                </AppText>
              </View>
              <Switch
                value={isAllDay}
                onValueChange={(val) => setIsAllDay(val)}
                thumbColor="#FFFFFF"
                trackColor={{ false: colors.surfaceBorder, true: colors.danger }}
                style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
              />
            </View>

            {!isAllDay && (
              <View style={styles.customTimeSection}>
                <AppText
                  weight="bold"
                  style={[styles.label, { color: colors.textSecondary, textAlign }]}
                >
                  {t('emergencies.customTimeRange', 'Suspension Time Range')}
                </AppText>
                <View style={[styles.timePickersRow, { flexDirection: dirRow }]}>
                  <Pressable
                    style={[
                      styles.timeBox,
                      {
                        borderColor: colors.surfaceBorder,
                        backgroundColor: colors.surfaceVariant,
                        flexDirection: dirRow,
                      },
                    ]}
                    onPress={() => {
                      setPickerTarget('start');
                      setPickerVisible(true);
                    }}
                  >
                    <Clock size={20} color={colors.accent} />
                    <AppText
                      weight="bold"
                      style={[styles.timeBoxText, { color: colors.text, marginHorizontal: 6 }]}
                    >
                      {formatTimeMinutes(startMin, false, currentLocale)}
                    </AppText>
                  </Pressable>

                  <AppText style={[styles.toDash, { color: colors.textMuted }]}>–</AppText>

                  <Pressable
                    style={[
                      styles.timeBox,
                      {
                        borderColor: colors.surfaceBorder,
                        backgroundColor: colors.surfaceVariant,
                        flexDirection: dirRow,
                      },
                    ]}
                    onPress={() => {
                      setPickerTarget('end');
                      setPickerVisible(true);
                    }}
                  >
                    <Clock size={20} color={colors.accent} />
                    <AppText
                      weight="bold"
                      style={[styles.timeBoxText, { color: colors.text, marginHorizontal: 6 }]}
                    >
                      {formatTimeMinutes(endMin, false, currentLocale)}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            )}
          </Card>

          {/* Reminders Section (Mandatory) */}
          <Card style={styles.formCard}>
            <View style={[styles.remindersHeader, { flexDirection: dirRow }]}>
              <View style={[styles.remindersTitleRow, { flexDirection: dirRow }]}>
                <Bell size={18} color={colors.accent} />
                <AppText
                  weight="bold"
                  style={[styles.sectionHeading, { color: colors.text, marginHorizontal: 6 }]}
                >
                  {t('emergencies.remindersHeading', 'Event Reminders')} *
                </AppText>
              </View>
              <Badge label={t('common.mandatory', 'Mandatory')} variant="danger" />
            </View>
            <AppText style={[styles.subLabel, { color: colors.textSecondary, textAlign }]}>
              {t(
                'emergencies.remindersDesc',
                'At least one reminder is required to alert you during the emergency.',
              )}
            </AppText>

            <View style={styles.remindersList}>
              {reminders.map((r) => (
                <View
                  key={r.id}
                  style={[
                    styles.reminderChip,
                    { backgroundColor: colors.surfaceVariant, flexDirection: dirRow },
                  ]}
                >
                  <Bell size={14} color={colors.accent} />
                  <AppText
                    weight="bold"
                    style={[styles.reminderTimeText, { color: colors.text, marginHorizontal: 6 }]}
                  >
                    {formatTimeMinutes(r.timeMinutes, false, currentLocale)}
                    {r.prayer ? ` (${r.prayer})` : ''}
                  </AppText>
                  <Pressable onPress={() => handleDeleteReminder(r.id)} hitSlop={6}>
                    <Trash2 size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>

            <Button
              title={t('emergencies.addReminderBtn', 'Add Another Reminder')}
              variant="outline"
              size="sm"
              onPress={() => {
                setPickerTarget('reminder');
                setPickerVisible(true);
              }}
              icon={<Plus size={20} color={colors.accent} />}
              style={styles.addReminderBtn}
            />
          </Card>

          {/* Enabled Switch */}
          <Card style={styles.formCard}>
            <View style={[styles.switchRow, { flexDirection: dirRow }]}>
              <View style={styles.switchTextGroup}>
                <AppText
                  weight="bold"
                  style={[styles.switchLabel, { color: colors.text, textAlign }]}
                >
                  {t('emergencies.enableEvent', 'Enable Emergency Event')}
                </AppText>
                <AppText style={[styles.switchDesc, { color: colors.textSecondary, textAlign }]}>
                  {t(
                    'emergencies.enableDesc',
                    'When disabled, this event will have no effect on regular routines.',
                  )}
                </AppText>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                thumbColor="#FFFFFF"
                trackColor={{ false: colors.surfaceBorder, true: colors.danger }}
                style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
              />
            </View>
          </Card>
        </ScrollView>

        {/* Smart Time Picker Modal */}
        <SmartTimePicker
          visible={pickerVisible}
          title={
            pickerTarget === 'start'
              ? t('profiles.from', 'From')
              : pickerTarget === 'end'
                ? t('profiles.to', 'To')
                : t('emergencies.reminderTimePicker', 'Pick Reminder Time')
          }
          initialTime={{
            min: pickerTarget === 'start' ? startMin : pickerTarget === 'end' ? endMin : 720,
          }}
          onConfirm={(tp) => {
            if (pickerTarget === 'start') setStartMin(tp.min);
            else if (pickerTarget === 'end') setEndMin(tp.min);
            else handleAddReminder(tp);
            setPickerVisible(false);
          }}
          onCancel={() => setPickerVisible(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  previewCard: {
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  previewHeader: {
    alignItems: 'center',
    gap: 8,
  },
  previewLabel: {
    fontSize: 14,
  },
  previewSubtext: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  formCard: {
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
  textArea: {
    minHeight: 64,
  },
  sectionHeading: {
    fontSize: 15,
  },
  tabSelector: {
    padding: 4,
    borderRadius: 10,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 12,
  },
  datesContainer: {
    gap: 8,
    marginTop: 4,
  },
  subLabel: {
    fontSize: 12,
  },
  weekdaysRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  weekdayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  weekdayText: {
    fontSize: 12,
  },
  switchRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  switchTextGroup: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 14,
  },
  switchDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  customTimeSection: {
    gap: 8,
    marginTop: 6,
  },
  timePickersRow: {
    alignItems: 'center',
    gap: 10,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  timeBoxText: {
    fontSize: 14,
  },
  toDash: {
    fontSize: 16,
  },
  remindersHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remindersTitleRow: {
    alignItems: 'center',
    gap: 6,
  },
  remindersList: {
    gap: 6,
  },
  reminderChip: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reminderTimeText: {
    fontSize: 13,
    flex: 1,
  },
  addReminderBtn: {
    marginTop: 4,
  },
});
