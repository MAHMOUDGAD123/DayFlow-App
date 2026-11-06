import React from 'react';
import { StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';

interface BadgeProps {
  label: string;
  variant?: 'accent' | 'danger' | 'success' | 'warning' | 'info' | 'neutral';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ label, variant = 'neutral', style, textStyle }: BadgeProps) {
  const { colors, alignStart } = useTheme();

  let backgroundColor = colors.surfaceVariant;
  let textColor = colors.textMuted;

  if (variant === 'accent') {
    backgroundColor = colors.accentLight;
    textColor = colors.accent;
  } else if (variant === 'danger') {
    backgroundColor = colors.dangerLight;
    textColor = colors.danger;
  } else if (variant === 'success') {
    backgroundColor = colors.successLight;
    textColor = colors.success;
  } else if (variant === 'warning') {
    backgroundColor = colors.warningLight;
    textColor = colors.warning;
  } else if (variant === 'info') {
    backgroundColor = colors.infoLight;
    textColor = colors.info;
  }

  return (
    <View style={[styles.badge, { backgroundColor, alignSelf: alignStart }, style]}>
      <AppText weight="semiBold" style={[{ color: textColor, fontSize: 11, letterSpacing: 0.2 }, textStyle]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
