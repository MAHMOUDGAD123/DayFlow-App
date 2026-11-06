import { AppText } from '@/components/common/AppText';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { DayTimelineBar } from '@/components/timeline/DayTimelineBar';
import {
  deleteProfile,
  discardDraftProfile,
  FullProfile,
  getAllProfiles,
  getCategories,
  getDraftProfile,
  getProfileById,
  saveProfile,
  toggleProfileEnabled,
} from '@/db/repositories/profileRepo';
import { checkProfileDaysConflict } from '@/domain/conflicts';
import { ConflictResolutionModal } from '@/features/profiles/ConflictResolutionModal';
import { ProfileEditorModal } from '@/features/profiles/ProfileEditorModal';
import { formatNumber, formatTimeMinutes } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { SLEEP_COLOR } from '@/utils/taskColors';
import { AlertCircle, Bell, Clock, Edit3, Moon, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

const WEEKDAYS = [
  { bit: 1, key: 'profiles.weekdays.sat' },
  { bit: 2, key: 'profiles.weekdays.sun' },
  { bit: 4, key: 'profiles.weekdays.mon' },
  { bit: 8, key: 'profiles.weekdays.tue' },
  { bit: 16, key: 'profiles.weekdays.wed' },
  { bit: 32, key: 'profiles.weekdays.thu' },
  { bit: 64, key: 'profiles.weekdays.fri' },
];

export default function ProfilesScreen() {
  const { t, i18n } = useTranslation();
  const { colors, dirRow, textAlign, isRTL } = useTheme();
  const currentLocale = i18n.language || 'en';

  const [profilesList, setProfilesList] = useState<FullProfile[]>([]);
  const [categoriesList, setCategoriesList] = useState<
    { id: string; nameKey: string | null; customName: string | null; color: string }[]
  >([]);
  const [draft, setDraft] = useState<FullProfile | null>(null);

  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<FullProfile | null>(null);

  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<FullProfile | null>(null);
  const [conflictingProfiles, setConflictingProfiles] = useState<FullProfile[]>([]);
  const [profileToDelete, setProfileToDelete] = useState<{ id: string; title: string } | null>(
    null,
  );

  const loadData = useCallback(async () => {
    const [p, c, d] = await Promise.all([getAllProfiles(), getCategories(), getDraftProfile()]);
    setProfilesList(p);
    setCategoriesList(c);
    setDraft(d);
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAllProfiles(), getCategories(), getDraftProfile()]).then(([p, c, d]) => {
      if (isMounted) {
        setProfilesList(p);
        setCategoriesList(c);
        setDraft(d);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleEnable = async (profile: FullProfile, value: boolean) => {
    const res = await toggleProfileEnabled(profile.id, value);
    if (!res.success && res.conflictingProfiles) {
      setCandidateProfile(profile);
      setConflictingProfiles(res.conflictingProfiles);
      setConflictModalVisible(true);
    } else {
      loadData();
    }
  };

  const handleDisableOthersAndEnable = async () => {
    if (!candidateProfile) return;
    for (const cp of conflictingProfiles) {
      await toggleProfileEnabled(cp.id, false);
    }
    await toggleProfileEnabled(candidateProfile.id, true);
    setConflictModalVisible(false);
    loadData();
  };

  const handleOpenEdit = async (p: FullProfile) => {
    try {
      const full = await getProfileById(p.id);
      setSelectedProfile(full || p);
    } catch {
      setSelectedProfile(p);
    }
    setEditorVisible(true);
  };

  const handleDelete = (id: string, title: string) => {
    setProfileToDelete({ id, title });
  };

  const handleSaveProfile = async (saved: FullProfile) => {
    if (saved.enabled) {
      const conflict = checkProfileDaysConflict(
        { id: saved.id, daysMask: saved.daysMask },
        enabledProfiles.map((p) => ({ id: p.id, daysMask: p.daysMask })),
      );
      if (conflict.hasConflict) {
        Alert.alert(
          t('profiles.activeDayConflictTitle', 'Active Day Conflict'),
          t(
            'profiles.activeDayConflictMessage',
            'This profile is currently active, but some active days are already occupied by another active profile.',
          ),
        );
        return;
      }
    }

    try {
      await saveProfile(saved);
      setEditorVisible(false);
      setSelectedProfile(null);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);
      const msg =
        err instanceof Error
          ? err.message
          : t('profiles.saveError', 'Failed to save profile. Please try again.');
      Alert.alert(t('common.error', 'Error'), msg);
    }
  };

  const handleDiscardDraft = async () => {
    await discardDraftProfile();
    setDraft(null);
  };

  const enabledProfiles = profilesList.filter((p) => p.enabled);

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View style={[styles.header, { flexDirection: dirRow }]}>
          <AppText weight="bold" style={[styles.title, { color: colors.text, textAlign }]}>
            {t('profiles.title')}
          </AppText>
          <Pressable
            style={[styles.quickAddButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              setSelectedProfile(null);
              setEditorVisible(true);
            }}
          >
            <Plus size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Draft Banner (Gmail-style) */}
        {draft ? (
          <Card
            style={[
              styles.draftCard,
              { borderColor: colors.warning, backgroundColor: colors.warningLight },
            ]}
          >
            <View style={[styles.draftRow, { flexDirection: dirRow }]}>
              <View style={styles.draftInfo}>
                <View style={[styles.draftHeader, { flexDirection: dirRow }]}>
                  <AlertCircle size={20} color={colors.warning} />
                  <AppText
                    weight="bold"
                    style={[styles.draftTitle, { color: colors.warning, textAlign }]}
                  >
                    {t('profiles.drafts')}
                  </AppText>
                </View>
                <AppText
                  weight="medium"
                  style={[styles.draftProfileName, { color: colors.text, textAlign }]}
                >
                  {draft.title || 'Untitled Profile'}
                </AppText>
              </View>
              <View style={[styles.draftActions, { flexDirection: dirRow }]}>
                <Button
                  title={t('profiles.resumeDraft')}
                  size="sm"
                  variant="primary"
                  onPress={() => {
                    setSelectedProfile(draft);
                    setEditorVisible(true);
                  }}
                />
                <Button
                  title={t('common.discard')}
                  size="sm"
                  variant="ghost"
                  onPress={handleDiscardDraft}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {/* Empty State */}
        {profilesList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <AppText style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center' }]}>
              {t('profiles.empty')}
            </AppText>
          </Card>
        ) : (
          profilesList.map((p) => {
            const timelineSegments = [
              {
                start: p.sleepStart ?? 1380,
                end: p.sleepEnd ?? 420,
                color: SLEEP_COLOR,
              },
              ...p.tasks.map((t) => ({
                start: t.start.min,
                end: t.end.min,
                color: t.color,
              })),
            ];

            return (
              <Card key={p.id} style={styles.profileCard}>
                <View style={[styles.profileHeader, { flexDirection: dirRow }]}>
                  <View style={styles.profileTitleBox}>
                    <AppText
                      weight="bold"
                      style={[styles.profileTitle, { color: colors.text, textAlign }]}
                    >
                      {p.title}
                    </AppText>
                    {p.description ? (
                      <AppText
                        style={[styles.profileDesc, { color: colors.textMuted, textAlign }]}
                        numberOfLines={1}
                      >
                        {p.description}
                      </AppText>
                    ) : null}
                  </View>
                  <Switch
                    value={p.enabled}
                    onValueChange={(val) => handleToggleEnable(p, val)}
                    trackColor={{ false: colors.surfaceBorder, true: colors.accentLight }}
                    thumbColor={p.enabled ? colors.accent : colors.surfaceVariant}
                    style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                  />
                </View>

                {/* Weekdays Chips Row */}
                <View style={[styles.weekdaysRow, { flexDirection: dirRow }]}>
                  {WEEKDAYS.map((w) => {
                    const isActive = (p.daysMask & w.bit) !== 0;
                    return (
                      <View
                        key={w.bit}
                        style={[
                          styles.weekdayBadge,
                          {
                            backgroundColor: isActive ? colors.accentLight : colors.surfaceVariant,
                            borderColor: isActive ? colors.accent : colors.surfaceBorder,
                          },
                        ]}
                      >
                        <AppText
                          weight="medium"
                          style={[
                            styles.weekdayText,
                            { color: isActive ? colors.accent : colors.textMuted },
                          ]}
                        >
                          {t(w.key)}
                        </AppText>
                      </View>
                    );
                  })}
                </View>

                {/* Mini Timeline Bar Preview */}
                <View style={styles.timelineBox}>
                  <DayTimelineBar segments={timelineSegments} height={20} />
                </View>

                {/* Footer Info & Actions */}
                <View
                  style={[
                    styles.footerRow,
                    { borderTopColor: colors.surfaceBorder, flexDirection: dirRow },
                  ]}
                >
                  <View style={[styles.countsRow, { flexDirection: dirRow }]}>
                    <View style={[styles.countItem, { flexDirection: dirRow }]}>
                      <Moon size={15} color="#FEF08A" />
                      <AppText style={[styles.countText, { color: colors.textMuted }]}>
                        {formatTimeMinutes(p.sleepStart ?? 1380, false, currentLocale)} -{' '}
                        {formatTimeMinutes(p.sleepEnd ?? 420, false, currentLocale)}
                      </AppText>
                    </View>
                    <View style={[styles.countItem, { flexDirection: dirRow }]}>
                      <Clock size={15} color={colors.textMuted} />
                      <AppText style={[styles.countText, { color: colors.textMuted }]}>
                        {formatNumber(p.tasks.length, currentLocale)} {t('profiles.tasks')}
                      </AppText>
                    </View>
                    <View style={[styles.countItem, { flexDirection: dirRow }]}>
                      <Bell size={15} color={colors.textMuted} />
                      <AppText style={[styles.countText, { color: colors.textMuted }]}>
                        {formatNumber(p.todos.length, currentLocale)} {t('profiles.todos')}
                      </AppText>
                    </View>
                  </View>
                </View>
                <View style={[styles.actionsRow, { flexDirection: dirRow }]}>
                  <Pressable onPress={() => handleOpenEdit(p)} style={styles.iconButton}>
                    <Edit3 size={20} color={colors.accent} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(p.id, p.title)} style={styles.iconButton}>
                    <Trash2 size={20} color={colors.danger} />
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Profile Editor Modal */}
      {editorVisible && (
        <ProfileEditorModal
          key={selectedProfile ? selectedProfile.id : 'new'}
          visible={editorVisible}
          initialProfile={selectedProfile}
          enabledProfiles={enabledProfiles}
          categories={categoriesList}
          onSave={handleSaveProfile}
          onCancel={() => {
            setEditorVisible(false);
            setSelectedProfile(null);
            loadData();
          }}
        />
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        visible={conflictModalVisible}
        candidateProfile={candidateProfile}
        conflictingProfiles={conflictingProfiles}
        onDisableOthersAndEnable={handleDisableOthersAndEnable}
        onEditCandidateDays={() => {
          setConflictModalVisible(false);
          if (candidateProfile) {
            handleOpenEdit(candidateProfile);
          }
        }}
        onCancel={() => setConflictModalVisible(false)}
      />

      {/* Delete Profile Confirmation Modal */}
      <ConfirmModal
        visible={!!profileToDelete}
        title={t('profiles.deleteTitle', 'Delete Profile')}
        message={t('profiles.deleteConfirm', 'Are you sure you want to delete "{{title}}"?', {
          title: profileToDelete?.title || '',
        })}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        onConfirm={async () => {
          if (profileToDelete) {
            await deleteProfile(profileToDelete.id);
            setProfileToDelete(null);
            loadData();
          }
        }}
        onCancel={() => setProfileToDelete(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  scroll: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  draftCard: {
    marginBottom: 16,
    padding: 14,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftInfo: {
    flex: 1,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  draftTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  draftProfileName: {
    fontSize: 15,
    fontWeight: '700',
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  profileCard: {
    marginBottom: 14,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileTitleBox: {
    flex: 1,
    marginEnd: 12,
    justifyContent: 'center',
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  weekdaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 12,
  },
  weekdayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineBox: {
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  countsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.12)',
    marginBlockStart: 15,
  },
  iconButton: {
    padding: 4,
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
