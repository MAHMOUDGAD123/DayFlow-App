import { AppText } from '@/components/common/AppText';
import { Card } from '@/components/common/Card';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import {
  deleteEmergency,
  FullEmergency,
  getAllEmergencies,
  getEmergencyById,
  saveEmergency,
  toggleEmergencyEnabled,
} from '@/db/repositories/emergencyRepo';
import { EmergencyEditorModal } from '@/features/emergencies/EmergencyEditorModal';
import { formatNumber, formatTimeMinutes, toArabicIndicNumerals } from '@/i18n/formatters';
import { useTheme } from '@/theme/ThemeContext';
import { useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Clock,
  Edit3,
  Plus,
  Repeat,
  ShieldAlert,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

const WEEKDAYS = [
  { bit: '1', key: 'profiles.weekdays.sat' },
  { bit: '2', key: 'profiles.weekdays.sun' },
  { bit: '4', key: 'profiles.weekdays.mon' },
  { bit: '8', key: 'profiles.weekdays.tue' },
  { bit: '16', key: 'profiles.weekdays.wed' },
  { bit: '32', key: 'profiles.weekdays.thu' },
  { bit: '64', key: 'profiles.weekdays.fri' },
];

export default function EmergenciesScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isRTL, dirRow, textAlign } = useTheme();
  const currentLocale = i18n.language || 'en';

  const [emergenciesList, setEmergenciesList] = useState<FullEmergency[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<FullEmergency | null>(null);
  const [emergencyToDelete, setEmergencyToDelete] = useState<FullEmergency | null>(null);

  const loadData = useCallback(async () => {
    const list = await getAllEmergencies();
    setEmergenciesList(list);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getAllEmergencies().then((list) => {
      if (isMounted) {
        setEmergenciesList(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleToggle = async (item: FullEmergency, value: boolean) => {
    await toggleEmergencyEnabled(item.id, value);
    await loadData();
  };

  const handleOpenEdit = async (item: FullEmergency) => {
    try {
      const full = await getEmergencyById(item.id);
      setSelectedEmergency(full || item);
    } catch {
      setSelectedEmergency(item);
    }
    setEditorVisible(true);
  };

  const handleDelete = (item: FullEmergency) => {
    setEmergencyToDelete(item);
  };

  const handleSaveEmergency = async (saved: FullEmergency) => {
    try {
      await saveEmergency(saved);
      setEditorVisible(false);
      setSelectedEmergency(null);
      await loadData();
    } catch (err) {
      console.error('Failed to save emergency:', err);
      Alert.alert(
        t('common.error', 'Error'),
        t('emergencies.saveError', 'Failed to save emergency. Please try again.'),
      );
    }
  };

  const formatSchedule = (item: FullEmergency) => {
    if (item.scheduleType === 'dates') {
      const dates = item.scheduleData.map((d) =>
        currentLocale.startsWith('ar') ? toArabicIndicNumerals(d) : d,
      );
      return dates.join(', ') || t('emergencies.noDates', 'No dates');
    }
    const days = item.scheduleData
      .map((b) => {
        const found = WEEKDAYS.find((w) => w.bit === b);
        return found ? t(found.key) : '';
      })
      .filter(Boolean);
    return days.join(', ');
  };

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
          <View style={styles.headerTextGroup}>
            <AppText weight="bold" style={[styles.title, { color: colors.text, textAlign }]}>
              {t('emergencies.title')}
            </AppText>
            <AppText style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
              {t('emergencies.altersDay', 'Alters regular schedule for unexpected events')}
            </AppText>
          </View>
          <Pressable
            style={[styles.quickAddButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              setSelectedEmergency(null);
              setEditorVisible(true);
            }}
          >
            <Plus size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Info Alert Box */}
        <Card
          style={[
            styles.infoBanner,
            {
              backgroundColor: colors.dangerLight,
              borderColor: colors.danger,
              flexDirection: dirRow,
            },
          ]}
        >
          <ShieldAlert size={20} color={colors.danger} />
          <AppText style={[styles.infoText, { color: colors.danger, textAlign }]}>
            {t(
              'emergencies.importantSurvive',
              'During an active emergency, all non-important tasks are paused. Tasks and todos marked "Important" remain 100% active.',
            )}
          </AppText>
        </Card>

        {/* Emergencies List */}
        <View style={styles.list}>
          {emergenciesList.length === 0 ? (
            <Card style={styles.emptyCard}>
              <AlertTriangle size={32} color={colors.danger} style={styles.emptyIcon} />
              <AppText
                weight="bold"
                style={[styles.emptyTitle, { color: colors.text, textAlign: 'center' }]}
              >
                {t('emergencies.emptyTitle', 'No Emergency Events')}
              </AppText>
              <AppText
                style={[styles.emptyDesc, { color: colors.textSecondary, textAlign: 'center' }]}
              >
                {t(
                  'emergencies.emptyDesc',
                  'Create an emergency event to temporarily suspend daily routines for travel, illness, or urgent situations.',
                )}
              </AppText>
            </Card>
          ) : (
            emergenciesList.map((item) => {
              const isAllDay = item.startMinutes === null || item.endMinutes === null;
              return (
                <Card
                  key={item.id}
                  style={[
                    styles.emergencyCard,
                    isRTL
                      ? { borderRightWidth: 5, borderRightColor: colors.danger, borderLeftWidth: 0 }
                      : { borderLeftWidth: 5, borderLeftColor: colors.danger, borderRightWidth: 0 },
                    !item.enabled && { opacity: 0.6 },
                  ]}
                >
                  {/* Top Row: Title, Enabled Switch */}
                  <View style={[styles.cardHeader, { flexDirection: dirRow }]}>
                    <Pressable
                      style={styles.cardHeaderLeft}
                      onPress={() => {
                        setSelectedEmergency(item);
                        setEditorVisible(true);
                      }}
                    >
                      <AppText
                        weight="bold"
                        style={[styles.cardTitle, { color: colors.text, textAlign }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </AppText>
                    </Pressable>
                    <Switch
                      value={item.enabled}
                      onValueChange={(val) => handleToggle(item, val)}
                      thumbColor="#FFFFFF"
                      trackColor={{ false: colors.surfaceBorder, true: colors.danger }}
                      style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                    />
                  </View>

                  {/* Description */}
                  {item.description ? (
                    <AppText
                      style={[styles.cardDesc, { color: colors.textSecondary, textAlign }]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </AppText>
                  ) : null}

                  {/* Schedule & Time Badges */}
                  <View style={[styles.badgesRow, { flexDirection: dirRow }]}>
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: colors.surfaceVariant, flexDirection: dirRow },
                      ]}
                    >
                      {item.scheduleType === 'dates' ? (
                        <Calendar size={13} color={colors.accent} />
                      ) : (
                        <Repeat size={13} color={colors.accent} />
                      )}
                      <AppText weight="medium" style={[styles.chipText, { color: colors.text }]}>
                        {formatSchedule(item)}
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: colors.dangerLight, flexDirection: dirRow },
                      ]}
                    >
                      <Clock size={13} color={colors.danger} />
                      <AppText weight="medium" style={[styles.chipText, { color: colors.danger }]}>
                        {isAllDay
                          ? t('emergencies.allDay', 'All Day (24 Hours)')
                          : `${formatTimeMinutes(item.startMinutes!, false, currentLocale)} – ${formatTimeMinutes(item.endMinutes!, false, currentLocale)}`}
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: colors.surfaceVariant, flexDirection: dirRow },
                      ]}
                    >
                      <Bell size={13} color={colors.textSecondary} />
                      <AppText
                        weight="medium"
                        style={[styles.chipText, { color: colors.textSecondary }]}
                      >
                        {t('emergencies.reminderCount', '{{count}} reminders', {
                          count: formatNumber(
                            item.reminders.length,
                            currentLocale,
                          ) as unknown as number,
                        })}
                      </AppText>
                    </View>
                  </View>

                  {/* Actions Footer */}
                  <View style={[styles.cardFooter, { flexDirection: dirRow }]}>
                    <Pressable
                      style={[styles.actionBtn, { flexDirection: dirRow }]}
                      onPress={() => handleOpenEdit(item)}
                    >
                      <AppText
                        weight="semiBold"
                        style={[styles.actionBtnText, { color: colors.accent }]}
                      >
                        <Edit3 size={20} color={colors.accent} />
                      </AppText>
                    </Pressable>

                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleDelete(item)}
                      hitSlop={6}
                    >
                      <Trash2 size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Emergency Editor Modal */}
      {editorVisible && (
        <EmergencyEditorModal
          key={selectedEmergency?.id || 'new'}
          visible={editorVisible}
          initialEmergency={selectedEmergency}
          onSave={handleSaveEmergency}
          onCancel={() => {
            setEditorVisible(false);
            setSelectedEmergency(null);
          }}
        />
      )}

      {/* Delete Emergency Confirmation Modal */}
      <ConfirmModal
        visible={!!emergencyToDelete}
        title={t('emergencies.deleteTitle', 'Delete Emergency')}
        message={t('emergencies.deleteConfirm', 'Are you sure you want to delete "{{title}}"?', {
          title: emergencyToDelete?.title || '',
        })}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        onConfirm={async () => {
          if (emergencyToDelete) {
            await deleteEmergency(emergencyToDelete.id);
            setEmergencyToDelete(null);
            await loadData();
          }
        }}
        onCancel={() => setEmergencyToDelete(null)}
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
  headerTextGroup: {
    flex: 1,
    paddingEnd: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  list: {
    gap: 12,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emergencyCard: {
    borderLeftWidth: 5,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flex: 1,
    paddingEnd: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.12)',
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
