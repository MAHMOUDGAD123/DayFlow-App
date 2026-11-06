import { initDatabase } from '@/db/init';
import { isDatabaseEmpty } from '@/db/repositories/backupRepo';
import { hasCompletedOnboarding } from '@/db/repositories/settingsRepo';
import { RestorePromptModal } from '@/features/backup/RestorePromptModal';
import { OnboardingTutorialModal } from '@/features/onboarding/OnboardingTutorialModal';
import { loadSavedAppLanguage } from '@/i18n/setup';
import { initAutoBackupListener } from '@/services/backup/autoBackup';
import { scheduleAllDayReminders } from '@/services/notifications/reminderScheduler';
import { ThemeProvider } from '@/theme/ThemeContext';
import { syncWidgets } from '@/widgets/widgetSync';
import { widgetTaskHandler } from '@/widgets/widgetTaskHandler';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, NativeModules, Platform, View } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { SafeAreaProvider } from 'react-native-safe-area-context';

let isExpoGo = false;
try {
  isExpoGo = isRunningInExpoGo();
} catch {
  isExpoGo = false;
}

if (
  Platform.OS === 'android' &&
  !isExpoGo &&
  Constants.appOwnership !== 'expo' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  Boolean((NativeModules as Record<string, unknown>)?.AndroidWidget)
) {
  try {
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Handled safely in environments without Android widget runner
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const [dbReady, setDbReady] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function prepare() {
      try {
        await initDatabase();
        await loadSavedAppLanguage();
        void scheduleAllDayReminders().catch((err) =>
          console.warn('scheduleAllDayReminders error:', err),
        );
        void syncWidgets().catch((err) => console.warn('syncWidgets error:', err));
        const [empty, completedOnboarding] = await Promise.all([
          isDatabaseEmpty(),
          hasCompletedOnboarding(),
        ]);
        if (isMounted) {
          if (!completedOnboarding) {
            setShowOnboarding(true);
          } else if (empty) {
            setShowRestorePrompt(true);
          }
          setDbReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
        if (isMounted) {
          setDbReady(true);
        }
      }
    }
    prepare();

    const cleanupBackup = initAutoBackupListener();
    return () => {
      isMounted = false;
      cleanupBackup();
    };
  }, []);

  if (!dbReady || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0F1115',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <RestorePromptModal
          visible={showRestorePrompt}
          onDismiss={() => setShowRestorePrompt(false)}
          onRestored={() => setShowRestorePrompt(false)}
        />
        <OnboardingTutorialModal
          visible={showOnboarding}
          onDismiss={() => setShowOnboarding(false)}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
