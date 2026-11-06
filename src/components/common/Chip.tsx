import React from 'react';
import { StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  style,
  textStyle,
}: ChipProps) {
  const { colors } = useTheme();

  const backgroundColor = selected ? colors.accentLight : colors.surface;
  const borderColor = selected ? colors.accent : colors.surfaceBorder;
  const textColor = selected ? colors.accent : disabled ? colors.textMuted : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <AppText weight="semiBold" style={[{ color: textColor, fontSize: 13, textAlign: 'center' }, textStyle]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8,
    marginBottom: 8,
  },
});
