import { AppLogo } from '@/components/common/AppLogo';
import { AppText } from '@/components/common/AppText';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SmartTimePicker } from '@/components/time/SmartTimePicker';
import { TimePoint } from '@/domain/types';
import { BackupSettingsSection } from '@/features/backup/BackupSettingsSection';
import { NotificationSettingsSection } from '@/features/notifications/NotificationSettingsSection';
import { WidgetPreviewSection } from '@/features/widgets/WidgetPreviewSection';
import { setAppLanguage } from '@/i18n/setup';
import { detectAndSaveLocation, getSavedPrayerSettings } from '@/services/location';
import { PrayerSettings } from '@/services/prayer';
import { ThemeMode, useTheme } from '@/theme/ThemeContext';
import { Clock, Globe, MapPin, Moon, Palette, Sun } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const PRESET_ACCENTS = [
  '#3B82F6', // Blue
  '#00DF00', // Green
  '#8B5CBF', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#06B6D4', // Cyan
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const {
    colors,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    dirRow,
    textAlign,
    isRTL,
    isDark,
  } = useTheme();

  const currentLang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState<TimePoint>({ min: 720 });

  useEffect(() => {
    getSavedPrayerSettings().then(setPrayerSettings);
  }, []);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const config = await detectAndSaveLocation();
      if (config) {
        setPrayerSettings(config);
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
    } finally {
      setDetectingLocation(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.header}>
          <AppText weight="bold" style={[styles.title, { color: colors.text, textAlign }]}>
            {t('settings.title')}
          </AppText>
        </View>

        {/* Location & Prayer Times Section */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: dirRow }]}>
            <MapPin color={colors.accent} size={20} />
            <AppText
              weight="bold"
              style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 8 }]}
            >
              {t('settings.location')}
            </AppText>
          </View>

          {prayerSettings ? (
            <View style={[styles.locationDetails, { backgroundColor: colors.surfaceVariant }]}>
              <AppText
                weight="bold"
                style={[styles.locationCity, { color: colors.text, textAlign }]}
              >
                {prayerSettings.city || 'Coordinates Found'}, {prayerSettings.country || ''}
              </AppText>
              <AppText style={[styles.locationCoords, { color: colors.textMuted, textAlign }]}>
                {prayerSettings.latitude.toFixed(4)}°, {prayerSettings.longitude.toFixed(4)}° ·{' '}
                {prayerSettings.method}
              </AppText>
            </View>
          ) : (
            <AppText
              style={[styles.subText, { color: colors.textMuted, marginBottom: 12, textAlign }]}
            >
              {t('settings.location')}
            </AppText>
          )}

          <Button
            title={t('settings.detectLocation')}
            variant="outline"
            size="sm"
            onPress={handleDetectLocation}
            loading={detectingLocation}
            icon={
              detectingLocation ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <MapPin size={20} color={colors.accent} />
              )
            }
          />

          <Button
            title={isRTL ? 'معاينة منتقي الوقت الذكي' : 'Test Smart Time Picker'}
            variant="secondary"
            size="sm"
            onPress={() => setTimePickerVisible(true)}
            style={{ marginTop: 8 }}
            icon={<Clock size={20} color={colors.text} />}
          />
        </Card>

        {/* Language Section */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: dirRow }]}>
            <Globe color={colors.accent} size={20} />
            <AppText
              weight="bold"
              style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 8 }]}
            >
              {t('settings.language')}
            </AppText>
          </View>
          <View style={[styles.row, { flexDirection: dirRow }]}>
            <Pressable
              onPress={() => setAppLanguage('en')}
              style={[
                styles.optionButton,
                { borderColor: currentLang === 'en' ? colors.accent : colors.surfaceBorder },
                currentLang === 'en' && { backgroundColor: colors.accentLight },
              ]}
            >
              <AppText
                weight="semiBold"
                style={[
                  styles.optionText,
                  { color: currentLang === 'en' ? colors.accent : colors.text },
                ]}
              >
                {isRTL ? 'الإنجليزية' : 'English'}
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setAppLanguage('ar')}
              style={[
                styles.optionButton,
                { borderColor: currentLang === 'ar' ? colors.accent : colors.surfaceBorder },
                currentLang === 'ar' && { backgroundColor: colors.accentLight },
              ]}
            >
              <AppText
                weight="semiBold"
                style={[
                  styles.optionText,
                  { color: currentLang === 'ar' ? colors.accent : colors.text },
                ]}
              >
                {isRTL ? 'العربية' : 'Arabic'}
              </AppText>
            </Pressable>
          </View>
        </Card>

        {/* Theme Section */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: dirRow }]}>
            {isDark ? (
              <Moon color={colors.accent} size={20} />
            ) : (
              <Sun color={colors.accent} size={20} />
            )}
            <AppText
              weight="bold"
              style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 8 }]}
            >
              {t('settings.theme')}
            </AppText>
          </View>
          <View style={[styles.row, { flexDirection: dirRow }]}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
              const isSelected = themeMode === mode;
              const label =
                mode === 'light'
                  ? t('settings.themeLight')
                  : mode === 'dark'
                    ? t('settings.themeDark')
                    : t('settings.themeSystem');
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.optionButton,
                    { borderColor: isSelected ? colors.accent : colors.surfaceBorder },
                    isSelected && { backgroundColor: colors.accentLight },
                  ]}
                >
                  <AppText
                    weight="semiBold"
                    style={[styles.optionText, { color: isSelected ? colors.accent : colors.text }]}
                  >
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Accent Color Section */}
        <Card style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: dirRow }]}>
            <Palette color={colors.accent} size={20} />
            <AppText
              weight="bold"
              style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 8 }]}
            >
              {t('settings.accentColor')}
            </AppText>
          </View>
          <View style={[styles.colorsRow, { flexDirection: dirRow }]}>
            {PRESET_ACCENTS.map((hex) => {
              const isSelected = accentColor.toLowerCase() === hex.toLowerCase();
              return (
                <Pressable
                  key={hex}
                  onPress={() => setAccentColor(hex)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: hex },
                    isSelected && [styles.colorCircleSelected, { borderColor: colors.text }],
                  ]}
                />
              );
            })}
          </View>
        </Card>

        {/* Notifications & Reminders Section */}
        <NotificationSettingsSection />

        {/* Home Screen Widgets Section */}
        <WidgetPreviewSection />

        {/* Data & Local Backup Section */}
        <BackupSettingsSection />

        {/* App Branding Footer */}
        <View style={styles.brandingFooter}>
          <AppLogo size={52} />
          <AppText weight="bold" style={[styles.brandingTitle, { color: colors.text }]}>
            Dayflow
          </AppText>
          <AppText style={[styles.brandingVersion, { color: colors.textSecondary }]}>
            v1.0.0
          </AppText>
        </View>
      </ScrollView>

      {/* Smart Time Picker Modal Preview */}
      <SmartTimePicker
        visible={timePickerVisible}
        initialTime={selectedTime}
        onConfirm={(tp) => {
          setSelectedTime(tp);
          setTimePickerVisible(false);
        }}
        onCancel={() => setTimePickerVisible(false)}
        title={isRTL ? 'منتقي الوقت الذكي' : 'Smart Time Picker'}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
  },
  locationDetails: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  locationCity: {
    fontSize: 15,
  },
  locationCoords: {
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
  },
  colorsRow: {
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  colorCircleSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  subText: {
    fontSize: 13,
    lineHeight: 18,
  },
  brandingFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  brandingTitle: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  brandingVersion: {
    fontSize: 12,
  },
});
