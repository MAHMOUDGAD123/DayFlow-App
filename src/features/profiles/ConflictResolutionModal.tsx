import { AppText } from '@/components/common/AppText';
import { Button } from '@/components/common/Button';
import { FullProfile } from '@/db/repositories/profileRepo';
import { useTheme } from '@/theme/ThemeContext';
import { AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface ConflictResolutionModalProps {
  visible: boolean;
  candidateProfile: FullProfile | null;
  conflictingProfiles: FullProfile[];
  onDisableOthersAndEnable: () => void;
  onEditCandidateDays: () => void;
  onCancel: () => void;
}

const WEEKDAYS = [
  { bit: 1, key: 'profiles.weekdays.sat' },
  { bit: 2, key: 'profiles.weekdays.sun' },
  { bit: 4, key: 'profiles.weekdays.mon' },
  { bit: 8, key: 'profiles.weekdays.tue' },
  { bit: 16, key: 'profiles.weekdays.wed' },
  { bit: 32, key: 'profiles.weekdays.thu' },
  { bit: 64, key: 'profiles.weekdays.fri' },
];

export function ConflictResolutionModal({
  visible,
  candidateProfile,
  conflictingProfiles,
  onDisableOthersAndEnable,
  onEditCandidateDays,
  onCancel,
}: ConflictResolutionModalProps) {
  const { t } = useTranslation();
  const { colors, dirRow, textAlign, isRTL } = useTheme();

  if (!candidateProfile || conflictingProfiles.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          <View style={[styles.header, { flexDirection: dirRow }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
              <AlertTriangle color={colors.warning} size={24} />
            </View>
            <AppText weight="bold" style={[styles.title, { color: colors.text, textAlign }]}>
              {t('profiles.conflictTitle')}
            </AppText>
          </View>

          <AppText style={[styles.desc, { color: colors.textMuted, textAlign }]}>
            {t('profiles.conflictMessage')}
          </AppText>

          {/* List Conflicting Profiles & Days */}
          <View style={[styles.conflictsBox, { backgroundColor: colors.surfaceVariant }]}>
            <AppText
              weight="bold"
              style={[styles.candidateTitle, { color: colors.accent, textAlign }]}
            >
              {candidateProfile.title}
            </AppText>
            <AppText style={[styles.conflictsWithText, { color: colors.textMuted, textAlign }]}>
              {t('common.active')}:
            </AppText>
            {conflictingProfiles.map((p) => {
              const clashingDays = WEEKDAYS.filter(
                (w) => (candidateProfile.daysMask & w.bit) !== 0 && (p.daysMask & w.bit) !== 0,
              ).map((w) => t(w.key));

              return (
                <View key={p.id} style={[styles.conflictItem, { flexDirection: dirRow }]}>
                  <AppText>⬥</AppText>
                  <AppText>{p.title}</AppText>
                  <AppText>—</AppText>
                  <AppText>{isRTL ? ')' : '('}</AppText>
                  {clashingDays.map((d, i, arr) => (
                    <AppText key={i} style={[styles.conflictDaysBadge, { color: colors.danger }]}>
                      {i < arr.length - 1 ? d + ' -' : d}
                    </AppText>
                  ))}
                  <AppText>{isRTL ? '(' : ')'}</AppText>
                </View>
              );
            })}
          </View>

          {/* Action Options */}
          <View style={styles.actions}>
            <Button
              title={t('profiles.deactivateOthers', 'Deactivate others & enable this')}
              variant="primary"
              onPress={onDisableOthersAndEnable}
              style={styles.actionBtn}
            />
            <Button
              title={t('profiles.editProfile')}
              variant="outline"
              onPress={onEditCandidateDays}
              style={styles.actionBtn}
            />
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={onCancel}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  conflictsBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  candidateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  conflictsWithText: {
    fontSize: 12,
    marginBottom: 6,
  },
  conflictItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginVertical: 2,
    gap: 5,
  },
  conflictProfileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  conflictDaysBadge: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  actions: {
    gap: 10,
  },
  actionBtn: {
    width: '100%',
  },
});
