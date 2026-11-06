import React from 'react';
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, isRTL } = useTheme();

  let backgroundColor = colors.accent;
  let textColor = colors.accentText;
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    backgroundColor = colors.surfaceVariant;
    textColor = colors.text;
    borderColor = colors.surfaceBorder;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = colors.accent;
    borderColor = colors.accent;
  } else if (variant === 'danger') {
    backgroundColor = colors.danger;
    textColor = '#FFFFFF';
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = colors.text;
  }

  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          paddingVertical,
          paddingHorizontal,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <View style={{ marginHorizontal: 4 }}>{icon}</View> : null}
          <AppText
            weight="semiBold"
            style={[
              {
                color: textColor,
                fontSize,
                textAlign: 'center',
              },
              textStyle,
            ]}
          >
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
