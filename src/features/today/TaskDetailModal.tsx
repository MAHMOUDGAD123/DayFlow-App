import { AppText } from '@/components/common/AppText';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ItemStatus, ResolvedTaskSegment } from '@/domain/types';
import { formatTimeMinutes } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  RotateCcw,
  SkipForward,
  X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface TaskDetailModalProps {
  visible: boolean;
  taskSegment: ResolvedTaskSegment | null;
  onClose: () => void;
  onStatusChange: (status: ItemStatus) => void;
  onEditInProfile: (profileId: string, taskId: string) => void;
}

export function TaskDetailModal({
  visible,
  taskSegment,
  onClose,
  onStatusChange,
  onEditInProfile,
}: TaskDetailModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, dirRow, textAlign } = useTheme();
  const currentLocale = i18n.language || 'en';

  if (!taskSegment) return null;
  const { task, segment, status, isSuspended, suspendedBy } = taskSegment;
  const isAdhoc =
    !task.profileId ||
    task.profileId === 'today_adhoc' ||
    task.profileId === 'adhoc_day_profile' ||
    task.id.startsWith('adhoc_');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Card style={styles.modalCard}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: dirRow }]}>
            <View style={[styles.titleInfo, { flexDirection: dirRow }]}>
              <View style={[styles.colorDot, { backgroundColor: task.color }]} />
              <AppText
                weight="bold"
                style={[styles.title, { color: colors.text, textAlign }]}
                numberOfLines={2}
              >
                {task.title}
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
            {/* Status & Emergency Alerts */}
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
                <AlertTriangle size={20} color={colors.danger} />
                <AppText style={[styles.alertText, { color: colors.danger, textAlign }]}>
                  {t('today.suspendedByEmergency', 'Suspended by emergency: {{name}}', {
                    name: suspendedBy?.[0] || 'Emergency',
                  })}
                </AppText>
              </View>
            )}

            {/* Time Range */}
            <View
              style={[
                styles.detailRow,
                { backgroundColor: colors.surfaceVariant, flexDirection: dirRow },
              ]}
            >
              <Clock size={20} color={colors.accent} />
              <AppText weight="semiBold" style={[styles.detailText, { color: colors.text }]}>
                {formatTimeMinutes(segment[0], false, currentLocale)} –{' '}
                {formatTimeMinutes(segment[1], false, currentLocale)}
                {taskSegment.crossesMidnight
                  ? ' (' + t('today.crossesMidnight', 'Crosses Midnight') + ')'
                  : ''}
              </AppText>
            </View>

            {/* Description */}
            {task.description ? (
              <View style={styles.sectionBlock}>
                <AppText
                  weight="bold"
                  style={[styles.sectionHeading, { color: colors.textSecondary, textAlign }]}
                >
                  {t('common.desc', 'Description')}
                </AppText>
                <AppText style={[styles.descriptionText, { color: colors.textMuted, textAlign }]}>
                  {task.description}
                </AppText>
              </View>
            ) : null}

            {/* Badges / Flags */}
            <View style={[styles.badgesRow, { flexDirection: dirRow }]}>
              {task.flags.important && (
                <Badge label={t('common.important', 'Important')} variant="warning" />
              )}
              <Badge
                label={
                  status === 'done'
                    ? t('today.statusDone', 'Completed')
                    : status === 'skipped'
                      ? t('today.statusSkipped', 'Skipped')
                      : t('today.statusPending', 'Pending')
                }
                variant={status === 'done' ? 'success' : status === 'skipped' ? 'neutral' : 'info'}
              />
            </View>

            {/* Status Actions */}
            <View style={styles.statusActionGroup}>
              <AppText
                weight="bold"
                style={[styles.sectionHeading, { color: colors.textSecondary, textAlign }]}
              >
                {t('today.updateStatus', 'Update Status')}
              </AppText>
              <View style={[styles.actionButtonsRow, { flexDirection: dirRow }]}>
                {status !== 'done' && (
                  <Button
                    title={t('today.markDone', 'Done')}
                    variant="primary"
                    size="sm"
                    onPress={() => onStatusChange('done')}
                    icon={<CheckCircle2 size={20} color="#FFFFFF" />}
                  />
                )}
                {status !== 'skipped' && (
                  <Button
                    title={t('today.markSkipped', 'Skip')}
                    variant="secondary"
                    size="sm"
                    onPress={() => onStatusChange('skipped')}
                    icon={<SkipForward size={20} color={colors.text} />}
                  />
                )}
                {status !== 'pending' && (
                  <Button
                    title={t('today.markPending', 'Reset')}
                    variant="ghost"
                    size="sm"
                    onPress={() => onStatusChange('pending')}
                    icon={<RotateCcw size={20} color={colors.text} />}
                  />
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions (Only for profile-based tasks) */}
          {!isAdhoc && (
            <View style={styles.footer}>
              <Button
                title={t('today.editInProfile', 'Edit in Profile')}
                variant="secondary"
                onPress={() => onEditInProfile(task.profileId, task.id)}
                icon={<Edit3 size={20} color={colors.text} />}
              />
            </View>
          )}
        </Card>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingEnd: 12,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    marginBottom: 16,
  },
  alertBanner: {
    flexDirection: 'row',
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusActionGroup: {
    marginTop: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.15)',
  },
});
