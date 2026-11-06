import { useTheme } from '@/theme/ThemeContext';
import { Tabs } from 'expo-router';
import { AlertTriangle, Clock, Layers, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, fonts, isRTL } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceBorder,
          height: 80,
          paddingBottom: 8,
          paddingTop: 8,
          direction: isRTL ? 'rtl' : 'ltr',
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.semiBold,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: t('tabs.profiles'),
          tabBarIcon: ({ color, size }) => <Layers color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="emergencies"
        options={{
          title: t('tabs.emergencies'),
          tabBarIcon: ({ color, size }) => <AlertTriangle color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size || 22} />,
        }}
      />
    </Tabs>
  );
}
