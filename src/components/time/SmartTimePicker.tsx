import { AppText } from '@/components/common/AppText';
import { Button } from '@/components/common/Button';
import { Minute, PrayerLabel, TimePoint } from '@/domain/types';
import { formatTimeMinutes } from '@/i18n/formatters';
import { getSavedPrayerSettings } from '@/services/location';
import { calculateDailyPrayerTimes, DayPrayerTimes, PrayerSettings } from '@/services/prayer';
import { useTheme } from '@/theme/ThemeContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Check, Clock, Moon } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

interface SmartTimePickerProps {
  visible: boolean;
  initialTime?: TimePoint;
  is24Hour?: boolean;
  onConfirm: (selected: TimePoint) => void;
  onCancel: () => void;
  title?: string;
}

const PRAYER_KEYS: { label: PrayerLabel; key: string }[] = [
  { label: 'fajr', key: 'prayers.fajr' },
  { label: 'sunrise', key: 'prayers.sunrise' },
  { label: 'dhuhr', key: 'prayers.dhuhr' },
  { label: 'asr', key: 'prayers.asr' },
  { label: 'maghrib', key: 'prayers.maghrib' },
  { label: 'isha', key: 'prayers.isha' },
];

function SmartTimePickerContent({
  initialTime = { min: 540 },
  is24Hour = false,
  onConfirm,
  onCancel,
  title,
}: Omit<SmartTimePickerProps, 'visible'>) {
  const { t, i18n } = useTranslation();
  const { colors, dirRow } = useTheme();
  const currentLocale = i18n.language || 'en';

  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<Minute>(initialTime.min);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerLabel | undefined>(initialTime.label);
  const [showNativePicker, setShowNativePicker] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getSavedPrayerSettings().then((settings) => {
      if (isMounted) {
        setPrayerSettings(settings);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const prayerTimes: DayPrayerTimes | null = useMemo(() => {
    if (!prayerSettings) return null;
    return calculateDailyPrayerTimes(new Date(), prayerSettings);
  }, [prayerSettings]);

  const handlePrayerSelect = (label: PrayerLabel, min: Minute) => {
    setSelectedMinutes(min);
    setSelectedPrayer(label);
    setShowNativePicker(false);
  };

  const handleNativeTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowNativePicker(false);
    }
    if (date) {
      const minutes = date.getHours() * 60 + date.getMinutes();
      setSelectedMinutes(minutes);
      setSelectedPrayer(undefined);
    }
  };

  const pickerDate = useMemo(() => {
    const d = new Date();
    d.setHours(Math.floor(selectedMinutes / 60));
    d.setMinutes(selectedMinutes % 60);
    d.setSeconds(0);
    return d;
  }, [selectedMinutes]);

  const displayTime = formatTimeMinutes(selectedMinutes, is24Hour, currentLocale);

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View
        style={[
          styles.dialog,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <View style={[styles.header, { flexDirection: dirRow, gap: 10 }]}>
          <Clock color={colors.accent} size={22} />
          <AppText style={[styles.headerTitle, { color: colors.text }]}>
            {title || t('common.edit')}
          </AppText>
        </View>

        {/* Current Selection Preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.surfaceVariant }]}>
          <AppText style={[styles.timePreview, { color: colors.text }]}>{displayTime}</AppText>
          {selectedPrayer ? (
            <View
              style={[
                styles.prayerBadge,
                { backgroundColor: colors.accentLight, flexDirection: dirRow },
              ]}
            >
              <Moon color={colors.accent} size={12} />
              <AppText style={[styles.prayerBadgeText, { color: colors.accent }]}>
                {t(`prayers.${selectedPrayer}`)}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Prayer Quick Chips (Shown ONLY when location is known) */}
        {prayerTimes ? (
          <View style={styles.prayersSection}>
            <AppText style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              {t('settings.location')}
            </AppText>
            <View style={[styles.chipsGrid, { flexDirection: dirRow }]}>
              {PRAYER_KEYS.map(({ label, key }) => {
                const min = prayerTimes[label];
                const formatted = formatTimeMinutes(min, is24Hour, currentLocale);
                const isSelected = selectedPrayer === label;

                return (
                  <Pressable
                    key={label}
                    onPress={() => handlePrayerSelect(label, min)}
                    style={[
                      styles.prayerChip,
                      {
                        borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                        backgroundColor: isSelected ? colors.accentLight : colors.card,
                      },
                    ]}
                  >
                    <View style={[styles.chipHeader, { flexDirection: dirRow }]}>
                      <AppText
                        style={[
                          styles.chipTitle,
                          { color: isSelected ? colors.accent : colors.text },
                        ]}
                      >
                        {t(key)}
                      </AppText>
                      {isSelected ? <Check color={colors.accent} size={14} /> : null}
                    </View>
                    <AppText style={[styles.chipTime, { color: colors.textMuted }]}>
                      {formatted}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Custom Time Selection Button */}
        <Button
          title={t('common.edit')}
          variant="outline"
          size="sm"
          onPress={() => setShowNativePicker(true)}
          style={styles.customTimeButton}
        />

        {showNativePicker ? (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={is24Hour}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleNativeTimeChange}
          />
        ) : null}

        {/* Dialog Action Buttons */}
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
            onPress={() => onConfirm({ min: selectedMinutes, label: selectedPrayer })}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </View>
  );
}

export function SmartTimePicker(props: SmartTimePickerProps) {
  if (!props.visible) return null;

  const key = `${props.initialTime?.min}_${props.initialTime?.label}`;

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onCancel}>
      <SmartTimePickerContent key={key} {...props} />
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewCard: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  timePreview: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  prayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    gap: 4,
  },
  prayerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  prayersSection: {
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prayerChip: {
    width: '31%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipTime: {
    fontSize: 11,
    marginTop: 2,
  },
  customTimeButton: {
    marginTop: 4,
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
});
