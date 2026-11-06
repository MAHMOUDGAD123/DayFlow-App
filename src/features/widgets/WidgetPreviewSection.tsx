import { AppText } from '@/components/common/AppText';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useTheme } from '@/theme/ThemeContext';
import { DayTimelineWidget } from '@/widgets/DayTimelineWidget';
import { resolveWidgetData, WidgetPayloads } from '@/widgets/widgetDataResolver';
import { syncWidgets } from '@/widgets/widgetSync';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { LayoutGrid, RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, NativeModules, Platform, StyleSheet, View } from 'react-native';
import { WidgetPreview } from 'react-native-android-widget';

function checkNativeWidgetSupported(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    if (isRunningInExpoGo()) return false;
  } catch {
    // ignore
  }
  if (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return false;
  }
  return Boolean((NativeModules as Record<string, unknown>)?.AndroidWidget);
}

const isNativeWidgetSupported = checkNativeWidgetSupported();

export function WidgetPreviewSection() {
  const { t, i18n } = useTranslation();
  const { colors, dirRow, textAlign } = useTheme();

  const [widgetData, setWidgetData] = useState<WidgetPayloads | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    resolveWidgetData(new Date(), i18n.language).then(setWidgetData);
  }, [i18n.language]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (isNativeWidgetSupported) {
        await syncWidgets();
      }
      const updated = await resolveWidgetData(new Date(), i18n.language);
      setWidgetData(updated);
      Alert.alert(
        t('common.done', 'Success'),
        isNativeWidgetSupported
          ? t('widgets.syncSuccess', 'Widgets updated successfully!')
          : t(
              'widgets.expoGoNotice',
              'Mockup preview refreshed! Native home screen widgets require a production/development APK build.',
            ),
      );
    } catch {
      // Ignore
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card style={styles.sectionCard}>
      {/* Header */}
      <View style={[styles.sectionHeader, { flexDirection: dirRow }]}>
        <LayoutGrid color={colors.accent} size={20} />
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>
          {t('widgets.sectionTitle', 'Home Screen Widgets')}
        </AppText>
      </View>

      <AppText style={[styles.desc, { color: colors.textSecondary, textAlign }]}>
        {t(
          'widgets.description',
          'Add Dayflow widgets to your phone home screen to quickly monitor your routine timeline and upcoming tasks.',
        )}
      </AppText>

      {/* Widget 1: 24h Timeline Widget */}
      <View style={styles.previewBox}>
        <AppText style={[styles.widgetLabel, { color: colors.text, textAlign }]}>
          {t('widgets.timelineWidget', '24-Hour Timeline Widget (4x2)')}
        </AppText>
        <View style={styles.widgetContainer}>
          {widgetData &&
            (isNativeWidgetSupported ? (
              <WidgetPreview
                renderWidget={() => <DayTimelineWidget {...widgetData.timelineProps} />}
                width={340}
                height={110}
              />
            ) : (
              <View
                style={[
                  styles.webMockup,
                  { backgroundColor: '#121418', borderColor: colors.surfaceBorder },
                ]}
              >
                <View style={[styles.mockupHeader, { flexDirection: dirRow }]}>
                  <AppText style={styles.mockupAppName}>
                    Dayflow · {widgetData.timelineProps.dateStr}
                  </AppText>
                  <AppText style={styles.mockupProgress}>
                    {widgetData.timelineProps.progressPercentText ||
                      `${widgetData.timelineProps.progressPercent}% done`}
                  </AppText>
                </View>
                <View
                  style={[styles.mockupBar, { backgroundColor: '#1E232B', flexDirection: dirRow }]}
                >
                  {widgetData.timelineProps.hourlyOccupied.map((isOccupied, idx) => (
                    <View
                      key={idx}
                      style={{
                        flex: 1,
                        height: '100%',
                        backgroundColor:
                          idx === widgetData.timelineProps.currentHour
                            ? '#F59E0B'
                            : isOccupied
                              ? '#3B82F6'
                              : '#2A303C',
                        marginHorizontal: 0.5,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </View>
                <View style={[styles.mockupFooter, { flexDirection: dirRow }]}>
                  <AppText style={[styles.mockupTaskTitle]}>
                    {widgetData.timelineProps.activeTaskTitle}
                  </AppText>
                  <AppText style={styles.mockupSub}>
                    {widgetData.timelineProps.timeRemainingText}
                  </AppText>
                </View>
              </View>
            ))}
        </View>
      </View>

      <Button
        title={t('widgets.syncNow', 'Sync Home Screen Widgets')}
        variant="outline"
        size="sm"
        loading={syncing}
        onPress={handleSync}
        style={{ marginTop: 12 }}
        icon={<RefreshCw size={20} color={colors.accent} />}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  previewBox: {
    marginBottom: 16,
  },
  widgetLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  widgetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  webMockup: {
    width: '100%',
    maxWidth: 340,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  mockupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockupAppName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  mockupProgress: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
  },
  mockupBar: {
    height: 14,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 1,
    overflow: 'hidden',
  },
  mockupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockupTaskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mockupSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  badgePill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mockupFooterBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
