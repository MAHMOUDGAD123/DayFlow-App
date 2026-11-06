import { AppText } from '@/components/common/AppText';
import { AppTextInput } from '@/components/common/AppTextInput';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { SmartTimePicker } from '@/components/time/SmartTimePicker';
import { DomainTodo, PrayerLabel, TimePoint } from '@/domain/types';
import { formatTimeMinutes } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { getCategoryLabel } from '@/utils/categoryHelper';
import { Bell, Plus, ShieldAlert, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface AdhocItemModalProps {
  visible: boolean;
  initialTodo?: DomainTodo | null;
  categories: { id: string; nameKey: string | null; customName: string | null; color: string }[];
  onClose: () => void;
  onSave: (todo: DomainTodo) => void;
}

export function AdhocItemModal({
  visible,
  initialTodo,
  categories,
  onClose,
  onSave,
}: AdhocItemModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, isRTL, dirRow, textAlign } = useTheme();
  const currentLocale = i18n.language || 'en';

  const [title, setTitle] = useState(initialTodo?.title || '');
  const [description, setDescription] = useState(initialTodo?.description || '');
  const [categoryId, setCategoryId] = useState<string>(
    initialTodo?.categoryId || categories[0]?.id || 'cat_general',
  );
  const [important, setImportant] = useState<boolean>(Boolean(initialTodo?.flags?.important));
  const [reminders, setReminders] = useState<
    { id: string; timeMinutes: number; prayer?: PrayerLabel | null }[]
  >(initialTodo?.reminders || []);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingReminderIdx, setEditingReminderIdx] = useState<number | null>(null);

  const handleSave = () => {
    if (!title.trim()) return;

    const todoPayload: DomainTodo = {
      id: initialTodo?.id || `adhoc_todo_${Date.now()}`,
      profileId: 'today_adhoc',
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      flags: {
        important,
      },
      reminders,
      enabled: initialTodo?.enabled ?? true,
      sortOrder: initialTodo?.sortOrder ?? 999,
    };

    onSave(todoPayload);
    onClose();
  };

  const handleAddOrEditReminder = (tp: TimePoint) => {
    if (editingReminderIdx !== null) {
      const updated = [...reminders];
      updated[editingReminderIdx] = {
        id: updated[editingReminderIdx].id,
        timeMinutes: tp.min,
        prayer: tp.label,
      };
      setReminders(updated);
    } else {
      setReminders([
        ...reminders,
        {
          id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timeMinutes: tp.min,
          prayer: tp.label,
        },
      ]);
    }
    setEditingReminderIdx(null);
    setPickerVisible(false);
  };

  const handleRemoveReminder = (idx: number) => {
    setReminders(reminders.filter((_, i) => i !== idx));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Backdrop touchable to dismiss by clicking outside */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Dialog container as a plain View so nested ScrollView and elements receive all touches */}
        <View
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { flexDirection: dirRow }]}>
            <View style={{ flex: 1 }}>
              <AppText weight="bold" style={[styles.modalTitle, { color: colors.text, textAlign }]}>
                {initialTodo
                  ? t('today.editAdhocTitle', "Edit Today's To-do")
                  : t('today.addAdhocTitle', 'Add To-do for Today')}
              </AppText>
              <AppText style={[styles.modalSubtitle, { color: colors.textMuted, textAlign }]}>
                {t('today.addAdhocDesc', "This to-do will only exist in today's checklist.")}
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={25} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            contentContainerStyle={styles.scroll}
          >
            {/* Title Input */}
            <AppText
              weight="bold"
              style={[styles.fieldLabel, { color: colors.textMuted, textAlign }]}
            >
              {t('profiles.todoTitleLabel')}
            </AppText>
            <AppTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('profiles.todoTitlePlaceholder')}
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
              numberOfLines={2}
              style={styles.textArea}
            />

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

            {/* Reminders List */}
            <View style={[styles.remindersHeader, { flexDirection: dirRow }]}>
              <AppText weight="bold" style={[styles.fieldLabel, { color: colors.textMuted }]}>
                {t('settings.notifications')}
              </AppText>
              <Button
                title={isRTL ? 'إضافة تنبيه' : 'Add Reminder'}
                variant="outline"
                size="sm"
                onPress={() => {
                  setEditingReminderIdx(null);
                  setPickerVisible(true);
                }}
                icon={<Plus size={14} color={colors.accent} />}
              />
            </View>

            {reminders.length === 0 ? (
              <AppText
                style={[
                  styles.emptyRemindersText,
                  {
                    color: colors.textMuted,
                    borderColor: colors.surfaceBorder,
                    borderWidth: 2,
                    borderRadius: 10,
                  },
                ]}
              >
                {t('profiles.noRemindersYet')}
              </AppText>
            ) : (
              <View style={styles.remindersList}>
                {reminders.map((r, idx) => (
                  <View
                    key={r.id}
                    style={[
                      styles.reminderItem,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.surfaceBorder,
                        flexDirection: dirRow,
                      },
                    ]}
                  >
                    <View style={[styles.remTimeBox, { flexDirection: dirRow }]}>
                      <Bell size={20} color={colors.accent} />
                      <AppText
                        weight="bold"
                        style={[styles.remTimeText, { color: colors.text, marginHorizontal: 6 }]}
                      >
                        {formatTimeMinutes(r.timeMinutes, false, currentLocale)}
                      </AppText>
                      {r.prayer ? (
                        <AppText style={[styles.remPrayerText, { color: colors.accent }]}>
                          ({t(`prayers.${r.prayer}`)})
                        </AppText>
                      ) : null}
                    </View>
                    <Pressable onPress={() => handleRemoveReminder(idx)} hitSlop={8}>
                      <Trash2 size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Important Flag */}
            <AppText weight="bold" style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {t('common.flags')}
            </AppText>
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

            {/* Actions Row */}
            <View style={[styles.actionsRow, { flexDirection: dirRow }]}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <Button
                title={t('common.save')}
                variant="primary"
                onPress={handleSave}
                disabled={!title.trim()}
                style={styles.actionBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Smart Time Picker Modal */}
      <SmartTimePicker
        visible={pickerVisible}
        initialTime={
          editingReminderIdx !== null && reminders[editingReminderIdx]
            ? {
                min: reminders[editingReminderIdx].timeMinutes,
                label: reminders[editingReminderIdx].prayer || undefined,
              }
            : { min: 480 }
        }
        onConfirm={handleAddOrEditReminder}
        onCancel={() => setPickerVisible(false)}
        title={t('settings.notifications')}
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
  header: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
  },
  scroll: {
    paddingBottom: 24,
  },
  fieldLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  textArea: {
    minHeight: 60,
  },
  categoriesWrap: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  remindersHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyRemindersText: {
    fontSize: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
    borderStyle: 'dashed',
  },
  remindersList: {
    gap: 8,
    marginBottom: 8,
  },
  reminderItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  remTimeBox: {
    alignItems: 'center',
  },
  remTimeText: {
    fontSize: 14,
  },
  remPrayerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  flagButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  flagText: {
    fontSize: 13,
  },
  actionsRow: {
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
  },
});
