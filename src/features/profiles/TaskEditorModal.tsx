import { AppText } from '@/components/common/AppText';
import { AppTextInput } from '@/components/common/AppTextInput';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { SmartTimePicker } from '@/components/time/SmartTimePicker';
import { findOverlappingTask } from '@/domain/conflicts';
import { DomainTask, TimePoint } from '@/domain/types';
import { formatTimeMinutes } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { getCategoryLabel } from '@/utils/categoryHelper';
import { AUTOMATED_TASK_PALETTE } from '@/utils/taskColors';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface TaskEditorModalProps {
  visible: boolean;
  initialTask?: DomainTask | null;
  existingTasks?: DomainTask[];
  suggestedColor?: string;
  categories: { id: string; nameKey: string | null; customName: string | null; color: string }[];
  onSave: (task: DomainTask) => void;
  onCancel: () => void;
}

export function TaskEditorModal({
  visible,
  initialTask,
  existingTasks = [],
  suggestedColor,
  categories,
  onSave,
  onCancel,
}: TaskEditorModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, isRTL, dirRow, textAlign } = useTheme();
  const currentLocale = i18n.language || 'en';

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [start, setStart] = useState<TimePoint>(initialTask?.start || { min: 540 }); // 09:00
  const [end, setEnd] = useState<TimePoint>(initialTask?.end || { min: 600 }); // 10:00
  const [categoryId, setCategoryId] = useState<string>(
    initialTask?.categoryId || categories[0]?.id || 'cat_general',
  );
  const [color] = useState<string>(
    initialTask?.color || suggestedColor || AUTOMATED_TASK_PALETTE[0],
  );
  const [important, setImportant] = useState<boolean>(initialTask?.flags?.important || false);

  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  // Check if proposed task overlaps with any existing tasks in the profile
  const overlappingConflict = useMemo(() => {
    if (!existingTasks || existingTasks.length === 0) return null;
    return findOverlappingTask(
      { id: initialTask?.id, start: start.min, end: end.min },
      existingTasks,
    );
  }, [existingTasks, initialTask?.id, start.min, end.min]);

  const isZeroDuration = start.min === end.min;
  const canSave = title.trim().length > 0 && !overlappingConflict && !isZeroDuration;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: initialTask?.id || `task_${Date.now()}`,
      profileId: initialTask?.profileId || '',
      title: title.trim(),
      description: description.trim() || undefined,
      start,
      end,
      categoryId,
      color,
      flags: {
        important,
      },
      enabled: initialTask?.enabled ?? true,
      sortOrder: initialTask?.sortOrder || 0,
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            contentContainerStyle={styles.scroll}
          >
            <AppText weight="bold" style={[styles.modalTitle, { color: colors.text, textAlign }]}>
              {initialTask ? t('common.edit') : t('profiles.addTask')}
            </AppText>

            {/* Title Input */}
            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign }]}
            >
              {t('profiles.taskTitleLabel')}
            </AppText>
            <AppTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('profiles.taskTitlePlaceholder')}
            />

            {/* Description Input */}
            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign }]}
            >
              {t('profiles.notesLabel')}
            </AppText>
            <AppTextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('profiles.notesPlaceholder')}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            {/* Time Pickers (From / To) */}
            <View style={[styles.timeRow, { flexDirection: dirRow }]}>
              <Pressable
                onPress={() => setActivePicker('start')}
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
                    {formatTimeMinutes(start.min, false, currentLocale)}
                  </AppText>
                </View>
                {start.label ? (
                  <AppText
                    style={[styles.prayerSubLabel, { color: colors.accent, textAlign: 'center' }]}
                  >
                    {t(`prayers.${start.label}`)}
                  </AppText>
                ) : null}
              </Pressable>

              <Pressable
                onPress={() => setActivePicker('end')}
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
                    {formatTimeMinutes(end.min, false, currentLocale)}
                  </AppText>
                </View>
                {end.label ? (
                  <AppText
                    style={[styles.prayerSubLabel, { color: colors.accent, textAlign: 'center' }]}
                  >
                    {t(`prayers.${end.label}`)}
                  </AppText>
                ) : null}
              </Pressable>
            </View>

            {end.min < start.min ? (
              <AppText style={[styles.midnightNotice, { color: colors.warning, textAlign }]}>
                {t('profiles.midnightWarning')}
              </AppText>
            ) : null}

            {/* Overlap Error Banner */}
            {overlappingConflict && (
              <View
                style={[
                  styles.overlapBanner,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    flexDirection: dirRow,
                  },
                ]}
              >
                <AlertCircle size={18} color={colors.danger} style={{ marginTop: 2 }} />
                <View style={styles.overlapBannerText}>
                  <AppText
                    weight="bold"
                    style={[styles.overlapBannerTitle, { color: colors.danger, textAlign }]}
                  >
                    {t('profiles.taskOverlapTitle')}
                  </AppText>
                  <AppText style={[styles.overlapBannerMsg, { color: colors.text, textAlign }]}>
                    {t('profiles.taskOverlapError', {
                      title: overlappingConflict.title,
                      from: formatTimeMinutes(overlappingConflict.start, false, currentLocale),
                      to: formatTimeMinutes(overlappingConflict.end, false, currentLocale),
                    })}
                  </AppText>
                </View>
              </View>
            )}

            {/* Zero Duration Error */}
            {isZeroDuration && (
              <View
                style={[
                  styles.overlapBanner,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    flexDirection: dirRow,
                  },
                ]}
              >
                <AlertCircle size={18} color={colors.danger} style={{ marginTop: 2 }} />
                <View style={styles.overlapBannerText}>
                  <AppText style={[styles.overlapBannerMsg, { color: colors.danger, textAlign }]}>
                    {t('profiles.taskZeroDurationError')}
                  </AppText>
                </View>
              </View>
            )}

            {/* Category Selector */}
            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign }]}
            >
              {t('common.category', 'Category')}
            </AppText>
            <View style={[styles.categoriesWrap, { flexDirection: dirRow }]}>
              {categories.map((c) => {
                const label = getCategoryLabel(c, t, isRTL);
                const isSelected = categoryId === c.id;
                return (
                  <Chip
                    key={c.id}
                    label={label}
                    selected={isSelected}
                    onPress={() => setCategoryId(c.id)}
                  />
                );
              })}
            </View>

            {/* Flags */}
            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign }]}
            >
              {t('common.important')}
            </AppText>
            <View style={[styles.flagsRow, { flexDirection: dirRow }]}>
              <Pressable
                onPress={() => setImportant(!important)}
                style={[
                  styles.flagButton,
                  {
                    borderColor: important ? colors.danger : colors.surfaceBorder,
                    flexDirection: dirRow,
                  },
                  important && { backgroundColor: colors.dangerLight },
                ]}
              >
                <ShieldAlert size={20} color={important ? colors.danger : colors.textMuted} />
                <AppText
                  weight="semiBold"
                  style={[
                    styles.flagText,
                    { color: important ? colors.danger : colors.textMuted, marginHorizontal: 6 },
                  ]}
                >
                  {t('profiles.important')}
                </AppText>
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View style={[styles.actionsRow, { flexDirection: dirRow }]}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onCancel}
                style={styles.actionBtn}
              />
              <Button
                title={t('common.save')}
                variant="primary"
                onPress={handleSave}
                disabled={!canSave}
                style={styles.actionBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Smart Time Picker Modal */}
      <SmartTimePicker
        visible={activePicker !== null}
        initialTime={activePicker === 'start' ? start : end}
        onConfirm={(tp) => {
          if (activePicker === 'start') setStart(tp);
          if (activePicker === 'end') setEnd(tp);
          setActivePicker(null);
        }}
        onCancel={() => setActivePicker(null)}
        title={activePicker === 'start' ? t('profiles.from') : t('profiles.to')}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  dialog: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  scroll: {
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  textArea: {
    minHeight: 70,
  },
  timeRow: {
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  timeBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
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
    fontSize: 16,
  },
  prayerSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  midnightNotice: {
    fontSize: 13,
    marginVertical: 6,
  },
  overlapBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 10,
    gap: 10,
    alignItems: 'flex-start',
  },
  overlapBannerText: {
    flex: 1,
  },
  overlapBannerTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  overlapBannerMsg: {
    fontSize: 12,
    lineHeight: 18,
  },
  categoriesWrap: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  flagsRow: {
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  flagButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: {
    fontSize: 13,
  },
  actionsRow: {
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
});
