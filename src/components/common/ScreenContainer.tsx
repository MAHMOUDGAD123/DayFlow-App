import React from 'react';
import {
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  safeTop?: boolean;
  safeBottom?: boolean;
}

export function ScreenContainer({
  children,
  style,
  safeTop = true,
  safeBottom = true,
}: ScreenContainerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const topInset = safeTop
    ? Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0)
    : 0;
  const bottomInset = safeBottom ? insets.bottom : 0;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.background,
          paddingTop: topInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.content, { backgroundColor: colors.background }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
