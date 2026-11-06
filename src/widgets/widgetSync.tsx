import React from 'react';
import { Platform, NativeModules } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { requestWidgetUpdate } from 'react-native-android-widget';
import i18n from '@/i18n/setup';
import { DayTimelineWidget } from './DayTimelineWidget';
import { ActiveTaskWidget } from './ActiveTaskWidget';
import { resolveWidgetData } from './widgetDataResolver';

export async function syncWidgets(): Promise<void> {
  if (Platform.OS !== 'android') return;

  let isExpoGo = false;
  try {
    isExpoGo = isRunningInExpoGo();
  } catch {
    isExpoGo = false;
  }

  if (
    isExpoGo ||
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    !(NativeModules as Record<string, unknown>)?.AndroidWidget
  ) {
    return;
  }

  try {
    const data = await resolveWidgetData(new Date(), i18n.language);

    await requestWidgetUpdate({
      widgetName: 'DayTimelineWidget',
      renderWidget: () => <DayTimelineWidget {...data.timelineProps} />,
    });

    await requestWidgetUpdate({
      widgetName: 'ActiveTaskWidget',
      renderWidget: () => <ActiveTaskWidget {...data.activeTaskProps} />,
    });
  } catch (err) {
    // Graceful fallback when widgets are not supported in Expo Go preview mode
    console.warn('Widget sync error:', err);
  }
}
