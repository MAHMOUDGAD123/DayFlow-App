import { AppText } from '@/components/common/AppText';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ResolvedTodo } from '@/domain/types';
import { formatTimeMinutes } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Edit3,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface TodoDetailModalProps {
  visible: boolean;
  todoItem: ResolvedTodo | null;
  onClose: () => void;
  onToggleStatus: () => void;
  onEditInProfile: (profileId: string, todoId: string) => void;
  onEditAdhocTodo?: (todoItem: ResolvedTodo) => void;
  onDeleteAdhocTodo?: (todoId: string) => void;
}

export function TodoDetailModal({
  visible,
  todoItem,
  onClose,
  onToggleStatus,
  onEditInProfile,
  onEditAdhocTodo,
  onDeleteAdhocTodo,
}: TodoDetailModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, dirRow, textAlign } = useTheme();
  const currentLocale = i18n.language || 'en';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!todoItem) return null;
  const { todo, status, isSuspended, suspendedBy } = todoItem;
  const isAdhoc =
    !todo.profileId ||
    todo.profileId === 'today_adhoc' ||
    todo.profileId === 'adhoc_day_profile' ||
    todo.id.startsWith('adhoc_');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Click outside backdrop to dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Card style={styles.modalCard}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: dirRow }]}>
            <View style={styles.titleInfo}>
              <AppText
                weight="bold"
                style={[styles.title, { color: colors.text, textAlign }]}
                numberOfLines={2}
              >
                {todo.title}
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={25} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Suspension Alert */}
            {isSuspended && (
              <View
                style={[
                  styles.alertBanner,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    flexDirection: dirRow,
                  },
                ]}
              >
                <AlertTriangle size={18} color={colors.danger} />
                <AppText style={[styles.alertText, { color: colors.danger, textAlign }]}>
                  {t('today.suspendedByEmergency', 'Suspended by emergency: {{name}}', {
                    name: suspendedBy?.[0] || 'Emergency',
                  })}
                </AppText>
              </View>
            )}

            {/* Description */}
            {todo.description ? (
              <View style={styles.sectionBlock}>
                <AppText
                  weight="bold"
                  style={[styles.sectionHeading, { color: colors.textSecondary, textAlign }]}
                >
                  {t('profiles.tasks.description', 'Description')}
                </AppText>
                <AppText style={[styles.descriptionText, { color: colors.text, textAlign }]}>
                  {todo.description}
                </AppText>
              </View>
            ) : null}

            {/* Reminders list */}
            {todo.reminders && todo.reminders.length > 0 && (
              <View style={styles.sectionBlock}>
                <AppText
                  weight="bold"
                  style={[styles.sectionHeading, { color: colors.textSecondary, textAlign }]}
                >
                  {t('common.reminders', 'Scheduled Reminders')}
                </AppText>
                <View style={[styles.remindersList, { flexDirection: dirRow }]}>
                  {todo.reminders.map((r) => (
                    <View
                      key={r.id}
                      style={[
                        styles.reminderChip,
                        { backgroundColor: colors.surfaceVariant, flexDirection: dirRow },
                      ]}
                    >
                      <Bell size={14} color={colors.accent} />
                      <AppText
                        weight="medium"
                        style={[styles.reminderText, { color: colors.text }]}
                      >
                        {formatTimeMinutes(r.timeMinutes, false, currentLocale)}
                        {r.prayer ? ` (${t(`prayers.${r.prayer}`, r.prayer)})` : ''}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Badges / Flags */}
            <View style={[styles.badgesRow, { flexDirection: dirRow }]}>
              {todo.flags?.important && (
                <Badge label={t('common.important', 'Important')} variant="warning" />
              )}
              <Badge
                label={
                  status === 'done'
                    ? t('today.statusDone', 'Completed')
                    : t('today.statusPending', 'Pending')
                }
                variant={status === 'done' ? 'success' : 'info'}
              />
            </View>

            {/* Status Toggle Action */}
            <View style={styles.statusActionGroup}>
              <Button
                title={
                  status === 'done'
                    ? t('today.markPending', 'Mark as Pending')
                    : t('today.markDone', 'Mark as Completed')
                }
                variant={status === 'done' ? 'secondary' : 'primary'}
                onPress={onToggleStatus}
                icon={
                  status === 'done' ? (
                    <RotateCcw size={20} color={colors.text} />
                  ) : (
                    <CheckCircle2 size={20} color="#FFFFFF" />
                  )
                }
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          {isAdhoc ? (
            <View style={[styles.footer, { flexDirection: dirRow, gap: 10 }]}>
              <Button
                title={t('today.editAdhocTodo', 'Edit To-do')}
                variant="secondary"
                onPress={() => onEditAdhocTodo?.(todoItem)}
                icon={<Edit3 size={20} color={colors.text} />}
                style={{ flex: 1 }}
              />
              {onDeleteAdhocTodo && (
                <Button
                  title={t('today.deleteAdhocTodo', 'Delete')}
                  variant="danger"
                  onPress={() => setShowDeleteConfirm(true)}
                  icon={<Trash2 size={20} color="#FFFFFF" />}
                />
              )}
            </View>
          ) : (
            <View style={styles.footer}>
              <Button
                title={t('today.editInProfile', 'Edit in Profile')}
                variant="secondary"
                onPress={() => onEditInProfile(todo.profileId, todo.id)}
                icon={<Edit3 size={20} color={colors.text} />}
              />
            </View>
          )}
        </Card>
      </View>

      {/* Delete Adhoc Todo Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title={t('today.deleteAdhocTodo', 'Delete To-do')}
        message={t('today.deleteConfirmNamed', 'Are you sure you want to delete "{{title}}"?', {
          title: todo.title,
        })}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDeleteAdhocTodo?.(todo.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    padding: 20,
    borderRadius: 18,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleInfo: {
    flex: 1,
    paddingEnd: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    marginBottom: 16,
  },
  alertBanner: {
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  remindersList: {
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  reminderText: {
    fontSize: 13,
  },
  badgesRow: {
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statusActionGroup: {
    marginTop: 4,
  },
  footer: {
    paddingTop: 8,
  },
});
